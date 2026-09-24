import * as d3 from 'd3';
import { Plot } from './Plot';
import { Colors } from '../Colors';
import {
  Coordinate,
  TimeSeriesData,
  TimeSeriesPoint,
  TimelineAction,
} from '../../types';
import { findIndexByAnyDateField } from '../../common';

const ID_AXIS_SELECTION = 'id-axes-selection';

/**
 * A line + scatter plot where the x-axis is a numeric field of the timeseries
 * points (e.g., a hyperparameter such as "layers") instead of the date.
 * Supports step-based animation (forward, backward, beginning) which makes it
 * suitable for dashboard-style stories with play/pause/back controls.
 *
 * Two typical instances:
 *  - detail view: auto-fitted y domain,
 *  - context view: fixed yDomain (e.g., [0, 1]) with showBand enabled to
 *    highlight the y-extent of the data.
 */
export type NumericLinePlotProps = {
  title: string;
  ticks: boolean;
  xLabel: string;
  yLabel: string;
  margin: { top: number; right: number; bottom: number; left: number };
  titleYOffset: number;
  titleFontFamily: string;
  titleFontSize: string;
  axisFontFamily: string;
  axisFontSize: string;
  tickFontSize: string;
  yAxisLabelOffset: number;
  /** suggested tick counts; d3 snaps them to nice values */
  xTicks: number;
  yTicks: number;
  /** fixed y domain, e.g., [0, 1] for a context/overview plot; auto-fit when undefined */
  yDomain?: [number, number];
  /** draw a shaded horizontal band covering the y-extent of the data */
  showBand: boolean;
  bandColor: string;
  lineColor: string;
  lineWidth: number;
  pointColor: string;
  pointSize: number;
  currentPointColor: string;
  currentPointSize: number;
  /** draw the full series in light grey behind the animated line */
  showGhost: boolean;
  ghostColor: string;
  /** milliseconds between two animation steps */
  stepDelayMs: number;
};

export const defaultNumericLinePlotProps: NumericLinePlotProps = {
  title: '',
  ticks: true,
  xLabel: 'x axis',
  yLabel: 'y axis',
  margin: { top: 40, right: 50, bottom: 85, left: 100 },
  titleYOffset: 10,
  // same font stack as the MUI default typography so SVG text matches the UI
  titleFontFamily: 'Roboto, Helvetica, Arial, sans-serif',
  titleFontSize: '22px',
  axisFontFamily: 'Roboto, Helvetica, Arial, sans-serif',
  axisFontSize: '26px',
  tickFontSize: '24px',
  yAxisLabelOffset: 28,
  xTicks: 8,
  yTicks: 3,
  yDomain: undefined,
  showBand: false,
  bandColor: '#f0f0f0',
  lineColor: '#909090',
  lineWidth: 1.5,
  pointColor: '#696969',
  pointSize: 3,
  currentPointColor: Colors.Orange,
  currentPointSize: 6,
  showGhost: true,
  ghostColor: '#d3d3d3',
  stepDelayMs: 500,
};

export class NumericLinePlot extends Plot {
  data: TimeSeriesData = [];
  name = ''; // numeric x field, e.g., the selected hyperparameter
  plotProps: NumericLinePlotProps = defaultNumericLinePlotProps;

  svg!: SVGSVGElement;
  selector: any;
  width: number = 0;
  height: number = 0;
  margin: any = {};
  xScale: any;
  yScale: any;

  // layers (in z-order): axes/band, ghost, line, points, actions, current marker
  private ghostSelection: any;
  private lineSelection: any;
  private pointsSelection: any;
  private actionsSelection: any;
  private currentSelection: any;

  // animation state
  timelineActions: TimelineAction[] = [];
  private actionDataIdx: number[] = [];
  private actionShown: boolean[] = [];
  private currentIdx: number = -1;
  private stepTimer: any = null;
  private onStepCallback:
    | ((index: number, point: TimeSeriesPoint | undefined) => void)
    | null = null;

  constructor() {
    super();
  }

  public setPlotProps(props: Partial<NumericLinePlotProps>) {
    this.plotProps = { ...defaultNumericLinePlotProps, ...props };
    return this;
  }

  public setData(data: TimeSeriesData) {
    // the caller is responsible for sorting the data, e.g., by the x field
    this.data = data;
    this.currentIdx = -1;
    return this;
  }

  public setName(name: string) {
    this.name = name;
    return this;
  }

  public setCanvas(svg: SVGSVGElement) {
    this.svg = svg;
    this.clean();

    const bounds = svg.getBoundingClientRect();
    this.height = bounds.height;
    this.width = bounds.width;
    this.margin = this.plotProps.margin;

    this.selector = d3
      .select(this.svg)
      .append('g')
      .attr('id', ID_AXIS_SELECTION);

    this._drawAxis();

    this.ghostSelection = this.selector.append('g');
    this.lineSelection = this.selector.append('g');
    this.pointsSelection = this.selector.append('g');
    this.actionsSelection = this.selector.append('g');
    this.currentSelection = this.selector.append('g');

    this._drawGhost();

    return this;
  }

