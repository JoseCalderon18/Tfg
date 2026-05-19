import { useState } from "react";
import type { ReactNode } from "react";

type HelpButtonProps = {
  title: string;
  content: ReactNode;
  className?: string;
};

export default function HelpButton({ title, content, className = "" }: HelpButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`cm-btn cm-btn-secondary cm-btn-sm ${className}`}
        aria-label={`Ayuda sobre ${title}`}
      >
        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-[color:var(--cm-border)] text-[10px] font-bold leading-none">
          ?
        </span>
        Ayuda
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-end bg-slate-950/60 p-4 pt-16 sm:pt-20"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            className="cm-card w-full max-w-sm p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--cm-info)] text-xs font-bold text-white">
                  ?
                </span>
                <p className="cm-eyebrow">Ayuda del módulo</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 text-xl leading-none text-[color:var(--cm-text-muted)] transition hover:text-[color:var(--cm-text)]"
                aria-label="Cerrar ayuda"
              >
                ×
              </button>
            </div>
            <h3 className="text-base font-bold text-[color:var(--cm-text)]">{title}</h3>
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-[color:var(--cm-text-muted)]">
              {content}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
