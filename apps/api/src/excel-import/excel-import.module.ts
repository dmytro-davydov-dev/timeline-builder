import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Case } from '../cases/entities/case.entity';
import { ExcelImportService } from './excel-import.service';
import { ExcelImportController } from './excel-import.controller';
import { DefaultCaseSeeder } from './default-case-seeder.service';

@Module({
  imports: [TypeOrmModule.forFeature([Case])],
  controllers: [ExcelImportController],
  providers: [ExcelImportService, DefaultCaseSeeder],
})
export class ExcelImportModule {}
