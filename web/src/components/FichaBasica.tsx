import type { ApartadoExtracto, CampoBasico, Convocatoria, FichaBasica } from '../tipos';

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });

const NOMBRE_APARTADO: Record<ApartadoExtracto, string> = {
  beneficiarios: 'Quién puede pedirla',
  objeto: 'Qué financia',
  bases: 'Bases reguladoras',
  cuantia: 'Cuantía',
  plazo: 'Plazo',
  presentacion: 'Presentación',
  otros: 'Otros datos',
};

const NOMBRE_CAMPO: Record<CampoBasico, string> = {
  importeMaximo: 'Importe máximo',
  porcentajeMaximo: 'Porcentaje máximo',
  plazo: 'Plazo de presentación',
  minimis: 'Minimis',
  compatibilidad: 'Compatibilidad',
  caches: 'Cachés',
};

function valor(campo: CampoBasico, v: number | null) {
  if (v === null) return null;
  return campo === 'porcentajeMaximo' ? `${v.toLocaleString('es-ES')} %` : euros.format(v);
}

/** Ficha sin IA: frases literales de las bases y el extracto oficial partido en apartados. */
export function VistaBasica({ basica, convocatoria }: { basica: FichaBasica; convocatoria: Convocatoria }) {
  const documento = (id: number) => convocatoria.documentos.find((d) => d.id === id);
  const varios = convocatoria.documentos.length > 1;
  return (
    <div className="ficha">
      {basica.datos.length > 0 && (
        <section>
          <h4>Datos encontrados en las bases</h4>
          <dl>
            {basica.datos.map((d) => {
              const doc = documento(d.documento);
              return (
                <div className="ficha-fila" key={d.campo}>
                  <dt>{NOMBRE_CAMPO[d.campo]}</dt>
                  <dd>
                    {valor(d.campo, d.valor)}
                    <span className="fuente">
                      <q>{d.texto}</q>{' '}
                      <span className="pagina">
                        (
                        {doc ? (
                          <a href={doc.url} target="_blank" rel="noreferrer">
                            {varios ? `${doc.nombre}, ` : ''}pág. {d.pagina}
                          </a>
                        ) : (
                          `pág. ${d.pagina}`
                        )}
                        )
                      </span>
                    </span>
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      )}

      {basica.extracto && (
        <section>
          <h4>
            Extracto oficial
            {basica.extracto.diario && ` · ${basica.extracto.diario}`}
            {basica.extracto.fecha && ` · ${new Date(basica.extracto.fecha).toLocaleDateString('es-ES')}`}
          </h4>
          <dl>
            {basica.extracto.apartados.map((a, i) => (
              <div className="ficha-fila" key={i}>
                <dt>{NOMBRE_APARTADO[a.tipo]}</dt>
                <dd className="texto-oficial">{a.texto}</dd>
              </div>
            ))}
          </dl>
          {basica.extracto.url && (
            <a href={basica.extracto.url} target="_blank" rel="noreferrer">
              Ver en el boletín ↗
            </a>
          )}
        </section>
      )}

      {convocatoria.documentos.length > 0 && (
        <section>
          <h4>Documentos oficiales</h4>
          <ul>
            {convocatoria.documentos.map((d) => (
              <li key={d.id}>
                <a href={d.url} target="_blank" rel="noreferrer">
                  {d.descripcion || d.nombre} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!basica.extracto && basica.datos.length === 0 && convocatoria.documentos.length === 0 && (
        <p className="ayuda">La BDNS no publica extracto ni documentos de esta convocatoria. Consulta la ficha BDNS.</p>
      )}

      <p className="ayuda">
        Ficha básica automática, sin IA: todo es texto literal del extracto y de las bases. Ante cualquier duda, prevalece
        el documento oficial; si necesitas el detalle (requisitos, criterios, documentación), abre las bases o pide que se
        lean.
      </p>
    </div>
  );
}
