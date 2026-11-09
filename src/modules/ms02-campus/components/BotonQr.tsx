import { useState } from 'react';
import { comoCampusError as comoError, descargarQr, type ElementoQr } from '../services/campus';

export function BotonQr({ elemento, id, nombre }: { elemento: ElementoQr; id: string; nombre: string }) {
  const [estado, setEstado] = useState<'listo' | 'descargando' | 'error'>('listo');
  const [mensaje, setMensaje] = useState('');

  const descargar = async () => {
    setEstado('descargando');
    try {
      const url = URL.createObjectURL(await descargarQr(elemento, id));
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `qr-${nombre.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}.png`;
      enlace.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setEstado('listo');
    } catch (e) {
      setMensaje(comoError(e).message);
      setEstado('error');
    }
  };

  return (
    <button type="button" className={`cs-mini${estado === 'error' ? ' peligro' : ''}`} onClick={descargar}
      disabled={estado === 'descargando'} title={estado === 'error' ? mensaje : `Descargar el QR de ${nombre}`}>
      {estado === 'descargando' ? 'Generando…' : estado === 'error' ? 'QR no disponible' : 'QR'}
    </button>
  );
}
