export class KeychainRequestSecurityError extends Error {
  readonly status: 403 | 415;

  constructor(message: string, status: 403 | 415) {
    super(message);
    this.name = "KeychainRequestSecurityError";
    this.status = status;
  }
}

function requestHost(request: Request) {
  return request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
    ?? request.headers.get("host")?.trim()
    ?? new URL(request.url).host;
}

export function requireKeychainJsonWrite(request: Request) {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new KeychainRequestSecurityError("Keychain writes require JSON.", 415);
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") {
    throw new KeychainRequestSecurityError("Cross-origin Keychain writes are not allowed.", 403);
  }

  const origin = request.headers.get("origin");
  if (origin) {
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      throw new KeychainRequestSecurityError("Invalid request origin.", 403);
    }
    if (originHost !== requestHost(request)) {
      throw new KeychainRequestSecurityError("Cross-origin Keychain writes are not allowed.", 403);
    }
  }
}
