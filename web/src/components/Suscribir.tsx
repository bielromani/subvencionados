import { useState } from 'react';

/**
 * Suscribirse a un calendario .ics: el móvil y Outlook lo abren con webcal://; en Google Calendar se pega la dirección en
 * «Otros calendarios → Desde URL». El calendario se actualiza solo (Google tarda hasta un día en refrescarlo).
 */
export function Suscribir({ ruta, nota }: { ruta: string; nota?: string }) {
  const url = `${window.location.origin}${ruta}`;
  const [copiado, setCopiado] = useState(false);
  const copiar = () =>
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2500);
      },
      () => window.prompt('Copia esta dirección:', url),
    ) ?? window.prompt('Copia esta dirección:', url);
  return (
    <div className="suscribir">
      <p className="acciones">
        <a className="accion" href={url.replace(/^https?:/, 'webcal:')}>
          Suscribirme
        </a>
        <button type="button" className="accion" onClick={copiar}>
          {copiado ? '✓ Enlace copiado' : 'Copiar enlace'}
        </button>
      </p>
      <p className="ayuda">
        Suscrito, el calendario se actualiza solo. En Google Calendar: «Otros calendarios» → «Desde URL» y pega el enlace.
        {nota && ` ${nota}`}
      </p>
    </div>
  );
}
