import { TimeSeriesPoint, TimeSeriesData } from '../types';
import { Peak } from '../feature/Peak';
import { Segment } from '../types';
import { Search } from './Search';
import * as common from '../common';

/**
 * Utils class containing static utility methods for time series data processing,
 * segmentation, and ranking functions. Generic helpers delegate to the
 * functional API in `common.ts` so there is a single implementation.
 */
export class Utils {
  /* rank used between 0 and MAX_RANK */
  private static readonly MAX_RANK = 10;

  /**
   * Calculates the mean of an array of numbers
   */
  public static mean(data: number[]): number {
    return common.mean(data);
  }

  /**
   * Sorts time series data by a specified key and ensures date order.
   * If a point has no `y` value and `yKey` is provided, `y` is populated
   * from that column.
   */
  public static sortTimeseriesData(
    data: TimeSeriesData,
    key: keyof TimeSeriesPoint,
    yKey?: string,
  ): TimeSeriesData {
    return common.sortTimeseriesData(data, key, yKey);
  }

  /**
   * Slices time series data between two dates
   */
  public static sliceTimeseriesByDate(
    data: TimeSeriesData,
    start: Date,
    end: Date,
  ): TimeSeriesData {
    return common.sliceTimeseriesByDate(data, start, end);
  }

  /**
   * Finds the index of a date in time series data
   */
  public static findDateIdx(date: Date, data: TimeSeriesData): number {
    return common.findIndexByExactDate(data, date);
  }

  /**
   * Finds the index of a point whose any Date-valued field matches the date
   */
  public static findIndexOfDate(data: TimeSeriesData, date: Date): number {
    return common.findIndexByAnyDateField(data, date);
  }

  /**
   * Gets a time series point by date
   */
  public static getTimeSeriesPointByDate(
    date: Date,
    data: TimeSeriesData,
  ): TimeSeriesPoint | undefined {
    return common.getTimeSeriesPointByDate(date, data);
  }

  /**
   * Finds indices of multiple dates in time series data
   */
  public static findIndicesOfDates(
    data: TimeSeriesData,
    dates: Date[],
  ): number[] {
    return common.findIndicesOfDates(data, dates);
  }

  /**
   * Sets or updates a value in a map
   */
  public static setOrUpdateMap<K, V>(
    map: Map<K, V[] | Array<V>>,
    key: K,
    value: V,
  ): void {
    common.setOrUpdateMap(map, key, value);
  }

  /**
   * Sorts object keys in place
   */
  public static sortObjectKeysInPlace<T extends Record<string, any>>(
    obj: T,
  ): T {
    return common.sortObjectKeysInPlace(obj);
  }

  /**
   * Gets an array of object keys
   */
  public static getObjectKeysArray(obj: any[]): string[] {
    return common.getObjectKeysArray(obj);
  }

  /**
   * Finds the index of the maximum value in an iterable
   */
  public static maxIndex<T>(
    values: Iterable<T>,
    valueof?: (
      value: T,
      index: number,
      array: Iterable<T>,
    ) => number | null | undefined,
  ): number {
    return common.maxIndex(values, valueof);
  }

  /**
   * Finds the index of the minimum value in an iterable
   */
  public static minIndex<T>(
    values: Iterable<T>,
    valueof?: (
      value: T,
      index: number,
      array: Iterable<T>,
    ) => number | null | undefined,
  ): number {
    return common.minIndex(values, valueof);
  }

  /**
   * Min-Max normalization of data of the form [x0, x1, ...xn]
   */
  public static normalise(data: number[]): number[] {
    return common.normalise(data);
  }

  /**
   * Scales a value from one range to another
   */
  public static scaleValue(
    value: number,
    minInput: number,
    maxInput: number,
    minOutput: number,
    maxOutput: number,
  ): number {
    return common.scaleValue(value, minInput, maxInput, minOutput, maxOutput);
  }

  /**
   * Assigns discrete ranks to an array of Peak objects based on their height.
   * Discrete, grouped ranks (good for categorical/bucketed analysis).
   */
  public static rankPeaksByHeight(peaks: Peak[]) {
    if (peaks.length === 0) return;
    // create a sorted copy for ranking
    const sorted = [...peaks].sort((p1, p2) => p1.getHeight() - p2.getHeight());
    const numPeaks = sorted.length;
    const groupSize = numPeaks / Utils.MAX_RANK;

    // map from Peak to its rank
    const peakToRank = new Map<Peak, number>();
    sorted.forEach((p: Peak, i: number) => {
      const rank = 1 + Math.floor(i / groupSize);
      peakToRank.set(p, rank);
    });

    // assign rank in original order
    peaks.forEach((p) => {
      p.setRank(peakToRank.get(p) || 1);
    });
  }

