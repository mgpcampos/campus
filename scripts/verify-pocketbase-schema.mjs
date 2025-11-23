#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const MIGRATIONS_DIR = path.join(ROOT_DIR, 'pb_migrations')
const BACKUP_DIR = path.join(ROOT_DIR, 'pb_migrations_backup')

const args = process.argv.slice(2)
const emitJson = args.includes('--json')

function hashBuffer(buffer) {
	return createHash('sha256').update(buffer).digest('hex')
}

async function assertDirectoryExists(dirPath) {
	const stats = await stat(dirPath).catch(() => null)
	if (!stats || !stats.isDirectory()) {
		throw new Error(`Expected directory not found: ${dirPath}`)
	}
}

async function listMigrationFiles(dirPath) {
	const entries = await readdir(dirPath, { withFileTypes: true })
	return entries
		.filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
		.map((entry) => entry.name)
		.sort()
}

async function loadHashes(dirPath, files) {
	const result = new Map()
	for (const fileName of files) {
		const filePath = path.join(dirPath, fileName)
		const contents = await readFile(filePath)
		result.set(fileName, hashBuffer(contents))
	}
	return result
}

async function main() {
	await assertDirectoryExists(MIGRATIONS_DIR)
	await assertDirectoryExists(BACKUP_DIR)

	const migrations = await listMigrationFiles(MIGRATIONS_DIR)
	const backups = await listMigrationFiles(BACKUP_DIR)

	const missingInBackup = migrations.filter((file) => !backups.includes(file))
	const extraInBackup = backups.filter((file) => !migrations.includes(file))

	const mirroredFiles = migrations.filter((file) => backups.includes(file))
	const migrationHashes = await loadHashes(MIGRATIONS_DIR, mirroredFiles)
	const backupHashes = await loadHashes(BACKUP_DIR, mirroredFiles)

	const mismatchedContent = mirroredFiles.filter(
		(file) => migrationHashes.get(file) !== backupHashes.get(file)
	)

	const summary = {
		status:
			missingInBackup.length === 0 &&
			extraInBackup.length === 0 &&
			mismatchedContent.length === 0
				? 'ok'
				: 'error',
		totalMigrations: migrations.length,
		mirroredFiles,
		missingInBackup,
		extraInBackup,
		mismatchedContent
	}

	if (emitJson) {
		console.log(JSON.stringify(summary, null, 2))
	} else {
		const prefix = summary.status === 'ok' ? '✅' : '❌'
		console.log(`${prefix} ${migrations.length} migration files checked.`)
		if (missingInBackup.length > 0) {
			console.log(`Missing backups: ${missingInBackup.join(', ')}`)
		}
		if (extraInBackup.length > 0) {
			console.log(`Extra backups without primary: ${extraInBackup.join(', ')}`)
		}
		if (mismatchedContent.length > 0) {
			console.log(`Mismatched content detected for: ${mismatchedContent.join(', ')}`)
		}
	}

	if (summary.status !== 'ok') {
		process.exit(1)
	}
}

main().catch((error) => {
	if (emitJson) {
		console.log(
			JSON.stringify(
				{
					status: 'error',
					message: error.message
				},
				null,
				2
			)
		)
	} else {
		console.error('Schema verification failed:', error.message)
	}
	process.exit(1)
})
