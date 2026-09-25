/**
 * One-shot in-memory handoff for sending two JSON documents to the Compare page
 * (e.g. from Viewer tabs). Kept in memory rather than sessionStorage so large
 * documents (up to the 50MB limit) aren't capped by storage quotas.
 */
export interface CompareHandoff {
	left: string;
	right: string;
}

let pending: CompareHandoff | null = null;

export function setCompareHandoff(handoff: CompareHandoff): void {
	pending = handoff;
}

/** Returns the pending handoff (if any) and clears it. */
export function takeCompareHandoff(): CompareHandoff | null {
	const handoff = pending;
	pending = null;
	return handoff;
}
