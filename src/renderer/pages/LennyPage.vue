<template>
	<div class="lenny-page">
		<h1>Lenny — Ticket Drafter</h1>

		<!-- On-demand buttons -->
		<div class="lenny-page__actions">
			<button
				class="lenny-page__btn lenny-page__btn--primary"
				:disabled="running"
				@click="handleProcessAll"
			>
				<span v-if="running && runType === 'all'" class="lenny-page__spinner" />
				Process All Active
			</button>
			<div class="lenny-page__ticket-input">
				<input
					v-model="ticketId"
					type="text"
					placeholder="e.g. CFP-360"
					class="lenny-page__input"
					@keyup.enter="handleProcessTicket"
				/>
				<button
					class="lenny-page__btn lenny-page__btn--secondary"
					:disabled="running || !ticketId"
					@click="handleProcessTicket"
				>
					<span v-if="running && runType === 'ticket'" class="lenny-page__spinner" />
					Process Ticket
				</button>
			</div>
		</div>

		<div v-if="alert" class="lenny-page__alert" :class="`lenny-page__alert--${alert.type}`">
			{{ alert.message }}
		</div>

		<!-- Breakdowns -->
		<section class="lenny-page__breakdowns">
			<h2>Ticket Breakdowns</h2>
			<div v-if="breakdowns.length">
				<details v-for="bd in breakdowns" :key="bd.id" class="lenny-page__breakdown">
					<summary>
						<span class="lenny-page__ticket-id">{{ bd.ticket_id }}</span>
						<span class="lenny-page__ticket-title">{{ bd.ticket_title }}</span>
						<span class="lenny-page__ticket-date">{{ formatDate(bd.created_at) }}</span>
					</summary>
					<div class="lenny-page__breakdown-body">
						<p v-if="bd.summary" class="lenny-page__summary">{{ bd.summary }}</p>
						<pre v-if="bd.comment_md" class="lenny-page__comment">{{ bd.comment_md }}</pre>
					</div>
				</details>
			</div>
			<p v-else class="lenny-page__empty">
				No breakdowns yet. Process tickets above to get started.
			</p>
		</section>
	</div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { runAgent, getTicketBreakdowns, processTicket } from '../api.js';

const breakdowns = ref([]);
const ticketId = ref('');
const running = ref(false);
const runType = ref('');
const alert = ref(null);

onMounted(async () => {
	breakdowns.value = await getTicketBreakdowns(20);
});

async function handleProcessAll() {
	running.value = true;
	runType.value = 'all';
	alert.value = null;

	try {
		const result = await runAgent('Lenny', 'process_all');
		if (result.status === 'success') {
			alert.value = { type: 'success', message: 'Lenny finished processing all active tickets' };
			breakdowns.value = await getTicketBreakdowns(20);
		} else {
			alert.value = { type: 'error', message: result.error };
		}
	} catch (e) {
		alert.value = { type: 'error', message: e.message };
	} finally {
		running.value = false;
		runType.value = '';
	}
}

async function handleProcessTicket() {
	if (!ticketId.value) return;

	running.value = true;
	runType.value = 'ticket';
	alert.value = null;

	try {
		const result = await processTicket(ticketId.value);
		if (result.status === 'success') {
			alert.value = { type: 'success', message: `Processed ${ticketId.value}` };
			breakdowns.value = await getTicketBreakdowns(20);
			ticketId.value = '';
		} else {
			alert.value = { type: 'error', message: result.error };
		}
	} catch (e) {
		alert.value = { type: 'error', message: e.message };
	} finally {
		running.value = false;
		runType.value = '';
	}
}

function formatDate(iso) {
	if (!iso) return '';
	return new Date(iso).toLocaleDateString();
}
</script>

<style lang="scss" scoped>
.lenny-page {
	h1 {
		margin: 0 0 1.5rem;
	}

	&__actions {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		flex-wrap: wrap;
		margin-bottom: 1.5rem;
	}

	&__ticket-input {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	&__input {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-border, #3a3a5a);
		border-radius: 6px;
		background: var(--color-input-bg, #16162e);
		color: inherit;
		font-size: 0.9rem;
		width: 140px;

		&:focus {
			outline: none;
			border-color: var(--color-primary, #6366f1);
		}
	}

	&__btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 6px;
		font-size: 0.85rem;
		cursor: pointer;
		color: white;

		&--primary { background: var(--color-primary, #6366f1); }
		&--secondary { background: var(--color-secondary, #4b5563); }

		&:hover:not(:disabled) { filter: brightness(1.1); }
		&:disabled { opacity: 0.5; cursor: not-allowed; }
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

	&__alert {
		padding: 0.75rem 1rem;
		border-radius: 6px;
		margin-bottom: 1.5rem;
		font-size: 0.9rem;

		&--success { background: #065f46; color: #6ee7b7; }
		&--error { background: #7f1d1d; color: #fca5a5; }
	}

	&__breakdowns {
		h2 {
			font-size: 1.1rem;
			margin: 0 0 1rem;
		}
	}

	&__breakdown {
		margin-bottom: 0.5rem;
		border: 1px solid var(--color-border, #2a2a4a);
		border-radius: 6px;
		overflow: hidden;

		summary {
			display: flex;
			gap: 0.75rem;
			align-items: center;
			padding: 0.75rem 1rem;
			cursor: pointer;
			font-size: 0.85rem;

			&:hover {
				background: rgba(255, 255, 255, 0.03);
			}
		}
	}

	&__ticket-id {
		font-weight: 600;
		min-width: 80px;
	}

	&__ticket-title {
		flex: 1;
		opacity: 0.8;
	}

	&__ticket-date {
		font-size: 0.8rem;
		opacity: 0.5;
	}

	&__breakdown-body {
		padding: 1rem;
		border-top: 1px solid var(--color-border, #2a2a4a);
		background: var(--color-card-bg, #1e1e3a);
	}

	&__summary {
		margin: 0 0 1rem;
		font-size: 0.9rem;
		opacity: 0.9;
	}

	&__comment {
		white-space: pre-wrap;
		font-size: 0.85rem;
		line-height: 1.6;
		margin: 0;
	}

	&__empty {
		opacity: 0.6;
	}
}

@keyframes spin {
	to { transform: rotate(360deg); }
}
</style>
