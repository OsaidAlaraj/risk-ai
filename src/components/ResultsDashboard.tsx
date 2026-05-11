import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Download,
  FileCheck2,
  FileText,
  History,
  Lightbulb,
  Scale,
  ShieldAlert,
} from "lucide-react";
import type { ReactNode } from "react";
import { exportEvidenceBundle, type AuditRecord } from "../audit/auditStore";
import type { ClassificationInput, ClassificationResult, RiskTier } from "../engine/types";
import { riskTierDescriptions, riskTierLabels } from "../engine/types";
import { getEvidenceState, getIntakeState } from "../lib/assessmentSignals";
import { cx, formatDateTime } from "../lib/utils";

type ResultsDashboardProps = {
  input: ClassificationInput;
  result: ClassificationResult | null;
  auditRecords: AuditRecord[];
  onReset: () => void;
  onPrint: () => void;
};

const tierClasses: Record<RiskTier, { badge: string; accent: string; bar: string; soft: string }> = {
  out_of_scope: { badge: "bg-slate-100 text-slate-700 border-slate-200", accent: "text-slate-700", bar: "bg-slate-500", soft: "bg-slate-500/10" },
  unacceptable: { badge: "bg-red-50 text-red-800 border-red-200", accent: "text-red-700", bar: "bg-risk-unacceptable", soft: "bg-red-50" },
  high: { badge: "bg-orange-50 text-orange-800 border-orange-200", accent: "text-orange-700", bar: "bg-risk-high", soft: "bg-orange-50" },
  limited: { badge: "bg-amber-50 text-amber-800 border-amber-200", accent: "text-amber-700", bar: "bg-risk-limited", soft: "bg-amber-50" },
  minimal: { badge: "bg-emerald-50 text-emerald-800 border-emerald-200", accent: "text-emerald-700", bar: "bg-risk-minimal", soft: "bg-emerald-50" },
  needs_review: { badge: "bg-violet-50 text-violet-800 border-violet-200", accent: "text-violet-700", bar: "bg-violet-500", soft: "bg-violet-50" },
};

