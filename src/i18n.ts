import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import translationEN from './locales/en.json';
import translationIT from './locales/it.json';

// Translation resources
const resources = {
  en: {
    translation: translationEN
  },
  it: {
    translation: translationIT
  }
};

// Initialize i18next
i18n
  // Detect browser language
  .use(LanguageDetector)
  // Pass i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    resources,
    fallbackLng: 'it', // Default language
    interpolation: {
      escapeValue: false // Not needed for React
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n; 