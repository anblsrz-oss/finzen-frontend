# Ahorbit — Guía de app nativa (Capacitor) y sincronización de datos

Fase 8. La PWA React se empaqueta como app nativa con **Capacitor** y se añaden
tres vías propias de ingesta de movimientos (import CSV, correo, SMS) más el
andamiaje para un agregador Premium futuro.

> Estas notas cubren lo que hay que hacer **en tu equipo** (requiere Android
> Studio / Xcode, que no viven en el repo). El código y la config ya están listos.

---

## 1. Requisitos

- Node 18+ y el proyecto instalado (`npm install`).
- **Android**: Android Studio (SDK + emulador o teléfono con depuración USB).
- **iOS**: una **Mac** con Xcode. Sin Mac no se puede compilar iOS.

## 2. Añadir las plataformas nativas (una sola vez)

```bash
npm run build            # genera dist/
npx cap add android
npx cap add ios          # solo en Mac
```

Esto crea las carpetas `android/` e `ios/`. Después de cada cambio de código:

```bash
npm run cap:android      # build + sync + abre Android Studio
npm run cap:ios          # build + sync + abre Xcode (Mac)
```

## 3. Iconos de la app

Los iconos base ya se generan con `node scripts/gen-icons.mjs`
(`public/icon-source-1024.png` es la fuente). Para propagarlos a Android/iOS:

```bash
npm i -D @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#0f766e' --iconBackgroundColorDark '#0f766e'
```

## 4. Login con Google en la app (deep link)

El código ya cambia solo según plataforma (ver [src/lib/nativeAuth.ts](src/lib/nativeAuth.ts)).
Falta registrar el esquema `com.ahorbit.app://auth-callback` en cada plataforma:

**Android** — `android/app/src/main/AndroidManifest.xml`, dentro de la `<activity>`:

```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="com.ahorbit.app" android:host="auth-callback" />
</intent-filter>
```

**iOS** — `ios/App/App/Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array><string>com.ahorbit.app</string></array>
  </dict>
</array>
```

**Supabase** (Authentication → URL Configuration → Redirect URLs) y **Google Cloud**
(OAuth client → Authorized redirect URIs): añadir
`com.ahorbit.app://auth-callback` junto con las URLs de Vercel ya existentes.

## 5. Sincronizar correo (Gmail) — multiplataforma

- Función: [src/features/email/EmailSyncPage.tsx](src/features/email/EmailSyncPage.tsx),
  Edge Function [supabase/functions/sync-email/index.ts](supabase/functions/sync-email/index.ts).
- Requiere el scope `https://www.googleapis.com/auth/gmail.readonly`. El botón
  "Conectar Gmail" ya lo pide. En Google Cloud, habilita la **Gmail API** y agrega
  ese scope en la pantalla de consentimiento OAuth.
- Desplegar la función: `npx supabase functions deploy sync-email` (usa
  `SUPABASE_URL` y `SUPABASE_ANON_KEY`, ya presentes en el entorno de Functions).
- El usuario configura remitentes por banco (se guardan en `parsing_rules`,
  `channel='email'`). Los movimientos entran como **pendientes**.

## 6. Sincronizar SMS — solo Android

- Función: [src/lib/smsSync.ts](src/lib/smsSync.ts) +
  [src/features/sms/SmsSyncPage.tsx](src/features/sms/SmsSyncPage.tsx).
- Instala un lector de inbox y sincroniza:
  ```bash
  npm i capacitor-sms-inbox
  npx cap sync android
  ```
- Declara el permiso en `AndroidManifest.xml`:
  ```xml
  <uses-permission android:name="android.permission.READ_SMS" />
  ```
- En iOS/web la pantalla muestra un aviso de "no disponible" automáticamente.

## 7. Base de datos

Aplica la migración [supabase/migrations/0002_ingestion.sql](supabase/migrations/0002_ingestion.sql)
en Supabase (SQL Editor o `supabase db push`). Es idempotente. Agrega a
`transactions` los campos `source / external_id / pending / raw_ref`, crea
`statement_imports`, `import_staging`, `parsing_rules`, `bank_connections`, y
recrea las vistas de saldo para **excluir** movimientos pendientes.

## 8. Publicación en tiendas (costos)

- **Google Play**: cuenta de desarrollador, **$25 USD** pago único.
- **App Store**: **Apple Developer Program, $99 USD/año** (+ Mac para compilar).

## 9. Agregador (Premium futuro)

[supabase/functions/sync-aggregator/index.ts](supabase/functions/sync-aggregator/index.ts)
es un stub. Cuando el negocio justifique el costo (~$1,000 USD/mes de Belvo),
se implementa el widget + webhooks y se insertan movimientos con
`source='aggregator'`. La tabla `bank_connections` ya existe.
