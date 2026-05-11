import type { ClassificationInput, ClassificationResult } from "../engine/types";

export type SignalTone = "neutral" | "info" | "success" | "warning" | "danger";

export type IntakeSignal = {
  label: string;
  detail: string;
  tone: SignalTone;
};

export type IntakeState =
  | "Ready for provisional screening"
  | "Needs clarification"
  | "High uncertainty"
  | "Insufficient information";

export type EvidenceState = "No evidence uploaded" | "Evidence uploaded" | "Evidence supports answers" | "Evidence may need review";

export type FollowUpCard = {
  title: string;
  reason: string;
  question: string;
  affects: Array<"classification" | "confidence" | "evidence" | "assumptions" | "non-ai-act" | "report">;
};

const hasText = (value: string) => Boolean(value.trim());

export function getIntakeSignals(input: ClassificationInput): IntakeSignal[] {
  const signals: IntakeSignal[] = [];

  if (input.scope.usedInEU || input.scope.placedOnEUMarket || input.scope.affectsEUUsers) {
    signals.push({ label: "EU scope indicated", detail: "One or more scope gates are selected.", tone: "success" });
  } else {
    signals.push({ label: "EU scope not established", detail: "No EU scope signal is currently selected.", tone: "warning" });
  }

  if (input.actorRole === "unclear") {
    signals.push({ label: "Actor role unclear", detail: "We still need to know who is acting as provider or deployer.", tone: "warning" });
  } else {
    signals.push({ label: `Actor: ${input.actorRole.replace(/_/g, " ")}`, detail: "Role context is at least partly established.", tone: "neutral" });
  }

  if (input.systemType === "non_ai_or_unclear") {
    signals.push({ label: "AI function unclear", detail: "The intake does not yet explain the AI input/output role clearly.", tone: "warning" });
  } else {
    signals.push({ label: input.systemType.replace(/_/g, " "), detail: "System type has been identified.", tone: "neutral" });
  }

  if (input.interactionMode === "user_facing" || input.interactionMode === "both") {
    signals.push({ label: "User-facing interaction", detail: "The AI interacts with people directly or in part.", tone: "info" });
  }

  if (input.decisionMode === "prepares_information") {
    signals.push({ label: "Preparatory support", detail: "A human still appears to make the final call.", tone: "neutral" });
  } else if (input.decisionMode === "materially_influences_decision") {
    signals.push({ label: "Decision-impacting", detail: "The AI may materially affect a person's outcome or access.", tone: "warning" });
  } else if (input.decisionMode === "automatically_decides") {
    signals.push({ label: "Automated decisioning", detail: "The AI appears to decide or finalize outcomes itself.", tone: "danger" });
  } else {
    signals.push({ label: "Decision role unclear", detail: "We still need to know how the output is actually used.", tone: "warning" });
  }

  if (input.domains.healthcare) signals.push({ label: "Healthcare context", detail: "Health-related decisions can trigger higher scrutiny.", tone: "warning" });
  if (input.domains.employment) signals.push({ label: "Employment context", detail: "Hiring, promotion, or worker management are high-scrutiny areas.", tone: "warning" });
  if (input.domains.education) signals.push({ label: "Education context", detail: "Admission, grading, and learning-path decisions can be consequential.", tone: "warning" });
  if (input.domains.finance) signals.push({ label: "Credit context", detail: "Eligibility and scoring in finance can raise scrutiny.", tone: "warning" });
  if (input.domains.insurance) signals.push({ label: "Insurance context", detail: "Pricing and eligibility affect access and terms.", tone: "warning" });
  if (input.domains.migration) signals.push({ label: "Migration context", detail: "Visa, asylum, or border-control support is sensitive.", tone: "warning" });
  if (input.domains.lawEnforcement) signals.push({ label: "Law enforcement", detail: "Risk or evidence support in policing requires careful review.", tone: "warning" });
  if (input.domains.productSafety) signals.push({ label: "Product safety", detail: "Regulated or safety-critical products need extra scrutiny.", tone: "warning" });
  if (input.domains.publicServices) signals.push({ label: "Public services", detail: "Benefits or access can affect rights or opportunities.", tone: "warning" });

  if (input.dataFacts.healthData) signals.push({ label: "Health data selected", detail: "Check whether the AI affects diagnosis, triage, treatment, or personalized advice.", tone: "warning" });
  if (input.dataFacts.biometricData) signals.push({ label: "Biometric data selected", detail: "Check whether the AI identifies people or infers traits.", tone: "warning" });
  if (input.dataFacts.sensitiveData) signals.push({ label: "Sensitive data selected", detail: "Sensitive data often lowers confidence and raises review needs.", tone: "warning" });
  if (input.contentFacts.generatesPublicFacingContent) signals.push({ label: "Public-facing content", detail: "Generated content may need disclosure or labeling.", tone: "info" });
  if (input.contentFacts.directlyInteractsWithUsers) signals.push({ label: "Direct interaction", detail: "The system behaves like a chatbot, assistant, or agent.", tone: "info" });
  if (input.contentFacts.createsRealisticSyntheticContent) signals.push({ label: "Synthetic media", detail: "Deepfake-style or realistic synthetic content may need notice.", tone: "warning" });

  if (!input.evidenceDocuments.length) {
    signals.push({ label: "Evidence missing", detail: "The report will rely on questionnaire answers only.", tone: "warning" });
  } else {
    signals.push({
      label: `${input.evidenceDocuments.length} evidence file${input.evidenceDocuments.length === 1 ? "" : "s"}`,
      detail: "Evidence can support confidence, missing facts, and warnings.",
      tone: "success",
    });
  }

  return signals.slice(0, 10);
}

