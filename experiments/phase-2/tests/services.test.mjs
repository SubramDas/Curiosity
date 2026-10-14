import test from 'node:test';
import assert from 'node:assert/strict';
import { requestJson } from '../../../backend/providers/request-json.mjs';
import { createYouTubeClient, mergeVideoPages } from '../../../backend/providers/youtube.mjs';
import { createGeminiClient, validateAnswer } from '../services/gemini.mjs';
import { gpuNotes } from '../../../backend/content/gpu-notes.mjs';

const jsonResponse = (value) => new Response(JSON.stringify(value));

test('YouTube requests video-only embeddable results and forwards pagination without placing secrets in the URL', async () => {
  const calls = [];
  const client = createYouTubeClient({ apiKey: 'test-secret', fetchRequest: async (url, options) => {
    calls.push({ url, options });
    return jsonResponse({ items: [
      { id: { videoId: 'abcdefghijk' }, snippet: { title: 'GPU', channelTitle: 'Example' } },
      { id: { videoId: 'invalid' }, snippet: { title: 'Bad identifier' } },
    ], nextPageToken: 'next-page' });
  } });
  const page = await client.searchPage('GPU', 'previous-page');
  assert.equal(calls[0].url.searchParams.get('type'), 'video');
  assert.equal(calls[0].url.searchParams.get('videoEmbeddable'), 'true');
  assert.equal(calls[0].url.searchParams.get('pageToken'), 'previous-page');
  assert.equal(calls[0].url.toString().includes('test-secret'), false);
  assert.equal(calls[0].options.headers['x-goog-api-key'], 'test-secret');
  assert.equal(page.videos.length, 1);
  assert.equal(page.videos[0].reviewed, false);
  assert.equal(page.nextPageToken, 'next-page');
});

test('Repeated videos across batches appear once in original result order', () => {
  const first = { id: 'abcdefghijk', title: 'First title' };
  assert.deepEqual(mergeVideoPages([
    { videos: [first] },
    { videos: [{ ...first, title: 'Repeated title' }, { id: 'lmnopqrstuv' }] },
  ]), [first, { id: 'lmnopqrstuv' }]);
});

test('Missing and unavailable video details are not fabricated', async () => {
  const client = createYouTubeClient({ apiKey: 'test-secret', fetchRequest: async () => jsonResponse({
    items: [{ id: 'abcdefghijk', status: { embeddable: false, privacyStatus: 'public' }, contentDetails: { duration: 'PT4M' } }],
  }) });
  const details = await client.getVideoDetails(['abcdefghijk', 'lmnopqrstuv']);
  assert.equal(details.length, 1);
  assert.equal(details[0].embeddable, false);
});

test('Blank input is rejected before consuming a provider call', async () => {
  let calls = 0;
  const client = createYouTubeClient({ apiKey: 'test-secret', fetchRequest: async () => { calls++; } });
  await assert.rejects(client.searchPage(' '), { code: 'INVALID_INPUT' });
  assert.equal(calls, 0);
});

test('Quota errors are not retried or printed with raw provider secrets', async () => {
  let calls = 0;
  await assert.rejects(requestJson('https://example.com', {}, async () => {
    calls++;
    return new Response('secret-provider-error', { status: 429 });
  }), (error) => error.code === 'SERVICE_LIMIT' && !error.message.includes('secret-provider-error'));
  assert.equal(calls, 1);
});

test('Network failures are sanitized', async () => {
  await assert.rejects(requestJson('https://example.com', {}, async () => {
    throw new Error('https://example.com?key=test-secret');
  }), (error) => error.code === 'NETWORK_ERROR' && !error.message.includes('test-secret'));
});

test('Chat requires explicit developer data-use confirmation before any call', () => {
  assert.throws(() => createGeminiClient({ apiKey: 'test-secret', model: 'test-model', allowFreeTest: false }),
    { code: 'DATA_USE_NOT_CONFIRMED' });
});

test('Chat rejects invented source identifiers and unsupported uncited answers', () => {
  assert.throws(() => validateAnswer({ answer: 'A claim', sourceIds: ['invented'], insufficientInformation: false }, gpuNotes),
    { code: 'UNSUPPORTED_ANSWER' });
  assert.throws(() => validateAnswer({ answer: 'A claim', sourceIds: [], insufficientInformation: false }, gpuNotes),
    { code: 'UNSUPPORTED_ANSWER' });
  assert.equal(validateAnswer({ answer: 'These notes cannot answer that.', sourceIds: [], insufficientInformation: true }, gpuNotes).insufficientInformation, true);
});

test('Chat uses supplied source links and marks answers for human review', async () => {
  const client = createGeminiClient({
    apiKey: 'test-secret', model: 'test-model', allowFreeTest: true,
    fetchRequest: async (url, options) => {
      const request = JSON.parse(options.body);
      assert.equal(request.generationConfig.responseMimeType, 'application/json');
      assert.equal(JSON.parse(request.contents[0].parts[0].text).sources[0].id, gpuNotes[0].id);
      return jsonResponse({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({
        answer: 'The CPU launches work on the GPU.', sourceIds: [gpuNotes[0].id], insufficientInformation: false,
      }) }] } }] });
    },
  });
  const answer = await client.answerFromNotes('How do they work together?', gpuNotes);
  assert.equal(answer.sources[0].url, gpuNotes[0].url);
  assert.equal(answer.needsHumanReview, true);
});

test('Truncated model output is rejected rather than treated as complete', async () => {
  const client = createGeminiClient({ apiKey: 'test-secret', model: 'test-model', allowFreeTest: true,
    fetchRequest: async () => jsonResponse({ candidates: [{ finishReason: 'MAX_TOKENS' }] }),
  });
  await assert.rejects(client.answerFromNotes('How do they work together?', gpuNotes), { code: 'INCOMPLETE_ANSWER' });
});
