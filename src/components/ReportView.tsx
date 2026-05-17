import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  FileText,
  Scale,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";
import type { ClassificationInput, ClassificationResult, LegalBasisReference, RiskTier } from "../engine/types";
import { formatDateTime } from "../lib/utils";

type ReportViewProps = {
  input: ClassificationInput;
  result: ClassificationResult | null;
};

const scopeLabel = (input: ClassificationInput) => {
  const parts: string[] = [];
  if (input.scope.usedInEU) parts.push("Used in the EU");
  if (input.scope.placedOnEUMarket) parts.push("Placed on the EU market");
  if (input.scope.affectsEUUsers) parts.push("Affects EU users");
  return parts.length ? parts.join(", ") : "EU scope not established";
};

const formatLegalBasis = (basis: LegalBasisReference) => {
  const prefix = [basis.article, basis.annex, basis.point ? `point ${basis.point}` : ""]
    .filter(Boolean)
    .join(" + ");
  return prefix ? `${prefix}: ${basis.title}` : basis.title;
};

const formatRouteItem = (
  route: ClassificationResult["matchedRoutes"][number],
  finalRiskTier: ClassificationResult["riskTier"]
) => {
  const basis =
    route.legalBasis.map((item) => formatLegalBasis(item)).join("; ") ||
    route.title ||
    route.ruleId;
  const prefix =
    finalRiskTier === "Potentially prohibited" && route.tier === "high_risk"
      ? "Secondary high-risk route also matched"
      : route.tier === "limited_risk"
        ? "Transparency route may be triggered"
        : "Matched route";

  return `${prefix}: ${basis}. ${route.explanation}`;
};

