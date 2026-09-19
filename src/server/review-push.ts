import "server-only";

import { createPrivateKey, sign, timingSafeEqual } from "node:crypto";
import { normalizePersonalDataSnapshot } from "@/domain/personal-data-snapshot";
import {
  getReviewPushContext,
  reviewPeriodCompleted,
  validTimeZone,
} from "@/domain/review-push";
import { getDatabase } from "@/server/database";

const MAX_ENDPOINT_LENGTH = 4096;
const MAX_KEY_LENGTH = 512;

type SubscriptionRow = {
  id: number | string;
  user_id: string;
  endpoint: string;
  timezone: string;
  last_review_reminder_date: Date | string | null;
  snapshot: unknown;
};

type PushSubscriptionInput = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  timezone: string;
};

type VapidConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

export class ReviewPushInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewPushInputError";
  }
}

function base64UrlJson(value: unknown) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function normalizeDateOnly(value: Date | string | null) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function configuredVapid(): VapidConfig | null {
  const publicKey = process.env.PCC_WEB_PUSH_PUBLIC_KEY?.trim() ?? "";
  const privateKey = process.env.PCC_WEB_PUSH_PRIVATE_KEY?.trim() ?? "";
  const subject = process.env.PCC_WEB_PUSH_SUBJECT?.trim() ?? "";
  if (!publicKey || !privateKey || !subject) return null;
  if (!(subject.startsWith("mailto:") || subject.startsWith("https://"))) {
    throw new Error("PCC_WEB_PUSH_SUBJECT must use mailto: or https://.");
  }
  return { publicKey, privateKey, subject };
}

export function reviewPushPublicConfig() {
  const vapid = configuredVapid();
  const workerToken = process.env.PCC_REVIEW_PUSH_WORKER_TOKEN?.trim() ?? "";
  return {
    configured: Boolean(vapid && workerToken),
    publicKey: vapid?.publicKey ?? "",
  };
}

function validBase64Url(value: unknown, maxLength = MAX_KEY_LENGTH): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= maxLength
    && /^[A-Za-z0-9_-]+$/.test(value);
}

function normalizeSubscription(value: unknown): PushSubscriptionInput {
  if (typeof value !== "object" || value === null) {
    throw new ReviewPushInputError("Push subscription is invalid.");
  }
  const record = value as Record<string, unknown>;
  if (typeof record.endpoint !== "string" || record.endpoint.length > MAX_ENDPOINT_LENGTH) {
    throw new ReviewPushInputError("Push endpoint is invalid.");
  }

  let endpoint: URL;
  try {
    endpoint = new URL(record.endpoint);
  } catch {
    throw new ReviewPushInputError("Push endpoint is invalid.");
  }
  if (endpoint.protocol !== "https:") {
    throw new ReviewPushInputError("Push endpoint must use HTTPS.");
  }

  const keys = typeof record.keys === "object" && record.keys !== null
    ? record.keys as Record<string, unknown>
    : {};
  if (!validBase64Url(keys.p256dh) || !validBase64Url(keys.auth)) {
    throw new ReviewPushInputError("Push subscription keys are invalid.");
  }
  if (!validTimeZone(record.timezone)) {
    throw new ReviewPushInputError("A valid device timezone is required.");
  }

  return {
    endpoint: endpoint.toString(),
    expirationTime: typeof record.expirationTime === "number" ? record.expirationTime : null,
    keys: {
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    timezone: record.timezone,
  };
}

export async function registerReviewPushSubscription(userId: string, value: unknown) {
  const subscription = normalizeSubscription(value);
  const sql = getDatabase();
  const [stored] = await sql<{ id: number | string }[]>`
    insert into review_push_subscriptions (
      user_id, endpoint, p256dh, auth, timezone, updated_at
    )
    values (
      \${userId},
      \${subscription.endpoint},
      \${subscription.keys.p256dh},
      \${subscription.keys.auth},
      \${subscription.timezone},
      now()
    )
    on conflict (endpoint) do update
      set p256dh = excluded.p256dh,
          auth = excluded.auth,
          timezone = excluded.timezone,
          updated_at = now()
      where review_push_subscriptions.user_id = excluded.user_id
    returning id
  `;
  if (!stored) {
    throw new ReviewPushInputError("This push subscription belongs to another account.");
  }
  return { id: String(stored.id) };
}

export async function removeReviewPushSubscription(userId: string, endpointValue: unknown) {
  if (typeof endpointValue !== "string" || !endpointValue || endpointValue.length > MAX_ENDPOINT_LENGTH) {
    throw new ReviewPushInputError("Push endpoint is invalid.");
  }
  const sql = getDatabase();
  await sql`
    delete from review_push_subscriptions
    where user_id = \${userId}
      and endpoint = \${endpointValue}
  `;
}

function paddedPrivateKey(value: string) {
  const raw = Buffer.from(value, "base64url");
  if (raw.length > 32 || raw.length === 0) throw new Error("PCC_WEB_PUSH_PRIVATE_KEY is invalid.");
  if (raw.length === 32) return raw;
  return Buffer.concat([Buffer.alloc(32 - raw.length), raw]);
}

function vapidKeyObject(config: VapidConfig) {
  const publicKey = Buffer.from(config.publicKey, "base64url");
  if (publicKey.length !== 65 || publicKey[0] !== 4) {
    throw new Error("PCC_WEB_PUSH_PUBLIC_KEY must be an uncompressed P-256 public key.");
  }
  const privateKey = paddedPrivateKey(config.privateKey);
  return createPrivateKey({
    format: "jwk",
    key: {
      kty: "EC",
      crv: "P-256",
      x: publicKey.subarray(1, 33).toString("base64url"),
      y: publicKey.subarray(33, 65).toString("base64url"),
      d: privateKey.toString("base64url"),
    },
  });
}

function vapidAuthorization(endpoint: string, config: VapidConfig, now = new Date()) {
  const url = new URL(endpoint);
  const audience = `\${url.protocol}//\${url.host}`;
  const unsigned = [
    base64UrlJson({ typ: "JWT", alg: "ES256" }),
    base64UrlJson({
      aud: audience,
      exp: Math.floor(now.getTime() / 1000) + 12 * 60 * 60,
      sub: config.subject,
    }),
  ].join(".");
  const signature = sign("sha256", Buffer.from(unsigned), {
    key: vapidKeyObject(config),
    dsaEncoding: "ieee-p1363",
  }).toString("base64url");
  return `vapid t=\${unsigned}.\${signature}, k=\${config.publicKey}`;
}

async function sendEmptyPush(endpoint: string, config: VapidConfig, now: Date) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      TTL: "86400",
      Urgency: "normal",
      Authorization: vapidAuthorization(endpoint, config, now),
    },
    redirect: "error",
  });

  if (response.status === 404 || response.status === 410) return "gone" as const;
  if (response.status === 201 || response.status === 202) return "sent" as const;
  throw new Error(`Push service returned HTTP \${response.status}.`);
}

