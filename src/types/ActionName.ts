export enum ActionName {
  DOT = 'DOT',
  CIRCLE = 'CIRCLE',
  TEXT_BOX = 'TEXT_BOX',
  CONNECTOR = 'CONNECTOR',
}

/**
 * Z-order used to sort actions within a group before drawing; custom actions
 * registered via ActionFactory.register() may add their own entries.
 */
export const ActionZOrder: Record<string, number> = {
  [ActionName.DOT]: 1,
  [ActionName.CIRCLE]: 2,
  [ActionName.TEXT_BOX]: 3,
  [ActionName.CONNECTOR]: 4,
};