export function ReportView({ input, result }: ReportViewProps) {
  if (!result) return null;
  const reviewStatus = result.reviewStatus.join(", ");
  const legalBasisSummary =
    result.legalBasis.map((basis) => formatLegalBasis(basis)).join("; ") ||
    "No Article 5, Article 6, or Article 50 route triggered";
  const matchedRouteItems = result.matchedRoutes.map((route) =>
    formatRouteItem(route, result.riskTier)
  );

  return (
    <section id="report" className="print-report container pb-16">
      <article className="memo animate-slide-up">
        {/* Header */}
        <header className="memo-header">
          <div className="memo-meta">
            <span className="tier-badge" data-tier={result.tier}>
              {result.riskTier}
            </span>
            <span className="status-badge" data-status="neutral">
              Version {result.assessmentVersion}
            </span>
            <span className="status-badge" data-status="neutral">
              {reviewStatus}
            </span>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="memo-title text-balance">
                {input.systemName || "AI System"} Classification
              </h2>
              <p className="memo-summary">{result.explanation}</p>
            </div>

            <div className="flex-shrink-0 lg:w-72">
              <div className="rounded-lg border bg-background p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="font-semibold">{result.confidenceLabel}</span>
                </div>
                <div className="confidence-meter mt-3">
                  <div
                    className="confidence-meter-fill"
                    data-tier={result.tier}
                    style={{ width: `${result.confidence}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {result.confidenceExplanation}
                </p>
                <p className="mt-2 text-xs text-muted-foreground/60">
                  Generated {formatDateTime(result.generatedAt)}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Stats row */}
        <div className="memo-stats">
          <StatCard
            label="Final risk tier"
            value={result.riskTier}
          />
          <StatCard
            label="Review status"
            value={reviewStatus}
          />
          <StatCard
            label="Confidence"
            value={result.confidenceLabel}
          />
          <StatCard
            label="Legal basis"
            value={legalBasisSummary}
          />
        </div>

        {/* Main content */}
        <div className="memo-body">
          <div className="flex flex-col gap-4">
            {/* Executive Summary */}
            <MemoSection eyebrow="Overview" title="Executive Summary">
              <p className="memo-text">{result.explanation}</p>
              <p className="memo-text mt-3">{result.recommendation}</p>
            </MemoSection>

            <MemoSection eyebrow="Basis" title="Legal Basis">
              {result.legalBasis.length === 0 ? (
                <p className="memo-text">No Article 5, Article 6, or Article 50 legal basis is triggered by the current facts.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {result.legalBasis.map((basis) => (
                    <div key={`${basis.article}-${basis.annex}-${basis.point}-${basis.title}`} className="rounded-md border bg-card p-3">
                      <p className="text-sm font-medium">{formatLegalBasis(basis)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{basis.relevance}</p>
                    </div>
                  ))}
                </div>
              )}
            </MemoSection>

            <MemoSection eyebrow="Routes" title="Matched Legal Routes">
              <div className="grid gap-4 lg:grid-cols-2">
                <ActionList title="Matched routes" items={matchedRouteItems} />
                <ActionList
                  title="Uncertainty notes"
                  items={result.uncertaintyNotes.length ? result.uncertaintyNotes : ["No soft uncertainty notes beyond missing facts and review status."]}
                />
              </div>
            </MemoSection>

            {/* System Description */}
            <MemoSection eyebrow="Facts" title="AI System Description">
              <div className="memo-fact-grid">
                <MemoFact label="System" value={input.systemName || "Not specified"} />
                <MemoFact label="Provider" value={input.providerName || "Not specified"} />
                <MemoFact label="Actor role" value={result.actorRole.replace(/_/g, " ")} />
                <MemoFact label="System type" value={result.systemType.replace(/_/g, " ")} />
                <MemoFact label="EU scope" value={scopeLabel(input)} />
                <MemoFact label="Interaction" value={input.interactionMode.replace(/_/g, " ")} />
                <MemoFact label="Decision mode" value={input.decisionMode.replace(/_/g, " ")} />
                <MemoFact
                  label="People affected"
                  value={input.affectedPeople.length ? input.affectedPeople.join(", ") : "Not specified"}
                />
              </div>
              <p className="memo-text mt-4">
                {input.systemDescription || "No description provided."}
              </p>
            </MemoSection>

            {/* Reasoning Pipeline */}
            <MemoSection eyebrow="Reasoning" title="Classification Pipeline">
              <div className="pipeline">
                {result.pipeline.map((step, index) => (
                  <div key={step.id} className="pipeline-step" data-status={step.status}>
                    <div className="pipeline-track">
                      <span className="pipeline-node">{index + 1}</span>
                      {index < result.pipeline.length - 1 && (
                        <span className="pipeline-line" />
                      )}
                    </div>
                    <div className="pipeline-card">
                      <div className="pipeline-card-header">
                        <span className="pipeline-card-title">{step.title}</span>
                        <span className="pipeline-card-status">{step.status}</span>
                      </div>
                      <p className="pipeline-card-text">{step.summary}</p>
                      {step.details.length > 0 && (
                        <div className="pipeline-card-details">
                          {step.details.map((detail) => (
                            <div key={detail} className="pipeline-detail">
                              <CheckCircle2
                                className="pipeline-detail-icon h-4 w-4"
                                aria-hidden="true"
                              />
                              <span>{detail}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <details className="mt-3 rounded-md border bg-muted/30 p-2.5">
                        <summary className="flex cursor-pointer items-center justify-between text-sm font-medium">
                          Legal basis
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </summary>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {step.legalBasis}
                        </p>
                      </details>
                    </div>
                  </div>
                ))}
              </div>
            </MemoSection>

            <MemoSection eyebrow="Facts" title="Facts Used">
              <div className="grid gap-4 lg:grid-cols-2">
                <ActionList title="Selected facts" items={result.factsUsed} />
                <ActionList title="Risk basis" items={result.riskBasis.length ? result.riskBasis : ["No high-risk factual chain identified."]} />
                <ActionList title="Inferred facts" items={result.inferredSignals.length ? result.inferredSignals : ["No inferred facts beyond selected answers."]} />
                <ActionList title="Selected signals" items={result.selectedSignals.length ? result.selectedSignals : ["No selected risk signals."]} />
              </div>
            </MemoSection>

            <MemoSection eyebrow="Rules" title="Rejected / Not Triggered Rules">
              <ActionList title="Rules not triggered" items={result.rejectedSignals} />
            </MemoSection>

            {/* Key Assumptions */}
            <MemoSection eyebrow="Assumptions" title="Key Assumptions">
              {result.assumptions.length === 0 ? (
                <p className="memo-text">
                  No explicit assumptions were needed beyond the questionnaire answers.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {result.assumptions.map((item) => (
                    <div
                      key={item}
                      className="rounded-md border px-3 py-2 text-sm text-muted-foreground"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </MemoSection>

            {/* Information Gaps */}
            {result.informationGaps.length > 0 && (
              <MemoSection eyebrow="Gaps" title="Information Gaps">
                <div className="flex flex-col gap-2">
                  {result.informationGaps.map((item) => (
                    <div
                      key={item}
                      className="signal-card"
                      data-tone="warning"
                    >
                      <AlertTriangle className="signal-icon h-4 w-4" />
                      <span className="signal-content">
                        <span className="signal-description">{item}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </MemoSection>
            )}

            {/* Evidence and Testing */}
            <MemoSection eyebrow="Evidence" title="Evidence and Testing">
              <div className="memo-fact-grid">
                <MemoFact
                  label="Evidence files"
                  value={`${input.evidenceDocuments.length}`}
                />
                <MemoFact
                  label="Extracted signals"
                  value={`${result.evidenceFindings.length}`}
                />
                <MemoFact
                  label="Contradictions"
                  value={`${result.contradictions.length}`}
                />
                <MemoFact
                  label="Missing facts"
                  value={`${result.missingFacts.length}`}
                />
              </div>
              <p className="memo-text mt-4">{result.evidenceStatus}</p>

              {result.contradictions.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  {result.contradictions.map((item) => (
                    <div key={item} className="signal-card" data-tone="danger">
                      <span className="signal-content">
                        <span className="signal-description">{item}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {result.evidenceFindings.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-medium">Evidence citations</p>
                  <div className="flex flex-col gap-2">
                    {result.evidenceFindings.map((finding) => (
                      <div
                        key={finding.id}
                        className="rounded-md border bg-card p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{finding.label}</span>
                          <span className="text-xs uppercase text-muted-foreground">
                            {finding.severity}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {finding.plainSummary}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </MemoSection>

            {/* Recommended Actions */}
            <MemoSection eyebrow="Actions" title="Recommended Actions">
              <div className="grid gap-4 lg:grid-cols-2">
                <ActionList title="Required controls" items={result.requiredControls} />
                <ActionList title="What could change" items={result.whatCouldChangeResult} />
                <ActionList title="Recommended actions" items={result.recommendedActions} />
                <ActionList title="Safeguards/readiness" items={result.safeguards.length ? result.safeguards : ["No safeguards selected."]} />
              </div>
            </MemoSection>

            {/* Non-AI-Act Flags */}
            {Object.values(result.nonAIActFlags).some(Boolean) && (
              <MemoSection eyebrow="Adjacent" title="Non-AI-Act Compliance Flags">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(result.nonAIActFlags)
                    .filter(([, value]) => value)
                    .map(([key]) => (
                      <span
                        key={key}
                        className="rounded-md border bg-card px-2.5 py-1 text-sm"
                      >
                        {key
                          .replace(/([A-Z])/g, " $1")
                          .replace(/^./, (c) => c.toUpperCase())}
                      </span>
                    ))}
                </div>
                <p className="memo-text mt-3">
                  These flags do not automatically make the system high-risk, but they
                  should be reviewed separately.
                </p>
              </MemoSection>
            )}
          </div>

          {/* Sidebar */}
          <aside className="flex flex-col gap-4">
            {/* Confidence Panel */}
            <div className="rounded-lg border bg-background p-4">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Confidence
              </span>
              <p className="mt-2 text-2xl font-semibold">
                {result.confidenceLabel}
              </p>
              <div className="confidence-meter mt-3">
                <div
                  className="confidence-meter-fill"
                  data-tier={result.tier}
                  style={{ width: `${result.confidence}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {result.confidenceExplanation}
              </p>
              <p className="mt-2 text-xs text-muted-foreground/60">
                Heuristic quality score, not legal probability.
              </p>
            </div>

            {/* Legal References */}
            {input.showLegalBasis && result.citations.length > 0 && (
              <div className="rounded-lg border bg-background p-4">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Legal References
                </span>
                <div className="mt-3 flex flex-col gap-2">
                  {result.citations.map((citation) => (
                    <details
                      key={citation.id}
                      className="rounded-md border bg-card p-3"
                    >
                      <summary className="cursor-pointer text-sm font-medium">
                        {citation.legalBasis}
                      </summary>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {citation.plainExplanation}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            )}

            {/* Compliance Checklist */}
            {result.checklist.length > 0 && (
              <div className="rounded-lg border bg-background p-4">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Compliance Checklist
                </span>
                <div className="mt-3 flex flex-col gap-2">
                  {result.checklist.slice(0, 5).map((item) => (
                    <div
                      key={`${item.legalBasis}-${item.title}`}
                      className="rounded-md border bg-card p-3"
                    >
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audit Trail */}
            <div className="rounded-lg border bg-background p-4">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Audit Trail
              </span>
              {result.assessmentVersion ? (
                <div className="mt-3 rounded-md border bg-card p-3">
                  <p className="text-sm font-medium">
                    Version {result.assessmentVersion}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(result.generatedAt)}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  Not saved to audit history yet.
                </p>
              )}
            </div>

            {/* Disclaimer */}
            <div className="rounded-lg border bg-background p-4">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Disclaimer
              </span>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                {result.disclaimer}
              </p>
            </div>
          </aside>
        </div>
      </article>
    </section>
  );
}

// ==================== SUB-COMPONENTS ====================

function MemoSection({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="memo-section">
      <div className="memo-section-header">
        <span className="memo-section-eyebrow">{eyebrow}</span>
        <h3 className="memo-section-title">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function MemoFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="memo-fact">
      <span className="memo-fact-label">{label}</span>
      <span className="memo-fact-value">{value}</span>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value}</span>
    </div>
  );
}

function ActionList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="text-sm font-medium">{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">None listed.</p>
      ) : (
        <div className="mt-2 flex flex-col gap-1">
          {items.map((item) => (
            <div key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
