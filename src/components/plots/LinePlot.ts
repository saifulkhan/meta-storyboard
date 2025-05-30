import * as d3 from 'd3';
import { Plot } from './Plot';
import {
  Coordinate,
  TimeSeriesPoint,
  TimeSeriesData,
  HorizontalAlign,
  VerticalAlign,
  TimelineAction,
} from '../../types';
import { findIndexByExactDate, findIndexByAnyDateField } from '../../common';
import { Action } from '../actions';

const ID_AXIS_SELECTION = '#id-axes-selection';

// we need to pass the line properties for each line
export type LineProps = {
  stroke: string;
  strokeWidth: number;
  onRightAxis: boolean;
  showPoints: boolean;
  dotSize: number;
};

export const defaultLineProps: LineProps = {
  stroke: '#2a363b',
  strokeWidth: 2,
  onRightAxis: false,
  showPoints: false,
  dotSize: 2,
};

// overall plot props
export type LinePlotProps = {
  title: string;
  ticks: boolean;
  xLabel: string;
  rightAxisLabel: string;
  leftAxisLabel: string;
  margin: { top: number; right: number; bottom: number; left: number };
  titleYOffset: number;
  titleFontFamily: string;
  titleFontSize: string;
  axisFontFamily: string;
  axisFontSize: string;
  yAxisLabelOffset: number;
};

export const defaultLinePlotProps: LinePlotProps = {
  title: 'title...',
  ticks: true,
  xLabel: 'x axis label...',
  rightAxisLabel: 'right axis label...',
  leftAxisLabel: 'left axis label...',
  margin: { top: 50, right: 50, bottom: 60, left: 60 },
  titleYOffset: 10,
  titleFontFamily: 'Arial Narrow',
  titleFontSize: '14px',
  axisFontFamily: 'Arial Narrow',
  axisFontSize: '12px',
  yAxisLabelOffset: 12,
};

export class LinePlot extends Plot {
  data: TimeSeriesData[] = [];
  name = '';
  lineProps: LineProps[] = [];
  plotProps: LinePlotProps = defaultLinePlotProps;

  svg!: SVGSVGElement;
  selector: any;
  width: number = 0;
  height: number = 0;
  margin: any = {};
  xAxis: any;
  leftAxis: any;
  rightAxis: any;

  // animation related
  timelineActions: TimelineAction[] = [];
  lastTimelineAction: TimelineAction | undefined = undefined;
  currentTimelineActionIdx: number = 0;
  startDataIdx: number = 0;
  endDataIdx: number = 0;

  constructor() {
    super();
  }

  public setPlotProps(props: LinePlotProps) {
    this.plotProps = { ...defaultLinePlotProps, ...props };
    return this;
  }

  public setLineProps(propsList: LineProps[] = []) {
    if (!this.data) {
      throw new Error('LinePlot: Can not set line properties before data!');
    }

    const numTimeSeries = this.data.length;
    for (let i = 0; i < numTimeSeries; i++) {
      this.lineProps.push({
        stroke: propsList[i]?.stroke || defaultLineProps.stroke,
        strokeWidth: propsList[i]?.strokeWidth || defaultLineProps.strokeWidth,
        showPoints: propsList[i]?.showPoints || defaultLineProps.showPoints,
        onRightAxis: propsList[i]?.onRightAxis || defaultLineProps.onRightAxis,
        dotSize: propsList[i]?.dotSize || defaultLineProps.dotSize,
      });
    }

    console.log('LinePlot: lineProps = ', this.lineProps);

    return this;
  }

  public setData(data: TimeSeriesData[]) {
    this.data = data;
    // reset line properties when data changes
    this.lineProps = [];
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

    console.log('LinePlot:setCanvas: bounds: ', bounds);

    this.selector = d3
      .select(this.svg)
      .append('g')
      .attr('id', ID_AXIS_SELECTION);

    this._drawAxis();

    return this;
  }

