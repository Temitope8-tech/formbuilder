import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

function escapeCsvValue(value: string) {
  let safeValue = value;

  if (/^[=+\-@]/.test(safeValue)) {
    safeValue = `'${safeValue}`;
  }

  safeValue = safeValue.replace(/"/g, '""');

  return `"${safeValue}"`;
}

function formatAnswer(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  try {
    const parsedValue = JSON.parse(value);

    if (Array.isArray(parsedValue)) {
      return parsedValue.join(", ");
    }

    return value;
  } catch {
    return value;
  }
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      formId: string;
    }>;
  }
) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { formId } = await context.params;

  const form = await db.orm.public.Form.first({
    id: formId,
    userId: user.id,
  });

  if (!form) {
    return Response.json(
      { error: "Form not found" },
      { status: 404 }
    );
  }

  const fields = await db.orm.public.FormField
    .where({ formId })
    .orderBy((field) => field.position.asc())
    .all();

  const submissions = await db.orm.public.Submission
    .include("answers")
    .where({ formId })
    .orderBy((submission) => submission.submittedAt.asc())
    .all();

  const headers = [
    "Response Date",
    ...fields.map((field) => field.label),
  ];

  const rows = submissions.map((submission) => {
    const answersByFieldId = new Map(
      submission.answers.map((answer) => [
        answer.fieldId,
        answer,
      ])
    );

    return [
      formatDate(submission.submittedAt),
      ...fields.map((field) => {
        const answer =
          answersByFieldId.get(field.id);

        return answer
          ? formatAnswer(answer.value)
          : "";
      }),
    ];
  });

  const csv = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) =>
      row.map(escapeCsvValue).join(",")
    ),
  ].join("\r\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="responses.csv"',
      "Cache-Control": "no-store",
    },
  });
}