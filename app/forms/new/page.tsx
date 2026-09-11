import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NewFormForm from "./NewFormForm";

export default async function NewFormPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900">
            Create a new form
          </h1>

          <p className="mt-2 text-gray-600">
            Start by giving your form a title and description.
          </p>
        </div>

        <NewFormForm />
      </div>
    </main>
  );
}