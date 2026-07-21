import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

const app = mount(App, {
  // The `!` non-null assertion is safe because the Svelte template always mounts into `#app`.
  target: document.getElementById('app')!,
})

export default app
