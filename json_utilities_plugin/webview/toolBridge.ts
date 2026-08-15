/**
 * Bridges VS Code's editor to whichever tool is mounted.
 *
 * Tools in the toolkit do not share one markup shape: some render through
 * `ToolContainer` (`#tool-input` / readonly `#tool-output`), while many —
 * `JSONComparator`, `TextDiff`, `JSONValidator`, `RequestResponseDiff` — lay
 * out their own fields. Rather than hard-code 65 layouts, the bridge relies on
 * the one property they all share: a tool's editable text areas appear in the
 * DOM in the order the user is meant to fill them, and any read-only text area
 * is an output.
 *
 * That keeps the extension decoupled from tool internals — a new tool works
 * with no changes here.
 */

/**
 * Tools whose first editable field is not where the editor's text belongs.
 * Keyed by tool id, valued by the 0-based index of the field to seed.
 */
const PRIMARY_FIELD_OVERRIDES: Record<string, number> = {
	// Fields are [schema, data]; the editor's document is the data to check.
	'json-schema-validator': 1
};

function editableTextareas(): HTMLTextAreaElement[] {
	return Array.from(document.querySelectorAll<HTMLTextAreaElement>('textarea')).filter(
		(field) => !field.readOnly && !field.disabled
	);
}

/**
 * Set a field's value the way a keystroke would.
 *
 * Assigning `.value` updates the DOM but not the component, so the value goes
 * through the native setter and is announced with an `input` event, which is
 * what Svelte's `bind:value` listens for.
 */
function fill(field: HTMLTextAreaElement, text: string): void {
	const setter = Object.getOwnPropertyDescriptor(
		HTMLTextAreaElement.prototype,
		'value'
	)?.set;
	setter?.call(field, text);

	field.dispatchEvent(new Event('input', { bubbles: true }));
	field.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Seed the mounted tool. `secondary` fills the next editable field, which is
 * how the two-pane tools (compare, text diff) receive their right-hand side.
 * Returns false when the tool has no editable field — generators, for example.
 */
export function seedTool(
	toolId: string,
	primary: string,
	secondary?: string
): boolean {
	const fields = editableTextareas();
	if (!fields.length) return false;

	const primaryIndex = PRIMARY_FIELD_OVERRIDES[toolId] ?? 0;
	const primaryField = fields[primaryIndex] ?? fields[0];

	if (primary) fill(primaryField, primary);

	if (secondary) {
		const secondaryField = fields.find((field) => field !== primaryField);
		if (secondaryField) fill(secondaryField, secondary);
	}

	return true;
}

/**
 * Read the tool's result. `ToolContainer` tools expose it as the read-only
 * `#tool-output`; others render results as markup, so fall back to any
 * read-only text area before giving up.
 */
export function getToolOutput(): string {
	const named = document.querySelector<HTMLTextAreaElement>('#tool-output');
	if (named?.value) return named.value;

	const readonlyField = Array.from(
		document.querySelectorAll<HTMLTextAreaElement>('textarea')
	).find((field) => field.readOnly && field.value.trim());

	return readonlyField?.value ?? '';
}

/**
 * Tools mount asynchronously, so seeding retries across a few animation frames
 * rather than racing the first paint.
 */
export function seedToolWhenReady(
	toolId: string,
	primary: string,
	secondary?: string,
	attempts = 30
): void {
	if (!primary && !secondary) return;

	const attempt = (remaining: number) => {
		if (seedTool(toolId, primary, secondary) || remaining <= 0) return;
		requestAnimationFrame(() => attempt(remaining - 1));
	};

	attempt(attempts);
}
