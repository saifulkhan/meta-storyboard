import { FeatureActionFactory } from '../factory/FeatureActionFactory';
import { ActionFactory } from '../factory/ActionFactory';
import { FeatureActionTableData, ActionName } from '../types';
import { singlePeakSeries } from './testData';

const numericalTable: FeatureActionTableData = [
  {
    feature: 'MAX',
    properties: {},
    rank: 5,
    actions: [
      { action: 'DOT', properties: { color: '#ff0000', size: 5 } },
      { action: 'CIRCLE', properties: { size: 10 } },
    ],
  },
];

describe('FeatureActionFactory', () => {
  test('creates one grouped timeline action per detected feature', () => {
    const actions = new FeatureActionFactory()
      .setProps({ metric: 'm', window: 10 })
      .setData(singlePeakSeries())
      .setNumericalFeatures(numericalTable)
      .create();

    expect(actions).toHaveLength(1);
    expect(actions[0][0]).toBeInstanceOf(Date);
  });

  test('create() is idempotent: calling twice does not double the actions', () => {
    const factory = new FeatureActionFactory()
      .setProps({ metric: 'm', window: 10 })
      .setData(singlePeakSeries())
      .setNumericalFeatures(numericalTable);

    const first = factory.create();
    const second = factory.create();
    expect(second.length).toBe(first.length);
  });

  test('create() without data throws a helpful error', () => {
    expect(() =>
      new FeatureActionFactory().setNumericalFeatures(numericalTable).create(),
    ).toThrow(/no data/i);
  });

  test('categorical events use the table row matching their type and fall back to the first row', () => {
    const data = singlePeakSeries();
    const categoricalTable: FeatureActionTableData = [
      {
        feature: 'EVENT',
        properties: {},
        rank: 5,
        actions: [{ action: 'DOT', properties: {} }],
      },
      {
        feature: 'SEGMENTED_EVENT',
        properties: {},
        rank: 5,
        actions: [
          { action: 'DOT', properties: {} },
          { action: 'CIRCLE', properties: {} },
        ],
      },
    ];

    // one event typed SEGMENTED_EVENT, one untyped (falls back to first row),
    // description provided via the "event" alias
    const events = [
      {
        date: data[15].date,
        rank: 5,
        event: 'peak day event',
        type: 'SEGMENTED_EVENT',
      },
      { date: data[0].date, rank: 2, description: 'start event' },
    ];

    const actions = new FeatureActionFactory()
      .setProps({ metric: 'm', window: 10 })
      .setData(data)
      .setNumericalFeatures(numericalTable)
      .setCategoricalFeatures(events, categoricalTable)
      .segment(2, 'gmm')
      .create();

    // segmentation selects closest features and adds categorical actions
    expect(actions.length).toBeGreaterThanOrEqual(1);
    // at least one action must be paused by segmentation
    const paused = actions.filter(([, action]) => action.getProps().pause);
    expect(paused.length).toBeGreaterThanOrEqual(1);
  });

  test('custom registered actions can be used from the table', () => {
    ActionFactory.register(
      'MY_DOT',
      (props) =>
        new (require('../components/actions/Dot').Dot)().setProps(props),
      1,
    );

    const table: FeatureActionTableData = [
      {
        feature: 'MAX',
        properties: {},
        rank: 5,
        actions: [{ action: 'MY_DOT', properties: {} }],
      },
    ];

    const actions = new FeatureActionFactory()
      .setProps({ metric: 'm', window: 10 })
      .setData(singlePeakSeries())
      .setNumericalFeatures(table)
      .create();
    expect(actions).toHaveLength(1);
  });

  test('unknown action in the table throws a helpful error', () => {
    const table: FeatureActionTableData = [
      {
        feature: 'MAX',
        properties: {},
        rank: 5,
        actions: [{ action: 'NO_SUCH_ACTION', properties: {} }],
      },
    ];

    expect(() =>
      new FeatureActionFactory()
        .setData(singlePeakSeries())
        .setNumericalFeatures(table)
        .create(),
    ).toThrow(/not implemented.*register/i);
  });

  test('built-in action names are pre-registered', () => {
    const registered = ActionFactory.registeredActions();
    expect(registered).toEqual(
      expect.arrayContaining([
        ActionName.DOT,
        ActionName.CIRCLE,
        ActionName.TEXT_BOX,
        ActionName.CONNECTOR,
      ]),
    );
  });
});
