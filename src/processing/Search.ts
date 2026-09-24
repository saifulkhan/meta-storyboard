import { Peak } from '../feature/Peak';
import { Valley } from '../feature/Valley';
import { Slope } from '../feature/Slope';
import { Min } from '../feature/Min';
import { Max } from '../feature/Max';
import { Fall } from '../feature/Fall';
import { Rise } from '../feature/Raise';
import { TimeSeriesData } from '../types';
import { Current } from '../feature/Current';
import { Last } from '../feature/Last';
import { First } from '../feature/First';
import { Feature } from '../feature/Feature';
import { CategoricalFeature } from '../feature/CategoricalFeature';
import { NumericalFeature } from '../feature/NumericalFeature';
import {
  normalise,
  findIndexByExactDate,
  maxIndex,
  minIndex,
} from '../common';
import { logger } from '../logger';

/**
 * Search class containing static methods for feature detection in time series data
 */
export class Search {
  private static readonly WINDOW = 10;

  /**
   * Searches for significant peaks in a time series dataset.
   *
   * This function identifies peaks in the data by:
   * 1. Finding local maxima using a sliding window approach
   * 2. Determining the start and end points of each peak
   * 3. Creating Peak objects with relevant metadata
   * 4. Filtering out overlapping peaks to keep only the most significant ones
   *
   * @param data - The time series data to analyze
   * @param rank - Importance rank to assign to detected peaks (default: 0)
   * @param metric - Name of the metric being analyzed (default: '')
   * @param window - Size of the sliding window for peak detection (default: WINDOW)
   * @returns Array of unique Peak objects representing significant peaks in the data
   */
  public static searchPeaks(
    data: TimeSeriesData,
    rank: number = 0,
    metric: string = '',
    window: number = Search.WINDOW,
  ): Peak[] {
    if (!data || data.length < window) {
      logger.warn(
        'searchPeaks: insufficient data points for the specified window size',
      );
      return [];
    }

    // find potential peak indices
    const maxes = Search.searchMaxes(data, window);
    if (maxes.length === 0) {
      return [];
    }

    // normalize y-values for consistent peak analysis
    const norm = normalise(data.map((d) => d.y ?? 0));

    // create Peak objects for each detected maximum
    const peaks: Peak[] = [];
    for (const idx of maxes) {
      // find the boundaries of each peak
      const start = Search.searchPeakStart(idx, norm);
      const end = Search.searchPeakEnd(idx, norm);

      // skip invalid peaks (where start/end couldn't be properly determined)
      if (start >= end || start < 0 || end >= data.length) {
        continue;
      }

      // create and configure the Peak object
      const peak = new Peak()
        .setDate(data[idx].date)
        .setHeight(data[idx].y ?? 0)
        .setNormWidth((end - start) / norm.length)
        .setNormHeight(norm[idx])
        .setRank(rank)
        .setMetric(metric)
        .setStart(data[start].date)
        .setEnd(data[end].date)
        .setDataIndex(idx);

      peaks.push(peak);
    }

    // sort peaks by height (descending) to prioritize larger peaks when filtering
    peaks.sort((p1, p2) => p2.getHeight() - p1.getHeight());

    // efficient peak intersection detection using cached indices
    const dateIndices = new Map<Date, number>();

    // filter out overlapping peaks, keeping the most significant ones
    const uniquePeaks: Peak[] = [];
    const isOverlapping = new Array(peaks.length).fill(false);

    // mark peaks that overlap with more significant peaks
    for (let i = 0; i < peaks.length; i++) {
      if (isOverlapping[i]) continue;

      for (let j = i + 1; j < peaks.length; j++) {
        if (
          !isOverlapping[j] &&
          Search.peaksIntersect(peaks[i], peaks[j], data, dateIndices)
        ) {
          isOverlapping[j] = true;
        }
      }
    }

    // add non-overlapping peaks to the result
    for (let i = 0; i < peaks.length; i++) {
      if (!isOverlapping[i]) {
        uniquePeaks.push(peaks[i]);
      }
    }

    return uniquePeaks;
  }

