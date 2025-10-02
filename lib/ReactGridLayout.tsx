import * as React from "react";
import { deepEqual } from "fast-equals";
import clsx from "clsx";
import {
  bottom,
  childrenEqual,
  cloneLayoutItem,
  compact,
  compactType,
  fastRGLPropsEqual,
  getAllCollisions,
  getLayoutItem,
  moveElement,
  noop,
  synchronizeLayoutWithChildren,
  withLayoutItem
} from "./utils";
import { calcXY } from "./calculateUtils";
import GridItem from "./GridItem";
import ReactGridLayoutPropTypes from "./ReactGridLayoutPropTypes";
import {
  CompactType,
  GridResizeEvent,
  GridDragEvent,
  DragOverEvent,
  Layout,
  DroppingPosition,
  LayoutItem
} from "./utils";
import { PositionParams } from "./calculateUtils";

// TypeScript types
export type ReactChildrenArray<T> = Array<React.ReactElement<T>>;
export type ReactElement<T = any> = React.ReactElement<T>;

interface State {
  activeDrag: LayoutItem | null;
  layout: Layout;
  mounted: boolean;
  oldDragItem: LayoutItem | null;
  oldLayout: Layout | null;
  oldResizeItem: LayoutItem | null;
  resizing: boolean;
  droppingDOMNode: ReactElement<any> | null;
  droppingPosition?: DroppingPosition;
  children: ReactChildrenArray<ReactElement<any>>;
  compactType?: CompactType;
  propsLayout?: Layout;
}

import { Props, DefaultProps } from "./ReactGridLayoutPropTypes";

const layoutClassName = "react-grid-layout";
let isFirefox = false;
try {
  isFirefox = /firefox/i.test(navigator.userAgent);
} catch (e) {
  /* Ignore */
}

export default class ReactGridLayout extends React.Component<Props, State> {
  static displayName: string = "ReactGridLayout";

  static defaultProps: DefaultProps = {
    autoSize: true,
    cols: 12,
    className: "",
    style: {},
    draggableHandle: "",
    draggableCancel: "",
    containerPadding: null,
    rowHeight: 150,
    maxRows: Infinity,
    layout: [],
    margin: [10, 10],
    isBounded: false,
    isDraggable: true,
    isResizable: true,
    allowOverlap: false,
    isDroppable: false,
    useCSSTransforms: true,
    transformScale: 1,
    verticalCompact: true,
    compactType: "vertical",
    preventCollision: false,
    droppingItem: {
      i: "__dropping-elem__",
      h: 1,
      w: 1
    },
    resizeHandles: ["se"],
    onLayoutChange: noop,
    onDragStart: noop,
    onDrag: noop,
    onDragStop: noop,
    onResizeStart: noop,
    onResize: noop,
    onResizeStop: noop,
    onDrop: noop,
    onDropDragOver: noop
  };

  state: State = {
    activeDrag: null,
    layout: synchronizeLayoutWithChildren(
      this.props.layout,
      this.props.children,
      this.props.cols,
      compactType(this.props),
      this.props.allowOverlap
    ),
    mounted: false,
    oldDragItem: null,
    oldLayout: null,
    oldResizeItem: null,
    resizing: false,
    droppingDOMNode: null,
    children: []
  };

  dragEnterCounter: number = 0;

  componentDidMount() {
    this.setState({ mounted: true });
    this.onLayoutMaybeChanged(this.state.layout, this.props.layout);
  }

  static getDerivedStateFromProps(
    nextProps: Props,
    prevState: State
  ): Partial<State> | null {
    let newLayoutBase;
    if (prevState.activeDrag) {
      return null;
    }
    if (
      !deepEqual(nextProps.layout, prevState.propsLayout) ||
      nextProps.compactType !== prevState.compactType
    ) {
      newLayoutBase = nextProps.layout;
    } else if (!childrenEqual(nextProps.children, prevState.children)) {
      newLayoutBase = prevState.layout;
    }
    if (newLayoutBase) {
      const newLayout = synchronizeLayoutWithChildren(
        newLayoutBase,
        nextProps.children,
        nextProps.cols,
        compactType(nextProps),
        nextProps.allowOverlap
      );
      return {
        layout: newLayout,
        compactType: nextProps.compactType,
        children: nextProps.children,
        propsLayout: nextProps.layout
      };
    }
    return null;
  }

  shouldComponentUpdate(nextProps: Props, nextState: State): boolean {
    return (
      this.props.children !== nextProps.children ||
      !fastRGLPropsEqual(this.props, nextProps, deepEqual) ||
      this.state.activeDrag !== nextState.activeDrag ||
      this.state.mounted !== nextState.mounted ||
      this.state.droppingPosition !== nextState.droppingPosition
    );
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (!this.state.activeDrag) {
      const newLayout = this.state.layout;
      const oldLayout = prevState.layout;
      this.onLayoutMaybeChanged(newLayout, oldLayout);
    }
  }

