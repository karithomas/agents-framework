# 🤖 Agents Framework

A personal automation framework built with Node.js that runs named AI agents to streamline daily developer workflows. Agents communicate via Slack DMs and the terminal, pulling data from Linear and powered by the Anthropic Claude API.

Built by a Front End Engineer at FantasyPros to automate planning, ticket management, code review, and more.

---

## Agents

| Agent | Name | Schedule | Description |
|-------|------|----------|-------------|
| Weekly Planner | **Scotty** | Mon 8am + Tue–Fri 8am | Builds a weekly ToDo list from Linear tickets every Monday and sends a daily digest each morning |
| Slack Digest | **TBD** | TBD | Summarizes unread Slack messages and highlights important threads |
| Code Review Helper | **TBD** | On demand | Assists with PR reviews and code feedback |
| Linear Ticket Drafter | **TBD** | On demand | Drafts well-structured Linear tickets from plain language descriptions |

---

## Tech Stack

- **Runtime:** Node.js 18.19.0
- **AI:** [Anthropic Claude API](https://docs.anthropic.com) (`claude-sonnet-4-6`)
- **Messaging:** [Slack Web API](https://api.slack.com/web)
- **Project Management:** [Linear SDK](https://developers.linear.app)
- **Scheduling:** [node-cron](https://www.npmjs.com/package/node-cron)
- **Memory:** JSON file-based persistence (`data/memory.json`)

---

## Project Structure

```
agents-framework/
├── agents/
│   └── scotty.js          # Weekly planner agent
├── core/
│   ├── claude.js          # Anthropic API wrapper
│   ├── slack.js           # Slack SDK wrapper
│   ├── linear.js          # Linear SDK wrapper
│   ├── scheduler.js       # node-cron registration
│   └── memory.js          # Read/write persistent memory
├── data/
│   └── memory.json        # Agent memory (gitignored)
├── index.js               # Entry point — registers all agents
├── nodemon.json           # Nodemon config
├── .editorconfig          # Tab-based formatting rules
├── .env                   # API keys (gitignored)
└── package.json
```

---

## Prerequisites

- Node.js `18.19.0`
- npm `10.2.3`
- An [Anthropic API account](https://console.anthropic.com) with credits
- A [Slack app](https://api.slack.com/apps) installed to your workspace
- A [Linear account](https://linear.app) with API access

---

## Setup

### 1. Clone the repo

```bash
git clone git@github.com:karithomas/agents-framework.git
cd agents-framework
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create your `.env` file

```bash
touch .env
```

Add the following:

```
ANTHROPIC_API_KEY=your_anthropic_key_here
SLACK_BOT_TOKEN=xoxb-your-token-here
SLACK_SIGNING_SECRET=your_signing_secret_here
SLACK_YOUR_USER_ID=your_slack_member_id_here
LINEAR_API_KEY=your_linear_key_here
NODE_ENV=development
```

### 4. Initialize memory

```bash
echo '{}' > data/memory.json
```

### 5. Run the framework

```bash
# Development (auto-restarts on file changes)
npm run dev

# Production
npm start
```

---

## API Keys Guide

### Anthropic API Key
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Navigate to **API Keys** → **Create Key**
3. Add billing credits under **Plans & Billing**

### Slack Bot Token
1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App**
2. Under **OAuth & Permissions**, add these Bot Token Scopes:
   - `chat:write`
   - `im:write`
   - `im:history`
   - `channels:history`
   - `users:read`
3. Click **Install to Workspace** and copy the `xoxb-` token
4. Your **Member ID** can be found in Slack under your profile → `...` → **Copy member ID**

### Linear API Key
1. Go to Linear → Settings → **Security & Access**
2. Under **Personal API Keys** → **New API Key**

---

## Adding a New Agent

1. Create a new file in `agents/` (e.g., `agents/myagent.js`)
2. Use this template:

```javascript
import { registerAgent } from '../core/scheduler.js';
import { askClaude } from '../core/claude.js';
import { sendDM } from '../core/slack.js';
import { getMemory, setMemory } from '../core/memory.js';

const AGENT_NAME = 'MyAgent';

const SYSTEM_PROMPT = `You are MyAgent...`;

async function run() {
	const message = await askClaude({
		agentName: AGENT_NAME,
		systemPrompt: SYSTEM_PROMPT,
		userMessage: 'Your prompt here',
	});

	await sendDM(AGENT_NAME, message);
}

export default function myAgent() {
	registerAgent({
		name: AGENT_NAME,
		schedule: '0 9 * * 1-5', // Mon–Fri at 9am
		handler: run,
	});
}
```

3. Import and register it in `index.js`:

```javascript
import myAgent from './agents/myagent.js';
myAgent();
```

That's it — one file, one import.

---

## Cron Schedule Reference

| Schedule | Expression |
|----------|------------|
| Every Monday at 8am | `0 8 * * 1` |
| Tue–Fri at 8am | `0 8 * * 2-5` |
| Weekdays at 9am | `0 9 * * 1-5` |
| Every day at 7:30am | `30 7 * * *` |

---

## Environment

This framework is designed to run locally on your machine during work hours. Future options for always-on deployment include a small VPS, Railway, or a scheduled cloud function.

---

## Notes

- `data/memory.json` is gitignored — agents persist state locally between runs
- `.env` is gitignored — never commit API keys
- All agents use ES module syntax (`import/export`) — `"type": "module"` is set in `package.json`
- Code style: tabs, 2-space width, enforced via `.editorconfig`
