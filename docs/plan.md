# Plan por fases

Plan de trabajo del proyecto. Se avanza **una fase cada vez**; cada fase termina con algo que funciona, tests y una
revisión con datos reales antes de pasar a la siguiente. Las casillas marcan lo hecho.

Regla de oro, en todas las fases: **no se inventa ningún dato**. Todo lo que ve el usuario sale de una fuente
oficial enlazada, o de un cálculo sobre esos datos que se explica. Si algo se deduce (por ejemplo, la fecha prevista
de una convocatoria), se marca como estimación.

---

## Hacia dónde vamos: lo que verá el promotor al final

Un promotor que mueve grupos de jazz, clásica u ópera entra y encuentra, ordenado y en pocos clics:

| Sección | Qué responde | Qué muestra |
|---|---|---|
| **Inicio** | «¿Qué tengo que hacer esta semana?» | Plazos que vencen, convocatorias nuevas desde la última visita, previstas para los próximos meses y estado de sus solicitudes |
| **Oportunidades** | «¿A qué me puedo presentar?» | Listado con filtros (estilo, territorio, plazo, importe, qué financia, tipo de beneficiario), búsquedas guardadas y la razón de cada encaje |
| **Ficha de convocatoria** | «¿Me conviene y qué necesito?» | Ver detalle abajo |
| **Calendario** | «¿Cuándo sale cada cosa?» | Plazos abiertos y convocatorias **previstas** según su historial (p. ej. «suele abrir en marzo»), exportable a Google Calendar/Outlook |
| **Mapa** | «¿Dónde hay dinero para conciertos?» | Oportunidades y concesiones por municipio, provincia y comunidad |
| **Organismos** | «¿Quién paga conciertos y cuánto?» | Ficha de cada ayuntamiento, diputación, consejería o instituto: qué música financia, cuánto por año, a quién, cuándo convoca y su sede electrónica |
| **Mercado y precedentes** | «¿Quién está cobrando por esto?» | Concesiones a festivales, ciclos y entidades parecidas, importes medios por tipo de ayuda y territorio, rankings y tendencias |
| **Contratación** | «¿Quién contrata conciertos?» | Licitaciones abiertas de programación musical, adjudicaciones pasadas con importe y empresa adjudicataria |
| **Mis grupos** | «¿Qué le sirve a cada grupo?» | Perfil de cada formación (estilo, tamaño, repertorio, territorios) y sus oportunidades, incluidas las de sus músicos (premios, concursos) |
| **Mis solicitudes** | «¿En qué punto está cada una?» | Tablero: interesa → preparando → presentada → resuelta → justificada → cobrada, con documentos, fechas clave y recordatorios |
| **Alertas** | «Avísame» | Email y WhatsApp con nuevas convocatorias que encajan, plazos que vencen y justificaciones pendientes |
| **Tramitación** | «Que lo hagan por mí» | Encargo de la solicitud al equipo, con cobro solo si se concede |

**Ficha de convocatoria** (el corazón del producto), organizada en pestañas o bloques:

1. **Resumen en 5 líneas**: qué financia, para quién, cuánto, hasta cuándo y si encaja con sus grupos (y por qué).
2. **Plazos**: presentación, resolución prevista, ejecución de la actividad y justificación.
3. **Dinero**: presupuesto total, importe máximo por solicitud, % financiable, si hay anticipo o se cobra tras
   justificar, compatibilidad con otras ayudas y régimen de minimis.
4. **Requisitos**: tipo de beneficiario, domicilio, antigüedad, ediciones previas, número de actuaciones…
5. **Qué gastos cubre**: cachés, desplazamientos, alojamiento, técnica, promoción… y cuáles no.
6. **Criterios de valoración**: con su peso en puntos, para preparar la memoria.
7. **Documentación**: lista de comprobación (memoria, presupuesto, certificados de Hacienda y Seguridad Social…).
8. **Cómo presentarla**: sede electrónica, registro y necesidad de certificado digital.
9. **Historial**: la misma convocatoria en años anteriores (fechas, presupuesto) y **a quién se concedió y cuánto**.
10. **Fuentes**: ficha BDNS, bases reguladoras, extracto en el boletín y documentos, con la página de la que sale
    cada dato.

---

## Fase 0 · Base y datos de la BDNS (en curso)

**Objetivo:** tener todas las convocatorias de música de la BDNS, actualizadas a diario, y una primera web.

- [x] Cliente de la API de la BDNS comprobado contra la API real.
- [x] Recolector con histórico desde 2014 y actualización diaria en GitHub Actions.
- [x] Concesiones (quién cobró y cuánto), con personas físicas anonimizadas.
- [x] Clasificador de música por reglas ajustado con títulos reales.
- [x] Perfil del promotor y recomendaciones por bloques; web con Para ti, Explorar y Mi perfil.
- [ ] Terminar la descarga del histórico (en marcha en GitHub Actions).
- [ ] Informe del nicho con las cifras reales: convocatorias por año, territorio, administración, importes, plazos.

**Terminado cuando:** el histórico está completo, el workflow diario funciona varios días seguidos sin fallos y el
informe de cifras está en `docs/`.