  containerHeight(): string | undefined {
    if (!this.props.autoSize) return;
    const nbRow = bottom(this.state.layout);
    const containerPaddingY = this.props.containerPadding
      ? this.props.containerPadding[1]
      : this.props.margin[1];
    return (
      nbRow * this.props.rowHeight +
      (nbRow - 1) * this.props.margin[1] +
      containerPaddingY * 2 +
      "px"
    );
  }

  onDragStart(i: string, x: number, y: number, event: GridDragEvent): void {
    const { layout } = this.state;
    const l = getLayoutItem(layout, i);
    if (!l) return;
    const placeholder = {
      w: l.w,
      h: l.h,
      x: l.x,
      y: l.y,
      placeholder: true,
      i: i
    };
    this.setState({
      oldDragItem: cloneLayoutItem(l),
      oldLayout: layout,
      activeDrag: placeholder
    });
    return this.props.onDragStart(layout, l, l, null, event.e, event.node);
  }

  onDrag(i: string, x: number, y: number, event: GridDragEvent): void {
    const { oldDragItem } = this.state;
    let { layout } = this.state;
    const { cols, allowOverlap, preventCollision } = this.props;
    const l = getLayoutItem(layout, i);
    if (!l) return;
    const placeholder = {
      w: l.w,
      h: l.h,
      x: l.x,
      y: l.y,
      placeholder: true,
      i: i
    };
    const isUserAction = true;
    layout = moveElement(
      layout,
      l,
      x,
      y,
      isUserAction,
      preventCollision,
      compactType(this.props),
      cols,
      allowOverlap
    );
    this.props.onDrag(layout, oldDragItem, l, placeholder, event.e, event.node);
    this.setState({
      layout: allowOverlap
        ? layout
        : compact(layout, compactType(this.props), cols),
      activeDrag: placeholder
    });
  }

  onDragStop(i: string, x: number, y: number, event: GridDragEvent): void {
    if (!this.state.activeDrag) return;
    const { oldDragItem } = this.state;
    let { layout } = this.state;
    const { cols, preventCollision, allowOverlap } = this.props;
    const l = getLayoutItem(layout, i);
    if (!l) return;
    const isUserAction = true;
    layout = moveElement(
      layout,
      l,
      x,
      y,
      isUserAction,
      preventCollision,
      compactType(this.props),
      cols,
      allowOverlap
    );
    const newLayout = allowOverlap
      ? layout
      : compact(layout, compactType(this.props), cols);
    this.props.onDragStop(newLayout, oldDragItem, l, null, event.e, event.node);
    const { oldLayout } = this.state;
    this.setState({
      activeDrag: null,
      layout: newLayout,
      oldDragItem: null,
      oldLayout: null
    });
    this.onLayoutMaybeChanged(newLayout, oldLayout);
  }

  onLayoutMaybeChanged(newLayout: Layout, oldLayout: Layout | null) {
    if (!oldLayout) oldLayout = this.state.layout;
    if (!deepEqual(oldLayout, newLayout)) {
      this.props.onLayoutChange(newLayout);
    }
  }

  onResizeStart(i: string, w: number, h: number, event: GridResizeEvent): void {
    const { layout } = this.state;
    const l = getLayoutItem(layout, i);
    if (!l) return;
    this.setState({
      oldResizeItem: cloneLayoutItem(l),
      oldLayout: this.state.layout,
      resizing: true
    });
    this.props.onResizeStart(layout, l, l, null, event.e, event.node);
  }

