# Evaluación del clasificador de música

El clasificador (`server/src/clasificacion/musica.ts`) decide, a partir del título de cada convocatoria de la BDNS,
si es de música y si es compatible con jazz, clásica u ópera (es decir, si no va dirigida a otro género concreto:
flamenco, bandas, folklore, sardanas, rock…).

## Cómo se mide

1. `npm run muestra-evaluacion` (workflow *Muestra de evaluación*) toma los listados de 2024-2025 de la BDNS
   (finalidad Cultura y búsquedas por términos musicales: 35.285 convocatorias) y saca una muestra reproducible
   estratificada: 150 que el clasificador acepta, 100 rechazadas al azar y 50 rechazadas «difíciles» (con palabras
   como banda, coro, festival…).
2. Las muestras se etiquetan a mano en `server/test/evaluacion/etiquetas*.json`: ¿es de música?, ¿es compatible?
   Las que no se pueden decidir por el título quedan como dudosas y no cuentan.
3. Las métricas se estiman sobre el universo, ponderando cada estrato por su tamaño real (3.174 aceptadas y 32.111
   rechazadas en la primera muestra). El estrato «difícil» solo sirve para encontrar errores.
4. `npm test` exige unos mínimos (precisión ≥ 97 %, coberturas ≥ 90 %, acierto de compatibilidad ≥ 90 %) y
   `npm run evaluar` regenera la sección de resultados.

Las etiquetas las ha puesto Claude leyendo cada título; conviene que una persona del sector revise una parte.

## Historial

| Fecha | Cambio | Precisión | Cobertura | Cobertura compatibles |
|---|---|---:|---:|---:|
| 2026-10-09 | Clasificador inicial (muestra 1) | 99,3 % | 57,6 % | 63,9 % |
| 2026-10-09 | Ronda 1: coros, cantaires, ensembles, compuestos con «música», bandas, folklore, sardanistas, danza (muestra 1, optimista) | 100,0 % | 100,0 % | 100,0 % |
| 2026-10-09 | **Ronda 1 validada con la muestra 2, independiente: cifra fiable** | **94,6 %** | **84,8 %** | **86,3 %** |
| 2026-10-09 | Ronda 2: fuera «moros y cristianos» y la danza sin música; cante, «music», txaranga, cualquier «banda» (muestra 2, optimista) | 100,0 % | 100,0 % | 99,1 % |

La próxima medida fiable requiere una tercera muestra independiente (`semilla` nueva en el workflow).

## Resultados actuales

<!-- resultados -->

### Muestra 1 (semilla 20261009)

Usada para la primera ronda de correcciones. 300 convocatorias etiquetadas (5 dudosas, excluidas).

| Métrica | Valor |
|---|---:|
| Precisión (lo que marca como música, lo es) | 100,0 % |
| Cobertura (de lo que es música, lo encuentra) | 100,0 % |
| Cobertura de lo compatible con jazz, clásica u ópera | 100,0 % |
| Acierto al decidir si es compatible | 98,1 % |

Errores que quedan:

- 872787: se esperaba «otro género» y sale «compatible». Subvención a la Comarca de La Jacetania para Festival De Música Y Cultura Pirenaicas. PIR 2025
- 739128: se esperaba «otro género» y sale «compatible». CONVENIO NOMINATIVO ASOCIACIÓN CORO ROCIERO DE LA HUMILDAD 2023
- 852405: se esperaba «otro género» y sale «compatible». Convenio con la Asociación Son D'Aquí para contribuir a la financiación de los gastos derivados del alquiler de un local para la realización
- 775006: se esperaba «música» y sale «no es música». Orden de la Consejera de Presidencia, Interior y Cultura por la que se concede una subvención nominativa a la Sociedad VLZGZ, S.L., para la  (Vive Latino es un festival de música (rock latino), aunque el título no lo dice)

### Muestra 2 (semilla 7771)

Usada para validar la primera ronda y para la segunda ronda de correcciones. 300 convocatorias etiquetadas (4 dudosas, excluidas).

| Métrica | Valor |
|---|---:|
| Precisión (lo que marca como música, lo es) | 100,0 % |
| Cobertura (de lo que es música, lo encuentra) | 100,0 % |
| Cobertura de lo compatible con jazz, clásica u ópera | 99,1 % |
| Acierto al decidir si es compatible | 99,3 % |

Errores que quedan:

- 793816: se esperaba «compatible» y sale «otro género (música tradicional)». CONVOCATORIA DE SUBVENCIONES PARA ACTIVIDADES CULTURALES, EDUCATIVAS, FOLKLORE, JUVENTUD, MUSICALES E ILUMINACIÓN DE SAN MARTIN DEL REY AURE
- 868814: se esperaba «música» y sale «no es música». Resolución de una solicitud de subvención excluida de concurrencia pública presentada por Festival Perelada, SL. (Festival de Peralada: música clásica y ópera, aunque el título no lo dice)
