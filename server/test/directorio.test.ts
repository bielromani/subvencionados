import { readFileSync } from 'node:fs';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { crearApp } from '../src/app.js';
import { desdeBdns } from '../src/bdns/normalizar.js';
import { entradas, leerEntrada } from '../src/contratos/placsp.js';
import { enriquecer } from '../src/contratos/vista.js';
import { Repositorio } from '../src/db.js';
import { circuitos, festivales, nombreDeEvento, programadores } from '../src/directorio.js';
import { detalle, registro } from './ayudas.js';

const atom = readFileSync(new URL('./fixtures/placsp-lugo.atom', import.meta.url), 'utf8');
const base = enriquecer(leerEntrada(entradas(atom)[0]!)!);
const contrato = (id: string, titulo: string, importe: number, fecha: string) =>
  enriquecer({ ...base, id, titulo, adjudicaciones: [{ ...base.adjudicaciones[0]!, importe, fecha }] });

describe('nombres de festivales y ciclos', () => {
  it('sin ordinal, año ni lugar de celebración', () => {
    expect(nombreDeEvento('XXIX Festival de Jazz de Lugo 2026, concierto de clausura')).toBe('Festival de Jazz de Lugo');
    expect(nombreDeEvento('Concierto dentro del Ciclo Días Musicales XII')).toBe('Ciclo Días Musicales');
    expect(nombreDeEvento('Actuación en la SEMANA DE MÚSICA RELIGIOSA DE CUENCA')).toBe('Semana de Música Religiosa de Cuenca');
    expect(nombreDeEvento("Concierto del Festival de Jazz de l'Alfàs del Pi 2025")).toBe("Festival de Jazz de l'Alfàs del Pi");
    expect(nombreDeEvento('Festival de música de verano')).toBeNull();
    expect(nombreDeEvento('Contratación de la orquesta para las fiestas')).toBeNull();
  });
});

describe('directorio', () => {
  const cs = [
    contrato('1', 'Concierto del XX Festival de Jazz de Lugo 2025', 8000, '2025-07-10'),
    contrato('2', 'Actuación en el XXI Festival de Jazz de Lugo 2026', 12000, '2026-07-12'),
    contrato('3', 'Concierto de la banda en las fiestas, programa PLATEA', 4000, '2026-08-01'),
  ];
  const conv = [desdeBdns(registro(detalle('9', { descripcion: 'Subvención nominativa al Festival Internacional de Jazz de Lugo', tipoConvocatoria: 'Concesión directa - instrumental' })))];

  it('programadores: un órgano con sus contratos, importe habitual y estilos', () => {
    const [p] = programadores(cs);
    expect(p).toMatchObject({ nombre: 'Junta de Gobierno del Ayuntamiento de Lugo', contratos: 3, adjudicado: 24000, importeHabitual: 8000, estilos: { jazz: 2 }, ultimo: '2026-08-01' });
    expect(p!.meses[0]).toBe(7);
    // Rango de lo que paga en sus conciertos de jazz (2 contratos: no llega a 3, usa todos).
    expect(p!.rango).toMatchObject({ deEstilo: false });
    expect(p!.recientesEstilo.map((f) => f.id)).toEqual(['2', '1']);
  });

  it('festivales: las ediciones se agrupan con sus fuentes', () => {
    const f = festivales(cs, conv).find((x) => x.nombre === 'Festival de Jazz de Lugo')!;
    expect(f).toMatchObject({ musical: true, estilos: ['jazz'], anios: [2025, 2026], provincia: 'Lugo', dinero: 20000 });
    expect(f.fuentes.map((x) => x.id)).toEqual(['2', '1']);
  });

  it('circuitos que aparecen en los datos', () => {
    expect(circuitos(cs, conv).map((c) => [c.id, c.menciones])).toEqual([['platea', 1]]);
  });

  it('API', async () => {
    const app = crearApp(new Repositorio(':memory:'), { contratos: cs });
    const p = (await request(app).get('/api/programadores?estilo=jazz').expect(200)).body;
    expect(p.total).toBe(1);
    expect((await request(app).get(`/api/programadores/${p.items[0].id}`).expect(200)).body.recientes).toHaveLength(3);
    const f = (await request(app).get('/api/festivales?q=lugo').expect(200)).body;
    expect(f.items[0]).toMatchObject({ nombre: 'Festival de Jazz de Lugo', numFuentes: 2 });
    expect((await request(app).get('/api/circuitos').expect(200)).body.items[0].id).toBe('platea');
  });
});
