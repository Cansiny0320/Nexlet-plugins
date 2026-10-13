import { ref } from 'vue';
import { report } from './transport';
export let permission: PermissionState = 'granted';
export const initPermission = async () => {};
export const useClipboardPermission = () => ({ state: ref(permission) });
export const copy = (data: string, callback?: () => void) => { if (data) void window.nexlet.clipboard.writeText(data).then(callback).catch(report); };
export const paste = async () => window.nexlet.clipboard.readText();
export const copyImage = (data: string, callback?: () => void) => {
  const image = new Image();
  image.onerror = () => report(new Error('图片加载失败'));
  image.onload = () => {
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    canvas.getContext('2d')!.drawImage(image, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) { report(new Error('图片转换失败')); return; }
      void blob.arrayBuffer().then(bytes => window.nexlet.clipboard.writeImage(new Uint8Array(bytes))).then(callback).catch(report);
    }, 'image/png');
  };
  image.src = data;
};
export default { copy, paste, copyImage };
