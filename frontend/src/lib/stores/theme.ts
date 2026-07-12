import { writable } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * VinMi multi-theme store.
 *
 * Themes are identified by a stable id that maps 1:1 to a `[data-theme="…"]`
 * block in `app.css`. To add a theme: add a palette block in app.css and a
 * descriptor here — nothing else needs to change.
 */
export type Theme = 'midnight' | 'daylight' | 'slate' | 'ocean' | 'sandstone';

export interface ThemeOption {
	id: Theme;
	label: string;
	mode: 'dark' | 'light';
	/** Representative accent used for the picker swatch. */
	swatch: string;
	description: string;
}

export const themes: ThemeOption[] = [
	{ id: 'midnight', label: 'Midnight', mode: 'dark', swatch: '#6366f1', description: 'Deep indigo enterprise' },
	{ id: 'daylight', label: 'Daylight', mode: 'light', swatch: '#4f46e5', description: 'Clean corporate light' },
	{ id: 'slate', label: 'Slate', mode: 'dark', swatch: '#38bdf8', description: 'Neutral charcoal' },
	{ id: 'ocean', label: 'Ocean', mode: 'dark', swatch: '#06b6d4', description: 'Deep marine teal' },
	{ id: 'sandstone', label: 'Sandstone', mode: 'light', swatch: '#b45309', description: 'Warm low-glare' }
];

const DEFAULT_THEME: Theme = 'midnight';
const STORAGE_KEY = 'vinmi-theme';
const validIds = new Set<Theme>(themes.map((t) => t.id));

/** Map legacy dark/light values (and unknown ids) onto the new theme set. */
function normalize(value: string | null): Theme {
	if (value === 'dark') return 'midnight';
	if (value === 'light') return 'daylight';
	if (value && validIds.has(value as Theme)) return value as Theme;
	return DEFAULT_THEME;
}

function apply(theme: Theme) {
	if (!browser) return;
	localStorage.setItem(STORAGE_KEY, theme);
	document.documentElement.setAttribute('data-theme', theme);
}

function createThemeStore() {
	const initial: Theme = browser
		? normalize(localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('theme'))
		: DEFAULT_THEME;

	const { subscribe, set, update } = writable<Theme>(initial);

	return {
		subscribe,
		/** Switch to a specific theme. */
		set: (theme: Theme) => {
			apply(theme);
			set(theme);
		},
		/** Cycle to the next theme in the list (used by the compact toggle). */
		toggle: () => {
			update((current) => {
				const idx = themes.findIndex((t) => t.id === current);
				const next = themes[(idx + 1) % themes.length].id;
				apply(next);
				return next;
			});
		},
		/** Hydrate from storage on mount. */
		init: () => {
			if (!browser) return;
			const theme = normalize(localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('theme'));
			apply(theme);
			set(theme);
		}
	};
}

export const theme = createThemeStore();
