import { FileText, Scale, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { getAuditRecords, saveAuditRecord, type AuditRecord } from "./audit/auditStore";
import { ReportView } from "./components/ReportView";
import { ResultsDashboard } from "./components/ResultsDashboard";
import { Wizard } from "./components/Wizard";
import { classifySystem } from "./engine/classifier";
import { createEmptyInput, scenarios } from "./data/scenarios";
import type { ClassificationInput, ClassificationResult } from "./engine/types";

function App() {
  const [input, setInput] = useState<ClassificationInput>(() => createEmptyInput());
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>(() => getAuditRecords());
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "AI Act Risk Classifier Pro";
  }, []);

  const runAnalysis = () => {
    setAnalyzing(true);
    setError("");

    window.setTimeout(() => {
      try {
        const next = classifySystem(input);
        const saved = saveAuditRecord(input, next);
        setResult({ ...next, assessmentVersion: saved.version });
        setAuditRecords(getAuditRecords());
        window.setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to run the classification.");
      } finally {
        setAnalyzing(false);
      }
    }, 120);
  };

  const reset = () => {
    setInput(createEmptyInput());
    setCurrentStep(0);
    setResult(null);
    setError("");
  };

  const loadExample = (example: ClassificationInput) => {
    setInput(example);
    setCurrentStep(0);
    setResult(null);
    setError("");
    window.setTimeout(() => document.getElementById("classifier")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  };

  return (
    <div className="app-shell">
      <main>
        <section className="page-grid pb-5 pt-5 sm:pt-6">
          <div className="brand-bar">
            <div className="flex min-w-0 items-center gap-4">
              <span className="brand-mark">
                <Scale className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="brand-title">AI Act Risk Classifier Pro</p>
                <p className="brand-subtitle">Guided screening for a provisional EU AI Act memo.</p>
              </div>
            </div>
            <div className="hidden items-center gap-2 lg:flex">
              <span className="quiet-status">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Backend logic protected
              </span>
              <span className="quiet-status">
                <FileText className="h-4 w-4" aria-hidden="true" />
                Memo ready workflow
              </span>
            </div>
          </div>
        </section>
        <Wizard
          input={input}
          setInput={setInput}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          onAnalyze={runAnalysis}
          analyzing={analyzing}
          error={error}
          examples={demoButtons}
          onLoadExample={loadExample}
        />

        <div id="results">
          <ResultsDashboard input={input} result={result} auditRecords={auditRecords} onReset={reset} onPrint={() => window.print()} />
        </div>

        <ReportView input={input} result={result} />
      </main>
    </div>
  );
}

const demoButtons = [
  { label: "Employment screening", input: scenarios.find((scenario) => scenario.id === "employment-screening")!.input },
  { label: "Customer chatbot", input: scenarios.find((scenario) => scenario.id === "chatbot")!.input },
  { label: "Internal summarizer", input: scenarios.find((scenario) => scenario.id === "internal-summary")!.input },
  { label: "Out-of-scope", input: scenarios.find((scenario) => scenario.id === "outside-eu")!.input },
];

export default App;
