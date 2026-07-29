import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExcelImportService } from './excel-import.service';

/** Minimal shape we rely on from Multer's in-memory file — avoids a hard
 * dependency on @types/multer while staying structurally compatible. */
interface UploadedExcelFile {
  originalname: string;
  buffer: Buffer;
}

@Controller('cases')
export class ExcelImportController {
  constructor(private readonly importService: ExcelImportService) {}

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async import(@UploadedFile() file: UploadedExcelFile) {
    if (!file) {
      throw new BadRequestException('No file uploaded (field name "file")');
    }
    return this.importService.importFile(file.buffer, file.originalname);
  }
}
