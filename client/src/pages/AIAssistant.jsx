import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { useLocation, useNavigate } from 'react-router-dom';
import API from '../services/api';
import toast from 'react-hot-toast';
import ErrorBoundary from '../components/ErrorBoundary';
import SEO from '../components/SEO';
import {
  Sparkles,
  BookOpen,
  HelpCircle,
  FileText,
  FileUp,
  Briefcase,
  MessageSquare,
  Send,
  Loader,
  Brain,
  Award,
  ChevronRight,
  TrendingUp,
  Clock,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  CheckCircle,
  XCircle,
  Timer,
  ChevronLeft,
  Calendar,
  X,
  Bot,
  Plus,
  Search,
  Edit,
  Trash2,
  CalendarDays,
  Layers,
  BarChart3,
  Paperclip,
  Mic,
  Pin,
  Heart,
  Download,
  Menu,
  Sparkle,
  Settings
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const getReadableCorrectAnswer = (q) => {
  if (!q) return 'Correct answer unavailable';
  const { type, options, correctAnswer } = q;
  
  if (type === 'mcq') {
    if (!Array.isArray(options) || options.length === 0) {
      return 'Correct answer unavailable';
    }
    const idx = parseInt(correctAnswer, 10);
    if (!isNaN(idx) && idx >= 0 && idx < options.length) {
      return `Option ${['A', 'B', 'C', 'D'][idx]}: ${options[idx]}`;
    }
    const stringIdx = options.findIndex(opt => String(opt).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase());
    if (stringIdx !== -1) {
      return `Option ${['A', 'B', 'C', 'D'][stringIdx]}: ${options[stringIdx]}`;
    }
    return 'Correct answer unavailable';
  }
  
  if (type === 'tf') {
    if (!Array.isArray(options) || options.length === 0) {
      const tfOptions = ['True', 'False'];
      const idx = parseInt(correctAnswer, 10);
      if (!isNaN(idx) && idx >= 0 && idx < 2) return tfOptions[idx];
      if (['true', 'false'].includes(String(correctAnswer).trim().toLowerCase())) {
        return String(correctAnswer).trim().toLowerCase() === 'true' ? 'True' : 'False';
      }
      return 'Correct answer unavailable';
    }
    const idx = parseInt(correctAnswer, 10);
    if (!isNaN(idx) && idx >= 0 && idx < options.length) {
      return options[idx];
    }
    if (options.includes(correctAnswer)) {
      return correctAnswer;
    }
    if (['true', 'false'].includes(String(correctAnswer).trim().toLowerCase())) {
      return String(correctAnswer).trim().toLowerCase() === 'true' ? 'True' : 'False';
    }
    return 'Correct answer unavailable';
  }
  
  if (correctAnswer !== undefined && correctAnswer !== null && String(correctAnswer).trim() !== '') {
    return String(correctAnswer);
  }
  
  return 'Correct answer unavailable';
};

const getReadableUserAnswer = (q, userAnswersMap) => {
  if (!q) return 'No answer provided';
  if (!userAnswersMap) return 'No answer provided';
  const userAns = userAnswersMap[q.id];
  if (userAns === undefined || userAns === null || String(userAns).trim() === '') {
    return 'No answer provided';
  }
  const { type, options } = q;
  if (type === 'mcq') {
    if (!Array.isArray(options) || options.length === 0) {
      return String(userAns);
    }
    const idx = parseInt(userAns, 10);
    if (!isNaN(idx) && idx >= 0 && idx < options.length) {
      return `Option ${['A', 'B', 'C', 'D'][idx]}: ${options[idx]}`;
    }
    return String(userAns);
  }
  if (type === 'tf') {
    if (!Array.isArray(options) || options.length === 0) {
      return String(userAns);
    }
    const idx = parseInt(userAns, 10);
    if (!isNaN(idx) && idx >= 0 && idx < options.length) {
      return options[idx];
    }
    return String(userAns);
  }
  return String(userAns);
};

const AIAssistant = () => {
  const brandName = 'CampusBuddy';
  const navigate = useNavigate();
  const location = useLocation();

  // Study Materials States
  const [sidebarTab, setSidebarTab] = useState('chats'); // 'chats' | 'materials'
  const [documents, setDocuments] = useState([]);
  const [activeDocumentId, setActiveDocumentId] = useState(null);
  const [activeDocumentDetails, setActiveDocumentDetails] = useState(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docActionStatus, setDocActionStatus] = useState(''); // 'Uploading...' | 'Extracting Text...' | 'Generating...' | 'Completed' | ''
  const [activeHistoryItem, setActiveHistoryItem] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Workspace routing state: null (dashboard) or active feature workspace key
  const [activeWorkspace, setActiveWorkspace] = useState(null); // 'chat', 'planner', 'summarizer', 'quiz', 'flashcards', 'career', 'usage'
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Histories state for every feature
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  
  const [studyPlans, setStudyPlans] = useState([]);
  const [activeStudyPlanId, setActiveStudyPlanId] = useState(null);
  
  const [summaries, setSummaries] = useState([]);
  const [activeSummaryId, setActiveSummaryId] = useState(null);
  
  const [quizzes, setQuizzes] = useState([]);
  const [activeQuizId, setActiveQuizId] = useState(null);
  
  const [flashcardDecks, setFlashcardDecks] = useState([]);
  const [activeFlashcardDeckId, setActiveFlashcardDeckId] = useState(null);
  
  const [careerRoadmaps, setCareerRoadmaps] = useState([]);
  const [activeCareerRoadmapId, setActiveCareerRoadmapId] = useState(null);

  // Search filter and Edit states
  const [workspaceSearchQuery, setWorkspaceSearchQuery] = useState('');
  const [editingItemId, setEditingItemId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  // General notes list for selection in forms
  const [notesList, setNotesList] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const [useNoteInput, setUseNoteInput] = useState(false);

  // Chat attachments states
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  // AI Analytics usage state
  const [apiUsage, setApiUsage] = useState(null);
  const [usageLoading, setUsageLoading] = useState(false);

  // Study Planner states
  const [planSubject, setPlanSubject] = useState('');
  const [planExamDate, setPlanExamDate] = useState('');
  const [planTopics, setPlanTopics] = useState('');
  const [planHours, setPlanHours] = useState('2');
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [plannerStreamText, setPlannerStreamText] = useState('');

  // Notes Summary states
  const [notesContent, setNotesContent] = useState('');
  const [noteSummaryData, setNoteSummaryData] = useState(null);
  const [noteLoading, setNoteLoading] = useState(false);
  const [notesStreamText, setNotesStreamText] = useState('');

  // Quiz Engine states
  const [quizTopic, setQuizTopic] = useState('');
  const [quizDifficulty, setQuizDifficulty] = useState('medium');
  const [quizCount, setQuizCount] = useState('5');
  const [quizData, setQuizData] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizCurrentIdx, setQuizCurrentIdx] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizTimer, setQuizTimer] = useState(0);
  const [quizError, setQuizError] = useState(null);
  const quizIntervalRef = useRef(null);

  // Flashcards states
  const [fcTopic, setFcTopic] = useState('');
  const [fcCount, setFcCount] = useState('5');
  const [fcData, setFcData] = useState(null);
  const [fcLoading, setFcLoading] = useState(false);
  const [fcCurrentIdx, setFcCurrentIdx] = useState(0);
  const [fcFlipped, setFcFlipped] = useState(false);
  const [fcStreak, setFcStreak] = useState(0);
  const [fcRevisionGoal, setFcRevisionGoal] = useState(5);
  const [fcMasteredToday, setFcMasteredToday] = useState(0);
  const [fcKnownList, setFcKnownList] = useState([]);
  const [fcRepetitionData, setFcRepetitionData] = useState([]);

  // Career Advisor states
  const [careerRole, setCareerRole] = useState('');
  const [careerCompany, setCareerCompany] = useState('');
  const [careerAdvice, setCareerAdvice] = useState(null);
  const [careerLoading, setCareerLoading] = useState(false);
  const [careerStreamText, setCareerStreamText] = useState('');

  // Provider Settings and Health states
  const [preferredProvider, setPreferredProvider] = useState(() => {
    return localStorage.getItem('cb_preferred_provider') || 'auto';
  });
  const [healthStatus, setHealthStatus] = useState(null);
  const [providerStats, setProviderStats] = useState(null);
  const [providerStatsLoading, setProviderStatsLoading] = useState(false);

  // General helpers
  const [copiedText, setCopiedText] = useState('');
  const [abortController, setAbortController] = useState(null);
  const activeAbortRef = useRef(null);

  // Memoized data structures
  const studyTimetable = useMemo(() => Array.isArray(generatedPlan?.timetable) ? generatedPlan.timetable : [], [generatedPlan]);
  const quizQuestions = useMemo(() => Array.isArray(quizData?.questions) ? quizData.questions : [], [quizData]);
  const flashcardsList = useMemo(() => Array.isArray(fcData?.flashcards) ? fcData.flashcards : [], [fcData]);
  const mernRoadmap = useMemo(() => Array.isArray(careerAdvice?.mernRoadmap) ? careerAdvice.mernRoadmap : [], [careerAdvice]);
  const atsKeywords = useMemo(() => Array.isArray(careerAdvice?.atsKeywords) ? careerAdvice.atsKeywords : [], [careerAdvice]);
  const careerPrepPlan = useMemo(() => Array.isArray(careerAdvice?.careerPrepPlan) ? careerAdvice.careerPrepPlan : [], [careerAdvice]);
  const commonQuestions = useMemo(() => Array.isArray(careerAdvice?.companyInterviewPrep?.commonQuestions) ? careerAdvice.companyInterviewPrep.commonQuestions : [], [careerAdvice]);
  const resumeImprovements = useMemo(() => Array.isArray(careerAdvice?.resumeImprovements) ? careerAdvice.resumeImprovements : [], [careerAdvice]);

  // Set preferred provider header on axios requests and run health polling
  useEffect(() => {
    API.defaults.headers.common['x-preferred-provider'] = preferredProvider;
  }, [preferredProvider]);

  // Load resources on mount
  useEffect(() => {
    fetchNotesList();
    fetchConversations();
    fetchStudyPlans();
    fetchSummaries();
    fetchQuizzes();
    fetchFlashcardDecks();
    fetchCareerRoadmaps();
    fetchUsageStats();
    fetchDocuments();
    fetchHealthStatus();
    fetchProviderStats();

    const interval = setInterval(fetchHealthStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch histories
  const fetchConversations = async () => {
    try {
      const res = await API.get('/ai/conversations');
      if (res.data?.success) setConversations(res.data.conversations || []);
    } catch (err) {
      console.error('Failed to load chats:', err);
    }
  };

  const fetchStudyPlans = async () => {
    try {
      const res = await API.get('/ai/study-plans');
      if (res.data?.success) setStudyPlans(res.data.plans || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSummaries = async () => {
    try {
      const res = await API.get('/ai/summaries');
      if (res.data?.success) setSummaries(res.data.summaries || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchQuizzes = async () => {
    try {
      const res = await API.get('/ai/quizzes');
      if (res.data?.success) setQuizzes(res.data.quizzes || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFlashcardDecks = async () => {
    try {
      const res = await API.get('/ai/flashcards/decks');
      if (res.data?.success) setFlashcardDecks(res.data.decks || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCareerRoadmaps = async () => {
    try {
      const res = await API.get('/ai/career-roadmaps');
      if (res.data?.success) setCareerRoadmaps(res.data.roadmaps || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsageStats = async () => {
    try {
      setUsageLoading(true);
      const res = await API.get('/ai/usage');
      if (res.data?.success) setApiUsage(res.data.usage);
    } catch (err) {
      console.error('Failed to load usage stats:', err);
    } finally {
      setUsageLoading(false);
    }
  };

  const fetchHealthStatus = async () => {
    try {
      const res = await API.get('/ai/health');
      if (res.data?.success) {
        setHealthStatus({
          activeProvider: res.data.activeProvider,
          providers: res.data.providers
        });
      }
    } catch (err) {
      console.error('Failed to load AI health:', err);
    }
  };

  const fetchProviderStats = async () => {
    try {
      setProviderStatsLoading(true);
      const res = await API.get('/ai/provider-stats');
      if (res.data?.success) {
        setProviderStats(res.data.stats);
      }
    } catch (err) {
      console.error('Failed to load provider stats:', err);
    } finally {
      setProviderStatsLoading(false);
    }
  };

  const handleSavePreferences = (provider) => {
    localStorage.setItem('cb_preferred_provider', provider);
    setPreferredProvider(provider);
    toast.success(`AI Preferred Provider set to: ${provider.toUpperCase()}`);
  };

  const fetchDocuments = async () => {
    try {
      setDocsLoading(true);
      const res = await API.get('/ai/documents');
      if (res.data?.success) setDocuments(res.data.documents || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setDocsLoading(false);
    }
  };

  const fetchDocumentDetails = async (docId) => {
    try {
      const res = await API.get(`/ai/documents/${docId}`);
      if (res.data?.success) {
        setActiveDocumentDetails(res.data.document);
        setActiveHistoryItem(null);
      }
    } catch (err) {
      console.error('Failed to fetch document details:', err);
      toast.error('Failed to load study material details');
    }
  };

  const handleSelectDocument = (docId) => {
    setActiveDocumentId(docId);
    setActiveConversationId(null);
    fetchDocumentDetails(docId);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this study material and all its generated history?')) return;
    try {
      const res = await API.delete(`/ai/documents/${docId}`);
      if (res.data?.success) {
        toast.success('Study material deleted successfully');
        setDocuments(prev => prev.filter(d => d._id !== docId));
        if (activeDocumentId === docId) {
          setActiveDocumentId(null);
          setActiveDocumentDetails(null);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete study material');
    }
  };

  const handleDeleteLinkedOutput = async (docId, type, outputId) => {
    if (!window.confirm(`Are you sure you want to delete this generated ${type}?`)) return;
    try {
      const res = await API.delete(`/ai/documents/${docId}/output/${type}/${outputId}`);
      if (res.data?.success) {
        toast.success(`Deleted generated ${type}`);
        setActiveDocumentDetails(res.data.document);
        if (activeHistoryItem && activeHistoryItem.data?._id === outputId) {
          setActiveHistoryItem(null);
        }
        if (type === 'summary') fetchSummaries();
        if (type === 'quiz') fetchQuizzes();
        if (type === 'flashcard') fetchFlashcardDecks();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete output');
    }
  };

  const handleDocumentAction = async (docId, actionKey) => {
    if (!activeDocumentDetails) return;

    // Check if output already exists to avoid regeneration and reopen instantly
    if (actionKey === 'summarize' || actionKey === 'notes' || actionKey === 'explain') {
      const existing = activeDocumentDetails.generatedSummaries?.find(item => item.summaryId);
      if (existing) {
        setActiveHistoryItem({ type: 'summary', data: existing.summaryId });
        toast.success('Reopened existing summary instantly!');
        return;
      }
    } else if (actionKey === 'quiz') {
      const existing = activeDocumentDetails.generatedQuizzes?.find(item => item.quizId);
      if (existing) {
        setActiveHistoryItem({ type: 'quiz', data: existing.quizId });
        toast.success('Reopened existing quiz instantly!');
        return;
      }
    } else if (actionKey === 'flashcards') {
      const existing = activeDocumentDetails.generatedFlashcards?.find(item => item.deckId);
      if (existing) {
        setActiveHistoryItem({ type: 'flashcard', data: existing.deckId });
        toast.success('Reopened existing flashcard deck instantly!');
        return;
      }
    }

    try {
      if (actionKey === 'summarize' || actionKey === 'explain') {
        setDocActionStatus('Generating Summary...');
      } else if (actionKey === 'notes') {
        setDocActionStatus('Generating Study Notes...');
      } else if (actionKey === 'quiz') {
        setDocActionStatus('Generating Quiz...');
      } else if (actionKey === 'flashcards') {
        setDocActionStatus('Generating Flashcards...');
      } else {
        setDocActionStatus('Generating...');
      }
      
      let res;
      if (actionKey === 'summarize' || actionKey === 'notes' || actionKey === 'explain') {
        res = await API.post('/ai/notes-summary', { documentId: docId });
        if (res.data?.success) {
          setDocActionStatus('Completed');
          toast.success('Summary generated successfully!');
          fetchDocumentDetails(docId);
          fetchSummaries();
          setActiveHistoryItem({ type: 'summary', data: res.data.record });
        }
      } else if (actionKey === 'quiz') {
        res = await API.post('/ai/quiz-generator', { documentId: docId, difficulty: 'medium', questionCount: 5 });
        if (res.data?.success) {
          setDocActionStatus('Completed');
          toast.success('Quiz generated successfully!');
          fetchDocumentDetails(docId);
          fetchQuizzes();
          setActiveHistoryItem({ type: 'quiz', data: res.data.record });
        }
      } else if (actionKey === 'flashcards') {
        res = await API.post('/ai/flashcards', { documentId: docId, cardCount: 6 });
        if (res.data?.success) {
          setDocActionStatus('Completed');
          toast.success('Flashcard deck generated successfully!');
          fetchDocumentDetails(docId);
          fetchFlashcardDecks();
          setActiveHistoryItem({ type: 'flashcard', data: res.data.record });
        }
      }
      setTimeout(() => setDocActionStatus(''), 1500);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'AI Generation failed');
      setDocActionStatus('');
    }
  };

  useEffect(() => {
    const importFromNotesVault = async () => {
      if (location.state && location.state.autoAttachNote) {
        const note = location.state.autoAttachNote;
        window.history.replaceState({}, document.title);
        
        try {
          setDocActionStatus('Extracting Text...');
          const res = await API.post('/ai/documents/import-note', { noteId: note._id });
          if (res.data?.success && res.data.document) {
            toast.success(`Attached from Notes Vault: ${note.title}`);
            const importedDoc = res.data.document;
            await fetchDocuments();
            setActiveWorkspace('chat');
            setSidebarTab('materials');
            handleSelectDocument(importedDoc._id);
          }
        } catch (err) {
          console.error(err);
          toast.error(err.response?.data?.message || 'Failed to import document from Notes Vault');
        } finally {
          setDocActionStatus('');
        }
      }
    };

    importFromNotesVault();
  }, [location]);

  const fetchNotesList = async () => {
    try {
      const res = await API.get('/notes');
      if (res.data?.success) setNotesList(res.data.notes || []);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
    }
  };

  // Selection handlers
  const handleSelectConversation = async (id) => {
    try {
      setActiveConversationId(id);
      const res = await API.get(`/ai/conversations/${id}`);
      if (res.data?.success && res.data.conversation) {
        setChatHistory(res.data.conversation.messages || []);
      }
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    } catch (err) {
      console.error(err);
      toast.error('Unable to retrieve messages');
    }
  };

  const handleSelectStudyPlan = async (id) => {
    try {
      setActiveStudyPlanId(id);
      const res = await API.get(`/ai/study-plans/${id}`);
      if (res.data?.success && res.data.plan) {
        const p = res.data.plan;
        setPlanSubject(p.subject || '');
        setPlanExamDate(p.examDate ? new Date(p.examDate).toISOString().split('T')[0] : '');
        setPlanTopics(p.topics ? p.topics.join(', ') : '');
        setPlanHours(String(p.dailyHours || 2));
        setGeneratedPlan(p.plan || null);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load study plan');
    }
  };

  const handleSelectSummary = async (id) => {
    try {
      setActiveSummaryId(id);
      const res = await API.get(`/ai/summaries/${id}`);
      if (res.data?.success && res.data.summary) {
        const s = res.data.summary;
        setNotesContent(s.content || '');
        setNoteSummaryData(s.summary || null);
        setSelectedNoteId(s.noteId || '');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load summary');
    }
  };

  const handleSelectQuiz = async (id) => {
    try {
      setActiveQuizId(id);
      const res = await API.get(`/ai/quizzes/${id}`);
      if (res.data?.success && res.data.quiz) {
        const q = res.data.quiz;
        setQuizTopic(q.topic || '');
        setQuizDifficulty(q.difficulty || 'medium');
        setQuizCount(String(q.questionCount || 5));
        setQuizData(q.quiz || null);
        setQuizAnswers(q.answers || {});
        setQuizSubmitted(q.submitted || false);
        setQuizCurrentIdx(0);
        setQuizTimer(0);
        if (quizIntervalRef.current) clearInterval(quizIntervalRef.current);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load quiz');
    }
  };

  const handleSelectFlashcardDeck = async (id) => {
    try {
      setActiveFlashcardDeckId(id);
      const res = await API.get(`/ai/flashcards/decks/${id}`);
      if (res.data?.success && res.data.deck) {
        const d = res.data.deck;
        setFcTopic(d.topic || '');
        setFcCount(String(d.cardCount || 5));
        setFcData(d.deck || null);
        setFcCurrentIdx(0);
        setFcFlipped(false);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load flashcard deck');
    }
  };

  const handleSelectCareerRoadmap = async (id) => {
    try {
      setActiveCareerRoadmapId(id);
      const res = await API.get(`/ai/career-roadmaps/${id}`);
      if (res.data?.success && res.data.roadmap) {
        const r = res.data.roadmap;
        setCareerRole(r.targetRole || '');
        setCareerCompany(r.targetCompany || '');
        setCareerAdvice(r.roadmap || null);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load career roadmap');
    }
  };

  // Start new sessions
  const handleNewChat = async () => {
    try {
      const res = await API.post('/ai/conversations', {});
      if (res.data?.success && res.data.conversation) {
        const newConv = res.data.conversation;
        setConversations(prev => [newConv, ...prev]);
        setActiveConversationId(newConv._id);
        setChatHistory([]);
        setUploadedFile(null);
        toast.success('Started a new conversation');
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not start new conversation');
    }
  };

  const handleNewStudyPlan = () => {
    setActiveStudyPlanId(null);
    setGeneratedPlan(null);
    setPlanSubject('');
    setPlanExamDate('');
    setPlanTopics('');
    setPlanHours('2');
  };

  const handleNewSummary = () => {
    setActiveSummaryId(null);
    setNoteSummaryData(null);
    setNotesContent('');
    setSelectedNoteId('');
  };

  const handleNewQuiz = () => {
    setActiveQuizId(null);
    setQuizData(null);
    setQuizTopic('');
    setSelectedNoteId('');
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizCurrentIdx(0);
    setQuizTimer(0);
    if (quizIntervalRef.current) clearInterval(quizIntervalRef.current);
  };

  const handleNewFlashcardDeck = () => {
    setActiveFlashcardDeckId(null);
    setFcData(null);
    setFcTopic('');
    setSelectedNoteId('');
    setFcCurrentIdx(0);
    setFcFlipped(false);
  };

  const handleNewCareerRoadmap = () => {
    setActiveCareerRoadmapId(null);
    setCareerAdvice(null);
    setCareerRole('');
    setCareerCompany('');
  };

  // Renaming handlers
  const handleRenameItem = async (type, id, newTitle) => {
    if (!newTitle.trim()) return;
    try {
      let endpoint = '';
      if (type === 'chat') endpoint = `/ai/conversations/${id}`;
      else if (type === 'planner') endpoint = `/ai/study-plans/${id}`;
      else if (type === 'summarizer') endpoint = `/ai/summaries/${id}`;
      else if (type === 'quiz') endpoint = `/ai/quizzes/${id}`;
      else if (type === 'flashcards') endpoint = `/ai/flashcards/decks/${id}`;
      else if (type === 'career') endpoint = `/ai/career-roadmaps/${id}`;

      const res = await API.put(endpoint, { title: newTitle.trim() });
      if (res.data?.success) {
        if (type === 'chat') setConversations(prev => prev.map(c => c._id === id ? { ...c, title: newTitle } : c));
        else if (type === 'planner') setStudyPlans(prev => prev.map(p => p._id === id ? { ...p, title: newTitle } : p));
        else if (type === 'summarizer') setSummaries(prev => prev.map(s => s._id === id ? { ...s, title: newTitle } : s));
        else if (type === 'quiz') setQuizzes(prev => prev.map(q => q._id === id ? { ...q, title: newTitle } : q));
        else if (type === 'flashcards') setFlashcardDecks(prev => prev.map(d => d._id === id ? { ...d, title: newTitle } : d));
        else if (type === 'career') setCareerRoadmaps(prev => prev.map(r => r._id === id ? { ...r, title: newTitle } : r));

        setEditingItemId(null);
        toast.success('Renamed successfully');
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not rename item');
    }
  };

  // Deleting handlers
  const handleDeleteItem = async (type, id) => {
    try {
      let endpoint = '';
      if (type === 'chat') endpoint = `/ai/conversations/${id}`;
      else if (type === 'planner') endpoint = `/ai/study-plans/${id}`;
      else if (type === 'summarizer') endpoint = `/ai/summaries/${id}`;
      else if (type === 'quiz') endpoint = `/ai/quizzes/${id}`;
      else if (type === 'flashcards') endpoint = `/ai/flashcards/decks/${id}`;
      else if (type === 'career') endpoint = `/ai/career-roadmaps/${id}`;

      const res = await API.delete(endpoint);
      if (res.data?.success) {
        if (type === 'chat') {
          setConversations(prev => prev.filter(c => c._id !== id));
          if (activeConversationId === id) { setActiveConversationId(null); setChatHistory([]); }
        } else if (type === 'planner') {
          setStudyPlans(prev => prev.filter(p => p._id !== id));
          if (activeStudyPlanId === id) handleNewStudyPlan();
        } else if (type === 'summarizer') {
          setSummaries(prev => prev.filter(s => s._id !== id));
          if (activeSummaryId === id) handleNewSummary();
        } else if (type === 'quiz') {
          setQuizzes(prev => prev.filter(q => q._id !== id));
          if (activeQuizId === id) handleNewQuiz();
        } else if (type === 'flashcards') {
          setFlashcardDecks(prev => prev.filter(d => d._id !== id));
          if (activeFlashcardDeckId === id) handleNewFlashcardDeck();
        } else if (type === 'career') {
          setCareerRoadmaps(prev => prev.filter(r => r._id !== id));
          if (activeCareerRoadmapId === id) handleNewCareerRoadmap();
        }
        toast.success('Deleted successfully');
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not delete item');
    }
  };

  // Toggle Pinned / Favorites
  const handleTogglePin = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await API.patch(`/ai/conversations/${id}/pin`);
      if (res.data?.success) {
        setConversations(prev => prev.map(c => c._id === id ? { ...c, isPinned: res.data.conversation.isPinned } : c)
          .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || new Date(b.updatedAt) - new Date(a.updatedAt))
        );
        toast.success(res.data.conversation.isPinned ? 'Chat pinned' : 'Chat unpinned');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFavorite = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await API.patch(`/ai/conversations/${id}/favorite`);
      if (res.data?.success) {
        setConversations(prev => prev.map(c => c._id === id ? { ...c, isFavorite: res.data.conversation.isFavorite } : c));
        toast.success(res.data.conversation.isFavorite ? 'Added to favorites' : 'Removed from favorites');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDuplicateChat = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await API.post(`/ai/conversations/${id}/duplicate`);
      if (res.data?.success) {
        setConversations(prev => [res.data.conversation, ...prev].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || new Date(b.updatedAt) - new Date(a.updatedAt)));
        toast.success('Chat duplicated');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // File attachments upload helper
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedFormats = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedFormats.includes(ext)) {
      if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'].includes(ext)) {
        toast.error('CampusBuddy currently supports study documents only. Image uploads are disabled.');
      } else {
        toast.error('Unsupported format. Allowed: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX');
      }
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsUploading(true);
      const res = await API.post('/ai/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      if (res.data?.success && res.data.file) {
        setUploadedFile(res.data.file);
        toast.success(`Attached: ${file.name}`);
        fetchDocuments();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'File upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const uploadStudyMaterial = async (file) => {
    if (!file) return;

    const allowedFormats = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedFormats.includes(ext)) {
      if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'].includes(ext)) {
        toast.error('CampusBuddy currently supports study documents only. Image uploads are disabled.');
      } else {
        toast.error('Unsupported format. Allowed: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX');
      }
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setDocActionStatus('Uploading...');
      
      const timerId = setTimeout(() => {
        setDocActionStatus('Extracting Text...');
      }, 1200);

      const res = await API.post('/ai/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      clearTimeout(timerId);

      if (res.data?.success && res.data.document) {
        setDocActionStatus('Completed');
        toast.success(`Study material uploaded: ${file.name}`);
        const newDoc = res.data.document;
        setDocuments(prev => [newDoc, ...prev]);
        handleSelectDocument(newDoc._id);
        setTimeout(() => setDocActionStatus(''), 2000);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'File upload failed');
      setDocActionStatus('');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      await uploadStudyMaterial(file);
    }
  };

  // Download summary helper
  const handleDownloadSummaryObj = (sumRecord) => {
    if (!sumRecord || !sumRecord.summary) {
      toast.error('No summary data to download');
      return;
    }
    const sumObj = sumRecord.summary;
    
    // Support both new document-centric schema fields and old legacy fields
    const overview = sumObj.overview || sumObj.summary || 'No overview available.';
    const keyTakeaways = sumObj.keyConcepts || sumObj.keyPoints || [];
    const definitions = sumObj.importantDefinitions || [];
    const questions = sumObj.importantQuestions || [];
    const examTips = sumObj.examTips || [];
    const revisionNotes = sumObj.quickRevisionNotes || sumObj.revisionNotes || '';

    let formatted = `# ${sumRecord.title}\n\n`;
    formatted += `## Overview\n${overview}\n\n`;

    if (keyTakeaways.length > 0) {
      formatted += `## Key Takeaways\n${keyTakeaways.map((p, idx) => `${idx + 1}. ${p}`).join('\n')}\n\n`;
    }

    if (definitions.length > 0) {
      formatted += `## Important Definitions\n${definitions.map(d => `- **${d.term}**: ${d.definition}`).join('\n')}\n\n`;
    }

    if (questions.length > 0) {
      formatted += `## Potential Exam Questions\n${questions.map(q => `- **Q**: ${q.question}\n  **A**: ${q.answer}`).join('\n\n')}\n\n`;
    }

    if (examTips.length > 0) {
      formatted += `## Exam Tips\n${examTips.map(t => `- ${t}`).join('\n')}\n\n`;
    }

    if (revisionNotes) {
      formatted += `## Quick Revision Notes\n${revisionNotes}\n\n`;
    }
    
    const element = document.createElement("a");
    const file = new Blob([formatted], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `${sumRecord.title.replace(/\s+/g, "_")}_summary.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Summary downloaded as markdown');
  };

  // Export Chat history as markdown file
  const handleExportChat = (conversationTitle, messages) => {
    if (!messages || messages.length === 0) {
      toast.error('No messages to export');
      return;
    }
    const formatted = messages.map(m => {
      return `[${m.role.toUpperCase()} - ${new Date(m.timestamp || Date.now()).toLocaleTimeString()}]:\n${m.content}\n\n`;
    }).join('---\n\n');

    const element = document.createElement("a");
    const file = new Blob([formatted], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `${conversationTitle.replace(/\s+/g, "_")}_history.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Chat history exported as markdown');
  };

  // Helper to copy code/texts to clipboard
  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedText(''), 2000);
  };

  // Auto-scroll chat window
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  // Cancel active streaming request
  const handleCancelRequest = () => {
    if (activeAbortRef.current) {
      activeAbortRef.current.abort();
    }
    setPlanLoading(false);
    setNoteLoading(false);
    setQuizLoading(false);
    setFcLoading(false);
    setCareerLoading(false);
    setChatLoading(false);
    toast.success('AI Request cancelled');
  };

  const cleanAndParseJSON = (text) => {
    if (typeof text !== 'string') return text;
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/g, '').trim();
    return JSON.parse(cleaned);
  };

  const extractReplyText = (response) => {
    if (typeof response === 'object' && response !== null) {
      return response.reply || response.message || response.text || JSON.stringify(response, null, 2);
    }

    if (typeof response !== 'string') return '';

    try {
      const parsed = JSON.parse(response);
      return parsed.reply || parsed.message || parsed.text || response;
    } catch {
      const match = response.match(/"(reply|message|text)"\s*:\s*"(.*)/s);
      if (match) {
        let content = match[2];
        if (content.endsWith('"}') || content.endsWith('"} ')) {
          content = content.slice(0, -2);
        } else if (content.endsWith('"')) {
          content = content.slice(0, -1);
        } else if (content.match(/"\s*\}\s*$/)) {
          content = content.replace(/"\s*\}\s*$/, '');
        }
        return content
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
      }
    }
    return response;
  };

  // Textarea auto resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [chatMessage]);

  // SSE Stream Request Helper
  const handleStreamingRequest = async (urlPath, bodyPayload, onTextChunk, onCompleted) => {
    if (activeAbortRef.current) {
      activeAbortRef.current.abort();
    }
    const controller = new AbortController();
    activeAbortRef.current = controller;
    setAbortController(controller);

    try {
      const response = await fetch(`${API.defaults.baseURL}${urlPath}?stream=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-preferred-provider': preferredProvider
        },
        body: JSON.stringify(bodyPayload),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error('API server stream response failure');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let streamBuffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split('\n');
        streamBuffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith('data: ')) {
            const dataStr = cleanLine.substring(6);
            if (dataStr === '[DONE]') {
              break;
            } else {
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.text) {
                  fullText += parsed.text;
                  onTextChunk(fullText);
                }
              } catch {
                // skip broken chunk segments
              }
            }
          }
        }
      }

      onCompleted(fullText);
    } catch (err) {
      if (err.name !== 'AbortError' && err.name !== 'CanceledError') {
        console.error('Streaming request error:', err);
        toast.error('AI compilation failed. Check connections');
      }
    } finally {
      if (activeAbortRef.current === controller) {
        activeAbortRef.current = null;
      }
      setAbortController(null);
    }
  };

  // 1. CampusBuddy Chat Submission
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() && !uploadedFile) return;

    let targetConvId = activeConversationId;

    if (!targetConvId) {
      try {
        const res = await API.post('/ai/conversations', {});
        if (res.data?.success && res.data.conversation) {
          const newConv = res.data.conversation;
          setConversations(prev => [newConv, ...prev]);
          targetConvId = newConv._id;
          setActiveConversationId(newConv._id);
        } else {
          throw new Error('Failed to create dynamic conversation');
        }
      } catch (err) {
        console.error('Failed to auto-create conversation context:', err);
        toast.error('Unable to establish conversation session');
        return;
      }
    }

    const userPrompt = chatMessage;
    const fileAttached = uploadedFile;
    setUploadedFile(null); // Clear attachment immediately
    setChatMessage('');

    const userMsg = {
      role: 'user',
      content: fileAttached ? `[Attached File: ${fileAttached.name}] ${userPrompt}` : userPrompt,
      timestamp: new Date()
    };
    
    setChatHistory(prev => [...prev, userMsg]);
    setChatLoading(true);

    // Initial placeholder for typing animation
    setChatHistory(prev => [...prev, { role: 'assistant', content: '', timestamp: new Date() }]);

    const outgoingPayload = {
      message: userPrompt,
      file: fileAttached
    };

    await handleStreamingRequest(
      `/ai/conversations/${targetConvId}/message`,
      outgoingPayload,
      (accumulatedText) => {
        const aiText = extractReplyText(accumulatedText);
        setChatHistory(prev => {
          const list = [...prev];
          if (list.length > 0) {
            list[list.length - 1] = { role: 'assistant', content: aiText, timestamp: new Date() };
          }
          return list;
        });
      },
      async (finalText) => {
        setChatLoading(false);
        const aiText = extractReplyText(finalText);
        setChatHistory(prev => {
          const list = [...prev];
          if (list.length > 0) {
            list[list.length - 1] = { role: 'assistant', content: aiText, timestamp: new Date() };
          }
          return list;
        });
        
        fetchConversations();
      }
    );
  };

  // 2. Study Planner Submission
  const handleGenerateStudyPlan = async (e) => {
    e.preventDefault();
    if (!planSubject || !planExamDate || (!planTopics && !selectedNoteId)) {
      toast.error('Fill in required planner parameters or select notes');
      return;
    }
    
    setPlanLoading(true);
    setGeneratedPlan(null);
    setPlannerStreamText('');

    const payload = {
      subject: planSubject,
      examDate: planExamDate,
      topics: planTopics ? planTopics.split(',').map(t => t.trim()) : [],
      dailyHours: planHours,
      noteId: useNoteInput ? selectedNoteId : undefined
    };

    await handleStreamingRequest(
      '/ai/study-plan',
      payload,
      (textSoFar) => {
        setPlannerStreamText(textSoFar);
      },
      async (finalText) => {
        setPlanLoading(false);
        try {
          const response = cleanAndParseJSON(finalText);
          
          // The backend automatically saves the study plan and returns `{ success, plan, record }`.
          // We trigger fetch study plans to reload the history list.
          await fetchStudyPlans();
          toast.success('Study plan saved successfully');

          // If we want to automatically set active id, we find the latest record
          const plansRes = await API.get('/ai/study-plans');
          if (plansRes.data?.success && plansRes.data.plans.length > 0) {
            const latest = plansRes.data.plans[0];
            setActiveStudyPlanId(latest._id);
            setGeneratedPlan(latest.plan);
          } else {
            setGeneratedPlan(response);
          }
        } catch (err) {
          console.error('Failed to parse study plan JSON:', err, 'Raw:', finalText);
          toast.error('Plan compiled but history save parsed with fallback structures');
        }
      }
    );
  };

  // 3. Summarizer Notes Submission
  const handleSummarizeNotes = async () => {
    if (useNoteInput && !selectedNoteId) {
      toast.error('Select a note file to summarize');
      return;
    }
    if (!useNoteInput && !notesContent.trim()) {
      toast.error('Paste note content to summarize');
      return;
    }

    setNoteLoading(true);
    setNoteSummaryData(null);
    setNotesStreamText('');

    const payload = useNoteInput ? { noteId: selectedNoteId } : { content: notesContent };

    await handleStreamingRequest(
      '/ai/notes-summary',
      payload,
      (textSoFar) => {
        setNotesStreamText(textSoFar);
      },
      async (finalText) => {
        setNoteLoading(false);
        try {
          const response = cleanAndParseJSON(finalText);
          await fetchSummaries();
          toast.success('Notes summary compiled and auto-saved');

          const sumRes = await API.get('/ai/summaries');
          if (sumRes.data?.success && sumRes.data.summaries.length > 0) {
            const latest = sumRes.data.summaries[0];
            setActiveSummaryId(latest._id);
            setNoteSummaryData(latest.summary);
          } else {
            setNoteSummaryData(response);
          }
        } catch (err) {
          console.error('Failed to parse summary JSON:', err, 'Raw:', finalText);
          toast.error('Summary compiled but parser fell back to standard structure');
        }
      }
    );
  };

  // 4. Quiz Generation
  const startQuiz = async (e) => {
    if (e) e.preventDefault();
    if (useNoteInput && !selectedNoteId) {
      toast.error('Select note to compile quiz');
      return;
    }
    if (!useNoteInput && !quizTopic) {
      toast.error('Enter topic for quiz');
      return;
    }

    setQuizLoading(true);
    setQuizData(null);
    setQuizError(null);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizCurrentIdx(0);
    setQuizTimer(0);
    
    if (quizIntervalRef.current) clearInterval(quizIntervalRef.current);

    if (activeAbortRef.current) activeAbortRef.current.abort();
    const controller = new AbortController();
    activeAbortRef.current = controller;
    setAbortController(controller);

    try {
      const res = await API.post('/ai/quiz-generator', {
        topic: useNoteInput ? undefined : quizTopic,
        noteId: useNoteInput ? selectedNoteId : undefined,
        difficulty: quizDifficulty,
        questionCount: quizCount
      }, { signal: controller.signal });

      if (res.data.success) {
        await fetchQuizzes();
        toast.success('Quiz generated! Start assessment');

        const quizRes = await API.get('/ai/quizzes');
        if (quizRes.data?.success && quizRes.data.quizzes.length > 0) {
          const latest = quizRes.data.quizzes[0];
          setActiveQuizId(latest._id);
          setQuizData(latest.quiz);
        } else {
          setQuizData(res.data.quiz);
        }
        
        quizIntervalRef.current = setInterval(() => {
          setQuizTimer(prev => prev + 1);
        }, 1000);
      }
    } catch (error) {
      if (error.name !== 'AbortError' && !axios.isCancel(error)) {
        console.error(error);
        const errMsg = error.response?.data?.message || 'CampusBuddy could not generate a quiz right now. Please try again later.';
        setQuizError(errMsg);
        toast.error(errMsg);
      }
    } finally {
      if (activeAbortRef.current === controller) {
        activeAbortRef.current = null;
      }
      setAbortController(null);
      setQuizLoading(false);
    }
  };

  const submitQuizAnswers = async () => {
    if (quizIntervalRef.current) clearInterval(quizIntervalRef.current);
    
    let score = 0;
    quizQuestions.forEach((q) => {
      const userAns = quizAnswers[q.id];
      if (q.type === 'mcq' || q.type === 'tf') {
        if (String(userAns) === String(q.correctAnswer)) score++;
      } else {
        if (userAns && q.correctAnswer && String(userAns).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()) {
          score++;
        }
      }
    });

    setQuizSubmitted(true);
    toast.success(`Completed! Score: ${score}/${quizQuestions.length}`);

    try {
      // Save user submission in activeQuizId
      if (activeQuizId) {
        await API.post(`/ai/quizzes/${activeQuizId}/submit`, {
          score,
          totalQuestions: quizQuestions.length,
          answers: quizAnswers
        });
        await fetchQuizzes();
      }

      // Keep legacy log as well for analytics dashboard
      await API.post('/ai/quiz/attempt', {
        topic: useNoteInput ? 'Uploaded Note Quiz' : quizTopic,
        score,
        totalQuestions: quizQuestions.length,
        difficulty: quizDifficulty
      });
      fetchUsageStats();
    } catch (err) {
      console.error('Failed to log quiz attempt:', err);
    }
  };

  const handleRetryQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizCurrentIdx(0);
    setQuizTimer(0);
    if (quizIntervalRef.current) clearInterval(quizIntervalRef.current);
    
    quizIntervalRef.current = setInterval(() => {
      setQuizTimer(prev => prev + 1);
    }, 1000);
  };

  // 5. Flashcards Generation
  const startFlashcards = async (e) => {
    e.preventDefault();
    if (useNoteInput && !selectedNoteId) {
      toast.error('Select note to compile flashcard revision deck');
      return;
    }
    if (!useNoteInput && !fcTopic) {
      toast.error('Provide a topic for flashcards');
      return;
    }

    setFcLoading(true);
    setFcData(null);
    setFcCurrentIdx(0);
    setFcFlipped(false);

    if (activeAbortRef.current) activeAbortRef.current.abort();
    const controller = new AbortController();
    activeAbortRef.current = controller;
    setAbortController(controller);

    try {
      const res = await API.post('/ai/flashcards', {
        topic: useNoteInput ? undefined : fcTopic,
        noteId: useNoteInput ? selectedNoteId : undefined,
        cardCount: fcCount
      }, { signal: controller.signal });

      if (res.data.success) {
        await fetchFlashcardDecks();
        toast.success('Study deck prepared! Space/Enter to Flip card');

        const deckRes = await API.get('/ai/flashcards/decks');
        if (deckRes.data?.success && deckRes.data.decks.length > 0) {
          const latest = deckRes.data.decks[0];
          setActiveFlashcardDeckId(latest._id);
          setFcData(latest.deck);
        } else {
          setFcData(res.data.deck);
        }

        fetchUsageStats();
      }
    } catch (error) {
      if (error.name !== 'AbortError' && !axios.isCancel(error)) {
        console.error(error);
        toast.error('Failed to generate revision deck.');
      }
    } finally {
      if (activeAbortRef.current === controller) {
        activeAbortRef.current = null;
      }
      setAbortController(null);
      setFcLoading(false);
    }
  };

  const handleCardOutcome = async (known) => {
    setFcFlipped(false);
    const currentCard = flashcardsList[fcCurrentIdx];

    let updatedMasteredCount = fcMasteredToday;
    if (known) {
      updatedMasteredCount += 1;
      setFcMasteredToday(prev => prev + 1);
    }

    try {
      // Save mastery in Active Deck ID if present
      if (activeFlashcardDeckId) {
        const nextKnownList = known ? [...fcKnownList, currentCard?.id] : fcKnownList.filter(id => id !== currentCard?.id);
        const progressVal = Math.round((nextKnownList.length / flashcardsList.length) * 100);
        await API.post(`/ai/flashcards/decks/${activeFlashcardDeckId}/mastery`, {
          masteryProgress: progressVal,
          knownCards: nextKnownList
        });
        await fetchFlashcardDecks();
      }

      const res = await API.post('/ai/flashcards/mastery', {
        topic: useNoteInput ? 'Uploaded Note Flashcards' : fcTopic,
        masteredCount: updatedMasteredCount,
        totalCards: flashcardsList.length,
        cardId: currentCard?.id,
        wasCorrect: known
      });

      if (res.data.success && res.data.mastery) {
        setFcStreak(res.data.mastery.studyStreak || 0);
        setFcRevisionGoal(res.data.mastery.dailyRevisionGoal || 5);
        setFcKnownList(res.data.mastery.knownCards || []);
        setFcRepetitionData(res.data.mastery.cardRepetition || []);
      }
    } catch (err) {
      console.error(err);
    }

    if (fcCurrentIdx < flashcardsList.length - 1) {
      setFcCurrentIdx(prev => prev + 1);
    } else {
      toast.success('Deck review completed!');
      setFcData(null);
      fetchUsageStats();
    }
  };

  // Keyboard flips for cards
  useEffect(() => {
    if (activeWorkspace !== 'flashcards' || !fcData) return;

    const handleKeyDown = (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setFcFlipped(prev => !prev);
      } else if (e.key === 'ArrowLeft' && fcFlipped) {
        handleCardOutcome(false);
      } else if (e.key === 'ArrowRight' && fcFlipped) {
        handleCardOutcome(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeWorkspace, fcData, fcCurrentIdx, fcFlipped, fcMasteredToday, fcKnownList]);

  // 6. Career Roadmap Advisor Submission
  const handleCareerAdviseSubmit = async (e) => {
    e.preventDefault();
    if (!careerRole) {
      toast.error('Please enter a target role to advise');
      return;
    }
    setCareerLoading(true);
    setCareerAdvice(null);
    setCareerStreamText('');

    const payload = {
      targetRole: careerRole,
      targetCompany: careerCompany
    };

    await handleStreamingRequest(
      '/ai/career-advisor',
      payload,
      (textSoFar) => {
        setCareerStreamText(textSoFar);
      },
      async (finalText) => {
        setCareerLoading(false);
        try {
          const response = cleanAndParseJSON(finalText);
          await fetchCareerRoadmaps();
          toast.success('Career Roadmap compiled and auto-saved');

          const roadRes = await API.get('/ai/career-roadmaps');
          if (roadRes.data?.success && roadRes.data.roadmaps.length > 0) {
            const latest = roadRes.data.roadmaps[0];
            setActiveCareerRoadmapId(latest._id);
            setCareerAdvice(latest.roadmap);
          } else {
            setCareerAdvice(response);
          }
        } catch (err) {
          console.error(err);
          toast.error('Roadmap advise completed with fallback parser mappings');
        }
      }
    );
  };

  // Grouped chats
  const groupedConversations = useMemo(() => {
    const today = [];
    const yesterday = [];
    const prev7Days = [];
    const older = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const startOf7DaysAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);

    const filtered = conversations.filter(c => {
      if (!workspaceSearchQuery) return true;
      return c.title.toLowerCase().includes(workspaceSearchQuery.toLowerCase());
    });

    filtered.forEach(c => {
      const date = new Date(c.updatedAt || c.createdAt);
      if (date >= startOfToday) today.push(c);
      else if (date >= startOfYesterday) yesterday.push(c);
      else if (date >= startOf7DaysAgo) prev7Days.push(c);
      else older.push(c);
    });

    return { today, yesterday, prev7Days, older };
  }, [conversations, workspaceSearchQuery]);

  // Generic Search Filter for histories
  const filteredStudyPlans = useMemo(() => {
    return studyPlans.filter(p => p.title.toLowerCase().includes(workspaceSearchQuery.toLowerCase()));
  }, [studyPlans, workspaceSearchQuery]);

  const filteredSummaries = useMemo(() => {
    return summaries.filter(s => s.title.toLowerCase().includes(workspaceSearchQuery.toLowerCase()));
  }, [summaries, workspaceSearchQuery]);

  const filteredQuizzes = useMemo(() => {
    return quizzes.filter(q => q.title.toLowerCase().includes(workspaceSearchQuery.toLowerCase()));
  }, [quizzes, workspaceSearchQuery]);

  const filteredFlashcardDecks = useMemo(() => {
    return flashcardDecks.filter(d => d.title.toLowerCase().includes(workspaceSearchQuery.toLowerCase()));
  }, [flashcardDecks, workspaceSearchQuery]);

  const filteredCareerRoadmaps = useMemo(() => {
    return careerRoadmaps.filter(r => r.title.toLowerCase().includes(workspaceSearchQuery.toLowerCase()));
  }, [careerRoadmaps, workspaceSearchQuery]);

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => doc.fileName.toLowerCase().includes(workspaceSearchQuery.toLowerCase()));
  }, [documents, workspaceSearchQuery]);

  // Color indexes for usage charts
  const COLORS = ['#8b5cf6', '#a78bfa', '#ec4899', '#f43f5e', '#3b82f6', '#06b6d4', '#10b981'];

  // Code Block custom rendering settings for ReactMarkdown to prevent direct classname assertion errors
  const customMarkdownComponents = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const codeText = String(children).replace(/\n$/, '');
      return !inline && match ? (
        <div className="relative group my-3 select-text">
          <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <button
              onClick={() => handleCopyText(codeText)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 text-slate-350 rounded-lg text-[10px] hover:bg-slate-800 active:scale-95 cursor-pointer shadow-md transition-all font-semibold"
            >
              <Copy className="w-3.5 h-3.5 text-indigo-400" />
              <span>Copy</span>
            </button>
          </div>
          <pre className="overflow-x-auto bg-[#0a0d14] p-4 rounded-xl border border-slate-850/80 text-slate-100 font-mono text-[11px] leading-relaxed shadow-inner">
            <code className={className} {...props}>
              {children}
            </code>
          </pre>
        </div>
      ) : (
        <code className="px-1.5 py-0.5 bg-slate-800/80 border border-slate-750 text-indigo-300 font-mono text-[11px] rounded leading-none" {...props}>
          {children}
        </code>
      );
    }
  };

  const renderSummaryHistory = (sumRecord) => {
    const sumObj = sumRecord?.summary;
    if (!sumObj) return <div className="text-xs text-slate-500">No data found in summary history</div>;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-850 pb-4">
          <div>
            <h4 className="text-sm font-black text-white">{sumRecord.title}</h4>
            <p className="text-[9px] text-slate-550 mt-0.5">Study Material Summary Details</p>
          </div>
          <button
            onClick={() => handleDownloadSummaryObj(sumRecord)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-[10px] font-bold text-slate-350 rounded-xl cursor-pointer animate-none"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Download MD</span>
          </button>
        </div>

        {/* Overview */}
        {sumObj.overview && (
          <div className="space-y-2">
            <h5 className="text-[10px] font-black uppercase tracking-wider text-pink-450">Executive Overview</h5>
            <div className="text-slate-200 text-xs leading-relaxed bg-slate-900/20 border border-slate-850/50 p-4 rounded-xl select-text">
              <ReactMarkdown>{sumObj.overview}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Key Takeaways / Concepts */}
        {sumObj.keyConcepts?.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Key Takeaways</h5>
            <ul className="space-y-2">
              {sumObj.keyConcepts.map((concept, idx) => (
                <li key={idx} className="flex gap-2 text-xs text-slate-300 bg-slate-900/10 border border-slate-850/40 p-3 rounded-lg select-text">
                  <span className="text-indigo-400 font-bold shrink-0">{idx + 1}.</span>
                  <span>{concept}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Definitions */}
        {sumObj.importantDefinitions?.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-[10px] font-black uppercase tracking-wider text-amber-450">Important Definitions</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sumObj.importantDefinitions.map((def, idx) => (
                <div key={idx} className="p-4 bg-slate-950/40 border border-slate-850/60 rounded-xl space-y-1.5 select-text">
                  <span className="block text-xs font-black text-white">{def.term}</span>
                  <span className="block text-xs text-slate-400 leading-relaxed">{def.definition}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Important Questions */}
        {sumObj.importantQuestions?.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-[10px] font-black uppercase tracking-wider text-blue-400">Potential Exam Questions</h5>
            <div className="space-y-3">
              {sumObj.importantQuestions.map((q, idx) => (
                <div key={idx} className="p-4 bg-slate-900/15 border border-slate-850 rounded-xl space-y-2 select-text">
                  <p className="text-xs font-bold text-white">Q: {q.question}</p>
                  <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/20 p-3 rounded-lg border border-slate-900">A: {q.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exam Tips */}
        {sumObj.examTips?.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-[10px] font-black uppercase tracking-wider text-rose-455 font-black">Exam Tips</h5>
            <div className="bg-rose-950/5 border border-rose-900/30 rounded-xl p-4.5 space-y-2">
              {sumObj.examTips.map((tip, idx) => (
                <div key={idx} className="flex gap-2 text-xs text-rose-350 select-text">
                  <span className="shrink-0">•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Revision Notes */}
        {sumObj.quickRevisionNotes && (
          <div className="space-y-2">
            <h5 className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Quick Revision Notes</h5>
            <div className="markdown-container text-slate-200 text-xs md:text-sm bg-slate-900/20 border border-slate-850 p-5 rounded-xl leading-relaxed select-text">
              <ReactMarkdown>{sumObj.quickRevisionNotes}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    );
  };

  const getHealthBadge = () => {
    if (!healthStatus) return { text: 'Loading...', color: 'text-slate-400 border-slate-800 bg-slate-900', tooltip: 'Fetching health status...' };
    const { activeProvider, providers } = healthStatus;
    
    if (activeProvider === 'Groq') {
      const latency = providers?.groq?.averageLatency || 0;
      return {
        text: '● Groq Active',
        color: 'text-emerald-450 border-emerald-500/20 bg-emerald-500/10',
        tooltip: `Latency: ${latency}ms`
      };
    } else if (activeProvider === 'OpenRouter') {
      const latency = providers?.openrouter?.averageLatency || 0;
      return {
        text: '● OpenRouter Active',
        color: 'text-amber-450 border-amber-500/20 bg-amber-500/10',
        tooltip: `Latency: ${latency}ms`
      };
    } else {
      return {
        text: '● Offline',
        color: 'text-rose-455 border-rose-500/20 bg-rose-500/10',
        tooltip: 'All providers are currently offline'
      };
    }
  };

  const badge = getHealthBadge();

  return (
    <div className="space-y-6 select-none relative">
      <SEO title="CampusBuddy Workspace Hub" description="Premium SaaS AI Assistant Workspace inside MyCampusOS for college learning and revision planner schedules." />

      {/* DASHBOARD CARD GRID VIEW (when activeWorkspace is null) */}
      <AnimatePresence>
        {!activeWorkspace && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Branding Hero Banner */}
            <div className="relative overflow-hidden p-8 rounded-3xl bg-gradient-to-br from-[#0e162e] via-[#090d20] to-[#040612] border border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
              <div className="space-y-2 text-center md:text-left z-10 max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full text-[10px] font-bold tracking-wider uppercase">
                  <Sparkle className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
                  <span>Meet CampusBuddy</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                  Your AI Learning and Productivity Copilot
                </h1>
                <p className="text-slate-450 text-xs md:text-sm leading-relaxed max-w-lg">
                  Explore personalized revision planner schedules, summarize notes vaults, practice flashcard Leitner boxes, and chat securely.
                </p>
              </div>
              <div className="shrink-0 p-4 bg-indigo-650/15 border border-indigo-600/25 rounded-2xl animate-pulse shadow-xl shadow-indigo-600/5">
                <Bot className="w-20 h-20 text-indigo-400" />
              </div>
            </div>

            {/* Feature Cards Grid (7 Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[
                {
                  key: 'chat',
                  title: 'CampusBuddy Chat',
                  desc: 'Ask questions, debug coursework logic, and review tasks in a modern ChatGPT style.',
                  icon: MessageSquare,
                  color: 'from-violet-550 to-indigo-600 shadow-violet-500/5 hover:border-violet-500/40',
                  iconColor: 'text-violet-400'
                },
                {
                  key: 'planner',
                  title: 'Study Planner',
                  desc: 'Auto-save customized schedules, milestones, daily targets, and subjects timelines.',
                  icon: CalendarDays,
                  color: 'from-blue-500 to-indigo-600 shadow-blue-500/5 hover:border-blue-500/40',
                  iconColor: 'text-blue-400'
                },
                {
                  key: 'summarizer',
                  title: 'Summarizer',
                  desc: 'Parse PDF/DOCX coursework to extract revision points and important formula decks.',
                  icon: FileText,
                  color: 'from-pink-500 to-rose-600 shadow-pink-500/5 hover:border-pink-500/40',
                  iconColor: 'text-pink-400'
                },
                {
                  key: 'quiz',
                  title: 'Quiz Engine',
                  desc: 'Practice dynamically compiled timed quizzes from syllabus topics and evaluate scores.',
                  icon: Brain,
                  color: 'from-emerald-500 to-teal-600 shadow-emerald-500/5 hover:border-emerald-500/40',
                  iconColor: 'text-emerald-400'
                },
                {
                  key: 'flashcards',
                  title: 'Flashcards',
                  desc: 'Master academic topics with Leitner Spaced Repetition decks and progress indicators.',
                  icon: Layers,
                  color: 'from-amber-500 to-orange-600 shadow-amber-500/5 hover:border-amber-500/40',
                  iconColor: 'text-amber-400'
                },
                {
                  key: 'career',
                  title: 'Career Advisor',
                  desc: 'Build target company skill roadmaps, ATS suggestions, and common mock interviews prep.',
                  icon: Briefcase,
                  color: 'from-cyan-500 to-blue-600 shadow-cyan-500/5 hover:border-cyan-500/40',
                  iconColor: 'text-cyan-400'
                },
                {
                  key: 'usage',
                  title: 'AI Usage Dashboard',
                  desc: 'Review total AI invocations, most active feature, daily trends charts, and scores logs.',
                  icon: BarChart3,
                  color: 'from-slate-500 to-slate-700 shadow-slate-500/5 hover:border-slate-500/40',
                  iconColor: 'text-slate-400'
                },
                {
                  key: 'settings',
                  title: 'AI Preference Settings',
                  desc: 'Configure preferred providers (Groq, OpenRouter, Auto) and fine-tune response preferences.',
                  icon: Settings,
                  color: 'from-slate-650 to-slate-800 shadow-slate-500/5 hover:border-slate-500/40',
                  iconColor: 'text-slate-400'
                }
              ].map(card => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={card.key}
                    whileHover={{ y: -6, scale: 1.015 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    onClick={() => {
                      setActiveWorkspace(card.key);
                      setWorkspaceSearchQuery('');
                    }}
                    className={`group relative overflow-hidden p-6 bg-[#0a0f1d]/85 hover:bg-[#0c1224] border border-slate-850 rounded-2xl cursor-pointer flex flex-col justify-between min-h-[175px] shadow-xl hover:shadow-2xl transition-all ${card.color}`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className={`p-3 rounded-xl bg-slate-900/90 border border-slate-800 ${card.iconColor}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="text-sm font-black text-white">{card.title}</h3>
                        <p className="text-slate-450 text-[11px] leading-relaxed pr-2">{card.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* POPUP FULLSCREEN WORKSPACE EXPERIENCE MODAL */}
      <AnimatePresence>
        {activeWorkspace && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragOver={(e) => {
              if (activeWorkspace === 'chat') {
                handleDragOver(e);
              }
            }}
            onDragLeave={(e) => {
              if (activeWorkspace === 'chat') {
                handleDragLeave(e);
              }
            }}
            onDrop={(e) => {
              if (activeWorkspace === 'chat') {
                handleDrop(e);
              }
            }}
            className="fixed inset-0 z-50 bg-[#060a15] flex flex-col md:flex-row overflow-hidden text-slate-200 select-text relative"
          >
            {/* WORKSPACE LEFT SIDEBAR */}
            <div className={`${isSidebarOpen ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-80 shrink-0 bg-[#090d19] border-r border-slate-850 flex-col h-full justify-between relative`}>
              
              <div className="flex flex-col space-y-4 p-5 flex-1 min-h-0">
                {/* Exit Back to Dashboard Button */}
                <button
                  onClick={() => {
                    setActiveWorkspace(null);
                    // clear selection ids
                    setActiveConversationId(null);
                    setActiveStudyPlanId(null);
                    setActiveSummaryId(null);
                    setActiveQuizId(null);
                    setActiveFlashcardDeckId(null);
                    setActiveCareerRoadmapId(null);
                    setGeneratedPlan(null);
                    setNoteSummaryData(null);
                    setQuizData(null);
                    setFcData(null);
                    setCareerAdvice(null);
                    setChatHistory([]);
                  }}
                  className="w-full py-2 bg-slate-900/80 hover:bg-slate-850 border border-slate-800 rounded-xl text-[11px] font-bold text-slate-350 flex items-center justify-center gap-1.5 cursor-pointer shadow transition-all active:scale-95"
                >
                  <ChevronLeft className="w-4 h-4 text-indigo-400" />
                  <span>Exit to Dashboard</span>
                </button>

                {/* Workspace Title Indicator */}
                <div className="flex items-center gap-2 px-1">
                  <Bot className="w-5 h-5 text-indigo-400 shrink-0" />
                  <span className="text-[11px] font-black tracking-wider uppercase text-slate-400 truncate">
                    {activeWorkspace === 'chat' && 'CampusBuddy Chat'}
                    {activeWorkspace === 'planner' && 'Study Planner'}
                    {activeWorkspace === 'summarizer' && 'Summarizer'}
                    {activeWorkspace === 'quiz' && 'Quiz Engine'}
                    {activeWorkspace === 'flashcards' && 'Flashcards'}
                    {activeWorkspace === 'career' && 'Career Advisor'}
                    {activeWorkspace === 'usage' && 'AI Analytics'}
                    {activeWorkspace === 'settings' && 'AI Preferences'}
                  </span>
                </div>

                {/* Chats vs Study Materials Sidebar tab toggles */}
                {activeWorkspace === 'chat' && (
                  <div className="flex p-1 bg-slate-950 border border-slate-850 rounded-xl gap-1">
                    <button
                      onClick={() => setSidebarTab('chats')}
                      className={`flex-1 py-1.5 rounded-lg text-center font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                        sidebarTab === 'chats'
                          ? 'bg-indigo-650 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Chats
                    </button>
                    <button
                      onClick={() => setSidebarTab('materials')}
                      className={`flex-1 py-1.5 rounded-lg text-center font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                        sidebarTab === 'materials'
                          ? 'bg-indigo-650 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Study Materials
                    </button>
                  </div>
                )}

                {/* CRUD: Action Creation Button */}
                {activeWorkspace !== 'usage' && (
                  <>
                    <button
                      onClick={() => {
                        if (activeWorkspace === 'chat') {
                          if (sidebarTab === 'chats') {
                            handleNewChat();
                          } else {
                            document.getElementById('sidebar-material-upload').click();
                          }
                        } else if (activeWorkspace === 'planner') handleNewStudyPlan();
                        else if (activeWorkspace === 'summarizer') handleNewSummary();
                        else if (activeWorkspace === 'quiz') handleNewQuiz();
                        else if (activeWorkspace === 'flashcards') handleNewFlashcardDeck();
                        else if (activeWorkspace === 'career') handleNewCareerRoadmap();
                      }}
                      className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-600 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer shadow shadow-indigo-650/10 transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>
                        {activeWorkspace === 'chat' && (sidebarTab === 'chats' ? 'New Chat' : 'New Material')}
                        {activeWorkspace === 'planner' && 'New Plan'}
                        {activeWorkspace === 'summarizer' && 'New Summary'}
                        {activeWorkspace === 'quiz' && 'New Quiz'}
                        {activeWorkspace === 'flashcards' && 'New Deck'}
                        {activeWorkspace === 'career' && 'New Roadmap'}
                      </span>
                    </button>
                    {activeWorkspace === 'chat' && (
                      <input
                        type="file"
                        id="sidebar-material-upload"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            uploadStudyMaterial(file);
                            e.target.value = '';
                          }
                        }}
                      />
                    )}
                  </>
                )}

                {/* Search sidebar elements input */}
                {activeWorkspace !== 'usage' && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder={activeWorkspace === 'chat' && sidebarTab === 'materials' ? "Search materials..." : "Search history..."}
                      value={workspaceSearchQuery}
                      onChange={(e) => setWorkspaceSearchQuery(e.target.value)}
                      className="w-full bg-[#0d1222]/80 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 pl-8.5 pr-3 text-xs text-white placeholder-slate-550 outline-none transition-colors"
                    />
                  </div>
                )}

                {/* Scrollable list viewport of prior saved items */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin select-none">
                  {/* Chat Session lists */}
                  {activeWorkspace === 'chat' && sidebarTab === 'chats' && (
                    <div className="space-y-4">
                      {['today', 'yesterday', 'prev7Days', 'older'].map(groupKey => {
                        const list = groupedConversations[groupKey];
                        if (list.length === 0) return null;
                        const label = groupKey === 'today' ? 'Today' : groupKey === 'yesterday' ? 'Yesterday' : groupKey === 'prev7Days' ? 'Previous 7 Days' : 'Older';
                        return (
                          <div key={groupKey} className="space-y-1">
                            <p className="text-[9px] font-black uppercase text-slate-550 pl-1 tracking-wider">{label}</p>
                            <div className="space-y-0.5">
                              {list.map(item => (
                                <div
                                  key={item._id}
                                  onClick={() => handleSelectConversation(item._id)}
                                  className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                                    activeConversationId === item._id
                                      ? 'bg-indigo-650 text-white font-semibold'
                                      : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0 pr-8">
                                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                    {editingItemId === item._id ? (
                                      <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleRenameItem('chat', item._id, editTitle);
                                          if (e.key === 'Escape') setEditingItemId(null);
                                        }}
                                        onClick={e => e.stopPropagation()}
                                        className="bg-slate-950 border border-indigo-500 rounded px-1.5 py-0.5 outline-none text-xs w-full text-white"
                                        autoFocus
                                      />
                                    ) : (
                                      <span className="truncate">{item.title}</span>
                                    )}
                                  </div>
                                  {editingItemId !== item._id && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 p-0.5 rounded border border-slate-800 z-10 shadow">
                                      <button onClick={(e) => { e.stopPropagation(); setEditingItemId(item._id); setEditTitle(item.title); }} className="p-0.5 text-slate-400 hover:text-indigo-400"><Edit className="w-3 h-3" /></button>
                                      <button onClick={(e) => handleTogglePin(item._id, e)} className={`p-0.5 ${item.isPinned ? 'text-amber-500' : 'text-slate-400 hover:text-amber-400'}`}><Pin className="w-3 h-3" /></button>
                                      <button onClick={(e) => handleToggleFavorite(item._id, e)} className={`p-0.5 ${item.isFavorite ? 'text-rose-500' : 'text-slate-400 hover:text-rose-450'}`}><Heart className="w-3 h-3" /></button>
                                      <button onClick={(e) => handleDuplicateChat(item._id, e)} className="p-0.5 text-slate-400 hover:text-indigo-400"><Copy className="w-3 h-3" /></button>
                                      <button onClick={(e) => { e.stopPropagation(); handleExportChat(item.title, chatHistory); }} className="p-0.5 text-slate-400 hover:text-indigo-400"><Download className="w-3 h-3" /></button>
                                      <button onClick={(e) => { e.stopPropagation(); handleDeleteItem('chat', item._id); }} className="p-0.5 text-slate-400 hover:text-rose-455"><Trash2 className="w-3 h-3" /></button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Study Materials List */}
                  {activeWorkspace === 'chat' && sidebarTab === 'materials' && (
                    <div className="space-y-4 select-none">
                      {/* Recent Materials */}
                      {documents.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase text-slate-550 pl-1 tracking-wider">Recent Materials</p>
                          <div className="space-y-1 bg-slate-950/45 border border-slate-850 rounded-xl p-1.5 shadow-inner">
                            {documents.slice(0, 3).map(doc => (
                              <div
                                key={`recent-${doc._id}`}
                                onClick={() => handleSelectDocument(doc._id)}
                                className={`group relative flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-all ${
                                  activeDocumentId === doc._id
                                    ? 'bg-indigo-650/80 text-white font-semibold'
                                    : 'text-slate-400 hover:bg-slate-900/35 hover:text-slate-200'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 pr-8">
                                  <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                  <span className="truncate text-[11px]">{doc.fileName}</span>
                                </div>
                                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 p-0.5 rounded border border-slate-800 z-10 shadow">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteDocument(doc._id);
                                    }}
                                    className="p-0.5 text-slate-400 hover:text-rose-455"
                                    title="Delete study material"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* All Materials list */}
                      <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase text-slate-550 pl-1 tracking-wider">All Study Materials</p>
                        {filteredDocuments.length === 0 ? (
                          <div className="text-center py-6 text-slate-600 text-[10px]">
                            No study materials found
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            {filteredDocuments.map(doc => (
                              <div
                                key={doc._id}
                                onClick={() => handleSelectDocument(doc._id)}
                                className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                                  activeDocumentId === doc._id
                                    ? 'bg-indigo-650 text-white font-semibold'
                                    : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 pr-8">
                                  <FileText className="w-3.5 h-3.5 text-indigo-405 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="truncate text-white font-semibold">{doc.fileName}</p>
                                    <p className="text-[9px] text-slate-550 group-hover:text-slate-400 mt-0.5">
                                      {(doc.fileSize / 1024 / 1024).toFixed(2)} MB • {doc.fileType?.split('/')[1]?.toUpperCase() || 'DOC'}
                                    </p>
                                  </div>
                                </div>
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 p-0.5 rounded border border-slate-800 z-10 shadow">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteDocument(doc._id);
                                    }}
                                    className="p-0.5 text-slate-400 hover:text-rose-455"
                                    title="Delete study material"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Study Plan History Lists */}
                  {activeWorkspace === 'planner' && (
                    <div className="space-y-0.5">
                      {filteredStudyPlans.map(item => (
                        <div
                          key={item._id}
                          onClick={() => handleSelectStudyPlan(item._id)}
                          className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                            activeStudyPlanId === item._id ? 'bg-indigo-650 text-white font-semibold' : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-8">
                            <CalendarDays className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            {editingItemId === item._id ? (
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRenameItem('planner', item._id, editTitle);
                                  if (e.key === 'Escape') setEditingItemId(null);
                                }}
                                onClick={e => e.stopPropagation()}
                                className="bg-slate-950 border border-indigo-500 rounded px-1 text-xs w-full text-white"
                                autoFocus
                              />
                            ) : (
                              <span className="truncate">{item.title}</span>
                            )}
                          </div>
                          {editingItemId !== item._id && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 p-0.5 rounded border border-slate-800 shadow">
                              <button onClick={(e) => { e.stopPropagation(); setEditingItemId(item._id); setEditTitle(item.title); }} className="p-0.5 text-slate-400 hover:text-indigo-450"><Edit className="w-3 h-3" /></button>
                              <button onClick={(e) => { e.stopPropagation(); handleDuplicateStudyPlan(item._id); }} className="p-0.5 text-slate-400 hover:text-indigo-400"><Copy className="w-3 h-3" /></button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteItem('planner', item._id); }} className="p-0.5 text-slate-400 hover:text-rose-450"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Summary History Lists */}
                  {activeWorkspace === 'summarizer' && (
                    <div className="space-y-0.5">
                      {filteredSummaries.map(item => (
                        <div
                          key={item._id}
                          onClick={() => handleSelectSummary(item._id)}
                          className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                            activeSummaryId === item._id ? 'bg-indigo-650 text-white font-semibold' : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-8">
                            <FileText className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                            {editingItemId === item._id ? (
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRenameItem('summarizer', item._id, editTitle);
                                  if (e.key === 'Escape') setEditingItemId(null);
                                }}
                                onClick={e => e.stopPropagation()}
                                className="bg-slate-950 border border-indigo-500 rounded px-1 text-xs w-full text-white"
                                autoFocus
                              />
                            ) : (
                              <span className="truncate">{item.title}</span>
                            )}
                          </div>
                          {editingItemId !== item._id && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 p-0.5 rounded border border-slate-800 shadow">
                              <button onClick={(e) => { e.stopPropagation(); setEditingItemId(item._id); setEditTitle(item.title); }} className="p-0.5 text-slate-400 hover:text-indigo-400"><Edit className="w-3 h-3" /></button>
                              <button onClick={(e) => { e.stopPropagation(); handleDownloadSummaryObj(item); }} className="p-0.5 text-slate-400 hover:text-indigo-400"><Download className="w-3 h-3" /></button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteItem('summarizer', item._id); }} className="p-0.5 text-slate-400 hover:text-rose-450"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quiz History Lists */}
                  {activeWorkspace === 'quiz' && (
                    <div className="space-y-0.5">
                      {filteredQuizzes.map(item => (
                        <div
                          key={item._id}
                          onClick={() => handleSelectQuiz(item._id)}
                          className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                            activeQuizId === item._id ? 'bg-indigo-650 text-white font-semibold' : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-8">
                            <Brain className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            {editingItemId === item._id ? (
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRenameItem('quiz', item._id, editTitle);
                                  if (e.key === 'Escape') setEditingItemId(null);
                                }}
                                onClick={e => e.stopPropagation()}
                                className="bg-slate-950 border border-indigo-500 rounded px-1 text-xs w-full text-white"
                                autoFocus
                              />
                            ) : (
                              <span className="truncate">{item.title}</span>
                            )}
                          </div>
                          {editingItemId !== item._id && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 p-0.5 rounded border border-slate-800 shadow">
                              <button onClick={(e) => { e.stopPropagation(); setEditingItemId(item._id); setEditTitle(item.title); }} className="p-0.5 text-slate-400 hover:text-indigo-400"><Edit className="w-3 h-3" /></button>
                              <button onClick={(e) => { e.stopPropagation(); handleSelectQuiz(item._id); handleRetryQuiz(); }} className="p-0.5 text-slate-400 hover:text-indigo-400" title="Retake"><RefreshCw className="w-3 h-3" /></button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteItem('quiz', item._id); }} className="p-0.5 text-slate-400 hover:text-rose-450"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Flashcard History Lists */}
                  {activeWorkspace === 'flashcards' && (
                    <div className="space-y-0.5">
                      {filteredFlashcardDecks.map(item => (
                        <div
                          key={item._id}
                          onClick={() => handleSelectFlashcardDeck(item._id)}
                          className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                            activeFlashcardDeckId === item._id ? 'bg-indigo-650 text-white font-semibold' : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-8">
                            <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            {editingItemId === item._id ? (
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRenameItem('flashcards', item._id, editTitle);
                                  if (e.key === 'Escape') setEditingItemId(null);
                                }}
                                onClick={e => e.stopPropagation()}
                                className="bg-slate-950 border border-indigo-500 rounded px-1 text-xs w-full text-white"
                                autoFocus
                              />
                            ) : (
                              <span className="truncate">{item.title}</span>
                            )}
                          </div>
                          {editingItemId !== item._id && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 p-0.5 rounded border border-slate-800 shadow">
                              <button onClick={(e) => { e.stopPropagation(); setEditingItemId(item._id); setEditTitle(item.title); }} className="p-0.5 text-slate-400 hover:text-indigo-400"><Edit className="w-3 h-3" /></button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteItem('flashcards', item._id); }} className="p-0.5 text-slate-400 hover:text-rose-450"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Career Roadmap History Lists */}
                  {activeWorkspace === 'career' && (
                    <div className="space-y-0.5">
                      {filteredCareerRoadmaps.map(item => (
                        <div
                          key={item._id}
                          onClick={() => handleSelectCareerRoadmap(item._id)}
                          className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                            activeCareerRoadmapId === item._id ? 'bg-indigo-650 text-white font-semibold' : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-8">
                            <Briefcase className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            {editingItemId === item._id ? (
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRenameItem('career', item._id, editTitle);
                                  if (e.key === 'Escape') setEditingItemId(null);
                                }}
                                onClick={e => e.stopPropagation()}
                                className="bg-slate-950 border border-indigo-500 rounded px-1 text-xs w-full text-white"
                                autoFocus
                              />
                            ) : (
                              <span className="truncate">{item.title}</span>
                            )}
                          </div>
                          {editingItemId !== item._id && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 p-0.5 rounded border border-slate-800 shadow">
                              <button onClick={(e) => { e.stopPropagation(); setEditingItemId(item._id); setEditTitle(item.title); }} className="p-0.5 text-slate-400 hover:text-indigo-400"><Edit className="w-3 h-3" /></button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteItem('career', item._id); }} className="p-0.5 text-slate-400 hover:text-rose-450"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty state for sidebars */}
                  {activeWorkspace !== 'usage' && workspaceSearchQuery && (
                    <div className="text-[10px] text-slate-500 text-center py-4">No matching history items</div>
                  )}
                </div>

              </div>

              {/* Sidebar bottom */}
              <div className="p-4 border-t border-slate-850 flex items-center justify-between text-slate-500 text-[9px] font-bold">
                <span>Powered by Gemini v2.5</span>
                <span>Active</span>
              </div>
            </div>

            {/* WORKSPACE MAIN INTERACTION AREA */}
            <div className="flex-1 flex flex-col h-full bg-[#070b16] relative overflow-hidden">
              {/* Workspace Top Header Bar */}
              <div className="flex items-center justify-between px-6 py-4 bg-[#090d1a] border-b border-slate-850 z-20 shadow-md">
                <div className="flex items-center gap-3">
                  {/* Collapsible toggle for mobile sidebar drawer */}
                  <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 border border-slate-800 rounded-xl hover:bg-slate-900 text-slate-350 cursor-pointer flex md:hidden active:scale-95"
                  >
                    <Menu className="w-4 h-4" />
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-black text-white select-text">
                        {activeWorkspace === 'chat' && 'CampusBuddy Assistant'}
                        {activeWorkspace === 'planner' && 'Custom Revision timetables'}
                        {activeWorkspace === 'summarizer' && 'Lecture Note Summaries'}
                        {activeWorkspace === 'quiz' && 'Syllabus Quiz Engine'}
                        {activeWorkspace === 'flashcards' && 'Spaced Repetition Decks'}
                        {activeWorkspace === 'career' && 'Target Company Career Advisor'}
                        {activeWorkspace === 'usage' && 'AI Calls usage statistics'}
                        {activeWorkspace === 'settings' && 'AI Preference Settings'}
                      </h2>
                      {healthStatus && (
                        <div
                          title={badge.tooltip}
                          className={`px-2 py-0.5 border text-[9px] font-black uppercase tracking-wider rounded-full cursor-help transition-all ${badge.color}`}
                        >
                          {badge.text}
                        </div>
                      )}
                    </div>
                    <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mt-0.5 select-text">
                      {activeWorkspace === 'chat' && (activeConversationId ? conversations.find(c => c._id === activeConversationId)?.title : 'New Workspace Conversation')}
                      {activeWorkspace === 'planner' && (activeStudyPlanId ? studyPlans.find(p => p._id === activeStudyPlanId)?.title : 'New Revision Planner')}
                      {activeWorkspace === 'summarizer' && (activeSummaryId ? summaries.find(s => s._id === activeSummaryId)?.title : 'New File Summary')}
                      {activeWorkspace === 'quiz' && (activeQuizId ? quizzes.find(q => q._id === activeQuizId)?.title : 'New Custom Quiz')}
                      {activeWorkspace === 'flashcards' && (activeFlashcardDeckId ? flashcardDecks.find(d => d._id === activeFlashcardDeckId)?.title : 'New Mastery Deck')}
                      {activeWorkspace === 'career' && (activeCareerRoadmapId ? careerRoadmaps.find(r => r._id === activeCareerRoadmapId)?.title : 'New Career Roadmap')}
                      {activeWorkspace === 'usage' && 'Productivity statistics'}
                      {activeWorkspace === 'settings' && 'Provider Configurations'}
                    </p>
                  </div>
                </div>

                {/* Cancel Stream Request Trigger */}
                {abortController && (
                  <button
                    onClick={handleCancelRequest}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950 border border-rose-800/60 rounded-xl text-rose-350 hover:bg-rose-900 transition-colors text-[10px] cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Stop generation</span>
                  </button>
                )}
              </div>

              {/* Workspace specific layout body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin select-text">
                
                {/* 1. CAMPUSBUDDY CHAT & STUDY MATERIAL WORKSPACE */}
                {activeWorkspace === 'chat' && (
                  activeDocumentId ? (
                    // Enhanced Document Viewer Workspace
                    <div className="flex flex-col h-full max-w-4xl mx-auto space-y-6 select-text relative pb-20 md:pb-6">
                      {/* Back button header */}
                      <div className="flex items-center justify-between bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              setActiveDocumentId(null);
                              setActiveDocumentDetails(null);
                              setActiveHistoryItem(null);
                              if (window.innerWidth < 768) {
                                setIsSidebarOpen(true);
                              }
                            }}
                            className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-white cursor-pointer hover:bg-slate-900 transition-colors flex items-center gap-1 text-xs"
                          >
                            <ChevronLeft className="w-4 h-4 text-indigo-400" />
                            <span>All Materials</span>
                          </button>
                          <div className="min-w-0">
                            <h3 className="text-sm font-black text-white truncate select-text">
                              {activeDocumentDetails?.fileName || 'Loading study material...'}
                            </h3>
                            <p className="text-[9px] text-slate-550 uppercase tracking-wider font-bold">
                              Study Material Workspace
                            </p>
                          </div>
                        </div>

                        {/* Download original document */}
                        {activeDocumentDetails && (
                          <a
                            href={activeDocumentDetails.fileUrl}
                            download
                            target="_blank"
                            rel="noreferrer"
                            className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-indigo-400 cursor-pointer hover:bg-slate-900 transition-colors"
                            title="Download original file"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                      </div>

                      {/* Display History Item if activeHistoryItem is set */}
                      {activeHistoryItem ? (
                        <div className="flex-1 flex flex-col space-y-4">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => setActiveHistoryItem(null)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-855 border border-slate-800 rounded-xl text-[10px] text-indigo-305 font-bold cursor-pointer transition-colors"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                              <span>Back to Material details</span>
                            </button>
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                              Viewing: {activeHistoryItem.type.toUpperCase()}
                            </div>
                          </div>

                          {/* Render history item content */}
                          <div className="flex-1 bg-[#090d19]/40 border border-slate-850 rounded-2xl p-6 backdrop-blur-md overflow-y-auto max-h-[600px] scrollbar-thin select-text">
                            {activeHistoryItem.type === 'summary' && renderSummaryHistory(activeHistoryItem.data)}
                            {activeHistoryItem.type === 'quiz' && (
                              <InteractiveHistoryQuiz
                                quizRecord={activeHistoryItem.data}
                                docId={activeDocumentId}
                                fetchDocumentDetails={fetchDocumentDetails}
                              />
                            )}
                            {activeHistoryItem.type === 'flashcard' && (
                              <InteractiveHistoryFlashcard
                                deckRecord={activeHistoryItem.data}
                                docId={activeDocumentId}
                                fetchDocumentDetails={fetchDocumentDetails}
                              />
                            )}
                          </div>
                        </div>
                      ) : (
                        // Document details, one-click actions, status, history lists, coming soon
                        <div className="space-y-6 flex-1 overflow-y-auto pr-1 scrollbar-thin select-text">
                          
                          {/* File metadata cards */}
                          {activeDocumentDetails ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                              {[
                                { label: 'File Format', value: activeDocumentDetails.fileType?.split('/')[1]?.toUpperCase() || 'DOC', color: 'text-indigo-400' },
                                { label: 'File Size', value: `${(activeDocumentDetails.fileSize / 1024 / 1024).toFixed(2)} MB`, color: 'text-blue-400' },
                                { label: 'Upload Date', value: new Date(activeDocumentDetails.createdAt).toLocaleDateString(), color: 'text-pink-400' },
                                { label: 'Status', value: activeDocumentDetails.text ? 'Analyzed' : 'No text content', color: activeDocumentDetails.text ? 'text-emerald-400' : 'text-amber-400' }
                              ].map((m, idx) => (
                                <div key={idx} className="bg-slate-900/40 border border-slate-850 p-4 rounded-xl text-center space-y-1">
                                  <span className="block text-[9px] font-black uppercase text-slate-550 tracking-wider">{m.label}</span>
                                  <span className={`block text-xs font-bold ${m.color}`}>{m.value}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center py-10">
                              <Loader className="w-6 h-6 text-indigo-400 animate-spin" />
                            </div>
                          )}

                          {/* Progressive status tracker */}
                          {docActionStatus && (
                            <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-xl p-4 flex items-center justify-between animate-pulse">
                              <div className="flex items-center gap-2">
                                <Loader className="w-4 h-4 text-indigo-450 animate-spin" />
                                <span className="text-xs font-bold text-indigo-300">
                                  {docActionStatus}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500">Please do not navigate away</span>
                            </div>
                          )}

                          {/* One-Click Action Grid */}
                          <div className="space-y-2">
                            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-450">One-Click AI Study Actions</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {[
                                { key: 'summarize', label: 'Summarize', desc: 'Core study summaries', icon: FileText, color: 'hover:border-pink-500/40 hover:bg-pink-950/5 text-pink-450' },
                                { key: 'flashcards', label: 'Flashcards', desc: 'Spaced Leitner boxes', icon: Layers, color: 'hover:border-amber-500/40 hover:bg-amber-950/5 text-amber-450' },
                                { key: 'quiz', label: 'Quiz', desc: 'Timed practice quizzes', icon: Brain, color: 'hover:border-emerald-500/40 hover:bg-emerald-950/5 text-emerald-450' },
                                { key: 'notes', label: 'Study Notes', desc: 'Formulas & notes guide', icon: BookOpen, color: 'hover:border-blue-500/40 hover:bg-blue-950/5 text-blue-450' }
                              ].map(act => {
                                const Icon = act.icon;
                                return (
                                  <button
                                    key={act.key}
                                    onClick={() => handleDocumentAction(activeDocumentId, act.key)}
                                    disabled={!!docActionStatus || !activeDocumentDetails?.text}
                                    className={`p-5 bg-slate-900/30 hover:bg-slate-850/40 border border-slate-850 rounded-xl text-left cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none group ${act.color}`}
                                  >
                                    <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg w-fit mb-3 group-hover:scale-105 transition-transform">
                                      <Icon className="w-4 h-4" />
                                    </div>
                                    <span className="block text-xs font-black text-white">{act.label}</span>
                                    <span className="block text-[9px] text-slate-500 mt-1 leading-normal">{act.desc}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Generated Content History list */}
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-455">Generated Output History</h4>
                            
                            {activeDocumentDetails && (
                              (!activeDocumentDetails.generatedSummaries?.length &&
                               !activeDocumentDetails.generatedQuizzes?.length &&
                               !activeDocumentDetails.generatedFlashcards?.length) ? (
                                <div className="bg-[#080c18]/30 border border-slate-850 rounded-xl p-8 text-center text-slate-500 text-xs">
                                  No generated history yet. Select one-click action card to compile.
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  {/* Summaries list */}
                                  {activeDocumentDetails.generatedSummaries?.length > 0 && (
                                    <div className="space-y-2">
                                      <h5 className="text-[9px] font-black uppercase tracking-wider text-slate-550">Summaries & Study Notes</h5>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {activeDocumentDetails.generatedSummaries.map(item => (
                                          item.summaryId && (
                                            <div
                                              key={item.summaryId._id}
                                              onClick={() => setActiveHistoryItem({ type: 'summary', data: item.summaryId })}
                                              className="group p-4 bg-slate-900/35 border border-slate-850 rounded-xl hover:border-slate-705 transition-colors flex items-center justify-between cursor-pointer"
                                            >
                                              <div className="flex items-center gap-2.5 min-w-0 pr-4">
                                                <div className="p-1.5 bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded-lg">
                                                  <FileText className="w-3.5 h-3.5" />
                                                </div>
                                                <div className="min-w-0">
                                                  <p className="text-xs font-bold text-white truncate">{item.summaryId.title || 'Summary'}</p>
                                                  <p className="text-[9px] text-slate-550 mt-0.5">{new Date(item.createdAt).toLocaleDateString()}</p>
                                                </div>
                                              </div>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteLinkedOutput(activeDocumentId, 'summary', item.summaryId._id);
                                                }}
                                                className="p-1 text-slate-455 hover:text-rose-455 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Delete summary"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          )
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Flashcard lists */}
                                  {activeDocumentDetails.generatedFlashcards?.length > 0 && (
                                    <div className="space-y-2">
                                      <h5 className="text-[9px] font-black uppercase tracking-wider text-slate-550">Flashcard Decks</h5>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {activeDocumentDetails.generatedFlashcards.map(item => (
                                          item.deckId && (
                                            <div
                                              key={item.deckId._id}
                                              onClick={() => setActiveHistoryItem({ type: 'flashcard', data: item.deckId })}
                                              className="group p-4 bg-slate-900/35 border border-slate-850 rounded-xl hover:border-slate-705 transition-colors flex items-center justify-between cursor-pointer"
                                            >
                                              <div className="flex items-center gap-2.5 min-w-0 pr-4">
                                                <div className="p-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg">
                                                  <Layers className="w-3.5 h-3.5" />
                                                </div>
                                                <div className="min-w-0">
                                                  <p className="text-xs font-bold text-white truncate">{item.deckId.title || 'Flashcard Deck'}</p>
                                                  <p className="text-[9px] text-slate-550 mt-0.5">{item.deckId.cardCount || 0} cards • {new Date(item.createdAt).toLocaleDateString()}</p>
                                                </div>
                                              </div>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteLinkedOutput(activeDocumentId, 'flashcard', item.deckId._id);
                                                }}
                                                className="p-1 text-slate-455 hover:text-rose-455 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Delete deck"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          )
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Quizzes lists */}
                                  {activeDocumentDetails.generatedQuizzes?.length > 0 && (
                                    <div className="space-y-2">
                                      <h5 className="text-[9px] font-black uppercase tracking-wider text-slate-550">Practice Quizzes</h5>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {activeDocumentDetails.generatedQuizzes.map(item => (
                                          item.quizId && (
                                            <div
                                              key={item.quizId._id}
                                              onClick={() => setActiveHistoryItem({ type: 'quiz', data: item.quizId })}
                                              className="group p-4 bg-slate-900/35 border border-slate-850 rounded-xl hover:border-slate-705 transition-colors flex items-center justify-between cursor-pointer"
                                            >
                                              <div className="flex items-center gap-2.5 min-w-0 pr-4">
                                                <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
                                                  <Brain className="w-3.5 h-3.5" />
                                                </div>
                                                <div className="min-w-0">
                                                  <p className="text-xs font-bold text-white truncate">{item.quizId.title || 'Quiz'}</p>
                                                  <p className="text-[9px] text-slate-550 mt-0.5">{item.quizId.questionCount || 0} questions • {new Date(item.createdAt).toLocaleDateString()}</p>
                                                </div>
                                              </div>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteLinkedOutput(activeDocumentId, 'quiz', item.quizId._id);
                                                }}
                                                className="p-1 text-slate-455 hover:text-rose-455 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Delete quiz"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          )
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            )}
                          </div>

                          {/* Coming Soon Placeholders */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-450">Future AI Features</h4>
                              <span className="px-2 py-0.5 bg-slate-800 border border-slate-750 text-indigo-400 text-[8px] font-bold rounded-full uppercase tracking-widest">Coming Soon</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              {[
                                { title: 'Audio Lectures', desc: 'Transform documents into podcasts', label: '🎙 Audio Lectures' },
                                { title: 'Video Lectures', desc: 'Create visuals & explanations', label: '🎥 Video Lectures' },
                                { title: 'YouTube Analysis', desc: 'Link videos & generate insights', label: '🔗 YouTube Analysis' }
                              ].map((f, idx) => (
                                <div key={idx} className="p-4 bg-slate-950/30 border border-slate-850/60 rounded-xl opacity-50 cursor-not-allowed text-left select-none">
                                  <span className="block text-xs font-bold text-slate-300">{f.label}</span>
                                  <span className="block text-[9px] text-slate-550 mt-1 leading-relaxed">{f.desc}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                        </div>
                      )}

                      {/* Mobile Bottom Action Bar */}
                      <div className="flex md:hidden fixed bottom-0 left-0 right-0 bg-[#090d19]/90 backdrop-blur-lg border-t border-slate-855 p-3 justify-around gap-2 z-40">
                        <button
                          onClick={() => document.getElementById('mobile-material-upload').click()}
                          className="flex-1 py-2 bg-slate-905 border border-slate-800 hover:bg-slate-850 rounded-xl text-[10px] font-bold text-white flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 animate-none"
                        >
                          <FileUp className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Upload</span>
                        </button>
                        <button
                          onClick={() => handleDocumentAction(activeDocumentId, 'summarize')}
                          disabled={!!docActionStatus || !activeDocumentDetails?.text}
                          className="flex-1 py-2 bg-slate-905 border border-slate-800 hover:bg-slate-850 rounded-xl text-[10px] font-bold text-white flex flex-col items-center justify-center gap-1 disabled:opacity-40 cursor-pointer active:scale-95 animate-none"
                        >
                          <FileText className="w-3.5 h-3.5 text-pink-450" />
                          <span>Summarize</span>
                        </button>
                        <button
                          onClick={() => handleDocumentAction(activeDocumentId, 'quiz')}
                          disabled={!!docActionStatus || !activeDocumentDetails?.text}
                          className="flex-1 py-2 bg-slate-905 border border-slate-800 hover:bg-slate-850 rounded-xl text-[10px] font-bold text-white flex flex-col items-center justify-center gap-1 disabled:opacity-40 cursor-pointer active:scale-95 animate-none"
                        >
                          <Brain className="w-3.5 h-3.5 text-emerald-450" />
                          <span>Quiz</span>
                        </button>
                        <button
                          onClick={() => handleDocumentAction(activeDocumentId, 'flashcards')}
                          disabled={!!docActionStatus || !activeDocumentDetails?.text}
                          className="flex-1 py-2 bg-slate-905 border border-slate-800 hover:bg-slate-850 rounded-xl text-[10px] font-bold text-white flex flex-col items-center justify-center gap-1 disabled:opacity-40 cursor-pointer active:scale-95 animate-none"
                        >
                          <Layers className="w-3.5 h-3.5 text-amber-450" />
                          <span>Flashcards</span>
                        </button>
                        <input
                          type="file"
                          id="mobile-material-upload"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              uploadStudyMaterial(file);
                              e.target.value = '';
                            }
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    // Regular conversational ChatGPT style Chat messages
                    <div className="flex flex-col h-full justify-between gap-4 max-w-4xl mx-auto">
                      {/* Chat Messages */}
                      <div className="flex-1 overflow-y-auto space-y-5 pr-1 pb-4 scrollbar-none select-text">
                        {chatHistory.length === 0 ? (
                          <div className="flex flex-col items-center justify-center text-center py-28 text-slate-555 space-y-4">
                            <Bot className="w-16 h-16 text-indigo-400/80 animate-bounce" />
                            <div className="space-y-1.5">
                              <h3 className="text-sm font-bold text-white">Welcome to CampusBuddy</h3>
                              <p className="text-slate-450 text-[11px] leading-relaxed max-w-sm">
                                Attach study materials (PDFs, Word docs, PowerPoint slides, Excel spreadsheets) and ask me to summarize, quiz, or generate flashcards!
                              </p>
                            </div>
                          </div>
                        ) : (
                          chatHistory.map((msg, i) => (
                            <div
                              key={i}
                              className={`flex items-start gap-3.5 text-xs ${
                                msg.role === 'user' ? 'justify-end' : 'justify-start'
                              }`}
                            >
                              {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-500 border border-indigo-400/30 flex items-center justify-center font-bold text-white shrink-0 shadow shadow-indigo-650/15 animate-none">
                                  CB
                                </div>
                              )}
                              <div
                                className={`rounded-2xl max-w-[70%] select-text relative group transition-all ${
                                  msg.role === 'user'
                                    ? 'p-4 md:p-5 bg-gradient-to-tr from-purple-650 to-indigo-600 border border-purple-550/20 text-white rounded-tr-none shadow shadow-purple-650/15 animate-none'
                                    : 'p-5 md:p-6 bg-slate-900/45 border border-slate-850 text-slate-100 rounded-tl-none backdrop-blur-md shadow-md'
                                }`}
                              >
                                {msg.role === 'assistant' ? (
                                  <div className="markdown-container text-slate-200 text-xs md:text-sm animate-none">
                                    <ReactMarkdown components={customMarkdownComponents}>
                                      {msg.content}
                                    </ReactMarkdown>
                                  </div>
                                ) : (
                                  <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>
                                )}
                                <span className="block text-[8px] text-right mt-2 opacity-35">
                                  {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          ))
                        )}

                        {/* Loading Skeletal */}
                        {chatLoading && chatHistory[chatHistory.length - 1]?.content === '' && (
                          <div className="flex items-start gap-3.5 text-xs justify-start">
                            <div className="w-8 h-8 rounded-xl bg-indigo-650 border border-indigo-500/20 flex items-center justify-center font-bold text-white shrink-0 animate-pulse">
                              CB
                            </div>
                            <div className="bg-slate-900/40 border border-slate-850 text-slate-400 p-4 rounded-2xl rounded-tl-none flex flex-col gap-2 max-w-[300px] w-full shadow backdrop-blur">
                              <div className="flex items-center gap-1.5 font-semibold text-indigo-400 mb-1">
                                <Loader className="w-3.5 h-3.5 animate-spin" />
                                <span>Thinking...</span>
                              </div>
                              <div className="h-2 w-full bg-slate-800 rounded animate-pulse" />
                              <div className="h-2 w-5/6 bg-slate-800 rounded animate-pulse" />
                              <div className="h-2 w-2/3 bg-slate-800 rounded animate-pulse" />
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Chat Input form */}
                      <div className="space-y-2">
                        {/* Attached File Preview Tag */}
                        {uploadedFile && (
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-950/60 border border-indigo-855 rounded-xl text-[10px] text-indigo-300">
                            <FileText className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="truncate max-w-[200px] font-semibold">{uploadedFile.name}</span>
                            <button
                              type="button"
                              onClick={() => setUploadedFile(null)}
                              className="text-indigo-400 hover:text-indigo-200 cursor-pointer outline-none ml-1 active:scale-90 transition-transform"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        {isUploading && (
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-xl text-[10px] text-slate-400">
                            <Loader className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                            <span>Processing file extraction...</span>
                          </div>
                        )}

                        <form
                          onSubmit={handleChatSubmit}
                          className="bg-[#0b0f1d] border border-slate-855 p-2 rounded-2xl flex items-end gap-2 relative shadow shadow-slate-900/40"
                        >
                          {/* Hidden input trigger for attachments */}
                          <label
                            title="Upload PDF, DOCX, PPTX, XLSX"
                            className="p-3 bg-slate-905 hover:bg-slate-850 border border-slate-800 rounded-xl text-slate-450 hover:text-indigo-455 transition-colors cursor-pointer active:scale-95 shadow animate-none"
                          >
                            <FileUp className="w-4 h-4 text-indigo-400" />
                            <input
                              type="file"
                              onChange={handleFileUpload}
                              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                              className="hidden"
                            />
                          </label>

                          <button
                            type="button"
                            className="p-3 bg-slate-905 hover:bg-slate-850 border border-slate-800 rounded-xl text-slate-450 hover:text-indigo-455 transition-colors cursor-pointer active:scale-95 shadow hidden sm:flex animate-none"
                            title="Voice input"
                          >
                            <Mic className="w-4 h-4" />
                          </button>

                          <textarea
                            ref={textareaRef}
                            rows={1}
                            value={chatMessage}
                            onChange={(e) => setChatMessage(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleChatSubmit(e);
                              }
                            }}
                            placeholder="Ask CampusBuddy a question..."
                            className="flex-1 bg-[#10162a]/20 border border-slate-800 focus:border-indigo-650/80 rounded-xl py-3 px-4 text-xs text-white placeholder-slate-550 outline-none transition-all resize-none max-h-36 scrollbar-thin leading-relaxed"
                          />

                          <button
                            type="submit"
                            disabled={chatLoading || (!chatMessage.trim() && !uploadedFile)}
                            className="p-3 bg-indigo-650 hover:bg-indigo-600 rounded-xl text-white transition-colors cursor-pointer disabled:opacity-40 disabled:hover:bg-indigo-650 active:scale-95 shadow shadow-indigo-650/15 animate-none"
                            aria-label="Send query"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </form>
                      </div>
                    </div>
                  )
                )}

                {/* 2. STUDY PLANNER INTERACTION */}
                {activeWorkspace === 'planner' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-6xl mx-auto">
                    {/* Setup Form */}
                    <div className="lg:col-span-4 bg-[#0a0f1e]/60 border border-slate-850 p-6 rounded-2xl h-fit space-y-4">
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Plan settings</h3>
                      <form onSubmit={handleGenerateStudyPlan} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black uppercase text-slate-450 tracking-wider">Subject Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Distributed Database Management"
                            value={planSubject}
                            onChange={(e) => setPlanSubject(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:border-indigo-500 outline-none"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black uppercase text-slate-450 tracking-wider">Exam Date</label>
                          <input
                            type="date"
                            value={planExamDate}
                            onChange={(e) => setPlanExamDate(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white outline-none cursor-pointer"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black uppercase text-slate-450 tracking-wider">Daily Hours</label>
                          <input
                            type="number"
                            min="1"
                            max="12"
                            value={planHours}
                            onChange={(e) => setPlanHours(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white outline-none"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="block text-[10px] font-black uppercase text-slate-450 tracking-wider">Syllabus Input Mode</label>
                            <button
                              type="button"
                              onClick={() => setUseNoteInput(!useNoteInput)}
                              className="text-[9px] text-indigo-400 font-bold hover:underline"
                            >
                              {useNoteInput ? 'Switch to text inputs' : 'Select from Notes'}
                            </button>
                          </div>

                          {useNoteInput ? (
                            <select
                              value={selectedNoteId}
                              onChange={(e) => setSelectedNoteId(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white outline-none cursor-pointer focus:border-indigo-550"
                            >
                              <option value="">-- Choose Note File --</option>
                              {notesList.map(n => (
                                <option key={n._id} value={n._id}>{n.title}</option>
                              ))}
                            </select>
                          ) : (
                            <textarea
                              placeholder="Type major topics separated by commas..."
                              value={planTopics}
                              onChange={(e) => setPlanTopics(e.target.value)}
                              rows={3}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-indigo-550 resize-none"
                            />
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={planLoading}
                          className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-600 disabled:opacity-40 text-xs font-bold text-white rounded-xl cursor-pointer active:scale-95 transition-all shadow"
                        >
                          {planLoading ? 'Generating Planner...' : 'Build study plan'}
                        </button>
                      </form>
                    </div>

                    {/* Output Schedule Panel */}
                    <div className="lg:col-span-8 space-y-4">
                      {planLoading && (
                        <div className="bg-[#0a0f1e]/40 border border-slate-850 p-6 rounded-2xl space-y-4 animate-pulse">
                          <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                            <Loader className="w-3.5 h-3.5 animate-spin" />
                            <span>Building plan structure...</span>
                          </h4>
                          <div className="space-y-2">
                            <div className="h-4 w-full bg-slate-900 rounded" />
                            <div className="h-4 w-5/6 bg-slate-900 rounded" />
                            <div className="h-4 w-4/5 bg-slate-900 rounded" />
                          </div>
                          <div className="pt-4 font-mono text-[10px] text-slate-500 whitespace-pre-wrap truncate h-40">
                            {plannerStreamText}
                          </div>
                        </div>
                      )}

                      {!generatedPlan && !planLoading && (
                        <div className="flex flex-col items-center justify-center text-center py-28 border border-dashed border-slate-800 rounded-2xl text-slate-550 space-y-3">
                          <CalendarDays className="w-10 h-10 text-slate-700" />
                          <p className="text-xs">No active study planner loaded. Set course inputs on the left to compute schedules.</p>
                        </div>
                      )}

                      {generatedPlan && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="space-y-6 select-text"
                        >
                          {/* Priority Topics */}
                          {generatedPlan.priorityTopics && generatedPlan.priorityTopics.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-black uppercase tracking-wider text-slate-450">Priority Focus Topics</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {generatedPlan.priorityTopics.map((pt, idx) => (
                                  <div key={idx} className="p-4 bg-slate-900/50 border border-slate-850 rounded-xl space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-white text-xs">{pt.topic}</span>
                                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                        pt.importance === 'High' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                                      }`}>{pt.importance}</span>
                                    </div>
                                    <p className="text-slate-450 text-[10px] leading-relaxed">{pt.reason}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Timetable Schedule */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-450 font-heading">Timetable Schedule</h4>
                            <div className="overflow-hidden border border-slate-850 rounded-xl bg-slate-900/25">
                              <table className="w-full border-collapse text-left text-xs">
                                <thead>
                                  <tr className="bg-slate-900/80 text-slate-400 font-bold border-b border-slate-850">
                                    <th className="p-3.5">Day</th>
                                    <th className="p-3.5">Revision Topics</th>
                                    <th className="p-3.5">Daily milestone targets</th>
                                    <th className="p-3.5 text-right">Hours</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-850 text-slate-300">
                                  {studyTimetable.map((day, idx) => (
                                    <tr key={idx} className="hover:bg-slate-900/35 transition-colors">
                                      <td className="p-3.5 font-bold text-white">Day {day.dayNumber}</td>
                                      <td className="p-3.5">
                                        <div className="flex flex-wrap gap-1.5">
                                          {day.studyTopics?.map((st, sidx) => (
                                            <span key={sidx} className="px-2 py-0.5 bg-slate-800 text-[10px] rounded border border-slate-750 text-indigo-300 font-semibold">{st}</span>
                                          ))}
                                        </div>
                                      </td>
                                      <td className="p-3.5 leading-relaxed">{day.dailyGoal}</td>
                                      <td className="p-3.5 text-right font-semibold text-white">{day.hours} hrs</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Actionable Daily Goals */}
                          {generatedPlan.dailyGoals && generatedPlan.dailyGoals.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-black uppercase tracking-wider text-slate-450 font-heading">Recommended Actionable Checklist</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {generatedPlan.dailyGoals.map((dg, idx) => (
                                  <div key={idx} className="flex items-start gap-2.5 p-3.5 bg-slate-900/60 border border-slate-850 rounded-xl">
                                    <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                                    <span className="text-slate-350 text-xs leading-relaxed">{dg}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. SUMMARIZER INTERACTION */}
                {activeWorkspace === 'summarizer' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-6xl mx-auto">
                    {/* Summarizer Form Input */}
                    <div className="lg:col-span-5 bg-[#0a0f1e]/60 border border-slate-850 p-6 rounded-2xl h-fit space-y-4 select-text">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Summarizer inputs</h3>
                        <button
                          type="button"
                          onClick={() => setUseNoteInput(!useNoteInput)}
                          className="text-[9px] text-indigo-400 font-bold hover:underline"
                        >
                          {useNoteInput ? 'Paste plain text content' : 'Select Note file'}
                        </button>
                      </div>

                      {useNoteInput ? (
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black uppercase text-slate-450 tracking-wider">Select Note Vault Source</label>
                          <select
                            value={selectedNoteId}
                            onChange={(e) => setSelectedNoteId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white outline-none cursor-pointer focus:border-indigo-500"
                          >
                            <option value="">-- Choose Note File --</option>
                            {notesList.map(n => (
                              <option key={n._id} value={n._id}>{n.title}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black uppercase text-slate-450 tracking-wider">Paste Course Note Content</label>
                          <textarea
                            placeholder="Paste lecture notes text content here to extract summaries and critical formulas..."
                            value={notesContent}
                            onChange={(e) => setNotesContent(e.target.value)}
                            rows={10}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white outline-none focus:border-indigo-550 resize-none font-sans leading-relaxed"
                          />
                        </div>
                      )}

                      <button
                        onClick={handleSummarizeNotes}
                        disabled={noteLoading}
                        className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-600 disabled:opacity-40 text-xs font-bold text-white rounded-xl cursor-pointer active:scale-95 transition-all shadow"
                      >
                        {noteLoading ? 'Summarizing lecture notes...' : 'Summarize lecture vault'}
                      </button>
                    </div>

                    {/* Output summaries view */}
                    <div className="lg:col-span-7 space-y-5 select-text">
                      {noteLoading && (
                        <div className="bg-[#0a0f1e]/40 border border-slate-850 p-6 rounded-2xl space-y-4 animate-pulse">
                          <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                            <Loader className="w-3.5 h-3.5 animate-spin" />
                            <span>Compiling notes takeaways...</span>
                          </h4>
                          <div className="space-y-2">
                            <div className="h-4 w-full bg-slate-900 rounded" />
                            <div className="h-4 w-5/6 bg-slate-900 rounded" />
                          </div>
                          <div className="pt-4 font-mono text-[10px] text-slate-500 whitespace-pre-wrap truncate h-40">
                            {notesStreamText}
                          </div>
                        </div>
                      )}

                      {!noteSummaryData && !noteLoading && (
                        <div className="flex flex-col items-center justify-center text-center py-28 border border-dashed border-slate-800 rounded-2xl text-slate-550 space-y-3">
                          <FileText className="w-10 h-10 text-slate-700" />
                          <p className="text-xs">No active notes summaries compiled. Paste material on the left to start.</p>
                        </div>
                      )}

                      {noteSummaryData && (() => {
                        const overview = noteSummaryData.overview || noteSummaryData.summary || 'No overview available.';
                        const keyTakeaways = noteSummaryData.keyConcepts || noteSummaryData.keyPoints || [];
                        const definitions = noteSummaryData.importantDefinitions || [];
                        const formulas = noteSummaryData.importantFormulas || [];
                        const questions = noteSummaryData.importantQuestions || [];
                        const examTips = noteSummaryData.examTips || [];
                        const revisionNotes = noteSummaryData.quickRevisionNotes || noteSummaryData.revisionNotes || '';

                        return (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-6 animate-none"
                          >
                            {/* Overview card */}
                            <div className="p-5 bg-slate-900/40 border border-slate-850 rounded-xl space-y-2">
                              <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Executive Overview</h4>
                              <p className="text-slate-200 text-xs leading-relaxed select-text">{overview}</p>
                            </div>

                            {/* Key Points */}
                            {keyTakeaways.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="text-xs font-black uppercase text-slate-450 tracking-wider">Key Takeaways</h4>
                                <div className="space-y-2.5">
                                  {keyTakeaways.map((pt, idx) => (
                                    <div key={idx} className="flex items-start gap-2.5 p-3.5 bg-slate-900/50 border border-slate-850 rounded-xl select-text">
                                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full mt-1.5 shrink-0" />
                                      <span className="text-slate-300 text-xs leading-relaxed">{pt}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Definitions (New) */}
                            {definitions.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="text-xs font-black uppercase text-slate-450 tracking-wider">Important Definitions</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {definitions.map((def, idx) => (
                                    <div key={idx} className="p-4 bg-slate-950/40 border border-slate-850/60 rounded-xl space-y-1.5 select-text">
                                      <span className="block text-xs font-black text-white">{def.term}</span>
                                      <span className="block text-xs text-slate-400 leading-relaxed">{def.definition}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Formulas (Legacy) */}
                            {formulas.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="text-xs font-black uppercase text-slate-450 tracking-wider">Important Formulas</h4>
                                <div className="grid grid-cols-1 gap-4">
                                  {formulas.map((f, idx) => (
                                    <div key={idx} className="p-4 bg-slate-900/60 border border-slate-850 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 select-text">
                                      <div className="space-y-1">
                                        <span className="font-bold text-white text-xs">{f.name}</span>
                                        <p className="text-slate-450 text-[10.5px] leading-relaxed">{f.description}</p>
                                      </div>
                                      <div className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-indigo-300 font-mono text-xs w-fit text-center font-bold">
                                        {f.formula}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Potential Exam Questions (New) */}
                            {questions.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="text-xs font-black uppercase text-slate-450 tracking-wider">Potential Exam Questions</h4>
                                <div className="space-y-3">
                                  {questions.map((q, idx) => (
                                    <div key={idx} className="p-4 bg-slate-900/15 border border-slate-850 rounded-xl space-y-2 select-text">
                                      <p className="text-xs font-bold text-white">Q: {q.question}</p>
                                      <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/20 p-3 rounded-lg border border-slate-900">A: {q.answer}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Exam Tips (New) */}
                            {examTips.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="text-xs font-black uppercase text-slate-455 tracking-wider">Exam Tips</h4>
                                <div className="bg-rose-950/5 border border-rose-900/30 rounded-xl p-4.5 space-y-2 select-text">
                                  {examTips.map((tip, idx) => (
                                    <div key={idx} className="flex gap-2 text-xs text-rose-350">
                                      <span className="shrink-0">•</span>
                                      <span>{tip}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Revision Notes */}
                            {revisionNotes && (
                              <div className="p-5 bg-[#0a0f1d]/85 border border-slate-850 rounded-xl space-y-2 select-text">
                                <h4 className="text-xs font-black uppercase text-slate-450 tracking-wider">Detailed Revision Syllabus</h4>
                                <div className="markdown-container text-slate-350 text-xs md:text-sm leading-relaxed">
                                  <ReactMarkdown components={customMarkdownComponents}>
                                    {revisionNotes}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* 4. QUIZ ENGINE INTERACTION */}
                {activeWorkspace === 'quiz' && (
                  <div className="max-w-3xl mx-auto space-y-6">
                    {/* Parameter Config Form */}
                    {!quizData && !quizLoading && !quizError && (
                      <div className="bg-[#0a0f1e]/60 border border-slate-850 p-6 rounded-3xl space-y-4 max-w-lg mx-auto">
                        <h3 className="text-sm font-bold text-white">Generate Custom Quiz</h3>
                        <form onSubmit={startQuiz} className="space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-850 pb-2 mb-3">
                            <label className="text-xs text-slate-400 font-semibold">Study Material Source</label>
                            <button
                              type="button"
                              onClick={() => setUseNoteInput(!useNoteInput)}
                              className="text-[10px] text-indigo-400 font-bold hover:underline"
                            >
                              {useNoteInput ? 'Enter topic instead' : 'Select Note file'}
                            </button>
                          </div>

                          {useNoteInput ? (
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-black uppercase text-slate-450 tracking-wider">Select Note file</label>
                              <select
                                value={selectedNoteId}
                                onChange={(e) => setSelectedNoteId(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white outline-none cursor-pointer focus:border-indigo-500"
                              >
                                <option value="">-- Choose Note File --</option>
                                {notesList.map(n => (
                                  <option key={n._id} value={n._id}>{n.title}</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-black uppercase text-slate-450 tracking-wider">Quiz Topic</label>
                              <input
                                type="text"
                                placeholder="e.g. Memory Management or OOP Pillars"
                                value={quizTopic}
                                onChange={(e) => setQuizTopic(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white focus:border-indigo-500 outline-none"
                                required
                              />
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-black uppercase text-slate-450 tracking-wider">Difficulty</label>
                              <select
                                value={quizDifficulty}
                                onChange={(e) => setQuizDifficulty(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white outline-none cursor-pointer focus:border-indigo-500"
                              >
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-black uppercase text-slate-450 tracking-wider">Questions Count</label>
                              <select
                                value={quizCount}
                                onChange={(e) => setQuizCount(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white outline-none cursor-pointer focus:border-indigo-500"
                              >
                                <option value="3">3 Questions</option>
                                <option value="5">5 Questions</option>
                                <option value="8">8 Questions</option>
                                <option value="10">10 Questions</option>
                              </select>
                            </div>
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-600 text-xs font-bold text-white rounded-xl cursor-pointer active:scale-95 transition-all shadow"
                          >
                            Generate Assessment
                          </button>
                        </form>
                      </div>
                    )}

                    {/* Generating loader skeleton */}
                    {quizLoading && (
                      <div className="bg-[#0a0f1e]/60 border border-slate-850 p-6 rounded-3xl space-y-6 max-w-lg mx-auto animate-pulse">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-850">
                          <div className="h-4 bg-slate-800 rounded w-1/4"></div>
                          <div className="h-4 bg-slate-800 rounded w-1/6"></div>
                        </div>
                        <div className="space-y-3">
                          <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                          <div className="h-4 bg-slate-800 rounded w-1/2"></div>
                        </div>
                        <div className="space-y-3 pt-4">
                          {[1, 2, 3, 4].map(idx => (
                            <div key={idx} className="h-10 bg-slate-900 border border-slate-850/60 rounded-xl w-full"></div>
                          ))}
                        </div>
                        <div className="flex justify-between items-center pt-4">
                          <div className="h-8 bg-slate-800 rounded-xl w-1/4"></div>
                          <div className="h-8 bg-slate-850 rounded-xl w-1/4"></div>
                        </div>
                        <div className="text-center text-slate-500 text-[10px] uppercase font-bold tracking-wider pt-2">
                          CampusBuddy is compiling custom questions...
                        </div>
                      </div>
                    )}

                    {/* Quiz generation error block */}
                    {quizError && !quizLoading && (
                      <div className="bg-[#0a0f1e]/60 border border-slate-850 p-8 rounded-3xl space-y-4 max-w-lg mx-auto text-center animate-none">
                        <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
                        <div className="space-y-2">
                          <h3 className="text-sm font-bold text-white">CampusBuddy could not generate a quiz right now.</h3>
                          <p className="text-slate-400 text-xs">Please try again later.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => startQuiz()}
                          className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-xs font-bold text-white rounded-xl cursor-pointer active:scale-95 transition-all shadow"
                        >
                          Retry
                        </button>
                      </div>
                    )}


                    {/* Active quiz run panel */}
                    {quizData && quizQuestions.length > 0 && (
                      <div className="space-y-5">
                        {/* Time counter header */}
                        <div className="flex items-center justify-between px-5 py-3 bg-slate-900 border border-slate-850 rounded-xl">
                          <div className="flex items-center gap-1.5 text-xs text-slate-450 font-semibold">
                            <Clock className="w-4 h-4 text-indigo-400" />
                            <span>Timer: {Math.floor(quizTimer / 60)}m {quizTimer % 60}s</span>
                          </div>
                          <span className="text-xs text-slate-400 font-bold">Question {quizCurrentIdx + 1} of {quizQuestions.length}</span>
                        </div>

                        {/* Current Question View */}
                        <div className="bg-[#0a0f1e]/60 border border-slate-850 p-6 rounded-2xl space-y-4 select-text">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-indigo-650/15 border border-indigo-600/30 text-indigo-400 text-[9px] font-black uppercase rounded">
                              {quizQuestions[quizCurrentIdx]?.type}
                            </span>
                            <span className="text-slate-500 text-[10px]">ID: q_{quizQuestions[quizCurrentIdx]?.id}</span>
                          </div>
                          
                          <p className="text-sm font-semibold text-white leading-relaxed select-text">
                            {quizQuestions[quizCurrentIdx]?.questionText}
                          </p>

                          {/* Answer Inputs Category MCQ/TF */}
                          {(quizQuestions[quizCurrentIdx]?.type === 'mcq' || quizQuestions[quizCurrentIdx]?.type === 'tf') ? (
                            <div className="space-y-2.5 pt-2">
                              {quizQuestions[quizCurrentIdx]?.options?.map((opt, oidx) => {
                                const isChecked = String(quizAnswers[quizQuestions[quizCurrentIdx].id]) === String(oidx) || quizAnswers[quizQuestions[quizCurrentIdx].id] === opt;
                                return (
                                  <div
                                    key={oidx}
                                    onClick={() => {
                                      if (quizSubmitted) return;
                                      setQuizAnswers(prev => ({
                                        ...prev,
                                        [quizQuestions[quizCurrentIdx].id]: quizQuestions[quizCurrentIdx].type === 'tf' ? opt : String(oidx)
                                      }));
                                    }}
                                    className={`p-3 border rounded-xl flex items-center justify-between text-xs cursor-pointer select-none transition-all ${
                                      isChecked
                                        ? 'bg-indigo-650/20 border-indigo-500 text-white font-semibold'
                                        : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-900/35 hover:text-slate-200'
                                    }`}
                                  >
                                    <span>{opt}</span>
                                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                      isChecked ? 'border-indigo-400 bg-indigo-500' : 'border-slate-700 bg-transparent'
                                    }`}>
                                      {isChecked && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            /* Written answer box type 'short' or 'code' */
                            <div className="pt-2">
                              <textarea
                                placeholder="Type your answer text here..."
                                disabled={quizSubmitted}
                                value={quizAnswers[quizQuestions[quizCurrentIdx].id] || ''}
                                onChange={(e) => setQuizAnswers(prev => ({
                                  ...prev,
                                  [quizQuestions[quizCurrentIdx].id]: e.target.value
                                }))}
                                rows={4}
                                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-550 rounded-xl py-2 px-3 text-xs text-white outline-none resize-none leading-relaxed"
                              />
                            </div>
                          )}

                          {/* Submit state key analysis output */}
                          {quizSubmitted && (
                            <div className="p-4 bg-slate-900/60 border border-slate-850 rounded-xl space-y-2.5 select-text text-xs leading-relaxed">
                              <div className="flex items-center gap-1.5 font-bold text-slate-350">
                                <Award className="w-4 h-4 text-indigo-400" />
                                <span>Question Review:</span>
                              </div>
                              <div className="space-y-2 pt-1 border-t border-slate-800/40">
                                <div>
                                  <span className="font-semibold text-slate-400">Your Answer:</span>
                                  <p className="text-slate-200 mt-0.5 bg-slate-950/40 px-2.5 py-1.5 rounded border border-slate-900 select-text">
                                    {getReadableUserAnswer(quizQuestions[quizCurrentIdx], quizAnswers)}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-400">Correct Answer:</span>
                                  <p className="text-indigo-300 font-mono mt-0.5 bg-slate-950/40 px-2.5 py-1.5 rounded border border-slate-900 font-bold select-text">
                                    {getReadableCorrectAnswer(quizQuestions[quizCurrentIdx])}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-400">Explanation:</span>
                                  <p className="text-slate-355 mt-0.5 leading-relaxed select-text">
                                    {quizQuestions[quizCurrentIdx]?.explanation}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Navigation buttons */}
                        <div className="flex justify-between items-center">
                          <button
                            disabled={quizCurrentIdx === 0}
                            onClick={() => setQuizCurrentIdx(prev => prev - 1)}
                            className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs flex items-center gap-1 cursor-pointer disabled:opacity-30"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            <span>Previous</span>
                          </button>

                          {!quizSubmitted ? (
                            <button
                              onClick={submitQuizAnswers}
                              className="px-6 py-2.5 bg-indigo-650 hover:bg-indigo-600 font-bold text-white rounded-xl text-xs cursor-pointer active:scale-95 shadow"
                            >
                              Submit Quiz Answers
                            </button>
                          ) : (
                            <button
                              onClick={handleRetryQuiz}
                              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 font-bold text-slate-300 rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Retake Quiz</span>
                            </button>
                          )}

                          {quizCurrentIdx < quizQuestions.length - 1 ? (
                            <button
                              onClick={() => setQuizCurrentIdx(prev => prev + 1)}
                              className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                            >
                              <span>Next</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          ) : (
                            <div className="w-20" /> // Spacer
                          )}
                        </div>
                      </div>
                    )}

                    {quizData && quizQuestions.length === 0 && (
                      <div className="bg-[#0a0f1e]/60 border border-slate-850 p-8 rounded-3xl space-y-4 max-w-lg mx-auto text-center animate-none">
                        <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
                        <div className="space-y-2">
                          <h3 className="text-sm font-bold text-white">CampusBuddy generated an empty quiz.</h3>
                          <p className="text-slate-450 text-xs">The quiz contains no questions. Please try generating it again.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setQuizData(null);
                            setQuizError(null);
                          }}
                          className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-xs font-bold text-white rounded-xl cursor-pointer active:scale-95 transition-all shadow"
                        >
                          Go Back
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. FLASHCARDS INTERACTION */}
                {activeWorkspace === 'flashcards' && (
                  <div className="max-w-2xl mx-auto space-y-6">
                    {/* Form parameters */}
                    {!fcData && !fcLoading && (
                      <div className="bg-[#0a0f1e]/60 border border-slate-850 p-6 rounded-3xl space-y-4 max-w-lg mx-auto">
                        <h3 className="text-sm font-bold text-white">Generate Revision Deck</h3>
                        <form onSubmit={startFlashcards} className="space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-850 pb-2 mb-3">
                            <label className="text-xs text-slate-400 font-semibold">Deck revision source</label>
                            <button
                              type="button"
                              onClick={() => setUseNoteInput(!useNoteInput)}
                              className="text-[10px] text-indigo-400 font-bold hover:underline"
                            >
                              {useNoteInput ? 'Enter topic instead' : 'Select Note file'}
                            </button>
                          </div>

                          {useNoteInput ? (
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-black uppercase text-slate-450 tracking-wider">Select Note file</label>
                              <select
                                value={selectedNoteId}
                                onChange={(e) => setSelectedNoteId(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white outline-none cursor-pointer focus:border-indigo-550"
                              >
                                <option value="">-- Choose Note File --</option>
                                {notesList.map(n => (
                                  <option key={n._id} value={n._id}>{n.title}</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-black uppercase text-slate-450 tracking-wider">Deck Topic</label>
                              <input
                                type="text"
                                placeholder="e.g. Distributed Consensus protocols"
                                value={fcTopic}
                                onChange={(e) => setFcTopic(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white focus:border-indigo-500 outline-none"
                                required
                              />
                            </div>
                          )}

                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-black uppercase text-slate-450 tracking-wider">Deck Card Count</label>
                            <select
                              value={fcCount}
                              onChange={(e) => setFcCount(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-white outline-none cursor-pointer focus:border-indigo-500"
                            >
                              <option value="3">3 Cards</option>
                              <option value="5">5 Cards</option>
                              <option value="8">8 Cards</option>
                              <option value="12">12 Cards</option>
                            </select>
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-600 text-xs font-bold text-white rounded-xl cursor-pointer active:scale-95 transition-all shadow"
                          >
                            Build Revision Deck
                          </button>
                        </form>
                      </div>
                    )}

                    {/* Loader */}
                    {fcLoading && (
                      <div className="bg-[#0a0f1e]/60 border border-slate-850 p-8 rounded-3xl space-y-4 max-w-lg mx-auto animate-pulse text-center">
                        <Loader className="w-10 h-10 animate-spin text-indigo-400 mx-auto" />
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-white">Compiling Deck...</h4>
                          <p className="text-slate-500 text-xs">Formulating spaced repetition card decks structure...</p>
                        </div>
                      </div>
                    )}

                    {/* Active Flashcard Study Card */}
                    {fcData && (
                      <div className="space-y-6">
                        {/* Leitner Box Header Indicator */}
                        <div className="flex items-center justify-between px-5 py-3 bg-slate-900 border border-slate-850 rounded-xl text-xs text-slate-450">
                          <div className="flex items-center gap-1">
                            <Award className="w-4 h-4 text-indigo-400" />
                            <span>Revision Streak: {fcStreak} days</span>
                          </div>
                          <span>Card {fcCurrentIdx + 1} of {flashcardsList.length}</span>
                        </div>

                        {/* Interactive Flip Card Component */}
                        <div
                          onClick={() => setFcFlipped(!fcFlipped)}
                          className="h-80 w-full relative cursor-pointer select-none rounded-3xl shadow-xl transition-transform duration-500 border border-slate-800 bg-[#0d1326]/60 backdrop-blur flex items-center justify-center p-8 text-center"
                        >
                          <AnimatePresence mode="wait">
                            {!fcFlipped ? (
                              <motion.div
                                key="front"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-4"
                              >
                                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">Front (Concept query)</span>
                                <p className="text-base font-bold text-white leading-relaxed select-text">{flashcardsList[fcCurrentIdx]?.front}</p>
                                <span className="block text-[10px] text-slate-500 italic mt-4">Click card or space/enter to flip</span>
                              </motion.div>
                            ) : (
                              <motion.div
                                key="back"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-4"
                              >
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Back (Answer explanation)</span>
                                <p className="text-sm text-slate-200 leading-relaxed select-text">{flashcardsList[fcCurrentIdx]?.back}</p>
                                <span className="block text-[10px] text-slate-550 italic mt-4">Do you know this concept? Mark below.</span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Mark buttons */}
                        <div className="flex items-center justify-center gap-4">
                          <button
                            disabled={!fcFlipped}
                            onClick={() => handleCardOutcome(false)}
                            className="px-6 py-2.5 bg-rose-950 hover:bg-rose-900 border border-rose-800/60 rounded-xl text-rose-300 font-bold text-xs disabled:opacity-30 cursor-pointer transition-all active:scale-95"
                          >
                            Incorrect (box 1)
                          </button>
                          <button
                            disabled={!fcFlipped}
                            onClick={() => handleCardOutcome(true)}
                            className="px-6 py-2.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800/60 rounded-xl text-emerald-300 font-bold text-xs disabled:opacity-30 cursor-pointer transition-all active:scale-95"
                          >
                            Correct (box +1)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 6. CAREER ADVISOR INTERACTION */}
                {activeWorkspace === 'career' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-6xl mx-auto">
                    {/* Setup Form */}
                    <div className="lg:col-span-4 bg-[#0a0f1e]/60 border border-slate-850 p-6 rounded-2xl h-fit space-y-4 select-text">
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Advisor Settings</h3>
                      <form onSubmit={handleCareerAdviseSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black uppercase text-slate-450 tracking-wider">Target Job Role</label>
                          <input
                            type="text"
                            placeholder="e.g. MERN Full Stack Developer"
                            value={careerRole}
                            onChange={(e) => setCareerRole(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:border-indigo-500 outline-none"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black uppercase text-slate-450 tracking-wider">Target Company (Optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. Google or Stripe"
                            value={careerCompany}
                            onChange={(e) => setCareerCompany(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:border-indigo-500 outline-none"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={careerLoading}
                          className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-600 disabled:opacity-40 text-xs font-bold text-white rounded-xl cursor-pointer active:scale-95 transition-all shadow"
                        >
                          {careerLoading ? 'Advising target company paths...' : 'Advise Career path'}
                        </button>
                      </form>
                    </div>

                    {/* Output advisor panels */}
                    <div className="lg:col-span-8 space-y-5 select-text">
                      {careerLoading && (
                        <div className="bg-[#0a0f1e]/40 border border-slate-850 p-6 rounded-2xl space-y-4 animate-pulse">
                          <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                            <Loader className="w-3.5 h-3.5 animate-spin" />
                            <span>Compiling ATS resume tips and interview strategies...</span>
                          </h4>
                          <div className="space-y-2">
                            <div className="h-4 w-full bg-slate-900 rounded" />
                            <div className="h-4 w-5/6 bg-slate-900 rounded" />
                          </div>
                          <div className="pt-4 font-mono text-[10px] text-slate-500 whitespace-pre-wrap truncate h-40">
                            {careerStreamText}
                          </div>
                        </div>
                      )}

                      {!careerAdvice && !careerLoading && (
                        <div className="flex flex-col items-center justify-center text-center py-28 border border-dashed border-slate-800 rounded-2xl text-slate-550 space-y-3">
                          <Briefcase className="w-10 h-10 text-slate-700" />
                          <p className="text-xs">No active career roadmaps loaded. Provide target roles on the left to start advising.</p>
                        </div>
                      )}

                      {careerAdvice && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="space-y-6 select-text"
                        >
                          {/* Recommended Skills Grid */}
                          {careerAdvice.recommendedSkills && careerAdvice.recommendedSkills.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-black uppercase text-slate-450 tracking-wider">Target Technical Skills</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {careerAdvice.recommendedSkills.map((sk, idx) => (
                                  <div key={idx} className="p-4 bg-slate-900/50 border border-slate-850 rounded-xl space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-white text-xs">{sk.skill}</span>
                                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                        sk.importance === 'Critical' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-450' : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
                                      }`}>{sk.importance}</span>
                                    </div>
                                    <p className="text-slate-400 text-[10.5px] leading-relaxed select-text">Resources: {sk.resources}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* MERN Roadmap Timeline */}
                          {mernRoadmap.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="text-xs font-black uppercase text-slate-450 tracking-wider">MERN Core Roadmap Schedule</h4>
                              <div className="space-y-3">
                                {mernRoadmap.map((item, idx) => (
                                  <div key={idx} className="p-4 bg-[#0a0f1f]/80 border border-slate-850 rounded-xl space-y-2">
                                    <div className="flex items-center justify-between border-b border-slate-850 pb-1.5">
                                      <span className="font-bold text-white text-xs">{item.phase}</span>
                                      <span className="text-[10px] text-slate-500 font-semibold">{item.duration}</span>
                                    </div>
                                    <ul className="list-disc list-inside space-y-1 text-slate-350 text-xs">
                                      {item.actionItems?.map((act, aidx) => (
                                        <li key={aidx} className="leading-relaxed select-text">{act}</li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* ATS Keywords & Improvements */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* ATS Keywords */}
                            {atsKeywords.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="text-xs font-black uppercase text-slate-450 tracking-wider">Recommended ATS Keywords</h4>
                                <div className="p-4 bg-slate-900/60 border border-slate-850 rounded-xl flex flex-wrap gap-1.5 h-full align-top content-start">
                                  {atsKeywords.map((kw, idx) => (
                                    <span key={idx} className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-indigo-300 font-mono text-[10.5px] rounded-lg font-bold select-text">{kw}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Resume improvements */}
                            {resumeImprovements.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="text-xs font-black uppercase text-slate-450 tracking-wider">ATS Resume Modifications</h4>
                                <div className="p-4 bg-[#0a0f1d]/50 border border-slate-850 rounded-xl space-y-1.5">
                                  {resumeImprovements.map((tip, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-slate-300 select-text">
                                      <span className="text-indigo-400 font-bold shrink-0 mt-0.5">•</span>
                                      <span>{tip}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Interview style Accordion prep */}
                          {careerAdvice.companyInterviewPrep && (
                            <div className="p-5 bg-slate-900/40 border border-slate-850 rounded-xl space-y-3 select-text">
                              <h4 className="text-xs font-black uppercase text-indigo-400 tracking-wider">Company Interview Round prep</h4>
                              <div className="space-y-1 text-xs">
                                <p className="text-slate-100 font-semibold leading-relaxed select-text">{careerAdvice.companyInterviewPrep.interviewStyle}</p>
                                <p className="text-slate-400 text-[11px] leading-relaxed mt-2 select-text">
                                  <span className="font-bold text-indigo-300">Prep Strategy:</span> {careerAdvice.companyInterviewPrep.preparationStrategy}
                                </p>
                              </div>
                              {commonQuestions.length > 0 && (
                                <div className="pt-2 border-t border-slate-850/80 space-y-2">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Known Interview Questions</span>
                                  <div className="space-y-1.5">
                                    {commonQuestions.map((qText, idx) => (
                                      <div key={idx} className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-xs font-mono select-text leading-relaxed">
                                        Q: {qText}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>
                  </div>
                )}

                {/* 7. AI USAGE DASHBOARD INTERACTION */}
                {activeWorkspace === 'usage' && (
                  <div className="max-w-5xl mx-auto space-y-6 select-none">
                    {/* Loading status */}
                    {usageLoading && (
                      <div className="text-center py-20 animate-pulse text-slate-500">
                        <Loader className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-2" />
                        <span>Compiling usage analytics dashboards graphs...</span>
                      </div>
                    )}

                    {!usageLoading && !apiUsage && (
                      <div className="text-center py-20 text-slate-500">No logs interaction data available.</div>
                    )}

                    {!usageLoading && apiUsage && (
                      <div className="space-y-6">
                        {/* Highlights Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                          <div className="p-5 bg-[#0a0f1f]/80 border border-slate-850 rounded-2xl flex flex-col justify-between shadow">
                            <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Total AI calls</span>
                            <span className="text-3xl font-extrabold text-white mt-2">{apiUsage.totalCalls || 0}</span>
                          </div>
                          <div className="p-5 bg-[#0a0f1f]/80 border border-slate-850 rounded-2xl flex flex-col justify-between shadow">
                            <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Most used feature</span>
                            <span className="text-lg font-black text-indigo-300 mt-2 truncate uppercase">{apiUsage.mostUsedFeature || 'None'}</span>
                          </div>
                          <div className="p-5 bg-[#0a0f1f]/80 border border-slate-850 rounded-2xl flex flex-col justify-between shadow">
                            <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Quizzes generated</span>
                            <span className="text-2xl font-extrabold text-emerald-400 mt-2">{quizzes.length}</span>
                          </div>
                          <div className="p-5 bg-[#0a0f1f]/80 border border-slate-850 rounded-2xl flex flex-col justify-between shadow">
                            <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Flashcard decks mastered</span>
                            <span className="text-2xl font-extrabold text-amber-400 mt-2">{flashcardDecks.length}</span>
                          </div>
                        </div>

                        {/* Provider Stats Section */}
                        {providerStats && (
                          <div className="space-y-4 bg-[#0a0f1f]/30 border border-slate-850/60 p-6 rounded-2xl">
                            <span className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                              <Bot className="w-4 h-4 text-indigo-400" />
                              <span>AI Provider Infrastructure Telemetry</span>
                            </span>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                              <div className="p-5 bg-[#0a0f1f]/80 border border-slate-850 rounded-2xl flex flex-col justify-between shadow">
                                <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Average latency</span>
                                <span className="text-2xl font-extrabold text-white mt-2">
                                  {providerStats.averageLatency ? `${providerStats.averageLatency}ms` : 'N/A'}
                                </span>
                              </div>
                              <div className="p-5 bg-[#0a0f1f]/80 border border-slate-850 rounded-2xl flex flex-col justify-between shadow">
                                <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Success rate</span>
                                <span className="text-2xl font-extrabold text-emerald-400 mt-2">
                                  {providerStats.successRate ? `${providerStats.successRate}%` : '100%'}
                                </span>
                              </div>
                              <div className="p-5 bg-[#0a0f1f]/80 border border-slate-850 rounded-2xl flex flex-col justify-between shadow">
                                <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Cache Hit rate</span>
                                <span className="text-2xl font-extrabold text-indigo-400 mt-2">
                                  {providerStats.cacheHitRate ? `${providerStats.cacheHitRate}%` : '0%'}
                                </span>
                              </div>
                              <div className="p-5 bg-[#0a0f1f]/80 border border-slate-850 rounded-2xl flex flex-col justify-between shadow">
                                <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Primary Provider</span>
                                <span className="text-lg font-black text-amber-400 mt-2 font-extrabold">
                                  {providerStats.mostUsedProvider || 'Auto'}
                                </span>
                              </div>
                            </div>

                            {/* Chart or telemetry breakdown */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Provider Call Breakdown */}
                              <div className="bg-[#0a0f1f]/50 border border-slate-850 p-5 rounded-2xl space-y-4 shadow flex flex-col justify-between">
                                <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Provider Call Distribution</span>
                                <div className="h-44 pt-2 flex items-center justify-center">
                                  {(providerStats.groqUsage > 0 || providerStats.openrouterUsage > 0) ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                      <PieChart>
                                        <Pie
                                          data={[
                                            { name: 'Groq', value: providerStats.groqUsage },
                                            { name: 'OpenRouter', value: providerStats.openrouterUsage }
                                          ].filter(d => d.value > 0)}
                                          cx="50%"
                                          cy="50%"
                                          innerRadius={45}
                                          outerRadius={65}
                                          paddingAngle={3}
                                          dataKey="value"
                                        >
                                          <Cell fill="#10b981" />
                                          <Cell fill="#f59e0b" />
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', fontSize: '11px', color: '#e2e8f0' }} />
                                      </PieChart>
                                    </ResponsiveContainer>
                                  ) : (
                                    <span className="text-slate-600 text-xs">No provider distribution logs</span>
                                  )}
                                </div>
                                <div className="flex items-center justify-around text-[10px] text-slate-455 uppercase">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                    <span>Groq: {providerStats.groqUsage} calls</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                    <span>OpenRouter: {providerStats.openrouterUsage} calls</span>
                                  </div>
                                </div>
                              </div>

                              {/* Telemetry info and status */}
                              <div className="bg-[#0a0f1f]/50 border border-slate-850 p-5 rounded-2xl space-y-4 shadow flex flex-col justify-between">
                                <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Active model details</span>
                                <div className="space-y-3 pt-2">
                                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
                                    <div className="space-y-0.5">
                                      <p className="text-[10px] font-black uppercase text-slate-500">Most Used Model</p>
                                      <p className="text-xs font-bold text-white truncate max-w-[200px]">{providerStats.mostUsedModel || 'N/A'}</p>
                                    </div>
                                    <span className="px-2 py-0.5 border text-[9px] font-black uppercase tracking-wider rounded-full bg-indigo-500/10 text-indigo-300 border-indigo-500/20">
                                      Active
                                    </span>
                                  </div>
                                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
                                    <div className="space-y-0.5">
                                      <p className="text-[10px] font-black uppercase text-slate-500">Auto Failover Chain</p>
                                      <p className="text-xs font-bold text-slate-350">Groq &rarr; OpenRouter</p>
                                    </div>
                                    <span className="px-2 py-0.5 border text-[9px] font-black uppercase tracking-wider rounded-full bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
                                      Enabled
                                    </span>
                                  </div>
                                </div>
                                <div className="text-[10px] text-slate-500 text-center leading-relaxed">
                                  All response payloads are protected by the local cache, reducing duplicate completions within a 24-hour window.
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Chart row */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                          {/* Daily Invocations Trends */}
                          <div className="lg:col-span-8 bg-[#0a0f1f]/50 border border-slate-850 p-5 rounded-2xl space-y-4 shadow">
                            <span className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                              <TrendingUp className="w-4 h-4 text-indigo-400" />
                              <span>Daily AI Call Invocations (last 7 days)</span>
                            </span>
                            <div className="h-64 pt-2">
                              {apiUsage.dailyTrends && apiUsage.dailyTrends.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={apiUsage.dailyTrends}>
                                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', fontSize: '11px', color: '#e2e8f0' }} />
                                    <Bar dataKey="calls" fill="#6366f1" radius={[4, 4, 0, 0]}>
                                      {apiUsage.dailyTrends.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                      ))}
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              ) : (
                                <div className="text-center py-24 text-slate-600 text-xs">No daily call logs agg data found in last 7 days</div>
                              )}
                            </div>
                          </div>

                          {/* Aggregated distribution */}
                          <div className="lg:col-span-4 bg-[#0a0f1f]/50 border border-slate-850 p-5 rounded-2xl space-y-4 shadow flex flex-col justify-between">
                            <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Features distribution</span>
                            <div className="h-44 pt-2 flex items-center justify-center">
                              {apiUsage.featureUsage && apiUsage.featureUsage.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={apiUsage.featureUsage}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={45}
                                      outerRadius={65}
                                      paddingAngle={3}
                                      dataKey="count"
                                      nameKey="feature"
                                    >
                                      {apiUsage.featureUsage.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                      ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', fontSize: '11px', color: '#e2e8f0' }} />
                                  </PieChart>
                                </ResponsiveContainer>
                              ) : (
                                <span className="text-slate-650 text-xs">No distributions logs</span>
                              )}
                            </div>

                            {/* Legend labels */}
                            <div className="space-y-1">
                              {apiUsage.featureUsage?.map((f, idx) => (
                                <div key={idx} className="flex items-center justify-between text-[10px] text-slate-450 uppercase">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                    <span className="truncate max-w-[120px]">{f.feature}</span>
                                  </div>
                                  <span className="font-bold text-white pr-1">{f.count} calls</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Attempts tables */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Quiz Scores attempts */}
                          <div className="bg-[#0a0f1f]/50 border border-slate-850 p-5 rounded-2xl space-y-3 shadow">
                            <span className="text-xs font-black uppercase text-slate-450 tracking-wider">Quiz scores logs</span>
                            <div className="overflow-x-auto select-none">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-900 border-b border-slate-850 text-slate-500 font-bold">
                                    <th className="p-3">Topic</th>
                                    <th className="p-3">Difficulty</th>
                                    <th className="p-3 text-right">Score</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-850 text-slate-350">
                                  {apiUsage.quizAttempts && apiUsage.quizAttempts.length > 0 ? (
                                    apiUsage.quizAttempts.slice(0, 5).map((att, idx) => (
                                      <tr key={idx} className="hover:bg-slate-900/30">
                                        <td className="p-3 font-semibold text-white truncate max-w-[150px]">{att.topic}</td>
                                        <td className="p-3 uppercase text-[9px] font-black tracking-wider text-slate-500">{att.difficulty}</td>
                                        <td className="p-3 text-right font-bold text-indigo-400">{att.score} / {att.totalQuestions}</td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td colSpan={3} className="p-3 text-center text-slate-600 text-[10.5px]">No quiz attempts logged yet.</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Flashcard Mastery */}
                          <div className="bg-[#0a0f1f]/50 border border-slate-850 p-5 rounded-2xl space-y-3 shadow">
                            <span className="text-xs font-black uppercase text-slate-450 tracking-wider">Flashcard Deck mastery lists</span>
                            <div className="overflow-x-auto select-none">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-900 border-b border-slate-850 text-slate-500 font-bold">
                                    <th className="p-3">Deck topic</th>
                                    <th className="p-3">Streak</th>
                                    <th className="p-3 text-right">Progress</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-850 text-slate-350">
                                  {apiUsage.flashcardMastery && apiUsage.flashcardMastery.length > 0 ? (
                                    apiUsage.flashcardMastery.slice(0, 5).map((mst, idx) => (
                                      <tr key={idx} className="hover:bg-slate-900/30">
                                        <td className="p-3 font-semibold text-white truncate max-w-[150px]">{mst.topic}</td>
                                        <td className="p-3 text-slate-500 font-semibold">{mst.studyStreak || 0} days</td>
                                        <td className="p-3 text-right font-bold text-indigo-400">
                                          {mst.masteredCount} / {mst.totalCards} cards
                                        </td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td colSpan={3} className="p-3 text-center text-slate-600 text-[10.5px]">No flashcard mastery sets reviewed.</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 8. AI PREFERENCE SETTINGS */}
                {activeWorkspace === 'settings' && (
                  <div className="max-w-3xl mx-auto space-y-6 select-none animate-none">
                    <div className="bg-[#0a0f1f]/50 border border-slate-850 p-6 rounded-2xl space-y-4 shadow-xl">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400">
                          <Settings className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-white">AI Provider Preference</h3>
                          <p className="text-[11px] text-slate-450">Choose which AI model provider CampusBuddy should query first.</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                        {[
                          {
                            key: 'auto',
                            title: 'Auto (Recommended)',
                            desc: 'Dynamically routes requests. Defaults to Groq and falls back to OpenRouter if failure or high latency occurs.',
                            badge: 'Default Failover'
                          },
                          {
                            key: 'groq',
                            title: 'Groq',
                            desc: 'Forces Groq (llama-3.3-70b-versatile) as primary. Exceptional speed and response times.',
                            badge: 'Low Latency'
                          },
                          {
                            key: 'openrouter',
                            title: 'OpenRouter',
                            desc: 'Forces OpenRouter (deepseek/deepseek-chat-v3) as primary. Highly detailed, structured JSON outputs.',
                            badge: 'Structured Output'
                          }
                        ].map(opt => {
                          const isSelected = preferredProvider === opt.key;
                          return (
                            <div
                              key={opt.key}
                              onClick={() => handleSavePreferences(opt.key)}
                              className={`p-5 rounded-xl border transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[160px] relative overflow-hidden bg-[#0d1326]/50 hover:bg-[#111933]/60 ${
                                isSelected 
                                  ? 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.15)] bg-[#0d1326]/80' 
                                  : 'border-slate-800/80 hover:border-slate-700'
                              }`}
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                    isSelected 
                                      ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' 
                                      : 'bg-slate-900/60 text-slate-500 border border-slate-850'
                                  }`}>
                                    {opt.badge}
                                  </span>
                                  {isSelected && (
                                    <CheckCircle className="w-4 h-4 text-indigo-400" />
                                  )}
                                </div>
                                <h4 className="text-xs font-bold text-white pt-1">{opt.title}</h4>
                                <p className="text-[10px] text-slate-455 leading-relaxed">{opt.desc}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {isDragOver && (
              <div className="absolute inset-0 z-[100] bg-[#060a15]/90 backdrop-blur-md border-2 border-dashed border-indigo-500 rounded-3xl flex flex-col items-center justify-center gap-4 text-center pointer-events-none">
                <div className="p-5 bg-indigo-500/10 border border-indigo-500/25 rounded-2xl animate-pulse">
                  <FileUp className="w-12 h-12 text-indigo-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">Drop your document here</h3>
                  <p className="text-slate-400 text-xs">Supported formats: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const InteractiveHistoryQuiz = ({ quizRecord, docId, fetchDocumentDetails }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState(quizRecord.answers || {});
  const [submitted, setSubmitted] = useState(quizRecord.submitted || false);
  const [score, setScore] = useState(quizRecord.score || 0);
  const [timer, setTimer] = useState(0);
  const quizQuestions = quizRecord.quiz?.questions || [];

  useEffect(() => {
    if (submitted) return;
    const interval = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [submitted]);

  const handleSelectAnswer = (optionIndexOrText) => {
    if (submitted) return;
    setAnswers(prev => ({
      ...prev,
      [quizQuestions[currentIdx].id]: optionIndexOrText
    }));
  };

  const handleSubmit = async () => {
    let computedScore = 0;
    quizQuestions.forEach(q => {
      const userAns = answers[q.id];
      if (q.type === 'mcq' || q.type === 'tf') {
        if (String(userAns) === String(q.correctAnswer)) {
          computedScore++;
        }
      } else {
        if (userAns && String(userAns).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()) {
          computedScore++;
        }
      }
    });
    setScore(computedScore);
    setSubmitted(true);

    try {
      await API.post(`/ai/quizzes/${quizRecord._id}/submit`, {
        score: computedScore,
        totalQuestions: quizQuestions.length,
        answers
      });
      toast.success(`Quiz submitted! Score: ${computedScore}/${quizQuestions.length}`);
      if (fetchDocumentDetails) fetchDocumentDetails(docId);
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit score');
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setSubmitted(false);
    setScore(0);
    setCurrentIdx(0);
    setTimer(0);
  };

  if (quizQuestions.length === 0) {
    return <div className="text-xs text-slate-500 text-center py-6">No questions found in this quiz.</div>;
  }

  const currentQuestion = quizQuestions[currentIdx];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h4 className="text-xs font-black text-white uppercase tracking-wider">{quizRecord.title}</h4>
          <p className="text-[9px] text-slate-550 uppercase font-bold tracking-wider mt-0.5">
            Difficulty: {quizRecord.difficulty} • {quizQuestions.length} Questions
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{Math.floor(timer / 60)}m {timer % 60}s</span>
          </div>
          <span>Question {currentIdx + 1} of {quizQuestions.length}</span>
        </div>
      </div>

      <div className="bg-slate-900/30 border border-slate-850 p-6 rounded-2xl space-y-4">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-indigo-650/15 border border-indigo-600/30 text-indigo-400 text-[9px] font-black uppercase rounded">
            {currentQuestion.type}
          </span>
        </div>
        
        <p className="text-sm font-semibold text-white leading-relaxed select-text">
          {currentQuestion.questionText}
        </p>

        {(currentQuestion.type === 'mcq' || currentQuestion.type === 'tf') ? (
          <div className="space-y-2.5 pt-2">
            {currentQuestion.options?.map((opt, oidx) => {
              const isChecked = String(answers[currentQuestion.id]) === String(oidx) || answers[currentQuestion.id] === opt;
              return (
                <div
                  key={oidx}
                  onClick={() => handleSelectAnswer(currentQuestion.type === 'tf' ? opt : String(oidx))}
                  className={`p-3 border rounded-xl flex items-center justify-between text-xs cursor-pointer select-none transition-all ${
                    isChecked
                      ? 'bg-indigo-650/20 border-indigo-500 text-white font-semibold'
                      : 'bg-slate-950 border-slate-850 text-slate-450 hover:bg-slate-900/30 hover:text-slate-200'
                  }`}
                >
                  <span>{opt}</span>
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    isChecked ? 'border-indigo-400 bg-indigo-500' : 'border-slate-700 bg-transparent'
                  }`}>
                    {isChecked && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="pt-2">
            <textarea
              placeholder="Type your answer here..."
              disabled={submitted}
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => handleSelectAnswer(e.target.value)}
              rows={4}
              className="w-full bg-slate-950 border border-slate-855 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-xs text-white outline-none resize-none leading-relaxed"
            />
          </div>
        )}

        {submitted && (
          <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl space-y-2.5 text-xs leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-slate-350">
              <Award className="w-4 h-4 text-indigo-400" />
              <span>Question Review:</span>
            </div>
            <div className="space-y-2 pt-1 border-t border-slate-850/40">
              <div>
                <span className="font-semibold text-slate-400">Your Answer:</span>
                <p className="text-slate-200 mt-0.5 bg-slate-900/20 px-2.5 py-1.5 rounded border border-slate-850 select-text">
                  {getReadableUserAnswer(currentQuestion, answers)}
                </p>
              </div>
              <div>
                <span className="font-semibold text-slate-400">Correct Answer:</span>
                <p className="text-indigo-300 font-mono mt-0.5 bg-slate-900/20 px-2.5 py-1.5 rounded border border-slate-850 font-bold select-text">
                  {getReadableCorrectAnswer(currentQuestion)}
                </p>
              </div>
              <div>
                <span className="font-semibold text-slate-400">Explanation:</span>
                <p className="text-slate-350 mt-0.5 leading-relaxed select-text">
                  {currentQuestion.explanation}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <button
          disabled={currentIdx === 0}
          onClick={() => setCurrentIdx(prev => prev - 1)}
          className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-slate-250 rounded-xl text-xs flex items-center gap-1 cursor-pointer disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        {!submitted ? (
          <button
            onClick={handleSubmit}
            className="px-6 py-2.5 bg-indigo-650 hover:bg-indigo-600 font-bold text-white rounded-xl text-xs cursor-pointer active:scale-95 shadow animate-none"
          >
            Submit Quiz
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <div className="text-xs text-slate-350 font-bold bg-indigo-950/20 border border-indigo-900/40 px-3 py-1.5 rounded-lg select-text">
              Score: {score} / {quizQuestions.length}
            </div>
            <button
              onClick={handleRetake}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 font-bold text-slate-300 rounded-xl text-xs cursor-pointer flex items-center gap-1.5 animate-none"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
              <span>Retake Quiz</span>
            </button>
          </div>
        )}

        {currentIdx < quizQuestions.length - 1 ? (
          <button
            onClick={() => setCurrentIdx(prev => prev + 1)}
            className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-slate-250 rounded-xl text-xs flex items-center gap-1 cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="w-20" />
        )}
      </div>
    </div>
  );
};

const InteractiveHistoryFlashcard = ({ deckRecord, docId, fetchDocumentDetails }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knownList, setKnownList] = useState(deckRecord.knownCards || []);
  const [progress, setProgress] = useState(deckRecord.masteryProgress || 0);

  const cardsList = deckRecord.deck?.flashcards || [];

  const handleOutcome = async (known) => {
    setFlipped(false);
    const currentCard = cardsList[currentIdx];
    const nextKnownList = known
      ? [...knownList, currentCard.id]
      : knownList.filter(id => id !== currentCard.id);

    setKnownList(nextKnownList);
    const progressVal = Math.round((nextKnownList.length / cardsList.length) * 100);
    setProgress(progressVal);

    try {
      await API.post(`/ai/flashcards/decks/${deckRecord._id}/mastery`, {
        masteryProgress: progressVal,
        knownCards: nextKnownList
      });
      if (fetchDocumentDetails) fetchDocumentDetails(docId);
    } catch (err) {
      console.error(err);
    }

    if (currentIdx < cardsList.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      toast.success('Deck review completed!');
    }
  };

  const handleReset = async () => {
    setKnownList([]);
    setProgress(0);
    setCurrentIdx(0);
    setFlipped(false);
    try {
      await API.post(`/ai/flashcards/decks/${deckRecord._id}/mastery`, {
        masteryProgress: 0,
        knownCards: []
      });
      if (fetchDocumentDetails) fetchDocumentDetails(docId);
    } catch (err) {
      console.error(err);
    }
  };

  if (cardsList.length === 0) {
    return <div className="text-xs text-slate-500 text-center py-6">No cards found in this deck.</div>;
  }

  const currentCard = cardsList[currentIdx];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h4 className="text-xs font-black text-white uppercase tracking-wider">{deckRecord.title}</h4>
          <p className="text-[9px] text-slate-550 uppercase font-bold tracking-wider mt-0.5">
            Progress: {progress}% Mastered • {cardsList.length} Cards
          </p>
        </div>
        <button
          onClick={handleReset}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[10px] font-bold text-slate-400 hover:text-white rounded-xl cursor-pointer animate-none"
        >
          Reset Deck Progress
        </button>
      </div>

      <div className="flex justify-center py-6 select-none">
        <div
          onClick={() => setFlipped(!flipped)}
          className="w-full max-w-md h-64 cursor-pointer"
          style={{ perspective: '1000px' }}
        >
          <div
            className="w-full h-full relative"
            style={{
              transformStyle: 'preserve-3d',
              transition: 'transform 0.6s',
              transform: flipped ? 'rotateY(180deg)' : 'none'
            }}
          >
            {/* Front Card Side */}
            <div
              className="absolute inset-0 w-full h-full bg-[#0a1024] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-2xl"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <div className="flex items-center justify-between text-[9px] font-black uppercase text-slate-550 tracking-wider">
                <span>Card {currentIdx + 1} of {cardsList.length}</span>
                <span>Question / Term</span>
              </div>
              <p className="text-sm md:text-base font-bold text-white text-center leading-relaxed px-4 py-8 select-text">
                {currentCard.question || currentCard.front}
              </p>
              <div className="text-center text-[9px] text-indigo-400 font-bold uppercase tracking-wider select-none animate-pulse">
                Click to reveal answer
              </div>
            </div>

            {/* Back Card Side */}
            <div
              className="absolute inset-0 w-full h-full bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-2xl"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)'
              }}
            >
              <div className="flex items-center justify-between text-[9px] font-black uppercase text-slate-550 tracking-wider">
                <span>Card {currentIdx + 1} of {cardsList.length}</span>
                <span className="text-indigo-400">Answer / Definition</span>
              </div>
              <p className="text-xs md:text-sm text-slate-200 text-center leading-relaxed px-4 py-8 overflow-y-auto max-h-36 scrollbar-thin select-text">
                {currentCard.answer || currentCard.back}
              </p>
              <div className="text-center text-[9px] text-slate-500 font-bold uppercase tracking-wider select-none">
                Click to flip back
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center max-w-md mx-auto">
        <button
          disabled={currentIdx === 0}
          onClick={() => { setCurrentIdx(prev => prev - 1); setFlipped(false); }}
          className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-slate-250 rounded-xl text-xs flex items-center gap-1 cursor-pointer disabled:opacity-30 animate-none"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <div className="flex gap-3">
          <button
            onClick={() => handleOutcome(false)}
            className="px-4 py-2 bg-rose-950/20 border border-rose-900/40 hover:bg-rose-900/30 text-rose-455 rounded-xl text-xs font-semibold cursor-pointer transition-all active:scale-95 animate-none"
          >
            Needs Review
          </button>
          <button
            onClick={() => handleOutcome(true)}
            className="px-4 py-2 bg-emerald-950/20 border border-emerald-900/40 hover:bg-emerald-900/30 text-emerald-450 rounded-xl text-xs font-semibold cursor-pointer transition-all active:scale-95 animate-none"
          >
            I Know This!
          </button>
        </div>

        {currentIdx < cardsList.length - 1 ? (
          <button
            onClick={() => { setCurrentIdx(prev => prev + 1); setFlipped(false); }}
            className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-slate-250 rounded-xl text-xs flex items-center gap-1 cursor-pointer animate-none"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="w-20" />
        )}
      </div>
    </div>
  );
};

export default AIAssistant;
