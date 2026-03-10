import { NextResponse } from "next/server";
import { getProject, getSections, updateSections } from "@/lib/db";
import type { BookSection } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(getSections(id));
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (project.input_mode !== "book") {
    return NextResponse.json({ error: "Not a book project" }, { status: 400 });
  }

  const body = await request.json();
  const sections: BookSection[] = body.sections;

  if (!Array.isArray(sections) || sections.length === 0) {
    return NextResponse.json({ error: "sections must be a non-empty array" }, { status: 400 });
  }

  // Validate: contiguous offsets covering the full text
  const textLen = project.article_text.length;
  for (let i = 0; i < sections.length; i++) {
    sections[i].index = i;
    if (i === 0 && sections[i].startOffset !== 0) {
      return NextResponse.json({ error: "First section must start at offset 0" }, { status: 400 });
    }
    if (i === sections.length - 1 && sections[i].endOffset !== textLen - 1) {
      return NextResponse.json({ error: "Last section must end at text end" }, { status: 400 });
    }
  }

  updateSections(id, sections);
  return NextResponse.json(sections);
}
