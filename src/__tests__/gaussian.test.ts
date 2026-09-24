import { Gaussian } from '../processing/Gaussian';
import { CategoricalFeature } from '../feature/CategoricalFeature';
import { makeTimeSeries, singlePeakSeries } from './testData';

describe('Gaussian', () => {
  test('gaussian curve peaks at the mean with the given height', () => {
    const curve = Gaussian.gaussian(10, 5, 21);
    expect(curve).toHaveLength(21);
    expect(curve[10]).toBeCloseTo(5);
    expect(curve[0]).toBeLessThan(curve[10]);
    expect(curve[20]).toBeLessThan(curve[10]);
  });

  test('maxAcrossSeries computes the upper envelope', () => {
    const reference = makeTimeSeries([0, 0, 0]);
    const a = makeTimeSeries([1, 5, 2]);
    const b = makeTimeSeries([3, 1, 4]);
    const envelope = Gaussian.maxAcrossSeries(reference, [a, b]);
    expect(envelope.map((d) => d.y)).toEqual([3, 5, 4]);
  });

  test('combineSeries averages multiple series', () => {
    const reference = makeTimeSeries([0, 0]);
    const a = makeTimeSeries([2, 4]);
    const b = makeTimeSeries([4, 8]);
    const combined = Gaussian.combineSeries(reference, [a, b]);
    expect(combined.map((d) => d.y)).toEqual([3, 6]);
  });

  test('combineSeries returns [] on invalid input', () => {
    expect(Gaussian.combineSeries([], [])).toEqual([]);
  });

  test('gmm combines numerical peaks and categorical events', () => {
    const data = singlePeakSeries();
    const categorical = [
      new CategoricalFeature().setDate(data[5].date).setRank(5),
    ];
    const combined = Gaussian.gmm(data, categorical);
    expect(combined).toHaveLength(data.length);
    expect(combined.every((d) => typeof d.y === 'number')).toBe(true);
  });
});
