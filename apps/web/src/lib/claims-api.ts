export interface AssessClaimRequest {
  claim: string
  evidence: string
}

export interface AssessmentResponse {
  claimId: string
  assessmentId: string
  justified: boolean
  confidenceScore: number
  reasoning: string
  mockMode: boolean
}

interface ApiErrorResponse {
  message?: string | string[]
  error?: string
}

const API_BASE_URL = (
  import.meta.env.VITE_API_URL?.trim() || 'http://localhost:3000/api'
).replace(/\/+$/, '')

export async function assessClaim(
  request: AssessClaimRequest,
  signal?: AbortSignal,
): Promise<AssessmentResponse> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}/claims/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    throw new Error(
      'Unable to reach the assessment service. Check that the API is running and try again.',
    )
  }

  const body = await response.text()
  if (!body.trim()) {
    throw new Error('The assessment service returned an empty response.')
  }

  let payload: unknown
  try {
    payload = JSON.parse(body)
  } catch {
    throw new Error('The assessment service returned an unreadable response.')
  }

  if (!response.ok) {
    const apiError = payload as ApiErrorResponse
    const message = Array.isArray(apiError.message)
      ? apiError.message.join(' ')
      : apiError.message
    throw new Error(
      message || apiError.error || `Assessment failed (HTTP ${response.status}).`,
    )
  }

  if (!isAssessmentResponse(payload)) {
    throw new Error('The assessment service returned incomplete assessment data.')
  }

  return payload
}

function isAssessmentResponse(value: unknown): value is AssessmentResponse {
  if (typeof value !== 'object' || value === null) return false
  const result = value as Partial<AssessmentResponse>

  return (
    typeof result.claimId === 'string' &&
    typeof result.assessmentId === 'string' &&
    typeof result.justified === 'boolean' &&
    typeof result.confidenceScore === 'number' &&
    result.confidenceScore >= 0 &&
    result.confidenceScore <= 100 &&
    typeof result.reasoning === 'string' &&
    typeof result.mockMode === 'boolean'
  )
}
