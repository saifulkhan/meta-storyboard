import * as d3 from 'd3';
import { Coordinate, Playable, TimelineAction } from '../../types';

/**
 * Base class for animated plots.
 *
 * @typeParam TData - The shape of the data accepted by `setData`
 * @typeParam TProps - The plot's property object; `setPlotProps` accepts a partial
 */
export abstract class Plot<TData = unknown, TProps = unknown>
  implements Playable
{
  protected svg: SVGSVGElement | undefined;

  protected animationRef: number | null = null;
  protected playing: boolean = false;
  protected lastTimelineAction: TimelineAction | undefined = undefined;
  protected currentTimelineActionIdx: number = 0;
  protected onPauseCallback: (() => void) | null = null;

  public abstract setData(data: TData): this;
  public abstract setPlotProps(props: Partial<TProps>): this;
  public abstract setName(name: string): this;
  public abstract setCanvas(svg: SVGSVGElement): this;
  public abstract plot(): this | void;
  public abstract setActions(actions: TimelineAction[]): this;
  public abstract getCoordinates(
    date: Date,
    index?: number,
  ): [Coordinate, Coordinate];

  protected clean() {
    if (this.svg) {
      d3.select(this.svg).selectAll('*').remove();
    }
  }

  togglePlayPause() {
    if (this.playing) {
      this.pause();
    } else {
      this.play();
    }
  }

  animate(): void {
    return;
  }

  play() {
    this.playing = true;
    this.animate();
  }

  pause() {
    this.playing = false;

    if (this.animationRef) {
      cancelAnimationFrame(this.animationRef);
    }
  }

  public isPlaying(): boolean {
    return this.playing;
  }

  /**
   * Sets a callback function to be called when the animation is paused
   * automatically due to a pause action in the timeline.
   * @param callback The function to call when auto-paused
   */
  setOnPauseCallback(callback: () => void) {
    this.onPauseCallback = callback;
    return this;
  }
}
