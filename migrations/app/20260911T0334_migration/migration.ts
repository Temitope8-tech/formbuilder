#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/3a1e14a11ea689b35d35de46b69eaa9831d5878aa9696cd846532a672f09dd99/contract';
import endContract from '../../snapshots/3a1e14a11ea689b35d35de46b69eaa9831d5878aa9696cd846532a672f09dd99/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/cbbbd86d1fa256ef9f7e0b84ffe8236522546c5a58030f51062afbf8bc30eec8/contract';
import startContract from '../../snapshots/cbbbd86d1fa256ef9f7e0b84ffe8236522546c5a58030f51062afbf8bc30eec8/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'fileAttachment',
        columns: [
          col('answerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('contentType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('fileName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('size', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('storagePath', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'fileAttachment',
        constraint: 'fileAttachment_answerId_key',
        columns: ['answerId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'fileAttachment',
        foreignKey: {
          name: 'fileAttachment_answerId_fkey',
          columns: ['answerId'],
          references: { schema: 'public', table: 'answer', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
