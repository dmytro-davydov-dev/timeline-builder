import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Case } from '../../cases/entities/case.entity';

/**
 * One row of a case's medical history, normalized from an imported Excel
 * row. Matches docs/Architecture.md §6 / Medical-Timeline-Phase1-Implementation-Plan.md §1.
 */
@Entity({ name: 'medical_events' })
@Index(['caseId', 'date'])
@Index(['caseId', 'bodyPartsRaw'])
export class MedicalEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  caseId: string;

  @ManyToOne(() => Case, (c) => c.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'caseId' })
  case: Case;

  @Column({ type: 'datetime' })
  date: Date;

  /** e.g. "Office Visit", "MRI", "PT Session", "ER Visit" */
  @Column()
  recordType: string;

  @Column()
  provider: string;

  @Column({ nullable: true })
  facility?: string;

  /**
   * Comma-joined on write, split into string[] on read (see
   * MedicalEventsService.toResponse). Kept as a flat column so SQLite can
   * index/LIKE-match it directly (docs/Architecture.md §6).
   */
  @Column({ nullable: true })
  bodyPartsRaw?: string;

  @Column({ nullable: true })
  medicineType?: string;

  @Column({ type: 'text', nullable: true })
  summary?: string;

  /** Original filename, for traceability. */
  @Column({ nullable: true })
  sourceFile?: string;

  @Column({ nullable: true })
  pdfLink?: string;

  /** Original Excel row as JSON, for debugging/audit. Never logged (PHI). */
  @Column({ type: 'simple-json', nullable: true })
  rawRow?: Record<string, unknown>;
}
