// Cuentas contra un Postgres de verdad: se ejecuta solo si hay TEST_DATABASE_URL (en local, un Postgres de prueba).
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { crearApp } from '../src/app.js';
import { AlmacenCuentas, cifrarClave, comprobarClave } from '../src/cuentas.js';
import type { Email } from '../src/email.js';
import { Repositorio } from '../src/db.js';
import { validarLista } from '../src/rutasCuenta.js';

describe('contraseñas y listas', () => {
  it('cifra con sal y comprueba', async () => {
    const a = await cifrarClave('una clave larga');
    expect(a).not.toBe(await cifrarClave('una clave larga'));
    expect(await comprobarClave('una clave larga', a)).toBe(true);
    expect(await comprobarClave('otra', a)).toBe(false);
  });

  it('valida y recorta la lista que manda el navegador', () => {
    expect(validarLista({})).toBeNull();
    const l = validarLista({ marcas: { guardadas: ['bdns-1', 7], ocultas: [], clientes: { 'p-1': { nombre: 'Lugo', estado: 'contactado', nota: 'x', actualizado: '2026-11-01', proxima: 'mañana' } } }, perfil: null })!;
    expect(l.marcas.guardadas).toEqual(['bdns-1']);
    expect(l.marcas.clientes['p-1']!.proxima).toBeNull();
  });
});

const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url)('cuentas con Postgres', () => {
  const almacen = url ? AlmacenCuentas.desdeUrl(url) : null!;
  const enviados: Email[] = [];
  const app = crearApp(new Repositorio(':memory:'), { cuentas: almacen, enviar: async (e) => (enviados.push(e), true) });
  const email = `prueba-${Date.now()}@example.com`;
  const lista = { marcas: { guardadas: ['bdns-1'], ocultas: ['bdns-2'], clientes: { 'p-x': { nombre: 'Ayuntamiento de Lugo', estado: 'contactado', nota: 'llamar', actualizado: '2026-11-01', proxima: '2026-11-01' } } }, perfil: null };
  afterAll(() => almacen?.cerrar());

  it('registro, sesión con cookie y lista sincronizada', async () => {
    expect((await request(app).get('/api/cuenta')).body).toMatchObject({ activo: true, emails: true, usuario: null });
    expect((await request(app).post('/api/cuenta/registro').send({ email, clave: 'corta' })).status).toBe(400);
    const r = await request(app).post('/api/cuenta/registro').send({ email: email.toUpperCase(), clave: 'una clave larga' }).expect(201);
    const cookie = r.headers['set-cookie']![0]!.split(';')[0]!;
    expect(r.headers['set-cookie']![0]).toContain('HttpOnly');
    expect((await request(app).post('/api/cuenta/registro').send({ email, clave: 'otra clave larga' })).status).toBe(409);
    expect((await request(app).get('/api/cuenta').set('Cookie', cookie)).body.usuario).toMatchObject({ email, avisos: 'semanal' });
    expect((await request(app).get('/api/cuenta/lista')).status).toBe(401);
    expect((await request(app).get('/api/cuenta/lista').set('Cookie', cookie)).body.datos).toBeNull();
    await request(app).put('/api/cuenta/lista').set('Cookie', cookie).send(lista).expect(200);
    expect((await request(app).get('/api/cuenta/lista').set('Cookie', cookie)).body.datos.marcas.guardadas).toEqual(['bdns-1']);
    await request(app).post('/api/cuenta/salir').set('Cookie', cookie).expect(200);
    expect((await request(app).get('/api/cuenta/lista').set('Cookie', cookie)).status).toBe(401);
  });

  it('entrar, calendario por token y aviso por email', async () => {
    expect((await request(app).post('/api/cuenta/entrar').send({ email, clave: 'mal' })).status).toBe(401);
    const r = await request(app).post('/api/cuenta/entrar').send({ email, clave: 'una clave larga' }).expect(200);
    const cookie = r.headers['set-cookie']![0]!.split(';')[0]!;
    const token = r.body.usuario.tokenCalendario;
    expect((await request(app).get(`/api/mi-calendario.ics?token=${token}`)).headers['content-type']).toContain('text/calendar');
    expect((await request(app).get('/api/mi-calendario.ics?token=otro')).status).toBe(404);
    await request(app).put('/api/cuenta/ajustes').set('Cookie', cookie).send({ avisos: 'diario' }).expect(200);
    // El cliente tiene una llamada para hoy o atrasada: hay aviso; repetir la llamada no manda otro.
    const antes = enviados.length;
    await request(app).get('/api/avisos').expect(200);
    const mio = enviados.slice(antes).filter((e) => e.para === email);
    expect(mio).toHaveLength(1);
    expect(mio[0]!.asunto).toContain('cliente para contactar');
    await request(app).get('/api/avisos').expect(200);
    expect(enviados.filter((e) => e.para === email)).toHaveLength(1);
  });

  it('restablecer la contraseña por email y borrar la cuenta', async () => {
    await request(app).post('/api/cuenta/olvido').send({ email }).expect(200);
    const enlace = enviados.at(-1)!.texto.match(/restablecer=([\w-]+)/)![1]!;
    expect((await request(app).post('/api/cuenta/restablecer').send({ token: 'falso', clave: 'nueva clave larga' })).status).toBe(400);
    const r = await request(app).post('/api/cuenta/restablecer').send({ token: enlace, clave: 'nueva clave larga' }).expect(200);
    expect((await request(app).post('/api/cuenta/restablecer').send({ token: enlace, clave: 'nueva clave larga' })).status).toBe(400);
    const cookie = r.headers['set-cookie']![0]!.split(';')[0]!;
    expect((await request(app).delete('/api/cuenta').set('Cookie', cookie).send({ clave: 'una clave larga' })).status).toBe(401);
    await request(app).delete('/api/cuenta').set('Cookie', cookie).send({ clave: 'nueva clave larga' }).expect(200);
    expect((await request(app).post('/api/cuenta/entrar').send({ email, clave: 'nueva clave larga' })).status).toBe(401);
  });
});
