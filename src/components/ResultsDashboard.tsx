import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Download,
  FileCheck2,
  FileText,
  History,
  Lightbulb,
  Loader2,
  RefreshCw,
  Scale,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";
import { exportEvidenceBundle, type AuditRecord } from "../audit/auditStore";
import type { ClassificationInput, ClassificationResult, RiskTier } from "../engine/types";
import { getEvidenceState, getIntakeState } from "../lib/assessmentSignals";
import { formatDateTime } from "../lib/utils";

type ResultsDashboardProps = {
  input: ClassificationInput;
  result: ClassificationResult | null;
  auditRecords: AuditRecord[];
  onReset: () => void;
  onPrint: () => void;
  exportingReport: boolean;
  exportError: string;
};

export function ResultsDashboard({
  input,
  result,
  auditRecords,
  onReset,
  onPrint,
  exportingReport,
  exportError,
}: ResultsDashboardProps) {
  if (!result) {
    return (
      <section className="no-print container pb-16">
        <div className="empty-memo">
          <span className="empty-memo-icon">
            <Scale className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
          </span>
          <h2 className="empty-memo-title">Memo not generated yet</h2>
          <p className="empty-memo-copy">
            Complete the guided assessment to produce a provisional tier, reasoning
            pipeline, evidence summary, and exportable screening memo.
          </p>
          <button type="button" disabled className="btn btn-secondary mt-6">
            <Download className="h-4 w-4" aria-hidden="true" />
            Export report
          </button>
        </div>
      </section>
    );
  }

  const recentRecords = auditRecords
    .filter((r) => r.systemName === input.systemName)
    .slice(0, 3);
  const mainReason = result.mainReason || result.summary;
  const reviewStatus = result.reviewStatus.join(", ");
  const legalBasisSummary =
    result.legalBasis.map((basis) =>
      [basis.article, basis.annex, basis.point ? `point ${basis.point}` : ""].filter(Boolean).join(" + ") || basis.title,
    ).join("; ") || "No legal basis triggered";
  const intakeState = getIntakeState(input);
  const evidenceState = getEvidenceState(input, result);

  return (
    <section className="no-print container pb-16">
      <div className="memo animate-slide-up">
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
                {input.systemName || "AI System"} Assessment
              </h2>
              <p className="memo-summary">{result.explanation}</p>
              <p className="mt-2 text-sm font-medium" style={{ color: getTierColor(result.tier) }}>
                {legalBasisSummary}
              </p>
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

        {/* Stats */}
        <div className="memo-stats">
          <StatCard label="Final risk tier" value={result.riskTier} hint="Legal tier" />
          <StatCard label="Review status" value={reviewStatus} hint="Review layer" />
          <StatCard
            label="Evidence status"
            value={evidenceState}
            hint={
              input.evidenceDocuments.length
                ? `${input.evidenceDocuments.length} file(s)`
                : "None uploaded"
              }
          />
          <StatCard label="Input quality" value={intakeState} hint="Readiness state" />
        </div>

        {/* Content */}
        <div className="memo-body">
          <div className="flex flex-col gap-4">
            {/* Executive Summary */}
            <Panel title="Legal reasoning summary" icon={<Scale className="h-5 w-5" />}>
              <p className="memo-text">{mainReason}</p>
              {result.legalBasis.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  {result.legalBasis.map((basis) => (
                    <div key={`${basis.article}-${basis.annex}-${basis.point}-${basis.title}`} className="rounded-md border bg-card px-3 py-2 text-sm">
                      <span className="font-medium">{[basis.article, basis.annex, basis.point ? `point ${basis.point}` : ""].filter(Boolean).join(" + ")}</span>
                      <span className="text-muted-foreground">: {basis.title}. {basis.relevance}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            {/* Facts Used */}
            <Panel title="Why this tier?" icon={<Scale className="h-5 w-5" />}>
              <p className="memo-text mb-3">{result.explanation}</p>
              <div className="flex flex-wrap gap-2">
                {result.riskBasis.length ? result.riskBasis.map((fact) => (
                  <span
                    key={fact}
                    className="rounded-md border bg-card px-2.5 py-1 text-sm"
                  >
                    {fact}
                  </span>
                )) : result.factsUsed.slice(0, 8).map((fact) => (
                  <span key={fact} className="rounded-md border bg-card px-2.5 py-1 text-sm">
                    {fact}
                  </span>
                ))}
              </div>
            </Panel>

            {/* Reasoning Pipeline */}
            <Panel title="Reasoning pipeline" icon={<ShieldCheck className="h-5 w-5" />}>
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
                              <CheckCircle2 className="pipeline-detail-icon h-4 w-4" />
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
            </Panel>

            {/* Facts and Gaps */}
            <Panel title="Facts, signals, and gaps" icon={<FileText className="h-5 w-5" />}>
              <div className="grid gap-4 lg:grid-cols-2">
                <Subpanel title="Selected risk signals">
                  {result.selectedSignals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">None selected.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {result.selectedSignals.map((s) => (
                        <span
                          key={s}
                          className="rounded-md border border-warning/30 bg-warning/10 px-2 py-0.5 text-sm"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </Subpanel>

                <Subpanel title="Inferred facts">
                  {result.inferredSignals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">None inferred beyond selected answers.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {result.inferredSignals.map((s) => (
                        <span key={s} className="rounded-md border bg-card px-2 py-0.5 text-sm">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </Subpanel>

                <Subpanel title="Matched legal routes">
                  <div className="flex flex-col gap-1.5">
                    {result.matchedRoutes.map((route) => (
                      <div key={route.ruleId} className="rounded-md border bg-card px-2.5 py-1.5 text-sm text-muted-foreground">
                        {formatRouteSummary(route, result.riskTier)}
                      </div>
                    ))}
                  </div>
                </Subpanel>

                <Subpanel title="Rules not triggered">
                  <div className="flex flex-col gap-1.5">
                    {result.rejectedSignals.slice(0, 4).map((s) => (
                      <div key={s} className="rounded-md border bg-card px-2.5 py-1.5 text-sm text-muted-foreground">
                        {s}
                      </div>
                    ))}
                  </div>
                </Subpanel>

                <Subpanel title="Uncertainty notes">
                  {result.uncertaintyNotes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No soft uncertainty notes.</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {result.uncertaintyNotes.map((note) => (
                        <div key={note} className="rounded-md border border-warning/30 bg-warning/10 px-2.5 py-1.5 text-sm">
                          {note}
                        </div>
                      ))}
                    </div>
                  )}
                </Subpanel>

                <Subpanel title="Contradictions or missing">
                  {result.contradictions.length === 0 &&
                  result.missingFacts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {input.evidenceDocuments.length
                        ? "No contradictions detected."
                        : "No contradictions, but no evidence to verify."}
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {result.contradictions.map((c) => (
                        <div
                          key={c}
                          className="rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-1.5 text-sm"
                        >
                          {c}
                        </div>
                      ))}
                      {result.missingFacts.map((m) => (
                        <div
                          key={m}
                          className="rounded-md border border-warning/30 bg-warning/10 px-2.5 py-1.5 text-sm"
                        >
                          Missing: {m}
                        </div>
                      ))}
                    </div>
                  )}
                </Subpanel>

                <Subpanel title="Information gaps">
                  {result.informationGaps.length === 0 ? (
                    <p className="text-sm text-muted-foreground">None identified.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {result.informationGaps.map((g) => (
                        <span key={g} className="rounded-md border bg-card px-2 py-0.5 text-sm">
                          {g}
                        </span>
                      ))}
                    </div>
                  )}
                </Subpanel>

                <Subpanel title="Required controls">
                  <div className="flex flex-wrap gap-1.5">
                    {result.requiredControls.map((c) => (
                      <span
                        key={c}
                        className="rounded-md border border-success/30 bg-success/10 px-2 py-0.5 text-sm"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </Subpanel>
              </div>
            </Panel>
          </div>

          {/* Sidebar */}
          <aside className="flex flex-col gap-4">
            {/* Next Steps */}
            <div className="rounded-lg border bg-background p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 text-accent" />
                Recommended next steps
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {result.recommendedActions.map((step) => (
                  <div key={step} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* What Could Change */}
            <SidePanel title="What could change" icon={<Lightbulb className="h-4 w-4" />}>
              <div className="flex flex-col gap-2">
                {result.whatCouldChangeResult.map((action) => (
                  <div key={action} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </SidePanel>

            {/* Checklist */}
            {result.checklist.length > 0 && (
              <SidePanel title="Compliance checklist" icon={<FileCheck2 className="h-4 w-4" />}>
                <div className="flex flex-col gap-2">
                  {result.checklist.slice(0, 4).map((item) => (
                    <div key={`${item.title}-${item.legalBasis}`} className="rounded-md border bg-card p-2.5">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  ))}
                </div>
              </SidePanel>
            )}

            {/* Citations */}
            {result.citations.length > 0 && (
              <SidePanel title="Legal references" icon={<Scale className="h-4 w-4" />}>
                <div className="flex flex-col gap-2">
                  {result.citations.slice(0, 3).map((citation) => (
                    <details key={citation.id} className="rounded-md border bg-card p-2.5">
                      <summary className="cursor-pointer text-sm font-medium">
                        {citation.legalBasis}
                      </summary>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {citation.plainExplanation}
                      </p>
                    </details>
                  ))}
                </div>
              </SidePanel>
            )}

            {/* Audit Trail */}
            <SidePanel title="Local audit trail" icon={<History className="h-4 w-4" />}>
              {recentRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground">Not saved yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {recentRecords.map((record) => (
                    <div key={record.id} className="rounded-md border bg-card p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Version {record.version}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(record.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs capitalize text-muted-foreground">
                        {record.tier.replace(/_/g, " ")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </SidePanel>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={onReset} className="btn btn-secondary">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                New run
              </button>
              <button
                type="button"
                onClick={onPrint}
                disabled={exportingReport}
                className="btn btn-primary"
              >
                {exportingReport ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Download className="h-4 w-4" aria-hidden="true" />
                )}
                {exportingReport ? "Preparing..." : "Export report"}
              </button>
            </div>
            {exportError && (
              <div className="signal-card" data-tone="danger" role="alert" aria-live="polite">
                <AlertTriangle className="signal-icon h-4 w-4" aria-hidden="true" />
                <span className="signal-content">
                  <span className="signal-title">Export failed</span>
                  <span className="signal-description">{exportError}</span>
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => exportEvidenceBundle(input, result)}
              className="btn btn-secondary w-full"
            >
              <FileCheck2 className="h-4 w-4" aria-hidden="true" />
              Export evidence bundle
            </button>
          </aside>
        </div>
      </div>
    </section>
  );
}

// ==================== HELPERS ====================

function getTierColor(tier: RiskTier): string {
  const colors: Record<RiskTier, string> = {
    unacceptable: "hsl(var(--risk-unacceptable))",
    high: "hsl(var(--risk-high))",
    limited: "hsl(var(--risk-limited))",
    minimal: "hsl(var(--risk-minimal))",
    out_of_scope: "hsl(var(--muted-foreground))",
    needs_review: "hsl(var(--muted-foreground))",
  };
  return colors[tier];
}

function formatBasisForRoute(route: ClassificationResult["matchedRoutes"][number]) {
  return route.legalBasis
    .map((basis) =>
      [basis.article, basis.annex, basis.point ? `point ${basis.point}` : ""]
        .filter(Boolean)
        .join(" + ") || basis.title
    )
    .join("; ");
}

function formatRouteSummary(
  route: ClassificationResult["matchedRoutes"][number],
  finalTier: ClassificationResult["riskTier"]
) {
  const prefix =
    finalTier === "Potentially prohibited" && route.tier === "high_risk"
      ? "Secondary high-risk route also matched"
      : route.tier === "limited_risk"
        ? "Transparency route may be triggered"
        : "Matched";
  const basis = formatBasisForRoute(route) || route.title || route.ruleId;
  return `${prefix}: ${basis}. ${route.explanation}`;
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="memo-panel">
      <div className="memo-panel-heading">
        <span className="text-accent">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function SidePanel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="memo-side-panel">
      <div className="memo-side-heading">
        <span className="text-accent">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function Subpanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="memo-subpanel">
      <p className="memo-subpanel-title">{title}</p>
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="metric-card">
      <span className="metric-label">{label}</span>
      <span className="metric-value truncate">{value}</span>
      <span className="metric-hint">{hint}</span>
    </div>
  );
}
