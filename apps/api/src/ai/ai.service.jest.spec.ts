import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { Logger } from '@nestjs/common';

const mockResponsesParse = jest.fn();
const mockOpenAIConstructor = jest.fn();

jest.unstable_mockModule('openai', () => ({
  default: class MockOpenAI {
    readonly responses = { parse: mockResponsesParse };

    constructor(options: unknown) {
      mockOpenAIConstructor(options);
    }
  },
}));

const { AiService } = await import('./ai.service.js');

describe('AiService', () => {
  const originalMockMode = process.env.AI_MOCK_MODE;
  const originalApiKey = process.env.OPENAI_API_KEY;
  const originalModel = process.env.OPENAI_MODEL;

  beforeEach(() => {
    mockResponsesParse.mockReset();
    mockOpenAIConstructor.mockReset();
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
    process.env.AI_MOCK_MODE = 'true';
  });

  afterAll(() => {
    if (originalMockMode === undefined) delete process.env.AI_MOCK_MODE;
    else process.env.AI_MOCK_MODE = originalMockMode;
    if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalApiKey;
    if (originalModel === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = originalModel;
  });

  it('uses the deterministic supporting fixture without an API key', async () => {
    const service = new AiService();

    await expect(
      service.assessClaim(
        'The claim',
        'Clinical result [MOCK_FIXTURE:SUPPORTING]',
      ),
    ).resolves.toMatchObject({
      justified: true,
      confidenceScore: 90,
      reasoning: expect.stringContaining('SIMULATED MOCK FIXTURE'),
    });
    expect(service.mockMode).toBe(true);
    expect(service.model).toBe('mock-fixture-v1');
    expect(mockOpenAIConstructor).not.toHaveBeenCalled();
    expect(mockResponsesParse).not.toHaveBeenCalled();
  });

  it('returns the deterministic contradicting fixture', async () => {
    const service = new AiService();

    await expect(
      service.assessClaim(
        'The claim',
        'Clinical result [MOCK_FIXTURE:CONTRADICTING]',
      ),
    ).resolves.toMatchObject({
      justified: false,
      confidenceScore: 90,
      reasoning: expect.stringContaining('marked as contradicting'),
    });
    expect(mockResponsesParse).not.toHaveBeenCalled();
  });

  it('treats unmarked evidence as insufficient in mock mode', async () => {
    const service = new AiService();

    await expect(
      service.assessClaim('The claim', 'Some unmarked clinical evidence'),
    ).resolves.toMatchObject({
      justified: false,
      confidenceScore: 50,
      reasoning: expect.stringContaining('treated as insufficient'),
    });
    expect(mockResponsesParse).not.toHaveBeenCalled();
  });

  it('uses the OpenAI Responses API when mock mode is disabled', async () => {
    process.env.AI_MOCK_MODE = 'false';
    process.env.OPENAI_API_KEY = 'test-key-not-a-real-secret';
    process.env.OPENAI_MODEL = 'test-structured-output-model';
    mockResponsesParse.mockResolvedValue({
      output_parsed: {
        justified: true,
        confidenceScore: 86,
        reasoning: 'The mocked provider supports the claim.',
      },
    });
    const service = new AiService();

    await expect(
      service.assessClaim('The claim', 'The evidence'),
    ).resolves.toEqual({
      justified: true,
      confidenceScore: 86,
      reasoning: 'The mocked provider supports the claim.',
    });

    expect(service.mockMode).toBe(false);
    expect(service.model).toBe('test-structured-output-model');
    expect(mockOpenAIConstructor).toHaveBeenCalledWith({
      apiKey: 'test-key-not-a-real-secret',
    });
    expect(mockResponsesParse).toHaveBeenCalledTimes(1);
    expect(mockResponsesParse.mock.calls[0]?.[0]).toMatchObject({
      model: 'test-structured-output-model',
      input: [
        { role: 'system' },
        {
          role: 'user',
          content: JSON.stringify({
            claim: 'The claim',
            evidence: 'The evidence',
          }),
        },
      ],
      text: { format: { type: 'json_schema' } },
    });
  });

  it('rejects invalid structured output from the mocked provider', async () => {
    process.env.AI_MOCK_MODE = 'false';
    process.env.OPENAI_API_KEY = 'test-key-not-a-real-secret';
    mockResponsesParse.mockResolvedValue({
      output_parsed: {
        justified: 'yes',
        confidenceScore: 120,
        reasoning: '',
      },
    });

    await expect(
      new AiService().assessClaim('The claim', 'The evidence'),
    ).rejects.toMatchObject({
      status: 502,
      message: 'The AI assessment provider returned an invalid response.',
    });
  });

  it('logs only safe OpenAI error metadata and returns a sanitized error', async () => {
    process.env.AI_MOCK_MODE = 'false';
    process.env.OPENAI_API_KEY = 'test-key-not-a-real-secret';
    const clinicalEvidence = 'private clinical study text';
    mockResponsesParse.mockRejectedValue(
      Object.assign(new Error(`failure containing ${clinicalEvidence}`), {
        status: 429,
        code: 'insufficient_quota',
        type: 'billing_error',
        request_id: 'req-test-123',
        headers: { authorization: 'Bearer do-not-log' },
      }),
    );
    const loggerSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const service = new AiService();

    await expect(
      service.assessClaim('private claim text', clinicalEvidence),
    ).rejects.toMatchObject({
      status: 503,
      message: 'The AI assessment provider could not complete the request.',
    });

    expect(loggerSpy).toHaveBeenCalledTimes(1);
    const loggedMessage = String(loggerSpy.mock.calls[0]?.[0]);
    expect(JSON.parse(loggedMessage)).toEqual({
      event: 'openai_assessment_request_failed',
      providerHttpStatus: 429,
      providerErrorCode: 'insufficient_quota',
      providerErrorType: 'billing_error',
      requestId: 'req-test-123',
    });
    expect(loggedMessage).not.toContain('test-key-not-a-real-secret');
    expect(loggedMessage).not.toContain('private claim text');
    expect(loggedMessage).not.toContain(clinicalEvidence);
    expect(loggedMessage).not.toContain('do-not-log');
    loggerSpy.mockRestore();
  });
});
