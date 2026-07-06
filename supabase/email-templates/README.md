# Wallet Supabase Email Templates

## Email OTP sin link

Para que Supabase no mande el correo de magic link con `localhost`, pega el contenido de:

```txt
supabase/email-templates/wallet-otp.html
```

en Supabase:

```txt
Authentication > Email Templates > Magic Link
```

El template usa `{{ .Token }}` y no `{{ .ConfirmationURL }}`. Eso hace que Supabase mande un código OTP que el usuario escribe dentro de Wallet.

Tambien revisa:

```txt
Authentication > URL Configuration
Site URL: https://wallet-finance-ai.vercel.app
Redirect URLs: https://wallet-finance-ai.vercel.app/**
```

Aunque el login por OTP no necesita abrir un link, cambiar el Site URL evita que otros correos de Supabase sigan mostrando `localhost`.

## Telefono Chile

El login por SMS queda desactivado en la UI porque requiere configurar un proveedor SMS compatible en Supabase. El flujo estable actual es correo + codigo.
