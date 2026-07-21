# Production security hardening

The production application is public through Tailscale Funnel, while authentication remains the application security boundary. This document records the controls that must remain active on the Raspberry Pi deployment.

## Login abuse protection

The login endpoint applies two in-memory limits in the single application process:

- At most 30 allowed login attempts per rolling minute across the deployment.
- Five failed attempts for one normalized email address trigger a one-minute account cooldown.
- A successful login clears that email address's failed-attempt state.
- The account-state map is bounded and stale entries are removed.
- Rate-limited requests return HTTP `429` with a `Retry-After` header.

Every allowed login request also performs fixed dummy `scrypt` work alongside normal authentication. This reduces the timing difference between valid and unknown accounts and ensures unknown-account requests are not computationally free.

The limiter is intentionally in memory because production runs as one Node.js process on one Raspberry Pi. Restarting the application clears the counters. A future multi-process or multi-host deployment must move this state to a shared store.

## Required runtime settings

The live `.env` must use:

```text
PCC_FUNNEL_ENABLED=1
PCC_PUBLIC_URL=https://<hostname>.<tailnet>.ts.net
PCC_COOKIE_SECURE=1
PCC_ALLOW_INSECURE_USER_HEADER=0
PCC_OWNER_BOOTSTRAP_PASSWORD=
TAILSCALE_AUTH_KEY=
```

The bootstrap password and Tailscale authentication key are needed only for initial setup. The owner password hash and Tailscale device identity persist independently after registration.

## Repeatable production audit

From the Raspberry Pi repository root, run:

```bash
sh scripts/check-production-security.sh
```

The script does not print secret values. It verifies:

- `.env` has private file permissions.
- The public URL uses Funnel HTTPS.
- Session cookies are marked Secure.
- The insecure CI identity override is disabled.
- The temporary owner bootstrap password is empty.
- The temporary Tailscale registration key is empty.
- The Tailscale node and Funnel route are active.
- Both local and public health endpoints respond successfully.

Run the audit after production configuration changes, authentication changes, Tailscale changes, or a migration to a new host.

## Scope

This hardening does not add a reverse proxy, CAPTCHA, intrusion-prevention service, or distributed rate-limit store. Those would add operational complexity that is not justified for the current single-instance personal deployment. Revisit that decision if traffic, users, or deployment topology changes.
