import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db;

/** Keys that contain secret tokens and should be encrypted at rest in Electron. */
export const CREDENTIAL_KEYS = ['linear_api_key', 'slack_bot_token', 'slack_signing_secret'];

function encryptIfNeeded(key, value) {
	if (!CREDENTIAL_KEYS.includes(key) || !value) return value;
	if (!process.versions.electron) return value;
	try {
		const { safeStorage } = require('electron');
		if (!safeStorage.isEncryptionAvailable()) return value;
		return safeStorage.encryptString(value).toString('base64');
	} catch {
		return value;
	}
}

function decryptIfNeeded(key, value) {
	if (!CREDENTIAL_KEYS.includes(key) || !value) return value;
	if (!process.versions.electron) return value;
	try {
		const { safeStorage } = require('electron');
		return safeStorage.decryptString(Buffer.from(value, 'base64'));
	} catch {
		// Failed to decrypt — assume plaintext from before encryption was enabled
		return value;
	}
}

/**
 * Determine the database path.
 * Electron: pass userDataPath from app.getPath('userData')
 * CLI/server: project-root/data/agents.db
 */
function getDbPath(userDataPath) {
	if (userDataPath) return path.join(userDataPath, 'agents.db');
	return path.join(__dirname, '../../data/agents.db');
}

export function initDatabase(userDataPath) {
	if (db) return db;

	const dbPath = getDbPath(userDataPath);
	fs.mkdirSync(path.dirname(dbPath), { recursive: true });
	db = new Database(dbPath);
	db.pragma('journal_mode = WAL');

	db.exec(`
		CREATE TABLE IF NOT EXISTS agent_runs (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			agent_name  TEXT NOT NULL,
			run_type    TEXT NOT NULL,
			status      TEXT NOT NULL DEFAULT 'running',
			output      TEXT,
			error       TEXT,
			started_at  TEXT NOT NULL DEFAULT (datetime('now')),
			finished_at TEXT
		);

		CREATE TABLE IF NOT EXISTS weekly_plans (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			week_start  TEXT NOT NULL,
			plan_text   TEXT NOT NULL,
			issues_json TEXT,
			created_at  TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS ticket_breakdowns (
			id             INTEGER PRIMARY KEY AUTOINCREMENT,
			ticket_id      TEXT NOT NULL UNIQUE,
			ticket_title   TEXT,
			summary        TEXT,
			analysis_json  TEXT NOT NULL,
			comment_md     TEXT,
			completed      INTEGER NOT NULL DEFAULT 0,
			created_at     TEXT NOT NULL DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS settings (
			key   TEXT PRIMARY KEY,
			value TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS agent_settings (
			agent_name TEXT PRIMARY KEY,
			enabled    INTEGER NOT NULL DEFAULT 1
		);

		CREATE TABLE IF NOT EXISTS daily_digests (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			digest_date TEXT NOT NULL,
			digest_text TEXT NOT NULL,
			created_at  TEXT NOT NULL DEFAULT (datetime('now'))
		);
	`);

	// Seed default settings (INSERT OR IGNORE so we don't overwrite existing values)
	const seedSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
	seedSetting.run('slack_enabled', 'false');
	seedSetting.run('slack_bot_token', '');
	seedSetting.run('slack_signing_secret', '');
	seedSetting.run('slack_user_id', '');
	seedSetting.run('linear_api_key', '');
	seedSetting.run('linear_user_id', '');
	seedSetting.run('onboarding_complete', 'false');
	seedSetting.run('lenny_post_to_linear', 'false');

	// Migrations — add columns that may not exist in older databases
	try { db.exec('ALTER TABLE ticket_breakdowns ADD COLUMN completed INTEGER NOT NULL DEFAULT 0'); } catch { /* already exists */ }

	console.log(`[DB] Initialized at ${dbPath}`);
	return db;
}

export function getDb() {
	if (!db) initDatabase();
	return db;
}

// --- Agent Runs ---

export function logRunStart(agentName, runType) {
	const stmt = getDb().prepare(
		'INSERT INTO agent_runs (agent_name, run_type) VALUES (?, ?)'
	);
	const result = stmt.run(agentName, runType);
	return result.lastInsertRowid;
}

