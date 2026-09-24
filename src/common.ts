import * as d3 from 'd3';
import { TimeSeriesPoint, TimeSeriesData, TimelineAction } from './types';

export function mean(data: number[]): number {
  return data.reduce((acc, val) => acc + val, 0) / data.length;
}

/**
 * Sorts time series data by a selected key (e.g., a hyperparameter), keeping
 * a stable date order. If a point has no `y` value and `yKey` is provided,
 * `y` is populated from that column.
 */
export function sortTimeseriesData(
  data: TimeSeriesData,
  key: keyof TimeSeriesPoint,
  yKey?: string,
): TimeSeriesData {
  return data
    .slice()
    .map((item): TimeSeriesPoint => {
      if (item.y === undefined && yKey !== undefined) {
        return { ...item, y: item[yKey] };
      }
      return item;
    })
    .sort((a, b) => d3.ascending(a[key], b[key]))
    .sort((a, b) => d3.ascending(a['date'], b['date']));
}

export function sliceTimeseriesByDate(
  data: TimeSeriesData,
  start: Date,
  end: Date,
): TimeSeriesData {
  return data.filter((item) => item.date >= start && item.date <= end);
}

/**
 **  Function to find index of a date in the timeseries data
 **/

export function findIndexByExactDate(data: TimeSeriesData, date: Date): number {
  return data.findIndex((d) => d.date.getTime() === date.getTime());
}

export function findIndexByAnyDateField(
  data: TimeSeriesData,
  date: Date,
): number {
  return data.findIndex((d) => {
    for (const key in d) {
      if (
        Object.prototype.hasOwnProperty.call(d, key) &&
        d[key] instanceof Date &&
        d[key].getTime() === date.getTime()
      ) {
        return true;
      }
    }
    return false;
  });
}

export function getTimeSeriesPointByDate(
  date: Date,
  data: TimeSeriesData,
): TimeSeriesPoint | undefined {
  const idx = findIndexByExactDate(data, date);
  return data[idx];
}

/**
 **  Function to find indices of dates in the time series data
 **/
export function findIndicesOfDates(
  data: TimeSeriesData,
  dates: Date[],
): number[] {
  const indices: number[] = [];

  for (let i = 0; i < data.length; i++) {
    const currentDate = data[i].date;
    // check if the current date exists in the array of dates to find
    if (dates.some((date) => date.getTime() === currentDate.getTime())) {
      indices.push(i);
    }
  }
  return indices;
}

/**
 ** Function to set a value in the map if it doesn't exist, otherwise get the existing value and then set it again
 **/
export function setOrUpdateMap<K, V>(
  map: Map<K, V[] | Array<V>>,
  key: K,
  value: V,
): void {
  if (map.has(key)) {
    const existingValue = map.get(key);
    if (existingValue && Array.isArray(existingValue)) {
      existingValue.push(value);
      map.set(key, existingValue);
    }
  } else {
    map.set(key, [value]);
  }
}

export function sortObjectKeysInPlace<T extends Record<string, any>>(
  obj: T,
): T {
  const keys = Object.keys(obj);
  keys.sort();
  const sortedObj: Record<string, any> = {};
  keys.forEach((key) => {
    sortedObj[key] = obj[key];
  });
  // reassign the sorted keys to the original object
  Object.keys(sortedObj).forEach((key) => {
    (obj as Record<string, any>)[key] = sortedObj[key];
  });
  return obj;
}

export function getObjectKeysArray(obj: any[]): string[] {
  // function to check if a value is an object
  const isObject = (value: unknown): boolean => {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  };

  // ensure the array is not empty and contains objects
  if (!Array.isArray(obj) || obj.length === 0 || !isObject(obj[0])) {
    return [];
  }

  // extract keys from the first object
  return Object.keys(obj[0]);
}

export function maxIndex<T>(
  values: Iterable<T>,
  valueof?: (
    value: T,
    index: number,
    array: Iterable<T>,
  ) => number | null | undefined,
): number {
  // delegate to d3-array; identical -1 semantics when empty
  return valueof === undefined
    ? d3.maxIndex(values as Iterable<number>)
    : d3.maxIndex(values, valueof);
}

export function minIndex<T>(
  values: Iterable<T>,
  valueof?: (
    value: T,
    index: number,
    array: Iterable<T>,
  ) => number | null | undefined,
): number {
  return valueof === undefined
    ? d3.minIndex(values as Iterable<number>)
    : d3.minIndex(values, valueof);
}

/*
 * Min-Max normalization of data of the form [x0, x1, ...xn]
 */
export function normalise(data: number[]): number[] {
  // get min and max values from data (for normalization)
  const [min, max] = data
    .slice(1)
    .reduce(
      (res, d) => [Math.min(d, res[0]), Math.max(d, res[1])],
      [data[0], data[0]],
    );

  if (max === min) {
    return data.map(() => 0);
  }

  // normalise y values to be between 0 and 1
  return data.map((d) => (d - min) / (max - min));
}

export function scaleValue(
  value: number,
  minInput: number,
  maxInput: number,
  minOutput: number,
  maxOutput: number,
): number {
  return (
    ((value - minInput) / (maxInput - minInput)) * (maxOutput - minOutput) +
    minOutput
  );
}

export function findTimelineActionByDate(
  data: TimelineAction[],
  date: Date,
): TimelineAction | undefined {
  return data.find(([actionDate]) => actionDate.getTime() === date.getTime());
}

/**
 * Whether the user has requested reduced motion at the OS/browser level;
 * animated plots use this to shorten or skip transitions.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
