"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type FormDetailsProps = {
  formId: string;
  initialTitle: string;
  initialDescription: string;
};

export default function FormDetails({
  formId,
  initialTitle,
  initialDescription,
}: FormDetailsProps) {
  const router = useRouter();

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] =
    useState(initialDescription);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }

    if (trimmedTitle.length > 200) {
      setError(
        "Title must be 200 characters or less."
      );
      return;
    }

    if (trimmedDescription.length > 2000) {
      setError(
        "Description must be 2000 characters or less."
      );
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(
        `/api/forms/${formId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: trimmedTitle,
            description: trimmedDescription,
          }),
        }
      );

      let data: {
        title?: string;
        description?: string | null;
        error?: string;
      };

      try {
        data = await response.json();
      } catch {
        setError(
          "Something went wrong. Please try again."
        );
        return;
      }

      if (!response.ok) {
        setError(
          data.error || "Could not update form."
        );
        return;
      }

      setTitle(data.title || trimmedTitle);
      setDescription(data.description || "");
      setMessage("Form details saved.");

      router.refresh();
    } catch {
      setError(
        "Something went wrong. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">
          Form Details
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Change the title and description of your form.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <div>
          <label
            htmlFor="form-title"
            className="mb-2 block text-sm font-medium"
          >
            Title
          </label>

          <input
            id="form-title"
            type="text"
            value={title}
            maxLength={200}
            onChange={(event) =>
              setTitle(event.target.value)
            }
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
            required
          />

          <p className="mt-1 text-xs text-gray-500">
            Maximum 200 characters.
          </p>
        </div>

        <div>
          <label
            htmlFor="form-description"
            className="mb-2 block text-sm font-medium"
          >
            Description
          </label>

          <textarea
            id="form-description"
            value={description}
            maxLength={2000}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
          />

          <p className="mt-1 text-xs text-gray-500">
            Maximum 2000 characters.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600">
            {error}
          </p>
        )}

        {message && (
          <p className="text-sm text-green-600">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          {isSaving
            ? "Saving..."
            : "Save Form Details"}
        </button>
      </form>
    </div>
  );
}