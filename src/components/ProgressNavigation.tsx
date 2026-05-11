import { CheckCircle2 } from "lucide-react";
import { cx } from "../lib/utils";

type Step = {
  title: string;
  detail: string;
};

type ProgressNavigationProps = {
  steps: Step[];
  currentStep: number;
  onStepClick: (step: number) => void;
  readinessLabel: string;
};

export function ProgressNavigation({
  steps,
  currentStep,
  onStepClick,
  readinessLabel,
}: ProgressNavigationProps) {
  const progressPercent = ((currentStep + 1) / steps.length) * 100;

  return (
    <nav className="progress-nav" aria-label="Assessment progress">
      <div className="progress-header">
        <span className="progress-title">Assessment progress</span>
        <div className="progress-indicator">
          <span>
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="progress-badge">{readinessLabel}</span>
        </div>
      </div>

      <div className="progress-steps" role="tablist">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isComplete = index < currentStep;

          return (
            <button
              key={step.title}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "step" : undefined}
              onClick={() => onStepClick(index)}
              className="progress-step"
              data-active={isActive}
              data-complete={isComplete}
            >
              <div className="step-header">
                <span className="step-number">
                  {isComplete ? (
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="step-label">{step.title}</span>
              </div>
              <span className="step-description">{step.detail}</span>
            </button>
          );
        })}
      </div>

      <div className="progress-bar">
        <div
          className="progress-bar-fill"
          style={{ width: `${progressPercent}%` }}
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </nav>
  );
}
