// Sincroniza la lista del navegador (guardadas, ocultas, clientes y perfil) con la cuenta del usuario, si tiene.
// - Al abrir la web y al volver a ella: si la cuenta tiene cambios de otro dispositivo, se traen; si hay cambios
//   locales sin subir, se suben; si hay de los dos, se suman (nada se pierde).
// - Cada cambio local se sube a los pocos segundos.
import { useEffect, useState } from 'react';
import { api, type EstadoCuenta, EVENTO_PERFIL, guardarEnNavegador, leerPerfilGuardado } from './api';
import { EVENTO_MARCAS, fusionar, leerMarcas, type Marcas, reemplazarMarcas } from './marcas';
import type { Perfil } from './tipos';

const CLAVE = 'subvencionados:sync';
const EVENTO_CUENTA = 'subvencionados:cuenta';

interface EstadoSync {
  /** Fecha (del servidor) de la última versión sincronizada. */
  ultima: string | null;
  /** Hay cambios en este navegador sin subir. */
  pendiente: boolean;
}

function leerSync(): EstadoSync {
  try {
    return { ultima: null, pendiente: false, ...(JSON.parse(localStorage.getItem(CLAVE) ?? '{}') as Partial<EstadoSync>) };
  } catch {
    return { ultima: null, pendiente: false };
  }
}
function escribirSync(s: EstadoSync) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(s));
  } catch {
    // Sin almacenamiento no se puede recordar: se sumarán las dos listas la próxima vez.
  }
}

let cuenta: EstadoCuenta | null = null;
let estadoTexto: 'sincronizado' | 'subiendo' | 'error' | null = null;
let aplicando = false;
let temporizador: ReturnType<typeof setTimeout> | null = null;

function avisar() {
  window.dispatchEvent(new Event(EVENTO_CUENTA));
}

async function subir() {
  if (!cuenta?.usuario) return;
  estadoTexto = 'subiendo';
  avisar();
  try {
    const { actualizado } = await api.guardarLista({ marcas: leerMarcas(), perfil: leerPerfilGuardado() });
    escribirSync({ ultima: actualizado, pendiente: false });
    estadoTexto = 'sincronizado';
  } catch {
    estadoTexto = 'error';
  }
  avisar();
}

function aplicarLocal(marcas: Marcas, perfil: Perfil | null) {
  aplicando = true;
  try {
    reemplazarMarcas(marcas);
    if (perfil) guardarEnNavegador(perfil, false);
  } finally {
    aplicando = false;
  }
}

/** Trae la lista de la cuenta y la junta con la del navegador según quién tenga cambios. */
export async function sincronizar() {
  if (!cuenta?.usuario) return;
  const s = leerSync();
  try {
    const servidor = await api.leerLista();
    if (!servidor.datos || !servidor.actualizado) {
      await subir();
      return;
    }
    const remotas = servidor.datos.marcas as Partial<Marcas>;
    const cambiosRemotos = !s.ultima || servidor.actualizado > s.ultima;
    if (!cambiosRemotos) {
      if (s.pendiente) await subir();
      else {
        estadoTexto = 'sincronizado';
        avisar();
      }
      return;
    }
    if (s.pendiente || !s.ultima) {
      // Cambios en los dos sitios (o primera vez en este navegador): se suman.
      aplicarLocal(fusionar(leerMarcas(), remotas), leerPerfilGuardado() ?? servidor.datos.perfil);
      await subir();
    } else {
      aplicarLocal({ guardadas: remotas.guardadas ?? [], ocultas: remotas.ocultas ?? [], clientes: remotas.clientes ?? {} }, servidor.datos.perfil);
      escribirSync({ ultima: servidor.actualizado, pendiente: false });
      estadoTexto = 'sincronizado';
      avisar();
    }
  } catch {
    estadoTexto = 'error';
    avisar();
  }
}

function cambioLocal() {
  if (aplicando || !cuenta?.usuario) return;
  escribirSync({ ...leerSync(), pendiente: true });
  if (temporizador) clearTimeout(temporizador);
  temporizador = setTimeout(() => void subir(), 1500);
}

/** Se llama una vez al arrancar la web. */
export function iniciarSincronizacion() {
  window.addEventListener(EVENTO_MARCAS, cambioLocal);
  window.addEventListener(EVENTO_PERFIL, cambioLocal);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void sincronizar();
  });
  void recargarCuenta().then(() => sincronizar());
}

export async function recargarCuenta(): Promise<EstadoCuenta | null> {
  try {
    cuenta = await api.cuenta();
  } catch {
    cuenta = null;
  }
  avisar();
  return cuenta;
}

/** Tras entrar o registrarse: la lista de este navegador se suma a la de la cuenta. */
export async function alEntrar() {
  escribirSync({ ultima: null, pendiente: true });
  await recargarCuenta();
  await sincronizar();
}

export async function alSalir() {
  escribirSync({ ultima: null, pendiente: false });
  estadoTexto = null;
  await recargarCuenta();
}

export function useCuenta() {
  const [, setN] = useState(0);
  useEffect(() => {
    const f = () => setN((n) => n + 1);
    window.addEventListener(EVENTO_CUENTA, f);
    return () => window.removeEventListener(EVENTO_CUENTA, f);
  }, []);
  return { cuenta, estado: estadoTexto };
}
