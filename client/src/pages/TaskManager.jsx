import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import API from '../services/api';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/dateFormatter';
import {
  Plus,
  Search,
  SlidersHorizontal,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Edit2,
  Trash2,
  Clock,
  X,
  Check,
  AlertCircle
} from 'lucide-react';

import { TaskCardSkeleton } from '../components/SkeletonLoaders';

const TaskManager = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const abortControllerRef = useRef(null);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  // Form Hooks
  const {
    register: registerAdd,
    handleSubmit: handleAddSubmit,
    reset: resetAdd,
    formState: { errors: addErrors }
  } = useForm();

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    setValue: setEditValue,
    formState: { errors: editErrors }
  } = useForm();

  // Load tasks on mount or filter changes
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    fetchTasks(controller.signal);

    return () => {
      controller.abort();
    };
  }, [searchTerm, priorityFilter, statusFilter]);

  const fetchTasks = async (signal = null) => {
    try {
      setLoading(true);
      // Construct query parameters
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (priorityFilter) params.priority = priorityFilter;
      if (statusFilter) params.completed = statusFilter === 'completed';

      const response = await API.get('/tasks', { params, signal });
      if (response.data.success) {
        setTasks(response.data.tasks);
      }
    } catch (error) {
      if (error?.name === 'CanceledError' || error?.message === 'canceled') {
        return;
      }
      console.error('Fetch tasks error:', error);
      toast.error('Failed to load tasks');
    } finally {
      if (!signal || abortControllerRef.current?.signal === signal) {
        setLoading(false);
      }
    }
  };

  // Add Task handler
  const onAddTaskSubmit = async (data) => {
    try {
      const response = await API.post('/tasks', data);
      if (response.data.success) {
        toast.success('Task created successfully');
        setIsAddOpen(false);
        resetAdd();
        fetchTasks();
      }
    } catch (error) {
      console.error('Add task error:', error);
      toast.error(error.response?.data?.message || 'Failed to create task');
    }
  };

  // Edit Task click setup
  const openEditModal = (task) => {
    setActiveTask(task);
    setEditValue('title', task.title);
    setEditValue('description', task.description);
    setEditValue('priority', task.priority);
    // Format date string to YYYY-MM-DD for date input
    const formattedDate = new Date(task.dueDate).toISOString().split('T')[0];
    setEditValue('dueDate', formattedDate);
    setIsEditOpen(true);
  };

  // Edit Task handler
  const onEditTaskSubmit = async (data) => {
    try {
      const response = await API.put(`/tasks/${activeTask._id}`, data);
      if (response.data.success) {
        toast.success('Task updated successfully');
        setIsEditOpen(false);
        setActiveTask(null);
        fetchTasks();
      }
    } catch (error) {
      console.error('Edit task error:', error);
      toast.error(error.response?.data?.message || 'Failed to update task');
    }
  };

  // Toggle complete state
  const toggleTaskCompletion = async (task) => {
    try {
      const response = await API.put(`/tasks/${task._id}`, {
        completed: !task.completed
      });
      if (response.data.success) {
        toast.success(
          response.data.task.completed ? 'Task marked complete! 🎉' : 'Task marked incomplete'
        );
        // Optimistic local state update
        setTasks(
          tasks.map((t) => (t._id === task._id ? response.data.task : t))
        );
      }
    } catch (error) {
      console.error('Toggle task error:', error);
      toast.error('Failed to update task status');
    }
  };

  // Delete Click Setup
  const openDeleteModal = (task) => {
    setTaskToDelete(task);
    setIsDeleteOpen(true);
  };

  // Delete Task handler
  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;
    try {
      const response = await API.delete(`/tasks/${taskToDelete._id}`);
      if (response.data.success) {
        toast.success('Task deleted');
        setIsDeleteOpen(false);
        setTaskToDelete(null);
        fetchTasks();
      }
    } catch (error) {
      console.error('Delete task error:', error);
      toast.error('Failed to delete task');
    }
  };

  // Formatting Helpers
  const formatTaskDate = (dateString) => {
    if (!dateString) return 'N/A';
    return formatDate(dateString);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'low':
        return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  const isOverdue = (dueDate, completed) => {
    if (completed) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dueDate) < today;
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-white">Task Manager</h1>
          <p className="text-slate-400 text-sm mt-1">Organize and keep track of your coursework deadlines</p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 px-4 rounded-xl shadow-lg shadow-indigo-600/10 transition-all duration-200 cursor-pointer active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          <span>New Task</span>
        </button>
      </div>

      {/* Search and Filters panel */}
      <div className="bg-[#0a0f1d]/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#131b2e]/40 border border-slate-850 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl py-2 pl-10 pr-4 text-white placeholder-slate-500 outline-none transition-all duration-150 text-sm"
          />
        </div>

        {/* Dropdowns */}
        <div className="grid grid-cols-2 gap-2.5 w-full md:flex md:w-auto md:gap-3 items-center">
          <div className="col-span-2 md:col-span-1 flex items-center gap-1 text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-[#131b2e]/40 border border-slate-850 text-slate-350 text-xs rounded-xl py-2 px-3 outline-none focus:border-indigo-500 cursor-pointer w-full md:w-auto"
          >
            <option value="">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#131b2e]/40 border border-slate-850 text-slate-350 text-xs rounded-xl py-2 px-3 outline-none focus:border-indigo-500 cursor-pointer w-full md:w-auto"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Task List Grid */}
      {loading ? (
        <TaskCardSkeleton />
      ) : tasks.length === 0 ? (
        <div className="bg-[#0a0f1d]/40 border border-slate-850/80 rounded-2xl p-12 text-center max-w-xl mx-auto">
          <div className="flex justify-center mb-4 text-slate-600">
            <CheckCircle2 className="w-16 h-16 stroke-1" />
          </div>
          <h3 className="text-lg font-heading font-semibold text-white">No tasks found</h3>
          <p className="text-slate-400 text-sm mt-2">
            {searchTerm || priorityFilter || statusFilter
              ? 'No tasks match your filter criteria. Try adjusting your searches.'
              : "Looks like you don't have any tasks scheduled. Tap 'New Task' to get started."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tasks.map((task) => {
            const overdue = isOverdue(task.dueDate, task.completed);
            return (
              <div
                key={task._id}
                className={`flex flex-col justify-between bg-[#0a0f1d]/75 border ${
                  task.completed ? 'border-emerald-500/10' : overdue ? 'border-red-500/20 shadow-red-500/[0.02]' : 'border-slate-800/80'
                } rounded-2xl p-5 hover:border-slate-700 transition-all duration-200 shadow-lg group`}
              >
                {/* Upper Details */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      onClick={() => toggleTaskCompletion(task)}
                      className="text-slate-500 hover:text-indigo-400 cursor-pointer pt-0.5 transition-colors focus:outline-none"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="w-5.5 h-5.5 text-emerald-400 fill-emerald-500/10" />
                      ) : (
                        <Circle className="w-5.5 h-5.5" />
                      )}
                    </button>
                    <span className="flex-1 font-semibold text-white leading-snug group-hover:text-indigo-400/90 transition-colors">
                      <span className={task.completed ? 'line-through text-slate-500 font-normal' : ''}>
                        {task.title}
                      </span>
                    </span>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>

                  {task.description && (
                    <p className={`text-sm leading-relaxed truncate-2-lines ${task.completed ? 'text-slate-600' : 'text-slate-400'}`}>
                      {task.description}
                    </p>
                  )}
                </div>

                {/* Footer details */}
                <div className="mt-5 pt-3 border-t border-slate-850/60 flex items-center justify-between text-xs">
                  <div className={`flex items-center gap-1.5 font-medium ${
                    task.completed
                      ? 'text-emerald-500/80'
                      : overdue
                      ? 'text-red-400 font-semibold'
                      : 'text-slate-400'
                  }`}>
                    {overdue ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <Calendar className="w-4 h-4" />
                    )}
                    <span className="text-slate-400">
                      {overdue ? 'Overdue: ' : ''}
                      {formatTaskDate(task.dueDate)}
                    </span>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-2 opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={() => openEditModal(task)}
                      className="p-1.5 rounded-lg border border-slate-850 text-slate-400 hover:text-indigo-400 hover:bg-slate-800/40 cursor-pointer transition-colors"
                      title="Edit Task"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openDeleteModal(task)}
                      className="p-1.5 rounded-lg border border-slate-850 text-slate-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer transition-colors"
                      title="Delete Task"
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

      {/* ================= ADD TASK MODAL ================= */}
      {isAddOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60 shrink-0">
              <h2 className="font-heading text-lg font-bold text-white">Create New Task</h2>
              <button
                onClick={() => {
                  setIsAddOpen(false);
                  resetAdd();
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddSubmit(onAddTaskSubmit)} className="p-6 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Task Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Prepare Assignment 1"
                  {...registerAdd('title', { required: 'Task title is required' })}
                  className={`w-full bg-[#131b2e]/60 border ${
                    addErrors.title ? 'border-red-500/80 focus:ring-red-500/20' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
                  } rounded-xl py-2.5 px-4 text-white placeholder-slate-500 outline-none transition-all duration-155 focus:ring-4`}
                />
                {addErrors.title && (
                  <p className="mt-1 text-xs text-red-400 font-medium">{addErrors.title.message}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Description
                </label>
                <textarea
                  rows="3"
                  placeholder="Provide additional details..."
                  {...registerAdd('description')}
                  className="w-full bg-[#131b2e]/60 border border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl py-2.5 px-4 text-white placeholder-slate-500 outline-none transition-all duration-155 focus:ring-4 resize-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Priority */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Priority
                  </label>
                  <select
                    defaultValue="medium"
                    {...registerAdd('priority')}
                    className="w-full bg-[#131b2e]/60 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-white outline-none cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    {...registerAdd('dueDate', { required: 'Due date is required' })}
                    className={`w-full bg-[#131b2e]/60 border ${
                      addErrors.dueDate ? 'border-red-500/80 focus:ring-red-500/20' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
                    } rounded-xl py-2 px-3 text-white outline-none transition-all duration-155 focus:ring-4`}
                  />
                  {addErrors.dueDate && (
                    <p className="mt-1 text-xs text-red-400 font-medium">{addErrors.dueDate.message}</p>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/60 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    resetAdd();
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm py-2 px-5 rounded-xl transition-all cursor-pointer hover:shadow-indigo-500/10 active:scale-95"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= EDIT TASK MODAL ================= */}
      {isEditOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60 shrink-0">
              <h2 className="font-heading text-lg font-bold text-white">Edit Task</h2>
              <button
                onClick={() => {
                  setIsEditOpen(false);
                  setActiveTask(null);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleEditSubmit(onEditTaskSubmit)} className="p-6 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Task Title
                </label>
                <input
                  type="text"
                  {...registerEdit('title', { required: 'Task title is required' })}
                  className={`w-full bg-[#131b2e]/60 border ${
                    editErrors.title ? 'border-red-500/80 focus:ring-red-500/20' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
                  } rounded-xl py-2.5 px-4 text-white outline-none transition-all duration-155 focus:ring-4`}
                />
                {editErrors.title && (
                  <p className="mt-1 text-xs text-red-400 font-medium">{editErrors.title.message}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Description
                </label>
                <textarea
                  rows="3"
                  {...registerEdit('description')}
                  className="w-full bg-[#131b2e]/60 border border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl py-2.5 px-4 text-white outline-none transition-all duration-155 focus:ring-4 resize-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Priority */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Priority
                  </label>
                  <select
                    {...registerEdit('priority')}
                    className="w-full bg-[#131b2e]/60 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-white outline-none cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    {...registerEdit('dueDate', { required: 'Due date is required' })}
                    className={`w-full bg-[#131b2e]/60 border ${
                      editErrors.dueDate ? 'border-red-500/80 focus:ring-red-500/20' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
                    } rounded-xl py-2 px-3 text-white outline-none transition-all duration-155 focus:ring-4`}
                  />
                  {editErrors.dueDate && (
                    <p className="mt-1 text-xs text-red-400 font-medium">{editErrors.dueDate.message}</p>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/60 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditOpen(false);
                    setActiveTask(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm py-2 px-5 rounded-xl transition-all cursor-pointer hover:shadow-indigo-500/10 active:scale-95"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      {isDeleteOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 max-h-[90dvh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex gap-4 items-start">
              <div className="p-3 bg-red-500/10 rounded-2xl text-red-400 shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-heading text-lg font-bold text-white">Delete Task?</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Are you sure you want to delete <span className="text-slate-250 font-semibold">"{taskToDelete?.title}"</span>?
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-850 mt-5">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteOpen(false);
                  setTaskToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-500 text-white font-medium text-sm py-2 px-5 rounded-xl transition-all cursor-pointer hover:shadow-red-500/10 active:scale-95"
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

export default TaskManager;
