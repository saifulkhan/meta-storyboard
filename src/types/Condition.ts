/**
 * Numeric condition used to filter detected features in a feature-action
 * table row, e.g., `{ gt: 100 }` keeps features whose value is > 100.
 *
 * Both `le`/`ge` and their aliases `lte`/`gte` are accepted.
 */
export type Condition = {
  eq?: number;
  le?: number;
  ge?: number;
  lte?: number;
  gte?: number;
  lt?: number;
  gt?: number;
  ne?: number;
};

export type ConditionKey = keyof Condition;

/** all condition keys understood by the library */
export const CONDITION_KEYS: ConditionKey[] = [
  'eq',
  'le',
  'ge',
  'lte',
  'gte',
  'lt',
  'gt',
  'ne',
];

/**
 * Build a predicate for a single condition entry without using `new Function`
 * (safe under strict CSP and with untrusted table input).
 */
export function conditionPredicate(
  key: ConditionKey,
  value: number,
): (candidate: number) => boolean {
  switch (key) {
    case 'eq':
      return (candidate) => candidate === value;
    case 'le':
    case 'lte':
      return (candidate) => candidate <= value;
    case 'ge':
    case 'gte':
      return (candidate) => candidate >= value;
    case 'lt':
      return (candidate) => candidate < value;
    case 'gt':
      return (candidate) => candidate > value;
    case 'ne':
      return (candidate) => candidate !== value;
  }
}
