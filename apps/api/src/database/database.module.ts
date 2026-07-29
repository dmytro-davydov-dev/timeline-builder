import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { DataSourceOptions } from 'typeorm';
import * as path from 'path';
// Unused directly — forces sql.js into serverless bundlers' dependency trace.
// TypeORM loads its driver package via a dynamic `require(driverPackage)`
// based on the `type` string below, which static tracers (e.g. Vercel's
// function bundler) can't follow, so they drop sql.js from the deployed
// bundle and it fails at runtime with DriverPackageNotInstalledError. A
// plain static import of the same package elsewhere in the reachable graph
// makes it visible to the tracer without changing any behavior here.
import 'sql.js';
// Same problem, one level deeper: sql.js's own wasm loader builds the path
// to `sql-wasm.wasm` at runtime via string concatenation (`__dirname + "/" +
// "sql-wasm.wasm"`), which static tracers also can't follow — so the JS
// glue file gets bundled but the wasm binary it needs doesn't, and it fails
// at runtime with ENOENT for sql-wasm.wasm. A literal require.resolve() of
// the same path (verified against @vercel/nft directly) makes the tracer
// pick up the binary too, without loading or executing it.
require.resolve('sql.js/dist/sql-wasm.wasm');
// Same dynamic-require problem as sql.js above, for the `pg` driver used
// when DATABASE_URL is set (see below) — a plain static import keeps it
// visible to Vercel's dependency tracer.
import 'pg';
import { Case } from '../cases/entities/case.entity';
import { Milestone } from '../cases/entities/milestone.entity';
import { MedicalEvent } from '../medical-events/entities/medical-event.entity';

/**
 * SQLite for local dev (zero setup) via the pure-JS `sql.js` TypeORM driver
 * (no native-addon build step) — used whenever DATABASE_URL is unset.
 *
 * IMPORTANT — do not run sql.js on Vercel (or any stateless serverless
 * platform): the filesystem is read-only outside `/tmp`, and `/tmp` itself
 * is wiped between separate invocations/cold starts. A case created by one
 * invocation (the import POST) can be invisible to the very next request
 * (the case-view GETs) if it lands on a different instance — surfacing as
 * 404s on `/cases/:id` right after a successful import, and empty
 * body-map/calendar panels in the UI. This bit us in production; see git
 * history around 2026-07-29. The fix is this module's Postgres branch, not
 * further sql.js/Vercel bundling workarounds.
 *
 * Set DATABASE_URL (any standard postgres:// connection string — Vercel
 * Postgres, Neon, Supabase, Render, etc.) to switch to Postgres, which is
 * the only supported configuration for stateless/serverless deployment.
 * `ssl: { rejectUnauthorized: false }` matches how most managed Postgres
 * providers terminate TLS with a cert not in Node's default trust store.
 * `uuidExtension: 'pgcrypto'` + TypeORM's default `installExtensions: true`
 * make `@PrimaryGeneratedColumn('uuid')` work out of the box on providers
 * that allow `CREATE EXTENSION IF NOT EXISTS "pgcrypto"` for the app role
 * (true for Neon/Vercel Postgres/Supabase); if a provider blocks it, run
 * that statement once manually as an admin.
 *
 * Entities intentionally omit an explicit `type: 'datetime'` on Date
 * columns (see case.entity.ts / milestone.entity.ts / medical-event.entity.ts)
 * so TypeORM infers the DB-appropriate column type per driver — "datetime"
 * has no Postgres equivalent and would fail schema sync if declared as a
 * literal string type.
 */
const defaultDatabasePath = process.env.VERCEL
  ? '/tmp/medical-timeline.sqlite'
  : './data/medical-timeline.sqlite';

function buildDataSourceOptions(config: ConfigService): DataSourceOptions {
  const databaseUrl = config.get<string>('DATABASE_URL');
  if (databaseUrl) {
    return {
      type: 'postgres',
      url: databaseUrl,
      ssl: { rejectUnauthorized: false },
      uuidExtension: 'pgcrypto',
      entities: [Case, Milestone, MedicalEvent],
      synchronize: true, // Phase 1 only — replace with migrations before Phase 2.
    };
  }
  return {
    type: 'sqljs',
    location: path.resolve(
      process.cwd(),
      config.get<string>('DATABASE_PATH', defaultDatabasePath),
    ),
    autoSave: true,
    entities: [Case, Milestone, MedicalEvent],
    synchronize: true, // Phase 1 only — replace with migrations before Phase 2.
  };
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => buildDataSourceOptions(config),
    }),
  ],
})
export class DatabaseModule {}
