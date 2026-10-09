# Informe del nicho: subvenciones públicas para música en España

Generado el 2026-10-09 con `npm run informe` a partir de `datos/bdns/`. Fuente: Base de
Datos Nacional de Subvenciones (BDNS). Las convocatorias se clasifican por reglas (ver
`server/src/clasificacion/musica.ts`); la precisión medida está en `docs/evaluacion-clasificador.md`.

## Resumen

- Periodo cubierto: 2014-01-15 a 2026-10-08.
- Convocatorias de música: **16.385**; compatibles con jazz, clásica u ópera: **11.824**
  (2.570 concursos y 9.254 concesiones directas o nominativas).
- Importe concedido registrado en las compatibles: **859.158.974 €**
  (527.608.733 € en concursos y 331.550.241 € en concesiones directas). Concesiones registradas desde 2022-01-01: la BDNS solo publica las de los últimos cuatro años.
- Sin contar formación (escuelas de música, conservatorios, becas), que no es para el promotor: 10.093 convocatorias y 648.642.034 € concedidos.
- Mencionan expresamente el estilo: jazz 426, clásica 3.251, ópera y lírica 427. El resto son ayudas de música en general.
- Concursos con el plazo abierto hoy: **39**; por abrir: **10**.
- Convocatorias que se repiten año tras año (series): 1.900; previstas en los próximos 3 meses según su
  historial (estimación): 68.
- Concursos generales de cultura (desde 2023) en los que un concierto puede encajar: 1.840.

## Por año (compatibles con jazz, clásica u ópera)

| Año | Convocatorias | Concursos | Directas | Presupuesto declarado | Concedido registrado |
|---|---:|---:|---:|---:|---:|
| 2014 | 5 | 0 | 5 | 153.999 € | 0 € |
| 2015 | 5 | 0 | 5 | 111.200 € | 0 € |
| 2016 | 530 | 122 | 408 | 52.746.106 € | 0 € |
| 2017 | 840 | 176 | 664 | 103.475.150 € | 385 € |
| 2018 | 984 | 171 | 813 | 112.601.500 € | 678.437 € |
| 2019 | 1.080 | 180 | 900 | 136.119.698 € | 155.000 € |
| 2020 | 874 | 194 | 680 | 201.428.082 € | 54.487 € |
| 2021 | 1.064 | 236 | 828 | 197.676.470 € | 46.123.412 € |
| 2022 | 1.156 | 267 | 889 | 187.813.713 € | 163.103.625 € |
| 2023 | 1.337 | 308 | 1.029 | 194.535.516 € | 164.137.166 € |
| 2024 | 1.406 | 330 | 1.076 | 220.192.455 € | 191.709.550 € |
| 2025 | 1.470 | 317 | 1.153 | 259.494.941 € | 217.312.510 € |
| 2026 (en curso) | 1.073 | 269 | 804 | 174.071.250 € | 75.884.403 € |

El concedido de los años recientes crece con el tiempo: las concesiones se registran meses después de la convocatoria.

## Qué financian (compatibles)

| Actividad | Convocatorias | Concursos | Concedido registrado |
|---|---:|---:|---:|
| Sin especificar | 7.695 | 758 | 363.555.613 € |
| Festivales, ciclos y programación | 1.747 | 584 | 198.574.134 € |
| Formación (escuelas, conservatorios, becas) | 1.731 | 935 | 210.516.940 € |
| Producción y creación | 603 | 516 | 143.432.190 € |
| Internacionalización | 485 | 216 | 63.238.039 € |
| Equipamiento e inversiones | 403 | 195 | 65.953.115 € |
| Giras y circulación | 266 | 224 | 80.648.558 € |
| Grabación | 190 | 169 | 20.219.748 € |
| Composición y encargos | 103 | 89 | 47.909.650 € |

Una convocatoria puede financiar varias actividades. La formación (escuelas de música y conservatorios) concentra
importes altos pero no es una oportunidad para el promotor.

## Por comunidad autónoma

| Ámbito | Convocatorias | Concursos | Concedido registrado |
|---|---:|---:|---:|
| Cataluña | 2.593 | 515 | 287.810.112 € |
| Comunitat Valenciana | 2.291 | 483 | 144.717.610 € |
| Canarias | 912 | 84 | 78.415.897 € |
| Andalucía | 815 | 123 | 31.814.585 € |
| Galicia | 763 | 206 | 32.626.206 € |
| Castilla y León | 557 | 109 | 9.385.900 € |
| Castilla-La Mancha | 544 | 66 | 9.634.552 € |
| País Vasco | 524 | 131 | 35.324.627 € |
| Aragón | 467 | 129 | 9.214.469 € |
| Sin restricción territorial | 367 | 127 | 90.463.315 € |
| Región de Murcia | 350 | 36 | 14.242.022 € |
| Illes Balears | 318 | 95 | 18.638.696 € |
| Principado de Asturias | 291 | 76 | 29.671.590 € |
| Extremadura | 275 | 72 | 15.552.244 € |
| Comunidad de Madrid | 257 | 109 | 20.771.822 € |
| Comunidad Foral de Navarra | 239 | 117 | 26.613.853 € |
| La Rioja | 129 | 23 | 1.355.604 € |
| Cantabria | 118 | 57 | 1.782.678 € |
| Ceuta | 44 | 12 | 354.792 € |
| Melilla | 13 | 4 | 768.400 € |

