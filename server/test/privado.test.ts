import { afterAll, describe, expect, it } from 'vitest';
import { emailsPermitidos, puedeEntrar, puedeRegistrarse } from '../src/acceso.js';

describe('lista de acceso', () => {
  it('sin lista nadie se registra y las cuentas existentes entran; con lista, solo quien está', () => {
    expect(emailsPermitidos({})).toBeNull();
    expect(puedeRegistrarse('a@x.es', null)).toBe(false);
    expect(puedeEntrar('a@x.es', null)).toBe(true);
    const l = emailsPermitidos({ EMAILS_PERMITIDOS: ' A@x.es, b@y.org;c@z.com ' });
    expect(puedeRegistrarse('a@X.es', l)).toBe(true);
    expect(puedeEntrar('d@w.es', l)).toBe(false);
  });
});

const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url)('web privada', async () => {
  const { default: request } = await import('supertest');
  const { crearApp } = await import('../src/app.js');
  const { Repositorio } = await import('../src/db.js');
  const { AlmacenCuentas } = await import('../src/cuentas.js');
  const cuentas = AlmacenCuentas.desdeUrl(url!);
  afterAll(() => cuentas.cerrar());
  const app = crearApp(new Repositorio(':memory:'), { cuentas, privado: true });
  const email = `priv-${Date.now()}@example.com`;

  it('sin sesión no se ve nada; solo los autorizados crean cuenta; con sesión, todo', async () => {
    expect((await request(app).get('/api/meta')).status).toBe(401);
    expect((await request(app).get('/api/contratos')).status).toBe(401);
    expect((await request(app).get('/api/salud')).status).toBe(200);
    expect((await request(app).get('/api/cuenta')).body.privado).toBe(true);
    process.env.EMAILS_PERMITIDOS = 'otra@example.com';
    expect((await request(app).post('/api/cuenta/registro').send({ email, clave: 'una clave larga' })).status).toBe(403);
    process.env.EMAILS_PERMITIDOS = `otra@example.com, ${email}`;
    const r = await request(app).post('/api/cuenta/registro').send({ email, clave: 'una clave larga' });
    expect(r.status).toBe(201);
    const cookie = r.headers['set-cookie']![0]!.split(';')[0]!;
    expect((await request(app).get('/api/meta').set('Cookie', cookie)).status).toBe(200);
    // Quitarlo de la lista le retira el acceso, aunque tenga la sesión abierta.
    process.env.EMAILS_PERMITIDOS = 'otra@example.com';
    expect((await request(app).get('/api/meta').set('Cookie', cookie)).status).toBe(401);
    expect((await request(app).post('/api/cuenta/entrar').send({ email, clave: 'una clave larga' })).status).toBe(403);
    delete process.env.EMAILS_PERMITIDOS;
  });
});