  onResize(
    i: string,
    w: number,
    h: number,
    event: GridResizeEvent
  ): void {
    const { oldResizeItem } = this.state;
    const { layout } = this.state;
    const { cols, preventCollision, allowOverlap } = this.props;
    let shouldMoveItem = false;
    let finalLayout;
    let x;
    let y;
    const [newLayout, l] = withLayoutItem(layout, i, l => {
      let hasCollisions;
      x = l.x;
      y = l.y;
      if (["sw", "w", "nw", "n", "ne"].indexOf(event.handle) !== -1) {
        if (["sw", "nw", "w"].indexOf(event.handle) !== -1) {
          x = l.x + (l.w - w);
          w = l.x !== x && x < 0 ? l.w : w;
          x = x < 0 ? 0 : x;
        }
        if (["ne", "n", "nw"].indexOf(event.handle) !== -1) {
          y = l.y + (l.h - h);
          h = l.y !== y && y < 0 ? l.h : h;
          y = y < 0 ? 0 : y;
        }
        shouldMoveItem = true;
      }
      if (preventCollision && !allowOverlap) {
        const collisions = getAllCollisions(layout, {
          ...l,
          w,
          h,
          x,
          y
        }).filter(layoutItem => layoutItem.i !== l.i);
        hasCollisions = collisions.length > 0;
        if (hasCollisions) {
          y = l.y;
          h = l.h;
          x = l.x;
          w = l.w;
          shouldMoveItem = false;
        }
      }
      l.w = w;
      l.h = h;
      return l;
    });
    if (!l) return;
    finalLayout = newLayout;
    if (shouldMoveItem) {
      const isUserAction = true;
      finalLayout = moveElement(
        newLayout,
        l,
        x,
        y,
        isUserAction,
        this.props.preventCollision,
        compactType(this.props),
        cols,
        allowOverlap
      );
    }
    const placeholder = {
      w: l.w,
      h: l.h,
      x: l.x,
      y: l.y,
      static: true,
      i: i
    };
    this.props.onResize(finalLayout, oldResizeItem, l, placeholder, event.e, event.node);
    this.setState({
      layout: allowOverlap
        ? finalLayout
        : compact(finalLayout, compactType(this.props), cols),
      activeDrag: placeholder
    });
  }

  onResizeStop(i: string, w: number, h: number, event: GridResizeEvent): void {
    const { layout, oldResizeItem } = this.state;
    const { cols, allowOverlap } = this.props;
    const l = getLayoutItem(layout, i);
    const newLayout = allowOverlap
      ? layout
      : compact(layout, compactType(this.props), cols);
    this.props.onResizeStop(newLayout, oldResizeItem, l, null, event.e, event.node);
    const { oldLayout } = this.state;
    this.setState({
      activeDrag: null,
      layout: newLayout,
      oldResizeItem: null,
      oldLayout: null,
      resizing: false
    });
    this.onLayoutMaybeChanged(newLayout, oldLayout);
  }

  placeholder(): ReactElement<any> | null {
    const { activeDrag } = this.state;
    if (!activeDrag) return null;
    const {
      width,
      cols,
      margin,
      containerPadding,
      rowHeight,
      maxRows,
      useCSSTransforms,
      transformScale
    } = this.props;
    return (
      <GridItem
        w={activeDrag.w}
        h={activeDrag.h}
        x={activeDrag.x}
        y={activeDrag.y}
        i={activeDrag.i}
        className={`react-grid-placeholder ${
          this.state.resizing ? "placeholder-resizing" : ""
        }`}
        containerWidth={width}
        cols={cols}
        margin={margin}
        containerPadding={containerPadding || margin}
        maxRows={maxRows}
        rowHeight={rowHeight}
        isDraggable={false}
        isResizable={false}
        isBounded={false}
        useCSSTransforms={useCSSTransforms}
        transformScale={transformScale}
      >
        <div />
      </GridItem>
    );
  }

  processGridItem(
    child: ReactElement<any>,
    isDroppingItem?: boolean
  ): ReactElement<any> | null {
    if (!child || !child.key) return null;
    const l = getLayoutItem(this.state.layout, String(child.key));
    if (!l) return null;
    const {
      width,
      cols,
      margin,
      containerPadding,
      rowHeight,
      maxRows,
      isDraggable,
      isResizable,
      isBounded,
      useCSSTransforms,
      transformScale,
      draggableCancel,
      draggableHandle,
      resizeHandles,
      resizeHandle
    } = this.props;
    const { mounted, droppingPosition } = this.state;
    const draggable =
      typeof l.isDraggable === "boolean"
        ? l.isDraggable
        : !l.static && isDraggable;
    const resizable =
      typeof l.isResizable === "boolean"
        ? l.isResizable
        : !l.static && isResizable;
    const resizeHandlesOptions = l.resizeHandles || resizeHandles;
    const bounded = draggable && isBounded && l.isBounded !== false;
    return (
      <GridItem
        containerWidth={width}
        cols={cols}
        margin={margin}
        containerPadding={containerPadding || margin}
        maxRows={maxRows}
        rowHeight={rowHeight}
        cancel={draggableCancel}
        handle={draggableHandle}
        onDragStop={this.onDragStop}
        onDragStart={this.onDragStart}
        onDrag={this.onDrag}
        onResizeStart={this.onResizeStart}
        onResize={this.onResize}
        onResizeStop={this.onResizeStop}
        isDraggable={draggable}
        isResizable={resizable}
        isBounded={bounded}
        useCSSTransforms={useCSSTransforms && mounted}
        usePercentages={!mounted}
        transformScale={transformScale}
        w={l.w}
        h={l.h}
        x={l.x}
        y={l.y}
        i={l.i}
        minH={l.minH}
        minW={l.minW}
        maxH={l.maxH}
        maxW={l.maxW}
        static={l.static}
        droppingPosition={isDroppingItem ? droppingPosition : undefined}
        resizeHandles={resizeHandlesOptions}
        resizeHandle={resizeHandle}
      >
        {child}
      </GridItem>
    );
  }

