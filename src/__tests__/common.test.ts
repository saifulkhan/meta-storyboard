import {
  mean,
  normalise,
  maxIndex,
  minIndex,
  scaleValue,
  sortTimeseriesData,
  findIndexByExactDate,
  findIndexByAnyDateField,
  sliceTimeseriesByDate,
} from '../common';
import { TimeSeriesData } from '../types';
import { makeTimeSeries } from './testData';

describe('common', () => {
  test('mean computes the arithmetic mean', () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
  });

  test('normalise scales values into [0, 1]', () => {
    expect(normalise([0, 5, 10])).toEqual([0, 0.5, 1]);
  });

  test('normalise handles constant series without dividing by zero', () => {
    expect(normalise([3, 3, 3])).toEqual([0, 0, 0]);
  });

  test('maxIndex and minIndex behave like their d3 counterparts', () => {
    expect(maxIndex([1, 9, 4])).toBe(1);
    expect(minIndex([5, 2, 8])).toBe(1);
    expect(maxIndex<{ v: number }>([{ v: 1 }, { v: 7 }], (d) => d.v)).toBe(1);
    expect(maxIndex([])).toBe(-1);
    expect(minIndex([])).toBe(-1);
  });

  test('scaleValue maps between ranges', () => {
    expect(scaleValue(5, 0, 10, 0, 100)).toBe(50);
  });

  test('sortTimeseriesData does not invent y values without yKey', () => {
    const data: TimeSeriesData = [
      { date: new Date('2020-01-02'), acc: 0.5 },
      { date: new Date('2020-01-01'), acc: 0.9 },
    ];
    const sorted = sortTimeseriesData(data, 'acc');
    expect(sorted[0].y).toBeUndefined();
  });

  test('sortTimeseriesData populates y from the given yKey', () => {
    const data: TimeSeriesData = [
      { date: new Date('2020-01-02'), acc: 0.5 },
      { date: new Date('2020-01-01'), acc: 0.9 },
    ];
    const sorted = sortTimeseriesData(data, 'acc', 'acc');
    expect(sorted.every((d) => typeof d.y === 'number')).toBe(true);
    // original data must not be mutated
    expect(data[0].y).toBeUndefined();
  });

  test('findIndexByExactDate finds matching timestamps', () => {
    const data = makeTimeSeries([1, 2, 3]);
    expect(findIndexByExactDate(data, data[2].date)).toBe(2);
    expect(findIndexByExactDate(data, new Date('1999-01-01'))).toBe(-1);
  });

  test('findIndexByAnyDateField matches any Date-valued field', () => {
    const data = makeTimeSeries([1, 2, 3]);
    expect(findIndexByAnyDateField(data, data[1].date)).toBe(1);
  });

  test('sliceTimeseriesByDate slices inclusively', () => {
    const data = makeTimeSeries([1, 2, 3, 4, 5]);
    const slice = sliceTimeseriesByDate(data, data[1].date, data[3].date);
    expect(slice).toHaveLength(3);
  });
});
