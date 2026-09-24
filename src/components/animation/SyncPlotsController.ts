import { Playable } from '../../types';

/**
 * SyncPlotsController provides functionality to control play/pause state
 * for multiple playable objects (e.g., synchronized plots) without depending
 * on any specific framework.
 */
export class SyncPlotsController {
  private isPlaying: boolean = false;
  private plots: Playable[];

  constructor(plots: Playable[]) {
    this.plots = plots;

    // pause all plots when any plot pauses itself, e.g., at a pause action
    this.plots.forEach((plot) => {
      plot.setOnPauseCallback?.(() => this.pause());
    });
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
    this.plots.forEach((plot) => plot.pause());
  }

  play(): void {
    this.isPlaying = true;
    this.plots.forEach((plot) => plot.play());
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  updatePlots(plots: Playable[]): void {
    this.plots = plots;
  }

  cleanup(): void {
    this.pause();
  }
}
