import type { ClassificationInput, ModelTestResult, ModelTestSelection } from "../engine/types";

const defaultTests: Array<{ id: keyof ModelTestSelection; label: string }> = [
  { id: "bias", label: "Bias summary" },
  { id: "robustness", label: "Robustness summary" },
  { id: "explainability", label: "Explainability summary" },
  { id: "adversarial", label: "Stress-test summary" },
];

export function runModelTestHooks(input: ClassificationInput): ModelTestResult[] {
  const evidenceSignals = input.evidenceDocuments.flatMap((doc) => doc.extracted);
  const hasSensitive = evidenceSignals.some((item) => item.category === "sensitive-attributes");
  const hasDatasetRisk = evidenceSignals.some((item) => item.category === "dataset-risk");
  const hasOversight = input.controls.humanOversight || evidenceSignals.some((item) => item.category === "human-oversight");
  const hasBehaviorWarnings = evidenceSignals.some((item) => item.category === "model-behavior" && item.severity !== "low");

  return defaultTests.map((test) => {
    if (!input.modelTests[test.id]) {
      return {
        id: test.id,
        label: test.label,
        status: "not-run",
        plainSummary: "Not selected for this assessment.",
        expertDetail: "Hook disabled by user.",
        evidenceSignals: [],
      };
    }

    if (test.id === "bias") {
      return {
        id: test.id,
        label: test.label,
        status: hasSensitive || hasDatasetRisk ? "warning" : "simulated",
        plainSummary: hasSensitive || hasDatasetRisk ? "Bias-sensitive data or dataset quality signals were found." : "Simulated POC check only; no live bias test suite was run.",
        expertDetail: "Heuristic scan checks sensitive attributes, proxy features, imbalance, and dataset-quality signals.",
        evidenceSignals: evidenceSignals.filter((item) => ["sensitive-attributes", "dataset-risk"].includes(item.category)).map((item) => item.label),
      };
    }

    if (test.id === "robustness") {
      return {
        id: test.id,
        label: test.label,
        status: hasBehaviorWarnings ? "warning" : "simulated",
        plainSummary: hasBehaviorWarnings ? "Evidence mentions drift, false results, or robustness issues." : "Simulated POC check only; no live robustness test suite was run.",
        expertDetail: "Heuristic scan checks drift, false-positive, false-negative, robustness, and accuracy terminology.",
        evidenceSignals: evidenceSignals.filter((item) => item.category === "model-behavior").map((item) => item.label),
      };
    }

    if (test.id === "explainability") {
      return {
        id: test.id,
        label: test.label,
        status: hasOversight ? "simulated" : "warning",
        plainSummary: hasOversight ? "Oversight or review evidence exists, which supports explainability review." : "No clear oversight evidence was found; explainability may be weak.",
        expertDetail: "This POC hook treats oversight and interpretability evidence as explainability support.",
        evidenceSignals: evidenceSignals.filter((item) => item.category === "human-oversight").map((item) => item.label),
      };
    }

    return {
      id: test.id,
      label: test.label,
      status: hasBehaviorWarnings || hasDatasetRisk ? "warning" : "simulated",
      plainSummary: hasBehaviorWarnings || hasDatasetRisk ? "Stress-test indicators should be reviewed before deployment." : "Simulated POC check only; no live stress-test suite was run.",
      expertDetail: "This POC hook uses evidence keywords; a production version would run real adversarial test suites.",
      evidenceSignals: evidenceSignals.filter((item) => ["model-behavior", "dataset-risk"].includes(item.category)).map((item) => item.label),
    };
  });
}
