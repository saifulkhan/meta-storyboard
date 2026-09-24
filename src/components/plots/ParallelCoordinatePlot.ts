import * as d3 from 'd3';
import {
  findIndexByAnyDateField,
  getObjectKeysArray,
  findIndexByExactDate,
  findTimelineActionByDate,
} from '../../common';
import {
  TimelineAction,
  Coordinate,
  HorizontalAlign,
  VerticalAlign,
  NumericalFeatureName,
  TimeSeriesData,
} from '../../types';
import { Colors, LineColor } from '../Colors';
import { Action } from '../actions';
import { Plot } from './Plot';
import { logger } from '../../logger';

export type PCPProps = {
  title?: string;
  ticks?: boolean;
  xLabel?: string;
  rightAxisLabel?: string;
  leftAxisLabel?: string;
  margin: { top: number; right: number; bottom: number; left: number };
};

export const defaultPCPProps: PCPProps = {
  title: 'title...',
  ticks: true,
  xLabel: 'x axis label...',
  rightAxisLabel: 'right axis label...',
  leftAxisLabel: 'left axis label...',
  margin: { top: 70, right: 50, bottom: 30, left: 50 },
};

// TODO: may be move to props

const STATIC_LINE_COLOR_MAP = d3.interpolateBrBG,
  STATIC_LINE_OPACITY = 0.4,
  STATIC_DOT_OPACITY = 0.4;

const LINE_WIDTH = 1.5,
  DOT_RADIUS = 5,
  SELECTED_AXIS_COLOR = Colors.Red,
  FONT_SIZE = '12px';

const DELAY_SHOW = 0,
  DELAY_HIDE = 500,
  DURATION_SHOW = 0,
  DURATION_HIDE = 1000;

const ANNO_Y_POS = 20,
  ANNO_X_POS = 75;

const xScaleMap = (
  data: any[],
  keys: string[],
  width: number,
  margin: { left: number; right: number },
) => {
  return new Map(
    Array.from(keys, (key) => {
      // array of all keys, e.g.,  ['date', 'mean_test_accuracy', 'channels', 'kernel_size', 'layers', ...]
      // key is one of teh key, e.g., 'date'
      let scale;
      if (key === 'date') {
        // Create scale with proper typing and handle possible undefined values
        scale = d3
          .scaleTime()
          .domain(
            (d3.extent(data, (d) => d[key] as Date) as [Date, Date]) || [
              new Date(),
              new Date(),
            ],
          )
          .range([margin.left, width - margin.right]);
      } else {
        // Create scale with proper typing and handle possible undefined values
        scale = d3
          .scaleLinear()
          .domain(
            (d3.extent(data, (d) => +d[key]) as [number, number]) || [0, 1],
          )
          .range([margin.left, width - margin.right]);
      }

      return [key, scale];
    }),
  );
};

const yScale = (
  keys: string[],
  height: number,
  margin: { top: number; bottom: number },
) => {
  return d3.scalePoint(keys, [margin.top, height - margin.bottom]);
};

export class ParallelCoordinatePlot extends Plot<TimeSeriesData, PCPProps> {
  data: any[] = [];
  props: PCPProps = defaultPCPProps;
  svg!: SVGSVGElement;
  name: string = '';

  width: number = 0;
  height: number = 0;
  axisNames: string[] = [];
  selectedAxis: string = '';
  xScaleMap: any;
  yScale: any;
  staticLineColorMap: any;

  // animation
  timelineActions: TimelineAction[] = [];
  currentTimelineActionIdx: number = 0;
  currentDataIdx: number = 0;

  constructor() {
    super();
  }

  public setPlotProps(props: Partial<PCPProps>) {
    this.props = { ...defaultPCPProps, ...props };
    return this;
  }

  public setData(data: TimeSeriesData) {
    // sort data by selected key, e.g, "kernel_size"
    this.data = data
      .slice()
      .sort((a, b) => d3.ascending(a[this.name], b[this.name]))
      .sort((a, b) => d3.ascending(a['date'], b['date']));

    this.axisNames = getObjectKeysArray(data);
    logger.debug('PCP:setData: data = ', this.data);
    logger.debug('PCP:setData: axisNames = ', this.axisNames);

    return this;
  }

