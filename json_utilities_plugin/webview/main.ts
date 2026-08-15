import { mount } from 'svelte';
// The toolkit's design tokens and base styles, reused verbatim so panels look
// exactly like the web app in all five themes.
import '../../frontend/src/app.css';
import App from './App.svelte';

const target = document.getElementById('app');
if (!target) throw new Error('Webview root #app is missing.');

mount(App, { target });
