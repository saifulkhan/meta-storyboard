import {
  validateFeatureActionTable,
  assertFeatureActionTable,
} from '../schema/validateFeatureActionTable';

describe('validateFeatureActionTable', () => {
  const validTable = [
    {
      feature: 'PEAK',
      properties: { gt: 10 },
      rank: 5,
      actions: [
        { action: 'DOT', properties: { color: '#f00' } },
        { action: 'TEXT_BOX', properties: { title: '${date}' } },
      ],
    },
  ];

  test('accepts a valid table', () => {
    const result = validateFeatureActionTable(validTable);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
    expect(() => assertFeatureActionTable(validTable)).not.toThrow();
  });

  test('rejects a non-array table', () => {
    expect(validateFeatureActionTable({}).valid).toBe(false);
  });

  test('flags unknown features with the known alternatives', () => {
    const result = validateFeatureActionTable([
      { feature: 'PEEK', properties: {}, rank: 1, actions: [{ action: 'DOT' }] },
    ]);
    expect(result.valid).toBe(false);
    expect(result.issues[0].path).toBe('[0].feature');
    expect(result.issues[0].message).toMatch(/unknown feature "PEEK"/);
    expect(result.issues[0].message).toMatch(/PEAK/);
  });

  test('flags unknown actions and conditions with paths', () => {
    const result = validateFeatureActionTable([
      {
        feature: 'MAX',
        properties: { bogus: 1, gt: 'high' },
        rank: 1,
        actions: [{ action: 'SPARKLE' }],
      },
    ]);
    expect(result.valid).toBe(false);
    const paths = result.issues.map((issue) => issue.path);
    expect(paths).toContain('[0].properties.bogus');
    expect(paths).toContain('[0].properties.gt');
    expect(paths).toContain('[0].actions[0].action');
  });

  test('flags missing actions array', () => {
    const result = validateFeatureActionTable([
      { feature: 'MAX', properties: {}, rank: 1, actions: [] },
    ]);
    expect(result.valid).toBe(false);
    expect(result.issues[0].path).toBe('[0].actions');
  });

  test('assertFeatureActionTable throws with all issues listed', () => {
    expect(() =>
      assertFeatureActionTable([
        { feature: 'PEEK', actions: [{ action: 'SPARKLE' }] },
      ]),
    ).toThrow(/PEEK[\s\S]*SPARKLE/);
  });

  test('accepts categorical feature names', () => {
    const result = validateFeatureActionTable([
      {
        feature: 'SEGMENTED_EVENT',
        properties: {},
        rank: 1,
        actions: [{ action: 'DOT' }],
      },
    ]);
    expect(result.valid).toBe(true);
  });
});
