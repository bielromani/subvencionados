// Extracción del texto de los PDF con pdftotext (poppler-utils). Conserva los saltos de
// página (\f) para poder citar la página de la que sale cada dato.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function pdftotextDisponible(): boolean {
  return spawnSync('pdftotext', ['-v']).status === 0;
}

/** Devuelve el texto o null si el PDF no tiene capa de texto (escaneado) o no se puede leer. */
export async function extraerConPdftotext(pdf: Uint8Array): Promise<string | null> {
  const dir = mkdtempSync(join(tmpdir(), 'pdf-'));
  try {
    const ruta = join(dir, 'documento.pdf');
    writeFileSync(ruta, pdf);
    const r = spawnSync('pdftotext', ['-layout', '-enc', 'UTF-8', ruta, '-'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      timeout: 60_000,
    });
    if (r.status !== 0) return null;
    const texto = r.stdout.replace(/[ \t]+$/gm, '').trim();
    // Menos de 100 letras: casi seguro un escaneo sin texto.
    return (texto.match(/\p{L}/gu)?.length ?? 0) >= 100 ? texto : null;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
