import type { FlipbookPage, Company } from "../types/flipbook";
import pagesData from "../../data/pages.json";
import companiesData from "../../data/companies.json";

const pages = pagesData as FlipbookPage[];
const companies = companiesData as Company[];

export function getPages(): FlipbookPage[] {
  return pages.sort((a, b) => a.page_number - b.page_number);
}

export function getCompanies(): Company[] {
  return companies;
}

export function getCompanyById(id: string): Company | undefined {
  return companies.find((c) => c.company_id === id);
}

/** Valid "step" page numbers for navigation: 0 (cover), 1, 3, 5... (left of spread), last (end) */
export function getViewSteps(): number[] {
  const sorted = getPages();
  if (sorted.length === 0) return [];
  const steps: number[] = [0];
  for (let i = 1; i < sorted.length - 1; i += 2) {
    steps.push(sorted[i].page_number);
  }
  const lastNum = sorted[sorted.length - 1].page_number;
  if (lastNum !== 0 && !steps.includes(lastNum)) {
    steps.push(lastNum);
  }
  return steps;
}

export function getPageByNumber(pageNumber: number): FlipbookPage | undefined {
  return pages.find((p) => p.page_number === pageNumber);
}

/** For a given view step (URL param), return the page number(s) to display: [single] or [left, right] */
export function getPageNumbersForStep(step: number): number[] {
  const sorted = getPages();
  const lastNum = sorted[sorted.length - 1]?.page_number ?? 0;
  if (step === 0) return [0];
  if (step === lastNum) return [lastNum];
  const right = step + 1;
  const hasRight = sorted.some((p) => p.page_number === right);
  return hasRight ? [step, right] : [step];
}

export function getNextStep(current: number): number | null {
  const steps = getViewSteps();
  const idx = steps.indexOf(current);
  if (idx < 0 || idx >= steps.length - 1) return null;
  return steps[idx + 1];
}

export function getPrevStep(current: number): number | null {
  const steps = getViewSteps();
  const idx = steps.indexOf(current);
  if (idx <= 0) return null;
  return steps[idx - 1];
}

export function isValidStep(step: number): boolean {
  return getViewSteps().includes(step);
}

/** Para índice >= 1 devuelve el impar inicial del spread; 0 sigue siendo 0. */
export function spreadStartIndex(pageOrStep: number): number {
  if (pageOrStep === 0) return 0;
  return pageOrStep % 2 === 1 ? pageOrStep : pageOrStep - 1;
}

/** Label por spread: "0", "1_2", "3_4", … o "15" si es última sola. */
export function getSpreadLabel(step: number): string {
  const steps = getViewSteps();
  if (step === 0) return "0";
  const last = steps[steps.length - 1];
  if (step === last && !steps.includes(step + 1)) return String(step);
  return `${step}_${step + 1}`;
}

/** Parsea slug de URL a step navegable. "3_4"→3, par (ej. 4)→impar anterior, impar→ese. */
export function parseSpreadParam(param: string): number | null {
  const steps = getViewSteps();
  if (!param || steps.length === 0) return null;
  if (param === "0") return 0;
  const underscore = param.indexOf("_");
  if (underscore !== -1) {
    const first = parseInt(param.slice(0, underscore), 10);
    return Number.isNaN(first) || !isValidStep(first) ? null : first;
  }
  const n = parseInt(param, 10);
  if (Number.isNaN(n)) return null;
  if (n < 0) return null;
  if (n % 2 === 0 && n > 0) return spreadStartIndex(n);
  if (isValidStep(n)) return n;
  if (n === steps[steps.length - 1]) return n;
  return null;
}

/** Índice de artículos con título (para el sumario de contenidos). Una entrada por artículo (por título único). */
export function getArticleIndex(): { page_number: number; titulo: string }[] {
  const seen = new Set<string>();
  return getPages()
    .filter((p) => p.page_type === "article" && p.titulo)
    .filter((p) => {
      const key = p.titulo!;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((p) => ({ page_number: p.page_number, titulo: p.titulo! }))
    .sort((a, b) => a.page_number - b.page_number);
}