  /**
   * Assigns normalized height to an array of Peak objects based on their height.
   * Continuous, normalized values (good for smooth, relative comparisons).
   */
  public static setPeaksNormHeight(peaks: Peak[]) {
    if (peaks.length === 0) return;
    // create a sorted copy for normalization
    const sorted = [...peaks].sort((p1, p2) => p1.getHeight() - p2.getHeight());

    const maxValue = sorted[sorted.length - 1].getHeight();
    const minValue = sorted[0].getHeight();

    // map from Peak to its normalized height
    const peakToNorm = new Map<Peak, number>();
    sorted.forEach((p) => {
      peakToNorm.set(
        p,
        Utils.scaleValue(p.getHeight(), minValue, maxValue, 1, Utils.MAX_RANK),
      );
    });

    // assign normalized height in original order
    peaks.forEach((p) => {
      p.setNormHeight(peakToNorm.get(p) || 1);
    });
  }

  /**
   * Segments by the k most important peaks.
   */
  public static segmentByPeaks(data: TimeSeriesData, k: number): Segment[] {
    const peaks: Peak[] = Search.searchPeaks(data);
    Utils.setPeaksNormHeight(peaks);

    // create peaks with just index and height
    const peakIndices: { idx: number; h: number }[] = peaks.map((d: Peak) => ({
      idx: d.getDataIndex(),
      h: d.getNormHeight(),
    }));

    peakIndices.sort((a, b) => b.h - a.h);

    return peakIndices
      .slice(0, k - 1)
      .map((d) => ({ idx: d.idx, date: data[d.idx]?.date }));
  }

  /**
   * Segments a time series by identifying the k most important peaks with a minimum gap.
   */
  public static segmentByImportantPeaks(
    data: TimeSeriesData,
    k: number,
    deltaMax = 0.1,
  ): Segment[] {
    // find and rank all peaks in the data
    const peaks: Peak[] = Search.searchPeaks(data);
    Utils.setPeaksNormHeight(peaks);
    const dataLength = data.length;

    // create a simplified representation of peaks with just index and height
    const peakIndices: { idx: number; h: number }[] = peaks.map((d: Peak) => ({
      idx: d.getDataIndex(),
      h: d.getNormHeight(),
    }));

    const ordering: { idx: number; h: number }[] = [];

    while (peakIndices.length) {
      let bestPeak:
        | { valley: { idx: number; h: number }; idx: number; score: number }
        | undefined;

      peakIndices.forEach((v1, i) => {
        const closestDist = ordering.reduce(
          (closest, v2) => Math.min(closest, Math.abs(v1.idx - v2.idx)),
          Math.min(v1.idx, dataLength - v1.idx),
        );
        const score = (closestDist / dataLength) * (v1.h / 2);
        bestPeak =
          bestPeak && bestPeak.score > score
            ? bestPeak
            : { valley: v1, idx: i, score: score };
      });
      peakIndices.splice(bestPeak!.idx, 1);
      ordering.push(bestPeak!.valley);
    }

    return ordering
      .slice(0, k - 1)
      .map((d) => ({ idx: d.idx, date: data[d.idx]?.date }));
  }

  /**
   * Segments time series data by finding important peaks with a minimum distance constraint.
   * This function directly analyzes the time series data to find peaks, without requiring
   * pre-processing through the Peak class.
   */
  public static segmentByImportantPeaks1(
    data: TimeSeriesData,
    k: number,
    deltaMax = 0.1,
  ): Segment[] {
    if (k <= 1 || data.length === 0) {
      return [];
    }

    // calculate the actual minimum distance in data points
    const minDistance = Math.ceil(deltaMax * data.length);

    // calculate the prominence of each point (how much it stands out)
    const prominences: { index: number; value: number }[] = [];

    for (let i = 1; i < data.length - 1; i++) {
      const current = data[i].y ?? 0;
      const prev = data[i - 1].y ?? 0;
      const next = data[i + 1].y ?? 0;

      // a point is a peak if it's higher than its neighbors
      if (current > prev && current > next) {
        // prominence: how much higher the peak is compared to its neighbors
        const prominence = Math.min(current - prev, current - next);
        prominences.push({ index: i, value: prominence });
      }
    }

    // sort peaks by prominence (highest first)
    prominences.sort((a, b) => b.value - a.value);

    // select peaks with the distance constraint
    const selectedPeaks: number[] = [];

    for (const peak of prominences) {
      // check if this peak is far enough from already selected peaks
      const isFarEnough = selectedPeaks.every(
        (selectedIndex) => Math.abs(peak.index - selectedIndex) >= minDistance,
      );

      if (isFarEnough) {
        selectedPeaks.push(peak.index);

        // break once we have k-1 peaks
        if (selectedPeaks.length === k - 1) {
          break;
        }
      }
    }

    // sort peaks by their position in the time series and map to objects with idx and date
    return selectedPeaks
      .sort((a, b) => a - b)
      .map((idx) => ({ idx, date: data[idx]?.date }));
  }
}
