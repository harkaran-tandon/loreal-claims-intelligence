import { Check, Copy, FlaskConical, ShieldAlert, X } from 'lucide-react'
import { useState } from 'react'
import type { AssessmentResponse } from '../lib/claims-api'

interface AssessmentResultProps {
  result: AssessmentResponse
}

export function AssessmentResult({ result }: AssessmentResultProps) {
  const [copied, setCopied] = useState<'claim' | 'assessment' | null>(null)

  async function copyId(kind: 'claim' | 'assessment', value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      window.setTimeout(() => setCopied(null), 1600)
    } catch {
      setCopied(null)
    }
  }

  return (
    <section
      className={`result-card ${result.justified ? 'result-card--justified' : 'result-card--unjustified'}`}
      aria-labelledby="result-title"
      aria-live="polite"
    >
      {result.mockMode && (
        <div className="mock-notice">
          <FlaskConical size={15} aria-hidden="true" />
          <span>Demo / Mock AI</span>
          <span className="mock-notice__detail">
            Simulated fixture — not a scientific assessment
          </span>
        </div>
      )}

      <div className="result-card__heading">
        <div>
          <p className="eyebrow">SCIENTIFIC INTELLIGENCE REPORT</p>
          <h2 id="result-title">Assessment outcome</h2>
        </div>
        <span
          className={`decision-badge ${result.justified ? 'decision-badge--yes' : 'decision-badge--no'}`}
        >
          {result.justified ? (
            <Check size={15} aria-hidden="true" />
          ) : (
            <X size={15} aria-hidden="true" />
          )}
          {result.justified ? 'Justified' : 'Not justified'}
        </span>
      </div>

      <div className="confidence">
        <div className="confidence__labels">
          <span>Model confidence score</span>
          <strong>{result.confidenceScore}<small> / 100</small></strong>
        </div>
        <div
          className="confidence__track"
          role="progressbar"
          aria-label="Confidence score"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={result.confidenceScore}
        >
          <span style={{ width: `${result.confidenceScore}%` }} />
        </div>
        <p className="confidence__note">A model-generated judgment score, not a calibrated probability.</p>
      </div>

      <div className="reasoning">
        <div className="reasoning__icon" aria-hidden="true">
          <ShieldAlert size={17} />
        </div>
        <div>
          <h3>Scientific reasoning</h3>
          <p>{result.reasoning}</p>
        </div>
      </div>

      <div className="record-ids">
        <IdRow
          label="Claim ID"
          value={result.claimId}
          copied={copied === 'claim'}
          onCopy={() => void copyId('claim', result.claimId)}
        />
        <IdRow
          label="Assessment ID"
          value={result.assessmentId}
          copied={copied === 'assessment'}
          onCopy={() => void copyId('assessment', result.assessmentId)}
        />
      </div>
    </section>
  )
}

interface IdRowProps {
  label: string
  value: string
  copied: boolean
  onCopy: () => void
}

function IdRow({ label, value, copied, onCopy }: IdRowProps) {
  return (
    <div className="id-row">
      <span className="id-row__label">{label}</span>
      <code title={value}>{value}</code>
      <button
        type="button"
        className="icon-button"
        onClick={onCopy}
        aria-label={`Copy ${label.toLowerCase()}`}
        title={copied ? 'Copied' : `Copy ${label.toLowerCase()}`}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  )
}
