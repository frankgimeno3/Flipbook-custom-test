"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { FlipbookPage, Company } from "../types/flipbook";
import { getUnsplashImageUrl } from "../lib/unsplash";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.1;
const ZOOM_ANIMATION_DURATION_MS = 1200;

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
}: {
  data: PageWithCompany;
  articleIndex: ArticleIndexEntry[];
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

      {/* Topo: empresa, abajo a la derecha */}
      {company && (
        <div
          className={`absolute bottom-4 right-4 z-10 max-w-[220px] rounded-lg p-3 shadow-xl backdrop-blur-sm ${hasBgImage ? "border border-amber-400/60 bg-stone-900/90" : "border border-stone-300 bg-white/95"}`}
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
  const router = useRouter();
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const zoomRef = useRef(zoom);
  const zoomAnimationRef = useRef<number | null>(null);

  zoomRef.current = zoom;

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (zoomRef.current <= 1) return;
        animateZoom(1, () => setPan({ x: 0, y: 0 }));
        return;
      }
      if (e.key === "ArrowLeft" && prevSpreadLabel) {
        router.push(`/flipbook/${prevSpreadLabel}`);
        return;
      }
      if (e.key === "ArrowRight" && nextSpreadLabel) {
        router.push(`/flipbook/${nextSpreadLabel}`);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [animateZoom, prevSpreadLabel, nextSpreadLabel, router]);

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
        }}
      >
        <div
          className="inline-block"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          <div
            ref={contentRef}
            className="flex flex-wrap items-stretch justify-center gap-4"
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
                        router.push(`/flipbook/${prevSpreadLabel}`);
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
                        router.push(`/flipbook/${nextSpreadLabel}`);
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
          <Link
            href={`/flipbook/${prevSpreadLabel}`}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white shadow transition hover:bg-amber-700"
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
          </Link>
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
          <Link
            href={`/flipbook/${nextSpreadLabel}`}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white shadow transition hover:bg-amber-700"
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
          </Link>
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