  /**
   ** Draw all lines (no animation)
   **/
  public plot() {
    console.log('LinePlot:_draw: _data: ', this.data);
    const line = (xAxis: any, yAxis: any) => {
      return d3
        .line<TimeSeriesPoint>()
        .x((d: TimeSeriesPoint) => {
          return xAxis(d.date);
        })
        .y((d: TimeSeriesPoint) => {
          // if (typeof d.y !== "number" || Number.isNaN(d.y)) {
          //   console.log(d);
          //   d.y = 0;
          // }
          return yAxis(d.y);
        });
    };

    // draw line and dots
    this.data?.forEach((dataX: TimeSeriesData, i: number) => {
      const p = this.lineProps[i];
      const yAxis = this.leftOrRightAxis(i);

      console.log('LinePlot:_draw: data:', dataX);
      // draw line
      this.selector
        .append('path')
        .attr('stroke', p.stroke)
        .attr('stroke-width', p.strokeWidth)
        .attr('fill', 'none')
        .attr('d', line(this.xAxis, yAxis)(dataX));

      if (p.showPoints) {
        // draw dots
        this.selector
          .append('g')
          .selectAll('circle')
          .data(dataX.map(Object.values))
          .join('circle')
          .attr('r', this.lineProps[i].dotSize ?? 2)
          .attr('cx', (d: any) => this.xAxis(d[0]))
          .attr('cy', (d: any) => yAxis(d[1]))
          .style('fill', p.stroke)
          .attr('opacity', 0.5);
      }
    });

    return this;
  }

  /**
   ** Set the list of actions to be animated
   **/
  public setActions(timelineActions: TimelineAction[] = []) {
    this.timelineActions = timelineActions.sort((a, b) => {
      return a[0].getTime() - b[0].getTime();
    });

    this.lastTimelineAction = undefined;
    this.currentTimelineActionIdx = 0;
    this.startDataIdx = 0;
    this.endDataIdx = 0;
    return this;
  }

  animate() {
    const loop = async () => {
      if (
        !this.isPlayingRef.current ||
        this.currentTimelineActionIdx >= this.timelineActions.length
      ) {
        return;
      }

      if (this.lastTimelineAction) {
        const durationHide = await this.lastTimelineAction[1].hide();
      }

      const lineNum = 0; // TODO: we can animate first line at the moment
      const timelineAction: TimelineAction =
        this.timelineActions[this.currentTimelineActionIdx];

      const action: Action = timelineAction[1];
      const date: Date = timelineAction[0];
      const dataX = this.data[lineNum];
      const dataIdx = findIndexByAnyDateField(dataX, date);

      action
        .updateProps({
          templateVariables: {
            ...dataX[dataIdx],
            name: this.name,
            value: dataX[dataIdx].y,
          },
          horizontalAlign: this.getHorizontalAlign(date),
          verticalAlign: 'top' as VerticalAlign,
        } as any)
        .setCanvas(this.svg)
        .setCoordinate(this.getCoordinates(date, lineNum));

      const durationAnimateLine = await this._animateLine(
        this.startDataIdx,
        dataIdx,
        lineNum,
      );
      const durationShow = await action.show();

      this.lastTimelineAction = timelineAction;
      this.startDataIdx = dataIdx;
      this.currentTimelineActionIdx++;

      if (this.lastTimelineAction[1].getProps().pause) {
        console.log('LinePlot: paused at ', this.lastTimelineAction[0]);
        // always pause the animation first
        this.pause();
        // then notify the controller to update UI state if callback exists
        if (this.onPauseCallback) {
          this.onPauseCallback();
        }
        // don't continue the animation loop
        return;
      } else {
        this.animationRef = requestAnimationFrame(loop);
      }
    };

    loop();
  }

