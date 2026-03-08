<template>
	<div class="settings-page">
		<h1>Settings</h1>

		<!-- Agent Management (dynamic from registry) -->
		<section class="settings-page__section">
			<h2>Agents</h2>
			<div v-for="agent in agents" :key="agent.name" class="settings-page__agent-row">
				<div class="settings-page__agent-info">
					<strong>{{ agent.name }}</strong>
					<span>{{ agent.description }}</span>
				</div>
				<label class="settings-page__toggle">
					<input
						type="checkbox"
						:checked="agentEnabledMap[agent.name]"
						@change="toggleAgent(agent.name, $event.target.checked)"
					/>
					<span>{{ agentEnabledMap[agent.name] ? 'Enabled' : 'Disabled' }}</span>
				</label>
				<div v-if="agent.schedules.length" class="settings-page__schedules">
					<span v-for="s in agent.schedules" :key="s.key" class="settings-page__schedule-badge">
						{{ s.label }}
					</span>
				</div>
			</div>
		</section>

		<!-- Schedules -->
		<section class="settings-page__section">
			<h2>Schedules</h2>
			<p class="settings-page__schedule-info">Agents run automatically on their schedules while the app is open.</p>
			<div v-if="scheduleConfigs.length" class="settings-page__schedule-list">
				<div v-for="sc in scheduleConfigs" :key="`${sc.agentName}:${sc.scheduleKey}`" class="settings-page__schedule-card">
					<div class="settings-page__schedule-header">
						<span class="settings-page__schedule-label">{{ sc.displayName }}</span>
						<button
							v-if="sc.isCustom"
							class="settings-page__link"
							@click="handleResetSchedule(sc.agentName, sc.scheduleKey)"
						>
							Reset to default
						</button>
					</div>

					<!-- Calendar schedule (has days) -->
					<template v-if="sc.config.days">
						<div class="settings-page__day-row">
							<label
								v-for="(dayLabel, dayIndex) in dayLabels"
								:key="dayIndex"
								class="settings-page__day-toggle"
								:class="{ 'settings-page__day-toggle--active': sc.config.days.includes(dayIndex) }"
							>
								<input
									type="checkbox"
									:checked="sc.config.days.includes(dayIndex)"
									@change="toggleDay(sc, dayIndex)"
								/>
								{{ dayLabel }}
							</label>
						</div>
						<div class="settings-page__time-row">
							<span>Time:</span>
							<input
								type="time"
								:value="formatTime(sc.config.hour, sc.config.minute)"
								class="settings-page__input settings-page__input--time"
								@change="updateTime(sc, $event.target.value)"
							/>
						</div>
					</template>

					<!-- Interval schedule (has intervalMinutes) -->
					<template v-else-if="sc.config.intervalMinutes != null">
						<div class="settings-page__interval-row">
							<span>Every</span>
							<input
								type="number"
								:value="sc.config.intervalMinutes"
								min="1"
								max="1440"
								class="settings-page__input settings-page__input--interval"
								@change="updateInterval(sc, parseInt($event.target.value, 10))"
							/>
							<span>minutes</span>
						</div>
					</template>
				</div>
			</div>
		</section>

		<!-- Credentials -->
		<section class="settings-page__section">
			<h2>Credentials</h2>

			<h3>Linear</h3>
			<label class="settings-page__field">
				<span>API Key</span>
				<input
					v-model="creds.linearApiKey"
					type="password"
					class="settings-page__input"
					@blur="saveSetting('linear_api_key', creds.linearApiKey)"
				/>
			</label>
			<label class="settings-page__field">
				<span>User ID</span>
				<input
					v-model="creds.linearUserId"
					type="text"
					class="settings-page__input"
					@blur="saveSetting('linear_user_id', creds.linearUserId)"
				/>
			</label>

			<h3>Slack</h3>
			<label class="settings-page__toggle">
				<input
					type="checkbox"
					:checked="slackEnabled"
					@change="toggleSlack($event.target.checked)"
				/>
				<span>Enable Slack notifications</span>
			</label>
			<template v-if="slackEnabled">
				<label class="settings-page__field">
					<span>Bot Token</span>
					<input
						v-model="creds.slackBotToken"
						type="password"
						class="settings-page__input"
						@blur="saveSetting('slack_bot_token', creds.slackBotToken)"
					/>
				</label>
				<label class="settings-page__field">
					<span>Signing Secret</span>
					<input
						v-model="creds.slackSigningSecret"
						type="password"
						class="settings-page__input"
						@blur="saveSetting('slack_signing_secret', creds.slackSigningSecret)"
					/>
				</label>
				<label class="settings-page__field">
					<span>User ID</span>
					<input
						v-model="creds.slackUserId"
						type="text"
						class="settings-page__input"
						@blur="saveSetting('slack_user_id', creds.slackUserId)"
					/>
				</label>
			</template>
		</section>

		<!-- Reset -->
		<section class="settings-page__section">
			<h2>Reset</h2>
			<p class="settings-page__reset-desc">Delete all data — credentials, plans, digests, breakdowns, and run history — and return to onboarding.</p>
			<button
				v-if="!confirmingReset"
				class="settings-page__btn settings-page__btn--danger"
				@click="confirmingReset = true"
			>
				Reset All Data
			</button>
			<div v-else class="settings-page__reset-confirm">
				<span>Are you sure? This cannot be undone.</span>
				<button class="settings-page__btn settings-page__btn--danger" @click="handleReset">
					Yes, delete everything
				</button>
				<button class="settings-page__btn" @click="confirmingReset = false">
					Cancel
				</button>
			</div>
		</section>

		<div v-if="alert" class="settings-page__alert" :class="`settings-page__alert--${alert.type}`">
			{{ alert.message }}
		</div>
	</div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
	getAgents,
	isAgentEnabled,
	setAgentEnabled,
	getSetting,
	setSetting,
	getScheduleConfigs,
	setScheduleConfig,
	resetScheduleConfig,
	resetAllData,
} from '../api.js';

