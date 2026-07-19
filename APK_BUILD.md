# APK de FinZen (Android) — build, firma y publicación

Hay dos caminos. **Recomendado: GitHub Actions** (compila y firma en la nube; tu
equipo no necesita Android Studio). El proyecto `android/` ya está generado y
versionado, y el workflow `.github/workflows/build-apk.yml` ya está listo.

---

## Opción A (recomendada): GitHub Actions

### 1. Genera la llave de firma (una sola vez)
La keystore es un secreto **tuyo** que debes conservar de por vida (sin ella no
podrás publicar actualizaciones que el sistema acepte como la misma app).
Necesitas `keytool` (viene con cualquier JDK). En una terminal:

```bash
keytool -genkey -v -keystore finzen.keystore -alias finzen \
  -keyalg RSA -keysize 2048 -validity 10000
```
Te pedirá una contraseña (guárdala) y algunos datos. Genera `finzen.keystore`.

Conviértela a base64 para guardarla como secret:
```bash
# Linux/macOS/Git Bash:
base64 -w0 finzen.keystore > finzen.keystore.b64
# Windows PowerShell:
[Convert]::ToBase64String([IO.File]::ReadAllBytes("finzen.keystore")) > finzen.keystore.b64
```

> Guarda `finzen.keystore` y las contraseñas en un lugar seguro (gestor de
> contraseñas). NO las subas al repo.

### 2. Agrega los secrets al repo
GitHub → tu repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Valor |
|--------|-------|
| `ANDROID_KEYSTORE_BASE64` | contenido de `finzen.keystore.b64` |
| `ANDROID_KEYSTORE_PASSWORD` | la contraseña del keystore |
| `ANDROID_KEY_ALIAS` | `finzen` |
| `ANDROID_KEY_PASSWORD` | la contraseña de la llave (suele ser la misma) |

### 3. Publica una versión
- **Automático (crea el Release):** empuja una etiqueta de versión:
  ```bash
  git tag v0.1.0
  git push origin v0.1.0
  ```
  El workflow compila, firma y **publica el Release con `finzen.apk`** adjunto.
  El botón "Descargar app" de la landing ya apunta ahí
  (`releases/latest/download/finzen.apk`).

- **Manual (solo probar):** GitHub → **Actions → Build Android APK → Run workflow**.
  El APK firmado queda como *artifact* descargable del run (no crea Release).

### 4. Avisar de la actualización (opcional pero recomendado)
En cada versión nueva, antes de etiquetar:
1. Sube `version` en `package.json` (p. ej. `0.1.0` → `0.2.0`).
2. Pon la misma `version` en `public/version.json`.
3. Despliega la web (Vercel) y crea la etiqueta `vX.Y.Z`.

- **Web/PWA:** al desplegar, los usuarios ven "Hay una nueva versión → Actualizar".
- **App nativa:** al abrir, si `version.json` tiene una versión mayor, ven
  "Descarga la actualización" con enlace al APK.

---

## Opción B: build local (si prefieres tu equipo)
Requiere **Android Studio / SDK** + **JDK 17**.
```bash
npm run build
npx cap sync android
cd android
./gradlew assembleRelease        # Windows: .\gradlew.bat assembleRelease
```
APK sin firmar en `android/app/build/outputs/apk/release/app-release-unsigned.apk`.
Fírmalo con Android Studio (Build → Generate Signed Bundle / APK) o con
`apksigner`, y súbelo al Release como `finzen.apk`.

---

## Notas
- El APK se hospeda en **GitHub Releases** (no usamos Supabase Storage).
- La URL del APK es configurable con la variable `VITE_APK_URL` (por defecto
  `https://github.com/anblsrz-oss/finzen-frontend/releases/latest/download/finzen.apk`).
- `android/` está versionado; los archivos generados (build, assets web, plugins
  cordova) están en `.gitignore` y se regeneran con `cap sync` en cada build.
