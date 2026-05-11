import { buildChecklistForTier, buildConformityWorkflow, buildTriggeredCitations } from "../legal/legalEngine";
import { runModelTestHooks } from "../testing/modelTesting";
import { calculateUncertainty } from "./uncertainty";
import {
  highRiskRules,
  limitedRiskRules,
  prohibitedPracticeRules,
} from "./rules";
import type {
  ClassificationInput,
  ClassificationResult,
  EvidenceFinding,
  FieldAuditEntry,
  PipelineStep,
  ProhibitedFacts,
  RiskTier,
  ScopeStatus,
  TriggeredRule,
} from "./types";

const disclaimer =
  "This report is an educational screening output. It is not legal advice and should be reviewed by qualified counsel before market launch, procurement, or deployment.";

type SignalMap = Record<string, boolean>;

const clamp = (value: number, min = 18, max = 94) => Math.min(max, Math.max(min, Math.round(value)));

const confidenceLabel = (confidence: number, scopeStatus: ScopeStatus): ClassificationResult["confidenceLabel"] => {
  if (confidence < 28 || scopeStatus === "unclear") return "Insufficient information";
  if (confidence >= 80) return "High";
  if (confidence >= 52) return "Medium";
  return "Low";
};

const includesAny = (text: string, terms: string[]) => terms.some((term) => text.includes(term));

const textCorpus = (input: ClassificationInput) =>
  [
    input.systemName,
    input.providerName,
    input.systemDescription,
    input.purpose,
    input.sector,
    input.aiInputs,
    input.aiOutputs,
    input.outputUsers,
    input.actorRole,
    input.systemType,
    input.affectedPeople.join(" "),
    input.dataTypes.join(" "),
    input.evidenceDocuments.map((doc) => `${doc.name} ${doc.textPreview}`).join(" "),
    input.uncertaintyNotes,
  ]
    .join(" ")
    .toLowerCase();

const scopeLabels: Array<[keyof ClassificationInput["scope"], string]> = [
  ["usedInEU", "used in the EU"],
  ["placedOnEUMarket", "placed on the EU market"],
  ["affectsEUUsers", "affects EU users"],
];

const domainLabels: Array<[keyof ClassificationInput["domains"], string]> = [
  ["employment", "employment"],
  ["education", "education"],
  ["healthcare", "healthcare"],
  ["finance", "finance"],
  ["insurance", "insurance"],
  ["migration", "migration"],
  ["lawEnforcement", "law enforcement"],
  ["justice", "justice"],
  ["publicServices", "public services"],
  ["criticalInfrastructure", "critical infrastructure"],
  ["productSafety", "product safety"],
  ["consumerServices", "consumer services"],
];

const dataLabels: Array<[keyof ClassificationInput["dataFacts"], string]> = [
  ["personalData", "personal data"],
  ["sensitiveData", "sensitive data"],
  ["healthData", "health data"],
  ["biometricData", "biometric data"],
];

const contentLabels: Array<[keyof ClassificationInput["contentFacts"], string]> = [
  ["generatesPublicFacingContent", "public-facing content"],
  ["directlyInteractsWithUsers", "direct user interaction"],
  ["createsRealisticSyntheticContent", "realistic synthetic content"],
];

const decisionActionLabels: Array<[keyof ClassificationInput["decisionFacts"], string]> = [
  ["ranksPeople", "ranks people"],
  ["scoresPeople", "scores people"],
  ["filtersPeople", "filters people"],
  ["approvesRejectsPeople", "approves or rejects people"],
  ["recommendsPeople", "recommends people"],
  ["assessesPeople", "assesses people"],
];

const prohibitedLabels: Array<[keyof ProhibitedFacts, string]> = [
  ["manipulation", "manipulation"],
  ["vulnerableGroups", "vulnerable groups"],
  ["socialScoring", "social scoring"],
  ["criminalRiskSolelyProfiling", "profiling-only criminal-risk"],
  ["realTimePublicSpaceBiometricIdentification", "real-time public-space biometric identification"],
  ["untargetedFacialImageScraping", "untargeted facial image scraping"],
  ["workplaceOrEducationEmotionRecognition", "emotion recognition in work or education"],
  ["sensitiveBiometricCategorization", "sensitive biometric categorization"],
];

const gpaIFlagLabels: Array<[keyof ClassificationInput["gpaI"], string]> = [
  ["developsModel", "develops a model"],
  ["usesThirdPartyApi", "uses third-party GPAI"],
  ["systemicRiskIndicators", "possible systemic risk"],
];

const nonAIActFlagLabels: Array<[keyof ClassificationInput["nonAIActFlags"], string]> = [
  ["gdprPrivacy", "GDPR / privacy"],
  ["healthData", "health data"],
  ["biometricData", "biometric data"],
  ["childrenOrVulnerableUsers", "children or vulnerable users"],
  ["consumerProtection", "consumer protection"],
  ["advertisingClaims", "advertising / claims"],
  ["productSafety", "product safety"],
  ["medicalDeviceOrHealthRegulation", "medical / health regulation"],
  ["cosmeticsOrSkincare", "cosmetics / skincare"],
  ["ipCopyright", "IP / copyright"],
  ["cybersecurity", "cybersecurity"],
  ["sectorSpecificRegulation", "sector-specific regulation"],
  ["employmentLabor", "employment / labor"],
  ["financialServices", "financial services"],
];

const selectedBooleanFacts = <T extends object>(map: T, labels: Array<[keyof T, string]>) =>
  labels
    .filter(([key]) => Boolean((map as Record<string, unknown>)[String(key)]))
    .map(([, label]) => label);