export function validWorkerToken(request: Request) {
  const expected = process.env.PCC_REVIEW_PUSH_WORKER_TOKEN?.trim() ?? "";
  const header = request.headers.get("authorization") ?? "";
  const supplied = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!expected || !supplied) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function sendDueReviewPushes(reference = new Date()) {
  const config = configuredVapid();
  if (!config) return { configured: false, checked: 0, sent: 0, removed: 0, failed: 0 };

  const sql = getDatabase();
  const rows = await sql<SubscriptionRow[]>`
    select s.id,
           s.user_id,
           s.endpoint,
           s.timezone,
           s.last_review_reminder_date,
           p.snapshot
    from review_push_subscriptions s
    join users u on u.id = s.user_id and u.status = 'active'
    join personal_data_state p on p.user_id = s.user_id
    order by s.id asc
  `;

  let sent = 0;
  let removed = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const context = getReviewPushContext(reference, row.timezone);
      if (!context.reminderDue) continue;

      const snapshot = normalizePersonalDataSnapshot(row.snapshot);
      if (reviewPeriodCompleted(snapshot.history, context)) continue;
      if (normalizeDateOnly(row.last_review_reminder_date) === context.localDate) continue;

      const previousDate = normalizeDateOnly(row.last_review_reminder_date);
      const [claimed] = await sql<{ id: number | string }[]>`
        update review_push_subscriptions
        set last_review_reminder_date = \${context.localDate}::date,
            updated_at = now()
        where id = \${row.id}
          and (
            last_review_reminder_date is null
            or last_review_reminder_date <> \${context.localDate}::date
          )
        returning id
      `;
      if (!claimed) continue;

      try {
        const result = await sendEmptyPush(row.endpoint, config, reference);
        if (result === "gone") {
          await sql`delete from review_push_subscriptions where id = \${row.id}`;
          removed += 1;
        } else {
          sent += 1;
        }
      } catch (error) {
        await sql`
          update review_push_subscriptions
          set last_review_reminder_date = \${previousDate}::date,
              updated_at = now()
          where id = \${row.id}
            and last_review_reminder_date = \${context.localDate}::date
        `;
        failed += 1;
        console.error("Could not send Weekly Review push.", error);
      }
    } catch (error) {
      failed += 1;
      console.error("Could not evaluate Weekly Review push subscription.", error);
    }
  }

  return {
    configured: true,
    checked: rows.length,
    sent,
    removed,
    failed,
  };
}
