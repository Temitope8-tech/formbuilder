import { db } from "@/lib/db";

import { checkRateLimit } from "@/lib/rateLimit";

import { createAdminClient } from "@/lib/supabase/admin";

import { createClient } from "@/lib/supabase/server";

const optionTypes = ["select", "radio", "checkbox"];

const MAX_REQUEST_SIZE = 25 * 1024 * 1024;

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const MAX_TOTAL_FILE_SIZE = 20 * 1024 * 1024;

const MAX_ANSWERS = 100;

const MAX_TEXT_LENGTH = 5000;

const MAX_CHECKBOX_SELECTIONS = 50;

const allowedFiles = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;

type Answers = Record<string, unknown>;

type NameAnswer = {
  firstName: string;
  lastName: string;
};

type UploadedFile = {
  fieldId: string;
  file: File;
  storagePath: string;
};

async function getAuthenticatedUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !user.email) {
    return null;
  }

  await db.orm.public.User.upsert({
    create: {
      id: user.id,
      email: user.email,
    },
    update: {
      email: user.email,
    },
  });

  return user;
}

function getAllowedOptions(options: unknown): string[] | null {
  if (!Array.isArray(options)) {
    return null;
  }

  return options.filter(
    (option): option is string =>
      typeof option === "string"
  );
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function getFileExtension(fileName: string) {
  const lastDot = fileName.lastIndexOf(".");

  if (lastDot === -1) {
    return "";
  }

  return fileName
    .slice(lastDot)
    .toLowerCase();
}

function isAllowedFile(file: File) {
  const extension = getFileExtension(file.name);

  if (
    !Object.prototype.hasOwnProperty.call(
      allowedFiles,
      extension
    )
  ) {
    return false;
  }

  const expectedContentType =
    allowedFiles[
      extension as keyof typeof allowedFiles
    ];

  return file.type === expectedContentType;
}

function isValidNameAnswer(
  value: unknown
): value is NameAnswer {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const name = value as Record<string, unknown>;

  return (
    typeof name.firstName === "string" &&
    typeof name.lastName === "string"
  );
}

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      formId: string;
    }>;
  }
) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { formId } = await context.params;

  const form = await db.orm.public.Form
    .where({
      id: formId,
      userId: user.id,
    })
    .first();

  if (!form) {
    return Response.json(
      { error: "Form not found" },
      { status: 404 }
    );
  }

  const submissions = await db.orm.public.Submission
    .include("answers")
    .where({ formId })
    .orderBy((submission) =>
      submission.submittedAt.desc()
    )
    .all();

  return Response.json({
    submissions,
  });
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      formId: string;
    }>;
  }
) {
  const forwardedFor = request.headers.get(
    "x-forwarded-for"
  );

  const ipAddress =
    forwardedFor?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const rateLimit = checkRateLimit(ipAddress);

  if (!rateLimit.allowed) {
    return Response.json(
      {
        error:
          "Too many submissions. Please try again later.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            rateLimit.retryAfter
          ),
        },
      }
    );
  }

  const contentLength = request.headers.get(
    "content-length"
  );

  if (
    contentLength &&
    Number(contentLength) > MAX_REQUEST_SIZE
  ) {
    return Response.json(
      { error: "Request is too large" },
      { status: 413 }
    );
  }

  const { formId } = await context.params;

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: "Invalid form submission" },
      { status: 400 }
    );
  }

  const answersRaw = formData.get("answers");

  if (typeof answersRaw !== "string") {
    return Response.json(
      { error: "Answers are required" },
      { status: 400 }
    );
  }

  let answersValue: unknown;

  try {
    answersValue = JSON.parse(answersRaw);
  } catch {
    return Response.json(
      { error: "Invalid answers" },
      { status: 400 }
    );
  }

  if (
    !answersValue ||
    typeof answersValue !== "object" ||
    Array.isArray(answersValue)
  ) {
    return Response.json(
      { error: "Invalid answers" },
      { status: 400 }
    );
  }

  const answers = answersValue as Answers;

  const answerEntries = Object.entries(answers);

  if (answerEntries.length > MAX_ANSWERS) {
    return Response.json(
      {
        error: `A submission can contain at most ${MAX_ANSWERS} answers.`,
      },
      { status: 400 }
    );
  }

  const form = await db.orm.public.Form
    .where({
      id: formId,
    })
    .first();

  if (!form) {
    return Response.json(
      { error: "Form not found" },
      { status: 404 }
    );
  }

  const fields = await db.orm.public.FormField
    .where({ formId })
    .orderBy((field) => field.position.asc())
    .all();

  const uploadedFiles: UploadedFile[] = [];

  let totalFileSize = 0;

  for (const field of fields) {
    if (field.type !== "file") {
      continue;
    }

    const fileEntry = formData.get(
      `file:${field.id}`
    );

    if (!(fileEntry instanceof File)) {
      if (field.required) {
        return Response.json(
          {
            error: `${field.label} is required`,
          },
          { status: 400 }
        );
      }

      continue;
    }

    if (fileEntry.size === 0) {
      if (field.required) {
        return Response.json(
          {
            error: `${field.label} is required`,
          },
          { status: 400 }
        );
      }

      continue;
    }

    if (fileEntry.size > MAX_FILE_SIZE) {
      return Response.json(
        {
          error: `${field.label} must be no larger than 5 MB.`,
        },
        { status: 400 }
      );
    }

    if (!isAllowedFile(fileEntry)) {
      return Response.json(
        {
          error:
            `${field.label} has an unsupported file type. ` +
            "Allowed types are JPG, JPEG, PNG, WEBP, PDF, DOC and DOCX.",
        },
        { status: 400 }
      );
    }

    totalFileSize += fileEntry.size;

    if (totalFileSize > MAX_TOTAL_FILE_SIZE) {
      return Response.json(
        {
          error:
            "The total size of uploaded files cannot exceed 20 MB.",
        },
        { status: 400 }
      );
    }

    uploadedFiles.push({
      fieldId: field.id,
      file: fileEntry,
      storagePath: "",
    });
  }

  for (const field of fields) {
    if (field.type === "file") {
      continue;
    }

    const value = answers[field.id];

    if (field.required) {
      if (
        value === undefined ||
        value === null ||
        value === "" ||
        (Array.isArray(value) &&
          value.length === 0)
      ) {
        return Response.json(
          {
            error: `${field.label} is required`,
          },
          { status: 400 }
        );
      }
    }

    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      continue;
    }

    if (field.type === "name") {
      if (!isValidNameAnswer(value)) {
        return Response.json(
          {
            error:
              `${field.label} must contain a valid first name and last name.`,
          },
          { status: 400 }
        );
      }

      if (
        value.firstName.trim() === "" ||
        value.lastName.trim() === ""
      ) {
        return Response.json(
          {
            error:
              `${field.label} requires both a first name and last name.`,
          },
          { status: 400 }
        );
      }

      if (
        value.firstName.length >
          MAX_TEXT_LENGTH ||
        value.lastName.length >
          MAX_TEXT_LENGTH
      ) {
        return Response.json(
          {
            error:
              `${field.label} names must be no more than ${MAX_TEXT_LENGTH} characters each.`,
          },
          { status: 400 }
        );
      }

      continue;
    }

    if (
      field.type === "text" ||
      field.type === "textarea" ||
      field.type === "email" ||
      field.type === "date"
    ) {
      if (typeof value !== "string") {
        return Response.json(
          {
            error: `${field.label} must contain text.`,
          },
          { status: 400 }
        );
      }

      if (value.length > MAX_TEXT_LENGTH) {
        return Response.json(
          {
            error:
              `${field.label} must be no more than ` +
              `${MAX_TEXT_LENGTH} characters.`,
          },
          { status: 400 }
        );
      }
    }

    if (field.type === "number") {
      if (
        typeof value !== "string" &&
        typeof value !== "number"
      ) {
        return Response.json(
          {
            error:
              `${field.label} must contain a valid number.`,
          },
          { status: 400 }
        );
      }

      if (
        typeof value === "string" &&
        value.trim() === ""
      ) {
        return Response.json(
          {
            error:
              `${field.label} must contain a valid number.`,
          },
          { status: 400 }
        );
      }

      if (
        typeof value === "string" &&
        value.length > MAX_TEXT_LENGTH
      ) {
        return Response.json(
          {
            error:
              `${field.label} must contain a shorter number.`,
          },
          { status: 400 }
        );
      }
    }

    if (optionTypes.includes(field.type)) {
      const allowedOptions = getAllowedOptions(
        field.options
      );

      if (allowedOptions === null) {
        return Response.json(
          {
            error:
              `${field.label} has invalid configuration.`,
          },
          { status: 500 }
        );
      }

      if (
        field.type === "select" ||
        field.type === "radio"
      ) {
        if (typeof value !== "string") {
          return Response.json(
            {
              error:
                `${field.label} must contain a valid option.`,
            },
            { status: 400 }
          );
        }

        if (!allowedOptions.includes(value)) {
          return Response.json(
            {
              error:
                `${field.label} contains an invalid option.`,
            },
            { status: 400 }
          );
        }
      }

      if (field.type === "checkbox") {
        if (!Array.isArray(value)) {
          return Response.json(
            {
              error:
                `${field.label} must contain valid options.`,
            },
            { status: 400 }
          );
        }

        if (
          value.length >
          MAX_CHECKBOX_SELECTIONS
        ) {
          return Response.json(
            {
              error:
                `${field.label} can have at most ` +
                `${MAX_CHECKBOX_SELECTIONS} selections.`,
            },
            { status: 400 }
          );
        }

        const hasInvalidOption = value.some(
          (option) =>
            typeof option !== "string" ||
            !allowedOptions.includes(option)
        );

        if (hasInvalidOption) {
          return Response.json(
            {
              error:
                `${field.label} contains an invalid option.`,
            },
            { status: 400 }
          );
        }
      }
    }

    if (
      (field.type === "text" ||
        field.type === "textarea") &&
      typeof value === "string"
    ) {
      if (
        field.minLength !== null &&
        value.length < field.minLength
      ) {
        return Response.json(
          {
            error:
              `${field.label} must be at least ` +
              `${field.minLength} characters.`,
          },
          { status: 400 }
        );
      }

      if (
        field.maxLength !== null &&
        value.length > field.maxLength
      ) {
        return Response.json(
          {
            error:
              `${field.label} must be no more than ` +
              `${field.maxLength} characters.`,
          },
          { status: 400 }
        );
      }
    }

    if (field.type === "email") {
      if (
        typeof value !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          value
        )
      ) {
        return Response.json(
          {
            error:
              `${field.label} must be a valid email address.`,
          },
          { status: 400 }
        );
      }
    }

    if (field.type === "number") {
      const numberValue = Number(value);

      if (!Number.isFinite(numberValue)) {
        return Response.json(
          {
            error:
              `${field.label} must be a valid number.`,
          },
          { status: 400 }
        );
      }

      if (
        field.minValue !== null &&
        numberValue < field.minValue
      ) {
        return Response.json(
          {
            error:
              `${field.label} must be at least ` +
              `${field.minValue}.`,
          },
          { status: 400 }
        );
      }

      if (
        field.maxValue !== null &&
        numberValue > field.maxValue
      ) {
        return Response.json(
          {
            error:
              `${field.label} must be no more than ` +
              `${field.maxValue}.`,
          },
          { status: 400 }
        );
      }
    }

    if (field.type === "date") {
      if (
        typeof value !== "string" ||
        !isValidDate(value)
      ) {
        return Response.json(
          {
            error:
              `${field.label} must be a valid date.`,
          },
          { status: 400 }
        );
      }
    }
  }

  const admin = createAdminClient();

  const uploadedStoragePaths: string[] = [];

  try {
    const submissionId = crypto.randomUUID();

    for (const uploadedFile of uploadedFiles) {
      const extension = getFileExtension(
        uploadedFile.file.name
      );

      const storagePath =
        `${formId}/${submissionId}/` +
        `${uploadedFile.fieldId}-${crypto.randomUUID()}${extension}`;

      const { error } = await admin.storage
        .from("form-uploads")
        .upload(
          storagePath,
          uploadedFile.file,
          {
            contentType:
              uploadedFile.file.type,
            upsert: false,
          }
        );

      if (error) {
        throw new Error(
          `File upload failed: ${error.message}`
        );
      }

      uploadedFile.storagePath = storagePath;

      uploadedStoragePaths.push(storagePath);
    }

    const submission = await db.transaction(
      async (tx) => {
        const newSubmission =
          await tx.orm.public.Submission.create({
            id: submissionId,
            formId,
          });

        for (const field of fields) {
          const value = answers[field.id];

          if (
            value === undefined ||
            value === null
          ) {
            continue;
          }

          let storedValue: string;

          if (
            Array.isArray(value) ||
            field.type === "name"
          ) {
            storedValue = JSON.stringify(value);
          } else {
            storedValue = String(value);
          }

          const answer =
            await tx.orm.public.Answer.create({
              submissionId:
                newSubmission.id,
              fieldId: field.id,
              value: storedValue,
            });

          if (field.type === "file") {
            const uploadedFile =
              uploadedFiles.find(
                (item) =>
                  item.fieldId === field.id
              );

            if (uploadedFile) {
              await tx.orm.public.FileAttachment
                .create({
                  answerId: answer.id,
                  fileName:
                    uploadedFile.file.name,
                  storagePath:
                    uploadedFile.storagePath,
                  contentType:
                    uploadedFile.file.type,
                  size:
                    uploadedFile.file.size,
                });
            }
          }
        }

        for (const uploadedFile of uploadedFiles) {
          const existingAnswer =
            await tx.orm.public.Answer
              .where({
                submissionId:
                  newSubmission.id,
                fieldId:
                  uploadedFile.fieldId,
              })
              .first();

          if (existingAnswer) {
            continue;
          }

          const answer =
            await tx.orm.public.Answer.create({
              submissionId:
                newSubmission.id,
              fieldId:
                uploadedFile.fieldId,
              value: uploadedFile.file.name,
            });

          await tx.orm.public.FileAttachment
            .create({
              answerId: answer.id,
              fileName:
                uploadedFile.file.name,
              storagePath:
                uploadedFile.storagePath,
              contentType:
                uploadedFile.file.type,
              size:
                uploadedFile.file.size,
            });
        }

        return newSubmission;
      }
    );

    return Response.json(
      {
        message: "Submission received",
        submissionId: submission.id,
      },
      { status: 201 }
    );
  } catch (error) {
    if (uploadedStoragePaths.length > 0) {
      await admin.storage
        .from("form-uploads")
        .remove(uploadedStoragePaths);
    }

    console.error(error);

    return Response.json(
      {
        error:
          "The submission could not be saved. Please try again.",
      },
      { status: 500 }
    );
  }
}