function inferFromText(input: ClassificationInput, evidenceFindings: EvidenceFinding[]) {
  const text = textCorpus(input);
  const possibleSignals: string[] = [];
  const evidenceWarnings: string[] = [];

  const textHits = [
    { term: "employment", label: "employment" },
    { term: "recruit", label: "employment/recruitment" },
    { term: "hiring", label: "employment/hiring" },
    { term: "education", label: "education" },
    { term: "grade", label: "education/grading" },
    { term: "health", label: "health data" },
    { term: "diagnos", label: "healthcare" },
    { term: "credit", label: "credit or lending" },
    { term: "loan", label: "credit or lending" },
    { term: "insurance", label: "insurance" },
    { term: "migration", label: "migration or border control" },
    { term: "visa", label: "migration or border control" },
    { term: "law enforcement", label: "law enforcement" },
    { term: "justice", label: "justice" },
    { term: "court", label: "justice" },
    { term: "biometric", label: "biometric use" },
    { term: "face recognition", label: "biometric use" },
    { term: "facial image", label: "biometric use" },
    { term: "scrap", label: "facial image scraping" },
    { term: "emotion", label: "emotion recognition" },
    { term: "chatbot", label: "direct AI interaction" },
    { term: "assistant", label: "direct AI interaction" },
    { term: "generated", label: "generated content" },
  ];

  textHits.forEach(({ term, label }) => {
    if (text.includes(term) && !possibleSignals.includes(label)) {
      possibleSignals.push(label);
    }
  });

  if (
    text.includes("triage") &&
    includesAny(text, ["medical", "patient", "clinic", "clinician", "hospital", "health", "diagnos", "treatment", "care"])
  ) {
    possibleSignals.push("healthcare");
  }

  const evidencePossibleSignals = evidenceFindings.filter((finding) => finding.category === "possible-signal").map((finding) => finding.plainSummary);
  evidencePossibleSignals.forEach((warning) => evidenceWarnings.push(`Possible signal detected in evidence: ${warning}`));

  if (!input.evidenceDocuments.length) {
    evidenceWarnings.push("No evidence files were uploaded.");
  }

  return { possibleSignals, evidenceWarnings };
}

function buildFactsUsed(input: ClassificationInput) {
  const facts = [
    ...selectedBooleanFacts(input.scope, scopeLabels),
    `actor role: ${input.actorRole.replace(/_/g, " ")}`,
    `system type: ${input.systemType.replace(/_/g, " ")}`,
    input.aiInputs.trim() ? `AI inputs: ${input.aiInputs.trim()}` : "AI inputs not specified",
    input.aiOutputs.trim() ? `AI outputs: ${input.aiOutputs.trim()}` : "AI outputs not specified",
    input.outputUsers.trim() ? `Output users: ${input.outputUsers.trim()}` : "Output users not specified",
    `interaction: ${input.interactionMode.replace(/_/g, " ")}`,
    `decision mode: ${input.decisionMode.replace(/_/g, " ")}`,
    ...selectedBooleanFacts(input.domains, domainLabels),
    ...selectedBooleanFacts(input.dataFacts, dataLabels),
    ...selectedBooleanFacts(input.contentFacts, contentLabels),
    ...selectedBooleanFacts(input.decisionFacts, decisionActionLabels),
    ...selectedBooleanFacts(input.prohibitedFacts, prohibitedLabels),
    ...selectedBooleanFacts(input.gpaI, gpaIFlagLabels),
    ...selectedBooleanFacts(input.nonAIActFlags, nonAIActFlagLabels),
  ];

  if (input.affectedPeople.length) facts.push(`affected people: ${input.affectedPeople.join(", ")}`);
  if (input.dataTypes.length) facts.push(`data types: ${input.dataTypes.join(", ")}`);
  if (input.controls.humanOversight) facts.push("human oversight");
  if (input.controls.appealPath) facts.push("appeal path");
  if (input.controls.dataGovernance) facts.push("data governance");
  if (input.controls.disclosure) facts.push("disclosure");

  return facts;
}

function buildScopeStatus(input: ClassificationInput, text: string): ScopeStatus {
  const anyScope = input.scope.usedInEU || input.scope.placedOnEUMarket || input.scope.affectsEUUsers;
  if (anyScope) return "in_scope";
  if (includesAny(text, ["outside the eu", "outside eu", "non-eu", "not in the eu", "no eu users", "not eu", "only outside the eu"])) return "out_of_scope";
  if (includesAny(text, ["eu", "european union", "europe", "member state", "european market"])) return "unclear";
  return "unclear";
}

