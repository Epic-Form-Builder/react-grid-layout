// Converted from Flow to TypeScript
import { Position } from "./utils";

export interface PositionParams {
  margin: [number, number];
  containerPadding: [number, number];
  containerWidth: number;
  cols: number;
  rowHeight: number;
  maxRows: number;
}

// Helper for generating column width
export function calcGridColWidth(positionParams: PositionParams): number {
  const { margin, containerPadding, containerWidth, cols } = positionParams;
  return (
    (containerWidth - margin[0] * (cols - 1) - containerPadding[0] * 2) / cols
  );
}

// This can either be called:
// calcGridItemWHPx(w, colWidth, margin[0])
// or
// calcGridItemWHPx(h, rowHeight, margin[1])
export function calcGridItemWHPx(
  gridUnits: number,
  colOrRowSize: number,
  marginPx: number
): number {
  // 0 * Infinity === NaN, which causes problems with resize contraints
  if (!Number.isFinite(gridUnits)) return gridUnits;
  return Math.round(
    colOrRowSize * gridUnits + Math.max(0, gridUnits - 1) * marginPx
  );
}

/**
 * left, top, width, height are all in pixels.
 * @param  positionParams  Parameters of grid needed for coordinates calculations.
 * @param  x  X coordinate in grid units.
 * @param  y  Y coordinate in grid units.
 * @param  w  W coordinate in grid units.
 * @param  h  H coordinate in grid units.
 * @param  state  Optional state object containing resizing/dragging info.
 * @return Object containing coords.
 */
export function calcGridItemPosition(
  positionParams: PositionParams,
  x: number,
  y: number,
  w: number,
  h: number,
  state?: {
    resizing?: { width: number; height: number; top?: number; left?: number };
    dragging?: { top: number; left: number };
  }
): Position {
  const { margin, containerPadding, rowHeight } = positionParams;
  const colWidth = calcGridColWidth(positionParams);

  let width: number;
  let height: number;
  let top: number;
  let left: number;

  // If resizing, use the exact width and height as returned from resizing callbacks.
  if (state && state.resizing) {
    width = Math.round(state.resizing.width);
    height = Math.round(state.resizing.height);
  } else {
    width = calcGridItemWHPx(w, colWidth, margin[0]);
    height = calcGridItemWHPx(h, rowHeight, margin[1]);
  }

  // If dragging, use the exact top and left as returned from dragging callbacks.
  if (state && state.dragging) {
    top = Math.round(state.dragging.top);
    left = Math.round(state.dragging.left);
  } else if (
    state &&
    state.resizing &&
    typeof state.resizing.top === "number" &&
    typeof state.resizing.left === "number"
  ) {
    top = Math.round(state.resizing.top!);
    left = Math.round(state.resizing.left!);
  } else {
    top = Math.round((rowHeight + margin[1]) * y + containerPadding[1]);
    left = Math.round((colWidth + margin[0]) * x + containerPadding[0]);
  }

  return { width, height, top, left };
}

/**
 * Translate x and y coordinates from pixels to grid units.
 * @param  positionParams  Parameters of grid needed for coordinates calculations.
 * @param  top  Top position (relative to parent) in pixels.
 * @param  left  Left position (relative to parent) in pixels.
 * @param  w  W coordinate in grid units.
 * @param  h  H coordinate in grid units.
 * @return x and y in grid units.
 */
export function calcXY(
  positionParams: PositionParams,
  top: number,
  left: number,
  w: number,
  h: number
): { x: number; y: number } {
  const { margin, containerPadding, cols, rowHeight, maxRows } = positionParams;
  const colWidth = calcGridColWidth(positionParams);

  // left = containerPaddingX + x * (colWidth + marginX)
  // x * (colWidth + marginX) = left - containerPaddingX
  // x = (left - containerPaddingX) / (colWidth + marginX)
  let x = Math.round((left - containerPadding[0]) / (colWidth + margin[0]));
  let y = Math.round((top - containerPadding[1]) / (rowHeight + margin[1]));

  // Capping
  x = clamp(x, 0, cols - w);
  y = clamp(y, 0, maxRows - h);
  return { x, y };
}

/**
 * Given a height and width in pixel values, calculate grid units.
 * @param  positionParams  Parameters of grid needed for coordinates calcluations.
 * @param  height  Height in pixels.
 * @param  width  Width in pixels.
 * @param  x  X coordinate in grid units.
 * @param  y  Y coordinate in grid units.
 * @param handle Resize Handle.
 * @return w, h as grid units.
 */
export function calcWH(
  positionParams: PositionParams,
  width: number,
  height: number,
  x: number,
  y: number,
  handle: string
): { w: number; h: number } {
  const { margin, maxRows, cols, rowHeight } = positionParams;
  const colWidth = calcGridColWidth(positionParams);

  // width = colWidth * w - (margin * (w - 1))
  // ...
  // w = (width + margin) / (colWidth + margin)
  let w = Math.round((width + margin[0]) / (colWidth + margin[0]));
  let h = Math.round((height + margin[1]) / (rowHeight + margin[1]));

  // Capping
  let _w = clamp(w, 0, cols - x);
  let _h = clamp(h, 0, maxRows - y);
  if (["sw", "w", "nw"].indexOf(handle) !== -1) {
    _w = clamp(w, 0, cols);
  }
  if (["nw", "n", "ne"].indexOf(handle) !== -1) {
    _h = clamp(h, 0, maxRows);
  }
  return { w: _w, h: _h };
}

// Similar to _.clamp
export function clamp(
  num: number,
  lowerBound: number,
  upperBound: number
): number {
  return Math.max(Math.min(num, upperBound), lowerBound);
}
