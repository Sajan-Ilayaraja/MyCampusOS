const Task = require('../models/Task');
const Subject = require('../models/Subject');
const Goal = require('../models/Goal');
const Note = require('../models/Note');
const AIInteraction = require('../models/AIInteraction');
const QuizAttempt = require('../models/QuizAttempt');
const FlashcardMastery = require('../models/FlashcardMastery');

const promptTemplates = require('../utils/promptTemplates');
const { sanitizeInputPrompt, compressNoteText, extractCleanReply } = require('../utils/aiService');
const providerRouter = require('../services/providerRouter');
const AIChatConversation = require('../models/AIChatConversation');
const { extractTextFromNote } = require('../utils/fileExtractor');

const AIStudyPlan = require('../models/AIStudyPlan');
const AISummary = require('../models/AISummary');
const AIQuiz = require('../models/AIQuiz');
const AIFlashcardDeck = require('../models/AIFlashcardDeck');
const AICareerRoadmap = require('../models/AICareerRoadmap');
const AIDocument = require('../models/AIDocument');
const AICache = require('../models/AICache');
const AIProviderLog = require('../models/AIProviderLog');
const fs = require('fs');
const path = require('path');

// Helper to log AI usage interaction
const logInteraction = async (userId, feature, prompt, response, meta = {}) => {
  try {
    await AIInteraction.create({
      userId,
      feature,
      prompt,
      response,
      meta
    });
  } catch (error) {
    console.error('Failed to log AI interaction:', error.message);
  }
};

// Helper to parse query/body streaming flags
const shouldStream = (req) => {
  return req.query.stream === 'true' || req.body.stream === true;
};

// @desc    Generate personalized revision timetable and priority goals
// @route   POST /api/ai/study-plan
// @access  Private
const generateStudyPlan = async (req, res) => {
  try {
    const { subject, examDate, topics, dailyHours } = req.body;
    if (!subject || !examDate || !topics) {
      return res.status(400).json({ success: false, message: 'Please provide subject, exam date, and topics' });
    }

    const sanitizedSubject = sanitizeInputPrompt(subject);
    const sanitizedTopics = Array.isArray(topics) ? topics.map(t => sanitizeInputPrompt(t)) : sanitizeInputPrompt(topics);
    const hours = Number(dailyHours) || 2;
    const preferredProvider = req.headers['x-preferred-provider'] || req.body.preferredProvider || 'auto';

    if (shouldStream(req)) {
      return await providerRouter.generateStudyPlan(sanitizedSubject, examDate, sanitizedTopics, hours, true, res, preferredProvider);
    }

    const response = await providerRouter.generateStudyPlan(sanitizedSubject, examDate, sanitizedTopics, hours, false, null, preferredProvider);

    // Response Validation
    const validated = {
      timetable: Array.isArray(response?.timetable) ? response.timetable : [],
      revisionSchedule: Array.isArray(response?.revisionSchedule) ? response.revisionSchedule : [],
      priorityTopics: Array.isArray(response?.priorityTopics) ? response.priorityTopics : [],
      dailyGoals: Array.isArray(response?.dailyGoals) ? response.dailyGoals : ['Review syllabus content']
    };

    // Auto-save Study Plan
    const record = await AIStudyPlan.create({
      userId: req.user._id,
      title: `${sanitizedSubject} Study Plan`,
      subject: sanitizedSubject,
      examDate: new Date(examDate),
      topics: Array.isArray(topics) ? topics : [topics],
      dailyHours: hours,
      plan: validated
    });

    const promptTextForLogging = `Subject: ${sanitizedSubject}, Topics: ${JSON.stringify(sanitizedTopics)}, Hours: ${hours}`;
    await logInteraction(req.user._id, 'study-plan', promptTextForLogging, validated, { subject: sanitizedSubject });
    return res.status(200).json({ success: true, plan: validated, record });

  } catch (error) {
    console.error('Study plan generation error:', error);
    return res.status(500).json({ success: false, message: 'CampusBuddy is temporarily unavailable. Please try again in a few moments.' });
  }
};

const chunkText = (text, maxLength = 25000, overlap = 2000) => {
  if (!text || typeof text !== 'string') return [];
  const chunks = [];
  let index = 0;
  while (index < text.length) {
    let endIndex = index + maxLength;
    if (endIndex < text.length) {
      const nextSpace = text.indexOf(' ', endIndex);
      if (nextSpace !== -1 && nextSpace < endIndex + 300) {
        endIndex = nextSpace;
      }
    }
    chunks.push(text.substring(index, endIndex));
    if (endIndex >= text.length) break;
    index = endIndex - overlap;
  }
  return chunks;
};

const summarizeNotesInChunks = async (notesText, preferredProvider = 'auto') => {
  const textChunks = chunkText(notesText);
  console.log(`Large document detected. Splitting into ${textChunks.length} chunks for consolidation.`);
  
  const chunkSummaries = [];
  for (let idx = 0; idx < textChunks.length; idx++) {
    const chunk = textChunks[idx];
    const chunkPrompt = `Summarize this section of the document:\n\n"${chunk}"`;
    const chunkRes = await providerRouter.executeWithFailover('notes-summary', [{ role: 'user', content: chunkPrompt }], true, preferredProvider);
    chunkSummaries.push(chunkRes.summary || chunkRes.reply || chunkRes.overview || 'Section summary missing.');
  }

  const combinedText = chunkSummaries.join('\n\n');
  return promptTemplates.notesSummary(combinedText);
};

const generateQuizInChunks = async (quizContext, diff, count, preferredProvider = 'auto') => {
  const textChunks = chunkText(quizContext);
  console.log(`Large document detected. Splitting into ${textChunks.length} chunks for Quiz generation.`);
  
  const questionsPerChunk = Math.max(1, Math.ceil(count / textChunks.length));
  let combinedQuestions = [];
  
  for (let idx = 0; idx < textChunks.length; idx++) {
    if (combinedQuestions.length >= count) break;
    const chunk = textChunks[idx];
    const remainingCount = count - combinedQuestions.length;
    const currentChunkCount = Math.min(questionsPerChunk, remainingCount);
    
    const chunkPrompt = promptTemplates.quizGenerator(chunk, diff, currentChunkCount);
    const chunkRes = await providerRouter.executeWithFailover('quiz-generator', [{ role: 'user', content: chunkPrompt }], true, preferredProvider);
    if (Array.isArray(chunkRes.questions)) {
      combinedQuestions = combinedQuestions.concat(chunkRes.questions);
    }
  }
  
  return { questions: combinedQuestions.slice(0, count) };
};

const generateFlashcardsInChunks = async (cardContext, count, preferredProvider = 'auto') => {
  const textChunks = chunkText(cardContext);
  console.log(`Large document detected. Splitting into ${textChunks.length} chunks for Flashcard generation.`);
  
  const cardsPerChunk = Math.max(1, Math.ceil(count / textChunks.length));
  let combinedCards = [];
  
  for (let idx = 0; idx < textChunks.length; idx++) {
    if (combinedCards.length >= count) break;
    const chunk = textChunks[idx];
    const remainingCount = count - combinedCards.length;
    const currentChunkCount = Math.min(cardsPerChunk, remainingCount);
    
    const chunkPrompt = promptTemplates.flashcards(chunk, currentChunkCount);
    const chunkRes = await providerRouter.executeWithFailover('flashcards', [{ role: 'user', content: chunkPrompt }], true, preferredProvider);
    if (Array.isArray(chunkRes.flashcards)) {
      combinedCards = combinedCards.concat(chunkRes.flashcards);
    }
  }
  
  return { flashcards: combinedCards.slice(0, count) };
};