  /**
   * Searches for significant valleys (local minima) in a time series dataset
   * by inverting the series and reusing the peak search.
   *
   * @param data - The time series data to analyze
   * @param rank - Importance rank to assign to detected valleys (default: 0)
   * @param metric - Name of the metric being analyzed (default: '')
   * @param window - Size of the sliding window (default: WINDOW)
   */
  public static searchValleys(
    data: TimeSeriesData,
    rank: number = 0,
    metric: string = '',
    window: number = Search.WINDOW,
  ): Valley[] {
    if (!data || data.length < window) {
      logger.warn(
        'searchValleys: insufficient data points for the specified window size',
      );
      return [];
    }

    // invert the series around its max so valleys become peaks
    const maxY = Math.max(...data.map((d) => d.y ?? 0));
    const inverted: TimeSeriesData = data.map((d) => ({
      ...d,
      y: maxY - (d.y ?? 0),
    }));

    const peaks = Search.searchPeaks(inverted, rank, metric, window);

    return peaks.map((p) => {
      const idx = p.getDataIndex();
      return new Valley()
        .setDate(p.getDate())
        .setHeight(data[idx].y ?? 0)
        .setNormWidth(p.getNormWidth())
        .setNormHeight(p.getNormHeight())
        .setRank(p.getRank())
        .setMetric(metric)
        .setStart(p.getStart())
        .setEnd(p.getEnd())
        .setDataIndex(idx) as Valley;
    });
  }

  /**
   * Helper method to check if two peaks intersect
   */
  private static peaksIntersect(
    p1: Peak,
    p2: Peak,
    data: TimeSeriesData,
    dateIndices: Map<Date, number>,
  ): boolean {
    const p1PeakIdx = Search.getDateIndex(p1.getDate(), data, dateIndices);
    const p2PeakIdx = Search.getDateIndex(p2.getDate(), data, dateIndices);
    const p1StartIdx = Search.getDateIndex(p1.getStart(), data, dateIndices);
    const p1EndIdx = Search.getDateIndex(p1.getEnd(), data, dateIndices);
    const p2StartIdx = Search.getDateIndex(p2.getStart(), data, dateIndices);
    const p2EndIdx = Search.getDateIndex(p2.getEnd(), data, dateIndices);

    return (
      (p1PeakIdx <= p2EndIdx && p1PeakIdx >= p2StartIdx) ||
      (p2PeakIdx <= p1EndIdx && p2PeakIdx >= p1StartIdx)
    );
  }

  /**
   * Helper method to get date index with caching
   */
  private static getDateIndex(
    date: Date,
    data: TimeSeriesData,
    dateIndices: Map<Date, number>,
  ): number {
    if (dateIndices.has(date)) {
      return dateIndices.get(date)!;
    }
    const idx = findIndexByExactDate(data, date);
    dateIndices.set(date, idx);
    return idx;
  }

  /**
   * Function to find the end of a peak. Move forwards from the peak until the
   * gradient stops being mostly negative.
   */
  private static searchPeakEnd(idx: number, norm: number[]): number {
    let end = idx;
    let gradientCount = 0;
    let negativeGradientCount = 0;

    // move forward from the peak, tracking gradient changes
    for (let i = idx + 1; i < norm.length - 1; i++) {
      const gradient = norm[i + 1] - norm[i];
      gradientCount++;
      if (gradient < 0) {
        negativeGradientCount++;
      }

      // if we've seen enough gradients and most are negative, we've found the end
      if (gradientCount >= 3 && negativeGradientCount / gradientCount < 0.5) {
        break;
      }
      end = i;
    }

    return end;
  }

  /**
   * Function to find the start of a peak. Move backward from the peak until the
   * gradient stops being mostly negative.
   */
  private static searchPeakStart(idx: number, norm: number[]): number {
    let start = idx;
    let gradientCount = 0;
    let negativeGradientCount = 0;

    // move backward from the peak, tracking gradient changes
    for (let i = idx - 1; i > 0; i--) {
      const gradient = norm[i] - norm[i - 1];
      gradientCount++;
      if (gradient < 0) {
        negativeGradientCount++;
      }

      // if we've seen enough gradients and most are negative, we've found the start
      if (gradientCount >= 3 && negativeGradientCount / gradientCount < 0.5) {
        break;
      }
      start = i;
    }

    return start;
  }

