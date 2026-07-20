# Pendientes — renombre a Ahorbit + fix de línea de crédito

> Generado el 2026-07-20. Bórralo cuando ya no lo necesites.

## ⚠️ Antes que nada

**Nada de esto está commiteado todavía.** Si vuelves a clonar el repo en tu
máquina personal sin subir estos cambios primero, se pierden por completo
(incluida esta misma nota, si no la subes). Antes de cambiar de máquina:

```
git add -A
git commit -m "..."
git push
```

## En la máquina personal (setup)

- [ ] **Instalar JDK 21** (Temurin/Adoptium). Gradle 8.14.3 + AGP 8.13.0 de este
      proyecto **no soportan JDK 25** (falla el build). El instalador es el
      mismo sitio (adoptium.net), solo elige la versión 21.
- [ ] **Registrar el redirect nativo en Supabase** → proyecto
      `vujlizgyharlhcmfgkti` → Authentication → URL Configuration → Redirect
      URLs → agrega `com.ahorbit.app://auth-callback`.
      **Crítico antes de instalar cualquier APK nuevo**: sin esto el login con
      Google se rompe en la app nativa (el scheme cambió de `com.finzen.app`
      a `com.ahorbit.app`).
- [ ] Compilar el APK. En esta máquina `gradlew assembleDebug` falló al
      descargar el wrapper de Gradle (error TLS/`PKIX path building failed`,
      causado por `JAVA_TOOL_OPTIONS=-Djava.vendor="New Oracle"` en el
      entorno de esta laptop — no es un problema del código). Puede que en tu
      máquina personal no pase; si prefieres evitar la duda, abre el proyecto
      directamente en **Android Studio** (trae su propio JDK y suele resolver
      esto solo).
- [ ] Si tienes el APK viejo instalado (`com.finzen.app`), **desinstálalo**
      antes de instalar el nuevo build — Android lo trata como una app
      distinta por el cambio de `appId`. Tus datos no se pierden (viven en
      Supabase), solo la instalación local.

## Ya hecho (no repetir)

- [x] Migración `supabase/migrations/0023_credit_usage_net.sql` aplicada en
      Supabase (confirmado por ti). El disponible de `credit_line_usage` y
      `card_usage` ya descuenta ingresos, no solo suma gastos.
- [x] Renombre completo FinZen → Ahorbit: cadenas de UI, `package.json`,
      clave de localStorage (con migración automática desde
      `finzen-settings`), `appId`/`namespace` Android (`com.ahorbit.app`),
      paquete Java (`com/ahorbit/app/MainActivity.java`), esquema de deep
      link (`src/lib/nativeAuth.ts`).
- [x] Sección de descarga de APK logueado en `/configuracion` y en el menú
      "Más" de `AppShell.tsx` (oculta dentro del APK vía `isNative()`).

## Pendiente de infraestructura (fuera del código, decidido para después)

- [ ] **Repo de GitHub `finzen-frontend`** y el nombre del asset
      `finzen.apk` (usados en `src/lib/appUpdate.ts`,
      `.github/workflows/build-apk.yml`, `public/version.json`). GitHub
      redirige repos renombrados, así que se puede hacer, pero renombrar
      repo + asset a la vez es la parte frágil. Sugerencia: renombra el repo
      primero, deja `finzen.apk` como nombre de asset hasta el siguiente
      release, y ahí cambia junto con `version.json`.
- [ ] **Dominio `finze.xyz`** — hardcodeado en `src/lib/appUpdate.ts`
      (`VERSION_JSON_URL`) y en `supabase/functions/invite-family-email/index.ts`.
      **No cambiar hasta que exista el dominio nuevo y sirva `version.json`**:
      los APK ya instalados consultan esa URL para detectar actualizaciones.

## Decidido explícitamente como fuera de alcance

- No se implementó amortización automática mes a mes de los `installment_plans`
  MSI. El ajuste por mensualidades ya pagadas se sigue calculando una sola vez
  al capturar la compra (ver `src/lib/installments.ts` y
  `TransactionForm.tsx`). Sería un feature aparte si se quiere después.

## Plan 2 — rediseño del modelo de crédito (pendiente, fuera de alcance por ahora)

Cambio de fondo en cómo el crédito afecta el balance. Hoy un consumo con tarjeta
de crédito baja el "Balance" de Reportes como si fuera dinero propio; debe dejar
de hacerlo. Como parche temporal, la Fase 2 ya excluye la categoría "Ajuste de
saldo" de los reportes (`src/hooks/useReports.ts`); el modelo nuevo lo vuelve
innecesario.

- Un consumo a crédito es **deuda, no egreso**: no debe bajar el balance, solo
  subir el `used` de la tarjeta. El egreso real ocurre al **pagar la tarjeta**
  (sale dinero de una cuenta).
- Falta crear la **primitiva de pago de tarjeta** (no existe hoy): cuenta origen
  → tarjeta/línea destino; baja el saldo de la cuenta y baja la deuda. Requiere
  columna nueva (`to_card_id`/`to_credit_line_id`) en `transactions` y actualizar
  las vistas `account_balances`, `card_usage`, `credit_line_usage`.
- Decisiones ya tomadas:
  - Pago de tarjeta accesible **por tipo en el formulario Y botón en la tarjeta**.
  - El gasto con **débito descuenta de su cuenta ligada solo para transacciones
    nuevas** (se copia `account_id` de la tarjeta al guardar). Hoy la relación
    tarjeta-cuenta es puramente decorativa y débito no descuenta de nada.
- Ojo: recalcular esto **cambia los balances históricos** (los consumos a crédito
  ya registrados dejan de contar como egreso).
