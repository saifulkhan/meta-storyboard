import {
  TimeSeriesData,
  TimeSeriesPoint,
  TimelineAction,
  Segment,
  CategoricalFeatureName,
  CategoricalEvent,
  FeatureActionTableRow,
  ActionTableRow,
  FeatureActionTableData,
} from '../types';
import { Action } from '../components';
import {
  Feature,
  FeatureSearchProps,
  defaultFeatureSearchProps,
  NumericalFeature,
  CategoricalFeature,
} from '../feature';
import { Search, Gaussian, Utils } from '../processing';
import { getTimeSeriesPointByDate } from '../common';
import { FeatureFactory } from './FeatureFactory';
import { ActionFactory } from './ActionFactory';
import { logger } from '../logger';

export type SegmentationMethod = 'gmm' | 'peaks';

/**
 * Turns time series data and feature-action tables into a list of timeline
 * actions ready to be animated by a plot.
 *
 * The fluent setters can be called in any order; all processing happens in
 * `create()`, which is safe to call repeatedly (state is rebuilt each time).
 */
export class FeatureActionFactory {
  private data: TimeSeriesData = [];
  private categoricalEventsData: CategoricalEvent[] = [];
  private props: FeatureSearchProps = defaultFeatureSearchProps;
  private numericalFATable: FeatureActionTableData = [];
  private categoricalFATable: FeatureActionTableData = [];

  // segmentation request; segmentation itself runs inside create()
  private numSegment: number = 0;
  private segmentMethod: SegmentationMethod | undefined = undefined;

  private numericalFeatures: NumericalFeature[] = [];
  private categoricalFeatures: CategoricalFeature[] = [];

  private actionFactory: ActionFactory = new ActionFactory();
  private featureFactory: FeatureFactory = new FeatureFactory();
  private timelineActions: TimelineAction[] = [];
  // categorical actions are only added to the timeline when a segment selects them
  private categoricalTimelineActions: TimelineAction[] = [];
  private segments: Segment[] = [];

  public setProps(props: FeatureSearchProps) {
    this.props = { ...defaultFeatureSearchProps, ...props };
    return this;
  }

  public setNumericalFeatures(table: FeatureActionTableData) {
    this.numericalFATable = table;
    return this;
  }

  public setCategoricalFeatures(
    categoricalEventsData: CategoricalEvent[],
    categoricalFATable: FeatureActionTableData,
  ) {
    this.categoricalEventsData = categoricalEventsData || [];
    this.categoricalFATable = categoricalFATable || [];
    return this;
  }

  public setData(data: TimeSeriesData) {
    this.data = data;
    return this;
  }

  /**
   * Request segmentation of the story into `numSegment` parts. The
   * segmentation itself is performed during `create()`, after the features
   * have been detected (the 'gmm' method needs the categorical features).
   */
  public segment(numSegment: number, method: SegmentationMethod = 'peaks') {
    this.numSegment = numSegment;
    this.segmentMethod = method;
    return this;
  }

  /**
   * Create timeline actions. Safe to call repeatedly.
   */
  public create(): TimelineAction[] {
    if (!this.data || this.data.length === 0) {
      throw new Error('FeatureActionFactory: no data provided; call setData() first.');
    }

    // reset all state built by a previous create() call
    this.numericalFeatures = [];
    this.categoricalFeatures = [];
    this.timelineActions = [];
    this.categoricalTimelineActions = [];
    this.segments = [];

    this.featureFactory.setProps(this.props).setData(this.data);
    this.actionsForNumericalFeatures();
    this.actionsForCategoricalFeatures();
    this.segmentAndSelectActions();

    return this.timelineActions;
  }

  /**
   * 1. Iterate over the numerical features in the table.
   * 2. For each feature, search the data using FeatureFactory.
   * 3. For each feature found, create all actions using createActions method.
   * 4. Group all actions belonging to the found feature.
   */
  private actionsForNumericalFeatures() {
    this.numericalFATable.forEach((row: FeatureActionTableRow) => {
      logger.debug('FeatureActionFactory:actionsForNumericalFeatures: row =', row);

      const numericalFeatures: NumericalFeature[] =
        this.featureFactory.searchNumericalFeature(
          row.feature,
          row.properties,
          row.rank,
        );

      this.numericalFeatures.push(...numericalFeatures);

      numericalFeatures.forEach((feature: NumericalFeature) => {
        const date: Date = feature.getDate();
        const point: TimeSeriesPoint | undefined = getTimeSeriesPointByDate(
          date,
          this.data,
        );

        if (!point) {
          logger.warn(
            `FeatureActionFactory: no data point found for feature "${row.feature}" at date ${date}; skipping.`,
          );
          return;
        }

        const actions: Action[] = this.createActions(
          feature,
          row.actions,
          point,
        );

        const action: Action = this.actionFactory
          .group(actions)
          .setFeatureType(feature.getType());

        this.timelineActions.push([date, action]);
      });
    });

    this.timelineActions.sort((a, b) => b[0].getTime() - a[0].getTime());
  }

