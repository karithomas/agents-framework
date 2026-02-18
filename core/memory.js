import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MEMORY_PATH = join(__dirname, '../data/memory.json');

function readMemory() {
	try {
		const data = readFileSync(MEMORY_PATH, 'utf-8');
		return JSON.parse(data);
	} catch (error) {
		console.error('[Memory] Error reading memory:', error.message);
		return {};
	}
}

function writeMemory(data) {
	try {
		writeFileSync(MEMORY_PATH, JSON.stringify(data, null, 2));
	} catch (error) {
		console.error('[Memory] Error writing memory:', error.message);
	}
}

export function getMemory(agentName) {
	const memory = readMemory();
	return memory[agentName] || {};
}

export function setMemory(agentName, data) {
	const memory = readMemory();
	memory[agentName] = {
		...memory[agentName],
		...data,
		lastUpdated: new Date().toISOString(),
	};
	writeMemory(memory);
	console.log(`[${agentName}] Memory saved`);
}

export function clearMemory(agentName) {
	const memory = readMemory();
	delete memory[agentName];
	writeMemory(memory);
	console.log(`[${agentName}] Memory cleared`);
}
