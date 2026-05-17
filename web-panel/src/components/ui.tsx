import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

type Tone = "primary" | "secondary" | "danger" | "success" | "warning" | "neutral";

const buttonToneClasses: Record<Tone, string> = {
  primary:
    "border-[color:var(--cm-primary)]/45 bg-[color:var(--cm-primary)] text-white shadow-[0_8px_20px_rgba(47,111,237,0.18)] hover:bg-[color:var(--cm-primary-strong)]",
  secondary:
    "border-white/10 bg-[color:var(--cm-surface)] text-[color:var(--cm-text)] hover:bg-[color:var(--cm-surface-2)]",
  danger:
    "border-[color:var(--cm-danger)]/55 bg-[color:var(--cm-danger)] text-white shadow-[0_8px_22px_rgba(239,68,68,0.2)] hover:brightness-110",
  success:
    "border-[color:var(--cm-success)]/45 bg-[color:var(--cm-success)] text-slate-950 hover:brightness-110",
  warning:
    "border-[color:var(--cm-warning)]/45 bg-[color:var(--cm-warning)] text-slate-950 hover:brightness-110",
  neutral:
    "border-white/10 bg-[color:var(--cm-surface-2)] text-[color:var(--cm-text)] hover:bg-white/10",
};

const badgeToneClasses: Record<Tone | "alert" | "special" | "info", string> = {
  primary: "cm-badge-info",
  secondary: "cm-badge-neutral",
  danger: "cm-badge-danger",
  success: "cm-badge-success",
  warning: "cm-badge-warning",
  neutral: "cm-badge-neutral",
  alert: "cm-badge-alert",
  special: "cm-badge-special",
  info: "cm-badge-info",
};

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? (
          <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--cm-text-muted)]">{eyebrow}</p>
        ) : null}
        <h1 className="mt-1 text-2xl font-bold">{title}</h1>
        {description ? <p className="mt-1 text-sm text-[color:var(--cm-text-muted)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div> : null}
    </div>
  );
}

type CardProps = {
  as?: "div" | "article" | "section";
  className?: string;
  children: ReactNode;
};

export function Card({ as: Component = "div", className = "", children }: CardProps) {
  return (
    <Component
      className={`rounded-2xl border border-white/10 bg-[color:var(--cm-surface)] shadow-[0_8px_22px_rgba(0,0,0,0.14)] ${className}`}
    >
      {children}
    </Component>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: Tone;
  size?: "sm" | "md";
};

export function Button({ tone = "secondary", size = "md", className = "", children, ...props }: ButtonProps) {
  const sizeClass = size === "sm" ? "rounded-lg px-2.5 py-1.5 text-xs" : "rounded-xl px-4 py-2 text-sm";

  return (
    <button
      type="button"
      className={`border font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${sizeClass} ${buttonToneClasses[tone]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

type BadgeProps = {
  tone?: keyof typeof badgeToneClasses;
  className?: string;
  children: ReactNode;
};

export function Badge({ tone = "neutral", className = "", children }: BadgeProps) {
  return <span className={`${badgeToneClasses[tone]} rounded-full px-2.5 py-1 text-xs ${className}`}>{children}</span>;
}

type SearchInputProps = InputHTMLAttributes<HTMLInputElement>;

export function SearchInput({ className = "", ...props }: SearchInputProps) {
  return (
    <Card className="p-3.5 shadow-none">
      <input
        type="text"
        className={`w-full rounded-xl border border-white/10 bg-[color:var(--cm-surface-2)] px-3.5 py-2.5 text-[color:var(--cm-text)] outline-none transition placeholder:text-[color:var(--cm-text-muted)] focus:border-[color:var(--cm-primary)] ${className}`}
        {...props}
      />
    </Card>
  );
}

type TableShellProps = {
  minWidth?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function TableShell({ minWidth = "1050px", children, footer }: TableShellProps) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth }}>
        {children}
      </table>
      {footer ? <div className="border-t border-white/10 px-4 py-4">{footer}</div> : null}
    </Card>
  );
}

type PaginationBarProps = {
  page: number;
  totalPages: number;
  visibleCount: number;
  totalCount: number;
  itemLabel: string;
  onPrevious: () => void;
  onNext: () => void;
};

export function PaginationBar({
  page,
  totalPages,
  visibleCount,
  totalCount,
  itemLabel,
  onPrevious,
  onNext,
}: PaginationBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[color:var(--cm-text-muted)]">
        Página {page} de {totalPages} · Mostrando {visibleCount} de {totalCount} {itemLabel}
      </p>

      <div className="flex items-center gap-2">
        <Button tone="neutral" onClick={onPrevious} disabled={page === 1}>
          Anterior
        </Button>
        <Button tone="neutral" onClick={onNext} disabled={page === totalPages}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}