  /**
   ** Draw the complete plot without any animation, useful for testing
   **/
  public plot() {
    this.stepTo(this.data.length - 1);
    return this;
  }

  /**
   ** Set the list of timeline actions (date-keyed, e.g., created by
   ** FeatureActionFactory); they are triggered when the animation reaches
   ** the corresponding data point.
   **/
  public setActions(timelineActions: TimelineAction[] = []) {
    this.timelineActions = timelineActions;
    this.actionDataIdx = timelineActions.map(([date]) =>
      findIndexByAnyDateField(this.data, date),
    );
    this.actionShown = timelineActions.map(() => false);
    return this;
  }

  /**
   ** Callback invoked on every animation step with the current index and
   ** data point; useful to synchronize an external UI, e.g., dashboard cards.
   **/
  public setOnStepCallback(
    callback: (index: number, point: TimeSeriesPoint | undefined) => void,
  ) {
    this.onStepCallback = callback;
    return this;
  }

  public getCurrentIndex() {
    return this.currentIdx;
  }

  /**
   ** Move the animation to the given data index (-1 shows an empty plot);
   ** works both forward and backward.
   **/
  public stepTo(idx: number) {
    if (!this.data.length || !this.selector) return this;

    idx = Math.max(-1, Math.min(idx, this.data.length - 1));
    const backward = idx < this.currentIdx;
    this.currentIdx = idx;

    this._renderProgress();

    if (backward) {
      // remove all action drawings and re-show the ones still reached
      this.actionsSelection.selectAll('*').remove();
      this.actionShown = this.actionShown.map(() => false);
    }

    this.timelineActions.forEach((timelineAction, i) => {
      if (this.actionDataIdx[i] < 0) return;
      if (this.actionDataIdx[i] <= idx && !this.actionShown[i]) {
        this._showAction(i, backward);
        this.actionShown[i] = true;
      }
    });

    if (this.onStepCallback) {
      this.onStepCallback(idx, idx >= 0 ? this.data[idx] : undefined);
    }

    return this;
  }

  public stepForward() {
    this.pause();
    return this.stepTo(this.currentIdx + 1);
  }

  public stepBackward() {
    this.pause();
    return this.stepTo(this.currentIdx - 1);
  }

  /**
   ** Reset the animation to the beginning (empty plot, axes and ghost remain)
   **/
  public reset() {
    this.pause();
    return this.stepTo(-1);
  }

  animate() {
    if (this.stepTimer) {
      clearTimeout(this.stepTimer);
      this.stepTimer = null;
    }

    const loop = () => {
      if (!this.isPlayingRef.current || !this.data.length) {
        return;
      }

      // reached the end: pause and notify the controller
      if (this.currentIdx >= this.data.length - 1) {
        this.pause();
        if (this.onPauseCallback) this.onPauseCallback();
        return;
      }

      this.stepTo(this.currentIdx + 1);

      // pause if any action at this step requests it
      const pauseHere = this.timelineActions.some(
        (timelineAction, i) =>
          this.actionDataIdx[i] === this.currentIdx &&
          timelineAction[1].getProps().pause,
      );
      if (pauseHere) {
        this.pause();
        if (this.onPauseCallback) this.onPauseCallback();
        return;
      }

      this.stepTimer = setTimeout(loop, this.plotProps.stepDelayMs);
    };

    loop();
  }

  play() {
    // restart from the beginning when play is pressed at the end
    if (this.currentIdx >= this.data.length - 1) {
      this.stepTo(-1);
    }
    this.isPlayingRef.current = true;
    this.animate();
  }

  pause() {
    this.isPlayingRef.current = false;
    if (this.stepTimer) {
      clearTimeout(this.stepTimer);
      this.stepTimer = null;
    }
  }

  togglePlayPause() {
    if (this.isPlayingRef.current) {
      this.pause();
    } else {
      this.play();
    }
  }

  /*
   * Given a date of the plot, return the corresponding [x0, y0], [x, y]
   * coordinates
   */
  public getCoordinates(date: Date): [Coordinate, Coordinate] {
    const index = findIndexByAnyDateField(this.data, date);
    return this._coordinatesAt(Math.max(index, 0));
  }

  private _coordinatesAt(index: number): [Coordinate, Coordinate] {
    const d = this.data[index];
    const x = this.xScale(d[this.name]);
    return [
      [x, this.yScale(this.yScale.domain()[0])],
      [x, this.yScale(d.y)],
    ];
  }

  private _showAction(i: number, quick: boolean) {
    const [, action] = this.timelineActions[i];
    const idx = this.actionDataIdx[i];
    const point = this.data[idx];

    action
      .updateProps({
        templateVariables: {
          ...point,
          name: this.name,
          value: point.y,
        },
      } as any)
      .setCanvas(this.actionsSelection.node())
      .setCoordinate(this._coordinatesAt(idx));

    action.show(0, quick ? 0 : 500);
  }

