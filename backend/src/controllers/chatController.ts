import { Request, Response } from 'express';
import { IUser } from '../models/User';
import Notice, { INotice } from '../models/Notice';
import { getGeneralPlacementReply } from '../data/placementGuidance';
import { generateGeminiPlacementReply, isGeminiConfigured } from '../services/geminiPlacementChat';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Avoid passing user text directly into RegExp without escaping */
function findNoticeByNameQuery(raw: string): { $regex: RegExp } {
  const trimmed = raw.replace(/[?.,!]+$/g, '').trim();
  return { $regex: new RegExp(escapeRegex(trimmed), 'i') };
}

async function findNoticeForMessage(lowerMessage: string): Promise<INotice | null> {
  const notices = await Notice.find({});

  const bySubstring = [...notices]
    .sort((a, b) => b.companyName.length - a.companyName.length)
    .find((n) => lowerMessage.includes(n.companyName.toLowerCase()));
  if (bySubstring) return bySubstring;

  if (lowerMessage.includes(' for ')) {
    const tail = lowerMessage.split(' for ').pop()?.replace(/[?.,!]+$/g, '').trim() ?? '';
    if (tail) {
      const exact = await Notice.findOne({
        companyName: { $regex: new RegExp(`^${escapeRegex(tail)}$`, 'i') },
      });
      if (exact) return exact;
      return Notice.findOne({ companyName: findNoticeByNameQuery(tail) });
    }
  }
  return null;
}

function isPersonalEligibilityQuery(lower: string): boolean {
  if (/\b(am\s*i|can\s*i|do\s*i|will\s*i)\b/.test(lower) && /\b(eligible|eligibility|qualify)\b/.test(lower)) {
    return true;
  }
  if (lower.includes('eligible') && lower.includes(' for ')) return true;
  return false;
}

function isCompanyInfoQuery(lower: string): boolean {
  return (
    /\b(cgpa|criteria|criterion|requirement|requirements|package|salary|stipend|branch|branches|semester|semesters|lpa|opening|openings|detail|details|info|about|minimum|maximum|who\s+can|allowed|cut-?off)\b/.test(
      lower
    ) ||
    /\b(what|tell|show|give)\b.*\b(cgpa|package|criteria|requirement|salary|lpa)\b/.test(lower)
  );
}

function formatNoticeDetails(notice: INotice): string {
  const cgpaMax =
    notice.maxCGPA !== undefined && notice.maxCGPA < 10
      ? `, maximum CGPA ${notice.maxCGPA}`
      : '';
  const branches = notice.targetBranches.join(', ');
  const semesters = notice.targetSemesters.join(', ');
  const desc =
    notice.description.length > 240 ? `${notice.description.slice(0, 237)}…` : notice.description;

  return (
    `Here is what we have on ${notice.companyName}: ` +
    `minimum CGPA ${notice.minCGPA}${cgpaMax}; ` +
    `package ${notice.packageOffered}; ` +
    `job type ${notice.jobType}; ` +
    `target branches: ${branches}; ` +
    `target semesters: ${semesters}; ` +
    `batch / target year: ${notice.targetYear}. ` +
    `Summary: ${desc}`
  );
}

function buildEligibilityReply(student: IUser, notice: INotice): { eligible: boolean; text: string } {
  const reasons: string[] = [];

  if (student.cgpa === undefined || student.cgpa < notice.minCGPA) {
    reasons.push(`Your CGPA (${student.cgpa ?? 'N/A'}) is below the minimum (${notice.minCGPA}).`);
  }
  if (student.branch && !notice.targetBranches.includes(student.branch)) {
    reasons.push(`Your branch (${student.branch}) is not among the listed branches.`);
  }
  if (student.semester && !notice.targetSemesters.includes(student.semester)) {
    reasons.push(`Your semester (${student.semester}) is not in the allowed list.`);
  }

  if (reasons.length === 0) {
    return {
      eligible: true,
      text: `Yes, you are currently eligible for ${notice.companyName}. Best of luck applying!`,
    };
  }
  return {
    eligible: false,
    text: `Unfortunately, you are not eligible for ${notice.companyName}. ${reasons.join(' ')}`,
  };
}

