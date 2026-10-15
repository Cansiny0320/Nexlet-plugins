// Nexlet adapter diagnostics; tool translations remain owned by upstream Ctool.
const english = {
  '当前 Nexlet 缺少 Ctool 所需的扩展插件 SDK，请使用支持 backend、database、files 和图片剪贴板的宿主构建。': 'This Nexlet build lacks the extended SDK required by Ctool. Use a build with backend, database, files, and image clipboard support.',
  '下载失败': 'Download failed',
  '请求已取消': 'Request canceled',
  '请求失败': 'Request failed',
  'WebSocket 尚未连接': 'WebSocket is not connected',
  'WebSocket 已关闭': 'WebSocket is closed',
  '图片加载失败': 'Image could not be loaded',
  '图片转换失败': 'Image conversion failed',
  '系统加密不可用，JDoodle 凭据仅当前会话有效': 'System encryption is unavailable. JDoodle credentials last only for this session.',
  '仅支持 HTTP(S) / WS(S) 地址，凭据请放入请求头': 'Only HTTP(S) / WS(S) URLs are supported. Put credentials in request headers.',
  '请求超过 8 MB': 'Request exceeds 8 MB',
  '响应超过 8 MB': 'Response exceeds 8 MB',
  'WebSocket 连接数超过 8': 'More than 8 WebSocket connections',
  '接收队列超过限制，连接已断开': 'Receive queue limit exceeded; connection closed',
  '消息无效或超过 8 MB': 'Invalid message or message exceeds 8 MB',
};
export const adapterText = (message, locale) => locale === 'en' ? english[message] || message : message;
