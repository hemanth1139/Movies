import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Watchlog encountered a rendering error.', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <main role="alert" className="app-error-fallback">
        <h1>Watchlog ran into a problem</h1>
        <p>Reload the page to continue. Changes saved before the problem remain available.</p>
        <button type="button" onClick={() => window.location.reload()}>Reload Watchlog</button>
      </main>;
    }
    return this.props.children;
  }
}
