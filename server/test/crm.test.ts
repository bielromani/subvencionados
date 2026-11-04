// Reglas de las secuencias contra un Postgres de verdad (solo con TEST_DATABASE_URL).
import { afterAll, describe, expect, it } from 'vitest';
import { AlmacenCuentas } from '../src/cuentas.js';
import { AlmacenCrm, ErrorCrm } from '../src/crm/almacen.js';
import { generarCarta } from '../src/crm/plantillas.js';
import { AJUSTES_POR_DEFECTO } from '../src/crm/tipos.js';

describe('plantillas', () => {
  const base = {
    entidad: { nombre: 'Ayuntamiento de Olot', persona: null, municipio: 'Olot', idioma: 'es' as const, tipo: 'ayuntamiento' as const },
    oportunidad: { tipo: 'subvencion' as const, titulo: 'Ayudas a la programación musical 2026', certeza: 'potencial' as const },
    espectaculos: [{ nombre: 'Réquiem de Brahms', tipo: 'sinfonico_coral' as const, enlace: 'https://arsvia.org/x', estadoInfo: 'pendiente' as const }],
    ajustes: { ...AJUSTES_POR_DEFECTO, remitente: 'Joan', organizacion: 'ArsVia' },
  };
  it('la ayuda va como apoyo opcional y no se da por concedida', () => {
    const c = generarCarta({ ...base, paso: 1, ayuda: { titulo: 'Ayudas a la programación musical 2026', enlace: null } });
    expect(c.cuerpo).toContain('quizá podría facilitar');
    expect(c.cuerpo).not.toMatch(/concedid|garantiz/i);
    expect(c.cuerpo).toContain('Réquiem de Brahms');
  });
  it('en catalán para entidades de Cataluña; los seguimientos responden a la primera carta', () => {
    const primera = generarCarta({ ...base, entidad: { ...base.entidad, idioma: 'ca' }, paso: 1 });
    expect(primera.asunto).toMatch(/^Propostes de/);
    const c = generarCarta({ ...base, entidad: { ...base.entidad, idioma: 'ca' }, paso: 2, asuntoInicial: primera.asunto });
    expect(c.asunto).toBe(`Re: ${primera.asunto}`);
    expect(c.cuerpo).toContain('Atentament,');
  });

  it('cartas modelo de ArsVia: presentación de la línea, texto de cada producción y firma', async () => {
    const { PLANTILLAS_ARSVIA, FIRMA_ARSVIA, TEXTOS_PRODUCCIONES_ARSVIA } = await import('../src/crm/cartas.js');
    const requiem = TEXTOS_PRODUCCIONES_ARSVIA.find((t) => t.patron.test('Réquiem alemán – Brahms'))!;
    expect(TEXTOS_PRODUCCIONES_ARSVIA.find((t) => t.patron.test('La flauta mágica – Mozart'))).toBeDefined();
    const c = generarCarta({
      ...base,
      paso: 1,
      espectaculos: [{ ...base.espectaculos[0]!, textoCarta: requiem.es }],
      ajustes: { ...base.ajustes, plantillas: PLANTILLAS_ARSVIA, firma: FIRMA_ARSVIA },
    });
    expect(c.cuerpo).toContain('Òpera Popular de Barcelona, Orquestra Simfònica Segle XXI, Jeloudoli S.L. y ArsVia');
    expect(c.cuerpo).toContain('Avance de programación · 2027-2029');
    expect(c.cuerpo).toContain('Jordi Mora, discípulo directo de Sergiu Celibidache');
    expect(c.cuerpo).toContain('me gustaría proponerle una breve entrevista');
    expect(c.cuerpo).toMatch(/Coordinación de proyectos y giras/);
  });
});

