import { randomUUID } from "node:crypto";
import { emptyPersonalDataSnapshot } from "@/domain/personal-data-snapshot";
import { getDatabase } from "@/server/database";

const LEGACY_OWNER_ID = "00000000-0000-4000-8000-000000000001";
const LEGACY_OWNER_EMAIL = "owner@local.invalid";
const INSECURE_USER_HEADER = "x-pcc-user-email";

export type PersonalDataUser = {
  id: string;
  email: string;
};

export class InvalidUserIdentityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidUserIdentityError";
  }
}

function normalizeEmail(value: string | undefined | null) {
  const email = value?.trim().toLowerCase() ?? "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new InvalidUserIdentityError("A valid user email is required.");
  }
  return email;
}

async function ensureUser(email: string, claimLegacyOwner: boolean): Promise<PersonalDataUser> {
  const sql = getDatabase();

  return sql.begin(async (transaction) => {
    const [existing] = await transaction<PersonalDataUser[]>`
      select id, email
      from users
      where email = ${email}
      for update
    `;

    let user = existing;

    if (!user && claimLegacyOwner) {
      const [claimedOwner] = await transaction<PersonalDataUser[]>`
        update users
        set email = ${email}
        where id = ${LEGACY_OWNER_ID}
          and email = ${LEGACY_OWNER_EMAIL}
        returning id, email
      `;
      user = claimedOwner;
    }

    if (!user) {
      const id = randomUUID();
      const [created] = await transaction<PersonalDataUser[]>`
        insert into users (id, email)
        values (${id}, ${email})
        on conflict (email) do update set email = excluded.email
        returning id, email
      `;
      user = created;
    }

    if (!user) throw new Error("User identity could not be provisioned.");

    await transaction`
      insert into personal_data_state (user_id, revision, snapshot)
      values (${user.id}, 0, ${transaction.json(emptyPersonalDataSnapshot)})
      on conflict (user_id) do nothing
    `;

    return user;
  });
}

export async function resolveRequestUser(request: Request): Promise<PersonalDataUser> {
  const allowInsecureHeader = process.env.PCC_ALLOW_INSECURE_USER_HEADER === "1";
  const headerEmail = allowInsecureHeader ? request.headers.get(INSECURE_USER_HEADER) : null;
  const configuredOwnerEmail = process.env.PCC_DEFAULT_USER_EMAIL ?? LEGACY_OWNER_EMAIL;
  const email = normalizeEmail(headerEmail ?? configuredOwnerEmail);

  return ensureUser(email, !headerEmail);
}
