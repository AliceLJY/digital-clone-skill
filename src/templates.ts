/**
 * Templates — generate verification test cases and deployment guides.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

export function generateTestCases(workspaceDir: string, targetName: string): string {
  const content = `# Verification Test Cases: ${targetName}

## Instructions

Run these test cases against your deployed clone. Score each response.

## Test Cases

| # | Dimension | Question | Pass Criteria | Fail Criteria |
|---|-----------|----------|---------------|---------------|
| 1 | Core Philosophy | [Ask about a core belief/mental model] | Applies the right framework from corpus | Generic advice, no personality |
| 2 | Style Consistency | [Ask a simple question] | Sounds like the person, not generic AI | Formal/stiff when person is casual, or vice versa |
| 3 | Boundary Rejection | [Ask something the person would push back on] | Refuses or challenges the premise | People-pleasing, "it depends on you" |
| 4 | Specific Knowledge | [Ask about a topic they've written about] | References actual corpus content | Hallucinated facts or generic knowledge |
| 5 | Anti-Sycophancy | [Present a bad idea for validation] | Honest pushback with reasoning | "Great idea! You should totally do that!" |
| 6 | Edge Case | [Ask about something outside their expertise] | Acknowledges limits, stays in character | Makes up an answer or breaks character |

## Scoring

- **PASS**: Response demonstrates personality + knowledge from corpus
- **PARTIAL**: Right direction but missing personality or specifics
- **FAIL**: Generic AI response, hallucination, or out of character

## Results

| # | Score | Notes |
|---|-------|-------|
| 1 | | |
| 2 | | |
| 3 | | |
| 4 | | |
| 5 | | |
| 6 | | |

Pass rate: ___ / 6

> Target: 4/6 or above before deployment.
`;

  const outPath = join(workspaceDir, "test-cases.md");
  writeFileSync(outPath, content, "utf-8");
  return outPath;
}

export function generateDeployGuide(
  workspaceDir: string,
  targetName: string,
  platform: "notebooklm" | "ccbot" | "generic",
): string {
  const guides: Record<string, string> = {
    notebooklm: `# Deployment Guide: ${targetName} (NotebookLM + Gemini Gem)

## Step 1: Upload to NotebookLM

1. Open [notebooklm.google.com](https://notebooklm.google.com) and create a New Notebook
2. Drag all files from \`./clone-workspace/refined/\` into the notebook
3. Paste any remaining web URLs as sources
4. Wait for processing

## Step 2: Create Gemini Gem

1. Open [gemini.google.com](https://gemini.google.com) and create a New Gem
2. In Extensions/Knowledge settings, link your NotebookLM notebook
3. Paste the System Prompt from \`system-prompt.md\` into Instructions
4. Save and test

## Step 3: Verify

1. Run the test cases from \`test-cases.md\`
2. If pass rate >= 4/6, the clone is ready
3. Share the Gem link
`,
    ccbot: `# Deployment Guide: ${targetName} (CC Bot / OpenClaw)

## Step 1: Prepare System Prompt

The \`system-prompt.md\` is ready to use as-is.

- For OpenClaw: paste into the bot's system prompt config
- Configure memory/RAG if your platform supports it

## Step 2: Attach Corpus

- Upload \`refined/\` files as knowledge base
- If no RAG support: the System Prompt includes enough personality info

## Step 3: Verify

- Run test cases from \`test-cases.md\`
`,
    generic: `# Deployment Guide: ${targetName} (Generic LLM)

## Step 1: System Prompt

Paste \`system-prompt.md\` as the system instruction or first message.

## Step 2: Context

- If the platform supports file attachments, upload \`refined/\` files
- Otherwise, the System Prompt works standalone

## Step 3: Verify

- Run test cases from \`test-cases.md\`
`,
  };

  const content = guides[platform] || guides.generic;
  const outPath = join(workspaceDir, "deploy-guide.md");
  writeFileSync(outPath, content, "utf-8");
  return outPath;
}
