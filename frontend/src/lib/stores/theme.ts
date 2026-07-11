import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'dark' | 'light';

function createThemeStore() {
	const defaultTheme: Theme = 'dark';
	
	// Get initial theme from localStorage or default
	const initialTheme: Theme = browser 
		? (localStorage.getItem('theme') as Theme) || defaultTheme 
		: defaultTheme;
	
	const { subscribe, set, update } = writable<Theme>(initialTheme);
	
	return {
		subscribe,
		set: (theme: Theme) => {
			if (browser) {
				localStorage.setItem('theme', theme);
				document.documentElement.setAttribute('data-theme', theme);
			}
			set(theme);
		},
		toggle: () => {
			update(current => {
				const newTheme = current === 'dark' ? 'light' : 'dark';
				if (browser) {
					localStorage.setItem('theme', newTheme);
					document.documentElement.setAttribute('data-theme', newTheme);
				}
				return newTheme;
			});
		},
		init: () => {
			if (browser) {
				const saved = localStorage.getItem('theme') as Theme;
				const theme = saved || defaultTheme;
				document.documentElement.setAttribute('data-theme', theme);
				set(theme);
			}
		}
	};
}

export const theme = createThemeStore();
