import * as d3 from 'd3';
import { ActionName } from '../../types/ActionName';
import { Action, defaultActionProps } from './Action';
import { Coordinate, DotProps } from '../../types';

export const defaultDotProps: DotProps = {
  ...defaultActionProps,
  size: 5,
  color: '#000000',
  opacity: 1,
};

export class Dot extends Action {
  protected props: DotProps = defaultDotProps;
  protected dotNode: any;

  constructor() {
    super();
    this.type = ActionName.DOT;
  }

  public setProps(props: Partial<DotProps>) {
    this.props = { ...this.props, ...props };
    return this;
  }
  public setCanvas(svg: SVGGElement) {
    this.svg = svg;
    this.canvas();
    this.draw();
    return this;
  }

  public draw() {
    this.dotNode = d3
      .create('svg')
      .append('circle')
      .attr('r', this.props.size)
      .attr('fill', this.props.color)
      .attr('opacity', this.props.opacity)
      .node();

    this.node!.appendChild(this.dotNode);

    return this;
  }

  public setCoordinate(coordinate: [Coordinate, Coordinate]): this {
    this.coordOrigin = coordinate[0];
    this.coordDestination = coordinate[1];

    d3.select(this.dotNode)
      .attr('cx', this.coordDestination[0])
      .attr('cy', this.coordDestination[1]);

    return this;
  }

  public updateProps(properties: Partial<DotProps>): this {
    this.props = { ...this.props, ...properties };
    return this;
  }

  public move(
    coordinate: Coordinate,
    delay?: number | undefined,
    duration?: number | undefined,
  ): Promise<any> {
    throw new Error('Dot: move() not implemented!');
  }
}