// @desc    Analyze notes and extract key points, formulas, summaries
// @route   POST /api/ai/notes-summary
// @access  Private
const summarizeNotes = async (req, res) => {
  try {
    const { content, noteId, documentId } = req.body;
    let notesText = '';

    if (documentId) {
      const doc = await AIDocument.findOne({ _id: documentId, userId: req.user._id });
      if (!doc) {
        return res.status(404).json({ success: false, message: 'Document not found or unauthorized' });
      }
      notesText = doc.text;
    } else if (noteId) {
      const note = await Note.findOne({ _id: noteId, uploadedBy: req.user._id });
      if (!note) {
        return res.status(404).json({ success: false, message: 'Uploaded note not found or unauthorized' });
      }
      notesText = await extractTextFromNote(note);
    } else {
      notesText = content;
    }

    if (!notesText || !notesText.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide notes text content or a valid noteId/documentId' });
    }

    const preferredProvider = req.headers['x-preferred-provider'] || req.body.preferredProvider || 'auto';
    const isLarge = notesText.length > 30000;
    let response;
    let logPrompt;

    if (isLarge) {
      const consolidatedPromptText = await summarizeNotesInChunks(notesText, preferredProvider);
      logPrompt = `Large doc summary: ${notesText.length} chars`;
      
      // If consolidatedPromptText is a full prompt string, we send it to providerRouter
      const messages = [{ role: 'user', content: consolidatedPromptText }];
      if (shouldStream(req)) {
        return await providerRouter.executeStreamWithFailover('notes-summary', messages, res, preferredProvider);
      }
      response = await providerRouter.executeWithFailover('notes-summary', messages, true, preferredProvider);
    } else {
      const compressed = compressNoteText(notesText);
      logPrompt = compressed;
      if (shouldStream(req)) {
        return await providerRouter.generateSummary(compressed, true, res, preferredProvider);
      }
      response = await providerRouter.generateSummary(compressed, false, null, preferredProvider);
    }

    const validated = {
      overview: typeof response?.overview === 'string' ? response.overview : (response?.summary || 'Overview parsing failure.'),
      keyConcepts: Array.isArray(response?.keyConcepts) ? response.keyConcepts : (Array.isArray(response?.keyPoints) ? response.keyPoints : ['Important coursework takeaway']),
      importantDefinitions: Array.isArray(response?.importantDefinitions) ? response.importantDefinitions : [],
      importantQuestions: Array.isArray(response?.importantQuestions) ? response.importantQuestions : [],
      examTips: Array.isArray(response?.examTips) ? response.examTips : [],
      quickRevisionNotes: typeof response?.quickRevisionNotes === 'string' ? response.quickRevisionNotes : (response?.revisionNotes || notesText.substring(0, 600))
    };

    // Auto-save Summary
    let titleStr = 'New Summary';
    if (documentId) {
      const docObj = await AIDocument.findById(documentId);
      if (docObj) titleStr = `Summary: ${docObj.fileName}`;
    } else if (noteId) {
      const noteObj = await Note.findById(noteId);
      if (noteObj) titleStr = `Summary: ${noteObj.title}`;
    } else if (content) {
      const firstWords = content.trim().split(/\s+/).slice(0, 4).join(' ');
      titleStr = `Summary: ${firstWords}...`;
    }

    const record = await AISummary.create({
      userId: req.user._id,
      title: titleStr,
      noteId: noteId || null,
      documentId: documentId || null,
      content: content || null,
      summary: validated
    });

    if (documentId) {
      const doc = await AIDocument.findOne({ _id: documentId, userId: req.user._id });
      if (doc) {
        doc.generatedSummaries.push({ summaryId: record._id });
        await doc.save();
      }
    }

    await logInteraction(req.user._id, 'notes-summary', logPrompt, validated);
    return res.status(200).json({ success: true, summary: validated, record });

  } catch (error) {
    console.error('Notes summary error:', error);
    return res.status(500).json({ success: false, message: 'CampusBuddy is temporarily unavailable. Please try again in a few moments.' });
  }
};

// @desc    Generate a custom timed quiz (optionally from PDF notes)
// @route   POST /api/ai/quiz-generator
// @access  Private
const generateQuiz = async (req, res) => {
  try {
    const { topic, difficulty, questionCount, noteId, documentId } = req.body;
    let quizContext = '';

    if (documentId) {
      const doc = await AIDocument.findOne({ _id: documentId, userId: req.user._id });
      if (!doc) {
        return res.status(404).json({ success: false, message: 'Document not found or unauthorized' });
      }
      quizContext = doc.text;
    } else if (noteId) {
      const note = await Note.findOne({ _id: noteId, uploadedBy: req.user._id });
      if (!note) {
        return res.status(404).json({ success: false, message: 'Note not found or unauthorized' });
      }
      quizContext = await extractTextFromNote(note);
    } else {
      quizContext = topic;
    }

    if (!quizContext || !quizContext.trim()) {
      return res.status(400).json({ success: false, message: 'Please specify the topic or select a note/document for the quiz' });
    }

    const diff = ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium';
    const count = Math.min(10, Math.max(3, Number(questionCount) || 5));

    const preferredProvider = req.headers['x-preferred-provider'] || req.body.preferredProvider || 'auto';
    let validated;
    let prompt = '';
    const isLarge = quizContext.length > 30000;
    
    if (isLarge) {
      validated = await generateQuizInChunks(quizContext, diff, count, preferredProvider);
      prompt = `Generated quiz in chunks from large context size: ${quizContext.length} chars.`;
    } else {
      const compressed = compressNoteText(quizContext);
      prompt = compressed;
      const response = await providerRouter.generateQuiz(compressed, diff, count, preferredProvider);

      const validatedQuestions = Array.isArray(response?.questions) ? response.questions.map((q, idx) => ({
        id: q.id || idx + 1,
        type: ['mcq', 'tf', 'short', 'code'].includes(q.type) ? q.type : 'mcq',
        questionText: q.questionText || '',
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: q.correctAnswer !== undefined ? String(q.correctAnswer) : '',
        explanation: q.explanation || '',
        difficultyLevel: q.difficultyLevel || diff
      })) : [];

      validated = { questions: validatedQuestions };
    }

    // Defensive validation of generated quiz structure
    if (!validated || !Array.isArray(validated.questions) || validated.questions.length === 0) {
      throw new Error('CampusBuddy is temporarily unavailable. Please try again in a few moments.');
    }

    // Ensure all questions are complete and options have exactly 4 items for MCQs
    for (const q of validated.questions) {
      if (!q.questionText || typeof q.questionText !== 'string' || !q.questionText.trim()) {
        throw new Error('Quiz validation failed: missing or empty question text');
      }
      if (q.correctAnswer === undefined || q.correctAnswer === null || String(q.correctAnswer).trim() === '') {
        throw new Error('Quiz validation failed: missing correct answer');
      }
      if (!q.explanation || typeof q.explanation !== 'string' || !q.explanation.trim()) {
        throw new Error('Quiz validation failed: missing explanation');
      }
      if (q.type === 'mcq') {
        if (!Array.isArray(q.options) || q.options.length !== 4) {
          throw new Error('Quiz validation failed: MCQ must have exactly 4 options');
        }
        for (const opt of q.options) {
          if (!opt || typeof opt !== 'string' || !opt.trim()) {
            throw new Error('Quiz validation failed: MCQ option must be a non-empty string');
          }
        }
      }
      if (q.type === 'tf') {
        if (!Array.isArray(q.options) || q.options.length !== 2) {
          q.options = ['True', 'False'];
        }
      }
    }

    // Auto-save Quiz
    let titleStr = 'New Quiz';
    if (documentId) {
      const docObj = await AIDocument.findById(documentId);
      if (docObj) titleStr = `Quiz: ${docObj.fileName}`;
    } else if (noteId) {
      const noteObj = await Note.findById(noteId);
      if (noteObj) titleStr = `Quiz: ${noteObj.title}`;
    } else if (topic) {
      titleStr = `Quiz: ${topic}`;
    }

    const record = await AIQuiz.create({
      userId: req.user._id,
      title: titleStr,
      noteId: noteId || null,
      documentId: documentId || null,
      topic: topic || null,
      difficulty: diff,
      questionCount: count,
      quiz: validated
    });

    if (documentId) {
      const doc = await AIDocument.findOne({ _id: documentId, userId: req.user._id });
      if (doc) {
        doc.generatedQuizzes.push({ quizId: record._id });
        await doc.save();
      }
    }

    await logInteraction(req.user._id, 'quiz-generator', prompt, validated, { topic: documentId ? 'Document Source' : (noteId ? 'Note Source' : topic), difficulty: diff });
    return res.status(200).json({ success: true, quiz: validated, record });

  } catch (error) {
    console.error('Quiz generator error:', error);
    return res.status(500).json({ success: false, message: 'CampusBuddy is temporarily unavailable. Please try again in a few moments.' });
  }
};

