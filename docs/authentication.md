# Authentication and account access

The application uses first-party invite-only authentication backed by PostgreSQL.

## Security model

- There is no public registration.
- The configured owner controls which additional email addresses may activate an account.
- Every user has a separate personal-data snapshot in the same PostgreSQL database.
- Passwords are derived with Node.js `scrypt` using a random salt.
- Session and invitation tokens are stored only as SHA-256 hashes.
- Session cookies are HTTP-only and `SameSite=Lax`; the live HTTPS deployment marks them Secure.
- Revoking an account deletes active sessions while preserving its data.
- PostgreSQL remains private inside Compose.
- Login attempts are bounded globally and per normalised account, with fixed dummy password work for unknown accounts.

The temporary `x-pcc-user-email` identity header exists only for automated integration tests. `PCC_ALLOW_INSECURE_USER_HEADER` must remain `0` in every real deployment.

## Owner bootstrap

Set these values in `.env` before the first deployment:

```text
PCC_DEFAULT_USER_EMAIL=owner@example.com
PCC_OWNER_BOOTSTRAP_PASSWORD=a-temporary-password-with-at-least-12-characters
PCC_COOKIE_SECURE=0
PCC_ALLOW_INSECURE_USER_HEADER=0
```

Keep `PCC_COOKIE_SECURE=0` only while access is strictly through `http://localhost:3000`. After Tailscale Funnel HTTPS is active, set:

```text
PCC_PUBLIC_URL=https://<hostname>.<tailnet>.ts.net
PCC_COOKIE_SECURE=1
```

After startup:

1. Sign in using the owner email and temporary password.
2. Confirm the owner dataset is present.
3. Empty `PCC_OWNER_BOOTSTRAP_PASSWORD` in `.env`.
4. Recreate `app` and `tailscale` together when Funnel is enabled.

The first successful login stores only the derived password hash. Once that hash exists, the bootstrap value is not used.

## Inviting another user

1. Sign in as the owner.
2. Open **All Spaces → Account & access**.
3. Enter the allowed email address and create an invitation.
4. Copy the one-time activation URL and send it directly.
5. The invited person opens it and chooses a password of at least 12 characters.

The activation link expires after seven days by default and works once. `PCC_INVITE_DAYS` may be set from one to thirty days.

A new account starts with empty private data. It does not share the owner's Projects, Tasks, Notes, Reviews, Library, uploads, Calendar connection, or pending device queue.

## Revoking and re-inviting

Revocation immediately invalidates stored sessions, prevents future login, and preserves personal data. **Invite again** creates a new activation link and password while reconnecting the person to their preserved dataset.

## Sessions

Sessions last thirty days by default. `PCC_SESSION_DAYS` supports one to 365 days. The browser receives an HTTP-only cookie; the raw token is never stored in PostgreSQL.

## Production ingress

Production is exposed through Tailscale Funnel. The app host port remains bound to `127.0.0.1:3000`, Funnel runs in the `tailscale` container sharing the app network namespace, and application authentication remains the public data boundary.

See `phone-deployment.md` for setup and `security-hardening.md` for the repeatable live audit.
