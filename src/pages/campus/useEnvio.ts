import { useState } from 'react';
import { CampusApiError, comoCampusError } from '../../services/campus';

export type Errores = Record<string, string>;

export function useEnvio<T>(guardar: (datos: T) => Promise<void>) {
  const [errores, setErrores] = useState<Errores>({});
  const [general, setGeneral] = useState<CampusApiError | null>(null);
  const [guardando, setGuardando] = useState(false);

  const enviar = async (locales: Errores, datos: T) => {
    setErrores(locales);
    setGeneral(null);
    if (Object.keys(locales).length) return;
    setGuardando(true);
    try {
      await guardar(datos);
    } catch (e) {
      const error = comoCampusError(e);
      setErrores(error.campos);
      if (!Object.keys(error.campos).length) setGeneral(error);
    } finally {
      setGuardando(false);
    }
  };
  return { errores, general, guardando, enviar };
}
