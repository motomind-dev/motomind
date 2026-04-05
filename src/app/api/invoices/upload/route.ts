import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
] as const;

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "application/pdf": ".pdf",
};

const TYPE_BY_MIME: Record<string, "image" | "pdf"> = {
  "image/jpeg": "image",
  "image/jpg": "image",
  "image/png": "image",
  "application/pdf": "pdf",
};

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true },
  });
  if (!user || user.plan !== "PRO") {
    return NextResponse.json(
      { error: "Fonctionnalité réservée aux abonnés Premium" },
      { status: 403 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Format invalide" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json(
      { error: "Fichier requis" },
      { status: 400 }
    );
  }

  const mime = (file as File).type;
  if (!ALLOWED_TYPES.includes(mime as (typeof ALLOWED_TYPES)[number])) {
    return NextResponse.json(
      { error: "Types autorisés : JPG, PNG, PDF" },
      { status: 400 }
    );
  }

  if ((file as File).size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (max 10 Mo)" },
      { status: 400 }
    );
  }

  if (process.env.VERCEL === "1" && !process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Stockage des factures non configuré : ajoutez Vercel Blob au projet et la variable BLOB_READ_WRITE_TOKEN (voir .env.example).",
      },
      { status: 503 }
    );
  }

  const ext = EXT_BY_MIME[mime] ?? ".bin";
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
  const buffer = Buffer.from(await (file as File).arrayBuffer());
  const invoiceType = TYPE_BY_MIME[mime] ?? "image";

  try {
    let url: string;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`invoices/${name}`, buffer, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: mime,
      });
      url = blob.url;
    } else {
      const dir = path.join(process.cwd(), "public", "uploads", "invoices");
      await mkdir(dir, { recursive: true });
      const filePath = path.join(dir, name);
      await writeFile(filePath, buffer);
      url = `/uploads/invoices/${name}`;
    }

    return NextResponse.json({ url, invoiceType });
  } catch (err) {
    console.error("[invoices/upload] Error:", err);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement du fichier" },
      { status: 500 }
    );
  }
}
