import {
  highRiskRules,
  limitedRiskRules,
  prohibitedPracticeRules,
} from "./rules";
import type {
  ClassificationInput,
  EvidenceFinding,
  LegalBasisReference,
  LegalRuleEvaluation,
  LegalRiskTier,
  RiskTier,
  RuleStrength,
  TriggeredRule,
} from "./types";

type RouteTier =
  | "scope"
  | "not_ai"
  | "prohibited"
  | "high_risk"
  | "limited_risk"
  | "minimal_risk";
type ConfidenceImpact = "high" | "medium" | "low";

type DecisionRole = "prepares_information" | "materially_influences" | "automatically_decides" | "unclear";
type InteractionMode = "internal" | "user_facing" | "both" | "unclear";

export interface NormalizedFacts {
  sourceText: string;
  scope: {
    usedInEU: boolean;
    placedOnEUMarket: boolean;
    affectsEUUsers: boolean;
    established: boolean;
  };
  actorRole: ClassificationInput["actorRole"];
  systemType: ClassificationInput["systemType"];
  aiSystemEstablished: boolean;
  domainSignals: {
    employment: boolean;
    education: boolean;
    healthcare: boolean;
    publicServices: boolean;
    essentialPrivateServices: boolean;
    financeCredit: boolean;
    insurance: boolean;
    lawEnforcement: boolean;
    migration: boolean;
    justice: boolean;
    biometrics: boolean;
    criticalInfrastructure: boolean;
    productSafety: boolean;
    generatedContent: boolean;
  };
  dataCategories: {
    personalData: boolean;
    sensitiveData: boolean;
    biometricData: boolean;
    healthData: boolean;
    educationRecords: boolean;
    employmentHistory: boolean;
    locationData: boolean;
    publicRecords: boolean;
    behavioralData: boolean;
    financialData: boolean;
  };
  affectedPeople: string[];
  people: {
    jobApplicants: boolean;
    employees: boolean;
    workers: boolean;
    students: boolean;
    patients: boolean;
    migrants: boolean;
    residents: boolean;
    consumers: boolean;
    publicServiceUsers: boolean;
    suspectsOrDefendants: boolean;
  };
  outputs: {
    scoresPeople: boolean;
    ranksPeople: boolean;
    filtersPeople: boolean;
    approvesRejects: boolean;
    recommendsPeople: boolean;
    assessesPeople: boolean;
    generatesText: boolean;
    generatesSyntheticMedia: boolean;
    identifiesPeople: boolean;
    verifiesIdentity: boolean;
    categorizesPeople: boolean;
    infersEmotion: boolean;
    infersSensitiveTraits: boolean;
    socialReliabilityScore: boolean;
  };
  decisionRole: DecisionRole;
  interactionMode: InteractionMode;
  safeguards: {
    humanOversight: boolean;
    appealPath: boolean;
    dataGovernance: boolean;
    disclosure: boolean;
  };
  evidence: {
    filesUploaded: boolean;
    extractedSignals: EvidenceFinding[];
  };
  rawTextSignals: string[];
}

export interface RegistryRuleEvaluation extends LegalRuleEvaluation {
  title: string;
  tier: RouteTier;
  priority: number;
  negativeFacts: string[];
  uncertaintyNotes: string[];
  legacyRuleId?: string;
}

export interface LegalRuleDefinition {
  id: string;
  title: string;
  tier: RouteTier;
  priority: number;
  legalBasis: LegalBasisReference[];
  requiredSignals: string[];
  supportingSignals: string[];
  negativeSignals: string[];
  legacyRuleId?: string;
  triggerEvaluator: (facts: NormalizedFacts) => Omit<RegistryRuleEvaluation, "ruleId" | "title" | "tier" | "priority" | "legalBasis" | "legacyRuleId">;
  explanationBuilder: (facts: NormalizedFacts, evaluation: RegistryRuleEvaluation) => string;
  missingFactsBuilder: (facts: NormalizedFacts) => string[];
  confidenceImpact: (facts: NormalizedFacts) => ConfidenceImpact;
}

export interface RuleRegistryResult {
  facts: NormalizedFacts;
  ruleResults: RegistryRuleEvaluation[];
  matchedRoutes: RegistryRuleEvaluation[];
  rejectedRoutes: RegistryRuleEvaluation[];
  uncertaintyNotes: string[];
  finalRiskTier: LegalRiskTier;
  compatTier: RiskTier;
  legalBasis: LegalBasisReference[];
  prohibitedMatches: TriggeredRule[];
  highRiskMatches: TriggeredRule[];
  transparencyMatches: TriggeredRule[];
}

const includesAny = (text: string, terms: string[]) => terms.some((term) => text.includes(term));
const unique = <T,>(items: T[]) => [...new Set(items)];

const hasAnySelected = (values: string[], terms: string[]) => {
  const text = values.join(" ").toLowerCase();
  return includesAny(text, terms);
};

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

const employmentUseCaseTerms = [
  "recruitment",
  "recruit",
  "hiring",
  "candidate screening",
  "cv ranking",
  "resume ranking",
  "interview scoring",
  "job applicant",
  "shortlist",
  "promotion",
  "dismissal",
  "task allocation",
  "worker monitoring",
  "employee monitoring",
  "worker evaluation",
  "performance scoring",
  "access to self-employment",
];

const employmentDataTerms = [
  "employment history",
  "job history",
  "previous employer",
  "previous employment",
  "income from employment",
  "unemployment status",
  "work experience",
];

const educationUseCaseTerms = [
  "student admission",
  "school admission",
  "university admission",
  "grading",
  "grades",
  "grade",
  "exam scoring",
  "student assessment",
  "pass/fail",
  "learning assessment",
  "academic progression",
  "access to education",
  "vocational training assessment",
];

const educationDataTerms = [
  "education history",
  "degree",
  "qualification",
  "university attended",
  "cv education",
  "school attended",
];

const healthcareUseCaseTerms = [
  "diagnosis",
  "diagnostic",
  "triage",
  "treatment recommendation",
  "medical urgency",
  "patient-care",
  "patient care",
  "clinical decision support",
  "referral",
  "medical device",
];

const healthDataTerms = [
  "health data",
  "medical documents",
  "disability documents",
  "medical hardship",
  "health insurance documents",
  "clinical notes",
  "lab values",
];

const publicBenefitTerms = [
  "public benefits",
  "welfare",
  "housing support",
  "unemployment assistance",
  "emergency financial aid",
  "social services",
  "public support",
  "benefit amount",
  "benefit eligibility",
  "public-service",
  "public service",
];

const creditTerms = [
  "creditworthiness",
  "credit scoring",
  "credit score",
  "loan approval",
  "loan rejection",
  "credit limit",
  "financial eligibility",
  "underwriting",
];

const financialDataTerms = [
  "income documents",
  "bank summaries",
  "transaction history",
  "debts",
  "payment history",
  "income",
];

