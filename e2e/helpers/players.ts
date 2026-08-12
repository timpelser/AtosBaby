/**
 * Test player identities.
 *
 * The Add Match / Team Selector email field only accepts
 * `^[a-z]+\.[a-z]+@atos\.net$` (letters only, one dot — see
 * src/components/player-combobox.tsx). So every fixture email below uses a
 * spec-specific first-name prefix (letters only, no digits) to keep each
 * spec's player pool from colliding with another spec's, since all specs
 * share the one `e2e` Neon branch for the whole run (see e2e/README.md).
 */

export type TestPlayer = { email: string; firstName: string; lastName: string }

/** Builds a player fixture; name casing mirrors upsertPlayer's own derivation from the email. */
export function testPlayer(first: string, last: string): TestPlayer {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
  return {
    email: `${first.toLowerCase()}.${last.toLowerCase()}@atos.net`,
    firstName: cap(first),
    lastName: cap(last),
  }
}

/** N players sharing a spec-specific prefix, e.g. pool("rankz", 8) -> rankza.p0, rankzb.p1, ... */
export function pool(prefix: string, count: number): TestPlayer[] {
  const letters = "abcdefghijklmnopqrstuvwxyz"
  return Array.from({ length: count }, (_, i) => testPlayer(`${prefix}${letters[i]}`, `player${letters[i]}`))
}
