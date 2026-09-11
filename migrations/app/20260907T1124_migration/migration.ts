#!/usr/bin/env -S node

import type { Contract as End } from "../../snapshots/cbbbd86d1fa256ef9f7e0b84ffe8236522546c5a58030f51062afbf8bc30eec8/contract";

import endContractJson from "../../snapshots/cbbbd86d1fa256ef9f7e0b84ffe8236522546c5a58030f51062afbf8bc30eec8/contract.json" with {
  type: "json",
};

import type { Contract as Start } from "../../snapshots/dd5ccf355dd35382111c7a3ee2e13c5eb1fc118e465150aeace8703001caf152/contract";

import startContractJson from "../../snapshots/dd5ccf355dd35382111c7a3ee2e13c5eb1fc118e465150aeace8703001caf152/contract.json" with {
  type: "json",
};

import {
  Migration,
  MigrationCLI,
  col,
  fn,
  primaryKey,
  rawSql,
} from "@prisma/orm-postgres/migration";

import postgresAdapter from "@prisma/orm-postgres/adapter/runtime";

import { sql } from "@prisma/orm-postgres/builder/runtime";

import {
  createExecutionContext,
  createSqlExecutionStack,
} from "@prisma/orm-postgres/family-runtime";

import postgresTarget, {
  PostgresContractSerializer,
} from "@prisma/orm-postgres/target/runtime";

const endContract =
  new PostgresContractSerializer().deserializeContract(
    endContractJson
  );

const stack = createSqlExecutionStack({
  target: postgresTarget,
  adapter: postgresAdapter,
});

const executionContext = createExecutionContext({
  contract: endContract,
  stack,
}) as any;

const db = sql<End>({
  context: executionContext,
  rawCodecInferer: stack.adapter.rawCodecInferer,
});

const legacyUserId =
  "00000000-0000-0000-0000-000000000001";

const legacyUserEmail =
  "legacy-owner@formbuilder.local";

export default class M extends Migration<Start, End> {
  override readonly startContractJson =
    startContractJson;

  override readonly endContractJson =
    endContractJson;

  override get operations() {
    return [
      this.createTable({
        schema: "public",
        table: "user",
        columns: [
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn("now()"),
            codecRef: {
              codecId: "pg/timestamptz-temporal@1",
            },
          }),
          col("email", "text", {
            notNull: true,
            codecRef: {
              codecId: "pg/text@1",
            },
          }),
          col("id", "text", {
            notNull: true,
            codecRef: {
              codecId: "pg/text@1",
            },
          }),
        ],
        constraints: [
          primaryKey(["id"]),
        ],
      }),

      this.addColumn({
        schema: "public",
        table: "form",
        column: col("userId", "text", {
          codecRef: {
            codecId: "pg/text@1",
          },
        }),
      }),

      rawSql({
        id: "seed.legacy-owner",
        label: "Create legacy form owner",
        operationClass: "data",
        target: {
          id: "postgres",
        },
        precheck: [
          {
            description:
              "Legacy owner does not exist",
            sql: `SELECT NOT EXISTS (
              SELECT 1
              FROM "public"."user"
              WHERE "id" = '${legacyUserId}'
            )`,
          },
        ],
        execute: [
          {
            description:
              "Create legacy form owner",
            sql: `INSERT INTO "public"."user" ("id", "email")
              VALUES ('${legacyUserId}', '${legacyUserEmail}')`,
          },
        ],
        postcheck: [
          {
            description:
              "Legacy owner now exists",
            sql: `SELECT EXISTS (
              SELECT 1
              FROM "public"."user"
              WHERE "id" = '${legacyUserId}'
                AND "email" = '${legacyUserEmail}'
            )`,
          },
        ],
      }),

      this.dataTransform(
        endContract,
        "backfill-form-userId",
        {
          check: () =>
            db.public.form
              .select("id")
              .where((f, fns) =>
                fns.eq(f.userId, null)
              )
              .limit(1),

          run: () =>
            db.public.form
              .update({
                userId: legacyUserId,
              })
              .where((f, fns) =>
                fns.eq(f.userId, null)
              ),
        }
      ),

      this.setNotNull({
        schema: "public",
        table: "form",
        column: "userId",
      }),

      this.addUnique({
        schema: "public",
        table: "user",
        constraint: "user_email_key",
        columns: ["email"],
      }),

      this.createIndex({
        schema: "public",
        table: "form",
        index: "form_userId_idx_a489d58a",
        columns: ["userId"],
      }),

      this.addForeignKey({
        schema: "public",
        table: "form",
        foreignKey: {
          name: "form_userId_fkey",
          columns: ["userId"],
          references: {
            schema: "public",
            table: "user",
            columns: ["id"],
          },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);