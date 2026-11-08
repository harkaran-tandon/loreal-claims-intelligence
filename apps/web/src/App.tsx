import {
  ArrowRight,
  Atom,
  CircleHelp,
  FileText,
  FileCheck2,
  FlaskConical,
  Microscope,
  ScanSearch,
  ShieldCheck,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { AssessmentResult } from './components/AssessmentResult'
import { assessClaim, type AssessmentResponse } from './lib/claims-api'
import './App.css'

function App() {
  const [claim, setClaim] = useState('')
  const [evidence, setEvidence] = useState('')
  const [result, setResult] = useState<AssessmentResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function updateClaim(value: string) {
    setClaim(value)
    setError(null)
    setResult(null)
  }

  function updateEvidence(value: string) {
    setEvidence(value)
    setError(null)
    setResult(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedClaim = claim.trim()
    const normalizedEvidence = evidence.trim()

    if (!normalizedClaim || !normalizedEvidence) {
      setError('Enter both a product claim and its supporting clinical evidence.')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const assessment = await assessClaim({
        claim: normalizedClaim,
        evidence: normalizedEvidence,
      })
      setResult(assessment)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The assessment could not be completed. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#main" aria-label="Claims Intelligence Engine home">
          <span className="brand__wordmark" aria-hidden="true">L'ORÉAL</span>
          <span className="brand__divider" aria-hidden="true" />
          <span className="brand__text">
            <strong>Claims Intelligence Engine</strong>
            <span>Research &amp; Innovation</span>
          </span>
        </a>
        <div className="topbar__right">
          <span className="workspace-label">
            <span className="workspace-label__dot" />
            Scientific workspace
          </span>
          <span className="topbar__divider" />
          <span className="topbar__edition">ASSESSMENT STUDIO</span>
        </div>
      </header>

      <main id="main">
        <section className="intro" aria-labelledby="page-title">
          <div className="intro__copy">
            <p className="eyebrow intro__eyebrow">RESEARCH &amp; INNOVATION · CLAIMS REVIEW</p>
            <h1 id="page-title">Where science meets confidence.</h1>
            <p className="intro__description">
              AI-powered clinical evidence assessment for responsible product claims.
            </p>
          </div>
          <div className="intro-art" aria-hidden="true">
            <svg viewBox="0 0 300 190" fill="none">
              <path className="intro-art__line" d="M37 139 93 83l53 28 54-66 61 48" />
              <path className="intro-art__line intro-art__line--fine" d="m93 83 11-56m42 84 20 48m34-114 54-13" />
              <circle className="intro-art__orbit" cx="147" cy="111" r="52" />
              <circle className="intro-art__node" cx="37" cy="139" r="4" />
              <circle className="intro-art__node" cx="93" cy="83" r="5" />
              <circle className="intro-art__node intro-art__node--center" cx="146" cy="111" r="7" />
              <circle className="intro-art__node" cx="200" cy="45" r="5" />
              <circle className="intro-art__node" cx="261" cy="93" r="4" />
              <circle className="intro-art__node intro-art__node--small" cx="104" cy="27" r="3" />
              <circle className="intro-art__node intro-art__node--small" cx="167" cy="159" r="3" />
              <circle className="intro-art__node intro-art__node--small" cx="254" cy="32" r="3" />
              <path className="intro-art__spark" d="M146 98v26m-13-13h26" />
            </svg>
            <span>OBSERVE <i /> EVALUATE <i /> REVIEW</span>
          </div>
        </section>

        <div className="workspace-grid">
          <section className="panel assessment-panel" aria-labelledby="form-heading">
            <div className="panel-heading">
              <div className="panel-heading__icon" aria-hidden="true">
                <FlaskConical size={18} />
              </div>
              <div>
                <p className="eyebrow">NEW REVIEW</p>
                <h2 id="form-heading">Claim &amp; evidence</h2>
              </div>
              <span className="required-note">* Required</span>
            </div>

            <form onSubmit={handleSubmit} noValidate aria-busy={loading}>
              <div className="field">
                <div className="field__label-line">
                  <label htmlFor="claim">Product claim <span>*</span></label>
                  <span className="field__hint">The exact wording to assess</span>
                </div>
                <textarea
                  id="claim"
                  name="claim"
                  value={claim}
                  onChange={(event) => updateClaim(event.target.value)}
                  placeholder="e.g. Improves skin hydration by 15% after 2 weeks"
                  maxLength={2000}
                  required
                  aria-describedby="claim-help"
                  rows={3}
                />
                <div className="field__footer" id="claim-help">
                  <span>Be specific about the benefit, magnitude, and timeframe.</span>
                  <span>{claim.length}/2000</span>
                </div>
              </div>

              <div className="field">
                <div className="field__label-line">
                  <label htmlFor="evidence">Clinical evidence <span>*</span></label>
                  <span className="field__hint">Study results and context</span>
                </div>
                <textarea
                  id="evidence"
                  name="evidence"
                  value={evidence}
                  onChange={(event) => updateEvidence(event.target.value)}
                  placeholder="Describe the study design, participants, duration, comparator, measured outcomes, and statistical findings..."
                  maxLength={20000}
                  required
                  aria-describedby="evidence-help"
                  rows={7}
                />
                <div className="field__footer" id="evidence-help">
                  <span>Include study details; do not omit limitations.</span>
                  <span>{evidence.length}/20000</span>
                </div>
              </div>

              {error && (
                <div className="error-message" role="alert">
                  <CircleHelp size={17} aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <div className="form-actions">
                <span className="form-actions__privacy">
                  <ShieldCheck size={15} aria-hidden="true" />
                  Evidence is assessed by your configured API.
                </span>
                <button className="submit-button" type="submit" disabled={loading} aria-busy={loading}>
                  {loading ? (
                    <>
                      <span className="spinner" aria-hidden="true" />
                      Assessing evidence
                    </>
                  ) : (
                    <>
                      Assess claim
                      <ArrowRight size={16} aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          <aside className="result-column" aria-label="Assessment result">
            {result ? (
              <AssessmentResult result={result} />
            ) : (
              <EmptyResult loading={loading} />
            )}
            <div className="method-note">
              <div className="method-note__icon" aria-hidden="true">
                <FileCheck2 size={16} />
              </div>
              <p>
                AI-generated assessments are advisory and require review by
                qualified scientific and regulatory professionals.
              </p>
            </div>
          </aside>
        </div>
      </main>

      <footer className="footer">
        <span>Claims Intelligence Engine</span>
        <span>Independent technical assessment prototype · Not an official L'Oréal product</span>
      </footer>
    </div>
  )
}

function EmptyResult({ loading }: { loading: boolean }) {
  return (
    <section
      className={`empty-result ${loading ? 'empty-result--loading' : ''}`}
      aria-live="polite"
      aria-label="Assessment status"
    >
      <div className="empty-result__symbol" aria-hidden="true">
        {loading ? <span className="large-spinner" /> : <FlaskConical size={24} />}
      </div>
      <p className="eyebrow">{loading ? 'REVIEW IN PROGRESS' : 'ASSESSMENT WORKFLOW'}</p>
      <h2>{loading ? 'Assessing evidence' : 'A considered review, from claim to evidence'}</h2>
      <p>
        {loading
          ? 'The submitted claim and evidence are being evaluated.'
          : 'Submit a claim to begin. Each stage supports a structured, evidence-led assessment.'}
      </p>
      <ol className="workflow-steps" aria-label="Three-stage assessment workflow">
        <li>
          <span className="workflow-steps__icon"><FileText size={16} aria-hidden="true" /></span>
          <span className="workflow-steps__number">01</span>
          <strong>Claim Submission</strong>
        </li>
        <li>
          <span className="workflow-steps__icon"><ScanSearch size={16} aria-hidden="true" /></span>
          <span className="workflow-steps__number">02</span>
          <strong>AI Evidence Analysis</strong>
        </li>
        <li>
          <span className="workflow-steps__icon"><Microscope size={16} aria-hidden="true" /></span>
          <span className="workflow-steps__number">03</span>
          <strong>Scientific Assessment</strong>
        </li>
      </ol>
      <p className="workflow-note">
        <Atom size={13} aria-hidden="true" />
        {loading ? 'Assessment in progress' : 'Ready when you are'}
      </p>
    </section>
  )
}

export default App
