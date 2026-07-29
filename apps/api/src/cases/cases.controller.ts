import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { CasesService } from './cases.service';
import { SetMilestoneDto } from './dto/set-milestone.dto';

@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get(':id')
  getCase(@Param('id') id: string) {
    return this.casesService.findOne(id);
  }

  @Patch(':id/milestones')
  setMilestone(@Param('id') id: string, @Body() dto: SetMilestoneDto) {
    return this.casesService.setMilestone(id, dto);
  }
}
