import * as React from "react";
import PropTypes from "prop-types";
import { deepEqual } from "fast-equals";
import {
  cloneLayout,
  synchronizeLayoutWithChildren,
  validateLayout,
  noop,
  Layout
} from "./utils";
import {
  getBreakpointFromWidth,
  getColsFromBreakpoint,
  findOrGenerateResponsiveLayout,
  ResponsiveLayout,
  OnLayoutChangeCallback,
  Breakpoints
} from "./responsiveUtils";
import ReactGridLayout from "./ReactGridLayout";

const type = (obj: any) => Object.prototype.toString.call(obj);

function getIndentationValue<T extends [number, number] | null>(
  param: { [key: string]: T } | T,
  breakpoint: string
): T {
  if (param == null) return null as T;
  return Array.isArray(param) ? param as T : (param as { [key: string]: T })[breakpoint];
}

type State = {
  layout: Layout;
  breakpoint: string;
  cols: number;
  layouts?: ResponsiveLayout<string>;
};

type ResponsiveRGLProps<Breakpoint extends string = string> =
  React.ComponentProps<typeof ReactGridLayout> & {
    breakpoint?: Breakpoint | null;
    breakpoints: Breakpoints<Breakpoint>;
    cols: { [key in Breakpoint]: number };
    layouts: ResponsiveLayout<Breakpoint>;
    width: number;
    margin: { [key in Breakpoint]: [number, number] } | [number, number];
    containerPadding: { [key in Breakpoint]: [number, number] | null } | [number, number] | null;
    onBreakpointChange: (breakpoint: Breakpoint, cols: number) => void;
    onLayoutChange: OnLayoutChangeCallback;
    onWidthChange: (
      containerWidth: number,
      margin: [number, number],
      cols: number,
      containerPadding: [number, number] | null
    ) => void;
    allowOverlap?: boolean;
  };

type DefaultProps = {
  allowOverlap: boolean;
  breakpoints: Breakpoints<string>;
  cols: { [key: string]: number };
  containerPadding: { [key: string]: [number, number] | null };
  layouts: ResponsiveLayout<string>;
  margin: [number, number];
  onBreakpointChange: (breakpoint: string, cols: number) => void;
  onLayoutChange: OnLayoutChangeCallback;
  onWidthChange: (
    containerWidth: number,
    margin: [number, number],
    cols: number,
    containerPadding: [number, number] | null
  ) => void;
};

export default class ResponsiveReactGridLayout extends React.Component<
  ResponsiveRGLProps,
  State
