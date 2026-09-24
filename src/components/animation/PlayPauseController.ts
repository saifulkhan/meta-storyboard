import { Playable } from '../../types';

/**
 * PlayPauseController provides functionality to control play/pause state
 * for a single playable object (e.g., a plot) without depending on any
 * specific framework.
 */
export class PlayPauseController {
  private isPlaying: boolean = false;
  private plot: Playable;

  constructor(plot: Playable) {
    this.plot = plot;

    // pause the controller when the plot pauses itself, e.g., at a pause action
    this.plot.setOnPauseCallback?.(() => this.pause());
  }

  togglePlayPause(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  pause(): void {
    this.isPlaying = false;
    this.plot.pause();
  }

  play(): void {
    this.isPlaying = true;
    this.plot.play();
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  cleanup(): void {
    this.pause();
  }
}
