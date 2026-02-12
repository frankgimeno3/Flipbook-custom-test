import { notFound, redirect } from "next/navigation";
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
} from "../../lib/flipbook-data";
import { getLoremParagraphs } from "../../lib/lorem";
import FlipbookView, {
  type FlipbookViewProps,
  type ArticleIndexEntry,
} from "../../components/FlipbookView";
import type { FlipbookPage, Company } from "../../types/flipbook";

interface PageWithCompany {
  page: FlipbookPage;
  company?: Company;
  loremParagraphs: string[];
}

interface Props {
  params: Promise<{ page: string }>;
}

export default async function FlipbookPage({ params }: Props) {
  const { page: pageParam } = await params;
  const step = parseSpreadParam(pageParam);
  if (step === null) {
    notFound();
  }
  const spreadLabel = getSpreadLabel(step);
  if (pageParam !== spreadLabel) {
    redirect(`/flipbook/${spreadLabel}`);
  }
  const pageNumbers = getPageNumbersForStep(step);
  const nextStep = getNextStep(step);
  const prevStep = getPrevStep(step);
  const steps = getViewSteps();
  const articleIndex: ArticleIndexEntry[] = getArticleIndex();
  const prevSpreadLabel = prevStep !== null ? getSpreadLabel(prevStep) : null;
  const nextSpreadLabel = nextStep !== null ? getSpreadLabel(nextStep) : null;
  const firstSpreadLabel = steps.length > 0 ? getSpreadLabel(steps[0]) : null;
  const lastSpreadLabel = steps.length > 0 ? getSpreadLabel(steps[steps.length - 1]) : null;

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

  const flipbookProps: FlipbookViewProps = {
    currentStep: step,
    spreadLabel,
    prevSpreadLabel,
    nextSpreadLabel,
    firstSpreadLabel,
    lastSpreadLabel,
    viewData,
    articleIndex,
    nextStep,
    prevStep,
    currentPosition,
    totalSteps: steps.length,
  };

  return <FlipbookView {...flipbookProps} />;
}
