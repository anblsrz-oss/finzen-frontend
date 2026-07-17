// Ajustes de UI solo para la app nativa (Capacitor). No-op en web.
import { Capacitor } from '@capacitor/core'

export async function initNativeUi(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Light })
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#0f766e' })
    }
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch {
    // Plugins no disponibles en este entorno: ignorar.
  }
}
