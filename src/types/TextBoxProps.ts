import { ActionProps } from './ActionProps';
import { HorizontalAlign, VerticalAlign } from './Align';

export type TextBoxProps = ActionProps & {
  title: string;
  message: string;
  backgroundColor: string;
  width: number;
  showConnector: boolean;
  horizontalAlign: HorizontalAlign;
  verticalAlign: VerticalAlign;
  padding: number;
  fontFamily: string;
  fontSize: string;
};
