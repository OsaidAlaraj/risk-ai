/**
 * CONCEPT A: EDITORIAL / MAGAZINE LAYOUT
 * 
 * Design Philosophy:
 * - Full-screen immersive sections that scroll vertically
 * - Progress shown as chapter markers on the side
 * - Questions appear as large editorial typography in the center
 * - Intelligence companion as subtle footnotes and margin annotations
 * - Report as a beautifully typeset legal document
 * 
 * Inspired by: NYT interactive features, Stripe docs, high-end editorial
 * 
 * Layout: Single column, full-screen sections, scroll-driven
 * Navigation: Chapter markers on left margin (vertical dots)
 * Intelligence: Margin annotations that appear contextually
 * Forms: Large typography questions, minimal input styling
 * Report: Typeset legal document with proper hierarchy
 */

import { useState } from 'react';

// Mock data for the assessment
const chapters = [
  { id: 'briefing', title: 'Briefing', subtitle: 'Understanding the context' },
  { id: 'identity', title: 'Identity', subtitle: 'System identification' },
  { id: 'function', title: 'Function', subtitle: 'AI capabilities' },
  { id: 'followups', title: 'Follow-ups', subtitle: 'Detailed analysis' },
  { id: 'evidence', title: 'Evidence', subtitle: 'Supporting documentation' },
  { id: 'review', title: 'Review', subtitle: 'Final classification' },
];

