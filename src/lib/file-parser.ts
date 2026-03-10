import { EPub } from "epub2";
import { PDFParse } from "pdf-parse";
import { convert } from "html-to-text";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export type SupportedFormat = "txt" | "pdf" | "epub";

const MIME_TO_FORMAT: Record<string, SupportedFormat> = {
  "text/plain": "txt",
  "text/markdown": "txt",
  "application/pdf": "pdf",
  "application/epub+zip": "epub",
};

const EXT_TO_FORMAT: Record<string, SupportedFormat> = {
  ".txt": "txt",
  ".md": "txt",
  ".pdf": "pdf",
  ".epub": "epub",
};

export function detectFormat(filename: string, mimeType?: string): SupportedFormat | null {
  if (mimeType && MIME_TO_FORMAT[mimeType]) {
    return MIME_TO_FORMAT[mimeType];
  }
  const ext = path.extname(filename).toLowerCase();
  return EXT_TO_FORMAT[ext] ?? null;
}

export async function parseFile(
  buffer: Buffer,
  format: SupportedFormat,
  filename?: string,
): Promise<string> {
  switch (format) {
    case "txt":
      return parseTxt(buffer);
    case "pdf":
      return parsePdf(buffer);
    case "epub":
      return parseEpub(buffer, filename);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

function parseTxt(buffer: Buffer): string {
  return buffer.toString("utf-8").trim();
}

async function parsePdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text.trim();
  } finally {
    await parser.destroy().catch(() => {});
  }
}

async function parseEpub(buffer: Buffer, filename?: string): Promise<string> {
  // epub2 requires a file path, so write to a temp file
  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, `rpgmaker-upload-${Date.now()}-${filename || "book.epub"}`);

  try {
    fs.writeFileSync(tmpFile, buffer);
    const epub = await EPub.createAsync(tmpFile);

    const chapters: string[] = [];
    for (const chapter of epub.flow) {
      try {
        const html = await epub.getChapterAsync(chapter.id);
        const text = convert(html, {
          wordwrap: false,
          selectors: [
            { selector: "img", format: "skip" },
            { selector: "a", options: { ignoreHref: true } },
          ],
        });
        if (text.trim()) {
          chapters.push(text.trim());
        }
      } catch {
        // Skip chapters that fail to parse (e.g., cover images)
      }
    }

    return chapters.join("\n\n");
  } finally {
    // Clean up temp file
    try {
      fs.unlinkSync(tmpFile);
    } catch { /* ignore cleanup errors */ }
  }
}