const router = useRouter();
const agents = ref([]);
const agentEnabledMap = reactive({});
const scheduleConfigs = ref([]);
const slackEnabled = ref(false);
const alert = ref(null);
const confirmingReset = ref(false);
const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const creds = reactive({
	linearApiKey: '',
	linearUserId: '',
	slackBotToken: '',
	slackSigningSecret: '',
	slackUserId: '',
});

onMounted(async () => {
	agents.value = await getAgents();

	for (const agent of agents.value) {
		agentEnabledMap[agent.name] = await isAgentEnabled(agent.name);
	}

	scheduleConfigs.value = await getScheduleConfigs();
	slackEnabled.value = (await getSetting('slack_enabled')) === 'true';

	creds.linearApiKey = (await getSetting('linear_api_key')) || '';
	creds.linearUserId = (await getSetting('linear_user_id')) || '';
	creds.slackBotToken = (await getSetting('slack_bot_token')) || '';
	creds.slackSigningSecret = (await getSetting('slack_signing_secret')) || '';
	creds.slackUserId = (await getSetting('slack_user_id')) || '';
});

async function toggleAgent(name, enabled) {
	await setAgentEnabled(name, enabled);
	agentEnabledMap[name] = enabled;
}

async function toggleSlack(enabled) {
	slackEnabled.value = enabled;
	await setSetting('slack_enabled', enabled ? 'true' : 'false');
}

async function saveSetting(key, value) {
	await setSetting(key, value);
}

