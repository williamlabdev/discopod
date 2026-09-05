#!/usr/bin/env node
/**
 * Both dev servers, at once.
 *
 * `npm run dev --workspaces` runs workspaces *sequentially*, so the API's
 * `nest start --watch` never exits and `@discopod/web` is never reached: the
 * documented "web :3000, api :3001" quietly became "api :3001 only", with
 * nothing on screen to say so. This starts them together instead.
 *
 * The order matters. The web app reads its catalogue from the API — at build
 * time in production, and on every `next dev` render here (see
 * `apps/web/lib/catalog-api.ts`) — so a page loaded before the API answers
 * fails with `Catalogue API unreachable`. The API goes up first and the web
 * server waits for /api/health, the same handshake `apps/web/scripts/build.mjs`
 * makes for the build.
 *
 * Ports come from API_PORT / WEB_PORT. CATALOG_API_URL and WEB_ORIGIN are
 * derived from them rather than left to defaults, so moving a port moves both
 * ends of the wire together.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const API_DIR = fileURLToPath(new URL('../apps/api', import.meta.url));
const WEB_DIR = fileURLToPath(new URL('../apps/web', import.meta.url));
const READY_TIMEOUT_MS = 60_000;

const apiPort = Number(process.env.API_PORT ?? 3001);
const webPort = Number(process.env.WEB_PORT ?? 3000);
const apiBase = `http://127.0.0.1:${apiPort}`;
const webOrigin = `http://localhost:${webPort}`;

// Resolve both CLIs rather than trusting PATH: in a workspace install they are
// hoisted to the root, and this script also runs outside npm.
const require = createRequire(import.meta.url);
const nestBin = require.resolve('@nestjs/cli/bin/nest.js');
const nextBin = require.resolve('next/dist/bin/next');

const children = [];
let shuttingDown = false;

/**
 * Children are spawned into their own process groups, for two reasons: Ctrl-C
 * in the terminal then reaches only this script, which shuts both down in
 * order; and `nest start --watch` spawns the app as a *grandchild*, which a
 * kill aimed at nest alone would leave holding :3001.
 */
function start(name, bin, args, cwd, env) {
  const child = spawn(process.execPath, [bin, ...args], {
    cwd,
    stdio: 'inherit',
    detached: true,
    env: { ...process.env, ...env },
  });
  child.on('error', (error) => {
    console.error(`==> ${name} failed to start: ${error.message}`);
    stopAll(1);
  });
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.error(`==> ${name} exited (${signal ?? code}); stopping the other server`);
    stopAll(code ?? 1);
  });
  children.push({ name, child });
  return child;
}

function stop({ child }) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  try {
    // Negative pid: the whole group, so nest's grandchild goes too.
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    child.kill('SIGTERM');
  }
}

function stopAll(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const entry of children) stop(entry);
  process.exit(code);
}

async function waitForHealth(url, child) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`The catalogue API exited with code ${child.exitCode} before answering.`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Not listening yet — the normal case while Nest compiles.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`The catalogue API did not answer ${url} within ${READY_TIMEOUT_MS / 1000}s.`);
}

/** An API already on the port is someone else's `npm run dev:api`, not ours to restart. */
async function alreadyServing(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  process.on('SIGINT', () => stopAll(130));
  process.on('SIGTERM', () => stopAll(143));

  if (await alreadyServing(`${apiBase}/api/health`)) {
    console.log(`==> An API is already answering on ${apiBase}; starting only the web app`);
  } else {
    console.log(`==> Starting @discopod/api on ${apiBase}`);
    const api = start('@discopod/api', nestBin, ['start', '--watch'], API_DIR, {
      PORT: String(apiPort),
      WEB_ORIGIN: webOrigin,
    });
    await waitForHealth(`${apiBase}/api/health`, api);
  }

  console.log(`==> Starting @discopod/web on ${webOrigin}`);
  start('@discopod/web', nextBin, ['dev', '--port', String(webPort)], WEB_DIR, {
    CATALOG_API_URL: process.env.CATALOG_API_URL ?? `${apiBase}/api`,
  });
}

main().catch((error) => {
  console.error(error.message ?? error);
  stopAll(1);
});
