/**
 * CONCEPT B: COMMAND CENTER / TERMINAL AESTHETIC
 * 
 * Design Philosophy:
 * - Dark, focused interface with a centered command area
 * - Progress as a discrete status bar at top
 * - Questions presented one at a time with typing/conversational feel
 * - Intelligence as inline contextual hints
 * - Report as a structured data output panel
 * 
 * Inspired by: Linear, Raycast, VS Code command palette, Vercel dashboard
 * 
 * Layout: Full dark screen, centered command input, floating panels
 * Navigation: Minimal status bar at top
 * Intelligence: Inline hints, command suggestions
 * Forms: Single question at a time, keyboard-first
 * Report: Structured JSON-like output with clear hierarchy
 */

import { useState, useEffect, useRef } from 'react';

const stages = [
  { id: 'briefing', label: 'BRIEF' },
  { id: 'identity', label: 'IDENT' },
  { id: 'function', label: 'FUNC' },
  { id: 'followups', label: 'FOLLOW' },
  { id: 'evidence', label: 'EVID' },
  { id: 'review', label: 'REVIEW' },
];

const questions = [
  { stage: 0, id: 'name', prompt: 'What is the name of this AI system?', type: 'text' },
  { stage: 0, id: 'org', prompt: 'What organization operates this system?', type: 'text' },
  { stage: 1, id: 'role', prompt: 'Select your role:', type: 'select', options: ['provider', 'deployer', 'importer', 'distributor'] },
  { stage: 2, id: 'category', prompt: 'Primary AI function category:', type: 'select', options: ['biometric', 'critical-infra', 'education', 'employment', 'public-services', 'other'] },
  { stage: 3, id: 'autonomous', prompt: 'Does this system make autonomous decisions? (y/n)', type: 'boolean' },
  { stage: 3, id: 'oversight', prompt: 'Is human oversight always available? (y/n)', type: 'boolean' },
  { stage: 4, id: 'evidence', prompt: 'Upload supporting documentation? (y/n)', type: 'boolean' },
  { stage: 5, id: 'confirm', prompt: 'Ready to generate classification report? (y/n)', type: 'boolean' },
];

