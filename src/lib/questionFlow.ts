import type { ClassificationInput } from "../engine/types";

export type AdaptiveGroupId =
  | "consumerPublic"
  | "healthWellness"
  | "biometric"
  | "employment"
  | "education"
  | "creditInsurance"
  | "publicServices"
  | "lawMigrationJustice"
  | "criticalInfrastructure"
  | "gpai"
  | "generatedContent"
  | "childrenVulnerable"
  | "evidenceSafeguards";

export type AdaptiveGroupMeta = {
  id: AdaptiveGroupId;
  title: string;
  reason: string;
  why: string;
  matches: (input: ClassificationInput) => boolean;
};

export type ReviewHint = {
  label: string;
  detail: string;
  confidenceImpact: "low" | "medium" | "high";
};

const hasText = (value: string) => Boolean(value.trim());

export const adaptiveGroups: AdaptiveGroupMeta[] = [
  {
    id: "consumerPublic",
    title: "Consumer / public-facing AI",
    reason: "You said the system is user-facing or public-facing, so we need to check disclosure and direct interaction.",
    why: "This can change transparency duties and the way the report explains user notice.",
    matches: (input) =>
      input.interactionMode === "user_facing" ||
      input.interactionMode === "both" ||
      input.contentFacts.directlyInteractsWithUsers ||
      input.contentFacts.generatesPublicFacingContent ||
      input.affectedPeople.some((person) => /consumer|customer|public/i.test(person)),
  },
  {
    id: "healthWellness",
    title: "Health / wellness / skincare",
    reason: "Health data or a health-adjacent sector can change the caution level and the non-AI-Act flags.",
    why: "We need to know whether this is medical, wellness, product safety, or just general support.",
    matches: (input) =>
      input.domains.healthcare ||
      input.dataFacts.healthData ||
      input.nonAIActFlags.healthData ||
      input.nonAIActFlags.medicalDeviceOrHealthRegulation ||
      input.nonAIActFlags.cosmeticsOrSkincare ||
      /health|medical|wellness|skincare|cosmetic|sunscreen|dermatology/i.test(`${input.sector} ${input.systemDescription} ${input.purpose}`),
  },
  {
    id: "biometric",
    title: "Biometric / image / audio / video",
    reason: "Biometric or media data can move the assessment toward high scrutiny or prohibited-practice review.",
    why: "We need to know whether the system identifies people, infers traits, or only handles ordinary content.",
    matches: (input) =>
      input.dataFacts.biometricData ||
      input.nonAIActFlags.biometricData ||
      input.prohibitedFacts.sensitiveBiometricCategorization ||
      input.prohibitedFacts.realTimePublicSpaceBiometricIdentification ||
      input.prohibitedFacts.workplaceOrEducationEmotionRecognition ||
      /face|voice|audio|video|image|biometric|skin|emotion|recognition/i.test(`${input.aiInputs} ${input.aiOutputs} ${input.systemDescription}`),
  },
  {
    id: "employment",
    title: "Employment / workplace",
    reason: "Recruitment and worker-management use cases are consequential and can trigger higher scrutiny.",
    why: "We need to know whether the AI affects hiring, ranking, promotion, dismissal, or monitoring.",
    matches: (input) =>
      input.domains.employment ||
      input.nonAIActFlags.employmentLabor ||
      /hire|hiring|recruit|recruitment|candidate|cv|resume|employee|worker|workplace|monitoring|promotion|dismissal|task allocation/i.test(
        `${input.sector} ${input.systemDescription} ${input.purpose} ${input.aiOutputs} ${input.outputUsers}`,
      ),
  },
  {
    id: "education",
    title: "Education",
    reason: "Education decisions can affect access, grading, and learning paths.",
    why: "We need to know whether the AI is guiding admission, assessment, or student monitoring.",
    matches: (input) =>
      input.domains.education ||
      /school|student|education|admission|grading|assessment|learning path|university|classroom/i.test(
        `${input.sector} ${input.systemDescription} ${input.purpose} ${input.aiOutputs} ${input.outputUsers}`,
      ),
  },
  {
    id: "creditInsurance",
    title: "Credit / insurance / essential services",
    reason: "Finance and access decisions can materially change a person’s terms, price, or eligibility.",
    why: "We need to know whether the output affects access, pricing, or eligibility for essential services.",
    matches: (input) =>
      input.domains.finance ||
      input.domains.insurance ||
      /credit|loan|insurance|pricing|eligibility|scoring|bank|finance|benefit|housing|essential service/i.test(
        `${input.sector} ${input.systemDescription} ${input.purpose} ${input.aiOutputs}`,
      ),
  },
  {
    id: "publicServices",
    title: "Public services",
    reason: "Benefits and public-service decisions can affect rights or access.",
    why: "We need to know whether the AI influences eligibility, prioritization, or access to a public service.",
    matches: (input) =>
      input.domains.publicServices || /public service|benefit|government|municipal|administration|access/i.test(`${input.sector} ${input.systemDescription}`),
  },
  {
    id: "lawMigrationJustice",
    title: "Law enforcement / migration / justice",
    reason: "These are sensitive decision areas and deserve their own follow-up card.",
    why: "We need to understand whether the AI supports policing, migration, asylum, border control, or legal decision support.",
    matches: (input) =>
      input.domains.lawEnforcement ||
      input.domains.migration ||
      input.domains.justice ||
      /police|law enforcement|migration|asylum|visa|border|justice|court|legal interpretation|prosecution/i.test(
        `${input.sector} ${input.systemDescription} ${input.purpose}`,
      ),
  },
  {
    id: "criticalInfrastructure",
    title: "Critical infrastructure / safety component",
    reason: "Safety-critical systems need clearer answers and stricter review.",
    why: "We need to know whether the AI touches infrastructure safety or a regulated product component.",
    matches: (input) =>
      input.domains.criticalInfrastructure ||
      input.domains.productSafety ||
      input.nonAIActFlags.productSafety ||
      /critical infrastructure|safety component|regulated product|product safety|safety-critical/i.test(`${input.sector} ${input.systemDescription}`),
  },
  {
    id: "gpai",
    title: "GPAI / third-party model",
    reason: "General-purpose models carry different obligations than ordinary AI systems.",
    why: "We need to know whether you are the provider or only a deployer using someone else’s model or API.",
    matches: (input) =>
      input.systemType === "gpai_model" ||
      input.systemType === "gpai_model_systemic_risk" ||
      input.gpaI.developsModel ||
      input.gpaI.usesThirdPartyApi ||
      input.gpaI.systemicRiskIndicators ||
      /model api|llm|gpt|claude|gemini|llama|general-purpose|foundation model|third-party model/i.test(`${input.systemDescription} ${input.purpose}`),
  },
  {
    id: "generatedContent",
    title: "Generated / synthetic content",
    reason: "Generated content may need disclosure or labeling even when the system is not high-risk.",
    why: "We need to know whether people may think the output is human-made, factual, or authentic.",
    matches: (input) =>
      input.contentFacts.generatesPublicFacingContent ||
      input.contentFacts.createsRealisticSyntheticContent ||
      /generate|draft|synthetic|deepfake|marketing|copy|content|article|image|audio|video/i.test(`${input.aiOutputs} ${input.systemDescription}`),
  },
  {
    id: "childrenVulnerable",
    title: "Children / vulnerable groups",
    reason: "Vulnerable groups can change the caution level and the report wording.",
    why: "We need to know whether the system targets or materially affects vulnerable users.",
    matches: (input) =>
      input.nonAIActFlags.childrenOrVulnerableUsers ||
      input.prohibitedFacts.vulnerableGroups ||
      input.affectedPeople.some((person) => /child|children|student|patient|vulnerable|elder/i.test(person)),
  },
  {
    id: "evidenceSafeguards",
    title: "Evidence / safeguards",
    reason: "Evidence and governance can improve confidence, but they do not change the facts on their own.",
    why: "We need to know what evidence exists and whether human review, monitoring, and documentation are actually in place.",
    matches: (input) =>
      input.evidenceDocuments.length > 0 ||
      input.controls.humanOversight ||
      input.controls.dataGovernance ||
      input.controls.appealPath ||
      input.controls.disclosure ||
      hasText(input.uncertaintyNotes),
  },
];

