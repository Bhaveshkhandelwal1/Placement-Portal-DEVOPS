import { Request, Response } from 'express';
import { IUser } from '../models/User';
import { generateMockInterviewReply } from '../services/geminiMockInterview';

// @desc    Process mock interview message
// @route   POST /api/mock-interview/chat
// @access  Private/Student
export const handleMockInterviewChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const student = req.user as IUser;
    const { message, history } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ success: false, reply: 'Message is required.' });
      return;
    }

    const reply = await generateMockInterviewReply({
      message: message.trim(),
      history: Array.isArray(history) ? history : [],
      student,
    });

    res.json({ success: true, reply });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Mock Interview logic errored:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error processing sequence.',
      error: errMsg,
    });
  }
};