export default function ConceptB_Terminal() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [inputValue, setInputValue] = useState('');
  const [history, setHistory] = useState<Array<{type: 'prompt' | 'answer' | 'system', text: string}>>([
    { type: 'system', text: 'AI Act Risk Classifier Pro v2.0' },
    { type: 'system', text: 'Initializing assessment protocol...' },
    { type: 'system', text: '---' },
  ]);
  const [showReport, setShowReport] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentQuestion < questions.length) {
      const q = questions[currentQuestion];
      setHistory(h => [...h, { type: 'prompt', text: q.prompt }]);
      if (q.type === 'select' && q.options) {
        setHistory(h => [...h, { type: 'system', text: `Options: ${q.options.join(' | ')}` }]);
      }
    }
  }, [currentQuestion]);

  useEffect(() => {
    historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight, behavior: 'smooth' });
    inputRef.current?.focus();
  }, [history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const q = questions[currentQuestion];
    let processedValue = inputValue.trim().toLowerCase();

    // Validate input
    if (q.type === 'boolean') {
      if (!['y', 'n', 'yes', 'no'].includes(processedValue)) {
        setHistory(h => [...h, { type: 'system', text: 'Error: Please enter y or n' }]);
        setInputValue('');
        return;
      }
      processedValue = processedValue.startsWith('y') ? 'yes' : 'no';
    }

    if (q.type === 'select' && q.options && !q.options.includes(processedValue)) {
      setHistory(h => [...h, { type: 'system', text: `Error: Invalid option. Choose from: ${q.options.join(', ')}` }]);
      setInputValue('');
      return;
    }

    // Record answer
    setHistory(h => [...h, { type: 'answer', text: `> ${inputValue}` }]);
    setAnswers(a => ({ ...a, [q.id]: processedValue }));
    setInputValue('');

    // Move to next question or show report
    if (currentQuestion < questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestion(currentQuestion + 1);
      }, 300);
    } else {
      setHistory(h => [...h, 
        { type: 'system', text: '---' },
        { type: 'system', text: 'Processing classification...' },
      ]);
      setTimeout(() => {
        setShowReport(true);
      }, 1000);
    }
  };

  const currentStage = currentQuestion < questions.length ? questions[currentQuestion].stage : 5;

  return (
    <div className="concept-b min-h-screen bg-[#0a0a0a] text-[#e5e5e5] font-mono">
      {/* Status Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a] border-b border-[#1f1f1f]">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#22c55e] animate-pulse" />
              <span className="text-xs text-[#737373]">ACTIVE</span>
            </div>
            <span className="text-xs text-[#525252]">|</span>
            <span className="text-sm">risk-classifier-pro</span>
          </div>

          {/* Stage Indicators */}
          <div className="flex items-center gap-1">
            {stages.map((stage, index) => (
              <div
                key={stage.id}
                className={`px-3 py-1 text-xs transition-all ${
                  index === currentStage
                    ? 'bg-[#1f1f1f] text-white'
                    : index < currentStage
                      ? 'text-[#22c55e]'
                      : 'text-[#404040]'
                }`}
              >
                {stage.label}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs text-[#525252]">
            <span>{Math.round((currentQuestion / questions.length) * 100)}% complete</span>
            <span className="text-[#737373]">Press Enter to continue</span>
          </div>
        </div>
      </header>

      {/* Main Terminal Area */}
      <main className="pt-16 pb-24 min-h-screen flex flex-col">
        {!showReport ? (
          <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-6">
            {/* History */}
            <div 
              ref={historyRef}
              className="flex-1 overflow-y-auto py-8 space-y-2"
            >
              {history.map((entry, index) => (
                <div
                  key={index}
                  className={`${
                    entry.type === 'prompt' 
                      ? 'text-[#a3a3a3]' 
                      : entry.type === 'answer'
                        ? 'text-[#22c55e]'
                        : 'text-[#525252]'
                  }`}
                >
                  {entry.text}
                </div>
              ))}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="sticky bottom-0 bg-[#0a0a0a] py-6">
              <div className="flex items-center gap-3 bg-[#141414] border border-[#262626] px-4 py-3 focus-within:border-[#404040] transition-colors">
                <span className="text-[#22c55e]">&gt;</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-white placeholder:text-[#404040]"
                  placeholder="Type your response..."
                  autoFocus
                />
                <span className="text-xs text-[#404040]">ENTER</span>
              </div>
              
              {/* Inline Help */}
              <div className="mt-3 flex items-center gap-6 text-xs text-[#404040]">
                <span>Tab to autocomplete</span>
                <span>Ctrl+C to cancel</span>
                <span>? for help</span>
              </div>
            </form>
          </div>
        ) : (
          /* Report View */
          <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
            <div className="space-y-6">
              {/* Report Header */}
              <div className="flex items-center justify-between border-b border-[#1f1f1f] pb-4">
                <div>
                  <h1 className="text-xl font-medium">Classification Report</h1>
                  <p className="text-sm text-[#737373] mt-1">Generated {new Date().toISOString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button className="px-4 py-2 text-sm border border-[#262626] hover:border-[#404040] transition-colors">
                    Export JSON
                  </button>
                  <button className="px-4 py-2 text-sm bg-white text-black hover:bg-[#e5e5e5] transition-colors">
                    Export PDF
                  </button>
                </div>
              </div>

              {/* Classification Result */}
              <div className="bg-[#141414] border border-[#262626] p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <p className="text-xs text-[#737373] uppercase tracking-wider mb-1">Risk Classification</p>
                    <h2 className="text-2xl font-medium text-[#f97316]">HIGH-RISK</h2>
                  </div>
                  <div className="px-3 py-1 bg-[#f97316]/10 border border-[#f97316]/20 text-[#f97316] text-xs">
                    REQUIRES COMPLIANCE
                  </div>
                </div>

                {/* Data Output */}
                <div className="font-mono text-sm space-y-1 bg-[#0a0a0a] p-4 border border-[#1f1f1f]">
                  <div className="text-[#737373]">{'{'}</div>
                  <div className="pl-4">
                    <span className="text-[#22c55e]">"system"</span>
                    <span className="text-[#737373]">: </span>
                    <span className="text-[#fbbf24]">"{answers.name || 'AI System'}"</span>
                    <span className="text-[#737373]">,</span>
                  </div>
                  <div className="pl-4">
                    <span className="text-[#22c55e]">"organization"</span>
                    <span className="text-[#737373]">: </span>
                    <span className="text-[#fbbf24]">"{answers.org || 'Organization'}"</span>
                    <span className="text-[#737373]">,</span>
                  </div>
                  <div className="pl-4">
                    <span className="text-[#22c55e]">"role"</span>
                    <span className="text-[#737373]">: </span>
                    <span className="text-[#fbbf24]">"{answers.role || 'provider'}"</span>
                    <span className="text-[#737373]">,</span>
                  </div>
                  <div className="pl-4">
                    <span className="text-[#22c55e]">"category"</span>
                    <span className="text-[#737373]">: </span>
                    <span className="text-[#fbbf24]">"{answers.category || 'employment'}"</span>
                    <span className="text-[#737373]">,</span>
                  </div>
                  <div className="pl-4">
                    <span className="text-[#22c55e]">"classification"</span>
                    <span className="text-[#737373]">: </span>
                    <span className="text-[#f97316]">"HIGH_RISK"</span>
                    <span className="text-[#737373]">,</span>
                  </div>
                  <div className="pl-4">
                    <span className="text-[#22c55e]">"articles"</span>
                    <span className="text-[#737373]">: [</span>
                    <span className="text-[#60a5fa]">"Art.6"</span>
                    <span className="text-[#737373]">, </span>
                    <span className="text-[#60a5fa]">"Art.9"</span>
                    <span className="text-[#737373]">, </span>
                    <span className="text-[#60a5fa]">"Art.10"</span>
                    <span className="text-[#737373]">]</span>
                  </div>
                  <div className="text-[#737373]">{'}'}</div>
                </div>
              </div>

              {/* Obligations List */}
              <div className="bg-[#141414] border border-[#262626] p-6">
                <h3 className="text-sm font-medium mb-4">Required Actions</h3>
                <div className="space-y-3">
                  {[
                    { status: 'pending', text: 'Implement risk management system (Art. 9)' },
                    { status: 'pending', text: 'Establish data governance (Art. 10)' },
                    { status: 'pending', text: 'Prepare technical documentation (Art. 11)' },
                    { status: 'pending', text: 'Set up record-keeping (Art. 12)' },
                    { status: 'pending', text: 'Ensure transparency (Art. 13)' },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3 text-sm">
                      <div className="w-4 h-4 border border-[#404040] flex items-center justify-center">
                        <span className="text-[#404040] text-xs">○</span>
                      </div>
                      <span className="text-[#a3a3a3]">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Keyboard Shortcut Hint */}
      <div className="fixed bottom-6 right-6 text-xs text-[#404040]">
        <kbd className="px-2 py-1 bg-[#1f1f1f] border border-[#262626] rounded">⌘K</kbd>
        <span className="ml-2">Command menu</span>
      </div>
    </div>
  );
}
