import { buildChecklistForTier, buildConformityWorkflow, buildTriggeredCitations } from "../legal/legalEngine";
import { runModelTestHooks } from "../testing/modelTesting";
import { calculateUncertainty } from "./uncertainty";
import { evaluateLegalRuleRegistry, type RuleRegistryResult } from "./legalRuleRegistry";
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
  LegalBasisReference,
  LegalRiskTier,
  LegalRuleEvaluation,
  PipelineStep,
  ProhibitedFacts,
  RiskTier,
  ReviewStatus,
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

const LEGAL_RULES = [
  {
    id: "scope.eu",
    tier: "scope",
    article: "Article 2",
    title: "EU scope",
    explanation: "EU scope is indicated when the system is used in the EU, placed on the EU market, or affects EU users.",
  },
  {
    id: "prohibited.article5",
    tier: "potentially_prohibited",
    article: "Article 5",
    title: "Prohibited AI practices",
    priority: 100,
  },
  {
    id: "highrisk.article6.annexI",
    tier: "high_risk",
    article: "Article 6(1)",
    annex: "Annex I",
    title: "Product-safety high-risk route",
    priority: 90,
  },
  {
    id: "highrisk.article6.annexIII",
    tier: "high_risk",
    article: "Article 6(2)",
    annex: "Annex III",
    title: "High-risk AI systems listed in Annex III",
    priority: 80,
  },
  {
    id: "limited.article50",
    tier: "limited_risk",
    article: "Article 50",
    title: "Transparency obligations",
    priority: 40,
  },
] as const;

const ANNEX_III_BASIS: Record<string, LegalBasisReference> = {
  biometricIdentification: {
    source: "EU AI Act",
    article: "Article 6(2)",
    annex: "Annex III",
    point: "1",
    title: "Biometrics",
    route: "Article 6(2) + Annex III",
    relevance: "The system identifies or verifies people using biometric matching outside an already prohibited context.",
  },
  biometricCategorization: {
    source: "EU AI Act",
    article: "Article 6(2)",
    annex: "Annex III",
    point: "1",
    title: "Biometrics",
    route: "Article 6(2) + Annex III",
    relevance: "The system categorizes people using biometric data outside an already prohibited sensitive-trait context.",
  },
  criticalInfrastructure: {
    source: "EU AI Act",
    article: "Article 6(2)",
    annex: "Annex III",
    point: "2",
    title: "Critical infrastructure",
    route: "Article 6(2) + Annex III",
    relevance: "The system manages or affects a safety component of critical infrastructure or an essential infrastructure service.",
  },
  education: {
    source: "EU AI Act",
    article: "Article 6(2)",
    annex: "Annex III",
    point: "3",
    title: "Education and vocational training",
    route: "Article 6(2) + Annex III",
    relevance: "The system is used for admission, assessment, grading, pass/fail, progression, or learning-outcome evaluation.",
  },
  employment: {
    source: "EU AI Act",
    article: "Article 6(2)",
    annex: "Annex III",
    point: "4",
    title: "Employment, workers management and access to self-employment",
    route: "Article 6(2) + Annex III",
    relevance: "The system is used to screen, rank, score, filter, assess, or recommend job applicants, employees, or workers.",
  },
  finance: {
    source: "EU AI Act",
    article: "Article 6(2)",
    annex: "Annex III",
    point: "5",
    title: "Access to essential private services and essential public services and benefits",
    route: "Article 6(2) + Annex III",
    relevance: "The system affects creditworthiness, loan eligibility, or access to an essential private service.",
  },
  insurance: {
    source: "EU AI Act",
    article: "Article 6(2)",
    annex: "Annex III",
    point: "5",
    title: "Access to essential private services and essential public services and benefits",
    route: "Article 6(2) + Annex III",
    relevance: "The system affects insurance eligibility, pricing, or access to an essential service.",
  },
  publicServices: {
    source: "EU AI Act",
    article: "Article 6(2)",
    annex: "Annex III",
    point: "5",
    title: "Access to essential private services and essential public services and benefits",
    route: "Article 6(2) + Annex III",
    relevance: "The system affects eligibility, prioritization, or access to essential public services, benefits, or similar services.",
  },
  lawEnforcement: {
    source: "EU AI Act",
    article: "Article 6(2)",
    annex: "Annex III",
    point: "6",
    title: "Law enforcement",
    route: "Article 6(2) + Annex III",
    relevance: "The system supports law-enforcement risk assessment, evidence evaluation, suspect profiling, or investigative prioritization.",
  },
  migration: {
    source: "EU AI Act",
    article: "Article 6(2)",
    annex: "Annex III",
    point: "7",
    title: "Migration, asylum and border control management",
    route: "Article 6(2) + Annex III",
    relevance: "The system supports visa, asylum, migration, border, credibility, document, or security-risk decisions.",
  },
  justice: {
    source: "EU AI Act",
    article: "Article 6(2)",
    annex: "Annex III",
    point: "8",
    title: "Administration of justice and democratic processes",
    route: "Article 6(2) + Annex III",
    relevance: "The system assists judicial decision-making, legal fact interpretation, dispute outcome assessment, or democratic process influence.",
  },
};

const PRODUCT_SAFETY_BASIS: LegalBasisReference = {
  source: "EU AI Act",
  article: "Article 6(1)",
  annex: "Annex I",
  title: "Safety component or regulated product route",
  route: "Article 6(1) + Annex I",
  relevance:
    "The system is or supports a safety component of a regulated product, or the output may affect product safety or regulated conformity.",
};

const HEALTHCARE_CLARIFICATION_BASIS: LegalBasisReference = {
  source: "EU AI Act",
  article: "Article 6",
  annex: "Annex I / sector route to confirm",
  title: "Healthcare and patient-care decision support",
  route: "Medical-device or product-safety route requires clarification",
  relevance:
    "The system supports triage, diagnosis, treatment, or patient-care decisions. Confirm whether it is a regulated medical device or safety component.",
};

const EVIDENCE_UPLOAD_ACTIONS = [
  "Upload a model card or intended-use statement.",
  "Upload technical documentation and data summary.",
  "Upload evaluation, bias, robustness, or validation reports.",
  "Upload human oversight, appeal, escalation, disclosure, logging, and risk-management records.",
];

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function hasEducationDataOnlySignal(text: string) {
  return includesAny(text, ["education history", "degree", "qualification", "university attended", "cv education", "resume education"]);
}

function hasEducationUseCaseSignal(text: string) {
  return includesAny(text, [
    "student admission",
    "school admission",
    "university admission",
    "student assessment",
    "student grading",
    "essay grading",
    "exam scoring",
    "grades student",
    "grades students",
    "grading student",
    "pass/fail",
    "academic progression",
    "learning outcome",
    "vocational training assessment",
  ]);
}

function hasEmploymentUseCaseSignal(text: string) {
  return includesAny(text, [
    "recruit",
    "hiring",
    "candidate screening",
    "cv ranking",
    "resume ranking",
    "job applicant",
    "applicant",
    "interview recommendation",
    "rejection recommendation",
    "promotion",
    "dismissal",
    "task allocation",
    "worker monitoring",
    "employee monitoring",
    "worker evaluation",
    "performance scoring",
  ]);
}

