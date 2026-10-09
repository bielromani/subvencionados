# Informe del nicho: subvenciones públicas para música en España

Generado el 2026-10-09 con `npm run informe` a partir de `datos/bdns/`. Fuente: Base de
Datos Nacional de Subvenciones (BDNS). Las convocatorias se clasifican por reglas (ver
`server/src/clasificacion/musica.ts`); la precisión medida está en `docs/evaluacion-clasificador.md`.

## Resumen

- Periodo cubierto: 2014-01-15 a 2026-10-08.
- Convocatorias de música: **13.295**; compatibles con jazz, clásica u ópera: **10.047**
  (2.277 concursos y 7.770 concesiones directas o nominativas).
- Importe concedido registrado en las compatibles: **773.569.334 €**
  (457.109.178 € en concursos y 316.460.156 € en concesiones directas). Concesiones registradas desde 2022-01-01: la BDNS solo publica las de los últimos cuatro años.
- Sin contar formación (escuelas de música, conservatorios, becas), que no es para el promotor: 8.394 convocatorias y 577.360.794 € concedidos.
- Mencionan expresamente el estilo: jazz 414, clásica 2.028, ópera y lírica 403. El resto son ayudas de música en general.
- Concursos con el plazo abierto hoy: **38**; por abrir: **7**.
- Convocatorias que se repiten año tras año (series): 1.587; previstas en los próximos 3 meses según su
  historial (estimación): 56.
- Concursos generales de cultura (desde 2023) en los que un concierto puede encajar: 10.

## Por año (compatibles con jazz, clásica u ópera)

| Año | Convocatorias | Concursos | Directas | Presupuesto declarado | Concedido registrado |
|---|---:|---:|---:|---:|---:|
| 2014 | 5 | 0 | 5 | 153.999 € | 0 € |
| 2015 | 5 | 0 | 5 | 111.200 € | 0 € |
| 2016 | 458 | 120 | 338 | 51.624.983 € | 0 € |
| 2017 | 725 | 175 | 550 | 101.783.400 € | 385 € |
| 2018 | 845 | 169 | 676 | 109.450.583 € | 678.437 € |
| 2019 | 940 | 174 | 766 | 134.160.040 € | 150.000 € |
| 2020 | 770 | 194 | 576 | 199.977.053 € | 54.487 € |
| 2021 | 943 | 234 | 709 | 195.410.696 € | 46.110.912 € |
| 2022 | 1.023 | 264 | 759 | 185.570.424 € | 161.094.904 € |
| 2023 | 1.099 | 248 | 851 | 174.485.351 € | 146.622.009 € |
| 2024 | 1.153 | 258 | 895 | 184.320.590 € | 162.863.601 € |
| 2025 | 1.213 | 245 | 968 | 230.959.182 € | 192.361.537 € |
| 2026 (en curso) | 868 | 196 | 672 | 149.766.778 € | 63.633.061 € |

El concedido de los años recientes crece con el tiempo: las concesiones se registran meses después de la convocatoria.

## Qué financian (compatibles)

| Actividad | Convocatorias | Concursos | Concedido registrado |
|---|---:|---:|---:|
| Sin especificar | 6.289 | 700 | 349.799.511 € |
| Formación (escuelas, conservatorios, becas) | 1.653 | 866 | 196.208.541 € |
| Festivales, ciclos y programación | 1.505 | 458 | 147.112.274 € |
| Producción y creación | 481 | 396 | 109.963.905 € |
| Internacionalización | 431 | 168 | 53.970.577 € |
| Equipamiento e inversiones | 355 | 149 | 59.001.210 € |
| Giras y circulación | 231 | 193 | 65.152.934 € |
| Grabación | 165 | 144 | 15.207.021 € |
| Composición y encargos | 69 | 58 | 38.805.024 € |

Una convocatoria puede financiar varias actividades. La formación (escuelas de música y conservatorios) concentra
importes altos pero no es una oportunidad para el promotor.

## Por comunidad autónoma

| Ámbito | Convocatorias | Concursos | Concedido registrado |
|---|---:|---:|---:|
| Comunitat Valenciana | 2.073 | 449 | 128.324.139 € |
| Cataluña | 1.814 | 471 | 269.245.613 € |
| Canarias | 854 | 56 | 68.961.351 € |
| Andalucía | 745 | 117 | 28.484.435 € |
| Galicia | 673 | 180 | 32.162.490 € |
| Castilla-La Mancha | 514 | 61 | 9.018.544 € |
| Castilla y León | 474 | 81 | 4.922.476 € |
| País Vasco | 450 | 124 | 33.949.740 € |
| Aragón | 399 | 110 | 7.554.692 € |
| Sin restricción territorial | 327 | 116 | 83.474.664 € |
| Illes Balears | 284 | 76 | 12.596.520 € |
| Región de Murcia | 269 | 22 | 13.687.168 € |
| Principado de Asturias | 263 | 59 | 25.402.656 € |
| Extremadura | 240 | 61 | 13.053.387 € |
| Comunidad de Madrid | 223 | 93 | 12.048.173 € |
| Comunidad Foral de Navarra | 212 | 112 | 26.552.210 € |
| La Rioja | 125 | 21 | 1.355.604 € |
| Cantabria | 103 | 56 | 1.696.278 € |
| Ceuta | 35 | 12 | 310.792 € |
| Melilla | 13 | 4 | 768.400 € |

