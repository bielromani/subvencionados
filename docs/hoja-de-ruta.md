# Hoja de ruta

## Fase 0: medir el nicho

- [x] Cliente de la BDNS comprobado contra la API real.
- [x] Recolector con histórico desde 2014 y actualización diaria en GitHub Actions.
- [x] Concesiones (quién cobró y cuánto), con personas físicas anonimizadas.
- [x] Clasificador de música ajustado con títulos reales y perfil del promotor con recomendaciones.
- [ ] Terminar la descarga del histórico y revisar a mano una muestra para medir la precisión del clasificador.
- [ ] Con las estadísticas por año, comunidad e importe, decidir si el nicho da para un negocio.

## Fase 1: datos de calidad

- [ ] Leer el PDF de las bases con un LLM para extraer requisitos, gastos subvencionables, importe máximo,
      criterios de valoración y documentación exigida.
- [ ] Incluir las convocatorias genéricas de cultura que admiten conciertos.
- [ ] Predecir cuándo se repite cada ayuda y cuánto se suele conceder, a partir del histórico.
- [ ] Contratos públicos de conciertos (Plataforma de Contratación).

## Fase 2: producto

- [ ] Cuentas de usuario y migración a PostgreSQL.
- [ ] Alertas por email y WhatsApp con las convocatorias nuevas que encajan con cada perfil (el campo
      `primeraDescarga` ya marca cuándo apareció cada una).
- [ ] Servicio de tramitación con cobro a éxito: definir «éxito» como ayuda cobrada, incluir la justificación y fijar
      un importe mínimo por expediente.

## Fase 3: más sectores

- [ ] Generalizar el clasificador y el perfil a otros sectores, con la BDNS como fuente común.
