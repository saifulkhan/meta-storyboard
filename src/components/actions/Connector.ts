import * as d3 from 'd3';
import { ActionName } from '../../types/ActionName';
import { Action, defaultActionProps } from './Action';
import { Coordinate, ConnectorProps } from '../../types';

export const defaultConnectorProperties: ConnectorProps = {
  ...defaultActionProps,
  stroke: '#000000',
  opacity: 1,
};

export class Connector extends Action {
  protected props: ConnectorProps = defaultConnectorProperties;
  protected connectorNode: any;

  constructor() {
    super();
    this.type = ActionName.CONNECTOR;
  }

  public setProps(properties: Partial<ConnectorProps>) {
    this.props = { ...defaultConnectorProperties, ...properties };
    return this;
  }

  public setCanvas(svg: SVGGElement) {
    this.svg = svg;
    this.canvas();
    this.draw();
    return this;
  }

  public draw() {
    this.connectorNode = d3
      .create('svg')
      .append('line')
      .attr('stroke', this.props.stroke)
      .attr('opacity', this.props.opacity)
      .style('stroke-dasharray', '5,5')
      .node();
    this.node!.appendChild(this.connectorNode);

    return this;
  }

  public setCoordinate(coordinate: [Coordinate, Coordinate]): this {
    this.coordOrigin = coordinate[0];
    this.coordDestination = coordinate[1];

    d3.select(this.connectorNode)
      .attr('x1', this.coordOrigin[0])
      .attr('y1', this.coordOrigin[1])
      .attr('x2', this.coordDestination[0])
      .attr('y2', this.coordDestination[1]);

    return this;
  }

  public updateProps(properties: Partial<ConnectorProps>): this {
    this.props = { ...this.props, ...properties };
    return this;
  }

  public move(
    coordinate: Coordinate,
    delay?: number | undefined,
    duration?: number | undefined,
  ): Promise<any> {
    throw new Error('Connector: move() not implemented!');
  }
}
