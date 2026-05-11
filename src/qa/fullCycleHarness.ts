import { getAuditRecords, saveAuditRecord } from "../audit/auditStore";
import { createEmptyInput } from "../data/scenarios";
import { classifySystem } from "../engine/classifier";
import type { ClassificationInput, ConfidenceLabel, EvidenceDocument, RiskTier } from "../engine/types";
import { extractEvidenceFindings } from "../evidence/evidenceValidator";
import { getAdaptiveGroups, getReviewHints } from "../lib/questionFlow";
import { getIntakeState } from "../lib/assessmentSignals";
import { buildReportManifest } from "../report/reportGenerator";

type TestStatus = "pass" | "fail";

type TestCaseResult = {
  name: string;
  status: TestStatus;
  detail: string;
};

type FullCycleTestReport = {
  generatedAt: string;
  status: TestStatus;
  totals: {
    passed: number;
    failed: number;
  };
  cases: TestCaseResult[];
};

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }
}

Object.defineProperty(globalThis, "localStorage", {
  value: new MemoryStorage(),
  configurable: true,
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function cloneInput(input: ClassificationInput): ClassificationInput {
  return JSON.parse(JSON.stringify(input)) as ClassificationInput;
}

function makeEvidenceDocument(text: string): EvidenceDocument {
  return {
    id: `qa-${Date.now()}`,
    name: "qa-evidence.md",
    kind: "model-card",
    size: text.length,
    uploadedAt: new Date().toISOString(),
    textPreview: text.slice(0, 1200),
    extracted: extractEvidenceFindings(text),
  };
}

function withEvidence(input: ClassificationInput, text: string) {
  input.evidenceDocuments = [makeEvidenceDocument(text)];
  return input;
}

type ScenarioTest = {
  name: string;
  expectedTier: RiskTier;
  expectedReason: string;
  allowedLabels: ConfidenceLabel[];
  minConfidence?: number;
  maxConfidence?: number;
  extraCheck?: (result: ReturnType<typeof classifySystem>) => void;
  input: ClassificationInput;
};

const scenarioTests: ScenarioTest[] = [];

const add = (
  name: string,
  input: ClassificationInput,
  expectedTier: RiskTier,
  expectedReason: string,
  allowedLabels: ConfidenceLabel[],
  extraCheck?: (result: ReturnType<typeof classifySystem>) => void,
  minConfidence?: number,
  maxConfidence?: number,
) => {
  scenarioTests.push({ name, input, expectedTier, expectedReason, allowedLabels, extraCheck, minConfidence, maxConfidence });
};

function seedCore(input: ClassificationInput, overrides: Partial<Pick<ClassificationInput, "aiInputs" | "aiOutputs" | "outputUsers" | "actorRole" | "systemType" | "gpaI" | "nonAIActFlags">>) {
  Object.assign(input, overrides);
}

// 1. Internal summarization tool
{
  const input = createEmptyInput();
  input.systemName = "Internal Notes Summarizer";
  input.providerName = "Internal Ops";
  input.systemDescription = "Summarizes internal meeting notes for employees inside one company. Humans review the output before use.";
  input.purpose = "Internal summarization";
  input.sector = "Productivity";
  seedCore(input, {
    aiInputs: "Internal notes, meeting transcripts, employee messages",
    aiOutputs: "Summaries, action items, concise briefings",
    outputUsers: "Employees and team leads",
    actorRole: "deployer",
    systemType: "ai_system",
  });
  input.scope.usedInEU = true;
  input.interactionMode = "internal_only";
  input.decisionMode = "prepares_information";
  input.controls.humanOversight = true;
  input.controls.dataGovernance = true;
  input.affectedPeople = ["Employees"];
  input.dataTypes = ["personal data"];
  withEvidence(input, "Model card: internal summarization system, documented purpose, reviewer signoff, and known limits.");
  add("Internal summarization tool", input, "minimal", "low-risk", ["High", "Medium", "Low"]);
}

// 2. Internal tool outside EU with no EU users
{
  const input = createEmptyInput();
  input.systemName = "Outside EU Helper";
  input.providerName = "Global Team";
  input.systemDescription = "Internal support assistant used outside the EU for team notes.";
  input.purpose = "Internal support";
  input.sector = "Productivity";
  seedCore(input, {
    aiInputs: "Team notes and internal requests",
    aiOutputs: "Draft summaries and reminders",
    outputUsers: "Employees",
    actorRole: "deployer",
    systemType: "ai_system",
  });
  input.interactionMode = "internal_only";
  input.decisionMode = "prepares_information";
  input.controls.humanOversight = true;
  input.affectedPeople = ["Employees"];
  add("Internal tool outside EU", input, "out_of_scope", "scope is not established", ["High", "Medium", "Low"]);
}

// 3. Customer chatbot
{
  const input = createEmptyInput();
  input.systemName = "HelpDesk AI";
  input.providerName = "ServiceFlow";
  input.systemDescription = "Customer-support chatbot answers product questions and opens support tickets.";
  input.purpose = "Customer support automation";
  input.sector = "Consumer SaaS";
  seedCore(input, {
    aiInputs: "Customer questions and account context",
    aiOutputs: "Support answers and tickets",
    outputUsers: "Customers and support agents",
    actorRole: "deployer",
    systemType: "ai_system",
  });
  input.scope.usedInEU = true;
  input.scope.placedOnEUMarket = true;
  input.scope.affectsEUUsers = true;
  input.interactionMode = "user_facing";
  input.decisionMode = "prepares_information";
  input.contentFacts.directlyInteractsWithUsers = true;
  input.contentFacts.generatesPublicFacingContent = true;
  input.controls.disclosure = true;
  input.controls.humanOversight = true;
  add("Customer chatbot", input, "limited", "transparency", ["High", "Medium", "Low"]);
}

// 4. Public marketing content generator
{
  const input = createEmptyInput();
  input.systemName = "AdCopy Generator";
  input.providerName = "Marketing Team";
  input.systemDescription = "Generates public marketing copy for social media and product pages.";
  input.purpose = "Public marketing content";
  input.sector = "Marketing";
  seedCore(input, {
    aiInputs: "Prompts, product details, campaign guidance",
    aiOutputs: "Marketing copy and social posts",
    outputUsers: "Marketing staff and audiences",
    actorRole: "deployer",
    systemType: "ai_system",
  });
  input.scope.usedInEU = true;
  input.interactionMode = "user_facing";
  input.decisionMode = "prepares_information";
  input.contentFacts.generatesPublicFacingContent = true;
  input.controls.disclosure = true;
  add("Marketing content generator", input, "limited", "transparency", ["High", "Medium", "Low"]);
}

// 5. Product recommendation system with no safety/rights impact
{
  const input = createEmptyInput();
  input.systemName = "Product Recommender";
  input.providerName = "Retail Team";
  input.systemDescription = "Suggests products for shoppers based on browsing history but does not control access or rights.";
  input.purpose = "Product recommendation";
  input.sector = "Retail";
  seedCore(input, {
    aiInputs: "Browsing history and product catalogue data",
    aiOutputs: "Product recommendations",
    outputUsers: "Shoppers and merchandising staff",
    actorRole: "deployer",
    systemType: "ai_system",
  });
  input.scope.usedInEU = true;
  input.interactionMode = "user_facing";
  input.decisionMode = "prepares_information";
  input.contentFacts.directlyInteractsWithUsers = true;
  input.controls.disclosure = true;
  add("Low-impact recommendation", input, "limited", "transparency", ["High", "Medium", "Low"]);
}

// 6. Product recommendation affecting safety / access
{
  const input = createEmptyInput();
  input.systemName = "Safety Recommender";
  input.providerName = "Product QA";
  input.systemDescription = "Recommends whether to ship a product based on safety inspection scores and can block release.";
  input.purpose = "Safety-related product decision support";
  input.sector = "Product safety";
  seedCore(input, {
    aiInputs: "Inspection scores, defect notes, release criteria",
    aiOutputs: "Ship / hold recommendation and safety notes",
    outputUsers: "Product safety reviewers and release managers",
    actorRole: "deployer",
    systemType: "embedded_product_component",
  });
  input.scope.usedInEU = true;
  input.decisionMode = "materially_influences_decision";
  input.domains.productSafety = true;
  input.controls.humanOversight = true;
  withEvidence(input, "Technical documentation: safety-critical release gating, inspection logs, escalation procedure, and reviewer signoff.");
  add("Product safety decision support", input, "high", "high-scrutiny", ["High", "Medium"]);
}

// 7. Employment screening / applicant ranking
{
  const input = createEmptyInput();
  input.systemName = "Applicant Screen";
  input.providerName = "TalentRank";
  input.systemDescription = "Ranks candidates, scores applicants, and recommends interview shortlists.";
  input.purpose = "Recruitment screening";
  input.sector = "Employment";
  seedCore(input, {
    aiInputs: "Applicant profiles, resumes, employment history",
    aiOutputs: "Applicant ranks and shortlist recommendations",
    outputUsers: "Recruiters and hiring managers",
    actorRole: "deployer",
    systemType: "ai_system",
  });
  input.scope.usedInEU = true;
  input.decisionMode = "materially_influences_decision";
  input.domains.employment = true;
  input.decisionFacts.ranksPeople = true;
  input.decisionFacts.recommendsPeople = true;
  input.controls.humanOversight = true;
  withEvidence(input, "Model card: applicant ranking, recruiter review, logging, bias testing notes, and appeal path.");
  add("Employment screening", input, "high", "high-scrutiny", ["High", "Medium"]);
}

// 8. Student grading / admission
{
  const input = createEmptyInput();
  input.systemName = "School Grader";
  input.providerName = "EduSense";
  input.systemDescription = "Ranks and grades student submissions for admission and assessment.";
  input.purpose = "Education assessment";
  input.sector = "Education";
  seedCore(input, {
    aiInputs: "Student submissions, rubrics, previous grades",
    aiOutputs: "Scores, grades, admission recommendations",
    outputUsers: "Teachers, assessors, admissions staff",
    actorRole: "deployer",
    systemType: "ai_system",
  });
  input.scope.usedInEU = true;
  input.decisionMode = "materially_influences_decision";
  input.domains.education = true;
  input.decisionFacts.scoresPeople = true;
  input.controls.humanOversight = true;
  withEvidence(input, "Dataset note: assessment rubric, grading logs, moderation workflow, and reviewer escalation.");
  add("Student grading/admission", input, "high", "high-scrutiny", ["High", "Medium"]);
}

// 9. Credit eligibility
{
  const input = createEmptyInput();
  input.systemName = "Loan Gate";
  input.providerName = "FinAI";
  input.systemDescription = "Determines loan eligibility and can reject applicants automatically.";
  input.purpose = "Credit eligibility";
  input.sector = "Finance";
  seedCore(input, {
    aiInputs: "Application data, repayment history, income signals",
    aiOutputs: "Eligibility score and approve / reject recommendation",
    outputUsers: "Lending officers and applicants",
    actorRole: "deployer",
    systemType: "ai_system",
  });
  input.scope.usedInEU = true;
  input.decisionMode = "automatically_decides";
  input.domains.finance = true;
  input.decisionFacts.approvesRejectsPeople = true;
  withEvidence(input, "Model card: underwriting rules, logging, reviewer notes, and portfolio monitoring.");
  add("Credit eligibility", input, "high", "high-scrutiny", ["High", "Medium"]);
}

// 10. Insurance eligibility / pricing
{
  const input = createEmptyInput();
  input.systemName = "Premium Risk";
  input.providerName = "InsureAI";
  input.systemDescription = "Adjusts insurance pricing based on applicant data and historical claims patterns.";
  input.purpose = "Insurance pricing";
  input.sector = "Insurance";
  seedCore(input, {
    aiInputs: "Application data, claims history, risk factors",
    aiOutputs: "Premium suggestions and eligibility notes",
    outputUsers: "Underwriters and pricing staff",
    actorRole: "deployer",
    systemType: "ai_system",
  });
  input.scope.usedInEU = true;
  input.decisionMode = "materially_influences_decision";
  input.domains.insurance = true;
  input.decisionFacts.scoresPeople = true;
  withEvidence(input, "Documentation: pricing model, audit logs, claim review, and customer escalation path.");
  add("Insurance pricing", input, "high", "high-scrutiny", ["High", "Medium"]);
}

// 11. Medical triage / patient-risk support
{
  const input = createEmptyInput();
  input.systemName = "Triage Assist";
  input.providerName = "Aster Medical AI";
  input.systemDescription = "Supports clinicians with triage urgency and possible diagnoses.";
  input.purpose = "Medical triage";
  input.sector = "Healthcare";
  seedCore(input, {
    aiInputs: "Symptoms, notes, lab values, imaging metadata",
    aiOutputs: "Triage urgency and diagnostic suggestions",
    outputUsers: "Clinicians and care teams",
    actorRole: "deployer",
    systemType: "ai_system",
  });
  input.scope.usedInEU = true;
  input.decisionMode = "materially_influences_decision";
  input.domains.healthcare = true;
  input.dataFacts.healthData = true;
  input.controls.humanOversight = true;
  withEvidence(input, "Clinical documentation: triage workflows, reviewer escalation, and patient-risk log.");
  add("Medical triage", input, "high", "high-scrutiny", ["High", "Medium"]);
}

// 12. Employee monitoring
{
  const input = createEmptyInput();
  input.systemName = "WorkWatch";
  input.providerName = "Ops AI";
  input.systemDescription = "Monitors employee performance, screen time, and productivity patterns.";
  input.purpose = "Employee monitoring";
  input.sector = "Employment";
  seedCore(input, {
    aiInputs: "Screen time, activity patterns, productivity signals",
    aiOutputs: "Monitoring summaries and performance flags",
    outputUsers: "Managers and HR staff",
    actorRole: "deployer",
    systemType: "ai_system",
  });
  input.scope.usedInEU = true;
  input.decisionMode = "materially_influences_decision";
  input.domains.employment = true;
  input.decisionFacts.assessesPeople = true;
  withEvidence(input, "Monitoring log, worker review path, and performance escalation policy.");
  add("Employee monitoring", input, "high", "high-scrutiny", ["High", "Medium"]);
}

// 13. Migration / visa support
{
  const input = createEmptyInput();
  input.systemName = "Visa Triage";
  input.providerName = "Border Tech";
  input.systemDescription = "Supports visa and asylum processing with applicant prioritization.";
  input.purpose = "Migration support";
  input.sector = "Migration";
  seedCore(input, {
    aiInputs: "Applicant records, travel history, support documents",
    aiOutputs: "Priority ranking and case notes",
    outputUsers: "Case officers and reviewers",
    actorRole: "deployer",
    systemType: "ai_system",
  });
  input.scope.usedInEU = true;
  input.decisionMode = "materially_influences_decision";
  input.domains.migration = true;
  input.decisionFacts.recommendsPeople = true;
  withEvidence(input, "Visa processing note, logs, reviewer escalation, and control documentation.");
  add("Migration or visa support", input, "high", "high-scrutiny", ["High", "Medium"]);
}

// 14. Law enforcement profiling
{
  const input = createEmptyInput();
  input.systemName = "Risk Map";
  input.providerName = "Metro Analytics";
  input.systemDescription = "Predicts criminal risk from demographic and location data only.";
  input.purpose = "Law-enforcement profiling";
  input.sector = "Law enforcement";
  seedCore(input, {
    aiInputs: "Demographic and location data",
    aiOutputs: "Criminal-risk score",
    outputUsers: "Police analysts",
    actorRole: "deployer",
    systemType: "ai_system",
  });
  input.scope.usedInEU = true;
  input.decisionMode = "automatically_decides";
  input.domains.lawEnforcement = true;
  input.prohibitedFacts.criminalRiskSolelyProfiling = true;
  withEvidence(input, "Model card: risk map, profiling-only inputs, and deployment notes.");
  add("Law enforcement profiling", input, "unacceptable", "prohibited", ["High", "Medium"]);
}

// 15. Real-time public-space biometric identification
{
  const input = createEmptyInput();
  input.systemName = "Live Face Match";
  input.providerName = "Police AI";
  input.systemDescription = "Performs real-time remote facial identification in public space for police use.";
  input.purpose = "Real-time biometric identification";
  input.sector = "Law enforcement";
  seedCore(input, {
    aiInputs: "Live facial images and watchlist data",
    aiOutputs: "Identity match alerts",
    outputUsers: "Police officers and control room staff",
    actorRole: "deployer",
    systemType: "ai_system",
  });
  input.scope.usedInEU = true;
  input.decisionMode = "automatically_decides";
  input.domains.lawEnforcement = true;
  input.dataFacts.biometricData = true;
  input.prohibitedFacts.realTimePublicSpaceBiometricIdentification = true;
  withEvidence(input, "Operational note: live public-space facial identification and officer review.");
  add("Real-time biometric identification", input, "unacceptable", "prohibited", ["High", "Medium"]);
}

// 16. Emotion recognition in workplace / education
{
  const input = createEmptyInput();
  input.systemName = "ClassMood Monitor";
  input.providerName = "EduSense";
  input.systemDescription = "Infers student attention and emotion from webcams during class.";
  input.purpose = "Emotion detection in school";
  input.sector = "Education";
  seedCore(input, {
    aiInputs: "Webcam images and classroom context",
    aiOutputs: "Emotion labels and attention scores",
    outputUsers: "Teachers and administrators",
    actorRole: "deployer",
    systemType: "ai_system",
  });
  input.scope.usedInEU = true;
  input.decisionMode = "materially_influences_decision";
  input.domains.education = true;
  input.prohibitedFacts.workplaceOrEducationEmotionRecognition = true;
  input.dataFacts.biometricData = true;
  withEvidence(input, "School webcam monitoring, attention dashboards, and moderation notes.");
  add("Emotion recognition in school", input, "unacceptable", "prohibited", ["High", "Medium"]);
}

// 17. Vague system with no evidence
{
  const input = createEmptyInput();
  input.systemName = "Vague Assistant";
  input.providerName = "Unknown";
  input.systemDescription = "AI assistant.";
  input.purpose = "";
  input.sector = "";
  seedCore(input, {
    aiInputs: "",
    aiOutputs: "",
    outputUsers: "",
    actorRole: "unclear",
    systemType: "non_ai_or_unclear",
  });
  input.scope.usedInEU = false;
  input.scope.placedOnEUMarket = false;
  input.scope.affectsEUUsers = false;
  input.interactionMode = "unclear";
  input.decisionMode = "unclear";
  add("Vague system with no evidence", input, "needs_review", "scope is not established", ["Insufficient information", "Low"], undefined, 14, 55);
}

// 18. Conflicting answers
{
  const input = createEmptyInput();
  input.systemName = "Conflicting Assistant";
  input.providerName = "Support Team";
  input.systemDescription = "Internal-only summary helper, but customers directly use it to decide who gets approved.";
  input.purpose = "Support summaries";
  input.sector = "Customer support";
  seedCore(input, {
    aiInputs: "Support tickets and internal notes",
    aiOutputs: "Summaries and approval notes",
    outputUsers: "Support staff and customers",
    actorRole: "deployer",
    systemType: "ai_system",
  });
  input.scope.usedInEU = true;
  input.interactionMode = "internal_only";
  input.decisionMode = "prepares_information";
  input.contentFacts.directlyInteractsWithUsers = true;
  input.contentFacts.generatesPublicFacingContent = true;
  input.controls.disclosure = false;
  add("Conflicting answers", input, "needs_review", "contradiction", ["Insufficient information", "Low"], undefined, 14, 55);
}

// 19. Sensitive data selected without explanation
{
  const input = createEmptyInput();
  input.systemName = "Sensitive Data Helper";
  input.providerName = "Analytics Team";
  input.systemDescription = "Uses health and biometric data for analysis, but no reason is explained.";
  input.purpose = "Sensitive-data analysis";
  input.sector = "Analytics";
  seedCore(input, {
    aiInputs: "Health and biometric records",
    aiOutputs: "Analysis summaries",
    outputUsers: "Analysts",
    actorRole: "deployer",
    systemType: "ai_system",
  });
  input.scope.usedInEU = true;
  input.dataFacts.sensitiveData = true;
  input.dataFacts.healthData = true;
  input.dataFacts.biometricData = true;
  input.decisionMode = "prepares_information";
  add("Sensitive data without explanation", input, "needs_review", "missing", ["Insufficient information", "Low"], undefined, 14, 55);
}

// 20. High-risk text in description but matching fields not selected
{
  const input = createEmptyInput();
  input.systemName = "Hidden Employment Risk";
  input.providerName = "Hiring Lab";
  input.systemDescription = "Ranks candidates and filters applicants for hiring decisions.";
  input.purpose = "Recruitment support";
  input.sector = "Employment";
  seedCore(input, {
    aiInputs: "Candidate profiles and application history",
    aiOutputs: "Candidate ranks and filter decisions",
    outputUsers: "Recruiters and hiring managers",
    actorRole: "deployer",
    systemType: "ai_system",
  });
  input.scope.usedInEU = true;
  input.decisionMode = "materially_influences_decision";
  input.decisionFacts.ranksPeople = true;
  input.decisionFacts.filtersPeople = true;
  input.controls.humanOversight = true;
  add("High-risk text with unchecked fields", input, "needs_review", "contradiction", ["Insufficient information", "Low"], undefined, 14, 55);
}

// 21. Cosmetics / sunscreen regression case
{
  const input = createEmptyInput();
  input.systemName = "Sunscreen Research Assistant";
  input.providerName = "SkinLab";
  input.systemDescription = "Internal R&D support for sunscreen and skincare research. The description is about the product more than the AI function, so the AI role stays somewhat unclear.";
  input.purpose = "Internal R&D support";
  input.sector = "Cosmetics / skincare";
  seedCore(input, {
    aiInputs: "Formulation notes, test measurements, research records",
    aiOutputs: "Internal summaries and candidate suggestions",
    outputUsers: "R&D staff and safety reviewers",
    actorRole: "deployer",
    systemType: "ai_system",
  });
  input.scope.usedInEU = true;
  input.interactionMode = "internal_only";
  input.decisionMode = "prepares_information";
  input.dataFacts.personalData = true;
  input.dataFacts.healthData = true;
  input.controls.humanOversight = true;
  input.nonAIActFlags.cosmeticsOrSkincare = true;
  input.nonAIActFlags.productSafety = true;
  input.nonAIActFlags.consumerProtection = true;
  add(
    "Cosmetics / sunscreen regression",
    input,
    "minimal",
    "low-risk",
    ["Medium", "Low"],
    (result) => {
      assert(result.aiFunctionUnclear, "Sunscreen case should be treated as aiFunctionUnclear");
      assert(result.nonAIActFlags.cosmeticsOrSkincare, "Cosmetics flag should be set");
      assert(result.informationGaps.some((item) => item.toLowerCase().includes("no evidence files")), "Sunscreen case should mention missing evidence");
    },
    18,
    55,
  );
}

// 22. GPAI model provider
{
  const input = createEmptyInput();
  input.systemName = "Foundation Model Maker";
  input.providerName = "ModelWorks";
  input.systemDescription = "Provides a general-purpose language model to customers and model integrators.";
  input.purpose = "GPAI model provision";
  input.sector = "AI platform";
  seedCore(input, {
    aiInputs: "Large-scale text corpora and training data",
    aiOutputs: "General-purpose model outputs",
    outputUsers: "API customers and downstream developers",
    actorRole: "provider",
    systemType: "gpai_model",
  });
  input.scope.usedInEU = true;
  input.interactionMode = "both";
  input.decisionMode = "prepares_information";
  input.controls.humanOversight = true;
  input.controls.dataGovernance = true;
  input.affectedPeople = ["API customers", "Downstream developers"];
  input.dataTypes = ["training data", "text corpora"];
  input.gpaI.developsModel = true;
  input.gpaI.systemicRiskIndicators = true;
  withEvidence(input, "Model card: foundation model, training overview, deployment notes, and safety review.");
  add(
    "GPAI model provider",
    input,
    "minimal",
    "GPAI obligations",
    ["Medium", "Low"],
    (result) => {
      assert(result.gpaIObligations.length > 0, "GPAI provider should surface GPAI obligations");
    },
    24,
    70,
  );
}

// 23. Third-party GPAI API used internally
{
  const input = createEmptyInput();
  input.systemName = "Internal GPT Assistant";
  input.providerName = "Ops Team";
  input.systemDescription = "Internal workflow assistant uses a third-party GPAI API to summarize requests and draft replies for staff review.";
  input.purpose = "Internal assistance";
  input.sector = "Operations";
  seedCore(input, {
    aiInputs: "Staff requests and internal notes",
    aiOutputs: "Summaries and draft replies",
    outputUsers: "Employees",
    actorRole: "deployer",
    systemType: "ai_system",
  });
  input.scope.usedInEU = true;
  input.interactionMode = "internal_only";
  input.decisionMode = "prepares_information";
  input.controls.humanOversight = true;
  input.controls.dataGovernance = true;
  input.gpaI.usesThirdPartyApi = true;
  input.nonAIActFlags.gdprPrivacy = true;
  input.affectedPeople = ["Employees"];
  input.dataTypes = ["internal notes", "personal data"];
  add(
    "Third-party GPAI API",
    input,
    "minimal",
    "GPAI obligations",
    ["Medium", "Low"],
    (result) => {
      assert(result.gpaIObligations.some((item) => item.toLowerCase().includes("deployer")), "Third-party GPAI should trigger deployer-oriented obligations");
    },
    20,
    68,
  );
}

const results: TestCaseResult[] = [];

for (const test of [
  {
    name: "Internal low-impact tool hides unrelated follow-ups",
    input: (() => {
      const input = createEmptyInput();
      input.systemName = "Internal Summary Helper";
      input.providerName = "Ops";
      input.systemDescription = "Summarizes internal notes for a small operations team.";
      input.purpose = "Internal summarization";
      input.sector = "Productivity";
      seedCore(input, {
        aiInputs: "Internal notes and task lists",
        aiOutputs: "Brief summaries and action items",
        outputUsers: "Internal team",
        actorRole: "deployer",
        systemType: "ai_system",
      });
      input.scope.usedInEU = true;
      input.interactionMode = "internal_only";
      input.decisionMode = "prepares_information";
      return input;
    })(),
    include: [] as string[],
    exclude: ["consumerPublic", "healthWellness", "biometric", "employment", "education", "creditInsurance", "publicServices", "lawMigrationJustice", "criticalInfrastructure", "gpai", "generatedContent", "childrenVulnerable"],
  },
  {
    name: "Customer chatbot shows consumer follow-ups",
    input: (() => {
      const input = createEmptyInput();
      input.systemName = "Support Chat";
      input.providerName = "Retail Team";
      input.systemDescription = "Customer support chatbot answers product questions and drafts messages shown to users.";
      input.purpose = "Customer support";
      input.sector = "Retail";
      seedCore(input, {
        aiInputs: "Customer questions and support context",
        aiOutputs: "Replies and draft answers",
        outputUsers: "Customers",
        actorRole: "deployer",
        systemType: "ai_system",
      });
      input.scope.usedInEU = true;
      input.interactionMode = "user_facing";
      input.contentFacts.directlyInteractsWithUsers = true;
      input.contentFacts.generatesPublicFacingContent = true;
      return input;
    })(),
    include: ["consumerPublic", "generatedContent"],
  },
  {
    name: "Health-adjacent case shows health follow-ups",
    input: (() => {
      const input = createEmptyInput();
      input.systemName = "Skincare Insight";
      input.providerName = "Cosmetics Lab";
      input.systemDescription = "Internal skincare analytics help the team evaluate sunscreen claims and product safety.";
      input.purpose = "Cosmetics research";
      input.sector = "Skincare";
      seedCore(input, {
        aiInputs: "Formulation notes, ingredient data, safety observations",
        aiOutputs: "Product summaries and risk flags",
        outputUsers: "Product team",
        actorRole: "deployer",
        systemType: "ai_system",
      });
      input.scope.usedInEU = true;
      input.dataFacts.healthData = true;
      input.nonAIActFlags.cosmeticsOrSkincare = true;
      return input;
    })(),
    include: ["healthWellness"],
    exclude: ["lawMigrationJustice", "employment", "education"],
  },
  {
    name: "Biometric use surfaces biometric follow-ups",
    input: (() => {
      const input = createEmptyInput();
      input.systemName = "Identity Review";
      input.providerName = "Security Unit";
      input.systemDescription = "The system analyzes face images to verify identity and infer possible emotion cues.";
      input.purpose = "Identity verification";
      input.sector = "Security";
      seedCore(input, {
        aiInputs: "Face images and voice samples",
        aiOutputs: "Identity match and trait scores",
        outputUsers: "Security staff",
        actorRole: "deployer",
        systemType: "ai_system",
      });
      input.scope.usedInEU = true;
      input.dataFacts.biometricData = true;
      input.prohibitedFacts.sensitiveBiometricCategorization = true;
      return input;
    })(),
    include: ["biometric"],
    exclude: ["employment", "education", "creditInsurance"],
  },
  {
    name: "Vague AI description is flagged as unclear",
    input: (() => {
      const input = createEmptyInput();
      input.systemName = "Undefined Product";
      input.providerName = "Unknown";
      input.systemDescription = "A business tool for making operations smoother.";
      input.purpose = "Business support";
      input.sector = "Operations";
      seedCore(input, {
        aiInputs: "",
        aiOutputs: "",
        outputUsers: "",
        actorRole: "unclear",
        systemType: "non_ai_or_unclear",
      });
      return input;
    })(),
    hintsInclude: ["AI function"],
  },
] as const) {
  try {
    const groups = getAdaptiveGroups(cloneInput(test.input)).map((group) => group.id as string);
    if (test.include) {
      for (const id of test.include) {
        assert(groups.includes(id), `${test.name} should include ${id}`);
      }
    }
    if (test.exclude) {
      for (const id of test.exclude) {
        assert(!groups.includes(id), `${test.name} should not include ${id}`);
      }
    }
    if (test.hintsInclude) {
      const hints = getReviewHints(cloneInput(test.input)).map((hint) => hint.label);
      for (const label of test.hintsInclude) {
        assert(hints.includes(label), `${test.name} should include review hint ${label}`);
      }
      assert(getIntakeState(cloneInput(test.input)) !== "Ready for provisional screening", `${test.name} should not be marked ready`);
    }
    results.push({ name: test.name, status: "pass", detail: "Passed" });
  } catch (error) {
    results.push({
      name: test.name,
      status: "fail",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

for (const testCase of scenarioTests) {
  try {
    const result = classifySystem(cloneInput(testCase.input));
    assert(result.tier === testCase.expectedTier, `${testCase.name} expected ${testCase.expectedTier} but got ${result.tier}`);
    assert(testCase.allowedLabels.includes(result.confidenceLabel), `${testCase.name} expected one of ${testCase.allowedLabels.join(", ")} confidence labels but got ${result.confidenceLabel}`);
    if (typeof testCase.minConfidence === "number") {
      assert(result.confidence >= testCase.minConfidence, `${testCase.name} confidence should be at least ${testCase.minConfidence} but was ${result.confidence}`);
    }
    if (typeof testCase.maxConfidence === "number") {
      assert(result.confidence <= testCase.maxConfidence, `${testCase.name} confidence should be at most ${testCase.maxConfidence} but was ${result.confidence}`);
    }
    assert(result.mainReason.toLowerCase().includes(testCase.expectedReason.toLowerCase()), `${testCase.name} main reason did not mention "${testCase.expectedReason}"`);
    testCase.extraCheck?.(result);
    results.push({ name: testCase.name, status: "pass", detail: "Passed" });
  } catch (error) {
    results.push({
      name: testCase.name,
      status: "fail",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

try {
  const input = cloneInput(scenarioTests[6].input);
  const result = classifySystem(input);
  const manifest = buildReportManifest(input, result);
  assert(manifest.system.name === input.systemName, "Manifest system name mismatch");
  assert(manifest.decision.tier === result.tier, "Manifest tier mismatch");
  assert(manifest.complianceBundle.checklist.length === result.checklist.length, "Manifest checklist mismatch");
  assert(manifest.complianceBundle.citations.length === result.citations.length, "Manifest citations mismatch");
  assert(Array.isArray(manifest.complianceBundle.modelTests), "Manifest model-test bundle missing");
  results.push({ name: "Report manifest", status: "pass", detail: "Passed" });
} catch (error) {
  results.push({
    name: "Report manifest",
    status: "fail",
    detail: error instanceof Error ? error.message : String(error),
  });
}

try {
  const input = cloneInput(scenarioTests[6].input);
  const first = classifySystem(input);
  const firstRecord = saveAuditRecord(input, first);

  const changed = cloneInput(input);
  changed.domains.productSafety = true;
  changed.evidenceDocuments = [makeEvidenceDocument("Technical documentation mentions logging, post-market monitoring, human review, and dataset imbalance.")];
  const second = classifySystem(changed);
  const secondRecord = saveAuditRecord(changed, second);
  const history = getAuditRecords();

  assert(firstRecord.version === 1, "First audit record should be version 1");
  assert(secondRecord.version === 2, "Second audit record should be version 2");
  assert(history.length === 2, "Expected two audit records");
  assert(secondRecord.changeLog.some((line) => line.includes("Domain")), "Domain change was not logged");
  assert(secondRecord.changeLog.some((line) => line.includes("Evidence")), "Evidence change was not logged");
  results.push({ name: "Audit layer", status: "pass", detail: "Passed" });
} catch (error) {
  results.push({
    name: "Audit layer",
    status: "fail",
    detail: error instanceof Error ? error.message : String(error),
  });
}

const failed = results.filter((testCase) => testCase.status === "fail").length;
const report: FullCycleTestReport = {
  generatedAt: new Date().toISOString(),
  status: failed ? "fail" : "pass",
  totals: {
    passed: results.length - failed,
    failed,
  },
  cases: results,
};

console.log(JSON.stringify(report, null, 2));

if (failed) {
  throw new Error(`${failed} full-cycle QA test${failed === 1 ? "" : "s"} failed`);
}
