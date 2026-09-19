import "server-only";

import { spawn } from "node:child_process";
import sharp from "sharp";
import {
  chooseBookRecognition,
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

async function prepareForOcr(bytes: Uint8Array) {
  try {
    return await sharp(bytes, { animated: false, failOn: "error" })
      .rotate()
      .resize({
        width: 1600,
        height: 2400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .grayscale()
      .normalize()
      .sharpen()
      .png()
      .toBuffer();
  } catch {
    throw new BookRecognitionError("The cover image could not be read.");
  }
}

function runTesseract(bytes: Buffer) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(
      "tesseract",
      ["stdin", "stdout", "-l", "eng+por", "--psm", "11"],
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
      finish(new Error(`Tesseract could not start: ${error.message}`));
    });
    child.on("close", (code) => {
      if (code === 0) finish();
      else finish(new Error(`Tesseract failed with exit code ${code}: ${stderr.slice(0, 300)}`));
    });

    child.stdin.on("error", () => undefined);
    child.stdin.end(bytes);
  });
}

type OpenLibraryDocument = {
  title?: unknown;
  author_name?: unknown;
};

async function searchOpenLibrary(query: string): Promise<BookRecognitionCandidate[]> {
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
    if (!response.ok) return [];

    const body = await response.json() as { docs?: OpenLibraryDocument[] };
    return (body.docs ?? []).flatMap((document) => {
      const title = typeof document.title === "string" ? document.title.trim() : "";
      const author = Array.isArray(document.author_name)
        ? document.author_name.filter((value): value is string => typeof value === "string").slice(0, 2).join(" & ")
        : "";
      return title ? [{ title, author }] : [];
    });
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function recognizeBookCover(bytes: Uint8Array) {
  const prepared = await prepareForOcr(bytes);
  let ocrText = "";
  try {
    ocrText = (await runTesseract(prepared)).replace(/\s+$/g, "").trim();
  } catch (error) {
    if (error instanceof BookRecognitionError) throw error;
    console.error("Book cover OCR failed.", error);
    throw new BookRecognitionError("The cover could not be recognized right now.", 503);
  }

  if (ocrText.replace(/[^A-Za-z0-9]/g, "").length < 4) {
    throw new BookRecognitionError("Not enough readable text was found on this cover.");
  }

  const queries = recognitionSearchQueries(ocrText);
  if (!queries.length) {
    throw new BookRecognitionError("Not enough readable title text was found on this cover.");
  }

  const candidateGroups = await Promise.all(queries.map((query) => searchOpenLibrary(query)));
  const candidates = candidateGroups.flat();
  const suggestion = chooseBookRecognition(ocrText, candidates);

  return {
    suggestion: suggestion
      ? {
          title: suggestion.title,
          author: suggestion.author,
          confidence: Math.round(suggestion.score * 100) / 100,
        }
      : null,
  };
}