// @desc    Process chatbot query
// @route   POST /api/chatbot/query
// @access  Private/Student
export const handleQuery = async (req: Request, res: Response): Promise<void> => {
  try {
    const student = req.user as IUser;
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ success: false, reply: 'Invalid query format.' });
      return;
    }

    const trimmed = message.trim();
    const lowerMessage = trimmed.toLowerCase();

    if (isGeminiConfigured()) {
      try {
        const notices = await Notice.find({}).limit(80).exec();
        const reply = await generateGeminiPlacementReply({
          message: trimmed,
          student,
          notices,
        });
        res.json({ success: true, reply });
        return;
      } catch (geminiErr) {
        console.error('Gemini placement bot failed, using rule-based fallback:', geminiErr);
      }
    }

    if (/^(hi|hello|hey|hii|yo)[\s!.?]*$/i.test(trimmed)) {
      res.json({
        success: true,
        reply:
          'Hi! I am your Student Assistant. I can help with company notices and your eligibility, packages and LPA-style questions, and practical placement tips. Tell me what you are working on.',
      });
      return;
    }
    if (/^(thanks|thank you|thx|ty)[\s!.?]*$/i.test(trimmed)) {
      res.json({ success: true, reply: 'You are welcome. Good luck with placements!' });
      return;
    }

    if (lowerMessage.includes('which companies') || lowerMessage.includes('list companies') || lowerMessage.includes('all companies')) {
      const names = (await Notice.find({}, 'companyName').lean()).map((n) => n.companyName);
      if (names.length === 0) {
        res.json({ success: true, reply: 'There are no active company notices in the system yet.' });
        return;
      }
      res.json({
        success: true,
        reply: `Companies with notices right now: ${names.join(', ')}.`,
      });
      return;
    }

    if (lowerMessage.includes('above') && lowerMessage.includes('lpa')) {
      const splitAbove = lowerMessage.split('above ');
      if (splitAbove.length > 1) {
        const numberStr = splitAbove[1].replace(/[^0-9.]/g, '');
        const requiredLpa = parseFloat(numberStr);

        if (!isNaN(requiredLpa)) {
          const notices = await Notice.find({});
          const qualifyingCompanies: string[] = [];

          notices.forEach((notice) => {
            const pkgStr = notice.packageOffered;
            let avgPkg = 0;
            if (pkgStr.includes('-')) {
              const parts = pkgStr.split('-').map((p) => parseFloat(p.trim()));
              avgPkg = (parts[0] + parts[1]) / 2;
            } else {
              avgPkg = parseFloat(pkgStr.replace(/[^0-9.]/g, ''));
            }

            if (!isNaN(avgPkg) && avgPkg >= requiredLpa) {
              if (!qualifyingCompanies.includes(notice.companyName)) {
                qualifyingCompanies.push(notice.companyName);
              }
            }
          });

          if (qualifyingCompanies.length > 0) {
            res.json({
              success: true,
              reply: `Companies offering around or above ${requiredLpa} LPA (from notices): ${qualifyingCompanies.join(', ')}.`,
            });
          } else {
            res.json({
              success: true,
              reply: `I could not find companies in notices clearly above ${requiredLpa} LPA.`,
            });
          }
          return;
        }
      }
    }

    const noticeFromText = await findNoticeForMessage(lowerMessage);

    if (noticeFromText) {
      if (isPersonalEligibilityQuery(lowerMessage)) {
        const { text } = buildEligibilityReply(student, noticeFromText);
        res.json({ success: true, reply: text });
        return;
      }
      if (isCompanyInfoQuery(lowerMessage) || lowerMessage.split(/\s+/).filter(Boolean).length <= 4) {
        res.json({ success: true, reply: formatNoticeDetails(noticeFromText) });
        return;
      }
    }

    if (lowerMessage.includes('eligible') && lowerMessage.includes(' for ')) {
      const splitFor = lowerMessage.split(' for ');
      if (splitFor.length > 1) {
        let extractedCompany = splitFor[1].replace(/[?.,!]+$/g, '').trim();
        const notice =
          (await Notice.findOne({
            companyName: { $regex: new RegExp(`^${escapeRegex(extractedCompany)}$`, 'i') },
          })) ?? (await Notice.findOne({ companyName: findNoticeByNameQuery(extractedCompany) }));

        if (!notice) {
          res.json({
            success: true,
            reply: `I could not find any current notice for "${extractedCompany}". Check spelling or browse the notices list.`,
          });
          return;
        }

        const { text } = buildEligibilityReply(student, notice);
        res.json({ success: true, reply: text });
        return;
      }
    }

    const generalReply = getGeneralPlacementReply(lowerMessage);
    if (generalReply) {
      res.json({ success: true, reply: generalReply });
      return;
    }

    res.json({
      success: true,
      reply:
        'I am not sure how to answer that yet. Try general topics like how to prepare for placements, resume tips, or aptitude; or use this portal for company-specific things: CGPA criteria for [Company], package for [Company], Am I eligible for [Company], companies above 10 LPA, or which companies are hiring.',
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Chatbot query error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: errMsg,
    });
  }
};
