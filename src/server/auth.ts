import "server-only";

import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { emptyPersonalDataSnapshot } from "@/domain/personal-data-snapshot";
import { getDatabase } from "@/server/database";

const LEGACY_OWNER_ID = "00000000-0000-4000-8000-000000000001";
const LEGACY_OWNER_EMAIL = "owner@local.invalid";
const INSECURE_USER_HEADER = "x-pcc-user-email";
const SESSION_COOKIE = "pcc_session";
const PASSWORD_KEY_LENGTH = 32;
const PASSWORD_MIN_LENGTH = 12;
const SCRYPT_N = 32_768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;
const DEFAULT_SESSION_DAYS = 30;
const DEFAULT_INVITE_DAYS = 7;

export type UserRole = "owner" | "member";
export type UserStatus = "invited" | "active" | "revoked";

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
};

export type ManagedUser = AuthenticatedUser & {
  createdAt: string;
  invitedAt: string | null;
  activatedAt: string | null;
  revokedAt: string | null;
};

type UserRow = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  password_hash: string | null;
  created_at: Date | string;
  invited_at: Date | string | null;
  activated_at: Date | string | null;
  revoked_at: Date | string | null;
};

type SessionUserRow = UserRow & {
  expires_at: Date | string;
};

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication is required.");
    this.name = "AuthenticationRequiredError";
  }
}

export class AuthorizationError extends Error {
  constructor(message = "Owner access is required.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class AuthenticationInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationInputError";
  }
}

export class AuthenticationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationConflictError";
  }
}

function asIso(value: Date | string | null) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapUser(row: UserRow): AuthenticatedUser {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
  };
}

function mapManagedUser(row: UserRow): ManagedUser {
  return {
    ...mapUser(row),
    createdAt: asIso(row.created_at) ?? new Date(0).toISOString(),
    invitedAt: asIso(row.invited_at),
    activatedAt: asIso(row.activated_at),
    revokedAt: asIso(row.revoked_at),
  };
}

export function normalizeEmail(value: unknown) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AuthenticationInputError("Enter a valid email address.");
  }
  return email;
}

