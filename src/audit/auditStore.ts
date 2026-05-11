import type { ClassificationInput, ClassificationResult } from "../engine/types";

export type AuditRecord = {
  id: string;
  version: number;
  createdAt: string;
  systemName: string;
  tier: string;
  input: ClassificationInput;
  result: ClassificationResult;
  changeLog: string[];
};

const storageKey = "ai-act-risk-classifier-audit";

export function getAuditRecords(): AuditRecord[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey) ?? "[]") as AuditRecord[];
  } catch {
    return [];
  }
}

export function saveAuditRecord(input: ClassificationInput, result: ClassificationResult): AuditRecord {
  const existing = getAuditRecords();
  const previousHistory = existing
    .filter((record) => record.systemName === input.systemName)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  const previous = previousHistory[0];
  const version = previous ? previous.version + 1 : 1;
  const changeLog = buildChangeLog(previous?.input, input);
  const record: AuditRecord = {
    id: `${Date.now()}-${input.systemName || "assessment"}`,
    version,
    createdAt: new Date().toISOString(),
    systemName: input.systemName || "Untitled assessment",
    tier: result.tier,
    input,
    result: { ...result, assessmentVersion: version },
    changeLog,
  };
  localStorage.setItem(storageKey, JSON.stringify([record, ...existing].slice(0, 12)));
  return record;
}

function buildChangeLog(previous: ClassificationInput | undefined, next: ClassificationInput): string[] {
  if (!previous) return ["Initial assessment created."];
  const changes: string[] = [];
  const previousEvidenceSignature = signatureForEvidence(previous.evidenceDocuments);
  const nextEvidenceSignature = signatureForEvidence(next.evidenceDocuments);
  if (previous.systemDescription !== next.systemDescription) changes.push("System description changed.");
  if (previous.decisionMode !== next.decisionMode) changes.push(`Decision mode changed from ${previous.decisionMode.replace(/_/g, " ")} to ${next.decisionMode.replace(/_/g, " ")}.`);
  if (previousEvidenceSignature !== nextEvidenceSignature) changes.push("Evidence set changed.");
  if (JSON.stringify(previous.prohibitedFacts) !== JSON.stringify(next.prohibitedFacts)) changes.push("Stop-sign answers changed.");
  if (JSON.stringify(previous.domains) !== JSON.stringify(next.domains)) changes.push("Domain answers changed.");
  if (JSON.stringify(previous.controls) !== JSON.stringify(next.controls)) changes.push("Control answers changed.");
  return changes.length ? changes : ["No material input changes detected."];
}

function signatureForEvidence(documents: ClassificationInput["evidenceDocuments"]) {
  return documents
    .map((document) => [document.id, document.name, document.kind, document.textPreview, document.extracted.map((finding) => `${finding.category}:${finding.label}:${finding.severity}`).join("|")].join("::"))
    .join("||");
}

export function exportEvidenceBundle(input: ClassificationInput, result: ClassificationResult) {
  const payload = {
    exportedAt: new Date().toISOString(),
    systemName: input.systemName,
    result,
    evidence: input.evidenceDocuments,
    modelTests: result.modelTestResults,
    citations: result.citations,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${(input.systemName || "ai-act-assessment").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-evidence-bundle.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
