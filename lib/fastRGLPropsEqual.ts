import { Props } from "./ReactGridLayoutPropTypes";

function shallowEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  if (typeof a === "object" && typeof b === "object") {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (a[key] !== b[key]) return false;
    }
    return true;
  }
  return false;
}

export function fastRGLPropsEqual(a: Props, b: Props): boolean {
  if (a === b) return true;
  return (
    a.className === b.className &&
    a.style === b.style &&
    a.width === b.width &&
    a.autoSize === b.autoSize &&
    a.cols === b.cols &&
    a.draggableCancel === b.draggableCancel &&
    a.draggableHandle === b.draggableHandle &&
    a.verticalCompact === b.verticalCompact &&
    a.compactType === b.compactType &&
    shallowEqual(a.layout, b.layout) &&
    shallowEqual(a.margin, b.margin) &&
    shallowEqual(a.containerPadding, b.containerPadding) &&
    a.rowHeight === b.rowHeight &&
    a.maxRows === b.maxRows &&
    a.isBounded === b.isBounded &&
    a.isDraggable === b.isDraggable &&
    a.isResizable === b.isResizable &&
    a.allowOverlap === b.allowOverlap &&
    a.preventCollision === b.preventCollision &&
    a.useCSSTransforms === b.useCSSTransforms &&
    a.transformScale === b.transformScale &&
    a.isDroppable === b.isDroppable &&
    shallowEqual(a.resizeHandles, b.resizeHandles) &&
    a.resizeHandle === b.resizeHandle &&
    shallowEqual(a.droppingItem, b.droppingItem) &&
    a.innerRef === b.innerRef
    // Note: children are intentionally not compared
  );
}
