"use client";

import { FormEvent, useState } from "react";

type NameAnswer = {
  firstName: string;
  lastName: string;
};

type AnswerValue = string | string[] | NameAnswer;

type Field = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options: string[] | null;
  minLength: number | null;
  maxLength: number | null;
  minValue: number | null;
  maxValue: number | null;
};

type PublicFormProps = {
  formId: string;
  fields: Field[];
};

export default function PublicForm({
  formId,
  fields,
}: PublicFormProps) {
  const [answers, setAnswers] = useState<
    Record<string, AnswerValue>
  >({});

  const [files, setFiles] = useState<
    Record<string, File | null>
  >({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function getStringAnswer(fieldId: string) {
    const value = answers[fieldId];

    return typeof value === "string"
      ? value
      : "";
  }

  function getNameAnswer(fieldId: string): NameAnswer {
    const value = answers[fieldId];

    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      return value;
    }

    return {
      firstName: "",
      lastName: "",
    };
  }

  function getCheckboxAnswers(fieldId: string) {
    const value = answers[fieldId];

    return Array.isArray(value)
      ? value
      : [];
  }

  function handleChange(fieldId: string, value: string) {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [fieldId]: value,
    }));
  }

  function handleNameChange(
    fieldId: string,
    namePart: "firstName" | "lastName",
    value: string
  ) {
    setAnswers((currentAnswers) => {
      const currentValue = currentAnswers[fieldId];

      const currentName: NameAnswer =
        currentValue &&
        typeof currentValue === "object" &&
        !Array.isArray(currentValue)
          ? currentValue
          : {
              firstName: "",
              lastName: "",
            };

      return {
        ...currentAnswers,
        [fieldId]: {
          ...currentName,
          [namePart]: value,
        },
      };
    });
  }

  function handleFileChange(
    fieldId: string,
    file: File | null
  ) {
    setFiles((currentFiles) => ({
      ...currentFiles,
      [fieldId]: file,
    }));
  }

  function handleCheckboxChange(
    fieldId: string,
    option: string,
    checked: boolean
  ) {
    setAnswers((currentAnswers) => {
      const currentValue = currentAnswers[fieldId];

      const selectedOptions = Array.isArray(currentValue)
        ? currentValue
        : [];

      if (checked) {
        return {
          ...currentAnswers,
          [fieldId]: [...selectedOptions, option],
        };
      }

      return {
        ...currentAnswers,
        [fieldId]: selectedOptions.filter(
          (value) => value !== option
        ),
      };
    });
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    for (const field of fields) {
      if (!field.required) {
        continue;
      }

      if (field.type === "name") {
        const name = getNameAnswer(field.id);

        if (
          !name.firstName.trim() ||
          !name.lastName.trim()
        ) {
          setError(
            `Please enter your first and last name for "${field.label}".`
          );
          return;
        }
      }

      if (field.type === "checkbox") {
        const value = answers[field.id];

        if (
          !Array.isArray(value) ||
          value.length === 0
        ) {
          setError(
            `Please select at least one option for "${field.label}".`
          );
          return;
        }
      }

      if (field.type === "file") {
        const file = files[field.id];

        if (!file) {
          setError(
            `Please upload a file for "${field.label}".`
          );
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();

      formData.append(
        "answers",
        JSON.stringify(answers)
      );

      for (const field of fields) {
        if (field.type !== "file") {
          continue;
        }

        const file = files[field.id];

        if (file) {
          formData.append(
            `file:${field.id}`,
            file
          );
        }
      }

      const response = await fetch(
        `/api/forms/${formId}/submissions`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Could not submit the form."
        );
        return;
      }

      setSubmitted(true);
    } catch {
      setError(
        "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <h2 className="text-xl font-semibold">
          Thank you!
        </h2>

        <p className="mt-2 text-gray-600">
          Your response has been submitted successfully.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-gray-200 bg-white p-6"
    >
      <div className="space-y-6">
        {fields.map((field) => (
          <div key={field.id}>
            <label
              htmlFor={field.id}
              className="mb-2 block text-sm font-medium"
            >
              {field.label}

              {field.required && (
                <span className="ml-1 text-red-500">
                  *
                </span>
              )}
            </label>

            {field.type === "name" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor={`${field.id}-first-name`}
                    className="mb-2 block text-sm text-gray-600"
                  >
                    First name
                  </label>

                  <input
                    id={`${field.id}-first-name`}
                    type="text"
                    required={field.required}
                    value={
                      getNameAnswer(field.id).firstName
                    }
                    onChange={(event) =>
                      handleNameChange(
                        field.id,
                        "firstName",
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`${field.id}-last-name`}
                    className="mb-2 block text-sm text-gray-600"
                  >
                    Last name
                  </label>

                  <input
                    id={`${field.id}-last-name`}
                    type="text"
                    required={field.required}
                    value={
                      getNameAnswer(field.id).lastName
                    }
                    onChange={(event) =>
                      handleNameChange(
                        field.id,
                        "lastName",
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  />
                </div>
              </div>
            )}

            {field.type === "textarea" && (
              <>
                <textarea
                  id={field.id}
                  required={field.required}
                  minLength={
                    field.minLength ?? undefined
                  }
                  maxLength={
                    field.maxLength ?? undefined
                  }
                  value={getStringAnswer(field.id)}
                  onChange={(event) =>
                    handleChange(
                      field.id,
                      event.target.value
                    )
                  }
                  rows={5}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />

                {(field.minLength !== null ||
                  field.maxLength !== null) && (
                  <p className="mt-2 text-xs text-gray-500">
                    {field.minLength !== null &&
                      `Minimum ${field.minLength} characters`}
                    {field.minLength !== null &&
                      field.maxLength !== null &&
                      " • "}
                    {field.maxLength !== null &&
                      `Maximum ${field.maxLength} characters`}
                  </p>
                )}
              </>
            )}

            {field.type === "select" && (
              <select
                id={field.id}
                required={field.required}
                value={getStringAnswer(field.id)}
                onChange={(event) =>
                  handleChange(
                    field.id,
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black"
              >
                <option value="">
                  Select an option
                </option>

                {field.options?.map(
                  (option, index) => (
                    <option
                      key={`${field.id}-option-${index}`}
                      value={option}
                    >
                      {option}
                    </option>
                  )
                )}
              </select>
            )}

            {field.type === "radio" && (
              <div className="space-y-3">
                {field.options?.map(
                  (option, index) => (
                    <label
                      key={`${field.id}-option-${index}`}
                      className="flex items-center gap-3"
                    >
                      <input
                        type="radio"
                        name={field.id}
                        value={option}
                        checked={
                          getStringAnswer(
                            field.id
                          ) === option
                        }
                        onChange={(event) =>
                          handleChange(
                            field.id,
                            event.target.value
                          )
                        }
                        required={field.required}
                      />

                      <span>{option}</span>
                    </label>
                  )
                )}
              </div>
            )}

            {field.type === "checkbox" && (
              <div className="space-y-3">
                {field.options?.map(
                  (option, index) => {
                    const selectedOptions =
                      getCheckboxAnswers(
                        field.id
                      );

                    return (
                      <label
                        key={`${field.id}-option-${index}`}
                        className="flex items-center gap-3"
                      >
                        <input
                          type="checkbox"
                          value={option}
                          checked={selectedOptions.includes(
                            option
                          )}
                          onChange={(event) =>
                            handleCheckboxChange(
                              field.id,
                              option,
                              event.target.checked
                            )
                          }
                        />

                        <span>{option}</span>
                      </label>
                    );
                  }
                )}
              </div>
            )}

            {field.type === "file" && (
              <div>
                <input
                  id={field.id}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
                  required={field.required}
                  onChange={(event) =>
                    handleFileChange(
                      field.id,
                      event.target.files?.[0] ||
                        null
                    )
                  }
                  className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-sm"
                />

                <p className="mt-2 text-xs text-gray-500">
                  JPG, JPEG, PNG, WEBP, PDF, DOC or
                  DOCX. Maximum 5 MB.
                </p>

                {files[field.id] && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected:{" "}
                    <span className="font-medium">
                      {files[field.id]?.name}
                    </span>
                  </p>
                )}
              </div>
            )}

            {field.type === "text" && (
              <>
                <input
                  id={field.id}
                  type="text"
                  required={field.required}
                  minLength={
                    field.minLength ?? undefined
                  }
                  maxLength={
                    field.maxLength ?? undefined
                  }
                  value={getStringAnswer(field.id)}
                  onChange={(event) =>
                    handleChange(
                      field.id,
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />

                {(field.minLength !== null ||
                  field.maxLength !== null) && (
                  <p className="mt-2 text-xs text-gray-500">
                    {field.minLength !== null &&
                      `Minimum ${field.minLength} characters`}
                    {field.minLength !== null &&
                      field.maxLength !== null &&
                      " • "}
                    {field.maxLength !== null &&
                      `Maximum ${field.maxLength} characters`}
                  </p>
                )}
              </>
            )}

            {field.type === "email" && (
              <input
                id={field.id}
                type="email"
                required={field.required}
                value={getStringAnswer(field.id)}
                onChange={(event) =>
                  handleChange(
                    field.id,
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
              />
            )}

            {field.type === "number" && (
              <>
                <input
                  id={field.id}
                  type="number"
                  required={field.required}
                  min={
                    field.minValue ?? undefined
                  }
                  max={
                    field.maxValue ?? undefined
                  }
                  step="any"
                  value={getStringAnswer(field.id)}
                  onChange={(event) =>
                    handleChange(
                      field.id,
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />

                {(field.minValue !== null ||
                  field.maxValue !== null) && (
                  <p className="mt-2 text-xs text-gray-500">
                    {field.minValue !== null &&
                      `Minimum ${field.minValue}`}
                    {field.minValue !== null &&
                      field.maxValue !== null &&
                      " • "}
                    {field.maxValue !== null &&
                      `Maximum ${field.maxValue}`}
                  </p>
                )}
              </>
            )}

            {field.type === "date" && (
              <input
                id={field.id}
                type="date"
                required={field.required}
                value={getStringAnswer(field.id)}
                onChange={(event) =>
                  handleChange(
                    field.id,
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-6 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-8 rounded-lg bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {isSubmitting
          ? "Submitting..."
          : "Submit"}
      </button>
    </form>
  );
}