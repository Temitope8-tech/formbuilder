"use client";

import { FormEvent, useState } from "react";

type FieldBuilderProps = {
  formId: string;
};

export default function FieldBuilder({
  formId,
}: FieldBuilderProps) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState("text");
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState("");
  const [minLength, setMinLength] = useState("");
  const [maxLength, setMaxLength] = useState("");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const needsOptions =
    type === "select" ||
    type === "radio" ||
    type === "checkbox";

  const needsLengthValidation =
    type === "text" || type === "textarea";

  const needsValueValidation = type === "number";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setIsSaving(true);

    const parsedOptions = options
      .split("\n")
      .map((option) => option.trim())
      .filter(Boolean);

    if (needsOptions && parsedOptions.length === 0) {
      setError("Please add at least one option.");
      setIsSaving(false);
      return;
    }

    if (
      needsLengthValidation &&
      minLength &&
      maxLength &&
      Number(minLength) > Number(maxLength)
    ) {
      setError(
        "Minimum length cannot be greater than maximum length."
      );
      setIsSaving(false);
      return;
    }

    if (
      needsValueValidation &&
      minValue &&
      maxValue &&
      Number(minValue) > Number(maxValue)
    ) {
      setError(
        "Minimum value cannot be greater than maximum value."
      );
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch(`/api/forms/${formId}/fields`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          label,
          type,
          required,
          options: needsOptions ? parsedOptions : null,
          minLength: needsLengthValidation
            ? minLength || null
            : null,
          maxLength: needsLengthValidation
            ? maxLength || null
            : null,
          minValue: needsValueValidation
            ? minValue || null
            : null,
          maxValue: needsValueValidation
            ? maxValue || null
            : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not create field.");
        return;
      }

      setLabel("");
      setType("text");
      setRequired(false);
      setOptions("");
      setMinLength("");
      setMaxLength("");
      setMinValue("");
      setMaxValue("");

      window.location.reload();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleTypeChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const newType = event.target.value;

    setType(newType);
    setError("");

    if (
      newType !== "select" &&
      newType !== "radio" &&
      newType !== "checkbox"
    ) {
      setOptions("");
    }

    if (newType !== "text" && newType !== "textarea") {
      setMinLength("");
      setMaxLength("");
    }

    if (newType !== "number") {
      setMinValue("");
      setMaxValue("");
    }
  }

  return (
    <div className="mt-6">
      <div className="mb-4">
        <h3 className="font-medium">
          Add a new field
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          Create one question at a time. You can add as many fields as you need.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-lg border border-gray-200 bg-gray-50 p-5"
      >
        <div>
          <label
            htmlFor="field-label"
            className="mb-2 block text-sm font-medium"
          >
            Field label
          </label>

          <input
            id="field-label"
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="What is your name?"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
            required
          />
        </div>

        <div>
          <label
            htmlFor="field-type"
            className="mb-2 block text-sm font-medium"
          >
            Field type
          </label>

          <select
            id="field-type"
            value={type}
            onChange={handleTypeChange}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
          >
            <option value="text">Short Text</option>
            <option value="name">Name</option>
            <option value="textarea">Long Text</option>
            <option value="email">Email</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="select">Dropdown</option>
            <option value="radio">Radio Buttons</option>
            <option value="checkbox">Checkboxes</option>
            <option value="file">File Upload</option>
          </select>
        </div>

        {needsOptions && (
          <div>
            <label
              htmlFor="field-options"
              className="mb-2 block text-sm font-medium"
            >
              Options
            </label>

            <textarea
              id="field-options"
              value={options}
              onChange={(event) => setOptions(event.target.value)}
              placeholder={"Option 1\nOption 2\nOption 3"}
              rows={5}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
            />

            <p className="mt-2 text-xs text-gray-500">
              Enter one option per line.
            </p>
          </div>
        )}

        {needsLengthValidation && (
          <div>
            <p className="mb-3 text-sm font-medium">
              Length validation
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="min-length"
                  className="mb-2 block text-sm text-gray-600"
                >
                  Minimum length
                </label>

                <input
                  id="min-length"
                  type="number"
                  min="0"
                  value={minLength}
                  onChange={(event) =>
                    setMinLength(event.target.value)
                  }
                  placeholder="No minimum"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
                />
              </div>

              <div>
                <label
                  htmlFor="max-length"
                  className="mb-2 block text-sm text-gray-600"
                >
                  Maximum length
                </label>

                <input
                  id="max-length"
                  type="number"
                  min="0"
                  value={maxLength}
                  onChange={(event) =>
                    setMaxLength(event.target.value)
                  }
                  placeholder="No maximum"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
                />
              </div>
            </div>
          </div>
        )}

        {needsValueValidation && (
          <div>
            <p className="mb-3 text-sm font-medium">
              Number validation
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="min-value"
                  className="mb-2 block text-sm text-gray-600"
                >
                  Minimum value
                </label>

                <input
                  id="min-value"
                  type="number"
                  value={minValue}
                  onChange={(event) =>
                    setMinValue(event.target.value)
                  }
                  placeholder="No minimum"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
                />
              </div>

              <div>
                <label
                  htmlFor="max-value"
                  className="mb-2 block text-sm text-gray-600"
                >
                  Maximum value
                </label>

                <input
                  id="max-value"
                  type="number"
                  value={maxValue}
                  onChange={(event) =>
                    setMaxValue(event.target.value)
                  }
                  placeholder="No maximum"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
                />
              </div>
            </div>
          </div>
        )}

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={required}
            onChange={(event) => setRequired(event.target.checked)}
            className="h-4 w-4"
          />

          <span>Required field</span>
        </label>

        {error && (
          <p className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isSaving ? "Adding..." : "Add Field"}
        </button>
      </form>
    </div>
  );
}