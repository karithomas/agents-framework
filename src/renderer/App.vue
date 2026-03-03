<template>
	<div class="app-layout">
		<NavSidebar v-if="showSidebar" />
		<main class="app-main">
			<router-view />
		</main>
	</div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import NavSidebar from './components/NavSidebar.vue';

const route = useRoute();
const showSidebar = computed(() => route.name !== 'onboarding');
</script>

<style lang="scss" scoped>
.app-layout {
	display: flex;
	height: 100vh;
	overflow: hidden;
}

.app-main {
	flex: 1;
	overflow-y: auto;
	padding: 2rem;
}
</style>
