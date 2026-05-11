import type { EvidenceDocument, EvidenceFinding, EvidenceKind } from "../engine/types";

const sensitivePatterns = ["race", "ethnicity", "religion", "political", "union", "sexual orientation", "health", "biometric", "disability", "age", "gender"];
const oversightPatterns = ["human oversight", "human review", "override", "appeal", "contest", "manual review", "reviewer", "escalation"];
const datasetRiskPatterns = ["missing values", "imbalance", "biased", "bias", "proxy", "synthetic", "scraped", "unverified", "low quality", "representative"];
const behaviorPatterns = ["drift", "hallucination", "false positive", "false negative", "adversarial", "robustness", "accuracy", "explainability"];
const documentationPatterns = ["model card", "datasheet", "technical documentation", "risk management", "logging", "post-market", "conformity"];
const possibleSignalPatterns = [
  "employment",
  "hiring",
  "education",
  "grading",
  "healthcare",
  "diagnosis",
  "credit",
  "loan",
  "insurance",
  "migration",
  "visa",
  "border",
  "law enforcement",
  "justice",
  "biometric",
  "emotion",
  "content",
  "chatbot",
];

const kindHints: Record<EvidenceKind, string[]> = {
  "model-card": ["model card", "intended use", "limitations", "metrics"],
  dataset: ["dataset", "csv", "label", "features", "training data"],
  logs: ["log", "timestamp", "event", "incident", "monitoring"],
  "technical-doc": ["architecture", "technical", "validation", "cybersecurity", "documentation"],
  other: [],
};

const inferKind = (name: string, text: string): EvidenceKind => {
  const haystack = `${name} ${text}`.toLowerCase();
  const match = Object.entries(kindHints).find(([, hints]) => hints.some((hint) => haystack.includes(hint)));
  return (match?.[0] as EvidenceKind | undefined) ?? "other";
};

const hasAny = (text: string, patterns: string[]) => patterns.filter((pattern) => text.includes(pattern));

const createFinding = (
  category: EvidenceFinding["category"],
  label: string,
  matches: string[],
  severity: EvidenceFinding["severity"],
  confidenceImpact: number,
): EvidenceFinding => ({
  id: `${category}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  category,
  label,
  plainSummary: matches.length ? `Found signals related to ${matches.slice(0, 4).join(", ")}.` : `No strong signal found for ${label.toLowerCase()}.`,
  expertDetail: `Keyword-based extraction for ${category}; matched ${matches.length ? matches.join(", ") : "no configured terms"}.`,
  severity,
  confidenceImpact,
});

export function extractEvidenceFindings(text: string): EvidenceFinding[] {
  const normalized = text.toLowerCase();
  const sensitive = hasAny(normalized, sensitivePatterns);
  const oversight = hasAny(normalized, oversightPatterns);
  const dataset = hasAny(normalized, datasetRiskPatterns);
  const behavior = hasAny(normalized, behaviorPatterns);
  const documentation = hasAny(normalized, documentationPatterns);
  const possibleSignals = hasAny(normalized, possibleSignalPatterns);

  const findings: EvidenceFinding[] = [];
  if (sensitive.length) {
    findings.push(createFinding("sensitive-attributes", "Sensitive attribute signal", sensitive, "high", -8));
  }
  if (oversight.length) {
    findings.push(createFinding("human-oversight", "Human oversight evidence", oversight, "low", 6));
  }
  if (dataset.length) {
    findings.push(createFinding("dataset-risk", "Dataset quality risk", dataset, "medium", -6));
  }
  if (behavior.length) {
    findings.push(createFinding("model-behavior", "Model behavior signal", behavior, behavior.some((item) => item.includes("adversarial") || item.includes("false")) ? "medium" : "low", -3));
  }
  if (documentation.length) {
    findings.push(createFinding("documentation", "Documentation evidence", documentation, "low", 5));
  }
  if (possibleSignals.length) {
    findings.push(createFinding("possible-signal", "Possible risk signal", possibleSignals, "low", 0));
  }
  if (normalized.includes("no human oversight") || normalized.includes("without human review")) {
    findings.push({
      id: "contradiction-no-human-oversight",
      category: "contradiction",
      label: "Possible contradiction on oversight",
      plainSummary: "Uploaded evidence appears to say there is no human review, which may conflict with the intake if oversight was selected.",
      expertDetail: "Contradiction detector matched phrases indicating absence of human oversight.",
      severity: "high",
      confidenceImpact: -10,
    });
  }
  return findings;
}

export async function parseEvidenceFile(file: File, fallbackKind: EvidenceKind = "other"): Promise<EvidenceDocument> {
  const isReadable = file.type.startsWith("text/") || /\.(txt|md|csv|json|log)$/i.test(file.name);
  const text = isReadable ? await file.text() : `${file.name} (${file.type || "unknown file type"})`;
  const kind = fallbackKind === "other" ? inferKind(file.name, text) : fallbackKind;

  return {
    id: `${Date.now()}-${file.name}`,
    name: file.name,
    kind,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    textPreview: text.slice(0, 1200),
    extracted: extractEvidenceFindings(text),
  };
}
