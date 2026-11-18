import { useCallback, useEffect, useState } from 'react';
import { ROLE_ITEMS, type CatalogItem } from '../services/catalog';
import { lastRecipientRoles, loadRecipientRoles } from '../services/recipients';

const FALLBACK_NOTICE = 'No se pudo cargar la lista actualizada de destinatarios; se muestran los últimos grupos conocidos.';

/**
 * Roles destinatarios de MS01. Si MS01 no responde, el formulario sigue funcionando con la última lista que entregó
 * en esta pestaña o, si nunca respondió, con la predeterminada (`ROLE_ITEMS`), y avisa con `notice`; `retry` vuelve a
 * consultar.
 */
export function useRecipientRoles() {
  const [items, setItems] = useState<CatalogItem[] | null>(null);
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;
    loadRecipientRoles()
      .then((data) => { if (!ignore) setItems(data); })
      .catch(() => {
        if (ignore) return;
        setItems(lastRecipientRoles() ?? ROLE_ITEMS);
        setNotice(FALLBACK_NOTICE);
      });
    return () => { ignore = true; };
  }, [attempt]);

  const retry = useCallback(() => {
    setItems(null);
    setNotice('');
    setAttempt((n) => n + 1);
  }, []);

  return { items: items ?? ROLE_ITEMS, loading: items === null, notice, retry };
}
