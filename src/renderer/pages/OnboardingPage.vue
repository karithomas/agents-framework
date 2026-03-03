<template>
	<div class="onboarding">
		<div class="onboarding__card">
			<h1 class="onboarding__title">Welcome to Agents Dashboard</h1>
			<p class="onboarding__subtitle">Let's set up your API keys to get started.</p>
			<div class="onboarding__privacy">
				<p>Your API keys are encrypted using your macOS Keychain and stored locally on this machine. They are never sent to any cloud service, analytics platform, or AI model — only used to connect directly to Linear and Slack.</p>
				<p>This is a one-time setup. Your keys are saved securely and persist across app restarts.</p>
			</div>

			<!-- Step 1: Linear -->
			<section v-if="step === 1" class="onboarding__step">
				<h2>Linear (required)</h2>
				<label class="onboarding__field">
					<span>API Key</span>
					<input
						v-model="form.linearApiKey"
						type="password"
						placeholder="lin_api_..."
						class="onboarding__input"
					/>
				</label>
				<label class="onboarding__field">
					<span>User ID</span>
					<input
						v-model="form.linearUserId"
						type="text"
						placeholder="UUID"
						class="onboarding__input"
					/>
				</label>
				<div class="onboarding__actions">
					<button
						class="onboarding__btn onboarding__btn--primary"
						:disabled="!form.linearApiKey || !form.linearUserId"
						@click="step = 2"
					>
						Next
					</button>
				</div>
			</section>

			<!-- Step 2: Slack (optional) -->
			<section v-if="step === 2" class="onboarding__step">
				<h2>Slack (optional)</h2>
				<label class="onboarding__toggle">
					<input v-model="slackEnabled" type="checkbox" />
					<span>Enable Slack notifications</span>
				</label>
				<template v-if="slackEnabled">
					<label class="onboarding__field">
						<span>Bot Token</span>
						<input
							v-model="form.slackBotToken"
							type="password"
							placeholder="xoxb-..."
							class="onboarding__input"
						/>
					</label>
					<label class="onboarding__field">
						<span>Signing Secret</span>
						<input
							v-model="form.slackSigningSecret"
							type="password"
							placeholder="Signing secret"
							class="onboarding__input"
						/>
					</label>
					<label class="onboarding__field">
						<span>Your User ID</span>
						<input
							v-model="form.slackUserId"
							type="text"
							placeholder="U..."
							class="onboarding__input"
						/>
					</label>
				</template>
				<div class="onboarding__actions">
					<button class="onboarding__btn" @click="step = 1">Back</button>
					<button class="onboarding__btn onboarding__btn--primary" @click="save">
						{{ saving ? 'Saving...' : 'Get Started' }}
					</button>
				</div>
			</section>

			<p v-if="error" class="onboarding__error">{{ error }}</p>
		</div>
	</div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { setSetting } from '../api.js';

const router = useRouter();
const step = ref(1);
const slackEnabled = ref(false);
const saving = ref(false);
const error = ref('');

const form = reactive({
	linearApiKey: '',
	linearUserId: '',
	slackBotToken: '',
	slackSigningSecret: '',
	slackUserId: '',
});

async function save() {
	saving.value = true;
	error.value = '';

	try {
		await setSetting('linear_api_key', form.linearApiKey);
		await setSetting('linear_user_id', form.linearUserId);
		await setSetting('slack_enabled', slackEnabled.value ? 'true' : 'false');

		if (slackEnabled.value) {
			await setSetting('slack_bot_token', form.slackBotToken);
			await setSetting('slack_signing_secret', form.slackSigningSecret);
			await setSetting('slack_user_id', form.slackUserId);
		}

		await setSetting('onboarding_complete', 'true');
		router.push('/');
	} catch (e) {
		error.value = e.message;
	} finally {
		saving.value = false;
	}
}
</script>

<style lang="scss" scoped>
.onboarding {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 100vh;
	padding: 2rem;

	&__card {
		max-width: 480px;
		width: 100%;
		background: var(--color-card-bg, #1e1e3a);
		border-radius: 12px;
		padding: 2.5rem;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
	}

	&__title {
		margin: 0 0 0.5rem;
		font-size: 1.5rem;
	}

	&__subtitle {
		margin: 0 0 2rem;
		opacity: 0.7;
	}

	&__privacy {
		background: rgba(99, 102, 241, 0.08);
		border: 1px solid rgba(99, 102, 241, 0.2);
		border-radius: 8px;
		padding: 0.75rem 1rem;
		margin-bottom: 1.5rem;
		font-size: 0.8rem;
		line-height: 1.5;
		opacity: 0.85;

		p { margin: 0; }
		p + p { margin-top: 0.5rem; }
	}

	&__step h2 {
		font-size: 1.1rem;
		margin: 0 0 1rem;
	}

	&__field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-bottom: 1rem;

		span {
			font-size: 0.85rem;
			opacity: 0.8;
		}
	}

	&__input {
		padding: 0.6rem 0.75rem;
		border: 1px solid var(--color-border, #3a3a5a);
		border-radius: 6px;
		background: var(--color-input-bg, #16162e);
		color: inherit;
		font-size: 0.9rem;

		&:focus {
			outline: none;
			border-color: var(--color-primary, #6366f1);
		}
	}

	&__toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
		cursor: pointer;
	}

	&__actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 1.5rem;
	}

	&__btn {
		padding: 0.6rem 1.25rem;
		border: 1px solid var(--color-border, #3a3a5a);
		border-radius: 6px;
		background: transparent;
		color: inherit;
		cursor: pointer;
		font-size: 0.9rem;

		&--primary {
			background: var(--color-primary, #6366f1);
			border-color: var(--color-primary, #6366f1);
			color: white;

			&:disabled {
				opacity: 0.5;
				cursor: not-allowed;
			}
		}
	}

	&__error {
		color: #ef4444;
		margin-top: 1rem;
		font-size: 0.85rem;
	}
}
</style>
