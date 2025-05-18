import * as d3 from 'd3';
import { ActionName } from '../../types/ActionName';
import {
  NumericalFeatureName,
  CategoricalFeatureName,
  Coordinate,
  ActionProps,
} from '../../types';

export const defaultActionProps: ActionProps = {
  hide: true,
  pause: false,
};

export abstract class Action {
  protected type!: ActionName;
  protected props: ActionProps = defaultActionProps;
  protected svg!: SVGGElement;
  protected node: any = null;
  protected coordOrigin!: Coordinate;
  protected coordDestination!: Coordinate;
  protected featureType?: NumericalFeatureName | CategoricalFeatureName;

  constructor() {}

  public abstract setProps(properties: ActionProps): this;
  public abstract updateProps(properties: ActionProps): this;

  public getType(): ActionName {
    return this.type;
  }

  public abstract setCanvas(svg: SVGGElement): this;

  /**
   ** Set two coordinates source, [x0, y1] and destination, [x1, y1].
   **/
  public abstract setCoordinate(coordinate: [Coordinate, Coordinate]): this;

  public show(delay = 0, duration = 1000) {
    return new Promise<number>((resolve, reject) => {
      d3.select(this.node)
        .transition()
        // delay before transition
        .delay(0)
        // duration of the opacity transition
        .duration(duration)
        .style('opacity', 1)
        .transition()
        // delay after the opacity transition ends
        .delay(delay)
        .on('end', () => {
          resolve(delay + duration);
        });
    });
  }

  public hide(delay = 0, duration = 1000) {
    if (!this.props.hide) {
      return Promise.resolve(0);
    }

    return new Promise<number>((resolve, reject) => {
      d3.select(this.node)
        .transition()
        .delay(0)
        .duration(duration)
        .style('opacity', 0)
        .on('end', () => {
          resolve(delay + duration);
        });
    });
  }

  /**
   ** Move object from [x1, y1] coordinate to [x2, y2] coordinate.
   **/
  public abstract move(
    coordinate: Coordinate,
    delay: number,
    duration: number,
  ): Promise<any>;

  public remove() {
    d3.select(this.node).select('svg').remove();
    return this;
  }

  public abstract draw(): void;
  protected canvas(): void {
    this.node = d3
      .create('svg')
      .append('g')
      .style('opacity', 0)
      // another way to hide this object
      // .attr("display", "none")
      .node();

    d3.select(this.svg).append(() => this.node);
  }

  public setFeatureType(
    featureType: NumericalFeatureName | CategoricalFeatureName,
  ) {
    this.featureType = featureType;
    return this;
  }

  public getFeatureType() {
    return this.featureType;
  }

  public getProps() {
    return this.props;
  }
}
