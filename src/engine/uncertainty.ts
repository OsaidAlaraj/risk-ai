import type { ClassificationInput, EvidenceFinding, ModelTestResult, ScopeStatus, UncertaintyBreakdown } from "./types";

const clamp = (value: number) => Math.min(96, Math.max(8, Math.round(value)));

export function calculateUncertainty(
  input: ClassificationInput,
  scopeStatus: ScopeStatus,
  evidenceFindings: EvidenceFinding[],
  modelTestResults: ModelTestResult[],
  contradictions: string[],
  missingFacts: string[],
): UncertaintyBreakdown {
  const evidenceCount = input.evidenceDocuments.length;
  const warningTests = modelTestResults.filter((test) => test.status === "warning" || test.status === "fail" || test.status === "simulated").length;
  const selectedTests = modelTestResults.filter((test) => test.status !== "not-run").length;

  const vagueDescription = input.systemDescription.trim().length < 90 || input.purpose.trim().length < 10;
  const aiFunctionUnclear = !input.aiInputs.trim() || !input.aiOutputs.trim() || !input.outputUsers.trim() || input.systemType === "non_ai_or_unclear";
  const missingScopeSignals = scopeStatus === "unclear" ? 1 : 0;

  const answerCompleteness = clamp(
    92 -
      missingFacts.length * 7 -
      (vagueDescription ? 8 : 0) -
      (scopeStatus === "unclear" ? 10 : 0) -
      (input.actorRole === "unclear" ? 8 : 0) -
      (aiFunctionUnclear ? 12 : 0),
  );

  const evidenceSupport = clamp(
    evidenceCount === 0
      ? 15
      : 22 +
          Math.min(8, evidenceCount * 4) +
          Math.min(
            6,
            evidenceFindings.reduce((total, finding) => total + Math.max(-1, finding.confidenceImpact), 0) / 4,
          ),
  );

  const contradictionRisk = clamp(
    10 +
      contradictions.length * 16 +
      evidenceFindings.filter((finding) => finding.category === "contradiction").length * 10 +
      (scopeStatus === "unclear" ? 5 : 0),
  );

  const legalUncertainty = clamp(
    18 +
      (scopeStatus === "unclear" ? 18 : 0) +
      (input.actorRole === "unclear" ? 10 : 0) +
      (aiFunctionUnclear ? 12 : 0) +
      missingFacts.length * 4,
  );

  const realWorldStability = clamp(
    90 -
      (input.systemDescription.trim().length < 70 ? 10 : 0) -
      warningTests * 8 -
      (selectedTests > 0 ? 2 : 0) -
      (input.decisionMode === "unclear" ? 10 : 0),
  );

  const safeguardsMaturity = clamp(
    20 +
      (input.controls.humanOversight ? 16 : 0) +
      (input.controls.appealPath ? 12 : 0) +
      (input.controls.dataGovernance ? 12 : 0) +
      (input.controls.disclosure ? 8 : 0) +
      Math.min(10, evidenceCount * 3),
  );

  const epistemic = clamp(100 - answerCompleteness);
  const aleatoric = clamp(Math.min(100, 25 + warningTests * 12 + selectedTests * 3));
  const missingInformation = clamp(Math.min(100, 20 + missingFacts.length * 8 + missingScopeSignals * 10 + (evidenceCount === 0 ? 18 : 0)));
  const contradiction = contradictionRisk;
  const overall = clamp((answerCompleteness + evidenceSupport + realWorldStability + safeguardsMaturity + (100 - contradictionRisk) + (100 - legalUncertainty)) / 6);

  const plainSummary =
    contradictions.length > 0 || missingFacts.length > 0 || evidenceCount === 0
      ? "The result is usable, but some facts are missing, unclear, or conflicting."
      : overall > 68
        ? "The result is moderately supported, but it is still a heuristic screening output rather than a legal determination."
        : "The result is supported by the current facts, but it remains provisional.";

  return {
    overall,
    epistemic,
    aleatoric,
    missingInformation,
    contradiction,
    answerCompleteness,
    evidenceSupport,
    legalUncertainty,
    realWorldStability,
    safeguardsMaturity,
    plainSummary,
  };
}
