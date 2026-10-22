import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

test("production deployment accepts a branch held by another worktree and can return to main", { skip: process.platform === "win32" }, () => {
  const root = mkdtempSync(join(tmpdir(), "pcc-deployment-"));
  const script = join(root, "deploy-production.sh");
  const origin = join(root, "origin.git");
  const seed = join(root, "seed");
  const live = join(root, "live");
  const trial = join(root, "trial");
  const bin = join(root, "bin");
  const run = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  try {
    copyFileSync(resolve("scripts/deploy-production.sh"), script);
    run(root, "init", "--bare", "--initial-branch=main", origin);
    run(root, "init", "--initial-branch=main", seed);
    run(seed, "config", "user.email", "fixture@example.test");
    run(seed, "config", "user.name", "Deployment fixture");
    writeFileSync(join(seed, "compose.yaml"), "services: {}\n");
    run(seed, "add", ".");
    run(seed, "commit", "-m", "main fixture");
    const mainCommit = run(seed, "rev-parse", "HEAD");
    run(seed, "remote", "add", "origin", origin);
    run(seed, "push", "origin", "main");
    run(seed, "switch", "-c", "agent/trial-fixture");
    writeFileSync(join(seed, "trial.txt"), "trial fixture\n");
    run(seed, "add", ".");
    run(seed, "commit", "-m", "trial fixture");
    const trialCommit = run(seed, "rev-parse", "HEAD");
    run(seed, "push", "origin", "agent/trial-fixture");
    run(root, "clone", origin, live);
    run(live, "worktree", "add", "-b", "agent/trial-fixture", trial, "origin/agent/trial-fixture");
    writeFileSync(join(live, ".env"), "PCC_FUNNEL_ENABLED=0\n");
    mkdirSync(bin);
    writeFileSync(join(bin, "docker"), '#!/bin/sh\ncase "$*" in\n  *pg_dump*) printf "synthetic backup\\n" ;;\n  *pg_restore*) cat >/dev/null ;;\nesac\nexit 0\n');
    writeFileSync(join(bin, "curl"), "#!/bin/sh\nexit 0\n");
    chmodSync(join(bin, "docker"), 0o755);
    chmodSync(join(bin, "curl"), 0o755);
    const deploy = (ref: string) => execFileSync("sh", [script, ref], {
      cwd: live,
      encoding: "utf8",
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
      stdio: ["ignore", "pipe", "pipe"],
    });
    assert.match(deploy("agent/trial-fixture"), /Deployment health checks passed/);
    assert.equal(run(live, "rev-parse", "HEAD"), trialCommit);
    assert.equal(run(live, "branch", "--show-current"), "");
    assert.equal(run(trial, "branch", "--show-current"), "agent/trial-fixture");
    assert.equal(run(live, "rev-parse", "main"), mainCommit);
    assert.equal(readFileSync(join(live, "data/deployments/previous-commit"), "utf8").trim(), mainCommit);
    assert.match(deploy("main"), /Deployment health checks passed/);
    assert.equal(run(live, "branch", "--show-current"), "main");
    assert.equal(run(live, "rev-parse", "HEAD"), mainCommit);
    assert.equal(run(trial, "rev-parse", "HEAD"), trialCommit);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
