# Roadmap

## Fase 1: MVP actual

Estado: implementado.

- Listado de licitaciones.
- Búsqueda y filtros básicos.
- Detalle por código.
- Favoritos locales.
- Cache Supabase.
- Rate limiting.
- Health/admin endpoints.
- Dashboard inicial.

## Fase 2: Dashboard

Estado: primera versión implementada.

Próximos pasos:

- Series históricas.
- Distribución por región.
- Ranking por categoría/rubro.
- Top montos estimados.
- Export CSV.
- Filtros del dashboard por fecha, región y organismo.

## Fase 3: Alertas

- Crear alertas persistentes por usuario.
- Alertas por palabra clave, organismo, monto, región y fecha de cierre.
- Evaluación periódica.
- Notificaciones por email.
- Digest diario/semanal.

## Fase 4: Órdenes de compra

- Integrar `/ordenesdecompra.json`.
- Relacionar licitación con orden de compra.
- Mostrar adjudicaciones y proveedores.
- Métricas de conversión licitación -> OC.

## Fase 5: Autenticación de usuarios

- Supabase Auth.
- Favoritos multi-dispositivo.
- Alertas por usuario.
- Perfil y preferencias.
- Roles admin.

## Fase 6: IA

- Resumen automático de bases y descripciones.
- Clasificación por rubro.
- Recomendación de oportunidades.
- Detección de requisitos críticos.
- Score de compatibilidad proveedor-licitación.

## Fase 7: Analytics

- Historial por organismo.
- Evolución de montos.
- Estacionalidad.
- Participación por proveedor.
- Tendencias por categoría.

## Fase 8: Observabilidad

- Métricas por endpoint.
- Alertas de errores.
- Dashboard operacional.
- Monitoreo de cuota Mercado Público.
- Auditoría de cache.

## Fase 9: Notificaciones

- Email.
- WhatsApp.
- Web push.
- Calendario de cierres.
- Integración con Slack/Teams.

## Fase 10: Scraping complementario

Solo si la API no expone campos necesarios:

- Bases técnicas.
- Documentos adjuntos.
- Aclaraciones.
- Preguntas/respuestas.

Debe respetar términos de uso, robots y límites.

## Fase 11: Mobile app futura

- PWA primero.
- App móvil si hay usuarios recurrentes.
- Push notifications.
- Búsqueda guardada.

## Criterios de priorización

1. Valor visible para usuarios.
2. Bajo consumo de cuota externa.
3. Datos confiables.
4. Operación simple.
5. Escalabilidad hacia IA.

## Lecciones aprendidas

- El cache debe existir antes de agregar IA.
- El dashboard genera valor con datos existentes.
- RLS requiere grants explícitos para roles.
- La paginación mejora percepción de rendimiento.
- Health checks no deben consumir APIs con cuota.
- Las variables Vercel deben revisarse por ambiente.