export default function ConceptA_Editorial() {
  const [activeChapter, setActiveChapter] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  return (
    <div className="concept-a min-h-screen bg-[#FDFCFA] text-[#1a1a1a] font-serif">
      {/* Minimal Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#FDFCFA]/95 backdrop-blur-sm border-b border-[#e8e6e1]">
        <div className="max-w-screen-xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs tracking-[0.3em] uppercase text-[#8a8580]">AI Act</span>
            <span className="text-[#c4c0b8]">/</span>
            <span className="text-sm font-medium">Risk Classifier Pro</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-xs text-[#8a8580]">Chapter {activeChapter + 1} of {chapters.length}</span>
            <button className="text-xs tracking-wide uppercase hover:text-[#8a8580] transition-colors">
              Save Draft
            </button>
          </div>
        </div>
      </header>

      {/* Chapter Navigation - Left Margin */}
      <nav className="fixed left-8 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col gap-4">
        {chapters.map((chapter, index) => (
          <button
            key={chapter.id}
            onClick={() => setActiveChapter(index)}
            className="group flex items-center gap-3"
          >
            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === activeChapter 
                ? 'bg-[#1a1a1a] scale-125' 
                : index < activeChapter 
                  ? 'bg-[#8a8580]' 
                  : 'bg-[#d4d0c8]'
            }`} />
            <span className={`text-xs tracking-wide opacity-0 group-hover:opacity-100 transition-opacity ${
              index === activeChapter ? 'opacity-100 font-medium' : ''
            }`}>
              {chapter.title}
            </span>
          </button>
        ))}
      </nav>

      {/* Main Content Area */}
      <main className="pt-24 pb-32">
        {/* Briefing Chapter */}
        {activeChapter === 0 && (
          <section className="min-h-[80vh] flex flex-col justify-center max-w-2xl mx-auto px-8">
            <div className="space-y-8">
              <div className="space-y-2">
                <span className="text-xs tracking-[0.3em] uppercase text-[#8a8580]">Chapter One</span>
                <h1 className="text-5xl md:text-6xl font-light leading-tight tracking-tight">
                  {chapters[0].title}
                </h1>
                <p className="text-xl text-[#5a5550] font-light italic">
                  {chapters[0].subtitle}
                </p>
              </div>

              <div className="h-px bg-[#e8e6e1] w-24" />

              <p className="text-lg leading-relaxed text-[#3a3530] max-w-xl">
                Before we begin the assessment, let us understand the context of your AI system. 
                This information will help us provide accurate guidance throughout the classification process.
              </p>

              {/* Question Block */}
              <div className="space-y-6 pt-8">
                <div className="relative">
                  <label className="block text-2xl font-light mb-4 leading-relaxed">
                    What is the name of the AI system you are assessing?
                  </label>
                  <input
                    type="text"
                    placeholder="Enter system name..."
                    className="w-full bg-transparent border-b-2 border-[#d4d0c8] focus:border-[#1a1a1a] py-3 text-xl font-light outline-none transition-colors placeholder:text-[#c4c0b8]"
                    value={answers.systemName || ''}
                    onChange={(e) => setAnswers({...answers, systemName: e.target.value})}
                  />
                  {/* Margin Annotation */}
                  <div className="absolute -right-64 top-0 w-48 hidden xl:block">
                    <p className="text-xs text-[#8a8580] leading-relaxed border-l border-[#e8e6e1] pl-4">
                      The system name will be used throughout the assessment report and official documentation.
                    </p>
                  </div>
                </div>

                <div className="relative pt-8">
                  <label className="block text-2xl font-light mb-4 leading-relaxed">
                    Briefly describe what this system does.
                  </label>
                  <textarea
                    placeholder="Describe the primary function..."
                    rows={4}
                    className="w-full bg-transparent border-b-2 border-[#d4d0c8] focus:border-[#1a1a1a] py-3 text-lg font-light outline-none transition-colors placeholder:text-[#c4c0b8] resize-none"
                    value={answers.description || ''}
                    onChange={(e) => setAnswers({...answers, description: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Identity Chapter */}
        {activeChapter === 1 && (
          <section className="min-h-[80vh] flex flex-col justify-center max-w-2xl mx-auto px-8">
            <div className="space-y-8">
              <div className="space-y-2">
                <span className="text-xs tracking-[0.3em] uppercase text-[#8a8580]">Chapter Two</span>
                <h1 className="text-5xl md:text-6xl font-light leading-tight tracking-tight">
                  {chapters[1].title}
                </h1>
                <p className="text-xl text-[#5a5550] font-light italic">
                  {chapters[1].subtitle}
                </p>
              </div>

              <div className="h-px bg-[#e8e6e1] w-24" />

              <p className="text-lg leading-relaxed text-[#3a3530] max-w-xl">
                Understanding your role in relation to this AI system is crucial for determining 
                applicable obligations under the EU AI Act.
              </p>

              {/* Role Selection */}
              <div className="space-y-6 pt-8">
                <label className="block text-2xl font-light mb-6 leading-relaxed">
                  What is your role in relation to this AI system?
                </label>
                
                <div className="space-y-4">
                  {['Provider', 'Deployer', 'Importer', 'Distributor', 'Authorized Representative'].map((role) => (
                    <button
                      key={role}
                      onClick={() => setAnswers({...answers, role})}
                      className={`w-full text-left p-6 border transition-all duration-300 ${
                        answers.role === role
                          ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                          : 'border-[#e8e6e1] hover:border-[#1a1a1a]'
                      }`}
                    >
                      <span className="text-lg font-light">{role}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Function Chapter */}
        {activeChapter === 2 && (
          <section className="min-h-[80vh] flex flex-col justify-center max-w-2xl mx-auto px-8">
            <div className="space-y-8">
              <div className="space-y-2">
                <span className="text-xs tracking-[0.3em] uppercase text-[#8a8580]">Chapter Three</span>
                <h1 className="text-5xl md:text-6xl font-light leading-tight tracking-tight">
                  {chapters[2].title}
                </h1>
                <p className="text-xl text-[#5a5550] font-light italic">
                  {chapters[2].subtitle}
                </p>
              </div>

              <div className="h-px bg-[#e8e6e1] w-24" />

              {/* AI Function Categories */}
              <div className="space-y-6 pt-8">
                <label className="block text-2xl font-light mb-6 leading-relaxed">
                  Which category best describes your AI system?
                </label>

                <div className="grid gap-4">
                  {[
                    { id: 'biometric', label: 'Biometric Identification', desc: 'Systems that identify individuals through biometric data' },
                    { id: 'critical', label: 'Critical Infrastructure', desc: 'Systems managing essential public services' },
                    { id: 'education', label: 'Education & Training', desc: 'Systems determining access to education' },
                    { id: 'employment', label: 'Employment', desc: 'Systems used in recruitment or work management' },
                    { id: 'public', label: 'Public Services', desc: 'Systems affecting access to public benefits' },
                  ].map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setAnswers({...answers, category: category.id})}
                      className={`text-left p-6 border transition-all duration-300 ${
                        answers.category === category.id
                          ? 'border-[#1a1a1a] bg-[#f8f7f5]'
                          : 'border-[#e8e6e1] hover:border-[#c4c0b8]'
                      }`}
                    >
                      <h3 className="text-lg font-medium mb-1">{category.label}</h3>
                      <p className="text-sm text-[#8a8580]">{category.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Follow-ups Chapter */}
        {activeChapter === 3 && (
          <section className="min-h-[80vh] flex flex-col justify-center max-w-2xl mx-auto px-8">
            <div className="space-y-8">
              <div className="space-y-2">
                <span className="text-xs tracking-[0.3em] uppercase text-[#8a8580]">Chapter Four</span>
                <h1 className="text-5xl md:text-6xl font-light leading-tight tracking-tight">
                  {chapters[3].title}
                </h1>
                <p className="text-xl text-[#5a5550] font-light italic">
                  {chapters[3].subtitle}
                </p>
              </div>

              <div className="h-px bg-[#e8e6e1] w-24" />

              <div className="space-y-8 pt-8">
                <div className="relative">
                  <label className="block text-2xl font-light mb-4 leading-relaxed">
                    Does the system make autonomous decisions affecting individuals?
                  </label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setAnswers({...answers, autonomous: 'yes'})}
                      className={`flex-1 py-4 border text-center transition-all ${
                        answers.autonomous === 'yes'
                          ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                          : 'border-[#e8e6e1] hover:border-[#1a1a1a]'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setAnswers({...answers, autonomous: 'no'})}
                      className={`flex-1 py-4 border text-center transition-all ${
                        answers.autonomous === 'no'
                          ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                          : 'border-[#e8e6e1] hover:border-[#1a1a1a]'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-2xl font-light mb-4 leading-relaxed">
                    Is human oversight always available?
                  </label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setAnswers({...answers, oversight: 'yes'})}
                      className={`flex-1 py-4 border text-center transition-all ${
                        answers.oversight === 'yes'
                          ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                          : 'border-[#e8e6e1] hover:border-[#1a1a1a]'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setAnswers({...answers, oversight: 'no'})}
                      className={`flex-1 py-4 border text-center transition-all ${
                        answers.oversight === 'no'
                          ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                          : 'border-[#e8e6e1] hover:border-[#1a1a1a]'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Evidence Chapter */}
        {activeChapter === 4 && (
          <section className="min-h-[80vh] flex flex-col justify-center max-w-2xl mx-auto px-8">
            <div className="space-y-8">
              <div className="space-y-2">
                <span className="text-xs tracking-[0.3em] uppercase text-[#8a8580]">Chapter Five</span>
                <h1 className="text-5xl md:text-6xl font-light leading-tight tracking-tight">
                  {chapters[4].title}
                </h1>
                <p className="text-xl text-[#5a5550] font-light italic">
                  {chapters[4].subtitle}
                </p>
              </div>

              <div className="h-px bg-[#e8e6e1] w-24" />

              <p className="text-lg leading-relaxed text-[#3a3530] max-w-xl">
                Supporting documentation strengthens your compliance position. 
                Upload relevant files to include in your assessment record.
              </p>

              {/* Upload Area */}
              <div className="pt-8">
                <div className="border-2 border-dashed border-[#d4d0c8] hover:border-[#8a8580] transition-colors p-12 text-center">
                  <div className="space-y-4">
                    <div className="w-12 h-12 mx-auto border border-[#d4d0c8] rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-[#8a8580]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-lg font-light">Drop files here or click to upload</p>
                      <p className="text-sm text-[#8a8580] mt-1">PDF, DOC, or images up to 10MB</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Review Chapter */}
        {activeChapter === 5 && (
          <section className="min-h-[80vh] max-w-3xl mx-auto px-8 py-16">
            <div className="space-y-8">
              <div className="space-y-2">
                <span className="text-xs tracking-[0.3em] uppercase text-[#8a8580]">Chapter Six</span>
                <h1 className="text-5xl md:text-6xl font-light leading-tight tracking-tight">
                  {chapters[5].title}
                </h1>
                <p className="text-xl text-[#5a5550] font-light italic">
                  {chapters[5].subtitle}
                </p>
              </div>

              <div className="h-px bg-[#e8e6e1] w-24" />

              {/* Classification Result */}
              <div className="bg-[#f8f7f5] border border-[#e8e6e1] p-8 space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs tracking-[0.2em] uppercase text-[#8a8580] mb-2">Classification Result</p>
                    <h2 className="text-3xl font-light">High-Risk AI System</h2>
                  </div>
                  <div className="w-16 h-16 bg-[#e85d04] rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">HIGH</span>
                  </div>
                </div>

                <div className="h-px bg-[#e8e6e1]" />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Applicable Articles</h3>
                  <ul className="space-y-2 text-[#5a5550]">
                    <li className="flex gap-3">
                      <span className="text-[#8a8580]">Art. 6</span>
                      <span>Classification rules for high-risk AI systems</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-[#8a8580]">Art. 9</span>
                      <span>Risk management system</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-[#8a8580]">Art. 10</span>
                      <span>Data and data governance</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Export Button */}
              <div className="flex justify-center pt-8">
                <button className="bg-[#1a1a1a] text-white px-8 py-4 text-sm tracking-wide uppercase hover:bg-[#333] transition-colors">
                  Export Assessment Report
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Navigation Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#FDFCFA]/95 backdrop-blur-sm border-t border-[#e8e6e1]">
        <div className="max-w-screen-xl mx-auto px-8 py-4 flex items-center justify-between">
          <button
            onClick={() => setActiveChapter(Math.max(0, activeChapter - 1))}
            disabled={activeChapter === 0}
            className="text-sm tracking-wide uppercase text-[#8a8580] hover:text-[#1a1a1a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Previous Chapter
          </button>
          
          <div className="flex gap-2">
            {chapters.map((_, index) => (
              <div
                key={index}
                className={`w-8 h-1 transition-colors ${
                  index <= activeChapter ? 'bg-[#1a1a1a]' : 'bg-[#e8e6e1]'
                }`}
              />
            ))}
          </div>
          
          <button
            onClick={() => setActiveChapter(Math.min(chapters.length - 1, activeChapter + 1))}
            disabled={activeChapter === chapters.length - 1}
            className="text-sm tracking-wide uppercase hover:text-[#8a8580] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next Chapter
          </button>
        </div>
      </footer>
    </div>
  );
}
