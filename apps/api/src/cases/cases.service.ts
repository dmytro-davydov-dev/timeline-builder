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
   * Phase 1 is single-case-per-session (docs/PRD-Case-Management.md §2) —
   * no multi-case switcher UI yet, so "the default case" needs to resolve
   * deterministically to the seeded demo case (DefaultCaseSeeder, marked
   * `isDefault: true`) rather than to "whatever is oldest" — a heuristic
   * that broke in practice as soon as stale/unrelated cases (leftover
   * manual seed runs, old test imports) predated it in the table. Falls
   * back to the oldest case only if nothing is explicitly marked, so this
   * still resolves to *something* in an environment seeded before this flag
   * existed. Used by the frontend's root route to skip the Upload screen on
   * startup.
   */
  async findDefault(): Promise<Case> {
    const [marked] = await this.cases.find({
      where: { isDefault: true },
      order: { createdAt: 'ASC' },
      relations: { milestones: true },
      take: 1,
    });
    if (marked) return marked;

    const [oldest] = await this.cases.find({
      order: { createdAt: 'ASC' },
      relations: { milestones: true },
      take: 1,
    });
    if (!oldest) throw new NotFoundException('No case exists yet');
    return oldest;
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
