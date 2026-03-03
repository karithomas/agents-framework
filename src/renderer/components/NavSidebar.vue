<template>
	<nav class="nav-sidebar">
		<div class="nav-sidebar__header">
			<h2 class="nav-sidebar__title">Agents</h2>
		</div>
		<ul class="nav-sidebar__list">
			<li v-for="item in navItems" :key="item.to">
				<router-link
					:to="item.to"
					class="nav-sidebar__link"
					active-class="nav-sidebar__link--active"
				>
					<span class="nav-sidebar__icon">{{ item.icon }}</span>
					<span class="nav-sidebar__label">{{ item.label }}</span>
				</router-link>
			</li>
		</ul>
	</nav>
</template>

<script setup>
const navItems = [
	{ to: '/', label: 'Dashboard', icon: '📊' },
	{ to: '/scotty', label: 'Scotty', icon: '🗓' },
	{ to: '/lenny', label: 'Lenny', icon: '🎟' },
	{ to: '/settings', label: 'Settings', icon: '⚙️' },
];
</script>

<style lang="scss" scoped>
.nav-sidebar {
	width: 220px;
	min-width: 220px;
	background: var(--color-sidebar-bg, #1a1a2e);
	color: var(--color-sidebar-text, #e0e0e0);
	display: flex;
	flex-direction: column;
	border-right: 1px solid var(--color-border, #2a2a4a);

	&__header {
		padding: 1.5rem 1rem 1rem;
	}

	&__title {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0;
	}

	&__list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	&__link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		text-decoration: none;
		color: inherit;
		transition: background 0.15s;

		&:hover {
			background: var(--color-sidebar-hover, rgba(255, 255, 255, 0.05));
		}

		&--active {
			background: var(--color-sidebar-active, rgba(255, 255, 255, 0.1));
			font-weight: 600;
		}
	}

	&__icon {
		font-size: 1.1rem;
	}

	&__label {
		font-size: 0.9rem;
	}
}
</style>