export function ResultsDashboard({ input, result, auditRecords, onReset, onPrint }: ResultsDashboardProps) {
  if (!result) {
    return (
      <section className="no-print page-grid pb-16">
        <div className="empty-report">
          <Scale className="mx-auto h-10 w-10 text-bronze" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-semibold text-ink">Memo not generated yet</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted">
            Complete the guided assessment to produce a provisional tier, reasoning pipeline, evidence summary, and exportable screening memo.
          </p>
        </div>
      </section>
    );
  }

  const tier = tierClasses[result.tier];
  const recentRecords = auditRecords.filter((record) => record.systemName === input.systemName).slice(0, 3);
  const mainReason = result.mainReason || result.summary;
  const intakeState = getIntakeState(input);
  const evidenceState = getEvidenceState(input, result);

  return (
    <section className="no-print page-grid pb-24">
      <div className="result-memo overflow-hidden">
        <header className="border-b border-line px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-3">
                <span className={cx("pill border", tierClasses[result.tier].badge)}>{riskTierLabels[result.tier]}</span>
                <span className="pill pill-neutral">Version {result.assessmentVersion}</span>
                <span className="pill pill-neutral">Scope: {result.scopeStatus.replace(/_/g, " ")}</span>
              </div>
              <h2 className="mt-5 text-3xl font-semibold text-ink">{input.systemName || "AI system"} assessment</h2>
              <p className="mt-3 max-w-3xl text-base leading-7 text-muted">{result.summary}</p>
              <p className={cx("mt-3 text-sm font-semibold", tier.accent)}>{riskTierDescriptions[result.tier]}</p>
            </div>

            <div className="memo-confidence lg:w-80">
              <div className="p-4">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Confidence</span>
                  <span className="font-semibold text-ink">{result.confidenceLabel}</span>
                </div>
                <div className="quality-meter mt-3">
                  <div className={cx("quality-meter-bar", tier.bar)} style={{ width: `${result.confidence}%` }} />
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{result.confidenceExplanation}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">Heuristic quality score, not a legal probability.</p>
                <p className="mt-2 text-xs leading-5 text-slate-400">Generated {formatDateTime(result.generatedAt)}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-4 border-b border-line px-6 py-5 sm:grid-cols-2 xl:grid-cols-4 sm:px-8">
          <SummaryCard label="Input quality" value={intakeState} detail="A readiness state, not a score." />
          <SummaryCard label="Evidence status" value={evidenceState} detail={input.evidenceDocuments.length ? `${input.evidenceDocuments.length} file(s) uploaded` : "No evidence uploaded"} />
          <SummaryCard label="Main reason" value={mainReason} detail="The short explanation used in the report." />
          <SummaryCard label="Rule group" value={result.ruleGroup} detail="The gate that triggered the final tier." />
        </div>

        <div className="grid gap-6 px-6 py-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <Panel title="Executive summary" icon={<Scale className="h-5 w-5" />}>
              <p className="memo-copy">{result.summary}</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{mainReason}</p>
            </Panel>

            <Panel title="Why this classification?" icon={<Scale className="h-5 w-5" />}>
              <div className="mt-1 flex flex-wrap gap-2">
                {result.factsUsed.slice(0, 8).map((fact) => (
                  <span key={fact} className="signal-chip" data-tone="neutral">
                    {fact}
                  </span>
                ))}
              </div>
            </Panel>

            <Panel title="Reasoning pipeline" icon={<ShieldAlert className="h-5 w-5" />}>
              <div className="space-y-4">
                {result.pipeline.map((step, index) => (
                  <div key={step.id} className="grid gap-4 md:grid-cols-[36px_1fr]">
                    <div className="flex flex-col items-center">
                      <span
                        className={cx(
                          "flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold",
                          step.status === "triggered"
                            ? "border-[#d7c19a] bg-[#fff9ef] text-[#8c6a41]"
                            : step.status === "warning" || step.status === "review"
                              ? "border-amber-200 bg-amber-50 text-amber-800"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700",
                        )}
                      >
                        {index + 1}
                      </span>
                      {index < result.pipeline.length - 1 && <span className="mt-2 h-full min-h-10 w-px bg-slate-200" />}
                    </div>
                    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold tracking-[-0.01em] text-slate-950">{step.title}</h3>
                        <span className="rounded-full border border-slate-200 bg-[#fbfaf8] px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">{step.status}</span>
                      </div>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{step.summary}</p>
                      <ul className="mt-3 space-y-2">
                        {step.details.map((detail) => (
                          <li key={detail} className="flex gap-2 text-sm leading-7 text-slate-600">
                            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#7ea88b]" aria-hidden="true" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                      <details className="mt-4 rounded-[1rem] border border-slate-200 bg-[#fbfaf8] p-3">
                        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-slate-950">
                          Show legal basis
                          <ChevronDown className="h-4 w-4" aria-hidden="true" />
                        </summary>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{step.legalBasis}</p>
                      </details>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Facts, signals, and gaps" icon={<ClipboardCheck className="h-5 w-5" />}>
              <div className="grid gap-4 lg:grid-cols-2">
                <Subpanel title="Selected risk signals">
                  {result.selectedSignals.length === 0 ? <EmptyText>No explicit signals were selected.</EmptyText> : <TagList values={result.selectedSignals} tone="amber" />}
                </Subpanel>
                <Subpanel title="Contradictions or missing facts">
                  {result.contradictions.length === 0 && result.missingFacts.length === 0 ? (
                    <EmptyText>{input.evidenceDocuments.length ? "No contradictions were detected in the answers." : "No contradictions detected in the answers, but no evidence was available to verify them."}</EmptyText>
                  ) : (
                    <ul className="space-y-2">
                      {result.contradictions.map((item) => (
                        <li key={item} className="rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
                          {item}
                        </li>
                      ))}
                      {result.missingFacts.map((item) => (
                        <li key={item} className="rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
                          Missing: {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </Subpanel>
                <Subpanel title="Information gaps">
                  {result.informationGaps.length === 0 ? <EmptyText>No major information gaps were identified.</EmptyText> : <TagList values={result.informationGaps} tone="slate" />}
                </Subpanel>
                <Subpanel title="Evidence status">
                  <p className="text-sm leading-6 text-slate-600">{result.evidenceStatus}</p>
                  {result.evidenceWarnings.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {result.evidenceWarnings.map((warning) => (
                        <li key={warning} className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
                          {warning}
                        </li>
                      ))}
                    </ul>
                  )}
                </Subpanel>
                <Subpanel title="Required controls">
                  <TagList values={result.requiredControls} tone="green" />
                </Subpanel>
                <Subpanel title="Key assumptions">
                  {result.assumptions.length === 0 ? <EmptyText>No explicit assumptions were needed beyond the questionnaire answers.</EmptyText> : <TagList values={result.assumptions} tone="slate" />}
                </Subpanel>
                <Subpanel title="Non-AI-Act compliance flags">
                  {Object.values(result.nonAIActFlags).every((flag) => !flag) ? (
                    <EmptyText>No separate compliance flags were selected.</EmptyText>
                  ) : (
                    <TagList values={Object.entries(result.nonAIActFlags).filter(([, value]) => value).map(([key]) => key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase()))} tone="amber" />
                  )}
                </Subpanel>
              </div>
            </Panel>
          </div>

          <aside className="space-y-5">
            <div className="surface-soft p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#8a6a3f]" aria-hidden="true" />
                <div>
                  <h3 className="text-base font-semibold tracking-[-0.01em] text-slate-950">Recommended next steps</h3>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
                    {result.nextSteps.map((step) => (
                      <li key={step} className="flex gap-2">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#7ea88b]" aria-hidden="true" />
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <SidePanel title="What could change the result" icon={<Lightbulb className="h-5 w-5" />}>
              <ul className="space-y-3">
                {result.whatCouldChange.map((action) => (
                  <li key={action} className="flex gap-2 text-sm leading-6 text-slate-600">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#7ea88b]" aria-hidden="true" />
                    {action}
                  </li>
                ))}
              </ul>
            </SidePanel>

            <SidePanel title="Compliance checklist" icon={<ClipboardCheck className="h-5 w-5" />}>
              <div className="space-y-3">
                {result.checklist.map((item) => (
                  <div key={`${item.legalBasis}-${item.title}`} className="rounded-[1.15rem] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                    <h4 className="text-sm font-semibold tracking-[-0.01em] text-slate-950">{item.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-semibold text-[#8a6a3f]">Show legal basis</summary>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{item.legalBasis}</p>
                    </details>
                  </div>
                ))}
              </div>
            </SidePanel>

            {result.citations.length > 0 && (
              <SidePanel title="Legal references considered" icon={<Scale className="h-5 w-5" />}>
                <div className="space-y-3">
                  {result.citations.map((citation) => (
                    <details key={citation.id} className="rounded-[1.15rem] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950">{citation.legalBasis}</summary>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{citation.plainExplanation}</p>
                      <p className="mt-2 text-xs leading-5 text-slate-500">{citation.expertSummary}</p>
                    </details>
                  ))}
                </div>
              </SidePanel>
            )}

            {result.gpaIObligations.length > 0 && (
              <SidePanel title="GPAI obligations" icon={<ShieldAlert className="h-5 w-5" />}>
                <ul className="space-y-3">
                  {result.gpaIObligations.map((item) => (
                    <li key={item} className="rounded-[1rem] border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                      {item}
                    </li>
                  ))}
                </ul>
              </SidePanel>
            )}

            <SidePanel title="Local audit trail" icon={<History className="h-5 w-5" />}>
              {recentRecords.length === 0 ? (
                <p className="text-sm leading-6 text-slate-600">This run has not been saved to local audit history yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentRecords.map((record) => (
                    <div key={record.id} className="rounded-[1rem] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-950">Version {record.version}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(record.createdAt)}</p>
                      </div>
                      <p className="mt-1 text-xs capitalize text-slate-500">{record.tier.replace(/_/g, " ")} category</p>
                    </div>
                  ))}
                </div>
              )}
            </SidePanel>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={onReset} className="btn-secondary">
                <Download className="h-4 w-4" aria-hidden="true" />
                New run
              </button>
              <button type="button" onClick={onPrint} className="btn-primary">
                <FileText className="h-4 w-4" aria-hidden="true" />
                Export
              </button>
            </div>

            <button
              type="button"
              onClick={() => exportEvidenceBundle(input, result)}
              className="btn-secondary w-full"
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

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="summary-card">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-ink">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted">{detail}</p>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="memo-panel p-5">
      <div className="mb-5 flex items-center gap-2 text-base font-semibold text-ink">
        <span className="text-bronze">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function SidePanel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="memo-panel p-5">
      <div className="mb-4 flex items-center gap-2 text-base font-semibold text-ink">
        <span className="text-bronze">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function Subpanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="subpanel">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function TagList({ values, tone = "slate" }: { values: string[]; tone?: "slate" | "green" | "amber" }) {
  const toneMap = {
    slate: "border-slate-200 bg-white text-slate-700",
    green: "border-[#c8d7ca] bg-[#f2f7f3] text-[#3b5b46]",
    amber: "border-[#e4d2a7] bg-[#fbf5e5] text-[#8a6a23]",
  };
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <span key={value} className={cx("rounded-full border px-3 py-1.5 text-sm", toneMap[tone])}>
          {value}
        </span>
      ))}
    </div>
  );
}

function EmptyText({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-6 text-slate-600">{children}</p>;
}
