import { cloneLayout, compact, correctBounds, CompactType, Layout } from "./utils";

export type Breakpoint = string;
export type DefaultBreakpoints = "lg" | "md" | "sm" | "xs" | "xxs";

export type ResponsiveLayout = Record<Breakpoint, Layout>;
export type Breakpoints = Record<Breakpoint, number>;

export type OnLayoutChangeCallback = (
  layout: Layout,
  layouts: Record<Breakpoint, Layout>
) => void;

/**
 * Given a width, find the highest breakpoint that matches is valid for it (width > breakpoint).
 *
 * @param breakpoints Breakpoints object (e.g. {lg: 1200, md: 960, ...})
 * @param width Screen width.
 * @return Highest breakpoint that is less than width.
 */
export function getBreakpointFromWidth(
  breakpoints: Breakpoints,
  width: number
): Breakpoint {
  const sorted = sortBreakpoints(breakpoints);
  let matching = sorted[0];
  for (let i = 1, len = sorted.length; i < len; i++) {
    const breakpointName = sorted[i];
    if (width > breakpoints[breakpointName]) matching = breakpointName;
  }
  return matching;
}

/**
 * Given a breakpoint, get the # of cols set for it.
 * @param breakpoint Breakpoint name.
 * @param cols Map of breakpoints to cols.
 * @return Number of cols.
 */
export function getColsFromBreakpoint(
  breakpoint: Breakpoint,
  cols: Breakpoints
): number {
  if (!cols[breakpoint]) {
    throw new Error(
      "ResponsiveReactGridLayout: `cols` entry for breakpoint " +
        breakpoint +
        " is missing!"
    );
  }
  return cols[breakpoint];
}

/**
 * Given existing layouts and a new breakpoint, find or generate a new layout.
 *
 * This finds the layout above the new one and generates from it, if it exists.
 *
 * @param layouts Existing layouts.
 * @param breakpoints All breakpoints.
 * @param breakpoint New breakpoint.
 * @param lastBreakpoint Last breakpoint (for fallback).
 * @param cols Column count at new breakpoint.
 * @param compactType Whether or not to compact the layout vertically.
 * @return New layout.
 */
export function findOrGenerateResponsiveLayout(
  layouts: ResponsiveLayout,
  breakpoints: Breakpoints,
  breakpoint: Breakpoint,
  lastBreakpoint: Breakpoint,
  cols: number,
  compactType: CompactType
): Layout {
  // If it already exists, just return it.
  if (layouts[breakpoint]) return cloneLayout(layouts[breakpoint]);
  // Find or generate the next layout
  let layout = layouts[lastBreakpoint];
  const breakpointsSorted = sortBreakpoints(breakpoints);
  const breakpointsAbove = breakpointsSorted.slice(
    breakpointsSorted.indexOf(breakpoint)
  );
  for (let i = 0, len = breakpointsAbove.length; i < len; i++) {
    const b = breakpointsAbove[i];
    if (layouts[b]) {
      layout = layouts[b];
      break;
    }
  }
  layout = cloneLayout(layout || []); // clone layout so we don't modify existing items
  return compact(correctBounds(layout, { cols: cols }), compactType, cols);
}

/**
 * Given breakpoints, return an array of breakpoints sorted by width. This is usually
 * e.g. ['xxs', 'xs', 'sm', ...]
 *
 * @param breakpoints Key/value pair of breakpoint names to widths.
 * @return Sorted breakpoints.
 */
export function sortBreakpoints(
  breakpoints: Breakpoints
): Array<Breakpoint> {
  const keys: Array<string> = Object.keys(breakpoints);
  return keys.sort(function (a, b) {
    return breakpoints[a] - breakpoints[b];
  });
}
