import PropTypes from "prop-types";
import React from "react";
import { Ref } from "react";
import {
  DragOverEvent,
  EventCallback,
  CompactType,
  Layout,
  LayoutItem,
  ResizeHandleAxis
} from "./utils";

// TypeScript util
export type ReactRef<T extends HTMLElement = HTMLElement> = {
  current: T | null;
};

export type ResizeHandle =
  | React.ReactElement<any>
  | ((resizeHandleAxis: ResizeHandleAxis, ref: ReactRef<HTMLElement>) => React.ReactElement<any>);

export const resizeHandleAxesType =
  PropTypes.arrayOf(
    PropTypes.oneOf(["s", "w", "e", "n", "sw", "nw", "se", "ne"])
  );
export const resizeHandleType =
  PropTypes.oneOfType([PropTypes.node, PropTypes.func]);

export interface Props {
  className: string;
  style: object;
  width: number;
  autoSize: boolean;
  cols: number;
  draggableCancel: string;
  draggableHandle: string;
  verticalCompact: boolean;
  compactType: CompactType;
  layout: Layout;
  margin: [number, number];
  containerPadding: [number, number] | null;
  rowHeight: number;
  maxRows: number;
  isBounded: boolean;
  isDraggable: boolean;
  isResizable: boolean;
  isDroppable: boolean;
  preventCollision: boolean;
  useCSSTransforms: boolean;
  transformScale: number;
  droppingItem: Partial<LayoutItem>;
  resizeHandles: ResizeHandleAxis[];
  resizeHandle?: ResizeHandle;
  allowOverlap: boolean;
  onLayoutChange: (layout: Layout) => void;
  onDrag: EventCallback;
  onDragStart: EventCallback;
  onDragStop: EventCallback;
  onResize: EventCallback;
  onResizeStart: EventCallback;
  onResizeStop: EventCallback;
  onDropDragOver: (e: DragOverEvent) => ({ w?: number; h?: number } | false) | null;
  onDrop: (layout: Layout, item: LayoutItem | null, e: Event) => void;
  children: React.ReactNode;
  innerRef?: Ref<HTMLDivElement>;
}

export type DefaultProps = Omit<Props, "children" | "width">;

const ReactGridLayoutPropTypes = {
  className: PropTypes.string,
  style: PropTypes.object,
  width: PropTypes.number,
  autoSize: PropTypes.bool,
  cols: PropTypes.number,
  draggableCancel: PropTypes.string,
  draggableHandle: PropTypes.string,
  verticalCompact: function (props: Props) {
    if (
      props.verticalCompact === false &&
      process.env.NODE_ENV !== "production"
    ) {
      console.warn(
        "`verticalCompact` on <ReactGridLayout> is deprecated and will be removed soon. " +
          'Use `compactType`: "horizontal" | "vertical" | null.'
      );
    }
  },
  compactType: PropTypes.oneOf(["vertical", "horizontal"]),
  layout: function (props: Props) {
    var layout = props.layout;
    if (layout === undefined) return;
    require("./utils").validateLayout(layout, "layout");
  },
  margin: PropTypes.arrayOf(PropTypes.number),
  containerPadding: PropTypes.arrayOf(PropTypes.number),
  rowHeight: PropTypes.number,
  maxRows: PropTypes.number,
  isBounded: PropTypes.bool,
  isDraggable: PropTypes.bool,
  isResizable: PropTypes.bool,
  allowOverlap: PropTypes.bool,
  preventCollision: PropTypes.bool,
  useCSSTransforms: PropTypes.bool,
  transformScale: PropTypes.number,
  isDroppable: PropTypes.bool,
  resizeHandles: resizeHandleAxesType,
  resizeHandle: resizeHandleType,
  onLayoutChange: PropTypes.func,
  onDragStart: PropTypes.func,
  onDrag: PropTypes.func,
  onDragStop: PropTypes.func,
  onResizeStart: PropTypes.func,
  onResize: PropTypes.func,
  onResizeStop: PropTypes.func,
  onDrop: PropTypes.func,
  droppingItem: PropTypes.shape({
    i: PropTypes.string.isRequired,
    w: PropTypes.number.isRequired,
    h: PropTypes.number.isRequired
  }),
  children: function (props: Props, propName: string) {
    const children = props[propName];
    const keys: Record<string, boolean> = {};
    React.Children.forEach(children, function (child) {
      if ((child as any)?.key == null) return;
      if (keys[(child as any).key]) {
        throw new Error(
          'Duplicate child key "' +
            (child as any).key +
            '" found! This will cause problems in ReactGridLayout.'
        );
      }
      keys[(child as any).key] = true;
    });
  },
  innerRef: PropTypes.any
};

export default ReactGridLayoutPropTypes;
