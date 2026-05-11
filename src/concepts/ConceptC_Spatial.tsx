/**
 * CONCEPT C: SPATIAL / CANVAS WORKSPACE
 * 
 * Design Philosophy:
 * - A horizontal timeline/journey that you navigate left-to-right
 * - Each stage is a distinct spatial zone
 * - Current focus area expands while others recede
 * - Intelligence companion as a floating assistant
 * - Report materializes as a document being built throughout
 * 
 * Inspired by: Figma canvas, Apple Keynote, premium car configurators
 * 
 * Layout: Horizontal zones, expandable focus areas
 * Navigation: Spatial left-to-right movement
 * Intelligence: Floating assistant panel
 * Forms: Card-based input within spatial zones
 * Report: Live document preview that grows
 */

import { useState } from 'react';

const zones = [
  { id: 'briefing', title: 'Briefing', icon: '01' },
  { id: 'identity', title: 'Identity', icon: '02' },
  { id: 'function', title: 'Function', icon: '03' },
  { id: 'analysis', title: 'Analysis', icon: '04' },
  { id: 'evidence', title: 'Evidence', icon: '05' },
  { id: 'report', title: 'Report', icon: '06' },
];

export default function ConceptC_Spatial() {
  const [activeZone, setActiveZone] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showAssistant, setShowAssistant] = useState(true);

  const navigateZone = (direction: 'prev' | 'next') => {
    if (direction === 'next' && activeZone < zones.length - 1) {
      setActiveZone(activeZone + 1);
    } else if (direction === 'prev' && activeZone > 0) {
      setActiveZone(activeZone - 1);
    }
  };

  return (
    <div className="concept-c min-h-screen bg-[#f5f5f0] text-[#1a1a1a] overflow-hidden">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#f5f5f0]/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-8 py-5">
          <div className="flex items-center gap-6">
            <h1 className="text-sm font-medium tracking-tight">AI Act Classifier</h1>
            <span className="text-xs text-[#8a8a80] uppercase tracking-widest">Pro</span>
          </div>

          {/* Zone Navigator */}
          <div className="flex items-center gap-1">
            {zones.map((zone, index) => (
              <button
                key={zone.id}
                onClick={() => setActiveZone(index)}
                className={`relative px-4 py-2 text-xs transition-all duration-500 ${
                  index === activeZone
                    ? 'text-[#1a1a1a]'
                    : index < activeZone
                      ? 'text-[#22c55e]'
                      : 'text-[#c0c0b8]'
                }`}
              >
                {zone.icon}
                {index === activeZone && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#1a1a1a]" />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowAssistant(!showAssistant)}
              className={`text-xs px-3 py-1.5 border transition-colors ${
                showAssistant 
                  ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white' 
                  : 'border-[#d0d0c8] text-[#8a8a80] hover:border-[#1a1a1a]'
              }`}
            >
              Assistant
            </button>
            <button className="text-xs px-3 py-1.5 border border-[#d0d0c8] text-[#8a8a80] hover:border-[#1a1a1a] transition-colors">
              Save
            </button>
          </div>
        </div>
      </header>

      {/* Spatial Zones Container */}
      <div className="pt-20 pb-24 min-h-screen flex">
        {/* Zone Cards - Horizontal Layout */}
        <div 
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(calc(50vw - ${activeZone * 100}vw - 50vw + ${activeZone > 0 ? '200px' : '0px'}))` }}
        >
          {zones.map((zone, index) => (
            <div
              key={zone.id}
              className={`flex-shrink-0 transition-all duration-500 ${
                index === activeZone 
                  ? 'w-[calc(100vw-400px)] opacity-100' 
                  : 'w-[200px] opacity-40 cursor-pointer hover:opacity-60'
              }`}
              onClick={() => index !== activeZone && setActiveZone(index)}
            >
              <div className={`h-full p-8 transition-all duration-500 ${
                index === activeZone ? 'bg-white shadow-2xl shadow-black/5' : 'bg-[#e8e8e0]'
              }`}>
                {/* Zone Header */}
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <span className="text-xs text-[#8a8a80] uppercase tracking-widest">{zone.icon}</span>
                    <h2 className={`font-light transition-all duration-500 ${
                      index === activeZone ? 'text-4xl mt-2' : 'text-lg mt-1'
                    }`}>
                      {zone.title}
                    </h2>
                  </div>
                  {index === activeZone && (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
                      <span className="text-xs text-[#8a8a80]">Active</span>
                    </div>
                  )}
                </div>

                {/* Zone Content - Only show when active */}
                {index === activeZone && (
                  <div className="animate-in fade-in duration-500">
                    {/* Briefing Zone */}
                    {zone.id === 'briefing' && (
                      <div className="space-y-8 max-w-xl">
                        <p className="text-[#5a5a50] leading-relaxed">
                          Welcome to the AI Act Risk Classification assessment. 
                          Let's begin by understanding your AI system.
                        </p>
                        
                        <div className="space-y-6">
                          <div>
                            <label className="block text-sm text-[#8a8a80] mb-2">System Name</label>
                            <input
                              type="text"
                              placeholder="Enter system name"
                              value={answers.name || ''}
                              onChange={(e) => setAnswers({...answers, name: e.target.value})}
                              className="w-full bg-[#f5f5f0] border-b-2 border-[#d0d0c8] focus:border-[#1a1a1a] py-3 text-lg outline-none transition-colors"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm text-[#8a8a80] mb-2">Description</label>
                            <textarea
                              placeholder="What does this system do?"
                              rows={3}
                              value={answers.description || ''}
                              onChange={(e) => setAnswers({...answers, description: e.target.value})}
                              className="w-full bg-[#f5f5f0] border-b-2 border-[#d0d0c8] focus:border-[#1a1a1a] py-3 outline-none transition-colors resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Identity Zone */}
                    {zone.id === 'identity' && (
                      <div className="space-y-8 max-w-xl">
                        <p className="text-[#5a5a50] leading-relaxed">
                          Your role determines your obligations under the AI Act.
                        </p>
                        
                        <div className="grid grid-cols-2 gap-4">
                          {['Provider', 'Deployer', 'Importer', 'Distributor'].map((role) => (
                            <button
                              key={role}
                              onClick={() => setAnswers({...answers, role})}
                              className={`p-6 text-left border-2 transition-all duration-300 ${
                                answers.role === role
                                  ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                                  : 'border-[#e0e0d8] hover:border-[#1a1a1a]'
                              }`}
                            >
                              <span className="text-lg">{role}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Function Zone */}
                    {zone.id === 'function' && (
                      <div className="space-y-8 max-w-2xl">
                        <p className="text-[#5a5a50] leading-relaxed">
                          Select the primary function category of your AI system.
                        </p>
                        
                        <div className="space-y-3">
                          {[
                            { id: 'biometric', label: 'Biometric Identification', risk: 'High' },
                            { id: 'critical', label: 'Critical Infrastructure', risk: 'High' },
                            { id: 'education', label: 'Education & Training', risk: 'High' },
                            { id: 'employment', label: 'Employment & Workers', risk: 'High' },
                            { id: 'services', label: 'Public Services', risk: 'High' },
                            { id: 'other', label: 'Other / General Purpose', risk: 'Varies' },
                          ].map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => setAnswers({...answers, category: cat.id})}
                              className={`w-full p-5 flex items-center justify-between border-2 transition-all duration-300 ${
                                answers.category === cat.id
                                  ? 'border-[#1a1a1a] bg-[#fafaf8]'
                                  : 'border-[#e0e0d8] hover:border-[#c0c0b8]'
                              }`}
                            >
                              <span className="text-lg">{cat.label}</span>
                              <span className={`text-xs px-2 py-1 ${
                                cat.risk === 'High' 
                                  ? 'bg-[#fef2f2] text-[#dc2626]' 
                                  : 'bg-[#f5f5f0] text-[#8a8a80]'
                              }`}>
                                {cat.risk}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Analysis Zone */}
                    {zone.id === 'analysis' && (
                      <div className="space-y-8 max-w-xl">
                        <p className="text-[#5a5a50] leading-relaxed">
                          Additional questions to refine the classification.
                        </p>
                        
                        <div className="space-y-6">
                          <div className="p-6 bg-[#f5f5f0]">
                            <p className="text-lg mb-4">Does this system make autonomous decisions?</p>
                            <div className="flex gap-4">
                              <button
                                onClick={() => setAnswers({...answers, autonomous: 'yes'})}
                                className={`flex-1 py-3 border-2 transition-all ${
                                  answers.autonomous === 'yes'
                                    ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                                    : 'border-[#d0d0c8] hover:border-[#1a1a1a]'
                                }`}
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setAnswers({...answers, autonomous: 'no'})}
                                className={`flex-1 py-3 border-2 transition-all ${
                                  answers.autonomous === 'no'
                                    ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                                    : 'border-[#d0d0c8] hover:border-[#1a1a1a]'
                                }`}
                              >
                                No
                              </button>
                            </div>
                          </div>

                          <div className="p-6 bg-[#f5f5f0]">
                            <p className="text-lg mb-4">Is human oversight always available?</p>
                            <div className="flex gap-4">
                              <button
                                onClick={() => setAnswers({...answers, oversight: 'yes'})}
                                className={`flex-1 py-3 border-2 transition-all ${
                                  answers.oversight === 'yes'
                                    ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                                    : 'border-[#d0d0c8] hover:border-[#1a1a1a]'
                                }`}
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setAnswers({...answers, oversight: 'no'})}
                                className={`flex-1 py-3 border-2 transition-all ${
                                  answers.oversight === 'no'
                                    ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                                    : 'border-[#d0d0c8] hover:border-[#1a1a1a]'
                                }`}
                              >
                                No
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Evidence Zone */}
                    {zone.id === 'evidence' && (
                      <div className="space-y-8 max-w-xl">
                        <p className="text-[#5a5a50] leading-relaxed">
                          Upload supporting documentation to strengthen your compliance record.
                        </p>
                        
                        <div className="border-2 border-dashed border-[#d0d0c8] hover:border-[#8a8a80] transition-colors p-12 text-center bg-[#fafaf8]">
                          <div className="w-16 h-16 mx-auto mb-4 border-2 border-[#d0d0c8] rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-[#8a8a80]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                            </svg>
                          </div>
                          <p className="text-lg mb-2">Drop files here</p>
                          <p className="text-sm text-[#8a8a80]">or click to browse</p>
                        </div>
                      </div>
                    )}

                    {/* Report Zone */}
                    {zone.id === 'report' && (
                      <div className="space-y-8">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-2xl font-light mb-2">Classification Complete</h3>
                            <p className="text-[#8a8a80]">Based on your responses</p>
                          </div>
                          <div className="px-4 py-2 bg-[#fef2f2] border border-[#fecaca]">
                            <span className="text-[#dc2626] font-medium">HIGH-RISK</span>
                          </div>
                        </div>

                        <div className="bg-[#f5f5f0] p-6 space-y-4">
                          <h4 className="font-medium">System Details</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-[#8a8a80]">Name:</span>
                              <span className="ml-2">{answers.name || 'Not specified'}</span>
                            </div>
                            <div>
                              <span className="text-[#8a8a80]">Role:</span>
                              <span className="ml-2">{answers.role || 'Not specified'}</span>
                            </div>
                            <div>
                              <span className="text-[#8a8a80]">Category:</span>
                              <span className="ml-2">{answers.category || 'Not specified'}</span>
                            </div>
                            <div>
                              <span className="text-[#8a8a80]">Autonomous:</span>
                              <span className="ml-2">{answers.autonomous || 'Not specified'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-[#f5f5f0] p-6 space-y-4">
                          <h4 className="font-medium">Applicable Articles</h4>
                          <div className="flex flex-wrap gap-2">
                            {['Art. 6', 'Art. 9', 'Art. 10', 'Art. 11', 'Art. 12', 'Art. 13'].map((art) => (
                              <span key={art} className="px-3 py-1 bg-white border border-[#e0e0d8] text-sm">
                                {art}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                          <button className="flex-1 py-4 bg-[#1a1a1a] text-white hover:bg-[#333] transition-colors">
                            Export PDF Report
                          </button>
                          <button className="px-6 py-4 border-2 border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white transition-colors">
                            Share
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Floating Assistant */}
        {showAssistant && (
          <div className="fixed right-8 top-1/2 -translate-y-1/2 w-72 bg-white shadow-2xl shadow-black/10 border border-[#e0e0d8] z-40">
            <div className="p-4 border-b border-[#e0e0d8] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
                <span className="text-sm font-medium">Assistant</span>
              </div>
              <button 
                onClick={() => setShowAssistant(false)}
                className="text-[#8a8a80] hover:text-[#1a1a1a] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="text-sm text-[#5a5a50] leading-relaxed">
                {activeZone === 0 && "Start by providing basic information about your AI system. This will help determine the applicable regulatory framework."}
                {activeZone === 1 && "Your role as provider, deployer, importer, or distributor determines which obligations apply to you under the AI Act."}
                {activeZone === 2 && "The function category is crucial for classification. High-risk categories have specific compliance requirements."}
                {activeZone === 3 && "These follow-up questions help refine the risk assessment based on system capabilities."}
                {activeZone === 4 && "Supporting documentation strengthens your compliance position and provides an audit trail."}
                {activeZone === 5 && "Review your classification and export the report for your records and compliance documentation."}
              </div>
              
              <div className="pt-2 border-t border-[#e0e0d8]">
                <p className="text-xs text-[#8a8a80] mb-2">Relevant Articles</p>
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs px-2 py-0.5 bg-[#f5f5f0] text-[#5a5a50]">Art. 6</span>
                  <span className="text-xs px-2 py-0.5 bg-[#f5f5f0] text-[#5a5a50]">Art. 9</span>
                  <span className="text-xs px-2 py-0.5 bg-[#f5f5f0] text-[#5a5a50]">Art. 10</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#f5f5f0]/95 backdrop-blur-sm border-t border-[#e0e0d8]">
        <div className="flex items-center justify-between px-8 py-4">
          <button
            onClick={() => navigateZone('prev')}
            disabled={activeZone === 0}
            className="flex items-center gap-2 text-sm text-[#8a8a80] hover:text-[#1a1a1a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>

          <div className="flex items-center gap-2">
            {zones.map((_, index) => (
              <div
                key={index}
                className={`w-12 h-1 transition-colors ${
                  index <= activeZone ? 'bg-[#1a1a1a]' : 'bg-[#d0d0c8]'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => navigateZone('next')}
            disabled={activeZone === zones.length - 1}
            className="flex items-center gap-2 text-sm hover:text-[#8a8a80] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </footer>
    </div>
  );
}
