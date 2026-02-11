export type PageType =
  | "cover"
  | "article"
  | "advert"
  | "advertiserIndex"
  | "Summary"
  | "backCover";
export type PageSide = "cover" | "end" | "left" | "right";

export interface FlipbookPage {
  page_id: string;
  page_number: number;
  page_type: PageType;
  page_side: PageSide;
  relatedTo?: string; // company_id
  titulo?: string;
  subtitulo?: string;
}

export interface Company {
  company_id: string;
  company_name: string;
  company_email: string;
  company_phone: string;
  company_web: string;
}
