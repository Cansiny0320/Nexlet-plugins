import { adapterText } from './messages.mjs';
let locale: 'en' | 'zh_CN' = 'zh_CN';
const listeners = new Set<(locale: 'en' | 'zh_CN') => void>();
export const text = (message: string): string => adapterText(message, locale);
export const getHostLocale = () => locale;
export const onHostLocaleChange = (callback: (locale: 'en' | 'zh_CN') => void) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};
export async function prepareLocale() {
  const api = window.nexlet.i18n;
  if (!api) return;
  let changed = false;
  const apply = (value: string) => {
    // The pinned upstream contains Simplified Chinese and English only.
    locale = value === 'en' ? 'en' : 'zh_CN';
    for (const listener of listeners) listener(locale);
  };
  api.onChange(value => { changed = true; apply(value); });
  const initial = await api.getLocale();
  if (!changed) apply(initial);
}
