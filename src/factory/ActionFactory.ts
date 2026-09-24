import {
  Action,
  ActionName,
  Circle,
  ActionGroup,
  Connector,
  Dot,
  TextBox,
} from '../components';
import { ActionZOrder, AnyActionProps } from '../types';

/** creates an action instance from loose (partial) properties */
export type ActionCreator = (props: AnyActionProps) => Action;

/**
 * Creates action objects from a (table-provided) action name and properties.
 *
 * The built-in actions (DOT, CIRCLE, TEXT_BOX, CONNECTOR) are pre-registered;
 * applications can add their own action types with `ActionFactory.register()`
 * and use them in feature-action tables without modifying the library.
 */
export class ActionFactory {
  private static registry = new Map<string, ActionCreator>([
    [ActionName.DOT, (props) => new Dot().setProps(props)],
    [ActionName.TEXT_BOX, (props) => new TextBox().setProps(props)],
    [ActionName.CIRCLE, (props) => new Circle().setProps(props)],
    [ActionName.CONNECTOR, (props) => new Connector().setProps(props)],
  ]);

  /**
   * Register a custom action type.
   *
   * @param name - The action name used in feature-action tables
   * @param creator - Factory function creating the action from properties
   * @param zOrder - Optional z-order used when actions are grouped (higher draws later)
   */
  public static register(
    name: string,
    creator: ActionCreator,
    zOrder?: number,
  ): void {
    ActionFactory.registry.set(name, creator);
    if (zOrder !== undefined) {
      ActionZOrder[name] = zOrder;
    }
  }

  /** returns the registered action names */
  public static registeredActions(): string[] {
    return [...ActionFactory.registry.keys()];
  }

  public create(action: ActionName | string, props: AnyActionProps): Action {
    const creator = ActionFactory.registry.get(action);
    if (!creator) {
      throw new Error(
        `ActionFactory: action "${action}" is not implemented; ` +
          `register it with ActionFactory.register("${action}", creator).`,
      );
    }
    return creator(props);
  }

  public group(actions: Action[]): ActionGroup {
    const action = new ActionGroup();
    return action.group(actions);
  }
}
