import { useEffect, useState } from 'react';
import { type AjustesCrm, crm, type Espectaculo, type LineaCarta, NOMBRE_TIPO, type TextosIdioma, type TipoEspectaculo } from '../crm';
import { useCuenta } from '../sincronizar';

const VACIO: Omit<Espectaculo, 'id'> = {
  nombre: '',
  tipo: 'sinfonico_coral',
  formato: '',
  requisitos: '',
  precioMin: null,
  precioMax: null,
  disponibilidad: '',
  fechasCerradas: '',
  ambito: '',
  enlace: '',
  estadoInfo: 'pendiente',
  revisado: null,
};
const hoy = () => new Date().toLocaleDateString('sv-SE');
const euros = (n: number) => `${n.toLocaleString('es-ES')} €`;

/** Lo que le falta a una ficha para poder ofrecerla con datos cerrados. */
function pendientes(e: Espectaculo): string[] {
  const xs: string[] = [];
  if (e.estadoInfo !== 'vigente') xs.push('Marcar como vigente');
  if (!e.revisado || Date.parse(e.revisado) < Date.now() - 180 * 86_400_000) xs.push('Revisar los datos');
  if (e.precioMin == null && e.precioMax == null) xs.push('Precio orientativo');
  if (!e.requisitos.trim()) xs.push('Requisitos técnicos');
  if (!e.textoCarta?.trim()) xs.push('Texto para las cartas');
  return xs;
}

