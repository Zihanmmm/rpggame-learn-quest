import { NextResponse } from "next/server";
import { detectFormat, parseFile } from "@/lib/file-parser";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
  }

  const format = detectFormat(file.name, file.type);
  if (!format) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.name}. Supported: .txt, .md, .pdf, .epub` },
      { status: 400 },
    );
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const text = await parseFile(buffer, format, file.name);

    if (!text.trim()) {
      return NextResponse.json(
        { error: "No text content extracted from file" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      text,
      filename: file.name,
      format,
      charCount: text.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Upload] Failed to parse ${file.name}: ${msg}`);
    return NextResponse.json(
      { error: `Failed to parse file: ${msg}` },
      { status: 500 },
    );
  }
}
