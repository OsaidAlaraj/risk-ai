export type RiskTier = "out_of_scope" | "unacceptable" | "high" | "limited" | "minimal" | "needs_review";

export type ScopeStatus = "out_of_scope" | "in_scope" | "unclear";

export type ConfidenceLabel = "High" | "Medium" | "Low" | "Insufficient information";

export type ActorRole = "provider" | "deployer" | "importer" | "distributor" | "product_manufacturer" | "affected_person" | "unclear";

export type SystemType = "ai_system" | "gpai_model" | "gpai_model_systemic_risk" | "embedded_product_component" | "non_ai_or_unclear";

export type PipelineStatus = "triggered" | "clear" | "warning" | "review";

export type RuleCategory = "prohibited" | "highRisk" | "limitedRisk" | "scope" | "safeguard";

export type EvidenceKind = "model-card" | "dataset" | "logs" | "technical-doc" | "other";

export interface ScopeFacts {
  usedInEU: boolean;
  placedOnEUMarket: boolean;
  affectsEUUsers: boolean;
}

export interface GpaIFacts {
  developsModel: boolean;
  usesThirdPartyApi: boolean;
  systemicRiskIndicators: boolean;
}

export interface NonAIActFlags {
  gdprPrivacy: boolean;
  healthData: boolean;
  biometricData: boolean;
  childrenOrVulnerableUsers: boolean;
  consumerProtection: boolean;
  advertisingClaims: boolean;
  productSafety: boolean;
  medicalDeviceOrHealthRegulation: boolean;
  cosmeticsOrSkincare: boolean;
  ipCopyright: boolean;
  cybersecurity: boolean;
  sectorSpecificRegulation: boolean;
  employmentLabor: boolean;
  financialServices: boolean;
}

export type InteractionMode = "internal_only" | "user_facing" | "both" | "unclear";

export type DecisionMode = "prepares_information" | "materially_influences_decision" | "automatically_decides" | "unclear";

export interface DecisionFacts {
  ranksPeople: boolean;
  scoresPeople: boolean;
  filtersPeople: boolean;
  approvesRejectsPeople: boolean;
  recommendsPeople: boolean;
  assessesPeople: boolean;
}

export interface DomainFacts {
  employment: boolean;
  education: boolean;
  healthcare: boolean;
  finance: boolean;
  insurance: boolean;
  migration: boolean;
  lawEnforcement: boolean;
  justice: boolean;
  publicServices: boolean;
  criticalInfrastructure: boolean;
  productSafety: boolean;
  consumerServices: boolean;
}

export interface DataFacts {
  personalData: boolean;
  sensitiveData: boolean;
  healthData: boolean;
  biometricData: boolean;
}

export interface ContentFacts {
  generatesPublicFacingContent: boolean;
  directlyInteractsWithUsers: boolean;
  createsRealisticSyntheticContent: boolean;
}

export interface ControlFacts {
  humanOversight: boolean;
  appealPath: boolean;
  dataGovernance: boolean;
  disclosure: boolean;
}

export interface ProhibitedFacts {
  manipulation: boolean;
  vulnerableGroups: boolean;
  socialScoring: boolean;
  criminalRiskSolelyProfiling: boolean;
  realTimePublicSpaceBiometricIdentification: boolean;
  untargetedFacialImageScraping: boolean;
  workplaceOrEducationEmotionRecognition: boolean;
  sensitiveBiometricCategorization: boolean;
}

export interface EvidenceFinding {
  id: string;
  category: "sensitive-attributes" | "human-oversight" | "dataset-risk" | "model-behavior" | "documentation" | "possible-signal" | "contradiction";
  label: string;
  plainSummary: string;
  expertDetail: string;
  severity: "low" | "medium" | "high";
  confidenceImpact: number;
}

export interface EvidenceDocument {
  id: string;
  name: string;
  kind: EvidenceKind;
  size: number;
  uploadedAt: string;
  textPreview: string;
  extracted: EvidenceFinding[];
}

export interface ModelTestSelection {
  bias: boolean;
  robustness: boolean;
  explainability: boolean;
  adversarial: boolean;
}

export interface ModelTestResult {
  id: keyof ModelTestSelection;
  label: string;
  status: "not-run" | "pass" | "warning" | "fail" | "simulated";
  plainSummary: string;
  expertDetail: string;
  evidenceSignals: string[];
}

