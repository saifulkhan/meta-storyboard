import * as d3 from 'd3';

import { NumericalFeatureName } from '../types';

export enum Colors {
  DarkGreen = '#006400',
  ForestGreen = '#228B22',
  Green = '#008000',
  KellyGreen = '#4CBB17',
  LightGreen = '#90EE90',
  Green1 = '#00bfa0',
  DarkCyan = '#00aeae',
  Cyan = '#00FFFF',
  PaleCyan = '#aaf2ef',
  CornflowerBlue = '#6495ED',
  DarkPurple = '#770737',
  Purple = '#800080',
  PurpleA = '#AA336A',
  PurpleB = '#BF40BF',
  PalePurple = '#D8BFD8',
  DarkOrange = '#EC5800',
  Orange = '#FFA500',
  PaleOrange = '#FAC898',
  DarkGrey = '#686868',
  Grey = '#808080',
  LightGrey1 = '#A9A9A9',
  LightGrey2 = '#D3D3D3',
  PlatinumGrey = '#E5E4E2',
  WhiteGrey = '#F5F5F5',
  Red = '#E84A5F',
}

export const LineColor: Partial<Record<NumericalFeatureName, string>> = {};
LineColor[NumericalFeatureName.CURRENT] = Colors.Orange;
LineColor[NumericalFeatureName.LAST] = Colors.PaleCyan;
LineColor[NumericalFeatureName.MAX] = Colors.Green;
LineColor[NumericalFeatureName.MIN] = Colors.Purple;
LineColor[NumericalFeatureName.PEAK] = Colors.LightGreen;
LineColor[NumericalFeatureName.VALLEY] = Colors.PalePurple;

export const DotColor: Partial<Record<NumericalFeatureName, string>> = {};
DotColor[NumericalFeatureName.CURRENT] = Colors.Orange;
DotColor[NumericalFeatureName.LAST] = Colors.PaleCyan;
DotColor[NumericalFeatureName.MAX] = Colors.Green;
DotColor[NumericalFeatureName.MIN] = Colors.Purple;
DotColor[NumericalFeatureName.PEAK] = Colors.LightGreen;
DotColor[NumericalFeatureName.VALLEY] = Colors.PalePurple;

export const TextColor: Partial<Record<NumericalFeatureName, string>> = {};
TextColor[NumericalFeatureName.CURRENT] = Colors.DarkOrange;
TextColor[NumericalFeatureName.LAST] = Colors.DarkCyan;
TextColor[NumericalFeatureName.MAX] = Colors.DarkGreen;
TextColor[NumericalFeatureName.MIN] = Colors.DarkPurple;
TextColor[NumericalFeatureName.PEAK] = Colors.LightGreen;
TextColor[NumericalFeatureName.VALLEY] = Colors.PalePurple;

export function getSchemeTableau10(n: number) {
  const colorScheme = d3.schemeTableau10;
  return colorScheme[n % colorScheme.length];
}
