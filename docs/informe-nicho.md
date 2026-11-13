# Informe del nicho: subvenciones públicas para música en España

Generado el 2026-11-13 con `npm run informe` a partir de `datos/bdns/`. Fuente: Base de
Datos Nacional de Subvenciones (BDNS). Las convocatorias se clasifican por reglas (ver
`server/src/clasificacion/musica.ts`); la precisión medida está en `docs/evaluacion-clasificador.md`.

## Resumen

- Periodo cubierto: 2014-01-15 a 2026-11-12.
- Convocatorias de música: **16.634**; compatibles con jazz, clásica u ópera: **12.000**
  (2.593 concursos y 9.407 concesiones directas o nominativas).
- Importe concedido registrado en las compatibles: **862.512.460 €**
  (526.154.718 € en concursos y 336.357.742 € en concesiones directas). Concesiones registradas desde 2022-01-01: la BDNS solo publica las de los últimos cuatro años.
- Sin contar formación (escuelas de música, conservatorios, becas), que no es para el promotor: 10.125 convocatorias y 650.397.891 € concedidos.
- Mencionan expresamente el estilo: jazz 428, clásica 3.288, ópera y lírica 432. El resto son ayudas de música en general.
- Concursos con el plazo abierto hoy: **9**; por abrir: **18**.
- Convocatorias que se repiten año tras año (series): 1.923; previstas en los próximos 3 meses según su
  historial (estimación): 278.
- Concursos generales de cultura (desde 2023) en los que un concierto puede encajar: 1.339.

## Por año (compatibles con jazz, clásica u ópera)

| Año | Convocatorias | Concursos | Directas | Presupuesto declarado | Concedido registrado |
|---|---:|---:|---:|---:|---:|
| 2014 | 5 | 0 | 5 | 153.999 € | 0 € |
| 2015 | 5 | 0 | 5 | 111.200 € | 0 € |
| 2016 | 530 | 122 | 408 | 52.746.106 € | 0 € |
| 2017 | 840 | 176 | 664 | 103.475.150 € | 385 € |
| 2018 | 983 | 170 | 813 | 112.241.500 € | 678.437 € |
| 2019 | 1.079 | 179 | 900 | 135.719.698 € | 155.000 € |
| 2020 | 874 | 194 | 680 | 201.428.082 € | 54.487 € |
| 2021 | 1.063 | 235 | 828 | 197.276.470 € | 46.123.412 € |
| 2022 | 1.156 | 267 | 889 | 187.813.713 € | 163.103.625 € |
| 2023 | 1.337 | 308 | 1.029 | 194.535.516 € | 164.137.166 € |
| 2024 | 1.405 | 329 | 1.076 | 219.492.455 € | 191.026.791 € |
| 2025 | 1.469 | 316 | 1.153 | 258.694.941 € | 216.539.310 € |
| 2026 (en curso) | 1.254 | 297 | 957 | 187.202.585 € | 80.693.847 € |

El concedido de los años recientes crece con el tiempo: las concesiones se registran meses después de la convocatoria.

## Qué financian (compatibles)

| Actividad | Convocatorias | Concursos | Concedido registrado |
|---|---:|---:|---:|
| Sin especificar | 7.726 | 712 | 366.049.589 € |
| Formación (escuelas, conservatorios, becas) | 1.875 | 1.025 | 212.114.570 € |
| Festivales, ciclos y programación | 1.769 | 585 | 198.452.118 € |
| Producción y creación | 609 | 519 | 143.712.190 € |
| Internacionalización | 490 | 217 | 63.369.039 € |
| Equipamiento e inversiones | 406 | 196 | 65.970.615 € |
| Giras y circulación | 266 | 223 | 80.798.558 € |
| Grabación | 191 | 170 | 20.219.748 € |
| Composición y encargos | 101 | 87 | 47.226.891 € |

Una convocatoria puede financiar varias actividades. La formación (escuelas de música y conservatorios) concentra
importes altos pero no es una oportunidad para el promotor.

## Por comunidad autónoma

| Ámbito | Convocatorias | Concursos | Concedido registrado |
|---|---:|---:|---:|
| Cataluña | 2.637 | 523 | 288.711.012 € |
| Comunitat Valenciana | 2.325 | 488 | 146.118.069 € |
| Canarias | 928 | 84 | 79.305.144 € |
| Andalucía | 824 | 125 | 32.025.541 € |
| Galicia | 773 | 209 | 32.703.206 € |
| Castilla y León | 561 | 110 | 9.444.100 € |
| Castilla-La Mancha | 559 | 67 | 9.805.494 € |
| País Vasco | 530 | 132 | 35.411.192 € |
| Aragón | 463 | 124 | 7.793.511 € |
| Sin restricción territorial | 375 | 127 | 90.669.255 € |
| Región de Murcia | 355 | 38 | 14.252.022 € |
| Illes Balears | 324 | 97 | 18.788.696 € |
| Principado de Asturias | 291 | 76 | 29.671.590 € |
| Extremadura | 285 | 72 | 15.854.244 € |
| Comunidad de Madrid | 262 | 109 | 20.935.822 € |
| Comunidad Foral de Navarra | 240 | 118 | 26.613.853 € |
| La Rioja | 130 | 23 | 1.381.199 € |
| Cantabria | 124 | 59 | 1.905.318 € |
| Ceuta | 44 | 12 | 354.792 € |
| Melilla | 13 | 4 | 768.400 € |

