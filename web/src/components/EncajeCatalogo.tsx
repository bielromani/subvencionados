import { useEffect, useState } from 'react';
import { crm, type Encaje, NOMBRE_TIPO } from '../crm';
import { useCuenta } from '../sincronizar';
import { EtiquetaCerteza } from './EntidadCrm';

type ConViabilidad = Encaje & { viabilidad?: 'viable' | 'ajustada' | 'pendiente'; motivoViabilidad?: string };
const VIABILIDAD = { viable: 'Viable a priori', ajustada: 'Ajustada', pendiente: 'Pendiente de valorar' };

/** Qué espectáculos del catálogo encajan con una ayuda (podría financiarlos) o con una licitación (y su viabilidad). */
export function EncajeCatalogo({ tipo, id }: { tipo: 'convocatoria' | 'contrato'; id: string }) {
  const usuario = useCuenta().cuenta?.usuario;
  const [items, setItems] = useState<ConViabilidad[] | null>(null);
  useEffect(() => {
    if (!usuario) return;
    (tipo === 'convocatoria' ? crm.encajeConvocatoria(id) : crm.encajeContrato(id)).then((r) => setItems(r.espectaculos), () => setItems([]));
  }, [usuario?.email, tipo, id]);
  if (!usuario || !items) return null;
  return (
    <section className="bloque">
      <h3>{tipo === 'convocatoria' ? 'Espectáculos de tu catálogo que podría financiar' : 'Espectáculos o servicios de tu catálogo que podrían encajar'}</h3>
      {tipo === 'convocatoria' && (
        <p className="ayuda">
          <EtiquetaCerteza c="potencial" /> Parece pertinente: comprueba los requisitos antes de mencionarla. Solo con resolución oficial pasa a «financiación confirmada».
        </p>
      )}
      {items.length === 0 ? (
        <p className="ayuda">Ninguno de tu catálogo encaja con lo que pide. {tipo === 'contrato' && 'Pendiente de valorar.'}</p>
      ) : (
        <ul className="lista-simple">
          {items.map((x) => (
            <li key={x.espectaculo.id}>
              <strong>{x.espectaculo.nombre}</strong> <span className="ayuda">{NOMBRE_TIPO[x.espectaculo.tipo]}</span>
              {x.viabilidad && (
                <span className={`etiqueta etiqueta-${x.viabilidad === 'viable' ? 'exito' : x.viabilidad === 'ajustada' ? 'aviso' : 'neutro'}`}>{VIABILIDAD[x.viabilidad]}</span>
              )}
              {x.motivos.map((m) => (
                <span key={m} className="fila-motivos">
                  {m}
                </span>
              ))}
              {x.motivoViabilidad && <span className="fila-motivos">{x.motivoViabilidad}</span>}
              {x.avisos.map((m) => (
                <span key={m} className="fila-aviso">
                  ⚠ {m}
                </span>
              ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