const generateFlashcards = async (req, res) => {
  try {
    const { topic, cardCount, noteId, documentId } = req.body;
    let cardContext = '';

    if (documentId) {
      const doc = await AIDocument.findOne({ _id: documentId, userId: req.user._id });
      if (!doc) {
        return res.status(404).json({ success: false, message: 'Document not found or unauthorized' });
      }
      cardContext = doc.text;
    } else if (noteId) {
      const note = await Note.findOne({ _id: noteId, uploadedBy: req.user._id });
      if (!note) {
        return res.status(404).json({ success: false, message: 'Note not found or unauthorized' });
      }
      cardContext = await extractTextFromNote(note);
    } else {
      cardContext = topic;
    }

    if (!cardContext || !cardContext.trim()) {
      return res.status(400).json({ success: false, message: 'Please specify the topic or select a note/document for flashcards' });
    }

    const count = Math.min(12, Math.max(3, Number(cardCount) || 5));

    const preferredProvider = req.headers['x-preferred-provider'] || req.body.preferredProvider || 'auto';
    let validated;
    let prompt = '';
    const isLarge = cardContext.length > 30000;

    if (isLarge) {
      validated = await generateFlashcardsInChunks(cardContext, count, preferredProvider);
      prompt = `Generated flashcards in chunks from large context size: ${cardContext.length} chars.`;
    } else {
      const compressed = compressNoteText(cardContext);
      prompt = compressed;

      const response = await providerRouter.generateFlashcards(compressed, count, preferredProvider);

      const validatedCards = Array.isArray(response?.flashcards) ? response.flashcards.map((c, idx) => ({
        id: c.id || `fc_${idx + 1}`,
        question: c.question || c.front || 'Flashcard Question',
        answer: c.answer || c.back || 'Flashcard Answer explanation',
        front: c.question || c.front || 'Flashcard Question',
        back: c.answer || c.back || 'Flashcard Answer explanation'
      })) : [];

      validated = { flashcards: validatedCards };
    }

    // Auto-save Flashcard Deck
    let titleStr = 'New Flashcard Deck';
    if (documentId) {
      const docObj = await AIDocument.findById(documentId);
      if (docObj) titleStr = `Deck: ${docObj.fileName}`;
    } else if (noteId) {
      const noteObj = await Note.findById(noteId);
      if (noteObj) titleStr = `Deck: ${noteObj.title}`;
    } else if (topic) {
      titleStr = `Deck: ${topic}`;
    }

    const record = await AIFlashcardDeck.create({
      userId: req.user._id,
      title: titleStr,
      noteId: noteId || null,
      documentId: documentId || null,
      topic: topic || null,
      cardCount: count,
      deck: validated
    });

    if (documentId) {
      const doc = await AIDocument.findOne({ _id: documentId, userId: req.user._id });
      if (doc) {
        doc.generatedFlashcards.push({ deckId: record._id });
        await doc.save();
      }
    }

    await logInteraction(req.user._id, 'flashcards', prompt, validated, { topic: documentId ? 'Document Source' : (noteId ? 'Note Source' : topic) });
    return res.status(200).json({ success: true, deck: validated, record });

  } catch (error) {
    console.error('Flashcard maker error:', error);
    return res.status(500).json({ success: false, message: 'CampusBuddy is temporarily unavailable. Please try again in a few moments.' });
  }
};

// @desc    Suggest skill roadmaps, certificates and resume modifications
// @route   POST /api/ai/career-advisor
// @access  Private
const getCareerAdvise = async (req, res) => {
  try {
    const { targetRole, targetCompany } = req.body;

    const sanitizedRole = sanitizeInputPrompt(targetRole || 'Full-Stack Developer');
    const sanitizedCompany = sanitizeInputPrompt(targetCompany || 'Tech Companies');

    const prompt = promptTemplates.careerAdvisor(
      sanitizedRole,
      sanitizedCompany
    );

    const fallback = JSON.stringify({
      recommendedSkills: [{ skill: 'Node.js & React development', importance: 'Critical', resources: 'Official Documentation' }],
      mernRoadmap: [{ phase: 'Foundations', duration: 'Week 1-2', actionItems: ['Implement MERN REST APIs'] }],
      atsKeywords: ['MERN', 'REST API', 'JavaScript'],
      careerPrepPlan: [{ phase: 'Phase 1', timeline: 'Month 1', focus: 'DSA', milestones: ['Solve 30 Leetcode questions'] }],
      companyInterviewPrep: {
        interviewStyle: 'Technical interview focus on DSA and stack logic.',
        commonQuestions: ['Explain state lifting in React.'],
        preparationStrategy: 'Revise MERN project lifecycle.'
      },
      resumeImprovements: ['Highlight database CRUD projects'],
      careerRecommendations: ['Software Engineer']
    });

    const preferredProvider = req.headers['x-preferred-provider'] || req.body.preferredProvider || 'auto';

    if (shouldStream(req)) {
      return await providerRouter.generateCareerRoadmap(sanitizedRole, sanitizedCompany, true, res, preferredProvider);
    }

    const response = await providerRouter.generateCareerRoadmap(sanitizedRole, sanitizedCompany, false, null, preferredProvider);

    const validated = {
      recommendedSkills: Array.isArray(response?.recommendedSkills) ? response.recommendedSkills : [],
      mernRoadmap: Array.isArray(response?.mernRoadmap) ? response.mernRoadmap : [],
      atsKeywords: Array.isArray(response?.atsKeywords) ? response.atsKeywords : [],
      careerPrepPlan: Array.isArray(response?.careerPrepPlan) ? response.careerPrepPlan : [],
      companyInterviewPrep: response?.companyInterviewPrep || { interviewStyle: 'General technical rounds.', commonQuestions: [], preparationStrategy: '' },
      resumeImprovements: Array.isArray(response?.resumeImprovements) ? response.resumeImprovements : [],
      careerRecommendations: Array.isArray(response?.careerRecommendations) ? response.careerRecommendations : []
    };

    // Auto-save Career Roadmap
    const record = await AICareerRoadmap.create({
      userId: req.user._id,
      title: `${sanitizedRole} Roadmap`,
      targetRole: sanitizedRole,
      targetCompany: sanitizedCompany,
      roadmap: validated
    });

    const promptTextForLogging = `Role: ${sanitizedRole}, Company: ${sanitizedCompany}`;
    await logInteraction(req.user._id, 'career-advisor', promptTextForLogging, validated, { targetRole: sanitizedRole });
    return res.status(200).json({ success: true, advice: validated, record });

  } catch (error) {
    console.error('Career advisor error:', error);
    return res.status(500).json({ success: false, message: 'CampusBuddy is temporarily unavailable. Please try again in a few moments.' });
  }
};

// @desc    Analyze student records and issue specific study recommendations
// @route   GET /api/ai/productivity-insights
// @access  Private
const getProductivityInsights = async (req, res) => {
  try {
    const userId = req.user._id;

    // Pull real campus metrics
    const [tasks, subjects, goals, lowAttendanceList] = await Promise.all([
      Task.find({ userId }),
      Subject.find({ userId }),
      Goal.find({ userId }),
      Subject.find({ userId, percentage: { $lt: 75 } })
    ]);

    // Compute detailed metrics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const taskRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

    // Task backlog (Overdue Tasks calculation)
    const now = new Date();
    const taskBacklogCount = tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < now).length;

    let overallAttendance = 100;
    const attendanceTrends = [];
    if (subjects.length > 0) {
      overallAttendance = Math.round(subjects.reduce((sum, s) => sum + (s.percentage || 0), 0) / subjects.length);
      subjects.forEach(s => {
        attendanceTrends.push({ subject: s.name, percentage: s.percentage || 0 });
      });
    }

    const maxStreak = goals.length > 0 ? Math.max(...goals.map(g => g.streak || 0)) : 0;
    const completedGoals = goals.filter(g => g.status === 'Completed').length;
    const goalConsistency = goals.length > 0 ? `${Math.round((completedGoals / goals.length) * 100)}%` : '100%';

    // Productivity Score calculation out of 100
    const weeklyConsistency = 85;
    const productivityScore = Math.round((taskRate * 0.4) + (overallAttendance * 0.4) + (maxStreak * 2));

    const analyticsData = {
      productivityScore: Math.min(100, productivityScore),
      weeklyConsistency,
      taskCompletionRate: taskRate,
      taskBacklogCount,
      attendanceHealth: overallAttendance,
      attendanceTrends,
      goalsStreak: maxStreak,
      goalConsistency,
      lowAttendanceCount: lowAttendanceList.length
    };

    const preferredProvider = req.headers['x-preferred-provider'] || req.body.preferredProvider || 'auto';
    const prompt = promptTemplates.productivityCoach(analyticsData);
    const messages = [{ role: 'user', content: prompt }];
    const response = await providerRouter.executeWithFailover('productivity-insights', messages, true, preferredProvider);

    const validated = {
      focusAreas: Array.isArray(response?.focusAreas) ? response.focusAreas : [],
      suggestions: Array.isArray(response?.suggestions) ? response.suggestions : [],
      timeManagementTips: Array.isArray(response?.timeManagementTips) ? response.timeManagementTips : [],
      dailyTip: typeof response?.dailyTip === 'string' ? response.dailyTip : 'Make progress on your dashboard metrics today!'
    };

    await logInteraction(req.user._id, 'productivity-insights', 'Productivity coach metrics analyzed', validated);
    return res.status(200).json({ success: true, insights: validated });

  } catch (error) {
    console.error('Productivity coach error:', error);
    return res.status(500).json({ success: false, message: 'CampusBuddy is temporarily unavailable. Please try again in a few moments.' });
  }
};

