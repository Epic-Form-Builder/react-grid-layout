import { deepEqual } from "fast-equals";
import React from "react";
import { fastRGLPropsEqual } from "./fastRGLPropsEqual";

export type ResizeHandleAxis =
  | "s"
  | "w"
  | "e"
  | "n"
  | "sw"
  | "nw"
  | "se"
  | "ne";

export interface LayoutItem {
  w: number;
  h: number;
  x: number;
  y: number;
  i: string;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  moved?: boolean;
  static?: boolean;
  isDraggable?: boolean | null;
  isResizable?: boolean | null;
  resizeHandles?: ResizeHandleAxis[];
  isBounded?: boolean | null;
}

export type Layout = ReadonlyArray<LayoutItem>;

export interface Position {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ReactDraggableCallbackData {
  node: HTMLElement;
  x?: number;
  y?: number;
  deltaX: number;
  deltaY: number;
  lastX?: number;
  lastY?: number;
}

export interface PartialPosition {
  left: number;
  top: number;
}

export interface DroppingPosition {
  left: number;
  top: number;
  e: Event;
}

export interface Size {
  width: number;
  height: number;
}

export interface GridDragEvent {
  e: Event;
  node: HTMLElement;
  newPosition: PartialPosition;
}

export interface GridResizeEvent {
  e: Event;
  node: HTMLElement;
  size: Size;
  handle: string;
}

export type DragOverEvent = MouseEvent & {
  nativeEvent: {
    layerX: number;
    layerY: number;
  } & Event;
};

export type ReactChildren = React.ReactNode[];

export type EventCallback = (
  layout: Layout,
  oldItem: LayoutItem | null,
  newItem: LayoutItem | null,
  placeholder: LayoutItem | null,
  e: Event,
  node?: HTMLElement
) => void;

export type CompactType = "horizontal" | "vertical" | null;

const isProduction = process.env.NODE_ENV === "production";
const DEBUG = false;

/**
 * Return the bottom coordinate of the layout.
 */
export function bottom(layout: Layout): number {
  let max = 0;
  let bottomY;
  for (let i = 0, len = layout.length; i < len; i++) {
    bottomY = layout[i].y + layout[i].h;
    if (bottomY > max) max = bottomY;
  }
  return max;
}

export function cloneLayout(layout: Layout): Layout {
  const newLayout = Array(layout.length);
  for (let i = 0, len = layout.length; i < len; i++) {
    newLayout[i] = cloneLayoutItem(layout[i]);
  }
  return newLayout;
}

export function modifyLayout(layout: Layout, layoutItem: LayoutItem): Layout {
  const newLayout = Array(layout.length);
  for (let i = 0, len = layout.length; i < len; i++) {
    if (layoutItem.i === layout[i].i) {
      newLayout[i] = layoutItem;
    } else {
      newLayout[i] = layout[i];
    }
  }
  return newLayout;
}

export function withLayoutItem(
  layout: Layout,
  itemKey: string,
  cb: (item: LayoutItem) => LayoutItem
): [Layout, LayoutItem | null] {
  let item = getLayoutItem(layout, itemKey);
  if (!item) return [layout, null];
  item = cb(cloneLayoutItem(item));
  layout = modifyLayout(layout, item);
  return [layout, item];
}

export function cloneLayoutItem(layoutItem: LayoutItem): LayoutItem {
  return {
    w: layoutItem.w,
    h: layoutItem.h,
    x: layoutItem.x,
    y: layoutItem.y,
    i: layoutItem.i,
    minW: layoutItem.minW,
    maxW: layoutItem.maxW,
    minH: layoutItem.minH,
    maxH: layoutItem.maxH,
    moved: Boolean(layoutItem.moved),
    static: Boolean(layoutItem.static),
    isDraggable: layoutItem.isDraggable,
    isResizable: layoutItem.isResizable,
    resizeHandles: layoutItem.resizeHandles,
    isBounded: layoutItem.isBounded
  };
}

export function childrenEqual(a: ReactChildren, b: ReactChildren): boolean {
  return (
    deepEqual(
      React.Children.map(a, c => (c as any)?.key),
      React.Children.map(b, c => (c as any)?.key)
    ) &&
    deepEqual(
      React.Children.map(a, c => (c as any)?.props?.["data-grid"]),
      React.Children.map(b, c => (c as any)?.props?.["data-grid"])
    )
  );
}

export function fastPositionEqual(a: Position, b: Position): boolean {
  return (
    a.left === b.left &&
    a.top === b.top &&
    a.width === b.width &&
    a.height === b.height
  );
}

export function collides(l1: LayoutItem, l2: LayoutItem): boolean {
  if (l1.i === l2.i) return false;
  if (l1.x + l1.w <= l2.x) return false;
  if (l1.x >= l2.x + l2.w) return false;
  if (l1.y + l1.h <= l2.y) return false;
  if (l1.y >= l2.y + l2.h) return false;
  return true;
}

export function compact(
  layout: Layout,
  compactType: CompactType,
  cols: number,
  allowOverlap?: boolean
): Layout {
  const compareWith = getStatics(layout);
  let b = bottom(compareWith);
  const sorted = sortLayoutItems(layout, compactType);
  const out = Array(layout.length);

  for (let i = 0, len = sorted.length; i < len; i++) {
    let l = cloneLayoutItem(sorted[i]);

    if (!l.static) {
      l = compactItem(
        compareWith,
        l,
        compactType,
        cols,
        sorted,
        allowOverlap,
        b
      );
      b = Math.max(b, l.y + l.h);
      compareWith.push(l);
    }

    out[layout.indexOf(sorted[i])] = l;
    l.moved = false;
  }

  return out;
}

const heightWidth = { x: "w", y: "h" } as const;

function resolveCompactionCollision(
  layout: Layout,
  item: LayoutItem,
  moveToCoord: number,
  axis: "x" | "y"
) {
  const sizeProp = heightWidth[axis];
  (item as any)[axis] += 1;
  const itemIndex = layout.map(layoutItem => layoutItem.i).indexOf(item.i);

  for (let i = itemIndex + 1; i < layout.length; i++) {
    const otherItem = layout[i];
    if (otherItem.static) continue;
    if (otherItem.y > item.y + item.h) break;

    if (collides(item, otherItem)) {
      resolveCompactionCollision(
        layout,
        otherItem,
        moveToCoord + (item as any)[sizeProp],
        axis
      );
    }
  }

  (item as any)[axis] = moveToCoord;
}

export function compactItem(
  compareWith: Layout,
  l: LayoutItem,
  compactType: CompactType,
  cols: number,
  fullLayout: Layout,
  allowOverlap?: boolean,
  b?: number
): LayoutItem {
  const compactV = compactType === "vertical";
  const compactH = compactType === "horizontal";

  if (compactV) {
    if (typeof b === "number") {
      l.y = Math.min(b, l.y);
    } else {
      l.y = Math.min(bottom(compareWith), l.y);
    }
    while (l.y > 0 && !getFirstCollision(compareWith, l)) {
      l.y--;
    }
  } else if (compactH) {
    while (l.x > 0 && !getFirstCollision(compareWith, l)) {
      l.x--;
    }
  }

  let collides;
  while (
    (collides = getFirstCollision(compareWith, l)) &&
    !(compactType === null && allowOverlap)
  ) {
    if (compactH) {
      resolveCompactionCollision(fullLayout, l, collides.x + collides.w, "x");
    } else {
      resolveCompactionCollision(fullLayout, l, collides.y + collides.h, "y");
    }
    if (compactH && l.x + l.w > cols) {
      l.x = cols - l.w;
      l.y++;
      while (l.x > 0 && !getFirstCollision(compareWith, l)) {
        l.x--;
      }
    }
  }

  l.y = Math.max(l.y, 0);
  l.x = Math.max(l.x, 0);
  return l;
}

export function correctBounds(layout: Layout, bounds: { cols: number }): Layout {
  const collidesWith = getStatics(layout);
  for (let i = 0, len = layout.length; i < len; i++) {
    const l = layout[i];
    if (l.x + l.w > bounds.cols) l.x = bounds.cols - l.w;
    if (l.x < 0) {
      l.x = 0;
      l.w = bounds.cols;
    }
    if (!l.static) collidesWith.push(l);
    else {
      while (getFirstCollision(collidesWith, l)) {
        l.y++;
      }
    }
  }
  return layout;
}

export function getLayoutItem(layout: Layout, id: string): LayoutItem | null {
  for (let i = 0, len = layout.length; i < len; i++) {
    if (layout[i].i === id) return layout[i];
  }
  return null;
}

export function getFirstCollision(
  layout: Layout,
  layoutItem: LayoutItem
): LayoutItem | null {
  for (let i = 0, len = layout.length; i < len; i++) {
    if (collides(layout[i], layoutItem)) return layout[i];
  }
  return null;
}

export function getAllCollisions(
  layout: Layout,
  layoutItem: LayoutItem
): Array<LayoutItem> {
  return layout.filter(l => collides(l, layoutItem));
}

export function getStatics(layout: Layout): Array<LayoutItem> {
  return layout.filter(l => l.static);
}

export function moveElement(
  layout: Layout,
  l: LayoutItem,
  x?: number,
  y?: number,
  isUserAction?: boolean,
  preventCollision?: boolean,
  compactType: CompactType,
  cols: number,
  allowOverlap?: boolean
): Layout {
  if (l.static && l.isDraggable !== true) return layout;
  if (l.y === y && l.x === x) return layout;

  log(`Moving element ${l.i} to [${String(x)},${String(y)}] from [${l.x},${l.y}]`);
  const oldX = l.x;
  const oldY = l.y;

  if (typeof x === "number") l.x = x;
  if (typeof y === "number") l.y = y;
  l.moved = true;

  let sorted = sortLayoutItems(layout, compactType);
  const movingUp =
    compactType === "vertical" && typeof y === "number"
      ? oldY >= y
      : compactType === "horizontal" && typeof x === "number"
        ? oldX >= x
        : false;

  if (movingUp) sorted = [...sorted].reverse();
  const collisions = getAllCollisions(sorted, l);
  const hasCollisions = collisions.length > 0;

  if (hasCollisions && allowOverlap) {
    return cloneLayout(layout);
  } else if (hasCollisions && preventCollision) {
    log(`Collision prevented on ${l.i}, reverting.`);
    l.x = oldX;
    l.y = oldY;
    l.moved = false;
    return layout;
  }

  for (let i = 0, len = collisions.length; i < len; i++) {
    const collision = collisions[i];
    log(`Resolving collision between ${l.i} at [${l.x},${l.y}] and ${collision.i} at [${collision.x},${collision.y}]`);

    if (collision.moved) continue;

    if (collision.static) {
      layout = moveElementAwayFromCollision(
        layout,
        collision,
        l,
        isUserAction,
        compactType,
        cols
      );
    } else {
      layout = moveElementAwayFromCollision(
        layout,
        l,
        collision,
        isUserAction,
        compactType,
        cols
      );
    }
  }

  return layout;
}

export function moveElementAwayFromCollision(
  layout: Layout,
  collidesWith: LayoutItem,
  itemToMove: LayoutItem,
  isUserAction?: boolean,
  compactType: CompactType,
  cols: number
): Layout {
  const compactH = compactType === "horizontal";
  const compactV = compactType === "vertical";
  const preventCollision = collidesWith.static;

  if (isUserAction) {
    isUserAction = false;

    const fakeItem: LayoutItem = {
      x: compactH ? Math.max(collidesWith.x - itemToMove.w, 0) : itemToMove.x,
      y: compactV ? Math.max(collidesWith.y - itemToMove.h, 0) : itemToMove.y,
      w: itemToMove.w,
      h: itemToMove.h,
      i: "-1"
    };

    const firstCollision = getFirstCollision(layout, fakeItem);
    const collisionNorth = firstCollision && firstCollision.y + firstCollision.h > collidesWith.y;
    const collisionWest = firstCollision && collidesWith.x + collidesWith.w > firstCollision.x;

    if (!firstCollision) {
      log(`Doing reverse collision on ${itemToMove.i} up to [${fakeItem.x},${fakeItem.y}].`);
      return moveElement(
        layout,
        itemToMove,
        compactH ? fakeItem.x : undefined,
        compactV ? fakeItem.y : undefined,
        isUserAction,
        preventCollision,
        compactType,
        cols,
        undefined
      );
    } else if (collisionNorth && compactV) {
      return moveElement(
        layout,
        itemToMove,
        undefined,
        collidesWith.y + 1,
        isUserAction,
        preventCollision,
        compactType,
        cols,
        undefined
      );
    } else if (collisionNorth && compactType == null) {
      collidesWith.y = itemToMove.y;
      itemToMove.y = itemToMove.y + itemToMove.h;
      return layout;
    } else if (collisionWest && compactH) {
      return moveElement(
        layout,
        collidesWith,
        itemToMove.x,
        undefined,
        isUserAction,
        preventCollision,
        compactType,
        cols,
        undefined
      );
    }
  }

  return moveElement(
    layout,
    itemToMove,
    compactH ? itemToMove.x + 1 : undefined,
    compactV ? itemToMove.y + 1 : undefined,
    isUserAction,
    preventCollision,
    compactType,
    cols,
    undefined
  );
}

export function perc(num: number): string {
  return num * 100 + "%";
}

const constrainWidth = (
  left: number,
  currentWidth: number,
  newWidth: number,
  containerWidth: number
) => {
  return left + newWidth > containerWidth ? currentWidth : newWidth;
};

const constrainHeight = (
  top: number,
  currentHeight: number,
  newHeight: number
) => {
  return top < 0 ? currentHeight : newHeight;
};

const constrainLeft = (left: number) => Math.max(0, left);
const constrainTop = (top: number) => Math.max(0, top);

const resizeNorth = (currentSize: any, { left, height, width }: any, _containerWidth: number) => {
  const top = currentSize.top - (height - currentSize.height);
  return {
    left,
    width,
    height: constrainHeight(top, currentSize.height, height),
    top: constrainTop(top)
  };
};

const resizeEast = (
  currentSize: any,
  { top, left, height, width }: any,
  containerWidth: number
) => ({
  top,
  height,
  width: constrainWidth(currentSize.left, currentSize.width, width, containerWidth),
  left: constrainLeft(left)
});

const resizeWest = (currentSize: any, { top, height, width }: any, containerWidth: number) => {
  const left = currentSize.left - (width - currentSize.width);
  return {
    height,
    width: left < 0 ? currentSize.width : constrainWidth(currentSize.left, currentSize.width, width, containerWidth),
    top: constrainTop(top),
    left: constrainLeft(left)
  };
};

const resizeSouth = (
  currentSize: any,
  { top, left, height, width }: any,
  _containerWidth: number
) => ({
  width,
  left,
  height: constrainHeight(top, currentSize.height, height),
  top: constrainTop(top)
});

const resizeNorthEast = (...args: any[]) => resizeNorth(args[0], resizeEast(...args), args[2]);
const resizeNorthWest = (...args: any[]) => resizeNorth(args[0], resizeWest(...args), args[2]);
const resizeSouthEast = (...args: any[]) => resizeSouth(args[0], resizeEast(...args), args[2]);
const resizeSouthWest = (...args: any[]) => resizeSouth(args[0], resizeWest(...args), args[2]);

const ordinalResizeHandlerMap = {
  n: resizeNorth,
  ne: resizeNorthEast,
  e: resizeEast,
  se: resizeSouthEast,
  s: resizeSouth,
  sw: resizeSouthWest,
  w: resizeWest,
  nw: resizeNorthWest
};

export function resizeItemInDirection(
  direction: ResizeHandleAxis,
  currentSize: Position,
  newSize: Position,
  containerWidth: number
): Position {
  const ordinalHandler = ordinalResizeHandlerMap[direction];
  if (!ordinalHandler) return newSize;
  return ordinalHandler(currentSize, { ...currentSize, ...newSize }, containerWidth);
}

export function setTransform({ top, left, width, height }: Position): object {
  const translate = `translate(${left}px,${top}px)`;
  return {
    transform: translate,
    WebkitTransform: translate,
    MozTransform: translate,
    msTransform: translate,
    OTransform: translate,
    width: `${width}px`,
    height: `${height}px`,
    position: "absolute"
  };
}

export function setTopLeft({ top, left, width, height }: Position): object {
  return {
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
    height: `${height}px`,
    position: "absolute"
  };
}

export function sortLayoutItems(layout: Layout, compactType: CompactType): Layout {
  if (compactType === "horizontal") return sortLayoutItemsByColRow(layout);
  if (compactType === "vertical") return sortLayoutItemsByRowCol(layout);
  else return layout;
}

export function sortLayoutItemsByRowCol(layout: Layout): Layout {
  return layout.slice(0).sort(function (a, b) {
    if (a.y > b.y || (a.y === b.y && a.x > b.x)) {
      return 1;
    } else if (a.y === b.y && a.x === b.x) {
      return 0;
    }
    return -1;
  });
}

export function sortLayoutItemsByColRow(layout: Layout): Layout {
  return layout.slice(0).sort(function (a, b) {
    if (a.x > b.x || (a.x === b.x && a.y > b.y)) {
      return 1;
    }
    return -1;
  });
}

export function synchronizeLayoutWithChildren(
  initialLayout: Layout,
  children: ReactChildren,
  cols: number,
  compactType: CompactType,
  allowOverlap?: boolean
): Layout {
  initialLayout = initialLayout || [];

  const layout: LayoutItem[] = [];
  React.Children.forEach(children, (child: React.ReactElement<any>) => {
    if ((child as any)?.key == null) return;

    const exists = getLayoutItem(initialLayout, String((child as any).key));
    const g = (child as any).props?.["data-grid"];

    if (exists && g == null) {
      layout.push(cloneLayoutItem(exists));
    } else {
      if (g) {
        if (!isProduction) {
          validateLayout([g], "ReactGridLayout.children");
        }
        layout.push(cloneLayoutItem({ ...g, i: (child as any).key }));
      } else {
        layout.push(
          cloneLayoutItem({
            w: 1,
            h: 1,
            x: 0,
            y: bottom(layout),
            i: String((child as any).key)
          })
        );
      }
    }
  });

  const correctedLayout = correctBounds(layout, { cols: cols });
  return allowOverlap ? correctedLayout : compact(correctedLayout, compactType, cols, allowOverlap);
}

export function validateLayout(layout: Layout, contextName: string = "Layout"): void {
  const subProps = ["x", "y", "w", "h"];
  if (!Array.isArray(layout))
    throw new Error(contextName + " must be an array!");

  for (let i = 0, len = layout.length; i < len; i++) {
    const item = layout[i];
    for (let j = 0; j < subProps.length; j++) {
      const key = subProps[j] as keyof LayoutItem;
      const value = item[key];
      if (typeof value !== "number" || Number.isNaN(value)) {
        throw new Error(
          `ReactGridLayout: ${contextName}[${i}].${key} must be a number! Received: ${value} (${typeof value})`
        );
      }
    }
    if (typeof item.i !== "undefined" && typeof item.i !== "string") {
      throw new Error(
        `ReactGridLayout: ${contextName}[${i}].i must be a string! Received: ${item.i} (${typeof item.i})`
      );
    }
  }
}

export function compactType(
  props?: { verticalCompact?: boolean; compactType?: CompactType }
): CompactType {
  const { verticalCompact, compactType: ct } = props || {};
  return verticalCompact === false ? null : ct || null;
}

function log(...args: any[]) {
  if (!DEBUG) return;
  console.log(...args);
}

export const noop = () => {};

export { fastRGLPropsEqual };
