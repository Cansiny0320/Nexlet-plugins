import { createHash } from 'node:crypto';
import type { BackendHandlers } from '@nexlet/plugin-api';
export const handlers = {
  async hash(args, context) {
    const { text } = args as { text: string };
    context.signal.throwIfAborted(); context.emit({ stage: 'hashing' });
    return { digest: createHash('sha256').update(text).digest('hex'), length: text.length };
  }
} satisfies BackendHandlers;
