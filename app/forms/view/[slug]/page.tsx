import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import PublicForm from "./PublicForm";

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const form = await db.orm.public.Form.first({
    slug,
  });

  if (!form) {
    notFound();
  }

  const fields = await db.orm.public.FormField
    .where({ formId: form.id })
    .orderBy((field) => field.position.asc())
    .all();

  const publicFields = fields.map((field) => ({
    id: field.id,
    label: field.label,
    type: field.type,
    required: field.required,
    options: Array.isArray(field.options)
      ? field.options.filter(
          (option): option is string =>
            typeof option === "string"
        )
      : null,
    minLength: field.minLength,
    maxLength: field.maxLength,
    minValue: field.minValue,
    maxValue: field.maxValue,
  }));

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold">
            {form.title}
          </h1>

          {form.description && (
            <p className="mt-2 text-gray-600">
              {form.description}
            </p>
          )}
        </div>

        <PublicForm
          formId={form.id}
          fields={publicFields}
        />
      </div>
    </main>
  );
}