  /**
   * Function to find maximum points based on height difference between window
   * midpoint and edges.
   */
  private static searchMaxes(data: TimeSeriesData, window: number): number[] {
    const maxes: number[] = [];
    const halfWindow = Math.floor(window / 2);

    // iterate through the data, checking each potential peak
    for (let i = halfWindow; i < data.length - halfWindow; i++) {
      const midY = data[i].y ?? 0;
      let isTaller = true;

      // check if the midpoint is higher than all points in the window
      for (let j = i - halfWindow; j <= i + halfWindow; j++) {
        if (j !== i && (data[j].y ?? 0) >= midY) {
          isTaller = false;
          break;
        }
      }

      if (isTaller) {
        maxes.push(i);
      }
    }

    return maxes;
  }

  /**
   * The function search slopes in a given timeseries.
   * The steps involve iterating through the time series data using a sliding
   * window approach with the specified window size and calculates the slopes for
   * each window.
   */
  public static searchSlopes(
    data: TimeSeriesData,
    rank: number,
    metric: string,
    window: number,
  ): Slope[] {
    const slopes: Slope[] = [];

    for (let i = 0; i < data.length - window; i++) {
      // calculate the slope for the current window
      const x1 = i;
      const x2 = i + window;
      const y1 = data[x1].y ?? 0;
      const y2 = data[x2].y ?? 0;

      // calculate slope using the formula: (y2 - y1) / (x2 - x1)
      const slope = (y2 - y1) / window;

      // create a Slope object with the calculated data
      const slopeObj = new Slope()
        .setDate(data[i + Math.floor(window / 2)].date)
        .setStart(data[i].date)
        .setEnd(data[i + window].date)
        .setSlope(slope)
        .setRank(rank)
        .setMetric(metric);

      slopes.push(slopeObj);
    }

    return slopes;
  }

  /**
   * Generic run detection shared by fall and rise search: slide a window and
   * count gradients in the requested direction; while the proportion stays
   * above the threshold we are inside a run, and when it drops the run ends.
   *
   * @returns Array of [startIdx, endIdx] pairs of detected runs
   */
  private static searchGradientRuns(
    data: TimeSeriesData,
    direction: 'positive' | 'negative',
    windowSize: number = 20,
    threshold: number = 0.7,
  ): Array<[number, number]> {
    const runs: Array<[number, number]> = [];

    let inRun = false;
    let runStart = 0;

    for (let i = 0; i < data.length - windowSize; i++) {
      let matchingGradientCount = 0;

      // count gradients in the requested direction in the current window
      for (let j = i; j < i + windowSize - 1; j++) {
        const gradient = (data[j + 1].y ?? 0) - (data[j].y ?? 0);
        if (
          (direction === 'negative' && gradient < 0) ||
          (direction === 'positive' && gradient > 0)
        ) {
          matchingGradientCount++;
        }
      }

      const proportion = matchingGradientCount / (windowSize - 1);

      if (!inRun && proportion >= threshold) {
        inRun = true;
        runStart = i;
      } else if (inRun && proportion < threshold) {
        inRun = false;
        runs.push([runStart, i + windowSize - 1]);
      }
    }

    // close a run still open at the end of the data
    if (inRun) {
      runs.push([runStart, data.length - 1]);
    }

    return runs;
  }

  /**
   * Fall detection function.
   * Using a sliding window we count the number of negative gradients; while
   * this number stays above a threshold we are inside a fall segment.
   */
  public static searchFalls(
    data: TimeSeriesData,
    metric: string = '',
    rank: number = 0,
  ): Fall[] {
    return Search.searchGradientRuns(data, 'negative').map(([start, end]) => {
      const midPointIdx = Math.floor((start + end) / 2);
      return new Fall(
        data[midPointIdx].date,
        data[midPointIdx].y ?? 0,
        rank,
        metric,
        data[start].date,
        data[end].date,
      );
    });
  }

  /**
   * Rise detection function.
   * Using a sliding window we count the number of positive gradients; while
   * this number stays above a threshold we are inside a rise segment.
   */
  public static searchRises(
    data: TimeSeriesData,
    metric: string = '',
    rank: number = 0,
  ): Rise[] {
    return Search.searchGradientRuns(data, 'positive').map(([start, end]) => {
      const midPointIdx = Math.floor((start + end) / 2);
      return new Rise()
        .setDate(data[midPointIdx].date)
        .setHeight(data[midPointIdx].y ?? 0)
        .setRank(rank)
        .setMetric(metric)
        .setStart(data[start].date)
        .setEnd(data[end].date) as Rise;
    });
  }

