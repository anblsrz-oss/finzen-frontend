# Generar y publicar el APK de FinZen (Android)

El APK **no** se puede compilar desde este entorno: necesita Android Studio / SDK
y JDK instalados en tu equipo. Estos son los pasos (una sola vez el setup, luego
repetible en cada release).

## Requisitos (una vez)
- **Android Studio** (incluye el SDK) o el **Android SDK** + **JDK 17**.
- Node y las dependencias del proyecto (`npm install`).

## Generar el proyecto Android (una vez)
```bash
cd finzen-frontend
npm run build            # genera dist/
npx cap add android      # crea la carpeta android/ (solo la primera vez)
npx cap sync android     # copia dist/ y plugins al proyecto Android
```

## Compilar el APK (cada release)
```bash
npm run build
npx cap sync android
cd android
./gradlew assembleRelease      # en Windows: .\gradlew.bat assembleRelease
```
El APK queda en:
`android/app/build/outputs/apk/release/app-release-unsigned.apk`

> Para producción hay que **firmarlo**. Crea un keystore una vez:
> ```bash
> keytool -genkey -v -keystore finzen.keystore -alias finzen -keyalg RSA -keysize 2048 -validity 10000
> ```
> y configúralo en `android/app/build.gradle` (signingConfigs) para obtener
> `app-release.apk` firmado. Alternativamente usa Android Studio: Build > Generate Signed Bundle / APK.

## Publicar (para que el botón "Descargar app" funcione)
El botón de la landing y el aviso de actualización nativo apuntan a:
`https://github.com/anblsrz-oss/finzen-frontend/releases/latest/download/finzen.apk`
(configurable con la variable `VITE_APK_URL`).

1. En GitHub → Releases → **Draft a new release**.
2. Sube el APK firmado **con el nombre exacto `finzen.apk`**.
3. Publica el release.

## Avisar de una nueva versión
El aviso de actualización compara la versión instalada contra `public/version.json`
(servido en `https://finze.xyz/version.json`). En cada release:

1. Sube el `version` en `package.json` (p. ej. `0.1.0` → `0.2.0`).
2. Actualiza `public/version.json` con la misma `version` (y `notes` si quieres).
3. Despliega la web (Vercel) y sube el APK nuevo al release.

- **Web/PWA**: al desplegar, los usuarios verán el banner "Hay una nueva versión →
  Actualizar" (recarga con el nuevo service worker).
- **App nativa (APK)**: al abrir, si `version.json` tiene una versión mayor que la
  instalada, verán "Descarga la actualización" con enlace al APK.
