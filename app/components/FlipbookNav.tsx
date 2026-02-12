"use client";

export interface FlipbookNavProps {
  spreadLabel: string;
  totalSteps: number;
  prevSpreadLabel: string | null;
  nextSpreadLabel: string | null;
  firstSpreadLabel?: string | null;
  lastSpreadLabel?: string | null;
  isTurning: boolean;
  requestNavigate: (direction: "prev" | "next") => void;
  router: { push: (href: string) => void };
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomMin: number;
  zoomMax: number;
}

export default function FlipbookNav({
  spreadLabel,
  totalSteps,
  prevSpreadLabel,
  nextSpreadLabel,
  firstSpreadLabel,
  lastSpreadLabel,
  isTurning,
  requestNavigate,
  router,
  zoom,
  zoomIn,
  zoomOut,
  zoomMin,
  zoomMax,
}: FlipbookNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex flex-wrap items-center justify-center gap-4 border-t border-stone-300 bg-stone-100 px-6 py-4 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] sm:gap-6"
      aria-label="Navegación del flipbook"
    >
      {firstSpreadLabel && spreadLabel !== firstSpreadLabel ? (
        <button
          type="button"
          onClick={() => !isTurning && router.push(`/flipbook/${firstSpreadLabel}`)}
          disabled={isTurning}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-stone-400 bg-white text-stone-600 shadow transition hover:bg-stone-100 disabled:opacity-60"
          aria-label="Ir al principio"
          title="Ir al principio"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
          </svg>
        </button>
      ) : firstSpreadLabel ? (
        <span className="flex h-12 w-12 shrink-0 cursor-not-allowed items-center justify-center rounded-full border border-stone-300 bg-stone-200 text-stone-500" aria-hidden title="Ya estás al principio">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
          </svg>
        </span>
      ) : null}

      {prevSpreadLabel ? (
        <button
          type="button"
          onClick={() => requestNavigate("prev")}
          disabled={isTurning}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white shadow transition hover:bg-amber-700 disabled:opacity-60"
          aria-label="Página anterior"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      ) : (
        <span className="flex h-12 w-12 shrink-0 cursor-not-allowed items-center justify-center rounded-full bg-stone-300 text-stone-500" aria-hidden>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </span>
      )}

      <span className="min-w-[100px] shrink-0 text-center text-sm font-medium text-stone-600">
        {spreadLabel}
      </span>

      {nextSpreadLabel ? (
        <button
          type="button"
          onClick={() => requestNavigate("next")}
          disabled={isTurning}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white shadow transition hover:bg-amber-700 disabled:opacity-60"
          aria-label="Página siguiente"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      ) : (
        <span className="flex h-12 w-12 shrink-0 cursor-not-allowed items-center justify-center rounded-full bg-stone-300 text-stone-500" aria-hidden>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </span>
      )}

      {lastSpreadLabel && spreadLabel !== lastSpreadLabel ? (
        <button
          type="button"
          onClick={() => !isTurning && router.push(`/flipbook/${lastSpreadLabel}`)}
          disabled={isTurning}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-stone-400 bg-white text-stone-600 shadow transition hover:bg-stone-100 disabled:opacity-60"
          aria-label="Ir al final"
          title="Ir al final"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 17l5-5-5-5M13 17l5-5-5-5" />
          </svg>
        </button>
      ) : lastSpreadLabel ? (
        <span className="flex h-12 w-12 shrink-0 cursor-not-allowed items-center justify-center rounded-full border border-stone-300 bg-stone-200 text-stone-500" aria-hidden title="Ya estás al final">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 17l5-5-5-5M13 17l5-5-5-5" />
          </svg>
        </span>
      ) : null}

      <div className="flex shrink-0 items-center gap-2 rounded-full border border-stone-300 bg-white/80 px-3 py-1.5">
        <button
          type="button"
          onClick={zoomOut}
          disabled={zoom <= zoomMin}
          className="flex h-8 w-8 items-center justify-center rounded-full text-stone-600 transition hover:bg-stone-200 disabled:opacity-40 disabled:hover:bg-transparent"
          aria-label="Reducir zoom"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14" />
          </svg>
        </button>
        <span className="min-w-[3rem] text-center text-sm font-medium text-stone-700">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={zoomIn}
          disabled={zoom >= zoomMax}
          className="flex h-8 w-8 items-center justify-center rounded-full text-stone-600 transition hover:bg-stone-200 disabled:opacity-40 disabled:hover:bg-transparent"
          aria-label="Aumentar zoom"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
