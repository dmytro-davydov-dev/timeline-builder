import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedicalEvent } from './entities/medical-event.entity';
import { MedicalEventsService } from './medical-events.service';
import { MedicalEventsController } from './medical-events.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MedicalEvent])],
  controllers: [MedicalEventsController],
  providers: [MedicalEventsService],
  exports: [MedicalEventsService],
})
export class MedicalEventsModule {}
