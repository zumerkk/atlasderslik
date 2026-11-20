import { AiService } from './ai.service';
import { ConfigService } from '@nestjs/config';
import { OpenAiBudgetService } from './openai-budget.service';

describe('OpenAI structured request', () => {
  const original = global.fetch;
  const create = (env: Record<string, string>) => new AiService(new ConfigService(env), {
    reserve: jest.fn().mockResolvedValue(undefined),
  } as unknown as OpenAiBudgetService);
  afterEach(() => { global.fetch = original; });
  it('sends strict Responses schema, no storage and bounded image input', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: '{"allowed":true}' }] }] }) });
    global.fetch = fetchMock;
    const ai = create({ OPENAI_API_KEY: 'test-secret' });
    await expect(ai.chatStructured({ system: 'Only scope', user: 'Question', images: Array(15).fill('data:image/png;base64,abc') }, { type: 'object' }, 'scope')).resolves.toEqual({ allowed: true });
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.store).toBe(false); expect(sent.text.format.strict).toBe(true); expect(sent.input[0].content).toHaveLength(13);
  });
  it('fails closed on provider refusal and does not switch to text fallback', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'No' }] }] }) });
    const ai = create({ OPENAI_API_KEY: 'test', GROQ_API_KEY: 'other' });
    await expect(ai.chatStructured({ system: 'scope', user: 'test' }, {}, 'scope')).resolves.toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
  it('never uses non-OpenAI providers for strict generation', async () => {
    global.fetch = jest.fn(); const ai = create({ GROQ_API_KEY: 'test' });
    await expect(ai.chatStructured({ system: 'scope', user: 'test' }, {}, 'scope')).resolves.toBeNull(); expect(global.fetch).not.toHaveBeenCalled();
  });
});
