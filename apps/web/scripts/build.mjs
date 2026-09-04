#!/usr/bin/env node
/**
 * `next build`, with a catalogue API for it to fetch from.
 *
 * The web app reads its catalogue from @discopod/api at build time, so the build
 * needs an API. Fetching from the *deployed* one would be worse in three ways:
 * the first Blueprint deploy builds both services at once, so there would be
 * nothing to fetch from; CI would need network egress to Render; and the free
 * API sleeps, so a build could stall on a cold start. Instead this starts the
 * API from the workspace, builds against it, and stops it again.
 *
 * Set CATALOG_API_URL to skip all of that and build against an API you already
 * have running — a dev server, or the deployed one.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const API_ENTRY = fileURLToPath(new URL('../../api/dist/main.js', import.meta.url));
const WEB_DIR = fileURLToPath(new URL('..', import.meta.url));
const READY_TIMEOUT_MS = 60_000;

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
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
      // Not listening yet — that is the normal case for the first second.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`The catalogue API did not answer ${url} within ${READY_TIMEOUT_MS / 1000}s.`);
}

// Resolve Next's CLI rather than trusting `next` to be on PATH: in a workspace
// install it is hoisted to the root, and this script also runs outside npm.
const nextBin = createRequire(import.meta.url).resolve('next/dist/bin/next');

function runNextBuild(catalogApiUrl) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [nextBin, 'build'], {
      cwd: WEB_DIR,
      stdio: 'inherit',
      env: { ...process.env, CATALOG_API_URL: catalogApiUrl },
    });
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`next build exited ${code}`))));
  });
}

async function main() {
  if (process.env.CATALOG_API_URL) {
    console.log(`==> Building against CATALOG_API_URL=${process.env.CATALOG_API_URL}`);
    await runNextBuild(process.env.CATALOG_API_URL);
    return;
  }

  if (!existsSync(API_ENTRY)) {
    throw new Error(
      `No API build at ${API_ENTRY}.\n` +
        'Run `npm run build --workspace @discopod/api` first, or `npm run build` from the ' +
        'repo root, which builds the workspaces in order.',
    );
  }

  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;

  console.log(`==> Starting the catalogue API on ${base} for the build`);
  const api = spawn(process.execPath, [API_ENTRY], {
    // Its stdout is Nest's boot log; the build's own output is what matters.
    stdio: ['ignore', 'ignore', 'inherit'],
    env: { ...process.env, PORT: String(port) },
  });

  const stopApi = () => {
    if (api.exitCode === null) api.kill('SIGTERM');
  };
  process.on('exit', stopApi);
  process.on('SIGINT', () => { stopApi(); process.exit(130); });
  process.on('SIGTERM', () => { stopApi(); process.exit(143); });

  try {
    await waitForHealth(`${base}/api/health`, api);
    console.log('==> Catalogue API is up; building the web app');
    await runNextBuild(`${base}/api`);
  } finally {
    stopApi();
  }
}

main().catch((error) => {
  console.error(`\n!! ${error.message}`);
  if (error.cause) console.error(`   cause: ${error.cause}`);
  process.exitCode = 1;
});