function buildContradictions(input: ClassificationInput, text: string, possibleSignals: string[]) {
  const contradictions: string[] = [];

  if (input.interactionMode === "internal_only" && includesAny(text, ["customer", "customers", "user", "users", "client", "public"])) {
    contradictions.push("The intake says internal-only, but the description suggests customer or user interaction.");
  }

  if (
    input.decisionMode === "prepares_information" &&
    includesAny(text, ["rank", "score", "filter", "approve", "reject", "recommend", "decide", "assess"]) &&
    includesAny(text, ["candidate", "applicant", "employee", "student", "patient", "customer", "loan", "credit", "insurance", "visa", "asylum", "border", "criminal", "law enforcement", "justice", "court", "benefit", "service"])
  ) {
    contradictions.push("The intake says the system only prepares information, but the description suggests ranking, scoring, filtering, approval, rejection, recommendation, or assessment.");
  }

  if (
    (input.domains.employment ||
      input.domains.education ||
      input.domains.healthcare ||
      input.domains.finance ||
      input.domains.insurance ||
      input.domains.migration ||
      input.domains.lawEnforcement ||
      input.domains.justice ||
      input.domains.publicServices ||
      input.domains.criticalInfrastructure ||
      input.domains.productSafety) &&
    input.decisionMode === "prepares_information"
  ) {
    contradictions.push("A high-impact domain is selected, but the decision mode says the AI only prepares information.");
  }

  if ((input.contentFacts.generatesPublicFacingContent || input.contentFacts.directlyInteractsWithUsers) && !input.controls.disclosure) {
    contradictions.push("Public-facing content is selected, but disclosure or labeling is not selected.");
  }

  if (input.controls.humanOversight && input.decisionMode === "automatically_decides") {
    contradictions.push("Human oversight is selected, but the system is also marked as automatically deciding.");
  }

  if (possibleSignals.some((signal) => signal.includes("employment")) && !input.domains.employment) contradictions.push("The description or evidence mentions employment, but the employment field is not selected.");
  if (possibleSignals.some((signal) => signal.includes("education")) && !input.domains.education) contradictions.push("The description or evidence mentions education, but the education field is not selected.");
  if (possibleSignals.some((signal) => signal.includes("healthcare")) && !input.domains.healthcare) contradictions.push("The description or evidence mentions healthcare, but the healthcare field is not selected.");
  if (possibleSignals.some((signal) => signal.includes("credit") || signal.includes("lending")) && !input.domains.finance) contradictions.push("The description or evidence mentions credit or lending, but the finance field is not selected.");
  if (possibleSignals.some((signal) => signal.includes("insurance")) && !input.domains.insurance) contradictions.push("The description or evidence mentions insurance, but the insurance field is not selected.");
  if (possibleSignals.some((signal) => signal.includes("migration")) && !input.domains.migration) contradictions.push("The description or evidence mentions migration or border control, but the migration field is not selected.");
  if (possibleSignals.some((signal) => signal.includes("law enforcement")) && !input.domains.lawEnforcement) contradictions.push("The description or evidence mentions law enforcement, but the law-enforcement field is not selected.");
  if (possibleSignals.some((signal) => signal.includes("biometric")) && !input.dataFacts.biometricData) contradictions.push("The description or evidence mentions biometric use, but biometric data is not selected.");
  if (possibleSignals.some((signal) => signal.includes("emotion recognition")) && !input.prohibitedFacts.workplaceOrEducationEmotionRecognition) contradictions.push("The description or evidence mentions emotion recognition, but the matching prohibited-use field is not selected.");

  return contradictions;
}

function buildMissingFacts(input: ClassificationInput, text: string, contradictions: string[], scopeStatus: ScopeStatus, aiFunctionUnclear: boolean) {
  const missing: string[] = [];
  if (scopeStatus === "unclear") missing.push("EU scope needs confirmation.");
  if (!input.systemName.trim()) missing.push("system name");
  if (!input.systemDescription.trim() || input.systemDescription.trim().length < 90) missing.push("system description");
  if (!input.purpose.trim()) missing.push("purpose");
  if (!input.sector.trim()) missing.push("work area");
  if (!input.aiInputs.trim()) missing.push("AI inputs");
  if (!input.aiOutputs.trim()) missing.push("AI outputs");
  if (!input.outputUsers.trim()) missing.push("who relies on the output");
  if (input.actorRole === "unclear") missing.push("actor role");
  if (input.systemType === "non_ai_or_unclear") missing.push("system type");
  if (!input.affectedPeople.length) missing.push("people affected");
  if (!input.dataTypes.length) missing.push("data types");
  if (input.interactionMode === "unclear") missing.push("interaction mode");
  if (input.decisionMode === "unclear") missing.push("decision mode");
  if (
    (input.dataFacts.sensitiveData || input.dataFacts.biometricData || input.dataFacts.healthData) &&
    !includesAny(text, ["because", "needed for", "required for", "to support", "to help", "for the purpose of", "for triage", "for diagnosis", "for screening", "for verification", "research", "internal r&d", "internal support", "clinical", "medical", "healthcare"])
  ) {
    missing.push("why sensitive, biometric, or health data is needed");
  }
  if (!input.controls.humanOversight && !input.controls.appealPath && !input.controls.dataGovernance && !input.controls.disclosure) missing.push("controls");
  if (contradictions.length > 0 && !missing.includes("system description")) missing.push("clarifying facts");
  return missing;
}

function isHighRiskDomain(input: ClassificationInput) {
  return (
    input.domains.employment ||
    input.domains.education ||
    input.domains.healthcare ||
    input.domains.finance ||
    input.domains.insurance ||
    input.domains.migration ||
    input.domains.lawEnforcement ||
    input.domains.justice ||
    input.domains.publicServices ||
    input.domains.criticalInfrastructure ||
    input.domains.productSafety
  );
}

function isHighRiskAction(input: ClassificationInput) {
  return input.decisionMode === "materially_influences_decision" || input.decisionMode === "automatically_decides" || Object.values(input.decisionFacts).some(Boolean);
}

function buildSelectedRuleMap(input: ClassificationInput) {
  const prohibited = { ...input.prohibitedFacts };
  const text = textCorpus(input);
  const biometricIdentificationContext = includesAny(text, [
    "biometric identification",
    "biometric id",
    "face recognition",
    "facial recognition",
    "identity match",
    "verify identity",
    "watchlist",
    "access control",
    "biometric match",
  ]);
  const biometricCategorizationContext = includesAny(text, [
    "biometric categorization",
    "categorize",
    "trait inference",
    "age estimate",
    "age band",
    "gender inference",
    "sensitive trait",
  ]);
  const highRisk = {
    employment: input.domains.employment,
    education: input.domains.education,
    healthcare: input.domains.healthcare,
    finance: input.domains.finance,
    insurance: input.domains.insurance,
    migration: input.domains.migration,
    lawEnforcement: input.domains.lawEnforcement,
    justice: input.domains.justice,
    publicServices: input.domains.publicServices,
    criticalInfrastructure: input.domains.criticalInfrastructure,
    productSafety: input.domains.productSafety,
    biometricIdentification: input.dataFacts.biometricData && biometricIdentificationContext && !input.prohibitedFacts.realTimePublicSpaceBiometricIdentification,
    biometricCategorization:
      input.dataFacts.biometricData &&
      biometricCategorizationContext &&
      !input.prohibitedFacts.sensitiveBiometricCategorization &&
      !input.prohibitedFacts.realTimePublicSpaceBiometricIdentification,
  };
  const limitedRisk = {
    chatbot: input.contentFacts.directlyInteractsWithUsers || input.interactionMode === "user_facing",
    deepfake: input.contentFacts.createsRealisticSyntheticContent || input.contentFacts.generatesPublicFacingContent,
    emotionRecognition: input.contentFacts.directlyInteractsWithUsers && !input.prohibitedFacts.workplaceOrEducationEmotionRecognition,
    generatedContent: input.contentFacts.generatesPublicFacingContent,
  };

  return { prohibited, highRisk, limitedRisk };
}

