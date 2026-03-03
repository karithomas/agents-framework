import 'dotenv/config';
import { listAgents } from './core/scheduler.js';
import scotty from './agents/scotty.js';
import lenny from './agents/lenny.js';

console.log('🤖 Agents Framework Starting...');
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Started at: ${new Date().toLocaleString()}`);
console.log('');

scotty();
lenny();

listAgents();

console.log('✅ All agents registered and running!');
console.log('👀 Watching for scheduled triggers...\n');