function formatTime(hour, minute) {
	return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

async function saveSchedule(sc) {
	const config = JSON.parse(JSON.stringify(sc.config));
	await setScheduleConfig(sc.agentName, sc.scheduleKey, config);
	sc.isCustom = true;
	showAlert('success', 'Schedule updated');
}

function toggleDay(sc, dayIndex) {
	const days = [...sc.config.days];
	const idx = days.indexOf(dayIndex);
	if (idx >= 0) {
		days.splice(idx, 1);
	} else {
		days.push(dayIndex);
		days.sort((a, b) => a - b);
	}
	if (days.length === 0) return; // must have at least one day
	sc.config.days = days;
	saveSchedule(sc);
}

function updateTime(sc, timeStr) {
	const [h, m] = timeStr.split(':').map(Number);
	sc.config.hour = h;
	sc.config.minute = m;
	saveSchedule(sc);
}

function updateInterval(sc, minutes) {
	if (!minutes || minutes < 1) return;
	sc.config.intervalMinutes = minutes;
	saveSchedule(sc);
}

async function handleResetSchedule(agentName, scheduleKey) {
	await resetScheduleConfig(agentName, scheduleKey);
	scheduleConfigs.value = await getScheduleConfigs();
	showAlert('success', 'Schedule reset to default');
}

function showAlert(type, message) {
	alert.value = { type, message };
	setTimeout(() => { alert.value = null; }, 3000);
}

async function handleReset() {
	await resetAllData();
	router.push('/onboarding');
}

</script>

<style lang="scss" scoped>
.settings-page {
	h1 { margin: 0 0 1.5rem; }
	h2 { font-size: 1.1rem; margin: 0 0 1rem; }
	h3 { font-size: 0.95rem; margin: 1.25rem 0 0.75rem; opacity: 0.9; }

	&__section {
		margin-bottom: 2.5rem;
	}

	&__agent-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 0;
		border-bottom: 1px solid var(--color-border, #2a2a4a);
	}

	&__agent-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;

		span { font-size: 0.8rem; opacity: 0.7; }
	}

	&__toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-size: 0.85rem;
	}

	&__schedules {
		display: flex;
		gap: 0.4rem;
	}

	&__schedule-badge {
		font-size: 0.75rem;
		padding: 0.15rem 0.5rem;
		border-radius: 4px;
		background: var(--color-card-bg, #1e1e3a);
		opacity: 0.7;
	}

	&__schedule-info {
		font-size: 0.85rem;
		opacity: 0.7;
		margin: 0 0 1rem;
	}

	&__schedule-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	&__schedule-card {
		padding: 1rem;
		border: 1px solid var(--color-border, #2a2a4a);
		border-radius: 8px;
		background: var(--color-card-bg, #1e1e3a);
	}

	&__schedule-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}

	&__schedule-label {
		font-weight: 600;
		font-size: 0.9rem;
	}

	&__link {
		background: none;
		border: none;
		color: var(--color-primary, #6366f1);
		cursor: pointer;
		font-size: 0.8rem;
		padding: 0;

		&:hover { text-decoration: underline; }
	}

	&__day-row {
		display: flex;
		gap: 0.35rem;
		margin-bottom: 0.75rem;
	}

	&__day-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2rem;
		border: 1px solid var(--color-border, #3a3a5a);
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.75rem;
		user-select: none;
		background: transparent;

		input { display: none; }

		&--active {
			background: var(--color-primary, #6366f1);
			border-color: var(--color-primary, #6366f1);
			color: #fff;
		}
	}

	&__time-row,
	&__interval-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
	}

	&__input--time {
		max-width: 120px;
	}

	&__input--interval {
		max-width: 80px;
		text-align: center;
	}

	&__field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-bottom: 0.75rem;

		span { font-size: 0.8rem; opacity: 0.7; }
	}

	&__input {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-border, #3a3a5a);
		border-radius: 6px;
		background: var(--color-input-bg, #16162e);
		color: inherit;
		font-size: 0.85rem;
		max-width: 400px;

		&:focus {
			outline: none;
			border-color: var(--color-primary, #6366f1);
		}
	}

	&__btn {
		padding: 0.5rem 1rem;
		border: 1px solid var(--color-border, #3a3a5a);
		border-radius: 6px;
		background: transparent;
		color: inherit;
		cursor: pointer;
		font-size: 0.85rem;

		&:hover { background: rgba(255, 255, 255, 0.05); }
		&--danger { border-color: #ef4444; color: #fca5a5; }
		&--danger:hover { background: rgba(239, 68, 68, 0.1); }
	}

	&__reset-desc {
		font-size: 0.85rem;
		opacity: 0.7;
		margin: 0 0 1rem;
	}

	&__reset-confirm {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.85rem;

		span { opacity: 0.9; }
	}

	&__alert {
		padding: 0.75rem 1rem;
		border-radius: 6px;
		font-size: 0.85rem;

		&--success { background: #065f46; color: #6ee7b7; }
		&--error { background: #7f1d1d; color: #fca5a5; }
	}
}
</style>