function ruleByInput(rules: any[], selected: SignalMap, reason: string): TriggeredRule[] {
  return rules
    .filter((rule) => selected[rule.id])
    .map((rule) => ({
      ...rule,
      whyItMatters: reason,
    }));
}

function classifyTier(
  input: ClassificationInput,
  scopeStatus: ScopeStatus,
  contradictions: string[],
  missingFacts: string[],
  aiFunctionUnclear: boolean,
  selectedRules: { prohibited: SignalMap; highRisk: SignalMap; limitedRisk: SignalMap },
) {
  const prohibitedMatches = ruleByInput(
    prohibitedPracticeRules,
    selectedRules.prohibited,
    "The selected facts match a prohibited-practice pattern. Article 5 analysis takes priority over all other tiers.",
  );

  if (scopeStatus === "out_of_scope" && !contradictions.length) {
    return { tier: "out_of_scope" as const, prohibitedMatches, highRiskMatches: [], transparencyMatches: [] };
  }

  const carveOut = prohibitedMatches.filter((rule) => {
    if (rule.id === "workplaceOrEducationEmotionRecognition" && input.systemDescription.toLowerCase().includes("medical")) return false;
    return true;
  });

  const highRiskMatches = ruleByInput(
    highRiskRules,
    selectedRules.highRisk,
    "The selected facts point to a consequential domain where the system may materially affect rights, safety, access, or opportunities.",
  );

  const transparencyMatches = ruleByInput(
    limitedRiskRules,
    selectedRules.limitedRisk,
    "The selected facts create a transparency or disclosure duty even if the system is not otherwise high-risk.",
  );

   const hasMeaningfulSupport =
     input.decisionMode !== "unclear" &&
     input.systemDescription.trim().length >= 50 &&
     Boolean(input.aiInputs.trim() && input.aiOutputs.trim() && input.outputUsers.trim());
   const highRiskSupported = highRiskMatches.length > 0 && isHighRiskDomain(input) && isHighRiskAction(input) && hasMeaningfulSupport && contradictions.length === 0;
   const limitedSupported = transparencyMatches.length > 0 && !highRiskSupported && contradictions.length === 0;
   const weakVagueCase =
     scopeStatus !== "out_of_scope" &&
     !input.evidenceDocuments.length &&
     input.systemDescription.trim().length < 50 &&
     !limitedSupported &&
     !highRiskSupported;
  const needsReview =
    contradictions.length > 0 ||
    missingFacts.length >= 3 ||
    (highRiskMatches.length > 0 && !highRiskSupported) ||
     weakVagueCase;

  if (carveOut.length !== prohibitedMatches.length) {
    return { tier: "needs_review" as const, prohibitedMatches, highRiskMatches: [], transparencyMatches: [] };
  }

  if (prohibitedMatches.length) return { tier: "unacceptable" as const, prohibitedMatches, highRiskMatches: [], transparencyMatches: [] };
  if (highRiskSupported) return { tier: "high" as const, prohibitedMatches, highRiskMatches, transparencyMatches };
  if (limitedSupported) return { tier: "limited" as const, prohibitedMatches, highRiskMatches, transparencyMatches };
  if (needsReview) return { tier: "needs_review" as const, prohibitedMatches, highRiskMatches, transparencyMatches };
  return { tier: "minimal" as const, prohibitedMatches, highRiskMatches, transparencyMatches };
}

function buildSummaryByTier(tier: RiskTier, systemName: string) {
  const name = systemName.trim() || "This AI system";
  if (tier === "out_of_scope") return `EU AI Act scope is not established from the facts provided for ${name}.`;
  if (tier === "unacceptable") return `${name} matches a prohibited-practice pattern and should be treated as a stop-sign case.`;
  if (tier === "high") return `${name} appears to be a high-scrutiny use case because it materially affects a consequential domain or decision.`;
  if (tier === "limited") return `${name} creates transparency or disclosure duties, but it does not currently meet the app's high-risk threshold.`;
  if (tier === "needs_review") return `${name} cannot be classified confidently yet because the facts are incomplete, unclear, or conflicting.`;
  return `${name} appears to be a provisional minimal-risk internal or background support tool under the current facts.`;
}

