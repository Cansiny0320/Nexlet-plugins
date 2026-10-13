import { createStorage } from './storage.mjs';
import { report } from './transport';
export const storage = createStorage(window.nexlet, report);
const saves = new Set<() => void>();
export const registerSave = (save: () => void) => {
  saves.add(save);
  return () => { save(); saves.delete(save); };
};
export const flushStorage = async () => {
  for (const save of saves) save();
  await storage.flush();
};
