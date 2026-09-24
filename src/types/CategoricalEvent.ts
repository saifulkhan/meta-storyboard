/**
 * A categorical event provided by the application, e.g., loaded from a JSON
 * file. `description` and `event` are aliases; `type` may name a categorical
 * feature (e.g., "EVENT") to select the matching feature-action table row.
 */
export type CategoricalEvent = {
  date: string | Date;
  rank?: number;
  description?: string;
  event?: string;
  type?: string;
};
