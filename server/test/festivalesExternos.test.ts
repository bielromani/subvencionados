import { describe, expect, it } from 'vitest';
import { claveNombreFestival, emailGenerico, fichaFestclasica, fichaRedescena, fichaRema, miembrosRema } from '../src/festivalesExternos.js';

const festclasica = `<html><head><title>Festival Castell de Peralada | Asociación Española de Festivales de Música Clásica</title></head><body>
<nav>Festivales</nav><main><h1>Festival Castell de Peralada</h1><p>Del VI 17.07.26</p><p> al DO 09.08.26</p><p> Peralada </p>
<dl><dt>Comunidad Autónoma</dt><dd>Cataluña</dd><dd>Peralada</dd><dt>Entidad organizadora</dt><dd>: Fundació Castell de Peralada </dd>
<dt>Director/a</dt><dd>: Oriol Aguilà</dd><dt>Teléfono</dt><dd>: 935 038 646</dd><dt>Email</dt><dd>: </dd><dd><a href="mailto:InfoFestival@festivalperalada.com">InfoFestival@festivalperalada.com</a></dd>
<dt>Página web</dt><dd>: </dd><dd><a href="https://www.festivalperalada.com">www.festivalperalada.com</a></dd></dl>
<p>Fundado en 1987, el Festival Castell de Peralada está considerado una de las manifestaciones artísticas más importantes de la época estival. El mecenazgo en el Festival está integrado dentro de la política de responsabilidad social corporativa.</p></main></body></html>`;

const redescena = `<div>Festival de la Guitarra de Córdoba</div><a>VOLVER</a><h1>Festival de la Guitarra de Córdoba</h1><p>Música</p>
<p>Festival anual que se desarrolla en julio</p><p>CÓRDOBA (Córdoba)</p><p>Andalucía</p><h3>INFORMACIÓN DE CONTACTO</h3>
<p>Luis Francisco Flores Sánchez</p><p> 957480237</p><p> luis.flores@ayuncordoba.es</p><p>PERSONA DE CONTACTO</p><p>957480237</p>
<p>hortensia.revuelta@ayuncordoba.es</p><a href="http://guitarracordoba.com">guitarracordoba.com</a><h3>DESCRIPCIÓN</h3><p>El Festival de la Guitarra de Córdoba celebra su edición.</p>`;

describe('Festivales de los directorios del sector', () => {
  it('FestClásica: datos de la entidad, sin el nombre del director', () => {
    const f = fichaFestclasica(festclasica, 'https://www.festclasica.com/es/festivales/c/10-festival-castell-de-peralada.html')!;
    expect(f).toMatchObject({
      nombre: 'Festival Castell de Peralada',
      ccaa: 'Cataluña',
      municipio: 'Peralada',
      organizador: 'Fundació Castell de Peralada',
      telefono: '935 038 646',
      email: 'infofestival@festivalperalada.com',
      web: 'https://www.festivalperalada.com',
      inicio: '2026-07-17',
      fin: '2026-08-09',
    });
    expect(JSON.stringify(f)).not.toContain('Oriol');
    expect(f.descripcion).toMatch(/^Fundado en 1987/);
  });

  it('Redescena: solo música, sin personas ni emails personales', () => {
    const f = fichaRedescena(redescena, 'https://www.redescena.net/festival/3522/x/')!;
    expect(f).toMatchObject({ nombre: 'Festival de la Guitarra de Córdoba', municipio: 'Córdoba', provincia: 'Córdoba', ccaa: 'Andalucía', telefono: '957 480 237', email: null, web: 'https://guitarracordoba.com' });
    expect(JSON.stringify(f)).not.toMatch(/Luis|Flores|hortensia/);
    expect(fichaRedescena(redescena.replace('<p>Música</p>', '<p>Teatro</p>'), 'x')).toBeNull();
  });

  it('REMA: festivales de España y su web', () => {
    const html = `<div class='bloc js-custom-link col-12'><span class="ariane"><span class="text-uppercase">Festival</span></span><span class="title"><a class="" href="/members/festival-musica-antigua-gijon/">MUSICA ANTIGUA GIJON</a></span><span class="country text-white">Spain</span></div>
<div class='bloc js-custom-link col-12'><span class="ariane"><span class="text-uppercase">Ensemble</span></span><span class="title"><a class="" href="/members/x/">X</a></span><span class="country text-white">Spain</span></div>`;
    const ms = miembrosRema(html);
    expect(ms).toEqual([{ nombre: 'MUSICA ANTIGUA GIJON', url: 'https://www.rema-eemn.net/members/festival-musica-antigua-gijon/' }]);
    const f = fichaRema('<a href="https://www.facebook.com/x">f</a><a href="https://www.musicaantiguagijon.com/">web</a>', ms[0]!);
    expect(f).toMatchObject({ nombre: 'Musica Antigua Gijon', web: 'https://www.musicaantiguagijon.com/' });
  });

  it('emails genéricos sí, personales no', () => {
    expect(emailGenerico('Info@Festival.es')).toBe('info@festival.es');
    expect(emailGenerico('festival.jazz@x.com')).toBe('festival.jazz@x.com');
    expect(emailGenerico('luis.flores@ayuncordoba.es')).toBeNull();
  });

  it('casa nombres parecidos', () => {
    expect(claveNombreFestival('XXIX Festival Internacional de Música Castell de Peralada')).toBe(claveNombreFestival('Festival Castell de Peralada'));
  });
});
