import { normalizar } from '../clasificacion/musica.js';

/**
 * Contratos que pasan el filtro de música pero no son un concierto que ArsVia pueda ofrecer:
 * cultura popular y seguici (gegants, grallers, bastons, pastorets…), música de fiesta
 * (DJ, verbena, charanga, pasacalles) y servicios alrededor de un concierto (técnica,
 * sanidad, auditoría, alojamiento…). No cuentan para los recuentos, novedades ni licitaciones.
 */
const CULTURA_POPULAR =
  /\b(cultura popular|cultura tradicional|musica tradicional|seguici|gegant\w*|gigantes|cabezudos|capgros\w*|nans|grall\w*|dolçain\w*|dulzain\w*|xirimit\w*|xeremi\w*|ministrers|bastons|pastorets|correfoc\w*|bestiari|elements festius|drac\w*|bou|bouet|aliga|mulass\w*|cercolets|galeres|ball de vells|ball dels negrets|home dels nassos|castells|nit de castells|xiquets|castellers|colla|cercavil\w*|pasacalles?|passacarrers|matinad\w*|carnestoltes|carnaval|cavalcada|cabalgata|sardan\w*|ballada|aplec|havaneres|txistu\w*|trikiti\w*|erromeri\w*|alarde|gaita\w*|tamborrad\w*|tamboril\w*|danzas? tradicional\w*|folklor\w*|folclor\w*)\b/;
const FIESTA =
  /\b(dj|djs|dee ?jays?|discomobil\w*|disco movil|discoteca movil|verbenas?|revetll\w*|charangas?|xarangas?|txarangas?|fanfarr?\w*|bingo|karaoke|megafonia|animacio|animacion|tastets?|vermut|calcotada|escudellada|favatada|esmorzar|discjockey)\b/;
const SERVICIOS =
  /\b(auditoria|ambulanci\w*|sanitari\w*|controladors?|control d.acces|control de acceso|allotjament|alojamiento|apats|catering|cabines?|tauletes|adquisicio|reparacio|reparacion|il.luminacio|iluminacion|llum|luces|estornells|protocol|liquidacio de drets|drets|derechos de autor|equipament|equipamiento|alquiler|lloguer|equips tecnics|so i llum|equipos? de sonido|sonido e iluminacion|sonido profesional|tecnicos? de sonido|servicio de sonido|alquiler de sonido|backline|escenari|escenario|generador\w*|grupo electrogeno|carpas?|vallas?|tanques|instal.lacio|coordinacio|produccio tecnica|produccion tecnica|direccio musical|reunions|enregistrament|grabacion|gravacio)\b/;

export function esRuidoParaPromotor(titulo: string): boolean {
  const t = normalizar(titulo);
  return CULTURA_POPULAR.test(t) || FIESTA.test(t) || SERVICIOS.test(t);
}

/** «NOMBRE APELLIDOS, IMPORT FRA.123, …»: el Registre pone a veces el nombre de quien factura delante; se quita. */
export function limpiarTitulo(titulo: string): string {
  return titulo.replace(/^[^,]{3,80},\s*import fra\.?\s*[^,]*,\s*/i, '');
}

/** Texto UTF-8 leído como latin1 («ActuaciÃ³») o con la letra perdida («ASSOCIACIÃ¿»). */
const MOJIBAKE: [RegExp, string][] = [
  [/Ã³/g, 'ó'], [/Ãº/g, 'ú'], [/Ã©/g, 'é'], [/Ã¨/g, 'è'], [/Ã\u00a0/g, 'à'], [/Ã\u00ad/g, 'í'], [/Ã§/g, 'ç'],
  [/Ã²/g, 'ò'], [/Ã¯/g, 'ï'], [/Ã±/g, 'ñ'], [/Ã¡/g, 'á'], [/Ã¼/g, 'ü'], [/Ã‡/g, 'Ç'], [/Ã‰/g, 'É'], [/Ã€/g, 'À'], [/Ã\u201c/g, 'Ó'],
  [/Â·/g, '·'], [/Â/g, ''],
  // La segunda letra se perdió: solo los casos sin duda; el resto queda como «¿», igual que en la fuente.
  [/CIÃ¿(?![A-Za-z])/g, 'CIÓ'], [/ciÃ¿(?![A-Za-z])/g, 'ció'], [/PLAÃ¿A/g, 'PLAÇA'], [/Ã¿/g, '¿'],
];
export function repararTexto(texto: string): string {
  if (!/[ÃÂ]/.test(texto)) return texto;
  return MOJIBAKE.reduce((t, [re, por]) => t.replace(re, por), texto);
}