const biometricDataTerms = ["face image", "selfie", "voice sample", "fingerprint", "facial image", "face scan"];
const biometricIdentificationTerms = ["watchlist", "identify among", "identify people", "facial recognition", "face recognition", "remote biometric identification", "real-time identification"];
const biometricVerificationTerms = ["verify identity", "identity verification", "selfie verification", "login verification", "authentication"];
const sensitiveTraitTerms = ["race", "racial", "ethnic origin", "ethnicity", "political opinion", "religious belief", "religion", "philosophical belief", "trade union", "union membership", "sex life", "sexual orientation", "protected trait", "sensitive trait"];
const emotionTerms = ["emotion recognition", "emotion analysis", "infers emotions", "emotion labels", "facial expression", "voice tone", "tone analysis", "expression analysis", "attention and emotion"];
const syntheticMediaTerms = ["deepfake", "synthetic image", "synthetic video", "synthetic audio", "generated image", "generated video", "generated audio", "manipulated image", "manipulated audio", "manipulated video"];
const generatedTextTerms = ["decision letter", "generated letter", "explanation letter", "email", "public notice", "summary", "generated text", "draft reply", "recommendation text"];

const affectsOutcome = (facts: NormalizedFacts) =>
  facts.outputs.scoresPeople ||
  facts.outputs.ranksPeople ||
  facts.outputs.filtersPeople ||
  facts.outputs.approvesRejects ||
  facts.outputs.recommendsPeople ||
  facts.outputs.assessesPeople;

const consequentialDecision = (facts: NormalizedFacts) =>
  facts.decisionRole === "materially_influences" || facts.decisionRole === "automatically_decides";

const matched = (
  strength: RuleStrength,
  matchedFacts: string[],
  explanation: string,
  options: Partial<Pick<RegistryRuleEvaluation, "missingFacts" | "negativeFacts" | "uncertaintyNotes">> = {},
) => ({
  matched: strength !== "none",
  strength,
  matchedFacts,
  missingFacts: options.missingFacts ?? [],
  negativeFacts: options.negativeFacts ?? [],
  uncertaintyNotes: options.uncertaintyNotes ?? [],
  explanation,
});

const notMatched = (
  explanation: string,
  options: Partial<Pick<RegistryRuleEvaluation, "matchedFacts" | "missingFacts" | "negativeFacts" | "uncertaintyNotes">> = {},
) => ({
  matched: false,
  strength: "none" as const,
  matchedFacts: options.matchedFacts ?? [],
  missingFacts: options.missingFacts ?? [],
  negativeFacts: options.negativeFacts ?? [],
  uncertaintyNotes: options.uncertaintyNotes ?? [],
  explanation,
});

function decisionRole(input: ClassificationInput): DecisionRole {
  if (input.decisionMode === "materially_influences_decision") return "materially_influences";
  return input.decisionMode;
}

function interactionMode(input: ClassificationInput): InteractionMode {
  if (input.interactionMode === "internal_only") return "internal";
  return input.interactionMode;
}

function inferRawTextSignals(text: string) {
  const signals: string[] = [];
  const add = (condition: boolean, label: string) => {
    if (condition) signals.push(label);
  };
  add(includesAny(text, employmentUseCaseTerms), "employment use case candidate");
  add(includesAny(text, employmentDataTerms), "employment history data");
  add(includesAny(text, educationUseCaseTerms), "education use case candidate");
  add(includesAny(text, educationDataTerms), "education records data");
  add(includesAny(text, healthcareUseCaseTerms), "healthcare decision candidate");
  add(includesAny(text, healthDataTerms), "health data");
  add(includesAny(text, publicBenefitTerms), "public benefits candidate");
  add(includesAny(text, creditTerms), "credit or essential private service candidate");
  add(includesAny(text, financialDataTerms), "financial data");
  add(includesAny(text, biometricDataTerms), "biometric data");
  add(includesAny(text, biometricVerificationTerms), "biometric verification candidate");
  add(includesAny(text, biometricIdentificationTerms), "biometric identification candidate");
  add(includesAny(text, sensitiveTraitTerms), "sensitive trait inference candidate");
  add(includesAny(text, emotionTerms), "emotion recognition candidate");
  add(includesAny(text, generatedTextTerms), "generated text candidate");
  add(includesAny(text, syntheticMediaTerms), "synthetic media candidate");
  return unique(signals);
}

