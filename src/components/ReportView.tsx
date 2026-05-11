import { Scale, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import type { ClassificationInput, ClassificationResult } from "../engine/types";
import { riskTierLabels } from "../engine/types";
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

export function ReportView({ input, result }: ReportViewProps) {
  if (!result) return null;

  return (
    <section id="report" className="no-print page-grid pb-24">
      <article className="result-memo">
        <header className="border-b border-line px-6 py-6 sm:px-8 sm:py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                <span className="brand-mark border border-slate-200 bg-navy-950 text-gold-300">
                  <Scale className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="brand-title text-slate-500">AI Act Risk Classifier Pro</p>
                  <h2 className="memo-title">Screening and documentation memo</h2>
                </div>
              </div>
              <p className="memo-copy mt-4">
                This memo turns the questionnaire answers, evidence state, and rule outcomes into a provisional screening record for educational decision support. It is not legal advice, and it does not claim regulatory approval.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[34rem]">
              <ReportStat label="Generated" value={formatDateTime(result.generatedAt)} />
              <ReportStat label="Version" value={String(result.assessmentVersion)} />
              <ReportStat label="Confidence" value={result.confidenceLabel} />
            </div>
          </div>
        </header>

        <div className="grid gap-4 border-b border-line px-6 py-5 sm:grid-cols-2 xl:grid-cols-4 sm:px-8">
          <ReportStat label="Final category" value={riskTierLabels[result.tier]} />
          <ReportStat label="Input quality" value={result.uncertainty.answerCompleteness >= 75 ? "Ready for screening" : result.uncertainty.answerCompleteness >= 50 ? "Needs clarification" : "High uncertainty"} />
          <ReportStat label="Evidence status" value={result.evidenceStatus} />
          <ReportStat label="Main uncertainty" value={result.confidenceExplanation} />
        </div>

        <div className="px-6 py-6 sm:px-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_340px]">
            <div className="space-y-5">
              <ReportSection title="1. Executive Summary" eyebrow="Overview">
                <p className="memo-copy">{result.summary}</p>
                <p className="mt-4 text-sm leading-7 text-slate-700">{result.mainReason}</p>
                <p className="mt-4 text-sm leading-7 text-slate-700">{result.recommendation}</p>
              </ReportSection>

              <ReportSection title="2. AI System Description" eyebrow="Facts">
                <div className="grid gap-3 sm:grid-cols-2">
                  <ReportFact label="System" value={input.systemName || "Not specified"} />
                  <ReportFact label="Provider" value={input.providerName || "Not specified"} />
                  <ReportFact label="Actor role" value={result.actorRole.replace(/_/g, " ")} />
                  <ReportFact label="System type" value={result.systemType.replace(/_/g, " ")} />
                  <ReportFact label="EU scope" value={scopeLabel(input)} />
                  <ReportFact label="Interaction mode" value={input.interactionMode.replace(/_/g, " ")} />
                  <ReportFact label="Decision mode" value={input.decisionMode.replace(/_/g, " ")} />
                  <ReportFact label="People affected" value={input.affectedPeople.length ? input.affectedPeople.join(", ") : "Not specified"} />
                  <ReportFact label="Data categories" value={input.dataTypes.length ? input.dataTypes.join(", ") : "Not specified"} />
                  <ReportFact label="AI function" value={input.purpose || "Not specified"} />
                </div>
                <p className="mt-5 memo-copy">{input.systemDescription || "No description provided."}</p>
              </ReportSection>

              <ReportSection title="3. Why This Tier Was Selected" eyebrow="Reasoning">
                <div className="space-y-3">
                  {result.pipeline.map((step) => (
                    <div key={step.id} className="rounded-[1.35rem] border border-slate-200/80 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold tracking-[-0.01em] text-slate-950">{step.title}</h4>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">{step.status}</span>
                      </div>
                      <p className="mt-2 text-sm leading-7 text-slate-700">{step.summary}</p>
                      <ul className="mt-3 space-y-2">
                        {step.details.map((detail) => (
                          <li key={detail} className="flex gap-2 text-sm leading-7 text-slate-700">
                            <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-[#7a8f7e]" aria-hidden="true" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                      <details className="mt-4 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
                        <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950">
                          Legal basis
                        </summary>
                        <p className="mt-2 text-sm leading-7 text-slate-700">{step.legalBasis}</p>
                      </details>
                    </div>
                  ))}
                </div>
              </ReportSection>

              <ReportSection title="4. Key Assumptions" eyebrow="Assumptions">
                {result.assumptions.length === 0 ? (
                  <p className="memo-copy">No explicit assumptions were needed beyond the questionnaire answers.</p>
                ) : (
                  <ul className="space-y-2">
                    {result.assumptions.map((item) => (
                      <li key={item} className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-700">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </ReportSection>

              <ReportSection title="5. Information Gaps" eyebrow="Missing facts">
                {result.informationGaps.length === 0 ? (
                  <p className="memo-copy">No major information gaps were identified.</p>
                ) : (
                  <ul className="space-y-2">
                    {result.informationGaps.map((item) => (
                      <li key={item} className="rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </ReportSection>

              <ReportSection title="6. Evidence and Testing" eyebrow="Support material">
                <div className="grid gap-3 sm:grid-cols-2">
                  <ReportFact label="Evidence files" value={`${input.evidenceDocuments.length}`} />
                  <ReportFact label="Extracted signals" value={`${result.evidenceFindings.length}`} />
                  <ReportFact label="Contradictions" value={`${result.contradictions.length}`} />
                  <ReportFact label="Missing facts" value={`${result.missingFacts.length}`} />
                </div>
                <div className="mt-5 space-y-3">
                  <p className="memo-copy">{result.evidenceStatus}</p>
                  {result.evidenceWarnings.length > 0 && (
                    <ul className="space-y-2">
                      {result.evidenceWarnings.map((warning) => (
                        <li key={warning} className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-700">
                          {warning}
                        </li>
                      ))}
                    </ul>
                  )}
                  {result.contradictions.length > 0 ? (
                    <ul className="space-y-2">
                      {result.contradictions.map((item) => (
                        <li key={item} className="rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm leading-7 text-red-800">
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm leading-7 text-slate-700">
                      No contradictions detected in the answers, but no evidence was available to verify them.
                    </p>
                  )}
                  {result.evidenceFindings.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold tracking-[-0.01em] text-slate-950">Evidence citations</p>
                      <div className="mt-3 space-y-2">
                        {result.evidenceFindings.map((finding) => (
                          <div key={finding.id} className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-slate-950">{finding.label}</span>
                              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">{finding.severity}</span>
                            </div>
                            <p className="mt-2 text-sm leading-7 text-slate-700">{finding.plainSummary}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold tracking-[-0.01em] text-slate-950">Model-test hooks</p>
                    <div className="mt-3 space-y-2">
                      {result.modelTestResults.map((test) => (
                        <div key={test.id} className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-slate-950">{test.label}</span>
                            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">{test.status}</span>
                          </div>
                          <p className="mt-2 text-sm leading-7 text-slate-700">{test.plainSummary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ReportSection>

              <ReportSection title="7. Recommended Actions" eyebrow="Next steps">
                <div className="grid gap-4 lg:grid-cols-2">
                  <ReportList title="Required controls" items={result.requiredControls} />
                  <ReportList title="What could change the result" items={result.whatCouldChange} />
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <ReportList title="Next steps" items={result.nextSteps} />
                  <ReportList title="Selected signals" items={result.selectedSignals} />
                </div>
              </ReportSection>

              <ReportSection title="8. Non-AI-Act Compliance Flags" eyebrow="Adjacent review">
                {Object.values(result.nonAIActFlags).every((flag) => !flag) ? (
                  <p className="memo-copy">No separate compliance flags were selected.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(result.nonAIActFlags)
                      .filter(([, value]) => value)
                      .map(([key]) => (
                        <span key={key} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700">
                          {key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase())}
                        </span>
                      ))}
                  </div>
                )}
                <p className="mt-4 text-sm leading-7 text-slate-700">
                  These flags do not automatically make the system high-risk under the AI Act, but they should be reviewed separately.
                </p>
              </ReportSection>
            </div>

            <aside className="space-y-5">
              <div className="memo-panel p-5">
                <p className="section-eyebrow">Confidence</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{result.confidenceLabel}</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-[#7a8f7e]" style={{ width: `${result.confidence}%` }} />
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-700">{result.confidenceExplanation}</p>
                <p className="mt-2 text-xs leading-6 text-slate-500">Heuristic quality score, not a legal probability.</p>
              </div>

              <div className="memo-panel p-5">
                <p className="section-eyebrow">Legal references considered</p>
                {input.showLegalBasis ? (
                  <div className="mt-3 space-y-3">
                    {result.citations.length === 0 ? (
                      <p className="memo-copy">No article or annex citation was generated for this screening.</p>
                    ) : (
                      result.citations.map((citation) => (
                        <details key={citation.id} className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
                          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950">{citation.legalBasis}</summary>
                          <p className="mt-2 text-sm leading-7 text-slate-700">{citation.plainExplanation}</p>
                          <p className="mt-2 text-xs leading-6 text-slate-500">{citation.expertSummary}</p>
                        </details>
                      ))
                    )}
                  </div>
                ) : (
                  <p className="memo-copy mt-3">Legal references are hidden in the interactive view unless the user expands them.</p>
                )}
              </div>

              <div className="memo-panel p-5">
                <p className="section-eyebrow">Local audit trail</p>
                {result.assessmentVersion ? (
                  <div className="mt-3 rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
                    <p className="text-sm font-semibold text-slate-950">Version {result.assessmentVersion}</p>
                    <p className="mt-1 text-xs leading-6 text-slate-500">{formatDateTime(result.generatedAt)}</p>
                  </div>
                ) : (
                  <p className="memo-copy mt-3">This run has not been saved to local audit history yet.</p>
                )}
              </div>

              <div className="memo-panel p-5">
                <p className="section-eyebrow">Educational disclaimer</p>
                <p className="memo-copy mt-3">{result.disclaimer}</p>
              </div>
            </aside>
          </div>
        </div>
      </article>
    </section>
  );
}

function ReportSection({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <section className="memo-section">
      <div className="section-head">
        <p className="section-eyebrow">{eyebrow}</p>
        <h3 className="section-title">{title}</h3>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ReportFact({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="memo-fact">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={strong ? "mt-2 text-sm font-semibold text-ink" : "mt-2 text-sm leading-6 text-slate-700"}>{value}</p>
    </div>
  );
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="memo-stat">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function ReportList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="subpanel">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {items.length === 0 ? (
        <p className="memo-copy mt-2">None listed.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-7 text-slate-700">
              <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-[#7a8f7e]" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