export function getAdaptiveGroups(input: ClassificationInput) {
  return adaptiveGroups.filter((group) => group.matches(input));
}

export function getReviewHints(input: ClassificationInput): ReviewHint[] {
  const hints: ReviewHint[] = [];

  if (!input.scope.usedInEU && !input.scope.placedOnEUMarket && !input.scope.affectsEUUsers) {
    hints.push({
      label: "EU scope",
      detail: "The current facts do not yet establish whether the AI Act applies.",
      confidenceImpact: "high",
    });
  }

  if (input.actorRole === "unclear") {
    hints.push({
      label: "Actor role",
      detail: "We still need to know whether you are the provider, deployer, importer, distributor, or manufacturer.",
      confidenceImpact: "medium",
    });
  }

  if (input.systemType === "non_ai_or_unclear") {
    hints.push({
      label: "AI function",
      detail: "The description still does not clearly explain the AI input, output, or decision role.",
      confidenceImpact: "high",
    });
  }

  if (!hasText(input.aiInputs) || !hasText(input.aiOutputs) || !hasText(input.outputUsers)) {
    hints.push({
      label: "Core function",
      detail: "We need the input, output, and who relies on the result before the report can feel trustworthy.",
      confidenceImpact: "high",
    });
  }

  if (!input.controls.humanOversight && (input.decisionMode === "materially_influences_decision" || input.decisionMode === "automatically_decides")) {
    hints.push({
      label: "Human oversight",
      detail: "The current answers suggest consequential use, but no meaningful human review has been described.",
      confidenceImpact: "high",
    });
  }

  if (!input.evidenceDocuments.length) {
    hints.push({
      label: "Evidence",
      detail: "No evidence files were uploaded, so the report will stay questionnaire-based and provisional.",
      confidenceImpact: "medium",
    });
  }

  if (input.dataFacts.healthData || input.dataFacts.biometricData || input.dataFacts.sensitiveData) {
    hints.push({
      label: "Sensitive data",
      detail: "Sensitive, biometric, or health-related data deserves a closer look and usually lowers confidence.",
      confidenceImpact: "high",
    });
  }

  return hints.slice(0, 5);
}

export function getAdjacentIssues(input: ClassificationInput): string[] {
  const issues = new Set<string>();

  if (input.contentFacts.directlyInteractsWithUsers || input.contentFacts.generatesPublicFacingContent) {
    issues.add("Generated public content or user disclosure");
  }
  if (input.dataFacts.biometricData || input.dataFacts.healthData) {
    issues.add("Biometric or health-data handling");
  }
  if (input.domains.employment || input.domains.education || input.domains.finance || input.domains.insurance) {
    issues.add("Consequence for access, ranking, or eligibility");
  }
  if (input.domains.migration || input.domains.lawEnforcement || input.domains.justice) {
    issues.add("Public authority or justice support");
  }
  if (input.gpaI.developsModel || input.gpaI.usesThirdPartyApi || input.systemType.startsWith("gpai")) {
    issues.add("Third-party GPAI or model-provider obligations");
  }
  if (input.nonAIActFlags.childrenOrVulnerableUsers) {
    issues.add("Children or vulnerable users");
  }
  if (input.nonAIActFlags.productSafety || input.domains.productSafety || input.domains.criticalInfrastructure) {
    issues.add("Safety-critical or regulated product review");
  }

  return Array.from(issues).slice(0, 4);
}
