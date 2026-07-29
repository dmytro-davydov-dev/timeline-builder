import { Body, Controller, Param, Post } from '@nestjs/common';
import { AiChatService } from './ai-chat.service';
import { ChatMessageDto } from './dto/chat-message.dto';

@Controller('cases/:caseId/chat')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Post()
  chat(@Param('caseId') caseId: string, @Body() dto: ChatMessageDto) {
    return this.aiChatService.chat(caseId, dto.message, dto.history);
  }
}