export function getIntakeState(input: ClassificationInput): IntakeState {
  const selectedFacts =
    Number(input.scope.usedInEU) +
    Number(input.scope.placedOnEUMarket) +
    Number(input.scope.affectsEUUsers) +
    Number(input.actorRole !== "unclear") +
    Number(input.systemType !== "non_ai_or_unclear") +
    Number(hasText(input.aiInputs)) +
    Number(hasText(input.aiOutputs)) +
    Number(hasText(input.outputUsers)) +
    Object.values(input.domains).filter(Boolean).length +
    Object.values(input.dataFacts).filter(Boolean).length +
    Object.values(input.contentFacts).filter(Boolean).length +
    Object.values(input.controls).filter(Boolean).length +
    Object.values(input.prohibitedFacts).filter(Boolean).length +
    Object.values(input.decisionFacts).filter(Boolean).length +
    input.affectedPeople.length +
    input.dataTypes.length;

  const hasCoreFunction = hasText(input.aiInputs) && hasText(input.aiOutputs) && hasText(input.outputUsers);
  const hasComplexity = input.domains.healthcare || input.domains.employment || input.domains.education || input.domains.finance || input.domains.insurance || input.domains.migration || input.domains.lawEnforcement || input.domains.publicServices || input.dataFacts.sensitiveData || input.dataFacts.healthData || input.dataFacts.biometricData;

  if (selectedFacts < 4 || input.systemType === "non_ai_or_unclear") return "Insufficient information";
  if (!hasCoreFunction || input.scope.usedInEU === false && input.scope.placedOnEUMarket === false && input.scope.affectsEUUsers === false) return "High uncertainty";
  if (hasComplexity && (!input.controls.humanOversight || !input.controls.dataGovernance) && !input.evidenceDocuments.length) return "Needs clarification";
  if (input.evidenceDocuments.length > 0 && Object.values(input.controls).some(Boolean) && hasCoreFunction) return "Ready for provisional screening";
  return input.evidenceDocuments.length ? "Needs clarification" : "High uncertainty";
}

export function getEvidenceState(input: ClassificationInput, result: ClassificationResult | null): EvidenceState {
  if (!input.evidenceDocuments.length) return "No evidence uploaded";
  const hasWarnings = Boolean(result?.evidenceWarnings.length || result?.contradictions.length);
  if (hasWarnings) return "Evidence may need review";
  return result?.confidenceLabel === "High" ? "Evidence supports answers" : "Evidence uploaded";
}

export function getFollowUps(input: ClassificationInput): FollowUpCard[] {
  const followUps: FollowUpCard[] = [];

  if (!input.scope.usedInEU && !input.scope.placedOnEUMarket && !input.scope.affectsEUUsers) {
    followUps.push({
      title: "EU scope",
      reason: "We still need to know whether the system is used in the EU, placed on the EU market, or affects EU users.",
      question: "Is the system used in the EU, placed on the EU market, or used by an EU deployer?",
      affects: ["classification", "confidence", "report"],
    });
  }

  if (input.actorRole === "unclear") {
    followUps.push({
      title: "Actor role",
      reason: "Role context changes which obligations may matter.",
      question: "Are you the provider, deployer, importer, distributor, or product manufacturer?",
      affects: ["classification", "confidence", "assumptions"],
    });
  }

  if (input.systemType === "non_ai_or_unclear") {
    followUps.push({
      title: "AI function",
      reason: "We need the actual input, output, and relying party before the report can be trusted.",
      question: "What does the AI take in, what does it produce, and who relies on the output?",
      affects: ["classification", "confidence", "report"],
    });
  }

  if (input.dataFacts.healthData || input.domains.healthcare) {
    followUps.push({
      title: "Health-related follow-up",
      reason: "Health data or healthcare context can change both the tier and the caution level.",
      question: "Does the AI affect diagnosis, triage, treatment, patient-risk support, or personalized health advice?",
      affects: ["classification", "confidence", "non-ai-act", "report"],
    });
  }

  if (input.dataFacts.biometricData) {
    followUps.push({
      title: "Biometric follow-up",
      reason: "We need to know whether the AI identifies people or infers traits from biometric data.",
      question: "Does the system identify a person, verify identity, or infer sensitive traits from face, voice, body, or skin data?",
      affects: ["classification", "confidence", "report"],
    });
  }

  if (input.decisionMode === "prepares_information") {
    followUps.push({
      title: "Decision role",
      reason: "The report depends on whether the output is just preparatory or materially affects the final decision.",
      question: "Does a human independently decide, or does the AI materially influence access, approval, ranking, or rejection?",
      affects: ["classification", "confidence", "assumptions", "report"],
    });
  }

  if (input.contentFacts.directlyInteractsWithUsers || input.contentFacts.generatesPublicFacingContent || input.contentFacts.createsRealisticSyntheticContent) {
    followUps.push({
      title: "Transparency follow-up",
      reason: "User-facing or synthetic content may trigger notice or labeling duties.",
      question: "Will users or the public be told that AI is involved or that the content is synthetic?",
      affects: ["classification", "confidence", "report"],
    });
  }

  if (!input.evidenceDocuments.length) {
    followUps.push({
      title: "Evidence",
      reason: "Evidence can raise confidence, but the report remains provisional without it.",
      question: "Can you upload a model card, technical note, logs, dataset summary, or compliance memo?",
      affects: ["evidence", "confidence", "report"],
    });
  }

  return followUps.slice(0, 5);
}

