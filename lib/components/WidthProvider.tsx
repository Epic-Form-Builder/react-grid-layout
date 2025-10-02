import * as React from "react";
import PropTypes from "prop-types";
import ResizeObserver from "resize-observer-polyfill";
import clsx from "clsx";

// TypeScript conversion from Flow

type WPDefaultProps = {
  measureBeforeMount: boolean;
};

type WPProps = {
  className?: string;
  style?: React.CSSProperties;
} & WPDefaultProps;

type WPState = {
  width: number;
};

type ComposedProps<Config> = Config & {
  measureBeforeMount?: boolean;
  className?: string;
  style?: React.CSSProperties;
  width?: number;
};

const layoutClassName = "react-grid-layout";

export default function WidthProvideRGL<Config extends {}>(
  ComposedComponent: React.ComponentType<Config & { innerRef: React.RefObject<HTMLDivElement>; width: number }>
): React.ComponentType<ComposedProps<Config>> {
  return class WidthProvider extends React.Component<WPProps, WPState> {
    static defaultProps: WPDefaultProps = {
      measureBeforeMount: false
    };

    static propTypes = {
      measureBeforeMount: PropTypes.bool
    };

    state: WPState = {
      width: 1280
    };

    elementRef: React.RefObject<HTMLDivElement> = React.createRef();
    mounted: boolean = false;
    resizeObserver!: ResizeObserver;

    componentDidMount() {
      this.mounted = true;
      this.resizeObserver = new ResizeObserver(entries => {
        const node = this.elementRef.current;
        if (node instanceof HTMLElement) {
          const width = entries[0].contentRect.width;
          this.setState({ width });
        }
      });
      const node = this.elementRef.current;
      if (node instanceof HTMLElement) {
        this.resizeObserver.observe(node);
      }
    }

    componentWillUnmount() {
      this.mounted = false;
      const node = this.elementRef.current;
      if (node instanceof HTMLElement) {
        this.resizeObserver.unobserve(node);
      }
      this.resizeObserver.disconnect();
    }

    render() {
      const { measureBeforeMount, ...rest } = this.props;
      if (measureBeforeMount && !this.mounted) {
        return (
          <div
            className={clsx(this.props.className, layoutClassName)}
            style={this.props.style}
            ref={this.elementRef}
          />
        );
      }

      return (
        <ComposedComponent
          innerRef={this.elementRef}
          {...(rest as Config)}
          {...this.state}
        />
      );
    }
  };
}
