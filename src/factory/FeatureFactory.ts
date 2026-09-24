import { Search } from '../processing';
import {
  NumericalFeatureName,
  TimeSeriesData,
  Condition,
  ConditionKey,
  CONDITION_KEYS,
  conditionPredicate,
} from '../types';
import {
  FeatureSearchProps,
  defaultFeatureSearchProps,
  NumericalFeature,
} from '../feature';
import { Slope } from '../feature/Slope';
import { logger } from '../logger';

/** detects features in the data; registered per feature name */
export type FeatureDetector = (
  data: TimeSeriesData,
  props: Required<FeatureSearchProps>,
  rank: number,
) => NumericalFeature[];

/**
 * Searches numerical features in time series data based on a feature name
 * and an optional condition, as provided by a feature-action table row.
 *
 * The built-in features (FIRST, CURRENT, LAST, PEAK, VALLEY, MAX, MIN, SLOPE,
 * FALL, RAISE) are pre-registered; applications can add their own detectors
 * with `FeatureFactory.register()` and use them in feature-action tables.
 */
export class FeatureFactory {
  private static registry = new Map<string, FeatureDetector>([
    [
      NumericalFeatureName.FIRST,
      (data, props, rank) => Search.searchFirst(data, rank, props.metric),
    ],
    [
      NumericalFeatureName.CURRENT,
      (data, props, rank) => Search.searchCurrent(data, rank, props.metric),
    ],
    [
      NumericalFeatureName.LAST,
      (data, props, rank) => Search.searchLast(data, rank, props.metric),
    ],
    [
      NumericalFeatureName.PEAK,
      (data, props, rank) =>
        Search.searchPeaks(data, rank, props.metric, props.window),
    ],
    [
      NumericalFeatureName.VALLEY,
      (data, props, rank) =>
        Search.searchValleys(data, rank, props.metric, props.window),
    ],
    [
      NumericalFeatureName.MAX,
      (data, props, rank) => Search.searchGlobalMax(data, rank, props.metric),
    ],
    [
      NumericalFeatureName.MIN,
      (data, props, rank) => Search.searchGlobalMin(data, rank, props.metric),
    ],
    [
      NumericalFeatureName.SLOPE,
      (data, props, rank) =>
        Search.searchSlopes(data, rank, props.metric, props.window),
    ],
    [
      NumericalFeatureName.FALL,
      (data, props, rank) => Search.searchFalls(data, props.metric, rank),
    ],
    [
      NumericalFeatureName.RAISE,
      (data, props, rank) => Search.searchRises(data, props.metric, rank),
    ],
  ]);

  private data: TimeSeriesData;
  private props: FeatureSearchProps;

  constructor() {
    this.data = [];
    this.props = defaultFeatureSearchProps;
  }

  /**
   * Register a custom feature detector.
   *
   * @param name - The feature name used in feature-action tables
   * @param detector - Function returning the detected features
   */
  public static register(name: string, detector: FeatureDetector): void {
    FeatureFactory.registry.set(name, detector);
  }

  /** returns the registered feature names */
  public static registeredFeatures(): string[] {
    return [...FeatureFactory.registry.keys()];
  }

  public setProps(props: FeatureSearchProps) {
    this.props = { ...defaultFeatureSearchProps, ...props };
    return this;
  }

  public setData(data: TimeSeriesData) {
    this.data = data;
    return this;
  }

  /**
   ** Search for feature and returns list of feature objects.
   **/
  public searchNumericalFeature(
    feature: NumericalFeatureName | string,
    condition: Condition = {},
    rank: number = 0,
  ): NumericalFeature[] {
    logger.debug(
      'FeatureFactory:searchNumericalFeature: feature:',
      feature,
      ', condition:',
      condition,
      ', rank:',
      rank,
    );

    const detector = FeatureFactory.registry.get(feature);
    if (!detector) {
      throw new Error(
        `FeatureFactory: feature "${feature}" is not implemented; ` +
          `register it with FeatureFactory.register("${feature}", detector).`,
      );
    }

    const props = {
      ...defaultFeatureSearchProps,
      ...this.props,
    } as Required<FeatureSearchProps>;

    const features = detector(this.data, props, rank);
    return FeatureFactory.applyCondition(feature, features, condition);
  }

  /**
   * Filters detected features by the condition given in the table row,
   * e.g., `{ gt: 100 }`. For SLOPE features the slope value is compared;
   * for all other features the height is compared.
   */
  private static applyCondition(
    featureName: string,
    features: NumericalFeature[],
    condition: Condition,
  ): NumericalFeature[] {
    let result = features;

    for (const [key, value] of Object.entries(condition)) {
      if (typeof value !== 'number') continue;

      if (!CONDITION_KEYS.includes(key as ConditionKey)) {
        throw new Error(
          `FeatureFactory: unknown condition "${key}"; ` +
            `supported conditions: ${CONDITION_KEYS.join(', ')}.`,
        );
      }

      const predicate = conditionPredicate(key as ConditionKey, value);
      result = result.filter((feature) =>
        predicate(
          featureName === NumericalFeatureName.SLOPE
            ? (feature as Slope).getSlope()
            : feature.getHeight(),
        ),
      );
    }

    return result;
  }
}