export function logRunEnd(runId, status, output = null, error = null) {
	const stmt = getDb().prepare(
		'UPDATE agent_runs SET status = ?, output = ?, error = ?, finished_at = datetime(\'now\') WHERE id = ?'
	);
	stmt.run(status, output, error, runId);
}

export function getRecentRuns(limit = 20) {
	const stmt = getDb().prepare(
		'SELECT * FROM agent_runs ORDER BY started_at DESC LIMIT ?'
	);
	return stmt.all(limit);
}

// --- Weekly Plans ---

export function saveWeeklyPlan(weekStart, planText, issuesJson = null) {
	const stmt = getDb().prepare(
		'INSERT INTO weekly_plans (week_start, plan_text, issues_json) VALUES (?, ?, ?)'
	);
	return stmt.run(weekStart, planText, issuesJson);
}

export function getLatestWeeklyPlan() {
	const stmt = getDb().prepare(
		'SELECT * FROM weekly_plans ORDER BY created_at DESC LIMIT 1'
	);
	return stmt.get() || null;
}

export function getWeeklyPlanHistory(limit = 10) {
	const stmt = getDb().prepare(
		'SELECT * FROM weekly_plans ORDER BY created_at DESC LIMIT ?'
	);
	return stmt.all(limit);
}

// --- Ticket Breakdowns ---

export function saveTicketBreakdown(ticketId, title, summary, analysisJson, commentMd = null) {
	const stmt = getDb().prepare(
		`INSERT INTO ticket_breakdowns (ticket_id, ticket_title, summary, analysis_json, comment_md)
		 VALUES (?, ?, ?, ?, ?)
		 ON CONFLICT(ticket_id) DO UPDATE SET
			ticket_title = excluded.ticket_title,
			summary = excluded.summary,
			analysis_json = excluded.analysis_json,
			comment_md = excluded.comment_md`
	);
	return stmt.run(ticketId, title, summary, analysisJson, commentMd);
}

export function getTicketBreakdowns(limit = 20) {
	const stmt = getDb().prepare(
		'SELECT * FROM ticket_breakdowns ORDER BY created_at DESC LIMIT ?'
	);
	return stmt.all(limit);
}

export function setTicketCompleted(ticketId, completed) {
	const stmt = getDb().prepare(
		'UPDATE ticket_breakdowns SET completed = ? WHERE ticket_id = ?'
	);
	stmt.run(completed ? 1 : 0, ticketId);
}

export function isTicketProcessed(ticketId) {
	const stmt = getDb().prepare(
		'SELECT 1 FROM ticket_breakdowns WHERE ticket_id = ?'
	);
	return !!stmt.get(ticketId);
}

// --- Daily Digests ---

export function saveDailyDigest(digestDate, digestText) {
	const stmt = getDb().prepare(
		'INSERT INTO daily_digests (digest_date, digest_text) VALUES (?, ?)'
	);
	return stmt.run(digestDate, digestText);
}

export function getLatestDailyDigest() {
	const stmt = getDb().prepare(
		'SELECT * FROM daily_digests ORDER BY created_at DESC LIMIT 1'
	);
	return stmt.get() || null;
}

// --- Settings ---

export function getSetting(key) {
	const stmt = getDb().prepare('SELECT value FROM settings WHERE key = ?');
	const row = stmt.get(key);
	return row ? decryptIfNeeded(key, row.value) : null;
}

export function setSetting(key, value) {
	const stored = encryptIfNeeded(key, value);
	const stmt = getDb().prepare(
		'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
	);
	stmt.run(key, stored);
}

export function isOnboarded() {
	return getSetting('onboarding_complete') === 'true';
}

// --- Agent Settings ---

export function isAgentEnabled(agentName) {
	const stmt = getDb().prepare('SELECT enabled FROM agent_settings WHERE agent_name = ?');
	const row = stmt.get(agentName);
	return row ? !!row.enabled : true; // Default to enabled if not in table
}

export function setAgentEnabled(agentName, enabled) {
	const stmt = getDb().prepare(
		'INSERT INTO agent_settings (agent_name, enabled) VALUES (?, ?) ON CONFLICT(agent_name) DO UPDATE SET enabled = excluded.enabled'
	);
	stmt.run(agentName, enabled ? 1 : 0);
}

export function getAgentSettings() {
	const stmt = getDb().prepare('SELECT * FROM agent_settings');
	return stmt.all();
}
