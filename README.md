# Wallet

Web app full-stack de control financiero personal con estética Apple Wallet, cuenta obligatoria, Supabase, OpenAI API y arquitectura bancaria preparada para providers read-only.

## Stack

- Next.js 14+ con App Router
- React, TypeScript y Tailwind CSS
- Componentes estilo shadcn/ui
- Framer Motion
- Recharts
- Supabase Auth/PostgreSQL/RLS
- OpenAI API con fallback mock
- Providers bancarios preparados: SimpleFIN Bridge, Fintoc, Plaid, GoCardless, SaltEdge, TrueLayer y Tink
- PWA instalable
- Service worker para instalacion y recursos estaticos
- Vercel-ready

## Desarrollo local

```bash
npm install
npm run dev
npm run build
```

## Deploy

```bash
vercel deploy
vercel --prod
```

Cada push al repositorio conectado en Vercel actualiza automáticamente el link público de producción del proyecto.

## Variables de entorno

Copia `.env.example` a `.env.local` y completa las claves necesarias:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
PLAID_CLIENT_ID=
PLAID_SECRET=
GOCARDLESS_SECRET_ID=
GOCARDLESS_SECRET_KEY=
SALTEDGE_APP_ID=
SALTEDGE_SECRET=
TRUELAYER_CLIENT_ID=
TRUELAYER_CLIENT_SECRET=
TINK_CLIENT_ID=
TINK_CLIENT_SECRET=
FINTOC_API_KEY=
NEXT_PUBLIC_FINTOC_PUBLIC_KEY=
BANK_TOKEN_ENCRYPTION_KEY=
INBOUND_EMAIL_DOMAIN=
INBOUND_EMAIL_PROVIDER=
INBOUND_EMAIL_WEBHOOK_SECRET=
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
```

La app requiere Supabase para crear cuentas. Si `OPENAI_API_KEY` no existe o falla, `Wallet Assistant` responde con un fallback sin inventar datos financieros.

## Modo real con bancos

Wallet ya incluye un panel de **Banca real y sincronización**. El flujo real es:

1. Configura Supabase y ejecuta `lib/supabase/schema.sql`.
2. Activa Supabase Auth con email OTP. Opcionalmente activa Google/Apple SSO y Passkeys para FaceID/WebAuthn.
3. Configura `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Configura `BANK_TOKEN_ENCRYPTION_KEY` con un valor secreto largo.
5. Entra a la app con correo + codigo, SSO o passkey.
6. Para conectar sin clave de API de proveedor propia, abre SimpleFIN Bridge desde la app, autoriza el banco y pega el setup token.
7. Para Chile con proveedor nativo, configura `FINTOC_API_KEY` y pega el `link_token` de cada conexión.
8. Usa “Actualizar bancos” para traer saldos y movimientos. El saldo total se refresca en tiempo real cuando Supabase recibe cambios.

Cada banco conectado queda como una fila independiente en `bank_connections`, por lo que la app soporta múltiples bancos y múltiples cuentas. Los tokens bancarios se guardan cifrados y se usan solo desde endpoints backend.

La app no guarda claves bancarias ni permite transferencias. Solo lee saldos y movimientos.

## Banco sandbox de prueba

Para probar el linkeo bancario sin credenciales reales, usa:

```txt
Usuario: wallet_test
Clave: read-only-2026
```

Estas credenciales son solo de Wallet Sandbox Bank. Crean cuentas, movimientos y saldos de prueba dentro de Supabase para validar dashboard, IA y sincronización. No son credenciales bancarias reales.

No se deben pedir ni guardar claves reales de bancos. Para bancos reales usa Fintoc, SimpleFIN u otro proveedor read-only/OAuth.

## Edicion y borrado

Wallet permite editar y borrar:

- cuentas
- saldos manuales
- movimientos
- categorias
- notas

Al borrar una cuenta tambien se eliminan sus movimientos asociados por la relacion de base de datos.

## Cuenta, codigo por correo/SMS, FaceID y SSO

Wallet soporta:

- email OTP con codigo de 6 digitos
- SMS OTP para celulares chilenos si Supabase Phone Auth esta activo con Twilio
- Google SSO
- Apple SSO
- passkeys/WebAuthn para FaceID, TouchID, PIN o llave física

Las passkeys requieren activar la opción en Supabase Auth y configurar el dominio de producción como origen permitido.

Para que Supabase envie codigo y no magic link, pega la plantilla:

```txt
supabase/email-templates/wallet-otp.html
```

en:

```txt
Authentication > Email Templates > Magic Link
```

La plantilla usa `{{ .Token }}`. No uses `{{ .ConfirmationURL }}` si quieres codigo.

Tambien configura:

```txt
Authentication > URL Configuration
Site URL: https://wallet-finance-ai.vercel.app
Redirect URLs: https://wallet-finance-ai.vercel.app/**
```

Para SMS Chile, activa Phone Auth en Supabase y configura Twilio como proveedor SMS. La app acepta `+56912345678`, `912345678` o `09...` y normaliza a formato internacional `+56`.

## Presupuestos, gastos y deudas

La app pregunta y guarda:

- nombre, país, moneda y banco principal
- presupuesto diario
- presupuesto semanal
- presupuesto mensual
- presupuesto para evento determinado
- gastos diarios, semanales, mensuales, anuales y por evento
- deudas y deudores

## Supabase

El esquema inicial está en:

```bash
lib/supabase/schema.sql
```

Incluye tablas principales y políticas RLS por `auth.uid()`.

## Seguridad bancaria

Wallet no pide ni almacena credenciales bancarias reales. Las conexiones bancarias deben implementarse mediante OAuth, tokenización o intermediarios read-only. Los providers en `lib/bank-providers/` usan mock inicialmente y dejan preparada la interfaz:

- `connectAccount()`
- `syncBalances()`
- `syncTransactions()`
- `refreshConnection()`
- `disconnectAccount()`

## Apple Wallet Sync

Como web app no puede sincronizar Apple Wallet de forma completa como una app nativa. La app deja preparado:

- importación CSV
- pagos Apple Pay manuales
- registro rápido
- compatibilidad futura con Shortcuts
- PWA instalable en iPhone

## Automatizacion por correo y cartolas

La seccion **Automatizar** permite:

- crear un alias privado por usuario
- iniciar la comprobacion del reenvio
- subir cartolas PDF de hasta 10 MB
- validar MIME, hash y acciones PDF peligrosas
- extraer filas y conservar pagina/confianza
- importar movimientos provisionales
- detectar candidatos duplicados y conciliar por puntuacion

Las cartolas se guardan en un bucket privado de Supabase con politicas por usuario. La migracion es `supabase/migrations/20260710180000_wallet_automation.sql`.

La opcion recomendada es Resend Receiving. Permite comenzar con su dominio administrado `*.resend.app`, sin comprar un dominio. Configura en Vercel `INBOUND_EMAIL_DOMAIN`, `INBOUND_EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET` y `SUPABASE_SERVICE_ROLE_KEY`. Registra el evento `email.received` con el endpoint `https://wallet-finance-ai.vercel.app/api/inbound-email/resend`.

El endpoint verifica las firmas Svix antes de recuperar el contenido completo mediante la API de Resend. Los mensajes crean movimientos provisionales; nunca quedan confirmados automaticamente solo por llegar por email.

Wallet no solicita contrasenas bancarias ni acceso completo al correo.
