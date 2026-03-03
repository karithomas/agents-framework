import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { fileURLToPath } from 'url';
import { pluginExposeRenderer } from '@electron-forge/plugin-vite/dist/config/vite.base.config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig((env) => {
	const forgeEnv = env;
	const { root, mode, forgeConfigSelf } = forgeEnv;
	const name = forgeConfigSelf.name ?? '';

	return {
		root: path.resolve(__dirname, 'src/renderer'),
		mode,
		base: './',
		build: {
			outDir: path.resolve(__dirname, `.vite/renderer/${name}`),
		},
		plugins: [pluginExposeRenderer(name), vue()],
		resolve: {
			alias: {
				'@': path.resolve(__dirname, 'src/renderer'),
				'@sideline': path.resolve(__dirname, 'src/components/universal-resources/sideline/src/sideline'),
			},
			preserveSymlinks: true,
		},
		css: {
			preprocessorOptions: {
				scss: {},
			},
		},
		clearScreen: false,
	};
});
