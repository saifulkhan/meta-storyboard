import { Action } from './Action';
import { ActionZOrder } from '../../types/ActionName';
import { Coordinate, AnyActionProps } from '../../types';

export class ActionGroup extends Action {
  private actions: Action[] = [];

  constructor() {
    super();
  }

  group(actions: Action[]) {
    this.actions = [...actions];
    return this;
  }

  public setProps(props: AnyActionProps): this {
    this.props = { ...this.props, ...props };

    this.actions.map((d: Action) => d.setProps(props));
    return this;
  }

  public updateProps(props: AnyActionProps) {
    this.props = { ...this.props, ...props };
    this.actions.map((d: Action) => d.updateProps(props));
    return this;
  }

  public setCanvas(svg: SVGGElement) {
    // unknown (custom) actions sort last
    this.actions.sort(
      (a: Action, b: Action) =>
        (ActionZOrder[b.getType()] ?? Number.MAX_SAFE_INTEGER) -
        (ActionZOrder[a.getType()] ?? Number.MAX_SAFE_INTEGER),
    );
    this.actions.map((d: Action) => d.setCanvas(svg));
    return this;
  }

  public setCoordinate(coordinate: [Coordinate, Coordinate]) {
    this.actions.map((d: Action) => d.setCoordinate(coordinate));
    return this;
  }

  public show(delay = 0, duration = 1000): Promise<number> {
    const promises = this.actions.map((d: Action) => d.show(delay, duration));
    return Promise.all(promises).then((results) => {
      // Return the maximum delay + duration value from all actions
      return Math.max(...results);
    });
  }

  public hide(delay = 0, duration = 1000): Promise<number> {
    const promises = this.actions.map((d: Action) => d.hide(delay, duration));
    return Promise.all(promises).then((results) => {
      // Return the maximum delay + duration value from all actions
      return Math.max(...results);
    });
  }

  public move(
    coordinate: Coordinate,
    delay: number = 0,
    duration: number = 1000,
  ): Promise<any> {
    const promises = this.actions.map((d: Action) =>
      d.move(coordinate, delay, duration),
    );
    return Promise.all(promises);
  }

  public draw(): void {
    // for a group, draw all child actions
    this.actions.forEach((action: Action) => action.draw());
  }

  public remove(): this {
    this.actions.forEach((action: Action) => action.remove());
    return this;
  }
}
