import { ConfigService } from '@nestjs/config';
import { AiChatService } from './ai-chat.service';
import { ToolExecutor } from './tools/tool-executor';

/** Builds a fake OpenAI chat-completions response body for one iteration. */
function completionWithToolCall(name: string, args: Record<string, unknown>) {
  return {
    choices: [
      {
        message: {
          content: null,
          tool_calls: [
            { id: 'call-1', function: { name, arguments: JSON.stringify(args) } },
          ],
        },
      },
    ],
  };
}

function finalCompletion(content: string) {
  return { choices: [{ message: { content, tool_calls: [] } }] };
}

function fakeConfig(values: Record<string, string>) {
  return {
    get: jest.fn((key: string, fallback?: string) => values[key] ?? fallback),
  } as unknown as ConfigService;
}

describe('AiChatService', () => {
  let toolExecutor: { execute: jest.Mock };
  let fetchMock: jest.Mock;

  beforeEach(() => {
    toolExecutor = { execute: jest.fn() };
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('answers honestly instead of calling the LLM when no API key is configured', async () => {
    const service = new AiChatService(fakeConfig({}), toolExecutor as unknown as ToolExecutor);

    const result = await service.chat('case-1', 'When was the first MRI?');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.toolCalls).toEqual([]);
    expect(result.referencedEventIds).toEqual([]);
    expect(result.reply).toMatch(/not configured/i);
  });

  it('returns the final reply directly when the model answers without any tool calls', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => finalCompletion("I don't have enough information to answer that."),
    });
    const service = new AiChatService(
      fakeConfig({ OPENAI_API_KEY: 'test-key' }),
      toolExecutor as unknown as ToolExecutor,
    );

    const result = await service.chat('case-1', 'What is the weather today?');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(toolExecutor.execute).not.toHaveBeenCalled();
    expect(result.reply).toBe("I don't have enough information to answer that.");
    expect(result.toolCalls).toEqual([]);
  });

  it('executes a requested tool call, feeds the result back, and collects referenced event ids', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => completionWithToolCall('find_events', { keyword: 'MRI' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => finalCompletion('The first MRI was on 2024-01-05 (evt-1).'),
      });
    toolExecutor.execute.mockResolvedValueOnce([
      { id: 'evt-1', date: '2024-01-05', summary: 'MRI lumbar spine' },
    ]);
    const service = new AiChatService(
      fakeConfig({ OPENAI_API_KEY: 'test-key' }),
      toolExecutor as unknown as ToolExecutor,
    );

    const result = await service.chat('case-1', 'When was the first MRI?');

    expect(toolExecutor.execute).toHaveBeenCalledWith('case-1', 'find_events', {
      keyword: 'MRI',
    });
    expect(result.toolCalls).toEqual([{ name: 'find_events', args: { keyword: 'MRI' } }]);
    expect(result.referencedEventIds).toEqual(['evt-1']);
    expect(result.reply).toBe('The first MRI was on 2024-01-05 (evt-1).');
  });

  it('never exceeds the iteration cap even if the model keeps requesting tool calls', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => completionWithToolCall('count_events', {}),
    });
    toolExecutor.execute.mockResolvedValue({ count: 3 });
    const service = new AiChatService(
      fakeConfig({ OPENAI_API_KEY: 'test-key' }),
      toolExecutor as unknown as ToolExecutor,
    );

    const result = await service.chat('case-1', 'An intentionally convoluted multi-part question');

    // MAX_ITERATIONS = 4 per PRD-AI-Chat.md §3/§8 — bounds worst-case latency.
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(toolExecutor.execute).toHaveBeenCalledTimes(4);
    expect(result.reply).toMatch(/tool-call budget/i);
  });
});