function buildReasonByTier(tier: RiskTier, scopeStatus: ScopeStatus, contradictions: string[], missingFacts: string[], input: ClassificationInput) {
  if (tier === "out_of_scope") return "EU scope is not established from the facts provided.";
  if (tier === "unacceptable") return "A prohibited practice was selected or clearly indicated.";
  if (tier === "high") return "A high-scrutiny domain and meaningful decision impact were selected with enough supporting facts.";
  if (tier === "limited") return "The tool is user-facing or content-generating and needs transparency, but it does not meet the high-risk threshold.";
  if (tier === "needs_review") {
    if (contradictions.length) return `Contradiction detected: ${contradictions[0]}`;
    if (scopeStatus === "unclear") return "EU scope is not established from the facts provided.";
    if (missingFacts.length) return `Missing information: ${missingFacts[0]}`;
    return "The facts are too unclear for a defensible classification.";
  }
  const base = "The facts describe a provisional low-risk internal or background support tool under the current facts.";
  const gpaIFlag = input.systemType === "gpai_model" || input.systemType === "gpai_model_systemic_risk" || input.gpaI.developsModel || input.gpaI.usesThirdPartyApi;
  return gpaIFlag ? `${base} GPAI obligations may still apply separately.` : base;
}

function buildRecommendationByTier(tier: RiskTier) {
  if (tier === "out_of_scope") return "Reassess if the system later targets EU users, is placed on the EU market, or is used by an EU deployer.";
  if (tier === "unacceptable") return "Stop deployment and redesign or remove the triggering feature before proceeding.";
  if (tier === "high") return "Proceed only with stronger governance, documentation, validation, and meaningful human oversight.";
  if (tier === "limited") return "Add clear disclosure or content labeling and keep the transparency record up to date.";
  if (tier === "needs_review") return "Add the missing facts, resolve contradictions, and rerun the assessment.";
  return "Proceed with lightweight governance and rerun the assessment if the use case expands.";
}

function buildEvidenceStatus(input: ClassificationInput, evidenceFindings: EvidenceFinding[]) {
  if (!input.evidenceDocuments.length) return "No evidence files were uploaded. This result is provisional and based only on questionnaire answers.";
  const signals = evidenceFindings.length;
  return `${input.evidenceDocuments.length} evidence file${input.evidenceDocuments.length === 1 ? "" : "s"} uploaded, ${signals} extracted signal${signals === 1 ? "" : "s"}`;
}

function buildRequiredControls(tier: RiskTier) {
  if (tier === "out_of_scope") return ["Document deployment geography", "Retain the facts showing why EU scope is not established", "Reassess if EU users, EU market placement, or EU deployer context changes"];
  if (tier === "high") return ["Meaningful human oversight", "Data governance and quality controls", "Documentation and logging", "Appeal or escalation path"];
  if (tier === "limited") return ["Clear disclosure or labeling", "Plain-language notice", "Change control"];
  if (tier === "unacceptable") return ["Pause deployment", "Preserve records", "Legal review"];
  if (tier === "needs_review") return ["Clarify facts", "Resolve contradictions", "Upload evidence"];
  return ["Lightweight governance", "Short model card", "Change control"];
}

function buildNextSteps(tier: RiskTier) {
  if (tier === "out_of_scope") return ["Keep a record of why EU scope is not established", "Reassess if deployment moves into the EU or starts affecting EU users", "Collect evidence if the geography changes"];
  if (tier === "high") return ["Document purpose, data, oversight, and logging", "Prepare a high-risk compliance bundle", "Test the system before deployment"];
  if (tier === "limited") return ["Add AI disclosure or content labeling", "Keep the notice visible where the user sees the output", "Record future changes"];
  if (tier === "unacceptable") return ["Remove the triggering feature", "Do not deploy until counsel reviews the use case", "Reassess after redesign"];
  if (tier === "needs_review") return ["Add missing facts", "Resolve conflicting answers", "Upload supporting evidence"];
  return ["Keep a short model card", "Maintain change control", "Reassess if the use case expands"];
}

function buildWhatCouldChange(tier: RiskTier) {
  if (tier === "out_of_scope") return ["Target EU users or the EU market", "Show an EU deployer or provider context", "Clarify the deployment geography with evidence"];
  if (tier === "high") return ["Remove the consequential decision role", "Limit the system to preparatory support only", "Change the domain to a low-impact internal task"];
  if (tier === "limited") return ["Remove direct user interaction", "Stop generating public-facing content", "Move the use case out of a user-facing context"];
  if (tier === "unacceptable") return ["Remove the prohibited practice", "Change the product role so it no longer scores or profiles people", "Seek legal review before any pilot"];
  if (tier === "needs_review") return ["Clarify the missing facts", "Add evidence", "Resolve contradictory answers"];
  return ["Add a material decision role", "Move into a regulated domain", "Add direct user interaction or content generation"];
}

function buildSelectedSignals(input: ClassificationInput) {
  return [
    ...selectedBooleanFacts(input.scope, scopeLabels),
    `actor role: ${input.actorRole.replace(/_/g, " ")}`,
    `system type: ${input.systemType.replace(/_/g, " ")}`,
    ...selectedBooleanFacts(input.domains, domainLabels),
    ...selectedBooleanFacts(input.dataFacts, dataLabels),
    ...selectedBooleanFacts(input.contentFacts, contentLabels),
    ...selectedBooleanFacts(input.decisionFacts, decisionActionLabels),
    ...selectedBooleanFacts(input.prohibitedFacts, prohibitedLabels),
  ];
}

function labelString(value: string) {
  return value.trim() ? value.replace(/_/g, " ") : "not specified";
}

function buildGpaIObligations(input: ClassificationInput) {
  const obligations: string[] = [];
  if (input.systemType === "gpai_model" || input.systemType === "gpai_model_systemic_risk" || input.gpaI.developsModel) {
    obligations.push("GPAI provider obligations may apply if you place the model on the market or offer it as a service.");
  }
  if (input.gpaI.usesThirdPartyApi) {
    obligations.push("Deployer duties may still apply when using a third-party GPAI API, especially for instructions, oversight, logging, and output handling.");
  }
  if (input.systemType === "gpai_model_systemic_risk" || input.gpaI.systemicRiskIndicators) {
    obligations.push("Possible systemic-risk indicators were selected. That warrants higher scrutiny and stronger documentation.");
  }
  return obligations;
}

