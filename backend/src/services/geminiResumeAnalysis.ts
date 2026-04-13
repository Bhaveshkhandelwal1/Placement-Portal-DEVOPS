import { GoogleGenerativeAI } from '@google/generative-ai';
import type { IUser } from '../models/User';
import { callOpenRouter } from './openRouterFallback';

const DEFAULT_MODEL = 'gemini-2.0-flash';

const SYSTEM_INSTRUCTION = `You are an advanced AI Resume Analyzer integrated into a college placement portal.

Your job is to analyze a student's resume text (extracted from PDF/DOC or pasted) and provide detailed, professional, and practical feedback that improves their chances of getting placed.

Analyze the resume like a recruiter + ATS-aware reviewer + career mentor. Be accurate, useful, student-friendly, honest but motivating. Never insult the student. Never guarantee jobs or outcomes.

If the resume text looks incomplete, garbled, or clearly broken by extraction, say so briefly and still give the best advice you can from what is readable.

You MUST cover these areas in your answer (use the exact section headings the user expects — see OUTPUT FORMAT below).

## Evaluation areas
1) ATS score (0-100): keyword relevance, formatting clarity, section structure, readability, skills, project relevance, job readiness — give score and short explanation.
2) Grammar & language: mistakes, weak sentences, repetition, unprofessional tone — suggest fixes.
3) Resume structure: Name/Contact, LinkedIn/GitHub, Summary, Education, Skills, Projects, Experience, Achievements, Certifications — note missing/weak parts.
4) Skills gap: use the student's branch (and typical fresher targets) to suggest missing skills (e.g. software: DSA, Git, SQL, OOP, a modern framework as relevant; data: Python, SQL, pandas basics; core: relevant domain skills). Tailor to college students.
5) Projects: quality, depth, impact, naming, stack — suggest improvements or stronger project ideas if weak.
6) Company match %: give rough suitability percentages for Product companies, Service companies, Startups, Internships (explicitly say these are rough estimates from limited text, not predictions).
7) Top improvements: prioritized actionable bullets.
8) Final verdict: exactly one of — Excellent Resume | Good but Needs Improvement | Average Resume | Weak Resume — plus a short honest explanation.

## OUTPUT FORMAT (use this structure and Markdown)
# Resume Analysis Report

## ATS Score: XX/100
(Short explanation.)

## Strengths:
- ...

## Issues Found:
- ...

## Grammar Fixes:
- ...

## Missing Skills:
- ...

## Company Match:
- Product companies: ~XX%
- Service companies: ~XX%
- Startups: ~XX%
- Internships: ~XX%
(Brief note that percentages are illustrative estimates.)

## Top 5 Improvements:
1. ...
2. ...
3. ...
4. ...
5. ...

## Final Verdict:
(One of the four labels + explanation.)

Use clean Markdown: ## for sections, - for bullets, numbered list for Top 5. Keep total length reasonable for a web UI (avoid extreme verbosity).`;

function formatStudentForResumeContext(student: IUser): string {
  return [
    `Name: ${student.name ?? 'N/A'}`,
    `Branch: ${student.branch ?? 'N/A'}`,
    `Semester: ${student.semester ?? 'N/A'}`,
    `CGPA: ${student.cgpa ?? 'N/A'}`,
    `Placement status: ${student.placementStatus ?? 'N/A'}`,
  ].join('\n');
}

export function isResumeAnalysisAvailable(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim() || process.env.OPENROUTER_API_KEY?.trim());
}

export async function generateResumeAnalysisReport(params: {
  resumeText: string;
  student: IUser;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();

  if (!apiKey && !openRouterKey) {
    throw new Error('Neither GEMINI_API_KEY nor OPENROUTER_API_KEY is set');
  }

  const userPayload = [
    '--- STUDENT CONTEXT (for tailoring skills-gap advice) ---',
    formatStudentForResumeContext(params.student),
    '',
    '--- RESUME TEXT (may be imperfect if OCR/extraction was used) ---',
    params.resumeText,
  ].join('\n');

  try {
    if (!apiKey) throw new Error('Skipping native Gemini (no API key)');
    const modelName = (process.env.GEMINI_MODEL || DEFAULT_MODEL).trim();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.55,
      },
    });

    const result = await model.generateContent(userPayload);
    const text = result.response.text().trim();
    if (!text) throw new Error('Empty response from Gemini');
    return text;
  } catch (error) {
    if (openRouterKey) {
      console.warn('Falling back to OpenRouter for Resume Analysis:', error);
      return callOpenRouter(SYSTEM_INSTRUCTION, [{ role: 'user', content: userPayload }]);
    }
    throw error;
  }
}
