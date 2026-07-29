import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Case } from './case.entity';

/**
 * Generic case milestone (e.g. "Surgery Date"). The one milestone the UI
 * treats specially — accidentDate — is also mirrored as a first-class field
 * on Case; label: "accidentDate" is the documented convention the frontend
 * relies on (docs/Architecture.md §9).
 */
@Entity({ name: 'milestones' })
@Index(['caseId'])
export class Milestone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  caseId: string;

  @ManyToOne(() => Case, (c) => c.milestones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'caseId' })
  case: Case;

  @Column()
  label: string;

  // See case.entity.ts — no explicit `type: 'datetime'`, inferred per driver.
  @Column()
  date: Date;
}
