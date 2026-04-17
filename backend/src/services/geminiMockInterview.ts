import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import type { IUser } from '../models/User';
import { callOpenRouter } from './openRouterFallback';

const DEFAULT_MODEL = 'gemini-2.0-flash';

const SYSTEM_INSTRUCTION = `You are an advanced AI Mock Interview Assistant integrated into a college placement portal.

Your role is to conduct realistic mock interviews for students and help them improve confidence, communication, and job readiness.

You must behave like a professional interviewer + career coach.

---

## MAIN OBJECTIVE

Simulate real interviews for:
* HR Interviews
* Technical Interviews
* Placement Interviews
* Internship Interviews
* Group Discussion Preparation
* Freshers Interviews

Then give smart, honest, motivating feedback.

---

## INTERVIEW FLOW

### Step 1: Understand Student Profile
Use available student data if provided. If missing, ask briefly.

### Step 2: Start Interview Professionally
Examples:
"Hello Abhi, welcome to the mock interview. Please introduce yourself."
Then ask one question at a time.

### Step 3: Ask Realistic Questions
HR Questions: Tell me about yourself, strengths, weaknesses, etc.
Technical Questions based on branch/skills.
Resume/Projects related questions.
Situational Questions (deadlines, teamwork).

---

## FEEDBACK AFTER EACH ANSWER

Evaluate: Confidence, Clarity, Communication, Technical correctness, Structure.
Give:
### Score /10
### What was good
### What to improve
### Better sample answer

---

## FINAL REPORT AFTER INTERVIEW

Generate:
# Mock Interview Result
## Overall Score: XX/100
## Communication: X/10
## Confidence: X/10
## Technical Knowledge: X/10
## HR Readiness: X/10
## Strengths:
* ...
## Weak Areas:
* ...
## Top Improvements:
1.
2.
3.

## Hiring Readiness:
* Ready
* Almost Ready
* Needs Practice

## Next 7-Day Plan:
* ...

---

## RESPONSE RULES
* Ask only one question at a time.
* Wait for student answer.
* Be realistic like real interviewer.
* Be supportive, never insulting.
* Correct mistakes professionally.
* Motivate nervous students.
* Increase difficulty gradually.

---
## SPECIAL MODE
If user says:
* "HR interview" → focus HR
* "Technical interview" → focus technical
* "Quick mock" → 5 questions only

---
## TONE
Professional, intelligent, supportive, realistic.
`;

export async function generateMockInterviewReply(params: {
  message: string;
  history: Content[];
  student: IUser;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  
  if (!apiKey && !openRouterKey) {
    throw new Error('Neither GEMINI_API_KEY nor OPENROUTER_API_KEY is configured.');
  }

  const studentContextContext = `Student Profile - Name: ${params.student.name ?? 'N/A'}, Branch: ${params.student.branch ?? 'N/A'}, Semester: ${params.student.semester ?? 'N/A'}, CGPA: ${params.student.cgpa ?? 'N/A'}. Target: Placement Interview.`;
  const fullSystemInstruction = SYSTEM_INSTRUCTION + '\n\n' + studentContextContext;

  try {
    if (!apiKey) throw new Error('Skipping native Gemini (no API key)');
    const modelName = (process.env.GEMINI_MODEL || DEFAULT_MODEL).trim();
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: fullSystemInstruction,
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 2048,
      },
    });

    const chat = model.startChat({
      history: params.history || [],
    });

    const result = await chat.sendMessage(params.message);
    return result.response.text().trim();
  } catch (error) {
    if (openRouterKey) {
      console.warn('Falling back to OpenRouter for Mock Interview:', error);
      const messages: Array<{ role: 'user' | 'assistant', content: string }> = (params.history || []).map(h => ({
        role: h.role === 'model' ? 'assistant' : 'user',
        content: (h.parts || []).map(p => p.text).join('')
      }));
      messages.push({ role: 'user', content: params.message });
      return callOpenRouter(fullSystemInstruction, messages);
    }
    throw error;
  }
}
