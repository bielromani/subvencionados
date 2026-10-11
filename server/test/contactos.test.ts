import { readFileSync } from 'node:fs';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { crearApp } from '../src/app.js';
import { clavesMunicipio, Contactos, esOrganoMunicipal, leerCsv } from '../src/contactos.js';
import { entradas, leerEntrada } from '../src/contratos/placsp.js';
import { enriquecer } from '../src/contratos/vista.js';
import { Repositorio } from '../src/db.js';

// Filas de prueba con el formato de datos/directorio/ (nombres y contactos ficticios).
const ayuntamientos = leerCsv(
  [
    'Comunidad autónoma,Provincia,Municipio,Código INE,Población,Responsable de cultura,Cargo y área,Email cultura,Teléfono cultura,Teléfono ayuntamiento,Email ayuntamiento,Web,Alcalde/sa,Partido alcaldía,Dirección,Fuentes',
    'Galicia,Lugo,Lugo,27028,98000,Persona Uno,Concelleira: Cultura,cultura@concello.example,982 000 001,982 000 000,concello@gmail.com,https://concello.example,Persona Alcaldesa,PARTIDO A,"Praza Maior, 1, 27001 Lugo",Xunta de Galicia',
    'Galicia,Lugo,"Pobra do Brollón, A",27048,1600,,,,,982 000 100,info@pobra.example,,,,,Xunta de Galicia',
  ].join('\n'),
);
const cultura = leerCsv(
  [
    'Comunidad autónoma,Provincia,Entidad,Tipo de entidad,Municipio,Código INE,Población,Nombre,Cargo,Área de gobierno,Partido,Nombramiento,Email cultura,Teléfono cultura,Web cultura,Dirección cultura,Teléfono ayuntamiento,Email ayuntamiento,Web,Fuente,Enlace a la fuente,Año de la fuente,Notas',
    'Galicia,Lugo,Concello de Lugo,Ayuntamiento,Lugo,27028,98000,Persona Uno,Concelleira,Cultura,PARTIDO A,,cultura@concello.example,982 000 001,,,,,,Web municipal,https://concello.example/cultura,2026,',
    'Galicia,Lugo,Concello de Lugo,Ayuntamiento,Lugo,27028,98000,Persona Dos,Técnico,Cultura,,,persona.dos@hotmail.com,600 000 000,,,,,,Directorio provincial,,2025,',
    'Galicia,Lugo,Consello comarcal,Consejo comarcal,Lugo,27028,98000,Persona Tres,Conselleira,Cultura,,,,,,,,,,Fuente,,2026,',
  ].join('\n'),
);
const contactos = new Contactos(ayuntamientos, cultura);

describe('directorio de contactos', () => {
  it('lee CSV con comillas y comas dentro de los campos', () => {
    expect(ayuntamientos[0]!['Dirección']).toBe('Praza Maior, 1, 27001 Lugo');
    expect(ayuntamientos[1]!['Municipio']).toBe('Pobra do Brollón, A');
  });

  it('nombres de municipio con el artículo pospuesto', () => {
    expect(clavesMunicipio('Pobra do Brollón, A')).toEqual(['a pobra do brollon']);
    expect(clavesMunicipio("Hospitalet de Llobregat, L'")).toEqual(["l'hospitalet de llobregat"]);
    expect(contactos.buscar('A Pobra do Brollón', '27')?.codigoIne).toBe('27048');
    expect(contactos.buscar('A Pobra do Brollón', '15')).toBeNull();
  });

  it('solo órganos municipales', () => {
    expect(esOrganoMunicipal('Junta de Gobierno del Ayuntamiento de Lugo')).toBe(true);
    expect(esOrganoMunicipal('Instituto Municipal de Cultura')).toBe(true);
    expect(esOrganoMunicipal('Presidencia de la Diputación Provincial de Lugo')).toBe(false);
    expect(contactos.deOrgano('Alcaldía del Concello de Lugo', null, '27')?.municipio).toBe('Lugo');
    expect(contactos.deOrgano('Presidencia de la Diputación Provincial de Lugo', 'Lugo', '27')).toBeNull();
  });

  it('personas de cultura: sin consejos comarcales y sin email gratuito ni móvil personal', () => {
    const m = contactos.porCodigo('27028')!;
    expect(m.personas.map((p) => p.nombre)).toEqual(['Persona Uno', 'Persona Dos']);
    expect(m.personas[1]).toMatchObject({ email: null, telefono: null, contactoOmitido: true });
    // El email oficial del ayuntamiento se enseña aunque sea de un proveedor gratuito.
    expect(m.ayuntamiento.email).toBe('concello@gmail.com');
    expect(m.alcaldia).toEqual({ nombre: 'Persona Alcaldesa', partido: 'PARTIDO A' });
  });
});

describe('contactos en la API', () => {
  const atom = readFileSync(new URL('./fixtures/placsp-lugo.atom', import.meta.url), 'utf8');
  const lugo = enriquecer(leerEntrada(entradas(atom)[0]!)!);
  const app = crearApp(new Repositorio(':memory:'), { contratos: [lugo], contactos });

  it('el programador municipal lleva su contacto', async () => {
    const lista = await request(app).get('/api/programadores?contacto=si');
    expect(lista.body.total).toBe(1);
    expect(lista.body.items[0]).toMatchObject({ codigoIne: '27028', conContacto: true });
    const ficha = await request(app).get(`/api/programadores/${encodeURIComponent(lista.body.items[0].id)}`);
    expect(ficha.body.contacto.personas[0].nombre).toBe('Persona Uno');
  });

  it('ficha de municipio por código INE', async () => {
    expect((await request(app).get('/api/contactos/27048')).body.municipio).toBe('Pobra do Brollón, A');
    expect((await request(app).get('/api/contactos/99999')).status).toBe(404);
  });
});
