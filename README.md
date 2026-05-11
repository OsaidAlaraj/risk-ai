# AI Act Risk Classifier Pro

**A rule-based EU AI Act screening and documentation prototype for non-lawyers.**

AI Act Risk Classifier Pro helps a user describe an AI system in plain language, answer factual questions, upload evidence, and receive a preliminary EU AI Act screening result with reasoning, uncertainty, and a printable report.

This project is a screening and documentation prototype. It is **not legal advice**, **not a compliance certificate**, and **not a substitute for qualified legal review**.

## What the tool does

- Guides the user through a linear assessment flow:
  - Describe
  - Identify
  - Assess
  - Evidence
  - Review
- Classifies the system into:
  - Out of scope
  - Unacceptable risk
  - High risk
  - Limited risk
  - Minimal risk
  - Needs review
- Explains the result with:
  - one-sentence summary
  - main reason
  - triggered rule group
  - facts used
  - selected signals
  - contradictions
  - missing facts
  - evidence status
  - required controls
  - next steps
  - legal basis behind expandable sections
- Produces a printable report and exportable evidence bundle.

## What the tool does not do

- It does not give legal advice.
- It does not replace counsel, procurement review, or compliance sign-off.
- It does not prove compliance.
- It does not run real fairness, robustness, or adversarial test suites.
- It does not parse every file format yet.
- It does not model every AI Act obligation in full legal detail.

## How the flow works

The app is intentionally simple for beginners.

1. **Describe**
   - Enter the system name, provider, purpose, sector, and a plain-language description.
   - Confirm whether EU scope facts are present.

2. **Identify**
   - Answer factual questions about interaction mode, decision role, people affected, and data used.
   - Choose what the system actually does: rank, score, filter, approve, reject, recommend, or assess people.

3. **Assess**
   - Add the domain, data types, content behavior, controls, and stop-sign signals.
   - This is where the rule engine gets enough context to classify responsibly.

4. **Evidence**
   - Upload text-like model cards, datasets, logs, or technical notes.
   - Optional model-test hooks can be selected, but they are clearly labeled as heuristic/simulated.

5. **Review**
   - Check the summary before running the classifier.
   - Add uncertainty notes and choose whether legal basis should appear in the report.

## Classification categories

The classifier uses a strict order:

1. **Out of scope**
   - EU scope is not established from the facts provided.

2. **Unacceptable risk**
   - A prohibited-practice pattern is selected or clearly indicated.

3. **High risk**
   - The system materially affects important life areas, rights, access, opportunities, safety, or regulated decisions.

4. **Limited risk**
   - The system is user-facing, AI-interactive, or content-generating, but does not meet the high-risk threshold.

5. **Minimal risk**
   - The system is internal/background support and does not materially affect people or essential decisions.

6. **Needs review**
   - Facts are incomplete, conflicting, or too vague for a defensible classification.

## How confidence works

Confidence is a heuristic quality score, not a legal probability.

The app shows:

- High
- Medium
- Low
- Insufficient information

Confidence is reduced when:

- no evidence is uploaded
- the description is vague
- contradictions exist
- the use case is serious but unsupported
- sensitive or biometric data is selected without explanation
- EU scope is unclear

Evidence can increase confidence, but it does **not** change the legal facts.

## How evidence works

Evidence files are scanned locally for:

- sensitive attribute signals
- human oversight signals
- dataset quality risks
- model behavior warnings
- documentation cues
- possible risk signals
- contradictions

Evidence is used to:

- support confidence
- warn about missing information
- surface contradictions
- help explain the result

Evidence is not used to silently override the user's factual answers.

## Architecture

```text
src/
  App.tsx                  Product shell and orchestration
  components/
    Wizard.tsx             Guided factual intake
    ResultsDashboard.tsx   Interactive result screen
    ReportView.tsx         Printable report
  engine/
    types.ts               Shared domain types
    rules.ts               Prohibited, high-risk, and transparency rules
    classifier.ts          Main screening engine
    uncertainty.ts         Heuristic uncertainty scoring
  evidence/
    evidenceValidator.ts   Local evidence parsing and signal extraction
  legal/
    legalEngine.ts         Citations, checklist, and workflow helpers
  testing/
    modelTesting.ts        Simulated model-test hooks
  audit/
    auditStore.ts          Local versioned audit trail and bundle export
  report/
    reportGenerator.ts     Report manifest helper
  data/
    scenarios.ts           Demo scenarios and empty input factory
  qa/
    fullCycleHarness.ts    Scenario-based end-to-end QA
  lib/
    utils.ts              Shared helpers
```

## Demo scenarios

The app includes several starting points:

- Internal summarization tool
- Out-of-scope / outside-EU case
- Customer chatbot
- Employment screening
- Medical triage AI
- Emotion detection in school
- Spam filter

These are demo inputs for showing the classifier. They are not proof that the engine is complete.

## How to run locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Full-cycle QA:

```bash
npm run test:full
```

If `npm` is not recognized on your machine, install Node.js LTS from [nodejs.org](https://nodejs.org/) and reopen the terminal.

## How to test

Recommended test flow:

1. Open the app.
2. Load the **Employment screening** demo.
3. Confirm the result is **High Risk**.
4. Load the **Customer Chatbot** demo.
5. Confirm the result is **Limited Risk**.
6. Load the **Out-of-scope** demo.
7. Confirm the result is **EU Scope Unclear / Out of Scope**.
8. Upload a short evidence file and check that confidence changes without changing the legal category.
9. Open the printable report and confirm the report matches the dashboard.

## Known limitations

- Evidence parsing is text-based and keyword-driven.
- Model-test hooks are simulated summaries, not live test suites.
- Local audit history uses browser storage.
- The legal logic is intentionally conservative and simplified for an academic prototype.
- The project should be reviewed by a qualified person before any real-world use.

## Academic disclaimer

This project is designed for educational and demonstrative purposes. It shows how a rule-based AI Act screening workflow can be structured for a beginner-friendly user experience. It should be presented as a prototype, not as an authority on the law.

## Suggested presentation script

- "We built a beginner-friendly screening tool for the EU AI Act."
- "The user answers factual questions, not legal questions."
- "The engine maps those facts to risk tiers, uncertainty, and transparency duties."
- "Evidence supports confidence, but it does not rewrite the legal facts."
- "The result is a report the team can review with counsel."

## Legal sources used

- [Regulation (EU) 2024/1689, Official Journal text](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)
- [European Commission AI Act overview](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai)
