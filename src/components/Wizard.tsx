import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, Info, Loader2, Sparkles, Trash2, UploadCloud } from "lucide-react";
import { useMemo, useState, type ChangeEvent, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { parseEvidenceFile } from "../evidence/evidenceValidator";
import type { ClassificationInput, ModelTestSelection } from "../engine/types";
import { getAdaptiveGroups, getAdjacentIssues, getReviewHints } from "../lib/questionFlow";
import { getIntakeSignals, getIntakeState } from "../lib/assessmentSignals";
import { cx, formatDateTime } from "../lib/utils";
import { IntelligenceRail } from "./IntelligenceRail";

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
  { title: "Briefing", detail: "What this assessment does" },
  { title: "Identity", detail: "Scope, role, and system type" },
  { title: "AI Function", detail: "Inputs, outputs, and impact" },
  { title: "Follow-ups", detail: "Only what is now relevant" },
  { title: "Evidence", detail: "Documents and safeguards" },
  { title: "Review", detail: "Check facts before report" },
];

const functionSections = [
  {
    title: "Inputs / outputs",
    detail: "What the AI reads and what it produces.",
  },
  {
    title: "Who relies on it?",
    detail: "Who sees, relies on, or acts on the output.",
  },
  {
    title: "People / impact",
    detail: "Who is affected and whether the output changes access or rights.",
  },
] as const;

const supportSections = [
  {
    title: "Evidence",
    detail: "Upload the material that supports the assessment.",
  },
  {
    title: "Safeguards",
    detail: "Show the controls and checks around the system.",
  },
  {
    title: "Model checks",
    detail: "Only relevant when a GPAI-style model is involved.",
  },
] as const;

const peopleOptions = ["Consumers", "Employees", "Job applicants", "Students", "Patients", "Migrants", "Residents", "Children", "Public-service users"];

const dataTypeOptions = ["Personal data", "Sensitive data", "Biometric data", "Health data", "Education records", "Employment history", "Location data", "Behavioral data", "Public records"];

const decisionChoices: Array<{ value: ClassificationInput["decisionMode"]; title: string; detail: string }> = [
  { value: "prepares_information", title: "Prepares information", detail: "A person still makes the final call." },
  { value: "materially_influences_decision", title: "Materially influences", detail: "The output shapes access, ranking, approval, or rejection." },
  { value: "automatically_decides", title: "Automatically decides", detail: "The system itself decides or finalizes the outcome." },
  { value: "unclear", title: "Not sure yet", detail: "Use this if the decision role is still unclear." },
];

const interactionChoices: Array<{ value: ClassificationInput["interactionMode"]; title: string; detail: string }> = [
  { value: "internal_only", title: "Internal only", detail: "Used inside one organization." },
  { value: "user_facing", title: "User-facing", detail: "People directly interact with the AI." },
  { value: "both", title: "Both", detail: "Internal and user-facing." },
  { value: "unclear", title: "Not sure yet", detail: "Leave this if the use case is still being defined." },
];

const actorChoices: Array<{ value: ClassificationInput["actorRole"]; title: string; detail: string }> = [
  { value: "provider", title: "Provider", detail: "Develops or places the AI system on the market." },
  { value: "deployer", title: "Deployer", detail: "Uses the AI system in its own work or service." },
  { value: "importer", title: "Importer", detail: "Brings a system into the EU market." },
  { value: "distributor", title: "Distributor", detail: "Makes the system available without changing it." },
  { value: "product_manufacturer", title: "Product manufacturer", detail: "Embeds the AI into a product or safety component." },
  { value: "affected_person", title: "Affected person", detail: "Impacted by the output, not the operator." },
  { value: "unclear", title: "Not sure yet", detail: "Use this if the role is not obvious." },
];

const systemTypeChoices: Array<{ value: ClassificationInput["systemType"]; title: string; detail: string }> = [
  { value: "ai_system", title: "AI system", detail: "A normal AI application or workflow." },
  { value: "gpai_model", title: "GPAI model", detail: "A general-purpose model or model API." },
  { value: "gpai_model_systemic_risk", title: "GPAI with possible systemic risk", detail: "A frontier model or high-impact model." },
  { value: "embedded_product_component", title: "Embedded product component", detail: "AI inside a product, device, or safety-related component." },
  { value: "non_ai_or_unclear", title: "Unclear / not AI", detail: "Use if the description is still vague." },
];

