/** Cache en memoria para payloads de spread (cliente). */
export interface SpreadPayload {
  viewData: Array<{
    page: import("../types/flipbook").FlipbookPage;
    company?: import("../types/flipbook").Company;
    loremParagraphs: string[];
  }>;
  articleIndex: Array<{ page_number: number; titulo: string }>;
  prevSpreadLabel: string | null;
  nextSpreadLabel: string | null;
  spreadLabel: string;
  currentStep: number;
  currentPosition: number;
  totalSteps: number;
}

const cache = new Map<string, SpreadPayload>();

export function getCachedSpread(label: string): SpreadPayload | undefined {
  return cache.get(label);
}

export function setCachedSpread(label: string, payload: SpreadPayload): void {
  cache.set(label, payload);
}
