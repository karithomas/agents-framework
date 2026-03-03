import { VitePlugin } from '@electron-forge/plugin-vite';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';

export default {
	packagerConfig: {
		asar: {
			unpack: '**/*.node',
		},
		name: 'Agents Dashboard',
	},
	makers: [
		{
			name: '@electron-forge/maker-dmg',
			config: {
				format: 'ULFO',
			},
		},
	],
	plugins: [
		new AutoUnpackNativesPlugin({}),
		new VitePlugin({
			build: [
				{
					entry: 'src/main/main.js',
					config: 'vite.main.config.js',
					target: 'main',
				},
				{
					entry: 'src/main/preload.js',
					config: 'vite.preload.config.js',
					target: 'preload',
				},
			],
			renderer: [
				{
					name: 'main_window',
					config: 'vite.renderer.config.js',
				},
			],
		}),
	],
};
