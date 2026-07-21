import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_REVIEW_PHOTO_BYTES = 15 * 1024 * 1024;
const PHOTO_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type StoredReviewPhoto = {
  id: string;
  mimeType: string;
  bytes: Uint8Array;
};

export class ReviewPhotoInputError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "ReviewPhotoInputError";
  }
}

function uploadRoot() {
  return process.env.UPLOAD_ROOT ?? path.join(process.cwd(), "data", "uploads");
}

function userPhotoDirectory(userId: string) {
  return path.join(uploadRoot(), userId, "review-photos");
}

function photoPath(userId: string, photoId: string) {
  if (!PHOTO_ID_PATTERN.test(photoId)) throw new ReviewPhotoInputError("The photo reference is invalid.");
  return path.join(userPhotoDirectory(userId), photoId);
}

function detectMimeType(bytes: Uint8Array) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 8
    && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    return "image/png";
  }
  if (bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") {
    return "image/webp";
  }
  if (bytes.length >= 6) {
    const signature = String.fromCharCode(...bytes.slice(0, 6));
    if (signature === "GIF87a" || signature === "GIF89a") return "image/gif";
  }
  return null;
}

export async function storeReviewPhoto(userId: string, file: File) {
  if (file.size <= 0) throw new ReviewPhotoInputError("Choose a non-empty image file.");
  if (file.size > MAX_REVIEW_PHOTO_BYTES) {
    throw new ReviewPhotoInputError("The photo must be 15 MB or smaller.", 413);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = detectMimeType(bytes);
  if (!mimeType) {
    throw new ReviewPhotoInputError("Use a JPEG, PNG, WebP, or GIF image.");
  }

  const id = randomUUID();
  const directory = userPhotoDirectory(userId);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(photoPath(userId, id), bytes, { flag: "wx", mode: 0o600 });

  return { id, mimeType, size: bytes.byteLength };
}

export async function loadReviewPhoto(userId: string, photoId: string): Promise<StoredReviewPhoto | null> {
  try {
    const bytes = new Uint8Array(await readFile(photoPath(userId, photoId)));
    const mimeType = detectMimeType(bytes);
    if (!mimeType) throw new Error("Stored review photo has an unsupported format.");
    return { id: photoId, mimeType, bytes };
  } catch (error) {
    if (error instanceof ReviewPhotoInputError) throw error;
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}

export async function deleteReviewPhoto(userId: string, photoId: string) {
  try {
    await unlink(photoPath(userId, photoId));
  } catch (error) {
    if (error instanceof ReviewPhotoInputError) throw error;
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return;
    throw error;
  }
}

export function isDurableReviewPhotoReference(value: string) {
  return PHOTO_ID_PATTERN.test(value);
}