  onDragOver(e: DragOverEvent): void | false {
    e.preventDefault();
    e.stopPropagation();
    if (
      isFirefox &&
      !(e.nativeEvent.target as HTMLElement)?.classList.contains(layoutClassName)
    ) {
      return false;
    }
    const {
      droppingItem,
      onDropDragOver,
      margin,
      cols,
      rowHeight,
      maxRows,
      width,
      containerPadding,
      transformScale
    } = this.props;
    const onDragOverResult = onDropDragOver?.(e);
    if (onDragOverResult === false) {
      if (this.state.droppingDOMNode) {
        this.removeDroppingPlaceholder();
      }
      return false;
    }
    const finalDroppingItem = { ...droppingItem, ...onDragOverResult };
    const { layout } = this.state;
    const gridRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const layerX = e.clientX - gridRect.left;
    const layerY = e.clientY - gridRect.top;
    const droppingPosition = {
      left: layerX / transformScale,
      top: layerY / transformScale,
      e
    };
    if (!this.state.droppingDOMNode) {
      const positionParams: PositionParams = {
        cols,
        margin,
        maxRows,
        rowHeight,
        containerWidth: width,
        containerPadding: containerPadding || margin
      };
      const calculatedPosition = calcXY(
        positionParams,
        layerY,
        layerX,
        finalDroppingItem.w,
        finalDroppingItem.h
      );
      this.setState({
        droppingDOMNode: <div key={finalDroppingItem.i} />,
        droppingPosition,
        layout: [
          ...layout,
          {
            ...finalDroppingItem,
            x: calculatedPosition.x,
            y: calculatedPosition.y,
            static: false,
            isDraggable: true
          }
        ]
      });
    } else if (this.state.droppingPosition) {
      const { left, top } = this.state.droppingPosition;
      const shouldUpdatePosition = left != layerX || top != layerY;
      if (shouldUpdatePosition) {
        this.setState({ droppingPosition });
      }
    }
  }

  removeDroppingPlaceholder(): void {
    const { droppingItem, cols } = this.props;
    const { layout } = this.state;
    const newLayout = compact(
      layout.filter(l => l.i !== droppingItem.i),
      compactType(this.props),
      cols,
      this.props.allowOverlap
    );
    this.setState({
      layout: newLayout,
      droppingDOMNode: null,
      droppingPosition: undefined
    });
  }

  onDragLeave: EventHandler = e => {
    e.preventDefault(); // Prevent any browser native action
    e.stopPropagation();
    this.dragEnterCounter--;

    // onDragLeave can be triggered on each layout's child.
    // But we know that count of dragEnter and dragLeave events
    // will be balanced after leaving the layout's container
    // so we can increase and decrease count of dragEnter and
    // when it'll be equal to 0 we'll remove the placeholder
    if (this.dragEnterCounter === 0) {
      this.removeDroppingPlaceholder();
    }
  };

  onDragEnter: EventHandler = e => {
    e.preventDefault(); // Prevent any browser native action
    e.stopPropagation();
    this.dragEnterCounter++;
  };

  onDrop: EventHandler = (e: Event) => {
    e.preventDefault(); // Prevent any browser native action
    e.stopPropagation();
    const { droppingItem } = this.props;
    const { layout } = this.state;
    const item = layout.find(l => l.i === droppingItem.i);

    // reset dragEnter counter on drop
    this.dragEnterCounter = 0;

    this.removeDroppingPlaceholder();

    this.props.onDrop(layout, item, e);
  };

  render(): React.Element<"div"> {
    const { className, style, isDroppable, innerRef } = this.props;

    const mergedClassName = clsx(layoutClassName, className);
    const mergedStyle = {
      height: this.containerHeight(),
      ...style
    };

    return (
      <div
        ref={innerRef}
        className={mergedClassName}
        style={mergedStyle}
        onDrop={isDroppable ? this.onDrop : noop}
        onDragLeave={isDroppable ? this.onDragLeave : noop}
        onDragEnter={isDroppable ? this.onDragEnter : noop}
        onDragOver={isDroppable ? this.onDragOver : noop}
      >
        {React.Children.map(this.props.children, child =>
          this.processGridItem(child)
        )}
        {isDroppable &&
          this.state.droppingDOMNode &&
          this.processGridItem(this.state.droppingDOMNode, true)}
        {this.placeholder()}
      </div>
    );
  }
}
