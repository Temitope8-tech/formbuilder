"use client";

import { useEffect, useState } from "react";

type ShareFormProps = {
  path: string;
};

export default function ShareForm({
  path,
}: ShareFormProps) {
  const [publicUrl, setPublicUrl] = useState(path);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setPublicUrl(`${window.location.origin}${path}`);
  }, [path]);

  async function handleCopy() {
    setError("");
    setCopied(false);

    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setError(
        "Could not copy the link. Please copy it manually."
      );
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">
          Share your form
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Share this link with people who need to fill out your form.
        </p>
      </div>

      <div className="rounded-lg bg-gray-50 p-4">
        <p className="break-all text-sm text-gray-600">
          {publicUrl}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          {copied ? "Copied!" : "Copy Link"}
        </button>

        <a
          href={path}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Open Form
        </a>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {copied && (
        <p className="mt-3 text-sm text-green-600">
          Form link copied to your clipboard.
        </p>
      )}
    </div>
  );
}