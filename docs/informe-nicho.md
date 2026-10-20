# Informe del nicho: subvenciones públicas para música en España

Generado el 2026-10-20 con `npm run informe` a partir de `datos/bdns/`. Fuente: Base de
Datos Nacional de Subvenciones (BDNS). Las convocatorias se clasifican por reglas (ver
`server/src/clasificacion/musica.ts`); la precisión medida está en `docs/evaluacion-clasificador.md`.

## Resumen

- Periodo cubierto: 2014-01-15 a 2026-10-19.
- Convocatorias de música: **16.436**; compatibles con jazz, clásica u ópera: **11.860**
  (2.574 concursos y 9.286 concesiones directas o nominativas).
- Importe concedido registrado en las compatibles: **858.237.915 €**
  (526.154.718 € en concursos y 332.083.197 € en concesiones directas). Concesiones registradas desde 2022-01-01: la BDNS solo publica las de los últimos cuatro años.
- Sin contar formación (escuelas de música, conservatorios, becas), que no es para el promotor: 10.004 convocatorias y 646.325.346 € concedidos.
- Mencionan expresamente el estilo: jazz 427, clásica 3.241, ópera y lírica 429. El resto son ayudas de música en general.
- Concursos con el plazo abierto hoy: **17**; por abrir: **13**.
- Convocatorias que se repiten año tras año (series): 1.905; previstas en los próximos 3 meses según su
  historial (estimación): 63.
- Concursos generales de cultura (desde 2023) en los que un concierto puede encajar: 1.318.

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
| 2026 (en curso) | 1.114 | 278 | 836 | 176.510.719 € | 76.419.302 € |

El concedido de los años recientes crece con el tiempo: las concesiones se registran meses después de la convocatoria.

## Qué financian (compatibles)

| Actividad | Convocatorias | Concursos | Concedido registrado |
|---|---:|---:|---:|
| Sin especificar | 7.629 | 707 | 363.438.544 € |
| Formación (escuelas, conservatorios, becas) | 1.856 | 1.016 | 211.912.570 € |
| Festivales, ciclos y programación | 1.750 | 581 | 197.208.118 € |
| Producción y creación | 606 | 517 | 143.562.190 € |
| Internacionalización | 486 | 216 | 63.269.039 € |
| Equipamiento e inversiones | 401 | 193 | 65.953.115 € |
| Giras y circulación | 265 | 223 | 80.648.558 € |
| Grabación | 190 | 169 | 20.219.748 € |
| Composición y encargos | 101 | 87 | 47.226.891 € |

Una convocatoria puede financiar varias actividades. La formación (escuelas de música y conservatorios) concentra
importes altos pero no es una oportunidad para el promotor.

## Por comunidad autónoma

| Ámbito | Convocatorias | Concursos | Concedido registrado |
|---|---:|---:|---:|
| Cataluña | 2.606 | 517 | 288.023.612 € |
| Comunitat Valenciana | 2.295 | 486 | 144.717.610 € |
| Canarias | 914 | 84 | 78.421.897 € |
| Andalucía | 816 | 123 | 31.910.541 € |
| Galicia | 766 | 207 | 32.638.206 € |
| Castilla y León | 558 | 109 | 9.431.900 € |
| Castilla-La Mancha | 550 | 66 | 9.649.494 € |
| País Vasco | 525 | 131 | 35.334.627 € |
| Aragón | 462 | 124 | 7.758.511 € |
| Sin restricción territorial | 368 | 127 | 90.465.815 € |
| Región de Murcia | 350 | 36 | 14.242.022 € |
| Illes Balears | 319 | 96 | 18.638.696 € |
| Principado de Asturias | 291 | 76 | 29.671.590 € |
| Extremadura | 277 | 72 | 15.686.244 € |
| Comunidad de Madrid | 260 | 109 | 20.771.822 € |
| Comunidad Foral de Navarra | 240 | 118 | 26.613.853 € |
| La Rioja | 129 | 23 | 1.355.604 € |
| Cantabria | 120 | 58 | 1.782.678 € |
| Ceuta | 44 | 12 | 354.792 € |
| Melilla | 13 | 4 | 768.400 € |

## Por administración

| Administración | Convocatorias | Concursos | Concedido registrado |
|---|---:|---:|---:|
| local | 9.923 | 1.736 | 287.929.043 € |
| autonomica | 1.665 | 749 | 481.029.793 € |
| estatal | 190 | 36 | 88.958.440 € |
| otra | 82 | 53 | 320.639 € |

