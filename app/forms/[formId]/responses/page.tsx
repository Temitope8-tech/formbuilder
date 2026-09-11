import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import ExportResponsesButton from "./ExportResponsesButton";

export default async function ResponsesPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const { formId } = await params;

  const form = await db.orm.public.Form.first({
    id: formId,
    userId: user.id,
  });

  if (!form) {
    notFound();
  }

  const fields = await db.orm.public.FormField
    .where({ formId })
    .orderBy((field) => field.position.asc())
    .all();

  const submissions = await db.orm.public.Submission
    .include("answers")
    .where({ formId })
    .orderBy((submission) => submission.submittedAt.desc())
    .all();

  const allAnswers = submissions.flatMap(
    (submission) => submission.answers
  );

  const fileAttachments = await Promise.all(
    allAnswers.map(async (answer) => {
      const answerId = String(answer.id);

      const file = await db.orm.public.FileAttachment
        .where({
          answerId,
        })
        .first();

      return {
        answerId,
        file,
      };
    })
  );

  const filesByAnswerId = new Map(
    fileAttachments.map((item) => [
      item.answerId,
      item.file,
    ])
  );

  function formatAnswer(value: unknown) {
    if (typeof value !== "string") {
      return "No answer";
    }

    try {
      const parsedValue = JSON.parse(value);

      if (Array.isArray(parsedValue)) {
        return parsedValue.join(", ");
      }

      if (
        parsedValue &&
        typeof parsedValue === "object" &&
        !Array.isArray(parsedValue)
      ) {
        const firstName =
          typeof parsedValue.firstName === "string"
            ? parsedValue.firstName.trim()
            : "";

        const lastName =
          typeof parsedValue.lastName === "string"
            ? parsedValue.lastName.trim()
            : "";

        const fullName = [firstName, lastName]
          .filter(Boolean)
          .join(" ");

        return fullName || "No answer";
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

  function isImageFile(fileName: string) {
    return /\.(jpg|jpeg|png|webp)$/i.test(fileName);
  }

  function isPdfFile(fileName: string) {
    return /\.pdf$/i.test(fileName);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-start justify-between gap-6">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-500">
              Responses
            </p>

            <h1 className="text-3xl font-semibold">
              {form.title}
            </h1>

            <p className="mt-2 text-gray-600">
              {submissions.length}{" "}
              {submissions.length === 1
                ? "response"
                : "responses"}
            </p>
          </div>

          <ExportResponsesButton formId={formId} />
        </div>

        {submissions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <h2 className="font-medium">
              No responses yet
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Responses will appear here when someone
              submits this form.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {submissions.map((submission, index) => {
              const answersByFieldId = new Map(
                submission.answers.map((answer) => [
                  answer.fieldId,
                  answer,
                ])
              );

              return (
                <div
                  key={String(submission.id)}
                  className="rounded-xl border border-gray-200 bg-white p-6"
                >
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="font-semibold">
                      Response #{submissions.length - index}
                    </h2>

                    <p className="text-sm text-gray-500">
                      {formatDate(
                        submission.submittedAt
                      )}
                    </p>
                  </div>

                  <div className="space-y-5">
                    {fields.map((field) => {
                      const answer =
                        answersByFieldId.get(field.id);

                      const file = answer
                        ? filesByAnswerId.get(
                            String(answer.id)
                          )
                        : undefined;

                      return (
                        <div key={field.id}>
                          <p className="text-sm font-medium">
                            {field.label}
                          </p>

                          {!answer ? (
                            <p className="mt-1 text-gray-600">
                              No answer
                            </p>
                          ) : file ? (
                            <div className="mt-2">
                              {isImageFile(
                                file.fileName
                              ) ? (
                                <div className="space-y-3">
                                  <img
                                    src={`/api/forms/${formId}/files/${file.id}`}
                                    alt={file.fileName}
                                    className="max-h-64 max-w-md rounded-lg border border-gray-200 object-contain"
                                  />

                                  <div className="flex items-center gap-3">
                                    <p className="text-sm text-gray-500">
                                      {file.fileName}
                                    </p>

                                    <a
                                      href={`/api/forms/${formId}/files/${file.id}?download=true`}
                                      className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                                    >
                                      Download
                                    </a>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                                    <p className="text-sm font-medium text-gray-800">
                                      {file.fileName}
                                    </p>

                                    <p className="mt-1 text-xs text-gray-500">
                                      {isPdfFile(
                                        file.fileName
                                      )
                                        ? "PDF document"
                                        : "Uploaded file"}
                                    </p>
                                  </div>

                                  <a
                                    href={`/api/forms/${formId}/files/${file.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                                  >
                                    Open
                                  </a>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="mt-1 whitespace-pre-wrap text-gray-600">
                              {formatAnswer(
                                answer.value
                              )}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}