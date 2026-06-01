import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import API from '../services/api';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/dateFormatter';
import {
  Plus,
  Edit2,
  Trash2,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  BookOpen,
  User,
  Award,
  Layers,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  BookMarked,
  Info,
  AlertCircle
} from 'lucide-react';

const AcademicPlanner = () => {
  // Tab states: 'subjects' | 'timetable' | 'calendar'
  const [activeTab, setActiveTab] = useState('subjects');
  const [subjects, setSubjects] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [tasks, setTasks] = useState([]); // for calendar integration
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('all');

  // Active day filter for mobile weekly timetable view
  const [mobileActiveDay, setMobileActiveDay] = useState('Monday');

  // Modals state
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isTimetableModalOpen, setIsTimetableModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'subject'|'timetable', id: '', name: '' }
  const [editingSubject, setEditingSubject] = useState(null);
  const [editingSlot, setEditingSlot] = useState(null);

  // Day detail modal for Calendar View
  const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null); // Date object
  const [selectedDayEvents, setSelectedDayEvents] = useState({ classes: [], tasks: [] });

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());

  // Subject Form Hook
  const {
    register: registerSubject,
    handleSubmit: handleSubjectSubmit,
    setValue: setSubjectValue,
    reset: resetSubjectForm,
    formState: { errors: subjectErrors }
  } = useForm();

  // Timetable Form Hook
  const {
    register: registerTimetable,
    handleSubmit: handleTimetableSubmit,
    setValue: setTimetableValue,
    reset: resetTimetableForm,
    formState: { errors: timetableErrors }
  } = useForm();

  const colors = [
    { name: 'Indigo', hex: '#6366f1' },
    { name: 'Violet', hex: '#8b5cf6' },
    { name: 'Fuchsia', hex: '#d946ef' },
    { name: 'Pink', hex: '#ec4899' },
    { name: 'Rose', hex: '#f43f5e' },
    { name: 'Red', hex: '#ef4444' },
    { name: 'Orange', hex: '#f97316' },
    { name: 'Amber', hex: '#f59e0b' },
    { name: 'Emerald', hex: '#10b981' },
    { name: 'Teal', hex: '#14b8a6' },
    { name: 'Cyan', hex: '#06b6d4' },
    { name: 'Sky', hex: '#0ea5e9' }
  ];

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => {
      controller.abort();
    };
  }, []);

  const fetchData = async (signal) => {
    try {
      setLoading(true);
      const [subsRes, timeRes, tasksRes] = await Promise.all([
        API.get('/subjects', { signal }),
        API.get('/timetable', { signal }),
        API.get('/tasks', { signal })
      ]);

      if (subsRes.data.success) {
        setSubjects(subsRes.data.subjects);
      }
      if (timeRes.data.success) {
        setTimetable(timeRes.data.timetable);
      }
      if (tasksRes.data.success) {
        // filter for tasks with valid due dates
        setTasks(tasksRes.data.tasks || []);
      }
    } catch (error) {
      if (error?.name === 'CanceledError' || error?.message === 'canceled') {
        return;
      }
      console.error('Fetch academic data error:', error);
      toast.error('Failed to load academic planner data');
    } finally {
      setLoading(false);
    }
  };

  // ================= SUBJECT CRUD ACTIONS =================
  const openSubjectAdd = () => {
    setEditingSubject(null);
    resetSubjectForm({
      subject: '',
      subjectCode: '',
      faculty: '',
      credits: 3,
      semester: 1,
      color: '#6366f1'
    });
    setIsSubjectModalOpen(true);
  };

  const openSubjectEdit = (sub) => {
    setEditingSubject(sub);
    resetSubjectForm({
      subject: sub.subject,
      subjectCode: sub.subjectCode || '',
      faculty: sub.faculty || '',
      credits: sub.credits || 3,
      semester: sub.semester || 1,
      color: sub.color || '#6366f1'
    });
    setIsSubjectModalOpen(true);
  };

  const onSubjectSubmit = async (data) => {
    try {
      let res;
      if (editingSubject) {
        res = await API.put(`/subjects/${editingSubject._id}`, data);
        if (res.data.success) {
          toast.success('Subject updated successfully');
          setSubjects(subjects.map(s => s._id === editingSubject._id ? res.data.subject : s));
        }
      } else {
        res = await API.post('/subjects', data);
        if (res.data.success) {
          toast.success('Subject created successfully');
          setSubjects([...subjects, res.data.subject]);
        }
      }
      setIsSubjectModalOpen(false);
      resetSubjectForm();
      // Refetch timetable slots to ensure populated subject data matches updated values
      const timeRes = await API.get('/timetable');
      if (timeRes.data.success) {
        setTimetable(timeRes.data.timetable);
      }
    } catch (error) {
      console.error('Subject submit error:', error);
      toast.error(error.response?.data?.message || 'Failed to save subject');
    }
  };

  // ================= TIMETABLE CRUD ACTIONS =================
  const openTimetableAdd = (initialDay = 'Monday') => {
    setEditingSlot(null);
    resetTimetableForm({
      subjectId: subjects[0]?._id || '',
      day: initialDay,
      startTime: '09:00',
      endTime: '10:30',
      room: ''
    });
    setIsTimetableModalOpen(true);
  };

  const openTimetableEdit = (slot) => {
    setEditingSlot(slot);
    resetTimetableForm({
      subjectId: slot.subjectId?._id || slot.subjectId,
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      room: slot.room || ''
    });
    setIsTimetableModalOpen(true);
  };

  const onTimetableSubmit = async (data) => {
    try {
      let res;
      if (editingSlot) {
        res = await API.put(`/timetable/${editingSlot._id}`, data);
        if (res.data.success) {
          toast.success('Timetable slot updated');
          setTimetable(timetable.map(t => t._id === editingSlot._id ? res.data.timetable : t));
        }
      } else {
        res = await API.post('/timetable', data);
        if (res.data.success) {
          toast.success('Class scheduled successfully');
          setTimetable([...timetable, res.data.timetable]);
        }
      }
      setIsTimetableModalOpen(false);
      resetTimetableForm();
    } catch (error) {
      console.error('Timetable submit error:', error);
      toast.error(error.response?.data?.message || 'Failed to save class slot');
    }
  };

  // ================= DELETE CONFIRMATION =================
  const triggerDelete = (type, id, name) => {
    setDeleteTarget({ type, id, name });
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const { type, id } = deleteTarget;
    try {
      if (type === 'subject') {
        const res = await API.delete(`/subjects/${id}`);
        if (res.data.success) {
          toast.success('Subject and its classes deleted');
          setSubjects(subjects.filter(s => s._id !== id));
          setTimetable(timetable.filter(t => (t.subjectId?._id || t.subjectId) !== id));
        }
      } else if (type === 'timetable') {
        const res = await API.delete(`/timetable/${id}`);
        if (res.data.success) {
          toast.success('Class slot removed');
          setTimetable(timetable.filter(t => t._id !== id));
        }
      }
      setIsDeleteConfirmOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to remove item');
    }
  };

  // ================= SEARCH & FILTERS FOR SUBJECTS =================
  const filteredSubjects = subjects.filter(sub => {
    const matchesSearch = sub.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sub.subjectCode && sub.subjectCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sub.faculty && sub.faculty.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSemester = selectedSemester === 'all' || sub.semester === Number(selectedSemester);
    
    return matchesSearch && matchesSemester;
  });

  // ================= CALENDAR CALCULATIONS =================
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // index of first day (0 = Sun, etc.)
    const totalDays = new Date(year, month + 1, 0).getDate(); // days in current month
    const totalDaysPrev = new Date(year, month, 0).getDate(); // days in previous month

    const days = [];
    
    // Add buffer days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        day: totalDaysPrev - i,
        month: 'prev',
        date: new Date(year, month - 1, totalDaysPrev - i)
      });
    }

    // Add current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        day: i,
        month: 'current',
        date: new Date(year, month, i)
      });
    }

    // Add buffer days from next month (fill up to 42 cells for standard 6-row grid)
    const totalCells = 42;
    const remainingCells = totalCells - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        day: i,
        month: 'next',
        date: new Date(year, month + 1, i)
      });
    }

    return days;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getCalendarEventsForDate = (dateObj) => {
    // 1. Map timetable classes based on day of week
    const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekday = weekdayNames[dateObj.getDay()];
    
    const classes = timetable
      .filter(t => t.day === weekday)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    // 2. Map tasks matching due date
    const dateStr = dateObj.toDateString();
    const matchedTasks = tasks.filter(t => {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      return due.toDateString() === dateStr;
    });

    return { classes, tasks: matchedTasks };
  };

  const openDayDetail = (cell) => {
    const events = getCalendarEventsForDate(cell.date);
    setSelectedCalendarDay(cell.date);
    setSelectedDayEvents(events);
    setIsDayDetailOpen(true);
  };

  const getEventBadgeStyle = (title) => {
    const lower = title.toLowerCase();
    if (lower.includes('exam') || lower.includes('test') || lower.includes('quiz') || lower.includes('midterm') || lower.includes('final')) {
      return 'bg-red-500/10 text-red-400 border-red-500/20'; // Exam styling
    }
    if (lower.includes('event') || lower.includes('seminar') || lower.includes('talk') || lower.includes('workshop')) {
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20'; // Event styling
    }
    return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'; // Default Assignment Deadline
  };

  const getEventBadgeIcon = (title) => {
    const lower = title.toLowerCase();
    if (lower.includes('exam') || lower.includes('test') || lower.includes('quiz') || lower.includes('midterm') || lower.includes('final')) {
      return '🔥 Exam:';
    }
    if (lower.includes('event') || lower.includes('seminar') || lower.includes('talk') || lower.includes('workshop')) {
      return '🎉 Event:';
    }
    return '📚 Due:';
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-white">Academic Planner</h1>
          <p className="text-slate-400 text-sm mt-1">Manage subjects, configure your weekly class schedule, and keep tabs on upcoming deadlines.</p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'subjects' && (
            <button
              onClick={openSubjectAdd}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 px-4 rounded-xl shadow-lg shadow-indigo-600/10 transition-all duration-200 cursor-pointer active:scale-95 text-sm"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>Add Subject</span>
            </button>
          )}
          {activeTab === 'timetable' && subjects.length > 0 && (
            <button
              onClick={() => openTimetableAdd('Monday')}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 px-4 rounded-xl shadow-lg shadow-indigo-600/10 transition-all duration-200 cursor-pointer active:scale-95 text-sm"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>Add Class</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-800/80">
        <button
          onClick={() => setActiveTab('subjects')}
          className={`pb-3 px-6 text-sm font-semibold tracking-wide transition-all border-b-2 cursor-pointer ${
            activeTab === 'subjects'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Subjects ({subjects.length})
        </button>
        <button
          onClick={() => setActiveTab('timetable')}
          className={`pb-3 px-6 text-sm font-semibold tracking-wide transition-all border-b-2 cursor-pointer ${
            activeTab === 'timetable'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Weekly Timetable
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`pb-3 px-6 text-sm font-semibold tracking-wide transition-all border-b-2 cursor-pointer ${
            activeTab === 'calendar'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Calendar View
        </button>
      </div>

      {/* ========================================================= */}
      {/* 1. SUBJECTS TAB */}
      {/* ========================================================= */}
      {activeTab === 'subjects' && (
        <div className="space-y-6">
          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-3 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Search subjects, codes, faculty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0a0f1d]/75 border border-slate-800/80 focus:border-indigo-500 rounded-xl py-2.5 pl-11 pr-4 text-white placeholder-slate-500 outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-[#0a0f1d]/75 border border-slate-800/80 rounded-xl px-3 py-2 text-slate-400">
                <Filter className="w-4 h-4" />
                <span className="text-xs font-medium">Semester</span>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="bg-transparent text-white font-medium text-xs outline-none cursor-pointer pr-2"
                >
                  <option value="all" className="bg-[#0f172a]">All</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                    <option key={sem} value={sem} className="bg-[#0f172a]">Semester {sem}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Subjects Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-slate-850 border-t-indigo-500 rounded-full animate-spin"></div>
              <p className="mt-3 text-slate-400 text-sm">Loading academic subjects...</p>
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="bg-[#0a0f1d]/40 border border-slate-850/80 rounded-2xl p-12 text-center max-w-xl mx-auto">
              <div className="flex justify-center mb-4 text-slate-650">
                <BookMarked className="w-16 h-16 stroke-1" />
              </div>
              <h3 className="text-lg font-heading font-semibold text-white">No subjects found</h3>
              <p className="text-slate-400 text-sm mt-2">
                {searchTerm || selectedSemester !== 'all' 
                  ? 'Try relaxing your search terms or filters.'
                  : 'Start by clicking "Add Subject" to configure your semester planners.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSubjects.map(sub => {
                const classCount = timetable.filter(t => (t.subjectId?._id || t.subjectId) === sub._id).length;
                return (
                  <div
                    key={sub._id}
                    className="bg-[#0a0f1d]/75 border border-slate-800/80 hover:border-slate-700/90 rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden"
                  >
                    {/* Color Banner */}
                    <div 
                      className="absolute top-0 left-0 right-0 h-1.5" 
                      style={{ backgroundColor: sub.color }}
                    ></div>

                    <div className="space-y-4">
                      {/* Name & Code */}
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-heading font-bold text-white text-lg truncate" title={sub.subject}>
                            {sub.subject}
                          </h3>
                          {sub.subjectCode && (
                            <span 
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0"
                              style={{ color: sub.color, backgroundColor: `${sub.color}15`, border: `1px solid ${sub.color}25` }}
                            >
                              {sub.subjectCode}
                            </span>
                          )}
                        </div>
                        {sub.faculty && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1.5">
                            <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="truncate">{sub.faculty}</span>
                          </div>
                        )}
                      </div>

                      {/* Details Row */}
                      <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-850/60 text-xs">
                        <div className="text-center">
                          <span className="text-slate-500 block text-[10px] font-medium uppercase tracking-wider">Credits</span>
                          <div className="flex items-center justify-center gap-1 mt-1 font-bold text-slate-200">
                            <Award className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{sub.credits}</span>
                          </div>
                        </div>
                        <div className="text-center border-x border-slate-850/60">
                          <span className="text-slate-500 block text-[10px] font-medium uppercase tracking-wider">Semester</span>
                          <div className="flex items-center justify-center gap-1 mt-1 font-bold text-slate-200">
                            <Layers className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Sem {sub.semester}</span>
                          </div>
                        </div>
                        <div className="text-center">
                          <span className="text-slate-500 block text-[10px] font-medium uppercase tracking-wider">Classes</span>
                          <div className="flex items-center justify-center gap-1 mt-1 font-bold text-slate-200">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>{classCount} / wk</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: sub.color }}
                        ></span>
                        <span className="text-[10px] text-slate-500 font-semibold uppercase">color tag</span>
                      </div>

                      <div className="flex items-center gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openSubjectEdit(sub)}
                          className="p-1.5 rounded-lg border border-slate-850 text-slate-400 hover:text-indigo-400 hover:bg-slate-800/40 cursor-pointer transition-all"
                          title="Edit Subject"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => triggerDelete('subject', sub._id, sub.subject)}
                          className="p-1.5 rounded-lg border border-slate-850 text-slate-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer transition-all"
                          title="Delete Subject"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. TIMETABLE TAB */}
      {/* ========================================================= */}
      {activeTab === 'timetable' && (
        <div className="space-y-6">
          {subjects.length === 0 ? (
            <div className="bg-[#0a0f1d]/40 border border-slate-850/80 rounded-2xl p-12 text-center max-w-xl mx-auto">
              <div className="flex justify-center mb-4 text-slate-650">
                <Clock className="w-16 h-16 stroke-1" />
              </div>
              <h3 className="text-lg font-heading font-semibold text-white">Create subjects first</h3>
              <p className="text-slate-400 text-sm mt-2">
                You must add at least one subject to your database before scheduling class slots.
              </p>
              <button
                onClick={() => setActiveTab('subjects')}
                className="mt-5 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 px-4 rounded-xl text-sm transition-all"
              >
                Go to Subjects
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Weekday Grid View */}
              <div className="hidden lg:grid lg:grid-cols-6 gap-4">
                {daysOfWeek.map(day => {
                  const daySlots = timetable
                    .filter(t => t.day === day)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime));

                  return (
                    <div key={day} className="flex flex-col bg-[#050814]/40 border border-slate-900 rounded-2xl p-3 min-h-[450px]">
                      <div className="pb-3 border-b border-slate-850 mb-3 flex items-center justify-between">
                        <span className="font-heading font-bold text-white text-sm">{day}</span>
                        <button
                          onClick={() => openTimetableAdd(day)}
                          className="p-1 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-white transition-colors"
                          title={`Schedule class on ${day}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex-1 space-y-3 overflow-y-auto">
                        {daySlots.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-slate-650 text-xs text-center p-4 py-12 border border-dashed border-slate-850 rounded-xl">
                            No classes
                          </div>
                        ) : (
                          daySlots.map(slot => {
                            const subDetails = slot.subjectId;
                            const color = subDetails?.color || '#6366f1';
                            return (
                              <div
                                key={slot._id}
                                className="bg-[#0a0f1d]/90 border border-slate-800/80 rounded-xl p-3 relative overflow-hidden group hover:border-slate-700/80 transition-all duration-200"
                              >
                                {/* Left color indicator */}
                                <div 
                                  className="absolute left-0 top-0 bottom-0 w-1" 
                                  style={{ backgroundColor: color }}
                                ></div>

                                <div className="pl-1 space-y-2">
                                  <div>
                                    <h4 className="font-heading font-bold text-xs text-white truncate" title={subDetails?.subject || 'Unknown'}>
                                      {subDetails?.subject || 'Unknown'}
                                    </h4>
                                    {subDetails?.subjectCode && (
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                        {subDetails.subjectCode}
                                      </p>
                                    )}
                                  </div>

                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                      <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                                      <span>{slot.startTime} - {slot.endTime}</span>
                                    </div>
                                    {slot.room && (
                                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                        <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                                        <span className="truncate">{slot.room}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Quick Actions overlay */}
                                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-850 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => openTimetableEdit(slot)}
                                      className="p-1 text-slate-400 hover:text-indigo-400 rounded transition-colors"
                                      title="Edit class"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => triggerDelete('timetable', slot._id, `${subDetails?.subject || 'Class'} (${slot.startTime})`)}
                                      className="p-1 text-slate-400 hover:text-red-400 rounded transition-colors"
                                      title="Delete class"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mobile Daily Timetable Switcher View */}
              <div className="lg:hidden space-y-4">
                {/* Switcher pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                  {daysOfWeek.map(day => (
                    <button
                      key={day}
                      onClick={() => setMobileActiveDay(day)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold shrink-0 cursor-pointer transition-all ${
                        mobileActiveDay === day
                          ? 'bg-indigo-600 text-white'
                          : 'bg-[#0a0f1d]/75 border border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>

                {/* Day Slots List */}
                <div className="bg-[#050814]/30 border border-slate-900/60 rounded-2xl p-4 min-h-[250px]">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-850 pb-2">
                    <span className="font-heading font-bold text-white text-base">{mobileActiveDay} Classes</span>
                    <button
                      onClick={() => openTimetableAdd(mobileActiveDay)}
                      className="flex items-center gap-1 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600 hover:text-white px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>

                  {timetable
                    .filter(t => t.day === mobileActiveDay)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime)).length === 0 ? (
                      <div className="py-12 flex flex-col items-center justify-center text-center text-slate-500 border border-dashed border-slate-850 rounded-xl">
                        <Clock className="w-10 h-10 stroke-1 text-slate-650 mb-2" />
                        <p className="text-xs">No classes scheduled on {mobileActiveDay}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {timetable
                          .filter(t => t.day === mobileActiveDay)
                          .sort((a, b) => a.startTime.localeCompare(b.startTime))
                          .map(slot => {
                            const subDetails = slot.subjectId;
                            const color = subDetails?.color || '#6366f1';
                            return (
                              <div
                                key={slot._id}
                                className="bg-[#0a0f1d]/75 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between relative overflow-hidden"
                              >
                                <div 
                                  className="absolute left-0 top-0 bottom-0 w-1.5" 
                                  style={{ backgroundColor: color }}
                                ></div>
                                
                                <div className="pl-3 flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-heading font-bold text-sm text-white truncate">
                                      {subDetails?.subject || 'Unknown'}
                                    </h4>
                                    {subDetails?.subjectCode && (
                                      <span 
                                        className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0"
                                        style={{ color, backgroundColor: `${color}15`, border: `1px solid ${color}20` }}
                                      >
                                        {subDetails.subjectCode}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                                      <span>{slot.startTime} - {slot.endTime}</span>
                                    </div>
                                    {slot.room && (
                                      <div className="flex items-center gap-1">
                                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                                        <span>{slot.room}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 pl-2">
                                  <button
                                    onClick={() => openTimetableEdit(slot)}
                                    className="p-2 rounded-lg border border-slate-850 text-slate-400 hover:text-indigo-400"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => triggerDelete('timetable', slot._id, `${subDetails?.subject || 'Class'} (${slot.startTime})`)}
                                    className="p-2 rounded-lg border border-slate-850 text-slate-400 hover:text-red-400"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        }
                      </div>
                    )
                  }
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. CALENDAR TAB */}
      {/* ========================================================= */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          {/* Calendar Header Control */}
          <div className="flex items-center justify-between bg-[#0a0f1d]/75 border border-slate-800/80 p-4 rounded-2xl">
            <h2 className="font-heading font-bold text-white text-base md:text-lg flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-indigo-400" />
              <span>
                {currentDate.toLocaleString('default', { month: 'long' })} {currentDate.getFullYear()}
              </span>
            </h2>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="text-xs font-semibold px-3 py-1.5 bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
              >
                Today
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Monthly Grid */}
          <div className="bg-[#050814]/30 border border-slate-900 rounded-3xl p-3 overflow-hidden">
            {/* Weekdays Headers */}
            <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider py-2">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Calendar Cells */}
            <div className="grid grid-cols-7 gap-1.5 mt-1 bg-slate-950/20">
              {getDaysInMonth(currentDate).map((cell, idx) => {
                const { classes, tasks } = getCalendarEventsForDate(cell.date);
                const hasEvents = classes.length > 0 || tasks.length > 0;
                
                const isToday = cell.date.toDateString() === new Date().toDateString();
                const isCurrentMonth = cell.month === 'current';

                return (
                  <div
                    key={idx}
                    onClick={() => openDayDetail(cell)}
                    className={`min-h-[75px] md:min-h-[105px] p-1.5 border rounded-2xl flex flex-col justify-between cursor-pointer transition-all duration-150 ${
                      isToday 
                        ? 'border-indigo-500/80 bg-indigo-500/[0.04] shadow-md shadow-indigo-500/[0.01]' 
                        : isCurrentMonth
                          ? 'border-slate-850/80 bg-[#0a0f1d]/40 hover:border-slate-700/80 hover:bg-slate-800/10'
                          : 'border-slate-900/50 bg-[#070b16]/10 text-slate-650 hover:bg-slate-800/5'
                    }`}
                  >
                    {/* Day number */}
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold font-heading px-1.5 py-0.5 rounded-md ${
                        isToday ? 'bg-indigo-600 text-white' : isCurrentMonth ? 'text-slate-350' : 'text-slate-600'
                      }`}>
                        {cell.day}
                      </span>

                      {isToday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                      )}
                    </div>

                    {/* Events indicators */}
                    <div className="mt-2 space-y-1 overflow-hidden flex-1 flex flex-col justify-end">
                      {/* Class indicator dots / brief text */}
                      {classes.length > 0 && (
                        <div className="hidden md:flex flex-wrap gap-1 px-0.5 max-h-[22px] overflow-hidden">
                          {classes.slice(0, 3).map((c, cidx) => (
                            <span 
                              key={cidx}
                              className="w-2 h-2 rounded-full inline-block shrink-0" 
                              style={{ backgroundColor: c.subjectId?.color || '#6366f1' }}
                              title={c.subjectId?.subject}
                            />
                          ))}
                          {classes.length > 3 && (
                            <span className="text-[8px] font-bold text-slate-500">+{classes.length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* Tasks due badges (Desktop only) */}
                      {tasks.length > 0 && (
                        <div className="hidden md:block overflow-hidden max-h-[36px] space-y-0.5">
                          {tasks.slice(0, 2).map((t, tidx) => (
                            <div 
                              key={tidx}
                              className="text-[9px] font-bold truncate px-1 py-0.5 rounded border leading-tight uppercase"
                              style={{ 
                                color: t.priority === 'high' ? '#f43f5e' : t.priority === 'medium' ? '#f59e0b' : '#38bdf8',
                                backgroundColor: t.priority === 'high' ? '#f43f5e10' : t.priority === 'medium' ? '#f59e0b10' : '#38bdf810',
                                borderColor: t.priority === 'high' ? '#f43f5e20' : t.priority === 'medium' ? '#f59e0b20' : '#38bdf820'
                              }}
                            >
                              {t.title}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Small mobile indicator dot */}
                      {hasEvents && (
                        <div className="md:hidden flex justify-center pb-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. MODALS & POPUPS */}
      {/* ========================================================= */}

      {/* A. SUBJECT ADD/EDIT MODAL */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60 shrink-0">
              <h2 className="font-heading text-lg font-bold text-white">
                {editingSubject ? 'Edit Subject Details' : 'Add New Subject'}
              </h2>
              <button
                onClick={() => {
                  setIsSubjectModalOpen(false);
                  resetSubjectForm();
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubjectSubmit(onSubjectSubmit)} className="p-6 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
              {/* Subject Title */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Subject Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Data Structures & Algorithms"
                  {...registerSubject('subject', { required: 'Subject name is required' })}
                  className={`w-full bg-[#131b2e]/60 border ${
                    subjectErrors.subject ? 'border-red-500/80 focus:ring-red-500/20' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
                  } rounded-xl py-2.5 px-4 text-white placeholder-slate-500 outline-none transition-all focus:ring-4`}
                />
                {subjectErrors.subject && (
                  <p className="mt-1 text-xs text-red-400 font-medium">{subjectErrors.subject.message}</p>
                )}
              </div>

              {/* Subject Code */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Subject Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. CS202"
                  {...registerSubject('subjectCode')}
                  className="w-full bg-[#131b2e]/60 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 outline-none transition-all focus:ring-4 focus:ring-indigo-500/20"
                />
              </div>

              {/* Faculty Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Faculty Advisor / Lecturer
                </label>
                <input
                  type="text"
                  placeholder="e.g. Prof. Donald Knuth"
                  {...registerSubject('faculty')}
                  className="w-full bg-[#131b2e]/60 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 outline-none transition-all focus:ring-4 focus:ring-indigo-500/20"
                />
              </div>

              {/* Credits & Semester Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Credits */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Credits (Credits allocation)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="3"
                    {...registerSubject('credits', {
                      required: 'Required',
                      min: { value: 0, message: 'Cannot be negative' }
                    })}
                    className="w-full bg-[#131b2e]/60 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 outline-none transition-all focus:ring-4 focus:ring-indigo-500/20"
                  />
                  {subjectErrors.credits && (
                    <p className="mt-1 text-xs text-red-400 font-medium">{subjectErrors.credits.message}</p>
                  )}
                </div>

                {/* Semester */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Semester
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="1"
                    {...registerSubject('semester', {
                      required: 'Required',
                      min: { value: 1, message: 'Minimum 1' }
                    })}
                    className="w-full bg-[#131b2e]/60 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 outline-none transition-all focus:ring-4 focus:ring-indigo-500/20"
                  />
                  {subjectErrors.semester && (
                    <p className="mt-1 text-xs text-red-400 font-medium">{subjectErrors.semester.message}</p>
                  )}
                </div>
              </div>

              {/* Color Tag Picker */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Select Accent Color
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {colors.map(color => (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => setSubjectValue('color', color.hex)}
                      className="aspect-square rounded-xl border border-slate-800 cursor-pointer flex items-center justify-center hover:scale-105 transition-transform"
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    >
                      {/* Display a small dot check if color matches */}
                      <span className="w-1.5 h-1.5 rounded-full bg-white opacity-0 group-hover:opacity-100"></span>
                    </button>
                  ))}
                </div>
                {/* Hidden input to hold registered value */}
                <input type="hidden" {...registerSubject('color')} />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/60 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsSubjectModalOpen(false);
                    resetSubjectForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm py-2 px-5 rounded-xl transition-all cursor-pointer hover:shadow-indigo-500/10 active:scale-95"
                >
                  {editingSubject ? 'Save Changes' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* B. TIMETABLE SCHEDULE ADD/EDIT MODAL */}
      {isTimetableModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60 shrink-0">
              <h2 className="font-heading text-lg font-bold text-white">
                {editingSlot ? 'Edit Scheduled Class' : 'Schedule New Class'}
              </h2>
              <button
                onClick={() => {
                  setIsTimetableModalOpen(false);
                  resetTimetableForm();
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleTimetableSubmit(onTimetableSubmit)} className="p-6 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
              {/* Subject Dropdown */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Select Subject *
                </label>
                <select
                  {...registerTimetable('subjectId', { required: 'Please select a subject' })}
                  className="w-full bg-[#131b2e]/60 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-4 text-white outline-none transition-all focus:ring-4 focus:ring-indigo-500/20 cursor-pointer"
                >
                  {subjects.map(sub => (
                    <option key={sub._id} value={sub._id} className="bg-[#0f172a]">
                      {sub.subject} {sub.subjectCode ? `(${sub.subjectCode})` : ''}
                    </option>
                  ))}
                </select>
                {timetableErrors.subjectId && (
                  <p className="mt-1 text-xs text-red-400 font-medium">{timetableErrors.subjectId.message}</p>
                )}
              </div>

              {/* Day Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Day of the Week *
                </label>
                <select
                  {...registerTimetable('day', { required: 'Please select a day' })}
                  className="w-full bg-[#131b2e]/60 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-4 text-white outline-none transition-all focus:ring-4 focus:ring-indigo-500/20 cursor-pointer"
                >
                  {daysOfWeek.map(d => (
                    <option key={d} value={d} className="bg-[#0f172a]">{d}</option>
                  ))}
                </select>
                {timetableErrors.day && (
                  <p className="mt-1 text-xs text-red-400 font-medium">{timetableErrors.day.message}</p>
                )}
              </div>

              {/* Start & End Times Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Start Time */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    {...registerTimetable('startTime', { required: 'Required' })}
                    className="w-full bg-[#131b2e]/60 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-4 text-white outline-none transition-all focus:ring-4 focus:ring-indigo-500/20"
                  />
                  {timetableErrors.startTime && (
                    <p className="mt-1 text-xs text-red-400 font-medium">{timetableErrors.startTime.message}</p>
                  )}
                </div>

                {/* End Time */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    End Time *
                  </label>
                  <input
                    type="time"
                    {...registerTimetable('endTime', { required: 'Required' })}
                    className="w-full bg-[#131b2e]/60 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-4 text-white outline-none transition-all focus:ring-4 focus:ring-indigo-500/20"
                  />
                  {timetableErrors.endTime && (
                    <p className="mt-1 text-xs text-red-400 font-medium">{timetableErrors.endTime.message}</p>
                  )}
                </div>
              </div>

              {/* Classroom Room Number */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Classroom / Laboratory Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Block B, Hall 103"
                  {...registerTimetable('room')}
                  className="w-full bg-[#131b2e]/60 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 outline-none transition-all focus:ring-4 focus:ring-indigo-500/20"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/60 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsTimetableModalOpen(false);
                    resetTimetableForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm py-2 px-5 rounded-xl transition-all cursor-pointer hover:shadow-indigo-500/10 active:scale-95"
                >
                  {editingSlot ? 'Save Class' : 'Schedule Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* C. CALENDAR CELL DETAIL DIALOGUE */}
      {isDayDetailOpen && selectedCalendarDay && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60 shrink-0">
              <h2 className="font-heading text-base md:text-lg font-bold text-white">
                Events for {formatDate(selectedCalendarDay, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </h2>
              <button
                onClick={() => {
                  setIsDayDetailOpen(false);
                  setSelectedCalendarDay(null);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 scrollbar-thin">
              {/* Classes Sublist */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Lectures & Lab Sessions</h3>
                {selectedDayEvents.classes.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">No scheduled lectures today.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedDayEvents.classes.map(c => {
                      const color = c.subjectId?.color || '#6366f1';
                      return (
                        <div 
                          key={c._id} 
                          className="bg-[#0a0f1d]/70 border border-slate-850 p-3 rounded-xl relative overflow-hidden"
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: color }}></div>
                          <div className="pl-2 flex items-center justify-between gap-3">
                            <div>
                              <h4 className="font-heading text-xs font-bold text-white">{c.subjectId?.subject || 'Unknown'}</h4>
                              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-500" />
                                  <span>{c.startTime} - {c.endTime}</span>
                                </span>
                                {c.room && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-slate-500" />
                                    <span>{c.room}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tasks Sublist */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Deadlines, Events & Exams</h3>
                {selectedDayEvents.tasks.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">No deadlines or events registered for this day.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedDayEvents.tasks.map(t => (
                      <div 
                        key={t._id} 
                        className={`border rounded-xl p-3 flex items-start gap-3 transition-colors ${
                          t.completed 
                            ? 'bg-slate-900/20 border-slate-850 text-slate-500' 
                            : 'bg-[#0a0f1d]/70 border-slate-850'
                        }`}
                      >
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase leading-tight ${getEventBadgeStyle(t.title)}`}>
                              {getEventBadgeIcon(t.title)}
                            </span>
                            <span 
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase leading-tight ${
                                t.priority === 'high' 
                                  ? 'bg-red-500/10 text-red-400 border-red-500/10' 
                                  : t.priority === 'medium'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/10'
                                    : 'bg-sky-500/10 text-sky-400 border-sky-500/10'
                              }`}
                            >
                              {t.priority}
                            </span>
                          </div>
                          
                          <h4 className={`font-heading text-xs font-bold ${t.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                            {t.title}
                          </h4>
                          {t.description && (
                            <p className="text-[10px] text-slate-450 leading-relaxed truncate">{t.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-6 py-4 border-t border-slate-800/60 bg-slate-950/20">
              <button
                onClick={() => {
                  setIsDayDetailOpen(false);
                  setSelectedCalendarDay(null);
                }}
                className="bg-indigo-650 hover:bg-indigo-600 text-white font-medium text-xs py-2 px-4 rounded-xl transition-all cursor-pointer active:scale-95"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* D. GENERAL DELETE CONFIRMATION DIALOGUE */}
      {isDeleteConfirmOpen && deleteTarget && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 max-h-[90dvh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex gap-4 items-start">
              <div className="p-3 bg-red-500/10 rounded-2xl text-red-400 shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-heading text-lg font-bold text-white">Delete Item?</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Are you sure you want to delete <span className="text-slate-200 font-semibold">"{deleteTarget.name}"</span>?
                  {deleteTarget.type === 'subject' && (
                    <span className="text-red-450 block mt-1.5 font-medium text-xs">
                      ⚠️ WARNING: Deleting this subject will also cascade and delete all scheduled weekly classes linked to it.
                    </span>
                  )}
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-850 mt-5">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setDeleteTarget(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="bg-red-650 hover:bg-red-500 text-white font-medium text-sm py-2 px-5 rounded-xl transition-all cursor-pointer hover:shadow-red-500/10 active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicPlanner;
