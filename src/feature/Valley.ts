import { NumericalFeature } from './NumericalFeature';
import { NumericalFeatureName } from '../types';

export class Valley extends NumericalFeature {
  protected normHeight: number = 0;
  protected normWidth: number = 0;
  protected normDuration: number = 0;

  constructor() {
    super();
    this.type = NumericalFeatureName.VALLEY;
  }

  setNormWidth(normWidth: number) {
    this.normWidth = normWidth;
    return this;
  }

  getNormWidth() {
    return this.normWidth;
  }

  setNormHeight(normHeight: number) {
    this.normHeight = normHeight;
    return this;
  }

  getNormHeight() {
    return this.normHeight;
  }

  setNormDuration(normDuration: number) {
    this.normDuration = normDuration;
    return this;
  }

  getNormDuration() {
    return this.normDuration;
  }
}
