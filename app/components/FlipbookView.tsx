"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { FlipbookPage, Company } from "../types/flipbook";
import { getUnsplashImageUrl } from "../lib/unsplash";
import {
  getCachedSpread,
  setCachedSpread,
  type SpreadPayload,
} from "../lib/spread-cache";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.1;
const ZOOM_ANIMATION_DURATION_MS = 1200;
const TURN_DURATION_MS = 1400;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Proporción 228×297 mm (como hoja revista) */
const PAGE_ASPECT_RATIO = 228 / 297;

interface PageWithCompany {
  page: FlipbookPage;
  company?: Company;
  loremParagraphs: string[];
}

export interface ArticleIndexEntry {
  page_number: number;
  titulo: string;
}

export interface FlipbookViewProps {
  currentStep: number;
  spreadLabel: string;
  prevSpreadLabel: string | null;
  nextSpreadLabel: string | null;
  viewData: PageWithCompany[];
  articleIndex: ArticleIndexEntry[];
  nextStep: number | null;
  prevStep: number | null;
  currentPosition: number;
  totalSteps: number;
}

type EffectiveSide = "left" | "right";

function effectiveSide(page: FlipbookPage): EffectiveSide {
  if (page.page_type === "cover" || page.page_side === "cover") return "right";
  if (page.page_side === "end" || page.page_type === "backCover") return "left";
  return page.page_side === "left" ? "left" : "right";
}

/** Reparte viewData en left/right según effectiveSide. */
function splitSpread(
  data: PageWithCompany[]
): { left?: PageWithCompany; right?: PageWithCompany } {
  const out: { left?: PageWithCompany; right?: PageWithCompany } = {};
  for (const item of data) {
    const side = effectiveSide(item.page);
    if (side === "left") out.left = item;
    else out.right = item;
  }
  return out;
}

/** Zonas: tercio exterior (33%) + (top 5% | bottom 5% | borde exterior 10%). Click: borde 10% o buffer 100px. */
function hitTestZones(
  pageRect: DOMRect,
  clientX: number,
  clientY: number,
  side: EffectiveSide
): { pointer: boolean; click: boolean } {
  const { left, top, width, height } = pageRect;
  const x = clientX - left;
  const y = clientY - top;
  const third = width / 3;
  const top5 = height * 0.05;
  const bottom5 = height - height * 0.05;
  const edge10 = width * 0.1;
  const inOuterThird =
    side === "left" ? x < third : x > width - third;
  const inTopBottom = y < top5 || y > bottom5;
  const inOuterEdge = side === "left" ? x < edge10 : x > width - edge10;
  const pointer = inOuterThird && (inTopBottom || inOuterEdge);
  const inBuffer100 =
    side === "left"
      ? clientX >= pageRect.left - 100 && clientX < pageRect.left
      : clientX > pageRect.right && clientX <= pageRect.right + 100;
  const click = inOuterEdge || inBuffer100;
  return { pointer, click };
}

function getTypeLabel(page: FlipbookPage): string {
  switch (page.page_type) {
    case "advertiserIndex":
      return "Índice de anunciantes";
    case "Summary":
      return "Sumario de contenidos";
    case "cover":
      return "Portada";
    case "advert":
      return "Publicidad";
    case "backCover":
      return "Contraportada";
    default:
      return "Artículo";
  }
}

/** Logo tipo cabecera de revista para la portada */
function MagazineLogo() {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <div className="mb-1 text-[10px] font-medium tracking-[0.35em] text-amber-300/90 uppercase">
        La revista del sector del vidrio
      </div>
      <div className="font-serif text-4xl font-bold tracking-tight text-white md:text-5xl">
        Glass
      </div>
      <div className="-mt-1 font-serif text-3xl font-bold tracking-[0.2em] text-amber-400 md:text-4xl">
        INFORMER
      </div>
      <div className="mt-2 h-px w-24 bg-amber-500/60" />
    </div>
  );
}

