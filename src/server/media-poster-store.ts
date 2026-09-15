import "server-only";

import { randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_MEDIA_POSTER_BYTES = 10 * 1024 * 1024;
const POSTER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type StoredMediaPoster = {
  id: string;
  mimeType: string;
  bytes: Uint8Array;
};

export class MediaPosterInputError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "MediaPosterInputError";
  }
}

function uploadRoot() {
  return process.env.UPLOAD_ROOT ?? path.join(process.cwd(), "data", "uploads");
}

function userPosterDirectory(userId: string) {
  return path.join(uploadRoot(), userId, "media-posters");
}

function posterPath(userId: string, posterId: string) {
  if (!POSTER_ID_PATTERN.test(posterId)) throw new MediaPosterInputError("The poster reference is invalid.");
  return path.join(userPosterDirectory(userId), posterId);
}

function detectMimeType(bytes: Uint8Array) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8
    && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  if (bytes.length >= 6) {
    const signature = String.fromCharCode(...bytes.slice(0, 6));
    if (signature === "GIF87a" || signature === "GIF89a") return "image/gif";
  }
  return null;
}

export async function storeMediaPoster(userId: string, file: File) {
  if (file.size <= 0) throw new MediaPosterInputError("Choose a non-empty image file.");
  if (file.size > MAX_MEDIA_POSTER_BYTES) throw new MediaPosterInputError("The poster must be 10 MB or smaller.", 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = detectMimeType(bytes);
  if (!mimeType) throw new MediaPosterInputError("Use a JPEG, PNG, WebP, or GIF image.");

  const id = randomUUID();
  const directory = userPosterDirectory(userId);
  await mkdir(directory, { recursive: true, mode: 0o750 });
  await chmod(directory, 0o750);
  await writeFile(posterPath(userId, id), bytes, { flag: "wx", mode: 0o640 });
  return { id, mimeType, size: bytes.byteLength };
}

export async function loadMediaPoster(userId: string, posterId: string): Promise<StoredMediaPoster | null> {
  try {
    const bytes = new Uint8Array(await readFile(posterPath(userId, posterId)));
    const mimeType = detectMimeType(bytes);
    if (!mimeType) throw new Error("Stored media poster has an unsupported format.");
    return { id: posterId, mimeType, bytes };
  } catch (error) {
    if (error instanceof MediaPosterInputError) throw error;
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}

export async function deleteMediaPoster(userId: string, posterId: string) {
  try {
    await unlink(posterPath(userId, posterId));
  } catch (error) {
    if (error instanceof MediaPosterInputError) throw error;
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return;
    throw error;
  }
}
