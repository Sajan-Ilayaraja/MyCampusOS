const express = require('express');
const router = express.Router();
const {
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

  // Study plans CRUD
  listStudyPlans,
  getStudyPlan,
  renameStudyPlan,
  duplicateStudyPlan,
  deleteStudyPlan,

  // Summaries CRUD
  listSummaries,
  getSummary,
  renameSummary,
  deleteSummary,

  // Quizzes CRUD
  listQuizzes,
  getQuiz,
  renameQuiz,
  submitQuizScore,
  deleteQuiz,

  // Flashcards CRUD
  listFlashcardDecks,
  getFlashcardDeck,
  renameFlashcardDeck,
  updateFlashcardDeckMastery,
  deleteFlashcardDeck,

  // Career Roadmaps CRUD
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
} = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');
const upload = require('../middleware/uploadMiddleware');

// Enforce JWT protection and a rate limit of 100 requests per 15 minutes for broader usage (excluding streaming / uploads cost structure)
router.use(protect);

router.get('/health', getAiHealth);
router.get('/provider-stats', getProviderStats);

// File Upload endpoint
router.post('/upload', upload.single('file'), uploadFile);

router.post('/study-plan', generateStudyPlan);
router.post('/notes-summary', summarizeNotes);
router.post('/quiz-generator', generateQuiz);
router.post('/flashcards', generateFlashcards);
router.post('/career-advisor', getCareerAdvise);
router.route('/productivity-insights')
  .get(getProductivityInsights)
  .post(getProductivityInsights);
router.post('/interview-prep', getInterviewPrep);
router.post('/chat', chatAssistant);

// Conversational Chats CRUD
router.get('/conversations', listConversations);
router.post('/conversations', createConversation);
router.get('/conversations/:id', getConversation);
router.put('/conversations/:id', renameConversation);
router.delete('/conversations/:id', deleteConversation);
router.patch('/conversations/:id/pin', togglePinConversation);
router.patch('/conversations/:id/favorite', toggleFavoriteConversation);
router.post('/conversations/:id/duplicate', duplicateConversation);
router.post('/conversations/:id/clear', clearConversation);
router.post('/conversations/:id/message', postConversationMessage);

// Study Plans CRUD routes
router.get('/study-plans', listStudyPlans);
router.get('/study-plans/:id', getStudyPlan);
router.put('/study-plans/:id', renameStudyPlan);
router.post('/study-plans/:id/duplicate', duplicateStudyPlan);
router.delete('/study-plans/:id', deleteStudyPlan);

// Summaries CRUD routes
router.get('/summaries', listSummaries);
router.get('/summaries/:id', getSummary);
router.put('/summaries/:id', renameSummary);
router.delete('/summaries/:id', deleteSummary);

// Quizzes CRUD routes
router.get('/quizzes', listQuizzes);
router.get('/quizzes/:id', getQuiz);
router.put('/quizzes/:id', renameQuiz);
router.post('/quizzes/:id/submit', submitQuizScore);
router.delete('/quizzes/:id', deleteQuiz);

// Flashcard Decks CRUD routes
router.get('/flashcards/decks', listFlashcardDecks);
router.get('/flashcards/decks/:id', getFlashcardDeck);
router.put('/flashcards/decks/:id', renameFlashcardDeck);
router.post('/flashcards/decks/:id/mastery', updateFlashcardDeckMastery);
router.delete('/flashcards/decks/:id', deleteFlashcardDeck);

// Career Roadmaps CRUD routes
router.get('/career-roadmaps', listCareerRoadmaps);
router.get('/career-roadmaps/:id', getCareerRoadmap);
router.put('/career-roadmaps/:id', renameCareerRoadmap);
router.delete('/career-roadmaps/:id', deleteCareerRoadmap);

router.get('/usage', getAiUsageStats);
router.post('/quiz/attempt', logQuizAttempt);
router.post('/flashcards/mastery', updateFlashcardMastery);

// Document CRUD & Import routes
router.get('/documents', listDocuments);
router.post('/documents/import-note', importNote);
router.get('/documents/:id', getDocument);
router.delete('/documents/:id', deleteDocument);
router.delete('/documents/:docId/output/:type/:outputId', deleteLinkedOutput);

module.exports = router;
