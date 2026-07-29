import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Case } from './entities/case.entity';
import { Milestone } from './entities/milestone.entity';
import { CasesService } from './cases.service';
import { CasesController } from './cases.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Case, Milestone])],
  controllers: [CasesController],
  providers: [CasesService],
  exports: [CasesService],
})
export class CasesModule {}
