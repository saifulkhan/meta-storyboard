import { MSBAction } from "./MSBAction";
import { MSBActionName } from "./MSBActionName";
import { Circle, CircleProps } from "./Circle";
import { MSBActionGroup } from "./MSBActionGroup";
import { Connector, ConnectorProps } from "./Connector";
import { Dot, DotProps } from "./Dot";
import { TextBox, TextBoxProps } from "./TextBox";
import { TimeSeriesPoint } from "../../types/TimeSeriesPoint";

export class MSBActionFactory {
  constructor() {}

  public create(
    action: MSBActionName,
    props: CircleProps | ConnectorProps | DotProps | TextBoxProps,
    data?: TimeSeriesPoint
  ): MSBAction | undefined {
    // prettier-ignore
    // console.log("MSBActionFactory:create: action = ", action, ", properties = ", properties);

    switch (action) {
      case MSBActionName.DOT:
        return new Dot().setProps(props as DotProps);
      case MSBActionName.TEXT_BOX:
        return new TextBox().setProps(props as TextBoxProps, data);
      case MSBActionName.CIRCLE:
        return new Circle().setProps(props as CircleProps);
      case MSBActionName.CONNECTOR:
        return new Connector().setProps(props as ConnectorProps);
      default:
        console.error(`Action ${action} is not implemented!`);
    }
  }

  public group(actions: MSBAction[]): MSBActionGroup {
    const action = new MSBActionGroup();
    return action.group(actions);
  }
}
