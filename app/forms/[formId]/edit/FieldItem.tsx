"use client";

import { useState } from "react";

type FieldItemProps = {
  formId: string;
  fieldId: string;
  label: string;
  type: string;
  required: boolean;
  position: number;
  totalFields: number;
  options: string[] | null;
  minLength: number | null;
  maxLength: number | null;
  minValue: number | null;
  maxValue: number | null;
};

const optionTypes = ["select", "radio", "checkbox"];

function getFieldTypeLabel(type: string) {
  const labels: Record<string, string> = {
    text: "Short Text",
    name: "Name",
    textarea: "Long Text",
    email: "Email",
    number: "Number",
    date: "Date",
    select: "Dropdown",
    radio: "Radio Buttons",
    checkbox: "Checkboxes",
    file: "File Upload",
  };

  return labels[type] || type;
}

export default function FieldItem({
  formId,
  fieldId,
  label,
  type,
  required,
  position,
  totalFields,
  options,
  minLength,
  maxLength,
  minValue,
  maxValue,
}: FieldItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(label);
  const [editType, setEditType] = useState(type);
  const [editRequired, setEditRequired] = useState(required);
  const [editOptions, setEditOptions] = useState(
    options?.join("\n") || ""
  );
  const [editMinLength, setEditMinLength] = useState(
    minLength?.toString() || ""
  );
  const [editMaxLength, setEditMaxLength] = useState(
    maxLength?.toString() || ""
  );
  const [editMinValue, setEditMinValue] = useState(
    minValue?.toString() || ""
  );
  const [editMaxValue, setEditMaxValue] = useState(
    maxValue?.toString() || ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [error, setError] = useState("");

  const needsOptions = optionTypes.includes(editType);

  const needsLengthValidation =
    editType === "text" || editType === "textarea";

  const needsValueValidation = editType === "number";

  async function handleSave() {
    setError("");
    setIsSaving(true);

    const parsedOptions = editOptions
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
      editMinLength &&
      editMaxLength &&
      Number(editMinLength) > Number(editMaxLength)
    ) {
      setError(
        "Minimum length cannot be greater than maximum length."
      );
      setIsSaving(false);
      return;
    }

    if (
      needsValueValidation &&
      editMinValue &&
      editMaxValue &&
      Number(editMinValue) > Number(editMaxValue)
    ) {
      setError(
        "Minimum value cannot be greater than maximum value."
      );
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/forms/${formId}/fields/${fieldId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            label: editLabel,
            type: editType,
            required: editRequired,
            options: needsOptions ? parsedOptions : null,
            minLength: needsLengthValidation
              ? editMinLength || null
              : null,
            maxLength: needsLengthValidation
              ? editMaxLength || null
              : null,
            minValue: needsValueValidation
              ? editMinValue || null
              : null,
            maxValue: needsValueValidation
              ? editMaxValue || null
              : null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || "Could not update field."
        );
        return;
      }

      setIsEditing(false);
      window.location.reload();
    } catch {
      setError(
        "Something went wrong. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setEditLabel(label);
    setEditType(type);
    setEditRequired(required);
    setEditOptions(options?.join("\n") || "");
    setEditMinLength(minLength?.toString() || "");
    setEditMaxLength(maxLength?.toString() || "");
    setEditMinValue(minValue?.toString() || "");
    setEditMaxValue(maxValue?.toString() || "");
    setError("");
    setIsEditing(false);
  }

  function handleTypeChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const newType = event.target.value;

    setEditType(newType);
    setError("");

    if (!optionTypes.includes(newType)) {
      setEditOptions("");
    }

    if (
      newType !== "text" &&
      newType !== "textarea"
    ) {
      setEditMinLength("");
      setEditMaxLength("");
    }

    if (newType !== "number") {
      setEditMinValue("");
      setEditMaxValue("");
    }
  }

  async function handleMove(direction: "up" | "down") {
    setIsMoving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/forms/${formId}/fields/reorder`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fieldId,
            direction,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || "Could not move field."
        );
        return;
      }

      window.location.reload();
    } catch {
      setError(
        "Something went wrong. Please try again."
      );
    } finally {
      setIsMoving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this field?"
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(
        `/api/forms/${formId}/fields/${fieldId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        window.alert("Could not delete field.");
        return;
      }

      window.location.reload();
    } catch {
      window.alert(
        "Something went wrong. Please try again."
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      {isEditing ? (
        <div className="space-y-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Field {position + 1}
            </p>

            <label
              htmlFor={`edit-label-${fieldId}`}
              className="mb-2 mt-3 block text-sm font-medium"
            >
              Field label
            </label>

            <input
              id={`edit-label-${fieldId}`}
              type="text"
              value={editLabel}
              maxLength={200}
              onChange={(event) =>
                setEditLabel(event.target.value)
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
            />

            <p className="mt-1 text-xs text-gray-500">
              Maximum 200 characters.
            </p>
          </div>

          <div>
            <label
              htmlFor={`edit-type-${fieldId}`}
              className="mb-2 block text-sm font-medium"
            >
              Field type
            </label>

            <select
              id={`edit-type-${fieldId}`}
              value={editType}
              onChange={handleTypeChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
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
                htmlFor={`edit-options-${fieldId}`}
                className="mb-2 block text-sm font-medium"
              >
                Options
              </label>

              <textarea
                id={`edit-options-${fieldId}`}
                value={editOptions}
                onChange={(event) =>
                  setEditOptions(event.target.value)
                }
                rows={5}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
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
                    htmlFor={`edit-min-length-${fieldId}`}
                    className="mb-2 block text-sm text-gray-600"
                  >
                    Minimum length
                  </label>

                  <input
                    id={`edit-min-length-${fieldId}`}
                    type="number"
                    min="0"
                    value={editMinLength}
                    onChange={(event) =>
                      setEditMinLength(event.target.value)
                    }
                    placeholder="No minimum"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`edit-max-length-${fieldId}`}
                    className="mb-2 block text-sm text-gray-600"
                  >
                    Maximum length
                  </label>

                  <input
                    id={`edit-max-length-${fieldId}`}
                    type="number"
                    min="0"
                    value={editMaxLength}
                    onChange={(event) =>
                      setEditMaxLength(event.target.value)
                    }
                    placeholder="No maximum"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
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
                    htmlFor={`edit-min-value-${fieldId}`}
                    className="mb-2 block text-sm text-gray-600"
                  >
                    Minimum value
                  </label>

                  <input
                    id={`edit-min-value-${fieldId}`}
                    type="number"
                    value={editMinValue}
                    onChange={(event) =>
                      setEditMinValue(event.target.value)
                    }
                    placeholder="No minimum"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`edit-max-value-${fieldId}`}
                    className="mb-2 block text-sm text-gray-600"
                  >
                    Maximum value
                  </label>

                  <input
                    id={`edit-max-value-${fieldId}`}
                    type="number"
                    value={editMaxValue}
                    onChange={(event) =>
                      setEditMaxValue(event.target.value)
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
              checked={editRequired}
              onChange={(event) =>
                setEditRequired(event.target.checked)
              }
              className="h-4 w-4"
            />

            <span>Required field</span>
          </label>

          {error && (
            <p className="text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Field {position + 1}
            </p>

            <h3 className="mt-1 font-medium">
              {label}
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Type: {getFieldTypeLabel(type)}
            </p>

            {options && options.length > 0 && (
              <p className="mt-2 text-sm text-gray-500">
                Options: {options.join(", ")}
              </p>
            )}

            {minLength !== null && (
              <p className="mt-2 text-sm text-gray-500">
                Minimum length: {minLength}
              </p>
            )}

            {maxLength !== null && (
              <p className="text-sm text-gray-500">
                Maximum length: {maxLength}
              </p>
            )}

            {minValue !== null && (
              <p className="mt-2 text-sm text-gray-500">
                Minimum value: {minValue}
              </p>
            )}

            {maxValue !== null && (
              <p className="text-sm text-gray-500">
                Maximum value: {maxValue}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {required && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">
                Required
              </span>
            )}

            <button
              type="button"
              onClick={() => handleMove("up")}
              disabled={position === 0 || isMoving}
              className="text-sm font-medium disabled:opacity-30"
            >
              ↑
            </button>

            <button
              type="button"
              onClick={() => handleMove("down")}
              disabled={
                position === totalFields - 1 ||
                isMoving
              }
              className="text-sm font-medium disabled:opacity-30"
            >
              ↓
            </button>

            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-sm font-medium"
            >
              Edit
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-sm font-medium text-red-600 disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}