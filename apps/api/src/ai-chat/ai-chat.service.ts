import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatHistoryTurn } from './dto/chat-message.dto';
import { GROUNDING_SYSTEM_PROMPT, TOOL_DEFINITIONS } from './tools/tool-definitions';
import { ToolExecutor } from './tools/tool-executor';

const MAX_ITERATIONS = 4; // per Medical-Timeline-Phase1-Implementation-Plan.md §5

export interface ChatResponse {
  reply: string;
  referencedEventIds: string[];
  toolCalls: { name: string; args: Record<string, unknown> }[];
}

/**
 * Tool-calling orchestrator: send message + tool schemas to the LLM,
 * execute requested tool calls, feed results back, repeat until a final
 * answer or MAX_ITERATIONS (docs/Architecture.md §10).
 *
 * If no LLM provider key is configured, responds honestly that AI chat is
 * unavailable rather than fabricating an answer — consistent with the
 * grounding rule this module exists to enforce.
 */
@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly toolExecutor: ToolExecutor,
  ) {}

  async chat(
    caseId: string,
    message: string,
    history: ChatHistoryTurn[] = [],
  ): Promise<ChatResponse> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      return {
        reply:
          'AI chat is not configured yet — set OPENAI_API_KEY (or GEMINI_API_KEY, once that provider is wired up) in the API environment to enable grounded Q&A.',
        referencedEventIds: [],
        toolCalls: [],
      };
    }

    const messages: Array<Record<string, unknown>> = [
      { role: 'system', content: GROUNDING_SYSTEM_PROMPT },
      ...history.map((turn) => ({ role: turn.role, content: turn.content })),
      { role: 'user', content: message },
    ];

    const toolCallLog: { name: string; args: Record<string, unknown> }[] = [];
    const referencedEventIds = new Set<string>();

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const completion = await this.callOpenAi(apiKey, messages);
      const choice = completion.choices?.[0]?.message;
      if (!choice) break;

      if (!choice.tool_calls || choice.tool_calls.length === 0) {
        return {
          reply: choice.content ?? '',
          referencedEventIds: [...referencedEventIds],
          toolCalls: toolCallLog,
        };
      }

      messages.push({
        role: 'assistant',
        content: choice.content ?? null,
        tool_calls: choice.tool_calls,
      });

      for (const call of choice.tool_calls) {
        const name = call.function?.name ?? '';
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function?.arguments ?? '{}');
        } catch {
          this.logger.warn(`Failed to parse tool args for ${name}`);
        }

        toolCallLog.push({ name, args });
        const result = await this.toolExecutor.execute(caseId, name, args);
        this.collectEventIds(result, referencedEventIds);

        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }

    return {
      reply:
        "I wasn't able to reach a grounded answer within the tool-call budget for this question — try narrowing it.",
      referencedEventIds: [...referencedEventIds],
      toolCalls: toolCallLog,
    };
  }

  private async callOpenAi(apiKey: string, messages: Array<Record<string, unknown>>) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.get<string>('OPENAI_MODEL', 'gpt-4o-mini'),
        messages,
        tools: TOOL_DEFINITIONS,
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI request failed (${response.status}): ${text}`);
    }
    return response.json() as Promise<{
      choices?: Array<{
        message?: {
          content?: string;
          tool_calls?: Array<{
            id: string;
            function?: { name?: string; arguments?: string };
          }>;
        };
      }>;
    }>;
  }

  private collectEventIds(result: unknown, into: Set<string>) {
    if (Array.isArray(result)) {
      for (const item of result) {
        if (item && typeof item === 'object' && 'id' in item) {
          into.add(String((item as { id: unknown }).id));
        }
      }
    } else if (result && typeof result === 'object' && 'id' in result) {
      into.add(String((result as { id: unknown }).id));
    }
  }
}
