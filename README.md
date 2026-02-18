# 🤖 Agents Framework

A personal automation framework built with Node.js that runs named AI agents to streamline daily developer workflows. Agents communicate via Slack DMs and the terminal, pulling data from Linear and powered by the Anthropic Claude API.

Built by a Front End Engineer at FantasyPros to automate planning, ticket management, code review, and more.

---

## Agents

| Agent | Name | Schedule | Description |
|-------|------|----------|-------------|
| Weekly Planner | **Scotty** | Mon 8am + Tue–Fri 8am | Builds a weekly ToDo list from Linear tickets every Monday and sends a daily digest each morning |
| Linear Ticket Drafter | **Lenny** | On startup + every 30 min + on demand | Reads active Linear tickets and adds a markdown breakdown comment with actionable steps |
| Slack Digest | **TBD** | TBD | Summarizes unread Slack messages and highlights important threads |
| Code Review Helper | **TBD** | On demand | Assists with PR reviews and code feedback |

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
│   ├── scotty.js          # Weekly planner agent
│   └── lenny.js           # Linear ticket drafter agent
├── core/
│   ├── claude.js          # Anthropic API wrapper
│   ├── slack.js           # Slack SDK wrapper
│   ├── linear.js          # Linear SDK wrapper
│   ├── scheduler.js       # node-cron registration
│   └── memory.js          # Read/write persistent memory
├── data/
│   └── memory.json        # Agent memory (gitignored)
├── index.js               # Entry point — registers all agents
├── lenny.js               # On-demand Lenny trigger script
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
LINEAR_USER_ID=your_linear_user_id_here
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

## Agent Details

### 🚀 Scotty — Weekly Planner

Scotty runs automatically on a schedule and communicates exclusively via Slack DM.

| Trigger | Action |
|---------|--------|
| Every Monday at 8am | Fetches all active Linear tickets, builds a structured weekly ToDo list grouped by priority, and sends it to your Slack DM |
| Tue–Fri at 8am | Reads the saved weekly plan from memory and sends a focused daily digest for that specific day |

Scotty saves the weekly plan to `data/memory.json` so daily digests don't require additional Linear or Claude API calls.

---

### 🎟️ Lenny — Linear Ticket Drafter

Lenny reads your active Linear tickets and adds a detailed markdown breakdown as a comment on each ticket, giving you a clear checklist of steps to complete the work.

| Trigger | Action |
|---------|--------|
| On startup | Scans all active assigned tickets and processes any that don't already have a Lenny comment |
| Every 30 minutes | Polls for recently updated tickets and processes any new ones |
| On demand | Run `node lenny.js TICKET-ID` to process a specific ticket immediately |

**How Lenny works:**
1. Fetches your active Linear tickets
2. Skips any ticket that already has a Lenny breakdown comment
3. Sends each ticket to Claude for analysis
4. Claude decides if the ticket needs sub-issues or just a comment breakdown
5. Adds a formatted markdown comment to the ticket with a summary, steps, and checkboxes
6. Saves processed ticket IDs to memory to avoid reprocessing

**On-demand usage:**
```bash
node lenny.js CFP-360
node lenny.js PRO-514
```

**Note:** Sub-issue creation is currently disabled by default. When re-enabled, sub-issues will be automatically assigned to you and set to "In the Hole" state for review.

**Lenny skips:**
- Tickets already containing a Lenny breakdown comment
- Completed or cancelled tickets

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
2. Under **Personal API Keys** → **New API key**

### Linear User ID
Your Linear user ID is a UUID used to auto-assign issues Lenny creates. It is fetched once using the `getMyLinearId` utility in `core/linear.js` and stored in `.env` as `LINEAR_USER_ID`.

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
