<template>
	<div class="scotty-page">
		<h1>Scotty — Weekly Planner</h1>

		<!-- On-demand buttons -->
		<div class="scotty-page__actions">
			<button
				class="scotty-page__btn scotty-page__btn--primary"
				:disabled="running"
				@click="handleRun('weekly')"
			>
				<span v-if="running && runType === 'weekly'" class="scotty-page__spinner" />
				Build Weekly Plan
			</button>
			<button
				class="scotty-page__btn scotty-page__btn--secondary"
				:disabled="running"
				@click="handleRun('daily')"
			>
				<span v-if="running && runType === 'daily'" class="scotty-page__spinner" />
				Generate Daily Focus
			</button>
		</div>

		<div v-if="alert" class="scotty-page__alert" :class="`scotty-page__alert--${alert.type}`">
			{{ alert.message }}
		</div>

		<!-- Today's Focus -->
		<details
			v-if="dailyDigest"
			open
			class="scotty-page__section scotty-page__section--digest"
		>
			<summary class="scotty-page__section-summary">
				<span class="scotty-page__section-title">Today's Focus</span>
				<span class="scotty-page__meta">{{ formatDate(dailyDigest.digest_date) }}</span>
			</summary>
			<div class="scotty-page__plan-text scotty-page__plan-text--digest" v-html="renderedDigest" />
		</details>

		<!-- Current plan -->
		<details
			v-if="currentPlan"
			open
			class="scotty-page__section"
		>
			<summary class="scotty-page__section-summary">
				<span class="scotty-page__section-title">Current Weekly Plan</span>
				<span class="scotty-page__meta">Week of {{ formatDate(currentPlan.week_start) }}</span>
			</summary>
			<div class="scotty-page__plan-text" v-html="renderedPlan" />
		</details>
		<p v-else class="scotty-page__empty">
			No weekly plan yet. Click "Build Weekly Plan" to generate one.
		</p>

		<!-- History -->
		<section v-if="history.length > 1" class="scotty-page__history">
			<h2>Past Plans</h2>
			<details v-for="plan in history.slice(1)" :key="plan.id" class="scotty-page__section scotty-page__section--history">
				<summary class="scotty-page__section-summary">
					<span class="scotty-page__section-title">Week of {{ formatDate(plan.week_start) }}</span>
				</summary>
				<div class="scotty-page__plan-text" v-html="renderedHistory(plan)" />
			</details>
		</section>
	</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { marked } from 'marked';
import { runAgent, getLatestWeeklyPlan, getWeeklyPlanHistory, getLatestDailyDigest } from '../api.js';

const currentPlan = ref(null);
const dailyDigest = ref(null);
const history = ref([]);
const running = ref(false);
const runType = ref('');
const alert = ref(null);

const renderedPlan = computed(() => currentPlan.value ? marked.parse(currentPlan.value.plan_text) : '');
const renderedDigest = computed(() => dailyDigest.value ? marked.parse(dailyDigest.value.digest_text) : '');
function renderedHistory(plan) { return marked.parse(plan.plan_text); }

onMounted(async () => {
	currentPlan.value = await getLatestWeeklyPlan();
	dailyDigest.value = await getLatestDailyDigest();
	history.value = await getWeeklyPlanHistory(10);
});

async function handleRun(type) {
	running.value = true;
	runType.value = type;
	alert.value = null;

	try {
		const result = await runAgent('Scotty', type);
		if (result.status === 'success') {
			alert.value = { type: 'success', message: `Scotty ${type} completed successfully` };
			currentPlan.value = await getLatestWeeklyPlan();
			dailyDigest.value = await getLatestDailyDigest();
			history.value = await getWeeklyPlanHistory(10);
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
	return new Date(iso).toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}
</script>

<style lang="scss" scoped>
.scotty-page {
	h1 {
		margin: 0 0 1.5rem;
	}

	&__actions {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	&__btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.6rem 1.25rem;
		border: none;
		border-radius: 6px;
		font-size: 0.9rem;
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

	&__section {
		border: 1px solid var(--color-border, #2a2a4a);
		border-radius: 8px;
		margin-bottom: 1rem;
		overflow: hidden;

		&--digest {
			border-left: 3px solid var(--color-primary, #6366f1);
		}

		&--history {
			opacity: 0.7;

			&[open] { opacity: 1; }
		}
	}

	&__section-summary {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.85rem 1.15rem;
		cursor: pointer;
		list-style: none;

		&::-webkit-details-marker { display: none; }

		&::before {
			content: '▸';
			font-size: 0.75rem;
			transition: transform 0.15s ease;
		}

		details[open] > &::before {
			transform: rotate(90deg);
		}

		&:hover { background: rgba(255, 255, 255, 0.03); }
	}

	&__section-title {
		font-size: 1.05rem;
		font-weight: 600;
	}

	&__meta {
		font-size: 0.8rem;
		opacity: 0.5;
	}

	&__plan-text {
		background: var(--color-card-bg, #1e1e3a);
		border-top: 1px solid var(--color-border, #2a2a4a);
		padding: 1.5rem 1.75rem;
		font-size: 0.9rem;
		line-height: 1.7;

		:deep(h1), :deep(h2), :deep(h3) {
			margin: 1.25rem 0 0.4rem;
			font-size: 1rem;
			font-weight: 600;
			color: #a5b4fc;

			&:first-child { margin-top: 0; }
		}

		:deep(h1) { font-size: 1.1rem; }

		:deep(ul), :deep(ol) {
			margin: 0.4rem 0 0.75rem;
			padding-left: 1.4rem;

			li {
				margin-bottom: 0.3rem;
			}
		}

		:deep(p) {
			margin: 0 0 0.75rem;

			&:last-child { margin-bottom: 0; }
		}

		:deep(strong) { color: #e2e8f0; }

		:deep(hr) {
			border: none;
			border-top: 1px solid var(--color-border, #2a2a4a);
			margin: 1rem 0;
		}

		:deep(code) {
			background: rgba(99, 102, 241, 0.15);
			border-radius: 3px;
			padding: 0.1em 0.35em;
			font-size: 0.85em;
		}
	}

	&__empty {
		opacity: 0.6;
	}

	&__history {
		margin-top: 1rem;

		h2 {
			font-size: 1.1rem;
			margin: 0 0 1rem;
		}
	}
}

@keyframes spin {
	to { transform: rotate(360deg); }
}
</style>
