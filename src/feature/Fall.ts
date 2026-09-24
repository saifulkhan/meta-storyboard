import { NumericalFeature } from './NumericalFeature';
import { NumericalFeatureName } from '../types';

export class Fall extends NumericalFeature {
  protected grad: number = 0;
  protected normGrad: number = 0;

  constructor(
    date?: Date,
    height?: number,
    rank?: number,
    metric?: string,
    start?: Date,
    end?: Date,
  ) {
    super();
    this.type = NumericalFeatureName.FALL;
    if (date !== undefined) this.setDate(date);
    if (height !== undefined) this.setHeight(height);
    if (rank !== undefined) this.setRank(rank);
    if (metric !== undefined) this.setMetric(metric);
    if (start !== undefined) this.setStart(start);
    if (end !== undefined) this.setEnd(end);
  }

  setGrad(grad: number) {
    this.grad = grad;
    return this;
  }

  getGrad() {
    if (!this.grad) {
      throw 'You must set Fall grad using setGrad().';
    }
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