function validatePassword(password: unknown) {
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
    throw new AuthenticationInputError(`Password must contain at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
  if (password.length > 256) {
    throw new AuthenticationInputError("Password is too long.");
  }
  return password;
}

function derivePasswordKey(password: string, salt: Buffer, n = SCRYPT_N, r = SCRYPT_R, p = SCRYPT_P) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, PASSWORD_KEY_LENGTH, { N: n, r, p, maxmem: SCRYPT_MAX_MEMORY }, (error, key) => {
      if (error) reject(error);
      else resolve(key as Buffer);
    });
  });
}

async function hashPassword(passwordValue: unknown) {
  const password = validatePassword(passwordValue);
  const salt = randomBytes(16);
  const key = await derivePasswordKey(password, salt);
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

async function verifyPassword(passwordValue: unknown, storedHash: string) {
  if (typeof passwordValue !== "string") return false;
  const parts = storedHash.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4], "base64url");
  const expected = Buffer.from(parts[5], "base64url");
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(r) || !Number.isSafeInteger(p) || expected.length !== PASSWORD_KEY_LENGTH) {
    return false;
  }

  try {
    const actual = await derivePasswordKey(passwordValue, salt, n, r, p);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function configuredOwnerEmail() {
  return normalizeEmail(process.env.PCC_DEFAULT_USER_EMAIL ?? LEGACY_OWNER_EMAIL);
}

function sessionDurationDays() {
  const configured = Number(process.env.PCC_SESSION_DAYS ?? DEFAULT_SESSION_DAYS);
  return Number.isFinite(configured) && configured >= 1 && configured <= 365 ? configured : DEFAULT_SESSION_DAYS;
}

function inviteDurationDays() {
  const configured = Number(process.env.PCC_INVITE_DAYS ?? DEFAULT_INVITE_DAYS);
  return Number.isFinite(configured) && configured >= 1 && configured <= 30 ? configured : DEFAULT_INVITE_DAYS;
}

function readCookie(request: Request, name: string) {
  const header = request.headers.get("cookie") ?? "";
  for (const entry of header.split(";")) {
    const separator = entry.indexOf("=");
    if (separator < 0) continue;
    if (entry.slice(0, separator).trim() === name) return entry.slice(separator + 1).trim();
  }
  return null;
}

async function ensurePersonalState(userId: string) {
  const sql = getDatabase();
  await sql`
    insert into personal_data_state (user_id, revision, snapshot)
    values (${userId}, 0, ${sql.json(emptyPersonalDataSnapshot)})
    on conflict (user_id) do nothing
  `;
}

async function claimConfiguredOwner() {
  const email = configuredOwnerEmail();
  const sql = getDatabase();

  return sql.begin(async (transaction) => {
    const [existing] = await transaction<UserRow[]>`
      select id, email, role, status, password_hash, created_at, invited_at, activated_at, revoked_at
      from users
      where email = ${email}
      for update
    `;

    let owner = existing;
    if (!owner) {
      const [claimed] = await transaction<UserRow[]>`
        update users
        set email = ${email},
            role = 'owner',
            status = 'active',
            activated_at = coalesce(activated_at, now()),
            revoked_at = null
        where id = ${LEGACY_OWNER_ID}
          and email = ${LEGACY_OWNER_EMAIL}
        returning id, email, role, status, password_hash, created_at, invited_at, activated_at, revoked_at
      `;
      owner = claimed;
    }

    if (!owner) {
      throw new Error("The configured owner identity conflicts with an existing account.");
    }

    if (owner.role !== "owner" || owner.status !== "active") {
      const [updated] = await transaction<UserRow[]>`
        update users
        set role = 'owner', status = 'active', revoked_at = null,
            activated_at = coalesce(activated_at, now())
        where id = ${owner.id}
        returning id, email, role, status, password_hash, created_at, invited_at, activated_at, revoked_at
      `;
      owner = updated;
    }

    if (!owner) throw new Error("Owner identity could not be initialized.");
    await transaction`
      insert into personal_data_state (user_id, revision, snapshot)
      values (${owner.id}, 0, ${transaction.json(emptyPersonalDataSnapshot)})
      on conflict (user_id) do nothing
    `;
    return owner;
  });
}

async function provisionInsecureTestUser(emailValue: string) {
  const email = normalizeEmail(emailValue);
  const ownerEmail = configuredOwnerEmail();
  if (email === ownerEmail) return mapUser(await claimConfiguredOwner());

  const sql = getDatabase();
  const id = randomUUID();
  const [user] = await sql<UserRow[]>`
    insert into users (id, email, role, status, invited_at, activated_at)
    values (${id}, ${email}, 'member', 'active', now(), now())
    on conflict (email) do update
      set status = 'active', revoked_at = null, activated_at = coalesce(users.activated_at, now())
    returning id, email, role, status, password_hash, created_at, invited_at, activated_at, revoked_at
  `;
  if (!user) throw new Error("Test user identity could not be provisioned.");
  await ensurePersonalState(user.id);
  return mapUser(user);
}

async function loadSessionUser(token: string) {
  const sql = getDatabase();
  const tokenHash = hashToken(token);
  const [row] = await sql<SessionUserRow[]>`
    select u.id, u.email, u.role, u.status, u.password_hash,
           u.created_at, u.invited_at, u.activated_at, u.revoked_at,
           s.expires_at
    from auth_sessions s
    join users u on u.id = s.user_id
    where s.token_hash = ${tokenHash}
      and s.expires_at > now()
      and u.status = 'active'
  `;
  if (!row) return null;

  await sql`
    update auth_sessions
    set last_seen_at = now()
    where token_hash = ${tokenHash}
      and last_seen_at < now() - interval '15 minutes'
  `;
  return mapUser(row);
}

export async function resolveOptionalRequestUser(request: Request) {
  if (process.env.PCC_ALLOW_INSECURE_USER_HEADER === "1") {
    const headerEmail = request.headers.get(INSECURE_USER_HEADER);
    if (headerEmail) return provisionInsecureTestUser(headerEmail);
  }

  const token = readCookie(request, SESSION_COOKIE);
  return token ? loadSessionUser(token) : null;
}

export async function requireAuthenticatedUser(request: Request) {
  const user = await resolveOptionalRequestUser(request);
  if (!user) throw new AuthenticationRequiredError();
  return user;
}

export function requireOwner(user: AuthenticatedUser) {
  if (user.role !== "owner") throw new AuthorizationError();
  return user;
}

async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDurationDays() * 24 * 60 * 60 * 1000);
  const sql = getDatabase();
  await sql`
    insert into auth_sessions (token_hash, user_id, expires_at)
    values (${hashToken(token)}, ${userId}, ${expiresAt.toISOString()})
  `;
  return { token, expiresAt };
}

async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.PCC_COOKIE_SECURE === "1",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    priority: "high",
  });
}

async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.PCC_COOKIE_SECURE === "1",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    priority: "high",
  });
}

export async function login(emailValue: unknown, passwordValue: unknown) {
  const email = normalizeEmail(emailValue);
  const ownerEmail = configuredOwnerEmail();
  if (email === ownerEmail) await claimConfiguredOwner();

  const sql = getDatabase();
  const [user] = await sql<UserRow[]>`
    select id, email, role, status, password_hash, created_at, invited_at, activated_at, revoked_at
    from users
    where email = ${email}
  `;

  if (!user || user.status !== "active") throw new AuthenticationRequiredError();

  let valid = user.password_hash ? await verifyPassword(passwordValue, user.password_hash) : false;
  if (!user.password_hash && user.role === "owner") {
    const bootstrapPassword = process.env.PCC_OWNER_BOOTSTRAP_PASSWORD;
    valid = typeof passwordValue === "string"
      && typeof bootstrapPassword === "string"
      && bootstrapPassword.length >= PASSWORD_MIN_LENGTH
      && passwordValue === bootstrapPassword;

    if (valid) {
      const passwordHash = await hashPassword(passwordValue);
      await sql`
        update users
        set password_hash = ${passwordHash}, status = 'active', activated_at = coalesce(activated_at, now())
        where id = ${user.id} and password_hash is null
      `;
    }
  }

  if (!valid) throw new AuthenticationRequiredError();
  const session = await createSession(user.id);
  await setSessionCookie(session.token, session.expiresAt);
  return mapUser(user);
}

export async function logout(request: Request) {
  const token = readCookie(request, SESSION_COOKIE);
  if (token) {
    const sql = getDatabase();
    await sql`delete from auth_sessions where token_hash = ${hashToken(token)}`;
  }
  await clearSessionCookie();
}

export async function listManagedUsers(owner: AuthenticatedUser) {
  requireOwner(owner);
  const sql = getDatabase();
  const rows = await sql<UserRow[]>`
    select id, email, role, status, password_hash, created_at, invited_at, activated_at, revoked_at
    from users
    order by case when role = 'owner' then 0 else 1 end, created_at asc
  `;
  return rows.map(mapManagedUser);
}

export async function createUserInvite(owner: AuthenticatedUser, emailValue: unknown) {
  requireOwner(owner);
  const email = normalizeEmail(emailValue);
  if (email === owner.email) throw new AuthenticationInputError("The owner account is already active.");

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + inviteDurationDays() * 24 * 60 * 60 * 1000);
  const sql = getDatabase();

  const user = await sql.begin(async (transaction) => {
    const [existing] = await transaction<UserRow[]>`
      select id, email, role, status, password_hash, created_at, invited_at, activated_at, revoked_at
      from users
      where email = ${email}
      for update
    `;

    if (existing?.role === "owner") throw new AuthenticationConflictError("The owner account cannot be invited.");
    if (existing?.status === "active") throw new AuthenticationConflictError("That account is already active.");

    let invited = existing;
    if (invited) {
      const [updated] = await transaction<UserRow[]>`
        update users
        set status = 'invited', password_hash = null, invited_at = now(), revoked_at = null
        where id = ${invited.id}
        returning id, email, role, status, password_hash, created_at, invited_at, activated_at, revoked_at
      `;
      invited = updated;
      await transaction`delete from auth_sessions where user_id = ${existing.id}`;
      await transaction`delete from user_invites where user_id = ${existing.id}`;
    } else {
      const id = randomUUID();
      const [created] = await transaction<UserRow[]>`
        insert into users (id, email, role, status, invited_at)
        values (${id}, ${email}, 'member', 'invited', now())
        returning id, email, role, status, password_hash, created_at, invited_at, activated_at, revoked_at
      `;
      invited = created;
    }

    if (!invited) throw new Error("Invited user could not be created.");
    await transaction`
      insert into personal_data_state (user_id, revision, snapshot)
      values (${invited.id}, 0, ${transaction.json(emptyPersonalDataSnapshot)})
      on conflict (user_id) do nothing
    `;
    await transaction`
      insert into user_invites (token_hash, user_id, created_by_user_id, expires_at)
      values (${tokenHash}, ${invited.id}, ${owner.id}, ${expiresAt.toISOString()})
    `;
    return invited;
  });

  return {
    user: mapManagedUser(user),
    token,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function activateInvite(tokenValue: unknown, passwordValue: unknown) {
  const token = typeof tokenValue === "string" ? tokenValue.trim() : "";
  if (token.length < 32) throw new AuthenticationInputError("The activation link is invalid.");
  const passwordHash = await hashPassword(passwordValue);
  const sql = getDatabase();
  const tokenHash = hashToken(token);

  const user = await sql.begin(async (transaction) => {
    const [invite] = await transaction<{ user_id: string }[]>`
      select user_id
      from user_invites
      where token_hash = ${tokenHash}
        and used_at is null
        and expires_at > now()
      for update
    `;
    if (!invite) throw new AuthenticationInputError("The activation link is invalid or has expired.");

    const [activated] = await transaction<UserRow[]>`
      update users
      set password_hash = ${passwordHash}, status = 'active', activated_at = now(), revoked_at = null
      where id = ${invite.user_id}
        and role = 'member'
        and status = 'invited'
      returning id, email, role, status, password_hash, created_at, invited_at, activated_at, revoked_at
    `;
    if (!activated) throw new AuthenticationInputError("This account can no longer be activated.");

    await transaction`update user_invites set used_at = now() where token_hash = ${tokenHash}`;
    await transaction`delete from user_invites where user_id = ${activated.id} and token_hash <> ${tokenHash}`;
    return activated;
  });

  const session = await createSession(user.id);
  await setSessionCookie(session.token, session.expiresAt);
  return mapUser(user);
}

export async function revokeManagedUser(owner: AuthenticatedUser, userId: string) {
  requireOwner(owner);
  if (owner.id === userId) throw new AuthenticationInputError("The owner account cannot revoke itself.");
  const sql = getDatabase();

  const [user] = await sql<UserRow[]>`
    update users
    set status = 'revoked', revoked_at = now()
    where id = ${userId} and role = 'member'
    returning id, email, role, status, password_hash, created_at, invited_at, activated_at, revoked_at
  `;
  if (!user) throw new AuthenticationInputError("The account was not found.");
  await sql`delete from auth_sessions where user_id = ${userId}`;
  await sql`delete from user_invites where user_id = ${userId}`;
  return mapManagedUser(user);
}
