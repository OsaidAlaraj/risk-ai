import { Scale } from "lucide-react";

export function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <a href="/" className="logo">
          <span className="logo-mark">
            <Scale className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>AI Act Classifier</span>
        </a>
        <div className="hidden items-center gap-4 sm:flex">
          <span className="status-badge" data-status="neutral">
            <span className="status-dot" />
            Educational use only
          </span>
        </div>
      </div>
    </header>
  );
}
