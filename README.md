# Meta-Storyboard (MSB)

[![npm version](https://img.shields.io/npm/v/meta-storyboard.svg)](https://www.npmjs.com/package/meta-storyboard)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Source Code](https://img.shields.io/badge/GitHub-meta--storyboard-181717.svg?style=flat&logo=github)](https://github.com/saifulkhan/meta-storyboard)
[![Examples](https://img.shields.io/badge/GitHub-meta--storyboard--examples-181717.svg?style=flat&logo=github&logoColor=white)](https://github.com/saifulkhan/meta-storyboard-examples/)

[![Build Status](https://github.com/saifulkhan/meta-storyboard/actions/workflows/ci.yml/badge.svg)](https://github.com/saifulkhan/meta-storyboard/actions)

---

## Table of Contents

- [Overview](#overview)
  - [Installation](#installation)
  - [Steps & Template](#steps--template)
- [Examples](#examples)
  - [React](#react)
- [MSB Development](#msb-development)
  - [Project Structure](#project-structure)
  - [API Design](#api-design)
    - [Feature Action Table Data Structures](#feature-action-table-data-structures)
    - [Feature API](#feature-api)
    - [Action API](#action-api)
    - [Search & Gaussian API](#feature-search--gaussian-api)
    - [Animated Plots API](#animated-plots-api)
    - [Workflow for Creating Story](#detailed-workflow-for-creating-story)
  - [Build & Release](#build--release)
- [Additional Information](#additional-information)
  - [License](#license)
  - [Support](#support)
  - [References](#references)

---

# Overview

Meta-Storyboard (MSB) is a JavaScript/TypeScript library that enables the creation of scalable, interactive, and animated data visualizations using feature-action design pattern. The library offers a set of APIs with the following key features:

- **Feature Detection**: Built-in peak and event detection utilities.
- **Action Mapping**: Map features to visual actions (dots, circles, connectors, text boxes, etc.).
- **Animated Plots**: Animate transitions and storytelling sequences.
- **Extensible Components**: Register custom feature detectors and action types via `FeatureFactory.register()` and `ActionFactory.register()`.
- **Table Validation**: Validate feature-action tables with `validateFeatureActionTable()` and a shipped JSON Schema.
- **Example Stories and Playground**: Test and explore components in isolation.
<!-- - **Interactive Tables**: UI for editing feature-action tables. -->

## Installation

```bash
npm install meta-storyboard # or
yarn add meta-storyboard
```

## Steps & Template

Story development is a four-step process:

1. **Load data and feature-action table**:

   - **Load timeseries data**: See some example COVID-19 and Machine Learning training provenance data in GitHub repository `src/assets/data`.
   - **Load feature-action table**: See some example feature-action tables in GitHub repository `src/assets/feature-action-table`.

2. **Create timeline actions**: Use the `FeatureActionFactory` class to create timeline actions from the timeseries data and feature-action table.

3. **Initialize plot and animation controller**: Create a plot and animation controller. We developed some plots, such as `LinePlot`, `MirroredBarChart`, and `ParallelCoordinatePlot`, available in the `src/components/plots`, and animation controllers in `src/animation`.

4. **Configure plot and animate**: Use play and pause button to animate.

For example (using React but you can use any other framework):

```tsx
import * as msb from 'meta-storyboard';

// 1. Load data and feature-action table
const data = ...; // time series data
const numericalFATable = ...; // feature-action table

// 2. Process feature-action table and create timeline actions
const timelineActions = new msb.FeatureActionFactory()
  .setProps({ /* properties */ })
  .setData(data)
  .setNumericalFeatures(numericalFATable)
  .create();

// 3. Initialize a plot and animation controller
const plot = useRef(new msb.LinePlot()).current;
// react hook shipped with the library (optional entry point)
import { useControllerWithState } from 'meta-storyboard/react';
const [controller, isPlaying] = useControllerWithState(msb.PlayPauseController, [plot]);

// 4. Configure plot and animate
plot
  .setData(data)
  .setName(/* name of the plot */)
  .setPlotProps({ /* plot properties */ })
  .setCanvas(/* svg element */)
  .setActions(timelineActions)
  .animate();

onClick={controller.togglePlayPause};
```

For applications requiring the integration of both numerical and categorical time series with automated segmentation using Gaussian mixture models, the `FeatureActionFactory` provides two additional methods `setCategoricalFeatures` and `segment`; use them as follows:

```tsx
import * as msb from 'meta-storyboard';

// 1. Load data and feature-action table
const data = ...; // time series data
const numericalFATable = ...; // numerical feature-action table

const categoricalEventsData = ...; // categorical events timeseries data
const categoricalFATable = ...; // categorical feature-action table

const numSegment = ...; // number of segments
const method = ...; // segmentation method, e.g., gaussian mixture model

// 2. Process feature-action table and create timeline actions
const timelineActions = new msb.FeatureActionFactory()
  .setProps({ /* properties */ })
  .setData(data)
  .setNumericalFeatures(numericalFeatures)
  .setCategoricalFeatures(categoricalEventsData, categoricalFATable)
  .segment(numSegment, method)
  .create();

// 3. Initialize a plot and animation controller
const plot = useRef(new msb.LinePlot()).current;
// react hook shipped with the library (optional entry point)
import { useControllerWithState } from 'meta-storyboard/react';
const [controller, isPlaying] = useControllerWithState(msb.PlayPauseController, [plot]);

// 4. Configure plot and animate
plot
  .setData(data)
  .setName(/* name of the plot */)
  .setPlotProps({ /* plot properties */ })
  .setCanvas(/* svg element */)
  .setActions(timelineActions)
  .animate();

onClick={controller.togglePlayPause};
```

See more complete [examples](#examples) and their implementation in [GitHub: meta-storyboard-examples](https://github.com/saifulkhan/meta-storyboard-examples).

---

## Validation, Customization & Debugging

### Validate feature-action tables

Tables are usually loaded from JSON; validate them at load time to get all
problems reported at once, with paths:

```ts
import { validateFeatureActionTable, assertFeatureActionTable } from 'meta-storyboard';

const { valid, issues } = validateFeatureActionTable(tableJson);
// or throw with a formatted message:
assertFeatureActionTable(tableJson);
```

A JSON Schema is shipped at `doc/feature-action-table.schema.json` for editor
autocomplete and CI validation.

### Conditions

Row `properties` filter detected features numerically, e.g., `{ "gt": 100 }`.
Supported keys: `eq`, `le`/`lte`, `ge`/`gte`, `lt`, `gt`, `ne`. For `SLOPE`
features the slope value is compared; for all other features the height.

### Register custom features and actions

```ts
import { ActionFactory, FeatureFactory } from 'meta-storyboard';

// a custom action usable as { "action": "MY_MARKER" } in tables
ActionFactory.register('MY_MARKER', (props) => new MyMarker().setProps(props), /* zOrder */ 5);

// a custom feature detector usable as { "feature": "CHANGEPOINT" } in tables
FeatureFactory.register('CHANGEPOINT', (data, props, rank) => detectChangepoints(data, rank));
```

### Debug logging

The library is silent by default (warnings and errors only). Enable debug
output or route logs into your own logger:

```ts
import { setDebug, setLogger } from 'meta-storyboard';

setDebug(true); // verbose diagnostics
setLogger({ warn: myLogger.warn, error: myLogger.error });
```

### Reduced motion

Animated transitions automatically respect the user's
`prefers-reduced-motion` setting; animation timing is configurable per plot
(e.g., `animationDelay`, `animationDurationMsPerPixel` in `LinePlot`).

---

# Examples

## React

The following environment and packages are required.

- Node.js v20.11.1
- yarn or npm

Clone the repository.

```bash
git clone https://github.com/saifulkhan/meta-storyboard-examples.git
cd meta-storyboard-examples/react
```

Install all dependent packages and start the development server to view the UI.

```bash
yarn install
yarn dev
```

Open <http://localhost:3000> in your browser and access the following examples stories.

- [COVID-19 Case Story](http://localhost:3000/example/story-covid19)
- [COVID-19 Case Story (Gaussian)](http://localhost:3000/example/story-covid19-gaussian)
- [Machine Learning Provenance Story](http://localhost:3000/example/story-ml-mirorred-bar)
- [Machine Learning Multivariate Story](http://localhost:3000/example/story-ml-pcp)

The implementation of the example stories is in [GitHub: meta-storyboard-examples](https://github.com/saifulkhan/meta-storyboard-examples/tree/main/react/src/pages/example).

> Note: Examples using other frameworks to be added soon.

# MSB Development

## Project Structure

```
src
├── components
│   ├── actions               # VIS action components, e.g., Circle, Dot, etc.
│   ├── animation             # Animation controllers
│   └── plots                 # Plots, e.g., LinePlot, etc.
├── factory                   # Factories for creating features/actions
├── feature                   # Feature classes, gaussian functions, etc.
└── types                     # TypeScript types
```

## API Design

### Feature Action Table Data Structures

We implemented a user interface for meta-story authors for creating and updating feature action tables. The data structures of the tables are shown below. The feature action tables are implemented as nested React.js components.

**Numerical Feature Action**

```json
{
    "feature": "...",
    "featureProps": {"..."},
    "rank": "...",
    "actions": [
      {
        "action": "...",
        "actionProps": {
          "size": "...",
          "color": "...",
          "...": "...",
        }
      },
      "..."
    ],
},
```

**Categorical Feature Action**

```json

  {
    "feature": "...",
    "date": "...",
    "description": "...",
    "rank": "...",
    "actions": [
      {
        "action": "...",
        "actionProps": {
          "size": "...",
          "color": "...",
          "...": "...",
        }
      },
      "..."
    ]
  },
```

**MSB Feature Action Factory:** The `FeatureActionFactory` translates the meta-stories defined as feature action tables to MSB feature objects and MSB action objects. It internally uses the `FeatureFactory` and `ActionFactory` classes, which will be discussed later, to do so. Instantiate this class as follows:

```js
new FeatureActionFactory(...)
    .setProps(...)
    .setNumericalFeatures(...)
    .setCategoricalFeatures(...)
    .setData(...)
    .create();
```

### Feature API

<div>
    <img width="350px" src="https://github.com/saifulkhan/meta-storyboard/raw/main/doc/feature-classes.png" alt="Feature Classes" />
    <br>
    <small><i>Figure 2: The class diagram of the MSB feature classes. Please see the source code for all classes, their methods and attributes. </i></small>
    <br><br>
</div>

The `Feature` is an abstract class that encapsulates both numerical and semantic attributes of time series data through its subclasses, `NumericalFeature` and `CategoricalFeature`. These base classes serve as the foundation for concrete classes such as specific implementations like `Peak`, `Min`, `Max`, etc., it provides a structured approach to define features of time series data. Developers can extend this base class to implement new features.

**Feature Names:** Features are defined as enumerators, e.g.,

```ts
export enum NumericalFeatureName {
  FIRST = "FIRST",
  CURRENT = "CURRENT",
  LAST = "LAST",
  MAX = "MAX",
  MIN = "MIN",
  PEAK = "PEAK",
  VALLEY = "VALLEY",
  FALL = "FALL",
  RAISE = "RAISE",
  SLOPE = "SLOPE",
  ...
}
```

**Creating MSB Feature:** To instantiate a feature, use the constructor of a concrete feature class. Set properties using method chaining. For example, when a feature `PEAK` is detected it creates a `Peak` object as follows. The default feature properties are used unless defined in feature-action table. Use the getter functions to retrieve the feature properties.

```ts
new Peak()
    .setDate(...)
    .setHeight(...)
    .setNormWidth(...)
    .setNormHeight(...)
    .setRank(...)
    .setMetric(...)
    .setStart(...)
    .setEnd(...)
    .setDataIndex(...);
```

**MSB Feature Factory:** The `FeatureFactory` class implements a factory design pattern for streamlined feature creation, utilizing search functions to dynamically generate feature instances based on input feature action table and time series data.

```js
new FeatureFactory()
    .setProps()
    .setData()
    .searchNumericalFeatures(<feature name>, <properties>, ...);
```

### Action API

<div>
    <img width="450px" src="https://github.com/saifulkhan/meta-storyboard/raw/main/doc/action-classes.png" alt="Action Classes" />
    <br>
    <small><i>Figure 3: Action classes. Please see the source code for all classes, their methods and attributes. </i></small>
    <br><br>
</div>

The `Action` abstract class serves as a blueprint for defining atomic actions, e.g., circles, dots, etc. represented by `Circle` and `Dot` classes respectively.

**MSB Action Names:** Various actions are defined as enumerators, e.g.,

```ts
export enum ActionName {
  DOT = "DOT",
  CIRCLE = "CIRCLE",
  TEXT_BOX = "TEXT_BOX",
  CONNECTOR = "CONNECTOR",
  ...
}
```

**Creating MSB Actions:** Instantiate a `Circle` action object and display it within an SVG canvas. The default action properties are used unless defined in the feature-action table.

```ts
new Circle()
    .setProps(<props>)
    .setCanvas(<svg>)
    .setCoordinate(<coordinates>)
    .show();
```

Animated movement for objects, e.g., `TextBox`, can be achieved by:

```ts
new TextBox()
    .setProps(...)
    .setCanvas(...)
    .setCoordinate(...)
    .show()
    .move(<coordinates>, ...);
```

**Group MSB Actions:** The `ActionGroup` class employs a composite design pattern to group multiple actions representing a feature, as shown in an example below:

```ts
new ActionGroup()
    .group(<actions>)
    .setCanvas(...)
    .setCoordinate(...)
    .show();
```

**MSB Action Factory:** The `ActionFactory` utilizes a factory design pattern to simplify the creation of action objects, making it more efficient to generate actions from feature action tables.

```js
new ActionFactory()
    .create(<action name>, <action properties>)
```

### Feature Search & Gaussian API

**Feature Detection:** The `Search` class implements various feature detection algorithms. The following is an example API for peak detection. Similarly, additional feature detection APIs have also been implemented.

```ts
Search.searchPeaks(<time series>, <properties, e.g., window>)
```

**Gaussian:** The `Gaussian` class implements various Gaussian algorithms. The following is an API for the Gaussian mixture model to compute combined Gaussians from numerical time series (peaks) and categorical time series.

```ts
Gaussian.gmm(<time series>, <categorial events>)
```

### Animated Plots API

<div>
    <img width="350px" src="https://github.com/saifulkhan/meta-storyboard/raw/main/doc/plot-classes.png" alt="Plot Classes" />
    <br>
    <small><i>Figure 4: Plot classes.</i></small>
    <br><br>
</div>

`Plot` is an abstract class that defines abstract methods used for creating a plot, setting properties, and animating. The concrete plots, e.g., line plot, and parallel coordinate plots implement the actual logic.

**Creating a Plot:** Create a line plot and animate actions,

```ts
new LinePlot()
    .setData(<time series data>)
    .setName(<selected data stream name>)
    .setProps(<props>)
    .setPlotProps(<plot props>)
    .setCanvas(<svg>)
    .setActions(<actions>)
    .animate()
```

### Workflow for Creating Story

<!-- <div align="center">  -->
<div>
    <img width="1000px" src="https://github.com/saifulkhan/meta-storyboard/raw/main/doc/sequence-diagram.png" alt="sequence diagram" />
    <br>
    <small><i>Figure 1: Sequence diagram demonstrating a story creation process and important classes and methods involved.</i></small>
    <br><br>
</div>

## Build & Release

To build the library:

```bash
yarn install
yarn build:lib
```

# Additional Information

To publish to npm:

```bash
npm login
npm publish
```

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Support

If you need help, open a [GitHub issue](https://github.com/saifulkhan/meta-storyboard/issues). For additional plots and early prototypes, see:

- [Observable notebook prototype](https://observablehq.com/d/0a6e9c35a809660e)
- [First React.js prototype](https://github.com/saifulkhan/storytelling-vis-v.0.1)

### References

- [d3.js](https://d3js.org/)
- [React.js](https://react.dev)
- [Next.js](https://github.com/vercel/next.js)
- [Material UI](https://mui.com)

Our work is described in:

> Khan, S., Jones, S., Bach, B., Cha, J., Chen, M., Meikle, J., Roberts, J. C., Thiyagalingam, J., Wood, J., & Ritsos, P. D. (2024). Feature-Action Design Patterns for Storytelling Visualizations with Time Series Data. _arXiv preprint arXiv:2402.03116_.

Please cite our paper as follows:

```bibtex
@article{khan2024,
    title={Feature-Action Design Patterns for Storytelling Visualizations with Time Series Data},
    author={S. Khan and S. Jones and B. Bach and J. Cha and M. Chen and J. Meikle and J. C. Roberts and J. Thiyagalingam and J. Wood and P. D. Ritsos},
    journal={arXiv preprint arXiv:2402.03116},
    year={2024},
}
```
