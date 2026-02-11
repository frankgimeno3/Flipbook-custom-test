/**
 * Generador determinista de texto tipo lorem ipsum.
 * Usa una semilla (p. ej. page_id) para que la misma página siempre reciba el mismo texto.
 */

const WORDS = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
  "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
  "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud",
  "exercitation", "ullamco", "laboris", "nisi", "aliquip", "ex", "ea", "commodo",
  "consequat", "duis", "aute", "irure", "in", "reprehenderit", "voluptate",
  "velit", "esse", "cillum", "fugiat", "nulla", "pariatur", "excepteur", "sint",
  "occaecat", "cupidatat", "non", "proident", "sunt", "culpa", "qui", "officia",
  "deserunt", "mollit", "anim", "id", "est", "laborum", "pellentesque", "habitant",
  "morbi", "tristique", "senectus", "netus", "malesuada", "fames", "ac", "turpis",
  "egestas", "vestibulum", "lectus", "mauris", "ultrices", "eros", "cursus",
  "viverra", "tellus", "elementum", "sagittis", "vitae", "leo", "vel", "orci",
  "porta", "at", "auctor", "augue", "mauris", "diam", "phasellus", "faucibus",
  "scelerisque", "eleifend", "donec", "pretium", "vulputate", "sapien", "nec",
  "ullamcorper", "suspendisse", "potenti", "nullam", "libero", "nunc", "congue",
  "nisi", "vitae", "suscipit", "tellus", "mauris", "a", "diam",
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function seededIndex(seed: number, max: number): number {
  return seed % max;
}

/** Genera N párrafos de lorem ipsum determinista a partir de seed (p. ej. page_id). */
export function getLoremParagraphs(seed: string, paragraphCount: number = 3): string[] {
  const h = hash(seed);
  const paragraphs: string[] = [];
  let wordIndex = h % WORDS.length;
  const wordsPerParagraph = 40 + (h % 30);

  for (let p = 0; p < paragraphCount; p++) {
    const words: string[] = [];
    for (let w = 0; w < wordsPerParagraph; w++) {
      const word = WORDS[wordIndex % WORDS.length];
      words.push(w === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word);
      wordIndex = (wordIndex + 1 + (h % 7)) % WORDS.length;
    }
    paragraphs.push(words.join(" ") + ".");
  }
  return paragraphs;
}
