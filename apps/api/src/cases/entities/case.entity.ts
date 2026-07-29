import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MedicalEvent } from '../../medical-events/entities/medical-event.entity';
import { Milestone } from './milestone.entity';

/**
 * A single personal-injury case: one imported Excel produces one Case plus
 * its MedicalEvent rows. Phase 1 assumes single-case-per-session (no auth) —
 * see docs/PRD-Case-Management.md §2.
 */
@Entity({ name: 'cases' })
export class Case {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  patientAlias?: string;

  /**
   * Promoted to a first-class field (rather than only a generic Milestone
   * row) because every panel reads it on every render — see
   * docs/Architecture.md §6.
   */
  // No explicit `type: 'datetime'` — TypeORM infers the right DDL type per
  // driver from the Date design-type ("datetime" on sql.js, "timestamp
  // without time zone" on Postgres); see database.module.ts.
  @Column({ nullable: true })
  accidentDate?: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => MedicalEvent, (event) => event.case)
  events: MedicalEvent[];

  @OneToMany(() => Milestone, (milestone) => milestone.case)
  milestones: Milestone[];
}
