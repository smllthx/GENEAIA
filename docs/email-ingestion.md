# Ingestion de correo

Esta fase no se implementa en la primera entrega nativa.

## Flujo propuesto

Proveedor de correo -> webhook firmado -> validacion -> identificacion del alias -> parser determinista -> normalizacion -> deduplicacion -> clasificacion -> transaccion provisional.

Cada usuario recibe un alias aleatorio no predecible. El dominio de negocio dependera de un protocolo `InboundEmailProvider`, no de SES, Mailgun, Postmark o SendGrid directamente.

## Controles obligatorios

- Firma del webhook, limite de tamano e idempotencia por Message-ID.
- SPF, DKIM, DMARC, Return-Path, destinatario y remitente registrado.
- Sanitizacion HTML y validacion MIME de adjuntos.
- Estados `trusted`, `partially_trusted`, `suspicious` y `rejected`.
- Los mensajes sospechosos nunca crean movimientos confirmados.
- No registrar cuerpos, documentos, tokens ni numeros bancarios completos.

Se requiere un dominio de recepcion y credenciales del proveedor antes de activar esta fase.
