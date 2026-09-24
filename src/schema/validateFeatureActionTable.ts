import { CONDITION_KEYS, FeatureActionTableData } from '../types';
import { ActionFactory } from '../factory/ActionFactory';
import { FeatureFactory } from '../factory/FeatureFactory';

export type TableValidationIssue = {
  /** JSON-path-like location of the problem, e.g., "[2].actions[0].action" */
  path: string;
  message: string;
};

export type TableValidationResult = {
  valid: boolean;
  issues: TableValidationIssue[];
};

/**
 * Validates a feature-action table (e.g., loaded from JSON) against the
 * registered features, actions and supported condition keys. Returns a list
 * of human-readable issues instead of throwing, so applications can present
 * all problems at once.
 */
export function validateFeatureActionTable(
  table: unknown,
): TableValidationResult {
  const issues: TableValidationIssue[] = [];

  if (!Array.isArray(table)) {
    return {
      valid: false,
      issues: [{ path: '', message: 'feature-action table must be an array of rows' }],
    };
  }

  const knownFeatures = FeatureFactory.registeredFeatures();
  const knownActions = ActionFactory.registeredActions();

  table.forEach((row: any, i: number) => {
    const rowPath = `[${i}]`;

    if (typeof row !== 'object' || row === null) {
      issues.push({ path: rowPath, message: 'row must be an object' });
      return;
    }

    // feature
    if (typeof row.feature !== 'string' || row.feature.length === 0) {
      issues.push({
        path: `${rowPath}.feature`,
        message: 'missing or empty "feature" name',
      });
    } else if (
      !knownFeatures.includes(row.feature) &&
      // categorical feature names are matched against events, not detectors
      !['EVENT', 'SEGMENTED_EVENT', 'UNKNOWN'].includes(row.feature)
    ) {
      issues.push({
        path: `${rowPath}.feature`,
        message:
          `unknown feature "${row.feature}"; known features: ` +
          `${knownFeatures.join(', ')} (or register it with FeatureFactory.register())`,
      });
    }

    // condition properties
    if (row.properties !== undefined) {
      if (typeof row.properties !== 'object' || row.properties === null) {
        issues.push({
          path: `${rowPath}.properties`,
          message: '"properties" must be an object of conditions, e.g., { "gt": 100 }',
        });
      } else {
        Object.entries(row.properties).forEach(([key, value]) => {
          if (!CONDITION_KEYS.includes(key as any)) {
            issues.push({
              path: `${rowPath}.properties.${key}`,
              message:
                `unknown condition "${key}"; supported conditions: ` +
                CONDITION_KEYS.join(', '),
            });
          } else if (typeof value !== 'number') {
            issues.push({
              path: `${rowPath}.properties.${key}`,
              message: `condition "${key}" must be a number`,
            });
          }
        });
      }
    }

    // rank
    if (row.rank !== undefined && typeof row.rank !== 'number') {
      issues.push({ path: `${rowPath}.rank`, message: '"rank" must be a number' });
    }

    // actions
    if (!Array.isArray(row.actions) || row.actions.length === 0) {
      issues.push({
        path: `${rowPath}.actions`,
        message: 'row must have a non-empty "actions" array',
      });
    } else {
      row.actions.forEach((actionRow: any, j: number) => {
        const actionPath = `${rowPath}.actions[${j}]`;
        if (typeof actionRow !== 'object' || actionRow === null) {
          issues.push({ path: actionPath, message: 'action must be an object' });
          return;
        }
        if (typeof actionRow.action !== 'string' || actionRow.action.length === 0) {
          issues.push({
            path: `${actionPath}.action`,
            message: 'missing or empty "action" name',
          });
        } else if (!knownActions.includes(actionRow.action)) {
          issues.push({
            path: `${actionPath}.action`,
            message:
              `unknown action "${actionRow.action}"; known actions: ` +
              `${knownActions.join(', ')} (or register it with ActionFactory.register())`,
          });
        }
        if (
          actionRow.properties !== undefined &&
          (typeof actionRow.properties !== 'object' || actionRow.properties === null)
        ) {
          issues.push({
            path: `${actionPath}.properties`,
            message: '"properties" must be an object',
          });
        }
      });
    }
  });

  return { valid: issues.length === 0, issues };
}

/**
 * Like `validateFeatureActionTable` but throws with all issues formatted in
 * the error message; convenient at load time.
 */
export function assertFeatureActionTable(
  table: unknown,
): asserts table is FeatureActionTableData {
  const { valid, issues } = validateFeatureActionTable(table);
  if (!valid) {
    throw new Error(
      'Invalid feature-action table:\n' +
        issues.map((issue) => `  - ${issue.path}: ${issue.message}`).join('\n'),
    );
  }
}
