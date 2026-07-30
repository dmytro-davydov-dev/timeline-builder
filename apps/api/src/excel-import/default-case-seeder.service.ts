import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { existsSync, readFileSync } from 'fs';
import * as path from 'path';
import { Case } from '../cases/entities/case.entity';
import { ExcelImportService } from './excel-import.service';

const DEFAULT_CASE_NAME = 'Caldwell - Medical Chronology';
const DEFAULT_ASSET_RELATIVE_PATH = path.join(
  'assets',
  'Caldwell - Medical Chronology.xlsx',
);

/**
 * Phase 1 is single-case-per-session (docs/PRD-Case-Management.md §2) with
 * no case list/switcher UI, so the app needs *some* case to exist the first
 * time anyone opens it — otherwise the root route has nothing to show and
 * falls back to the bare Upload screen. On boot, if no case is marked
 * `isDefault`, import the bundled demo Excel (`apps/api/assets/` — the same
 * "Caldwell - Medical Chronology" case referenced throughout
 * docs/AI-Chat-Spot-Check.md) and mark it default, so `GET /cases/default`
 * (cases.controller.ts / CasesService.findDefault) always has a
 * deterministic case to return.
 *
 * Guarded by the `isDefault` flag rather than a plain row count — a
 * pre-existing, *unrelated* case (leftover manual `npm run seed` runs, an
 * old test import, someone else's uploaded case) must not block seeding
 * the real default, and once a default exists this must never re-seed or
 * duplicate it. A user's own uploaded case is never touched either way,
 * since it's never marked `isDefault`.
 *
 * The asset path is resolved relative to `process.cwd()` (same convention
 * as DATABASE_PATH in database.module.ts) rather than `__dirname`, so it
 * resolves the same way whether running under ts-node (dev/seed script) or
 * `node dist/main` (prod) — both are invoked with apps/api as the working
 * directory. Override with DEFAULT_CASE_EXCEL_PATH if the asset moves or a
 * deployment wants a different default case.
 */
@Injectable()
export class DefaultCaseSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(DefaultCaseSeeder.name);

  constructor(
    @InjectRepository(Case) private readonly cases: Repository<Case>,
    private readonly excelImportService: ExcelImportService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const existingDefaultCount = await this.cases.count({
      where: { isDefault: true },
    });
    if (existingDefaultCount > 0) return;

    const assetPath = path.resolve(
      process.cwd(),
      this.config.get<string>(
        'DEFAULT_CASE_EXCEL_PATH',
        DEFAULT_ASSET_RELATIVE_PATH,
      ),
    );

    if (!existsSync(assetPath)) {
      this.logger.warn(
        `No default case is set and the default case asset was not found at ${assetPath} — skipping auto-seed. The app will show the Upload screen until a case is imported.`,
      );
      return;
    }

    try {
      const buffer = readFileSync(assetPath);
      const summary = await this.excelImportService.importFile(
        buffer,
        path.basename(assetPath),
        DEFAULT_CASE_NAME,
      );
      await this.cases.update(summary.caseId, { isDefault: true });
      this.logger.log(
        `Seeded default case "${DEFAULT_CASE_NAME}" (${summary.caseId}) — ${summary.importSummary.rowsImported} rows imported.`,
      );
    } catch (err) {
      this.logger.error(
        'Failed to seed default case',
        err instanceof Error ? err.stack : err,
      );
    }
  }
}
