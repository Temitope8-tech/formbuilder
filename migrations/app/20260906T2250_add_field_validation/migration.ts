#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/6521673ebdbff15bc0a48471ffa6261a39ab0a7d964af74b45402d3f652bebd3/contract';
import startContract from '../../snapshots/6521673ebdbff15bc0a48471ffa6261a39ab0a7d964af74b45402d3f652bebd3/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/dd5ccf355dd35382111c7a3ee2e13c5eb1fc118e465150aeace8703001caf152/contract';
import endContract from '../../snapshots/dd5ccf355dd35382111c7a3ee2e13c5eb1fc118e465150aeace8703001caf152/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'formField',
        column: col('maxLength', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'formField',
        column: col('maxValue', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'formField',
        column: col('minLength', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'formField',
        column: col('minValue', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
