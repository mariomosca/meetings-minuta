import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Importa i file delle traduzioni
import translationEN from './locales/en.json';
import translationIT from './locales/it.json';

// Risorse delle traduzioni
const resources = {
  en: {
    translation: translationEN
  },
  it: {
    translation: translationIT
  }
};

// Inizializza i18next
i18n
  // Rileva la lingua del browser
  .use(LanguageDetector)
  // Passa l'istanza i18n a react-i18next
  .use(initReactI18next)
  // Inizializza i18next
  .init({
    resources,
    fallbackLng: 'it', // Lingua predefinita
    interpolation: {
      escapeValue: false // Non necessario per React
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n; 