  /**
   * Given a list of numbers, find the local minimum and maximum data points.
   * Example usage:
   * const [localMin, localMax] =
   * findLocalMinMax(data, "y");
   */
  public static findLocalMinMax(input: any[], key: string, window = 2): any {
    if (!input || input.length === 0) {
      return [[], []];
    }

    // function to compare two numbers
    const compare = (a: number, b: number): number => {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    };

    // extract values for the specified key
    const values = input.map((item) => item[key]);

    // find local minima and maxima
    const localMin: any[] = [];
    const localMax: any[] = [];

    for (let i = window; i < values.length - window; i++) {
      const current = values[i];
      let isMin = true;
      let isMax = true;

      // check if the current point is a local minimum or maximum
      for (let j = i - window; j <= i + window; j++) {
        if (i === j) continue;

        const comparison = compare(current, values[j]);

        // if current > any neighbor, it's not a minimum
        if (comparison > 0) isMin = false;

        // if current < any neighbor, it's not a maximum
        if (comparison < 0) isMax = false;

        // if it's neither a min nor max, no need to check further
        if (!isMin && !isMax) break;
      }

      // add to the appropriate array if it's a local min or max
      if (isMin) localMin.push(input[i]);
      if (isMax) localMax.push(input[i]);
    }

    return [localMin, localMax];
  }

  /**
   * The function search global max in a given timeseries.
   */
  public static searchGlobalMax(
    data: TimeSeriesData,
    rank: number,
    metric: string,
  ): Max[] {
    if (!data || data.length === 0) {
      return [];
    }

    // find the index of the maximum value
    const maxIdx = maxIndex(data, (d) => d.y ?? 0);

    // create a Max object with the maximum value
    const max = new Max()
      .setDate(data[maxIdx].date)
      .setHeight(data[maxIdx].y ?? 0)
      .setRank(rank)
      .setMetric(metric)
      .setDataIndex(maxIdx);

    return [max as Max];
  }

  /**
   * The function search global min in a given timeseries.
   */
  public static searchGlobalMin(
    data: TimeSeriesData,
    rank: number,
    metric: string,
  ): Min[] {
    if (!data || data.length === 0) {
      return [];
    }

    // find the index of the minimum value
    const minIdx = minIndex(data, (d) => d.y ?? 0);

    // create a Min object with the minimum value
    const min = new Min()
      .setDate(data[minIdx].date)
      .setHeight(data[minIdx].y ?? 0)
      .setRank(rank)
      .setMetric(metric)
      .setDataIndex(minIdx);

    return [min as Min];
  }

  /**
   * The function returns first data point
   */
  public static searchFirst(
    data: TimeSeriesData,
    rank: number,
    metric: string,
  ): First[] {
    if (!data || data.length === 0) {
      return [];
    }

    // create a First object with the first data point
    const first = new First()
      .setDate(data[0].date)
      .setHeight(data[0].y ?? 0)
      .setRank(rank)
      .setMetric(metric)
      .setDataIndex(0);

    return [first as First];
  }

  /**
   * The function returns current data points.
   */
  public static searchCurrent(
    data: TimeSeriesData,
    rank: number,
    metric: string,
  ): Current[] {
    if (!data || data.length === 0) {
      return [];
    }

    // create a Current object with the last data point
    const current = new Current()
      .setDate(data[data.length - 1].date)
      .setHeight(data[data.length - 1].y ?? 0)
      .setRank(rank)
      .setMetric(metric)
      .setDataIndex(data.length - 1);

    return [current as Current];
  }

  /**
   * The function last data point
   */
  public static searchLast(
    data: TimeSeriesData,
    rank: number,
    metric: string,
  ): Last[] {
    if (!data || data.length === 0) {
      return [];
    }

    // create a Last object with the last data point
    const last = new Last()
      .setDate(data[data.length - 1].date)
      .setHeight(data[data.length - 1].y ?? 0)
      .setRank(rank)
      .setMetric(metric)
      .setDataIndex(data.length - 1);

    return [last as Last];
  }

  /**
   * Finds the numerical feature for a given date from a list of numerical features.
   */
  public static findNumericalFeatureByDate(
    features: NumericalFeature[],
    date: Date,
  ): NumericalFeature | undefined {
    return features.find(
      (feature) => feature.getDate().toDateString() === date.toDateString(),
    );
  }

  /**
   * Finds the categorical feature for a given date from a list of categorical features.
   */
  public static findCategoricalFeatureByDate(
    features: CategoricalFeature[],
    date: Date,
  ): CategoricalFeature | undefined {
    return features.find(
      (feature) => feature.getDate().toDateString() === date.toDateString(),
    );
  }

