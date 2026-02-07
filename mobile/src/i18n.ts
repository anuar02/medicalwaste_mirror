import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import ru from './locales/ru.json';

const LANGUAGE_KEY = 'language';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ru: { translation: ru },
  },
  lng: 'ru',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

AsyncStorage.getItem(LANGUAGE_KEY)
  .then((saved) => {
    if (saved) {
      i18n.changeLanguage(saved);
    }
  })
  .catch(() => undefined);

export { LANGUAGE_KEY };
export default i18n;