function FormEspectaculo({ inicial, id, alGuardar, alCancelar }: { inicial: Omit<Espectaculo, 'id'>; id?: string; alGuardar: () => void; alCancelar: () => void }) {
  const [e, setE] = useState(inicial);
  const [error, setError] = useState<string | null>(null);
  const campo = <K extends keyof typeof e>(k: K, v: (typeof e)[K]) => setE((x) => ({ ...x, [k]: v }));
  const numero = (v: string) => (v.trim() === '' ? null : Math.max(0, Number(v)));
  const guardar = async () => {
    try {
      await crm.guardarEspectaculo(e, id);
      alGuardar();
    } catch (err) {
      setError((err as Error).message);
    }
  };
  useEffect(() => {
    const tecla = (x: KeyboardEvent) => x.key === 'Escape' && alCancelar();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, []);
  return (
    <div className="cajon-fondo" onClick={(x) => x.target === x.currentTarget && alCancelar()}>
      <aside className="cajon" role="dialog" aria-modal="true" aria-label={id ? `Editar ${inicial.nombre}` : 'Nueva producción'}>
        <header className="cajon-cabecera">
          <div>
            <span className="ayuda">{id ? 'Editar producción' : 'Nueva producción'}</span>
            <h2>{e.nombre || 'Sin nombre'}</h2>
          </div>
          <button type="button" className="boton-icono" aria-label="Cerrar" onClick={alCancelar}>
            ×
          </button>
        </header>
        <div className="cajon-cuerpo formulario">
          <fieldset>
            <legend>Lo básico</legend>
            <label>
              Nombre de la producción
              <input value={e.nombre} onChange={(x) => campo('nombre', x.target.value)} autoFocus />
            </label>
            <label>
              Tipo de programación
              <select value={e.tipo} onChange={(x) => campo('tipo', x.target.value as TipoEspectaculo)}>
                {(Object.keys(NOMBRE_TIPO) as TipoEspectaculo[]).map((t) => (
                  <option key={t} value={t}>
                    {NOMBRE_TIPO[t].charAt(0).toUpperCase() + NOMBRE_TIPO[t].slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Enlace al dosier o a la página
              <input type="url" value={e.enlace} onChange={(x) => campo('enlace', x.target.value)} placeholder="https://arsvia.org/…" />
            </label>
          </fieldset>
          <fieldset>
            <legend>En las cartas</legend>
            <label>
              Cómo se presenta en los correos
              <textarea rows={5} value={e.textoCarta ?? ''} onChange={(x) => campo('textoCarta', x.target.value)} placeholder="Fidelio, de Beethoven. Producción operística…" />
            </label>
            <label>
              En catalán (opcional, para Cataluña)
              <textarea rows={4} value={e.textoCartaCa ?? ''} onChange={(x) => campo('textoCartaCa', x.target.value)} />
            </label>
          </fieldset>
          <fieldset>
            <legend>Condiciones</legend>
            <div className="fila-campos">
              <label>
                Precio desde (€)
                <input type="number" min={0} value={e.precioMin ?? ''} onChange={(x) => campo('precioMin', numero(x.target.value))} />
              </label>
              <label>
                hasta (€)
                <input type="number" min={0} value={e.precioMax ?? ''} onChange={(x) => campo('precioMax', numero(x.target.value))} />
              </label>
            </div>
            <label>
              Formato artístico y técnico
              <textarea rows={2} value={e.formato} onChange={(x) => campo('formato', x.target.value)} placeholder="Solistas, orquesta, coro, duración…" />
            </label>
            <label>
              Requisitos técnicos y logísticos
              <textarea rows={2} value={e.requisitos} onChange={(x) => campo('requisitos', x.target.value)} placeholder="Escenario mínimo, sonido, camerinos…" />
            </label>
            <label>
              Disponibilidad
              <input value={e.disponibilidad} onChange={(x) => campo('disponibilidad', x.target.value)} placeholder="Temporada 2026-2027, todo el año…" />
            </label>
            <label>
              Fechas cerradas
              <input value={e.fechasCerradas} onChange={(x) => campo('fechasCerradas', x.target.value)} />
            </label>
            <label>
              Ámbito territorial
              <input value={e.ambito} onChange={(x) => campo('ambito', x.target.value)} placeholder="Toda España" />
            </label>
          </fieldset>
          <fieldset>
            <legend>Vigencia</legend>
            <div className="segmentado" role="radiogroup" aria-label="Estado de la información">
              {(
                [
                  ['vigente', 'Vigente'],
                  ['pendiente', 'Pendiente de actualizar'],
                ] as [Espectaculo['estadoInfo'], string][]
              ).map(([v, t]) => (
                <button key={v} type="button" role="radio" aria-checked={e.estadoInfo === v} className={e.estadoInfo === v ? 'activa' : ''} onClick={() => campo('estadoInfo', v)}>
                  {t}
                </button>
              ))}
            </div>
            <label className="casilla">
              <input type="checkbox" checked={e.revisado === hoy()} onChange={(x) => campo('revisado', x.target.checked ? hoy() : inicial.revisado)} />
              He revisado hoy estos datos
            </label>
            <p className="ayuda">Lo pendiente o sin revisar en seis meses se propone igual, pero nunca con precio ni fechas cerrados.</p>
          </fieldset>
        </div>
        <footer className="cajon-pie">
          {error && <p className="error">{error}</p>}
          <button type="button" className="accion" onClick={alCancelar}>
            Cancelar
          </button>
          <button type="button" className="boton" onClick={() => void guardar()}>
            Guardar
          </button>
        </footer>
      </aside>
    </div>
  );
}

function useAjustes() {
  const [a, setA] = useState<AjustesCrm | null>(null);
  const [guardado, setGuardado] = useState<AjustesCrm | null>(null);
  const [envio, setEnvio] = useState({ conectado: false, cupoHoy: 0, buzon: false });
  const cargar = () => crm.ajustes().then((r) => (setA(r.ajustes), setGuardado(r.ajustes), setEnvio({ conectado: r.envioConectado, cupoHoy: r.cupoHoy, buzon: !!r.buzonConectado })));
  useEffect(() => {
    void cargar();
  }, []);
  const cambiado = !!a && JSON.stringify(a) !== JSON.stringify(guardado);
  const guardar = async () => {
    if (!a) return '';
    await crm.guardarAjustes(a);
    setGuardado(a);
    void cargar();
    const r = await crm.reescribirPropuestas();
    return `Guardado.${r.reescritas ? ` ${r.reescritas} propuestas pendientes vueltas a redactar con la plantilla nueva.` : ''}${r.aMano ? ` ${r.aMano} que habías retocado a mano se quedan como las dejaste.` : ''}`;
  };
  return { a, setA, cambiado, guardar, cargar, envio };
}

/** Barra fija al pie cuando hay cambios sin guardar. */
function BarraGuardar({ cambiado, guardar, texto = 'Guardar' }: { cambiado: boolean; guardar: () => Promise<string>; texto?: string }) {
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  if (!cambiado && !aviso) return null;
  return (
    <div className="barra-guardar" role="status">
      <span>{cambiado ? 'Tienes cambios sin guardar.' : aviso}</span>
      {cambiado && (
        <button
          type="button"
          className="boton"
          disabled={ocupado}
          onClick={() => {
            setOcupado(true);
            void guardar()
              .then(setAviso, (e: Error) => setAviso(e.message))
              .finally(() => setOcupado(false));
          }}
        >
          {ocupado ? 'Guardando…' : texto}
        </button>
      )}
    </div>
  );
}

function Remitente() {
  const { a, setA, cambiado, guardar, envio } = useAjustes();
  if (!a) return <p className="ayuda">Cargando…</p>;
  const campo = (k: 'remitente' | 'organizacion' | 'cargo' | 'email' | 'telefono' | 'web' | 'diasEntreEnvios', etiqueta: string, tipo = 'text') => (
    <label>
      {etiqueta}
      <input type={tipo} value={String(a[k] ?? '')} onChange={(e) => setA({ ...a, [k]: tipo === 'number' ? Number(e.target.value) : e.target.value })} />
    </label>
  );
  const firma = a.firma.trim() || [a.remitente, a.cargo, a.organizacion, a.telefono, a.email, a.web].filter((x) => x?.trim()).join('\n');
  return (
    <div className="dos-columnas-fijas">
      <section className="bloque formulario">
        <h3>Quién firma</h3>
        <div className="fila-campos">
          {campo('remitente', 'Tu nombre')}
          {campo('cargo', 'Cargo')}
        </div>
        {campo('organizacion', 'Organización')}
        <div className="fila-campos">
          {campo('email', 'Email')}
          {campo('telefono', 'Teléfono')}
        </div>
        {campo('web', 'Web')}
        <label>
          Firma completa (si la dejas vacía se monta con los datos de arriba)
          <textarea rows={6} value={a.firma} onChange={(e) => setA({ ...a, firma: e.target.value })} />
        </label>
        <h3>Pauta de seguimiento</h3>
        {campo('diasEntreEnvios', 'Días entre un correo y el siguiente (desde que envías el anterior)', 'number')}
        <p className="ayuda">Cinco correos como máximo; tras el 2.º y el 4.º, la app te recuerda llamar.</p>
        <h3>Envío automático</h3>
        {envio.conectado ? (
          <>
            <label className="casilla">
              <input type="checkbox" checked={!!a.envioAutomatico} onChange={(e) => setA({ ...a, envioAutomatico: e.target.checked })} />
              Enviar solos los correos aceptados y los seguimientos
            </label>
            <label>
              Máximo de correos al día (primeros y seguimientos juntos)
              <input type="number" min={5} max={300} value={a.limiteDiario ?? 30} onChange={(e) => setA({ ...a, limiteDiario: Number(e.target.value) })} />
            </label>
            <p className="ayuda">
              Salen desde {a.email || 'tu email'} de lunes a viernes, de 9 a 18 h, repartidos a lo largo del día. Para no caer en spam, el primer día salen como mucho 20 y el tope sube 10 cada
              semana hasta tu máximo{a.envioAutomatico && !cambiado ? ` (hoy: ${envio.cupoHoy})` : ''}. Recibes una copia oculta de cada correo y las respuestas te llegan a tu buzón.
              Cada correo lleva al final una línea para pedir no recibir más.
            </p>
          </>
        ) : (
          <p className="ayuda">Para que los correos salgan solos hay que conectar antes un servicio de envío (Brevo). Mientras tanto, se envían desde tu programa de correo.</p>
        )}
        <h3>Respuestas</h3>
        <p className="ayuda">
          {envio.buzon
            ? 'Tu buzón está conectado: cada hora se mira si ha respondido algún sitio en seguimiento. Si es así, se anota en su ficha y se paran sus seguimientos (y si pide la baja, queda en «no contactar»). Solo se lee: no se mueve ni se borra nada.'
            : 'Tu buzón no está conectado: cuando un sitio responda, anótalo en su ficha («Ha respondido») para que no le salgan más seguimientos.'}
        </p>
      </section>
      <section className="bloque vista-firma">
        <h3>Así se verá la firma</h3>
        <p className="texto-lineas">{firma || 'Aún sin datos.'}</p>
      </section>
      <BarraGuardar cambiado={cambiado} guardar={guardar} />
    </div>
  );
}

const NOMBRE_LINEA: Record<LineaCarta, string> = { lirica: 'Ópera y sinfónico-coral', camara: 'Música de cámara', popular: 'Jazz, rock y festivo', navidad: 'Navidad y Año Nuevo' };

/** Editor de los textos de las cartas en un idioma, ordenado como se lee el correo. Entre llaves, lo que se rellena solo. */
function EditorTextos({ t, cambiar }: { t: TextosIdioma; cambiar: (t: TextosIdioma) => void }) {
  const area = (etiqueta: string, valor: string, poner: (v: string) => void, filas = 3, pista?: string) => (
    <label>
      <span>
        {etiqueta} {pista && <code className="pista">{pista}</code>}
      </span>
      <textarea rows={filas} value={valor} onChange={(e) => poner(e.target.value)} />
    </label>
  );
  const linea = (l: LineaCarta, k: 'titulo' | 'intro' | 'texto', v: string) => cambiar({ ...t, lineas: { ...t.lineas, [l]: { ...t.lineas[l], [k]: v } } });
  return (
    <div className="editor-cartas">
      <section className="bloque formulario" id="bloque-inicio">
        <h3>
          <span className="numero-paso">1</span> Asunto y saludo
        </h3>
        {area('Asunto', t.asunto, (v) => cambiar({ ...t, asunto: v }), 1, '{propuestas} {lugar}')}
        <div className="fila-campos">
          {area('Saludo', t.saludo, (v) => cambiar({ ...t, saludo: v }), 1)}
          {area('Saludo con nombre', t.saludoPersona, (v) => cambiar({ ...t, saludoPersona: v }), 1, '{persona}')}
        </div>
      </section>
      <section className="bloque formulario" id="bloque-presentacion">
        <h3>
          <span className="numero-paso">2</span> Presentación
        </h3>
        {area('Cuando el correo junta varias líneas', t.introVarias, (v) => cambiar({ ...t, introVarias: v }), 3, '{lugar}')}
        {area('Lo que ha programado el sitio', t.historial, (v) => cambiar({ ...t, historial: v }), 3, '{lugar} {estilos}')}
      </section>
      <section className="bloque formulario" id="bloque-lineas">
        <h3>
          <span className="numero-paso">3</span> Una sección por línea
        </h3>
        <p className="ayuda">La línea principal del sitio va completa; las demás, solo con el título y la lista de producciones.</p>
        {(Object.keys(NOMBRE_LINEA) as LineaCarta[]).map((l) => (
          <details key={l} className="linea-carta">
            <summary>
              <strong>{NOMBRE_LINEA[l]}</strong> <span className="ayuda">{t.lineas[l].titulo}</span>
            </summary>
            {area('Título de la sección', t.lineas[l].titulo, (v) => linea(l, 'titulo', v), 1)}
            {area('Presentación si es la línea principal', t.lineas[l].intro, (v) => linea(l, 'intro', v))}
            {area('Texto de la sección', t.lineas[l].texto, (v) => linea(l, 'texto', v), 6)}
          </details>
        ))}
      </section>
      <section className="bloque formulario" id="bloque-oportunidades">
        <h3>
          <span className="numero-paso">4</span> Oportunidades del sitio
        </h3>
        {area('Si tiene una licitación abierta', t.licitacion, (v) => cambiar({ ...t, licitacion: v }), 3, '{titulo} {fecha}')}
        {area('Si hay ayudas que podrían financiarlo', t.ayudas, (v) => cambiar({ ...t, ayudas: v }), 3, '{convocatorias}')}
        {area('Si externaliza la gestión de festivales', t.gestion, (v) => cambiar({ ...t, gestion: v }))}
      </section>
      <section className="bloque formulario" id="bloque-cierre">
        <h3>
          <span className="numero-paso">5</span> Cierre
        </h3>
        {area('Propuesta de colaboración', t.colaboracion, (v) => cambiar({ ...t, colaboracion: v }), 5)}
        {area('Despedida', t.despedida, (v) => cambiar({ ...t, despedida: v }))}
      </section>
      <section className="bloque formulario" id="bloque-seguimientos">
        <h3>
          <span className="numero-paso">6</span> Correos de seguimiento
        </h3>
        {t.seguimientos.map((x, i) => (
          <span key={i}>{area(`${i + 2}.º correo`, x, (v) => cambiar({ ...t, seguimientos: t.seguimientos.map((y, j) => (j === i ? v : y)) as TextosIdioma['seguimientos'] }), 3, '{lugar}')}</span>
        ))}
      </section>
    </div>
  );
}

function Plantillas({ alCambiarCatalogo }: { alCambiarCatalogo: () => void }) {
  const { a, setA, cambiado, guardar, cargar } = useAjustes();
  const [idioma, setIdioma] = useState<'es' | 'ca'>('es');
  const [aviso, setAviso] = useState<string | null>(null);
  if (!a) return <p className="ayuda">Cargando…</p>;
  const arsvia = async () => {
    if (!window.confirm('Se cargarán las cartas modelo de ArsVia (plantillas y firma) y los textos de cada producción en las fichas que aún no tengan. ¿Seguir?')) return;
    const r = await crm.cargarPlantillasArsvia();
    await cargar();
    alCambiarCatalogo();
    setAviso(`Plantillas de ArsVia cargadas. ${r.textos} fichas con texto nuevo; ${r.reescritas} propuestas vueltas a redactar.`);
  };
  return (
    <div className="plantillas">
      <div className="barra-herramientas">
        <div className="segmentado segmentado-corto" role="tablist" aria-label="Idioma">
          {(
            [
              ['es', 'Castellano'],
              ['ca', 'Catalán'],
            ] as ['es' | 'ca', string][]
          ).map(([v, n]) => (
            <button key={v} type="button" role="tab" aria-selected={idioma === v} className={idioma === v ? 'activa' : ''} onClick={() => setIdioma(v)}>
              {n}
            </button>
          ))}
        </div>
        <span className="ayuda">Cada correo se monta con estos bloques, en este orden. Entre llaves, lo que se rellena solo. El catalán se usa para las entidades de Cataluña.</span>
        <button type="button" className="accion" onClick={() => void arsvia()}>
          Cargar las cartas modelo de ArsVia
        </button>
      </div>
      {aviso && <p className="llamada">{aviso}</p>}
      <EditorTextos key={idioma} t={a.plantillas[idioma]} cambiar={(t) => setA({ ...a, plantillas: { ...a.plantillas, [idioma]: t } })} />
      <BarraGuardar cambiado={cambiado} guardar={guardar} texto="Guardar y volver a redactar las propuestas" />
    </div>
  );
}

type Pestana = 'producciones' | 'cartas' | 'firma';
type FiltroCatalogo = 'todas' | 'completas' | 'incompletas' | 'fuera';

/** Tarjeta de una producción: qué es, cómo se presenta y qué le falta. */
function TarjetaProduccion({ e, editar, borrar }: { e: Espectaculo; editar: () => void; borrar: () => void }) {
  const falta = pendientes(e);
  const total = 5;
  return (
    <article className="produccion">
      <header>
        <span className="etiquetas">
          <span className="etiqueta etiqueta-acento">{NOMBRE_TIPO[e.tipo].charAt(0).toUpperCase() + NOMBRE_TIPO[e.tipo].slice(1)}</span>
          {e.enWeb === false && <span className="etiqueta etiqueta-aviso">Ya no está en la web</span>}
        </span>
        <h3>
          <button type="button" className="enlace-titulo" onClick={editar}>
            {e.nombre}
          </button>
        </h3>
      </header>
      <p className="produccion-texto">{e.textoCarta || e.formato || <span className="ayuda">Sin texto para las cartas.</span>}</p>
      <dl className="produccion-datos">
        <div>
          <dt>Precio</dt>
          <dd>{e.precioMin != null || e.precioMax != null ? [e.precioMin, e.precioMax].filter((x) => x != null).map((x) => euros(x!)).join(' – ') : '—'}</dd>
        </div>
        <div>
          <dt>Revisada</dt>
          <dd>{e.revisado ? new Date(`${e.revisado}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</dd>
        </div>
      </dl>
      <div className="completitud" title={falta.length ? `Falta: ${falta.join(', ')}` : 'Ficha completa'}>
        <span className="completitud-barra">
          <span style={{ width: `${((total - falta.length) / total) * 100}%` }} className={falta.length ? '' : 'completa'} />
        </span>
        <span className={falta.length ? 'tono-ambar' : 'tono-verde'}>{falta.length ? `Falta: ${falta.slice(0, 2).join(', ').toLowerCase()}${falta.length > 2 ? '…' : ''}` : 'Lista para ofrecer'}</span>
      </div>
      <footer>
        <button type="button" className="accion" onClick={editar}>
          Editar
        </button>
        {e.enlace && (
          <a className="accion" href={e.enlace} target="_blank" rel="noreferrer">
            {/\.pdf($|\?)/i.test(e.enlace) ? 'Dosier' : 'Web'} ↗
          </a>
        )}
        <button type="button" className="boton-icono" aria-label={`Borrar ${e.nombre}`} title="Borrar" onClick={borrar}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
          </svg>
        </button>
      </footer>
    </article>
  );
}

/** Catálogo y cartas: las producciones que se ofrecen, cómo se escriben los correos y quién los firma. */
export function Catalogo({ modo = 'producciones' }: { modo?: 'producciones' | 'cartas' }) {
  const usuario = useCuenta().cuenta?.usuario;
  const [items, setItems] = useState<Espectaculo[] | null>(null);
  const [editando, setEditando] = useState<string | 'nuevo' | null>(null);
  const [pestana, setPestana] = useState<Pestana>(modo === 'cartas' ? 'cartas' : 'producciones');
  const [filtro, setFiltro] = useState<FiltroCatalogo>('todas');
  const [tipo, setTipo] = useState<TipoEspectaculo | ''>('');
  const cargar = () => crm.catalogo().then((r) => setItems(r.items));
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const importar = async () => {
    setImportando(true);
    setResultado(null);
    try {
      const r = await crm.importarCatalogo();
      setResultado(`${r.nuevos} nuevas, ${r.actualizados} actualizadas, ${r.retirados} que ya no están en la web, ${r.sinCambios} sin cambios. La web no publica precios: revisa cada ficha y márcala como vigente.`);
      await cargar();
    } catch (e) {
      setResultado((e as Error).message);
    } finally {
      setImportando(false);
    }
  };
  useEffect(() => {
    if (usuario) void cargar();
  }, [usuario?.email]);
  if (!usuario) return <p className="llamada">El catálogo es de tu cuenta: <a href="#/cuenta">entra o crea una cuenta</a>.</p>;
  if (!items) return <p className="ayuda">Cargando…</p>;
  const terminado = () => {
    setEditando(null);
    void cargar();
  };
  const completas = items.filter((e) => pendientes(e).length === 0).length;
  const fuera = items.filter((e) => e.enWeb === false).length;
  const tipos = [...new Set(items.map((e) => e.tipo))];
  const visibles = items.filter(
    (e) =>
      (!tipo || e.tipo === tipo) &&
      (filtro === 'completas' ? pendientes(e).length === 0 : filtro === 'incompletas' ? pendientes(e).length > 0 : filtro === 'fuera' ? e.enWeb === false : true),
  );
  const enEdicion = editando && editando !== 'nuevo' ? items.find((e) => e.id === editando) : null;

  return (
    <section className="catalogo">
      {modo === 'cartas' && (
        <div className="pestanas-pagina" role="tablist" aria-label="Cartas y firma">
          {(
            [
              ['cartas', 'Plantillas de las cartas'],
              ['firma', 'Remitente y firma'],
            ] as [Pestana, string][]
          ).map(([v, n]) => (
            <button key={v} type="button" role="tab" aria-selected={pestana === v} className={pestana === v ? 'activa' : ''} onClick={() => setPestana(v)}>
              {n}
            </button>
          ))}
        </div>
      )}

      {pestana === 'cartas' && <Plantillas alCambiarCatalogo={() => void cargar()} />}
      {pestana === 'firma' && <Remitente />}
      {pestana === 'producciones' && (
        <>
          <div className="resumen-catalogo">
            {(
              [
                ['todas', 'Todas', items.length, ''],
                ['completas', 'Listas para ofrecer', completas, 'tono-verde'],
                ['incompletas', 'Con datos por completar', items.length - completas, 'tono-ambar'],
                ...(fuera ? [['fuera', 'Ya no están en la web', fuera, 'tono-ambar'] as const] : []),
              ] as [FiltroCatalogo, string, number, string][]
            ).map(([v, n, c, tono]) => (
              <button key={v} type="button" className={`kpi kpi-filtro${filtro === v ? ' activa' : ''}`} aria-pressed={filtro === v} onClick={() => setFiltro(v)}>
                <span className="kpi-titulo">{n}</span>
                <strong className={tono}>{c}</strong>
              </button>
            ))}
          </div>
          <div className="barra-herramientas">
            <select value={tipo} onChange={(x) => setTipo(x.target.value as TipoEspectaculo | '')} aria-label="Tipo">
              <option value="">Todos los tipos</option>
              {tipos.map((t) => (
                <option key={t} value={t}>
                  {NOMBRE_TIPO[t].charAt(0).toUpperCase() + NOMBRE_TIPO[t].slice(1)}
                </option>
              ))}
            </select>
            <span className="ayuda">Con estas fichas se eligen las producciones para cada sitio y se escriben los correos.</span>
            <button type="button" className="accion" disabled={importando} onClick={() => void importar()}>
              {importando ? 'Importando…' : 'Actualizar desde arsvia.org'}
            </button>
            <button type="button" className="boton" onClick={() => setEditando('nuevo')}>
              + Nueva producción
            </button>
          </div>
          {resultado && <p className="llamada">{resultado}</p>}
          {items.length === 0 ? (
            <div className="bloque vacio">
              <h2>Tu catálogo está vacío</h2>
              <p className="ayuda">Añade tus producciones o impórtalas de tu web para que la app pueda proponerlas.</p>
            </div>
          ) : (
            <div className="rejilla-producciones">
              {visibles.map((e) => (
                <TarjetaProduccion key={e.id} e={e} editar={() => setEditando(e.id)} borrar={() => window.confirm(`¿Borrar «${e.nombre}» del catálogo?`) && void crm.borrarEspectaculo(e.id).then(cargar)} />
              ))}
            </div>
          )}
        </>
      )}
      {editando === 'nuevo' && <FormEspectaculo inicial={VACIO} alGuardar={terminado} alCancelar={() => setEditando(null)} />}
      {enEdicion && <FormEspectaculo key={enEdicion.id} inicial={enEdicion} id={enEdicion.id} alGuardar={terminado} alCancelar={() => setEditando(null)} />}
    </section>
  );
}