  /**
   * For each categorical event, create a feature and its actions using the
   * feature-action table row that matches the event's type (falls back to
   * the first row when no explicit type is given).
   */
  private actionsForCategoricalFeatures() {
    if (this.categoricalEventsData.length === 0) {
      return;
    }

    if (this.categoricalFATable.length === 0) {
      logger.warn(
        'FeatureActionFactory: categorical events provided without a categorical feature-action table; ignoring events.',
      );
      return;
    }

    this.categoricalEventsData.forEach((d: CategoricalEvent) => {
      const description = d.description ?? d.event ?? '';
      const feature = new CategoricalFeature()
        .setDate(new Date(d.date))
        .setRank(d.rank ?? 0)
        .setDescription(description);

      if (d.type) {
        feature.setType(d.type as CategoricalFeatureName);
      }

      this.categoricalFeatures.push(feature);

      const date: Date = feature.getDate();
      const point: TimeSeriesPoint | undefined = getTimeSeriesPointByDate(
        date,
        this.data,
      );

      if (!point) {
        logger.warn(
          `FeatureActionFactory: no data point found for categorical event at date ${date}; skipping.`,
          d,
        );
        return;
      }

      // pick the table row matching the event's type, else the first row
      const row =
        this.categoricalFATable.find(
          (r: FeatureActionTableRow) => r.feature === d.type,
        ) ?? this.categoricalFATable[0];

      const actions: Action[] = this.createActions(feature, row.actions, point);

      const action: Action = this.actionFactory
        .group(actions)
        .setFeatureType(feature.getType());

      this.categoricalTimelineActions.push([date, action]);
    });
  }

  /**
   * Segment the story (if requested) and mark/select the actions closest to
   * each segment: matching numerical actions get a pause, and matching
   * categorical actions are added to the timeline with a pause.
   */
  private segmentAndSelectActions() {
    if (!this.numSegment || !this.segmentMethod) {
      return;
    }

    if (this.segmentMethod === 'gmm') {
      const combined = Gaussian.gmm(this.data, this.categoricalFeatures);
      this.segments = Utils.segmentByPeaks(combined, this.numSegment);
    } else {
      this.segments = Utils.segmentByPeaks(this.data, this.numSegment);
    }

    logger.debug('FeatureActionFactory:segments:', this.segments);

    this.segments.forEach((segment: Segment) => {
      const feature = Search.findClosestFeature(
        this.categoricalFeatures,
        this.numericalFeatures,
        segment.date,
      );

      if (!feature) return;

      const featureTime = feature.getDate().getTime();

      // pause on the matching numerical action, if any
      const index = this.timelineActions.findIndex(
        (d) => d[0].getTime() === featureTime,
      );
      if (index >= 0) {
        this.timelineActions[index][1].updateProps({ pause: true });
      }

      // add the matching categorical action to the timeline with a pause
      const index2 = this.categoricalTimelineActions.findIndex(
        (d) => d[0].getTime() === featureTime,
      );
      if (index2 >= 0) {
        this.categoricalTimelineActions[index2][1].updateProps({ pause: true });
        this.timelineActions.push(this.categoricalTimelineActions[index2]);
      }
    });

    logger.debug(
      'FeatureActionFactory:segmentAndSelectActions: timelineActions:',
      this.timelineActions,
    );
  }

  /**
   * For each feature create action objects and group them
   */
  private createActions(
    feature: Feature,
    actionRows: ActionTableRow[],
    point: TimeSeriesPoint,
  ): Action[] {
    const templateVariables: Record<string, unknown> = { ...point };
    if (feature instanceof CategoricalFeature) {
      templateVariables.description = feature.getDescription();
    }

    const actions: Action[] = [];
    actionRows.forEach((d: ActionTableRow) => {
      const action = this.actionFactory
        .create(d.action, { ...d.properties, templateVariables })
        .setFeatureType(
          (feature as NumericalFeature | CategoricalFeature).getType(),
        );
      actions.push(action);
    });

    return actions;
  }
}
