import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/dateFormatter';
import ErrorBoundary from '../components/ErrorBoundary';

const PdfViewer = lazy(() => import('../components/PdfViewer'));
import {
  Upload,
  Search,
  FileText,
  FileImage,
  File,
  Download,
  Trash2,
  X,
  SlidersHorizontal,
  Calendar,
  Folder,
  FolderOpen,
  Info,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ExternalLink,
  AlertTriangle,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronRight,
  User,
  Plus,
  Edit2,
  Check,
  FolderPlus,
  RefreshCw,
  Send
} from 'lucide-react';

const NotesVault = () => {
  const navigate = useNavigate();

  const isSupportedByCampusBuddy = (fileType, title) => {
    const allowedExtensions = ['.pdf', '.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls'];
    const ext = title ? title.substring(title.lastIndexOf('.')).toLowerCase() : '';
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    return allowedExtensions.includes(ext) || allowedMimeTypes.includes(fileType);
  };

  // Lists
  const [notes, setNotes] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters and Layout Mode
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSidebarFolder, setSelectedSidebarFolder] = useState('all');
  const [selectedFileType, setSelectedFileType] = useState('all');
  const [selectedUploadDate, setSelectedUploadDate] = useState('all'); // 'all' | 'today' | 'week' | 'month'
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest' | 'nameAsc' | 'nameDesc'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Folders UI state
  const [expandedFolders, setExpandedFolders] = useState({});
  const [visibleFileCounts, setVisibleFileCounts] = useState({}); // Folder ID -> Count of visible files

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeNote, setActiveNote] = useState(null);
  const [isDeleteNoteOpen, setIsDeleteNoteOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);

  // Folder CRUD Modals state
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState(null); // Null for create, folder object for edit
  const [isDeleteFolderOpen, setIsDeleteFolderOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState(null);
  const [deleteFolderAction, setDeleteFolderAction] = useState('delete_all'); // 'delete_all' | 'move_files'
  const [targetFolderIdForMove, setTargetFolderIdForMove] = useState('');

  // Folder modal fields
  const [folderFormName, setFolderFormName] = useState('');
  const [folderFormColor, setFolderFormColor] = useState('#6366f1');

  // Drag and Drop Folder Highlights
  const [dragOverFolderId, setDragOverFolderId] = useState(null);
  const [globalDragActive, setGlobalDragActive] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [inlineFolderCreation, setInlineFolderCreation] = useState(false);
  const [inlineFolderName, setInlineFolderName] = useState('');
  const [inlineFolderColor, setInlineFolderColor] = useState('#6366f1');

  // Zoom / Rotation for Viewer
  const [zoomScale, setZoomScale] = useState(1);
  const [rotateAngle, setRotateAngle] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fileInputRef = useRef(null);

  // Preset theme colors for folders
  const folderColors = [
    { name: 'Indigo', hex: '#6366f1' },
    { name: 'Violet', hex: '#8b5cf6' },
    { name: 'Rose', hex: '#f43f5e' },
    { name: 'Amber', hex: '#f59e0b' },
    { name: 'Emerald', hex: '#10b981' },
    { name: 'Cyan', hex: '#06b6d4' },
    { name: 'Red', hex: '#ef4444' },
    { name: 'Orange', hex: '#f97316' }
  ];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm({
    defaultValues: {
      title: '',
      groupId: '',
      description: ''
    }
  });

  const watchGroupId = watch('groupId');
  const watchTitle = watch('title');

  // Fetch folders and notes in parallel
  const fetchData = async (silent = false, signal = null) => {
    try {
      if (!silent) setLoading(true);
      const [foldersRes, notesRes] = await Promise.all([
        API.get('/groups', { signal }),
        API.get('/notes', { signal })
      ]);

      if (foldersRes.data?.success) {
        const loadedFolders = foldersRes.data.groups || [];
        setFolders(loadedFolders);

        // Keep expand/collapse sync
        setExpandedFolders(prev => {
          const updated = { ...prev };
          loadedFolders.forEach(folder => {
            if (updated[folder._id] === undefined) {
              updated[folder._id] = true; // Default expanded
            }
          });
          return updated;
        });
      }

      if (notesRes.data?.success) {
        setNotes(notesRes.data.notes || []);
      }
    } catch (error) {
      if (error?.name === 'CanceledError' || error?.message === 'canceled') {
        return;
      }
      console.error('Fetch notes/folders error:', error);
      toast.error('Failed to load notes vault files');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchData(false, controller.signal);
    return () => {
      controller.abort();
    };
  }, []);

  // Validation details
  const allowedExtensions = ['.pdf', '.docx', '.pptx', '.ppt', '.jpg', '.jpeg', '.png'];

  const validateAndSetFile = (file) => {
    if (!file) return;
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      toast.error('Invalid format! PDF, DOCX, PPT/PPTX, JPG, JPEG, PNG only');
      setSelectedFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds the 10MB safety limit');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    // Autofill title if empty
    const defaultTitle = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    setValue('title', defaultTitle);
  };

  // Drag and Drop helpers for Folder elements
  const handleGlobalDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setGlobalDragActive(true);
    } else if (e.type === "dragleave") {
      // Basic coordinates check to avoid jittering
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;
      if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
        setGlobalDragActive(false);
      }
    }
  };

  const handleFolderDrop = (e, folderId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
    setGlobalDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
      setValue('groupId', folderId);
      setInlineFolderCreation(false);
      setIsUploadOpen(true);
      toast.success(`File detected for folder: ${folders.find(f => f._id === folderId)?.name || 'Folder'}`);
    }
  };

  // File change handler
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  // Note Upload Submission
  const onUploadSubmit = async (data) => {
    if (!selectedFile) {
      toast.error('Please select or drop a file to upload');
      return;
    }

    // Double check duplicate filenames before sending
    const targetFolderId = inlineFolderCreation ? null : data.groupId;
    const targetFolderName = inlineFolderCreation ? inlineFolderName.trim() : folders.find(f => f._id === data.groupId)?.name;
    
    if (!targetFolderId && (!inlineFolderCreation || !inlineFolderName.trim())) {
      toast.error('Please select a folder or create a new inline folder');
      return;
    }

    // Check if filename duplicates in folder
    const duplicates = notes.some(note => {
      const folderMatches = inlineFolderCreation 
        ? (note.groupId?.name?.toLowerCase() === targetFolderName.toLowerCase())
        : (note.groupId?._id === targetFolderId);
      return folderMatches && note.title?.toLowerCase() === data.title?.trim()?.toLowerCase();
    });

    if (duplicates) {
      toast.error(`A file with the title "${data.title}" already exists in folder "${targetFolderName}"`);
      return;
    }

    const formData = new FormData();
    formData.append('title', data.title.trim());
    formData.append('description', data.description || '');
    formData.append('file', selectedFile);

    if (inlineFolderCreation) {
      formData.append('newGroupName', inlineFolderName.trim());
      formData.append('newGroupColor', inlineFolderColor);
    } else {
      formData.append('groupId', data.groupId);
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const response = await API.post('/notes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      if (response.data?.success) {
        toast.success('Document uploaded and indexed inside folder! 📁');
        setIsUploadOpen(false);
        reset();
        setSelectedFile(null);
        setInlineFolderCreation(false);
        setInlineFolderName('');
        fetchData(true); // Update silently
      }
    } catch (error) {
      console.error('Note upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload document. Please check details and try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Delete note
  const handleDeleteNoteConfirm = async () => {
    if (!noteToDelete) return;
    try {
      const response = await API.delete(`/notes/${noteToDelete._id}`);
      if (response.data?.success) {
        toast.success('File deleted successfully');
        setIsDeleteNoteOpen(false);
        setNoteToDelete(null);
        fetchData(true); // Silent reload

        if (activeNote?._id === noteToDelete._id) {
          setIsDetailOpen(false);
          setActiveNote(null);
        }
      }
    } catch (error) {
      console.error('Delete note error:', error);
      toast.error('Failed to delete file');
    }
  };

  // Folder CRUD handlers
  const handleSaveFolder = async (e) => {
    e.preventDefault();
    if (!folderFormName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    try {
      if (folderToEdit) {
        // Edit Folder (Rename)
        const response = await API.put(`/groups/${folderToEdit._id}`, {
          name: folderFormName.trim(),
          color: folderFormColor
        });

        if (response.data?.success) {
          toast.success('Folder renamed successfully');
          setIsFolderModalOpen(false);
          setFolderToEdit(null);
          setFolderFormName('');
          fetchData(true);
        }
      } else {
        // Create Folder
        const response = await API.post('/groups', {
          name: folderFormName.trim(),
          color: folderFormColor
        });

        if (response.data?.success) {
          toast.success('Folder created successfully');
          setIsFolderModalOpen(false);
          setFolderFormName('');
          fetchData(true);
        }
      }
    } catch (error) {
      console.error('Save folder error:', error);
      toast.error(error.response?.data?.message || 'Failed to save folder');
    }
  };

  const handleDeleteFolderConfirm = async () => {
    if (!folderToDelete) return;
    try {
      const response = await API.delete(`/groups/${folderToDelete._id}`, {
        data: {
          action: deleteFolderAction,
          targetGroupId: deleteFolderAction === 'move_files' ? targetFolderIdForMove : undefined
        }
      });

      if (response.data?.success) {
        toast.success(response.data.message || 'Folder deleted successfully');
        setIsDeleteFolderOpen(false);
        setFolderToDelete(null);
        setTargetFolderIdForMove('');
        fetchData(true);
      }
    } catch (error) {
      console.error('Delete folder error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete folder');
    }
  };

  // Toggle expand folder
  const toggleFolderExpand = (folderId) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // Format helpers
  const formatNoteDate = (dateString) => {
    if (!dateString) return 'N/A';
    return formatDate(dateString);
  };

  const formatBytes = (bytes) => {
    if (bytes === undefined || bytes === null || isNaN(bytes)) return '0 Bytes';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // File rendering assets
  const getFileIcon = (fileType, fileUrl) => {
    const type = (fileType || '').toLowerCase();
    
    if (type.startsWith('image/') && fileUrl) {
      return (
        <img 
          src={fileUrl} 
          alt="thumbnail" 
          className="w-8 h-8 rounded object-cover border border-slate-700 shrink-0"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      );
    }
    if (type.includes('pdf')) {
      return <FileText className="w-8 h-8 text-red-500 shrink-0" />;
    }
    if (type.includes('word') || type.includes('msword') || type.includes('document')) {
      return <File className="w-8 h-8 text-blue-500 shrink-0" />;
    }
    if (type.includes('presentation') || type.includes('powerpoint') || type.includes('ppt')) {
      return <File className="w-8 h-8 text-orange-500 shrink-0" />;
    }
    return <File className="w-8 h-8 text-slate-400 shrink-0" />;
  };

  const getFileBadgeColor = (fileType) => {
    const type = (fileType || '').toLowerCase();
    if (type.includes('pdf')) return 'bg-red-500/10 text-red-400 border border-red-500/20';
    if (type.includes('image')) return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    if (type.includes('word') || type.includes('document')) return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    if (type.includes('presentation') || type.includes('powerpoint') || type.includes('ppt')) return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
    return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
  };

  const getCleanFileTypeName = (fileType) => {
    const type = (fileType || '').toLowerCase();
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('image')) return 'Image';
    if (type.includes('word') || type.includes('msword')) return 'Word';
    if (type.includes('presentation') || type.includes('powerpoint')) return 'PowerPoint';
    return 'Document';
  };

  // Filter and Search Calculations
  const filteredNotes = notes.filter(note => {
    if (!note) return false;
    
    // Search Term Filter
    const title = (note.title || '').toLowerCase();
    const folderName = (note.groupId?.name || note.subject || '').toLowerCase();
    const type = getCleanFileTypeName(note.fileType).toLowerCase();
    const matchesSearch = title.includes(searchTerm.toLowerCase()) || 
                          folderName.includes(searchTerm.toLowerCase()) || 
                          type.includes(searchTerm.toLowerCase());

    // Sidebar Folder Filter
    const matchesSidebar = selectedSidebarFolder === 'all' || note.groupId?._id === selectedSidebarFolder;

    // File Type Filter
    const cleanType = getCleanFileTypeName(note.fileType).toLowerCase();
    const matchesType = selectedFileType === 'all' || 
                        (selectedFileType === 'pdf' && cleanType === 'pdf') ||
                        (selectedFileType === 'image' && cleanType === 'image') ||
                        (selectedFileType === 'word' && cleanType === 'word') ||
                        (selectedFileType === 'powerpoint' && cleanType === 'powerpoint');

    // Date Filter
    const matchesDate = (() => {
      if (selectedUploadDate === 'all') return true;
      const noteDate = new Date(note.createdAt);
      const diffTime = Math.abs(new Date() - noteDate);
      const oneDay = 24 * 60 * 60 * 1000;
      if (selectedUploadDate === 'today') return diffTime <= oneDay;
      if (selectedUploadDate === 'week') return diffTime <= 7 * oneDay;
      if (selectedUploadDate === 'month') return diffTime <= 30 * oneDay;
      return true;
    })();

    return matchesSearch && matchesSidebar && matchesType && matchesDate;
  });

  // Client-side Sorting
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (sortOrder === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortOrder === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortOrder === 'nameAsc') return (a.title || '').localeCompare(b.title || '');
    if (sortOrder === 'nameDesc') return (b.title || '').localeCompare(a.title || '');
    return 0;
  });

  // Group notes under folders (incorporating General fallback)
  const groupedNotes = {};
  
  // Initialize with all existing folders (so we display folders even if empty!)
  folders.forEach(folder => {
    groupedNotes[folder._id] = [];
  });

  // Add notes to their folder slots
  sortedNotes.forEach(note => {
    const gId = note.groupId?._id || 'general';
    if (!groupedNotes[gId]) groupedNotes[gId] = [];
    groupedNotes[gId].push(note);
  });

  // Check if title has conflicts in current folder
  const conflictDetected = (() => {
    if (!watchTitle || (!watchGroupId && !inlineFolderCreation)) return false;
    const trimmedTitle = watchTitle.trim().toLowerCase();
    
    let folderNotesList = [];
    if (inlineFolderCreation) {
      const matchFolder = folders.find(f => f.name.toLowerCase() === inlineFolderName.trim().toLowerCase());
      if (matchFolder) {
        folderNotesList = notes.filter(n => n.groupId?._id === matchFolder._id);
      }
    } else {
      folderNotesList = notes.filter(n => n.groupId?._id === watchGroupId);
    }
    
    return folderNotesList.some(n => n.title.toLowerCase() === trimmedTitle);
  })();

  return (
    <ErrorBoundary>
      <div 
        className="space-y-6 min-h-[80vh]"
        onDragEnter={handleGlobalDrag}
        onDragOver={handleGlobalDrag}
        onDragLeave={handleGlobalDrag}
      >
        {/* Visual Global Drag overlay */}
        {globalDragActive && (
          <div className="fixed inset-0 bg-indigo-950/20 border-4 border-dashed border-indigo-500/80 backdrop-blur-xs pointer-events-none z-40 flex items-center justify-center">
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 text-center shadow-2xl">
              <Upload className="w-12 h-12 text-indigo-400 mx-auto animate-bounce mb-3" />
              <h3 className="font-heading text-lg font-bold text-white">Drag & Drop Study Files</h3>
              <p className="text-slate-400 text-xs mt-1">Drop files directly onto folder cards to upload them there!</p>
            </div>
          </div>
        )}

        {/* Page Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
              <FolderOpen className="w-8 h-8 text-indigo-400 shrink-0" />
              <span>Academic Notes Vault</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">Organize your lecture documents, view exam papers, and preview materials in folders.</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => {
                setFolderToEdit(null);
                setFolderFormName('');
                setFolderFormColor('#6366f1');
                setIsFolderModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 bg-[#131b2e]/60 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-medium py-2.5 px-4 rounded-xl cursor-pointer transition-all duration-150 text-xs"
            >
              <FolderPlus className="w-4 h-4 text-slate-450" />
              <span>Create Folder</span>
            </button>
            <button
              onClick={() => {
                setSelectedFile(null);
                reset();
                setInlineFolderCreation(false);
                setIsUploadOpen(true);
              }}
              className="flex items-center justify-center gap-2 bg-indigo-650 hover:bg-indigo-600 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-indigo-650/10 transition-all duration-150 active:scale-95 text-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          </div>
        </div>

        {/* Search, Filter & Actions Grid */}
        <div className="bg-[#0a0f1d]/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-4 space-y-3.5">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search inputs */}
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                <Search className="w-4.5 h-4.5" />
              </span>
              <input
                type="text"
                placeholder="Search documents by name, type, or folder..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#131b2e]/40 border border-slate-850 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none transition-all duration-150"
              />
            </div>

            {/* Dropdowns */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 lg:w-auto shrink-0">
              {/* Type Filter */}
              <select
                value={selectedFileType}
                onChange={(e) => setSelectedFileType(e.target.value)}
                className="bg-[#131b2e]/40 border border-slate-850 text-slate-350 text-xs rounded-xl py-2 px-3 outline-none focus:border-indigo-500 cursor-pointer min-w-[110px]"
              >
                <option value="all" className="bg-[#0f172a]">All Formats</option>
                <option value="pdf" className="bg-[#0f172a]">PDF Documents</option>
                <option value="image" className="bg-[#0f172a]">Images</option>
                <option value="word" className="bg-[#0f172a]">Word Docs</option>
                <option value="powerpoint" className="bg-[#0f172a]">PowerPoints</option>
              </select>

              {/* Upload Date Filter */}
              <select
                value={selectedUploadDate}
                onChange={(e) => setSelectedUploadDate(e.target.value)}
                className="bg-[#131b2e]/40 border border-slate-850 text-slate-350 text-xs rounded-xl py-2 px-3 outline-none focus:border-indigo-500 cursor-pointer min-w-[110px]"
              >
                <option value="all" className="bg-[#0f172a]">All Time</option>
                <option value="today" className="bg-[#0f172a]">Uploaded Today</option>
                <option value="week" className="bg-[#0f172a]">This Week</option>
                <option value="month" className="bg-[#0f172a]">This Month</option>
              </select>

              {/* Sorting */}
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="bg-[#131b2e]/40 border border-slate-850 text-slate-350 text-xs rounded-xl py-2 px-3 outline-none focus:border-indigo-500 cursor-pointer min-w-[110px]"
              >
                <option value="newest" className="bg-[#0f172a]">Newest First</option>
                <option value="oldest" className="bg-[#0f172a]">Oldest First</option>
                <option value="nameAsc" className="bg-[#0f172a]">Name (A-Z)</option>
                <option value="nameDesc" className="bg-[#0f172a]">Name (Z-A)</option>
              </select>

              {/* Layout Switcher */}
              <div className="flex bg-[#131b2e]/40 border border-slate-850 rounded-xl p-0.5 justify-around items-center">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex-1 py-1.5 rounded-lg cursor-pointer flex items-center justify-center transition-all ${
                    viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Grid Layout"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex-1 py-1.5 rounded-lg cursor-pointer flex items-center justify-center transition-all ${
                    viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Table List Layout"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Folder Selector (Horizontal scroll, visible only on < lg) */}
        <div className="flex lg:hidden bg-[#0d1527] border border-slate-800 p-1.5 rounded-2xl mb-4 gap-1.5 overflow-x-auto scrollbar-none shrink-0 scroll-momentum">
          <button 
            onClick={() => setSelectedSidebarFolder('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
              selectedSidebarFolder === 'all' ? 'bg-indigo-650 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Notes ({notes.length})
          </button>
          {folders.map(folder => (
            <button 
              key={folder._id}
              onClick={() => setSelectedSidebarFolder(folder._id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedSidebarFolder === folder._id ? 'bg-indigo-650 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: folder.color || '#6366f1' }} />
              <span>{folder.name} ({notes.filter(n => n.groupId?._id === folder._id).length})</span>
            </button>
          ))}
        </div>

        {/* Workspace Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Left Folder Manager Sidebar */}
          <div className="hidden lg:block lg:col-span-1 bg-[#0a0f1d]/75 border border-slate-800/80 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold font-heading text-slate-450 uppercase tracking-wider">Group Folders</h3>
              <span className="text-[10px] text-slate-500 font-bold bg-[#131b2e]/40 px-2 py-0.5 rounded-md border border-slate-850">
                {folders.length} Total
              </span>
            </div>
            
            <div className="space-y-1">
              {/* All Documents option */}
              <button
                onClick={() => setSelectedSidebarFolder('all')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-all border ${
                  selectedSidebarFolder === 'all'
                    ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/25'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-indigo-500" />
                  <span>All Vault Notes</span>
                </span>
                <span className="bg-slate-850 px-2 py-0.5 rounded-md text-[10px] text-slate-400 font-bold">
                  {notes.length}
                </span>
              </button>

              {/* Dynamic folder nodes */}
              {folders.map(folder => (
                <div 
                  key={folder._id}
                  className={`group/item w-full rounded-xl text-xs font-semibold flex items-center justify-between transition-all border ${
                    selectedSidebarFolder === folder._id
                      ? 'bg-[#182035]/50 border-slate-850 text-indigo-350'
                      : 'border-transparent text-slate-400 hover:bg-slate-800/20'
                  }`}
                >
                  <button
                    onClick={() => setSelectedSidebarFolder(folder._id)}
                    className="flex-1 text-left px-3.5 py-2.5 cursor-pointer truncate pr-1 flex items-center gap-2"
                  >
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: folder.color || '#6366f1' }}
                    />
                    <span className="truncate">{folder.name}</span>
                  </button>

                  <div className="flex items-center gap-1 pr-2 shrink-0">
                    <span className="bg-slate-850/80 px-2 py-0.5 rounded-md text-[10px] text-slate-500 font-bold group-hover/item:hidden">
                      {notes.filter(n => n.groupId?._id === folder._id).length}
                    </span>
                    
                    {/* Action buttons on Hover */}
                    <div className="hidden group-hover/item:flex items-center gap-1 animate-in fade-in duration-100">
                      <button
                        onClick={() => {
                          setFolderToEdit(folder);
                          setFolderFormName(folder.name);
                          setFolderFormColor(folder.color || '#6366f1');
                          setIsFolderModalOpen(true);
                        }}
                        className="p-1 hover:text-white text-slate-500 rounded hover:bg-slate-800/80 cursor-pointer"
                        title="Rename Folder"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          setFolderToDelete(folder);
                          setDeleteFolderAction('delete_all');
                          // Filter folders excluding the current one for moving files
                          const targetList = folders.filter(f => f._id !== folder._id);
                          setTargetFolderIdForMove(targetList[0]?._id || '');
                          setIsDeleteFolderOpen(true);
                        }}
                        className="p-1 hover:text-red-400 text-slate-500 rounded hover:bg-slate-800/80 cursor-pointer"
                        title="Delete Folder"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Folders Grid View */}
          <div className="lg:col-span-3 space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="w-10 h-10 border-4 border-slate-850 border-t-indigo-500 rounded-full animate-spin"></div>
                <p className="mt-3 text-slate-400 text-sm">Opening vault directory...</p>
              </div>
            ) : folders.length === 0 ? (
              <div className="bg-[#0a0f1d]/40 border border-slate-850/80 rounded-2xl p-16 text-center max-w-xl mx-auto">
                <div className="flex justify-center mb-4 text-slate-600">
                  <FolderOpen className="w-14 h-14 stroke-1" />
                </div>
                <h3 className="text-base font-heading font-bold text-white">No Folders Configured</h3>
                <p className="text-slate-400 text-xs mt-2 mb-6">
                  Folders help group your PDF files, slides, and study notes. Create a manual folder first to begin organizing files.
                </p>
                <button
                  onClick={() => {
                    setFolderToEdit(null);
                    setFolderFormName('');
                    setFolderFormColor('#6366f1');
                    setIsFolderModalOpen(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs py-2.5 px-4 rounded-xl cursor-pointer transition-all"
                >
                  Create Your First Folder
                </button>
              </div>
            ) : (
              // Map Folders
              folders
                .filter(folder => selectedSidebarFolder === 'all' || folder._id === selectedSidebarFolder)
.map(folder => {
                  const folderNotes = groupedNotes[folder._id] || [];
                  const isExpanded = expandedFolders[folder._id] !== false;
                  
                  // Calculate dynamic last updated date for folder based on notes inside it
                  const lastUpdatedStr = (() => {
                    if (folderNotes.length === 0) return formatNoteDate(folder.updatedAt);
                    const noteTimestamps = folderNotes.map(n => new Date(n.updatedAt || n.createdAt).getTime()).filter(t => !isNaN(t));
                    return formatNoteDate(new Date(Math.max(...noteTimestamps)));
                  })();

                  // Pagination/Lazy loading visible count
                  const defaultVisible = 6;
                  const currentVisibleLimit = visibleFileCounts[folder._id] || defaultVisible;
                  const visibleNotes = folderNotes.slice(0, currentVisibleLimit);

                  return (
                    <div 
                      key={folder._id} 
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragOverFolderId !== folder._id) setDragOverFolderId(folder._id);
                      }}
                      onDragLeave={() => setDragOverFolderId(null)}
                      onDrop={(e) => handleFolderDrop(e, folder._id)}
                      className={`bg-[#0a0f1d]/30 border rounded-2xl overflow-hidden transition-all duration-200 relative ${
                        dragOverFolderId === folder._id 
                          ? 'border-indigo-500/80 bg-indigo-500/[0.04] scale-[1.01]' 
                          : 'border-slate-900'
                      }`}
                    >
                      {/* Highlight drag overlay */}
                      {dragOverFolderId === folder._id && (
                        <div className="absolute inset-0 bg-[#0f172a]/70 flex items-center justify-center z-10 border-2 border-indigo-500 pointer-events-none animate-pulse">
                          <div className="text-center">
                            <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                            <p className="text-xs font-bold text-white">Drop to Upload into "{folder.name}"</p>
                          </div>
                        </div>
                      )}

                      {/* Folder Card Header */}
                      <div className="px-5 py-4 bg-[#0a0f1d]/85 hover:bg-slate-800/10 border-b border-slate-900 flex items-center justify-between transition-colors">
                        <div 
                          className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer"
                          onClick={() => toggleFolderExpand(folder._id)}
                        >
                          <div 
                            className="p-1.5 rounded-lg shrink-0 flex items-center justify-center border border-slate-850/80"
                            style={{ backgroundColor: `${folder.color}15` }}
                          >
                            {isExpanded ? (
                              <FolderOpen className="w-5 h-5 shrink-0" style={{ color: folder.color || '#6366f1' }} />
                            ) : (
                              <Folder className="w-5 h-5 shrink-0" style={{ color: folder.color || '#6366f1' }} />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-heading font-bold text-sm text-slate-200 truncate leading-none">
                                {folder.name}
                              </h3>
                              <span className="bg-[#1e293b]/40 border border-slate-800 px-1.5 py-0.5 rounded-full text-[9px] text-slate-400 font-bold shrink-0">
                                {folderNotes.length} {folderNotes.length === 1 ? 'file' : 'files'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">
                              Last updated: {lastUpdatedStr}
                            </p>
                          </div>
                        </div>

                        {/* Folder Management Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setFolderToEdit(folder);
                              setFolderFormName(folder.name);
                              setFolderFormColor(folder.color || '#6366f1');
                              setIsFolderModalOpen(true);
                            }}
                            className="p-2 hover:text-white text-slate-500 hover:bg-slate-800/40 rounded-lg cursor-pointer transition-colors"
                            title="Rename folder"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setFolderToDelete(folder);
                              setDeleteFolderAction('delete_all');
                              const targetList = folders.filter(f => f._id !== folder._id);
                              setTargetFolderIdForMove(targetList[0]?._id || '');
                              setIsDeleteFolderOpen(true);
                            }}
                            className="p-2 hover:text-red-400 text-slate-500 hover:bg-slate-800/40 rounded-lg cursor-pointer transition-colors"
                            title="Delete folder"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleFolderExpand(folder._id)}
                            className="p-2 hover:text-white text-slate-400 hover:bg-slate-800/40 rounded-lg cursor-pointer"
                          >
                            {isExpanded ? <ChevronDown className="w-4.5 h-4.5" /> : <ChevronRight className="w-4.5 h-4.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Collapsible Folder Notes list */}
                      {isExpanded && (
                        <div className="p-4 bg-slate-950/5">
                          {folderNotes.length === 0 ? (
                            <p className="text-slate-500 text-xs italic py-4 pl-2">
                              No files inside this folder yet. Drag files here to upload.
                            </p>
                          ) : (
                            <>
                              {viewMode === 'grid' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {visibleNotes.map(note => {
                                    const token = localStorage.getItem('token');
                                    const downloadUrl = `${API.defaults.baseURL}/notes/download/${note._id}?token=${token}`;
                                    return (
                                      <ErrorBoundary
                                        key={note._id || Math.random().toString()}
                                        fallback={
                                          <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-1.5 h-[140px]">
                                            <AlertTriangle className="w-6 h-6 text-red-400" />
                                            <p className="text-[10px] font-bold text-slate-350">Failed to render Note card</p>
                                          </div>
                                        }
                                      >
                                        <div className="bg-[#0a0f1d]/75 border border-slate-800/80 rounded-xl p-4 hover:border-slate-700/85 transition-all duration-150 flex flex-col justify-between group">
                                          <div className="space-y-3">
                                            <div className="flex items-start gap-3">
                                              <div className="p-2 bg-[#131b2e]/60 rounded-lg border border-slate-850 shrink-0">
                                                {getFileIcon(note.fileType, note.fileUrl)}
                                              </div>
                                              <div className="min-w-0 flex-1">
                                                <h4
                                                  onClick={() => {
                                                    setActiveNote(note);
                                                    setZoomScale(1);
                                                    setRotateAngle(0);
                                                    setIsFullscreen(false);
                                                    setIsDetailOpen(true);
                                                  }}
                                                  className="font-bold text-white truncate text-xs leading-snug hover:text-indigo-400 transition-colors cursor-pointer"
                                                  title={note.title}
                                                >
                                                  {note.title || 'Untitled note'}
                                                </h4>
                                                <div className="flex gap-1.5 items-center mt-1">
                                                  <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-bold tracking-wider ${getFileBadgeColor(note.fileType)}`}>
                                                    {getCleanFileTypeName(note.fileType)}
                                                  </span>
                                                  <span className="text-[9px] text-slate-650">•</span>
                                                  <span className="text-[9px] text-slate-500">{formatBytes(note.fileSize)}</span>
                                                </div>
                                              </div>
                                            </div>
                                            
                                            {note.description && (
                                              <p className="text-[10px] text-slate-400 leading-relaxed truncate-2-lines">
                                                {note.description}
                                              </p>
                                            )}
                                          </div>

                                          <div className="mt-3.5 pt-2 border-t border-slate-850/60 flex items-center justify-between text-[9px] text-slate-500">
                                            <span>{formatNoteDate(note.createdAt)}</span>
                                            <div className="flex items-center gap-1.5">
                                              <a
                                                href={downloadUrl}
                                                className="p-1 rounded border border-slate-850 text-slate-450 hover:text-indigo-400 hover:bg-slate-850 cursor-pointer"
                                                title="Download file"
                                              >
                                                <Download className="w-3 h-3" />
                                              </a>
                                              {isSupportedByCampusBuddy(note.fileType, note.title) && (
                                                <button
                                                  onClick={() => navigate('/ai', { state: { autoAttachNote: note } })}
                                                  className="p-1 rounded border border-slate-850 text-slate-450 hover:text-indigo-405 hover:bg-slate-855 cursor-pointer"
                                                  title="Send to CampusBuddy"
                                                >
                                                  <Send className="w-3 h-3" />
                                                </button>
                                              )}
                                              <button
                                                onClick={() => {
                                                  setNoteToDelete(note);
                                                  setIsDeleteNoteOpen(true);
                                                }}
                                                className="p-1 rounded border border-slate-850 text-slate-450 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                                                title="Delete file"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </ErrorBoundary>
                                    );
                                  })}
                                </div>
                              ) : (
                                // Table layout inside folder
                                <div className="overflow-x-auto rounded-xl border border-slate-900">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="bg-[#050914]/80 border-b border-slate-900 text-slate-500 font-bold">
                                        <th className="py-2.5 px-4">Document Title</th>
                                        <th className="py-2.5 px-4">Type</th>
                                        <th className="py-2.5 px-4">Size</th>
                                        <th className="py-2.5 px-4">Upload Date</th>
                                        <th className="py-2.5 px-4 text-right">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {visibleNotes.map(note => {
                                        const token = localStorage.getItem('token');
                                        const downloadUrl = `${API.defaults.baseURL}/notes/download/${note._id}?token=${token}`;
                                        return (
                                          <tr 
                                            key={note._id}
                                            className="border-b border-slate-900 bg-[#0a0f1d]/40 hover:bg-slate-800/10 transition-colors"
                                          >
                                            <td className="py-2.5 px-4 font-bold text-white min-w-[200px] truncate max-w-[300px]">
                                              <span
                                                onClick={() => {
                                                  setActiveNote(note);
                                                  setZoomScale(1);
                                                  setRotateAngle(0);
                                                  setIsFullscreen(false);
                                                  setIsDetailOpen(true);
                                                }}
                                                className="hover:text-indigo-400 cursor-pointer"
                                              >
                                                {note.title || 'Untitled Document'}
                                              </span>
                                            </td>
                                            <td className="py-2.5 px-4">
                                              <span className={`px-2 py-0.5 rounded text-[8px] uppercase font-bold tracking-wider ${getFileBadgeColor(note.fileType)}`}>
                                                {getCleanFileTypeName(note.fileType)}
                                              </span>
                                            </td>
                                            <td className="py-2.5 px-4 text-slate-400">{formatBytes(note.fileSize)}</td>
                                            <td className="py-2.5 px-4 text-slate-400">{formatNoteDate(note.createdAt)}</td>
                                            <td className="py-2.5 px-4 text-right space-x-2 shrink-0">
                                              <a
                                                href={downloadUrl}
                                                className="inline-block p-1 border border-slate-850 text-slate-450 hover:text-indigo-400 rounded-md cursor-pointer transition-colors"
                                                title="Download Note"
                                              >
                                                <Download className="w-3.5 h-3.5" />
                                              </a>
                                              {isSupportedByCampusBuddy(note.fileType, note.title) && (
                                                <button
                                                  onClick={() => navigate('/ai', { state: { autoAttachNote: note } })}
                                                  className="inline-block p-1 border border-slate-850 text-slate-450 hover:text-indigo-400 rounded-md cursor-pointer transition-colors"
                                                  title="Send to CampusBuddy"
                                                >
                                                  <Send className="w-3.5 h-3.5" />
                                                </button>
                                              )}
                                              <button
                                                onClick={() => {
                                                  setNoteToDelete(note);
                                                  setIsDeleteNoteOpen(true);
                                                }}
                                                className="inline-block p-1 border border-slate-850 text-slate-455 hover:text-red-400 rounded-md cursor-pointer transition-colors"
                                                title="Delete Note"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {/* Show More toggle per Folder (Lazy Loading Optimization) */}
                              {folderNotes.length > currentVisibleLimit && (
                                <div className="mt-4 flex justify-center">
                                  <button
                                    onClick={() => handleShowMoreFiles(folder._id, folderNotes.length)}
                                    className="px-3.5 py-1.5 bg-[#131b2e]/60 border border-slate-850 hover:bg-[#18223a] text-slate-400 hover:text-slate-200 rounded-xl text-[10px] font-bold cursor-pointer transition-all"
                                  >
                                    Show More Files (+{folderNotes.length - currentVisibleLimit})
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* ================= MODAL: CREATE OR EDIT FOLDER ================= */}
        {isFolderModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4">
            <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60 shrink-0">
                <h2 className="font-heading text-base font-bold text-white">
                  {folderToEdit ? 'Rename Folder' : 'Create New Folder'}
                </h2>
                <button
                  onClick={() => setIsFolderModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveFolder} className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Folder Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DBMS, Operating Systems"
                    value={folderFormName}
                    onChange={(e) => setFolderFormName(e.target.value)}
                    className="w-full bg-[#131b2e]/60 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Folder Theme Color
                  </label>
                  <div className="grid grid-cols-8 gap-2">
                    {folderColors.map(color => (
                      <button
                        key={color.hex}
                        type="button"
                        onClick={() => setFolderFormColor(color.hex)}
                        className={`w-full h-8 rounded-lg cursor-pointer transition-all border-2 ${
                          folderFormColor === color.hex ? 'border-white scale-105' : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/60 mt-4">
                  <button
                    type="button"
                    onClick={() => setIsFolderModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-350 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2 px-4 rounded-xl transition-all active:scale-95 cursor-pointer"
                  >
                    {folderToEdit ? 'Rename Folder' : 'Create Folder'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= MODAL: SAFE FOLDER DELETION ================= */}
        {isDeleteFolderOpen && folderToDelete && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4">
            <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 max-h-[90dvh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
              <div className="flex gap-4 items-start">
                <div className="p-3 bg-red-500/10 rounded-2xl text-red-400 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <h3 className="font-heading text-base font-bold text-white">Delete Folder "{folderToDelete.name}"?</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    This folder currently contains{' '}
                    <span className="text-slate-200 font-bold">
                      {notes.filter(n => n.groupId?._id === folderToDelete._id).length}
                    </span>{' '}
                    files inside. Please select a deletion option to prevent accidental data loss:
                  </p>
                </div>
              </div>

              {/* Options selection */}
              <div className="my-5 p-3.5 bg-[#131b2e]/30 border border-slate-850 rounded-2xl space-y-3.5">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="deleteOption"
                    value="delete_all"
                    checked={deleteFolderAction === 'delete_all'}
                    onChange={() => setDeleteFolderAction('delete_all')}
                    className="mt-0.5 text-indigo-500 focus:ring-indigo-500"
                  />
                  <div className="text-xs">
                    <p className="font-bold text-slate-250 group-hover:text-white transition-colors">Delete folder + all files permanently</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Erases the folder database index and unlinks files from Cloudinary storage.</p>
                  </div>
                </label>

                {notes.filter(n => n.groupId?._id === folderToDelete._id).length > 0 && (
                  <label className="flex items-start gap-3 cursor-pointer group border-t border-slate-850/60 pt-3">
                    <input
                      type="radio"
                      name="deleteOption"
                      value="move_files"
                      checked={deleteFolderAction === 'move_files'}
                      onChange={() => setDeleteFolderAction('move_files')}
                      disabled={folders.filter(f => f._id !== folderToDelete._id).length === 0}
                      className="mt-0.5 text-indigo-500 focus:ring-indigo-500 disabled:opacity-50"
                    />
                    <div className="text-xs">
                      <p className="font-bold text-slate-250 group-hover:text-white transition-colors disabled:opacity-50">
                        Move files to another folder, then delete folder
                      </p>
                      {folders.filter(f => f._id !== folderToDelete._id).length > 0 ? (
                        <div className="mt-2 animate-in slide-in-from-top-1 duration-150">
                          <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase">Move files to:</label>
                          <select
                            value={targetFolderIdForMove}
                            onChange={(e) => setTargetFolderIdForMove(e.target.value)}
                            className="bg-[#0f172a] border border-slate-800 text-slate-300 text-xs rounded-lg py-1.5 px-2.5 outline-none focus:border-indigo-500 cursor-pointer w-full"
                          >
                            {folders
                              .filter(f => f._id !== folderToDelete._id)
                              .map(f => (
                                <option key={f._id} value={f._id}>{f.name}</option>
                              ))}
                          </select>
                        </div>
                      ) : (
                        <p className="text-[10px] text-amber-500 mt-0.5 font-semibold">You need to create another folder first to move files.</p>
                      )}
                    </div>
                  </label>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-850 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteFolderOpen(false);
                    setFolderToDelete(null);
                    setTargetFolderIdForMove('');
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-350 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteFolderConfirm}
                  className="bg-red-650 hover:bg-red-600 text-white font-semibold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer shadow-lg shadow-red-500/10 active:scale-95"
                >
                  Confirm Deletion
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL: UPLOAD FILE PREVIEW & OPTIONS ================= */}
        {isUploadOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4">
            <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60 shrink-0">
                <h2 className="font-heading text-base font-bold text-white">Upload Study Material</h2>
                <button
                  onClick={() => {
                    if (uploading) return;
                    setIsUploadOpen(false);
                    setSelectedFile(null);
                    setInlineFolderCreation(false);
                    reset();
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onUploadSubmit)} className="p-6 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
                
                {/* File picker drag zone */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Select Document *
                  </label>
                  
                  <div
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                      selectedFile 
                        ? 'border-indigo-650 bg-indigo-950/[0.04]' 
                        : 'border-slate-800 hover:border-slate-700 bg-[#131b2e]/10'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      disabled={uploading}
                      accept=".pdf,.docx,.pptx,.ppt,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Upload className={`w-8 h-8 ${selectedFile ? 'text-indigo-400 animate-pulse' : 'text-slate-500'}`} />
                      
                      {selectedFile ? (
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-white truncate max-w-[280px]">
                            {selectedFile.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {formatBytes(selectedFile.size)} ({getCleanFileTypeName(selectedFile.type || selectedFile.name.substring(selectedFile.name.lastIndexOf('.')))} format)
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-slate-200">
                            Drag & drop file here or <span className="text-indigo-400 hover:underline">browse</span>
                          </p>
                          <p className="text-[10px] text-slate-500">
                            PDF, DOCX, PPT/PPTX, JPG, JPEG, PNG (Max 10MB)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Document Title */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Document Title *
                  </label>
                  <input
                    type="text"
                    disabled={uploading}
                    placeholder="e.g. Unit 1 Scheduling Slides"
                    {...register('title', { required: 'Document title is required' })}
                    className={`w-full bg-[#131b2e]/60 border ${
                      errors.title 
                        ? 'border-red-500/80 focus:ring-red-500/20' 
                        : conflictDetected 
                          ? 'border-amber-500 focus:ring-amber-500/20' 
                          : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
                    } rounded-xl py-2.5 px-4 text-xs text-white placeholder-slate-500 outline-none transition-all`}
                  />
                  {errors.title && (
                    <p className="mt-1 text-[10px] text-red-400 font-medium">{errors.title.message}</p>
                  )}
                  {conflictDetected && (
                    <p className="mt-1 text-[10px] text-amber-500 font-bold flex items-center gap-1 leading-snug">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Warning: A file with this title already exists in the selected folder.</span>
                    </p>
                  )}
                </div>

                {/* Folder Selection / Creation Options */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Destination Folder *
                    </label>
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => setInlineFolderCreation(prev => !prev)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                    >
                      {inlineFolderCreation ? 'Select Existing Folder' : '+ Create New Folder'}
                    </button>
                  </div>

                  {inlineFolderCreation ? (
                    <div className="p-3 bg-[#131b2e]/30 border border-slate-850 rounded-2xl space-y-3 animate-in slide-in-from-top-1 duration-150">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-450 uppercase mb-1">New Folder Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Computer Networks"
                          value={inlineFolderName}
                          onChange={(e) => setInlineFolderName(e.target.value)}
                          className="w-full bg-[#0f172a] border border-slate-800 focus:border-indigo-500 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-455 uppercase mb-1">Folder Color</label>
                        <div className="grid grid-cols-8 gap-1.5">
                          {folderColors.map(color => (
                            <button
                              key={color.hex}
                              type="button"
                              onClick={() => setInlineFolderColor(color.hex)}
                              className={`h-6 rounded-md cursor-pointer transition-all border ${
                                inlineFolderColor === color.hex ? 'border-white scale-105' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: color.hex }}
                              title={color.name}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <select
                        disabled={uploading}
                        {...register('groupId', { required: !inlineFolderCreation && 'Folder selection is required' })}
                        className={`w-full bg-[#131b2e]/60 border ${
                          errors.groupId ? 'border-red-500/80 focus:ring-red-500/20' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
                        } rounded-xl py-2.5 px-3 text-xs text-white placeholder-slate-500 outline-none cursor-pointer`}
                      >
                        <option value="">-- Choose Folder --</option>
                        {folders.map(f => (
                          <option key={f._id} value={f._id}>{f.name}</option>
                        ))}
                      </select>
                      {errors.groupId && (
                        <p className="mt-1 text-[10px] text-red-400 font-medium">{errors.groupId.message}</p>
                      )}
                    </>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Description (Optional)
                  </label>
                  <textarea
                    rows="2"
                    disabled={uploading}
                    placeholder="Topics covered, units included..."
                    {...register('description')}
                    className="w-full bg-[#131b2e]/60 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 px-3.5 text-xs text-white placeholder-slate-500 outline-none resize-none"
                  ></textarea>
                </div>

                {/* Upload Progress */}
                {uploading && (
                  <div className="space-y-1.5 pt-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-slate-450">Uploading Document...</span>
                      <span className="text-indigo-400">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 transition-all duration-150"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/60 mt-4">
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => {
                      setIsUploadOpen(false);
                      setSelectedFile(null);
                      setInlineFolderCreation(false);
                      reset();
                    }}
                    className="px-4 py-2 text-xs font-medium text-slate-350 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || conflictDetected}
                    className="bg-indigo-650 hover:bg-indigo-600 text-white font-semibold text-xs py-2.5 px-5 rounded-xl transition-all cursor-pointer hover:shadow-indigo-500/10 active:scale-95 disabled:opacity-50"
                  >
                    {uploading ? 'Processing File...' : 'Upload Document'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= MODAL: FILE PREVIEW / DETAIL VIEWER ================= */}
        {isDetailOpen && activeNote && (
          <div className={`fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4 transition-all duration-200 ${
            isFullscreen ? 'p-0' : 'p-4'
          }`}>
            <div className={`bg-[#0f172a] border border-slate-800 rounded-3xl w-full shadow-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 ${
              isFullscreen ? 'h-screen w-screen rounded-none border-0' : 'max-w-4xl h-[85vh]'
            }`}>
              
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60 shrink-0">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="p-2 bg-[#131b2e]/60 rounded-xl border border-slate-850 shrink-0">
                    {getFileIcon(activeNote.fileType, activeNote.fileUrl)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-heading text-sm md:text-base font-bold text-white truncate max-w-[280px] md:max-w-[450px]" title={activeNote.title}>
                      {activeNote.title || 'Untitled note'}
                    </h2>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 font-semibold">
                      <span className="text-indigo-400">{activeNote.groupId?.name || activeNote.subject}</span>
                      <span>•</span>
                      <span>{formatBytes(activeNote.fileSize)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Fullscreen Trigger */}
                  <button
                    onClick={() => setIsFullscreen(prev => !prev)}
                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Preview"}
                  >
                    {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                  </button>
                  {/* Close Modal */}
                  <button
                    onClick={() => {
                      setIsDetailOpen(false);
                      setActiveNote(null);
                    }}
                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Viewer Split Content */}
              <div className="flex-1 min-h-0 flex flex-col md:flex-row">
                
                {/* File Render Center */}
                <div className="flex-1 min-h-0 bg-[#070b13] flex flex-col justify-between relative overflow-hidden">
                  
                  {/* Zoom controls overlay for PDF and Images */}
                  {(activeNote.fileType.includes('pdf') || activeNote.fileType.startsWith('image/')) && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 flex bg-[#0f172a]/95 border border-slate-850/80 rounded-xl p-1 shadow-lg backdrop-blur gap-1 shrink-0">
                      <button
                        onClick={() => setZoomScale(z => Math.max(0.5, z - 0.25))}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <span className="text-[10px] font-bold text-slate-350 flex items-center px-2">
                        {Math.round(zoomScale * 100)}%
                      </span>
                      <button
                        onClick={() => setZoomScale(z => Math.min(2.5, z + 0.25))}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                      {activeNote.fileType.startsWith('image/') && (
                        <button
                          onClick={() => setRotateAngle(r => (r + 90) % 360)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer border-l border-slate-800/80 pl-2 ml-1"
                          title="Rotate Image"
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Render content */}
                  <div className="flex-1 w-full h-full overflow-auto flex items-center justify-center p-4 scrollbar-thin">
                    {activeNote.fileType.includes('pdf') ? (
                      <div 
                        className="w-full h-full transition-transform duration-150"
                        style={{ transform: `scale(${zoomScale})`, transformOrigin: 'center center' }}
                      >
                        {/* Safe PDF iframe viewer with page scroll enabled */}
                        <Suspense fallback={
                          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/60 border border-slate-850 rounded-xl p-6 text-center">
                            <div className="relative w-8 h-8">
                              <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
                              <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
                            </div>
                            <p className="mt-3 text-slate-400 text-[10px] font-semibold animate-pulse">Initializing PDF stream rendering...</p>
                          </div>
                        }>
                          <PdfViewer src={activeNote.fileUrl} title={activeNote.title} />
                        </Suspense>
                      </div>
                    ) : activeNote.fileType.startsWith('image/') ? (
                      <img
                        src={activeNote.fileUrl}
                        alt={activeNote.title}
                        style={{ transform: `scale(${zoomScale}) rotate(${rotateAngle}deg)` }}
                        className="max-h-[85%] max-w-[85%] object-contain rounded-xl border border-slate-900/60 shadow-2xl transition-all duration-150"
                      />
                    ) : (
                      // Metadata card view for Word docx / PowerPoint pptx
                      <div className="text-center p-8 max-w-sm space-y-4 bg-[#0a0f1d]/50 border border-slate-850/80 rounded-2xl">
                        <div className="mx-auto p-4 bg-[#131b2e]/60 rounded-2xl border border-slate-850 w-fit">
                          {getFileIcon(activeNote.fileType)}
                        </div>
                        <h3 className="font-heading font-bold text-white text-sm">
                          Preview not supported for {getCleanFileTypeName(activeNote.fileType)}
                        </h3>
                        <p className="text-[11px] text-slate-450 leading-relaxed">
                          This file type cannot be previewed natively in-browser. Please download it or open in external window to view.
                        </p>
                        <div className="flex justify-center gap-2 pt-2">
                          <a
                            href={activeNote.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                            <span>Open In Tab</span>
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sidebar Info Section (Not shown in fullscreen) */}
                {!isFullscreen && (
                  <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-slate-800/60 p-5 space-y-5 shrink-0 bg-[#0c1120] overflow-y-auto">
                    <div className="space-y-3.5">
                      <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Document Information</h4>
                      
                      <div className="space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-450">Format</span>
                          <span className="font-bold text-slate-200 uppercase">{getCleanFileTypeName(activeNote.fileType)}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-900 pt-2.5">
                          <span className="text-slate-450">Size</span>
                          <span className="font-bold text-slate-200">{formatBytes(activeNote.fileSize)}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-900 pt-2.5">
                          <span className="text-slate-450">Uploaded On</span>
                          <span className="font-bold text-slate-200">{formatNoteDate(activeNote.createdAt)}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-900 pt-2.5">
                          <span className="text-slate-450">Uploader</span>
                          <div className="flex items-center gap-1 font-bold text-slate-200">
                            <User className="w-3 h-3 text-indigo-400" />
                            <span>Student</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {activeNote.description && (
                      <div className="space-y-2 border-t border-slate-900 pt-4">
                        <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Description</span>
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed max-h-[120px] overflow-y-auto pr-1">
                          {activeNote.description}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Viewer Footer */}
              <div className="px-6 py-4 border-t border-slate-800/60 shrink-0 flex items-center justify-between bg-slate-950/20">
                <button
                  onClick={() => {
                    setNoteToDelete(activeNote);
                    setIsDeleteNoteOpen(true);
                  }}
                  className="flex items-center justify-center gap-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer border border-transparent hover:border-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete File</span>
                </button>

                <div className="flex items-center gap-2">
                  {isSupportedByCampusBuddy(activeNote.fileType, activeNote.title) && (
                    <button
                      onClick={() => navigate('/ai', { state: { autoAttachNote: activeNote } })}
                      className="flex items-center justify-center gap-2 bg-purple-650 hover:bg-purple-600 text-white font-semibold text-xs py-2.5 px-5 rounded-xl transition-all cursor-pointer shadow-lg shadow-purple-650/10 active:scale-95"
                    >
                      <Send className="w-4 h-4" />
                      <span>Send to CampusBuddy</span>
                    </button>
                  )}
                  <a
                    href={`${API.defaults.baseURL}/notes/download/${activeNote._id}?token=${localStorage.getItem('token')}`}
                    className="flex items-center justify-center gap-2 bg-indigo-650 hover:bg-indigo-600 text-white font-semibold text-xs py-2.5 px-5 rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-650/10 active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Original</span>
                  </a>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ================= MODAL: ERASE FILE CONFIRM ================= */}
        {isDeleteNoteOpen && noteToDelete && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4">
            <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex gap-4 items-start">
                <div className="p-3 bg-red-500/10 rounded-2xl text-red-400 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-heading text-base font-bold text-white">Permanently Delete Note?</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Are you sure you want to permanently erase <span className="text-slate-200 font-semibold">"{noteToDelete.title}"</span>?
                    This action will delete it from database indexing and clear local disk folders.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-850 mt-5">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteNoteOpen(false);
                    setNoteToDelete(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-350 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteNoteConfirm}
                  className="bg-red-650 hover:bg-red-600 text-white font-semibold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer shadow-lg shadow-red-550/15 active:scale-95"
                >
                  Delete File
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </ErrorBoundary>
  );
};

export default NotesVault;
