import type { CapacitorConfig } from '@capacitor/cli'

// Configuración de Capacitor: envuelve la PWA (carpeta dist) como app nativa.
// Flujo: `npm run build` -> `npx cap sync` -> `npx cap open android|ios`.
const config: CapacitorConfig = {
  appId: 'com.ahorbit.app',
  appName: 'Ahorbit',
  webDir: 'dist',
  // Esquema propio para el deep link del callback de OAuth (ver src/lib/nativeAuth.ts).
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#0f766e',
      showSpinner: false,
    },
  },
  // Para desarrollo con live-reload contra el server de Vite, descomenta y usa
  // la IP de tu equipo (misma red que el celular):
  // server: { url: 'http://192.168.1.x:5173', cleartext: true },
}

export default config
