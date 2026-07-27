import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import sitemap from 'vite-plugin-sitemap'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    sitemap({
      hostname: 'https://2048board.xmit.dev/'
    })
  ]
})
