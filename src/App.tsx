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
  const [exportingReport, setExportingReport] = useState(false);
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    document.title = "AI Act Risk Classifier Pro";
  }, []);

  useEffect(() => {
    const stopExporting = () => setExportingReport(false);
    window.addEventListener("afterprint", stopExporting);
    return () => window.removeEventListener("afterprint", stopExporting);
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
    setExportError("");
  };

  const loadExample = (example: ClassificationInput) => {
    setInput(example);
    setCurrentStep(0);
    setResult(null);
    setError("");
    setExportError("");
    window.setTimeout(
      () =>
        document.getElementById("classifier")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      40
    );
  };

  const exportReport = () => {
    if (!result) {
      setExportError("Generate a screening memo before exporting.");
      return;
    }

    if (!document.getElementById("report")) {
      setExportError("The printable report is not available yet.");
      return;
    }

    setExportingReport(true);
    setExportError("");

    window.setTimeout(() => {
      try {
        window.print();
        window.setTimeout(() => setExportingReport(false), 600);
      } catch (cause) {
        setExportingReport(false);
        setExportError(
          cause instanceof Error
            ? cause.message
            : "Unable to open the print dialog for this report."
        );
      }
    }, 0);
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
            onPrint={exportReport}
            exportingReport={exportingReport}
            exportError={exportError}
          />
        </div>

        <ReportView input={input} result={result} />
      </main>
    </div>
  );
}

export default App;
