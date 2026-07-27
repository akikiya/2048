import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import sitemap from 'vite-plugin-sitemap';

export default defineConfig({
	plugins: [sveltekit(), sitemap({
		hostname: 'https://2048board.xmit.dev/',
		// adapter-static outputs to `build/` by default
    outDir: 'build',
    generateRobotsTxt: false
	})],
	clearScreen: false
});
