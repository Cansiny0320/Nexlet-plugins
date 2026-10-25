import { recognizeResult } from './engine';
const bridge = (window as unknown as { nexletProvider: { listen(callback: (value: { request: { image: Uint8Array } }) => void): void; progress(value: number): void; finish(value: unknown): void; fail(message: string): void } }).nexletProvider;
bridge.listen(({ request }) => {
  void recognizeResult(request.image, value => bridge.progress(value)).then(value => bridge.finish(value), error => bridge.fail(error instanceof Error ? error.message : String(error)));
});