  /**
   * Animates the line for the given range and returns a Promise that resolves to
   * the total animation duration (delay + duration) in milliseconds.
   */
  private _animateLine(
    start: number,
    stop: number,
    lineNum: number = 0,
  ): Promise<number> {
    // prettier-ignore
    // console.log(`LinePlot: lineIndex = ${lineIndex}, start = ${start}, stop = ${stop}`)
    // console.log(this._data, this._data[lineIndex]);

    const dataX = this.data[lineNum].slice(start, stop + 1);
    const p = this.lineProps[lineNum];
    const yAxis = this.leftOrRightAxis(lineNum);

    const line = (xAxis: any, yAxis: any) => {
      return d3
        .line<TimeSeriesPoint>()
        .x((d: TimeSeriesPoint) => xAxis(d.date))
        .y((d: TimeSeriesPoint) => yAxis(d.y));
    };

    // create a path with the data
    const path = this.selector
      .append('path')
      .attr('stroke', p.stroke)
      .attr('stroke-width', p.strokeWidth)
      .attr('fill', 'none')
      .attr('d', line(this.xAxis, yAxis)(dataX));

    const length = path.node().getTotalLength();
    const duration = length * 4 || 1000;

    // Hide the path initially
    path
      .attr('stroke-dasharray', `${length} ${length}`)
      .attr('stroke-dashoffset', length);

    const delay = 1000;

    // Animate current path with duration given by user
    return new Promise<number>((resolve, reject) => {
      const transition = path
        .transition()
        .ease(d3.easeLinear)
        .delay(delay)
        .duration(duration)
        .attr('stroke-dashoffset', 0)
        .on('end', () => {
          resolve(delay + duration);
        });
    });
  }

  /**
   ** Draw axes and labels
   **/
  private _drawAxis() {
    d3.select(this.svg).selectAll(ID_AXIS_SELECTION).remove();

    // combine the data to create a plot with left and right axes
    let dataOnLeft: TimeSeriesData = [];
    let dataOnRight: TimeSeriesData = [];

    this.data.forEach((d: TimeSeriesData, i: number) => {
      if (this.lineProps[i].onRightAxis) {
        dataOnRight = dataOnRight.concat(d);
      } else {
        dataOnLeft = dataOnLeft.concat(d);
      }
    });

    console.log('LinePlot: dataOnLeft = ', dataOnLeft);
    console.log('LinePlot: dataOnRight = ', dataOnRight);

    this.xAxis = this.xScale(
      dataOnLeft.concat(dataOnRight),
      this.width,
      this.margin,
    );
    this.leftAxis = this.yScale(dataOnLeft, this.height, this.margin);
    this.rightAxis = this.yScale(dataOnRight, this.height, this.margin);

    // draw x axis on bottom
    this.selector
      .append('g')
      .attr('transform', `translate(0, ${this.height - this.margin.bottom})`)
      .call(d3.axisBottom(this.xAxis).ticks(5));

    // draw x axis label on bottom
    this.selector
      .append('text')
      .attr('fill', 'currentColor')
      .attr('text-anchor', 'start')
      .attr('x', this.width / 2)
      .attr('y', this.height - 5)
      .style('font-size', this.plotProps.axisFontSize ?? '12px')
      .style('font-family', this.plotProps.axisFontFamily ?? 'Arial Narrow')

      .text(`${this.plotProps.xLabel}→`);

    // draw left axis and label
    if (dataOnLeft.length) {
      this.selector
        .append('g')
        .attr('transform', `translate(${this.margin.left}, 0)`)
        .call(
          d3.axisLeft(this.leftAxis),
          // .tickFormat((d) => {
          //   let prefix = d3.formatPrefix(".00", d);
          //   return prefix(d);
          // })
        );

      this.selector
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('fill', 'currentColor')
        .attr('text-anchor', 'start')
        .attr('x', -this.height / 2)
        .attr('y', this.plotProps.yAxisLabelOffset ?? 12)
        .style('font-size', this.plotProps.axisFontSize ?? '12px')
        .style('font-family', this.plotProps.axisFontFamily ?? 'Arial Narrow')
        .text(`${this.plotProps.leftAxisLabel}→`);
    }

    // draw right axis and label
    if (dataOnRight.length) {
      this.selector
        .append('g')
        .attr('transform', `translate(${this.width - this.margin.right},0)`)
        .call(
          d3.axisRight(this.rightAxis),
          // .tickFormat((d) => {
          //   let prefix = d3.formatPrefix(".0", d);
          //   return prefix(d);
          // })
        );

      this.selector
        .append('text')
        .attr('transform', 'rotate(90)')
        .attr('x', this.height / 2)
        .attr('y', -this.width + (this.plotProps.yAxisLabelOffset ?? 12))
        .attr('fill', 'currentColor')
        .attr('text-anchor', 'start')
        .style('font-size', this.plotProps.axisFontSize ?? '12px')
        .style('font-family', this.plotProps.axisFontFamily ?? 'Arial Narrow')
        .text(`←${this.plotProps.rightAxisLabel}`);
    }

    // draw plot title
    this.selector
      .append('text')
      .attr('fill', 'currentColor')
      .style('fill', '#696969')
      .attr('text-anchor', 'start')
      .attr('font-weight', 'bold')
      .style('font-size', this.plotProps.titleFontSize ?? '14px')
      .style('font-family', this.plotProps.titleFontFamily ?? 'Arial Narrow')
      .attr('x', this.width / 2)
      .attr('y', this.margin.top + (this.plotProps.titleYOffset ?? 10))
      .text(this.plotProps.title);

    return this;
  }

