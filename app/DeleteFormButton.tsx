"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DeleteFormButtonProps = {
  formId: string;
  formTitle: string;
};

export default function DeleteFormButton({
  formId,
  formTitle,
}: DeleteFormButtonProps) {
  const router = useRouter();

  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${formTitle}"? This will also delete all fields and responses.`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setIsDeleting(true);

    try {
      const response = await fetch(
        `/api/forms/${formId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || "Could not delete form."
        );
        return;
      }

      router.refresh();
    } catch {
      setError(
        "Something went wrong. Please try again."
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="text-sm font-medium text-red-600 disabled:opacity-50"
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </button>

      {error && (
        <p className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}