const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url)('secuencias con Postgres', () => {
  const cuentas = url ? AlmacenCuentas.desdeUrl(url) : null!;
  const crm = url ? new AlmacenCrm(cuentas) : null!;
  afterAll(() => cuentas?.cerrar());
  let u = '';
  const entidadBase = { ref: null, nombre: 'Ayuntamiento de Olot', tipo: 'ayuntamiento' as const, municipio: 'Olot', provincia: 'Girona', ccaa: 'Cataluña', persona: null, email: 'cultura@olot.example', telefono: null, idioma: 'ca' as const, notas: '' };

  it('cinco envíos efectivos con llamadas tras el 2.º y el 4.º, y archivo sin respuesta', async () => {
    u = (await cuentas.crear(`crm-${Date.now()}@example.com`, 'una clave larga'))!.id;
    const e = await crm.guardarEntidad(u, entidadBase);
    const o = await crm.crearOportunidad(u, { entidad: e.id, tipo: 'propuesta', ref: null, titulo: 'Temporada 2027', espectaculos: [], certeza: 'potencial', enlaceConfirmacion: null, notas: '' });
    const { secuencia, mensaje } = await crm.abrirSecuencia(u, o.id, 'cultura@olot.example');
    expect(mensaje.paso).toBe(1);
    // La misma oportunidad y destinatario no puede tener dos secuencias activas.
    await expect(crm.abrirSecuencia(u, o.id, 'CULTURA@olot.example')).rejects.toBeInstanceOf(ErrorCrm);
    // Sin visto bueno no cuenta como enviado.
    await expect(crm.registrarEnvio(u, mensaje.id)).rejects.toThrow(/visto bueno/);
    let fecha = new Date('2026-11-03T09:00:00Z');
    let actual = mensaje;
    for (let paso = 1; paso <= 5; paso++) {
      await crm.aprobar(u, actual.id);
      await crm.registrarEnvio(u, actual.id, fecha);
      const ms = await crm.mensajes(u, secuencia.id);
      if (paso < 5) {
        const siguiente = ms.find((m) => m.paso === paso + 1)!;
        // El siguiente aparece ~10 días después del envío efectivo, no antes.
        expect(siguiente.disponibleDesde).toBe(new Date(fecha.getTime() + 10 * 86_400_000).toISOString().slice(0, 10));
        expect((await crm.bandeja(u, fecha)).some((m) => m.id === siguiente.id)).toBe(false);
        actual = siguiente;
        fecha = new Date(fecha.getTime() + 10 * 86_400_000);
      }
    }
    const alertas = (await crm.historial(u, e.id)).filter((h) => h.tipo === 'alerta_llamada');
    expect(alertas.map((a) => a.texto).sort()).toEqual(['Llamar a Ayuntamiento de Olot – 1.ª llamada de seguimiento', 'Llamar a Ayuntamiento de Olot – 2.ª llamada de seguimiento']);
    const [s] = await crm.secuencias(u, { entidad: e.id });
    expect(s!.estado).toBe('sin_respuesta');
    expect((await crm.entidad(u, e.id)).estadoRelacion).toBe('sin_respuesta');
    expect(await crm.bandeja(u, new Date('2027-06-01'))).toHaveLength(0);
  });

  it('una respuesta detiene la secuencia y cancela lo programado; el opt-out se respeta', async () => {
    const e = await crm.guardarEntidad(u, { ...entidadBase, nombre: 'Teatre de Prova', email: 'teatre@prova.example' });
    const o1 = await crm.crearOportunidad(u, { entidad: e.id, tipo: 'propuesta', ref: null, titulo: 'Nadal', espectaculos: [], certeza: 'potencial', enlaceConfirmacion: null, notas: '' });
    const { secuencia, mensaje } = await crm.abrirSecuencia(u, o1.id, 'teatre@prova.example');
    await crm.aprobar(u, mensaje.id, '2026-11-10T08:00:00Z');
    await crm.cancelar(u, mensaje.id);
    expect((await crm.mensajes(u, secuencia.id))[0]!.estado).toBe('borrador');
    await crm.aprobar(u, mensaje.id, '2026-11-10T08:00:00Z');
    // Otra oportunidad para la misma entidad: hay que decidir.
    const o2 = await crm.crearOportunidad(u, { entidad: e.id, tipo: 'propuesta', ref: null, titulo: 'Ópera', espectaculos: [], certeza: 'potencial', enlaceConfirmacion: null, notas: '' });
    await expect(crm.abrirSecuencia(u, o2.id, 'teatre@prova.example')).rejects.toThrow(/decide/);
    await crm.anotar(u, e.id, { tipo: 'respuesta', texto: 'Nos llamó la técnica de cultura' });
    expect((await crm.secuencias(u, { entidad: e.id }))[0]!.estado).toBe('respondida');
    expect((await crm.mensajes(u, secuencia.id))[0]!.estado).toBe('cancelado');
    await crm.anotar(u, e.id, { tipo: 'optout', texto: 'No quieren más correos' });
    await expect(crm.abrirSecuencia(u, o2.id, 'teatre@prova.example')).rejects.toThrow(/no recibir/);
    // «Confirmada» exige el enlace oficial.
    await expect(crm.actualizarOportunidad(u, o2.id, { certeza: 'confirmada' })).rejects.toThrow(/resolución/);
  });

  it('estadísticas: contactadas, respuestas, en qué correo contestan y por línea y comunidad', async () => {
    const v = (await cuentas.crear(`stats-${Date.now()}@example.com`, 'una clave larga'))!.id;
    const jazz = await crm.guardarEspectaculo(v, { nombre: 'Trío de jazz', tipo: 'jazz', formato: '', requisitos: '', precioMin: null, precioMax: null, disponibilidad: '', fechasCerradas: '', ambito: '', enlace: '', estadoInfo: 'pendiente', revisado: null });
    const enviar = async (nombre: string, pasos: number) => {
      const e = await crm.guardarEntidad(v, { ...entidadBase, nombre, email: `${nombre.length}@x.example` });
      const o = await crm.crearOportunidad(v, { entidad: e.id, tipo: 'propuesta', ref: null, titulo: 'Jazz', espectaculos: [jazz], certeza: 'potencial', enlaceConfirmacion: null, notas: '' });
      const { secuencia, mensaje } = await crm.abrirSecuencia(v, o.id, `${nombre.length}@x.example`);
      let m = mensaje;
      for (let paso = 1; paso <= pasos; paso++) {
        await crm.aprobar(v, m.id);
        await crm.registrarEnvio(v, m.id, new Date(Date.now() - (pasos - paso + 1) * 86_400_000));
        m = (await crm.mensajes(v, secuencia.id)).find((x) => x.paso === paso + 1) ?? m;
      }
      return e;
    };
    const a = await enviar('Ayuntamiento A', 2);
    await enviar('Ayuntamiento BB', 1);
    await crm.anotar(v, a.id, { tipo: 'respuesta', texto: 'Les interesa' });
    const st = await crm.estadisticas(v);
    expect(st.entidades.contactadas).toBe(2);
    expect(st.entidades.respuesta).toBe(1);
    expect(st.actividad.correos).toBe(3);
    expect(st.porPaso.find((x) => x.paso === 2)!.respuestas).toBe(1);
    expect(st.porTipo).toEqual([{ tipo: 'jazz', contactadas: 2, respuesta: 1 }]);
    expect(st.porCcaa).toEqual([{ ccaa: 'Cataluña', contactadas: 2, respuesta: 1 }]);
    expect(st.diasHastaRespuesta).not.toBeNull();
    expect(st.semanas).toHaveLength(12);
  });
});

