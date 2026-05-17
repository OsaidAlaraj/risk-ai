export type FieldHelp = {
  title: string;
  means: string;
  effect: string;
  notMean: string;
  example: string;
};

const help = (
  title: string,
  means: string,
  effect: string,
  notMean: string,
  example: string
): FieldHelp => ({ title, means, effect, notMean, example });

export const FIELD_HELP: Record<string, FieldHelp> = {
  "system name": help(
    "System name",
    "The product or project being screened.",
    "This labels the memo and audit trail.",
    "It does not affect the legal tier by itself.",
    "Example: TalentRank AI."
  ),
  organization: help(
    "Organization",
    "The organization responsible for the system or assessment.",
    "This gives the report context for obligations and ownership.",
    "It does not decide whether the system is high-risk.",
    "Example: Northstar HR Labs."
  ),
  "work area": help(
    "Work area",
    "A plain-language business context.",
    "It can help spot possible domains to clarify.",
    "It is not a legal category on its own.",
    "Example: customer support or hiring."
  ),
  "system description": help(
    "System description",
    "A short explanation of what the AI does.",
    "The classifier uses it to infer candidate signals that still need structured support.",
    "It should not replace the selected facts.",
    "Example: Scores loan applicants for eligibility review."
  ),
  provider: help(
    "Provider",
    "The organization develops or places the AI system on the market.",
    "Provider status can affect which obligations apply.",
    "It does not make the system high-risk by itself.",
    "Example: A vendor selling the AI tool in the EU."
  ),
  deployer: help(
    "Deployer",
    "The organization uses the AI system in its own process.",
    "Deployer status can affect operational responsibilities.",
    "It does not change the legal risk tier by itself.",
    "Example: A bank using a credit model."
  ),
  importer: help(
    "Importer",
    "The organization brings an AI system into the EU market.",
    "This can affect market-chain obligations.",
    "It does not prove a high-risk use case.",
    "Example: Importing a third-party AI product for EU sale."
  ),
  distributor: help(
    "Distributor",
    "The organization makes an AI system available without materially changing it.",
    "This can affect distribution responsibilities.",
    "It does not create a high-risk route alone.",
    "Example: Reselling a compliant AI package."
  ),
  "product manufacturer": help(
    "Product manufacturer",
    "The organization embeds AI into a regulated product.",
    "This can support the Article 6(1) product-safety route.",
    "It does not apply to ordinary software use alone.",
    "Example: AI inside a medical device."
  ),
  "affected person": help(
    "Affected person",
    "A person impacted by an AI output.",
    "This helps distinguish obligations from the perspective of users and impacted people.",
    "It does not say the organization controls the system.",
    "Example: A candidate assessed by a hiring tool."
  ),
  "not sure yet": help(
    "Not sure yet",
    "The answer is not known at this stage.",
    "This usually lowers confidence and adds clarification needs.",
    "It should not erase a strong legal signal elsewhere.",
    "Example: The decision role is still being documented."
  ),
  "ai system": help(
    "AI system",
    "The system uses prediction, classification, recommendation, generation, scoring, or inference.",
    "AI status is needed before EU AI Act risk routes can be assessed.",
    "It does not mean the system is automatically high-risk.",
    "Example: A model ranks support tickets by urgency."
  ),
  "gpai model": help(
    "GPAI model",
    "A general-purpose AI model that can support many downstream tasks.",
    "This can surface model-provider and transparency questions.",
    "It is not the same as a specific high-risk deployed use case.",
    "Example: A foundation model API."
  ),
  "gpai systemic risk": help(
    "GPAI systemic risk",
    "A general-purpose model with possible high-impact capabilities.",
    "This can add model-level review and testing needs.",
    "It does not automatically classify every downstream use as high-risk.",
    "Example: A frontier model with broad deployment."
  ),
  "embedded component": help(
    "Embedded component",
    "AI is part of a product or safety component.",
    "This can support the Article 6(1) + Annex I product route.",
    "It does not apply just because software runs on a device.",
    "Example: AI controlling a regulated machine safety function."
  ),
  "unclear / not ai": help(
    "Unclear / not AI",
    "Use this for fixed rules, simple spreadsheets, or vague systems.",
    "The result may become not-AI or need clarification.",
    "It should not be used for AI-like scoring or prediction.",
    "Example: A static spreadsheet formula."
  ),
  "used in the eu": help(
    "Used in the EU",
    "Select this if the AI system is used inside the EU.",
    "This can bring the system into EU AI Act scope.",
    "It does not prove high-risk by itself.",
    "Example: A tool used by staff in Germany."
  ),
  "placed on eu market": help(
    "Placed on EU market",
    "Select this if the system is sold, offered, or made available in the EU.",
    "This can establish EU AI Act scope even for non-EU providers.",
    "It does not describe the use-case risk.",
    "Example: A US vendor sells the AI tool to EU customers."
  ),
  "affects eu users": help(
    "Affects EU users",
    "Select this if people in the EU are affected by the system output.",
    "This can establish EU AI Act scope.",
    "It does not say the system is physically hosted in the EU.",
    "Example: EU applicants are ranked by the system."
  ),
  "what does the ai take in?": help(
    "Inputs",
    "Inputs are what the AI uses to produce an output.",
    "Inputs help detect data categories and possible domains.",
    "Data alone does not always create high-risk classification.",
    "Example: CVs, bank statements, images, or messages."
  ),
  "what does the ai produce?": help(
    "Outputs",
    "Outputs are what the AI produces.",
    "Outputs strongly affect the risk tier when they influence people.",
    "Generated text is not the same as synthetic image, audio, or video media.",
    "Example: Scores, rankings, summaries, decisions, or letters."
  ),
  "who relies on the output?": help(
    "Output users",
    "The people or teams that use the AI result.",
    "This helps assess whether the output influences a consequential decision.",
    "It is not the same as affected people.",
    "Example: Recruiters, caseworkers, doctors, or customers."
  ),
  "interaction mode": help(
    "Interaction mode",
    "Whether people interact with the AI directly, internally, or both.",
    "Direct interaction can trigger Article 50 transparency review.",
    "It does not make the system high-risk by itself.",
    "Example: Applicants use an AI interview system."
  ),
  "internal only": help(
    "Internal only",
    "The AI is used inside one organization.",
    "This may reduce transparency issues but not necessarily high-risk if decisions are consequential.",
    "It does not mean affected people are irrelevant.",
    "Example: Staff use an internal triage dashboard."
  ),
  "user-facing": help(
    "User-facing",
    "People interact directly with the AI.",
    "This can trigger transparency duties.",
    "It does not automatically trigger high-risk.",
    "Example: A customer chatbot."
  ),
  both: help(
    "Both",
    "The system is used internally and directly by people.",
    "This can trigger transparency review while other routes are still evaluated.",
    "It does not suppress high-risk or Article 5 analysis.",
    "Example: Applicants interact with an AI interview tool used by recruiters."
  ),
  "decision role": help(
    "Decision role",
    "How strongly the AI affects the final outcome.",
    "Material influence or automatic decisions strengthen high-risk routes in sensitive domains.",
    "It does not replace the legal domain analysis.",
    "Example: A score normally determines interview priority."
  ),
  "prepares information": help(
    "Prepares information",
    "The AI supports a human without strongly shaping the outcome.",
    "This usually lowers impact but may still need review.",
    "It does not erase transparency or evidence needs.",
    "Example: Summarizing notes for a human reviewer."
  ),
  "materially influences": help(
    "Materially influences",
    "People normally rely on the AI output when deciding.",
    "This can support high-risk classification in sensitive domains.",
    "It does not mean the AI is the final decision-maker.",
    "Example: A hiring score determines who is interviewed."
  ),
  "automatically decides": help(
    "Automatically decides",
    "The AI finalizes or effectively controls the outcome.",
    "This increases risk in employment, education, credit, healthcare, and public services.",
    "It does not remove the need to identify the domain.",
    "Example: The system rejects applications automatically."
  ),
  "who could be affected?": help(
    "Affected people",
    "People whose opportunities, rights, services, or treatment may be affected.",
    "This helps confirm high-risk routes when combined with domain and output impact.",
    "It is not only the person operating the tool.",
    "Example: Job applicants, students, patients, or residents."
  ),
  "what data does it use?": help(
    "Data categories",
    "Types of data processed by the system.",
    "Data can support evidence and privacy review.",
    "Data alone should not trigger a legal use-case domain.",
    "Example: Employment history used in a public-benefits case is still just data."
  ),
  "personal data": help(
    "Personal data",
    "Information about an identified or identifiable person.",
    "This can affect privacy and evidence review.",
    "It does not automatically make the AI high-risk.",
    "Example: Name, email, or account history."
  ),
  "sensitive data": help(
    "Sensitive data",
    "Special-category or sensitive personal information.",
    "This can lower confidence without safeguards and evidence.",
    "It does not trigger Article 5 biometric categorization by itself.",
    "Example: Religion, ethnicity, health, or union membership data."
  ),
  "biometric data": help(
    "Biometric data",
    "Face, voice, fingerprint, or similar body-based data.",
    "This can support biometric verification or identification analysis.",
    "It does not automatically mean prohibited biometric categorization.",
    "Example: A selfie used for login verification."
  ),
  "health data": help(
    "Health data",
    "Medical or health-related information.",
    "This can affect evidence and privacy review.",
    "Health data alone does not mean the AI makes medical decisions.",
    "Example: Medical hardship documents in a benefits application."
  ),
  "education records": help(
    "Education records",
    "Grades, degrees, schools, or qualifications used as data.",
    "This may matter as data in another domain.",
    "It does not automatically mean education-domain AI.",
    "Example: A CV education section in recruitment."
  ),
  "employment history": help(
    "Employment history",
    "Past jobs or work experience used as data.",
    "This may matter as data in another domain.",
    "It does not automatically mean employment-domain AI.",
    "Example: Prior employer listed in a public-benefits form."
  ),
  "location data": help(
    "Location data",
    "Information about where a person is or has been.",
    "This can affect privacy and impact review.",
    "It does not create a high-risk route alone.",
    "Example: Delivery location history."
  ),
  "behavioral data": help(
    "Behavioral data",
    "Actions, patterns, or behavior logs.",
    "This can matter for scoring, monitoring, or Article 5 review.",
    "It does not equal social scoring unless the legal pattern is present.",
    "Example: App activity used in fraud review."
  ),
  "public records": help(
    "Public records",
    "Publicly available records used as input.",
    "This can affect evidence and data governance review.",
    "It does not lower risk just because the data is public.",
    "Example: Court or registry records."
  ),
  "ranks people": help(
    "Ranks people",
    "The AI orders people by priority, suitability, risk, or quality.",
    "Ranking can support high-risk routes in sensitive domains.",
    "It does not trigger high-risk without a relevant domain and impact.",
    "Example: Ranking job candidates."
  ),
  "scores people": help(
    "Scores people",
    "The AI gives a person a score, rating, or risk level.",
    "Scores matter most when they affect opportunities or access.",
    "It is not social scoring unless broader Article 5 facts are present.",
    "Example: Creditworthiness score."
  ),
  "filters people": help(
    "Filters people",
    "The AI removes, screens out, flags, or shortlists people.",
    "Filtering can support high-risk in employment, education, public services, credit, and similar areas.",
    "It does not classify the domain by itself.",
    "Example: Shortlisting applicants."
  ),
  "approves / rejects": help(
    "Approves or rejects",
    "The AI approves, denies, rejects, or recommends approval or rejection.",
    "This strongly affects risk when jobs, benefits, services, education, health, or credit are involved.",
    "It does not tell which legal route applies without domain facts.",
    "Example: Recommending benefit denial."
  ),
  "recommends people": help(
    "Recommends people",
    "The AI recommends a person for selection, rejection, support, investigation, or priority.",
    "Recommendations can be high-risk if humans rely on them.",
    "It does not require the AI to make the final decision.",
    "Example: Recommending candidates for interview."
  ),
  "assesses people": help(
    "Assesses people",
    "The AI evaluates ability, risk, behavior, performance, eligibility, or suitability.",
    "Assessment can support high-risk when tied to consequential domains.",
    "It does not trigger high-risk from a vague assessment alone.",
    "Example: Assessing student essays."
  ),
  "employment domain": help(
    "Employment domain",
    "Use this only for hiring, recruitment, worker monitoring, promotion, dismissal, task allocation, or worker evaluation.",
    "This can support Annex III employment high-risk when combined with affected people and decision impact.",
    "It is not the same as employment history data.",
    "Example: Candidate screening for hiring."
  ),
  "education domain": help(
    "Education domain",
    "Use this only for admission, grading, exams, pass/fail, progression, or access to education.",
    "This can support Annex III education high-risk.",
    "It is not the same as education records used as background data.",
    "Example: Student essay grading."
  ),
  "healthcare domain": help(
    "Healthcare domain",
    "Use this only for diagnosis, triage, treatment, medical urgency, referral, or patient care.",
    "This can support healthcare or product-safety review.",
    "It is not triggered by health data alone.",
    "Example: Prioritizing patients for emergency care."
  ),
  "public services": help(
    "Public services",
    "Use this when the AI affects government services, public benefits, eligibility, priority, or investigation.",
    "This can support Annex III point 5 high-risk.",
    "It is not triggered just by public-sector ownership.",
    "Example: Ranking housing-support applications."
  ),
  "finance domain": help(
    "Finance domain",
    "Use this if the AI affects credit, loans, banking, pricing, or financial eligibility.",
    "This can support Annex III point 5 for credit or essential private services.",
    "Financial data alone is not enough.",
    "Example: Loan approval scoring."
  ),
  "insurance domain": help(
    "Insurance domain",
    "Use this when the AI affects insurance access, eligibility, or pricing.",
    "This can require high-risk or adjacent sector review depending on context.",
    "It is not triggered by payment history alone.",
    "Example: Eligibility scoring for essential insurance."
  ),
  "biometric categorization": help(
    "Biometric categorization",
    "The AI groups people using biometric traits.",
    "This becomes especially serious if it infers sensitive traits.",
    "It is not the same as selfie identity verification.",
    "Example: Inferring ethnicity from facial features."
  ),
  "emotion recognition": help(
    "Emotion recognition",
    "The AI infers emotions from face, voice, tone, expression, or behavior.",
    "In workplace or education settings this may raise Article 5 concerns.",
    "It does not mean every video system is prohibited.",
    "Example: Scoring candidate nervousness in interviews."
  ),
  "real-time identification": help(
    "Real-time identification",
    "The AI identifies people live, especially in public spaces.",
    "This can raise serious biometric and Article 5 concerns.",
    "It is not the same as verifying one known user for login.",
    "Example: Live watchlist matching in a station."
  ),
  "generates public content": help(
    "Public-facing content",
    "AI-generated text is shown or sent to people.",
    "This may trigger transparency duties depending on context.",
    "It is not synthetic media unless it creates image, audio, video, or deepfake-like media.",
    "Example: A generated benefit decision letter."
  ),
  "public content": help(
    "Public-facing content",
    "AI-generated text is shown or sent to people.",
    "This may trigger transparency duties depending on context.",
    "It is not synthetic media unless it creates image, audio, video, or deepfake-like media.",
    "Example: A generated benefit decision letter."
  ),
  "direct interaction": help(
    "Direct interaction",
    "People interact directly with the AI.",
    "This can trigger Article 50 transparency review.",
    "It does not make the system high-risk by itself.",
    "Example: A candidate talks to an AI interview agent."
  ),
  "synthetic content": help(
    "Synthetic media",
    "Generated or manipulated image, audio, video, or deepfake-like media.",
    "This can trigger Article 50 transparency review.",
    "It does not include ordinary generated text.",
    "Example: A realistic AI-generated video."
  ),
  "synthetic media": help(
    "Synthetic media",
    "Generated or manipulated image, audio, video, or deepfake-like media.",
    "This can trigger Article 50 transparency review.",
    "It does not include ordinary generated text.",
    "Example: A realistic AI-generated video."
  ),
  "human oversight": help(
    "Human oversight",
    "A trained human can meaningfully review, override, or stop the AI output.",
    "This improves readiness and confidence.",
    "It does not erase a high-risk classification.",
    "Example: A reviewer can reject an AI recommendation."
  ),
  "appeal path": help(
    "Appeal path",
    "Affected people can challenge, appeal, or request review of AI-supported outcomes.",
    "This improves safeguards and reviewer confidence.",
    "It does not change the legal risk tier by itself.",
    "Example: Applicants can request human review."
  ),
  "data governance": help(
    "Data governance",
    "Data sources, quality, bias checks, and validation are documented.",
    "This improves confidence and readiness.",
    "It does not remove obligations for high-risk systems.",
    "Example: Dataset quality and bias checks are recorded."
  ),
  disclosure: help(
    "Disclosure",
    "Users or affected people are told that AI is involved.",
    "This matters for transparency and trust.",
    "It does not replace other safeguards.",
    "Example: A chatbot clearly says it is AI."
  ),
  "show legal basis": help(
    "Show legal basis",
    "Include expanded legal references in the report.",
    "This makes the memo more useful for human review.",
    "It does not change the classification.",
    "Example: Show Article 6 and Annex III references."
  ),
};

const normalizeHelpKey = (key: string) =>
  key
    .toLowerCase()
    .replace(/[^\w\s/?-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const genericHelp = (label: string): FieldHelp =>
  help(
    label || "Field information",
    "This answer adds structured context to the assessment.",
    "It can affect risk, confidence, review status, or recommended actions when combined with other facts.",
    "It is not treated as a legal conclusion by itself.",
    "Example: Combine domain, affected people, output, and decision role for stronger classification."
  );

export function getFieldHelp(label?: string, explicitId?: string): FieldHelp {
  const keys = [explicitId, label].filter(Boolean).map((item) => normalizeHelpKey(item as string));
  for (const key of keys) {
    if (FIELD_HELP[key]) return FIELD_HELP[key];
  }
  return genericHelp(label || explicitId || "Field information");
}