// @desc    Generate technical questions for target company interview rounds
// @route   POST /api/ai/interview-prep
// @access  Private
const getInterviewPrep = async (req, res) => {
  try {
    const { role, companyName, roundType } = req.body;
    if (!role || !companyName) {
      return res.status(400).json({ success: false, message: 'Please specify target role and company name' });
    }

    const sanitizedRole = sanitizeInputPrompt(role);
    const sanitizedCompany = sanitizeInputPrompt(companyName);
    const sanitizedRound = sanitizeInputPrompt(roundType || 'Technical Round');

    const preferredProvider = req.headers['x-preferred-provider'] || req.body.preferredProvider || 'auto';
    const response = await providerRouter.generateInterviewPrep(sanitizedRole, sanitizedCompany, sanitizedRound, preferredProvider);

    const validatedQuestions = Array.isArray(response?.questions) ? response.questions.map((q, idx) => ({
      id: q.id || idx + 1,
      questionText: q.questionText || 'Interview Question text',
      expectedAnswer: q.expectedAnswer || 'Perfect answer outline expected.',
      tips: q.tips || 'Interview response tips.'
    })) : [];

    const validated = { questions: validatedQuestions };

    const promptTextForLogging = `Role: ${sanitizedRole}, Company: ${sanitizedCompany}, Round: ${sanitizedRound}`;
    await logInteraction(req.user._id, 'interview-prep', promptTextForLogging, validated, { role: sanitizedRole, companyName: sanitizedCompany });
    return res.status(200).json({ success: true, prep: validated });

  } catch (error) {
    console.error('Interview prep generation error:', error);
    return res.status(500).json({ success: false, message: 'CampusBuddy is temporarily unavailable. Please try again in a few moments.' });
  }
};

// @desc    Conversational AI Chat Assistant with context memory support
// @route   POST /api/ai/chat
// @access  Private
const chatAssistant = async (req, res) => {
  try {
    const { message, chatHistory = [], file } = req.body;
    console.log('Incoming backend payload:', { message, chatHistory, file });
    if (!message) {
      return res.status(400).json({ success: false, message: 'Please type a message to start conversation' });
    }

    const sanitizedMessage = sanitizeInputPrompt(message);

    // Limit conversation memory to last 5 interactions to save token costs
    const memory = chatHistory.slice(-5).map(h => {
      const isUser = h.role === 'user' || h.sender === 'user';
      const text = h.content || h.text || h.reply || '';
      return `${isUser ? 'Student' : 'CampusBuddy'}: ${sanitizeInputPrompt(text)}`;
    }).join('\n');

    // Retrieve last interaction records to maintain Cohesive AI Chat Session Memory (Item 5)
    const [lastStudyPlan, lastCareerAdvice, lastProductivityInsights] = await Promise.all([
      AIInteraction.findOne({ userId: req.user._id, feature: 'study-plan' }).sort({ createdAt: -1 }),
      AIInteraction.findOne({ userId: req.user._id, feature: 'career-advisor' }).sort({ createdAt: -1 }),
      AIInteraction.findOne({ userId: req.user._id, feature: 'productivity-insights' }).sort({ createdAt: -1 })
    ]);

    let memoryContextAddendum = '';
    if (lastStudyPlan && lastStudyPlan.response) {
      memoryContextAddendum += `\n- Student's recent study plan subject: "${lastStudyPlan.meta?.subject || 'Course'}". Priority topics: ${JSON.stringify(lastStudyPlan.response.priorityTopics?.map(p => p.topic) || [])}.`;
    }
    if (lastCareerAdvice && lastCareerAdvice.response) {
      memoryContextAddendum += `\n- Student's career target: "${lastCareerAdvice.meta?.targetRole || 'SDE'}" at "${lastCareerAdvice.meta?.targetCompany || 'Tech company'}". Suggested skills: ${JSON.stringify(lastCareerAdvice.response.recommendedSkills?.map(s => s.skill).slice(0, 3) || [])}.`;
    }
    if (lastProductivityInsights && lastProductivityInsights.response) {
      memoryContextAddendum += `\n- Student's current productivity score: ${lastProductivityInsights.response.productivityScore || 70}/100 with streak: ${lastProductivityInsights.response.goalsStreak || 0} days. Focus areas: ${JSON.stringify(lastProductivityInsights.response.focusAreas?.map(f => f.area) || [])}.`;
    }

    let promptText = `
You are CampusBuddy, the central academic and productivity AI companion for MyCampusOS, a secure dashboard for college students.
Your name is CampusBuddy. You must always introduce yourself and identify yourself as: "Hi, I'm CampusBuddy, your AI study companion."
Whenever the student asks "What's your name?" or "Who are you?", you must always respond: "Hi, I'm CampusBuddy, your AI study companion."
Do not say "I don't have a personal name" or "I don't have a name." Under no circumstances should you deny having a name.
Maintain a friendly, structured, and helpful academic coach persona.


Recent Student context (use this memory to guide answers if they ask about their study goals, career milestones, or habits):
${memoryContextAddendum || 'No prior plans recorded yet.'}

Conversation context memory:
${memory}
`;

    if (file && file.text) {
      promptText += `\n\n[Attached Document Content: ${file.name}]:\n${file.text}\n`;
    }

    promptText += `\n\nStudent's new query:\n"${sanitizedMessage}"`;

    if (file && file.type && file.type.startsWith('image/')) {
      promptText += `\n\n[An image is attached to this request. Analyze it and extract text or provide study notes based on it as requested by the student.]`;
    }

    promptText += `\n\nRespond in the following structured JSON format:\n{\n  "reply": "Your conversational response content. Use Markdown lists, bold text, or code block syntax if appropriate. Do not repeat instructions."\n}\n${promptTemplates.SECURITY_SUFFIX}`;

    let promptParts = [];
    if (file && file.type && file.type.startsWith('image/')) {
      const base64Data = await getFileBase64(file.url, file.path);
      if (!base64Data) {
        return res.status(400).json({
          success: false,
          message: 'Image processing failed: Unable to extract base64 data from the uploaded image.'
        });
      }
      promptParts.push({
        inlineData: {
          mimeType: file.type,
          data: base64Data
        }
      });
    }
    promptParts.push({ text: promptText });

    const preferredProvider = req.headers['x-preferred-provider'] || req.body.preferredProvider || 'auto';

    if (shouldStream(req)) {
      return await providerRouter.generateChat(promptParts.length > 1 ? promptParts : promptText, chatHistory, true, res, null, preferredProvider);
    }

    const response = await providerRouter.generateChat(promptParts.length > 1 ? promptParts : promptText, chatHistory, false, null, null, preferredProvider);
    console.log('Provider Router Chat response:', response);

    const validated = {
      reply: typeof response?.reply === 'string' ? response.reply : 'I parsed your query but failed to compile a reply structure.'
    };

    await logInteraction(req.user._id, 'chat', promptText, validated);
    return res.status(200).json({ success: true, chat: validated });

  } catch (error) {
    console.error('AI Chat Assistant error:', error);
    return res.status(500).json({ success: false, message: 'CampusBuddy is temporarily unavailable. Please try again in a few moments.' });
  }
};

// @desc    Get AI calls logs usage overview statistics for dashboard
// @route   GET /api/ai/usage
// @access  Private
const getAiUsageStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // AI Calls count grouped by feature
    const aiLogs = await AIInteraction.find({ userId });
    const totalCalls = aiLogs.length;

    const featureCounts = {};
    aiLogs.forEach(l => {
      featureCounts[l.feature] = (featureCounts[l.feature] || 0) + 1;
    });

    const featureUsage = Object.keys(featureCounts).map(feature => ({
      feature,
      count: featureCounts[feature]
    }));

    // Find most used AI feature
    let mostUsedFeature = 'None';
    let maxCount = 0;
    featureUsage.forEach(item => {
      if (item.count > maxCount) {
        maxCount = item.count;
        mostUsedFeature = item.feature;
      }
    });

    // Daily AI usage trends (count of calls for the last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const dailyTrendsAggregation = await AIInteraction.aggregate([
      {
        $match: {
          userId,
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const dailyTrends = dailyTrendsAggregation.map(item => ({
      date: item._id,
      calls: item.count
    }));

    // Quiz score attempts details
    const quizAttempts = await QuizAttempt.find({ userId }).sort({ createdAt: -1 }).limit(10);
    
    // Flashcard mastery sets
    const flashcardMastery = await FlashcardMastery.find({ userId }).sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      usage: {
        totalCalls,
        featureUsage,
        mostUsedFeature,
        dailyTrends,
        quizAttempts,
        flashcardMastery
      }
    });

  } catch (error) {
    console.error('Get AI usage stats error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to compile AI usage stats' });
  }
};

