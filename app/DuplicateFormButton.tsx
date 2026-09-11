"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DuplicateFormButtonProps = {
  formId: string;
};

export default function DuplicateFormButton({
  formId,
}: DuplicateFormButtonProps) {
  const router = useRouter();

  const [isDuplicating, setIsDuplicating] =
    useState(false);
  const [error, setError] = useState("");

  async function handleDuplicate() {
    setError("");
    setIsDuplicating(true);

    try {
      const response = await fetch(
        `/api/forms/${formId}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || "Could not duplicate form."
        );
        return;
      }

      router.refresh();
    } catch {
      setError(
        "Something went wrong. Please try again."
      );
    } finally {
      setIsDuplicating(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleDuplicate}
        disabled={isDuplicating}
        className="text-sm font-medium disabled:opacity-50"
      >
        {isDuplicating ? "Duplicating..." : "Duplicate"}
      </button>

      {error && (
        <p className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}