// Copied into each standalone plugin by scripts/sync-i18n.mjs.
import resources from './locales.js';
let locale = 'zh-CN';
const bindings = new Map();
const listeners = new Set();
const sources = new Map(Object.entries(resources).flatMap(([key, values]) => Object.values(values).map(value => [value, key])));
export const getLocale = () => locale;
export function t(key, values = {}) {
  const source = sources.get(key) || key;
  const message = resources[source]?.[locale] || source;
  return message.replace(/\{\{(\w+)\}\}/g, (match, name) => name in values ? String(values[name]) : match);
}
export function setText(element, key, values = {}) {
  bindings.set(element, { key: sources.get(key) || key, values });
  element.textContent = t(key, values);
}
export function applyLocale(value) {
  locale = value === 'en' ? 'en' : value === 'zh-Hant' ? 'zh-Hant' : 'zh-CN';
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale;
  for (const element of document.querySelectorAll('[data-i18n]')) element.textContent = t(element.dataset.i18n);
  for (const attribute of ['placeholder', 'aria-label', 'title']) {
    for (const element of document.querySelectorAll(`[data-i18n-${attribute}]`)) element.setAttribute(attribute, t(element.getAttribute(`data-i18n-${attribute}`)));
  }
  for (const [element, binding] of bindings) element.textContent = t(binding.key, binding.values);
  for (const listener of listeners) listener();
}
export function onLanguageChange(callback) { listeners.add(callback); return () => listeners.delete(callback); }
export async function startLanguage() {
  let changed = false;
  const api = window.nexlet?.i18n;
  api?.onChange(value => { changed = true; applyLocale(value); });
  if (api) { const initial = await api.getLocale(); if (!changed) applyLocale(initial); }
  else {
    const value = navigator.language.toLowerCase();
    applyLocale(value.startsWith('zh') ? /hant|tw|hk|mo/.test(value) ? 'zh-Hant' : 'zh-CN' : 'en');
  }
}
