import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Case } from './entities/case.entity';
import { Milestone } from './entities/milestone.entity';
import { SetMilestoneDto } from './dto/set-milestone.dto';

@Injectable()
export class CasesService {
  constructor(
    @InjectRepository(Case) private readonly cases: Repository<Case>,
    @InjectRepository(Milestone)
    private readonly milestones: Repository<Milestone>,
  ) {}

  async create(input: { name: string; patientAlias?: string }): Promise<Case> {
    const created = this.cases.create(input);
    return this.cases.save(created);
  }

  async findOne(id: string): Promise<Case> {
    const found = await this.cases.findOne({
      where: { id },
      relations: { milestones: true },
    });
    if (!found) throw new NotFoundException(`Case ${id} not found`);
    return found;
  }

  /**
   * `label: "accidentDate"` is the documented convention the frontend treats
   * specially (docs/Architecture.md §9): it both writes the generic
   * Milestone row and mirrors the value onto Case.accidentDate so every
   * panel can read it without a join.
   */
  async setMilestone(caseId: string, dto: SetMilestoneDto): Promise<Case> {
    const caseEntity = await this.findOne(caseId);

    let milestone = await this.milestones.findOne({
      where: { caseId, label: dto.label },
    });
    if (!milestone) {
      milestone = this.milestones.create({ caseId, label: dto.label });
    }
    milestone.date = new Date(dto.date);
    await this.milestones.save(milestone);

    if (dto.label === 'accidentDate') {
      caseEntity.accidentDate = milestone.date;
      await this.cases.save(caseEntity);
    }

    return this.findOne(caseId);
  }
}
