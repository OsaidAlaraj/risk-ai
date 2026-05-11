import { highRiskChecklist, limitedRiskChecklist, minimalRiskChecklist, limitedRiskRules } from "../engine/rules";
import type { ClassificationInput, LegalCitation, RiskTier, TriggeredRule } from "../engine/types";

function extractArticleAndAnnex(basis: string) {
  const articleMatch = basis.match(/Article\s+\d+[A-Za-z]?/i);
  const annexMatch = basis.match(/Annex\s+[IVX]+/i);
  return {
    article: articleMatch?.[0],
    annex: annexMatch?.[0],
  };
}

export function buildTriggeredCitations(
  input: ClassificationInput,
  prohibitedMatches: TriggeredRule[],
  highRiskMatches: TriggeredRule[],
  transparencyRules: TriggeredRule[],
  tier: RiskTier,
): LegalCitation[] {
  const baselineScreeningCitations: LegalCitation[] = [
    {
      id: "screen-scope",
      legalBasis: "Scope screen",
      plainExplanation: "The app first checks whether the system is in EU scope before classifying risk.",
      expertSummary: "Scope is treated as a separate gate from the risk tiers.",
    },
    {
      id: "screen-article-5",
      legalBasis: "Article 5",
      article: "Article 5",
      plainExplanation: "The prohibited-practice screen is reviewed before assigning the final tier.",
      expertSummary: "Article 5 is the first gate because prohibited practices override lower-risk classifications.",
    },
    {
      id: "screen-article-6-annex-iii",
      legalBasis: "Article 6 and Annex III",
      article: "Article 6",
      annex: "Annex III",
      plainExplanation: "The high-risk screen is reviewed before assigning the final tier.",
      expertSummary: "Article 6 and Annex III are used to assess whether the system falls into a high-risk category.",
    },
    {
      id: "screen-article-50",
      legalBasis: "Article 50",
      article: "Article 50",
      plainExplanation: "The transparency screen is reviewed before assigning the final tier.",
      expertSummary: "Article 50 is used to assess whether disclosure or content-labeling duties may apply.",
    },
  ];

  if (tier === "out_of_scope") {
    return baselineScreeningCitations;
  }

  const prohibitedCitations =
    tier === "unacceptable"
      ? prohibitedMatches.map((rule) => ({
          id: `rule-${rule.id}`,
          legalBasis: rule.legalBasis,
          ...extractArticleAndAnnex(rule.legalBasis),
          plainExplanation: rule.shortDescription,
          expertSummary: `${rule.label}: ${rule.legalBasis}. ${rule.shortDescription}`,
        }))
      : [];

  const highRiskCitations =
    tier === "high"
      ? [
          ...highRiskMatches.map((rule) => ({
            id: `rule-${rule.id}`,
            legalBasis: rule.legalBasis,
            ...extractArticleAndAnnex(rule.legalBasis),
            plainExplanation: rule.shortDescription,
            expertSummary: `${rule.label}: ${rule.legalBasis}. ${rule.shortDescription}`,
          })),
          ...highRiskChecklist.slice(0, 6).map((item, index) => ({
            id: `workflow-${index}-${item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
            legalBasis: item.legalBasis,
            ...extractArticleAndAnnex(item.legalBasis),
            plainExplanation: item.description,
            expertSummary: `${item.title}: ${item.legalBasis}. ${item.description}`,
          })),
        ]
      : [];

  const transparencyCitations =
    tier === "limited"
      ? transparencyRules.map((rule) => ({
          id: `transparency-${rule.id}`,
          legalBasis: rule.legalBasis,
          ...extractArticleAndAnnex(rule.legalBasis),
          plainExplanation: rule.shortDescription,
          expertSummary: `${rule.label}: ${rule.legalBasis}. ${rule.shortDescription}`,
        }))
      : [];

  return [...baselineScreeningCitations, ...prohibitedCitations, ...highRiskCitations, ...transparencyCitations].filter(
    (citation, index, array) => array.findIndex((item) => item.id === citation.id) === index,
  );
}

export function buildConformityWorkflow(isHighRisk: boolean) {
  if (!isHighRisk) return [];

  return [
    ...highRiskChecklist.map((item) => ({
      title: item.title,
      legalBasis: item.legalBasis,
      description: item.description,
      priority: item.priority,
      source: "annex" as const,
    })),
    {
      title: "Post-market monitoring plan",
      legalBasis: "Article 72",
      description: "Define how real-world performance, incidents, and emerging risks will be tracked after deployment.",
      priority: "high" as const,
      source: "article" as const,
    },
    {
      title: "Human oversight operating procedure",
      legalBasis: "Article 14",
      description: "Describe who monitors the system, when they intervene, and how overrides are recorded.",
      priority: "critical" as const,
      source: "article" as const,
    },
  ];
}

export function buildChecklistForTier(tier: RiskTier, evidenceWarnings: string[]) {
  const evidenceItems = evidenceWarnings.slice(0, 3).map((warning) => ({
    title: warning,
    legalBasis: "Evidence review",
    description: warning,
    priority: "medium" as const,
    source: "evidence" as const,
  }));

  if (tier === "out_of_scope") {
    return [
      {
        title: "EU scope not established",
        legalBasis: "Scope screen",
        description: "Do not treat this as low risk. Reassess if the system later targets EU users, is placed on the EU market, or is used by an EU deployer.",
        priority: "high" as const,
        source: "article" as const,
      },
      ...evidenceItems,
    ];
  }

  if (tier === "needs_review") {
    return [
      {
        title: "Clarify the missing facts",
        legalBasis: "Review screen",
        description: "Add the missing scope, use-case, or evidence facts before treating the result as final.",
        priority: "critical" as const,
        source: "article" as const,
      },
      {
        title: "Resolve contradictions",
        legalBasis: "Review screen",
        description: "Make sure the description, selected facts, and evidence all point in the same direction.",
        priority: "critical" as const,
        source: "article" as const,
      },
      ...evidenceItems,
    ];
  }

  if (tier === "unacceptable") {
    return [
      {
        title: "Pause deployment and preserve records",
        legalBasis: "Article 5",
        description: "Treat the system as potentially prohibited until a qualified review confirms the classification.",
        priority: "critical" as const,
        source: "article" as const,
      },
      {
        title: "Document the triggering practice",
        legalBasis: "Governance good practice",
        description: "Record the feature, data source, user group, and harm scenario that made the case a stop-sign.",
        priority: "critical" as const,
        source: "article" as const,
      },
      {
        title: "Prepare a redesign path",
        legalBasis: "Risk mitigation",
        description: "Remove or legally reframe the triggering feature before further deployment.",
        priority: "high" as const,
        source: "article" as const,
      },
      ...evidenceItems,
    ];
  }

  if (tier === "high") {
    return [...highRiskChecklist, ...evidenceItems];
  }

  if (tier === "limited") {
    return [...limitedRiskChecklist, ...evidenceItems];
  }

  return [...minimalRiskChecklist, ...evidenceItems];
}
