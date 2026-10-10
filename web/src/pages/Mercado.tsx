import { useEffect, useState } from 'react';
import { api } from '../api';
import { Barras, Cifra, Columnas, eurosCompactos } from '../components/Graficos';
import { MapaProvincias } from '../components/Mapa';
import { cambiarParams, type Ruta } from '../ruta';
import { NOMBRE_ADMINISTRACION, NOMBRE_ESTILO, NOMBRE_LINEA, type Meta, type Mercado as DatosMercado } from '../tipos';

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const numero = (v: number) => v.toLocaleString('es-ES');

export function Mercado({ meta, ruta }: { meta: Meta; ruta: Ruta }) {
  const [filtros, setFiltros] = useState({
    estilo: ruta.params.get('estilo') ?? '',
    ccaa: ruta.params.get('ccaa') ?? '',
    administracion: ruta.params.get('administracion') ?? '',
    tipo: ruta.params.get('tipo') ?? '',
  });
  const [m, setM] = useState<DatosMercado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [medida, setMedida] = useState<'concedido' | 'convocatorias'>('concedido');
  const consulta = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v)).toString();

  useEffect(() => {
    cambiarParams(filtros);
    api.mercado(consulta).then(setM, (e: Error) => setError(e.message));
  }, [consulta]);

  const cambiar = (clave: keyof typeof filtros) => (e: { target: { value: string } }) =>
    setFiltros((f) => ({ ...f, [clave]: e.target.value }));

  // Las concesiones solo existen de los últimos años: el gráfico de lo concedido empieza cuando hay datos de verdad.
  const maxConcedido = Math.max(0, ...(m?.porAnio.map((a) => a.concedido) ?? []));
  const conConcesiones = m?.porAnio.filter((a, i, todos) => todos.slice(0, i + 1).some((x) => x.concedido >= maxConcedido * 0.1)) ?? [];
  const desde = conConcesiones[0]?.anio;

  return (
    <section>
      <p className="ayuda">
        Cuánto dinero público se mueve en ayudas a la música compatible con jazz, clásica u ópera (sin becas ni escuelas),
        quién lo da y para qué. Datos de la BDNS desde 2014.
      </p>
      <div className="filtros">
        <select value={filtros.estilo} onChange={cambiar('estilo')} aria-label="Estilo">
          <option value="">Jazz, clásica y ópera</option>
          {meta.estilos.map((e) => (
            <option key={e} value={e}>
              {NOMBRE_ESTILO[e]}
            </option>
          ))}
        </select>
        <select value={filtros.ccaa} onChange={cambiar('ccaa')} aria-label="Comunidad">
          <option value="">Toda España</option>
          {meta.ccaa.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select value={filtros.administracion} onChange={cambiar('administracion')} aria-label="Administración">
          <option value="">Todas las administraciones</option>
          {Object.entries(NOMBRE_ADMINISTRACION).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select value={filtros.tipo} onChange={cambiar('tipo')} aria-label="Tipo">
          <option value="">Concursos y concesiones directas</option>
          <option value="concurrencia">Solo concursos</option>
          <option value="directa">Solo concesiones directas</option>
        </select>
      </div>
      {error && <p className="error">{error}</p>}
      {m && (
        <>
          <div className="cifras">
            <Cifra etiqueta="Concedido" valor={eurosCompactos(m.totales.concedido)} nota={desde ? `desde ${desde}` : undefined} />
            <Cifra etiqueta="Convocado" valor={eurosCompactos(m.totales.presupuesto)} nota="presupuesto desde 2014" />
            <Cifra
              etiqueta="Convocatorias"
              valor={numero(m.totales.convocatorias)}
              nota={`${numero(m.totales.concursos)} concursos · ${numero(m.totales.directas)} directas`}
            />
            <Cifra etiqueta="Organismos" valor={numero(m.totales.organismos)} />
          </div>

          <section className="bloque">
            <h3>Concedido por año de convocatoria</h3>
            <Columnas
              columna="Concedido"
              puntos={conConcesiones.map((a) => ({
                etiqueta: String(a.anio),
                valor: a.concedido,
                detalle: `${a.anio}: ${euros.format(a.concedido)} en ${numero(a.convocatorias)} convocatorias`,
              }))}
            />
            <p className="ayuda">
              La BDNS solo publica las concesiones de los últimos cuatro años; el año en curso aún está incompleto.
            </p>
          </section>

          <section className="bloque">
            <h3>Convocatorias por año</h3>
            <Columnas
              columna="Convocatorias"
              formato={numero}
              puntos={m.porAnio
                .filter((a) => a.anio >= 2016)
                .map((a) => ({
                  etiqueta: String(a.anio),
                  valor: a.convocatorias,
                  detalle: `${a.anio}: ${numero(a.convocatorias)} convocatorias (${numero(a.concursos)} concursos)`,
                }))}
            />
            <p className="ayuda">La BDNS empezó a recoger convocatorias en 2016; las de 2014 y 2015 son muy pocas.</p>
          </section>

          <section className="bloque">
            <h3>Concedido por comunidad</h3>
            <Barras
              columna="Concedido"
              puntos={m.porComunidad
                .filter((c) => c.concedido > 0)
                .map((c) => ({
                  etiqueta: c.nombre,
                  valor: c.concedido,
                  detalle: `${c.nombre}: ${euros.format(c.concedido)} · ${numero(c.convocatorias)} convocatorias`,
                }))}
            />
            <p className="ayuda">Según dónde está el organismo que convoca. «Ámbito estatal»: ministerios y ayudas para toda España.</p>
          </section>

          <section className="bloque">
            <h3>Mapa por provincias</h3>
            <div className="selector" role="radiogroup" aria-label="Medida del mapa">
              {(['concedido', 'convocatorias'] as const).map((x) => (
                <label key={x} className="casilla">
                  <input type="radio" name="medida" checked={medida === x} onChange={() => setMedida(x)} />{' '}
                  {x === 'concedido' ? 'Concedido' : 'Convocatorias'}
                </label>
              ))}
            </div>
            <MapaProvincias
              formato={medida === 'concedido' ? eurosCompactos : numero}
              datos={m.porProvincia.map((p) => ({
                codigo: p.codigo,
                valor: p[medida],
                detalle: `${p.nombre}: ${euros.format(p.concedido)} concedidos · ${numero(p.convocatorias)} convocatorias`,
              }))}
            />
            <p className="ayuda">
              Solo ayuntamientos, diputaciones, cabildos y comarcas, situados en su provincia. Las ayudas de comunidades y
              ministerios están en «Concedido por comunidad».
            </p>
          </section>

          <section className="bloque">
            <h3>Qué financian</h3>
            <Barras
              columna="Concedido"
              puntos={m.porLinea.map((l) => ({
                etiqueta: l.linea === 'sin' ? 'Sin especificar' : NOMBRE_LINEA[l.linea],
                valor: l.concedido,
                detalle: `${euros.format(l.concedido)} · ${numero(l.convocatorias)} convocatorias`,
              }))}
            />
            <p className="ayuda">Una convocatoria puede financiar varias cosas y cuenta en cada una, así que no suman el total.</p>
          </section>
        </>
      )}
    </section>
  );
}
