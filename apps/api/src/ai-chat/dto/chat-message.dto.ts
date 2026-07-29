import { IsArray, IsOptional, IsString } from 'class-validator';

export class ChatHistoryTurn {
  @IsString()
  role: 'user' | 'assistant';

  @IsString()
  content: string;
}

export class ChatMessageDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  history?: ChatHistoryTurn[];
}