function hasHealthcareUseCaseSignal(text: string) {
  return includesAny(text, [
    "diagnosis",
    "diagnostic",
    "triage",
    "treatment",
    "medical urgency",
    "patient care",
    "clinical",
    "clinician",
    "hospital",
    "medical device",
  ]);
}

function hasFinanceUseCaseSignal(text: string) {
  return includesAny(text, ["loan approval", "loan eligibility", "credit scoring", "creditworthiness", "default risk", "credit score", "underwriting"]);
}

function hasInsuranceUseCaseSignal(text: string) {
  return includesAny(text, ["insurance eligibility", "insurance pricing", "premium", "claim approval", "claims eligibility"]);
}

function hasPublicServicesUseCaseSignal(text: string) {
  return includesAny(text, ["public benefits", "benefits eligibility", "social assistance", "emergency dispatch", "essential public service", "public service eligibility"]);
}

function hasProductSafetySignal(input: ClassificationInput, text: string) {
  const productSafetyContext = includesAny(text, [
    "safety component",
    "regulated product",
    "medical device",
    "machinery",
    "toy safety",
    "aviation",
    "vehicle",
    "rail",
    "marine equipment",
    "conformity assessment",
    "blocks release",
    "release gating",
    "inspection scores",
  ]);
  return (
    input.domains.productSafety ||
    input.systemType === "embedded_product_component" ||
    (input.nonAIActFlags.medicalDeviceOrHealthRegulation && productSafetyContext) ||
    (input.nonAIActFlags.productSafety && productSafetyContext)
  );
}

function hasSensitiveBiometricTraitInferenceSignal(text: string) {
  return includesAny(text, [
    "sensitive biometric categorization",
    "sensitive trait",
    "protected trait",
    "race",
    "racial",
    "ethnic origin",
    "ethnicity",
    "political opinion",
    "political opinions",
    "religious belief",
    "religion",
    "philosophical belief",
    "trade union",
    "union membership",
    "sex life",
    "sexual orientation",
  ]);
}

function hasEmotionRecognitionSignal(input: ClassificationInput, text: string) {
  return (
    input.prohibitedFacts.workplaceOrEducationEmotionRecognition ||
    includesAny(text, [
      "emotion recognition",
      "emotion analysis",
      "analyzes emotion",
      "analyses emotion",
      "emotion labels",
      "emotion cues",
      "facial expression",
      "attention and emotion",
      "sentiment from webcam",
      "tone analysis",
    ])
  );
}

function hasDirectInteractionSignal(input: ClassificationInput, text: string) {
  return (
    input.contentFacts.directlyInteractsWithUsers ||
    input.interactionMode === "user_facing" ||
    input.interactionMode === "both" ||
    includesAny(text, [
      "chatbot",
      "assistant answers",
      "directly interact",
      "direct interaction",
      "interacts with applicants",
      "interact with applicants",
      "interacts with candidates",
      "interact with candidates",
      "ai interview",
      "video interview",
      "interview system",
      "applicant-facing",
      "candidate-facing",
    ])
  );
}

function isComplianceScreeningSupport(text: string) {
  return includesAny(text, ["ai act guard", "ai act classifier", "compliance screening", "screening memo", "ai act risk"]);
}

function hasDecisionActionSignal(input: ClassificationInput, text: string) {
  return (
    input.decisionMode === "materially_influences_decision" ||
    input.decisionMode === "automatically_decides" ||
    Object.values(input.decisionFacts).some(Boolean) ||
    includesAny(text, ["rank", "score", "filter", "approve", "reject", "recommend", "assess", "prioritize", "triage"])
  );
}

function selectedScopeFacts(input: ClassificationInput) {
  return selectedBooleanFacts(input.scope, scopeLabels);
}

