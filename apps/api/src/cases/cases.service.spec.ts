import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CasesService } from './cases.service';
import { Case } from './entities/case.entity';
import { Milestone } from './entities/milestone.entity';

/** Minimal in-memory stand-in for the TypeORM repository methods this
 * service actually calls, keyed by id so findOne/save behave consistently
 * across a test without a real database. */
function fakeRepo<T extends { id?: string }>() {
  const rows = new Map<string, T>();
  let counter = 0;
  return {
    rows,
    create: jest.fn((input: Partial<T>) => ({ ...input }) as T),
    save: jest.fn(async (input: T) => {
      const withId = { ...input, id: input.id ?? `id-${++counter}` } as T;
      rows.set(withId.id as string, withId);
      return withId;
    }),
    findOne: jest.fn(
      async ({ where }: { where: Record<string, unknown> }) => {
        for (const row of rows.values()) {
          const matches = Object.entries(where).every(
            ([key, value]) => (row as Record<string, unknown>)[key] === value,
          );
          if (matches) return row;
        }
        return null;
      },
    ),
  };
}

describe('CasesService', () => {
  let service: CasesService;
  let cases: ReturnType<typeof fakeRepo<Case>>;
  let milestones: ReturnType<typeof fakeRepo<Milestone>>;

  beforeEach(async () => {
    cases = fakeRepo<Case>();
    milestones = fakeRepo<Milestone>();

    // Real findOne({ relations: { milestones: true } }) eager-loads the
    // milestones relation — mirror that here so assertions on
    // `case.milestones` behave the same as against a real repository.
    const baseFindOne = cases.findOne;
    cases.findOne = jest.fn(async (options) => {
      const found = await baseFindOne(options);
      if (!found) return found;
      return {
        ...found,
        milestones: [...milestones.rows.values()].filter(
          (m) => m.caseId === found.id,
        ),
      };
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        CasesService,
        { provide: getRepositoryToken(Case), useValue: cases },
        { provide: getRepositoryToken(Milestone), useValue: milestones },
      ],
    }).compile();

    service = moduleRef.get(CasesService);
  });

  it('creates a case', async () => {
    const created = await service.create({ name: 'Case — 2026-07-29' });
    expect(created.name).toBe('Case — 2026-07-29');
    expect(created.id).toBeDefined();
  });

  it('throws NotFoundException for a missing case', async () => {
    await expect(service.findOne('missing-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('setting the accidentDate milestone mirrors it onto Case.accidentDate', async () => {
    const created = await service.create({ name: 'Case A' });

    const updated = await service.setMilestone(created.id, {
      label: 'accidentDate',
      date: '2024-03-01',
    });

    expect(updated.accidentDate).toEqual(new Date('2024-03-01'));
    expect(updated.milestones).toHaveLength(1);
    expect(updated.milestones[0]).toMatchObject({
      label: 'accidentDate',
      date: new Date('2024-03-01'),
    });
  });

  it('setting a non-accidentDate milestone does not touch Case.accidentDate', async () => {
    const created = await service.create({ name: 'Case B' });

    const updated = await service.setMilestone(created.id, {
      label: 'Surgery Date',
      date: '2024-05-10',
    });

    expect(updated.accidentDate).toBeUndefined();
    expect(updated.milestones).toHaveLength(1);
    expect(updated.milestones[0].label).toBe('Surgery Date');
  });

  it('updates an existing milestone in place instead of duplicating it', async () => {
    const created = await service.create({ name: 'Case C' });

    await service.setMilestone(created.id, {
      label: 'accidentDate',
      date: '2024-01-01',
    });
    const updated = await service.setMilestone(created.id, {
      label: 'accidentDate',
      date: '2024-02-02',
    });

    expect(updated.milestones).toHaveLength(1);
    expect(updated.accidentDate).toEqual(new Date('2024-02-02'));
  });

  it('setMilestone on a missing case throws NotFoundException', async () => {
    await expect(
      service.setMilestone('missing-id', {
        label: 'accidentDate',
        date: '2024-01-01',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
