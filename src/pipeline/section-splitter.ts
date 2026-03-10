import { chatCompletionStream, type LlmCallContext } from "@/llm/client";
import type { BookSection } from "@/pipeline/types";

const SYSTEM_PROMPT = `You are a book structure analyst. Given a book or long text, detect chapter/section boundaries.

Look for:
- Numbered chapters (第一章, Chapter 1, etc.)
- Titled sections with clear headings
- Separator markers (---, ***, ===, etc.)
- Natural narrative breaks (significant time/location jumps)

Output a JSON array of sections:
[
  {
    "index": 0,
    "title": "string - chapter/section title in Chinese",
    "startOffset": 0,
    "endOffset": 1234
  }
]

Rules:
- startOffset and endOffset are CHARACTER offsets (0-based) into the original text
- Sections must be contiguous: section N's endOffset + 1 = section N+1's startOffset (or endOffset = startOffset - 1 for the gap)
- The first section starts at offset 0
- The last section ends at the last character of the text
- Each section should be a meaningful narrative unit (not too short, not too long)
- Aim for 2-15 sections depending on the book length
- Section titles should be in Chinese (中文)
- If the text has explicit chapter markers, use those as boundaries
- If no clear markers exist, split at major narrative transitions

Return ONLY the JSON array.`;

interface RawSectionResult {
  index: number;
  title: string;
  startOffset: number;
  endOffset: number;
}

export async function splitSections(
  bookText: string,
  ctx: LlmCallContext,
): Promise<BookSection[]> {
  const userPrompt = `Text length: ${bookText.length} characters.\n\n${bookText}`;

  const sections = await chatCompletionStream<RawSectionResult[]>(
    SYSTEM_PROMPT,
    userPrompt,
    ctx,
    { temperature: 0.2 },
  );

  // Validate and fix offsets
  const fixed: BookSection[] = [];
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    fixed.push({
      index: i,
      title: s.title,
      startOffset: i === 0 ? 0 : s.startOffset,
      endOffset: i === sections.length - 1 ? bookText.length - 1 : s.endOffset,
    });
  }

  // Ensure contiguity: each section starts right after the previous ends
  for (let i = 1; i < fixed.length; i++) {
    if (fixed[i].startOffset !== fixed[i - 1].endOffset + 1) {
      fixed[i].startOffset = fixed[i - 1].endOffset + 1;
    }
  }

  return fixed;
}
