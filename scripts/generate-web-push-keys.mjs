import { createECDH, randomBytes } from "node:crypto";

const ecdh = createECDH("prime256v1");
ecdh.generateKeys();

console.log(`PCC_WEB_PUSH_PUBLIC_KEY=${ecdh.getPublicKey().toString("base64url")}`);
console.log(`PCC_WEB_PUSH_PRIVATE_KEY=${ecdh.getPrivateKey().toString("base64url")}`);
console.log(`PCC_REVIEW_PUSH_WORKER_TOKEN=${randomBytes(32).toString("base64url")}`);
console.log("PCC_WEB_PUSH_SUBJECT=mailto:replace-with-your-email@example.com");