  public setName(name: string) {
    this.name = name;
    this.selectedAxis = name;
    // prettier-ignore
    logger.debug('PCP:setName: selectedAxis = ', this.selectedAxis);

    return this;
  }

  public setCanvas(svg: SVGSVGElement) {
    this.svg = svg;
    const bounds = svg.getBoundingClientRect();
    this.height = bounds.height;
    this.width = bounds.width;

    return this;
  }

  /**
   ** Draw parallel coordinate lines & axis (static)
   **/

  public plot() {
    this.drawAxis();
    this.drawLinesAndDots();

    return this;
  }

  private drawAxis() {
    // Clear existing axis and labels
    d3.select(this.svg).selectAll('svg > *').remove();

    this.xScaleMap = xScaleMap(
      this.data,
      this.axisNames,
      this.width,
      this.props.margin,
    );

    this.yScale = yScale(this.axisNames, this.height, this.props.margin);

    this.staticLineColorMap = d3.scaleSequential(
      this.xScaleMap.get(this.selectedAxis).domain().reverse(),
      STATIC_LINE_COLOR_MAP,
    );

    // prettier-ignore
    logger.debug('PCP:drawAxis: xScaleMap = ', this.xScaleMap);

    //
    // Draw axis and labels
    //
    const that = this;
    d3.select(this.svg)
      .append('g')
      .selectAll('g')
      .data(this.axisNames)
      .join('g')
      .attr('transform', (d) => `translate(0,${this.yScale(d)})`)
      .style('font-size', FONT_SIZE)
      .each(function (d) {
        // draw axis for d = date, layers, kernel_size, ... etc.
        // change color of the selected axis for d = keyz
        if (d === that.selectedAxis) {
          d3.select(this)
            .attr('color', SELECTED_AXIS_COLOR)
            .call(d3.axisBottom(that.xScaleMap.get(d)) as any);
        } else {
          d3.select(this).call(d3.axisBottom(that.xScaleMap.get(d)) as any);
        }
      })
      // Label axis
      .call((g) =>
        g
          .append('text')
          .attr('x', this.props.margin.left)
          .attr('y', -6)
          .attr('text-anchor', 'start')
          .attr('fill', (d) =>
            // change color of the selected axis label for d = keyz
            d === this.selectedAxis ? SELECTED_AXIS_COLOR : 'currentColor',
          )
          .text((d) => d),
      );

    return this;
  }

  /**
   ** This will draw lines and dots.
   ** This is similar to the drawLinesAndDotsHidden() function below.
   **/
  private drawLinesAndDots() {
    const line = d3
      .line()
      .defined(([, value]) => value != null)
      .x(([key, value]) => {
        // parameter and its value, e.g., kernel_size:11, layers:13, etc
        return this.xScaleMap.get(key)(value);
      })
      .y(([key]) => this.yScale(key));

    const cross = (d: any) =>
      d3.cross(this.axisNames, [d], (key: string, d: any) => [key, +d[key]]);

    //
    // Draw lines
    //
    d3.select(this.svg)
      .append('g')
      .attr('fill', 'none')
      .attr('stroke-width', LINE_WIDTH)
      .attr('stroke-opacity', STATIC_LINE_OPACITY)
      .selectAll('path')
      .data(this.data)
      .join('path')
      .attr('stroke', (d) => this.staticLineColorMap(d[this.selectedAxis]))
      .attr('d', (d) => {
        // d is a row of the data, e.g., {kernel_size: 11, layers: 13, ...}
        // cross returns an array of [key, value] pairs ['date', 1677603855000], ['mean_training_accuracy', 0.9], ['channels', 32], ['kernel_size', 3], ['layers', 13], ...
        const a = cross(d);
        // Add type assertion to make TypeScript happy
        const l = line(a as any);
        return l;
      })
      .attr('id', (d) => `id-line-${d.date}`);

    //
    // Append circles to the line
    //
    d3.select(this.svg)
      .append('g')
      .selectAll('g')
      .data(this.data)
      .enter()
      .append('g')
      .attr('id', (d) => {
        // d is a row of the data, e.g., {kernel_size: 11, layers: 13, ...}
        return `id-dot-${d.date}`;
      })
      .selectAll('circle')
      .data((d) => cross(d))
      .enter()
      .append('circle')
      .attr('r', DOT_RADIUS)
      .attr('cx', ([key, value]) => {
        // parameter and its value, e.g., kernel_size:11, layers:13, etc
        return this.xScaleMap.get(key)(value);
      })
      .attr('cy', ([key]) => this.yScale(key))
      // .style("fill", (d) => this.staticLineColorMap(d[this.selectedAxis]))
      .style('fill', 'Gray')
      .style('opacity', STATIC_DOT_OPACITY);
  }