  /**
   * Finds the feature closest to a given date from a list of features.
   * If an exact match is found, it returns that feature. Otherwise, it returns
   * the feature with the closest date within a specified maximum difference
   * (in days). If there are multiple candidates at the same minimum date
   * distance, the one with the closest rank is used.
   *
   * @param features - Array of Feature objects
   * @param date - The date to search for (Date object)
   * @param maxDaysDifference - Maximum allowed difference in days (default: 3)
   * @returns The closest feature, or undefined if none found within the allowed range
   */
  private static findClosestFeatureIn<T extends Feature>(
    features: T[],
    date: Date,
    maxDaysDifference: number = 3,
  ): T | undefined {
    // 1. try to find an exact match
    const exactMatch = features.find(
      (feature) => feature.getDate().toDateString() === date.toDateString(),
    );
    if (exactMatch) return exactMatch;

    // 2. find all features within maxDaysDifference
    const targetTime = date.getTime();
    let minDaysDifference = Number.MAX_SAFE_INTEGER;
    let candidates: T[] = [];

    for (const feature of features) {
      const featureTime = feature.getDate().getTime();
      const daysDifference =
        Math.abs(featureTime - targetTime) / (1000 * 60 * 60 * 24);
      if (daysDifference <= maxDaysDifference) {
        if (daysDifference < minDaysDifference) {
          minDaysDifference = daysDifference;
          candidates = [feature];
        } else if (daysDifference === minDaysDifference) {
          candidates.push(feature);
        }
      }
    }

    if (candidates.length === 0) return undefined;
    if (candidates.length === 1) return candidates[0];

    // 3. if multiple candidates, pick the one with the lowest rank difference
    // to rank 0 (no feature exists on the exact target date at this point)
    const targetRank = 0;
    let minRankDiff = Number.MAX_SAFE_INTEGER;
    let closestByRank = candidates[0];
    for (const feature of candidates) {
      const rankDiff = Math.abs(feature.getRank() - targetRank);
      if (rankDiff < minRankDiff) {
        minRankDiff = rankDiff;
        closestByRank = feature;
      }
    }
    return closestByRank;
  }

  /**
   * Finds the categorical feature closest to a given date.
   */
  public static findClosestCategoricalFeature(
    features: CategoricalFeature[],
    date: Date,
    maxDaysDifference: number = 3,
  ): CategoricalFeature | undefined {
    return Search.findClosestFeatureIn(features, date, maxDaysDifference);
  }

  /**
   * Finds the numerical feature closest to a given date.
   */
  public static findClosestNumericalFeature(
    features: NumericalFeature[],
    date: Date,
    maxDaysDifference: number = 3,
  ): NumericalFeature | undefined {
    return Search.findClosestFeatureIn(features, date, maxDaysDifference);
  }

  /**
   * Finds the closest feature (categorical or numerical) to a given date.
   * Returns the closest feature (by date) among all categorical and numerical features.
   *
   * @param categoricalFeatures - Array of CategoricalFeature objects
   * @param numericalFeatures - Array of NumericalFeature objects
   * @param date - The date to search for (Date object)
   * @param maxDaysDifference - Maximum allowed difference in days (default: 3)
   * @returns The closest feature (CategoricalFeature | NumericalFeature), or undefined if none found within the allowed range
   */
  public static findClosestFeature(
    categoricalFeatures: CategoricalFeature[],
    numericalFeatures: NumericalFeature[],
    date: Date,
    maxDaysDifference: number = 3,
  ): CategoricalFeature | NumericalFeature | undefined {
    const closestCat = Search.findClosestCategoricalFeature(
      categoricalFeatures,
      date,
      maxDaysDifference,
    );
    const closestNum = Search.findClosestNumericalFeature(
      numericalFeatures,
      date,
      maxDaysDifference,
    );

    if (!closestCat && !closestNum) return undefined;
    if (closestCat && !closestNum) return closestCat;
    if (!closestCat && closestNum) return closestNum;

    // both exist: compare which is closer in date
    const catDiff = Math.abs(closestCat!.getDate().getTime() - date.getTime());
    const numDiff = Math.abs(closestNum!.getDate().getTime() - date.getTime());

    return catDiff <= numDiff ? closestCat : closestNum;
  }
}
