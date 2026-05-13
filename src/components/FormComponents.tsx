import type { ReactNode } from "react";
import { cx } from "../lib/utils";

// ==================== FIELD ====================
type FieldProps = {
  label: string;
  hint?: string;
  children: ReactNode;
};

export function Field({ label, hint, children }: FieldProps) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {hint && <span className="form-hint">{hint}</span>}
      {children}
    </div>
  );
}

// ==================== INPUT ====================
type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return <input className={cx("input", className)} {...props} />;
}

// ==================== TEXTAREA ====================
type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return <textarea className={cx("input textarea", className)} {...props} />;
}

// ==================== CHOICE GROUP ====================
type ChoiceOption<T extends string> = {
  value: T;
  title: string;
  detail: string;
};

type ChoiceGroupProps<T extends string> = {
  label: string;
  value: T;
  options: ChoiceOption<T>[];
  onChoose: (value: T) => void;
  columns?: 1 | 2;
};

export function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChoose,
  columns = 1,
}: ChoiceGroupProps<T>) {
  return (
    <div className="form-group">
      <span className="form-label">{label}</span>
      <div
        className="choice-group"
        style={{
          gridTemplateColumns: columns === 2 ? "repeat(2, 1fr)" : "1fr",
        }}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChoose(option.value)}
            className="choice-card"
            data-selected={value === option.value}
          >
            <span className="choice-indicator">
              <span className="choice-indicator-dot" />
            </span>
            <span className="choice-content">
              <span className="choice-title">{option.title}</span>
              <span className="choice-description">{option.detail}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ==================== TOGGLE ROW ====================
type ToggleRowProps = {
  title: string;
  detail: string;
  checked: boolean;
  onToggle: () => void;
};

export function ToggleRow({ title, detail, checked, onToggle }: ToggleRowProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="toggle-card"
      data-active={checked}
    >
      <span className="toggle-content">
        <span className="toggle-title">{title}</span>
        <span className="toggle-description">{detail}</span>
      </span>
      <span className="toggle-switch" aria-hidden="true" />
    </button>
  );
}

// ==================== CHIP GROUP ====================
type ChipGroupProps = {
  label: string;
  values: string[];
  selected: string[];
  onToggle: (value: string) => void;
};

export function ChipGroup({ label, values, selected, onToggle }: ChipGroupProps) {
  return (
    <div className="form-group">
      <span className="form-label">{label}</span>
      <div className="chip-group">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onToggle(value)}
            className="chip"
            data-active={selected.includes(value)}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}

// ==================== CARD ====================
type CardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function Card({ title, description, children, footer }: CardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
        {description && <p className="card-description">{description}</p>}
      </div>
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
}

// ==================== SECTION BLOCK ====================
type SectionBlockProps = {
  eyebrow: string;
  title: string;
  children: ReactNode;
};

export function SectionBlock({ eyebrow, title, children }: SectionBlockProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase text-accent">
          {eyebrow}
        </span>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ==================== EMPTY STATE ====================
type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon && <span className="empty-icon">{icon}</span>}
      <h3 className="empty-title">{title}</h3>
      <p className="empty-description">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ==================== TAB NAVIGATION ====================
type Tab = {
  id: string;
  label: string;
};

type TabNavProps = {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
};

export function TabNav({ tabs, activeTab, onTabChange }: TabNavProps) {
  return (
    <div className="tab-nav">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className="tab-btn"
          data-active={activeTab === tab.id}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ==================== DISCLOSURE ====================
type DisclosureProps = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
};

export function Disclosure({ title, children, defaultOpen = false }: DisclosureProps) {
  return (
    <details className="disclosure" open={defaultOpen}>
      <summary className="disclosure-trigger">
        <span className="disclosure-trigger-text">{title}</span>
        <svg
          className="disclosure-icon h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </summary>
      <div className="disclosure-content">{children}</div>
    </details>
  );
}

// ==================== QUALITY BADGE ====================
type QualityBadgeProps = {
  label: string;
};

export function QualityBadge({ label }: QualityBadgeProps) {
  const getStatus = () => {
    if (label.includes("Ready")) return "success";
    if (label.includes("clarification")) return "warning";
    if (label.includes("uncertainty") || label.includes("Insufficient"))
      return "neutral";
    return "neutral";
  };

  return (
    <span className="status-badge" data-status={getStatus()}>
      <span className="status-dot" />
      {label}
    </span>
  );
}