function buildAssumptions(input: ClassificationInput, scopeStatus: ScopeStatus) {
  const assumptions: string[] = [];
  if (scopeStatus === "unclear") assumptions.push("EU scope is assumed to be unresolved until deployment geography is clarified.");
  if (input.actorRole === "unclear") assumptions.push("Actor role is assumed to be unresolved until provider/deployer/importer context is clarified.");
  if (input.systemType === "non_ai_or_unclear") assumptions.push("AI system type is assumed to be unresolved until the AI inputs and outputs are described.");
  if (!input.aiInputs.trim() || !input.aiOutputs.trim() || !input.outputUsers.trim()) assumptions.push("The AI function is treated as incomplete because inputs, outputs, or output users were not fully described.");
  if (input.decisionMode === "prepares_information") assumptions.push("The decision role is assumed to be preparatory rather than final unless the description says the output is actually followed.");
  return assumptions;
}

function buildInformationGaps(input: ClassificationInput, missingFacts: string[], scopeStatus: ScopeStatus) {
  const gaps = [...missingFacts];
  if (!input.evidenceDocuments.length) {
    gaps.unshift("No evidence files were uploaded. This result is provisional and based only on questionnaire answers.");
  }
  if (scopeStatus === "unclear") gaps.unshift("EU scope is uncertain.");
  if (input.aiFunctionUnclear) gaps.unshift("The AI function is not described clearly enough to rule out higher scrutiny.");
  return [...new Set(gaps)];
}

function buildFieldAudit(input: ClassificationInput, scopeStatus: ScopeStatus, contradictions: string[], missingFacts: string[], aiFunctionUnclear: boolean): FieldAuditEntry[] {
  const selectedNonAIActFlags = buildNonAIActFlags(input);
  const entries = [
    {
      field: "EU scope",
      affects: ["classification", "confidence", "warnings", "assumptions", "report"] as const,
      status: scopeStatus === "in_scope" ? "complete" : scopeStatus === "unclear" ? "unclear" : "complete",
      note: scopeStatus === "in_scope" ? "At least one EU scope fact was selected." : scopeStatus === "unclear" ? "EU scope needs confirmation." : "The description points outside EU scope.",
    },
    {
      field: "Actor role",
      affects: ["classification", "confidence", "report", "assumptions"] as const,
      status: input.actorRole === "unclear" ? "unclear" : "complete",
      note: input.actorRole === "unclear" ? "Provider / deployer / importer context is not yet clear." : `Role recorded as ${labelString(input.actorRole)}.`,
    },
    {
      field: "AI function",
      affects: ["classification", "confidence", "report", "warnings", "assumptions"] as const,
      status: aiFunctionUnclear ? "unclear" : "complete",
      note: aiFunctionUnclear ? "Inputs, outputs, or the relying party are not described clearly enough." : "AI inputs, outputs, and relying party are described.",
    },
    {
      field: "Evidence",
      affects: ["confidence", "evidence", "warnings", "report"] as const,
      status: input.evidenceDocuments.length ? "complete" : "missing",
      note: input.evidenceDocuments.length ? `${input.evidenceDocuments.length} file(s) uploaded.` : "No evidence files were uploaded.",
    },
    {
      field: "Contradictions",
      affects: ["classification", "confidence", "warnings", "report"] as const,
      status: contradictions.length ? "unclear" : "complete",
      note: contradictions.length ? `${contradictions.length} contradiction(s) detected.` : "No contradictions detected in the answers.",
    },
    {
      field: "Information gaps",
      affects: ["confidence", "warnings", "assumptions", "report"] as const,
      status: missingFacts.length ? "partial" : "complete",
      note: missingFacts.length ? `${missingFacts.length} missing or unresolved facts.` : "No major missing facts after the current intake.",
    },
    {
      field: "GPAI context",
      affects: ["classification", "confidence", "report", "warnings"] as const,
      status: input.systemType === "gpai_model" || input.systemType === "gpai_model_systemic_risk" || input.gpaI.developsModel || input.gpaI.usesThirdPartyApi ? "partial" : "complete",
      note:
        input.systemType === "gpai_model" || input.systemType === "gpai_model_systemic_risk" || input.gpaI.developsModel || input.gpaI.usesThirdPartyApi
          ? "GPAI obligations may need role-based analysis."
          : "No GPAI obligations were selected.",
    },
    {
      field: "Non-AI-Act flags",
      affects: ["non-ai-act", "report", "warnings"] as const,
      status: selectedNonAIActFlags.length ? "partial" : "complete",
      note: selectedNonAIActFlags.length ? `Separate compliance review signals: ${selectedNonAIActFlags.join(", ")}.` : "No separate compliance flags selected.",
    },
  ] as const;

  return entries.map((entry) => ({ ...entry })) as FieldAuditEntry[];
}

function buildConfidenceExplanation(input: ClassificationInput, scopeStatus: ScopeStatus, contradictions: string[], missingFacts: string[], aiFunctionUnclear: boolean) {
  const reasons: string[] = [];
  if (!input.evidenceDocuments.length) reasons.push("No evidence files were uploaded, so confidence stays capped.");
  if (scopeStatus === "unclear") reasons.push("EU scope is not fully established.");
  if (input.actorRole === "unclear") reasons.push("The actor role is unresolved.");
  if (aiFunctionUnclear) reasons.push("The AI function is not described clearly enough.");
  if (contradictions.length) reasons.push(`There are ${contradictions.length} contradiction${contradictions.length === 1 ? "" : "s"} in the answers.`);
  if (missingFacts.length) reasons.push(`${missingFacts.length} information gap${missingFacts.length === 1 ? "" : "s"} remain.`);
  if (input.controls.humanOversight || input.controls.appealPath || input.controls.dataGovernance || input.controls.disclosure) {
    reasons.push("Controls help, but they do not erase higher-risk facts.");
  }
  if (!reasons.length) reasons.push("The result is supported by aligned facts and evidence.");
  return reasons.join(" ");
}

