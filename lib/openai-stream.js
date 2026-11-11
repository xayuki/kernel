export async function consumeOpenAIStream(stream, onChunk, options = {}) {
  if (!stream || typeof stream.getReader !== 'function') {
    throw new TypeError('A readable response stream is required.');
  }
  if (typeof onChunk !== 'function') {
    throw new TypeError('A chunk handler is required.');
  }

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const signal = options.signal;
  let buffer = '';
  let receivedDone = false;
  let streamEnded = false;

  const processLine = line => {
    const normalized = line.replace(/\\r$/, '');
    if (!normalized.startsWith('data:')) return false;

    const payload = normalized.slice(5).trim();
    if (!payload) return false;
    if (payload === '[DONE]') return true;

    let chunk;
    try {
      chunk = JSON.parse(payload);
    } catch {
      return false;
    }
    onChunk(chunk);
    return false;
  };

  try {
    while (!streamEnded && !receivedDone) {
      if (signal?.aborted) {
        const error = new Error('The request was aborted.');
        error.name = 'AbortError';
        throw error;
      }

      const { value, done } = await reader.read();
      if (done) {
        buffer += decoder.decode();
        streamEnded = true;
      } else {
        buffer += decoder.decode(value, { stream: true });
      }

      const lines = buffer.split('\\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (processLine(line)) {
          receivedDone = true;
          break;
        }
      }
    }

    if (!receivedDone && buffer.trim()) {
      receivedDone = processLine(buffer);
    }
  } finally {
    if (receivedDone) {
      try { await reader.cancel(); } catch { /* The stream may already be closed. */ }
    }
    reader.releaseLock();
  }
}
