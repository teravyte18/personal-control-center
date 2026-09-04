create table keychain_vaults (
  user_id text primary key references users(id) on delete cascade,
  envelope_version smallint not null,
  vault_revision integer not null default 1,
  kdf_algorithm text not null,
  kdf_salt text not null,
  kdf_opslimit integer not null,
  kdf_memlimit integer not null,
  master_nonce text not null,
  master_ciphertext text not null,
  recovery_nonce text not null,
  recovery_ciphertext text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint keychain_vaults_version_check check (envelope_version = 1),
  constraint keychain_vaults_revision_check check (vault_revision > 0),
  constraint keychain_vaults_kdf_check check (kdf_algorithm = 'argon2id13'),
  constraint keychain_vaults_opslimit_check check (kdf_opslimit between 2 and 10),
  constraint keychain_vaults_memlimit_check check (kdf_memlimit between 19922944 and 536870912)
);

create table keychain_records (
  user_id text not null references keychain_vaults(user_id) on delete cascade,
  record_id text not null,
  envelope_version smallint not null,
  revision integer not null,
  nonce text not null,
  ciphertext text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, record_id),
  constraint keychain_records_version_check check (envelope_version = 1),
  constraint keychain_records_revision_check check (revision > 0),
  constraint keychain_records_id_check check (record_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
);

create index keychain_records_user_id_idx on keychain_records(user_id);