---

## Fase 1 · Datos fiables y completos

**Objetivo:** que no falte ninguna convocatoria relevante y que la clasificación sea medible.

1. **Conjunto de evaluación.** Etiquetar a mano unas 300 convocatorias reales (¿es de música?, estilos, tipo de
   beneficiario) y guardarlas en el repo. Medir precisión y cobertura del clasificador y fijar un mínimo (p. ej. 95 %
   de precisión) que los tests comprueben siempre.
2. **Convocatorias genéricas de cultura.** Muchas ayudas municipales «a actividades culturales» admiten conciertos
   sin decirlo en el título. Descargar también las de finalidad Cultura que son concursos y marcarlas como «cultura
   general».
3. **Documentos y anuncios.** Comprobar el endpoint de documentos de la BDNS y descargar las bases reguladoras y el
   extracto del boletín (texto extraído del PDF; el PDF se enlaza, no se copia).
4. **Series de convocatorias.** Unir la misma convocatoria de distintos años (mismo órgano y título parecido) para
   saber si se repite, cuándo abre normalmente y cómo evoluciona su presupuesto.
5. **Territorio exacto.** Asociar cada ayuntamiento a su municipio, provincia y comunidad con el nomenclátor oficial
   del INE, para que ninguna quede con «ámbito no indicado» y se puedan pintar en un mapa.
6. **Directorio de organismos.** Normalizar los órganos convocantes (catálogo `/organos` de la BDNS) para tener
   una ficha por organismo.
7. **Vigilancia.** Aviso si el workflow diario falla o si la BDNS cambia el formato de sus respuestas.

**Terminado cuando:** el clasificador supera el mínimo fijado en el conjunto de evaluación, todas las convocatorias
tienen territorio, y las series muestran el historial de las convocatorias recurrentes.

---

## Fase 2 · Ficha completa con IA

**Objetivo:** extraer de las bases todo lo que el promotor necesita (bloques 2 a 8 de la ficha) sin leerse el PDF.

1. Extracción estructurada con un modelo de lenguaje (Claude) a partir del texto de las bases y el extracto:
   importes, plazos, requisitos, gastos subvencionables, criterios con puntos, documentación, forma de pago y
   justificación.
2. **Cada dato con su cita**: fragmento y página del documento de origen. Si el documento no lo dice, se muestra
   «no consta», nunca una suposición.
3. Validación: comparar con 50 fichas revisadas a mano, medir aciertos por campo y marcar como «revisar» lo dudoso.
4. Coste controlado: solo convocatorias de música abiertas, próximas o recurrentes. Coste medido con una muestra antes
   de procesar todo.
5. Resumen en 5 líneas y explicación del encaje con cada grupo del promotor.

**Terminado cuando:** las convocatorias abiertas tienen ficha completa con citas, y los campos clave (plazos,
importes, beneficiarios) superan el nivel de acierto acordado.

---

## Fase 3 · Nueva web: ordenada, completa y fácil de navegar

**Objetivo:** pasar de tres pestañas a la estructura de secciones de la tabla inicial.

1. Navegación con rutas y URL propias (cada convocatoria, organismo y grupo tiene su página, que se puede compartir).
2. **Inicio** con lo urgente; **Oportunidades** con filtros guardados; **Ficha de convocatoria** completa.
3. **Calendario** (abiertas y previstas) con exportación iCal, y **Mapa** por municipio y provincia.
4. **Organismos** y **Mercado y precedentes** con gráficos (importes por año, por territorio, por tipo de ayuda).
5. **Mis grupos**: perfil por formación y recomendaciones por grupo.
6. Búsqueda en todo el texto, rápida (índice de texto completo en la base de datos, no filtros en memoria).
7. Diseño cuidado: móvil primero, modo oscuro, accesible (teclado, contraste, lectores de pantalla) y en español claro,
   sin jerga administrativa o explicándola.
8. Pruebas de uso con **3 a 5 promotores reales** y cambios según lo que digan.

**Terminado cuando:** un promotor que no conoce la herramienta encuentra en menos de 2 minutos las ayudas abiertas para
uno de sus grupos y entiende qué necesita para pedirlas.

---

## Fase 4 · Contratación pública: quién contrata conciertos

**Objetivo:** añadir la otra gran fuente de dinero público para conciertos, los contratos (cachés, programación de
fiestas y temporadas).

1. Comprobar el acceso a los datos abiertos de la Plataforma de Contratación del Sector Público y los códigos CPV de
   servicios artísticos y de organización de eventos que interesan.
2. Licitaciones **abiertas** de programación musical, con plazo, importe y pliegos.
3. **Adjudicaciones históricas**: qué organismo contrató, qué, por cuánto y a qué empresa (la competencia del promotor).
4. Integrarlo en Oportunidades, Calendario, Organismos y Mercado.

**Terminado cuando:** las licitaciones de servicios musicales se descargan a diario y la ficha de cada organismo muestra
subvenciones y contratos juntos.

---

## Fase 5 · Circuitos, festivales y programadores

