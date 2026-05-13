import {
  AlertCircle,
  CheckCircle2,
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
  const activeFollowUp = followUps[0];
  const topSignals = signals.slice(0, 3);
  const progressPercent = Math.round(((currentStep + 1) / stepLabels.length) * 100);

  return (
    <aside className="companion" aria-label="Assessment intelligence">
      <div className="companion-card">
        <div className="companion-header">
          <span className="companion-icon">
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="companion-title">Assessment readiness</span>
        </div>
        <div className="companion-summary">
          <span className="companion-kicker">Input quality</span>
          <strong>{intakeState}</strong>
          <span>
            Chapter {currentStep + 1}: {stepLabels[currentStep]}
          </span>
        </div>
        <div className="mini-metrics" aria-label="Assessment metrics">
          <div>
            <span>Evidence</span>
            <strong>{input.evidenceDocuments.length}</strong>
            <em>{evidenceState}</em>
          </div>
          <div>
            <span>Facts</span>
            <strong>{selectedFactCount}</strong>
            <em>{selectedTestCount} checks</em>
          </div>
          <div>
            <span>Findings</span>
            <strong>{evidenceFindingCount}</strong>
            <em>from uploads</em>
          </div>
        </div>
        <div className="journey-meter" aria-label={`Assessment progress ${progressPercent}%`}>
          <span style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="companion-card">
        <div className="companion-header">
          <span className="companion-icon">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="companion-title">Current signals</span>
        </div>
        <div className="flex flex-col gap-2">
          {topSignals.map((signal) => {
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

      {activeFollowUp && (
        <div className="companion-card">
          <div className="companion-header">
            <span className="companion-icon">
              <Lightbulb className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="companion-title">Next best action</span>
          </div>
          <div className="signal-card" data-tone="warning">
            <span className="signal-icon">
              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <div className="signal-content">
              <span className="signal-title">{activeFollowUp.title}</span>
              <span className="signal-description">{activeFollowUp.question}</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
