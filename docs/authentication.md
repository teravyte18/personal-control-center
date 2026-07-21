# Authentication and account access

The application uses first-party invite-only authentication backed by PostgreSQL.

## Security model

- There is no public registration.
- The configured owner controls which additional email addresses may activate an account.
- Every user has a separate personal-data snapshot in the same PostgreSQL database.
- Passwords are derived with Node.js `scrypt` using a random salt.
- Session and invitation tokens are stored only as SHA-256 hashes.
- Session cookies are HTTP-only, `SameSite=Lax`, and may be marked Secure when HTTPS is enabled.
- Revoking an account deletes its active sessions while preserving its data.
- PostgreSQL remains private inside the Compose network.

The temporary `x-pcc-user-email` identity header exists only for automated integration tests. `PCC_ALLOW_INSECURE_USER_HEADER` must remain `0` in every real deployment.

## Owner bootstrap

Set these values in `.env` before deploying the authentication migration:

```text
PCC_DEFAULT_USER_EMAIL=owner@example.com
PCC_OWNER_BOOTSTRAP_PASSWORD=a-temporary-password-with-at-least-12-characters
PCC_COOKIE_SECURE=0
PCC_ALLOW_INSECURE_USER_HEADER=0
```

Keep `PCC_COOKIE_SECURE=0` while the app is accessed through `http://localhost:3000` over the SSH tunnel. Change it to `1` only after the production URL is HTTPS-only.

After `docker compose up -d --build`:

1. Open the application through the SSH tunnel.
2. Sign in using `PCC_DEFAULT_USER_EMAIL` and the temporary bootstrap password.
3. Confirm the existing owner data is present.
4. Remove `PCC_OWNER_BOOTSTRAP_PASSWORD` from `.env` or leave it empty.
5. Recreate the app container with `docker compose up -d`.

The first successful login stores only the derived password hash in PostgreSQL. Once that hash exists, the bootstrap environment value is not used.

## Inviting another user

1. Sign in as the owner.
2. Open **All Spaces → Account & access**.
3. Enter the allowed email address and create an invitation.
4. Copy the one-time activation URL and send it directly to that person.
5. The invited person opens the URL and chooses a password of at least 12 characters.

The activation link expires after seven days by default and works once. Configure `PCC_INVITE_DAYS` to use another duration between one and thirty days.

## Revoking and re-inviting

The owner may revoke an active member from **Account & access**. Revocation:

- immediately invalidates that member's stored sessions
- prevents future login
- preserves their personal data

To allow that person again, select **Invite again**, create a new one-time activation link, and send it to them. The new activation replaces their password but reconnects them to their preserved dataset.

## Sessions

Sessions last thirty days by default. Configure `PCC_SESSION_DAYS` to use a duration between one and 365 days. The browser receives an HTTP-only cookie; the raw session token is never stored in PostgreSQL.

Before public HTTPS access is enabled, the app must remain bound to `127.0.0.1` and reached only through the SSH tunnel. Cloudflare Tunnel configuration is the next ingress stage.
