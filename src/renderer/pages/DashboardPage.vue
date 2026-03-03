<template>
	<div class="dashboard">
		<h1>Dashboard</h1>

		<!-- Dynamic agent action cards -->
		<section class="dashboard__agents">
			<div
				v-for="agent in agents"
				:key="agent.name"
				class="dashboard__agent-card"
				:class="{ 'dashboard__agent-card--disabled': !agentEnabledMap[agent.name] }"
			>
				<div class="dashboard__agent-header">
					<h2>{{ agent.name }}</h2>
					<span class="dashboard__agent-desc">{{ agent.description }}</span>
				</div>
				<div class="dashboard__agent-actions">
					<button
						v-for="action in agent.actions"
						:key="action.key"
						class="dashboard__action-btn"
						:disabled="runningAction === `${agent.name}:${action.key}` || !agentEnabledMap[agent.name]"
						@click="handleRunAgent(agent.name, action.key)"
					>
						<span v-if="runningAction === `${agent.name}:${action.key}`" class="dashboard__spinner" />
						{{ action.label }}
					</button>
				</div>
				<p v-if="!agentEnabledMap[agent.name]" class="dashboard__disabled-note">
					Disabled in Settings
				</p>
			</div>
		</section>

		<!-- Recent runs -->
		<section class="dashboard__runs">
			<h2>Recent Runs</h2>
			<table v-if="runs.length" class="dashboard__table">
				<thead>
					<tr>
						<th>Agent</th>
						<th>Type</th>
						<th>Status</th>
						<th>Started</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="run in runs" :key="run.id">
						<td>{{ run.agent_name }}</td>
						<td>{{ run.run_type }}</td>
						<td>
							<span :class="`dashboard__status dashboard__status--${run.status}`">
								{{ run.status }}
							</span>
						</td>
						<td>{{ formatDate(run.started_at) }}</td>
					</tr>
				</tbody>
			</table>
			<p v-else class="dashboard__empty">No runs yet. Trigger an agent above to get started.</p>
		</section>

		<!-- Result display -->
		<div v-if="lastResult" class="dashboard__result" :class="`dashboard__result--${lastResult.status}`">
			<strong>{{ lastResult.status === 'success' ? 'Success' : 'Error' }}:</strong>
			{{ lastResult.message }}
		</div>
	</div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { getAgents, getRecentRuns, runAgent, isAgentEnabled } from '../api.js';

const agents = ref([]);
const runs = ref([]);
const agentEnabledMap = reactive({});
const runningAction = ref(null);
const lastResult = ref(null);

onMounted(async () => {
	agents.value = await getAgents();
	runs.value = await getRecentRuns(20);

	for (const agent of agents.value) {
		agentEnabledMap[agent.name] = await isAgentEnabled(agent.name);
	}
});

async function handleRunAgent(agentName, actionKey) {
	runningAction.value = `${agentName}:${actionKey}`;
	lastResult.value = null;

	try {
		const result = await runAgent(agentName, actionKey);
		lastResult.value = {
			status: result.status,
			message: result.status === 'success'
				? `${agentName} completed successfully`
				: result.error,
		};
		runs.value = await getRecentRuns(20);
	} catch (e) {
		lastResult.value = { status: 'error', message: e.message };
	} finally {
		runningAction.value = null;
	}
}

function formatDate(iso) {
	if (!iso) return '';
	return new Date(iso).toLocaleString();
}
</script>

<style lang="scss" scoped>
.dashboard {
	h1 {
		margin: 0 0 1.5rem;
	}

	&__agents {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	&__agent-card {
		background: var(--color-card-bg, #1e1e3a);
		border-radius: 8px;
		padding: 1.25rem;
		border: 1px solid var(--color-border, #2a2a4a);

		&--disabled {
			opacity: 0.5;
		}
	}

	&__agent-header {
		margin-bottom: 1rem;

		h2 {
			margin: 0 0 0.25rem;
			font-size: 1.1rem;
		}
	}

	&__agent-desc {
		font-size: 0.8rem;
		opacity: 0.7;
	}

	&__agent-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	&__action-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 6px;
		background: var(--color-primary, #6366f1);
		color: white;
		font-size: 0.85rem;
		cursor: pointer;

		&:hover:not(:disabled) {
			filter: brightness(1.1);
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}

	&__spinner {
		display: inline-block;
		width: 14px;
		height: 14px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	&__disabled-note {
		font-size: 0.8rem;
		opacity: 0.6;
		margin: 0.5rem 0 0;
	}

	&__runs {
		h2 {
			font-size: 1.1rem;
			margin: 0 0 1rem;
		}
	}

	&__table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;

		th, td {
			text-align: left;
			padding: 0.5rem 0.75rem;
			border-bottom: 1px solid var(--color-border, #2a2a4a);
		}

		th {
			opacity: 0.7;
			font-weight: 500;
		}
	}

	&__status {
		display: inline-block;
		padding: 0.15rem 0.5rem;
		border-radius: 4px;
		font-size: 0.8rem;
		font-weight: 500;

		&--success { background: #065f46; color: #6ee7b7; }
		&--error { background: #7f1d1d; color: #fca5a5; }
		&--running { background: #78350f; color: #fde68a; }
	}

	&__empty {
		opacity: 0.6;
		font-size: 0.9rem;
	}

	&__result {
		margin-top: 1.5rem;
		padding: 0.75rem 1rem;
		border-radius: 6px;
		font-size: 0.9rem;

		&--success { background: #065f46; color: #6ee7b7; }
		&--error { background: #7f1d1d; color: #fca5a5; }
	}
}

@keyframes spin {
	to { transform: rotate(360deg); }
}
</style>
