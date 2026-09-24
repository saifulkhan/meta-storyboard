# Changelog

## 0.3.0 (2026-09-24)

### Fixed

- Conditions `le`/`ge` in feature-action tables were silently ignored (the
  predicate only understood `lte`/`gte`); both spellings are now accepted.
- `FALL` and `RAISE` features listed in tables now actually run their
  detectors (`Search.searchFalls` / `Search.searchRises`); `VALLEY` is
  implemented via inverted peak search.
- `FeatureActionFactory.create()` is now idempotent; previously calling it
  twice doubled every timeline action.
- GMM segmentation (`segment(n, 'gmm')`) now runs during `create()` after the
  categorical features are built; previously it always saw an empty feature
  list, silently ignoring categorical events.
- Categorical feature-action tables: the row matching an event's `type` is
  used (previously only the first row was ever read); event descriptions are
  read from `description` or `event` and exposed as the `${description}`
  template variable.
- `searchFirst` returned a feature typed `MIN`; it now returns `FIRST`.
- `Action.remove()` removed nothing; it now removes the action's group node.
- `ParallelCoordinatePlot` imported `meta-storyboard` from npm inside the
  library itself and passed an invalid `'middle'` horizontal alignment.
- The example-dataset column `mean_test_accuracy` is no longer hard-coded in
  `sortTimeseriesData`; pass the new optional `yKey` argument instead.

### Changed (breaking)

- `createPredicate` (string → `new Function` predicate) is removed; conditions
  are evaluated with plain closures (safe under strict CSP).
- Unknown feature names, action names and condition keys now throw descriptive
  errors instead of logging and returning nothing.
- The library no longer logs to the console by default; call `setDebug(true)`
  or provide a handler via `setLogger()` for diagnostics.
- `PlayPauseController` takes a single `Playable`; `SyncPlotsController`
  takes `Playable[]`.
- `d3` is a peer dependency only (it was previously duplicated in
  `dependencies`); unused `d3-scale-chromatic` removed.

### Added

- `ActionFactory.register()` / `FeatureFactory.register()`: add custom action
  types and feature detectors usable from feature-action tables.
- `validateFeatureActionTable()` / `assertFeatureActionTable()` plus a JSON
  Schema (`doc/feature-action-table.schema.json`) for table validation with
  helpful, path-annotated error messages.
- Optional React entry point `meta-storyboard/react` shipping
  `useControllerWithState`.
- Animation timing is configurable per plot (`animationDelay`,
  `animationDurationMsPerPixel`, ...); `prefers-reduced-motion` is respected.
- Typed plot base class (`Plot<TData, TProps>`); all prop setters accept
  partial props, removing the need for `as any` casts in applications.
- Test suite (jest) and GitHub Actions CI; `exports` map, `sideEffects: false`
  and repository metadata in `package.json`.
