import { Lightbulb, X } from "lucide-react";
import { useState } from "react";
import type { ClassificationInput } from "../engine/types";
import { IntelligenceRail } from "./IntelligenceRail";

type MobileCompanionProps = {
  input: ClassificationInput;
  currentStep: number;
  selectedFactCount: number;
  selectedTestCount: number;
  evidenceFindingCount: number;
};

export function MobileCompanion({
  input,
  currentStep,
  selectedFactCount,
  selectedTestCount,
  evidenceFindingCount,
}: MobileCompanionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating trigger button - only visible on mobile */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="companion-sheet-trigger"
        aria-label="Open assessment intelligence"
      >
        <Lightbulb className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Sheet overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Sheet content */}
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t bg-card shadow-xl animate-slide-up">
            <div className="sticky top-0 flex items-center justify-between border-b bg-card px-4 py-3">
              <span className="text-sm font-semibold">Assessment Intelligence</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
              <IntelligenceRail
                input={input}
                currentStep={currentStep}
                selectedFactCount={selectedFactCount}
                selectedTestCount={selectedTestCount}
                evidenceFindingCount={evidenceFindingCount}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
