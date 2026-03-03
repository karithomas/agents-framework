import { createRouter, createWebHashHistory } from 'vue-router';
import DashboardPage from './pages/DashboardPage.vue';
import ScottyPage from './pages/ScottyPage.vue';
import LennyPage from './pages/LennyPage.vue';
import SettingsPage from './pages/SettingsPage.vue';
import OnboardingPage from './pages/OnboardingPage.vue';
import { isOnboarded } from './api.js';

const routes = [
	{ path: '/', name: 'dashboard', component: DashboardPage },
	{ path: '/scotty', name: 'scotty', component: ScottyPage },
	{ path: '/lenny', name: 'lenny', component: LennyPage },
	{ path: '/settings', name: 'settings', component: SettingsPage },
	{ path: '/onboarding', name: 'onboarding', component: OnboardingPage },
];

const router = createRouter({
	history: createWebHashHistory(),
	routes,
});

// Redirect to onboarding if not set up yet
router.beforeEach(async (to) => {
	if (to.name !== 'onboarding') {
		const onboarded = await isOnboarded();
		if (!onboarded) {
			return { name: 'onboarding' };
		}
	}
});

export default router;
