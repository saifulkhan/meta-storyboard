import { Search } from '../processing/Search';
import { NumericalFeatureName } from '../types';
import { CategoricalFeature } from '../feature/CategoricalFeature';
import { makeTimeSeries, singlePeakSeries } from './testData';

describe('Search', () => {
  test('searchPeaks finds the single peak of a triangle series', () => {
    const data = singlePeakSeries();
    const peaks = Search.searchPeaks(data, 3, 'metric', 10);
    expect(peaks.length).toBeGreaterThanOrEqual(1);
    expect(peaks[0].getDate().getTime()).toBe(data[15].date.getTime());
    expect(peaks[0].getRank()).toBe(3);
    expect(peaks[0].getType()).toBe(NumericalFeatureName.PEAK);
  });

  test('searchPeaks returns [] for insufficient data', () => {
    expect(Search.searchPeaks(makeTimeSeries([1, 2]), 0, '', 10)).toEqual([]);
  });

  test('searchValleys finds the dip of a v-shaped series', () => {
    const ys = Array.from({ length: 31 }, (_, i) => Math.abs(15 - i) * 6);
    const data = makeTimeSeries(ys);
    const valleys = Search.searchValleys(data, 2, '', 10);
    expect(valleys.length).toBeGreaterThanOrEqual(1);
    expect(valleys[0].getDate().getTime()).toBe(data[15].date.getTime());
    expect(valleys[0].getType()).toBe(NumericalFeatureName.VALLEY);
    // height reported from the original (non-inverted) series
    expect(valleys[0].getHeight()).toBe(0);
  });

  test('searchGlobalMax and searchGlobalMin find extreme points', () => {
    const data = makeTimeSeries([5, 1, 9, 3]);
    const [max] = Search.searchGlobalMax(data, 1, '');
    const [min] = Search.searchGlobalMin(data, 1, '');
    expect(max.getHeight()).toBe(9);
    expect(max.getDataIndex()).toBe(2);
    expect(min.getHeight()).toBe(1);
    expect(min.getDataIndex()).toBe(1);
  });

  test('searchFirst / searchCurrent / searchLast return typed features', () => {
    const data = makeTimeSeries([5, 1, 9]);
    expect(Search.searchFirst(data, 0, '')[0].getType()).toBe(
      NumericalFeatureName.FIRST,
    );
    expect(Search.searchCurrent(data, 0, '')[0].getType()).toBe(
      NumericalFeatureName.CURRENT,
    );
    expect(Search.searchLast(data, 0, '')[0].getType()).toBe(
      NumericalFeatureName.LAST,
    );
  });

  test('searchSlopes computes window slopes', () => {
    // strictly increasing series: slope 2 per step
    const data = makeTimeSeries(Array.from({ length: 20 }, (_, i) => i * 2));
    const slopes = Search.searchSlopes(data, 0, '', 5);
    expect(slopes.length).toBe(15);
    slopes.forEach((s) => expect(s.getSlope()).toBeCloseTo(2));
  });

  test('searchFalls and searchRises are symmetric', () => {
    const up = Array.from({ length: 40 }, (_, i) => i);
    const down = [...up].reverse();
    const rises = Search.searchRises(makeTimeSeries(up), '', 4);
    const falls = Search.searchFalls(makeTimeSeries(down), '', 4);
    expect(rises.length).toBe(falls.length);
    expect(rises.length).toBeGreaterThanOrEqual(1);
    expect(rises[0].getRank()).toBe(4);
    expect(falls[0].getRank()).toBe(4);
    expect(falls[0].getType()).toBe(NumericalFeatureName.FALL);
    expect(rises[0].getType()).toBe(NumericalFeatureName.RAISE);
  });

  test('findClosestFeature picks the nearest feature by date', () => {
    const data = singlePeakSeries();
    const numerical = Search.searchPeaks(data, 0, '', 10);
    const categorical = [
      new CategoricalFeature().setDate(data[0].date).setRank(1),
    ];
    const closest = Search.findClosestFeature(
      categorical,
      numerical,
      data[1].date,
    );
    expect(closest).toBe(categorical[0]);
  });
});