> {
  static propTypes = {
    breakpoint: PropTypes.string,
    breakpoints: PropTypes.object,
    allowOverlap: PropTypes.bool,
    cols: PropTypes.object,
    margin: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
    containerPadding: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
    layouts(props: ResponsiveRGLProps, propName: string) {
      if (type(props[propName]) !== "[object Object]") {
        throw new Error(
          "Layout property must be an object. Received: " +
            type(props[propName])
        );
      }
      Object.keys(props[propName]).forEach(key => {
        if (!(key in props.breakpoints)) {
          throw new Error(
            "Each key in layouts must align with a key in breakpoints."
          );
        }
        validateLayout(props.layouts[key], "layouts." + key);
      });
    },
    width: PropTypes.number.isRequired,
    onBreakpointChange: PropTypes.func,
    onLayoutChange: PropTypes.func,
    onWidthChange: PropTypes.func
  };

  static defaultProps: DefaultProps = {
    breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 },
    cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
    containerPadding: { lg: null, md: null, sm: null, xs: null, xxs: null },
    layouts: {},
    margin: [10, 10],
    allowOverlap: false,
    onBreakpointChange: noop,
    onLayoutChange: noop,
    onWidthChange: noop
  };

  state: State = this.generateInitialState();

  generateInitialState(): State {
    const { width, breakpoints, layouts, cols } = this.props;
    const breakpoint = getBreakpointFromWidth(breakpoints, width);
    const colNo = getColsFromBreakpoint(breakpoint, cols);
    const compactType =
      (this.props as any).verticalCompact === false ? null : (this.props as any).compactType;
    const initialLayout = findOrGenerateResponsiveLayout(
      layouts,
      breakpoints,
      breakpoint,
      breakpoint,
      colNo,
      compactType
    );
    return {
      layout: initialLayout,
      breakpoint: breakpoint,
      cols: colNo
    };
  }

  static getDerivedStateFromProps(
    nextProps: ResponsiveRGLProps,
    prevState: State
  ): Partial<State> | null {
    if (!deepEqual(nextProps.layouts, prevState.layouts)) {
      const { breakpoint, cols } = prevState;
      const newLayout = findOrGenerateResponsiveLayout(
        nextProps.layouts,
        nextProps.breakpoints,
        breakpoint,
        breakpoint,
        cols,
        (nextProps as any).compactType
      );
      return { layout: newLayout, layouts: nextProps.layouts };
    }
    return null;
  }

  componentDidUpdate(prevProps: ResponsiveRGLProps) {
    if (
      this.props.width !== prevProps.width ||
      this.props.breakpoint !== prevProps.breakpoint ||
      !deepEqual(this.props.breakpoints, prevProps.breakpoints) ||
      !deepEqual(this.props.cols, prevProps.cols)
    ) {
      this.onWidthChange(prevProps);
    }
  }

  onLayoutChange = (layout: Layout) => {
    this.props.onLayoutChange(layout, {
      ...this.props.layouts,
      [this.state.breakpoint]: layout
    });
  };

  onWidthChange(prevProps: ResponsiveRGLProps) {
    const { breakpoints, cols, layouts } = this.props;
    const newBreakpoint =
      this.props.breakpoint ||
      getBreakpointFromWidth(this.props.breakpoints, this.props.width);
    const lastBreakpoint = this.state.breakpoint;
    const newCols: number = getColsFromBreakpoint(newBreakpoint, cols);
    const newLayouts = { ...layouts };
    if (
      lastBreakpoint !== newBreakpoint ||
      prevProps.breakpoints !== breakpoints ||
      prevProps.cols !== cols
    ) {
      if (!(lastBreakpoint in newLayouts))
        newLayouts[lastBreakpoint] = cloneLayout(this.state.layout);
      let layout = findOrGenerateResponsiveLayout(
        newLayouts,
        breakpoints,
        newBreakpoint,
        lastBreakpoint,
        newCols,
        (this.props as any).compactType
      );
      layout = synchronizeLayoutWithChildren(
        layout,
        this.props.children,
        newCols,
        (this.props as any).compactType,
        this.props.allowOverlap
      );
      newLayouts[newBreakpoint] = layout;
      this.props.onBreakpointChange(newBreakpoint, newCols);
      this.props.onLayoutChange(layout, newLayouts);
      this.setState({
        breakpoint: newBreakpoint,
        layout: layout,
        cols: newCols
      });
    }
    const margin = getIndentationValue(this.props.margin, newBreakpoint);
    const containerPadding = getIndentationValue(
      this.props.containerPadding,
      newBreakpoint
    );
    this.props.onWidthChange(
      this.props.width,
      margin as [number, number],
      newCols,
      containerPadding as [number, number] | null
    );
  }

  render(): React.ReactElement<typeof ReactGridLayout> {
    const {
      breakpoint,
      breakpoints,
      cols,
      layouts,
      margin,
      containerPadding,
      onBreakpointChange,
      onLayoutChange,
      onWidthChange,
      ...other
    } = this.props;
    return (
      <ReactGridLayout
        {...other}
        margin={getIndentationValue(margin, this.state.breakpoint) as [number, number]}
        containerPadding={getIndentationValue(
          containerPadding,
          this.state.breakpoint
        ) as [number, number] | null}
        onLayoutChange={this.onLayoutChange}
        layout={this.state.layout}
        cols={this.state.cols}
      />
    );
  }
}