function deriveAiFunctionUnclear(input: ClassificationInput, text: string, scopeStatus: ScopeStatus) {
  const hasCoreFunctionFields = Boolean(input.aiInputs.trim() && input.aiOutputs.trim() && input.outputUsers.trim());
  const genericDescription = includesAny(text, ["company", "product", "service", "marketing", "product launch", "business goal", "platform"]);
  const functionWords = includesAny(text, ["rank", "score", "filter", "approve", "reject", "recommend", "summarize", "chat", "predict", "triage", "classify", "detect"]);
  const aiMention = includesAny(text, ["model", "machine learning", "gpt", "llm", "algorithm"]);
  if (input.systemType === "non_ai_or_unclear") return true;
  if (!hasCoreFunctionFields) return true;
  if (genericDescription && !functionWords && !aiMention) return true;
  if (scopeStatus === "unclear" && !aiMention && !functionWords) return true;
  return false;
}

function buildNonAIActFlags(input: ClassificationInput) {
  return selectedBooleanFacts(input.nonAIActFlags, nonAIActFlagLabels);
}

export function classifySystem(input: ClassificationInput): ClassificationResult {
  const evidenceFindings = input.evidenceDocuments.flatMap((document) => document.extracted);
  const text = textCorpus(input);
  const scopeStatus = buildScopeStatus(input, text);
  const aiFunctionUnclear = deriveAiFunctionUnclear(input, text, scopeStatus);
  const { possibleSignals, evidenceWarnings } = inferFromText(input, evidenceFindings);
  const contradictions = buildContradictions(input, text, possibleSignals);
  const missingFacts = buildMissingFacts(input, text, contradictions, scopeStatus, aiFunctionUnclear);
  const selectedRules = buildSelectedRuleMap(input);
  const modelTestResults = runModelTestHooks(input);
  const uncertainty = calculateUncertainty(input, scopeStatus, evidenceFindings, modelTestResults, contradictions, missingFacts);

  const tierResult = classifyTier(input, scopeStatus, contradictions, missingFacts, aiFunctionUnclear, selectedRules);
  const tier = tierResult.tier;
  const highRiskMatches = tierResult.highRiskMatches;
  const limitedMatches = tierResult.transparencyMatches;
  const prohibitedMatches = tierResult.prohibitedMatches;

  const pipeline: PipelineStep[] = [];
  pipeline.push({
    id: "scope",
    title: "Step 1: Scope screen",
    status: scopeStatus === "out_of_scope" ? "triggered" : scopeStatus === "unclear" ? "review" : "clear",
    legalBasis: "EU AI Act scope",
    summary:
      scopeStatus === "out_of_scope"
        ? "The facts do not establish EU AI Act scope."
        : scopeStatus === "unclear"
          ? "EU scope is not fully clear from the current facts."
          : "EU scope is established from the facts provided.",
    details:
      scopeStatus === "out_of_scope"
        ? ["No EU market, EU user, or EU deployer signal was selected."]
        : scopeStatus === "unclear"
          ? ["The text mentions EU references, but the scope facts are not fully consistent."]
          : ["At least one EU scope signal was selected."],
  });

  pipeline.push({
    id: "article-5",
    title: "Step 2: Stop-sign screen",
    status: prohibitedMatches.length ? "triggered" : contradictions.some((item) => item.toLowerCase().includes("prohibited")) ? "review" : "clear",
    legalBasis: "Article 5",
    summary:
      tier === "unacceptable"
        ? `${prohibitedMatches.length} prohibited-practice trigger${prohibitedMatches.length > 1 ? "s" : ""} found.`
        : "No prohibited-practice trigger was selected or inferred.",
    details:
      prohibitedMatches.length > 0
        ? prohibitedMatches.map((rule) => `${rule.label}: ${rule.shortDescription}`)
        : ["No manipulation, social scoring, prohibited biometric, or exploitation pattern was selected or inferred."],
  });

  pipeline.push({
    id: "annex-iii",
    title: "Step 3: High-scrutiny screen",
    status: highRiskMatches.length ? (tier === "high" ? "triggered" : "review") : "clear",
    legalBasis: "Article 6 and Annex III",
    summary:
      highRiskMatches.length > 0
        ? `${highRiskMatches.length} high-scrutiny area${highRiskMatches.length > 1 ? "s" : ""} selected or inferred.`
        : "No high-scrutiny area was selected or inferred.",
    details:
      highRiskMatches.length > 0
        ? highRiskMatches.map((rule) => `${rule.label}: ${rule.shortDescription}`)
        : ["No employment, education, healthcare, finance, insurance, migration, law-enforcement, justice, public-service, biometric, or product-safety trigger was selected or inferred."],
  });

  pipeline.push({
    id: "article-50",
    title: "Step 4: Transparency screen",
    status: limitedMatches.length ? "triggered" : "clear",
    legalBasis: "Article 50",
    summary: limitedMatches.length
      ? `${limitedMatches.length} transparency trigger${limitedMatches.length > 1 ? "s" : ""} selected or inferred.`
      : "No transparency trigger was selected or inferred.",
    details: limitedMatches.length
      ? limitedMatches.map((rule) => `${rule.label}: ${rule.shortDescription}`)
      : ["No chatbot, generated-content, or synthetic-media notice trigger was selected or inferred."],
  });

  pipeline.push({
    id: "evidence-and-consistency",
    title: "Step 5: Evidence and consistency review",
    status: contradictions.length || missingFacts.length || !input.evidenceDocuments.length ? "review" : "clear",
    legalBasis: "Evidence and review layer",
    summary: buildEvidenceStatus(input, evidenceFindings),
    details: [
      contradictions.length
        ? `${contradictions.length} contradiction${contradictions.length > 1 ? "s" : ""} detected.`
        : input.evidenceDocuments.length
          ? "No contradictions detected in the answers."
          : "No contradictions detected in the answers, but no evidence was available to verify them.",
      missingFacts.length ? `${missingFacts.length} missing fact${missingFacts.length > 1 ? "s" : ""}.` : "No major missing facts detected.",
      evidenceWarnings.length ? evidenceWarnings[0] : "No evidence warnings.",
    ],
  });

  pipeline.push({
    id: "final-tier",
    title: "Step 6: Final category",
    status: tier === "minimal" ? "clear" : tier === "needs_review" ? "review" : "triggered",
    legalBasis: "Risk-based architecture",
    summary: buildSummaryByTier(tier, input.systemName),
    details: [buildReasonByTier(tier, scopeStatus, contradictions, missingFacts, input), buildRecommendationByTier(tier)],
  });

  const selectedSignals = buildSelectedSignals(input);
  const factsUsed = buildFactsUsed(input);

  const supportScore = clamp(
    (uncertainty.answerCompleteness + uncertainty.evidenceSupport + uncertainty.realWorldStability + uncertainty.safeguardsMaturity + (100 - uncertainty.contradiction) + (100 - uncertainty.legalUncertainty)) / 6,
  );

  const baseConfidenceByTier: Record<RiskTier, number> = {
    out_of_scope: 54,
    unacceptable: 58,
    high: 57,
    limited: 53,
    minimal: 50,
    needs_review: 22,
  };

  let confidence = clamp(Math.round((supportScore + baseConfidenceByTier[tier]) / 2));

  if (!input.evidenceDocuments.length && tier !== "out_of_scope") confidence = Math.min(confidence, 60);
  if (aiFunctionUnclear) confidence = Math.min(confidence, 55);
  if (scopeStatus === "unclear") confidence = Math.min(confidence, 56);
  if (contradictions.length) confidence = Math.min(confidence, 62);
  if (input.systemDescription.trim().length < 70) confidence = Math.min(confidence, 58);
  if (tier === "high" && (!input.evidenceDocuments.length || contradictions.length || aiFunctionUnclear)) confidence = Math.min(confidence, 60);
  if (tier === "limited" && !input.controls.disclosure) confidence = Math.min(confidence, 58);
  if (tier === "minimal" && missingFacts.length > 0) confidence = Math.min(confidence, 54);
  if ((input.dataFacts.healthData || input.dataFacts.sensitiveData || input.dataFacts.biometricData || input.nonAIActFlags.childrenOrVulnerableUsers) && !input.evidenceDocuments.length) confidence = Math.min(confidence, 55);

  confidence = clamp(confidence, tier === "needs_review" ? 14 : 18, 90);

  const label = confidenceLabel(confidence, scopeStatus);

  const evidenceStatus = buildEvidenceStatus(input, evidenceFindings);
  const evidenceOnlyWarnings = [
    ...evidenceWarnings,
    ...evidenceFindings.filter((finding) => finding.category === "contradiction").map((finding) => finding.plainSummary),
  ];

  const assumptions = buildAssumptions(input, scopeStatus);
  const informationGaps = buildInformationGaps(input, missingFacts, scopeStatus);
  const gpaIObligations = buildGpaIObligations(input);
  const fieldAudit = buildFieldAudit(input, scopeStatus, contradictions, missingFacts, aiFunctionUnclear);
  const confidenceExplanation = buildConfidenceExplanation(input, scopeStatus, contradictions, missingFacts, aiFunctionUnclear);

  const requiredControls = buildRequiredControls(tier);
  const nextSteps = buildNextSteps(tier);
  const whatCouldChange = buildWhatCouldChange(tier);

  const checklist = buildChecklistForTier(tier, evidenceOnlyWarnings);
  const conformityWorkflow = buildConformityWorkflow(tier === "high");
  const citations = buildTriggeredCitations(input, prohibitedMatches, highRiskMatches, limitedMatches, tier);

  const summary = buildSummaryByTier(tier, input.systemName);
  const mainReason = buildReasonByTier(tier, scopeStatus, contradictions, missingFacts, input);
  const recommendation = buildRecommendationByTier(tier);

  return {
    tier,
    scopeStatus,
    actorRole: input.actorRole,
    systemType: input.systemType,
    aiFunctionUnclear,
    confidence,
    confidenceLabel: label,
    confidenceExplanation,
    uncertainty,
    summary,
    mainReason,
    recommendation,
    ruleGroup:
      tier === "out_of_scope"
        ? "Scope"
        : tier === "unacceptable"
          ? "Prohibited practice"
          : tier === "high"
            ? "High-scrutiny"
            : tier === "limited"
              ? "Transparency"
              : tier === "needs_review"
                ? "Needs review"
                : "Minimal risk",
    triggeredRules: tier === "unacceptable" ? prohibitedMatches : tier === "limited" ? limitedMatches : highRiskMatches,
    transparencyRules: limitedMatches,
    pipeline,
    checklist,
    citations,
    evidenceFindings,
    modelTestResults,
    conformityWorkflow,
    factsUsed,
    selectedSignals,
    contradictions,
    missingFacts,
    evidenceStatus,
    evidenceWarnings: evidenceOnlyWarnings,
    requiredControls,
    nextSteps,
    whatCouldChange,
    assumptions,
    informationGaps,
    nonAIActFlags: input.nonAIActFlags,
    gpaIObligations,
    fieldAudit,
    disclaimer,
    generatedAt: new Date().toISOString(),
    assessmentVersion: 1,
  };
}
