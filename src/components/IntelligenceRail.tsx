import { CheckCircle2, Info, Lightbulb, ShieldCheck } from "lucide-react";
import type { ClassificationInput } from "../engine/types";
import { getEvidenceState, getFollowUps, getIntakeSignals, getIntakeState } from "../lib/assessmentSignals";
import { cx } from "../lib/utils";

type IntelligenceRailProps = {
  input: ClassificationInput;
  currentStep: number;
  selectedFactCount: number;
  selectedTestCount: number;
  evidenceFindingCount: number;
  compact?: boolean;
};

const stepLabels = ["Briefing", "Identity", "Function", "Follow-ups", "Evidence", "Review"];

export function IntelligenceRail({
  input,
  currentStep,
  selectedFactCount,
  selectedTestCount,
  evidenceFindingCount,
  compact = false,
}: IntelligenceRailProps) {
  const signals = getIntakeSignals(input);
  const followUps = getFollowUps(input);
  const intakeState = getIntakeState(input);
  const evidenceState = getEvidenceState(input, null);

  const shell = compact ? "rail-card p-4" : "intelligence-shell";

  return (
    <aside className={cx("space-y-4", shell)}>
      <div>
        <p className="section-eyebrow">Intelligence rail</p>
        <h3 className="mt-2 text-lg font-semibold text-ink">Live assessment summary</h3>
        <p className="mt-2 text-sm leading-6 text-muted">A reviewer-style snapshot of readiness, evidence, and the next facts worth clarifying.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <MetricRow label="Input quality" value={intakeState} helper="A readiness state, not a score." />
        <MetricRow
          label="Evidence"
          value={evidenceState}
          helper={input.evidenceDocuments.length ? `${input.evidenceDocuments.length} file(s) uploaded ? ${evidenceFindingCount} extracted signal(s)` : "No evidence files uploaded."}
        />
        <MetricRow label="Selected facts" value={`${selectedFactCount}`} helper={`${selectedTestCount} optional checks selected`} />
      </div>

      <div className="rail-section">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-sage" aria-hidden="true" />
          <p className="text-sm font-semibold text-ink">Current signals</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {signals.slice(0, compact ? 4 : 6).map((signal) => (
            <span key={signal.label} className="signal-chip" data-tone={signal.tone}>
              <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-current opacity-70" aria-hidden="true" />
              <span>
                <span className="block font-medium text-current">{signal.label}</span>
                <span className="block text-xs leading-5 text-slate-500">{signal.detail}</span>
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="rail-section bg-white">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-bronze" aria-hidden="true" />
          <p className="text-sm font-semibold text-ink">What the report is waiting for</p>
        </div>
        <div className="mt-4 space-y-3">
          {followUps.length === 0 ? (
            <p className="text-sm leading-6 text-muted">No additional high-priority follow-ups are surfaced yet.</p>
          ) : (
            followUps.slice(0, compact ? 2 : 4).map((item) => (
              <div key={item.title} className="review-note">
                <p className="text-sm font-semibold text-ink">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{item.reason}</p>
                <p className="mt-3 text-xs font-semibold uppercase text-bronze">Needed next</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{item.question}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rail-section bg-white">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-bronze" aria-hidden="true" />
          <p className="text-sm font-semibold text-ink">Journey</p>
        </div>
        <div className="mt-4 grid gap-2">
          {stepLabels.map((label, index) => (
            <div
              key={label}
              className={cx(
                "journey-row",
                index === currentStep && "journey-row-active",
                index < currentStep && "journey-row-complete",
              )}
            >
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-current/20 text-[0.72rem] font-semibold" aria-hidden="true">
                {index < currentStep ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
              </span>
              {label}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function MetricRow({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="metric-row">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-ink">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted">{helper}</p>
    </div>
  );
}

