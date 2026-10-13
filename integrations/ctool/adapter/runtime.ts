import { storage } from './state';
import { report } from './transport';
import { tools } from 'ctool-config';

export const runtime = {
  name: 'nexlet',
  is: () => true,
  webSecurity: () => false,
  storage: () => storage,
  getLocale: () => 'zh_CN',
  openUrl: (url: string) => window.nexlet.openExternal(url).catch(report),
  initialize(initializer: any) {
    window.nexlet.onEnter(async (context: any) => {
      const tool = tools.find(item => item.name === context.code);
      const query: Record<string, string> = { _t: crypto.randomUUID() };
      initializer.storage().remove('_temp_input_storage');
      if (context.type === 'text' && context.payload) {
        initializer.storage().setNoVersion('_temp_input_storage', context.payload, 10);
      }
      initializer.push(tool ? tool.firstFeature().getRouter() : '/', query);
    });
  },
};
