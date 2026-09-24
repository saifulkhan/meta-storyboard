import { NumericalFeature } from './NumericalFeature';
import { NumericalFeatureName } from '../types';

export class Rise extends NumericalFeature {
  protected grad: number = 0;
  protected normGrad: number = 0;

  constructor() {
    super();
    this.type = NumericalFeatureName.RAISE;
  }

  setGrad(grad: number) {
    this.grad = grad;
    return this;
  }

  getGrad() {
    // TODO: check
    return this.grad > 5 ? 'steep' : this.grad > 2 ? 'steady' : 'slow';
  }

  setNormGrad(normGrad: number) {
    this.normGrad = normGrad;
    return this;
  }

  getNormGrad() {
    return this.normGrad;
  }
}
