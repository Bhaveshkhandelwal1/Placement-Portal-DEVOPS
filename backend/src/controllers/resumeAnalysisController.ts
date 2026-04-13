import { Request, Response } from 'express';
import { IUser } from '../models/User';
import { generateResumeAnalysisReport, isResumeAnalysisAvailable } from '../services/geminiResumeAnalysis';

const MIN_CHARS = 80;
const MAX_CHARS = 48_000;

// @desc    Analyze resume text with Gemini (ATS-style feedback)
// @route   POST /api/students/resume-analysis
// @access  Private / Student
export const analyzeResumeText = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isResumeAnalysisAvailable()) {
      res.status(503).json({
        success: false,
        message: 'Resume analysis is not available. The server needs GEMINI_API_KEY configured.',
      });
      return;
    }

    const raw = req.body?.resumeText;
    if (typeof raw !== 'string') {
      res.status(400).json({ success: false, message: 'resumeText must be a string.' });
      return;
    }

    const resumeText = raw.replace(/\u0000/g, '').trim();
    if (resumeText.length < MIN_CHARS) {
      res.status(400).json({
        success: false,
        message: `Please provide at least ${MIN_CHARS} characters of resume text (paste or extract from PDF).`,
      });
      return;
    }
    if (resumeText.length > MAX_CHARS) {
      res.status(400).json({
        success: false,
        message: `Resume text is too long (max ${MAX_CHARS} characters). Try removing images or unrelated pages.`,
      });
      return;
    }

    const student = req.user as IUser;
    const report = await generateResumeAnalysisReport({ resumeText, student });

    res.json({ success: true, report });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      message: `Error from Gemini API: ${message}`,
      error: message,
    });
  }
};