  /**
   ** This will draw lines and dots but initially hidden, and revealed during animation
   ** This is similar to the drawLinesAndDots() function above.
   **/
  private drawLinesAndDotsHidden() {
    const line = d3
      .line()
      .defined(([, value]) => value != null)
      .x(([key, value]) => {
        // parameter and its value, e.g., kernel_size: 11, layers: 13, etc
        return this.xScaleMap.get(key)(value);
      })
      .y(([key]) => this.yScale(key));

    const cross = (d: any) => {
      // given d is a row of the data, e.g., {date: 1677603855000, kernel_size: 11, layers: 13, ...},
      // cross returns an array of [key, value] pairs ['date', 1677603855000], ['mean_training_accuracy', 0.9], ['channels', 32], ['kernel_size', 3], ['layers', 13], ...
      return d3.cross(this.axisNames, [d], (key: string, d: any) => [
        key,
        +d[key],
      ]);
    };

    //
    // Draw lines
    //
    d3.select(this.svg)
      .append('g')
      .selectAll('path')
      .data(this.data)
      .join('path')
      .attr('stroke', (d) => 'grey') // TODO
      .attr('d', (d) => {
        // d.data is a data point, e.g., {kernel_size: 11, layers: 13, ...}
        // cross returns an array of [key, value] pairs ['date', 1677603855000], ['mean_training_accuracy', 0.9], ['channels', 32], ['kernel_size', 3], ['layers', 13], ...
        const a = cross(d);
        // Add type assertion to make TypeScript happy
        const l = line(a as any);
        return l;
      })
      .attr('fill', 'none')
      .attr('stroke-width', LINE_WIDTH)
      .attr('stroke-opacity', 0) // TODO
      .attr('id', (d) => this.getLineId(d.date));

    //
    // Append dots to the line
    //
    const that = this;
    d3.select(this.svg)
      .append('g')
      .selectAll('g')
      .data(this.data)
      .enter()
      .append('g')
      .attr('id', (d) => {
        // d is a row of the data, e.g., {kernel_size: 11, layers: 13, ...}
        return this.getDotId(d.date);
      })
      .selectAll('circle')
      .data((d) => cross(d))
      .enter()
      .append('circle')
      .attr('r', DOT_RADIUS)
      .attr('cx', ([key, value]) => {
        // parameter and its value, e.g., key/value: kernel_size/11, layers/13, etc
        const xScale = this.xScaleMap.get(key);
        return xScale(value);
      })
      .attr('cy', ([key]) => this.yScale(key))
      .style('fill', function (d) {
        // get the parent node data
        // const parent = d3.select(this.parentNode).datum();
        // return parent?.dotColor;
        // TODO
        return 'grey';
      })
      .style('opacity', 0); // TODO
  }

  /**
   ** Actions that will be animated.
   **/
  public setActions(actions: TimelineAction[]) {
    this.timelineActions = actions?.sort(
      (a, b) => a[0].getTime() - b[0].getTime(),
    );

    this.drawAxis();
    this.drawLinesAndDotsHidden();

    return this;
  }

  /**
   ** Animation related methods
   **/

