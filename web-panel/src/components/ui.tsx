import type { InputHTMLAttributes, ReactNode, TableHTMLAttributes } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="cm-page-header">
      <div>
        {eyebrow ? <p className="cm-eyebrow">{eyebrow}</p> : null}
        <h1 className="cm-page-title">{title}</h1>
        {description ? <p className="cm-muted mt-1 text-sm">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

type MetricCardProps = {
  label: string;
  value: ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info";
};

const METRIC_TONE_CLASS: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  default: "text-[color:var(--cm-text)]",
  success: "text-[color:var(--cm-success)]",
  warning: "text-[color:var(--cm-warning)]",
  danger: "text-[color:var(--cm-danger)]",
  info: "text-[color:var(--cm-info)]",
};

export function MetricCard({ label, value, tone = "default" }: MetricCardProps) {
  return (
    <article className="cm-metric-card">
      <p className="cm-eyebrow">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${METRIC_TONE_CLASS[tone]}`}>{value}</p>
    </article>
  );
}

type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = "Cargando..." }: LoadingStateProps) {
  return (
    <div className="cm-loading-state">
      <div className="cm-loading-inline">
        <span className="cm-spinner" />
        <p>{label}</p>
      </div>
    </div>
  );
}

type ErrorBannerProps = {
  message: string;
  className?: string;
};

export function ErrorBanner({ message, className = "" }: ErrorBannerProps) {
  return <div className={`cm-error-banner ${className}`.trim()}>{message}</div>;
}

type SearchBarProps = InputHTMLAttributes<HTMLInputElement> & {
  wrapperClassName?: string;
};

export function SearchBar({ wrapperClassName = "mt-4", className = "", type = "text", ...props }: SearchBarProps) {
  return (
    <div className={`cm-card cm-card-pad ${wrapperClassName}`.trim()}>
      <input type={type} className={`cm-input ${className}`.trim()} {...props} />
    </div>
  );
}

type ConfirmDialogProps = {
  open: boolean;
  eyebrow?: string;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isBusy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  eyebrow,
  title,
  children,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  isBusy = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4" role="dialog" aria-modal="true">
      <div className="cm-card w-full max-w-md p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        {eyebrow ? <p className="cm-eyebrow">{eyebrow}</p> : null}
        <h2 className="mt-2 text-xl font-bold text-[color:var(--cm-text)]">{title}</h2>
        <div className="mt-3 space-y-2 text-sm text-[color:var(--cm-text-muted)]">{children}</div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={isBusy} className="cm-btn cm-btn-secondary">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={isBusy} className="cm-btn cm-btn-danger">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

type DataTableProps = TableHTMLAttributes<HTMLTableElement> & {
  minWidth?: string;
};

export function DataTable({ children, minWidth = "1050px", className = "", style, ...props }: DataTableProps) {
  return (
    <div className="cm-table-card mt-4">
      <table
        className={`cm-table ${className}`.trim()}
        style={{ minWidth, ...style }}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}
