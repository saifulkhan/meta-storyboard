/**
 * Minimal interface for anything that can be driven by the animation
 * controllers (plots implement it structurally).
 */
export interface Playable {
  play(): void;
  pause(): void;
  togglePlayPause(): void;
  /** register a callback invoked when the playable pauses itself, e.g., at a pause action */
  setOnPauseCallback?(callback: () => void): unknown;
}
