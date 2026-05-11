import { useEffect, useState } from "react";
import { getAuditRecords, saveAuditRecord, type AuditRecord } from "./audit/auditStore";
import { AppHeader } from "./components/AppHeader";
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
        window.setTimeout(
          () =>
            document.getElementById("results")?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            }),
          80
        );
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
    window.setTimeout(
      () =>
        document.getElementById("classifier")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      40
    );
  };

  const demoButtons = [
    {
      label: "Employment screening",
      input: scenarios.find((s) => s.id === "employment-screening")!.input,
    },
    {
      label: "Customer chatbot",
      input: scenarios.find((s) => s.id === "chatbot")!.input,
    },
    {
      label: "Internal summarizer",
      input: scenarios.find((s) => s.id === "internal-summary")!.input,
    },
    {
      label: "Out-of-scope",
      input: scenarios.find((s) => s.id === "outside-eu")!.input,
    },
  ];

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="app-main">
        <div id="classifier">
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
        </div>

        <div id="results">
          <ResultsDashboard
            input={input}
            result={result}
            auditRecords={auditRecords}
            onReset={reset}
            onPrint={() => window.print()}
          />
        </div>

        <ReportView input={input} result={result} />
      </main>
    </div>
  );
}

export default App;
