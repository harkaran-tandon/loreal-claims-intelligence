import { InternalServerErrorException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AiService, ClaimAssessment } from '../ai/ai.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ClaimsService } from './claims.service.js';

describe('ClaimsService', () => {
  const dto = {
    claim: 'Reduces wrinkles by 20% in 4 weeks',
    evidence:
      'A clinical study with 80 participants found a 12% wrinkle reduction after 4 weeks.',
  };

  let claimsService: ClaimsService;
  let aiService: {
    assessClaim: jest.Mock;
    model: string;
    mockMode: boolean;
  };
  let prisma: { $transaction: jest.Mock };
  let transaction: {
    claim: { create: jest.Mock; update: jest.Mock };
    assessment: { create: jest.Mock };
  };

  beforeEach(() => {
    aiService = {
      assessClaim:
        jest.fn<(...args: [string, string]) => Promise<ClaimAssessment>>(),
      model: 'gpt-4.1-mini',
      mockMode: false,
    };

    transaction = {
      claim: {
        create: jest.fn().mockResolvedValue({
          id: 'claim-uuid',
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      assessment: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'assessment-uuid',
            claimId: data.claimId,
            justified: data.justified,
            confidenceScore: data.confidenceScore,
            reasoning: data.reasoning,
          }),
        ),
      },
    };

    prisma = {
      $transaction: jest.fn(
        async (callback: (tx: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
    };

    claimsService = new ClaimsService(
      aiService as unknown as AiService,
      prisma as unknown as PrismaService,
    );
  });

  it.each([
    {
      name: 'justified evidence',
      result: {
        justified: true,
        confidenceScore: 92,
        reasoning: 'The controlled study supports the specified effect.',
      },
    },
    {
      name: 'unjustified evidence',
      result: {
        justified: false,
        confidenceScore: 94,
        reasoning: 'The evidence does not support the claimed 20% reduction.',
      },
    },
    {
      name: 'insufficient evidence',
      result: {
        justified: false,
        confidenceScore: 88,
        reasoning:
          'The evidence omits a control group and statistical significance.',
      },
    },
  ])('persists and returns an assessment for $name', async ({ result }) => {
    aiService.assessClaim.mockResolvedValue(result);

    await expect(claimsService.assess(dto)).resolves.toEqual({
      claimId: 'claim-uuid',
      assessmentId: 'assessment-uuid',
      mockMode: false,
      ...result,
    });

    expect(aiService.assessClaim).toHaveBeenCalledWith(dto.claim, dto.evidence);
    expect(transaction.claim.create).toHaveBeenCalledWith({
      data: { text: dto.claim },
    });
    expect(transaction.assessment.create).toHaveBeenCalledWith({
      data: {
        claimId: 'claim-uuid',
        evidence: dto.evidence,
        ...result,
        modelUsed: 'gpt-4.1-mini',
      },
    });
    expect(transaction.claim.update).toHaveBeenCalledWith({
      where: { id: 'claim-uuid' },
      data: { status: 'ASSESSED' },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('does not persist if the AI provider fails', async () => {
    aiService.assessClaim.mockRejectedValue(new Error('provider failure'));

    await expect(claimsService.assess(dto)).rejects.toThrow('provider failure');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns a server error if database persistence fails', async () => {
    aiService.assessClaim.mockResolvedValue({
      justified: false,
      confidenceScore: 88,
      reasoning: 'The evidence is insufficient.',
    });
    prisma.$transaction.mockRejectedValue(new Error('database failure'));

    const assessment = claimsService.assess(dto);
    await expect(assessment).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
    await expect(assessment).rejects.toThrow(
      'The assessment could not be saved.',
    );
  });
});