export function normalizeFacts(input: ClassificationInput, evidenceFindings: EvidenceFinding[] = [], aiFunctionUnclear = false): NormalizedFacts {
  const text = textCorpus(input);
  const dataText = input.dataTypes.join(" ").toLowerCase();
  const outputText = `${input.aiOutputs} ${input.outputUsers} ${input.purpose} ${input.systemDescription}`.toLowerCase();
  const affectedText = input.affectedPeople.join(" ").toLowerCase();
  const rawTextSignals = inferRawTextSignals(text);
  const generatedText = input.contentFacts.generatesPublicFacingContent || includesAny(outputText, generatedTextTerms);
  const syntheticMedia = input.contentFacts.createsRealisticSyntheticContent && includesAny(text, syntheticMediaTerms);

  return {
    sourceText: text,
    scope: {
      ...input.scope,
      established: input.scope.usedInEU || input.scope.placedOnEUMarket || input.scope.affectsEUUsers,
    },
    actorRole: input.actorRole,
    systemType: input.systemType,
    aiSystemEstablished: !aiFunctionUnclear && input.systemType !== "non_ai_or_unclear" && Boolean(input.aiInputs.trim() && input.aiOutputs.trim()),
    domainSignals: {
      employment: input.domains.employment || includesAny(text, employmentUseCaseTerms),
      education: input.domains.education || includesAny(text, educationUseCaseTerms),
      healthcare: input.domains.healthcare || includesAny(text, healthcareUseCaseTerms),
      publicServices: input.domains.publicServices || includesAny(text, publicBenefitTerms),
      essentialPrivateServices: input.domains.consumerServices || includesAny(text, ["essential private service", "essential service"]),
      financeCredit: input.domains.finance || includesAny(text, creditTerms),
      insurance: input.domains.insurance || includesAny(text, ["insurance eligibility", "insurance pricing", "premium", "claim approval"]),
      lawEnforcement: input.domains.lawEnforcement || includesAny(text, ["law enforcement", "police", "criminal risk", "suspect profiling", "evidence analysis"]),
      migration: input.domains.migration || includesAny(text, ["visa", "asylum", "migration", "border control", "border decision"]),
      justice: input.domains.justice || includesAny(text, ["judicial", "court", "legal fact", "dispute outcome", "election", "democratic process"]),
      biometrics: input.dataFacts.biometricData || hasAnySelected(input.dataTypes, biometricDataTerms) || includesAny(text, biometricDataTerms),
      criticalInfrastructure: input.domains.criticalInfrastructure || includesAny(text, ["critical infrastructure", "electricity grid", "road traffic", "water supply", "gas", "heating"]),
      productSafety: input.domains.productSafety || input.systemType === "embedded_product_component" || includesAny(text, ["safety component", "regulated product", "conformity assessment", "medical device"]),
      generatedContent: generatedText || syntheticMedia,
    },
    dataCategories: {
      personalData: input.dataFacts.personalData || hasAnySelected(input.dataTypes, ["personal data"]),
      sensitiveData: input.dataFacts.sensitiveData || hasAnySelected(input.dataTypes, ["sensitive data"]),
      biometricData: input.dataFacts.biometricData || hasAnySelected(input.dataTypes, biometricDataTerms) || includesAny(dataText, biometricDataTerms),
      healthData: input.dataFacts.healthData || hasAnySelected(input.dataTypes, healthDataTerms) || includesAny(dataText, ["health", "medical", "disability"]),
      educationRecords: hasAnySelected(input.dataTypes, educationDataTerms) || includesAny(text, educationDataTerms),
      employmentHistory: hasAnySelected(input.dataTypes, employmentDataTerms) || includesAny(text, employmentDataTerms),
      locationData: hasAnySelected(input.dataTypes, ["location", "gps", "address"]),
      publicRecords: hasAnySelected(input.dataTypes, ["public records", "public record"]),
      behavioralData: hasAnySelected(input.dataTypes, ["behavioral", "behavioural", "activity patterns", "screen time"]),
      financialData: hasAnySelected(input.dataTypes, financialDataTerms) || includesAny(dataText, financialDataTerms),
    },
    affectedPeople: input.affectedPeople,
    people: {
      jobApplicants: includesAny(affectedText, ["job applicant", "applicant", "candidate"]) || includesAny(text, ["job applicant", "candidates", "applicants"]),
      employees: includesAny(affectedText, ["employee"]) || includesAny(text, ["employee", "employees"]),
      workers: includesAny(affectedText, ["worker"]) || includesAny(text, ["worker", "workers"]),
      students: includesAny(affectedText, ["student", "pupil"]) || includesAny(text, ["student", "students", "pupil", "pupils"]),
      patients: includesAny(affectedText, ["patient"]) || includesAny(text, ["patient", "patients", "clinician", "clinicians", "clinical"]),
      migrants: includesAny(affectedText, ["migrant"]) || includesAny(text, ["migrants", "asylum seekers", "visa applicants"]),
      residents: includesAny(affectedText, ["resident"]) || includesAny(text, ["residents"]),
      consumers: includesAny(affectedText, ["consumer", "customer"]) || includesAny(text, ["consumers", "customers"]),
      publicServiceUsers: includesAny(affectedText, ["public-service user", "public service user"]) || includesAny(text, ["benefit applicants", "public-service users", "residents"]),
      suspectsOrDefendants: includesAny(affectedText, ["suspect", "defendant"]) || includesAny(text, ["suspects", "defendants", "offenders"]),
    },
    outputs: {
      scoresPeople: input.decisionFacts.scoresPeople || includesAny(outputText, ["score", "rating", "risk rating", "eligibility score"]),
      ranksPeople: input.decisionFacts.ranksPeople || includesAny(outputText, ["rank", "priority ranking", "prioritize", "shortlist"]),
      filtersPeople: input.decisionFacts.filtersPeople || includesAny(outputText, ["filter", "screen out", "flag", "shortlist"]),
      approvesRejects: input.decisionFacts.approvesRejectsPeople || includesAny(outputText, ["approve", "reject", "deny", "approval", "rejection"]),
      recommendsPeople: input.decisionFacts.recommendsPeople || includesAny(outputText, ["recommend", "suggest"]),
      assessesPeople: input.decisionFacts.assessesPeople || includesAny(outputText, ["assess", "evaluate", "evaluation", "suitability", "eligibility"]),
      generatesText: generatedText && !syntheticMedia,
      generatesSyntheticMedia: syntheticMedia,
      identifiesPeople: includesAny(text, biometricIdentificationTerms) || input.prohibitedFacts.realTimePublicSpaceBiometricIdentification,
      verifiesIdentity: includesAny(text, biometricVerificationTerms),
      categorizesPeople: includesAny(text, ["categorize people", "biometric categorization", "categorizes people", "groups people"]),
      infersEmotion: input.prohibitedFacts.workplaceOrEducationEmotionRecognition || includesAny(text, emotionTerms),
      infersSensitiveTraits: input.prohibitedFacts.sensitiveBiometricCategorization && includesAny(text, sensitiveTraitTerms),
      socialReliabilityScore: input.prohibitedFacts.socialScoring || includesAny(text, ["social reliability", "trustworthiness score", "citizen score", "social score"]),
    },
    decisionRole: decisionRole(input),
    interactionMode: interactionMode(input),
    safeguards: input.controls,
    evidence: {
      filesUploaded: input.evidenceDocuments.length > 0,
      extractedSignals: evidenceFindings,
    },
    rawTextSignals,
  };
}

const basis = (
  article: string | undefined,
  annex: string | undefined,
  point: string | undefined,
  title: string,
  relevance: string,
  route?: string,
): LegalBasisReference => ({
  source: "EU AI Act",
  article,
  annex,
  point,
  title,
  route,
  relevance,
});

const noExtraMissing = () => [];
const neutralConfidence = () => "medium" as ConfidenceImpact;
const identityExplanation = (_facts: NormalizedFacts, evaluation: RegistryRuleEvaluation) => evaluation.explanation;

