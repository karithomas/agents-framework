<template>
	<div class="lenny-page">
		<h1>Lenny — Ticket Drafter</h1>

		<!-- Options -->
		<label class="lenny-page__toggle">
			<input
				type="checkbox"
				:checked="postToLinear"
				@change="togglePostToLinear"
			/>
			<span>Post breakdowns as comments on Linear tickets</span>
		</label>

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
		</div>
		<div class="lenny-page__actions">
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
					Process Single Ticket
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
				<details
					v-for="bd in breakdowns"
					:key="bd.id"
					:open="expandedId === bd.ticket_id"
					class="lenny-page__breakdown"
					:class="{ 'lenny-page__breakdown--completed': bd.completed }"
					@toggle="onToggle($event, bd.ticket_id)"
				>
					<summary class="lenny-page__summary-row">
						<label
							class="lenny-page__checkbox"
							@click.stop
						>
							<input
								type="checkbox"
								:checked="!!bd.completed"
								@change="toggleCompleted(bd)"
							/>
						</label>
						<span class="lenny-page__ticket-id">{{ bd.ticket_id }}</span>
						<span class="lenny-page__ticket-title">{{ bd.ticket_title }}</span>
						<span class="lenny-page__ticket-date">{{ formatDate(bd.created_at) }}</span>
					</summary>
					<div class="lenny-page__breakdown-body">
						<p class="lenny-page__ticket-summary">{{ bd.summary }}</p>
						<a
							:href="linearTicketUrl(bd.ticket_id)"
							target="_blank"
							rel="noopener"
							class="lenny-page__linear-link"
						>
							View in Linear
						</a>
						<div v-if="bd.comment_md" class="lenny-page__comment" v-html="renderMarkdown(bd.comment_md)" />
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
import { runAgent, getTicketBreakdowns, processTicket, setTicketCompleted, getSetting, setSetting } from '../api.js';

const breakdowns = ref([]);
const ticketId = ref('');
const running = ref(false);
const runType = ref('');
const alert = ref(null);
const expandedId = ref(null);
const postToLinear = ref(false);

onMounted(async () => {
	breakdowns.value = await getTicketBreakdowns(50);
	postToLinear.value = (await getSetting('lenny_post_to_linear')) === 'true';
});

async function togglePostToLinear() {
	postToLinear.value = !postToLinear.value;
	await setSetting('lenny_post_to_linear', postToLinear.value ? 'true' : 'false');
}

function onToggle(event, id) {
	if (event.target.open) {
		expandedId.value = id;
		// Close all other details elements
		for (const bd of breakdowns.value) {
			if (bd.ticket_id !== id) {
				const el = event.target.parentElement?.querySelector(
					`details[data-id="${bd.ticket_id}"]`
				);
				if (el) el.open = false;
			}
		}
	} else if (expandedId.value === id) {
		expandedId.value = null;
	}
}

async function toggleCompleted(bd) {
	const newVal = !bd.completed;
	bd.completed = newVal ? 1 : 0;
	await setTicketCompleted(bd.ticket_id, newVal);
}

function linearTicketUrl(ticketId) {
	const [team, num] = ticketId.split('-');
	return `https://linear.app/issue/${ticketId}`;
}

function renderMarkdown(md) {
	// Lightweight markdown rendering for the breakdown comment
	return md
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/^## (.+)$/gm, '<h3>$1</h3>')
		.replace(/^### (\d+\. .+)$/gm, '<h4>$1</h4>')
		.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
		.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
		.replace(/^- \[ \] (.+)$/gm, '<div class="lenny-page__checklist-item">$1</div>')
		.replace(/^---$/gm, '<hr />')
		.replace(/\n\n/g, '<br />');
}

async function handleProcessAll() {
	running.value = true;
	runType.value = 'all';
	alert.value = null;

	try {
		const result = await runAgent('Lenny', 'process_all');
		if (result.status === 'success') {
			alert.value = { type: 'success', message: 'Lenny finished processing all active tickets' };
			breakdowns.value = await getTicketBreakdowns(50);
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
			breakdowns.value = await getTicketBreakdowns(50);
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

	&__toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1.25rem;
		font-size: 0.85rem;
		cursor: pointer;
		opacity: 0.85;

		input[type="checkbox"] {
			cursor: pointer;
			accent-color: var(--color-primary, #6366f1);
		}
	}

	&__actions {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		flex-wrap: wrap;
		margin-bottom: 0.75rem;
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
		margin-top: 0.75rem;

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

		&--completed {
			opacity: 0.5;
		}

		&--completed &-body {
			opacity: 0.7;
		}
	}

	&__summary-row {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		padding: 0.75rem 1rem;
		cursor: pointer;
		font-size: 0.85rem;
		list-style: none;

		&::-webkit-details-marker {
			display: none;
		}

		&::before {
			content: '▸';
			font-size: 0.75rem;
			transition: transform 0.15s ease;
		}

		details[open] > &::before {
			transform: rotate(90deg);
		}

		&:hover {
			background: rgba(255, 255, 255, 0.03);
		}
	}

	&__checkbox {
		display: flex;
		align-items: center;
		cursor: pointer;

		input[type="checkbox"] {
			width: 16px;
			height: 16px;
			cursor: pointer;
			accent-color: var(--color-primary, #6366f1);
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
		padding: 1.25rem;
		border-top: 1px solid var(--color-border, #2a2a4a);
		background: var(--color-card-bg, #1e1e3a);
	}

	&__ticket-summary {
		margin: 0 0 0.75rem;
		font-size: 0.9rem;
		opacity: 0.9;
		line-height: 1.5;
	}

	&__linear-link {
		display: inline-block;
		margin-bottom: 1rem;
		color: var(--color-primary, #6366f1);
		font-size: 0.85rem;
		text-decoration: none;

		&:hover {
			text-decoration: underline;
		}
	}

	&__comment {
		font-size: 0.85rem;
		line-height: 1.7;

		:deep(h3) {
			font-size: 1rem;
			margin: 1.25rem 0 0.5rem;

			&:first-child { margin-top: 0; }
		}

		:deep(h4) {
			font-size: 0.9rem;
			margin: 1rem 0 0.25rem;
		}

		:deep(blockquote) {
			border-left: 3px solid var(--color-primary, #6366f1);
			padding-left: 0.75rem;
			margin: 0.5rem 0;
			opacity: 0.85;
		}

		:deep(hr) {
			border: none;
			border-top: 1px solid var(--color-border, #2a2a4a);
			margin: 1rem 0;
		}

		:deep(.lenny-page__checklist-item) {
			padding: 0.2rem 0 0.2rem 1.25rem;
			position: relative;

			&::before {
				content: '☐';
				position: absolute;
				left: 0;
			}
		}
	}

	&__empty {
		opacity: 0.6;
	}
}

@keyframes spin {
	to { transform: rotate(360deg); }
}
</style>
