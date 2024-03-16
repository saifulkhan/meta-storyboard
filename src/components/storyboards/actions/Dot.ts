import * as d3 from "d3";
import { Action, Coordinate } from "./Action";
import { Actions } from "./Actions";

export type DotProperties = {
  id?: string;
  size?: number;
  color?: string;
  opacity?: number;
};

export const defaultDotProperties: DotProperties = {
  id: "Dot",
  size: 5,
  color: "#000000",
  opacity: 1,
};

export class Dot extends Action {
  protected _properties: DotProperties;
  protected _dotNode;

  constructor() {
    super();
    this._type = Actions.DOT;
  }

  public properties(properties: DotProperties = {}) {
    this._properties = { ...defaultDotProperties, ...properties };
    return this;
  }

  public draw() {
    this._dotNode = d3
      .create("svg")
      .append("circle")
      .attr("r", this._properties.size)
      .attr("fill", this._properties.color)
      .attr("opacity", this._properties.opacity)
      .node();
    this._node.appendChild(this._dotNode);

    return this;
  }

  public coordinate(coordinate: [Coordinate, Coordinate]): this {
    const [x1, y1] = coordinate[0];
    const [x2, y2] = coordinate[1];

    d3.select(this._dotNode).attr("cx", x2).attr("cy", y2);
    return this;
  }
}