export const LEGAL_RULE_REGISTRY: LegalRuleDefinition[] = [
  {
    id: "scope.eu",
    title: "EU scope",
    tier: "scope",
    priority: 1000,
    legalBasis: [basis("Article 2", undefined, undefined, "EU scope", "EU scope is established through EU use, EU market placement, or effects on EU users.")],
    requiredSignals: ["used in EU, placed on EU market, or affects EU users"],
    supportingSignals: [],
    negativeSignals: [],
    triggerEvaluator: (facts) =>
      facts.scope.established
        ? matched("strong", [
          facts.scope.usedInEU ? "used in the EU" : "",
          facts.scope.placedOnEUMarket ? "placed on the EU market" : "",
          facts.scope.affectsEUUsers ? "affects EU users" : "",
        ].filter(Boolean), "EU scope is established because at least one EU scope signal is selected.")
        : matched("strong", ["no EU scope signal selected"], "EU AI Act scope is not established from the current facts."),
    explanationBuilder: identityExplanation,
    missingFactsBuilder: noExtraMissing,
    confidenceImpact: neutralConfidence,
  },
  {
    id: "gate.not_ai",
    title: "AI system gate",
    tier: "not_ai",
    priority: 900,
    legalBasis: [basis("Article 3", undefined, undefined, "AI system definition", "Risk-tier analysis requires AI system status to be established.")],
    requiredSignals: ["AI system type", "inputs and outputs"],
    supportingSignals: [],
    negativeSignals: [],
    triggerEvaluator: (facts) =>
      facts.aiSystemEstablished
        ? notMatched("AI-system status is established from system type, inputs, and outputs.", { matchedFacts: [`system type: ${facts.systemType.replace(/_/g, " ")}`] })
        : matched("strong", [`system type: ${facts.systemType.replace(/_/g, " ")}`], "AI system status is unclear or not established.", {
          missingFacts: ["Confirm whether the system uses prediction, recommendation, classification, generation, scoring, or inference."],
        }),
    explanationBuilder: identityExplanation,
    missingFactsBuilder: (facts) => (facts.aiSystemEstablished ? [] : ["AI system status"]),
    confidenceImpact: (facts) => (facts.aiSystemEstablished ? "medium" : "low"),
  },
  {
    id: "article5.emotionRecognitionWorkplaceEducation",
    title: "Emotion recognition in workplace or education",
    tier: "prohibited",
    priority: 800,
    legalBasis: [basis("Article 5", undefined, undefined, "Emotion recognition in workplace or education", "Emotion recognition in employment or education settings may be prohibited unless a narrow exception applies.", "Article 5 prohibited-practice screen")],
    requiredSignals: ["emotion recognition", "workplace/employment or education context"],
    supportingSignals: ["biometric/video/audio/behavioral signal"],
    negativeSignals: ["medical or safety exception"],
    legacyRuleId: "workplaceOrEducationEmotionRecognition",
    triggerEvaluator: (facts) => {
      const context = facts.domainSignals.employment || facts.domainSignals.education || facts.people.jobApplicants || facts.people.employees || facts.people.workers || facts.people.students;
      if (facts.outputs.infersEmotion && context) {
        return matched("strong", ["emotion recognition inferred or selected", facts.domainSignals.employment ? "employment/workplace context" : "education context"], "Emotion recognition in workplace, recruitment, worker management, or education context is triggered.", {
          missingFacts: facts.safeguards.disclosure ? [] : ["Disclosure or notice status is not selected."],
        });
      }
      if (facts.outputs.infersEmotion) {
        return notMatched("Emotion recognition is present, but workplace or education context is not established.", {
          matchedFacts: ["emotion recognition inferred or selected"],
          uncertaintyNotes: ["Emotion recognition outside work or education may still need Article 50 disclosure review."],
        });
      }
      return notMatched("No emotion-recognition output is selected or clearly inferred.");
    },
    explanationBuilder: identityExplanation,
    missingFactsBuilder: noExtraMissing,
    confidenceImpact: (facts) => (facts.outputs.infersEmotion ? "low" : "medium"),
  },
  {
    id: "article5.sensitiveBiometricCategorization",
    title: "Sensitive biometric categorization",
    tier: "prohibited",
    priority: 790,
    legalBasis: [basis("Article 5", undefined, undefined, "Sensitive biometric categorization", "Biometric categorization is an Article 5 concern when it infers protected or sensitive traits.", "Article 5 prohibited-practice screen")],
    requiredSignals: ["biometric data", "explicit sensitive trait inference"],
    supportingSignals: [],
    negativeSignals: ["identity verification only"],
    legacyRuleId: "sensitiveBiometricCategorization",
    triggerEvaluator: (facts) => {
      if (facts.dataCategories.biometricData && facts.outputs.infersSensitiveTraits) {
        return matched("strong", ["biometric data", "explicit sensitive/protected trait inference"], "Sensitive biometric categorization is triggered because biometric data is used to infer protected or sensitive traits.");
      }
      if (facts.dataCategories.biometricData && facts.dataCategories.sensitiveData) {
        return notMatched("Biometric data and sensitive data are present, but sensitive biometric trait inference is not explicit.", {
          matchedFacts: ["biometric data", "sensitive data"],
          uncertaintyNotes: ["Confirm whether the system infers race, ethnicity, religion, political opinions, trade-union membership, sex life, sexual orientation, or similar protected traits."],
        });
      }
      return notMatched("No explicit sensitive biometric trait inference is established.");
    },
    explanationBuilder: identityExplanation,
    missingFactsBuilder: noExtraMissing,
    confidenceImpact: neutralConfidence,
  },
  {
    id: "article5.socialScoring",
    title: "Possible social scoring",
    tier: "prohibited",
    priority: 780,
    legalBasis: [basis("Article 5", undefined, undefined, "Social scoring", "Social scoring concern requires a social reliability or trustworthiness score that affects access, rights, or public-service treatment.", "Article 5 prohibited-practice screen")],
    requiredSignals: ["social reliability score", "public authority/service context", "access or rights impact"],
    supportingSignals: [],
    negativeSignals: ["narrow fraud check only"],
    legacyRuleId: "socialScoring",
    triggerEvaluator: (facts) => {
      const publicImpact = facts.domainSignals.publicServices && (facts.outputs.approvesRejects || facts.outputs.ranksPeople || facts.outputs.scoresPeople || facts.outputs.filtersPeople);
      if (facts.outputs.socialReliabilityScore && publicImpact) {
        return matched("strong", ["social reliability/trustworthiness scoring", "public services or benefits context", "output affects access, priority, eligibility, or rights"], "Possible Article 5 social-scoring concern is triggered and needs legal review.");
      }
      if (facts.outputs.socialReliabilityScore) {
        return notMatched("Social reliability language is present, but public-service access or rights impact is not fully established.", {
          matchedFacts: ["social reliability/trustworthiness scoring"],
          uncertaintyNotes: ["Possible Article 5 social-scoring concern. Clarify whether the score affects access to public services, benefits, eligibility, priority, or rights."],
        });
      }
      return notMatched("No social reliability or trustworthiness score pattern is established.");
    },
    explanationBuilder: identityExplanation,
    missingFactsBuilder: noExtraMissing,
    confidenceImpact: neutralConfidence,
  },
  {
    id: "article5.predictivePolicing",
    title: "Profiling-only criminal-risk prediction",
    tier: "prohibited",
    priority: 770,
    legalBasis: [basis("Article 5", undefined, undefined, "Profiling-only criminal-risk prediction", "Article 5 concern requires law-enforcement context and criminal-risk prediction based on profiling or traits alone.", "Article 5 prohibited-practice screen")],
    requiredSignals: ["law enforcement", "criminal risk prediction", "profiling-only"],
    supportingSignals: [],
    negativeSignals: ["fraud outside law enforcement"],
    legacyRuleId: "criminalRiskSolelyProfiling",
    triggerEvaluator: (facts) =>
      facts.domainSignals.lawEnforcement && includesAny(facts.sourceText, ["criminal risk", "offending", "victimization", "profiling only", "demographic data only"])
        ? matched("strong", ["law-enforcement context", "criminal-risk/offending prediction", "profiling-only or demographic-only signal"], "Profiling-only criminal-risk prediction is triggered.")
        : notMatched("No law-enforcement profiling-only criminal-risk pattern is established."),
    explanationBuilder: identityExplanation,
    missingFactsBuilder: noExtraMissing,
    confidenceImpact: neutralConfidence,
  },
  {
    id: "article5.realTimePublicBiometric",
    title: "Real-time public-space biometric identification",
    tier: "prohibited",
    priority: 760,
    legalBasis: [basis("Article 5", undefined, undefined, "Real-time remote biometric identification in public space", "Real-time remote biometric identification in publicly accessible spaces for law enforcement is an Article 5 concern.", "Article 5 prohibited-practice screen")],
    requiredSignals: ["real-time biometric identification", "public space", "law enforcement"],
    supportingSignals: [],
    negativeSignals: ["login verification"],
    legacyRuleId: "realTimePublicSpaceBiometricIdentification",
    triggerEvaluator: (facts) =>
      facts.outputs.identifiesPeople && facts.domainSignals.lawEnforcement && includesAny(facts.sourceText, ["real-time", "public space", "publicly accessible"])
        ? matched("strong", ["real-time biometric identification", "public-space context", "law-enforcement context"], "Real-time public-space biometric identification is triggered.")
        : notMatched("No real-time public-space law-enforcement biometric identification pattern is established."),
    explanationBuilder: identityExplanation,
    missingFactsBuilder: noExtraMissing,
    confidenceImpact: neutralConfidence,
  },
  {
    id: "article6.annexI.productSafety",
    title: "Product-safety route",
    tier: "high_risk",
    priority: 700,
    legalBasis: [basis("Article 6(1)", "Annex I", undefined, "Safety component or regulated product route", "The AI is or supports a safety component of a regulated product or conformity pathway.", "Article 6(1) + Annex I")],
    requiredSignals: ["product safety or regulated product", "safety/conformity output"],
    supportingSignals: [],
    negativeSignals: [],
    legacyRuleId: "productSafety",
    triggerEvaluator: (facts) => {
      const safetyOutput = includesAny(facts.sourceText, ["safety component", "regulated product", "conformity", "inspection", "blocks release", "release gating", "medical device"]) || facts.domainSignals.productSafety;
      if (facts.domainSignals.productSafety && safetyOutput) {
        return matched("strong", ["product safety or regulated product context", "output may affect safety, inspection, release, or conformity"], "Article 6(1) + Annex I product-safety route is triggered or needs high-risk review.");
      }
      return notMatched("No regulated product safety component or conformity-assessment route is established.");
    },
    explanationBuilder: identityExplanation,
    missingFactsBuilder: noExtraMissing,
    confidenceImpact: neutralConfidence,
  },
  {
    id: "annexIII.employment",
    title: "Employment, workers management and access to self-employment",
    tier: "high_risk",
    priority: 650,
    legalBasis: [basis("Article 6(2)", "Annex III", "4", "Employment, workers management and access to self-employment", "The system affects recruitment, hiring, worker management, worker monitoring, promotion, dismissal, task allocation, or worker evaluation.", "Article 6(2) + Annex III")],
    requiredSignals: ["employment use case", "job applicants/employees/workers", "output impact", "material or automatic decision role"],
    supportingSignals: [],
    negativeSignals: ["employment history data only"],
    legacyRuleId: "employment",
    triggerEvaluator: (facts) => {
      const people = facts.people.jobApplicants || facts.people.employees || facts.people.workers;
      if (facts.domainSignals.employment && people && affectsOutcome(facts) && consequentialDecision(facts)) {
        return matched("strong", ["employment/recruitment/worker domain", "job applicants, employees, or workers affected", "ranking/scoring/filtering/recommendation/assessment or approval impact", `decision role: ${facts.decisionRole}`], "Annex III employment/workplace route is triggered.");
      }
      if (facts.dataCategories.employmentHistory && !facts.domainSignals.employment) {
        return notMatched("Employment history is only a data category here; no employment legal-domain use case is established.", {
          negativeFacts: ["employment history data only"],
        });
      }
      return notMatched("Employment route is not triggered because employment domain, affected workers/applicants, consequential output, or decision role is missing.");
    },
    explanationBuilder: identityExplanation,
    missingFactsBuilder: noExtraMissing,
    confidenceImpact: neutralConfidence,
  },
  {
    id: "annexIII.education",
    title: "Education and vocational training",
    tier: "high_risk",
    priority: 640,
    legalBasis: [basis("Article 6(2)", "Annex III", "3", "Education and vocational training", "The system affects admission, grading, pass/fail, progression, assessment, access to education, or vocational training.", "Article 6(2) + Annex III")],
    requiredSignals: ["education use case", "students/pupils/applicants", "assessment/admission/progression output"],
    supportingSignals: [],
    negativeSignals: ["education records data only"],
    legacyRuleId: "education",
    triggerEvaluator: (facts) => {
      const educationImpact = includesAny(facts.sourceText, educationUseCaseTerms) || facts.outputs.scoresPeople || facts.outputs.assessesPeople || facts.outputs.ranksPeople || facts.outputs.approvesRejects;
      if (facts.domainSignals.education && facts.people.students && educationImpact && consequentialDecision(facts)) {
        return matched("strong", ["education/training domain", "students or education applicants affected", "admission/grading/assessment/progression output", `decision role: ${facts.decisionRole}`], "Annex III education route is triggered.");
      }
      if (facts.dataCategories.educationRecords && !facts.domainSignals.education) {
        return notMatched("Education records are only a data category here; no education legal-domain use case is established.", {
          negativeFacts: ["education records data only"],
        });
      }
      return notMatched("Education route is not triggered because education-domain impact is not established.");
    },
    explanationBuilder: identityExplanation,
    missingFactsBuilder: noExtraMissing,
    confidenceImpact: neutralConfidence,
  },
  {
    id: "annexIII.publicServices",
    title: "Essential public services and benefits",
    tier: "high_risk",
    priority: 630,
    legalBasis: [basis("Article 6(2)", "Annex III", "5", "Access to essential private services and essential public services and benefits", "The system affects eligibility, access, priority, approval, rejection, investigation, fraud risk, or benefit amount for public services or benefits.", "Article 6(2) + Annex III")],
    requiredSignals: ["public services/benefits", "residents/public-service users", "eligibility/access/priority/fraud/amount output"],
    supportingSignals: [],
    negativeSignals: ["financial or medical documents only"],
    legacyRuleId: "publicServices",
    triggerEvaluator: (facts) => {
      const people = facts.people.residents || facts.people.publicServiceUsers || facts.people.consumers || facts.affectedPeople.length > 0;
      const impact = affectsOutcome(facts) || includesAny(facts.sourceText, ["eligibility", "benefit amount", "fraud risk", "investigation", "priority", "public support"]);
      if (facts.domainSignals.publicServices && people && impact && consequentialDecision(facts)) {
        return matched("strong", ["public benefits/services domain", "residents or public-service users affected", "eligibility/access/priority/fraud/amount output", `decision role: ${facts.decisionRole}`], "Annex III public services and benefits route is triggered.");
      }
      return notMatched("Public services route is not triggered because public-benefit/service domain plus consequential eligibility/access impact is not established.");
    },
    explanationBuilder: identityExplanation,
    missingFactsBuilder: noExtraMissing,
    confidenceImpact: neutralConfidence,
  },
  {
    id: "annexIII.credit",
    title: "Credit or essential private services",
    tier: "high_risk",
    priority: 620,
    legalBasis: [basis("Article 6(2)", "Annex III", "5", "Access to essential private services and essential public services and benefits", "The system affects creditworthiness, loan eligibility, credit limit, pricing, access, approval, or rejection.", "Article 6(2) + Annex III")],
    requiredSignals: ["finance/credit/private essential service", "consumer/resident", "credit/access output"],
    supportingSignals: [],
    negativeSignals: ["financial data only"],
    legacyRuleId: "finance",
    triggerEvaluator: (facts) => {
      const impact = facts.outputs.scoresPeople || facts.outputs.approvesRejects || facts.outputs.assessesPeople || includesAny(facts.sourceText, creditTerms);
      if ((facts.domainSignals.financeCredit || facts.domainSignals.essentialPrivateServices) && impact && consequentialDecision(facts)) {
        return matched("strong", ["finance/credit or essential private service domain", "creditworthiness/loan/access output", `decision role: ${facts.decisionRole}`], "Annex III credit or essential private services route is triggered.");
      }
      if (facts.dataCategories.financialData && !facts.domainSignals.financeCredit) {
        return notMatched("Financial data is only a data category here; credit or essential-private-service decision impact is not established.", {
          negativeFacts: ["financial data only"],
        });
      }
      return notMatched("Credit/private-services route is not triggered because creditworthiness, loan, pricing, access, or approval impact is not established.");
    },
    explanationBuilder: identityExplanation,
    missingFactsBuilder: noExtraMissing,
    confidenceImpact: neutralConfidence,
  },
  {
    id: "annexIII.insurance",
    title: "Insurance eligibility or pricing",
    tier: "high_risk",
    priority: 610,
    legalBasis: [basis("Article 6(2)", "Annex III", "5", "Access to essential private services and essential public services and benefits", "The system affects insurance eligibility, pricing, claims, or access.", "Article 6(2) + Annex III")],
    requiredSignals: ["insurance", "eligibility/pricing/access output"],
    supportingSignals: [],
    negativeSignals: [],
    legacyRuleId: "insurance",
    triggerEvaluator: (facts) =>
      facts.domainSignals.insurance && affectsOutcome(facts) && consequentialDecision(facts)
        ? matched("strong", ["insurance domain", "eligibility/pricing/access output", `decision role: ${facts.decisionRole}`], "Annex III insurance route is triggered.")
        : notMatched("Insurance route is not triggered because insurance decision impact is not established."),
    explanationBuilder: identityExplanation,
    missingFactsBuilder: noExtraMissing,
    confidenceImpact: neutralConfidence,
  },
  {
    id: "annexIII.healthcare",
    title: "Healthcare and patient-care decision support",
    tier: "high_risk",
    priority: 600,
    legalBasis: [basis("Article 6", "Annex I / sector route to confirm", undefined, "Healthcare and patient-care decision support", "Healthcare decision support requires review when it affects diagnosis, triage, treatment, medical urgency, referral, or patient care.", "Medical-device or product-safety route requires clarification")],
    requiredSignals: ["healthcare/medical use case", "patients", "diagnosis/triage/treatment/care output"],
    supportingSignals: ["health data"],
    negativeSignals: ["health data only"],
    legacyRuleId: "healthcare",
    triggerEvaluator: (facts) => {
      const careImpact = includesAny(facts.sourceText, healthcareUseCaseTerms) || facts.outputs.recommendsPeople || facts.outputs.assessesPeople || facts.outputs.scoresPeople;
      if (facts.domainSignals.healthcare && (facts.people.patients || includesAny(facts.sourceText, ["patient", "clinician", "clinical"])) && careImpact) {
        return matched("strong", ["healthcare/medical domain", "patients or clinicians in care context", "diagnosis/triage/treatment/medical urgency/patient-care output"], "Healthcare/medical high-risk route is triggered or product-route clarification is needed.");
      }
      if (facts.dataCategories.healthData && !facts.domainSignals.healthcare) {
        return notMatched("Health data is only a data category here; diagnosis, triage, treatment, medical urgency, or patient-care impact is not established.", {
          negativeFacts: ["health data only"],
        });
      }
      return notMatched("Healthcare route is not triggered because medical decision impact is not established.");
    },
    explanationBuilder: identityExplanation,
    missingFactsBuilder: noExtraMissing,
    confidenceImpact: neutralConfidence,
  },
  {
    id: "annexIII.biometricsIdentification",
    title: "Biometric identification",
    tier: "high_risk",
    priority: 590,
    legalBasis: [basis("Article 6(2)", "Annex III", "1", "Biometrics", "High-risk biometric route applies to biometric identification, not ordinary identity verification alone.", "Article 6(2) + Annex III")],
    requiredSignals: ["biometric identification", "database/watchlist or one-to-many matching"],
    supportingSignals: [],
    negativeSignals: ["selfie verification only"],
    legacyRuleId: "biometricIdentification",
    triggerEvaluator: (facts) => {
      if (facts.dataCategories.biometricData && facts.outputs.identifiesPeople) {
        return matched("strong", ["biometric data", "biometric identification / watchlist / one-to-many matching"], "Annex III biometric identification route is triggered.");
      }
      if (facts.dataCategories.biometricData && facts.outputs.verifiesIdentity) {
        return notMatched("Selfie or biometric identity verification is noted, but biometric identification among multiple people or watchlist matching is not established.", {
          matchedFacts: ["biometric verification/data noted"],
          uncertaintyNotes: ["Biometric verification may still require privacy, security, and transparency review."],
        });
      }
      return notMatched("Biometric identification route is not triggered.");
    },
    explanationBuilder: identityExplanation,
    missingFactsBuilder: noExtraMissing,
    confidenceImpact: neutralConfidence,
  },
  {
    id: "annexIII.criticalInfrastructure",
    title: "Critical infrastructure",
    tier: "high_risk",
    priority: 580,
    legalBasis: [basis("Article 6(2)", "Annex III", "2", "Critical infrastructure", "The system manages or affects safety components of critical infrastructure.", "Article 6(2) + Annex III")],
    requiredSignals: ["critical infrastructure", "safety component"],
    supportingSignals: [],
    negativeSignals: [],
    legacyRuleId: "criticalInfrastructure",
    triggerEvaluator: (facts) =>
      facts.domainSignals.criticalInfrastructure && includesAny(facts.sourceText, ["safety", "traffic", "water", "gas", "heating", "electricity", "grid", "digital infrastructure"])
        ? matched("strong", ["critical infrastructure context", "safety or essential infrastructure effect"], "Annex III critical infrastructure route is triggered.")
        : notMatched("Critical infrastructure route is not triggered."),
    explanationBuilder: identityExplanation,
    missingFactsBuilder: noExtraMissing,
    confidenceImpact: neutralConfidence,
  },
  {
    id: "annexIII.lawEnforcement",
    title: "Law enforcement",
    tier: "high_risk",
    priority: 570,
    legalBasis: [basis("Article 6(2)", "Annex III", "6", "Law enforcement", "The system supports investigation, suspect profiling, criminal-risk assessment, evidence analysis, or enforcement priority.", "Article 6(2) + Annex III")],
    requiredSignals: ["law enforcement", "investigation/risk/evidence output"],
    supportingSignals: [],
    negativeSignals: [],
    legacyRuleId: "lawEnforcement",
    triggerEvaluator: (facts) =>
      facts.domainSignals.lawEnforcement && (affectsOutcome(facts) || includesAny(facts.sourceText, ["investigation", "suspect", "evidence", "offending", "victimization", "enforcement priority"]))
        ? matched("strong", ["law-enforcement domain", "investigation/risk/evidence/enforcement output"], "Annex III law-enforcement route is triggered.")
        : notMatched("Law-enforcement route is not triggered."),
    explanationBuilder: identityExplanation,
    missingFactsBuilder: noExtraMissing,
    confidenceImpact: neutralConfidence,
  },
  {
    id: "annexIII.migration",
    title: "Migration, asylum and border control",
    tier: "high_risk",
    priority: 560,
    legalBasis: [basis("Article 6(2)", "Annex III", "7", "Migration, asylum and border control management", "The system supports visa, asylum, border, migration-risk, credibility, or security-risk decisions.", "Article 6(2) + Annex III")],
    requiredSignals: ["migration/asylum/border", "decision support output"],
    supportingSignals: [],
    negativeSignals: [],
    legacyRuleId: "migration",
    triggerEvaluator: (facts) =>
      facts.domainSignals.migration && (affectsOutcome(facts) || includesAny(facts.sourceText, ["visa", "asylum", "border", "credibility", "security risk"]))
        ? matched("strong", ["migration/asylum/border domain", "visa/asylum/border/risk/credibility output"], "Annex III migration route is triggered.")
        : notMatched("Migration, asylum, and border route is not triggered."),
    explanationBuilder: identityExplanation,
    missingFactsBuilder: noExtraMissing,
    confidenceImpact: neutralConfidence,
  },
  {
    id: "annexIII.justice",
    title: "Justice and democratic processes",
    tier: "high_risk",
    priority: 550,
    legalBasis: [basis("Article 6(2)", "Annex III", "8", "Administration of justice and democratic processes", "The system assists judicial decisions, legal fact interpretation, dispute outcomes, voting behavior, election influence, or democratic process access.", "Article 6(2) + Annex III")],
    requiredSignals: ["justice/democratic process", "decision/process output"],
    supportingSignals: [],
    negativeSignals: [],
    legacyRuleId: "justice",
    triggerEvaluator: (facts) =>
      facts.domainSignals.justice && (affectsOutcome(facts) || includesAny(facts.sourceText, ["judicial", "court", "legal fact", "dispute", "election", "voting"]))
        ? matched("strong", ["justice or democratic-process domain", "judicial/legal/democratic process output"], "Annex III justice/democratic-process route is triggered.")
        : notMatched("Justice and democratic-process route is not triggered."),
    explanationBuilder: identityExplanation,
    missingFactsBuilder: noExtraMissing,
    confidenceImpact: neutralConfidence,
  },
  {
    id: "article50.directInteraction",
    title: "Direct AI interaction",
    tier: "limited_risk",
    priority: 400,
    legalBasis: [basis("Article 50", undefined, undefined, "Direct interaction transparency", "People should be informed when they directly interact with an AI system unless obvious from context.", "Article 50 transparency obligations")],
    requiredSignals: ["direct interaction or user-facing/both interaction mode"],
    supportingSignals: [],
    negativeSignals: [],
    legacyRuleId: "chatbot",
    triggerEvaluator: (facts) =>
      facts.interactionMode === "user_facing" || facts.interactionMode === "both"
        ? matched("strong", [`interaction mode: ${facts.interactionMode}`], "Article 50 direct-interaction transparency route is triggered.", {
          missingFacts: facts.safeguards.disclosure ? [] : ["Disclosure is not selected."],
        })
        : notMatched("Direct interaction route is not triggered because the system is not user-facing and interaction mode is not both."),
    explanationBuilder: identityExplanation,
    missingFactsBuilder: noExtraMissing,
    confidenceImpact: neutralConfidence,
  },
  {
    id: "article50.generatedText",
    title: "Generated public-facing text",
    tier: "limited_risk",
    priority: 390,
    legalBasis: [basis("Article 50", undefined, undefined, "Generated text transparency", "Generated text shown to people as an explanation, notice, letter, or communication may require transparency review.", "Article 50 transparency obligations")],
    requiredSignals: ["generated text shown to people"],
    supportingSignals: [],
    negativeSignals: ["internal-only draft not shown externally"],
    legacyRuleId: "generatedContent",
    triggerEvaluator: (facts) =>
      facts.outputs.generatesText && (facts.interactionMode === "user_facing" || facts.interactionMode === "both" || includesAny(facts.sourceText, ["sent to", "shown to", "public-facing", "applicant", "resident", "customer", "notice", "letter"]))
        ? matched("strong", ["generated text", "text shown or sent to people"], "Article 50 generated-text transparency review is triggered.", {
          missingFacts: facts.safeguards.disclosure ? [] : ["Disclosure or labeling is not selected."],
        })
        : notMatched("Generated text transparency route is not triggered because public-facing generated text is not established."),
    explanationBuilder: identityExplanation,
    missingFactsBuilder: noExtraMissing,
    confidenceImpact: neutralConfidence,
  },
  {
    id: "article50.syntheticMedia",
    title: "Synthetic or deepfake media",
    tier: "limited_risk",
    priority: 380,
    legalBasis: [basis("Article 50", undefined, undefined, "Synthetic or manipulated media", "Realistic AI-generated or manipulated image, audio, video, or deepfake-like media may require disclosure.", "Article 50 transparency obligations")],
    requiredSignals: ["synthetic image/audio/video/deepfake media"],
    supportingSignals: [],
    negativeSignals: ["ordinary generated text"],
    legacyRuleId: "deepfake",
    triggerEvaluator: (facts) =>
      facts.outputs.generatesSyntheticMedia
        ? matched("strong", ["realistic synthetic image/audio/video/deepfake media"], "Article 50 synthetic-media route is triggered.")
        : notMatched("Synthetic-media route is not triggered because ordinary generated text is not deepfake, image, audio, or video media."),
    explanationBuilder: identityExplanation,
    missingFactsBuilder: noExtraMissing,
    confidenceImpact: neutralConfidence,
  },
  {
    id: "article50.emotionDisclosure",
    title: "Emotion-recognition disclosure",
    tier: "limited_risk",
    priority: 370,
    legalBasis: [basis("Article 50", undefined, undefined, "Emotion-recognition transparency", "Emotion recognition may require disclosure or notice even when Article 5 is also under review.", "Article 50 transparency obligations")],
    requiredSignals: ["emotion recognition"],
    supportingSignals: [],
    negativeSignals: [],
    legacyRuleId: "emotionRecognition",
    triggerEvaluator: (facts) =>
      facts.outputs.infersEmotion
        ? matched("strong", ["emotion recognition inferred or selected"], "Article 50 emotion-recognition disclosure route is triggered or needs review.", {
          missingFacts: facts.safeguards.disclosure ? [] : ["Disclosure is not selected."],
        })
        : notMatched("Emotion-recognition disclosure route is not triggered because emotion recognition is not established."),
    explanationBuilder: identityExplanation,
    missingFactsBuilder: noExtraMissing,
    confidenceImpact: neutralConfidence,
  },
];

