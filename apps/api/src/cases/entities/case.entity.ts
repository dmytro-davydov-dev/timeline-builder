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
  //
  // Typed `Date` with only the `?` optional modifier — NOT `Date | null`.
  // TypeScript's emitDecoratorMetadata can't serialize a union type into a
  // single reflected constructor, so an explicit `| null` here makes it
  // emit `Object` instead of `Date`, which TypeORM then can't map to a
  // valid column type on Postgres (DataTypeNotSupportedError at boot).
  // `?` alone doesn't have this problem and behaves identically at runtime
  // (nullable column, reads back as `null` either way) — nothing in this
  // codebase relies on the type-level distinction between `undefined` and
  // `null` here.
  @Column({ nullable: true })
  accidentDate?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => MedicalEvent, (event) => event.case)
  events: MedicalEvent[];

  @OneToMany(() => Milestone, (milestone) => milestone.case)
  milestones: Milestone[];
}
