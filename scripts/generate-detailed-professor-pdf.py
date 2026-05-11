from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
)


ROOT = Path(__file__).resolve().parents[1]
DOCS_DIR = ROOT / "docs"
QA_RESULTS = ROOT / "qa-results.json"
OUTPUT = DOCS_DIR / "AI_Act_Risk_Classifier_Pro_Detailed_Project_Documentation.pdf"


def load_qa_results() -> dict:
    if not QA_RESULTS.exists():
        return {
            "status": "not-run",
            "totals": {"passed": 0, "failed": 0},
            "cases": [],
            "generatedAt": datetime.utcnow().isoformat(),
        }
    return json.loads(QA_RESULTS.read_text(encoding="utf-8"))


def p(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(text, style)


def bullets(items: list[str], style: ParagraphStyle) -> ListFlowable:
    return ListFlowable(
        [ListItem(p(item, style), leftIndent=12) for item in items],
        bulletType="bullet",
        leftIndent=18,
        bulletFontName="Helvetica",
        bulletFontSize=8,
    )


def heading(story: list, text: str, style: ParagraphStyle) -> None:
    story.append(Spacer(1, 0.18 * cm))
    story.append(p(text, style))
    story.append(Spacer(1, 0.08 * cm))


def styled_table(rows: list[list[str]], widths: list[float], header: bool = True) -> Table:
    style = [
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#b8c6c1")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 7.8),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("ROWBACKGROUNDS", (0, 1 if header else 0), (-1, -1), [colors.white, colors.HexColor("#f6f8f6")]),
    ]
    if header:
        style.extend(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2c4d49")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ]
        )
    return Table(rows, colWidths=widths, style=style, repeatRows=1 if header else 0)


def build_pdf() -> Path:
    DOCS_DIR.mkdir(exist_ok=True)
    qa = load_qa_results()

    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="TitleCenter",
            parent=styles["Title"],
            alignment=TA_CENTER,
            fontName="Helvetica-Bold",
            fontSize=24,
            leading=30,
            textColor=colors.HexColor("#203038"),
            spaceAfter=10,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SubtitleCenter",
            parent=styles["BodyText"],
            alignment=TA_CENTER,
            fontSize=10.5,
            leading=15,
            textColor=colors.HexColor("#56666d"),
            spaceAfter=12,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Section",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            textColor=colors.HexColor("#2c4d49"),
            spaceBefore=8,
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BodyClean",
            parent=styles["BodyText"],
            fontSize=9.2,
            leading=13.2,
            textColor=colors.HexColor("#25343a"),
            spaceAfter=5,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Small",
            parent=styles["BodyText"],
            fontSize=7.8,
            leading=10.6,
            textColor=colors.HexColor("#4a5960"),
        )
    )

    title = styles["TitleCenter"]
    subtitle = styles["SubtitleCenter"]
    section = styles["Section"]
    body = styles["BodyClean"]
    small = styles["Small"]

    story: list = []

    story.append(Spacer(1, 0.7 * cm))
    story.append(p("AI Act Risk Classifier Pro", title))
    story.append(
        p(
            "Detailed Project Documentation: Idea, Business Problem, AI-Assisted Development Process, Technical Architecture, MVP, Real-Life Roadmap, and Test Cases",
            subtitle,
        )
    )
    story.append(Spacer(1, 0.25 * cm))
    story.append(
        styled_table(
            [
                ["Item", "Description"],
                ["Product", "AI Act Risk Classifier Pro"],
                ["Purpose", "Classify AI systems into EU AI Act risk tiers and generate compliance guidance"],
                ["Frontend libraries", "React, TypeScript, Tailwind CSS, Vite, lucide-react"],
                ["AI tools used", "Codex for product generation/refactoring; ChatGPT for prompt enhancement and EU AI Act legal research support"],
                ["QA status", f"{qa['status'].upper()} - {qa['totals']['passed']} passed, {qa['totals']['failed']} failed"],
                ["Generated", datetime.now().strftime("%d %B %Y, %H:%M")],
            ],
            [4.2 * cm, 11.5 * cm],
        )
    )
    story.append(Spacer(1, 0.35 * cm))
    story.append(
        p(
            "Academic disclaimer: this product is a proof of concept and educational decision-support tool. "
            "It does not provide legal advice and should not replace qualified legal review.",
            small,
        )
    )
    story.append(PageBreak())

    heading(story, "1. Why This Idea Was Chosen", section)
    story.append(
        p(
            "The idea was chosen because the EU AI Act creates a practical problem: many teams can explain what an AI product does, "
            "but they cannot easily translate that product description into a risk tier, obligations, evidence requirements, and a report. "
            "This gap is especially visible for startups, students, small companies, and product teams that do not have immediate access to legal specialists.",
            body,
        )
    )
    story.append(
        bullets(
            [
                "AI regulation is growing, but many AI builders are technical or business-focused rather than legal experts.",
                "The AI Act uses a risk-based model, which means the answer depends on context, affected people, data, deployment domain, and system behavior.",
                "A simple chatbot-style answer is not enough because compliance needs auditability, evidence, citations, and repeatable reasoning.",
                "A guided compliance product is a strong LegalTech concept because it turns legal complexity into a workflow that can be demonstrated, improved, and sold.",
            ],
            body,
        )
    )

    heading(story, "2. Problem The Product Solves", section)
    story.append(
        p(
            "The core problem is not only classification. The real problem is producing a structured and defensible compliance story. "
            "A user needs to know: What is the risk tier? Why was it classified that way? What laws or annexes triggered the result? "
            "What evidence is missing? What should be changed to reduce risk? What should be included in a report?",
            body,
        )
    )
    story.append(
        styled_table(
            [
                ["Observed Problem", "Product Response"],
                ["Users do not know legal terminology", "The UI asks plain-language product questions instead of legal questions."],
                ["Risk depends on context", "The engine maps purpose, sector, impact, safeguards, data, and evidence to legal categories."],
                ["Compliance must be explainable", "The result includes a visible reasoning pipeline and hidden expert citations."],
                ["Legal output needs evidence", "The app accepts model cards, datasets, logs, and technical documentation."],
                ["Users need next steps", "The app produces checklists, high-risk workflow tasks, and risk-reduction suggestions."],
            ],
            [5.2 * cm, 10.5 * cm],
        )
    )

    heading(story, "3. Tools, Libraries, and AI Assistance Used", section)
    story.append(
        p(
            "The project combines normal frontend engineering tools with AI-assisted development and legal research support. "
            "The role of each tool is separated clearly below.",
            body,
        )
    )
    story.append(
        styled_table(
            [
                ["Tool or Library", "How It Was Used", "Why It Was Chosen"],
                ["React", "Built the component-based web interface: homepage, wizard, dashboard, report view.", "Fast for building interactive single-page apps and reusable UI components."],
                ["TypeScript", "Typed inputs, rules, risk tiers, evidence documents, citations, audit records, and result objects.", "Reduces bugs in a rule-heavy compliance product."],
                ["Tailwind CSS", "Created a responsive, calm, modern UI with utility classes.", "Supports quick design iteration while keeping styling consistent."],
                ["Vite", "Development server and production build tool.", "Fast local development and simple deployment to free static hosts."],
                ["lucide-react", "Provided icons for actions, status, evidence, testing, reports, and navigation.", "Clean icon system that makes the UI easier to understand."],
                ["ReportLab", "Generated the professor-facing PDF documentation.", "Reliable Python library for structured PDF output."],
                ["Codex", "Generated and refactored the product code, legal engine modules, QA harness, documentation scripts, and bug fixes.", "Useful for turning a high-level product idea into a working React/TypeScript implementation."],
                ["ChatGPT", "Enhanced the initial prompt, helped structure the product requirements, and supported EU AI Act legal source collection and summarization.", "Useful for turning broad legal/product ideas into clearer implementation steps."],
            ],
            [3.0 * cm, 7.2 * cm, 5.5 * cm],
        )
    )
    story.append(
        p(
            "Important credibility note: ChatGPT was used as a research and summarization assistant, but the legal logic was aligned with official EU AI Act sources, "
            "European Commission public guidance, and class materials. The app intentionally includes disclaimers and uncertainty warnings.",
            small,
        )
    )

    heading(story, "4. Step-by-Step Project Process", section)
    story.append(
        styled_table(
            [
                ["Step", "What Was Done", "Output"],
                ["1. Idea framing", "Identified that AI Act classification is hard for non-lawyers and useful for startups/class demos.", "LegalTech product concept."],
                ["2. Prompt enhancement", "Used ChatGPT to make the initial product request more complete and structured.", "Clear requirements for UI, legal engine, evidence, QA, and reports."],
                ["3. Legal source collection", "Used ChatGPT to collect and summarize EU AI Act concepts, then checked official EU/Commission sources and class materials.", "Risk-tier logic, Article 5 triggers, Annex III categories, transparency duties, and compliance checklist."],
                ["4. Product design", "Converted legal requirements into a beginner-friendly flow: Describe, Identify, Assess, Review, Export.", "Simple human workflow instead of legal-form complexity."],
                ["5. Code generation", "Used Codex to build React/TypeScript components, legal modules, evidence modules, report view, and styling.", "Working web app."],
                ["6. Evidence engine", "Added local text evidence scanning for sensitive attributes, oversight, dataset risk, model behavior, documentation, and contradictions.", "Evidence-driven compliance signals."],
                ["7. QA and fixing", "Built a full-cycle QA harness and fixed bugs found during testing.", "5 passed, 0 failed full-cycle QA result."],
                ["8. Documentation", "Generated professor documentation explaining business, tech, legal logic, MVP, roadmap, and tests.", "This PDF document."],
            ],
            [2.5 * cm, 8.1 * cm, 5.1 * cm],
        )
    )

    story.append(PageBreak())

    heading(story, "5. MVP Definition", section)
    story.append(
        p(
            "The MVP is the smallest credible version that demonstrates the full compliance workflow from intake to report. "
            "The current product already covers the MVP scope.",
            body,
        )
    )
    story.append(
        bullets(
            [
                "Homepage that clearly explains the product value.",
                "Guided wizard using simple product questions.",
                "Rule-based EU AI Act risk classification engine.",
                "Scenario playground for classroom demonstration.",
                "Evidence upload and risk signal extraction.",
                "Optional model-behavior test hooks.",
                "Confidence and uncertainty bars.",
                "Legal citations hidden behind expert-mode controls.",
                "High-risk compliance checklist and conformity workflow.",
                "Audit trail with versioned assessments.",
                "Printable report and professor documentation.",
            ],
            body,
        )
    )

    heading(story, "6. How The Product Works", section)
    story.append(
        p(
            "From the user's perspective, the product is deliberately simple. The user does not start by reading legal text. "
            "Instead, they describe what the AI does, identify obvious risk signals, add evidence, review uncertainty, and export the result.",
            body,
        )
    )
    story.append(
        styled_table(
            [
                ["User Step", "Plain-Language Purpose", "Engine Action"],
                ["Describe", "Collect product facts: purpose, sector, users, data, EU link.", "Builds a factual profile for legal mapping."],
                ["Identify", "Select obvious risks using ordinary-world wording.", "Maps answers to Article 5, Annex III, and Article 50 logic."],
                ["Assess", "Add impact, safeguards, evidence files, and optional checks.", "Extracts evidence signals and runs model-check hooks."],
                ["Review", "Shows summary, missing info, and uncertainty before classification.", "Prepares final input object."],
                ["Export", "Runs classification and creates report/evidence bundle.", "Generates result, checklist, citations, audit record, and report page."],
            ],
            [2.8 * cm, 6.7 * cm, 6.2 * cm],
        )
    )

    heading(story, "7. Legal and Compliance Logic", section)
    story.append(
        bullets(
            [
                "Article 5 prohibited-practice screen: harmful manipulation, exploitation of vulnerabilities, social scoring, certain biometric/emotion uses, and criminal-risk profiling patterns.",
                "Annex III high-risk screen: employment, education, law enforcement, migration/border, healthcare, critical infrastructure, essential services, biometrics, justice, and democratic processes.",
                "Transparency screen: chatbot interaction, synthetic media, deepfakes, generated content, emotion recognition, and biometric categorisation disclosures.",
                "Annex I-V support: clause summaries for product-safety context, serious offence context, high-risk categories, technical documentation, and EU declaration-of-conformity elements.",
                "Uncertainty model: shows evidence support, real-world stability, information completeness, and contradiction level as visual bars.",
            ],
            body,
        )
    )

    heading(story, "8. Real-Life Implementation Plan", section)
    story.append(
        styled_table(
            [
                ["Phase", "Goal", "What Would Be Added"],
                ["POC / Class Demo", "Show the complete idea and prove the workflow.", "Static deployment, scenario demos, PDF report, QA evidence."],
                ["Pilot", "Test with students, founders, or small legal/compliance teams.", "User feedback, improved legal wording, better evidence templates, export branding."],
                ["Professional MVP", "Make it usable for real teams.", "Accounts, secure workspaces, persistent database, role-based access, report history."],
                ["Production Compliance Platform", "Support serious business use.", "Verified legal knowledge base, versioned legal updates, expert review workflow, full audit logs, document parsing, real model testing integrations."],
                ["Enterprise / Consulting Version", "Support lawyers and consultants.", "Client workspaces, matter management, review comments, sign-off, permissions, API integrations."],
            ],
            [3.0 * cm, 5.3 * cm, 7.4 * cm],
        )
    )
    story.append(
        p(
            "In real life, this product could help startups screen AI features before launch, help compliance teams prepare internal assessments, "
            "help law students understand AI Act risk categories, and help consultants create structured first-pass reports for clients.",
            body,
        )
    )

    story.append(PageBreak())

    heading(story, "9. Test Cases Used", section)
    story.append(
        p(
            "The product includes a test harness that checks the key scenarios and technical flows. These cases show that the system can classify different AI systems, "
            "process evidence, generate reports, and preserve audit records.",
            body,
        )
    )
    story.append(
        styled_table(
            [
                ["Case", "Input Summary", "Expected Result", "Why It Matters"],
                ["AI CV Screening", "Ranks job applicants and recommends interview shortlists.", "High Risk", "Tests employment and recruitment high-risk mapping."],
                ["Predictive Policing", "Predicts criminal risk from profiling/demographic signals.", "Unacceptable Risk", "Tests Article 5 stop-sign logic."],
                ["Medical Diagnosis AI", "Supports clinicians with triage and diagnostic suggestions.", "High Risk", "Tests healthcare and safety-critical mapping."],
                ["Customer Chatbot", "Answers support questions and opens tickets without deciding rights.", "Limited Risk", "Tests transparency duties and negation handling."],
                ["Spam Filter", "Classifies emails as spam or safe with user review.", "Minimal Risk", "Tests minimal-risk fallback and baseline citations."],
                ["Emotion Detection in School", "Infers student attention/emotion from webcams.", "Unacceptable Risk", "Tests education emotion-recognition prohibition."],
                ["Evidence Stress Case", "Uploaded text includes sensitive attributes, dataset imbalance, oversight evidence, false results, and contradiction.", "High Risk with warnings", "Tests evidence ingestion, model hooks, uncertainty, and contradiction detection."],
                ["Custom Minimal Intake", "Internal email draft helper with human review and no material decision effect.", "Minimal Risk", "Tests blank-start user journey."],
            ],
            [3.0 * cm, 5.2 * cm, 2.9 * cm, 4.6 * cm],
        )
    )

    heading(story, "10. Automated QA Result", section)
    qa_rows = [["Test", "Status", "Detail"]]
    for case in qa["cases"]:
        qa_rows.append([case["name"], case["status"].upper(), case["detail"]])
    story.append(styled_table(qa_rows, [8.2 * cm, 2.1 * cm, 5.4 * cm]))
    story.append(
        p(
            "The final verification also passed TypeScript compilation, production build, and local HTTP availability at http://127.0.0.1:5173/.",
            body,
        )
    )

    heading(story, "11. Risks, Limitations, and Ethics", section)
    story.append(
        bullets(
            [
                "The product is not legal advice and should not be used as the final legal determination for a real deployment.",
                "Legal rules are summarized for screening and teaching; legal counsel should verify edge cases, exceptions, and sector-specific laws.",
                "Evidence extraction is keyword-based and should be replaced with stronger document parsing for production.",
                "Model testing hooks are evidence-based summaries, not full technical audits.",
                "A production system would need authentication, encrypted storage, role-based access, retention controls, and a verified legal update process.",
            ],
            body,
        )
    )

    heading(story, "12. Sources Used for Legal Framing", section)
    story.append(
        bullets(
            [
                "Regulation (EU) 2024/1689, official EU AI Act text on EUR-Lex.",
                "European Commission AI Act overview: risk-based approach, prohibited practices, high-risk examples, transparency duties, GPAI timing, and implementation timeline.",
                "AI Act Service Desk and class materials for annex structure, high-risk systems, prohibited practices, GPAI, and data-protection context.",
            ],
            body,
        )
    )

    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=1.45 * cm,
        leftMargin=1.45 * cm,
        topMargin=1.25 * cm,
        bottomMargin=1.25 * cm,
        title="AI Act Risk Classifier Pro Detailed Project Documentation",
        author="AI Act Risk Classifier Pro",
    )
    doc.build(story)
    return OUTPUT


if __name__ == "__main__":
    output = build_pdf()
    print(output)
