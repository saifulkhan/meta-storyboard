import { CategoricalFeatureName } from './CategoricalFeatureName';
import { Condition } from './Condition';
import { NumericalFeatureName } from './NumericalFeatureName';
import { CircleProps } from './CircleProps';
import { DotProps } from './DotProps';
import { ConnectorProps } from './ConnectorProps';
import { TextBoxProps } from './TextBoxProps';
import { ActionName } from './ActionName';

/**
 * Loose union of all action properties; table rows typically provide only a
 * subset of the fields and the rest are filled with per-action defaults.
 */
export type AnyActionProps = Partial<
  CircleProps & ConnectorProps & DotProps & TextBoxProps
>;

export type ActionTableRow = {
  /** built-in action name or a custom name registered via ActionFactory.register() */
  action: ActionName | string;
  properties: AnyActionProps;
};

export type FeatureActionTableRow = {
  /** built-in feature name or a custom name registered via FeatureFactory.register() */
  feature: NumericalFeatureName | CategoricalFeatureName | string;
  properties: Condition;
  rank: number;
  actions: ActionTableRow[];
  comment?: string;
};

export type FeatureActionTableData = FeatureActionTableRow[];