// @desc    Log a new completed quiz attempt
// @route   POST /api/ai/quiz/attempt
// @access  Private
const logQuizAttempt = async (req, res) => {
  try {
    const { topic, score, totalQuestions, difficulty } = req.body;
    if (!topic || score === undefined || !totalQuestions || !difficulty) {
      return res.status(400).json({ success: false, message: 'Missing quiz details parameters' });
    }

    const attempt = await QuizAttempt.create({
      userId: req.user._id,
      topic: sanitizeInputPrompt(topic),
      score: Number(score),
      totalQuestions: Number(totalQuestions),
      difficulty
    });

    return res.status(201).json({ success: true, attempt });

  } catch (error) {
    console.error('Log quiz attempt error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to log quiz attempt' });
  }
};

// @desc    Save card mastery markings and compute Spaced Repetition (Leitner boxes) intervals
// @route   POST /api/ai/flashcards/mastery
// @access  Private
const updateFlashcardMastery = async (req, res) => {
  try {
    const { topic, masteredCount, totalCards, cardId, wasCorrect } = req.body;
    if (!topic || masteredCount === undefined || !totalCards) {
      return res.status(400).json({ success: false, message: 'Missing deck parameters' });
    }

    const sanitizedTopic = sanitizeInputPrompt(topic);

    let mastery = await FlashcardMastery.findOne({ userId: req.user._id, topic: sanitizedTopic });
    
    // Compute study streak logic
    let currentStreak = 1;
    const now = new Date();
    const todayStr = now.toDateString();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterday.toDateString();

    if (mastery) {
      const lastUpdatedStr = new Date(mastery.updatedAt).toDateString();
      if (lastUpdatedStr === yesterdayStr) {
        currentStreak = (mastery.studyStreak || 0) + 1;
      } else if (lastUpdatedStr === todayStr) {
        currentStreak = mastery.studyStreak || 1;
      } else {
        currentStreak = 1; // reset streak if missed a day
      }
    }

    // Spaced repetition Leitner box updates per card
    let repetitions = mastery ? (mastery.cardRepetition || []) : [];
    let knownCards = mastery ? (mastery.knownCards || []) : [];

    if (cardId) {
      let cardRep = repetitions.find(r => r.cardId === cardId);
      let oldBox = cardRep ? cardRep.box : 1;
      let newBox = 1;

      if (wasCorrect) {
        newBox = Math.min(5, oldBox + 1);
        if (!knownCards.includes(cardId)) {
          knownCards.push(cardId);
        }
      } else {
        newBox = 1;
        knownCards = knownCards.filter(id => id !== cardId);
      }

      // Leitner box intervals: 1 = 1 day, 2 = 3 days, 3 = 7 days, 4 = 14 days, 5 = 30 days
      const daysMap = { 1: 1, 2: 3, 3: 7, 4: 14, 5: 30 };
      const daysToAdd = daysMap[newBox] || 1;
      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + daysToAdd);

      if (cardRep) {
        cardRep.box = newBox;
        cardRep.nextReviewDate = nextReviewDate;
      } else {
        repetitions.push({
          cardId,
          box: newBox,
          nextReviewDate
        });
      }
    }

    if (mastery) {
      mastery.masteredCount = Number(masteredCount);
      mastery.totalCards = Number(totalCards);
      mastery.studyStreak = currentStreak;
      mastery.knownCards = knownCards;
      mastery.cardRepetition = repetitions;
      await mastery.save();
    } else {
      mastery = await FlashcardMastery.create({
        userId: req.user._id,
        topic: sanitizedTopic,
        masteredCount: Number(masteredCount),
        totalCards: Number(totalCards),
        knownCards: knownCards,
        studyStreak: currentStreak,
        cardRepetition: repetitions
      });
    }

    return res.status(200).json({ success: true, mastery });

  } catch (error) {
    console.error('Update flashcards mastery error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to update mastery statistics' });
  }
};

// @desc    List all chat conversations of the user
// @route   GET /api/ai/conversations
// @access  Private
const listConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    // Sort by isPinned descending, then updatedAt descending
    const conversations = await AIChatConversation.find({ userId })
      .select('_id title isPinned isFavorite updatedAt createdAt')
      .sort({ isPinned: -1, updatedAt: -1 });

    return res.status(200).json({ success: true, conversations });
  } catch (error) {
    console.error('List conversations error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to retrieve chat history' });
  }
};

// @desc    Get details and messages of a specific conversation
// @route   GET /api/ai/conversations/:id
// @access  Private
const getConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const conversation = await AIChatConversation.findOne({ _id: id, userId });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    return res.status(200).json({ success: true, conversation });
  } catch (error) {
    console.error('Get conversation error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to retrieve conversation details' });
  }
};

// @desc    Create a new empty conversation session
// @route   POST /api/ai/conversations
// @access  Private
const createConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const conversation = await AIChatConversation.create({
      userId,
      title: 'New Chat',
      messages: []
    });

    return res.status(201).json({ success: true, conversation });
  } catch (error) {
    console.error('Create conversation error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to start new chat' });
  }
};

// @desc    Rename conversation title
// @route   PUT /api/ai/conversations/:id
// @access  Private
const renameConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const userId = req.user._id;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a valid title' });
    }

    const conversation = await AIChatConversation.findOneAndUpdate(
      { _id: id, userId },
      { title: title.trim() },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    return res.status(200).json({ success: true, conversation });
  } catch (error) {
    console.error('Rename conversation error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to rename chat' });
  }
};

// @desc    Delete a conversation session
// @route   DELETE /api/ai/conversations/:id
// @access  Private
const deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const conversation = await AIChatConversation.findOneAndDelete({ _id: id, userId });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    return res.status(200).json({ success: true, message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to delete chat' });
  }
};

// @desc    Toggle pinned state of a conversation
// @route   PATCH /api/ai/conversations/:id/pin
// @access  Private
const togglePinConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const conversation = await AIChatConversation.findOne({ _id: id, userId });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    conversation.isPinned = !conversation.isPinned;
    await conversation.save();

    return res.status(200).json({ success: true, conversation });
  } catch (error) {
    console.error('Toggle pin error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to pin/unpin chat' });
  }
};

// @desc    Toggle favorite state of a conversation
// @route   PATCH /api/ai/conversations/:id/favorite
// @access  Private
const toggleFavoriteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const conversation = await AIChatConversation.findOne({ _id: id, userId });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    conversation.isFavorite = !conversation.isFavorite;
    await conversation.save();

    return res.status(200).json({ success: true, conversation });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to favorite/unfavorite chat' });
  }
};

// @desc    Duplicate an existing conversation
// @route   POST /api/ai/conversations/:id/duplicate
// @access  Private
const duplicateConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const source = await AIChatConversation.findOne({ _id: id, userId });
    if (!source) {
      return res.status(404).json({ success: false, message: 'Source conversation not found' });
    }

    const copy = await AIChatConversation.create({
      userId,
      title: `${source.title} (Copy)`,
      messages: source.messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp
      }))
    });

    return res.status(201).json({ success: true, conversation: copy });
  } catch (error) {
    console.error('Duplicate conversation error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to duplicate chat' });
  }
};

// @desc    Clear all message exchanges inside a conversation
// @route   POST /api/ai/conversations/:id/clear
// @access  Private
const clearConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const conversation = await AIChatConversation.findOne({ _id: id, userId });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    conversation.messages = [];
    await conversation.save();

    return res.status(200).json({ success: true, conversation });
  } catch (error) {
    console.error('Clear conversation error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to clear conversation' });
  }
};

// @desc    Conversational AI Chat Assistant linked to a persistent conversation document (SSE Streaming)
// @route   POST /api/ai/conversations/:id/message
// @access  Private
const getFileBase64 = async (fileUrl, filePath) => {
  try {
    if (!fileUrl && !filePath) return null;
    
    const targetUrl = fileUrl || filePath;
    if (typeof targetUrl === 'string' && targetUrl.startsWith('http')) {
      const axios = require('axios');
      const response = await axios.get(targetUrl, { responseType: 'arraybuffer' });
      return Buffer.from(response.data).toString('base64');
    }
    
    const fs = require('fs');
    const path = require('path');
    const candidates = [];
    if (filePath) {
      candidates.push(filePath);
      candidates.push(path.basename(filePath));
    }
    if (fileUrl) {
      candidates.push(fileUrl);
      candidates.push(path.basename(fileUrl));
    }
    
    for (const cand of candidates) {
      if (!cand || typeof cand !== 'string') continue;
      
      if (path.isAbsolute(cand) && fs.existsSync(cand)) {
        return fs.readFileSync(cand).toString('base64');
      }
      
      const localPath = path.join(__dirname, '..', 'uploads', cand);
      if (fs.existsSync(localPath)) {
        return fs.readFileSync(localPath).toString('base64');
      }
    }
    
    console.error(`Could not locate local file for candidates: ${candidates.join(', ')}`);
  } catch (err) {
    console.error('Error fetching file buffer for base64:', err.message);
  }
  return null;
};


const postConversationMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, file } = req.body;
    const userId = req.user._id;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Please type a message to start conversation' });
    }

    const conversation = await AIChatConversation.findOne({ _id: id, userId });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const sanitizedMessage = sanitizeInputPrompt(message);

    // Save the user's message to the conversation immediately with timestamp and optional file attachment notation
    let userMsgContent = sanitizedMessage;
    if (file) {
      userMsgContent = `[Attached File: ${file.name}] ${sanitizedMessage}`;
    }

    conversation.messages.push({
      role: 'user',
      content: userMsgContent,
      timestamp: new Date()
    });
    await conversation.save();

    // Construct history memory context for prompt matching the ChatGPT-style context requirements
    // Limit to the last 10 messages to optimize prompt size and token fees
    const contextHistory = conversation.messages.slice(-10).map(m => {
      return `${m.role === 'user' ? 'Student' : 'CampusBuddy'}: ${sanitizeInputPrompt(m.content)}`;
    }).join('\n');

    // Retrieve last interaction records to maintain Cohesive AI Chat Session Memory (study plan, career advisor, productivity logs)
    const [lastStudyPlan, lastCareerAdvice, lastProductivityInsights] = await Promise.all([
      AIInteraction.findOne({ userId, feature: 'study-plan' }).sort({ createdAt: -1 }),
      AIInteraction.findOne({ userId, feature: 'career-advisor' }).sort({ createdAt: -1 }),
      AIInteraction.findOne({ userId, feature: 'productivity-insights' }).sort({ createdAt: -1 })
    ]);

    let memoryContextAddendum = '';
    if (lastStudyPlan && lastStudyPlan.response) {
      memoryContextAddendum += `\n- Student's recent study plan subject: "${lastStudyPlan.meta?.subject || 'Course'}". Priority topics: ${JSON.stringify(lastStudyPlan.response.priorityTopics?.map(p => p.topic) || [])}.`;
    }
    if (lastCareerAdvice && lastCareerAdvice.response) {
      memoryContextAddendum += `\n- Student's career target: "${lastCareerAdvice.meta?.targetRole || 'SDE'}" at "${lastCareerAdvice.meta?.targetCompany || 'Tech company'}". Suggested skills: ${JSON.stringify(lastCareerAdvice.response.recommendedSkills?.map(s => s.skill).slice(0, 3) || [])}.`;
    }
    if (lastProductivityInsights && lastProductivityInsights.response) {
      memoryContextAddendum += `\n- Student's current productivity score: ${lastProductivityInsights.response.productivityScore || 70}/100 with streak: ${lastProductivityInsights.response.goalsStreak || 0} days. Focus areas: ${JSON.stringify(lastProductivityInsights.response.focusAreas?.map(f => f.area) || [])}.`;
    }

    let promptText = `
You are CampusBuddy, the central academic and productivity AI companion for MyCampusOS, a secure dashboard for college students.
Your name is CampusBuddy. You must always introduce yourself and identify yourself as: "Hi, I'm CampusBuddy, your AI study companion."
Whenever the student asks "What's your name?" or "Who are you?", you must always respond: "Hi, I'm CampusBuddy, your AI study companion."
Do not say "I don't have a personal name" or "I don't have a name." Under no circumstances should you deny having a name.
Maintain a friendly, structured, and helpful academic coach persona.


Recent Student context (use this memory to guide answers if they ask about their study goals, career milestones, or habits):
${memoryContextAddendum || 'No prior plans recorded yet.'}

Conversation context memory:
${contextHistory}
`;

    if (file && file.text) {
      promptText += `\n\n[Attached Document Content: ${file.name}]:\n${file.text}\n`;
    }

    promptText += `\n\nStudent's new query:\n"${sanitizedMessage}"`;

    if (file && file.type && file.type.startsWith('image/')) {
      promptText += `\n\n[An image is attached to this request. Analyze it and extract text or provide study notes based on it as requested by the student.]`;
    }

    promptText += `\n\nRespond in the following structured JSON format:\n{\n  "reply": "Your conversational response content. Use Markdown lists, bold text, or code block syntax if appropriate. Do not repeat instructions."\n}\n${promptTemplates.SECURITY_SUFFIX}`;

    let promptParts = [];
    if (file && file.type && file.type.startsWith('image/')) {
      const base64Data = await getFileBase64(file.url, file.path);
      if (!base64Data) {
        return res.status(400).json({
          success: false,
          message: 'Image processing failed: Unable to extract base64 data from the uploaded image.'
        });
      }
      promptParts.push({
        inlineData: {
          mimeType: file.type,
          data: base64Data
        }
      });
    }
    promptParts.push({ text: promptText });

    const preferredProvider = req.headers['x-preferred-provider'] || req.body.preferredProvider || 'auto';

    console.log('Incoming backend payload (persistent):', { message });

    return await providerRouter.generateChat(
      promptParts.length > 1 ? promptParts : promptText,
      [], // contextHistory is already embedded inside promptText
      true, // stream
      res,
      async (accumulatedText) => {
        try {
          const cleanReply = extractCleanReply(accumulatedText);
          
          // Load latest copy to prevent writing conflicts
          const latestConv = await AIChatConversation.findById(id);
          if (latestConv) {
            latestConv.messages.push({
              role: 'assistant',
              content: cleanReply,
              timestamp: new Date()
            });

            // Auto-generate title if it's currently the default 'New Chat'
            if (latestConv.title === 'New Chat') {
              const firstWords = message.trim().split(/\s+/).slice(0, 5).join(' ');
              latestConv.title = firstWords + (message.trim().split(/\s+/).length > 5 ? '...' : '');
            }

            await latestConv.save();
            console.log(`Auto-saved response to conversation ${id} and set title to: ${latestConv.title}`);
          }
        } catch (saveErr) {
          console.error('Error auto-saving AI reply to DB conversation:', saveErr);
        }
      },
      preferredProvider
    );

  } catch (error) {
    console.error('postConversationMessage error:', error);
    return res.status(500).json({ success: false, message: 'CampusBuddy is temporarily unavailable. Please try again in a few moments.' });
  }
};

// --- Study Plans CRUD ---
const listStudyPlans = async (req, res) => {
  try {
    const plans = await AIStudyPlan.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, plans });
  } catch (error) {
    console.error('List study plans error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to retrieve study plans' });
  }
};

const getStudyPlan = async (req, res) => {
  try {
    const plan = await AIStudyPlan.findOne({ _id: req.params.id, userId: req.user._id });
    if (!plan) return res.status(404).json({ success: false, message: 'Study plan not found' });
    return res.status(200).json({ success: true, plan });
  } catch (error) {
    console.error('Get study plan error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to retrieve study plan' });
  }
};

const renameStudyPlan = async (req, res) => {
  try {
    const plan = await AIStudyPlan.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { title: req.body.title.trim() },
      { new: true }
    );
    if (!plan) return res.status(404).json({ success: false, message: 'Study plan not found' });
    return res.status(200).json({ success: true, plan });
  } catch (error) {
    console.error('Rename study plan error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to rename study plan' });
  }
};

const duplicateStudyPlan = async (req, res) => {
  try {
    const source = await AIStudyPlan.findOne({ _id: req.params.id, userId: req.user._id });
    if (!source) return res.status(404).json({ success: false, message: 'Study plan not found' });
    const duplicate = await AIStudyPlan.create({
      userId: req.user._id,
      title: `${source.title} (Copy)`,
      subject: source.subject,
      examDate: source.examDate,
      topics: source.topics,
      dailyHours: source.dailyHours,
      plan: source.plan
    });
    return res.status(201).json({ success: true, plan: duplicate });
  } catch (error) {
    console.error('Duplicate study plan error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to duplicate study plan' });
  }
};

const deleteStudyPlan = async (req, res) => {
  try {
    const plan = await AIStudyPlan.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!plan) return res.status(404).json({ success: false, message: 'Study plan not found' });
    return res.status(200).json({ success: true, message: 'Study plan deleted successfully' });
  } catch (error) {
    console.error('Delete study plan error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to delete study plan' });
  }
};

