import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import DeleteFormButton from "./DeleteFormButton";
import DuplicateFormButton from "./DuplicateFormButton";
import Navbar from "./components/Navbar";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const forms = await db.orm.public.Form
    .where({ userId: user.id })
    .all();

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <div>
            <h1 className="text-3xl font-semibold">
              My Forms
            </h1>

            <p className="mt-2 text-gray-600">
              Create and manage your forms.
            </p>
          </div>
        </div>

        {forms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <h2 className="font-medium">
              No forms yet
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Create your first form to get started.
            </p>

            <Link
              href="/forms/new"
              className="mt-6 inline-block rounded-lg bg-black px-5 py-3 text-sm font-medium text-white"
            >
              Create Your First Form
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {forms.map((form) => (
              <div
                key={form.id}
                className="rounded-xl border border-gray-200 bg-white p-6"
              >
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {form.title}
                    </h2>

                    {form.description && (
                      <p className="mt-1 text-sm text-gray-500">
                        {form.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <Link
                      href={"/forms/" + form.id + "/edit"}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium"
                    >
                      Edit
                    </Link>

                    <Link
                      href={"/forms/" + form.id + "/responses"}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium"
                    >
                      Responses
                    </Link>

                    <Link
                      href={"/forms/view/" + form.slug}
                      className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
                    >
                      View Form
                    </Link>

                    <DuplicateFormButton
                      formId={form.id}
                    />

                    <DeleteFormButton
                      formId={form.id}
                      formTitle={form.title}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}