function inferFromText(input: ClassificationInput, evidenceFindings: EvidenceFinding[]) {
  const text = textCorpus(input);
  const possibleSignals: string[] = [];
  const evidenceWarnings: string[] = [];

  const textHits = [
    { term: "recruit", label: "employment/recruitment" },
    { term: "hiring", label: "employment/hiring" },
    { term: "candidate", label: "employment/candidate screening" },
    { term: "job applicant", label: "employment/job applicants" },
    { term: "diagnos", label: "healthcare" },
    { term: "patient", label: "healthcare/patient care" },
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

  if (hasEducationUseCaseSignal(text)) possibleSignals.push("education-domain use case");
  if (hasEducationDataOnlySignal(text)) possibleSignals.push("education records data category");
  if (hasEmploymentUseCaseSignal(text)) possibleSignals.push("employment-domain use case");
  if (hasHealthcareUseCaseSignal(text)) possibleSignals.push("healthcare decision support");
  if (hasFinanceUseCaseSignal(text)) possibleSignals.push("credit or lending");
  if (hasInsuranceUseCaseSignal(text)) possibleSignals.push("insurance");
  if (hasPublicServicesUseCaseSignal(text)) possibleSignals.push("public or essential services");

  const evidencePossibleSignals = evidenceFindings.filter((finding) => finding.category === "possible-signal").map((finding) => finding.plainSummary);
  evidencePossibleSignals.forEach((warning) => evidenceWarnings.push(`Possible signal detected in evidence: ${warning}`));

  if (!input.evidenceDocuments.length) {
    evidenceWarnings.push("No evidence files were uploaded.");
  }

  return { possibleSignals: unique(possibleSignals), evidenceWarnings };
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
    !isComplianceScreeningSupport(text) &&
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

  if (hasEmploymentUseCaseSignal(text) && !input.domains.employment) contradictions.push("Domain mismatch: the description indicates recruitment, hiring, applicant screening, worker monitoring, or employment decision support, but the employment domain is not selected.");
  if (hasEducationUseCaseSignal(text) && !input.domains.education) contradictions.push("Domain mismatch: the description indicates student admission, grading, assessment, pass/fail, progression, or vocational training, but the education domain is not selected.");
  if (hasHealthcareUseCaseSignal(text) && !input.domains.healthcare) contradictions.push("Domain mismatch: the description indicates triage, diagnosis, treatment, medical urgency, or patient-care decision support, but healthcare is not selected.");
  if (hasFinanceUseCaseSignal(text) && !input.domains.finance) contradictions.push("Domain mismatch: the description indicates credit scoring, loan eligibility, underwriting, or creditworthiness assessment, but finance is not selected.");
  if (hasInsuranceUseCaseSignal(text) && !input.domains.insurance) contradictions.push("Domain mismatch: the description indicates insurance eligibility, claims, or pricing, but insurance is not selected.");
  if (possibleSignals.some((signal) => signal.includes("migration")) && !input.domains.migration) contradictions.push("Domain mismatch: the description indicates migration, asylum, visa, or border-control decision support, but migration is not selected.");
  if (possibleSignals.some((signal) => signal.includes("law enforcement")) && !input.domains.lawEnforcement) contradictions.push("Domain mismatch: the description indicates law-enforcement support, but law enforcement is not selected.");
  if (possibleSignals.some((signal) => signal.includes("biometric")) && !input.dataFacts.biometricData) contradictions.push("Data-category mismatch: the description indicates biometric identification, verification, categorization, or face matching, but biometric data is not selected.");
  if (possibleSignals.some((signal) => signal.includes("emotion recognition")) && !input.prohibitedFacts.workplaceOrEducationEmotionRecognition) contradictions.push("Possible missing signal: the description mentions emotion recognition. Confirm whether it occurs in workplace or education, or another context requiring transparency.");

  if (includesAny(text, ["rejects candidates", "reject applicants", "automatically rejects", "rejects applicants"]) && !input.decisionFacts.approvesRejectsPeople) {
    contradictions.push("Impact mismatch: the description indicates approval or rejection of people, but the approve/reject decision action is not selected.");
  }
  if (includesAny(text, ["used by eu customers", "eu customers", "european customers", "eu users", "european users"]) && !input.scope.usedInEU && !input.scope.placedOnEUMarket && !input.scope.affectsEUUsers) {
    contradictions.push("Scope mismatch: the description indicates EU users or EU customers, but no EU scope signal is selected.");
  }
  if (includesAny(text, ["we sell", "sold to customers", "sell this system", "placed on the market", "api customers"]) && input.actorRole === "deployer") {
    contradictions.push("Actor-role mismatch: the description suggests provider or market-placement activity, but the actor role is deployer.");
  }

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
  if ((hasDirectInteractionSignal(input, text) || hasEmotionRecognitionSignal(input, text) || input.contentFacts.generatesPublicFacingContent) && !input.controls.disclosure) {
    missing.push("Article 50 disclosure or labeling status");
  }
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
  const text = textCorpus(input);
  const prohibited = {
    ...input.prohibitedFacts,
    sensitiveBiometricCategorization:
      input.prohibitedFacts.sensitiveBiometricCategorization &&
      input.dataFacts.biometricData &&
      hasSensitiveBiometricTraitInferenceSignal(text),
  };
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
    employment: input.domains.employment || hasEmploymentUseCaseSignal(text),
    education: input.domains.education || hasEducationUseCaseSignal(text),
    healthcare: input.domains.healthcare || hasHealthcareUseCaseSignal(text),
    finance: input.domains.finance || hasFinanceUseCaseSignal(text),
    insurance: input.domains.insurance || hasInsuranceUseCaseSignal(text),
    migration: input.domains.migration || includesAny(text, ["visa", "asylum", "border control", "migration risk", "migrant", "document verification for border"]),
    lawEnforcement: input.domains.lawEnforcement || includesAny(text, ["law enforcement", "crime prediction", "suspect", "evidence evaluation", "investigation prioritization", "risk of offending"]),
    justice: input.domains.justice || includesAny(text, ["judicial", "court", "legal fact", "dispute outcome", "election", "democratic process"]),
    publicServices: input.domains.publicServices || hasPublicServicesUseCaseSignal(text),
    criticalInfrastructure: input.domains.criticalInfrastructure || includesAny(text, ["critical infrastructure", "road traffic", "water supply", "gas", "heating", "electricity grid", "digital infrastructure"]),
    productSafety: hasProductSafetySignal(input, text),
    biometricIdentification: input.dataFacts.biometricData && biometricIdentificationContext && !input.prohibitedFacts.realTimePublicSpaceBiometricIdentification,
    biometricCategorization:
      input.dataFacts.biometricData &&
      biometricCategorizationContext &&
      !input.prohibitedFacts.sensitiveBiometricCategorization &&
      !input.prohibitedFacts.realTimePublicSpaceBiometricIdentification,
  };
  const limitedRisk = {
    chatbot: hasDirectInteractionSignal(input, text),
    deepfake: input.contentFacts.createsRealisticSyntheticContent || input.contentFacts.generatesPublicFacingContent,
    emotionRecognition: hasEmotionRecognitionSignal(input, text),
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

  const text = textCorpus(input);
  const hasMeaningfulSupport =
    input.decisionMode !== "unclear" &&
    (input.systemDescription.trim().length >= 50 || highRiskMatches.length > 0 || transparencyMatches.length > 0);
  const highRiskSupported = highRiskMatches.length > 0 && hasDecisionActionSignal(input, text) && hasMeaningfulSupport;
  const limitedSupported = transparencyMatches.length > 0 && !highRiskSupported;
  const weakVagueCase =
    scopeStatus !== "out_of_scope" &&
    !input.evidenceDocuments.length &&
    input.systemDescription.trim().length < 50 &&
    !limitedSupported &&
    !highRiskSupported;
  const needsReview =
    input.systemType === "non_ai_or_unclear" ||
    missingFacts.length >= 3 ||
    weakVagueCase ||
    aiFunctionUnclear;

  if (carveOut.length !== prohibitedMatches.length) {
    return { tier: "needs_review" as const, prohibitedMatches, highRiskMatches, transparencyMatches };
  }

  if (prohibitedMatches.length) return { tier: "unacceptable" as const, prohibitedMatches, highRiskMatches, transparencyMatches };
  if (highRiskSupported) return { tier: "high" as const, prohibitedMatches, highRiskMatches, transparencyMatches };
  if (limitedSupported) return { tier: "limited" as const, prohibitedMatches, highRiskMatches, transparencyMatches };
  if (highRiskMatches.length) return { tier: "high" as const, prohibitedMatches, highRiskMatches, transparencyMatches };
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

function legalBasisForRule(rule: TriggeredRule): LegalBasisReference {
  if (rule.category === "prohibited") {
    return {
      source: "EU AI Act",
      article: "Article 5",
      title: rule.label,
      route: "Article 5 prohibited-practice screen",
      relevance: rule.shortDescription,
    };
  }

  if (rule.id === "productSafety") return PRODUCT_SAFETY_BASIS;
  if (rule.id === "healthcare") return HEALTHCARE_CLARIFICATION_BASIS;

  const annexBasis = ANNEX_III_BASIS[rule.id];
  if (annexBasis) return annexBasis;

  if (rule.category === "limitedRisk") {
    return {
      source: "EU AI Act",
      article: "Article 50",
      title: rule.label,
      route: "Article 50 transparency obligations",
      relevance: rule.shortDescription,
    };
  }

  return {
    source: "EU AI Act",
    article: rule.legalBasis,
    title: rule.label,
    relevance: rule.shortDescription,
  };
}

function legalBasisLabel(item: LegalBasisReference) {
  const parts = [item.article, item.annex, item.point ? `point ${item.point}` : ""].filter(Boolean);
  return `${parts.join(" + ")}: ${item.title}`;
}

function matchedFactsForRule(ruleId: string, input: ClassificationInput, text: string) {
  const facts: string[] = [];
  if (input.scope.usedInEU || input.scope.placedOnEUMarket || input.scope.affectsEUUsers) facts.push(`EU scope: ${selectedScopeFacts(input).join(", ")}`);
  if (input.systemType !== "non_ai_or_unclear") facts.push(`AI system type: ${input.systemType.replace(/_/g, " ")}`);

  const decisionFacts = selectedBooleanFacts(input.decisionFacts, decisionActionLabels);
  if (decisionFacts.length) facts.push(...decisionFacts);
  if (input.decisionMode !== "unclear") facts.push(`decision role: ${input.decisionMode.replace(/_/g, " ")}`);
  if (input.affectedPeople.length) facts.push(`affected people: ${input.affectedPeople.join(", ")}`);

  if (ruleId === "employment") {
    if (input.domains.employment) facts.push("employment domain selected");
    if (hasEmploymentUseCaseSignal(text)) facts.push("employment/recruitment use case indicated by description");
    if (includesAny(text, ["candidate", "applicant", "hiring", "recruit"])) facts.push("affects job applicants or hiring outcomes");
  }
  if (ruleId === "education") {
    if (input.domains.education) facts.push("education domain selected");
    if (hasEducationUseCaseSignal(text)) facts.push("student assessment, grading, admission, or progression use case indicated");
  }
  if (ruleId === "finance") {
    if (input.domains.finance) facts.push("finance domain selected");
    if (hasFinanceUseCaseSignal(text)) facts.push("creditworthiness, loan eligibility, or underwriting indicated");
  }
  if (ruleId === "insurance") {
    if (input.domains.insurance) facts.push("insurance domain selected");
    if (hasInsuranceUseCaseSignal(text)) facts.push("insurance eligibility, claims, or pricing indicated");
  }
  if (ruleId === "healthcare") {
    if (input.domains.healthcare) facts.push("healthcare domain selected");
    if (hasHealthcareUseCaseSignal(text)) facts.push("triage, diagnosis, treatment, or patient-care support indicated");
    if (input.dataFacts.healthData) facts.push("health data selected");
  }
  if (ruleId === "productSafety") {
    if (input.systemType === "embedded_product_component") facts.push("embedded product or safety component system type");
    if (input.domains.productSafety) facts.push("product safety domain selected");
    if (input.nonAIActFlags.medicalDeviceOrHealthRegulation) facts.push("medical-device or health regulation flag selected");
    if (input.nonAIActFlags.productSafety) facts.push("product-safety compliance flag selected");
  }
  if (ruleId === "biometricIdentification" || ruleId === "biometricCategorization") {
    if (input.dataFacts.biometricData) facts.push("biometric data selected");
    if (includesAny(text, ["facial recognition", "face recognition", "identity match", "verify identity", "watchlist"])) facts.push("biometric identification or verification indicated");
    if (includesAny(text, ["biometric categorization", "trait inference", "age estimate", "gender inference"])) facts.push("biometric categorization indicated");
  }
  if (ruleId === "criticalInfrastructure" && (input.domains.criticalInfrastructure || includesAny(text, ["critical infrastructure", "electricity grid", "road traffic", "water supply"]))) {
    facts.push("critical infrastructure or essential infrastructure context indicated");
  }
  if (ruleId === "publicServices" && (input.domains.publicServices || hasPublicServicesUseCaseSignal(text))) {
    facts.push("essential public service, benefit, or emergency-prioritization context indicated");
  }
  if (ruleId === "lawEnforcement" && (input.domains.lawEnforcement || includesAny(text, ["law enforcement", "crime", "suspect", "evidence evaluation"]))) {
    facts.push("law-enforcement risk, evidence, or investigative support indicated");
  }
  if (ruleId === "migration" && (input.domains.migration || includesAny(text, ["visa", "asylum", "border", "migration"]))) {
    facts.push("migration, asylum, visa, or border-control support indicated");
  }
  if (ruleId === "justice" && (input.domains.justice || includesAny(text, ["judicial", "court", "legal fact", "election"]))) {
    facts.push("justice or democratic-process support indicated");
  }

  return unique(facts);
}

function buildReviewStatus(input: ClassificationInput, scopeStatus: ScopeStatus, aiFunctionUnclear: boolean, contradictions: string[], missingFacts: string[], tier: RiskTier): ReviewStatus[] {
  const statuses: ReviewStatus[] = [];
  if (tier === "unacceptable") statuses.push("Needs legal review");
  if (!input.evidenceDocuments.length && tier !== "out_of_scope") statuses.push("Needs evidence");
  if (scopeStatus !== "in_scope" || aiFunctionUnclear || input.actorRole === "unclear" || missingFacts.length > 0) statuses.push("Needs clarification");
  if (contradictions.length > 0) statuses.push("Contradictions detected");
  return unique(statuses.length ? statuses : ["Ready for provisional screening"]);
}

function deriveLegalRiskTier(tier: RiskTier, scopeStatus: ScopeStatus, input: ClassificationInput, aiFunctionUnclear: boolean): LegalRiskTier {
  if (scopeStatus !== "in_scope") return "Out of scope / EU scope not established";
  if (input.systemType === "non_ai_or_unclear") return "Not an AI system / AI status unclear";
  if (tier === "unacceptable") return "Potentially prohibited";
  if (tier === "high") return "Likely High-risk";
  if (tier === "limited") return "Limited risk / Transparency obligation";
  if (tier === "minimal") return "Minimal risk";
  if (aiFunctionUnclear) return "Not an AI system / AI status unclear";
  return "Unclassified / Insufficient facts";
}

function buildRejectedSignals(input: ClassificationInput, text: string, prohibitedMatches: TriggeredRule[], highRiskMatches: TriggeredRule[], transparencyMatches: TriggeredRule[]) {
  const highRiskIds = new Set(highRiskMatches.map((rule) => rule.id));
  const rejected: string[] = [];

  if (!prohibitedMatches.length) {
    rejected.push("Article 5 prohibited practices: not triggered because no manipulation, social scoring, prohibited biometric, exploitation, or predictive-policing-only pattern was selected.");
  }
  if (!highRiskIds.has("productSafety")) {
    rejected.push("Article 6(1) + Annex I product-safety route: not triggered because the current facts do not show a regulated product safety component requiring third-party conformity assessment.");
  }
  if (!highRiskIds.has("education")) {
    rejected.push(
      hasEducationDataOnlySignal(text)
        ? "Annex III education: not triggered. Education history, degree, qualification, or a CV education section is treated as applicant data in an employment context, not student assessment or educational access."
        : "Annex III education: not triggered because no student admission, grading, pass/fail, educational access, academic progression, or vocational-training assessment use case was selected.",
    );
  }
  if (!highRiskIds.has("employment")) {
    rejected.push("Annex III employment: not triggered because no recruitment, hiring, worker management, worker monitoring, or employment decision-support pattern was selected.");
  }
  if (!highRiskIds.has("finance") && !highRiskIds.has("insurance") && !highRiskIds.has("publicServices")) {
    rejected.push("Annex III essential services: not triggered because no credit, loan, benefit, public-service, emergency-prioritization, or essential-service eligibility decision was selected.");
  }
  if (!transparencyMatches.length) {
    rejected.push("Article 50 transparency: not triggered because no direct AI interaction, chatbot, deepfake, synthetic media, emotion-recognition notice, or public-facing generated-content signal was selected.");
  }

  return rejected;
}

function buildLegalExplanation(
  riskTier: LegalRiskTier,
  legalBasis: LegalBasisReference[],
  highRiskMatches: TriggeredRule[],
  transparencyMatches: TriggeredRule[],
  input: ClassificationInput,
  text: string,
) {
  if (riskTier === "Likely High-risk") {
    const basis = legalBasis.map(legalBasisLabel).join("; ");
    if (highRiskMatches.some((rule) => rule.id === "employment")) {
      return [
        "This is a high-risk / high-scrutiny screening conclusion.",
        "EU scope is established from the selected scope facts.",
        "AI system status is established from the system type and described AI inputs/outputs.",
        "The system is used in recruitment, employment, or worker management.",
        input.affectedPeople.length ? `It affects ${input.affectedPeople.join(", ")}.` : "It affects people in an employment context.",
        "It ranks, scores, filters, recommends, assesses, automatically decides, or materially influences outcomes.",
        `Therefore, the system likely falls under ${basis}.`,
      ].join(" ");
    }
    if (highRiskMatches.some((rule) => rule.id === "education")) {
      return `This is a high-risk / high-scrutiny screening conclusion. EU scope and AI system status are established. The system supports student admission, grading, assessment, pass/fail, progression, or vocational-training decisions and therefore likely falls under ${basis}.`;
    }
    if (highRiskMatches.some((rule) => rule.id === "finance")) {
      return `This is a high-risk / high-scrutiny screening conclusion. EU scope and AI system status are established. The system affects creditworthiness, loan eligibility, approval, rejection, or underwriting for an essential private service and therefore likely falls under ${basis}.`;
    }
    if (highRiskMatches.some((rule) => rule.id === "healthcare")) {
      return `This is a high-risk / high-scrutiny screening conclusion. EU scope and AI system status are established. The system supports triage, diagnosis, treatment, medical urgency, or patient-care decisions. This is not treated as minimal risk; confirm whether the Article 6(1) + Annex I medical-device or product-safety route applies.`;
    }
    if (highRiskMatches.some((rule) => rule.id === "productSafety")) {
      return `This is a high-risk / high-scrutiny screening conclusion. EU scope and AI system status are established. The system appears to be or support a safety component of a regulated product, so the report distinguishes the Article 6(1) + Annex I route from the Annex III use-case route.`;
    }
    return `This is a high-risk / high-scrutiny screening conclusion. EU scope and AI system status are established. The selected or inferred facts match a high-risk route: ${basis}.`;
  }

  if (riskTier === "Potentially prohibited") {
    const secondaryHighRisk = highRiskMatches
      .map((rule) => legalBasisLabel(legalBasisForRule(rule)))
      .join("; ");
    const transparency = transparencyMatches
      .map((rule) => legalBasisLabel(legalBasisForRule(rule)))
      .join("; ");
    return [
      "A selected or clearly indicated Article 5 prohibited-practice signal takes priority over the other risk tiers and requires legal review before deployment.",
      secondaryHighRisk ? `Secondary high-risk route also matched: ${secondaryHighRisk}.` : "",
      transparency ? `Transparency route may be triggered: ${transparency}. Direct interaction, AI interview, emotion-recognition, or disclosure facts should be reviewed.` : "",
    ].filter(Boolean).join(" ");
  }

  if (riskTier === "Limited risk / Transparency obligation") {
    return "The system directly interacts with people, generates public-facing content, creates synthetic media, or otherwise triggers a transparency notice, while no high-risk route is currently stronger.";
  }

  if (riskTier === "Out of scope / EU scope not established") {
    return "EU AI Act scope is not established because the current facts do not show use in the EU, placement on the EU market, or effects on EU users.";
  }

  if (riskTier === "Not an AI system / AI status unclear") {
    return "The report cannot pass the AI-system gate because the system type, AI inputs, AI outputs, or relying party are not clear enough.";
  }

  if (riskTier === "Minimal risk" && (input.systemType === "gpai_model" || input.systemType === "gpai_model_systemic_risk" || input.gpaI.developsModel || input.gpaI.usesThirdPartyApi)) {
    return "The facts describe a minimal-risk / low-risk support context for this use case, while GPAI obligations may still apply separately based on the provider or deployer role.";
  }

  if (riskTier === "Minimal risk" && includesAny(text, ["ai act guard", "ai act classifier", "compliance screening"])) {
    return "The facts describe a minimal-risk / low-risk compliance support tool that screens and explains AI Act risk. It is not high-risk unless it makes binding decisions or affects access to rights, services, or opportunities.";
  }

  if (riskTier === "Minimal risk") return "No Article 5, Article 6 high-risk, or Article 50 transparency route is triggered by the current facts, so this is a minimal-risk / low-risk screening result.";
  return "No reliable legal risk signal could be inferred from the current facts. Missing facts or unresolved details should be clarified before relying on the result.";
}

function buildLegalWhatCouldChange(
  riskTier: LegalRiskTier,
  highRiskMatches: TriggeredRule[],
  matchedRoutes: LegalRuleEvaluation[] = []
) {
  const hasHighRisk = (id: string) => highRiskMatches.some((rule) => rule.id === id);
  const hasRoute = (id: string) => matchedRoutes.some((route) => route.ruleId === id);

  if (riskTier === "Potentially prohibited") {
    const changes: string[] = [];
    if (hasRoute("article5.emotionRecognitionWorkplaceEducation")) {
      changes.push("If emotion recognition is removed from the workplace or education context, the Article 5 concern may weaken, while any employment or education high-risk route should still be reassessed.");
    }
    if (hasRoute("article5.socialScoring")) {
      changes.push("If the social reliability or trustworthiness flag is removed or narrowed so it does not affect benefits, services, rights, or priority, the Article 5 concern may weaken.");
    }
    if (hasRoute("article5.sensitiveBiometricCategorization")) {
      changes.push("If biometric processing does not infer sensitive or protected traits, the sensitive biometric categorization concern may weaken.");
    }
    if (hasHighRisk("employment")) {
      changes.push("If the system only summarizes applicant information and does not score, rank, filter, recommend, assess, or influence hiring, the secondary employment high-risk route may weaken.");
    }
    if (hasHighRisk("publicServices")) {
      changes.push("If the system only organizes applications and does not score, rank, approve, reject, prioritize, investigate, or affect public benefits, the public-services high-risk route may weaken.");
    }
    if (hasRoute("limited.article50") || matchedRoutes.some((route) => route.tier === "limited_risk")) {
      changes.push("If direct interaction, emotion-recognition notice, or public-facing AI output is removed, the Article 50 transparency route may change.");
    }
    changes.push("Legal review should confirm whether the prohibited-practice pattern is present before deployment, procurement, or market launch.");
    return unique(changes);
  }

  if (riskTier === "Likely High-risk" && highRiskMatches.some((rule) => rule.id === "employment")) {
    return [
      "If the system only summarizes CVs and does not rank, score, filter, recommend, assess, or influence hiring, the high-risk classification may weaken.",
      "If the system automatically rejects candidates or makes final employment decisions, the high-risk conclusion becomes stronger.",
      "If it is not used in the EU, placed on the EU market, or affecting EU users, EU AI Act scope may not be established.",
    ];
  }
  if (riskTier === "Likely High-risk" && highRiskMatches.some((rule) => rule.id === "education")) {
    return [
      "If the system only organizes education records and does not affect admission, grading, pass/fail, progression, or learning assessment, the education high-risk route may weaken.",
      "If it scores exams, determines progression, or influences access to education, the high-risk conclusion becomes stronger.",
      "If it is not used in the EU, placed on the EU market, or affecting EU users, EU AI Act scope may not be established.",
    ];
  }
  if (riskTier === "Likely High-risk" && highRiskMatches.some((rule) => rule.id === "publicServices")) {
    return [
      "If the system only organizes applications and does not score, rank, approve, reject, prioritize, investigate, or affect public benefits, the high-risk classification may weaken.",
      "If it automatically approves, rejects, reduces, or prioritizes public benefits or essential services, the high-risk conclusion becomes stronger.",
      "If a social reliability flag is removed or narrowly defined, any Article 5 social-scoring concern may weaken.",
    ];
  }
  if (riskTier === "Likely High-risk" && highRiskMatches.some((rule) => rule.id === "finance")) {
    return [
      "If the system only summarizes financial documents and does not affect creditworthiness, loan eligibility, pricing, access, approval, rejection, or limits, the high-risk route may weaken.",
      "If it automatically approves, rejects, prices, or limits access to credit or essential private services, the high-risk conclusion becomes stronger.",
      "If direct user-facing explanations are added, Article 50 transparency should also be reviewed.",
    ];
  }
  if (riskTier === "Likely High-risk" && highRiskMatches.some((rule) => rule.id === "healthcare")) {
    return [
      "If the system is a regulated medical device or safety component, the Article 6(1) + Annex I route becomes stronger.",
      "If the system only summarizes non-clinical notes and does not affect patient-care decisions, the high-risk conclusion may weaken.",
      "If human clinicians remain the sole decision-makers, document that role and the oversight workflow.",
    ];
  }
  if (riskTier === "Likely High-risk" && highRiskMatches.some((rule) => rule.id === "biometricIdentification")) {
    return [
      "If the system only verifies one known user's identity, do not infer biometric identification or sensitive biometric categorization without more facts.",
      "If it identifies people among multiple people, matches watchlists, or operates in public spaces, legal risk increases.",
      "If it infers sensitive or protected traits from biometric data, Article 5 legal review is needed.",
    ];
  }
  if (riskTier === "Likely High-risk" && highRiskMatches.some((rule) => rule.id === "productSafety")) {
    return [
      "If the AI is a safety component of a regulated product requiring third-party conformity assessment, the Article 6(1) + Annex I route becomes stronger.",
      "If the AI is not safety-related and does not affect regulated conformity, the product-safety route may weaken.",
      "If the same system also affects people in an Annex III domain, reassess the use-case route separately.",
    ];
  }
  if (riskTier === "Likely High-risk") return ["Removing the consequential decision role may weaken the high-risk route.", "Adding automatic decisions, rejection, or safety-critical output may strengthen the high-risk route.", "EU scope facts can change the result."];
  if (riskTier === "Limited risk / Transparency obligation") return ["If the system only answers generic questions and does not affect rights, access, employment, health, credit, or public services, high-risk is unlikely.", "Removing direct AI interaction, public-facing generated text, emotion recognition, biometric categorization, or synthetic media may remove Article 50 duties.", "If it makes or influences consequential decisions, reassess high-risk routes."];
  if (riskTier === "Minimal risk") return ["Adding a material decision role, direct user interaction, or a regulated-domain use case may change the classification.", "Evidence showing no impact on rights, services, or opportunities would strengthen the minimal-risk conclusion."];
  if (riskTier === "Out of scope / EU scope not established") return ["Use in the EU, placement on the EU market, or effects on EU users could bring the system into scope."];
  return ["Clearer facts about scope, AI system status, use case, affected people, and decision role could change the result."];
}

function buildLegalRecommendedActions(riskTier: LegalRiskTier, reviewStatus: ReviewStatus[], nextSteps: string[]) {
  const actions = [...nextSteps];
  if (reviewStatus.includes("Needs evidence")) actions.push(...EVIDENCE_UPLOAD_ACTIONS);
  if (riskTier === "Likely High-risk") actions.push("Prepare a high-risk compliance file covering risk management, data governance, logging, transparency, human oversight, accuracy, robustness, and cybersecurity.");
  if (riskTier === "Potentially prohibited") actions.push("Pause deployment and obtain legal review before any pilot, procurement, or market launch.");
  if (riskTier === "Limited risk / Transparency obligation") actions.push("Draft and test clear Article 50 disclosure or labeling text.");
  return unique(actions);
}

function buildRuleResults(
  input: ClassificationInput,
  text: string,
  scopeStatus: ScopeStatus,
  aiFunctionUnclear: boolean,
  prohibitedMatches: TriggeredRule[],
  highRiskMatches: TriggeredRule[],
  transparencyMatches: TriggeredRule[],
  missingFacts: string[],
) {
  const noEvidenceMissing = input.evidenceDocuments.length ? [] : ["No evidence files were uploaded."];
  const ruleResults: LegalRuleEvaluation[] = [
    {
      ruleId: LEGAL_RULES[0].id,
      matched: scopeStatus === "in_scope",
      strength: scopeStatus === "in_scope" ? "strong" : "weak",
      matchedFacts: selectedScopeFacts(input),
      missingFacts: scopeStatus === "in_scope" ? [] : ["EU scope needs confirmation."],
      legalBasis: [{ source: "EU AI Act", article: "Article 2", title: "EU scope", relevance: LEGAL_RULES[0].explanation }],
      explanation: scopeStatus === "in_scope" ? "EU scope is established because at least one scope signal was selected." : "EU scope is not established from the current facts.",
    },
    {
      ruleId: "gate.ai-system",
      matched: !aiFunctionUnclear && input.systemType !== "non_ai_or_unclear",
      strength: !aiFunctionUnclear && input.systemType !== "non_ai_or_unclear" ? "strong" : "weak",
      matchedFacts: [`system type: ${input.systemType.replace(/_/g, " ")}`, input.aiInputs ? `inputs: ${input.aiInputs}` : "", input.aiOutputs ? `outputs: ${input.aiOutputs}` : ""].filter(Boolean),
      missingFacts: aiFunctionUnclear || input.systemType === "non_ai_or_unclear" ? ["AI inputs, outputs, system type, or relying party need clarification."] : [],
      legalBasis: [{ source: "EU AI Act", article: "Article 3", title: "AI system definition", relevance: "The AI-system gate must be passed before risk-tier analysis." }],
      explanation: aiFunctionUnclear ? "AI system status is unclear." : "AI system status is established from the intake facts.",
    },
    {
      ruleId: LEGAL_RULES[1].id,
      matched: prohibitedMatches.length > 0,
      strength: prohibitedMatches.length > 0 ? "strong" : "weak",
      matchedFacts: prohibitedMatches.map((rule) => rule.label),
      missingFacts: [],
      legalBasis: prohibitedMatches.map(legalBasisForRule),
      explanation: prohibitedMatches.length ? "Article 5 prohibited-practice facts were selected." : "No Article 5 prohibited-practice trigger was selected.",
    },
    {
      ruleId: LEGAL_RULES[2].id,
      matched: highRiskMatches.some((rule) => rule.id === "productSafety"),
      strength: highRiskMatches.some((rule) => rule.id === "productSafety") ? "strong" : "weak",
      matchedFacts: matchedFactsForRule("productSafety", input, text),
      missingFacts: highRiskMatches.some((rule) => rule.id === "productSafety") ? [...noEvidenceMissing, "Confirm whether third-party conformity assessment is required."] : [],
      legalBasis: [PRODUCT_SAFETY_BASIS],
      explanation: highRiskMatches.some((rule) => rule.id === "productSafety") ? "The Article 6(1) + Annex I product-safety route may apply." : "The facts do not establish the Article 6(1) + Annex I product-safety route.",
    },
  ];

  highRiskRules
    .filter((rule) => rule.id !== "productSafety")
    .forEach((rule) => {
      const matchedRule = highRiskMatches.find((item) => item.id === rule.id);
      const basis = matchedRule ? legalBasisForRule(matchedRule) : rule.id === "healthcare" ? HEALTHCARE_CLARIFICATION_BASIS : ANNEX_III_BASIS[rule.id];
      ruleResults.push({
        ruleId: `annexIII.${rule.id}`,
        matched: Boolean(matchedRule),
        strength: matchedRule ? (matchedFactsForRule(rule.id, input, text).length >= 4 ? "strong" : "medium") : "weak",
        matchedFacts: matchedRule ? matchedFactsForRule(rule.id, input, text) : [],
        missingFacts: matchedRule ? noEvidenceMissing : [],
        legalBasis: basis ? [basis] : [],
        explanation: matchedRule ? `${rule.label} matched because the facts indicate ${rule.shortDescription.toLowerCase()}` : `${rule.label} was not triggered by the current facts.`,
      });
    });

  ruleResults.push({
    ruleId: LEGAL_RULES[4].id,
    matched: transparencyMatches.length > 0,
    strength: transparencyMatches.length > 0 ? "strong" : "weak",
    matchedFacts: transparencyMatches.map((rule) => rule.label),
    missingFacts: transparencyMatches.length && !input.controls.disclosure ? ["Disclosure or labeling control is not selected."] : [],
    legalBasis: transparencyMatches.map(legalBasisForRule),
    explanation: transparencyMatches.length ? "Article 50 transparency signals were selected or inferred." : "No Article 50 transparency signal was selected.",
  });

  ruleResults.push({
    ruleId: "evidence.consistency",
    matched: !missingFacts.length && Boolean(input.evidenceDocuments.length),
    strength: input.evidenceDocuments.length && missingFacts.length === 0 ? "strong" : input.evidenceDocuments.length ? "medium" : "weak",
    matchedFacts: input.evidenceDocuments.length ? [`${input.evidenceDocuments.length} evidence file(s) uploaded`] : [],
    missingFacts: [...missingFacts, ...noEvidenceMissing],
    legalBasis: [],
    explanation: input.evidenceDocuments.length ? "Evidence is available for review." : "The result is provisional because no evidence files were uploaded.",
  });

  return ruleResults;
}

function buildLegalReasoning(
  input: ClassificationInput,
  routeAssessment: RuleRegistryResult,
  scopeStatus: ScopeStatus,
  aiFunctionUnclear: boolean,
  tier: RiskTier,
  possibleSignals: string[],
  prohibitedMatches: TriggeredRule[],
  highRiskMatches: TriggeredRule[],
  transparencyMatches: TriggeredRule[],
  contradictions: string[],
  missingFacts: string[],
  factsUsed: string[],
  selectedSignals: string[],
  nextSteps: string[],
) {
  const text = textCorpus(input);
  const riskTier = routeAssessment.finalRiskTier;
  const reviewStatus = buildReviewStatus(input, scopeStatus, aiFunctionUnclear, contradictions, missingFacts, tier);
  const ruleResults = routeAssessment.ruleResults;
  const legalBasis = routeAssessment.legalBasis;

  const riskBasis = unique([
    ...highRiskMatches.flatMap((rule) => matchedFactsForRule(rule.id, input, text)),
    ...prohibitedMatches.map((rule) => rule.label),
    ...transparencyMatches.map((rule) => rule.label),
  ]);

  const inferredSignals = unique([
    ...possibleSignals.filter((signal) => !selectedSignals.some((selected) => selected.toLowerCase().includes(signal.toLowerCase()))),
    ...routeAssessment.facts.rawTextSignals,
  ]);
  const rejectedSignals = routeAssessment.rejectedRoutes.map((route) => `${route.title}: ${route.explanation}`);
  const safeguards = selectedBooleanFacts(input.controls, [
    ["humanOversight", "Human oversight"],
    ["appealPath", "Appeal or escalation path"],
    ["dataGovernance", "Data governance"],
    ["disclosure", "Disclosure or labeling"],
  ]);
  const explanation = buildLegalExplanation(riskTier, legalBasis, highRiskMatches, transparencyMatches, input, text);
  const whatCouldChangeResult = buildLegalWhatCouldChange(riskTier, highRiskMatches, routeAssessment.matchedRoutes);
  const recommendedActions = buildLegalRecommendedActions(riskTier, reviewStatus, nextSteps);
  const reasoningPath = [
    ruleResults.find((rule) => rule.ruleId === "scope.eu")?.explanation,
    ruleResults.find((rule) => rule.ruleId === "gate.ai-system")?.explanation,
    ruleResults.find((rule) => rule.ruleId === "prohibited.article5")?.explanation,
    ruleResults.find((rule) => rule.ruleId === "highrisk.article6.annexI")?.explanation,
    highRiskMatches.length ? `Article 6(2) + Annex III route matched: ${legalBasis.filter((basis) => basis.annex === "Annex III").map(legalBasisLabel).join("; ") || "none"}.` : "Article 6(2) + Annex III route was not triggered.",
    ruleResults.find((rule) => rule.ruleId === "limited.article50")?.explanation,
    ruleResults.find((rule) => rule.ruleId === "evidence.consistency")?.explanation,
    `Final conclusion: ${riskTier}.`,
  ].filter(Boolean) as string[];

  return {
    riskTier,
    reviewStatus,
    legalBasis: unique(legalBasis),
    riskBasis,
    inferredSignals,
    rejectedSignals,
    safeguards,
    explanation,
    whatCouldChangeResult,
    recommendedActions,
    ruleResults,
    matchedRoutes: routeAssessment.matchedRoutes,
    rejectedRoutes: routeAssessment.rejectedRoutes,
    uncertaintyNotes: routeAssessment.uncertaintyNotes,
    reasoningPath,
  };
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
  const routeAssessment = evaluateLegalRuleRegistry(input, evidenceFindings);
  const modelTestResults = runModelTestHooks(input);
  const uncertainty = calculateUncertainty(input, scopeStatus, evidenceFindings, modelTestResults, contradictions, missingFacts);

  const tier = routeAssessment.compatTier;
  const highRiskMatches = routeAssessment.highRiskMatches;
  const limitedMatches = routeAssessment.transparencyMatches;
  const prohibitedMatches = routeAssessment.prohibitedMatches;
  const selectedSignals = buildSelectedSignals(input);
  const factsUsed = buildFactsUsed(input);
  const nextSteps = buildNextSteps(tier);
  const legalAssessment = buildLegalReasoning(
    input,
    routeAssessment,
    scopeStatus,
    aiFunctionUnclear,
    tier,
    possibleSignals,
    prohibitedMatches,
    highRiskMatches,
    limitedMatches,
    contradictions,
    missingFacts,
    factsUsed,
    selectedSignals,
    nextSteps,
  );

  const productRouteMatched = highRiskMatches.some((rule) => rule.id === "productSafety");
  const annexRouteMatches = highRiskMatches.filter((rule) => rule.id !== "productSafety");
  const pipeline: PipelineStep[] = [
    {
      id: "scope",
      title: "Step 1: Scope gate",
      status: scopeStatus === "in_scope" ? "clear" : "review",
      legalBasis: "Article 2",
      summary: scopeStatus === "in_scope" ? "EU scope is established." : "EU scope is not established from the current facts.",
      details: scopeStatus === "in_scope" ? selectedScopeFacts(input) : ["No EU use, EU market placement, or EU-user effect is established."],
    },
    {
      id: "ai-system",
      title: "Step 2: AI system gate",
      status: input.systemType === "non_ai_or_unclear" || aiFunctionUnclear ? "review" : "clear",
      legalBasis: "Article 3",
      summary: input.systemType === "non_ai_or_unclear" || aiFunctionUnclear ? "AI-system status needs clarification." : "AI-system status is established.",
      details: [
        `System type: ${input.systemType.replace(/_/g, " ")}`,
        input.aiInputs.trim() ? `Inputs: ${input.aiInputs.trim()}` : "AI inputs not specified.",
        input.aiOutputs.trim() ? `Outputs: ${input.aiOutputs.trim()}` : "AI outputs not specified.",
      ],
    },
    {
      id: "article-5",
      title: "Step 3: Article 5 prohibited screen",
      status: prohibitedMatches.length ? "triggered" : "clear",
      legalBasis: "Article 5",
      summary: prohibitedMatches.length ? `${prohibitedMatches.length} Article 5 signal${prohibitedMatches.length > 1 ? "s" : ""} found.` : "No Article 5 prohibited-practice trigger is currently selected.",
      details: prohibitedMatches.length ? prohibitedMatches.map((rule) => `${rule.label}: ${rule.shortDescription}`) : ["No manipulation, social scoring, prohibited biometric, exploitation, or profiling-only criminal-risk pattern was selected."],
    },
    {
      id: "article-6-annex-i",
      title: "Step 4: Article 6(1) + Annex I product route",
      status: productRouteMatched ? "triggered" : highRiskMatches.some((rule) => rule.id === "healthcare") ? "review" : "clear",
      legalBasis: "Article 6(1) + Annex I",
      summary: productRouteMatched ? "Product-safety or regulated-product route may apply." : "Product-safety route is not established from the current facts.",
      details: productRouteMatched ? matchedFactsForRule("productSafety", input, text) : ["No regulated product safety component or Annex I conformity-assessment signal is established."],
    },
    {
      id: "annex-iii",
      title: "Step 5: Article 6(2) + Annex III route",
      status: annexRouteMatches.length ? "triggered" : "clear",
      legalBasis: "Article 6(2) + Annex III",
      summary: annexRouteMatches.length ? `${annexRouteMatches.length} Annex III route${annexRouteMatches.length > 1 ? "s" : ""} selected or inferred.` : "No Annex III high-risk route was triggered.",
      details: annexRouteMatches.length ? annexRouteMatches.map((rule) => `${rule.label}: ${rule.shortDescription}`) : ["No biometrics, critical infrastructure, education, employment, essential services, law enforcement, migration, justice, or democratic-process route was triggered."],
    },
    {
      id: "article-50",
      title: "Step 6: Article 50 transparency route",
      status: limitedMatches.length ? "triggered" : "clear",
      legalBasis: "Article 50",
      summary: limitedMatches.length ? `${limitedMatches.length} transparency signal${limitedMatches.length > 1 ? "s" : ""} selected or inferred.` : "No Article 50 transparency signal is currently selected.",
      details: limitedMatches.length ? limitedMatches.map((rule) => `${rule.label}: ${rule.shortDescription}`) : ["No chatbot, generated-content, synthetic-media, emotion-recognition notice, or public-facing interaction trigger was selected."],
    },
    {
      id: "evidence-and-consistency",
      title: "Step 7: Evidence and consistency review",
      status: contradictions.length || missingFacts.length || !input.evidenceDocuments.length ? "review" : "clear",
      legalBasis: "Review layer",
      summary: buildEvidenceStatus(input, evidenceFindings),
      details: [
        contradictions.length ? `${contradictions.length} contradiction${contradictions.length > 1 ? "s" : ""} detected.` : "No contradictions detected.",
        missingFacts.length ? `${missingFacts.length} missing fact${missingFacts.length > 1 ? "s" : ""}.` : "No major missing facts detected.",
        evidenceWarnings.length ? evidenceWarnings[0] : "No evidence warnings.",
      ],
    },
    {
      id: "final-tier",
      title: "Step 8: Final conclusion",
      status: legalAssessment.riskTier === "Minimal risk" ? "clear" : legalAssessment.riskTier === "Unclassified / Insufficient facts" || legalAssessment.riskTier.includes("unclear") || legalAssessment.riskTier.includes("not established") ? "review" : "triggered",
      legalBasis: legalAssessment.legalBasis.map(legalBasisLabel).join("; ") || "Risk-based architecture",
      summary: legalAssessment.riskTier,
      details: [legalAssessment.explanation, legalAssessment.reviewStatus.join(", ")],
    },
  ];

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

  if (!input.evidenceDocuments.length && tier !== "out_of_scope") confidence = Math.min(confidence, tier === "high" ? 48 : 50);
  if (aiFunctionUnclear) confidence = Math.min(confidence, 55);
  if (scopeStatus === "unclear") confidence = Math.min(confidence, 56);
  if (contradictions.length) confidence = Math.min(confidence, 62);
  if (input.systemDescription.trim().length < 70) confidence = Math.min(confidence, 58);
  if (tier === "high" && (!input.evidenceDocuments.length || contradictions.length || aiFunctionUnclear)) confidence = Math.min(confidence, input.evidenceDocuments.length ? 60 : 48);
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
  const whatCouldChange = legalAssessment.whatCouldChangeResult;

  const checklist = buildChecklistForTier(tier, evidenceOnlyWarnings);
  const conformityWorkflow = buildConformityWorkflow(tier === "high");
  const citations = buildTriggeredCitations(input, prohibitedMatches, highRiskMatches, limitedMatches, tier);

  const summary = `${legalAssessment.riskTier}: ${legalAssessment.explanation}`;
  const mainReason = legalAssessment.explanation;
  const recommendation = legalAssessment.recommendedActions[0] ?? buildRecommendationByTier(tier);

  return {
    tier,
    riskTier: legalAssessment.riskTier,
    reviewStatus: legalAssessment.reviewStatus,
    legalBasis: legalAssessment.legalBasis,
    riskBasis: legalAssessment.riskBasis,
    inferredSignals: legalAssessment.inferredSignals,
    rejectedSignals: legalAssessment.rejectedSignals,
    safeguards: legalAssessment.safeguards,
    explanation: legalAssessment.explanation,
    whatCouldChangeResult: legalAssessment.whatCouldChangeResult,
    recommendedActions: legalAssessment.recommendedActions,
    ruleResults: legalAssessment.ruleResults,
    matchedRoutes: legalAssessment.matchedRoutes,
    rejectedRoutes: legalAssessment.rejectedRoutes,
    uncertaintyNotes: legalAssessment.uncertaintyNotes,
    reasoningPath: legalAssessment.reasoningPath,
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
      legalAssessment.riskTier === "Out of scope / EU scope not established"
        ? "Scope"
        : legalAssessment.riskTier === "Not an AI system / AI status unclear"
          ? "AI system gate"
          : legalAssessment.riskTier === "Potentially prohibited"
            ? "Article 5"
            : legalAssessment.riskTier === "Likely High-risk"
              ? "Article 6"
              : legalAssessment.riskTier === "Limited risk / Transparency obligation"
                ? "Article 50"
                : legalAssessment.riskTier,
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
