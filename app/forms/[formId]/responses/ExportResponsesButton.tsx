"use client";

import { useState } from "react";

type ExportResponsesButtonProps = {
  formId: string;
};

export default function ExportResponsesButton({
  formId,
}: ExportResponsesButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");

  async function handleExport() {
    setError("");
    setIsExporting(true);

    try {
      const response = await fetch(
        `/api/forms/${formId}/responses/export`
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);

        setError(
          data?.error || "Could not export responses."
        );

        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = "responses.csv";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch {
      setError(
        "Something went wrong. Please try again."
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleExport}
        disabled={isExporting}
        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
      >
        {isExporting
          ? "Exporting..."
          : "Export CSV"}
      </button>

      {error && (
        <p className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}