describe.skipIf(!url)('API del CRM', async () => {
  const { default: request } = await import('supertest');
  const { crearApp } = await import('../src/app.js');
  const { Repositorio } = await import('../src/db.js');
  const cuentas = url ? AlmacenCuentas.desdeUrl(url) : null!;
  const app = crearApp(new Repositorio(':memory:'), { cuentas, crm: url ? new AlmacenCrm(cuentas) : null });
  afterAll(() => cuentas?.cerrar());

  it('catálogo, entidad, oportunidad, secuencia, bandeja y envío efectivo', async () => {
    expect((await request(app).get('/api/crm/panel')).status).toBe(401);
    const r = await request(app).post('/api/cuenta/registro').send({ email: `api-crm-${Date.now()}@example.com`, clave: 'una clave larga' }).expect(201);
    const cookie = r.headers['set-cookie']![0]!.split(';')[0]!;
    const pedir = (m: 'get' | 'post' | 'put', ruta: string, cuerpo?: object) => request(app)[m](`/api/crm${ruta}`).set('Cookie', cookie).send(cuerpo);
    const { id: esp } = (await pedir('post', '/catalogo', { nombre: 'Réquiem de Brahms', tipo: 'sinfonico_coral', estadoInfo: 'pendiente' }).expect(200)).body;
    expect((await pedir('get', '/catalogo')).body.items[0]).toMatchObject({ nombre: 'Réquiem de Brahms', estadoInfo: 'pendiente' });
    const e = (await pedir('post', '/entidades', { nombre: 'Auditori de Prova', tipo: 'auditorio', ccaa: 'Cataluña', email: 'prog@auditori.example' }).expect(200)).body;
    expect(e.idioma).toBe('ca');
    const o = (await pedir('post', '/oportunidades', { entidad: e.id, tipo: 'propuesta', titulo: 'Temporada', espectaculos: [esp] }).expect(200)).body;
    const s = (await pedir('post', '/secuencias', { oportunidad: o.id, destinatario: 'prog@auditori.example' }).expect(200)).body;
    expect(s.mensaje.cuerpo).toContain('Réquiem de Brahms');
    const bandeja = (await pedir('get', '/bandeja')).body;
    expect(bandeja.items).toHaveLength(1);
    // Sin correo conectado no se puede programar.
    expect((await pedir('post', `/mensajes/${s.mensaje.id}/aprobar`, { programarPara: '2030-01-01T09:00:00Z' })).status).toBe(409);
    await pedir('put', `/mensajes/${s.mensaje.id}`, { asunto: 'Asunto editado', cuerpo: 'Texto editado' }).expect(200);
    await pedir('post', `/mensajes/${s.mensaje.id}/aprobar`, {}).expect(200);
    await pedir('post', `/mensajes/${s.mensaje.id}/enviado`, {}).expect(200);
    const ficha = (await pedir('get', `/entidades/${e.id}`)).body;
    expect(ficha.historial.map((h: { tipo: string }) => h.tipo)).toContain('carta_enviada');
    expect(ficha.secuencias[0].mensajes.map((m: { paso: number; estado: string }) => [m.paso, m.estado])).toEqual([
      [1, 'enviado'],
      [2, 'borrador'],
    ]);
    expect(ficha.encaje.amplio).toBe(true);
    await pedir('post', `/entidades/${e.id}/anotar`, { tipo: 'recontactar', vence: '2026-01-01', texto: 'Después de Reyes' }).expect(200);
    expect((await pedir('get', '/panel')).body.llamar[0].texto).toBe('Después de Reyes');
  });
});

