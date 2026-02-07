import fs from "fs";
import { config, languagePrompts } from "./config.js";

// Get prompts for configured language (fallback to English)
const lang = languagePrompts[config.language] || languagePrompts.en;

const {
  OPENAI_API_KEY,
  GITHUB_TOKEN,
  GITHUB_REPOSITORY,
  PR_NUMBER,
} = process.env;

// ---- ENV CHECKS ----
if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing");
if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN is missing");
if (!GITHUB_REPOSITORY) throw new Error("GITHUB_REPOSITORY is missing");
if (!PR_NUMBER) throw new Error("PR_NUMBER is missing");

// ---- HELPERS ----
async function githubFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

// ---- GET PR INFO ----
async function getPRInfo() {
  const url = `https://api.github.com/repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}`;
  return githubFetch(url);
}

// ---- GET PR FILES ----
async function getChangedFiles() {
  const url = `https://api.github.com/repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}/files`;
  const files = await githubFetch(url);

  // Filter out ignored extensions
  return files.filter(f => {
    const ext = f.filename.substring(f.filename.lastIndexOf('.'));
    return !config.ignoreExtensions.includes(ext);
  }).slice(0, config.maxFilesPerReview);
}

// ---- READ JIRA CONTEXT ----
function getJiraContext() {
  try {
    if (fs.existsSync("jira.txt")) {
      const content = fs.readFileSync("jira.txt", "utf8");
      if (content.trim()) {
        return `\n\nJira Ticket Context:\n${content}\n`;
      }
    }
  } catch (e) {
    console.log("⚠️ Could not read Jira context:", e.message);
  }
  return "";
}

// ---- READ CUSTOM RULES ----
function getCustomRules() {
  try {
    if (fs.existsSync("PR_RULES.md")) {
      const content = fs.readFileSync("PR_RULES.md", "utf8");
      if (content.trim()) {
        return `\n\nExisting Project Rules (Check these carefully):\n${content}\n`;
      }
    }
  } catch (e) {
    console.log("⚠️ Could not read PR_RULES.md:", e.message);
  }
  return "";
}

// ---- BUILD POSITION MAP FROM PATCH ----
// GitHub's position is 1-based, counting every line in the diff including headers
function buildPositionMap(patch) {
  if (!patch) return {};

  const lines = patch.split("\n");
  const positionMap = {};

  for (let i = 0; i < lines.length; i++) {
    const position = i + 1; // 1-based position
    const line = lines[i];

    // Only map added lines (they can receive comments)
    if (line.startsWith("+") && !line.startsWith("+++")) {
      positionMap[position] = {
        content: line.substring(1),
        position: position
      };
    }
  }

  return positionMap;
}

// ---- AI REVIEW FOR INLINE COMMENTS ----
async function getInlineReviewForFile(file, jiraContext, customRules) {
  if (!file.patch) return [];

  const positionMap = buildPositionMap(file.patch);
  const validPositions = Object.keys(positionMap).map(Number);

  if (validPositions.length === 0) return [];

  const prompt = `Analyze this file change and provide inline feedback.
${jiraContext}
${customRules}

File: ${file.filename}
Status: ${file.status}

Here is the diff with line positions. Each line starting with + is an addition, - is a deletion.
The NUMBER before each line is the POSITION you must use for comments:

${file.patch.split("\n").map((line, i) => `${i + 1}: ${line}`).join("\n")}

VALID POSITIONS for comments (only added lines): ${validPositions.join(", ")}

Instructions:
${lang.reviewInstructions}

Return ONLY valid JSON array, example:
[{"position": ${validPositions[0] || 1}, "body": "Issue description here"}]`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: lang.systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      }),
    });

    if (!res.ok) {
      console.error(`OpenAI error for ${file.filename}:`, await res.text());
      return [];
    }

    const data = await res.json();
    const content = data.choices[0].message.content.trim();

    console.log(`   AI response for ${file.filename}:`, content.substring(0, 200));

    // Parse JSON response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const comments = JSON.parse(jsonMatch[0]);
      console.log(`   Parsed ${comments.length} comments, valid positions: ${validPositions.join(",")}`);

      // Validate positions - only keep comments with valid positions
      const validComments = comments
        .filter(c => {
          const isValid = validPositions.includes(c.position);
          if (!isValid) {
            console.log(`   ⚠️ Invalid position ${c.position}, skipping`);
          }
          return isValid;
        })
        .map(c => ({
          path: file.filename,
          position: c.position,
          body: c.body
        }));

      console.log(`   Returning ${validComments.length} valid comments`);
      return validComments;
    } else {
      console.log(`   No JSON array found in response`);
    }
  } catch (e) {
    console.error(`Error reviewing ${file.filename}:`, e.message);
  }

  return [];
}

// ---- GENERAL AI REVIEW ----
async function runGeneralAIReview(files, jiraContext, customRules) {
  const prompt = `${lang.generalInstructions}
${jiraContext}
${customRules}

Changed files:
${files.map(f => `- ${f.filename} (${f.status}, +${f.additions}/-${f.deletions})`).join("\n")}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: lang.generalSystemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: config.temperature,
    }),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

// ---- POST REVIEW WITH INLINE COMMENTS ----
async function postReview(commitId, generalComment, inlineComments) {
  const url = `https://api.github.com/repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}/reviews`;

  const body = {
    commit_id: commitId,
    body: `🤖 **AI PR Review**\n\n${generalComment}`,
    event: "COMMENT",
    comments: inlineComments
  };

  console.log(`   Posting ${inlineComments.length} inline comments`);

  await githubFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---- MAIN ----
async function main() {
  console.log("📋 Configuration:", JSON.stringify(config, null, 2));

  console.log("🔍 Fetching PR info...");
  const prInfo = await getPRInfo();
  const commitId = prInfo.head.sha;
  console.log(`   Commit: ${commitId.substring(0, 7)}`);

  console.log("📁 Fetching changed files...");
  const files = await getChangedFiles();
  console.log(`   Found ${files.length} files to review`);

  const jiraContext = getJiraContext();
  if (jiraContext) {
    console.log("🎫 Jira context loaded");
  }

  const customRules = getCustomRules();
  if (customRules) {
    console.log("📜 Custom rules loaded from PR_RULES.md");
  }

  let allInlineComments = [];

  if (config.enableInlineComments) {
    console.log("🔎 Generating inline comments...");
    for (const file of files) {
      if (file.patch) {
        console.log(`   Reviewing: ${file.filename}`);
        const comments = await getInlineReviewForFile(file, jiraContext, customRules);
        allInlineComments.push(...comments);
      }
    }
    console.log(`   Generated ${allInlineComments.length} inline comments`);
  }

  let generalComment = "";
  if (config.enableGeneralComment) {
    console.log("🤖 Generating general review...");
    generalComment = await runGeneralAIReview(files, jiraContext, customRules);
  }

  console.log("💬 Posting review...");
  await postReview(commitId, generalComment, allInlineComments);

  console.log("✅ AI review posted successfully!");
  console.log(`   - General comment: ${config.enableGeneralComment ? "Yes" : "No"}`);
  console.log(`   - Inline comments: ${allInlineComments.length}`);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});