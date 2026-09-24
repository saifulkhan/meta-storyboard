import * as d3 from 'd3';
import { ActionName } from '../../types/ActionName';
import { Action, defaultActionProps } from './Action';
import { Coordinate, CircleProps } from '../../types';

export const defaultCircleProps: CircleProps = {
  ...defaultActionProps,
  size: 10,
  strokeWidth: 2,
  color: '#000000',
  opacity: 1,
};

export class Circle extends Action {
  protected props: CircleProps = defaultCircleProps;
  protected circleNode: any;

  constructor() {
    super();
    this.type = ActionName.CIRCLE;
  }

  public setProps(properties: Partial<CircleProps>) {
    this.props = { ...defaultCircleProps, ...properties };
    return this;
  }

  public setCanvas(svg: SVGGElement) {
    this.svg = svg;
    this.canvas();
    this.draw();
    return this;
  }

  public draw() {
    this.circleNode = d3
      .create('svg')
      .append('circle')
      .attr('fill', 'none')
      .attr('r', this.props.size!)
      .attr('stroke-width', this.props.strokeWidth!)
      .attr('stroke', this.props.color)
      .attr('opacity', this.props.opacity)
      .node();
    this.node!.appendChild(this.circleNode);
  }

  public setCoordinate(coordinate: [Coordinate, Coordinate]): this {
    this.coordOrigin = coordinate[0];
    this.coordDestination = coordinate[1];

    d3.select(this.circleNode)
      .attr('cx', this.coordDestination[0])
      .attr('cy', this.coordDestination[1]);

    return this;
  }

  public updateProps(properties: Partial<CircleProps>): this {
    this.props = { ...this.props, ...properties };
    return this;
  }

  public move(
    coordinate: Coordinate,
    delay?: number | undefined,
    duration?: number | undefined,
  ): Promise<any> {
    throw new Error('Circle: move() not implemented!');
  }
}
