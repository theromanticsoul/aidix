import type { CreateGenerationInput } from "./generation";

export function compileRedesignPrompt(input: CreateGenerationInput): string {
  const sections = [
    "Redesign the provided real room photo as a coherent interior concept.",
    `Room type: ${input.roomType}.`,
    `Interior style: ${input.styleCode}.`,
    "Preserve the camera perspective, room envelope, architecture, windows, doors, and all immutable elements.",
    "Do not create a collage, split screen, floor plan, or unrelated room.",
  ];

  if (input.wishes?.trim())
    sections.push(`User wishes: ${input.wishes.trim()}.`);
  if (input.immutableInstructions?.trim())
    sections.push(`Keep unchanged: ${input.immutableInstructions.trim()}.`);

  return sections.join(" ");
}
