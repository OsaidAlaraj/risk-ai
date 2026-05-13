import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  Play,
  Trash2,
  Upload,
} from "lucide-react";
import { useMemo, useState, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import { parseEvidenceFile } from "../evidence/evidenceValidator";
import type { ClassificationInput, ModelTestSelection } from "../engine/types";
import { getAdaptiveGroups, getAdjacentIssues, getReviewHints } from "../lib/questionFlow";
import { getIntakeState } from "../lib/assessmentSignals";
import { cx, formatDateTime } from "../lib/utils";
import { IntelligenceRail } from "./IntelligenceRail";
import { MobileCompanion } from "./MobileCompanion";
import { ProgressNavigation } from "./ProgressNavigation";
import {
  Card,
  ChipGroup,
  ChoiceGroup,
  Disclosure,
  EmptyState,
  Field,
  Input,
  QualityBadge,
  SectionBlock,
  TabNav,
  Textarea,
  ToggleRow,
} from "./FormComponents";

type WizardProps = {
  input: ClassificationInput;
  setInput: Dispatch<SetStateAction<ClassificationInput>>;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  onAnalyze: () => void;
  analyzing: boolean;
  error: string;
  examples?: Array<{ label: string; input: ClassificationInput }>;
  onLoadExample?: (example: ClassificationInput) => void;
};

const steps = [
  { title: "Briefing", detail: "Assessment overview" },
  { title: "Identity", detail: "Scope and role" },
  { title: "Function", detail: "Inputs and outputs" },
  { title: "Follow-ups", detail: "Context details" },
  { title: "Evidence", detail: "Support material" },
  { title: "Review", detail: "Final check" },
];

const peopleOptions = [
  "Consumers",
  "Employees",
  "Job applicants",
  "Students",
  "Patients",
  "Migrants",
  "Residents",
  "Children",
  "Public-service users",
];

const dataTypeOptions = [
  "Personal data",
  "Sensitive data",
  "Biometric data",
  "Health data",
  "Education records",
  "Employment history",
  "Location data",
  "Behavioral data",
  "Public records",
];

const decisionChoices: Array<{
  value: ClassificationInput["decisionMode"];
  title: string;
  detail: string;
}> = [
  { value: "prepares_information", title: "Prepares information", detail: "A person still makes the final call." },
  { value: "materially_influences_decision", title: "Materially influences", detail: "Shapes access, ranking, or approval." },
  { value: "automatically_decides", title: "Automatically decides", detail: "System finalizes the outcome." },
  { value: "unclear", title: "Not sure yet", detail: "Decision role is still unclear." },
];

const interactionChoices: Array<{
  value: ClassificationInput["interactionMode"];
  title: string;
  detail: string;
}> = [
  { value: "internal_only", title: "Internal only", detail: "Used inside one organization." },
  { value: "user_facing", title: "User-facing", detail: "People interact directly." },
  { value: "both", title: "Both", detail: "Internal and user-facing." },
  { value: "unclear", title: "Not sure yet", detail: "Use case still being defined." },
];

const actorChoices: Array<{
  value: ClassificationInput["actorRole"];
  title: string;
  detail: string;
}> = [
  { value: "provider", title: "Provider", detail: "Develops or places on market." },
  { value: "deployer", title: "Deployer", detail: "Uses in own work or service." },
  { value: "importer", title: "Importer", detail: "Brings into EU market." },
  { value: "distributor", title: "Distributor", detail: "Makes available unchanged." },
  { value: "product_manufacturer", title: "Product manufacturer", detail: "Embeds AI into product." },
  { value: "affected_person", title: "Affected person", detail: "Impacted by the output." },
  { value: "unclear", title: "Not sure yet", detail: "Role not obvious." },
];

const systemTypeChoices: Array<{
  value: ClassificationInput["systemType"];
  title: string;
  detail: string;
}> = [
  { value: "ai_system", title: "AI system", detail: "Standard AI application." },
  { value: "gpai_model", title: "GPAI model", detail: "General-purpose model." },
  { value: "gpai_model_systemic_risk", title: "GPAI systemic risk", detail: "Frontier or high-impact model." },
  { value: "embedded_product_component", title: "Embedded component", detail: "AI inside product." },
  { value: "non_ai_or_unclear", title: "Unclear / not AI", detail: "Description still vague." },
];

const modelTestOptions: Array<{
  id: keyof ModelTestSelection;
  title: string;
  detail: string;
}> = [
  { id: "bias", title: "Bias summary", detail: "Heuristic scan for sensitive attributes." },
  { id: "robustness", title: "Robustness summary", detail: "Scan for drift and reliability." },
  { id: "explainability", title: "Explainability summary", detail: "Checks oversight evidence." },
  { id: "adversarial", title: "Stress-test summary", detail: "Scan for stress-test indicators." },
];

type ToggleGroupMap = {
  scope: ClassificationInput["scope"];
  domains: ClassificationInput["domains"];
  dataFacts: ClassificationInput["dataFacts"];
  contentFacts: ClassificationInput["contentFacts"];
  controls: ClassificationInput["controls"];
  prohibitedFacts: ClassificationInput["prohibitedFacts"];
  decisionFacts: ClassificationInput["decisionFacts"];
  modelTests: ClassificationInput["modelTests"];
  gpaI: ClassificationInput["gpaI"];
  nonAIActFlags: ClassificationInput["nonAIActFlags"];
};

export function Wizard({
  input,
  setInput,
  currentStep,
  setCurrentStep,
  onAnalyze,
  analyzing,
  error,
  examples,
  onLoadExample,
}: WizardProps) {
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [functionTab, setFunctionTab] = useState("io");
  const [evidenceTab, setEvidenceTab] = useState("files");

  const update = <K extends keyof ClassificationInput>(
    key: K,
    value: ClassificationInput[K]
  ) => {
    setInput((prev) => ({ ...prev, [key]: value }));
  };

  const toggle = <K extends keyof ToggleGroupMap>(
    group: K,
    key: keyof ToggleGroupMap[K]
  ) => {
    setInput((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [key]: !Boolean((prev[group] as ToggleGroupMap[K])[key]),
      },
    }));
  };

  const toggleListValue = (field: "affectedPeople" | "dataTypes", value: string) => {
    setInput((prev) => {
      const selected = prev[field].includes(value);
      return {
        ...prev,
        [field]: selected
          ? prev[field].filter((item) => item !== value)
          : [...prev[field], value],
      };
    });
  };

  const handleEvidenceUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const target = event.currentTarget;
    const files = Array.from(target.files ?? []);
    if (!files.length) return;

    setUploadingEvidence(true);
    try {
      const documents = await Promise.all(files.map((file) => parseEvidenceFile(file)));
      setInput((prev) => ({
        ...prev,
        evidenceDocuments: [...prev.evidenceDocuments, ...documents],
      }));
    } finally {
      target.value = "";
      setUploadingEvidence(false);
    }
  };

  const removeEvidence = (id: string) => {
    setInput((prev) => ({
      ...prev,
      evidenceDocuments: prev.evidenceDocuments.filter((doc) => doc.id !== id),
    }));
  };

  const selectedFactCount =
    (input.actorRole !== "unclear" ? 1 : 0) +
    (input.systemType !== "non_ai_or_unclear" ? 1 : 0) +
    (input.aiInputs.trim() ? 1 : 0) +
    (input.aiOutputs.trim() ? 1 : 0) +
    (input.outputUsers.trim() ? 1 : 0) +
    Object.values(input.scope).filter(Boolean).length +
    Object.values(input.domains).filter(Boolean).length +
    Object.values(input.dataFacts).filter(Boolean).length +
    Object.values(input.contentFacts).filter(Boolean).length +
    Object.values(input.controls).filter(Boolean).length +
    Object.values(input.prohibitedFacts).filter(Boolean).length +
    Object.values(input.decisionFacts).filter(Boolean).length +
    Object.values(input.gpaI).filter(Boolean).length +
    Object.values(input.nonAIActFlags).filter(Boolean).length +
    input.affectedPeople.length +
    input.dataTypes.length;

  const selectedTestCount = Object.values(input.modelTests).filter(Boolean).length;
  const evidenceFindingCount = input.evidenceDocuments.reduce(
    (total, doc) => total + doc.extracted.length,
    0
  );
  const intakeState = useMemo(() => getIntakeState(input), [input]);
  const followUps = useMemo(() => getAdaptiveGroups(input), [input]);
  const reviewHints = useMemo(() => getReviewHints(input), [input]);
  const adjacentIssues = useMemo(() => getAdjacentIssues(input), [input]);
  const visibleFollowUps = useMemo(
    () => followUps.filter((g) => g.id !== "evidenceSafeguards"),
    [followUps]
  );
  const hasModelTestHooks =
    input.gpaI.developsModel ||
    input.gpaI.usesThirdPartyApi ||
    input.gpaI.systemicRiskIndicators ||
    input.systemType.startsWith("gpai");
  const canAnalyze = currentStep === steps.length - 1 && !analyzing;

  return (
    <section className="no-print container py-4">
      <ProgressNavigation
        steps={steps}
        currentStep={currentStep}
        onStepClick={setCurrentStep}
        readinessLabel={intakeState}
      />

      <div className="workspace mt-4">
        <div className="workspace-main">
          {/* Step 0: Briefing */}
          {currentStep === 0 && (
            <SectionBlock eyebrow="Welcome" title="AI Act Risk Classification">
              <div className="briefing-hero">
                <div className="briefing-content">
                  <span className="briefing-eyebrow">How it works</span>
                  <h3 className="briefing-title text-balance">
                    Answer questions once. The assessment adapts to your answers.
                  </h3>
                  <p className="briefing-description">
                    This guided interview separates legal tier, confidence, and evidence
                    so you can build a provisional compliance screening memo step by step.
                  </p>
                </div>
                <div className="briefing-actions">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="btn btn-primary btn-lg"
                  >
                    Start assessment
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {examples && examples.length > 0 && onLoadExample && (
                <Card title="Try an example" description="Load a pre-filled scenario to see how it works.">
                  <div className="sample-grid">
                    {examples.map((example) => (
                      <button
                        key={example.label}
                        type="button"
                        onClick={() => onLoadExample(example.input)}
                        className="sample-btn"
                      >
                        <span className="sample-icon">
                          <Play className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="sample-content">
                          <span className="sample-title">{example.label}</span>
                          <span className="sample-hint">Load example</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </Card>
              )}
            </SectionBlock>
          )}

          {/* Step 1: Identity */}
          {currentStep === 1 && (
            <SectionBlock eyebrow="Identity" title="Tell us about the system">
              <div className="flex flex-col gap-4">
                <Card title="Basic information" description="Name and context for the report.">
                  <div className="flex flex-col gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="System name" hint="Product or project name">
                        <Input
                          value={input.systemName}
                          onChange={(e) => update("systemName", e.target.value)}
                          placeholder="e.g. TalentRank"
                        />
                      </Field>
                      <Field label="Organization" hint="Responsible organization">
                        <Input
                          value={input.providerName}
                          onChange={(e) => update("providerName", e.target.value)}
                          placeholder="e.g. Northstar HR Labs"
                        />
                      </Field>
                    </div>
                    <Field label="Work area" hint="Business area, not legal label">
                      <Input
                        value={input.sector}
                        onChange={(e) => update("sector", e.target.value)}
                        placeholder="e.g. employment, healthcare, support"
                      />
                    </Field>
                    <Field label="System description" hint="What does it do?">
                      <Textarea
                        value={input.systemDescription}
                        onChange={(e) => update("systemDescription", e.target.value)}
                        placeholder="Describe the AI input, output, and human role..."
                        rows={4}
                      />
                    </Field>
                  </div>
                </Card>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card title="Actor role" description="Your relationship to the system.">
                    <ChoiceGroup
                      label=""
                      value={input.actorRole}
                      options={actorChoices}
                      onChoose={(v) => update("actorRole", v)}
                    />
                  </Card>

                  <Card title="System type" description="What kind of AI is it?">
                    <ChoiceGroup
                      label=""
                      value={input.systemType}
                      options={systemTypeChoices}
                      onChoose={(v) => update("systemType", v)}
                    />
                  </Card>
                </div>

                <Card title="EU scope" description="Does the AI Act apply?">
                  <div className="grid gap-2 sm:grid-cols-3">
                    {(
                      [
                        ["usedInEU", "Used in the EU"],
                        ["placedOnEUMarket", "Placed on EU market"],
                        ["affectsEUUsers", "Affects EU users"],
                      ] as const
                    ).map(([key, label]) => (
                      <ToggleRow
                        key={key}
                        title={label}
                        detail="Affects AI Act scope"
                        checked={input.scope[key]}
                        onToggle={() => toggle("scope", key)}
                      />
                    ))}
                  </div>
                </Card>
              </div>
            </SectionBlock>
          )}

          {/* Step 2: Function */}
          {currentStep === 2 && (
            <SectionBlock eyebrow="Function" title="What does the AI do?">
              <TabNav
                tabs={[
                  { id: "io", label: "Inputs / Outputs" },
                  { id: "users", label: "Users" },
                  { id: "impact", label: "Impact" },
                ]}
                activeTab={functionTab}
                onTabChange={setFunctionTab}
              />

              {functionTab === "io" && (
                <Card title="Inputs and outputs" description="What the AI consumes and produces.">
                  <div className="flex flex-col gap-4">
                    <Field label="What does the AI take in?" hint="Actual inputs">
                      <Textarea
                        value={input.aiInputs}
                        onChange={(e) => update("aiInputs", e.target.value)}
                        placeholder="e.g. applicant profiles, messages, images"
                        rows={3}
                      />
                    </Field>
                    <Field label="What does the AI produce?" hint="Actual outputs">
                      <Textarea
                        value={input.aiOutputs}
                        onChange={(e) => update("aiOutputs", e.target.value)}
                        placeholder="e.g. rankings, summaries, predictions"
                        rows={3}
                      />
                    </Field>
                  </div>
                </Card>
              )}

              {functionTab === "users" && (
                <Card title="Who uses it?" description="Internal, external, or both.">
                  <div className="flex flex-col gap-4">
                    <Field label="Who relies on the output?" hint="Who acts on it?">
                      <Input
                        value={input.outputUsers}
                        onChange={(e) => update("outputUsers", e.target.value)}
                        placeholder="e.g. recruiters, doctors, customers"
                      />
                    </Field>
                    <ChoiceGroup
                      label="Interaction mode"
                      value={input.interactionMode}
                      options={interactionChoices}
                      onChoose={(v) => update("interactionMode", v)}
                      columns={2}
                    />
                    <ChoiceGroup
                      label="Decision role"
                      value={input.decisionMode}
                      options={decisionChoices}
                      onChoose={(v) => update("decisionMode", v)}
                      columns={2}
                    />
                  </div>
                </Card>
              )}

              {functionTab === "impact" && (
                <Card title="People and impact" description="Who is affected and how.">
                  <div className="flex flex-col gap-4">
                    <ChipGroup
                      label="Who could be affected?"
                      values={peopleOptions}
                      selected={input.affectedPeople}
                      onToggle={(v) => toggleListValue("affectedPeople", v)}
                    />
                    <ChipGroup
                      label="What data does it use?"
                      values={dataTypeOptions}
                      selected={input.dataTypes}
                      onToggle={(v) => toggleListValue("dataTypes", v)}
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      {(
                        [
                          ["ranksPeople", "Ranks people"],
                          ["scoresPeople", "Scores people"],
                          ["filtersPeople", "Filters people"],
                          ["approvesRejectsPeople", "Approves / rejects"],
                          ["recommendsPeople", "Recommends people"],
                          ["assessesPeople", "Assesses people"],
                        ] as const
                      ).map(([key, title]) => (
                        <ToggleRow
                          key={key}
                          title={title}
                          detail="Affects outcomes"
                          checked={input.decisionFacts[key]}
                          onToggle={() => toggle("decisionFacts", key)}
                        />
                      ))}
                    </div>
                  </div>
                </Card>
              )}
            </SectionBlock>
          )}

          {/* Step 3: Follow-ups */}
          {currentStep === 3 && (
            <SectionBlock eyebrow="Follow-ups" title="Additional context">
              {visibleFollowUps.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 className="h-6 w-6" />}
                  title="No additional follow-ups"
                  description="Your answers don't require extra context right now. You can continue to evidence."
                  action={
                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="btn btn-primary"
                    >
                      Continue to evidence
                    </button>
                  }
                />
              ) : (
                <div className="flex flex-col gap-4">
                  {visibleFollowUps.map((group) => (
                    <Card
                      key={group.id}
                      title={group.title}
                      description={group.reason}
                    >
                      <div className="flex flex-col gap-3">
                        <p className="text-sm text-muted-foreground">{group.why}</p>
                        {renderAdaptiveGroup(group.id, input, update, toggle)}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </SectionBlock>
          )}

          {/* Step 4: Evidence */}
          {currentStep === 4 && (
            <SectionBlock eyebrow="Evidence" title="Support material">
              <TabNav
                tabs={[
                  { id: "files", label: "Evidence files" },
                  { id: "safeguards", label: "Safeguards" },
                  ...(hasModelTestHooks
                    ? [{ id: "model", label: "Model checks" }]
                    : []),
                ]}
                activeTab={evidenceTab}
                onTabChange={setEvidenceTab}
              />

              {evidenceTab === "files" && (
                <Card
                  title="Evidence files"
                  description="Upload documents that support your answers."
                >
                  <div className="flex flex-col gap-4">
                    <label className="upload-zone">
                      <Upload
                        className="upload-icon h-8 w-8"
                        aria-hidden="true"
                      />
                      <span className="upload-title">
                        {uploadingEvidence
                          ? "Reading files..."
                          : "Upload model cards, datasets, logs, or technical notes"}
                      </span>
                      <span className="upload-hint">
                        Text files are scanned for support signals
                      </span>
                      <input
                        type="file"
                        multiple
                        accept=".txt,.md,.csv,.json,.log"
                        className="sr-only"
                        onChange={handleEvidenceUpload}
                        disabled={uploadingEvidence}
                      />
                    </label>

                    {input.evidenceDocuments.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground">
                        No evidence uploaded. The report will be questionnaire-based.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {input.evidenceDocuments.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between gap-3 rounded-lg border p-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {doc.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {doc.extracted.length} signals extracted
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeEvidence(doc.id)}
                              className="btn btn-ghost btn-icon"
                              aria-label={`Remove ${doc.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {evidenceTab === "safeguards" && (
                <Card
                  title="Safeguards"
                  description="Controls and checks around the system."
                >
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(
                      [
                        ["humanOversight", "Human oversight", "Review, override, or stop"],
                        ["appealPath", "Appeal path", "Challenge or escalate results"],
                        ["dataGovernance", "Data governance", "Documented and checked"],
                        ["disclosure", "Disclosure", "Users know AI is involved"],
                      ] as const
                    ).map(([key, title, detail]) => (
                      <ToggleRow
                        key={key}
                        title={title}
                        detail={detail}
                        checked={input.controls[key]}
                        onToggle={() => toggle("controls", key)}
                      />
                    ))}
                  </div>
                </Card>
              )}

              {evidenceTab === "model" && hasModelTestHooks && (
                <Card
                  title="Model checks"
                  description="Heuristic summaries for GPAI-style models."
                >
                  <div className="grid gap-2 sm:grid-cols-2">
                    {modelTestOptions.map((item) => (
                      <ToggleRow
                        key={item.id}
                        title={item.title}
                        detail={item.detail}
                        checked={input.modelTests[item.id]}
                        onToggle={() => toggle("modelTests", item.id)}
                      />
                    ))}
                  </div>
                </Card>
              )}
            </SectionBlock>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <SectionBlock eyebrow="Review" title="Final check before generating">
              <div className="flex flex-col gap-4">
                <Card
                  title="Input quality"
                  description="Assessment readiness status."
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <QualityBadge label={intakeState} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {intakeState === "Ready for provisional screening"
                        ? "The intake has enough context for a provisional screen."
                        : intakeState === "Needs clarification"
                          ? "A few areas need more context."
                          : intakeState === "High uncertainty"
                            ? "The use case is still broad."
                            : "The core AI function is too unclear."}
                    </p>
                    {reviewHints.length > 0 && (
                      <div className="flex flex-col gap-2">
                        {reviewHints.map((hint) => (
                          <div
                            key={hint.label}
                            className="signal-card"
                            data-tone="warning"
                          >
                            <div className="signal-content">
                              <span className="signal-title">{hint.label}</span>
                              <span className="signal-description">
                                {hint.detail}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Disclosure title="Adjacent issues" defaultOpen={adjacentIssues.length > 0}>
                    {adjacentIssues.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No additional issues surfaced.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {adjacentIssues.map((issue) => (
                          <div
                            key={issue}
                            className="rounded-md border px-3 py-2 text-sm text-muted-foreground"
                          >
                            {issue}
                          </div>
                        ))}
                      </div>
                    )}
                  </Disclosure>

                  <Disclosure title="Notes and assumptions">
                    <div className="flex flex-col gap-3">
                      <p className="text-sm text-muted-foreground">
                        {input.evidenceDocuments.length
                          ? "Evidence can compare with questionnaire answers."
                          : "No evidence uploaded. Report will be provisional."}
                      </p>
                      <Textarea
                        value={input.uncertaintyNotes}
                        onChange={(e) => update("uncertaintyNotes", e.target.value)}
                        placeholder="Add notes about uncertainties..."
                        rows={3}
                      />
                      <ToggleRow
                        title="Show legal basis"
                        detail="Expand legal references in report"
                        checked={input.showLegalBasis}
                        onToggle={() => update("showLegalBasis", !input.showLegalBasis)}
                      />
                    </div>
                  </Disclosure>
                </div>
              </div>
            </SectionBlock>
          )}

          {/* Error display */}
          {error && (
            <div className="signal-card" data-tone="danger">
              <div className="signal-content">
                <span className="signal-title">Error</span>
                <span className="signal-description">{error}</span>
              </div>
            </div>
          )}

          {/* Action dock */}
          <div className="action-dock">
            <div className="action-dock-inner">
              <button
                type="button"
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0 || analyzing}
                className="btn btn-secondary"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </button>

              {currentStep < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={analyzing}
                  className="btn btn-primary"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onAnalyze}
                  disabled={analyzing || !canAnalyze}
                  className="btn btn-accent"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      Generate report
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Intelligence companion sidebar */}
        <div className="workspace-aside">
          <IntelligenceRail
            input={input}
            currentStep={currentStep}
            selectedFactCount={selectedFactCount}
            selectedTestCount={selectedTestCount}
            evidenceFindingCount={evidenceFindingCount}
          />
        </div>

        <MobileCompanion
          input={input}
          currentStep={currentStep}
          selectedFactCount={selectedFactCount}
          selectedTestCount={selectedTestCount}
          evidenceFindingCount={evidenceFindingCount}
        />
      </div>
    </section>
  );
}

// ==================== ADAPTIVE GROUP RENDERER ====================
function renderAdaptiveGroup(
  groupId: string,
  input: ClassificationInput,
  update: <K extends keyof ClassificationInput>(key: K, value: ClassificationInput[K]) => void,
  toggle: <K extends keyof ToggleGroupMap>(group: K, key: keyof ToggleGroupMap[K]) => void
) {
  switch (groupId) {
    case "consumerPublic":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow
            title="Generates public content"
            detail="Content seen by users or public"
            checked={input.contentFacts.generatesPublicFacingContent}
            onToggle={() => toggle("contentFacts", "generatesPublicFacingContent")}
          />
          <ToggleRow
            title="Direct interaction"
            detail="Users interact with the AI"
            checked={input.contentFacts.directlyInteractsWithUsers}
            onToggle={() => toggle("contentFacts", "directlyInteractsWithUsers")}
          />
          <ToggleRow
            title="Synthetic content"
            detail="Creates realistic synthetic media"
            checked={input.contentFacts.createsRealisticSyntheticContent}
            onToggle={() => toggle("contentFacts", "createsRealisticSyntheticContent")}
          />
          <ToggleRow
            title="Consumer protection"
            detail="May need consumer law review"
            checked={input.nonAIActFlags.consumerProtection}
            onToggle={() => toggle("nonAIActFlags", "consumerProtection")}
          />
        </div>
      );

    case "healthWellness":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow
            title="Healthcare domain"
            detail="Medical or health-related"
            checked={input.domains.healthcare}
            onToggle={() => toggle("domains", "healthcare")}
          />
          <ToggleRow
            title="Health data"
            detail="Processes health information"
            checked={input.dataFacts.healthData}
            onToggle={() => toggle("dataFacts", "healthData")}
          />
          <ToggleRow
            title="Medical device"
            detail="May be regulated as medical device"
            checked={input.nonAIActFlags.medicalDeviceOrHealthRegulation}
            onToggle={() => toggle("nonAIActFlags", "medicalDeviceOrHealthRegulation")}
          />
          <ToggleRow
            title="Cosmetics / skincare"
            detail="Beauty or skincare context"
            checked={input.nonAIActFlags.cosmeticsOrSkincare}
            onToggle={() => toggle("nonAIActFlags", "cosmeticsOrSkincare")}
          />
        </div>
      );

    case "biometric":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow
            title="Biometric data"
            detail="Face, voice, body data"
            checked={input.dataFacts.biometricData}
            onToggle={() => toggle("dataFacts", "biometricData")}
          />
          <ToggleRow
            title="Biometric categorization"
            detail="Infers traits from biometrics"
            checked={input.prohibitedFacts.sensitiveBiometricCategorization}
            onToggle={() => toggle("prohibitedFacts", "sensitiveBiometricCategorization")}
          />
          <ToggleRow
            title="Real-time identification"
            detail="Public space biometric ID"
            checked={input.prohibitedFacts.realTimePublicSpaceBiometricIdentification}
            onToggle={() => toggle("prohibitedFacts", "realTimePublicSpaceBiometricIdentification")}
          />
          <ToggleRow
            title="Emotion recognition"
            detail="Workplace or education setting"
            checked={input.prohibitedFacts.workplaceOrEducationEmotionRecognition}
            onToggle={() => toggle("prohibitedFacts", "workplaceOrEducationEmotionRecognition")}
          />
        </div>
      );

    case "employment":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow
            title="Employment domain"
            detail="Hiring, worker management"
            checked={input.domains.employment}
            onToggle={() => toggle("domains", "employment")}
          />
          <ToggleRow
            title="Employment law"
            detail="May need labor law review"
            checked={input.nonAIActFlags.employmentLabor}
            onToggle={() => toggle("nonAIActFlags", "employmentLabor")}
          />
        </div>
      );

    case "education":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow
            title="Education domain"
            detail="Admission, grading, learning"
            checked={input.domains.education}
            onToggle={() => toggle("domains", "education")}
          />
          <ToggleRow
            title="Children affected"
            detail="Students or minors"
            checked={input.nonAIActFlags.childrenOrVulnerableUsers}
            onToggle={() => toggle("nonAIActFlags", "childrenOrVulnerableUsers")}
          />
        </div>
      );

    case "creditInsurance":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow
            title="Finance domain"
            detail="Credit, loans, banking"
            checked={input.domains.finance}
            onToggle={() => toggle("domains", "finance")}
          />
          <ToggleRow
            title="Insurance domain"
            detail="Pricing, eligibility"
            checked={input.domains.insurance}
            onToggle={() => toggle("domains", "insurance")}
          />
          <ToggleRow
            title="Financial services"
            detail="Sector-specific regulation"
            checked={input.nonAIActFlags.financialServices}
            onToggle={() => toggle("nonAIActFlags", "financialServices")}
          />
        </div>
      );

    case "publicServices":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow
            title="Public services"
            detail="Benefits, government services"
            checked={input.domains.publicServices}
            onToggle={() => toggle("domains", "publicServices")}
          />
        </div>
      );

    case "lawMigrationJustice":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow
            title="Law enforcement"
            detail="Policing, evidence support"
            checked={input.domains.lawEnforcement}
            onToggle={() => toggle("domains", "lawEnforcement")}
          />
          <ToggleRow
            title="Migration"
            detail="Visa, asylum, border control"
            checked={input.domains.migration}
            onToggle={() => toggle("domains", "migration")}
          />
          <ToggleRow
            title="Justice"
            detail="Courts, legal interpretation"
            checked={input.domains.justice}
            onToggle={() => toggle("domains", "justice")}
          />
        </div>
      );

    case "criticalInfrastructure":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow
            title="Critical infrastructure"
            detail="Essential services safety"
            checked={input.domains.criticalInfrastructure}
            onToggle={() => toggle("domains", "criticalInfrastructure")}
          />
          <ToggleRow
            title="Product safety"
            detail="Regulated product component"
            checked={input.domains.productSafety}
            onToggle={() => toggle("domains", "productSafety")}
          />
        </div>
      );

    case "gpai":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow
            title="Develops model"
            detail="Creates or trains the model"
            checked={input.gpaI.developsModel}
            onToggle={() => toggle("gpaI", "developsModel")}
          />
          <ToggleRow
            title="Third-party API"
            detail="Uses external model API"
            checked={input.gpaI.usesThirdPartyApi}
            onToggle={() => toggle("gpaI", "usesThirdPartyApi")}
          />
          <ToggleRow
            title="Systemic risk"
            detail="Frontier or high-impact model"
            checked={input.gpaI.systemicRiskIndicators}
            onToggle={() => toggle("gpaI", "systemicRiskIndicators")}
          />
        </div>
      );

    case "generatedContent":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow
            title="Public content"
            detail="Generated content visible"
            checked={input.contentFacts.generatesPublicFacingContent}
            onToggle={() => toggle("contentFacts", "generatesPublicFacingContent")}
          />
          <ToggleRow
            title="Synthetic media"
            detail="Realistic generated media"
            checked={input.contentFacts.createsRealisticSyntheticContent}
            onToggle={() => toggle("contentFacts", "createsRealisticSyntheticContent")}
          />
          <ToggleRow
            title="IP / Copyright"
            detail="May need IP review"
            checked={input.nonAIActFlags.ipCopyright}
            onToggle={() => toggle("nonAIActFlags", "ipCopyright")}
          />
        </div>
      );

    case "childrenVulnerable":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow
            title="Children / vulnerable"
            detail="Minors or vulnerable groups"
            checked={input.nonAIActFlags.childrenOrVulnerableUsers}
            onToggle={() => toggle("nonAIActFlags", "childrenOrVulnerableUsers")}
          />
          <ToggleRow
            title="Vulnerable exploitation"
            detail="May exploit vulnerabilities"
            checked={input.prohibitedFacts.vulnerableGroups}
            onToggle={() => toggle("prohibitedFacts", "vulnerableGroups")}
          />
        </div>
      );

    default:
      return null;
  }
}
