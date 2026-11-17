import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { failed: boolean }

/**
 * Contiene el error de una pantalla para que no deje en blanco toda la aplicación: la barra de navegación sigue
 * visible y se puede reintentar o ir a otra sección. App lo monta con la ruta como `key`, así que al cambiar de ruta
 * se reinicia solo.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Error al mostrar la pantalla', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.failed) {
      return this.props.children;
    }
    return (
      <main className="page">
        <p className="notice err" role="alert">No se pudo mostrar esta pantalla. Reintente o vaya a otra sección.</p>
        <button type="button" className="btn white" onClick={() => this.setState({ failed: false })}>Reintentar</button>
      </main>
    );
  }
}
