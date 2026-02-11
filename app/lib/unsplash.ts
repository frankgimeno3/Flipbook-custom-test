/** IDs de fotos Unsplash para fondo distinto por página (diferente índice = imagen distinta) */
const UNSPLASH_PHOTO_IDS = [
  "1507003211169-0a1dd7228f2d",
  "1513542789411-b6d5d45989b5",
  "1497366216548-37526070297c",
  "1542744094-24638eff58bb",
  "1522071820081-009f0129c71c",
  "1524758631624-e2822e304c36",
  "1497215842964-222b430dc094",
  "1557804506-669a67965ba3",
  "1557683316-973673baf926",
  "1624555130581-1d9cca783bc0",
  "1587691592099-24045742c181",
  "1560472354-e33a6d0cbf82",
  "1544197150-e2ad7602706c",
  "1578662996442-1f60151d4985",
  "1600880292203-757bb62b4baf",
  "1605640840606-9442a6f2c5b2",
];

const BASE = "https://images.unsplash.com";

/** Hash simple de string a índice para elegir imagen distinta por page_id (aleatorio pero estable) */
function hashToIndex(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function getUnsplashImageUrl(pageId: string): string {
  const index = hashToIndex(pageId) % UNSPLASH_PHOTO_IDS.length;
  const id = UNSPLASH_PHOTO_IDS[index];
  return `${BASE}/photo-${id}?w=800&q=80`;
}
