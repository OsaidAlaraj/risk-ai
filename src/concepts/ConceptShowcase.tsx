/**
 * CONCEPT SHOWCASE
 * 
 * This page allows you to preview all 3 design concepts side by side.
 * Click on any concept to view it in full-screen mode.
 */

import { useState } from 'react';
import ConceptA_Editorial from './ConceptA_Editorial';
import ConceptB_Terminal from './ConceptB_Terminal';
import ConceptC_Spatial from './ConceptC_Spatial';

const concepts = [
  {
    id: 'A',
    name: 'Editorial',
    subtitle: 'Magazine-inspired, scroll-driven',
    description: 'Full-screen immersive sections with editorial typography. Progress shown as chapter markers. Intelligence as margin annotations. Report as a beautifully typeset legal document.',
    designSystem: {
      colors: 'Warm cream (#FDFCFA), Charcoal (#1a1a1a), Soft grays',
      typography: 'Serif for headings, clean sans for body',
      layout: 'Single column, full-screen sections, vertical scroll',
      navigation: 'Chapter markers on left margin',
      intelligence: 'Margin annotations',
      report: 'Typeset legal document',
    },
    component: ConceptA_Editorial,
  },
  {
    id: 'B',
    name: 'Terminal',
    subtitle: 'Command-line, keyboard-first',
    description: 'Dark, focused interface with centered command input. Questions presented one at a time with conversational flow. Intelligence as inline hints. Report as structured JSON output.',
    designSystem: {
      colors: 'Deep black (#0a0a0a), Soft white (#e5e5e5), Green accent (#22c55e)',
      typography: 'Monospace throughout',
      layout: 'Centered terminal, scrolling history',
      navigation: 'Status bar with stage indicators',
      intelligence: 'Inline command suggestions',
      report: 'JSON-style structured output',
    },
    component: ConceptB_Terminal,
  },
  {
    id: 'C',
    name: 'Spatial',
    subtitle: 'Canvas workspace, horizontal journey',
    description: 'Horizontal timeline navigation, left-to-right journey. Each stage is a distinct spatial zone. Intelligence as floating assistant. Report materializes as you progress.',
    designSystem: {
      colors: 'Warm gray (#f5f5f0), Black (#1a1a1a), Olive undertones',
      typography: 'Clean sans, large headings',
      layout: 'Horizontal zones, expandable focus areas',
      navigation: 'Spatial left-to-right movement',
      intelligence: 'Floating assistant panel',
      report: 'Live document preview',
    },
    component: ConceptC_Spatial,
  },
];

export default function ConceptShowcase() {
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const SelectedComponent = selectedConcept 
    ? concepts.find(c => c.id === selectedConcept)?.component 
    : null;

  if (SelectedComponent) {
    return (
      <div className="relative">
        {/* Back Button */}
        <button
          onClick={() => setSelectedConcept(null)}
          className="fixed top-6 left-6 z-[100] flex items-center gap-2 px-4 py-2 bg-black/80 text-white text-sm backdrop-blur-sm hover:bg-black transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Concepts
        </button>
        
        {/* Concept Label */}
        <div className="fixed top-6 right-6 z-[100] px-4 py-2 bg-black/80 text-white text-sm backdrop-blur-sm">
          Concept {selectedConcept}: {concepts.find(c => c.id === selectedConcept)?.name}
        </div>

        <SelectedComponent />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-16">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs tracking-[0.3em] uppercase text-[#737373]">Design Concepts</span>
          <span className="text-[#404040]">/</span>
          <span className="text-sm">AI Act Risk Classifier Pro</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-light mb-4">
          3 Design Directions
        </h1>
        <p className="text-lg text-[#a3a3a3] max-w-2xl">
          Each concept presents a radically different approach to the assessment experience. 
          Click any concept to explore it in full interactive mode.
        </p>
      </header>

      {/* Concept Cards */}
      <div className="max-w-6xl mx-auto grid gap-8">
        {concepts.map((concept) => (
          <div
            key={concept.id}
            className="group border border-[#262626] hover:border-[#404040] transition-all duration-300"
          >
            {/* Card Header */}
            <div className="p-8 border-b border-[#262626]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-4 mb-3">
                    <span className="text-4xl font-light text-[#404040]">{concept.id}</span>
                    <div>
                      <h2 className="text-2xl font-medium">{concept.name}</h2>
                      <p className="text-sm text-[#737373]">{concept.subtitle}</p>
                    </div>
                  </div>
                  <p className="text-[#a3a3a3] max-w-xl leading-relaxed">
                    {concept.description}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedConcept(concept.id)}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-black hover:bg-[#e5e5e5] transition-colors"
                >
                  <span>Preview</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Design System Details */}
            <div className="p-8">
              <button
                onClick={() => setExpandedCard(expandedCard === concept.id ? null : concept.id)}
                className="flex items-center gap-2 text-sm text-[#737373] hover:text-white transition-colors mb-4"
              >
                <svg 
                  className={`w-4 h-4 transition-transform ${expandedCard === concept.id ? 'rotate-90' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Design System Notes
              </button>

              {expandedCard === concept.id && (
                <div className="grid md:grid-cols-3 gap-6 pt-4 animate-in fade-in duration-300">
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-[#737373] mb-2">Colors</h4>
                    <p className="text-sm text-[#a3a3a3]">{concept.designSystem.colors}</p>
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-[#737373] mb-2">Typography</h4>
                    <p className="text-sm text-[#a3a3a3]">{concept.designSystem.typography}</p>
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-[#737373] mb-2">Layout</h4>
                    <p className="text-sm text-[#a3a3a3]">{concept.designSystem.layout}</p>
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-[#737373] mb-2">Navigation</h4>
                    <p className="text-sm text-[#a3a3a3]">{concept.designSystem.navigation}</p>
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-[#737373] mb-2">Intelligence Companion</h4>
                    <p className="text-sm text-[#a3a3a3]">{concept.designSystem.intelligence}</p>
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-[#737373] mb-2">Report Presentation</h4>
                    <p className="text-sm text-[#a3a3a3]">{concept.designSystem.report}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto mt-16 pt-8 border-t border-[#262626]">
        <p className="text-sm text-[#737373]">
          These are standalone concept previews using mocked data. 
          Select your preferred direction to proceed with full implementation.
        </p>
      </footer>
    </div>
  );
}
