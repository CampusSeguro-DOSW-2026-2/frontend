import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Mensaje } from './Mensaje';

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
        <Mensaje tono="error" titulo="No se pudo mostrar esta pantalla" onReintentar={() => this.setState({ failed: false })}
          acciones={<a className="plink" href="#/simulacro">Ir al inicio</a>}>
          Reintente o elija otra opción del menú.
        </Mensaje>
      </main>
    );
  }
}
