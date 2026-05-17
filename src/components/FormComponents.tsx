import { Info } from "lucide-react";
import { useId, type ReactNode } from "react";
import { getFieldHelp, type FieldHelp } from "../lib/fieldHelp";
import { cx } from "../lib/utils";

type HelpTarget = {
  label?: string;
  helpId?: string;
};

function TooltipInfo({
  label,
  helpId,
  interactive = true,
}: HelpTarget & { interactive?: boolean }) {
  const tooltipId = useId();
  const help: FieldHelp = getFieldHelp(label, helpId);

  return (
    <span
      className="tooltip-anchor"
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `${help.title} help` : undefined}
      aria-describedby={interactive ? tooltipId : undefined}
      aria-hidden={interactive ? undefined : true}
    >
      <Info className="tooltip-info-icon" aria-hidden="true" />
      <span id={tooltipId} role="tooltip" className="tooltip-popover">
        <span className="tooltip-title">{help.title}</span>
        <span>{help.means}</span>
        <span>{help.effect}</span>
        <span>{help.notMean}</span>
        <span className="tooltip-example">{help.example}</span>
      </span>
    </span>
  );
}

function LabelWithHelp({
  label,
  helpId,
  className,
  interactive = true,
}: HelpTarget & { className?: string; interactive?: boolean }) {
  if (!label) return null;

  return (
    <span className={cx("label-with-help", className)}>
      <span>{label}</span>
      <TooltipInfo label={label} helpId={helpId} interactive={interactive} />
    </span>
  );
}

// ==================== FIELD ====================
type FieldProps = {
  label: string;
  hint?: string;
  children: ReactNode;
  helpId?: string;
};

export function Field({ label, hint, children, helpId }: FieldProps) {
  return (
    <div className="form-group">
      <label className="form-label">
        <LabelWithHelp label={label} helpId={helpId} />
      </label>
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
  helpId?: string;
};

type ChoiceGroupProps<T extends string> = {
  label: string;
  value: T;
  options: ChoiceOption<T>[];
  onChoose: (value: T) => void;
  columns?: 1 | 2;
  helpId?: string;
};

export function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChoose,
  columns = 1,
  helpId,
}: ChoiceGroupProps<T>) {
  return (
    <div className="form-group">
      <LabelWithHelp label={label} helpId={helpId} className="form-label" />
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
              <span className="choice-title">
                <span>{option.title}</span>
                <TooltipInfo
                  label={option.title}
                  helpId={option.helpId ?? option.value}
                  interactive={false}
                />
              </span>
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
  helpId?: string;
};

export function ToggleRow({ title, detail, checked, onToggle, helpId }: ToggleRowProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="toggle-card"
      data-active={checked}
    >
      <span className="toggle-content">
        <span className="toggle-title">
          <span>{title}</span>
          <TooltipInfo label={title} helpId={helpId} interactive={false} />
        </span>
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
  helpId?: string;
};

export function ChipGroup({ label, values, selected, onToggle, helpId }: ChipGroupProps) {
  return (
    <div className="form-group">
      <LabelWithHelp label={label} helpId={helpId} className="form-label" />
      <div className="chip-group">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onToggle(value)}
            className="chip"
            data-active={selected.includes(value)}
          >
            <span>{value}</span>
            <TooltipInfo label={value} interactive={false} />
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
  helpId?: string;
};

export function Card({ title, description, children, footer, helpId }: CardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <LabelWithHelp label={title} helpId={helpId} />
        </h3>
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
  helpId?: string;
};

export function SectionBlock({ eyebrow, title, children, helpId }: SectionBlockProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase text-accent">
          {eyebrow}
        </span>
        <h2 className="text-xl font-semibold text-foreground">
          <LabelWithHelp label={title} helpId={helpId} />
        </h2>
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
  helpId?: string;
};

export function Disclosure({ title, children, defaultOpen = false, helpId }: DisclosureProps) {
  return (
    <details className="disclosure" open={defaultOpen}>
      <summary className="disclosure-trigger">
        <span className="disclosure-trigger-text">
          <LabelWithHelp label={title} helpId={helpId} interactive={false} />
        </span>
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