function PageCard({
  data,
  articleIndex,
  disableBackdropDuringTurn = false,
}: {
  data: PageWithCompany;
  articleIndex: ArticleIndexEntry[];
  disableBackdropDuringTurn?: boolean;
}) {
  const { page, company, loremParagraphs } = data;
  const imageUrl = getUnsplashImageUrl(page.page_id);
  const typeLabel = getTypeLabel(page);
  const hasBgImage =
    page.page_type === "cover" ||
    page.page_type === "advert" ||
    page.page_type === "backCover";
  const isArticle = page.page_type === "article";
  const showLorem =
    page.page_type === "article" ||
    page.page_type === "advert" ||
    page.page_type === "backCover";
  const isSummary = page.page_type === "Summary";

  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-lg border border-stone-400/50 shadow-2xl"
      style={{
        aspectRatio: `${PAGE_ASPECT_RATIO}`,
        width: "min(35vw, 739px)",
        minWidth: "min(90vw, 216px)",
      }}
    >
      {/* Fondo imagen: solo cover, advert, backCover */}
      {hasBgImage && (
        <div className="absolute inset-0">
          <Image
            src={imageUrl}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 1200px) 90vw, 739px"
          />
          <div className="absolute inset-0 bg-stone-900/50" aria-hidden />
        </div>
      )}

      {/* Fondo claro para article, Summary, advertiserIndex */}
      {!hasBgImage && (
        <div className="absolute inset-0 bg-stone-100" aria-hidden />
      )}

      <div
        className={`relative z-10 flex flex-1 flex-col ${hasBgImage ? "text-white" : "text-stone-800"}`}
      >
        {/* Cover: logo arriba */}
        {page.page_type === "cover" && (
          <>
            <MagazineLogo />
            <div className="mt-auto px-6 pb-6 text-center text-sm text-stone-300">
              Página {page.page_number + 1}
            </div>
          </>
        )}

        {/* Article: imagen arriba → título → subtítulo → 3 columnas */}
        {isArticle && (
          <>
            <div className="relative h-[28%] min-h-[120px] w-full shrink-0 overflow-hidden">
              <Image
                src={imageUrl}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 1200px) 90vw, 739px"
              />
            </div>
            <div className="flex flex-1 flex-col p-5">
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-amber-700">
                {typeLabel}
              </div>
              <h2 className="text-xl font-bold leading-tight text-stone-900">
                {page.titulo}
              </h2>
              {page.subtitulo && (
                <p className="mt-1 text-sm text-stone-600">
                  {page.subtitulo}
                </p>
              )}
              <div className="mt-4 flex-1 text-justify text-[13px] leading-relaxed text-stone-700 columns-3 gap-4">
                {loremParagraphs.map((para, i) => (
                  <p key={i} className="mb-3 break-inside-avoid">
                    {para}
                  </p>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Advert, backCover: contenido sobre imagen de fondo */}
        {(page.page_type === "advert" || page.page_type === "backCover") && (
          <div className="flex flex-1 flex-col p-6">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-amber-200">
              {typeLabel}
            </div>
            <div className="text-sm text-stone-300">
              Página {page.page_number + 1}
            </div>
            {page.titulo && (
              <h2 className="mt-2 text-lg font-bold text-white">
                {page.titulo}
              </h2>
            )}
            {showLorem && loremParagraphs.length > 0 && (
              <div className="mt-3 flex-1 text-justify text-[12px] leading-relaxed text-stone-200 columns-3 gap-3">
                {loremParagraphs.map((para, i) => (
                  <p key={i} className="mb-2 break-inside-avoid">
                    {para}
                  </p>
                ))}
              </div>
            )}
            {page.page_type === "backCover" && (
              <div className="mt-4 text-sm text-stone-400">
                © Revista Glass Informer. Todos los derechos reservados.
              </div>
            )}
          </div>
        )}

        {/* Summary, advertiserIndex: sin imagen de fondo */}
        {(isSummary || page.page_type === "advertiserIndex") && (
          <div className="flex flex-1 flex-col p-6">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-amber-700">
              {typeLabel}
            </div>
            <div className="text-sm text-stone-500">
              Página {page.page_number + 1}
            </div>
            {isSummary && (
              <div className="mt-4 flex-1">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-600">
                  Índice de contenidos
                </h3>
                <ul className="space-y-2 text-sm text-stone-700">
                  {articleIndex.map((entry) => (
                    <li key={entry.page_number} className="flex gap-2">
                      <span className="shrink-0 font-medium text-amber-700">
                        {entry.page_number + 1}.
                      </span>
                      <span>{entry.titulo}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {page.page_type === "advertiserIndex" && (
              <div className="mt-4 text-sm italic text-stone-600">
                Índice de anunciantes de este número.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Topo: empresa, abajo a la derecha (sin backdrop-blur durante giro para evitar mezcla) */}
      {company && (
        <div
          className={`absolute bottom-4 right-4 z-10 max-w-[220px] rounded-lg p-3 shadow-xl ${disableBackdropDuringTurn ? (hasBgImage ? "border border-amber-400/60 bg-stone-900" : "border border-stone-300 bg-white") : `backdrop-blur-sm ${hasBgImage ? "border border-amber-400/60 bg-stone-900/90" : "border border-stone-300 bg-white/95"}`}`}
        >
          <div className={`mb-0.5 text-[10px] font-medium uppercase tracking-wider ${hasBgImage ? "text-amber-300" : "text-amber-600"}`}>
            Anunciante
          </div>
          <div className={`text-sm font-semibold ${hasBgImage ? "text-white" : "text-stone-800"}`}>
            {company.company_name}
          </div>
          <a
            href={`mailto:${company.company_email}`}
            className={`mt-0.5 block truncate text-xs hover:underline ${hasBgImage ? "text-amber-200" : "text-amber-700"}`}
          >
            {company.company_email}
          </a>
          <div className={`text-[10px] ${hasBgImage ? "text-stone-400" : "text-stone-500"}`}>
            {company.company_phone}
          </div>
          <a
            href={company.company_web}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-0.5 block truncate text-[10px] hover:underline ${hasBgImage ? "text-amber-200" : "text-amber-600"}`}
          >
            {company.company_web}
          </a>
        </div>
      )}
    </div>
  );
}

function clampPan(
  pan: { x: number; y: number },
  viewportW: number,
  viewportH: number,
  contentW: number,
  contentH: number,
  zoom: number
): { x: number; y: number } {
  const scaledW = contentW * zoom;
  const scaledH = contentH * zoom;
  const minX = viewportW / 2 - scaledW + contentW / 2;
  const maxX = contentW / 2 - viewportW / 2;
  const minY = viewportH / 2 - scaledH + contentH / 2;
  const maxY = contentH / 2 - viewportH / 2;
  const clamp = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, v));
  return {
    x: minX <= maxX ? clamp(pan.x, minX, maxX) : 0,
    y: minY <= maxY ? clamp(pan.y, minY, maxY) : 0,
  };
}

/** Escena de giro: underlay z0, estático z10, hoja z50. Una sola cara opaca; swap en t=0.5 + scaleX(-1). Micro shrink al final. */
function TurnScene({
  fromSpread,
  toSpread,
  turnDir,
  turnProgress,
  articleIndex,
  stageSize,
  turningCardSize,
  turnGapPx,
}: {
  fromSpread: PageWithCompany[];
  toSpread: PageWithCompany[];
  turnDir: "prev" | "next";
  turnProgress: number;
  articleIndex: ArticleIndexEntry[];
  stageSize: { w: number; h: number };
  turningCardSize?: { w: number; h: number } | null;
  turnGapPx?: number;
}) {
  const fromLR = splitSpread(fromSpread);
  const toLR = splitSpread(toSpread);
  const gap = turnGapPx ?? 0;

  const firstHalf = turnProgress < 0.5;
  const t1 = firstHalf ? turnProgress / 0.5 : (turnProgress - 0.5) / 0.5;
  const angle =
    turnDir === "next"
      ? firstHalf
        ? -90 * t1
        : -90 - 90 * t1
      : firstHalf
        ? 90 * t1
        : 90 + 90 * t1;
  const zTweak = 1.5 * Math.sin(Math.PI * turnProgress) * (turnDir === "next" ? 1 : -1);
  const f = easeInOutCubic(turnProgress);
  const tx = (turnDir === "next" ? -1 : 1) * gap * f;

  const END_SHRINK_START = 0.85;
  const END_SCALE = 0.985;
  const endT = Math.max(0, Math.min(1, (turnProgress - END_SHRINK_START) / (1 - END_SHRINK_START)));
  const shrink = 1 - (1 - END_SCALE) * easeInOutCubic(endT);

  const slotClass = "flex shrink-0 items-stretch justify-center";
  const cardStyle: Record<string, string | number> = {
    aspectRatio: `${PAGE_ASPECT_RATIO}`,
    width: "min(35vw, 739px)",
    minWidth: "min(90vw, 216px)",
  };

  const layoutClass = "absolute inset-0 flex flex-wrap items-stretch justify-center gap-4";
  const sheetSlotStyle = {
    ...cardStyle,
    ...(turningCardSize ? { width: turningCardSize.w, height: turningCardSize.h } : {}),
  };
  const sheetTransformOrigin = turnDir === "next" ? "0% 50%" : "100% 50%";
  const sheetTransform =
    `translateX(${tx}px) translateZ(60px) rotateY(${angle}deg) rotateZ(${zTweak}deg) scale(${shrink})`;

  const showFrom = firstHalf;
  const fromPage = turnDir === "next" ? fromLR.right : fromLR.left;
  const toPage = turnDir === "next" ? toLR.left : toLR.right;
  const flipContent = !firstHalf;

  return (
    <div
      className="relative w-full h-full"
      style={{
        width: stageSize.w,
        height: stageSize.h,
        position: "relative",
        isolation: "isolate",
        transform: "translateZ(0)",
        willChange: "transform",
      }}
    >
      {/* Underlay: spread destino — z0, sin transform 3D */}
      <div className={layoutClass} style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        {toLR.left && (
          <div className={slotClass} style={cardStyle}>
            <PageCard data={toLR.left} articleIndex={articleIndex} disableBackdropDuringTurn />
          </div>
        )}
        {toLR.right && (
          <div className={slotClass} style={cardStyle}>
            <PageCard data={toLR.right} articleIndex={articleIndex} disableBackdropDuringTurn />
          </div>
        )}
      </div>

      {/* Sombra proyectada sobre underlay (solo overlay, opacity en gradient) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background: `linear-gradient(${turnDir === "next" ? "to left" : "to right"}, transparent 60%, rgba(0,0,0,${0.15 * Math.sin(Math.PI * turnProgress)}) 100%)`,
        }}
      />

      {/* Lado estático (from) — z10 */}
      <div
        className={layoutClass}
        style={{ position: "absolute", inset: 0, zIndex: 10, perspective: "2400px" }}
      >
        {turnDir === "next" ? (
          <>
            {fromLR.left ? (
              <div className={slotClass} style={cardStyle}>
                <PageCard data={fromLR.left} articleIndex={articleIndex} disableBackdropDuringTurn />
              </div>
            ) : (
              <div className={slotClass} style={cardStyle} aria-hidden />
            )}
            <div className={slotClass} style={cardStyle} aria-hidden />
          </>
        ) : (
          <>
            <div className={slotClass} style={cardStyle} aria-hidden />
            {fromLR.right ? (
              <div className={slotClass} style={cardStyle}>
                <PageCard data={fromLR.right} articleIndex={articleIndex} disableBackdropDuringTurn />
              </div>
            ) : (
              <div className={slotClass} style={cardStyle} aria-hidden />
            )}
          </>
        )}
      </div>

      {/* Hoja que gira — z50, una sola cara opaca; sin opacity/mix-blend/bg en contenedor; swap contenido en 0.5 */}
      <div
        className={layoutClass}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 50,
          pointerEvents: "none",
          perspective: "2400px",
        }}
      >
        {turnDir === "next" ? (
          <>
            <div className={slotClass} style={cardStyle} aria-hidden />
            {fromLR.right && (
              <div
                className={slotClass}
                style={{
                  ...sheetSlotStyle,
                  overflow: "hidden",
                  transformStyle: "preserve-3d",
                  transformOrigin: sheetTransformOrigin,
                  transform: sheetTransform,
                  willChange: "transform",
                }}
              >
                <div className="relative w-full h-full" style={{ height: "100%" }}>
                  <div className="absolute inset-0" style={{ zIndex: 1 }}>
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        transform: flipContent ? "scaleX(-1)" : undefined,
                      }}
                    >
                      {showFrom && fromPage ? (
                        <PageCard data={fromPage} articleIndex={articleIndex} disableBackdropDuringTurn />
                      ) : toPage ? (
                        <PageCard data={toPage} articleIndex={articleIndex} disableBackdropDuringTurn />
                      ) : (
                        <div className="h-full w-full rounded-lg bg-stone-200" />
                      )}
                    </div>
                  </div>
                  <div
                    className="absolute inset-0 pointer-events-none rounded-lg"
                    style={{
                      zIndex: 5,
                      background: `linear-gradient(to right, rgba(0,0,0,${0.25 * turnProgress}) 0%, transparent 30%)`,
                    }}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {fromLR.left && (
              <div
                className={slotClass}
                style={{
                  ...sheetSlotStyle,
                  overflow: "hidden",
                  transformStyle: "preserve-3d",
                  transformOrigin: sheetTransformOrigin,
                  transform: sheetTransform,
                  willChange: "transform",
                }}
              >
                <div className="relative w-full h-full" style={{ height: "100%" }}>
                  <div className="absolute inset-0" style={{ zIndex: 1 }}>
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        transform: flipContent ? "scaleX(-1)" : undefined,
                      }}
                    >
                      {showFrom && fromPage ? (
                        <PageCard data={fromPage} articleIndex={articleIndex} disableBackdropDuringTurn />
                      ) : toPage ? (
                        <PageCard data={toPage} articleIndex={articleIndex} disableBackdropDuringTurn />
                      ) : (
                        <div className="h-full w-full rounded-lg bg-stone-200" />
                      )}
                    </div>
                  </div>
                  <div
                    className="absolute inset-0 pointer-events-none rounded-lg"
                    style={{
                      zIndex: 5,
                      background: `linear-gradient(to left, rgba(0,0,0,${0.25 * turnProgress}) 0%, transparent 30%)`,
                    }}
                  />
                </div>
              </div>
            )}
            <div className={slotClass} style={cardStyle} aria-hidden />
          </>
        )}
      </div>
    </div>
  );
}

const EDGE_PERCENT = 10;
const BUFFER_PX = 100;

export default function FlipbookView({
  spreadLabel,
  prevSpreadLabel,
  nextSpreadLabel,
  viewData,
  articleIndex,
  nextStep,
  prevStep,
  currentPosition,
  totalSteps,
}: FlipbookViewProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [pointerCursor, setPointerCursor] = useState(false);
  const [isTurning, setIsTurning] = useState(false);
  const [turnDir, setTurnDir] = useState<"prev" | "next" | null>(null);
  const [fromSpread, setFromSpread] = useState<PageWithCompany[] | null>(null);
  const [toSpread, setToSpread] = useState<PageWithCompany[] | null>(null);
  const [turnProgress, setTurnProgress] = useState(0);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [stageSize, setStageSize] = useState<{ w: number; h: number } | null>(null);
  const [turningCardSize, setTurningCardSize] = useState<{ w: number; h: number } | null>(null);
  const [turnGapPx, setTurnGapPx] = useState(0);
  const gapRef = useRef(0);
  const router = useRouter();
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const zoomRef = useRef(zoom);
  const zoomAnimationRef = useRef<number | null>(null);
  const turnAnimationRef = useRef<number | null>(null);

  zoomRef.current = zoom;

  useEffect(() => {
    if (pendingHref && spreadLabel === pendingHref) {
      setIsTurning(false);
      setTurnDir(null);
      setFromSpread(null);
      setToSpread(null);
      setTurnProgress(0);
      setPendingHref(null);
      setStageSize(null);
      setTurningCardSize(null);
      setTurnGapPx(0);
      gapRef.current = 0;
    }
  }, [pendingHref, spreadLabel]);

  const applyPanClamp = useCallback(() => {
    const vp = viewportRef.current;
    const content = contentRef.current;
    if (!vp || !content) return;
    const vpRect = vp.getBoundingClientRect();
    const cw = content.offsetWidth;
    const ch = content.offsetHeight;
    setPan((p) =>
      clampPan(p, vpRect.width, vpRect.height, cw, ch, zoom)
    );
  }, [zoom]);

  useEffect(() => {
    applyPanClamp();
  }, [zoom, applyPanClamp, viewData]);

  useEffect(() => {
    return () => {
      if (zoomAnimationRef.current !== null) {
        cancelAnimationFrame(zoomAnimationRef.current);
      }
    };
  }, []);

  const animateZoom = useCallback(
    (targetZoom: number, onComplete?: () => void) => {
      if (zoomAnimationRef.current !== null) {
        cancelAnimationFrame(zoomAnimationRef.current);
      }
      const startZoom = zoomRef.current;
      const startTime = performance.now();

      const tick = () => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(1, elapsed / ZOOM_ANIMATION_DURATION_MS);
        const eased = easeInOutCubic(t);
        const value = startZoom + (targetZoom - startZoom) * eased;
        setZoom(value);
        if (t < 1) {
          zoomAnimationRef.current = requestAnimationFrame(tick);
        } else {
          zoomAnimationRef.current = null;
          onComplete?.();
        }
      };
      zoomAnimationRef.current = requestAnimationFrame(tick);
    },
    []
  );

  const handleDoubleClick = useCallback(() => {
    const target = zoomRef.current === 1 ? 1.5 : 1;
    animateZoom(target, () => {
      if (target <= 1) setPan({ x: 0, y: 0 });
    });
  }, [animateZoom]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom <= 1) return;
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    },
    [zoom, pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        const vp = viewportRef.current;
        const content = contentRef.current;
        if (!vp || !content) return;
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        const newPan = {
          x: dragStartRef.current.panX + dx,
          y: dragStartRef.current.panY + dy,
        };
        const vpRect = vp.getBoundingClientRect();
        const clamped = clampPan(
          newPan,
          vpRect.width,
          vpRect.height,
          content.offsetWidth,
          content.offsetHeight,
          zoom
        );
        setPan(clamped);
        return;
      }
      if (zoom <= 1) {
        let inPointer = false;
        for (let i = 0; i < viewData.length; i++) {
          const el = pageRefs.current[i];
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          const side = effectiveSide(viewData[i].page);
          const { pointer } = hitTestZones(rect, e.clientX, e.clientY, side);
          if (pointer) {
            inPointer = true;
            break;
          }
        }
        setPointerCursor(inPointer);
      } else {
        setPointerCursor(false);
      }
    },
    [zoom, isDragging, viewData]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setPointerCursor(false);
  }, []);

  const zoomIn = useCallback(() => {
    const target = Math.min(ZOOM_MAX, zoomRef.current + ZOOM_STEP);
    if (target <= zoomRef.current) return;
    animateZoom(target);
  }, [animateZoom]);

  const zoomOut = useCallback(() => {
    const target = Math.max(ZOOM_MIN, zoomRef.current - ZOOM_STEP);
    if (target >= zoomRef.current) return;
    animateZoom(target, () => {
      if (target <= 1) setPan({ x: 0, y: 0 });
    });
  }, [animateZoom]);

  const requestNavigate = useCallback(
    (direction: "prev" | "next") => {
      if (isTurning) return;
      if (zoomRef.current > 1) return;
      const targetLabel =
        direction === "prev" ? prevSpreadLabel : nextSpreadLabel;
      if (!targetLabel) return;

      const reducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reducedMotion) {
        router.push(`/flipbook/${targetLabel}`);
        return;
      }

      const content = contentRef.current;
      const turningCardIndex = direction === "next" ? 1 : 0;
      const turningEl = pageRefs.current[turningCardIndex];
      if (content) {
        setStageSize({
          w: content.offsetWidth,
          h: content.offsetHeight,
        });
      }
      if (turningEl) {
        const rect = turningEl.getBoundingClientRect();
        setTurningCardSize({ w: rect.width, h: rect.height });
      } else {
        setTurningCardSize(null);
      }
      const elL = pageRefs.current[0];
      const elR = pageRefs.current[1];
      let gapPx = 0;
      if (elL && elR) {
        const rectL = elL.getBoundingClientRect();
        const rectR = elR.getBoundingClientRect();
        gapPx = rectR.left - rectL.right;
      }
      gapPx = Math.max(0, gapPx);
      gapRef.current = gapPx;
      setTurnGapPx(gapPx);
      setFromSpread([...viewData]);
      setIsTurning(true);
      setTurnDir(direction);
      setTurnProgress(0);

      const loadAndAnimate = (payload: SpreadPayload) => {
        setToSpread(payload.viewData);
        const startTime = performance.now();

        const tick = () => {
          const elapsed = performance.now() - startTime;
          const t = Math.min(1, elapsed / TURN_DURATION_MS);
          const eased = easeInOutCubic(t);
          setTurnProgress(eased);
          if (t < 1) {
            turnAnimationRef.current = requestAnimationFrame(tick);
          } else {
            turnAnimationRef.current = null;
            router.push(`/flipbook/${targetLabel}`);
            setPendingHref(targetLabel);
          }
        };
        turnAnimationRef.current = requestAnimationFrame(tick);
      };

      const cached = getCachedSpread(targetLabel);
      if (cached) {
        loadAndAnimate(cached);
        return;
      }
      fetch(`/api/flipbook/spread/${encodeURIComponent(targetLabel)}`)
        .then((res) => {
          if (!res.ok) throw new Error("Spread fetch failed");
          return res.json() as Promise<SpreadPayload>;
        })
        .then((payload) => {
          setCachedSpread(targetLabel, payload);
          loadAndAnimate(payload);
        })
        .catch(() => {
          setIsTurning(false);
          setTurnDir(null);
          setFromSpread(null);
          setToSpread(null);
          setTurnProgress(0);
          setStageSize(null);
          setTurningCardSize(null);
          setTurnGapPx(0);
          gapRef.current = 0;
          router.push(`/flipbook/${targetLabel}`);
        });
    },
    [
      isTurning,
      prevSpreadLabel,
      nextSpreadLabel,
      viewData,
      router,
    ]
  );

  useEffect(() => {
    return () => {
      if (turnAnimationRef.current !== null) {
        cancelAnimationFrame(turnAnimationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (zoomRef.current <= 1) return;
        animateZoom(1, () => setPan({ x: 0, y: 0 }));
        return;
      }
      if (e.key === "ArrowLeft" && prevSpreadLabel) {
        requestNavigate("prev");
        return;
      }
      if (e.key === "ArrowRight" && nextSpreadLabel) {
        requestNavigate("next");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [animateZoom, prevSpreadLabel, nextSpreadLabel, requestNavigate]);

  return (
    <div className="flipbook-layout flex min-h-screen flex-col">
      <div
        ref={viewportRef}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 py-8"
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          cursor: zoom > 1
            ? (isDragging ? "grabbing" : "grab")
            : pointerCursor
              ? "pointer"
              : "default",
          pointerEvents: isTurning ? "none" : undefined,
        }}
      >
        <div
          className="relative inline-block"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            ...(isTurning ? { isolation: "isolate" } : {}),
          }}
        >
          {isTurning && fromSpread && toSpread && turnDir && stageSize && (
            <div
              className="absolute left-0 top-0 flex items-center justify-center"
              style={{ width: stageSize.w, height: stageSize.h }}
            >
              <TurnScene
                fromSpread={fromSpread}
                toSpread={toSpread}
                turnDir={turnDir}
                turnProgress={turnProgress}
                articleIndex={articleIndex}
                stageSize={stageSize}
                turningCardSize={turningCardSize}
                turnGapPx={turnGapPx}
              />
            </div>
          )}
          <div
            ref={contentRef}
            className="flex flex-wrap items-stretch justify-center gap-4"
            style={
              isTurning && fromSpread && toSpread && turnDir
                ? { visibility: "hidden", pointerEvents: "none" }
                : undefined
            }
          >
            {viewData.map((data, i) => {
              const side = effectiveSide(data.page);
              return (
                <div
                  key={data.page.page_id}
                  ref={(el) => {
                    pageRefs.current[i] = el;
                  }}
                  className="relative"
                >
                  <PageCard data={data} articleIndex={articleIndex} />
                  {/* Un solo overlay por lado: edge 10% + buffer 100px → una sola navegación por click */}
                  {side === "left" && prevSpreadLabel && (
                    <div
                      className="absolute top-0 h-full cursor-pointer"
                      style={{
                        left: -BUFFER_PX,
                        width: `calc(${EDGE_PERCENT}% + ${BUFFER_PX}px)`,
                        pointerEvents: "auto",
                        zIndex: 10,
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        requestNavigate("prev");
                      }}
                      aria-label="Página anterior"
                    />
                  )}
                  {side === "right" && nextSpreadLabel && (
                    <div
                      className="absolute top-0 h-full cursor-pointer"
                      style={{
                        left: `calc(100% - ${EDGE_PERCENT}%)`,
                        width: `calc(${EDGE_PERCENT}% + ${BUFFER_PX}px)`,
                        pointerEvents: "auto",
                        zIndex: 10,
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        requestNavigate("next");
                      }}
                      aria-label="Página siguiente"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <nav
        className="flex flex-wrap items-center justify-center gap-4 border-t border-stone-300 bg-stone-100/80 px-6 py-4 backdrop-blur-sm sm:gap-6"
        aria-label="Navegación del flipbook"
      >
        {prevSpreadLabel ? (
          <button
            type="button"
            onClick={() => requestNavigate("prev")}
            disabled={isTurning}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white shadow transition hover:bg-amber-700 disabled:opacity-60"
            aria-label="Página anterior"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        ) : (
          <span
            className="flex h-12 w-12 shrink-0 cursor-not-allowed items-center justify-center rounded-full bg-stone-300 text-stone-500"
            aria-hidden
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </span>
        )}

        <span className="min-w-[100px] shrink-0 text-center text-sm font-medium text-stone-600">
          {spreadLabel} / {totalSteps}
        </span>

        {nextSpreadLabel ? (
          <button
            type="button"
            onClick={() => requestNavigate("next")}
            disabled={isTurning}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white shadow transition hover:bg-amber-700 disabled:opacity-60"
            aria-label="Página siguiente"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        ) : (
          <span
            className="flex h-12 w-12 shrink-0 cursor-not-allowed items-center justify-center rounded-full bg-stone-300 text-stone-500"
            aria-hidden
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </span>
        )}

        <div className="flex shrink-0 items-center gap-2 rounded-full border border-stone-300 bg-white/80 px-3 py-1.5">
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= ZOOM_MIN}
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
            disabled={zoom >= ZOOM_MAX}
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone-600 transition hover:bg-stone-200 disabled:opacity-40 disabled:hover:bg-transparent"
            aria-label="Aumentar zoom"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </nav>
    </div>
  );
}
