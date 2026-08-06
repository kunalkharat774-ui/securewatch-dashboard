import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLocalAssistantResponse } from '../api/gemini/assistant.ts';

test('returns brute-force guidance for login page prompts', () => {
  const response = buildLocalAssistantResponse('How can I secure my login page against brute force attacks?');
  assert.match(response, /rate limit|lockout|MFA|captcha|password/i);
});

test('returns phishing detection guidance for phishing prompts', () => {
  const response = buildLocalAssistantResponse('What is phishing and how can I detect it?');
  assert.match(response, /sender|link|verify|report/i);
});