## Por administración

| Administración | Convocatorias | Concursos | Concedido registrado |
|---|---:|---:|---:|
| local | 10.045 | 1.753 | 290.049.588 € |
| autonomica | 1.682 | 751 | 483.133.793 € |
| estatal | 191 | 36 | 89.008.440 € |
| otra | 82 | 53 | 320.639 € |

## Quién puede pedir los concursos

| Beneficiarios admitidos | Concursos |
|---|---:|
| Autónomos y empresas | 670 |
| Asociaciones y fundaciones | 1.150 |
| Personas físicas (músicos: premios, concursos, becas) | 990 |
| Ayuntamientos y entidades locales | 246 |

Un concurso puede admitir varios tipos de beneficiario.

## Importes típicos

- Mediana del presupuesto declarado de los concursos: 50.000 €.
- Mediana de lo concedido a una entidad en una convocatoria: 5.861 €.

## Mes en que abren los concursos

| Mes | Concursos |
|---|---:|
| enero | 91 |
| febrero | 113 |
| marzo | 199 |
| abril | 155 |
| mayo | 120 |
| junio | 123 |
| julio | 93 |
| agosto | 50 |
| septiembre | 106 |
| octubre | 80 |
| noviembre | 40 |
| diciembre | 42 |

## Organismos que más han concedido

| Organismo | Entidad | Convocatorias | Años | Concedido registrado |
|---|---|---:|---|---:|
| SECRETARÍA AUTONÓMICA DE EDUCACIÓN | COMUNITAT VALENCIANA | 54 | 2016-2026 | 81.381.520 € |
| INSTITUTO NACIONAL DE LAS ARTES ESCÉNICAS Y DE LA MÚSICA | MINISTERIO DE CULTURA | 100 | 2014-2025 | 75.009.017 € |
| INSTITUT CATALÀ DE LES EMPRESES CULTURALS (ICEC) | CATALUÑA | 205 | 2016-2026 | 71.241.994 € |
| OFICINA DE SUPORT A LA INICIATIVA CULTURAL | CATALUÑA | 120 | 2018-2026 | 68.183.771 € |
| DEPARTAMENT D'EDUCACIÓ I FORMACIÓ PROFESSIONAL | CATALUÑA | 34 | 2017-2026 | 66.506.097 € |
| CABILDO INSULAR DE GRAN CANARIA | CABILDO INSULAR DE GRAN CANARIA | 354 | 2016-2026 | 46.608.300 € |
| DEPARTAMENT DE CULTURA | CATALUÑA | 38 | 2017-2026 | 42.119.713 € |
| DEPARTAMENTO DE EDUCACION | COMUNIDAD FORAL DE NAVARRA | 27 | 2016-2026 | 18.869.370 € |
| FUNDACIÓN MUNICIPAL DE CULTURA | OVIEDO | 25 | 2016-2026 | 17.775.000 € |
| DIPUTACIÓN PROVINCIAL DE CORUÑA, A | DIPUTACIÓN PROV. DE A CORUÑA | 75 | 2016-2026 | 17.108.959 € |
| DIPUTACIÓN PROVINCIAL DE VALENCIA | DIPUTACIÓN PROV. DE VALENCIA | 81 | 2016-2026 | 16.997.666 € |
| AYUNTAMIENTO DE BILBAO | BILBAO | 82 | 2017-2026 | 16.557.257 € |
| CONSEJERÍA DE CULTURA Y DEPORTE | ANDALUCÍA | 18 | 2021-2026 | 14.799.875 € |
| DIPUTACIÓN PROVINCIAL DE TARRAGONA | DIPUTACIÓN PROV. DE TARRAGONA | 93 | 2016-2026 | 14.595.216 € |
| CABILDO INSULAR DE TENERIFE | CABILDO INSULAR DE TENERIFE | 71 | 2016-2026 | 13.304.717 € |
| DIPUTACIÓN PROVINCIAL DE ALACANT/ALICANTE | DIPUTACIÓN PROV. DE ALICANTE | 98 | 2016-2026 | 12.785.901 € |
| SECRETARÍA GENERAL DE CULTURA | EXTREMADURA | 71 | 2020-2026 | 11.791.296 € |
| ÁREA DE GOBIERNO DE CULTURA, TURISMO Y DEPORTE | MADRID | 4 | 2021-2025 | 9.507.976 € |
| CONSEJERÍA DE CULTURA, TURISMO Y DEPORTE | COMUNIDAD DE MADRID | 34 | 2016-2026 | 9.266.967 € |
| INSTITUT VALENCIÀ DE CULTURA (IVC) | COMUNITAT VALENCIANA | 46 | 2018-2026 | 7.889.904 € |
