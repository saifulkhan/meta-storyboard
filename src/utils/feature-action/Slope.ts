import { NumericalFeature } from "./NumericalFeature";
import { MSBFeatureName } from "./MSBFeatureName";

export class Slope extends NumericalFeature {
  protected slope: number = 0;

  constructor() {
    super();
    this.type = MSBFeatureName.SLOPE;
  }

  setSlope(slope: number) {
    this.slope = slope;
    return this;
  }

  getSlope(): number {
    return this.slope;
  }
}