  /**
   ** Create x and y scales
   **/
  private xScale(data: TimeSeriesData, w: number, m: any) {
    const xScale = d3
      .scaleTime()
      .domain(
        (d3.extent(data, (d: TimeSeriesPoint) => d.date) as [Date, Date]) || [
          new Date(),
          new Date(),
        ],
      )
      .nice()
      .range([m.left, w - m.right]);
    return xScale;
  }

  private yScale(data: TimeSeriesData, h: number, m: any) {
    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d: TimeSeriesPoint) => d.y) || 0])
      .nice()
      .range([h - m.bottom, m.top]);
    return yScale;
  }

  /*
   * Given a date of the LinePlot, return the corresponding [x1, y1], [x2, y2]
   * coordinates
   */
  public getCoordinates(
    date: Date,
    lineIndex: number = 0,
  ): [Coordinate, Coordinate] {
    const dataX = this.data[lineIndex];
    const index = findIndexByExactDate(dataX, date);
    const yAxis = this.leftOrRightAxis(lineIndex);

    return [
      [this.xAxis(dataX[index].date), yAxis(0)],
      [this.xAxis(dataX[index].date), yAxis(dataX[index].y)],
    ];
  }

  private leftOrRightAxis(lineIndex: number) {
    const properties = this.lineProps[lineIndex];
    return properties.onRightAxis ? this.rightAxis : this.leftAxis;
  }

  private getHorizontalAlign(date: Date): HorizontalAlign {
    const x = this.xAxis(date);
    const xMid = (this.xAxis.range()[0] + this.xAxis.range()[1]) / 2;
    return x >= xMid ? 'left' : 'right';
  }

  togglePlayPause() {
    if (this.isPlayingRef.current) {
      this.pause();
    } else {
      this.play();
    }

    // The state change in isPlayingRef.current has happened in either pause() or play()
    // This method is overridden by useControllerWithState to update React state
    // which ensures the UI reflects the current state immediately
  }

  /**
   * Reset the plot to its initial state
   * This is useful when changing data or when needing to restart the animation
   */
  public reset() {
    // reset animation state
    this.currentTimelineActionIdx = 0;
    this.startDataIdx = 0;
    this.endDataIdx = 0;
    this.lastTimelineAction = undefined;

    // clean the SVG and redraw
    if (this.svg) {
      this.clean();

      // recreate the selector
      this.selector = d3
        .select(this.svg)
        .append('g')
        .attr('id', ID_AXIS_SELECTION);

      // redraw the axis
      this._drawAxis();
    }

    // ensure we're in a paused state
    this.pause();

    return this;
  }
}
