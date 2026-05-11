import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Lightbulb,
  ShieldCheck,
  Target,
  TrendingUp,
} from "lucide-react";
import type { ClassificationInput } from "../engine/types";
import {
  getEvidenceState,
  getFollowUps,
  getIntakeSignals,
  getIntakeState,
  type IntakeSignal,
} from "../lib/assessmentSignals";

type IntelligenceRailProps = {
  input: ClassificationInput;
  currentStep: number;
  selectedFactCount: number;
  selectedTestCount: number;
  evidenceFindingCount: number;
};

const stepLabels = [
  "Briefing",
  "Identity",
  "Function",
  "Follow-ups",
  "Evidence",
  "Review",
];

const toneIcons: Record<IntakeSignal["tone"], typeof CheckCircle2> = {
  neutral: Target,
  info: AlertCircle,
  success: CheckCircle2,
  warning: AlertCircle,
  danger: AlertCircle,
};

export function IntelligenceRail({
  input,
  currentStep,
  selectedFactCount,
  selectedTestCount,
  evidenceFindingCount,
}: IntelligenceRailProps) {
  const signals = getIntakeSignals(input);
  const followUps = getFollowUps(input);
  const intakeState = getIntakeState(input);
  const evidenceState = getEvidenceState(input, null);

  return (
    <aside className="companion" aria-label="Assessment intelligence">
      {/* Readiness Summary */}
      <div className="companion-card">
        <div className="companion-header">
          <span className="companion-icon">
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="companion-title">Assessment readiness</span>
        </div>
        <div className="flex flex-col gap-3">
          <div className="metric-card">
            <span className="metric-label">Input quality</span>
            <span className="metric-value">{intakeState}</span>
            <span className="metric-hint">Based on completeness of answers</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="metric-card">
              <span className="metric-label">Evidence</span>
              <span className="metric-value">{evidenceState}</span>
              <span className="metric-hint">
                {input.evidenceDocuments.length
                  ? `${input.evidenceDocuments.length} file(s)`
                  : "None uploaded"}
              </span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Facts selected</span>
              <span className="metric-value">{selectedFactCount}</span>
              <span className="metric-hint">
                {selectedTestCount} checks enabled
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Current Signals */}
      <div className="companion-card">
        <div className="companion-header">
          <span className="companion-icon">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="companion-title">Current signals</span>
        </div>
        <div className="flex flex-col gap-2">
          {signals.slice(0, 5).map((signal) => {
            const Icon = toneIcons[signal.tone];
            return (
              <div
                key={signal.label}
                className="signal-card"
                data-tone={signal.tone}
              >
                <span className="signal-icon">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <div className="signal-content">
                  <span className="signal-title">{signal.label}</span>
                  <span className="signal-description">{signal.detail}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Next Steps */}
      {followUps.length > 0 && (
        <div className="companion-card">
          <div className="companion-header">
            <span className="companion-icon">
              <Lightbulb className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="companion-title">Next best action</span>
          </div>
          <div className="flex flex-col gap-2">
            {followUps.slice(0, 2).map((item) => (
              <div key={item.title} className="signal-card" data-tone="warning">
                <span className="signal-icon">
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <div className="signal-content">
                  <span className="signal-title">{item.title}</span>
                  <span className="signal-description">{item.question}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Journey Progress */}
      <div className="companion-card">
        <div className="companion-header">
          <span className="companion-icon">
            <FileText className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="companion-title">Journey</span>
        </div>
        <div className="flex flex-col gap-1">
          {stepLabels.map((label, index) => {
            const isActive = index === currentStep;
            const isComplete = index < currentStep;

            return (
              <div
                key={label}
                className="flex items-center gap-2 rounded-md px-2 py-1.5"
                style={{
                  background: isActive
                    ? "hsl(var(--foreground) / 0.05)"
                    : "transparent",
                }}
              >
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold"
                  style={{
                    background: isComplete
                      ? "hsl(var(--success))"
                      : isActive
                        ? "hsl(var(--foreground))"
                        : "hsl(var(--muted))",
                    color: isComplete || isActive
                      ? "hsl(var(--background))"
                      : "hsl(var(--muted-foreground))",
                  }}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className="text-sm"
                  style={{
                    fontWeight: isActive ? 500 : 400,
                    color: isActive
                      ? "hsl(var(--foreground))"
                      : "hsl(var(--muted-foreground))",
                  }}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
