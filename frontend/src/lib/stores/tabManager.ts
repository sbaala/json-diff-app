import { writable, type Writable } from 'svelte/store';

export interface Tab<T> {
	id: string;
	name: string;
	state: T;
	isEditing?: boolean;
}

export interface TabManagerState<T> {
	tabs: Tab<T>[];
	activeTabId: string;
}

export function createTabManager<T>(
	defaultTabState: T,
	tabName = 'Tab 1'
): Writable<TabManagerState<T>> & {
	addTab: (state?: T, name?: string) => void;
	removeTab: (id: string) => void;
	setActiveTab: (id: string) => void;
	updateTabState: (id: string, state: T) => void;
	renameTab: (id: string, newName: string) => void;
	getActiveTab: () => Tab<T> | undefined;
} {
	const generateId = () => `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

	const initialTab: Tab<T> = {
		id: generateId(),
		name: tabName,
		state: { ...defaultTabState }
	};

	const store = writable<TabManagerState<T>>({
		tabs: [initialTab],
		activeTabId: initialTab.id
	});

	const addTab = (state?: T, name?: string) => {
		const newTab: Tab<T> = {
			id: generateId(),
			name: name || `Tab ${Math.random().toString().slice(-1)}`,
			state: state ? { ...state } : { ...defaultTabState }
		};

		store.update((current) => ({
			...current,
			tabs: [...current.tabs, newTab],
			activeTabId: newTab.id
		}));
	};

	const removeTab = (id: string) => {
		store.update((current) => {
			const newTabs = current.tabs.filter((tab) => tab.id !== id);
			if (newTabs.length === 0) {
				// Always keep at least one tab
				const fallbackTab: Tab<T> = {
					id: generateId(),
					name: 'Tab 1',
					state: { ...defaultTabState }
				};
				newTabs.push(fallbackTab);
			}

			let newActiveId = current.activeTabId;
			if (newActiveId === id) {
				newActiveId = newTabs[newTabs.length - 1]?.id || '';
			}

			return {
				tabs: newTabs,
				activeTabId: newActiveId
			};
		});
	};

	const setActiveTab = (id: string) => {
		store.update((current) => ({
			...current,
			activeTabId: id
		}));
	};

	const updateTabState = (id: string, state: T) => {
		store.update((current) => ({
			...current,
			tabs: current.tabs.map((tab) => (tab.id === id ? { ...tab, state } : tab))
		}));
	};

	const renameTab = (id: string, newName: string) => {
		store.update((current) => ({
			...current,
			tabs: current.tabs.map((tab) =>
				tab.id === id ? { ...tab, name: newName, isEditing: false } : tab
			)
		}));
	};

	const getActiveTab = () => {
		let result: Tab<T> | undefined;
		store.subscribe((current) => {
			result = current.tabs.find((tab) => tab.id === current.activeTabId);
		})();
		return result;
	};

	return Object.assign(store, {
		addTab,
		removeTab,
		setActiveTab,
		updateTabState,
		renameTab,
		getActiveTab
	});
}
