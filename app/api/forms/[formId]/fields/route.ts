import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

const fieldTypes = [
  "text",
  "textarea",
  "email",
  "number",
  "date",
  "file",
  "select",
  "radio",
  "checkbox",
  "name"
];

const optionTypes = ["select", "radio", "checkbox"];
const validationTypes = ["text", "textarea"];

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

async function getOwnedForm(
  formId: string,
  userId: string
) {
  return db.orm.public.Form
    .where({
      id: formId,
      userId,
    })
    .first();
}

function parseOptionalNumber(value: unknown) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
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

  const form = await getOwnedForm(formId, user.id);

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

  return Response.json({
    fields,
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
  const user = await getAuthenticatedUser();

  if (!user) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { formId } = await context.params;

  const body = await request.json();

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return Response.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const form = await getOwnedForm(formId, user.id);

  if (!form) {
    return Response.json(
      { error: "Form not found" },
      { status: 404 }
    );
  }

  const label =
    typeof body.label === "string"
      ? body.label.trim()
      : "";

  const type = body.type;
  const required = body.required ?? false;
  const options = body.options ?? null;

  const minLength = parseOptionalNumber(body.minLength);
  const maxLength = parseOptionalNumber(body.maxLength);
  const minValue = parseOptionalNumber(body.minValue);
  const maxValue = parseOptionalNumber(body.maxValue);

  if (!label) {
    return Response.json(
      { error: "Label is required" },
      { status: 400 }
    );
  }

  if (label.length > 200) {
    return Response.json(
      {
        error:
          "Label must be 200 characters or less",
      },
      { status: 400 }
    );
  }

  if (
    typeof type !== "string" ||
    !type
  ) {
    return Response.json(
      { error: "Type is required" },
      { status: 400 }
    );
  }

  if (!fieldTypes.includes(type)) {
    return Response.json(
      { error: "Invalid field type" },
      { status: 400 }
    );
  }

  if (typeof required !== "boolean") {
    return Response.json(
      { error: "Required must be a boolean" },
      { status: 400 }
    );
  }

  if (optionTypes.includes(type)) {
    if (!Array.isArray(options) || options.length === 0) {
      return Response.json(
        { error: "At least one option is required" },
        { status: 400 }
      );
    }

    if (options.length > 50) {
      return Response.json(
        { error: "A field can have at most 50 options" },
        { status: 400 }
      );
    }

    if (
      options.some(
        (option) =>
          typeof option !== "string" ||
          !option.trim()
      )
    ) {
      return Response.json(
        { error: "Options must be non-empty text" },
        { status: 400 }
      );
    }

    if (
      options.some(
        (option) => option.trim().length > 200
      )
    ) {
      return Response.json(
        {
          error:
            "Each option must be 200 characters or less",
        },
        { status: 400 }
      );
    }
  }

  if (
    validationTypes.includes(type) &&
    body.minLength !== undefined &&
    body.minLength !== null &&
    body.minLength !== "" &&
    minLength === null
  ) {
    return Response.json(
      { error: "Minimum length must be a valid number" },
      { status: 400 }
    );
  }

  if (
    validationTypes.includes(type) &&
    body.maxLength !== undefined &&
    body.maxLength !== null &&
    body.maxLength !== "" &&
    maxLength === null
  ) {
    return Response.json(
      { error: "Maximum length must be a valid number" },
      { status: 400 }
    );
  }

  if (
    type === "number" &&
    body.minValue !== undefined &&
    body.minValue !== null &&
    body.minValue !== "" &&
    minValue === null
  ) {
    return Response.json(
      { error: "Minimum value must be a valid number" },
      { status: 400 }
    );
  }

  if (
    type === "number" &&
    body.maxValue !== undefined &&
    body.maxValue !== null &&
    body.maxValue !== "" &&
    maxValue === null
  ) {
    return Response.json(
      { error: "Maximum value must be a valid number" },
      { status: 400 }
    );
  }

  if (
    minLength !== null &&
    (!Number.isInteger(minLength) || minLength < 0)
  ) {
    return Response.json(
      {
        error:
          "Minimum length must be a whole number of 0 or greater",
      },
      { status: 400 }
    );
  }

  if (
    maxLength !== null &&
    (!Number.isInteger(maxLength) || maxLength < 0)
  ) {
    return Response.json(
      {
        error:
          "Maximum length must be a whole number of 0 or greater",
      },
      { status: 400 }
    );
  }

  if (
    minLength !== null &&
    maxLength !== null &&
    minLength > maxLength
  ) {
    return Response.json(
      {
        error:
          "Minimum length cannot be greater than maximum length",
      },
      { status: 400 }
    );
  }

  if (
    minValue !== null &&
    maxValue !== null &&
    minValue > maxValue
  ) {
    return Response.json(
      {
        error:
          "Minimum value cannot be greater than maximum value",
      },
      { status: 400 }
    );
  }

  const existingFields = await db.orm.public.FormField
    .where({ formId })
    .all();

  const position = existingFields.length;

  const field = await db.orm.public.FormField.create({
    formId,
    label,
    type,
    required,
    position,
    options: optionTypes.includes(type)
      ? options.map((option: string) =>
          option.trim()
        )
      : null,
    minLength:
      validationTypes.includes(type)
        ? minLength
        : null,
    maxLength:
      validationTypes.includes(type)
        ? maxLength
        : null,
    minValue:
      type === "number"
        ? minValue
        : null,
    maxValue:
      type === "number"
        ? maxValue
        : null,
  });

  return Response.json(field, {
    status: 201,
  });
}