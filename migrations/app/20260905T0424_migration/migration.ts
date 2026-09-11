#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/6521673ebdbff15bc0a48471ffa6261a39ab0a7d964af74b45402d3f652bebd3/contract';
import endContract from '../../snapshots/6521673ebdbff15bc0a48471ffa6261a39ab0a7d964af74b45402d3f652bebd3/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/a719597f67b97df4b33eac5871430e545bb4af2f8c3f50526efad28b580a7262/contract';
import startContract from '../../snapshots/a719597f67b97df4b33eac5871430e545bb4af2f8c3f50526efad28b580a7262/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'answer',
        columns: [
          col('fieldId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('submissionId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('value', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'submission',
        columns: [
          col('formId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('submittedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'formField',
        column: col('options', 'json', { codecRef: { codecId: 'pg/json@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'answer',
        index: 'answer_fieldId_idx_44d815d7',
        columns: ['fieldId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'answer',
        index: 'answer_submissionId_idx_89cd3f4e',
        columns: ['submissionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'submission',
        index: 'submission_formId_idx_3c13a9fa',
        columns: ['formId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'answer',
        foreignKey: {
          name: 'answer_submissionId_fkey',
          columns: ['submissionId'],
          references: { schema: 'public', table: 'submission', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'answer',
        foreignKey: {
          name: 'answer_fieldId_fkey',
          columns: ['fieldId'],
          references: { schema: 'public', table: 'formField', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'submission',
        foreignKey: {
          name: 'submission_formId_fkey',
          columns: ['formId'],
          references: { schema: 'public', table: 'form', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
