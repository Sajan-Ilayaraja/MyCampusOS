const Task = require('../models/Task');

// @desc    Get all tasks for the current student user
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res) => {
  try {
    const { priority, completed, search } = req.query;
    
    // Construct query object
    const query = { userId: req.user._id };

    // Apply priority filter
    if (priority) {
      query.priority = priority;
    }

    // Apply completion filter
    if (completed !== undefined) {
      query.completed = completed === 'true';
    }

    // Apply search filter (case-insensitive text search on title/description)
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination parameters (Production Performance - Item 3)
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 100));
    const skip = (page - 1) * limit;

    // Fetch tasks, sorted by due date ascending, then priority
    const tasksQuery = Task.find(query)
      .sort({ dueDate: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // returns plain Javascript objects for speed optimization

    const [tasks, total] = await Promise.all([
      tasksQuery,
      Task.countDocuments(query)
    ]);

    return res.status(200).json({
      success: true,
      count: tasks.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      tasks,
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to fetch tasks' });
  }
};

// @desc    Get a single task by ID
// @route   GET /api/tasks/:id
// @access  Private
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Enforce user isolation: check if task belongs to current user
    if (task.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this task' });
    }

    return res.status(200).json({
      success: true,
      task,
    });
  } catch (error) {
    console.error('Get task by id error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    return res.status(500).json({ success: false, message: 'Server error, failed to retrieve task' });
  }
};

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res) => {
  try {
    const { title, description, priority, dueDate } = req.body;

    // Field validation
    if (!title) {
      return res.status(400).json({ success: false, message: 'Please add a task title' });
    }
    if (!dueDate) {
      return res.status(400).json({ success: false, message: 'Please add a due date' });
    }

    // Create new task associated with logged in user
    const task = await Task.create({
      title,
      description,
      priority,
      dueDate,
      userId: req.user._id,
    });

    return res.status(201).json({
      success: true,
      task,
    });
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({ success: false, message: 'Server error, failed to create task' });
  }
};

// @desc    Update an existing task
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
  try {
    const { title, description, priority, dueDate, completed } = req.body;

    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Enforce user isolation: check if task belongs to current user
    if (task.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this task' });
    }

    // Update fields if provided
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (completed !== undefined) task.completed = completed;

    await task.save();

    return res.status(200).json({
      success: true,
      task,
    });
  } catch (error) {
    console.error('Update task error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    return res.status(500).json({ success: false, message: 'Server error, failed to update task' });
  }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Enforce user isolation: check if task belongs to current user
    if (task.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this task' });
    }

    // Delete document usingdeleteOne
    await Task.deleteOne({ _id: req.params.id });

    return res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    console.error('Delete task error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    return res.status(500).json({ success: false, message: 'Server error, failed to delete task' });
  }
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
};