// --- Summaries CRUD ---
const listSummaries = async (req, res) => {
  try {
    const summaries = await AISummary.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, summaries });
  } catch (error) {
    console.error('List summaries error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to retrieve summaries' });
  }
};

const getSummary = async (req, res) => {
  try {
    const summary = await AISummary.findOne({ _id: req.params.id, userId: req.user._id });
    if (!summary) return res.status(404).json({ success: false, message: 'Summary not found' });
    return res.status(200).json({ success: true, summary });
  } catch (error) {
    console.error('Get summary error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to retrieve summary' });
  }
};

const renameSummary = async (req, res) => {
  try {
    const summary = await AISummary.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { title: req.body.title.trim() },
      { new: true }
    );
    if (!summary) return res.status(404).json({ success: false, message: 'Summary not found' });
    return res.status(200).json({ success: true, summary });
  } catch (error) {
    console.error('Rename summary error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to rename summary' });
  }
};

const deleteSummary = async (req, res) => {
  try {
    const summary = await AISummary.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!summary) return res.status(404).json({ success: false, message: 'Summary not found' });
    return res.status(200).json({ success: true, message: 'Summary deleted successfully' });
  } catch (error) {
    console.error('Delete summary error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to delete summary' });
  }
};

// --- Quizzes CRUD ---
const listQuizzes = async (req, res) => {
  try {
    const quizzes = await AIQuiz.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, quizzes });
  } catch (error) {
    console.error('List quizzes error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to retrieve quizzes' });
  }
};

const getQuiz = async (req, res) => {
  try {
    const quiz = await AIQuiz.findOne({ _id: req.params.id, userId: req.user._id });
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    return res.status(200).json({ success: true, quiz });
  } catch (error) {
    console.error('Get quiz error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to retrieve quiz' });
  }
};

const renameQuiz = async (req, res) => {
  try {
    const quiz = await AIQuiz.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { title: req.body.title.trim() },
      { new: true }
    );
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    return res.status(200).json({ success: true, quiz });
  } catch (error) {
    console.error('Rename quiz error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to rename quiz' });
  }
};

const submitQuizScore = async (req, res) => {
  try {
    const { score, totalQuestions, answers } = req.body;
    const quiz = await AIQuiz.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { score, totalQuestions, answers, submitted: true },
      { new: true }
    );
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    return res.status(200).json({ success: true, quiz });
  } catch (error) {
    console.error('Submit quiz score error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to submit quiz score' });
  }
};

const deleteQuiz = async (req, res) => {
  try {
    const quiz = await AIQuiz.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    return res.status(200).json({ success: true, message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Delete quiz error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to delete quiz' });
  }
};

// --- Flashcard Decks CRUD ---
const listFlashcardDecks = async (req, res) => {
  try {
    const decks = await AIFlashcardDeck.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, decks });
  } catch (error) {
    console.error('List flashcard decks error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to retrieve flashcard decks' });
  }
};

const getFlashcardDeck = async (req, res) => {
  try {
    const deck = await AIFlashcardDeck.findOne({ _id: req.params.id, userId: req.user._id });
    if (!deck) return res.status(404).json({ success: false, message: 'Flashcard deck not found' });
    return res.status(200).json({ success: true, deck });
  } catch (error) {
    console.error('Get flashcard deck error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to retrieve flashcard deck' });
  }
};

const renameFlashcardDeck = async (req, res) => {
  try {
    const deck = await AIFlashcardDeck.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { title: req.body.title.trim() },
      { new: true }
    );
    if (!deck) return res.status(404).json({ success: false, message: 'Flashcard deck not found' });
    return res.status(200).json({ success: true, deck });
  } catch (error) {
    console.error('Rename flashcard deck error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to rename flashcard deck' });
  }
};

const updateFlashcardDeckMastery = async (req, res) => {
  try {
    const { masteryProgress, knownCards } = req.body;
    const deck = await AIFlashcardDeck.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { masteryProgress, knownCards },
      { new: true }
    );
    if (!deck) return res.status(404).json({ success: false, message: 'Flashcard deck not found' });
    return res.status(200).json({ success: true, deck });
  } catch (error) {
    console.error('Update deck mastery error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to update deck mastery' });
  }
};

const deleteFlashcardDeck = async (req, res) => {
  try {
    const deck = await AIFlashcardDeck.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!deck) return res.status(404).json({ success: false, message: 'Flashcard deck not found' });
    return res.status(200).json({ success: true, message: 'Flashcard deck deleted successfully' });
  } catch (error) {
    console.error('Delete flashcard deck error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to delete flashcard deck' });
  }
};

// --- Career Roadmaps CRUD ---
const listCareerRoadmaps = async (req, res) => {
  try {
    const roadmaps = await AICareerRoadmap.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, roadmaps });
  } catch (error) {
    console.error('List career roadmaps error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to retrieve roadmaps' });
  }
};

const getCareerRoadmap = async (req, res) => {
  try {
    const roadmap = await AICareerRoadmap.findOne({ _id: req.params.id, userId: req.user._id });
    if (!roadmap) return res.status(404).json({ success: false, message: 'Career roadmap not found' });
    return res.status(200).json({ success: true, roadmap });
  } catch (error) {
    console.error('Get career roadmap error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to retrieve roadmap' });
  }
};

const renameCareerRoadmap = async (req, res) => {
  try {
    const roadmap = await AICareerRoadmap.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { title: req.body.title.trim() },
      { new: true }
    );
    if (!roadmap) return res.status(404).json({ success: false, message: 'Career roadmap not found' });
    return res.status(200).json({ success: true, roadmap });
  } catch (error) {
    console.error('Rename career roadmap error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to rename roadmap' });
  }
};

const deleteCareerRoadmap = async (req, res) => {
  try {
    const roadmap = await AICareerRoadmap.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!roadmap) return res.status(404).json({ success: false, message: 'Career roadmap not found' });
    return res.status(200).json({ success: true, message: 'Career roadmap deleted successfully' });
  } catch (error) {
    console.error('Delete career roadmap error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to delete roadmap' });
  }
};

// --- File Upload ---
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { filename, path: localFilePath, mimetype, size, originalname } = req.file;

    // Image Uploads are strictly disabled in CampusBuddy
    if (mimetype && mimetype.startsWith('image/')) {
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
      return res.status(400).json({
        success: false,
        message: 'CampusBuddy currently supports study documents only. Image uploads are disabled.'
      });
    }

    let extractedText = '';
    try {
      const { extractTextFromFile } = require('../utils/fileExtractor');
      extractedText = await extractTextFromFile(localFilePath, mimetype);
    } catch (err) {
      console.error('Text extraction failed during upload:', err.message);
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
      return res.status(400).json({
        success: false,
        message: `Failed to extract text from file: ${err.message || 'unsupported file encoding'}`
      });
    }

    let fileUrl = `/uploads/${filename}`;
    let publicId = filename;

    // Check Cloudinary config
    if (
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ) {
      try {
        const cloudinary = require('cloudinary').v2;
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        const uploadResult = await cloudinary.uploader.upload(localFilePath, {
          resource_type: 'auto',
          folder: 'campusbuddy',
        });

        fileUrl = uploadResult.secure_url;
        publicId = uploadResult.public_id;

        if (fs.existsSync(localFilePath)) {
          fs.unlinkSync(localFilePath);
        }
      } catch (cloudErr) {
        console.warn('Cloudinary upload failed, falling back to local file:', cloudErr.message);
      }
    }

    // Save record to AIDocument collection
    const document = await AIDocument.create({
      userId: req.user._id,
      fileName: originalname,
      fileType: mimetype,
      fileUrl: fileUrl,
      publicId: publicId,
      text: extractedText,
      fileSize: size
    });

    return res.status(200).json({
      success: true,
      file: {
        _id: document._id,
        name: document.fileName,
        url: document.fileUrl,
        type: document.fileType,
        size: document.fileSize,
        path: document.publicId,
        text: document.text,
        createdAt: document.createdAt
      },
      document
    });
  } catch (error) {
    console.error('File upload controller error:', error);
    return res.status(500).json({ success: false, message: 'Server error during file upload' });
  }
};

