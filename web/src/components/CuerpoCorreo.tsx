import { useEffect, useRef, useState } from 'react';
import { crm } from '../crm';

/**
 * El texto del correo con dos vistas: «Cómo llegará» (el diseño con el que sale desde la web) y «Editar el texto».
 * En el texto: «• » hace una viñeta (lo que va antes de « · » sale en negrita), **así** es negrita, «## » un título y
 * un párrafo que empieza en MAYÚSCULAS sale destacado.
 */
export function CuerpoCorreo({
  cuerpo,
  cambiar,
  editable,
  filas,
  origen = {},
}: {
  cuerpo: string;
  cambiar: (v: string) => void;
  editable: boolean;
  filas: number;
  /** La propuesta o el correo de la Bandeja: para poner el título de su línea en el primer correo. */
  origen?: { propuesta?: string; mensaje?: string };
}) {
  const [vista, setVista] = useState<'diseno' | 'texto'>('diseno');
  const [html, setHtml] = useState<string | null>(null);
  const marco = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (vista !== 'diseno') return;
    let vivo = true;
    const t = setTimeout(() => crm.vistaPrevia(cuerpo, origen).then((r) => vivo && setHtml(r.html), () => vivo && setHtml(null)), 150);
    return () => ((vivo = false), clearTimeout(t));
  }, [vista, cuerpo, origen.propuesta, origen.mensaje]);
  const ajustarAlto = () => {
    const d = marco.current?.contentDocument;
    if (d && marco.current) marco.current.style.height = `${d.documentElement.scrollHeight + 4}px`;
  };
  return (
    <div className="cuerpo-correo">
      <div className="segmentado segmentado-corto" role="tablist" aria-label="Vista del correo">
        {(
          [
            ['diseno', 'Cómo llegará'],
            ['texto', editable ? 'Editar el texto' : 'Texto'],
          ] as ['diseno' | 'texto', string][]
        ).map(([v, n]) => (
          <button key={v} type="button" role="tab" aria-selected={vista === v} className={vista === v ? 'activa' : ''} onClick={() => setVista(v)}>
            {n}
          </button>
        ))}
      </div>
      {vista === 'diseno' ? (
        html ? (
          <iframe ref={marco} className="correo-diseno" title="Cómo llegará el correo" srcDoc={html} sandbox="allow-same-origin" onLoad={ajustarAlto} style={{ width: '100%', border: 0, minHeight: 400 }} />
        ) : (
          <p className="ayuda">Preparando la vista…</p>
        )
      ) : (
        <>
          <textarea className="correo-cuerpo" value={cuerpo} onChange={(e) => cambiar(e.target.value)} rows={filas} aria-label="Texto del correo" disabled={!editable} />
          {editable && (
            <p className="ayuda">
              «• » al empezar una línea hace una viñeta (lo que va antes de « · » sale en negrita); **así** sale en negrita; «## » hace un título; un párrafo que empieza en MAYÚSCULAS sale destacado.
            </p>
          )}
        </>
      )}
    </div>
  );
}
