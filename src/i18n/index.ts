// i18n con "claves naturales": el texto en español ES la clave. Para español
// no hay diccionario (t devuelve la clave tal cual); para inglés se traduce
// con el mapa de en.ts. Ventaja: el código sigue siendo legible en español y
// solo se mantiene un diccionario.

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { useSettings } from '@/store/useSettings'
import { en } from './en'

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
  },
  lng: useSettings.getState().language,
  fallbackLng: 'es',
  // Claves naturales: sin namespaces ni anidación por puntos.
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  returnEmptyString: false,
})

// Mantener i18next sincronizado con el store de ajustes.
useSettings.subscribe((state, prev) => {
  if (state.language !== prev.language) {
    void i18n.changeLanguage(state.language)
  }
})

export default i18n

// Locale para Intl (fechas/moneda) según el idioma activo.
export function activeLocale(): string {
  return i18n.language === 'en' ? 'en-US' : 'es-MX'
}
