#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createPccClient, loadCredential } from "./client.mjs";
import { createServer } from "./server.mjs";

try {
  const token = await loadCredential(process.env);
  const call = createPccClient({ origin: process.env.PCC_ORIGIN, token });
  const server = createServer(call);
  for (const event of ["SIGINT", "SIGTERM"]) process.once(event, () => { void server.close().finally(() => process.exit(0)); });
  await server.connect(new StdioServerTransport());
} catch {
  process.stderr.write("PCC MCP startup failed. Check origin and the private credential source.\n");
  process.exitCode = 1;
}
