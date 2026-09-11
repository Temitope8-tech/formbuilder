import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

export async function PATCH(
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

  const form = await getOwnedForm(
    formId,
    user.id
  );

  if (!form) {
    return Response.json(
      { error: "Form not found" },
      { status: 404 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

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

  const title =
    "title" in body &&
    typeof body.title === "string"
      ? body.title.trim()
      : form.title;

  const description =
    "description" in body &&
    typeof body.description === "string"
      ? body.description.trim()
      : form.description;

  if (!title) {
    return Response.json(
      { error: "Title is required" },
      { status: 400 }
    );
  }

  if (title.length > 200) {
    return Response.json(
      {
        error:
          "Title must be 200 characters or less",
      },
      { status: 400 }
    );
  }

  if (
    description !== null &&
    description.length > 2000
  ) {
    return Response.json(
      {
        error:
          "Description must be 2000 characters or less",
      },
      { status: 400 }
    );
  }

  const updatedForm = await db.orm.public.Form
    .where({
      id: formId,
      userId: user.id,
    })
    .update({
      title,
      description: description || null,
    });

  if (!updatedForm) {
    return Response.json(
      { error: "Form not found" },
      { status: 404 }
    );
  }

  return Response.json(updatedForm);
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

  const form = await getOwnedForm(
    formId,
    user.id
  );

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

  const slug = `${form.slug}-copy-${Date.now()}`;

  const duplicatedForm = await db.transaction(
    async (tx) => {
      const newForm =
        await tx.orm.public.Form.create({
          userId: user.id,
          title: `${form.title} Copy`,
          description: form.description,
          slug,
        });

      for (const field of fields) {
        await tx.orm.public.FormField.create({
          formId: newForm.id,
          label: field.label,
          type: field.type,
          required: field.required,
          position: field.position,
          options: field.options,
          minLength: field.minLength,
          maxLength: field.maxLength,
          minValue: field.minValue,
          maxValue: field.maxValue,
        });
      }

      return newForm;
    }
  );

  return Response.json(
    duplicatedForm,
    { status: 201 }
  );
}

export async function DELETE(
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

  const form = await getOwnedForm(
    formId,
    user.id
  );

  if (!form) {
    return Response.json(
      { error: "Form not found" },
      { status: 404 }
    );
  }

  const submissions =
    await db.orm.public.Submission
      .where({ formId })
      .all();

  const fields =
    await db.orm.public.FormField
      .where({ formId })
      .all();

  const submissionIds = submissions.map(
    (submission) => submission.id
  );

  const fieldIds = fields.map(
    (field) => field.id
  );

  const submissionAnswers =
    submissionIds.length > 0
      ? await Promise.all(
          submissionIds.map((submissionId) =>
            db.orm.public.Answer
              .where({ submissionId })
              .all()
          )
        )
      : [];

  const fieldAnswers =
    fieldIds.length > 0
      ? await Promise.all(
          fieldIds.map((fieldId) =>
            db.orm.public.Answer
              .where({ fieldId })
              .all()
          )
        )
      : [];

  const answers = [
    ...submissionAnswers.flat(),
    ...fieldAnswers.flat(),
  ];

  const uniqueAnswers = Array.from(
    new Map(
      answers.map((answer) => [
        String(answer.id),
        answer,
      ])
    ).values()
  );

  const fileAttachments = await Promise.all(
    uniqueAnswers.map(async (answer) => {
      return db.orm.public.FileAttachment
        .where({
          answerId: answer.id,
        })
        .first();
    })
  );

  const storagePaths = fileAttachments
    .filter((file) => file !== null)
    .map((file) => file.storagePath);

  await db.transaction(async (tx) => {
    for (const answer of uniqueAnswers) {
      await tx.orm.public.FileAttachment
        .where({
          answerId: answer.id,
        })
        .deleteAll();
    }

    for (const submission of submissions) {
      await tx.orm.public.Answer
        .where({
          submissionId: submission.id,
        })
        .deleteAll();
    }

    for (const field of fields) {
      await tx.orm.public.Answer
        .where({
          fieldId: field.id,
        })
        .deleteAll();
    }

    await tx.orm.public.Submission
      .where({ formId })
      .deleteAll();

    await tx.orm.public.FormField
      .where({ formId })
      .deleteAll();

    await tx.orm.public.Form
      .where({
        id: formId,
        userId: user.id,
      })
      .delete();
  });

  if (storagePaths.length > 0) {
    const admin = createAdminClient();

    const { error } = await admin.storage
      .from("form-uploads")
      .remove(storagePaths);

    if (error) {
      console.error(
        "Could not remove uploaded files:",
        error
      );

      return Response.json({
        message: "Form deleted",
        warning:
          "Some uploaded files could not be removed from storage.",
      });
    }
  }

  return Response.json({
    message: "Form deleted",
  });
}