const importNote = async (req, res) => {
  try {
    const { noteId } = req.body;
    if (!noteId) {
      return res.status(400).json({ success: false, message: 'Please provide noteId' });
    }

    const note = await Note.findOne({ _id: noteId, uploadedBy: req.user._id });
    if (!note) {
      return res.status(404).json({ success: false, message: 'Uploaded note not found or unauthorized' });
    }

    if (note.fileType && note.fileType.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        message: 'CampusBuddy currently supports study documents only. Image uploads are disabled.'
      });
    }

    let document = await AIDocument.findOne({
      userId: req.user._id,
      $or: [
        { fileUrl: note.fileUrl },
        { publicId: note.publicId }
      ]
    });

    if (!document) {
      const extractedText = await extractTextFromNote(note);
      document = await AIDocument.create({
        userId: req.user._id,
        fileName: note.title,
        fileType: note.fileType,
        fileUrl: note.fileUrl,
        publicId: note.publicId,
        text: extractedText,
        fileSize: note.fileSize || 0
      });
    }

    return res.status(200).json({
      success: true,
      file: {
        _id: document._id,
        name: document.fileName,
        url: document.fileUrl,
        type: document.fileType,
        size: document.fileSize,
        path: document.publicId,
        text: document.text,
        createdAt: document.createdAt
      },
      document
    });
  } catch (error) {
    console.error('Import note controller error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to import note' });
  }
};

const listDocuments = async (req, res) => {
  try {
    const documents = await AIDocument.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select('-text');
    return res.status(200).json({ success: true, documents });
  } catch (error) {
    console.error('List documents error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to retrieve documents list' });
  }
};

const getDocument = async (req, res) => {
  try {
    const document = await AIDocument.findOne({ _id: req.params.id, userId: req.user._id })
      .populate({
        path: 'generatedSummaries.summaryId',
        model: 'AISummary'
      })
      .populate({
        path: 'generatedQuizzes.quizId',
        model: 'AIQuiz'
      })
      .populate({
        path: 'generatedFlashcards.deckId',
        model: 'AIFlashcardDeck'
      });

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    return res.status(200).json({ success: true, document });
  } catch (error) {
    console.error('Get document details error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to retrieve document details' });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const document = await AIDocument.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (document.fileUrl && !document.fileUrl.startsWith('http')) {
      const localFilePath = path.join(__dirname, '..', 'uploads', document.publicId || path.basename(document.fileUrl));
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    } else if (document.fileUrl && document.publicId) {
      try {
        const cloudinary = require('cloudinary').v2;
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        });
        await cloudinary.uploader.destroy(document.publicId);
      } catch (cloudErr) {
        console.warn('Failed to delete asset from Cloudinary upon document removal:', cloudErr.message);
      }
    }

    return res.status(200).json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to delete document' });
  }
};

const deleteLinkedOutput = async (req, res) => {
  try {
    const { docId, type, outputId } = req.params;
    const userId = req.user._id;

    const document = await AIDocument.findOne({ _id: docId, userId });
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (type === 'summary') {
      document.generatedSummaries = document.generatedSummaries.filter(
        item => item.summaryId && item.summaryId.toString() !== outputId
      );
      await AISummary.findOneAndDelete({ _id: outputId, userId });
    } else if (type === 'quiz') {
      document.generatedQuizzes = document.generatedQuizzes.filter(
        item => item.quizId && item.quizId.toString() !== outputId
      );
      await AIQuiz.findOneAndDelete({ _id: outputId, userId });
    } else if (type === 'flashcard') {
      document.generatedFlashcards = document.generatedFlashcards.filter(
        item => item.deckId && item.deckId.toString() !== outputId
      );
      await AIFlashcardDeck.findOneAndDelete({ _id: outputId, userId });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid output type' });
    }

    await document.save();
    return res.status(200).json({ success: true, message: 'Linked output deleted successfully', document });
  } catch (error) {
    console.error('Delete linked output error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to delete output' });
  }
};

const getAiHealth = async (req, res) => {
  try {
    const health = providerRouter.providerHealth;
    let activeProvider = "Offline";
    if (health.groq.healthy) {
      activeProvider = "Groq";
    } else if (health.openrouter.healthy) {
      activeProvider = "OpenRouter";
    }
    
    return res.status(200).json({
      success: true,
      activeProvider,
      providers: {
        groq: {
          healthy: health.groq.healthy,
          lastSuccess: health.groq.lastSuccess,
          averageLatency: health.groq.averageLatency || 0
        },
        openrouter: {
          healthy: health.openrouter.healthy,
          lastSuccess: health.openrouter.lastSuccess,
          averageLatency: health.openrouter.averageLatency || 0
        }
      }
    });
  } catch (error) {
    console.error('AI Health endpoint error:', error);
    return res.status(500).json({ success: false, message: 'CampusBuddy is temporarily unavailable. Please try again in a few moments.' });
  }
};

const getProviderStats = async (req, res) => {
  try {
    const logs = await AIProviderLog.find({});
    const cacheCount = await AICache.countDocuments({});
    
    const totalRequests = logs.length;
    const successfulRequests = logs.filter(l => l.success).length;
    const successRate = totalRequests > 0 ? parseFloat(((successfulRequests / totalRequests) * 100).toFixed(1)) : 100.0;
    
    let groqUsage = 0;
    let openrouterUsage = 0;
    let totalLatency = 0;
    let successfulLatencyCount = 0;
    
    const counts = { groq: 0, openrouter: 0 };
    const modelCounts = {};
    const featureCounts = {};
    
    logs.forEach(l => {
      const provider = l.provider.toLowerCase();
      if (provider === 'groq') groqUsage++;
      if (provider === 'openrouter') openrouterUsage++;
      
      counts[provider] = (counts[provider] || 0) + 1;
      modelCounts[l.model] = (modelCounts[l.model] || 0) + 1;
      featureCounts[l.feature] = (featureCounts[l.feature] || 0) + 1;
      
      if (l.success) {
        totalLatency += l.latencyMs;
        successfulLatencyCount++;
      }
    });
    
    const averageLatency = successfulLatencyCount > 0 ? Math.round(totalLatency / successfulLatencyCount) : 0;
    
    let mostUsedProvider = 'None';
    let maxProv = 0;
    Object.keys(counts).forEach(p => {
      if (counts[p] > maxProv) {
        maxProv = counts[p];
        mostUsedProvider = p.charAt(0).toUpperCase() + p.slice(1);
      }
    });
    
    let mostUsedModel = 'None';
    let maxModel = 0;
    Object.keys(modelCounts).forEach(m => {
      if (modelCounts[m] > maxModel) {
        maxModel = modelCounts[m];
        mostUsedModel = m;
      }
    });

    const totalWithCache = totalRequests + cacheCount;
    const cacheHitRate = totalWithCache > 0 ? parseFloat(((cacheCount / totalWithCache) * 100).toFixed(1)) : 0.0;

    const featureUsage = Object.keys(featureCounts).map(feature => ({
      feature,
      count: featureCounts[feature]
    }));

    return res.status(200).json({
      success: true,
      stats: {
        totalRequests: totalWithCache,
        groqUsage,
        openrouterUsage,
        averageLatency,
        successRate,
        cacheHitRate,
        mostUsedProvider,
        mostUsedModel,
        featureUsage
      }
    });
  } catch (error) {
    console.error('AI stats endpoint error:', error);
    return res.status(500).json({ success: false, message: 'CampusBuddy is temporarily unavailable. Please try again in a few moments.' });
  }
};

module.exports = {
  getAiHealth,
  getProviderStats,
  generateStudyPlan,
  summarizeNotes,
  generateQuiz,
  generateFlashcards,
  getCareerAdvise,
  getProductivityInsights,
  getInterviewPrep,
  chatAssistant,
  getAiUsageStats,
  logQuizAttempt,
  updateFlashcardMastery,
  listConversations,
  getConversation,
  createConversation,
  renameConversation,
  deleteConversation,
  togglePinConversation,
  toggleFavoriteConversation,
  duplicateConversation,
  clearConversation,
  postConversationMessage,
  
  // New Study Plan CRUD
  listStudyPlans,
  getStudyPlan,
  renameStudyPlan,
  duplicateStudyPlan,
  deleteStudyPlan,

  // New Summary CRUD
  listSummaries,
  getSummary,
  renameSummary,
  deleteSummary,

  // New Quiz CRUD
  listQuizzes,
  getQuiz,
  renameQuiz,
  submitQuizScore,
  deleteQuiz,

  // New Flashcard Deck CRUD
  listFlashcardDecks,
  getFlashcardDeck,
  renameFlashcardDeck,
  updateFlashcardDeckMastery,
  deleteFlashcardDeck,

  // New Career Roadmap CRUD
  listCareerRoadmaps,
  getCareerRoadmap,
  renameCareerRoadmap,
  deleteCareerRoadmap,

  // Document CRUD & Import
  uploadFile,
  importNote,
  listDocuments,
  getDocument,
  deleteDocument,
  deleteLinkedOutput
};
