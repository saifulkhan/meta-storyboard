import { NumericalFeature } from "./NumericalFeature";
import { MSBFeatureName } from "./MSBFeatureName";

export class Current extends NumericalFeature {
  constructor() {
    super();
    this.type = MSBFeatureName.CURRENT;
  }
}
