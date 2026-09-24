import { TimeSeriesData } from '../types';

/** build a daily time series starting 2020-01-01 from an array of y values */
export function makeTimeSeries(ys: number[]): TimeSeriesData {
  const start = new Date('2020-01-01T00:00:00.000Z').getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  return ys.map((y, i) => ({ date: new Date(start + i * dayMs), y }));
}

/** a series with a single clear peak in the middle */
export function singlePeakSeries(): TimeSeriesData {
  // 31 points: rises to 100 at index 15, falls back down
  const ys = Array.from({ length: 31 }, (_, i) => 100 - Math.abs(15 - i) * 6);
  return makeTimeSeries(ys);
}
