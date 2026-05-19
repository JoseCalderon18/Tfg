import { useState, useEffect, useCallback } from "react";

export type TourStep = {
  selector: string;
  title: string;
  description: string;
};

const PAD = 10;

function TourOverlay({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  const measureTarget = useCallback((selector: string) => {
    const el = document.querySelector(selector);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const timer = window.setTimeout(() => {
      setRect(el.getBoundingClientRect());
    }, 380);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    setRect(null);
    return measureTarget(step.selector);
  }, [step.selector, measureTarget]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === "Enter") {
        if (!isLast) setStepIndex((i) => i + 1);
        else onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isLast, onClose]);

  if (!rect) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80">
        <span className="cm-spinner" />
      </div>
    );
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const spot = {
    top: Math.max(0, rect.top - PAD),
    left: Math.max(0, rect.left - PAD),
    width: rect.width + PAD * 2,
    height: Math.min(rect.height + PAD * 2, vh - Math.max(0, rect.top - PAD) - 4),
  };

  const CARD_W = 324;
  const CARD_H_EST = 200;
  const cardLeft = Math.min(Math.max(spot.left, 12), vw - CARD_W - 12);
  const belowY = spot.top + spot.height + 14;
  const aboveY = spot.top - CARD_H_EST - 14;
  const cardTop =
    belowY + CARD_H_EST < vh - 12
      ? belowY
      : aboveY > 12
      ? aboveY
      : vh / 2 - CARD_H_EST / 2;

  const advance = () => {
    if (!isLast) setStepIndex((i) => i + 1);
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Top dark segment */}
      <div
        className="absolute cursor-pointer bg-slate-950/80"
        style={{ top: 0, left: 0, right: 0, height: spot.top }}
        onClick={onClose}
      />
      {/* Left dark segment */}
      <div
        className="absolute cursor-pointer bg-slate-950/80"
        style={{ top: spot.top, left: 0, width: spot.left, height: spot.height }}
        onClick={onClose}
      />
      {/* Right dark segment */}
      <div
        className="absolute cursor-pointer bg-slate-950/80"
        style={{ top: spot.top, left: spot.left + spot.width, right: 0, height: spot.height }}
        onClick={onClose}
      />
      {/* Bottom dark segment */}
      <div
        className="absolute cursor-pointer bg-slate-950/80"
        style={{ top: spot.top + spot.height, left: 0, right: 0, bottom: 0 }}
        onClick={onClose}
      />

      {/* Highlight ring around the target element */}
      <div
        className="pointer-events-none absolute rounded-xl"
        style={{
          top: spot.top,
          left: spot.left,
          width: spot.width,
          height: spot.height,
          boxShadow:
            "0 0 0 3px var(--cm-info), 0 0 0 8px rgba(37,99,235,0.18)",
        }}
      />

      {/* Tooltip card */}
      <div
        className="absolute cm-card p-5 shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
        style={{ top: cardTop, left: cardLeft, width: CARD_W }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="cm-eyebrow">
            Paso {stepIndex + 1} / {steps.length}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-xl leading-none text-[color:var(--cm-text-muted)] transition hover:text-[color:var(--cm-text)]"
            aria-label="Cerrar tour"
          >
            ×
          </button>
        </div>
        <h3 className="font-bold text-[color:var(--cm-text)]">{step.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--cm-text-muted)]">
          {step.description}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={advance}
            className="cm-btn cm-btn-primary cm-btn-sm"
          >
            {isLast ? "Finalizar ✓" : "Continuar →"}
          </button>
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === stepIndex
                    ? "w-5 bg-[color:var(--cm-info)]"
                    : "w-1.5 bg-[color:var(--cm-border)]"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type TourButtonProps = {
  steps: TourStep[];
  className?: string;
};

export default function TourButton({ steps, className = "" }: TourButtonProps) {
  const [active, setActive] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setActive(true)}
        className={`cm-btn cm-btn-secondary cm-btn-sm ${className}`}
        aria-label="Iniciar tour guiado de esta página"
      >
        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-[color:var(--cm-border)] text-[10px] font-bold leading-none">
          ?
        </span>
        Tour guiado
      </button>

      {active ? (
        <TourOverlay steps={steps} onClose={() => setActive(false)} />
      ) : null}
    </>
  );
}
