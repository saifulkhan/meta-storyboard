export type ActionProps = {
  /** hide the action again after it has been shown */
  hide: boolean;
  /** pause the story animation when this action is reached */
  pause: boolean;
  /** values substituted into `${...}` templates, e.g., in text boxes */
  templateVariables?: Record<string, unknown>;
};
