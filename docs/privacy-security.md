# Privacidad y seguridad

Wallet no solicita claves bancarias, PIN, coordenadas, contrasenas de correo ni acceso irrestricto a una bandeja.

## Principios

- Tokens en servidor y cifrados; secretos fuera del repositorio.
- RLS y comprobacion de usuario en cada operacion.
- Buckets privados y URLs firmadas de corta duracion.
- Webhooks firmados, rate limiting, idempotencia y correlation IDs.
- Alias no predecibles y aislamiento estricto por usuario.
- Retencion configurable para correo original, adjuntos y texto extraido.
- Auditoria sin contenido sensible.
- Enmascarado de cuentas y tarjetas, por ejemplo `**** 0101`.

El Privacy Center mostrara datos almacenados, proveedores, retencion y acciones para eliminar correos, cartolas, transacciones o la cuenta completa.
