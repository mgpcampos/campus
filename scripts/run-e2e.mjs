#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PB_BASE_URL = (process.env.PB_BASE_URL ?? 'http://127.0.0.1:8090').replace(/\/$/, '');
const HEALTH_PATH = process.env.PB_HEALTH_PATH ?? '/api/health';
const HEALTH_URL = `${PB_BASE_URL}${HEALTH_PATH.startsWith('/') ? HEALTH_PATH : `/${HEALTH_PATH}`}`;
const POCKETBASE_COMMAND = process.env.PB_COMMAND ?? 'pocketbase';
const POCKETBASE_ARGS = process.env.PB_COMMAND_ARGS?.split(/\s+/).filter(Boolean) ?? ['serve', '--http=127.0.0.1:8090'];

const PLAYWRIGHT_ARGS = process.argv.slice(2);

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth({ timeoutMs, intervalMs }) {
	const started = Date.now();
	while (Date.now() - started < timeoutMs) {
		if (await isHealthy(intervalMs)) {
			return true;
		}
		await sleep(intervalMs);
	}
	return false;
}

async function isHealthy(timeoutMs) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(HEALTH_URL, { signal: controller.signal });
		return response.ok;
	} catch (error) {
		return false;
	} finally {
		clearTimeout(timeout);
	}
}

async function ensurePocketBase() {
	const initialTimeout = Number.parseInt(process.env.PB_HEALTH_TIMEOUT ?? '2000', 10);
	if (await isHealthy(initialTimeout)) {
		return null;
	}

	console.log(`PocketBase not responding at ${HEALTH_URL}. Attempting to start it with '${POCKETBASE_COMMAND} ${POCKETBASE_ARGS.join(' ')}'.`);
	const child = spawn(POCKETBASE_COMMAND, POCKETBASE_ARGS, {
		stdio: 'inherit',
		env: process.env,
		shell: process.platform === 'win32'
	});

	process.on('exit', () => {
		if (!child.killed) {
			child.kill();
		}
	});

	const ready = await waitForHealth({ timeoutMs: Number.parseInt(process.env.PB_START_TIMEOUT ?? '15000', 10), intervalMs: 500 });
	if (!ready) {
		console.error('PocketBase did not become healthy in time. Aborting Playwright run.');
		child.kill('SIGTERM');
		process.exit(1);
	}

	return child;
}

async function run() {
	const pocketbaseProcess = await ensurePocketBase();

	const binDir = join(__dirname, '..', 'node_modules', '.bin');
	const playwrightExecutable = join(binDir, process.platform === 'win32' ? 'playwright.cmd' : 'playwright');

	const child = spawn(playwrightExecutable, ['test', '--reporter=list', ...PLAYWRIGHT_ARGS], {
		stdio: 'inherit',
		env: process.env,
		shell: process.platform === 'win32'
	});

	child.on('exit', (code, signal) => {
		if (pocketbaseProcess) {
			pocketbaseProcess.kill('SIGTERM');
		}
		if (signal) {
			process.kill(process.pid, signal);
			return;
		}
		process.exit(code ?? 1);
	});
}

run().catch((error) => {
	console.error('Failed to run Playwright tests:', error);
	process.exit(1);
});
