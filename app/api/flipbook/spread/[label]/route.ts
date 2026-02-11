import { NextRequest } from "next/server";
import {
  getViewSteps,
  getPageNumbersForStep,
  getNextStep,
  getPrevStep,
  getPageByNumber,
  getCompanyById,
  getArticleIndex,
  parseSpreadParam,
  getSpreadLabel,
} from "../../../../lib/flipbook-data";
import { getLoremParagraphs } from "../../../../lib/lorem";
import type { FlipbookPage, Company } from "../../../../types/flipbook";

interface PageWithCompany {
  page: FlipbookPage;
  company?: Company;
  loremParagraphs: string[];
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ label: string }> }
) {
  const { label } = await params;
  const step = parseSpreadParam(label);
  if (step === null) {
    return new Response(JSON.stringify({ error: "Invalid spread label" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  const pageNumbers = getPageNumbersForStep(step);
  const nextStep = getNextStep(step);
  const prevStep = getPrevStep(step);
  const steps = getViewSteps();
  const articleIndex = getArticleIndex();
  const spreadLabel = getSpreadLabel(step);
  const prevSpreadLabel = prevStep !== null ? getSpreadLabel(prevStep) : null;
  const nextSpreadLabel = nextStep !== null ? getSpreadLabel(nextStep) : null;

  const viewData: PageWithCompany[] = pageNumbers
    .map((num) => {
      const p = getPageByNumber(num);
      if (!p) return null;
      const company = p.relatedTo ? getCompanyById(p.relatedTo) : undefined;
      const loremParagraphs =
        p.page_type === "cover" ? [] : getLoremParagraphs(p.page_id, 3);
      return { page: p, company, loremParagraphs };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const currentPosition = steps.indexOf(step) + 1;

  return Response.json({
    viewData,
    articleIndex,
    prevSpreadLabel,
    nextSpreadLabel,
    spreadLabel,
    currentStep: step,
    currentPosition,
    totalSteps: steps.length,
  });
}
