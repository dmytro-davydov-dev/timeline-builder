import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Case } from '../cases/entities/case.entity';
import { MedicalEvent } from '../medical-events/entities/medical-event.entity';
import { parseWorkbook } from './excel-parser';

export interface ImportSummary {
  caseId: string;
  importSummary: {
    rowsImported: number;
    rowsSkipped: number;
    warnings: { row: number; column?: string; reason: string }[];
  };
}

@Injectable()
export class ExcelImportService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Case) private readonly cases: Repository<Case>,
  ) {}

  async importFile(
    buffer: Buffer,
    filename: string,
    caseName?: string,
  ): Promise<ImportSummary> {
    const { rows, issues } = await parseWorkbook(buffer);

    if (rows.length === 0) {
      throw new BadRequestException({
        message: 'No importable rows found',
        warnings: issues,
      });
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const caseEntity = manager.create(Case, {
        name: caseName?.trim() || filename.replace(/\.[^.]+$/, ''),
      });
      const savedCase = await manager.save(caseEntity);

      const events = rows.map((row) =>
        manager.create(MedicalEvent, {
          caseId: savedCase.id,
          date: new Date(row.date),
          recordType: row.recordType,
          provider: row.provider,
          facility: row.facility,
          bodyPartsRaw: row.bodyPartsRaw,
          medicineType: row.medicineType,
          summary: row.summary,
          sourceFile: filename,
          pdfLink: row.pdfLink,
          rawRow: row.rawRow,
        }),
      );
      await manager.save(events);

      return savedCase;
    });

    return {
      caseId: result.id,
      importSummary: {
        rowsImported: rows.length,
        rowsSkipped: issues.length,
        warnings: issues,
      },
    };
  }
}
