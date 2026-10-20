import type { Curve } from '../config/index.js';

/** The 0–1 sub-score `value` earns on `curve`. */
export function onCurve([first, ...rest]: Curve, value: number): number {
  if (value <= first.at) {
    return first.score;
  }
  let left = first;
  for (const right of rest) {
    if (value <= right.at) {
      return left.score + ((right.score - left.score) * (value - left.at)) / (right.at - left.at);
    }
    left = right;
  }
  return left.score;
}
