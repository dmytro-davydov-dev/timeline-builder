import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as path from 'path';
import { Case } from '../cases/entities/case.entity';
import { Milestone } from '../cases/entities/milestone.entity';
import { MedicalEvent } from '../medical-events/entities/medical-event.entity';

/**
 * SQLite for MVP (zero local setup), driver-level swap to Postgres later
 * with no code change beyond these connection options — see
 * docs/Architecture.md §14 decision #5.
 *
 * Uses the pure-JS `sql.js` TypeORM driver rather than `better-sqlite3` /
 * `sqlite3` so the project has no native-addon build step.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'sqljs' as const,
        location: path.resolve(
          process.cwd(),
          config.get<string>('DATABASE_PATH', './data/medical-timeline.sqlite'),
        ),
        autoSave: true,
        entities: [Case, Milestone, MedicalEvent],
        synchronize: true, // Phase 1 only — replace with migrations before Phase 2.
      }),
    }),
  ],
})
export class DatabaseModule {}