## Por administración

| Administración | Convocatorias | Concursos | Concedido registrado |
|---|---:|---:|---:|
| local | 9.893 | 1.733 | 289.048.794 € |
| autonomica | 1.659 | 748 | 480.833.043 € |
| estatal | 190 | 36 | 88.958.440 € |
| otra | 82 | 53 | 318.697 € |

## Quién puede pedir los concursos

| Beneficiarios admitidos | Concursos |
|---|---:|
| Autónomos y empresas | 667 |
| Asociaciones y fundaciones | 1.143 |
| Personas físicas (músicos: premios, concursos, becas) | 975 |
| Ayuntamientos y entidades locales | 243 |

Un concurso puede admitir varios tipos de beneficiario.

## Importes típicos

- Mediana del presupuesto declarado de los concursos: 50.000 €.
- Mediana de lo concedido a una entidad en una convocatoria: 5.658 €.

## Mes en que abren los concursos

| Mes | Concursos |
|---|---:|
| enero | 90 |
| febrero | 113 |
| marzo | 199 |
| abril | 156 |
| mayo | 122 |
| junio | 124 |
| julio | 94 |
| agosto | 50 |
| septiembre | 104 |
| octubre | 76 |
| noviembre | 36 |
| diciembre | 41 |

## Organismos que más han concedido

| Organismo | Entidad | Convocatorias | Años | Concedido registrado |
|---|---|---:|---|---:|
| SECRETARÍA AUTONÓMICA DE EDUCACIÓN | COMUNITAT VALENCIANA | 50 | 2016-2026 | 81.381.520 € |
| INSTITUTO NACIONAL DE LAS ARTES ESCÉNICAS Y DE LA MÚSICA | MINISTERIO DE CULTURA | 100 | 2014-2025 | 75.009.017 € |
| INSTITUT CATALÀ DE LES EMPRESES CULTURALS (ICEC) | CATALUÑA | 198 | 2016-2026 | 70.656.994 € |
| OFICINA DE SUPORT A LA INICIATIVA CULTURAL | CATALUÑA | 120 | 2018-2026 | 68.183.771 € |
| DEPARTAMENT D'EDUCACIÓ I FORMACIÓ PROFESSIONAL | CATALUÑA | 34 | 2017-2026 | 66.506.097 € |
| CABILDO INSULAR DE GRAN CANARIA | CABILDO INSULAR DE GRAN CANARIA | 348 | 2016-2026 | 46.550.800 € |
| DEPARTAMENT DE CULTURA | CATALUÑA | 38 | 2017-2026 | 42.045.963 € |
| DEPARTAMENTO DE EDUCACION | COMUNIDAD FORAL DE NAVARRA | 27 | 2016-2026 | 18.869.370 € |
| FUNDACIÓN MUNICIPAL DE CULTURA | OVIEDO | 25 | 2016-2026 | 17.775.000 € |
| DIPUTACIÓN PROVINCIAL DE CORUÑA, A | DIPUTACIÓN PROV. DE A CORUÑA | 72 | 2016-2026 | 17.108.959 € |
| DIPUTACIÓN PROVINCIAL DE VALENCIA | DIPUTACIÓN PROV. DE VALENCIA | 79 | 2016-2026 | 16.787.666 € |
| AYUNTAMIENTO DE BILBAO | BILBAO | 82 | 2017-2026 | 16.557.257 € |
| CONSEJERÍA DE CULTURA Y DEPORTE | ANDALUCÍA | 18 | 2021-2026 | 14.799.875 € |
| DIPUTACIÓN PROVINCIAL DE TARRAGONA | DIPUTACIÓN PROV. DE TARRAGONA | 93 | 2016-2026 | 14.595.216 € |
| DIPUTACIÓN PROVINCIAL DE ALACANT/ALICANTE | DIPUTACIÓN PROV. DE ALICANTE | 98 | 2016-2026 | 12.785.901 € |
| CABILDO INSULAR DE TENERIFE | CABILDO INSULAR DE TENERIFE | 67 | 2016-2026 | 12.658.970 € |
| SECRETARÍA GENERAL DE CULTURA | EXTREMADURA | 69 | 2020-2026 | 11.518.296 € |
| ÁREA DE GOBIERNO DE CULTURA, TURISMO Y DEPORTE | MADRID | 4 | 2021-2025 | 9.507.976 € |
| CONSEJERÍA DE CULTURA, TURISMO Y DEPORTE | COMUNIDAD DE MADRID | 34 | 2016-2026 | 9.266.967 € |
| INSTITUT VALENCIÀ DE CULTURA (IVC) | COMUNITAT VALENCIANA | 46 | 2018-2026 | 7.889.904 € |
