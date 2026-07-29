import { Controller, Get, Param, Query } from '@nestjs/common';
import { MedicalEventsService } from './medical-events.service';
import { QueryEventsDto } from './dto/query-events.dto';

@Controller('cases/:caseId')
export class MedicalEventsController {
  constructor(private readonly eventsService: MedicalEventsService) {}

  @Get('statistics')
  getStatistics(@Param('caseId') caseId: string) {
    return this.eventsService.getStatistics(caseId);
  }

  @Get('events/grouped-by-body-part')
  groupedByBodyPart(@Param('caseId') caseId: string) {
    return this.eventsService.groupedByBodyPart(caseId);
  }

  @Get('events/grouped-by-day')
  groupedByDay(@Param('caseId') caseId: string) {
    return this.eventsService.groupedByDay(caseId);
  }

  @Get('events/gaps')
  findGaps(
    @Param('caseId') caseId: string,
    @Query('thresholdDays') thresholdDays?: string,
  ) {
    return this.eventsService.findTreatmentGaps(
      caseId,
      thresholdDays ? Number(thresholdDays) : undefined,
    );
  }

  @Get('events/:eventId')
  getOne(@Param('caseId') caseId: string, @Param('eventId') eventId: string) {
    return this.eventsService.findOne(caseId, eventId);
  }

  @Get('events')
  findAll(@Param('caseId') caseId: string, @Query() filters: QueryEventsDto) {
    return this.eventsService.findByFilters(caseId, filters);
  }
}
