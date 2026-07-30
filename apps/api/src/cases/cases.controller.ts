import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { CasesService } from './cases.service';
import { SetMilestoneDto } from './dto/set-milestone.dto';

@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  // Must be declared before the `:id` route below — Nest/Express matches
  // routes in registration order, and `:id` would otherwise swallow
  // `/cases/default` as a literal id lookup.
  @Get('default')
  getDefaultCase() {
    return this.casesService.findDefault();
  }

  @Get(':id')
  getCase(@Param('id') id: string) {
    return this.casesService.findOne(id);
  }

  @Patch(':id/milestones')
  setMilestone(@Param('id') id: string, @Body() dto: SetMilestoneDto) {
    return this.casesService.setMilestone(id, dto);
  }
}