function applyRule(rule: LegalRuleDefinition, facts: NormalizedFacts): RegistryRuleEvaluation {
  const base = rule.triggerEvaluator(facts);
  const evaluation: RegistryRuleEvaluation = {
    ...base,
    ruleId: rule.id,
    title: rule.title,
    tier: rule.tier,
    priority: rule.priority,
    legalBasis: rule.legalBasis,
    legacyRuleId: rule.legacyRuleId,
  };
  return {
    ...evaluation,
    explanation: rule.explanationBuilder(facts, evaluation),
    missingFacts: unique([...evaluation.missingFacts, ...rule.missingFactsBuilder(facts)]),
  };
}

function dedupeLegalBasis(items: LegalBasisReference[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = [item.article, item.annex, item.point, item.title].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function routeToRiskTier(route?: RegistryRuleEvaluation): LegalRiskTier {
  if (!route) return "Unclassified / Insufficient facts";
  if (route.tier === "scope") return "Out of scope / EU scope not established";
  if (route.tier === "not_ai") return "Not an AI system / AI status unclear";
  if (route.tier === "prohibited") return "Potentially prohibited";
  if (route.tier === "high_risk") return "Likely High-risk";
  if (route.tier === "limited_risk") return "Limited risk / Transparency obligation";
  if (route.tier === "minimal_risk") return "Minimal risk";
  return "Unclassified / Insufficient facts";
}

function compatTierForRisk(riskTier: LegalRiskTier): RiskTier {
  if (riskTier === "Out of scope / EU scope not established") return "out_of_scope";
  if (riskTier === "Not an AI system / AI status unclear") return "needs_review";
  if (riskTier === "Potentially prohibited") return "unacceptable";
  if (riskTier === "Likely High-risk") return "high";
  if (riskTier === "Limited risk / Transparency obligation") return "limited";
  if (riskTier === "Minimal risk") return "minimal";
  return "needs_review";
}

function toTriggeredRule(route: RegistryRuleEvaluation): TriggeredRule {
  const source =
    prohibitedPracticeRules.find((rule) => rule.id === route.legacyRuleId) ||
    highRiskRules.find((rule) => rule.id === route.legacyRuleId) ||
    limitedRiskRules.find((rule) => rule.id === route.legacyRuleId);

  if (source) {
    return {
      ...source,
      whyItMatters: route.explanation,
    };
  }

  return {
    id: route.legacyRuleId ?? route.ruleId,
    category: route.tier === "prohibited" ? "prohibited" : route.tier === "high_risk" ? "highRisk" : "limitedRisk",
    legalBasis: route.legalBasis.map((item) => [item.article, item.annex, item.point ? `point ${item.point}` : ""].filter(Boolean).join(" + ")).join("; "),
    label: route.title,
    shortDescription: route.explanation,
    triggerQuestion: route.title,
    examples: [],
    tags: route.matchedFacts,
    whyItMatters: route.explanation,
  };
}

export function evaluateLegalRuleRegistry(input: ClassificationInput, evidenceFindings: EvidenceFinding[] = [], aiFunctionUnclear = false): RuleRegistryResult {
  const facts = normalizeFacts(input, evidenceFindings, aiFunctionUnclear);
  const primaryResults = LEGAL_RULE_REGISTRY.map((rule) => applyRule(rule, facts));
  const riskMatches = primaryResults.filter((route) => route.matched && route.tier !== "scope" && route.tier !== "not_ai" && route.strength !== "none");
  const minimalMatched = facts.scope.established && facts.aiSystemEstablished && riskMatches.length === 0;
  const minimalRoute: RegistryRuleEvaluation = {
    ruleId: "minimal.general",
    title: "Minimal-risk fallback",
    tier: "minimal_risk",
    priority: 100,
    matched: minimalMatched,
    strength: minimalMatched ? "strong" : "none",
    matchedFacts: minimalMatched ? ["scope and AI-system gates passed", "no Article 5, Article 6, or Article 50 route matched"] : [],
    missingFacts: [],
    negativeFacts: [],
    uncertaintyNotes: [],
    legalBasis: [basis(undefined, undefined, undefined, "Risk-based framework", "No Article 5, Article 6, or Article 50 trigger is currently established.")],
    explanation: minimalMatched ? "Minimal-risk fallback matched because no higher-risk or transparency route matched." : "Minimal-risk fallback not used because another route matched or a gate failed.",
  };

  const ruleResults = [...primaryResults, minimalRoute];
  const matchedRoutes = ruleResults.filter((route) => route.matched);
  const rejectedRoutes = ruleResults.filter((route) => !route.matched && route.ruleId !== "minimal.general");
  const finalRoute =
    matchedRoutes.find((route) => route.tier === "scope" && !facts.scope.established) ||
    matchedRoutes.find((route) => route.tier === "not_ai") ||
    matchedRoutes
      .filter((route) => route.tier !== "scope")
      .sort((a, b) => b.priority - a.priority)[0];
  const finalRiskTier = routeToRiskTier(finalRoute);
  const legalBasis = dedupeLegalBasis(matchedRoutes.flatMap((route) => route.legalBasis));
  const uncertaintyNotes = unique(ruleResults.flatMap((route) => route.uncertaintyNotes));

  return {
    facts,
    ruleResults,
    matchedRoutes,
    rejectedRoutes,
    uncertaintyNotes,
    finalRiskTier,
    compatTier: compatTierForRisk(finalRiskTier),
    legalBasis,
    prohibitedMatches: matchedRoutes.filter((route) => route.tier === "prohibited").map(toTriggeredRule),
    highRiskMatches: matchedRoutes.filter((route) => route.tier === "high_risk").map(toTriggeredRule),
    transparencyMatches: matchedRoutes.filter((route) => route.tier === "limited_risk").map(toTriggeredRule),
  };
}