export interface UncertaintyBreakdown {
  overall: number;
  epistemic: number;
  aleatoric: number;
  missingInformation: number;
  contradiction: number;
  answerCompleteness: number;
  evidenceSupport: number;
  legalUncertainty: number;
  realWorldStability: number;
  safeguardsMaturity: number;
  plainSummary: string;
}

export interface LegalCitation {
  id: string;
  legalBasis: string;
  annex?: string;
  article?: string;
  plainExplanation: string;
  expertSummary: string;
}

export interface ClassificationInput {
  systemName: string;
  providerName: string;
  systemDescription: string;
  purpose: string;
  sector: string;
  aiInputs: string;
  aiOutputs: string;
  outputUsers: string;
  actorRole: ActorRole;
  systemType: SystemType;
  scope: ScopeFacts;
  interactionMode: InteractionMode;
  decisionMode: DecisionMode;
  decisionFacts: DecisionFacts;
  domains: DomainFacts;
  dataFacts: DataFacts;
  contentFacts: ContentFacts;
  controls: ControlFacts;
  prohibitedFacts: ProhibitedFacts;
  affectedPeople: string[];
  dataTypes: string[];
  evidenceDocuments: EvidenceDocument[];
  modelTests: ModelTestSelection;
  gpaI: GpaIFacts;
  nonAIActFlags: NonAIActFlags;
  aiFunctionUnclear: boolean;
  uncertaintyNotes: string;
  showLegalBasis: boolean;
}

export interface LegalRule {
  id: string;
  category: RuleCategory;
  legalBasis: string;
  label: string;
  shortDescription: string;
  triggerQuestion: string;
  examples: string[];
  tags: string[];
}

export interface TriggeredRule extends LegalRule {
  whyItMatters: string;
}

export interface PipelineStep {
  id: string;
  title: string;
  status: PipelineStatus;
  legalBasis: string;
  summary: string;
  details: string[];
}

export interface ChecklistItem {
  title: string;
  legalBasis: string;
  description: string;
  priority: "critical" | "high" | "medium";
  source?: "article" | "annex" | "evidence" | "test";
}

export interface ClassificationResult {
  tier: RiskTier;
  scopeStatus: ScopeStatus;
  actorRole: ActorRole;
  systemType: SystemType;
  aiFunctionUnclear: boolean;
  confidence: number;
  confidenceLabel: ConfidenceLabel;
  confidenceExplanation: string;
  uncertainty: UncertaintyBreakdown;
  summary: string;
  mainReason: string;
  recommendation: string;
  ruleGroup: string;
  triggeredRules: TriggeredRule[];
  transparencyRules: TriggeredRule[];
  pipeline: PipelineStep[];
  checklist: ChecklistItem[];
  citations: LegalCitation[];
  evidenceFindings: EvidenceFinding[];
  modelTestResults: ModelTestResult[];
  conformityWorkflow: ChecklistItem[];
  factsUsed: string[];
  selectedSignals: string[];
  contradictions: string[];
  missingFacts: string[];
  evidenceStatus: string;
  evidenceWarnings: string[];
  requiredControls: string[];
  nextSteps: string[];
  whatCouldChange: string[];
  assumptions: string[];
  informationGaps: string[];
  nonAIActFlags: NonAIActFlags;
  gpaIObligations: string[];
  fieldAudit: FieldAuditEntry[];
  disclaimer: string;
  generatedAt: string;
  assessmentVersion: number;
}

export interface FieldAuditEntry {
  field: string;
  affects: ReadonlyArray<"classification" | "confidence" | "evidence" | "report" | "warnings" | "assumptions" | "non-ai-act">;
  status: "complete" | "partial" | "missing" | "unclear";
  note: string;
}

export const riskTierLabels: Record<RiskTier, string> = {
  out_of_scope: "EU Scope Unclear / Out of Scope",
  unacceptable: "Unacceptable Risk",
  high: "High Risk",
  limited: "Limited Risk",
  minimal: "Minimal Risk",
  needs_review: "Needs Review",
};

export const riskTierDescriptions: Record<RiskTier, string> = {
  out_of_scope: "EU AI Act scope is not established from the facts provided. Reassess if the system later targets EU users or the EU market.",
  unacceptable: "Potentially prohibited. Stop deployment and get legal review before proceeding.",
  high: "High-scrutiny use case. Proceed only with stronger governance, documentation, testing, and oversight.",
  limited: "Generally allowed, but transparency or disclosure duties may apply.",
  minimal: "No specific higher-risk AI Act duty was identified from the facts provided.",
  needs_review: "The facts are incomplete, conflicting, or too vague to classify confidently.",
};
