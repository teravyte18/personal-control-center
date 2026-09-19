import "server-only";

import { spawn } from "node:child_process";
import sharp from "sharp";
import {
  chooseBookRecognition,
  rankBookCandidates,
  recognitionSearchQueries,
  type BookRecognitionCandidate,
} from "@/domain/book-recognition";

const OCR_TIMEOUT_MS = 25_000;
const SEARCH_TIMEOUT_MS = 8_000;

export class BookRecognitionError extends Error {
  constructor(message: string, readonly status = 422) {
    super(message);
    this.name = "BookRecognitionError";
  }
}

type OcrVariant = {
  label: string;
  bytes: Buffer;
  psm: 6 | 11;
};

async function prepareForOcr(bytes: Uint8Array): Promise<OcrVariant[]> {
  try {
    const base = sharp(bytes, { animated: false, failOn: "error" })
      .rotate()
      .resize({
        width: 1800,
        height: 2700,
        fit: "inside",
      })
      .grayscale()
      .normalize()
      .sharpen({ sigma: 1.2 });

    const [normalized, highContrast] = await Promise.all([
      base.clone().png().toBuffer(),
      base.clone().threshold(170).png().toBuffer(),
    ]);

    return [
      { label: "normalized-sparse", bytes: normalized, psm: 11 },
      { label: "normalized-block", bytes: normalized, psm: 6 },
      { label: "contrast-sparse", bytes: highContrast, psm: 11 },
    ];
  } catch {
    throw new BookRecognitionError("The cover image could not be read.");
  }
}

function runTesseract(bytes: Buffer, psm: 6 | 11) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(
      "tesseract",
      ["stdin", "stdout", "-l", "eng+por", "--psm", String(psm)],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      windowClear();
      if (error) reject(error);
      else resolve(stdout);
    };

    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      finish(new BookRecognitionError("Cover recognition took too long. Try a clearer cover image.", 504));
    }, OCR_TIMEOUT_MS);
    const windowClear = () => clearTimeout(timeout);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => {
      finish(new BookRecognitionError(`OCR engine could not start: ${error.message}`, 503));
    });
    child.on("close", (code) => {
      if (code === 0) finish();
      else finish(new BookRecognitionError(`OCR engine failed: ${stderr.slice(0, 300) || `exit code ${code}`}`, 503));
    });

    child.stdin.on("error", () => undefined);
    child.stdin.end(bytes);
  });
}

type OpenLibraryDocument = {
  title?: unknown;
  author_name?: unknown;
};

type SearchResult = {
  query: string;
  candidates: BookRecognitionCandidate[];
  error?: string;
};

async function searchOpenLibrary(query: string): Promise<SearchResult> {
  let lastError = "Open Library request failed.";

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

    try {
      const params = new URLSearchParams({
        q: query,
        fields: "title,author_name",
        limit: "8",
      });
      const response = await fetch(`https://openlibrary.org/search.json?${params}`, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "Personal-Control-Center/1.0",
        },
      });
      if (!response.ok) {
        lastError = `Open Library returned HTTP ${response.status}.`;
        if (response.status < 500 && response.status !== 429) {
          return { query, candidates: [], error: lastError };
        }
        continue;
      }

      const body = await response.json() as { docs?: OpenLibraryDocument[] };
      const candidates = (body.docs ?? []).flatMap((document) => {
        const title = typeof document.title === "string" ? document.title.trim() : "";
        const author = Array.isArray(document.author_name)
          ? document.author_name.filter((value): value is string => typeof value === "string").slice(0, 2).join(" & ")
          : "";
        return title ? [{ title, author }] : [];
      });
      return { query, candidates };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Open Library request failed.";
    } finally {
      clearTimeout(timeout);
    }

    if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return { query, candidates: [], error: lastError };
}

function usefulOcrLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((line) => {
      const compact = line.replace(/[^A-Za-z0-9]/g, "");
      if (compact.length < 2) return false;
      const lettersOrDigits = (line.match(/[A-Za-z0-9]/g) ?? []).length;
      return lettersOrDigits / Math.max(line.length, 1) >= 0.45;
    });
}

function combineOcrPasses(results: readonly { label: string; text: string }[]) {
  const seen = new Set<string>();
  const lines: string[] = [];

  for (const result of results) {
    for (const line of usefulOcrLines(result.text)) {
      const key = line
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      lines.push(line);
    }
  }

  return lines.join("\n");
}

export async function recognizeBookCover(bytes: Uint8Array) {
  const variants = await prepareForOcr(bytes);
  const passes: { label: string; text: string }[] = [];

  try {
    for (const variant of variants) {
      const text = (await runTesseract(variant.bytes, variant.psm)).replace(/\s+$/g, "").trim();
      passes.push({ label: variant.label, text });
    }
  } catch (error) {
    if (error instanceof BookRecognitionError) throw error;
    console.error("Book cover OCR failed.", error);
    throw new BookRecognitionError("The cover could not be recognized right now.", 503);
  }

  const ocrText = combineOcrPasses(passes);

  if (ocrText.replace(/[^A-Za-z0-9]/g, "").length < 4) {
    throw new BookRecognitionError("Not enough readable text was found on this cover.");
  }

  const queries = recognitionSearchQueries(ocrText);
  if (!queries.length) {
    throw new BookRecognitionError("Not enough readable title text was found on this cover.");
  }

  const searchResults: SearchResult[] = [];
  for (const query of queries) {
    const result = await searchOpenLibrary(query);
    searchResults.push(result);

    const rankedSoFar = rankBookCandidates(
      ocrText,
      searchResults.flatMap((candidateResult) => candidateResult.candidates),
    );
    const leader = rankedSoFar[0];
    if (leader && leader.titleCoverage >= 0.95 && leader.score >= 0.72) break;
  }
  const candidates = searchResults.flatMap((result) => result.candidates);
  const ranked = rankBookCandidates(ocrText, candidates);
  const suggestion = chooseBookRecognition(ocrText, candidates);

  return {
    suggestion: suggestion
      ? {
          title: suggestion.title,
          author: suggestion.author,
          confidence: Math.round(suggestion.score * 100) / 100,
        }
      : null,
    diagnostics: {
      ocrText: ocrText.slice(0, 2000),
      ocrPasses: passes.map((pass) => ({
        label: pass.label,
        text: pass.text.slice(0, 1200),
      })),
      queries,
      candidates: ranked.slice(0, 5).map((candidate) => ({
        title: candidate.title,
        author: candidate.author,
        score: Math.round(candidate.score * 100) / 100,
      })),
      searchErrors: searchResults.flatMap((result) => result.error ? [`${result.query}: ${result.error}`] : []),
    },
  };
}