  private _renderProgress() {
    const p = this.plotProps;
    const visible = this.currentIdx >= 0
      ? this.data.slice(0, this.currentIdx + 1)
      : [];

    this.lineSelection.selectAll('path').remove();
    if (visible.length > 1) {
      this.lineSelection
        .append('path')
        .attr('stroke', p.lineColor)
        .attr('stroke-width', p.lineWidth)
        .attr('fill', 'none')
        .attr('d', this._line()(visible));
    }

    this.pointsSelection
      .selectAll('circle')
      .data(visible)
      .join('circle')
      .attr('r', p.pointSize)
      .attr('cx', (d: TimeSeriesPoint) => this.xScale(d[this.name]))
      .attr('cy', (d: TimeSeriesPoint) => this.yScale(d.y))
      .attr('fill', p.pointColor);

    this.currentSelection.selectAll('circle').remove();
    if (this.currentIdx >= 0) {
      const d = this.data[this.currentIdx];
      this.currentSelection
        .append('circle')
        .attr('r', p.currentPointSize)
        .attr('cx', this.xScale(d[this.name]))
        .attr('cy', this.yScale(d.y))
        .attr('fill', p.currentPointColor);
    }
  }

  private _line() {
    return d3
      .line<TimeSeriesPoint>()
      .x((d: TimeSeriesPoint) => this.xScale(d[this.name]))
      .y((d: TimeSeriesPoint) => this.yScale(d.y));
  }

  private _drawGhost() {
    if (!this.plotProps.showGhost || this.data.length === 0) return;

    const p = this.plotProps;

    this.ghostSelection
      .append('path')
      .attr('stroke', p.ghostColor)
      .attr('stroke-width', p.lineWidth)
      .attr('fill', 'none')
      .attr('d', this._line()(this.data));

    this.ghostSelection
      .selectAll('circle')
      .data(this.data)
      .join('circle')
      .attr('r', p.pointSize)
      .attr('cx', (d: TimeSeriesPoint) => this.xScale(d[this.name]))
      .attr('cy', (d: TimeSeriesPoint) => this.yScale(d.y))
      .attr('fill', p.ghostColor);
  }

  /**
   ** Draw axes and labels
   **/
  private _drawAxis() {
    const p = this.plotProps;

    const xExtent = d3.extent(
      this.data,
      (d: TimeSeriesPoint) => d[this.name] as number,
    ) as [number, number];
    const yExtent = d3.extent(
      this.data,
      (d: TimeSeriesPoint) => d.y as number,
    ) as [number, number];

    this.xScale = d3
      .scaleLinear()
      .domain(xExtent[0] !== undefined ? xExtent : [0, 1])
      .nice()
      .range([this.margin.left, this.width - this.margin.right]);

    this.yScale = d3
      .scaleLinear()
      .domain(p.yDomain ?? (yExtent[0] !== undefined ? yExtent : [0, 1]))
      .nice()
      .range([this.height - this.margin.bottom, this.margin.top]);

    // shaded band covering the y-extent of the data (context plot)
    if (p.showBand && yExtent[0] !== undefined) {
      this.selector
        .append('rect')
        .attr('x', this.margin.left)
        .attr('width', this.width - this.margin.left - this.margin.right)
        .attr('y', this.yScale(yExtent[1]))
        .attr(
          'height',
          Math.abs(this.yScale(yExtent[0]) - this.yScale(yExtent[1])),
        )
        .attr('fill', p.bandColor);
    }

    // draw x axis on bottom
    this.selector
      .append('g')
      .attr('transform', `translate(0, ${this.height - this.margin.bottom})`)
      .call(d3.axisBottom(this.xScale).ticks(p.xTicks, '~s'))
      .selectAll('text')
      .style('font-size', p.tickFontSize)
      .style('font-family', p.axisFontFamily);

    // draw x axis label on bottom, centered on the plot area
    this.selector
      .append('text')
      .attr('fill', 'currentColor')
      .attr('text-anchor', 'middle')
      .attr('x', (this.margin.left + this.width - this.margin.right) / 2)
      .attr('y', this.height - 5)
      .style('font-size', p.axisFontSize)
      .style('font-family', p.axisFontFamily)
      .text(`${p.xLabel}→`);

    // draw y axis and label
    this.selector
      .append('g')
      .attr('transform', `translate(${this.margin.left}, 0)`)
      .call(d3.axisLeft(this.yScale).ticks(p.yTicks))
      .selectAll('text')
      .style('font-size', p.tickFontSize)
      .style('font-family', p.axisFontFamily);

    // rotated y axis label, centered on the plot area
    this.selector
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('fill', 'currentColor')
      .attr('text-anchor', 'middle')
      .attr('x', -(this.margin.top + this.height - this.margin.bottom) / 2)
      .attr('y', p.yAxisLabelOffset)
      .style('font-size', p.axisFontSize)
      .style('font-family', p.axisFontFamily)
      .text(`${p.yLabel}→`);

    // draw plot title
    if (p.title) {
      this.selector
        .append('text')
        .attr('fill', 'currentColor')
        .style('fill', '#696969')
        .attr('text-anchor', 'start')
        .attr('font-weight', 'bold')
        .style('font-size', p.titleFontSize)
        .style('font-family', p.titleFontFamily)
        .attr('x', this.width / 2)
        .attr('y', this.margin.top - p.titleYOffset)
        .text(p.title);
    }

    return this;
  }
}
