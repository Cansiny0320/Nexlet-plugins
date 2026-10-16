import test from 'node:test';
import assert from 'node:assert/strict';
import { RecognitionTask } from '../plugins/ocr/task.ts';

const worker = () => ({ stops: 0, terminate() { this.stops++; } });

test('cancels previous recognition and ignores its late result', async () => {
  const task = new RecognitionTask(), owned = worker(); let complete;
  const first = task.run(own => { own(owned); return new Promise(resolve => complete = resolve); }).catch(error => error.message);
  await Promise.resolve(); const second = task.run(async () => 'new text'); complete('stale');
  assert.equal(await first, 'cancelled'); assert.equal(await second, 'new text'); assert.equal(owned.stops, 1);
});

test('preserves empty results and terminates the worker', async () => {
  const task = new RecognitionTask(), owned = worker();
  assert.equal(await task.run(async own => { own(owned); return ''; }), ''); assert.equal(owned.stops, 1);
});

test('timeout and worker errors reject and clean up', async () => {
  const task = new RecognitionTask(), owned = worker();
  await assert.rejects(task.run(own => { own(owned); return new Promise(() => {}); }, 50), /timeout/);
  assert.equal(owned.stops, 1);
  await assert.rejects(task.run(async () => { throw Error('worker crash'); }), /worker crash/);
});

test('cancellation before initialization still terminates a late worker', async () => {
  const task = new RecognitionTask(), owned = worker(); let start;
  const result = task.run(async own => { await new Promise(resolve => start = resolve); own(owned); return 'late'; }).catch(error => error.message);
  await Promise.resolve(); task.cancel(); start(); assert.equal(await result, 'cancelled');
  await Promise.resolve(); assert.equal(owned.stops, 1);
});
