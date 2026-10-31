import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { getDatabase } from "@/server/database";
import { AssistantAccessError, AssistantInputError, inputInteger, inputText, parseAssistantDomains } from "@/domain/assistant-access";
import type { AssistantDomain } from "@/domain/assistant-access";

type GrantRow = {
  id: string; label: string; domains: AssistantDomain[];
  created_at: Date; expires_at: Date; revoked_at: Date | null; last_used_at: Date | null;
};
function metadata(row: GrantRow) {
  return { id: row.id, label: row.label, domains: row.domains, createdAt: row.created_at.toISOString(),
    expiresAt: row.expires_at.toISOString(), revokedAt: row.revoked_at?.toISOString() ?? null,
    lastUsedAt: row.last_used_at?.toISOString() ?? null };
}
function hash(token: string) { return createHash("sha256").update(token).digest("hex"); }

export async function listAssistantGrants(userId: string) {
  const rows = await getDatabase()<GrantRow[]>`
    select id, label, domains, created_at, expires_at, revoked_at, last_used_at
    from assistant_grants where user_id = ${userId} order by created_at desc
  `;
  return rows.map(metadata);
}

export async function createAssistantGrant(userId: string, labelValue: unknown, domainValue: unknown, daysValue: unknown) {
  const label = inputText(labelValue, 80)!;
  const domains = parseAssistantDomains(domainValue);
  const days = inputInteger(daysValue, 30, 90);
  const token = `pcc_ro_${randomBytes(32).toString("base64url")}`;
  const expiresAt = new Date(Date.now() + days * 86400000);
  const sql = getDatabase();
  // Serialize per account and bound accumulated credential records.
  const grant = await sql.begin(async (tx) => {
    const users = await tx`select id from users where id = ${userId} and status = 'active' for update`;
    if (!users.length) throw new AssistantAccessError("Account is not active.");
    const [count] = await tx`select count(*)::int as total from assistant_grants where user_id = ${userId} and revoked_at is null and expires_at > now()`;
    if (count.total >= 20) throw new AssistantInputError("Revoke an existing connection before creating another.");
    const [row] = await tx<GrantRow[]>`
      insert into assistant_grants (id, user_id, label, token_hash, domains, expires_at)
      values (${randomUUID()}, ${userId}, ${label}, ${hash(token)}, ${domains}, ${expiresAt})
      returning id, label, domains, created_at, expires_at, revoked_at, last_used_at
    `;
    return metadata(row);
  });
  return { grant, token };
}

export async function revokeAssistantGrant(userId: string, id: unknown) {
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id)) throw new AssistantInputError("Invalid connection ID.");
  await getDatabase()`update assistant_grants set revoked_at = coalesce(revoked_at, now()) where id = ${id} and user_id = ${userId}`;
}

export async function requireAssistantGrant(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!/^Bearer pcc_ro_[A-Za-z0-9_-]{43}$/.test(authorization)) throw new AssistantAccessError("Assistant authentication is required.");
  const sql = getDatabase();
  const [row] = await sql<{ id: string; user_id: string; domains: AssistantDomain[] }[]>`
    select g.id, g.user_id, g.domains from assistant_grants g
    join users u on u.id = g.user_id
    where g.token_hash = ${hash(authorization.slice(7))} and g.revoked_at is null
      and g.expires_at > now() and u.status = 'active'
  `;
  if (!row) throw new AssistantAccessError("Assistant authentication is required.");
  // Coarse usage metadata only; never store tool arguments or personal content.
  await sql`update assistant_grants set last_used_at = now() where id = ${row.id}
    and (last_used_at is null or last_used_at < now() - interval '5 minutes')`;
  return { userId: row.user_id, domains: row.domains };
}
