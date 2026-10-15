import { text } from './locale';
import { prepareLocale } from './locale';
import { storage, flushStorage } from './state';
import { installHttp, closeSockets, report } from './transport';
installHttp();
window.nexlet.onOut(async () => {
  closeSockets();
  await flushStorage();
  await window.nexlet.backend?.stop();
});
if (!window.nexlet.backend?.call || !window.nexlet.database?.query || !window.nexlet.clipboard?.writeImage || !window.nexlet.files?.write) {
  report(new Error(text('当前 Nexlet 缺少 Ctool 所需的扩展插件 SDK，请使用支持 backend、database、files 和图片剪贴板的宿主构建。')));
} else {
  // @ts-expect-error The build copies this adapter into the pinned upstream src/nexlet directory.
  void Promise.all([storage.load(), prepareLocale()]).then(() => import('../tool')).catch(report);
}
