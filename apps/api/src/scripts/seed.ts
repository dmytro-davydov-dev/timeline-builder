/* eslint-disable no-console */
import { NestFactory } from '@nestjs/core';
import { readFileSync } from 'fs';
import { AppModule } from '../app.module';
import { ExcelImportService } from '../excel-import/excel-import.service';

/**
 * Loads a sample Excel file into a demo case for reliable local
 * testing / the demo itself (Medical-Timeline-Phase1-Implementation-Plan.md
 * §0). Usage: `npm run seed --workspace=apps/api -- ./path/to/sample.xlsx`
 */
async function seed() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npm run seed -- <path-to-sample.xlsx>');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  const importService = app.get(ExcelImportService);

  const buffer = readFileSync(filePath);
  const summary = await importService.importFile(
    buffer,
    filePath.split('/').pop() ?? 'seed.xlsx',
    'Demo Case',
  );

  console.log(`Seeded case ${summary.caseId}`);
  console.log(`  rows imported: ${summary.importSummary.rowsImported}`);
  console.log(`  rows skipped:  ${summary.importSummary.rowsSkipped}`);
  if (summary.importSummary.warnings.length > 0) {
    console.log('  warnings:', summary.importSummary.warnings);
  }

  await app.close();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
