import { defineConfig } from 'vite';
import {
	getBuildConfig,
	getBuildDefine,
	external,
	pluginHotRestart,
} from '@electron-forge/plugin-vite/dist/config/vite.base.config.js';

export default defineConfig((env) => {
	const forgeEnv = env;
	const define = getBuildDefine(forgeEnv);

	return {
		...getBuildConfig(forgeEnv),
		build: {
			rollupOptions: {
				external,
			},
		},
		plugins: [pluginHotRestart('reload')],
		define,
	};
});