**Objetivo:** saber dónde colocar a los grupos, más allá de convocatorias y contratos.

1. Circuitos públicos de programación (PLATEA del INAEM y redes autonómicas de teatros y auditorios): comprobar qué
   publican, cómo se accede y con qué condiciones.
2. Directorio de **festivales y ciclos** construido con los propios datos (quién recibe subvenciones o contratos para
   un festival de jazz, clásica u ópera, dónde y desde cuándo).
3. Espacios y programadores públicos, con su historial de programación financiada.

**Terminado cuando:** desde la ficha de un grupo se ven festivales, circuitos y programadores compatibles, cada uno con
su fuente.

---

## Fase 6 · Producto multiusuario en internet

**Objetivo:** que cualquier promotor pueda darse de alta y usarlo desde cualquier sitio.

1. Base de datos PostgreSQL y servidor desplegado; la descarga diaria escribe directamente en la base de datos.
2. Cuentas de usuario (email y contraseña o enlace mágico), varios perfiles y grupos por cuenta.
3. Seguridad, copias de seguridad, registros de errores y monitorización.
4. Legal: aviso legal y política de privacidad (RGPD), condiciones de uso y atribución a la BDNS según su aviso de
   reutilización.

**Terminado cuando:** está publicado con dominio propio, con cuentas, copias de seguridad automáticas y textos legales.

---

## Fase 7 · Alertas por email y WhatsApp

**Objetivo:** que el promotor no tenga que entrar para enterarse.

1. Alertas configurables por grupo, territorio, estilo e importe mínimo.
2. Resumen semanal por email y aviso inmediato de las que encajan mucho.
3. Recordatorios de plazos (a 15, 7 y 2 días) y de justificaciones pendientes.
4. WhatsApp con la API oficial de WhatsApp Business (plantillas aprobadas por Meta y consentimiento expreso).

**Terminado cuando:** una convocatoria nueva que encaja llega al promotor por el canal elegido el mismo día de su
registro en la BDNS.

---

## Fase 8 · Gestión de solicitudes

**Objetivo:** acompañar al promotor después de encontrar la ayuda.

1. Tablero de solicitudes con estados y fechas clave.
2. Lista de documentación por convocatoria (de la Fase 2) y repositorio de documentos reutilizables (certificados,
   estatutos, dossier de los grupos), con avisos de caducidad.
3. Plantillas de memoria y presupuesto adaptadas a los criterios de valoración.
4. Seguimiento de la resolución y de la justificación, con recordatorios.

**Terminado cuando:** un promotor puede llevar una solicitud de principio a fin (encontrar, preparar, presentar,
justificar) sin salir de la herramienta, salvo para el registro oficial.

---

## Fase 9 · Servicio de tramitación y modelo de negocio

**Objetivo:** ofrecer «lo tramitamos nosotros y solo cobramos si sale».

1. Definir el servicio: qué incluye (solicitud, subsanaciones, justificación), qué se cobra (porcentaje de lo
   **cobrado**, con un mínimo por expediente) y qué riesgos asume cada parte (reintegros).
2. Contrato de encargo y representación ante la administración (apoderamiento en el registro electrónico de
   apoderamientos).
3. Flujo en la web: encargar → firmar → seguimiento → factura al cobrar, con pagos integrados (p. ej. Stripe).
4. Suscripción para las funciones avanzadas (alertas, fichas con IA, mercado), si se decide así.
5. Métricas: usuarios activos, solicitudes, tasa de concesión, ingresos.

**Terminado cuando:** hay un primer expediente tramitado y cobrado de principio a fin con el flujo de la web.

---

## Fase 10 · Otros sectores

**Objetivo:** el objetivo inicial, cualquier subvención para cualquier empresa.

1. Generalizar clasificación y perfil (sector CNAE, tipo de empresa, objetivo: contratar, digitalizar, exportar…).
2. Descargar toda la BDNS, no solo cultura (657.261 convocatorias registradas en octubre de 2026).
3. Elegir los siguientes sectores por demanda y repetir el patrón de las fases 1 a 3 en cada uno.

---

## Trabajo transversal (en todas las fases)

- Tests automáticos con datos reales y comprobación de tipos en cada cambio; integración continua en GitHub Actions.
- Documentación al día (`README.md`, `docs/`).
- Revisión de privacidad: nunca guardar datos de personas físicas beneficiarias.
- Cada fase termina con una demo con datos reales y una lista de lo aprendido.

## Decisiones pendientes

| Decisión | Cuándo hace falta |
|---|---|
| Repositorio público o privado | Ya (los datos y el código son visibles mientras sea público) |
| Presupuesto mensual para IA (Fase 2) | Antes de la Fase 2 |
| Nombre, dominio y marca | Antes de la Fase 6 |
| Dónde alojarlo (p. ej. Supabase + Vercel) y presupuesto de hosting | Antes de la Fase 6 |
| Proveedor de email y alta en WhatsApp Business | Antes de la Fase 7 |
| Condiciones del servicio de tramitación (porcentaje, mínimo, alcance) | Antes de la Fase 9 |
