import { FeatureFactory } from '../factory/FeatureFactory';
import { NumericalFeatureName } from '../types';
import { Max } from '../feature/Max';
import { makeTimeSeries, singlePeakSeries } from './testData';

describe('FeatureFactory', () => {
  const factory = () =>
    new FeatureFactory().setProps({ metric: 'm', window: 10 });

  test('detects built-in features end to end', () => {
    const data = singlePeakSeries();
    const f = factory().setData(data);

    expect(f.searchNumericalFeature(NumericalFeatureName.PEAK).length).toBeGreaterThan(0);
    expect(f.searchNumericalFeature(NumericalFeatureName.MAX)).toHaveLength(1);
    expect(f.searchNumericalFeature(NumericalFeatureName.MIN)).toHaveLength(1);
    expect(f.searchNumericalFeature(NumericalFeatureName.FIRST)).toHaveLength(1);
    expect(f.searchNumericalFeature(NumericalFeatureName.LAST)).toHaveLength(1);
    expect(f.searchNumericalFeature(NumericalFeatureName.VALLEY)).toBeDefined();
  });

  test('FALL and RAISE are wired to the search functions', () => {
    const up = makeTimeSeries(Array.from({ length: 40 }, (_, i) => i));
    const down = makeTimeSeries(
      Array.from({ length: 40 }, (_, i) => 40 - i),
    );

    expect(
      factory().setData(up).searchNumericalFeature(NumericalFeatureName.RAISE)
        .length,
    ).toBeGreaterThan(0);
    expect(
      factory().setData(down).searchNumericalFeature(NumericalFeatureName.FALL)
        .length,
    ).toBeGreaterThan(0);
  });

  test('conditions le/ge and their aliases lte/gte all work', () => {
    const data = makeTimeSeries(Array.from({ length: 20 }, (_, i) => i * 2));
    const f = factory().setData(data);

    const le = f.searchNumericalFeature(
      NumericalFeatureName.SLOPE,
      { le: 2 },
      0,
    );
    const lte = f.searchNumericalFeature(
      NumericalFeatureName.SLOPE,
      { lte: 2 },
      0,
    );
    expect(le.length).toBe(lte.length);
    expect(le.length).toBeGreaterThan(0);

    const ge = f.searchNumericalFeature(
      NumericalFeatureName.SLOPE,
      { ge: 100 },
      0,
    );
    const gte = f.searchNumericalFeature(
      NumericalFeatureName.SLOPE,
      { gte: 100 },
      0,
    );
    expect(ge).toHaveLength(0);
    expect(gte).toHaveLength(0);
  });

  test('conditions filter non-slope features by height', () => {
    const data = makeTimeSeries([5, 1, 9, 3]);
    const f = factory().setData(data);
    expect(
      f.searchNumericalFeature(NumericalFeatureName.MAX, { gt: 100 }),
    ).toHaveLength(0);
    expect(
      f.searchNumericalFeature(NumericalFeatureName.MAX, { gt: 5 }),
    ).toHaveLength(1);
  });

  test('unknown feature throws a helpful error', () => {
    const f = factory().setData(makeTimeSeries([1, 2, 3]));
    expect(() => f.searchNumericalFeature('NO_SUCH_FEATURE')).toThrow(
      /not implemented.*register/i,
    );
  });

  test('unknown condition key throws a helpful error', () => {
    const f = factory().setData(makeTimeSeries([5, 1, 9, 3]));
    expect(() =>
      f.searchNumericalFeature(NumericalFeatureName.MAX, {
        bogus: 1,
      } as any),
    ).toThrow(/unknown condition/i);
  });

  test('custom feature detectors can be registered', () => {
    FeatureFactory.register('ALWAYS_MAX', (data, props, rank) => [
      new Max().setDate(data[0].date).setHeight(42).setRank(rank),
    ]);

    const found = factory()
      .setData(makeTimeSeries([1, 2, 3]))
      .searchNumericalFeature('ALWAYS_MAX', {}, 7);
    expect(found).toHaveLength(1);
    expect(found[0].getHeight()).toBe(42);
    expect(found[0].getRank()).toBe(7);
    expect(FeatureFactory.registeredFeatures()).toContain('ALWAYS_MAX');
  });
});
