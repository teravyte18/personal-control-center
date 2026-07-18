import { createHash } from "node:crypto";
import {
  applyPersonalDataMutation,
  createPersonalDataExport,
  emptyPersonalDataSnapshot,
  hasPersonalData,
  normalizePersonalDataExport,
  normalizePersonalDataSnapshot,
  type PersonalDataExport,
  type PersonalDataMutation,
  type PersonalDataSnapshot,
} from "@/domain/personal-data-snapshot";
import { getDatabase } from "@/server/database";

type StateRow = {
  revision: number | string;
  snapshot: unknown;
  updated_at: Date | string;
};

export type StoredPersonalDataState = {
  revision: number;
  snapshot: PersonalDataSnapshot;
  updatedAt: string;
  isEmpty: boolean;
};

export class PersonalDataImportConflictError extends Error {
  constructor() {
    super("The server already contains personal data. Import was not applied.");
    this.name = "PersonalDataImportConflictError";
  }
}

function mapState(row: StateRow): StoredPersonalDataState {
  const snapshot = normalizePersonalDataSnapshot(row.snapshot);
  const updatedAt = row.updated_at instanceof Date
    ? row.updated_at.toISOString()
    : new Date(row.updated_at).toISOString();

  return {
    revision: Number(row.revision),
    snapshot,
    updatedAt,
    isEmpty: !hasPersonalData(snapshot),
  };
}

export async function loadPersonalDataState(): Promise<StoredPersonalDataState> {
  const sql = getDatabase();
  const [row] = await sql<StateRow[]>`
    select revision, snapshot, updated_at
    from personal_data_state
    where id = 'primary'
  `;
  if (!row) throw new Error("Personal data state has not been initialized. Run database migrations.");
  return mapState(row);
}

export async function applyStoredPersonalDataMutation(
  mutation: PersonalDataMutation,
): Promise<StoredPersonalDataState> {
  const sql = getDatabase();

  return sql.begin(async (transaction) => {
    const [currentRow] = await transaction<StateRow[]>`
      select revision, snapshot, updated_at
      from personal_data_state
      where id = 'primary'
      for update
    `;
    if (!currentRow) throw new Error("Personal data state has not been initialized. Run database migrations.");

    const current = normalizePersonalDataSnapshot(currentRow.snapshot);
    const next = applyPersonalDataMutation(current, mutation);

    const [updated] = await transaction<StateRow[]>`
      update personal_data_state
      set snapshot = ${transaction.json(next)},
          revision = revision + 1,
          updated_at = now()
      where id = 'primary'
      returning revision, snapshot, updated_at
    `;

    if (!updated) throw new Error("Personal data state could not be updated.");
    return mapState(updated);
  });
}

function importIdentity(dataExport: PersonalDataExport) {
  const hash = createHash("sha256")
    .update(JSON.stringify(dataExport.data))
    .digest("hex");
  return `${dataExport.format}:${dataExport.version}:${hash}`;
}

export async function importPersonalData(
  value: unknown,
): Promise<StoredPersonalDataState & { alreadyImported: boolean }> {
  const dataExport = normalizePersonalDataExport(value);
  if (!dataExport) throw new TypeError("The uploaded personal data export is invalid or unsupported.");

  const sql = getDatabase();
  const importId = importIdentity(dataExport);

  return sql.begin(async (transaction) => {
    const [previousImport] = await transaction<{ import_id: string }[]>`
      select import_id
      from personal_data_imports
      where import_id = ${importId}
    `;

    const [currentRow] = await transaction<StateRow[]>`
      select revision, snapshot, updated_at
      from personal_data_state
      where id = 'primary'
      for update
    `;
    if (!currentRow) throw new Error("Personal data state has not been initialized. Run database migrations.");
    if (previousImport) return { ...mapState(currentRow), alreadyImported: true };

    const current = normalizePersonalDataSnapshot(currentRow.snapshot);
    if (hasPersonalData(current)) throw new PersonalDataImportConflictError();

    const [updated] = await transaction<StateRow[]>`
      update personal_data_state
      set snapshot = ${transaction.json(dataExport.data)},
          revision = revision + 1,
          updated_at = now()
      where id = 'primary'
      returning revision, snapshot, updated_at
    `;

    await transaction`
      insert into personal_data_imports (import_id, source_exported_at)
      values (${importId}, ${dataExport.exportedAt})
    `;

    if (!updated) throw new Error("Imported personal data could not be stored.");
    return { ...mapState(updated), alreadyImported: false };
  });
}

export async function exportStoredPersonalData() {
  const state = await loadPersonalDataState();
  return createPersonalDataExport(state.snapshot);
}

export async function resetPersonalDataForTests() {
  if (process.env.ALLOW_TEST_DB_RESET !== "1") {
    throw new Error("Test database reset is disabled.");
  }

  const sql = getDatabase();
  await sql.begin(async (transaction) => {
    await transaction`delete from personal_data_imports`;
    await transaction`
      update personal_data_state
      set snapshot = ${transaction.json(emptyPersonalDataSnapshot)},
          revision = 0,
          updated_at = now()
      where id = 'primary'
    `;
  });
}
