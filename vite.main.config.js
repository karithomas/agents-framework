import { defineConfig } from 'vite';
import {
	getBuildConfig,
	getBuildDefine,
	external,
	pluginHotRestart,
} from '@electron-forge/plugin-vite/dist/config/vite.base.config.js';

export default defineConfig((env) => {
	const forgeEnv = env;
	const { forgeConfigSelf } = forgeEnv;
	const define = getBuildDefine(forgeEnv);

	return {
		...getBuildConfig(forgeEnv),
		build: {
			lib: {
				entry: forgeConfigSelf.entry,
				fileName: () => '[name].js',
				formats: ['es'],
			},
			rollupOptions: {
				external: [...external, 'better-sqlite3', 'node-cron'],
			},
		},
		plugins: [pluginHotRestart('restart')],
		define,
		resolve: {
			mainFields: ['module', 'jsnext:main', 'jsnext'],
		},
	};
});