## Por administración

| Administración | Convocatorias | Concursos | Concedido registrado |
|---|---:|---:|---:|
| local | 8.239 | 1.490 | 228.342.752 € |
| autonomica | 1.555 | 708 | 462.650.282 € |
| estatal | 175 | 28 | 82.282.603 € |
| otra | 78 | 51 | 293.697 € |

## Quién puede pedir los concursos

| Beneficiarios admitidos | Concursos |
|---|---:|
| Autónomos y empresas | 586 |
| Asociaciones y fundaciones | 953 |
| Personas físicas (músicos: premios, concursos, becas) | 926 |
| Ayuntamientos y entidades locales | 194 |

Un concurso puede admitir varios tipos de beneficiario.

## Importes típicos

- Mediana del presupuesto declarado de los concursos: 50.000 €.
- Mediana de lo concedido a una entidad en una convocatoria: 5.880 €.

## Mes en que abren los concursos

| Mes | Concursos |
|---|---:|
| enero | 81 |
| febrero | 98 |
| marzo | 177 |
| abril | 137 |
| mayo | 113 |
| junio | 113 |
| julio | 91 |
| agosto | 46 |
| septiembre | 96 |
| octubre | 73 |
| noviembre | 36 |
| diciembre | 40 |

## Organismos que más han concedido

| Organismo | Entidad | Convocatorias | Años | Concedido registrado |
|---|---|---:|---|---:|
| SECRETARÍA AUTONÓMICA DE EDUCACIÓN | COMUNITAT VALENCIANA | 50 | 2016-2026 | 81.381.520 € |
| INSTITUTO NACIONAL DE LAS ARTES ESCÉNICAS Y DE LA MÚSICA | MINISTERIO DE CULTURA | 96 | 2014-2025 | 74.649.017 € |
| INSTITUT CATALÀ DE LES EMPRESES CULTURALS (ICEC) | CATALUÑA | 184 | 2016-2026 | 66.720.395 € |
| DEPARTAMENT D'EDUCACIÓ I FORMACIÓ PROFESSIONAL | CATALUÑA | 34 | 2017-2026 | 66.506.097 € |
| OFICINA DE SUPORT A LA INICIATIVA CULTURAL | CATALUÑA | 110 | 2018-2026 | 66.469.141 € |
| CABILDO INSULAR DE GRAN CANARIA | CABILDO INSULAR DE GRAN CANARIA | 342 | 2016-2026 | 46.499.800 € |
| DEPARTAMENT DE CULTURA | CATALUÑA | 38 | 2017-2026 | 42.045.963 € |
| DEPARTAMENTO DE EDUCACION | COMUNIDAD FORAL DE NAVARRA | 27 | 2016-2026 | 18.869.370 € |
| FUNDACIÓN MUNICIPAL DE CULTURA | OVIEDO | 25 | 2016-2026 | 17.775.000 € |
| DIPUTACIÓN PROVINCIAL DE CORUÑA, A | DIPUTACIÓN PROV. DE A CORUÑA | 72 | 2016-2026 | 17.108.959 € |
| AYUNTAMIENTO DE BILBAO | BILBAO | 54 | 2017-2026 | 16.257.257 € |
| CONSEJERÍA DE CULTURA Y DEPORTE | ANDALUCÍA | 18 | 2021-2026 | 14.799.875 € |
| DIPUTACIÓN PROVINCIAL DE ALACANT/ALICANTE | DIPUTACIÓN PROV. DE ALICANTE | 91 | 2016-2026 | 12.773.108 € |
| SECRETARÍA GENERAL DE CULTURA | EXTREMADURA | 62 | 2020-2026 | 10.614.843 € |
| DIPUTACIÓN PROVINCIAL DE TARRAGONA | DIPUTACIÓN PROV. DE TARRAGONA | 87 | 2016-2026 | 9.279.962 € |
| INSTITUT RAMON LLULL | CATALUÑA | 72 | 2017-2026 | 7.542.375 € |
| AGENCIA GALLEGA DE LAS INDUSTRIAS CULTURALES (AGADIC) | GALICIA | 57 | 2016-2026 | 7.541.088 € |
| INSTITUT VALENCIÀ DE CULTURA (IVC) | COMUNITAT VALENCIANA | 43 | 2018-2026 | 7.339.904 € |
| CONSEJERÍA DE UNIVERSIDADES, CIENCIA E INNOVACIÓN Y CULTURA | CANARIAS | 25 | 2021-2026 | 6.985.184 € |
| DEPARTAMENTO DE CULTURA, DEPORTE Y TURISMO | COMUNIDAD FORAL DE NAVARRA | 66 | 2018-2026 | 6.893.450 € |
