import { Module } from '@nestjs/common';
import { MedicalEventsModule } from '../medical-events/medical-events.module';
import { AiChatService } from './ai-chat.service';
import { AiChatController } from './ai-chat.controller';
import { ToolExecutor } from './tools/tool-executor';

@Module({
  imports: [MedicalEventsModule],
  controllers: [AiChatController],
  providers: [AiChatService, ToolExecutor],
})
export class AiChatModule {}