const modelTestOptions: Array<{ id: keyof ModelTestSelection; title: string; detail: string }> = [
  { id: "bias", title: "Bias summary", detail: "Heuristic scan for sensitive attributes or dataset-quality warnings." },
  { id: "robustness", title: "Robustness summary", detail: "Heuristic scan for drift, false results, or reliability warnings." },
  { id: "explainability", title: "Explainability summary", detail: "Checks whether oversight evidence is present." },
  { id: "adversarial", title: "Stress-test summary", detail: "Heuristic scan for stress-test indicators." },
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

export function Wizard({ input, setInput, currentStep, setCurrentStep, onAnalyze, analyzing, error, examples, onLoadExample }: WizardProps) {
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [functionFocus, setFunctionFocus] = useState(0);
  const [followUpFocus, setFollowUpFocus] = useState(0);
  const [supportFocus, setSupportFocus] = useState(0);

  const update = <K extends keyof ClassificationInput>(key: K, value: ClassificationInput[K]) => {
    setInput((previous) => ({ ...previous, [key]: value }));
  };

  const toggle = <K extends keyof ToggleGroupMap>(group: K, key: keyof ToggleGroupMap[K]) => {
    setInput((previous) => ({
      ...previous,
      [group]: (() => {
        const current = previous[group] as ToggleGroupMap[K];
        return {
          ...current,
          [key]: !Boolean(current[key]),
        };
      })(),
    }));
  };

  const toggleListValue = (field: "affectedPeople" | "dataTypes", value: string) => {
    setInput((previous) => {
      const selected = previous[field].includes(value);
      return {
        ...previous,
        [field]: selected ? previous[field].filter((item) => item !== value) : [...previous[field], value],
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
      setInput((previous) => ({
        ...previous,
        evidenceDocuments: [...previous.evidenceDocuments, ...documents],
      }));
    } finally {
      target.value = "";
      setUploadingEvidence(false);
    }
  };

  const removeEvidence = (id: string) => {
    setInput((previous) => ({
      ...previous,
      evidenceDocuments: previous.evidenceDocuments.filter((document) => document.id !== id),
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
  const evidenceFindingCount = input.evidenceDocuments.reduce((total, document) => total + document.extracted.length, 0);
  const intakeState = useMemo(() => getIntakeState(input), [input]);
  const signals = useMemo(() => getIntakeSignals(input), [input]);
  const followUps = useMemo(() => getAdaptiveGroups(input), [input]);
  const reviewHints = useMemo(() => getReviewHints(input), [input]);
  const adjacentIssues = useMemo(() => getAdjacentIssues(input), [input]);
  const visibleFollowUps = useMemo(() => followUps.filter((group) => group.id !== "evidenceSafeguards"), [followUps]);
  const hasModelTestHooks =
    input.gpaI.developsModel ||
    input.gpaI.usesThirdPartyApi ||
    input.gpaI.systemicRiskIndicators ||
    input.systemType.startsWith("gpai");
  const supportTabs = hasModelTestHooks ? supportSections : supportSections.slice(0, 2);
  const activeFollowUpFocus = visibleFollowUps.length ? Math.min(followUpFocus, visibleFollowUps.length - 1) : 0;
  const activeSupportFocus = supportTabs.length ? Math.min(supportFocus, supportTabs.length - 1) : 0;
  const canAnalyze = currentStep === steps.length - 1 && !analyzing;

  return (
    <section id="classifier" className="no-print page-grid py-6">
      <div className="journey-shell">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-2xl">
            <p className="section-eyebrow">Guided assessment</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">{steps[currentStep].title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{steps[currentStep].detail}</p>
          </div>

          <div className="journey-meter" aria-label={`Step ${currentStep + 1} of ${steps.length}`}>
            <span className="text-xs font-semibold text-muted">Step {currentStep + 1} / {steps.length}</span>
            <span className="readiness-pill">{intakeState}</span>
          </div>
        </div>

        <div className="step-track mt-5" role="tablist" aria-label="Assessment steps">
          {steps.map((step, index) => {
            const active = index === currentStep;
            const complete = index < currentStep;
            return (
              <button
                key={step.title}
                type="button"
                role="tab"
                aria-selected={active}
                aria-current={active ? "step" : undefined}
                onClick={() => setCurrentStep(index)}
                className={cx(
                  "step-node",
                  active && "step-node-active",
                  complete && !active && "step-node-complete",
                )}
              >
                <span className="step-index">
                  {complete ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block font-medium text-inherit">{step.title}</span>
                  <span className="block text-xs leading-5 text-muted">{step.detail}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="progress-rail mt-5">
          <div className="progress-rail-fill" style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} />
        </div>
      </div>

      <div className="assessment-workspace">
        <div className="space-y-6">
          <div className="lg:hidden">
            <CompactSummary
              input={input}
              intakeState={intakeState}
              selectedFactCount={selectedFactCount}
              selectedTestCount={selectedTestCount}
              evidenceFindingCount={evidenceFindingCount}
            />
          </div>

          {currentStep === 0 && (
            <BriefingStep
              examples={examples}
              onLoadExample={onLoadExample}
              onContinue={() => setCurrentStep(1)}
            />
          )}

          {currentStep === 1 && (
            <SectionBlock eyebrow="Core identity" title="Tell us what the system is before we talk about law.">
              <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr_1fr]">
                <Card title="Organization and context" why="We need the name, provider, and sector to place the system in context.">
                  <div className="space-y-3">
                    <Field label="System name" help="The product or project name that will appear in the report.">
                      <input value={input.systemName} onChange={(event) => update("systemName", event.target.value)} placeholder="e.g. TalentRank" className="quiet-input" />
                    </Field>
                    <Field label="Organization or provider" help="The organization responsible for the system.">
                      <input value={input.providerName} onChange={(event) => update("providerName", event.target.value)} placeholder="e.g. Northstar HR Labs" className="quiet-input" />
                    </Field>
                    <Field label="Work area" help="Use the business area, not a legal label.">
                      <input value={input.sector} onChange={(event) => update("sector", event.target.value)} placeholder="e.g. employment, healthcare, support" className="quiet-input" />
                    </Field>
                  </div>
                </Card>

                <Card title="Scope, role, and system type" why="EU scope, actor role, and system type decide which legal gates we need to check first.">
                  <div className="space-y-4">
                    <ChoiceGroup label="Actor role" value={input.actorRole} options={actorChoices} onChoose={(value) => update("actorRole", value)} />
                    <ChoiceGroup label="System type" value={input.systemType} options={systemTypeChoices} onChoose={(value) => update("systemType", value)} />
                    <div>
                      <p className="mb-2 text-sm font-semibold text-slate-900">EU scope</p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {(
                          [
                            ["usedInEU", "Used in the EU"],
                            ["placedOnEUMarket", "Placed on EU market"],
                            ["affectsEUUsers", "Affects EU users"],
                          ] as Array<[keyof ClassificationInput["scope"], string]>
                        ).map(([key, label]) => (
                          <ToggleRow
                            key={key}
                            title={label}
                            detail="This affects whether the AI Act scope is established."
                            checked={input.scope[key]}
                            onToggle={() => toggle("scope", key)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>

                <Card title="Short description" why="The report depends on what the AI does, who relies on it, and how it is used.">
                  <Field label="System description" help="Include the AI input, output, and the human role.">
                    <textarea
                      value={input.systemDescription}
                      onChange={(event) => update("systemDescription", event.target.value)}
                      placeholder="Example: The model reads applicant profiles, ranks candidates, and recommends shortlists to recruiters. Recruiters review the ranking before interviews are scheduled."
                      rows={9}
                      className="quiet-textarea resize-none"
                    />
                  </Field>
                </Card>
              </div>
            </SectionBlock>
          )}

          {currentStep === 2 && (
            <SectionBlock eyebrow="AI function" title="Focus on the inputs, outputs, and who depends on the result.">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {functionSections.map((section, index) => (
                    <button
                      key={section.title}
                      type="button"
                      onClick={() => setFunctionFocus(index)}
                      className={cx(
                        "rounded-full border px-3 py-2 text-left text-sm font-semibold transition duration-200",
                        functionFocus === index ? "border-[#d7c19a] bg-[#fff9ef] text-slate-950" : "border-slate-200 bg-white text-slate-600 hover:border-[#d7c19a] hover:text-slate-950",
                      )}
                    >
                      <span className="block">{section.title}</span>
                      <span className="mt-1 block text-[0.72rem] font-normal leading-5 text-slate-500">{section.detail}</span>
                    </button>
                  ))}
                </div>

                {functionFocus === 0 && (
                  <Card title="Inputs and outputs" why="These fields tell us what the AI actually consumes and produces.">
                    <div className="space-y-3">
                      <Field label="What does the AI take in?" help="Describe the actual inputs that the system uses.">
                        <textarea value={input.aiInputs} onChange={(event) => update("aiInputs", event.target.value)} placeholder="e.g. applicant profiles, messages, images, sensor data" rows={4} className="quiet-textarea resize-none" />
                      </Field>
                      <Field label="What does the AI produce?" help="Describe the actual output that people see or rely on.">
                        <textarea value={input.aiOutputs} onChange={(event) => update("aiOutputs", event.target.value)} placeholder="e.g. rankings, summaries, labels, predictions" rows={4} className="quiet-textarea resize-none" />
                      </Field>
                    </div>
                  </Card>
                )}

                {functionFocus === 1 && (
                  <Card title="Who uses it?" why="We need to know whether the AI is internal support, user-facing, or both.">
                    <div className="space-y-3">
                      <Field label="Who relies on the output?" help="Who reads, uses, or acts on the AI output?">
                        <input value={input.outputUsers} onChange={(event) => update("outputUsers", event.target.value)} placeholder="e.g. recruiters, doctors, customers, teachers" className="quiet-input" />
                      </Field>
                      <ChoiceGroup label="Interaction mode" value={input.interactionMode} options={interactionChoices} onChoose={(value) => update("interactionMode", value)} />
                      <ChoiceGroup label="Decision role" value={input.decisionMode} options={decisionChoices} onChoose={(value) => update("decisionMode", value)} />
                    </div>
                  </Card>
                )}

                {functionFocus === 2 && (
                  <Card title="People, data, and decision signals" why="These answers tell us whether the output affects people's opportunities, access, or rights.">
                    <div className="space-y-4">
                      <ChipGroup label="Who could be affected?" values={peopleOptions} selected={input.affectedPeople} onToggle={(value) => toggleListValue("affectedPeople", value)} />
                      <ChipGroup label="What data does it use?" values={dataTypeOptions} selected={input.dataTypes} onToggle={(value) => toggleListValue("dataTypes", value)} />
                      <div className="grid gap-2 sm:grid-cols-2">
                        {(
                          [
                            ["ranksPeople", "Ranks people"],
                            ["scoresPeople", "Scores people"],
                            ["filtersPeople", "Filters people"],
                            ["approvesRejectsPeople", "Approves / rejects people"],
                            ["recommendsPeople", "Recommends people"],
                            ["assessesPeople", "Assesses people"],
                          ] as const
                        ).map(([key, title]) => (
                          <ToggleRow
                            key={key}
                            title={title}
                            detail="This can materially affect a person's outcome or access."
                            checked={input.decisionFacts[key]}
                            onToggle={() => toggle("decisionFacts", key)}
                          />
                        ))}
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </SectionBlock>
          )}

          {currentStep === 3 && (
            <SectionBlock eyebrow="Adaptive follow-ups" title="We are only showing the follow-ups your answers made relevant.">
              {visibleFollowUps.length === 0 ? (
                <EmptyState
                  title="No additional follow-ups yet"
                  detail="Once you add a more specific use case, extra review cards will appear here."
                  note="You can continue now, but the report will stay provisional until the facts are clearer."
                  actionLabel="Continue to evidence"
                  onAction={() => setCurrentStep(4)}
                />
              ) : (
                <div className="space-y-4">
                  {visibleFollowUps.length > 1 && (
                    <div className="flex flex-wrap gap-2">
                      {visibleFollowUps.map((group, index) => (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => setFollowUpFocus(index)}
                          className={cx(
                            "rounded-full border px-3 py-2 text-left text-sm font-semibold transition duration-200",
                            activeFollowUpFocus === index ? "border-[#d7c19a] bg-[#fff9ef] text-slate-950" : "border-slate-200 bg-white text-slate-600 hover:border-[#d7c19a] hover:text-slate-950",
                          )}
                        >
                          {group.title}
                        </button>
                      ))}
                    </div>
                  )}

                  {(() => {
                    const activeGroup = visibleFollowUps[activeFollowUpFocus] ?? visibleFollowUps[0];
                    if (!activeGroup) return null;
                    return (
                      <Card title={activeGroup.title} why={activeGroup.why}>
                        <div className="space-y-3">
                          <p className="text-sm leading-6 text-slate-600">{activeGroup.reason}</p>
                          {renderAdaptiveGroup(activeGroup.id, input, update, toggle)}
                          <p className="support-note">Why am I seeing this? {activeGroup.why}</p>
                        </div>
                      </Card>
                    );
                  })()}
                </div>
              )}
            </SectionBlock>
          )}

          {currentStep === 4 && (
            <SectionBlock eyebrow="Evidence and safeguards" title="Show the documents and controls that support the assessment.">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {supportTabs.map((section, index) => (
                    <button
                      key={section.title}
                      type="button"
                      onClick={() => setSupportFocus(index)}
                      className={cx(
                        "rounded-full border px-3 py-2 text-left text-sm font-semibold transition duration-200",
                        activeSupportFocus === index ? "border-[#d7c19a] bg-[#fff9ef] text-slate-950" : "border-slate-200 bg-white text-slate-600 hover:border-[#d7c19a] hover:text-slate-950",
                      )}
                    >
                      <span className="block">{section.title}</span>
                      <span className="mt-1 block text-[0.72rem] font-normal leading-5 text-slate-500">{section.detail}</span>
                    </button>
                  ))}
                </div>

                {activeSupportFocus === 0 && (
                  <Card title="Evidence files" why="Evidence supports confidence and highlights contradictions, but it does not change the legal facts on its own.">
                    <div className="space-y-4">
                       <label className="upload-well">
                         <UploadCloud className="h-7 w-7 text-bronze" aria-hidden="true" />
                         <span className="mt-3 text-sm font-semibold text-ink">{uploadingEvidence ? "Reading evidence..." : "Upload model cards, datasets, logs, or technical notes"}</span>
                         <span className="mt-1 text-xs leading-5 text-muted">Text-like files are scanned locally for support signals and contradictions.</span>
                         <input type="file" multiple accept=".txt,.md,.csv,.json,.log" className="sr-only" onChange={handleEvidenceUpload} disabled={uploadingEvidence} />
                       </label>

                      {input.evidenceDocuments.length === 0 ? (
                        <EmptyState
                          title="No evidence uploaded"
                          detail="You can continue, but the report will stay questionnaire-based and provisional."
                          note="Evidence can later improve confidence, clarify assumptions, or reveal contradictions."
                        />
                      ) : (
                        <div className="space-y-3">
                          {input.evidenceDocuments.map((document) => (
                            <div key={document.id} className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-950">{document.name}</p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {document.kind} · {formatBytes(document.size)} · {document.extracted.length} signal{document.extracted.length === 1 ? "" : "s"}
                                  </p>
                                </div>
                                <button type="button" onClick={() => removeEvidence(document.id)} className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-red-200 hover:text-red-700" aria-label={`Remove ${document.name}`}>
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </button>
                              </div>
                              {document.extracted.length > 0 && (
                                <ul className="mt-3 space-y-2">
                                  {document.extracted.slice(0, 3).map((finding) => (
                                    <li key={finding.id} className="flex gap-2 text-sm leading-6 text-slate-600">
                                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#7ea88b]" aria-hidden="true" />
                                      {finding.plainSummary}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {activeSupportFocus === 1 && (
                  <Card title="Safeguards" why="These answers affect confidence, warnings, and the report wording.">
                    <div className="space-y-4">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {(
                          [
                            ["humanOversight", "Human oversight", "A person can review, override, or stop the output."],
                            ["appealPath", "Appeal or complaint path", "People can challenge or escalate the result."],
                            ["dataGovernance", "Data governance", "Data is documented and checked for relevance or bias."],
                            ["disclosure", "Disclosure / label", "Users are told AI is involved or content is synthetic."],
                          ] as const
                        ).map(([key, title, detail]) => (
                          <ToggleRow key={key} title={title} detail={detail} checked={input.controls[key]} onToggle={() => toggle("controls", key)} />
                        ))}
                      </div>
                      <p className="support-note">These controls reduce uncertainty. They do not erase prohibited or high-risk facts by themselves.</p>
                    </div>
                  </Card>
                )}

                {activeSupportFocus === 2 && hasModelTestHooks && (
                  <Card title="Model-test hooks" why="These are heuristic summaries only. They are not real test suites.">
                    <div className="space-y-3">
                      <p className="text-sm leading-6 text-slate-600">Use this only when the assessment involves a GPAI-style model or third-party API. The report will label these as simulated checks, not validated test results.</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {modelTestOptions.map((item) => (
                          <ToggleRow key={item.id} title={item.title} detail={item.detail} checked={input.modelTests[item.id]} onToggle={() => toggle("modelTests", item.id)} />
                        ))}
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </SectionBlock>
          )}

          {currentStep === 5 && (
            <SectionBlock eyebrow="Final review" title="Check the assumptions and missing facts before generating the memo.">
              <div className="space-y-4">
                <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                  <Card title="Input quality" why="This is a readiness state, not a score. It helps you see whether the report is trustable.">
                    <div className="space-y-3">
                      <QualityBadge label={intakeState} />
                      <p className="text-sm leading-6 text-slate-600">
                        {intakeState === "Ready for provisional screening"
                          ? "The intake has enough factual context to produce a provisional screen."
                          : intakeState === "Needs clarification"
                            ? "A few relevant areas still need more context before the report will feel dependable."
                            : intakeState === "High uncertainty"
                              ? "The use case is still broad enough that the report should stay cautious."
                              : "The core AI function is still too unclear for a confident screening."}
                      </p>
                      <div className="grid gap-2">
                        {reviewHints.map((hint) => (
                          <div key={hint.label} className="rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3">
                            <p className="text-sm font-semibold text-amber-950">{hint.label}</p>
                            <p className="mt-1 text-sm leading-6 text-amber-950/90">{hint.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>

                  <Card title="Missing required facts" why="These are the facts that most affect classification, confidence, or report wording.">
                    <ReviewList
                      items={[
                        !input.scope.usedInEU && !input.scope.placedOnEUMarket && !input.scope.affectsEUUsers ? "EU scope is not established yet." : "",
                        input.actorRole === "unclear" ? "Actor role is still unclear." : "",
                        input.systemType === "non_ai_or_unclear" ? "AI function is still unclear." : "",
                        !input.aiInputs.trim() ? "AI inputs are missing." : "",
                        !input.aiOutputs.trim() ? "AI outputs are missing." : "",
                        !input.outputUsers.trim() ? "Who relies on the output is missing." : "",
                      ].filter(Boolean)}
                    />
                  </Card>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <DisclosureCard title="Possibly relevant but not mentioned" summary="A short adjacent-issues check keeps the report cautious without overwhelming the user.">
                    {adjacentIssues.length === 0 ? (
                      <p className="text-sm leading-6 text-slate-600">No additional adjacent issues were surfaced from the current answers.</p>
                    ) : (
                      <div className="space-y-2">
                        {adjacentIssues.map((issue) => (
                          <div key={issue} className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
                            {issue}
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="mt-3 support-note">If any of these apply, go back and add the missing context before generating the report.</p>
                  </DisclosureCard>

                  <DisclosureCard title="Assumptions before report" summary="The export only makes cautious assumptions that remain visible to the reviewer.">
                    <div className="space-y-3">
                      <p className="text-sm leading-6 text-slate-600">
                        {input.evidenceDocuments.length
                          ? "Evidence is available, so the report can compare the uploaded files with the questionnaire answers."
                          : "No evidence files were uploaded. The report will be questionnaire-based and provisional."}
                      </p>
                      <textarea
                        value={input.uncertaintyNotes}
                        onChange={(event) => update("uncertaintyNotes", event.target.value)}
                        placeholder="Add anything that remains uncertain, surprising, or worth clarifying before export."
                        rows={5}
                        className="quiet-textarea resize-none"
                      />
                      <ToggleRow
                        title="Show legal basis in the report"
                        detail="This only reveals expandable legal references."
                        checked={input.showLegalBasis}
                        onToggle={() => update("showLegalBasis", !input.showLegalBasis)}
                      />
                    </div>
                  </DisclosureCard>
                </div>
              </div>
            </SectionBlock>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-[1.25rem] border border-red-200 bg-[#fff7f7] p-4 text-sm text-red-800">
              <span className="mt-0.5 text-red-500">
                <Info className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>{error}</span>
            </div>
          )}

           <div className="sticky bottom-4 z-20">
             <div className="action-dock">
               <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0 || analyzing}
                  className="btn-secondary"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Back
                </button>

                {currentStep < steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(currentStep + 1)}
                    disabled={analyzing}
                    className="btn-primary"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onAnalyze}
                    disabled={analyzing || !canAnalyze}
                    className="btn-primary btn-primary-accent"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Analyzing system...
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
        </div>

        <div className="hidden lg:block">
          <IntelligenceRail input={input} currentStep={currentStep} selectedFactCount={selectedFactCount} selectedTestCount={selectedTestCount} evidenceFindingCount={evidenceFindingCount} compact={false} />
        </div>
      </div>
    </section>
  );
}

function BriefingStep({
  examples,
  onLoadExample,
  onContinue,
}: {
  examples?: Array<{ label: string; input: ClassificationInput }>;
  onLoadExample?: (example: ClassificationInput) => void;
  onContinue: () => void;
}) {
  return (
    <SectionBlock eyebrow="Briefing" title="A focused intake for a provisional AI Act screening memo.">
      <div className="space-y-5">
        <div className="briefing-hero">
          <div className="max-w-2xl">
            <p className="section-eyebrow">How it works</p>
            <h3 className="mt-3 text-2xl font-semibold text-ink">Answer the facts once. The assessment adapts around them.</h3>
            <p className="mt-3 text-sm leading-7 text-muted">
              The interview separates legal tier, confidence, evidence support, missing facts, and adjacent compliance flags so the final memo is easier to trust and review.
            </p>
          </div>
          <button type="button" onClick={onContinue} className="btn-primary">
            Start assessment
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card title="What this tool does" why="Collects the facts that materially affect a provisional screening outcome.">
            <div className="space-y-3 text-sm leading-7 text-slate-600">
              <p>Describe the AI clearly, then we reveal only the follow-up questions that matter.</p>
              <p>The result separates risk tier, confidence, missing facts, evidence support, and non-AI-Act flags.</p>
              <p>Legal references stay available on demand, while the default view stays calm and readable.</p>
            </div>
          </Card>

          <Card
            title="What you should have ready"
            why="A clearer description means a more defensible report."
          >
            <ul className="space-y-3">
              {[
                "What the AI takes in and what it produces",
                "Who relies on the output",
                "Whether people interact with it directly",
                "Any evidence files you want the report to consider",
              ].map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-6 text-slate-600">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#7ea88b]" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="signal-strip">
          <div className="flex flex-wrap gap-2">
            {["Evidence-aware confidence", "Assumptions shown before report", "Non-AI-Act flags separated", "Legal basis available on demand"].map((item) => (
              <span key={item} className="pill pill-neutral">
                {item}
              </span>
            ))}
          </div>
        </div>

        <Card title="Load a sample" why="Useful for a demo. Every answer remains editable after loading.">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {(examples ?? []).map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onLoadExample?.(item.input)}
                className="sample-button"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </SectionBlock>
  );
}

function SectionBlock({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="workspace-panel reveal">
      <div className="workspace-panel-head">
        <p className="section-eyebrow">{eyebrow}</p>
        <h3 className="text-2xl font-semibold text-ink">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Card({ title, why, children }: { title: string; why: string; children: ReactNode }) {
  return (
    <div className="task-card">
      <div className="mb-4">
        <h4 className="text-base font-semibold text-ink">{title}</h4>
        <p className="mt-2 text-sm leading-6 text-muted">{why}</p>
      </div>
      {children}
    </div>
  );
}

function DisclosureCard({ title, summary, children }: { title: string; summary: string; children: ReactNode }) {
  return (
    <details className="task-card group overflow-hidden p-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4">
        <div>
          <h4 className="text-base font-semibold text-ink">{title}</h4>
          <p className="mt-2 text-sm leading-6 text-muted">{summary}</p>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition duration-200 group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="border-t border-line px-4 py-4">{children}</div>
    </details>
  );
}

function Field({ label, help, children }: { label: string; help: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
        {label}
        <span title={help} className="text-slate-500">
          <Info className="h-4 w-4" aria-hidden="true" />
        </span>
      </span>
      <div className="field-shell">{children}</div>
    </label>
  );
}

function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChoose,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; title: string; detail: string }>;
  onChoose: (value: T) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-900">{label}</p>
      <div className="space-y-2">
        {options.map((option) => (
          <ChoiceCard key={option.value} title={option.title} detail={option.detail} checked={value === option.value} onToggle={() => onChoose(option.value)} />
        ))}
      </div>
    </div>
  );
}

function ChoiceCard({ title, detail, checked, onToggle }: { title: string; detail: string; checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cx("choice-card", checked && "choice-card-active")}
    >
      <span className="block text-sm font-semibold text-ink">{title}</span>
      <span className="mt-1 block text-sm leading-6 text-muted">{detail}</span>
    </button>
  );
}

function ToggleRow({
  title,
  detail,
  checked,
  onToggle,
}: {
  title: string;
  detail: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cx("toggle-row", checked && "toggle-row-active")}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-muted">{detail}</span>
      </span>
      <span className={cx("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-bronze" : "bg-slate-300")}>
        <span className={cx("absolute top-1 h-4 w-4 rounded-full bg-white transition", checked ? "left-6" : "left-1")} />
      </span>
    </button>
  );
}

function ChipGroup({
  label,
  values,
  selected,
  onToggle,
}: {
  label: string;
  values: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-900">{label}</p>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => {
          const active = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => onToggle(value)}
              className={cx(
                "chip-button",
                active && "chip-button-active",
              )}
            >
              {value}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({
  title,
  detail,
  note,
  actionLabel,
  onAction,
}: {
  title: string;
  detail: string;
  note: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-state">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
      <p className="mt-3 text-xs leading-5 text-muted">{note}</p>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="btn-primary mt-4">
          {actionLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function CompactSummary({
  input,
  intakeState,
  selectedFactCount,
  selectedTestCount,
  evidenceFindingCount,
}: {
  input: ClassificationInput;
  intakeState: string;
  selectedFactCount: number;
  selectedTestCount: number;
  evidenceFindingCount: number;
}) {
  return (
    <div className="rail-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="section-eyebrow">Live summary</p>
          <p className="mt-1 text-sm font-semibold text-ink">{intakeState}</p>
        </div>
        <Info className="h-5 w-5 text-bronze" aria-hidden="true" />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <SummaryMini label="Facts" value={`${selectedFactCount}`} />
        <SummaryMini label="Evidence signals" value={`${evidenceFindingCount}`} />
        <SummaryMini label="Checks" value={`${selectedTestCount}`} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {getIntakeSignals(input)
          .slice(0, 4)
          .map((signal) => (
            <span key={signal.label} className="signal-chip" data-tone={signal.tone}>
              {signal.label}
            </span>
          ))}
      </div>
    </div>
  );
}

function SummaryMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="mini-stat">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function ReviewList({ items }: { items: string[] }) {
  if (!items.length) {
    return <p className="text-sm leading-6 text-slate-600">No major gaps were surfaced from the current answers.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
          {item}
        </li>
      ))}
    </ul>
  );
}

function QualityBadge({ label }: { label: string }) {
  return <span className="pill pill-accent w-fit">{label}</span>;
}

function renderAdaptiveGroup(
  id: string,
  input: ClassificationInput,
  update: <K extends keyof ClassificationInput>(key: K, value: ClassificationInput[K]) => void,
  toggle: <K extends keyof ToggleGroupMap>(group: K, key: keyof ToggleGroupMap[K]) => void,
) {
  switch (id) {
    case "consumerPublic":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow title="Direct interaction" detail="People talk to or rely on the AI directly." checked={input.contentFacts.directlyInteractsWithUsers} onToggle={() => toggle("contentFacts", "directlyInteractsWithUsers")} />
          <ToggleRow title="Public-facing content" detail="The AI generates content users or the public can see." checked={input.contentFacts.generatesPublicFacingContent} onToggle={() => toggle("contentFacts", "generatesPublicFacingContent")} />
          <ToggleRow title="Disclosure / label" detail="Users are told AI is involved or content is synthetic." checked={input.controls.disclosure} onToggle={() => toggle("controls", "disclosure")} />
        </div>
      );
    case "healthWellness":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow title="Healthcare domain" detail="The use case affects diagnosis, triage, treatment, or patient-risk support." checked={input.domains.healthcare} onToggle={() => toggle("domains", "healthcare")} />
          <ToggleRow title="Health data" detail="The AI handles medical, wellness, or clinical information." checked={input.dataFacts.healthData} onToggle={() => toggle("dataFacts", "healthData")} />
          <ToggleRow title="Medical / health regulation" detail="A medical-device, wellness, or health-law review may be needed." checked={input.nonAIActFlags.medicalDeviceOrHealthRegulation} onToggle={() => toggle("nonAIActFlags", "medicalDeviceOrHealthRegulation")} />
          <ToggleRow title="Cosmetics / skincare" detail="This is connected to skincare, sunscreen, or cosmetic product work." checked={input.nonAIActFlags.cosmeticsOrSkincare} onToggle={() => toggle("nonAIActFlags", "cosmeticsOrSkincare")} />
        </div>
      );
    case "biometric":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow title="Biometric data" detail="Face, voice, gait, fingerprint, or similar data is used." checked={input.dataFacts.biometricData} onToggle={() => toggle("dataFacts", "biometricData")} />
          <ToggleRow title="Biometric review flag" detail="This may need a separate biometric review." checked={input.nonAIActFlags.biometricData} onToggle={() => toggle("nonAIActFlags", "biometricData")} />
          <ToggleRow title="Sensitive biometric categorization" detail="The AI infers sensitive traits from biometric data." checked={input.prohibitedFacts.sensitiveBiometricCategorization} onToggle={() => toggle("prohibitedFacts", "sensitiveBiometricCategorization")} />
          <ToggleRow title="Emotion recognition" detail="The AI infers emotion in work or school settings." checked={input.prohibitedFacts.workplaceOrEducationEmotionRecognition} onToggle={() => toggle("prohibitedFacts", "workplaceOrEducationEmotionRecognition")} />
        </div>
      );
    case "employment":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow title="Employment domain" detail="Hiring, promotion, dismissal, or worker monitoring." checked={input.domains.employment} onToggle={() => toggle("domains", "employment")} />
          <ToggleRow title="Ranks people" detail="The output orders people by priority or score." checked={input.decisionFacts.ranksPeople} onToggle={() => toggle("decisionFacts", "ranksPeople")} />
          <ToggleRow title="Scores people" detail="The output assigns a score or rating." checked={input.decisionFacts.scoresPeople} onToggle={() => toggle("decisionFacts", "scoresPeople")} />
          <ToggleRow title="Filters people" detail="The output filters or sorts people out of a pool." checked={input.decisionFacts.filtersPeople} onToggle={() => toggle("decisionFacts", "filtersPeople")} />
          <ToggleRow title="Approves / rejects" detail="The output drives a yes/no access decision." checked={input.decisionFacts.approvesRejectsPeople} onToggle={() => toggle("decisionFacts", "approvesRejectsPeople")} />
          <ToggleRow title="Recommends people" detail="The output suggests who to choose or shortlist." checked={input.decisionFacts.recommendsPeople} onToggle={() => toggle("decisionFacts", "recommendsPeople")} />
        </div>
      );
    case "education":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow title="Education domain" detail="Admission, grading, assessment, or learning-path decisions." checked={input.domains.education} onToggle={() => toggle("domains", "education")} />
          <ToggleRow title="Assesses people" detail="The output evaluates suitability, progress, or performance." checked={input.decisionFacts.assessesPeople} onToggle={() => toggle("decisionFacts", "assessesPeople")} />
          <ToggleRow title="Ranks people" detail="Applicants or students are ordered by priority or score." checked={input.decisionFacts.ranksPeople} onToggle={() => toggle("decisionFacts", "ranksPeople")} />
          <ToggleRow title="Scores people" detail="The output assigns a score or rating." checked={input.decisionFacts.scoresPeople} onToggle={() => toggle("decisionFacts", "scoresPeople")} />
        </div>
      );
    case "creditInsurance":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow title="Finance / credit" detail="Credit, loan, or financial-eligibility decisions." checked={input.domains.finance} onToggle={() => toggle("domains", "finance")} />
          <ToggleRow title="Insurance" detail="Eligibility, access, or pricing decisions." checked={input.domains.insurance} onToggle={() => toggle("domains", "insurance")} />
          <ToggleRow title="Financial services flag" detail="This may need separate financial-services review." checked={input.nonAIActFlags.financialServices} onToggle={() => toggle("nonAIActFlags", "financialServices")} />
        </div>
      );
    case "publicServices":
      return <ToggleRow title="Public services" detail="Benefits, access, or prioritization decisions." checked={input.domains.publicServices} onToggle={() => toggle("domains", "publicServices")} />;
    case "lawMigrationJustice":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow title="Law enforcement" detail="Risk, evidence, or investigative support." checked={input.domains.lawEnforcement} onToggle={() => toggle("domains", "lawEnforcement")} />
          <ToggleRow title="Migration / asylum" detail="Visa, asylum, or border-control support." checked={input.domains.migration} onToggle={() => toggle("domains", "migration")} />
          <ToggleRow title="Justice" detail="Judicial decisions or legal interpretation support." checked={input.domains.justice} onToggle={() => toggle("domains", "justice")} />
        </div>
      );
    case "criticalInfrastructure":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow title="Critical infrastructure" detail="Safety-critical systems or infrastructure support." checked={input.domains.criticalInfrastructure} onToggle={() => toggle("domains", "criticalInfrastructure")} />
          <ToggleRow title="Product safety" detail="Safety-critical or regulated product support." checked={input.domains.productSafety} onToggle={() => toggle("domains", "productSafety")} />
          <ToggleRow title="Product-safety flag" detail="This may need a separate product-safety review." checked={input.nonAIActFlags.productSafety} onToggle={() => toggle("nonAIActFlags", "productSafety")} />
        </div>
      );
    case "gpai":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow title="Develops a model" detail="You build or place a general-purpose model on the market." checked={input.gpaI.developsModel} onToggle={() => toggle("gpaI", "developsModel")} />
          <ToggleRow title="Uses third-party GPAI" detail="You rely on a third-party model or API." checked={input.gpaI.usesThirdPartyApi} onToggle={() => toggle("gpaI", "usesThirdPartyApi")} />
          <ToggleRow title="Possible systemic risk" detail="The model seems frontier-scale or unusually high impact." checked={input.gpaI.systemicRiskIndicators} onToggle={() => toggle("gpaI", "systemicRiskIndicators")} />
        </div>
      );
    case "generatedContent":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow title="Public-facing content" detail="The output is shown to users or the public." checked={input.contentFacts.generatesPublicFacingContent} onToggle={() => toggle("contentFacts", "generatesPublicFacingContent")} />
          <ToggleRow title="Synthetic media" detail="The output is realistic or manipulated text, image, audio, or video." checked={input.contentFacts.createsRealisticSyntheticContent} onToggle={() => toggle("contentFacts", "createsRealisticSyntheticContent")} />
          <ToggleRow title="Disclosure / label" detail="Users are told AI is involved or content is synthetic." checked={input.controls.disclosure} onToggle={() => toggle("controls", "disclosure")} />
        </div>
      );
    case "childrenVulnerable":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow title="Children or vulnerable users" detail="The system may affect minors or vulnerable groups." checked={input.nonAIActFlags.childrenOrVulnerableUsers} onToggle={() => toggle("nonAIActFlags", "childrenOrVulnerableUsers")} />
          <ToggleRow title="Harmful targeting" detail="The design may exploit vulnerability or dependence." checked={input.prohibitedFacts.vulnerableGroups} onToggle={() => toggle("prohibitedFacts", "vulnerableGroups")} />
        </div>
      );
    default:
      return <p className="text-sm leading-6 text-slate-600">No extra controls are defined for this group yet.</p>;
  }
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}




