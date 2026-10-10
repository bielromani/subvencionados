import { useState, type ReactNode } from 'react';
import { api } from '../api';
import type { Cita, Convocatoria, Dato, ElementoFicha, Ficha } from '../tipos';
import { VistaBasica } from './FichaBasica';

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });

/** Solo se enseña lo que tiene una cita encontrada literalmente en las bases. */
const confirmado = (x: { cita: Cita | null; sinCita?: boolean }) => !x.sinCita && x.cita?.estado !== 'revisar';

function PendienteDeRevisar({ motivo }: { motivo: string }) {
  return (
    <span className="etiqueta etiqueta-aviso" title={motivo}>
      Pendiente de revisar: la IA dio un dato que no se ha encontrado en las bases
    </span>
  );
}

/** De dónde sale el dato: página del documento y fragmento literal. */
function Fuente({ cita, documentos }: { cita: Cita | null; documentos: Ficha['documentos'] }) {
  if (!cita) return null;
  const doc = documentos.length > 1 ? `${documentos.find((d) => d.id === cita.documento)?.nombre ?? 'documento'}, ` : '';
  return (
    <span className="fuente">
      <q>{cita.texto}</q> <span className="pagina">({doc}pág. {cita.pagina})</span>
    </span>
  );
}

/** Valor confirmado con su fuente, o el aviso de que hay que revisarlo. */
function Contenido({
  valor,
  cita,
  sinCita,
  documentos,
}: {
  valor: ReactNode;
  cita: Cita | null;
  sinCita?: boolean;
  documentos: Ficha['documentos'];
}) {
  if (!confirmado({ cita, sinCita })) return <PendienteDeRevisar motivo={sinCita ? 'Sin cita' : (cita?.motivo ?? '')} />;
  return (
    <>
      {valor}
      <Fuente cita={cita} documentos={documentos} />
    </>
  );
}

function Fila<T>({
  nombre,
  dato,
  formato = (v) => String(v),
  documentos,
}: {
  nombre: string;
  dato: Dato<T>;
  formato?: (v: T) => ReactNode;
  documentos: Ficha['documentos'];
}) {
  return (
    <div className="ficha-fila">
      <dt>{nombre}</dt>
      <dd>
        {dato.valor === null ? (
          <span className="no-consta">No consta en las bases</span>
        ) : (
          <Contenido valor={formato(dato.valor)} cita={dato.cita} sinCita={dato.sinCita} documentos={documentos} />
        )}
      </dd>
    </div>
  );
}

