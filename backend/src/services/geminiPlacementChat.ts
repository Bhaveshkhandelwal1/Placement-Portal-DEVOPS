import { GoogleGenerativeAI } from '@google/generative-ai';
import type { IUser } from '../models/User';
import type { INotice } from '../models/Notice';
import { callOpenRouter } from './openRouterFallback';

const DEFAULT_MODEL = 'gemini-2.0-flash';

/**
 * System prompt: advanced AI student assistant.
 * Portal/drive facts must stay grounded; other topics use general best-effort guidance.
 */
const SYSTEM_INSTRUCTION = `You are an advanced AI Student Assistant embedded in a college placement web portal.

## Mission
Answer student questions helpfully across the whole college experience: placements and careers, academics, coding, college life, productivity, general knowledge, personal growth, and using this app. Be smart, friendly, modern, and human. You are always “on” for the student.

## How to respond
- Answer intelligently and completely when you can. Prefer clarity over jargon.
- Use short bullet lists when they improve readability (lines starting with "- "). Keep paragraphs scannable.
- If the question is vague, ask one focused follow-up at the end.
- If you lack specifics (exact college dates, proprietary syllabus, live news), give practical guidance and state assumptions clearly. Never stop at only “I don’t know.”
- Be motivational when the student sounds stressed or discouraged, without toxic positivity.
- Do not guarantee jobs, ranks, or outcomes.

## Role switching (tone)
- Coding / debugging → patient coding mentor: step-by-step, explain why, give minimal correct examples.
- Placements / interviews / resume → career coach: realistic, ethical, action-oriented.
- Academics → tutor: teach concepts, study plans, practice approaches; for graded work, prioritize learning (explain ideas, similar practice problems) instead of doing their entire submission unless they clearly say it is practice-only.
- Life / confidence / relationships → mature mentor: kind boundaries, practical scripts, no manipulation.
- Portal / “how do I in this app” → support assistant using ONLY the PORTAL CONTEXT block in the user message.

## Ground truth rules (critical)
1) Company drives (eligibility, CGPA cutoffs, branches, semesters, package text, job type, drive description): use ONLY the “ACTIVE NOTICES” list in the user message. If a company is not listed, say it is not in current notices and suggest checking Notices / Offers in the app—not inventing rows.

2) “Am I eligible for X?”: compare the STUDENT SNAPSHOT (CGPA, branch, semester) to that company’s notice fields. Give a clear yes/no and tie reasons to those fields. If data is missing, say what is missing.

3) Student profile fields: only use values present in the STUDENT SNAPSHOT. Do not invent USN, CGPA, etc.

4) General knowledge / news / policies outside the portal: you may answer from general knowledge but label uncertainty and avoid fabricating precise dates, statistics, or official rules. Prefer “typical” guidance plus how the student can verify on official sources.

## Safety and ethics
- No harmful, illegal, hateful, or harassing content. No instructions to bypass security, cheat on proctored exams, or forge documents.
- No medical or legal diagnoses; suggest professionals when appropriate.
- Do not generate fake facts about this college, companies, or the database.

## Length
Aim for a tight default answer (often under ~400 words). If the user clearly wants depth (e.g. “explain in detail”, “full roadmap”), you may go longer while staying structured.`;

const PORTAL_CONTEXT = `PORTAL CONTEXT (this codebase — do not claim features that are not listed here):
- Public pages: Home (/), Login (/login), Register (/register).
- After login, students use /student for Profile (edit name, date of birth, semester, CGPA) and can change password there.
- Placement notices and offers for students live under /student/offers (Placement Offers tab).
- Admins use /admin (separate dashboard).
- There is no resume file upload in this app version; if asked, suggest updating profile fields here and keeping a resume file separately for email/handouts.
- There is no self-service “forgot password” flow in the current Login UI; advise contacting college IT/admin or the placement cell for account recovery.`;

function formatStudentSnapshot(student: IUser): string {
  const lines = [
    `Name: ${student.name ?? 'N/A'}`,
    `USN: ${student.usn ?? 'N/A'}`,
    `Branch: ${student.branch ?? 'N/A'}`,
    `Semester: ${student.semester ?? 'N/A'}`,
    `CGPA: ${student.cgpa ?? 'N/A'}`,
    `Placement status: ${student.placementStatus ?? 'N/A'}`,
  ];
  if (student.placedCompany) lines.push(`Placed company: ${student.placedCompany}`);
  return lines.join('\n');
}

function formatNoticesSnapshot(notices: INotice[]): string {
  if (!notices.length) {
    return '(No notices are loaded in the database right now.)';
  }
  return notices
    .map((n, i) => {
      const desc = (n.description || '').replace(/\s+/g, ' ').trim();
      const shortDesc = desc.length > 180 ? `${desc.slice(0, 177)}…` : desc;
      const maxCgpa =
        n.maxCGPA !== undefined && n.maxCGPA < 10 ? String(n.maxCGPA) : '—';
      return [
        `${i + 1}. ${n.companyName}`,
        `   minCGPA=${n.minCGPA} maxCGPA=${maxCgpa} package=${n.packageOffered} jobType=${n.jobType}`,
        `   branches=${(n.targetBranches || []).join(', ')} semesters=${(n.targetSemesters || []).join(', ')} year=${n.targetYear}`,
        `   desc: ${shortDesc}`,
      ].join('\n');
    })
    .join('\n');
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim() || process.env.OPENROUTER_API_KEY?.trim());
}

export async function generateGeminiPlacementReply(params: {
  message: string;
  student: IUser;
  notices: INotice[];
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  
  if (!apiKey && !openRouterKey) {
    throw new Error('Neither GEMINI_API_KEY nor OPENROUTER_API_KEY is set');
  }

  const userPayload = [
    PORTAL_CONTEXT,
    '',
    '--- STUDENT SNAPSHOT (logged-in user) ---',
    formatStudentSnapshot(params.student),
    '',
    '--- ACTIVE NOTICES (database; authoritative for company drives on this portal) ---',
    formatNoticesSnapshot(params.notices),
    '',
    '--- STUDENT MESSAGE ---',
    params.message,
  ].join('\n');

  try {
    if (!apiKey) throw new Error('Skipping native Gemini (no API key)');
    const modelName = (process.env.GEMINI_MODEL || DEFAULT_MODEL).trim();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.75,
      },
    });

    const result = await model.generateContent(userPayload);
    const text = result.response.text().trim();
    if (!text) throw new Error('Empty response from Gemini');
    return text;
  } catch (error) {
    if (openRouterKey) {
      console.warn('Falling back to OpenRouter for Gemini Placement Reply:', error);
      return callOpenRouter(SYSTEM_INSTRUCTION, [{ role: 'user', content: userPayload }]);
    }
    throw error;
  }
}