  /**
   * Animates the parallel coordinate plot by iterating through data points
   * and timeline actions. Shows/hides lines and dots as needed.
   */
  animate() {
    logger.debug('PCP:animate: starting animation with data:', this.data);
    logger.debug(
      'PCP:animate: starting animation with timeline actions:',
      this.timelineActions,
    );

    const loop = async () => {
      // stop animation if paused or no data
      if (!this.playing || !this.data.length) {
        return;
      }

      // stop animation if we've reached the end of data
      if (this.currentDataIdx >= this.data.length) {
        this.currentDataIdx = 0;
        this.currentTimelineActionIdx = 0;
        this.pause();
        return;
      }

      // hide previous elements if they exist
      const previousDataIdx = this.currentDataIdx - 1;
      if (previousDataIdx >= 0) {
        const previousData = this.data[previousDataIdx];
        try {
          await Promise.all([
            this.hideDots(previousData.date),
            this.hideLine(
              previousData.date,
              this.selectedAxis as NumericalFeatureName,
            ),
          ]);
        } catch (error) {
          logger.warn('PCP: error hiding previous elements:', error);
        }
      }

      // show current data point
      const currentData = this.data[this.currentDataIdx % this.data.length];
      const currentDate = currentData?.date;

      try {
        // find timeline action for the current date if it exists
        const currentAction = findTimelineActionByDate(
          this.timelineActions,
          currentDate,
        );

        if (currentAction) {
          const [actionDate, action] = currentAction;
          const featureName: NumericalFeatureName =
            action.getFeatureType() as NumericalFeatureName;
          await Promise.all([
            this.showAction(actionDate, featureName, action),
            this.showDots(currentDate, featureName),
            this.showLine(currentDate, featureName),
          ]);
          // update timeline action index
          this.currentTimelineActionIdx++;
        } else {
          await Promise.all([
            this.showDots(currentDate),
            this.showLine(currentDate),
          ]);
        }

        // update state for next iteration
        this.currentDataIdx++;
        // prettier-ignore
        logger.debug('PCP:animate: timelineActionIdx:', this.currentTimelineActionIdx, 'currentDataIdx:', this.currentDataIdx);

        // continue animation loop
        this.animationRef = requestAnimationFrame(loop);
      } catch (error) {
        logger.error('PCP:animate: error:', error);
        this.animationRef = requestAnimationFrame(loop);
      }
    };

    // start the animation loop
    loop();
  }

  private showLine(
    date: Date,
    type: NumericalFeatureName = NumericalFeatureName.CURRENT,
  ) {
    return new Promise<number>((resolve, reject) => {
      d3.select(this.svg)
        .select(`#${this.getLineId(date)}`)
        .transition()
        // delay before transition
        .delay(DELAY_SHOW)
        // duration of the opacity transition
        .duration(DURATION_SHOW)
        .style('stroke-opacity', 1)
        .style('stroke', this.colorOnShow(type))
        .on('end', () => {
          resolve(DELAY_SHOW + DURATION_SHOW);
        });
    });
  }

  private hideLine(
    date: Date,
    type: NumericalFeatureName = NumericalFeatureName.CURRENT,
  ) {
    return new Promise<number>((resolve, reject) => {
      d3.select(this.svg)
        .select(`#${this.getLineId(date)}`)
        .transition()
        .ease(d3.easeLinear)
        .delay(DELAY_HIDE)
        .duration(DURATION_HIDE)
        .style('stroke-opacity', this.opacityOnHideLine(type))
        .style('stroke', this.colorOnHideLine(type))
        .on('end', () => {
          resolve(DELAY_HIDE + DURATION_HIDE);
        });
    });
  }

  private showDots(
    date: Date,
    type: NumericalFeatureName = NumericalFeatureName.CURRENT,
  ) {
    return new Promise<number>((resolve, reject) => {
      d3.select(this.svg)
        .select(`#${this.getDotId(date)}`) // return group
        .selectAll('circle')
        .transition()
        // delay before transition
        .delay(DELAY_SHOW)
        // duration of the opacity transition
        .duration(DURATION_SHOW)
        .style('opacity', 1)
        .style('fill', this.colorOnShow(type))
        .on('end', () => {
          resolve(DELAY_SHOW + DURATION_SHOW);
        });
    });
  }