## Quién puede pedir los concursos

| Beneficiarios admitidos | Concursos |
|---|---:|
| Autónomos y empresas | 667 |
| Asociaciones y fundaciones | 1.141 |
| Personas físicas (músicos: premios, concursos, becas) | 980 |
| Ayuntamientos y entidades locales | 245 |

Un concurso puede admitir varios tipos de beneficiario.

## Importes típicos

- Mediana del presupuesto declarado de los concursos: 50.000 €.
- Mediana de lo concedido a una entidad en una convocatoria: 5.844 €.

## Mes en que abren los concursos

| Mes | Concursos |
|---|---:|
| enero | 90 |
| febrero | 113 |
| marzo | 199 |
| abril | 155 |
| mayo | 120 |
| junio | 123 |
| julio | 93 |
| agosto | 50 |
| septiembre | 106 |
| octubre | 77 |
| noviembre | 36 |
| diciembre | 41 |

## Organismos que más han concedido

| Organismo | Entidad | Convocatorias | Años | Concedido registrado |
|---|---|---:|---|---:|
| SECRETARÍA AUTONÓMICA DE EDUCACIÓN | COMUNITAT VALENCIANA | 50 | 2016-2026 | 81.381.520 € |
| INSTITUTO NACIONAL DE LAS ARTES ESCÉNICAS Y DE LA MÚSICA | MINISTERIO DE CULTURA | 100 | 2014-2025 | 75.009.017 € |
| INSTITUT CATALÀ DE LES EMPRESES CULTURALS (ICEC) | CATALUÑA | 201 | 2016-2026 | 70.656.994 € |
| OFICINA DE SUPORT A LA INICIATIVA CULTURAL | CATALUÑA | 120 | 2018-2026 | 68.183.771 € |
| DEPARTAMENT D'EDUCACIÓ I FORMACIÓ PROFESSIONAL | CATALUÑA | 34 | 2017-2026 | 66.506.097 € |
| CABILDO INSULAR DE GRAN CANARIA | CABILDO INSULAR DE GRAN CANARIA | 349 | 2016-2026 | 46.556.800 € |
| DEPARTAMENT DE CULTURA | CATALUÑA | 38 | 2017-2026 | 42.119.713 € |
| DEPARTAMENTO DE EDUCACION | COMUNIDAD FORAL DE NAVARRA | 27 | 2016-2026 | 18.869.370 € |
| FUNDACIÓN MUNICIPAL DE CULTURA | OVIEDO | 25 | 2016-2026 | 17.775.000 € |
| DIPUTACIÓN PROVINCIAL DE CORUÑA, A | DIPUTACIÓN PROV. DE A CORUÑA | 73 | 2016-2026 | 17.108.959 € |
| DIPUTACIÓN PROVINCIAL DE VALENCIA | DIPUTACIÓN PROV. DE VALENCIA | 79 | 2016-2026 | 16.787.666 € |
| AYUNTAMIENTO DE BILBAO | BILBAO | 82 | 2017-2026 | 16.557.257 € |
| CONSEJERÍA DE CULTURA Y DEPORTE | ANDALUCÍA | 18 | 2021-2026 | 14.799.875 € |
| DIPUTACIÓN PROVINCIAL DE TARRAGONA | DIPUTACIÓN PROV. DE TARRAGONA | 93 | 2016-2026 | 14.595.216 € |
| DIPUTACIÓN PROVINCIAL DE ALACANT/ALICANTE | DIPUTACIÓN PROV. DE ALICANTE | 98 | 2016-2026 | 12.785.901 € |
| CABILDO INSULAR DE TENERIFE | CABILDO INSULAR DE TENERIFE | 68 | 2016-2026 | 12.658.970 € |
| SECRETARÍA GENERAL DE CULTURA | EXTREMADURA | 69 | 2020-2026 | 11.641.296 € |
| ÁREA DE GOBIERNO DE CULTURA, TURISMO Y DEPORTE | MADRID | 4 | 2021-2025 | 9.507.976 € |
| CONSEJERÍA DE CULTURA, TURISMO Y DEPORTE | COMUNIDAD DE MADRID | 34 | 2016-2026 | 9.266.967 € |
| INSTITUT VALENCIÀ DE CULTURA (IVC) | COMUNITAT VALENCIANA | 46 | 2018-2026 | 7.889.904 € |
