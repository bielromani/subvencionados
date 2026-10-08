# Hoja de ruta

## Fase 0: medir el nicho (ahora)

- [x] Cliente de la BDNS, clasificador de música por reglas, perfil del promotor y recomendaciones.
- [x] Web: *Para ti*, *Explorar* y *Mi perfil*.
- [ ] Ejecutar `npm run sync -- --desde=2023-01-01` con acceso a la BDNS y ajustar el cliente a la respuesta real.
- [ ] Revisar a mano unas 200 convocatorias clasificadas para medir la precisión y corregir las reglas.
- [ ] Con las estadísticas del sync, decidir si el nicho da para un negocio: cuántas ayudas útiles al año, de qué
      importe y en qué comunidades.

## Fase 1: datos de calidad

- [ ] Descargar el PDF de las bases y extraer con un LLM los requisitos, gastos subvencionables, importe máximo,
      criterios de valoración y documentación exigida.
- [ ] Ingesta diaria programada y detección de convocatorias nuevas (el campo `vistaPorPrimeraVez` ya existe).
- [ ] Histórico de concesiones de la BDNS para predecir cuándo se repite cada ayuda y cuánto se suele conceder.
- [ ] Contratos públicos de conciertos (Plataforma de Contratación).

## Fase 2: producto

- [ ] Cuentas de usuario (varios promotores) y migración a PostgreSQL.
- [ ] Alertas por email y por WhatsApp (WhatsApp Business API con plantillas aprobadas).
- [ ] Servicio de tramitación con cobro a éxito: definir «éxito» como ayuda cobrada, incluir la justificación y fijar
      un importe mínimo por expediente.

## Fase 3: más sectores

- [ ] Generalizar el clasificador y el perfil a otros sectores, con la BDNS como fuente común.