  private hideDots(date: Date, type?: NumericalFeatureName) {
    return new Promise<number>((resolve, reject) => {
      d3.select(this.svg)
        .select(`#${this.getDotId(date)}`) // returns group
        .selectAll('circle')
        .transition()
        .ease(d3.easeLinear)
        .delay(DELAY_HIDE)
        .duration(DURATION_HIDE)
        .style('opacity', 0)
        .on('end', () => {
          resolve(DELAY_HIDE + DURATION_HIDE);
        });
    });
  }

  private showAction(
    date: Date,
    type: NumericalFeatureName,
    action: Action,
  ): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      const data = this.data[findIndexByAnyDateField(this.data, date)];

      action
        .updateProps({
          templateVariables: data,
          horizontalAlign: 'center' as HorizontalAlign,
          verticalAlign: 'top' as VerticalAlign,
        })
        .setCanvas(this.svg)
        // .setCoordinate([[0, 0], this.topMidCoordinate()]);
        .setCoordinate([[0, 0], this.coordinateOnAxis(date)]);

      logger.debug('PCP:showAction: action:', this.topMidCoordinate());

      return Promise.all([
        action.show(),
        action.move(this.topMidCoordinate(), 500, 2000),
      ])
        .then((results) => {
          // Assuming the desired number to resolve with is in the results array
          // You might need to adjust this depending on what exactly you're expecting
          resolve(results[0]); // or another relevant value based on the promises
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  private hideAction(date: Date, type: NumericalFeatureName, action: Action) {
    return new Promise<number>((resolve, reject) => {
      return action.hide();
    });
  }

  private getLineId(date: Date) {
    return `id-line-${date.getTime()}`;
  }

  private getDotId(date: Date) {
    return `id-dot-${date.getTime()}`;
  }

  private colorOnShow(type: NumericalFeatureName): string {
    return LineColor[type] ?? Colors.Grey;
  }

  private colorOnHideLine(type: NumericalFeatureName) {
    if (
      type === NumericalFeatureName.MAX ||
      type === NumericalFeatureName.MIN
    ) {
      return LineColor[type] ?? Colors.Grey;
    } else {
      return Colors.LightGrey1;
    }
  }

  private opacityOnHideLine(type: NumericalFeatureName) {
    if (
      type === NumericalFeatureName.MAX ||
      type === NumericalFeatureName.MIN
    ) {
      return 1;
    } else {
      return 0.3;
    }
  }

  private midXCoordinate(): number {
    const dateScale = this.xScaleMap.get('date');
    const mid =
      (dateScale(this.data[this.data.length - 1].date) +
        dateScale(this.data[0].date)) *
      0.5;

    return mid;
  }

  private coordinateOnAxis(date: Date): Coordinate {
    const data = this.data[findIndexByAnyDateField(this.data, date)];
    const xScale = this.xScaleMap.get(this.selectedAxis);
    const x = xScale(data[this.selectedAxis]);
    const y = this.yScale(this.selectedAxis);
    return [x, y];
  }

  private topLeftCoordinate(): Coordinate {
    return [
      this.props.margin.right + ANNO_X_POS,
      ANNO_Y_POS + this.props.margin.top / 2,
    ];
  }

  private topMidCoordinate(): Coordinate {
    return [this.midXCoordinate(), ANNO_Y_POS + this.props.margin.top / 2];
  }

  private topRightCoordinate(): Coordinate {
    return [this.width - this.props.margin.left - ANNO_X_POS, ANNO_Y_POS];
  }

  public getCoordinates(...args: unknown[]): [Coordinate, Coordinate] {
    // Return coordinates based on the plot's dimensions
    return [
      [this.props.margin.left, this.props.margin.top],
      [
        this.width - this.props.margin.right,
        this.height - this.props.margin.bottom,
      ],
    ];
  }

  /**
   * Reset the plot by clearing the SVG and resetting state
   */
  public reset() {
    if (this.svg) {
      d3.select(this.svg).selectAll('*').remove();
    }

    this.data = [];
    this.timelineActions = [];
    this.axisNames = [];
    this.selectedAxis = '';
    this.xScaleMap = null;
    this.yScale = null;
    this.staticLineColorMap = null;

    return this;
  }
}
