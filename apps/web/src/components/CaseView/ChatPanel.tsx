import { useState } from 'react';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { useChat } from '../../api/cases';
import type { ChatTurn } from '../../types';

interface ChatPanelProps {
  caseId: string;
  onReferencedEventIds: (eventIds: string[]) => void;
}

/**
 * Message list + input; on receiving referencedEventIds, notifies the
 * parent CaseView so it can dispatch a highlight state consumed by the
 * Body Map / Calendar panels (docs/Architecture.md §7.1, §10).
 */
export function ChatPanel({ caseId, onReferencedEventIds }: ChatPanelProps) {
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const chat = useChat(caseId);

  const send = async () => {
    if (!input.trim()) return;
    const message = input.trim();
    const nextHistory: ChatTurn[] = [...history, { role: 'user', content: message }];
    setHistory(nextHistory);
    setInput('');

    const response = await chat.mutateAsync({ message, history });
    setHistory([...nextHistory, { role: 'assistant', content: response.reply }]);
    onReferencedEventIds(response.referencedEventIds);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, height: '100%' }}>
      <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
        {history.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Try: "When was the first MRI?" or "Were there any treatment
            gaps?"
          </Typography>
        )}
        <Stack spacing={1}>
          {history.map((turn, i) => (
            <Box
              key={i}
              sx={{
                alignSelf: turn.role === 'user' ? 'flex-end' : 'flex-start',
                bgcolor: turn.role === 'user' ? 'primary.main' : 'grey.100',
                color: turn.role === 'user' ? 'primary.contrastText' : 'text.primary',
                px: 1.5,
                py: 1,
                borderRadius: 2,
                maxWidth: '85%',
              }}
            >
              <Typography variant="body2">{turn.content}</Typography>
            </Box>
          ))}
        </Stack>
      </Box>

      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          fullWidth
          placeholder="Ask a question about this case…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <Button variant="contained" onClick={send} disabled={chat.isPending}>
          Send
        </Button>
      </Stack>
    </Box>
  );
}
