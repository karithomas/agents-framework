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
				Send Daily Digest
			</button>
		</div>

		<div v-if="alert" class="scotty-page__alert" :class="`scotty-page__alert--${alert.type}`">
			{{ alert.message }}
		</div>

		<!-- Today's Focus -->
		<section v-if="dailyDigest" class="scotty-page__digest">
			<h2>Today's Focus</h2>
			<p class="scotty-page__meta">{{ formatDate(dailyDigest.digest_date) }}</p>
			<div class="scotty-page__plan-text">{{ dailyDigest.digest_text }}</div>
		</section>

		<!-- Current plan -->
		<section v-if="currentPlan" class="scotty-page__plan">
			<h2>Current Weekly Plan</h2>
			<p class="scotty-page__meta">Week of {{ formatDate(currentPlan.week_start) }}</p>
			<div class="scotty-page__plan-text">{{ currentPlan.plan_text }}</div>
		</section>
		<p v-else class="scotty-page__empty">
			No weekly plan yet. Click "Build Weekly Plan" to generate one.
		</p>

		<!-- History -->
		<section v-if="history.length > 1" class="scotty-page__history">
			<h2>Past Plans</h2>
			<details v-for="plan in history.slice(1)" :key="plan.id" class="scotty-page__history-item">
				<summary>Week of {{ formatDate(plan.week_start) }}</summary>
				<div class="scotty-page__plan-text">{{ plan.plan_text }}</div>
			</details>
		</section>
	</div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { runAgent, getLatestWeeklyPlan, getWeeklyPlanHistory, getLatestDailyDigest } from '../api.js';

const currentPlan = ref(null);
const dailyDigest = ref(null);
const history = ref([]);
const running = ref(false);
const runType = ref('');
const alert = ref(null);

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

	&__digest {
		margin-bottom: 2rem;

		h2 {
			font-size: 1.1rem;
			margin: 0 0 0.5rem;
		}
	}

	&__plan {
		h2 {
			font-size: 1.1rem;
			margin: 0 0 0.5rem;
		}
	}

	&__meta {
		font-size: 0.8rem;
		opacity: 0.6;
		margin: 0 0 1rem;
	}

	&__plan-text {
		background: var(--color-card-bg, #1e1e3a);
		border: 1px solid var(--color-border, #2a2a4a);
		border-radius: 8px;
		padding: 1.25rem;
		white-space: pre-wrap;
		font-size: 0.9rem;
		line-height: 1.6;
	}

	&__empty {
		opacity: 0.6;
	}

	&__history {
		margin-top: 2rem;

		h2 {
			font-size: 1.1rem;
			margin: 0 0 1rem;
		}
	}

	&__history-item {
		margin-bottom: 0.75rem;

		summary {
			cursor: pointer;
			padding: 0.5rem 0;
			font-size: 0.9rem;
			opacity: 0.8;

			&:hover { opacity: 1; }
		}
	}
}

@keyframes spin {
	to { transform: rotate(360deg); }
}
</style>
