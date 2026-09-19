export type BookRecognitionCandidate = {
  title: string;
  author: string;
};

export type RankedBookCandidate = BookRecognitionCandidate & {
  score: number;
  titleCoverage: number;
  authorCoverage: number;
};

const stopWords = new Set([
  "a","an","and","by","for","from","in","of","on","or","the","to","with",
]);

export function normalizeRecognitionText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(value: string) {
  return normalizeRecognitionText(value)
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !stopWords.has(token));
}

function coverage(candidate: string, ocrTokens: Set<string>) {
  const candidateTokens = tokens(candidate);
  if (!candidateTokens.length) return 0;
  const matched = candidateTokens.filter((token) => ocrTokens.has(token)).length;
  return matched / candidateTokens.length;
}

export function rankBookCandidates(
  ocrText: string,
  candidates: readonly BookRecognitionCandidate[],
): RankedBookCandidate[] {
  const normalizedOcr = normalizeRecognitionText(ocrText);
  const ocrTokens = new Set(tokens(ocrText));
  const deduped = new Map<string, BookRecognitionCandidate>();

  for (const candidate of candidates) {
    const title = candidate.title.trim();
    const author = candidate.author.trim();
    if (!title) continue;
    const key = `${normalizeRecognitionText(title)}|${normalizeRecognitionText(author)}`;
    if (!deduped.has(key)) deduped.set(key, { title, author });
  }

  return [...deduped.values()]
    .map((candidate) => {
      const titleCoverage = coverage(candidate.title, ocrTokens);
      const authorCoverage = candidate.author ? coverage(candidate.author, ocrTokens) : 0;
      const normalizedTitle = normalizeRecognitionText(candidate.title);
      const exactTitleBonus = normalizedTitle.length >= 4 && normalizedOcr.includes(normalizedTitle) ? 0.12 : 0;
      const score = Math.min(1, titleCoverage * 0.72 + authorCoverage * 0.2 + exactTitleBonus);
      return { ...candidate, score, titleCoverage, authorCoverage };
    })
    .sort((left, right) => right.score - left.score || right.titleCoverage - left.titleCoverage);
}

export function chooseBookRecognition(
  ocrText: string,
  candidates: readonly BookRecognitionCandidate[],
) {
  const ranked = rankBookCandidates(ocrText, candidates);
  const first = ranked[0];
  if (!first || first.titleCoverage < 0.55 || first.score < 0.52) return null;

  const second = ranked[1];
  if (second && first.score - second.score < 0.07) {
    const sameTitle = normalizeRecognitionText(first.title) === normalizeRecognitionText(second.title);
    const sameAuthor = normalizeRecognitionText(first.author) === normalizeRecognitionText(second.author);
    if (!sameTitle || !sameAuthor) return null;
  }

  return first;
}

export function recognitionSearchQueries(ocrText: string) {
  const lines = ocrText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 3 && line.length <= 100)
    .filter((line) => /[A-Za-z]/.test(line))
    .slice(0, 10);

  const queries: string[] = [];
  const add = (value: string) => {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (normalized.length < 3 || queries.includes(normalized)) return;
    queries.push(normalized);
  };

  for (const line of lines.slice(0, 4)) add(line);
  for (let index = 0; index < Math.min(lines.length - 1, 3); index += 1) {
    add(`${lines[index]} ${lines[index + 1]}`);
  }

  return queries.slice(0, 5);
}
