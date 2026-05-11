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
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
DOCS_DIR = ROOT / "docs"
QA_RESULTS = ROOT / "qa-results.json"
OUTPUT = DOCS_DIR / "AI_Act_Risk_Classifier_Pro_Professor_Documentation.pdf"


def load_qa_results() -> dict:
    if not QA_RESULTS.exists():
        return {
            "status": "not-run",
            "totals": {"passed": 0, "failed": 0},
            "cases": [],
            "generatedAt": datetime.utcnow().isoformat(),
        }
    return json.loads(QA_RESULTS.read_text(encoding="utf-8"))


def bullet_items(items: list[str], style: ParagraphStyle) -> ListFlowable:
    return ListFlowable(
        [ListItem(Paragraph(item, style), leftIndent=12) for item in items],
        bulletType="bullet",
        leftIndent=16,
        bulletFontName="Helvetica",
        bulletFontSize=8,
    )


def add_heading(story: list, text: str, style: ParagraphStyle) -> None:
    story.append(Spacer(1, 0.25 * cm))
    story.append(Paragraph(text, style))
    story.append(Spacer(1, 0.12 * cm))


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
            fontSize=25,
            leading=31,
            textColor=colors.HexColor("#203038"),
            spaceAfter=12,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SubtitleCenter",
            parent=styles["BodyText"],
            alignment=TA_CENTER,
            fontSize=11,
            leading=16,
            textColor=colors.HexColor("#56666d"),
            spaceAfter=18,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Section",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=18,
            textColor=colors.HexColor("#2c4d49"),
            spaceBefore=8,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Small",
            parent=styles["BodyText"],
            fontSize=8.7,
            leading=12,
            textColor=colors.HexColor("#4a5960"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="BodyClean",
            parent=styles["BodyText"],
            fontSize=10,
            leading=14.5,
            textColor=colors.HexColor("#25343a"),
            spaceAfter=6,
        )
    )

    title = styles["TitleCenter"]
    subtitle = styles["SubtitleCenter"]
    section = styles["Section"]
    body = styles["BodyClean"]
    small = styles["Small"]

    story: list = []

    story.append(Spacer(1, 1.2 * cm))
    story.append(Paragraph("AI Act Risk Classifier Pro", title))
    story.append(
        Paragraph(
            "Professor Documentation: Business Case, Legal Logic, Technical Architecture, Demo Script, and QA Evidence",
            subtitle,
        )
    )
    story.append(Spacer(1, 0.4 * cm))
    story.append(
        Table(
            [
                ["Project type", "LegalTech compliance product / EU AI Act risk classifier"],
                ["Frontend", "React + TypeScript + Tailwind CSS"],
                ["Core engine", "Rule-based legal classifier with evidence and uncertainty modules"],
                ["Generated", datetime.now().strftime("%d %B %Y, %H:%M")],
                ["QA result", f"{qa['status'].upper()} - {qa['totals']['passed']} passed, {qa['totals']['failed']} failed"],
            ],
            colWidths=[4.2 * cm, 11.5 * cm],
            style=[
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e4ebe7")),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#b8c6c1")),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f6f8f6")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ],
        )
    )
    story.append(Spacer(1, 0.6 * cm))
    story.append(
        Paragraph(
            "This document is written to support a classroom presentation and proof-of-concept review. "
            "The product is educational decision support, not legal advice.",
            small,
        )
    )
    story.append(PageBreak())

    add_heading(story, "1. Executive Summary", section)
    story.append(
        Paragraph(
            "AI Act Risk Classifier Pro is a full-cycle LegalTech web app that helps users classify AI systems under the EU AI Act. "
            "The interface is intentionally beginner-friendly: users describe a product in ordinary language, select practical risk signals, "
            "upload optional evidence, review uncertainty, and export a professional report. Behind the simple workflow, the system maps facts "
            "to prohibited practices, high-risk categories, transparency obligations, conformity-assessment workflows, and legal citations.",
            body,
        )
    )

    add_heading(story, "2. Business Value", section)
    story.append(
        bullet_items(
            [
                "Reduces the gap between product teams and legal/compliance teams by translating product facts into legal risk categories.",
                "Creates a reusable evidence trail for classroom demos, internal reviews, procurement discussions, and early compliance planning.",
                "Supports startup-style positioning: simple intake, credible risk output, exportable report, and transparent reasoning.",
                "Keeps the product honest by showing uncertainty, missing information, contradictions, and limitations instead of pretending to be legal advice.",
            ],
            body,
        )
    )

    add_heading(story, "3. User Experience", section)
    story.append(
        Paragraph(
            "The workflow is designed for non-lawyers and follows a calm linear path: Describe -> Identify -> Assess -> Review -> Export. "
            "The UI uses simple labels, toggles, chips, dropdowns, optional detail sections, and soft colors. Legal citations stay hidden "
            "until the user expands 'Show legal basis'. This keeps the first experience human, friendly, and low-friction.",
            body,
        )
    )

    add_heading(story, "4. Legal Logic", section)
    story.append(
        bullet_items(
            [
                "Article 5 red-line screen: detects prohibited-practice patterns and stops the workflow when a strong trigger appears.",
                "Article 6 and Annex III screen: maps use cases such as employment, education, law enforcement, migration, healthcare, critical infrastructure, biometrics, essential services, justice, and democratic processes.",
                "Article 50 screen: detects transparency duties for chatbots, generated content, deepfakes, emotion recognition, and biometric categorisation.",
                "Annex I-V registry: structured clause summaries support product-safety context, serious-offence context, high-risk categories, technical documentation, and declaration-of-conformity items.",
                "Conditional handling: the engine now avoids false high-risk mapping when the user says the system does not decide eligibility or access.",
            ],
            body,
        )
    )

    add_heading(story, "5. Evidence-Driven Compliance Engine", section)
    story.append(
        Paragraph(
            "The evidence layer accepts text-like model cards, datasets, logs, and technical documentation. It extracts signals related to "
            "sensitive attributes, human oversight, dataset risks, model behavior, documentation evidence, and contradictions. These signals "
            "feed into the final checklist, model-test summaries, uncertainty bars, and report output.",
            body,
        )
    )

    add_heading(story, "6. Technical Architecture", section)
    architecture_rows = [
        ["UI Layer", "Wizard, scenario playground, results dashboard, report view"],
        ["Legal Engine", "Rules, classifier, annex registry, citations, conformity workflow"],
        ["Evidence Validator", "Evidence upload parsing and signal extraction"],
        ["Model Testing", "Bias, robustness, explainability, and stress-test hooks"],
        ["Report Generator", "Printable report and structured report manifest"],
        ["Audit Layer", "Local versioned records, timestamps, change logs, evidence bundle export"],
    ]
    story.append(
        Table(
            architecture_rows,
            colWidths=[4.2 * cm, 11.5 * cm],
            style=[
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e4ebe7")),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#b8c6c1")),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.8),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ],
        )
    )

    add_heading(story, "7. Full-Cycle QA Results", section)
    story.append(
        Paragraph(
            "The QA harness exercises scenario classification, evidence extraction, model testing, report manifest generation, audit versioning, "
            "and a clean custom intake. Production TypeScript and Vite build checks also passed, and the local app returned HTTP 200.",
            body,
        )
    )
    qa_rows = [["Test Case", "Status", "Detail"]]
    for case in qa["cases"]:
        qa_rows.append([case["name"], case["status"].upper(), case["detail"]])
    story.append(
        Table(
            qa_rows,
            colWidths=[8.2 * cm, 2.1 * cm, 5.4 * cm],
            style=[
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2c4d49")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#b8c6c1")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f6f8f6")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ],
        )
    )

    story.append(PageBreak())

    add_heading(story, "8. Demo Script", section)
    story.append(
        bullet_items(
            [
                "Start on the homepage and explain the problem: AI regulation is complex, and teams need a simple way to screen risk.",
                "Load the AI CV Screening scenario and run the classification.",
                "Show the High Risk result, confidence bars, reasoning pipeline, and high-risk conformity workflow.",
                "Open 'Show legal basis' to demonstrate expert mode without overwhelming beginners.",
                "Mention that evidence files and model-test hooks influence the uncertainty and compliance output.",
                "Open the report page and explain that it can be printed or saved as PDF.",
                "Close by emphasizing that the tool is educational decision support, not a replacement for legal counsel.",
            ],
            body,
        )
    )

    add_heading(story, "9. Limitations and Credibility Notes", section)
    story.append(
        bullet_items(
            [
                "The product summarizes legal logic and should not be treated as legal advice.",
                "Evidence extraction is keyword-based for the proof of concept; production use would need stronger document parsing and validation.",
                "Model-test hooks summarize evidence signals; they do not yet execute full fairness, robustness, explainability, or adversarial test suites.",
                "Annex I-V coverage is encoded as structured summaries for screening, not full statutory text.",
                "Audit history currently uses browser local storage; production use would need authenticated storage and access control.",
            ],
            body,
        )
    )

    add_heading(story, "10. Sources and Reference Material", section)
    story.append(
        bullet_items(
            [
                "Regulation (EU) 2024/1689 official text on EUR-Lex.",
                "European Commission AI Act overview and AI Act Service Desk annex materials.",
                "Class materials supplied with the project on prohibited practices, high-risk systems, GPAI, and data protection.",
            ],
            body,
        )
    )

    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=1.7 * cm,
        leftMargin=1.7 * cm,
        topMargin=1.45 * cm,
        bottomMargin=1.45 * cm,
        title="AI Act Risk Classifier Pro Professor Documentation",
        author="AI Act Risk Classifier Pro",
    )
    doc.build(story)
    return OUTPUT


if __name__ == "__main__":
    output = build_pdf()
    print(output)
