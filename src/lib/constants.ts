// How long after logging a match anyone can self-serve undo it (no admin
// password needed). Enforced server-side in actions.ts; shared here so the
// client-side countdown (undo-match-store.ts) uses the same number.
export const UNDO_WINDOW_MINUTES = 5
