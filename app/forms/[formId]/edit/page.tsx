import Link from "next/link";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import FieldBuilder from "./FieldBuilder";
import FieldItem from "./FieldItem";
import FormDetails from "./FormDetails";
import ShareForm from "./ShareForm";

export default async function EditFormPage({
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

const publicFormPath = `/forms/view/${form.slug}`;

return ( <main className="min-h-screen bg-gray-50"> <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10"> <header className="mb-8"> <div className="flex items-center justify-between gap-4"> <Link
           href="/"
           className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 transition hover:text-black"
         > <span aria-hidden="true" className="text-base leading-none">
‹ </span> <span>My Forms</span> </Link>

        <div className="flex items-center gap-3">
          <div className="hidden gap-3 sm:flex">
            <Link
              href={"/forms/" + formId + "/responses"}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Responses
            </Link>

            <Link
              href={publicFormPath}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              View Form
            </Link>
          </div>

          <details className="relative sm:hidden">
            <summary
              aria-label="Open form menu"
              className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 [&::-webkit-details-marker]:hidden"
            >
              <span className="flex flex-col gap-1" aria-hidden="true">
                <span className="block h-0.5 w-5 bg-current" />
                <span className="block h-0.5 w-5 bg-current" />
                <span className="block h-0.5 w-5 bg-current" />
              </span>
            </summary>

            <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
              <Link
                href={"/forms/" + formId + "/responses"}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              >
                Responses
              </Link>

              <Link
                href={publicFormPath}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              >
                View Form
              </Link>
            </div>
          </details>
        </div>
      </div>

      <div className="mt-7">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
          {form.title}
        </h1>

        {form.description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
            {form.description}
          </p>
        )}
      </div>
    </header>

    <div className="grid gap-8 md:grid-cols-[1fr_280px]">
      <section className="space-y-8">
        <FormDetails
          formId={formId}
          initialTitle={form.title}
          initialDescription={form.description || ""}
        />

        <ShareForm path={publicFormPath} />

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  Form Fields
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Add and arrange the questions people will answer.
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                {fields.length}{" "}
                {fields.length === 1 ? "field" : "fields"}
              </span>
            </div>
          </div>

          <FieldBuilder formId={formId} />

          <div className="mt-8">
            {fields.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center">
                <p className="font-medium">
                  Your form has no fields yet
                </p>

                <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                  Add a field above to create the questions your
                  visitors will answer.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <FieldItem
                    key={field.id}
                    formId={formId}
                    fieldId={field.id}
                    label={field.label}
                    type={field.type}
                    required={field.required}
                    position={index}
                    totalFields={fields.length}
                    options={
                      Array.isArray(field.options)
                        ? field.options.filter(
                            (option): option is string =>
                              typeof option === "string"
                          )
                        : null
                    }
                    minLength={field.minLength}
                    maxLength={field.maxLength}
                    minValue={field.minValue}
                    maxValue={field.maxValue}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <aside className="h-fit rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="font-semibold">
          Form Settings
        </h2>

        <div className="mt-5 space-y-5 text-sm">
          <div>
            <p className="text-gray-500">Title</p>

            <p className="mt-1 font-medium">
              {form.title}
            </p>
          </div>

          <div>
            <p className="text-gray-500">Fields</p>

            <p className="mt-1 font-medium">
              {fields.length}
            </p>
          </div>

          <div>
            <p className="text-gray-500">Public form</p>

            <Link
              href={publicFormPath}
              className="mt-1 block break-all font-medium text-blue-600 hover:underline"
            >
              {publicFormPath}
            </Link>
          </div>

          <div>
            <p className="text-gray-500">Slug</p>

            <p className="mt-1 break-all font-medium">
              {form.slug}
            </p>
          </div>
        </div>
      </aside>
    </div>
  </div>
</main>

);
}