describe.skipIf(!url)('avisos sobre oportunidades abiertas', async () => {
  const { alertasCrm } = await import('../src/rutasCrm.js');
  const { desdeBdns } = await import('../src/bdns/normalizar.js');
  const { detalle, registro } = await import('./ayudas.js');
  const cuentas = url ? AlmacenCuentas.desdeUrl(url) : null!;
  const crm = url ? new AlmacenCrm(cuentas) : null!;
  afterAll(() => cuentas?.cerrar());

  it('convocatoria nueva en su territorio: aviso hasta que se usa o se descarta', async () => {
    const u = (await cuentas.crear(`alertas-${Date.now()}@example.com`, 'una clave larga'))!.id;
    const e = await crm.guardarEntidad(u, { ref: null, nombre: 'Ayuntamiento de Olot', tipo: 'ayuntamiento', municipio: 'Olot', provincia: 'Girona', ccaa: 'Cataluña', persona: null, email: null, telefono: null, idioma: 'ca', notas: '' });
    const hoy = new Date('2026-11-03T10:00:00Z');
    const conv = { ...desdeBdns(registro(detalle('77', { descripcion: 'Ayudas a festivales de música para ayuntamientos', fechaRecepcion: '2026-10-20' }))), provincias: ['Girona'] };
    const ctx = { ayudasPara: () => [conv], licitacionesDe: () => [], programador: () => undefined } as unknown as Parameters<typeof alertasCrm>[1];
    // Sin oportunidad abierta no hay aviso.
    expect(await alertasCrm(crm, ctx, u, hoy)).toHaveLength(0);
    await crm.crearOportunidad(u, { entidad: e.id, tipo: 'propuesta', ref: null, titulo: 'Temporada 2027', espectaculos: [], certeza: 'potencial', enlaceConfirmacion: null, notas: '' });
    const [a] = await alertasCrm(crm, ctx, u, hoy);
    expect(a).toMatchObject({ tipo: 'convocatoria', ref: conv.id, entidad: { nombre: 'Ayuntamiento de Olot' } });
    await crm.descartarAlerta(u, e.id, conv.id);
    expect(await alertasCrm(crm, ctx, u, hoy)).toHaveLength(0);
  });
});
