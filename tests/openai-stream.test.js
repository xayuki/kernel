import test from 'node:test';
import assert from 'node:assert/strict';
import { consumeOpenAIStream } from '../lib/openai-stream.js';

function streamFromBytes(chunks) {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    }
  });
}

test('parses frames split across byte chunks and preserves split UTF-8 characters', async () => {
  const encoder = new TextEncoder();
  const bytes = encoder.encode('data: {"choices":[{"delta":{"content":"hello 🌍"}}]}\\r\\n\\r\\ndata: [DONE]\\r\\n\\r\\n');
  const emoji = encoder.encode('🌍');
  let emojiStart = -1;
  for (let index = 0; index <= bytes.length - emoji.length; index += 1) {
    if (emoji.every((part, offset) => bytes[index + offset] === part)) {
      emojiStart = index;
      break;
    }
  }
  assert.notEqual(emojiStart, -1);
  const split = emojiStart + 2;
  const received = [];

  await consumeOpenAIStream(streamFromBytes([
    bytes.slice(0, split),
    bytes.slice(split, split + 9),
    bytes.slice(split + 9)
  ]), chunk => received.push(chunk));

  assert.equal(received.length, 1);
  assert.equal(received[0].choices[0].delta.content, 'hello 🌍');
});

test('processes a final frame without a trailing newline, including finish metadata', async () => {
  const encoder = new TextEncoder();
  const finalFrame = 'data: {"choices":[{"delta":{"content":"done"},"finish_reason":"stop"}],"usage":{"completion_tokens":1}}';
  const received = [];

  await consumeOpenAIStream(streamFromBytes([encoder.encode(finalFrame)]), chunk => received.push(chunk));

  assert.equal(received.length, 1);
  assert.equal(received[0].choices[0].finish_reason, 'stop');
  assert.equal(received[0].usage.completion_tokens, 1);
});

test('stops at the [DONE] sentinel and ignores later frames', async () => {
  const encoder = new TextEncoder();
  const source = ': keep-alive\\n\\nevent: message\\n\\ndata: {"choices":[{"delta":{"content":"ok"}}]}\\n\\ndata: [DONE]\\n\\ndata: {"choices":[{"delta":{"content":"late"}}]}\\n\\n';
  const received = [];

  await consumeOpenAIStream(streamFromBytes([encoder.encode(source)]), chunk => received.push(chunk));

  assert.equal(received.length, 1);
  assert.equal(received[0].choices[0].delta.content, 'ok');
});

test('rejects calls without a readable stream or callback', async () => {
  await assert.rejects(() => consumeOpenAIStream(null, () => {}), /readable response stream/);
  const stream = streamFromBytes([]);
  await assert.rejects(() => consumeOpenAIStream(stream, null), /chunk handler/);
});
