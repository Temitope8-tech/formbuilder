import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

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

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const forms = await db.orm.public.Form
    .where({ userId: user.id })
    .all();

  return Response.json({
    forms,
  });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await request.json();

  const title =
    typeof body.title === "string"
      ? body.title.trim()
      : "";

  const description =
    typeof body.description === "string"
      ? body.description.trim()
      : "";

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

  if (description.length > 2000) {
    return Response.json(
      {
        error:
          "Description must be 2000 characters or less",
      },
      { status: 400 }
    );
  }

  const slugBase = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const slug = `${slugBase || "form"}-${Date.now()}`;

  const form = await db.orm.public.Form.create({
    userId: user.id,
    title,
    description: description || null,
    slug,
  });

  return Response.json(form, {
    status: 201,
  });
}