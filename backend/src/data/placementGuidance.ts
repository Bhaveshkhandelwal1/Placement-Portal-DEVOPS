/**
 * Curated general placement advice (no external LLM).
 * First matching rule wins — order from more specific phrases to broader ones.
 */

/** Catches common misspellings of “placement(s)”. */
function mentionsPlacement(l: string): boolean {
  return /\b(placements?|placment|placmeents?|placememts?|placemets?)\b/i.test(l);
}

type Rule = { test: (lower: string) => boolean; reply: string };

const rules: Rule[] = [
  {
    test: (l) =>
      /\b(group\s*discussion|gd\s+round|\bgd\b)\b/.test(l) ||
      (l.includes('group') && l.includes('discussion')),
    reply:
      'For GD rounds: stay updated on news and campus topics, structure your points (intro → 2–3 arguments → short close), ' +
      'avoid interrupting everyone, and add one solid new angle rather than repeating others. Practice 2–3 timed GDs with friends.',
  },
  {
    test: (l) =>
      /\b(aptitude|quant|quantitative|logical|reasoning|verbal)\b/.test(l) &&
      /\b(prepare|prep|practice|tips|how)\b/.test(l),
    reply:
      'Aptitude prep: fix a daily slot (45–60 min), mix quant + logical + verbal, and review mistakes in a small notebook. ' +
      'Use one primary platform consistently; speed comes from repeating patterns. Track accuracy first, then push time limits.',
  },
  {
    test: (l) =>
      /\b(leetcode|gfg|geeksforgeeks|hackerrank|codechef)\b/.test(l),
    reply:
      'For coding platforms: pick one main track (e.g. arrays → strings → trees → graphs), solve in a fixed template (read → examples → brute → optimize). ' +
      'Re-solve medium problems you got wrong after a week. Quality and patterns beat random hard problems early on.',
  },
  {
    test: (l) =>
      /\b(data\s*structure|dsa|algorithms?|coding\s*interview)\b/.test(l) &&
      /\b(prepare|prep|tips|how|study)\b/.test(l),
    reply:
      'DSA prep: master arrays, strings, hash maps, sorting, binary search, linked lists, stacks/queues, trees, graphs basics, and DP introduction. ' +
      'For each topic do easy → medium, timed, then revisit weak tags. Explain your approach out loud like you would in an interview.',
  },
  {
    test: (l) =>
      /\b(system\s*design|low\s*level\s*design|hld|lld)\b/.test(l),
    reply:
      'System design basics: clarify requirements, estimate scale, draw boxes (clients, API, DB, cache, queue), discuss trade-offs, and end with bottlenecks. ' +
      'For campus roles, focus on fundamentals: REST, SQL vs NoSQL, caching, auth, and simple scaling ideas rather than over-engineering.',
  },
  {
    test: (l) =>
      /\b(mock\s*interview|mock\s*interviews)\b/.test(l),
    reply:
      'Mock interviews: use peers or recordings, strict 45-min blocks, one problem + one HR question, then a 10-minute debrief on communication and speed. ' +
      'Note repeated mistakes (edge cases, complexity, unclear narration) and fix them in the next session.',
  },
  {
    test: (l) =>
      /\b(hr\s*round|behavioral|tell\s+me\s+about\s+yourself|strength|weakness)\b/.test(l),
    reply:
      'HR / behavioral: prepare a crisp 60–90 second intro, 3 STAR stories (team conflict, failure/learning, leadership/initiative), and honest strengths with a growth mindset on weaknesses. ' +
      'Tie answers to the role and company values when you can; never bad-mouth past teams.',
  },
  {
    test: (l) =>
      /\b(technical\s*interview|tech\s*round|coding\s*round)\b/.test(l),
    reply:
      'Technical rounds: clarify constraints, think aloud, start with a working approach then optimize, and test with examples including edge cases. ' +
      'If stuck, say what you tried and ask a small hint — interviewers value structured thinking over silent coding.',
  },
  {
    test: (l) =>
      /\b(resume|cv|curriculum)\b/.test(l) && /\b(tips|improve|format|prepare|help|how)\b/.test(l),
    reply:
      'Resume tips: one page for early careers, bullet points with impact (what you built, tech stack, metric if possible), no fluff skills, and links to GitHub/Portfolio. ' +
      'Match keywords to job descriptions subtly; proofread and get one senior review. Keep PDF formatting simple and ATS-friendly.',
  },
  {
    test: (l) =>
      /\b(linkedin|networking|referral)\b/.test(l),
    reply:
      'Networking: keep LinkedIn updated, connect with a short polite note, engage thoughtfully on posts, and ask specific questions — not generic “please refer”. ' +
      'Build projects you can show; referrals work best when someone can vouch for your work ethic and skills.',
  },
  {
    test: (l) =>
      /\b(project|portfolio|github)\b/.test(l) &&
      (mentionsPlacement(l) || /\b(interview|resume|prepare|important|show)\b/.test(l)),
    reply:
      'Projects for placements: pick 1–2 solid projects (problem → your role → tech → result), clean README, runnable demo or screenshots, and honest depth on trade-offs. ' +
      'Be ready to whiteboard the architecture and list what you would improve next.',
  },
  {
    test: (l) =>
      /\b(communication|english|speaking|confidence)\b/.test(l) &&
      (mentionsPlacement(l) || /\b(improve|tips|interview|how)\b/.test(l)),
    reply:
      'Communication: practice summarizing your resume and projects in 2 minutes, record yourself, and fix filler words. ' +
      'In interviews, slow down slightly, structure answers (context → action → result), and ask clarifying questions when needed.',
  },
  {
    test: (l) =>
      /\b(stress|anxious|nervous|panic|scared)\b/.test(l),
    reply:
      'It is normal to feel anxious before drives. Sleep, light exercise, and a fixed routine reduce spikes more than last-minute cramming. ' +
      'Before each round: 3 slow breaths, a quick skim of your cheat sheet, and remind yourself that one interview does not define your career.',
  },
  {
    test: (l) =>
      /\b(reject|rejected|not\s*shortlisted|failed|failure)\b/.test(l),
    reply:
      'Rejections are common in mass hiring; treat each process as feedback. Ask yourself what stage broke (aptitude, technical, HR) and fix one thing for the next company. ' +
      'Keep applying, keep building skills, and track applications in a simple sheet so you stay consistent.',
  },
  {
    test: (l) =>
      /\b(internship|intern\s*ship)\b/.test(l) &&
      (mentionsPlacement(l) || /\b(convert|ppo|important)\b/.test(l)),
    reply:
      'Internships help with PPOs and resume depth. Treat intern tasks like full-time work: clear communication, documentation, and ownership. ' +
      'Even without PPO, strong intern stories boost HR and technical rounds for full-time roles.',
  },
  {
    test: (l) =>
      /\b(off\s*-?\s*campus|on\s*-?\s*campus)\b/.test(l),
    reply:
      'On-campus: follow college timelines, eligibility, and notice discipline. Off-campus: stronger portfolio, referrals, and targeted applications matter more. ' +
      'Many students mix both — keep your core skills strong so either path stays open.',
  },
  {
    test: (l) =>
      /\b(low\s*cgpa|bad\s*cgpa|cgpa\s*low|backlog|arrears)\b/.test(l),
    reply:
      'If CGPA or backlogs are a constraint, read each notice’s rules carefully; some companies are strict. ' +
      'Offset with strong projects, contests, and relevant internships where allowed, and prioritize companies that match your profile — do not lose hope, but plan realistically.',
  },
  {
    test: (l) =>
      /\b(cgpa|gpa|marks)\b/.test(l) && /\b(importance|matter|enough|good)\b/.test(l),
    reply:
      'CGPA is often a filter for shortlists, especially early in college drives — but projects, problem-solving, and communication still decide many outcomes. ' +
      'Improve what you can each semester; for drives, check each notice’s minimum CGPA on this portal.',
  },
  {
    test: (l) =>
      /\b(when\s+to\s+start|timeline|semester\s*[0-9])\b/.test(l) &&
      (mentionsPlacement(l) || /\b(prep|prepare)\b/.test(l)),
    reply:
      'A simple timeline: early semesters — fundamentals + one language + basics of DSA; mid — projects + aptitude + core subjects; pre-placement season — mocks, HR stories, and revision sheets. ' +
      'Consistency beats short bursts; even 1 hour daily compounds.',
  },
  {
    test: (l) =>
      /\b(dress|formals|what\s+to\s+wear)\b/.test(l),
    reply:
      'For most campus processes: neat formals, minimal accessories, comfortable shoes, and a professional Zoom setup for online rounds (lighting, stable internet, plain background). ' +
      'When in doubt, slightly overdressed is safer than too casual.',
  },
  {
    test: (l) =>
      /\b(offer|multiple\s+offers)\b/.test(l) && /\b(compare|choose|decide|which)\b/.test(l),
    reply:
      'Choosing offers: list role, learning curve, location, compensation structure (fixed vs variable), bond, and long-term growth. ' +
      'Talk to seniors in similar roles if possible, and decide based on what you want for the next 2–3 years — not hype alone.',
  },
  {
    test: (l) =>
      /\b(salary|compensation|negotiat)\b/.test(l) &&
      !/\b(lpa|package\s+for|for\s+\w+)\b/.test(l),
    reply:
      'Campus offers are usually standardized; negotiation room is limited. Understand the full breakup (base, bonus, stocks, relocation) and bond clauses. ' +
      'Be polite and factual if you ever discuss terms; burning bridges helps no one.',
  },
  {
    test: (l) =>
      /\b(puzzle|puzzles)\b/.test(l),
    reply:
      'Puzzle rounds: listen fully, think aloud, try small cases, and do not freeze — partial progress beats silence. ' +
      'Practice classic logic puzzles and estimation problems; interviewers often care more about approach than the exact answer.',
  },
  {
    test: (l) =>
      /\b(prepare|preparation|prep|tips|how\s+to|study)\b/.test(l) &&
      /\b(for|at)\s+(?!the\b|an?\b|my\b|this\b|that\b|your\b)[a-z0-9][a-z0-9-]{1,24}\b/i.test(l) &&
      !mentionsPlacement(l) &&
      !/\b(campus\s*drive|my\s+first|first\s+interview)\b/.test(l),
    reply:
      'For a specific company, open its drive notice on this portal first (CGPA, branches, deadlines, package). Then align prep: aptitude if they use it, strong fundamentals in your branch, and consistent coding practice at a realistic difficulty. For big-picture campus prep, ask how to prepare for placements in general.',
  },
  {
    test: (l) =>
      /\b(prepare|prep|tips|how\s+to|roadmap|guide)\b/.test(l) &&
      (mentionsPlacement(l) || /\b(campus\s*drive|drive|job|career)\b/.test(l)),
    reply:
      'Broad placement prep: (1) Fix eligibility basics — CGPA, backlogs, and notice requirements on this portal. ' +
      '(2) Skills stack — aptitude + one strong language + DSA patterns + 1–2 solid projects. (3) Process skills — resume, HR stories, timed coding, and mock interviews. ' +
      '(4) Routine — weekly plan, mistake log, and health/sleep. Start small, repeat weekly, and adjust based on where you get stuck (aptitude vs tech vs HR).',
  },
  {
    test: (l) =>
      /\b(interview)\b/.test(l) && /\b(tips|prepare|how|first|scared)\b/.test(l),
    reply:
      'Interview prep in one line: know your resume deeply, practice explaining projects and DSA out loud, and do timed mocks. ' +
      'Read the job/notice description once before each company — tailor examples slightly without exaggerating.',
  },
  {
    test: (l) =>
      (mentionsPlacement(l) || /\bcampus\b/.test(l)) && /\b(strategy|plan|approach|mindset)\b/.test(l),
    reply:
      'Placement strategy: treat it like a project — track companies, deadlines, and your weak areas. Apply widely where eligible, but prepare deeply for a shortlist of dream roles. ' +
      'Balance optimism with discipline; every round teaches something even when the outcome is a no.',
  },
];

/** Default short guide when message feels placement-related but no rule matched */
const softPlacementHints =
  'For placements in general: strengthen aptitude + core problem solving + one strong project, keep your profile updated on this portal, ' +
  'and read each company notice for CGPA, branches, and deadlines. ' +
  'You can also ask me things like how to prepare for placements, resume tips, aptitude, HR rounds, or stress before interviews.';

export function getGeneralPlacementReply(lowerMessage: string): string | null {
  for (const { test, reply } of rules) {
    if (test(lowerMessage)) return reply;
  }
  if (
    mentionsPlacement(lowerMessage) ||
    /\b(campus\s*drive|job\s*search|career|interview|resume|company|hire)\b/.test(lowerMessage)
  ) {
    return softPlacementHints;
  }
  return null;
}