function Lista({ titulo, elementos, documentos }: { titulo: string; elementos: ElementoFicha[]; documentos: Ficha['documentos'] }) {
  return (
    <section>
      <h4>{titulo}</h4>
      {elementos.length === 0 ? (
        <p className="no-consta">No consta en las bases</p>
      ) : (
        <ul>
          {elementos.map((e, i) => (
            <li key={i}>
              <Contenido valor={e.texto} cita={e.cita} sinCita={e.sinCita} documentos={documentos} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function VistaFicha({ ficha }: { ficha: Ficha }) {
  const d = ficha.datos;
  const docs = ficha.documentos;
  return (
    <div className="ficha">
      {!d.documentoEsBases && (
        <p className="etiqueta etiqueta-aviso">El documento disponible no son las bases: la ficha puede estar incompleta.</p>
      )}
      {/* El resumen no lleva citas: solo se enseña si todos los datos de la ficha están confirmados. */}
      {d.resumen.length > 0 && ficha.citas.revisar === 0 && (
        <ul className="ficha-resumen">
          {d.resumen.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}
      <dl>
        <Fila nombre="Qué financia" dato={d.objeto} documentos={docs} />
        <Fila nombre="Quién puede pedirla" dato={d.beneficiarios} documentos={docs} />
      </dl>

      <section>
        <h4>Plazos</h4>
        <dl>
          <Fila nombre="Presentación" dato={d.plazos.presentacion} documentos={docs} />
          <Fila nombre="Resolución" dato={d.plazos.resolucion} documentos={docs} />
          <Fila nombre="Ejecución de la actividad" dato={d.plazos.ejecucion} documentos={docs} />
          <Fila nombre="Justificación" dato={d.plazos.justificacion} documentos={docs} />
        </dl>
      </section>

      <section>
        <h4>Dinero</h4>
        <dl>
          <Fila nombre="Presupuesto total" dato={d.dinero.presupuestoTotal} formato={(v) => euros.format(v)} documentos={docs} />
          <Fila nombre="Importe máximo por solicitud" dato={d.dinero.importeMaximo} formato={(v) => euros.format(v)} documentos={docs} />
          <Fila nombre="Porcentaje máximo financiable" dato={d.dinero.porcentajeMaximo} formato={(v) => `${v} %`} documentos={docs} />
          <Fila nombre="Pago" dato={d.dinero.pago} documentos={docs} />
          <Fila nombre="Compatibilidad con otras ayudas" dato={d.dinero.compatibilidad} documentos={docs} />
          <Fila nombre="Minimis" dato={d.dinero.minimis} documentos={docs} />
        </dl>
      </section>

      <Lista titulo="Requisitos" elementos={d.requisitos} documentos={docs} />
      <Lista titulo="Gastos que cubre" elementos={d.gastosSubvencionables} documentos={docs} />
      <Lista titulo="Gastos que no cubre" elementos={d.gastosNoSubvencionables} documentos={docs} />

      <section>
        <h4>Criterios de valoración</h4>
        {d.criterios.length === 0 ? (
          <p className="no-consta">No consta en las bases</p>
        ) : (
          <ul>
            {d.criterios.map((c, i) => (
              <li key={i}>
                <Contenido
                  valor={
                    <>
                      {c.criterio}
                      {c.puntosMaximos !== null && <strong> · hasta {c.puntosMaximos} puntos</strong>}
                    </>
                  }
                  cita={c.cita}
                  sinCita={c.sinCita}
                  documentos={docs}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <Lista titulo="Documentación" elementos={d.documentacion} documentos={docs} />

      <section>
        <h4>Cómo presentarla</h4>
        <dl>
          <Fila nombre="Dónde" dato={d.presentacion.lugar} documentos={docs} />
          <Fila
            nombre="Dirección"
            dato={d.presentacion.url}
            formato={(v) => (/^https?:\/\//.test(v) ? <a href={v} target="_blank" rel="noreferrer">{v} ↗</a> : v)}
            documentos={docs}
          />
          <Fila nombre="Certificado digital" dato={d.presentacion.certificadoDigital} documentos={docs} />
        </dl>
      </section>

      {d.avisos.length > 0 && (
        <section>
          <h4>Notas de la IA sobre el documento (sin cita)</h4>
          <ul>
            {d.avisos.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </section>
      )}

      <p className="ayuda">
        Extraída de las bases con IA el {new Date(ficha.generada).toLocaleDateString('es-ES')}. {ficha.citas.verificadas} citas
        comprobadas en el documento
        {ficha.citas.revisar > 0 && `, ${ficha.citas.revisar} pendientes de revisar`}. Ante cualquier duda, prevalece el
        texto oficial de las bases.
      </p>
    </div>
  );
}

/** Ficha plegada: se pide al abrirla. La leída por IA si la hay; si no, la básica automática. */
export function FichaPlegable({ id, leida }: { id: string; leida: boolean }) {
  const [estado, setEstado] = useState<'cerrada' | 'cargando' | 'error' | Convocatoria>('cerrada');
  return (
    <details
      className="concesiones"
      onToggle={(e) => {
        if (!(e.currentTarget as HTMLDetailsElement).open || estado !== 'cerrada') return;
        setEstado('cargando');
        api
          .convocatoria(id)
          .then((c) => setEstado(c.ficha || c.basica ? c : 'error'))
          .catch(() => setEstado('error'));
      }}
    >
      <summary>{leida ? 'Ficha completa de las bases' : 'Ficha básica: extracto, datos de las bases y documentos'}</summary>
      {estado === 'cargando' && <p className="ayuda">Cargando…</p>}
      {estado === 'error' && <p className="error">No se ha podido cargar la ficha.</p>}
      {typeof estado === 'object' && estado.ficha && <VistaFicha ficha={estado.ficha} />}
      {typeof estado === 'object' && !estado.ficha && estado.basica && <VistaBasica basica={estado.basica} convocatoria={estado} />}
    </details>
  );
}
