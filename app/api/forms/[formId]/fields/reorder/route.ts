import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

async function getAuthenticatedUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  if (!user.email) {
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

  const fieldId =
    "fieldId" in body ? body.fieldId : undefined;

  const direction =
    "direction" in body ? body.direction : undefined;

  if (
    typeof fieldId !== "string" ||
    !fieldId ||
    (direction !== "up" &&
      direction !== "down")
  ) {
    return Response.json(
      { error: "Field ID and direction are required" },
      { status: 400 }
    );
  }

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

  const fields = await db.orm.public.FormField
    .where({ formId })
    .orderBy((field) => field.position.asc())
    .all();

  const currentIndex = fields.findIndex(
    (field) => field.id === fieldId
  );

  if (currentIndex === -1) {
    return Response.json(
      { error: "Field not found" },
      { status: 404 }
    );
  }

  const targetIndex =
    direction === "up"
      ? currentIndex - 1
      : currentIndex + 1;

  if (
    targetIndex < 0 ||
    targetIndex >= fields.length
  ) {
    return Response.json({
      message: "Field is already at the edge",
    });
  }

  const currentField = fields[currentIndex];
  const targetField = fields[targetIndex];

  await db.transaction(async (tx) => {
    await tx.orm.public.FormField
      .where({
        id: currentField.id,
        formId,
      })
      .update({
        position: targetField.position,
      });

    await tx.orm.public.FormField
      .where({
        id: targetField.id,
        formId,
      })
      .update({
        position: currentField.position,
      });
  });

  return Response.json({
    message: "Field order updated",
  });
}