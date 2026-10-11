// Vuelve a aplicar a los contratos ya guardados las reglas de privacidad del lector: sin nombre ni NIF de las
// personas físicas adjudicatarias (también cuando la plataforma enmascara el NIF).
//   npm run limpiar-contratos
import { join } from 'node:path';
import { config } from '../config.js';
import { AlmacenContratos } from '../contratos/almacen.js';
import { esPersonaFisica } from '../contratos/placsp.js';

const almacen = new AlmacenContratos(join(config.rutaDatos, 'contratos'));
let limpiadas = 0;
for (const c of almacen.contratos.values()) {
  let cambia = false;
  const adjudicaciones = c.adjudicaciones.map((a) => {
    const enmascarado = !!a.nif?.includes('*');
    const persona = a.personaFisica || esPersonaFisica(a.nif, a.adjudicatario);
    if (persona && (a.adjudicatario || a.nif)) {
      cambia = true;
      limpiadas++;
      return { ...a, adjudicatario: null, nif: null, personaFisica: true };
    }
    if (enmascarado) {
      cambia = true;
      return { ...a, nif: null };
    }
    return a;
  });
  if (cambia) almacen.reescribir({ ...c, adjudicaciones });
}
almacen.escribir();
console.log(`Adjudicaciones a personas físicas limpiadas: ${limpiadas}`);
