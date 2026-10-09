Respuestas reales de la API de la BDNS capturadas el 8 de octubre de 2026 desde
`https://www.pap.hacienda.gob.es/bdnstrans/api`:

- `bdns-busqueda-jazz.json`: `GET /convocatorias/busqueda?vpd=GE&page=0&pageSize=3&descripcion=jazz` (sin el campo `advertencia`).
- `bdns-detalle-934378.json`: `GET /convocatorias?vpd=GE&numConv=934378`.
- `bdns-concesiones-932065.json`: `GET /concesiones/busqueda?vpd=GE&numeroConvocatoria=932065` (sin `idPersona`).
- `bases-1519395.txt.gz`: texto (pdftotext, páginas separadas por `\f`) de las bases del concurso Palau Ressona 2026
  (convocatoria BDNS 928556, documento 1519395), tal como lo guarda el recolector en `datos/bdns/documentos/`.
