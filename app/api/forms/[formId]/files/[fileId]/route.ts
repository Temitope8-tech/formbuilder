import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    formId: string;
    fileId: string;
  }>;
};

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { formId, fileId } = await context.params;

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
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

    const file = await db.orm.public.FileAttachment
      .where({
        id: fileId,
      })
      .first();

    if (!file) {
      return Response.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    const answer = await db.orm.public.Answer
      .where({
        id: file.answerId,
      })
      .first();

    if (!answer) {
      return Response.json(
        { error: "File answer not found" },
        { status: 404 }
      );
    }

    const submission = await db.orm.public.Submission
      .where({
        id: answer.submissionId,
      })
      .first();

    if (!submission) {
      return Response.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    if (submission.formId !== formId) {
      return Response.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    const url = new URL(request.url);
    const download = url.searchParams.get("download") === "true";

    const admin = createAdminClient();

    const { data, error } = await admin.storage
      .from("form-uploads")
      .createSignedUrl(
        file.storagePath,
        60,
        download
          ? { download: file.fileName }
          : undefined
      );

    if (error || !data?.signedUrl) {
      console.error(
        "Could not create signed URL:",
        error
      );

      return Response.json(
        { error: "Could not access file" },
        { status: 500 }
      );
    }

    return Response.redirect(data.signedUrl);
  } catch (error) {
    console.error("File access error:", error);

    return Response.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}