const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dns = require('dns');
// Force IPv4 resolution first to avoid Node 17+ IPv6 DNS lookup issues
dns.setDefaultResultOrder('ipv4first');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (err) {
  console.warn('Could not set custom DNS servers:', err.message);
}

const connectDB = require('../config/db');

// Import Models
const User = require('../models/User');
const Task = require('../models/Task');
const Goal = require('../models/Goal');
const Subject = require('../models/Subject');
const Timetable = require('../models/Timetable');
const Note = require('../models/Note');
const NotesGroup = require('../models/NotesGroup');
const AIChatConversation = require('../models/AIChatConversation');
const AIFlashcardDeck = require('../models/AIFlashcardDeck');
const AIQuiz = require('../models/AIQuiz');
const AIStudyPlan = require('../models/AIStudyPlan');
const AICareerRoadmap = require('../models/AICareerRoadmap');
const AIInteraction = require('../models/AIInteraction');
const QuizAttempt = require('../models/QuizAttempt');
const FlashcardMastery = require('../models/FlashcardMastery');

const demoEmail = 'sajan.demo@mycampusos.com';

const seed = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();

    console.log(`Checking if demo user exists with email: ${demoEmail}`);
    const existingUser = await User.findOne({ email: demoEmail });
    if (existingUser) {
      const uId = existingUser._id;
      console.log('Purging existing demo user data...');
      await Task.deleteMany({ userId: uId });
      await Goal.deleteMany({ userId: uId });
      await Note.deleteMany({ uploadedBy: uId });
      await NotesGroup.deleteMany({ userId: uId });
      await Subject.deleteMany({ userId: uId });
      await Timetable.deleteMany({ userId: uId });
      await AIChatConversation.deleteMany({ userId: uId });
      await AIFlashcardDeck.deleteMany({ userId: uId });
      await AIQuiz.deleteMany({ userId: uId });
      await AIStudyPlan.deleteMany({ userId: uId });
      await AICareerRoadmap.deleteMany({ userId: uId });
      await AIInteraction.deleteMany({ userId: uId });
      await QuizAttempt.deleteMany({ userId: uId });
      await FlashcardMastery.deleteMany({ userId: uId });
      await User.deleteOne({ _id: uId });
      console.log('Database cleanup complete.');
    }

    console.log('Creating demo user profile...');
    const user = await User.create({
      name: 'Ram Jeeva Sajan I',
      email: demoEmail,
      password: 'Demo@123456', // Pre-save hook hashes this
      collegeName: 'PSNA College of Engineering and Technology',
      department: 'Information Technology',
      yearOfStudy: 'Final Year',
      registerNumber: 'IT2026001',
      phoneNumber: '9876543210',
      linkedin: 'linkedin.com/in/ramjeevasajani',
      github: 'github.com/ramjeevasajani',
      portfolio: 'portfolio.ramjeevasajani.dev',
      bio: 'Passionate IT student focused on Full Stack Development, AI applications, system design, and software engineering. Interested in MERN stack, cloud computing, and startup building.',
      avatar: 'http://localhost:5000/uploads/avatar_ram.png',
      profileImage: 'http://localhost:5000/uploads/avatar_ram.png',
      provider: 'local'
    });
    const userId = user._id;
    console.log(`Demo user created with ID: ${userId}`);

    // ==========================================
    // 1. SUBJECTS & ATTENDANCE HISTORIES
    // ==========================================
    console.log('Seeding subjects...');
    const subjectsData = [
      { subject: 'Operating Systems', subjectCode: 'CS8493', credits: 4, semester: 7, attended: 32, totalClasses: 35, color: '#f43f5e', userId },
      { subject: 'Computer Networks', subjectCode: 'CS8591', credits: 3, semester: 7, attended: 28, totalClasses: 32, color: '#3b82f6', userId },
      { subject: 'DBMS', subjectCode: 'CS8492', credits: 4, semester: 7, attended: 35, totalClasses: 37, color: '#10b981', userId },
      { subject: 'Quantum Computing', subjectCode: 'CS8079', credits: 3, semester: 7, attended: 24, totalClasses: 28, color: '#8b5cf6', userId },
      { subject: 'Machine Learning', subjectCode: 'IT8075', credits: 4, semester: 7, attended: 30, totalClasses: 35, color: '#f59e0b', userId },
      { subject: 'Software Engineering', subjectCode: 'IT8076', credits: 3, semester: 7, attended: 27, totalClasses: 30, color: '#ec4899', userId },
      { subject: 'Cloud Computing', subjectCode: 'IT8501', credits: 3, semester: 7, attended: 29, totalClasses: 32, color: '#06b6d4', userId },
      { subject: 'Data Structures', subjectCode: 'IT8301', credits: 4, semester: 7, attended: 36, totalClasses: 40, color: '#14b8a6', userId }
    ];

    // Build realistic attendance histories for each subject
    for (const sub of subjectsData) {
      const history = [];
      const now = new Date();
      // Generate attendance status for the classes
      let currentAttendedCount = 0;
      for (let i = 0; i < sub.totalClasses; i++) {
        const classDate = new Date(now.getTime() - i * 3 * 24 * 60 * 60 * 1000); // every 3 days
        const wasPresent = currentAttendedCount < sub.attended;
        if (wasPresent) {
          currentAttendedCount++;
        }
        history.push({
          date: classDate,
          status: wasPresent ? 'present' : 'absent'
        });
      }
      sub.history = history;
    }

    const createdSubjects = await Subject.insertMany(subjectsData);
    const subjectMap = {};
    createdSubjects.forEach(s => {
      subjectMap[s.subject] = s._id;
    });
    console.log('8 Subjects created.');

    // ==========================================
    // 2. TIMETABLE
    // ==========================================
    console.log('Seeding timetable slots...');
    const timetableData = [
      { subjectId: subjectMap['Operating Systems'], day: 'Monday', startTime: '09:00', endTime: '10:00', room: 'LH-101', userId },
      { subjectId: subjectMap['Computer Networks'], day: 'Monday', startTime: '10:15', endTime: '11:15', room: 'LH-102', userId },
      { subjectId: subjectMap['DBMS'], day: 'Monday', startTime: '11:30', endTime: '12:30', room: 'DBMS-Lab', userId },
      { subjectId: subjectMap['Quantum Computing'], day: 'Tuesday', startTime: '09:00', endTime: '10:00', room: 'LH-203', userId },
      { subjectId: subjectMap['Machine Learning'], day: 'Tuesday', startTime: '10:15', endTime: '11:15', room: 'ML-Lab', userId },
      { subjectId: subjectMap['Software Engineering'], day: 'Tuesday', startTime: '11:30', endTime: '12:30', room: 'LH-104', userId },
      { subjectId: subjectMap['Cloud Computing'], day: 'Wednesday', startTime: '09:00', endTime: '10:00', room: 'LH-301', userId },
      { subjectId: subjectMap['Data Structures'], day: 'Wednesday', startTime: '10:15', endTime: '11:15', room: 'LH-101', userId },
      { subjectId: subjectMap['Operating Systems'], day: 'Wednesday', startTime: '11:30', endTime: '12:30', room: 'LH-101', userId },
      { subjectId: subjectMap['DBMS'], day: 'Thursday', startTime: '09:00', endTime: '10:00', room: 'LH-102', userId },
      { subjectId: subjectMap['Computer Networks'], day: 'Thursday', startTime: '10:15', endTime: '11:15', room: 'LH-102', userId },
      { subjectId: subjectMap['Machine Learning'], day: 'Thursday', startTime: '11:30', endTime: '12:30', room: 'ML-Lab', userId },
      { subjectId: subjectMap['Quantum Computing'], day: 'Friday', startTime: '09:00', endTime: '10:00', room: 'LH-203', userId },
      { subjectId: subjectMap['Cloud Computing'], day: 'Friday', startTime: '10:15', endTime: '11:15', room: 'LH-301', userId },
      { subjectId: subjectMap['Data Structures'], day: 'Friday', startTime: '11:30', endTime: '12:30', room: 'LH-101', userId },
      { subjectId: subjectMap['Software Engineering'], day: 'Saturday', startTime: '09:00', endTime: '10:00', room: 'LH-104', userId },
      { subjectId: subjectMap['DBMS'], day: 'Saturday', startTime: '10:15', endTime: '11:15', room: 'DBMS-Lab', userId }
    ];
    await Timetable.insertMany(timetableData);
    console.log('Timetable seeded.');

    // ==========================================
    // 3. TASKS
    // ==========================================
    console.log('Seeding 25 tasks...');
    const now = new Date();
    const daysAgo = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    const daysFromNow = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

    const tasksData = [
      // 8 Completed tasks
      { title: 'Build CampusBuddy chat module', description: 'Integrate chat history and provider routing for Gemini & Groq APIs.', priority: 'high', dueDate: daysAgo(2), completed: true, userId },
      { title: 'Complete Operating Systems assignment', description: 'Write CPU scheduling simulator program in C.', priority: 'medium', dueDate: daysAgo(5), completed: true, userId },
      { title: 'Prepare Quantum Computing notes', description: 'Summarize topics on Dirac notation, qubits, and quantum entanglement.', priority: 'medium', dueDate: daysAgo(7), completed: true, userId },
      { title: 'Practice DSA problems', description: 'Solve 10 Medium-difficulty LeetCode problems on Trees & Graphs.', priority: 'high', dueDate: daysAgo(1), completed: true, userId },
      { title: 'Update LinkedIn profile', description: 'Add recent MERN projects and write a post about system design learnings.', priority: 'low', dueDate: daysAgo(3), completed: true, userId },
      { title: 'DBMS Lab Manual Submission', description: 'Complete queries for PL/SQL triggers and functions.', priority: 'medium', dueDate: daysAgo(4), completed: true, userId },
      { title: 'Set up Cloudinary storage', description: 'Integrate profile image upload feature with canvas cropper.', priority: 'high', dueDate: daysAgo(6), completed: true, userId },
      { title: 'Create Resume v3', description: 'Revise resume alignment and update impact metrics using ATS keywords.', priority: 'high', dueDate: daysAgo(2), completed: true, userId },

      // 10 In Progress tasks
      { title: 'Deploy backend API', description: 'Deploy Node.js/Express app to Render and configure MongoDB production cluster.', priority: 'high', dueDate: daysFromNow(1), completed: false, userId },
      { title: 'Complete MERN revision', description: 'Review React context state lifecycle, hooks, and Node.js middlewares.', priority: 'medium', dueDate: daysFromNow(2), completed: false, userId },
      { title: 'Prepare for placement interviews', description: 'Revise core concepts in OS, DBMS, Networks, and prepare behavioral answers.', priority: 'high', dueDate: daysFromNow(3), completed: false, userId },
      { title: 'Finish AI documentation', description: 'Document API routes, schema validation rules, and failover routing logic.', priority: 'medium', dueDate: daysFromNow(2), completed: false, userId },
      { title: 'Review System Design concepts', description: 'Study database scaling, replication, caching with Redis, and load balancing.', priority: 'high', dueDate: daysFromNow(4), completed: false, userId },
      { title: 'Solve 20 DSA recursion problems', description: 'Solve backtracking and dynamic programming questions on GeeksforGeeks.', priority: 'high', dueDate: daysFromNow(2), completed: false, userId },
      { title: 'Computer Networks Quiz prep', description: 'Review OSI layer protocols, TCP/UDP headers, and IP subnet masking.', priority: 'medium', dueDate: daysFromNow(1), completed: false, userId },
      { title: 'Machine Learning Project', description: 'Build and train a regression model for stock price prediction.', priority: 'medium', dueDate: daysFromNow(5), completed: false, userId },
      { title: 'Prepare Startup Pitch Deck', description: 'Write down the business problem, solution, architecture, and revenue model.', priority: 'low', dueDate: daysFromNow(6), completed: false, userId },
      { title: 'Write technical blog post', description: 'Write a comprehensive guide on implementing JWT authentication in Node.js.', priority: 'low', dueDate: daysFromNow(4), completed: false, userId },

      // 5 Pending tasks
      { title: 'Complete German A1 vocabulary', description: 'Study basic conversations, verbs, and daily phrases.', priority: 'low', dueDate: daysFromNow(15), completed: false, userId },
      { title: 'Learn Kubernetes basics', description: 'Understand pods, services, deployments, and configmaps.', priority: 'medium', dueDate: daysFromNow(12), completed: false, userId },
      { title: 'Final Semester project prototype', description: 'Design UI mockup screens and database schema design for approval.', priority: 'high', dueDate: daysFromNow(20), completed: false, userId },
      { title: 'Learn Docker containerization', description: 'Dockerize local MERN application and push images to Docker Hub.', priority: 'medium', dueDate: daysFromNow(10), completed: false, userId },
      { title: 'Contribute to open source', description: 'Find a beginner-friendly good first issue in a GitHub repository.', priority: 'low', dueDate: daysFromNow(25), completed: false, userId },

      // 2 Overdue tasks
      { title: 'Submit Software Engineering report', description: 'Submit the software requirement specification (SRS) draft.', priority: 'medium', dueDate: daysAgo(3), completed: false, userId },
      { title: 'Review Cloud Computing syllabus', description: 'Read AWS services overview, virtualization, and SLA concepts.', priority: 'low', dueDate: daysAgo(1), completed: false, userId }
    ];
    await Task.insertMany(tasksData);
    console.log('25 Tasks seeded.');

    // ==========================================
    // 4. GOALS
    // ==========================================
    console.log('Seeding 10 goals...');
    const goalsData = [
      {
        title: 'Crack Product-Based Company Interview',
        description: 'Prepare and pass recruitment drives for top product companies.',
        category: 'Personal Development',
        progressType: 'milestones',
        targetValue: 5,
        currentProgress: 3,
        unit: 'stages',
        deadline: daysFromNow(60),
        priority: 'high',
        status: 'In Progress',
        streak: 12,
        longestStreak: 15,
        milestones: [
          { title: 'Resume Selection & ATS Optimization', completed: true },
          { title: 'Online Technical Assessment (DSA)', completed: true },
          { title: 'Technical Rounds (System Design & Code)', completed: true },
          { title: 'Managerial Round', completed: false },
          { title: 'HR Round', completed: false }
        ],
        userId
      },
      {
        title: 'Reach 500 DSA Problems',
        description: 'Solve LeetCode and GFG problems to strengthen algorithmic skills.',
        category: 'Study',
        progressType: 'numeric',
        targetValue: 500,
        currentProgress: 420,
        unit: 'problems',
        deadline: daysFromNow(45),
        priority: 'high',
        status: 'In Progress',
        streak: 18,
        longestStreak: 25,
        userId
      },
      {
        title: 'Build SaaS Product',
        description: 'Build and launch a micro-SaaS tool for developers.',
        category: 'Personal Development',
        progressType: 'percentage',
        targetValue: 100,
        currentProgress: 65,
        unit: '%',
        deadline: daysFromNow(30),
        priority: 'medium',
        status: 'In Progress',
        streak: 5,
        longestStreak: 8,
        userId
      },
      {
        title: 'Learn System Design',
        description: 'Read Alex Xu volume 1 & 2 and watch online lecture series.',
        category: 'Study',
        progressType: 'percentage',
        targetValue: 100,
        currentProgress: 100,
        unit: '%',
        deadline: daysAgo(5),
        priority: 'high',
        status: 'Completed',
        completedAt: daysAgo(5),
        streak: 20,
        longestStreak: 20,
        userId
      },
      {
        title: 'Complete German A1',
        description: 'Learn foundations and pass the Goethe-Zertifikat A1 exam.',
        category: 'Study',
        progressType: 'percentage',
        targetValue: 100,
        currentProgress: 30,
        unit: '%',
        deadline: daysFromNow(90),
        priority: 'low',
        status: 'In Progress',
        streak: 2,
        longestStreak: 4,
        userId
      },
      {
        title: 'Master React',
        description: 'Build 5 production-grade React apps using diverse hooks and contexts.',
        category: 'Study',
        progressType: 'numeric',
        targetValue: 5,
        currentProgress: 5,
        unit: 'apps',
        deadline: daysAgo(10),
        priority: 'high',
        status: 'Completed',
        completedAt: daysAgo(10),
        streak: 15,
        longestStreak: 15,
        userId
      },
      {
        title: 'Learn Kubernetes',
        description: 'Study container orchestration, deploy multi-container apps.',
        category: 'Personal Development',
        progressType: 'percentage',
        targetValue: 100,
        currentProgress: 15,
        unit: '%',
        deadline: daysFromNow(40),
        priority: 'medium',
        status: 'In Progress',
        streak: 0,
        longestStreak: 2,
        userId
      },
      {
        title: 'Publish Technical Blogs',
        description: 'Write articles sharing coding concepts, projects, and interview tips.',
        category: 'Personal Development',
        progressType: 'numeric',
        targetValue: 10,
        currentProgress: 6,
        unit: 'blogs',
        deadline: daysFromNow(50),
        priority: 'low',
        status: 'In Progress',
        streak: 4,
        longestStreak: 4,
        userId
      },
      {
        title: 'Reach 100 LinkedIn Posts',
        description: 'Consistently share learning progress, tips, and network updates.',
        category: 'Personal Development',
        progressType: 'numeric',
        targetValue: 100,
        currentProgress: 45,
        unit: 'posts',
        deadline: daysFromNow(60),
        priority: 'low',
        status: 'In Progress',
        streak: 1,
        longestStreak: 6,
        userId
      },
      {
        title: 'Build AI Startup MVP',
        description: 'Assemble AI agents codebase and pitch it to mentors.',
        category: 'Personal Development',
        progressType: 'milestones',
        targetValue: 4,
        currentProgress: 1,
        unit: 'milestones',
        deadline: daysFromNow(35),
        priority: 'high',
        status: 'In Progress',
        streak: 0,
        longestStreak: 1,
        milestones: [
          { title: 'Write system requirements & workflow diagram', completed: true },
          { title: 'Develop backend API routing & DB schema', completed: false },
          { title: 'Create responsive frontend dashboard layouts', completed: false },
          { title: 'Perform pilot testing with 10 users', completed: false }
        ],
        userId
      }
    ];
    await Goal.insertMany(goalsData);
    console.log('10 Goals seeded.');

    // ==========================================
    // 5. NOTESGROUPS & NOTES
    // ==========================================
    console.log('Seeding notes folders and 20 notes...');
    const notesGroupsData = [
      { name: 'Semester Notes', color: '#6366f1', userId },
      { name: 'Placement Preparation', color: '#ec4899', userId },
      { name: 'AI Research', color: '#10b981', userId }
    ];
    const createdGroups = await NotesGroup.insertMany(notesGroupsData);
    const groupMap = {};
    createdGroups.forEach(g => {
      groupMap[g.name] = g._id;
    });

    const notesData = [
      {
        title: 'CPU Scheduling Algorithms',
        subject: 'Operating Systems',
        description: 'Detailed analysis of FCFS, Shortest Job First, Round Robin, and Priority Scheduling with Gantt chart calculation examples.',
        fileUrl: 'http://localhost:5000/uploads/demo_note.pdf',
        fileType: 'pdf',
        fileSize: 102450,
        uploadedBy: userId,
        groupId: groupMap['Semester Notes']
      },
      {
        title: 'TCP/IP vs OSI Reference Models',
        subject: 'Computer Networks',
        description: 'Comparative study of layer architectures, header encapsulates, routing dynamics, and functions of TCP/IP and OSI.',
        fileUrl: 'http://localhost:5000/uploads/demo_note.pdf',
        fileType: 'pdf',
        fileSize: 95400,
        uploadedBy: userId,
        groupId: groupMap['Semester Notes']
      },
      {
        title: 'Relational Algebra & Normalization',
        subject: 'DBMS',
        description: 'Deep dive into Select, Project, Join operations, functional dependencies, and normalization forms (1NF, 2NF, 3NF, BCNF).',
        fileUrl: 'http://localhost:5000/uploads/demo_note.pdf',
        fileType: 'pdf',
        fileSize: 125300,
        uploadedBy: userId,
        groupId: groupMap['Semester Notes']
      },
      {
        title: 'Qubits & Quantum Gates Theory',
        subject: 'Quantum Computing',
        description: 'Introduction to Quantum States, Dirac notation, Bloch Sphere, Hadamard gate, CNOT gate, and Phase shift transformations.',
        fileUrl: 'http://localhost:5000/uploads/demo_note.pdf',
        fileType: 'pdf',
        fileSize: 84000,
        uploadedBy: userId,
        groupId: groupMap['Semester Notes']
      },
      {
        title: 'Supervised Learning Algorithms',
        subject: 'Machine Learning',
        description: 'Overview of Linear Regression, Logistic Regression, Decision Trees, Random Forests, SVM, and KNN classifiers.',
        fileUrl: 'http://localhost:5000/uploads/demo_note.pdf',
        fileType: 'pdf',
        fileSize: 145000,
        uploadedBy: userId,
        groupId: groupMap['Semester Notes']
      },
      {
        title: 'Software Development Life Cycle Models',
        subject: 'Software Engineering',
        description: 'Study of Waterfall model, Spiral model, V-Model, Agile framework, Scrum sprints, and software requirement specifications (SRS).',
        fileUrl: 'http://localhost:5000/uploads/demo_note.pdf',
        fileType: 'pdf',
        fileSize: 78000,
        uploadedBy: userId,
        groupId: groupMap['Semester Notes']
      },
      {
        title: 'Cloud Service Models: IaaS, PaaS, SaaS',
        subject: 'Cloud Computing',
        description: 'Detailed analysis of cloud infrastructure layers, serverless computing, AWS EC2, S3, RDS, and client service level agreements.',
        fileUrl: 'http://localhost:5000/uploads/demo_note.pdf',
        fileType: 'pdf',
        fileSize: 110200,
        uploadedBy: userId,
        groupId: groupMap['Semester Notes']
      },
      {
        title: 'Tree Traversals & AVL Trees',
        subject: 'Data Structures',
        description: 'Implementation details of Inorder, Preorder, Postorder traversals, and balance factors, single/double rotations in AVL Trees.',
        fileUrl: 'http://localhost:5000/uploads/demo_note.pdf',
        fileType: 'pdf',
        fileSize: 92300,
        uploadedBy: userId,
        groupId: groupMap['Semester Notes']
      },
      {
        title: 'Top 50 Interview SQL Queries',
        subject: 'DBMS',
        description: 'Compiled SQL query scripts for Joins, Subqueries, Aggregate functions, window functions, and Nth highest salary puzzles.',
        fileUrl: 'http://localhost:5000/uploads/demo_note.pdf',
        fileType: 'pdf',
        fileSize: 67000,
        uploadedBy: userId,
        groupId: groupMap['Placement Preparation']
      },
      {
        title: 'Deadlock Handling & Bankers Algorithm',
        subject: 'Operating Systems',
        description: 'Placement revision cheatsheet on Deadlock Prevention, Avoidance, Bankers Algorithm safety checks, and Resource Allocation Graphs.',
        fileUrl: 'http://localhost:5000/uploads/demo_note.pdf',
        fileType: 'pdf',
        fileSize: 81200,
        uploadedBy: userId,
        groupId: groupMap['Placement Preparation']
      },
      {
        title: 'Socket Programming & HTTP Handshake',
        subject: 'Computer Networks',
        description: 'Overview of TCP 3-way handshake, socket syscalls (bind, listen, accept), HTTP 1.1 vs HTTP/2 vs HTTP/3 differences.',
        fileUrl: 'http://localhost:5000/uploads/demo_note.pdf',
        fileType: 'pdf',
        fileSize: 115000,
        uploadedBy: userId,
        groupId: groupMap['Placement Preparation']
      },
      {
        title: 'Dynamic Programming Patterns',
        subject: 'Algorithms',
        description: 'Revision notes for DP patterns: 0/1 Knapsack, Longest Common Subsequence (LCS), Edit Distance, and Coin Change solutions.',
        fileUrl: 'http://localhost:5000/uploads/demo_note.pdf',
        fileType: 'pdf',
        fileSize: 153000,
        uploadedBy: userId,
        groupId: groupMap['Placement Preparation']
      },
      {
        title: 'Graph Algorithms: Dijkstra & Prim',
        subject: 'Algorithms',
        description: 'Algorithmic steps, time complexity analysis, and priority queue implementation of Dijkstra Shortest Path and Prims MST.',
        fileUrl: 'http://localhost:5000/uploads/demo_note.pdf',
        fileType: 'pdf',
        fileSize: 122000,
        uploadedBy: userId,
        groupId: groupMap['Placement Preparation']
      },
      {
        title: 'Object-Oriented Design Patterns',
        subject: 'Software Engineering',
        description: 'Creational, Structural, and Behavioral patterns including Singleton, Factory, Observer, and Strategy patterns with Java snippets.',
        fileUrl: 'http://localhost:5000/uploads/demo_note.pdf',
        fileType: 'pdf',
        fileSize: 94000,
        uploadedBy: userId,
        groupId: groupMap['Placement Preparation']
      },
      {
        title: 'Neural Networks & Backpropagation',
        subject: 'Artificial Intelligence',
        description: 'Mathematical derivation of gradient descent, weight updates, activation functions (Sigmoid, ReLU, LeakyReLU), and cross-entropy loss.',
        fileUrl: 'http://localhost:5000/uploads/demo_note.pdf',
        fileType: 'pdf',
        fileSize: 165000,
        uploadedBy: userId,
        groupId: groupMap['AI Research']
      },
      {
        title: 'Natural Language Processing Basics',
        subject: 'Artificial Intelligence',
        description: 'Text preprocessing pipelines (tokenization, stemming, lemmatization), TF-IDF vectors, Word2Vec, and introduction to Transformer architectures.',
        fileUrl: 'http://localhost:5000/uploads/demo_note.pdf',
        fileType: 'pdf',
        fileSize: 138000,
        uploadedBy: userId,
        groupId: groupMap['AI Research']
      },
      {
        title: 'Unsupervised Clustering Methods',
        subject: 'Machine Learning',
        description: 'Theoretical background on K-Means clustering, Hierarchical clustering, DBSCAN, and evaluation techniques like Silhouette scores.',
        fileUrl: 'http://localhost:5000/uploads/demo_note.pdf',
        fileType: 'pdf',
        fileSize: 109000,
        uploadedBy: userId,
        groupId: groupMap['AI Research']
      },
      {
        title: 'Introduction to CNNs & Image Filters',
        subject: 'Machine Learning',
        description: 'Convolution operations, pooling layers (Max pooling, Average pooling), stride parameters, and architectures like AlexNet and ResNet.',
        fileUrl: 'http://localhost:5000/uploads/demo_note.pdf',
        fileType: 'pdf',
        fileSize: 142000,
        uploadedBy: userId,
        groupId: groupMap['AI Research']
      },
      {
        title: 'AI Ethics & Large Language Models',
        subject: 'Artificial Intelligence',
        description: 'Discussion on bias, privacy, hallucination detection, prompt injection vulnerabilities, and safety guardrails in AI deployment.',
        fileUrl: 'http://localhost:5000/uploads/demo_note.pdf',
        fileType: 'pdf',
        fileSize: 88000,
        uploadedBy: userId,
        groupId: groupMap['AI Research']
      },
      {
        title: 'Reinforcement Learning & Q-Learning',
        subject: 'Artificial Intelligence',
        description: 'Understanding Agent-Environment loops, Markov Decision Processes (MDP), Bellman equations, reward functions, and Q-table convergence.',
        fileUrl: 'http://localhost:5000/uploads/demo_note.pdf',
        fileType: 'pdf',
        fileSize: 119000,
        uploadedBy: userId,
        groupId: groupMap['AI Research']
      }
    ];
    await Note.insertMany(notesData);
    console.log('20 Notes seeded.');

    // ==========================================
    // 6. CAMPUSBUDDY CHAT CONVERSATIONS
    // ==========================================
    console.log('Seeding 15 chat conversations...');
    const conversationsData = [
      {
        title: 'Create MERN roadmap',
        messages: [
          { role: 'user', content: 'Hi, can you give me a roadmap to master MERN stack in 2 months?' },
          { role: 'assistant', content: 'Hi, I\'m CampusBuddy, your AI study companion. Mastering MERN in 60 days is achievable. Let\'s break it down:\n\n**Weeks 1-2: Frontend Foundations**\n- HTML5, CSS3, ES6 JavaScript.\n- React: State, Props, Lifecycle, Hooks (useState, useEffect).\n\n**Weeks 3-4: Backend & Databases**\n- Node.js runtime environment.\n- Express.js: Routing, Middlewares, controllers.\n- MongoDB: Document design, Mongoose schemas, CRUD operations.\n\n**Weeks 5-6: Integration & Authentication**\n- REST APIs implementation.\n- JWT tokens, bcrypt, secure HTTP-only cookies.\n- Frontend routing with React Router.\n\n**Weeks 7-8: Build a Capstone SaaS Project**\n- Build a full-fledged application, implement state management (Redux or Context API), and deploy to Render (Backend) and Vercel (Frontend).' },
          { role: 'user', content: 'What project do you recommend I build?' },
          { role: 'assistant', content: 'I recommend building a **Student Productivity Dashboard & AI Assistant** like MyCampusOS! It involves multiple modules, CRUD operations, third-party authentication, charts, and API integrations. This will look stellar on your resume!' },
          { role: 'user', content: 'Awesome, thanks!' },
          { role: 'assistant', content: 'You\'re welcome! Keep studying and happy coding!' }
        ]
      },
      {
        title: 'Explain process synchronization',
        messages: [
          { role: 'user', content: 'What is process synchronization in OS?' },
          { role: 'assistant', content: 'Hi, I\'m CampusBuddy, your AI study companion. Process synchronization is the coordination of execution of multiple processes in a multi-tasking system to ensure they do not access shared data simultaneously, which leads to **Data Inconsistency**.' },
          { role: 'user', content: 'Can you explain the Critical Section problem?' },
          { role: 'assistant', content: 'The **Critical Section** is a code segment where shared resources (variables, files, databases) are accessed. The critical section problem is to design a protocol that guarantees:\n1. **Mutual Exclusion**: Only one process at a time can execute its critical section.\n2. **Progress**: If no process is executing and some want to enter, selection cannot be postponed indefinitely.\n3. **Bounded Waiting**: There is a limit on the number of times other processes can enter before a waiting process is granted access.' },
          { role: 'user', content: 'What are Mutexes and Semaphores?' },
          { role: 'assistant', content: '**Mutex (Mutual Exclusion)**:\n- A locking mechanism (binary: lock/unlock) used to synchronize access to a resource. Only the owner who locked it can unlock it.\n\n**Semaphore**:\n- A signaling mechanism using an integer value. It supports `wait()` and `signal()` operations. Can be **binary** (0 or 1) or **counting** (any positive value representing resource instances).' }
        ]
      },
      {
        title: 'Generate DSA study plan',
        messages: [
          { role: 'user', content: 'Please help me plan my DSA preparation.' },
          { role: 'assistant', content: 'Hi, I\'m CampusBuddy, your AI study companion. Here is a structured DSA plan:\n\n1. **Phase 1: Foundations (10 Days)**\n   - Arrays, String manipulation, Multi-dimensional arrays.\n   - Complexity analysis (Big O, Space complexity).\n2. **Phase 2: Linear Data Structures (15 Days)**\n   - Linked Lists, Stacks, Queues.\n   - Two-pointer technique, sliding window.\n3. **Phase 3: Trees and Graphs (20 Days)**\n   - Binary Trees, Binary Search Trees (BST), AVL Trees.\n   - BFS & DFS traversals, Dijkstra, Minimum Spanning Tree.\n4. **Phase 4: Advanced Algorithms (15 Days)**\n   - Recursion, Backtracking, Dynamic Programming (DP), Greedy algorithms.' },
          { role: 'user', content: 'How many problems should I solve daily?' },
          { role: 'assistant', content: 'Aim for **2-3 problems per day**. Make sure to focus on quality: 1 Easy, 1 Medium, and occasionally a Hard problem. Always review other optimal solutions after completing yours.' }
        ]
      },
      {
        title: 'Difference between TCP and UDP',
        messages: [
          { role: 'user', content: 'Can you compare TCP and UDP protocols?' },
          { role: 'assistant', content: 'Hi, I\'m CampusBuddy, your AI study companion. Here is a comparison of TCP and UDP:\n\n| Feature | TCP (Transmission Control Protocol) | UDP (User Datagram Protocol) |\n| :--- | :--- | :--- |\n| **Connection** | Connection-Oriented (Three-way handshake) | Connectionless |\n| **Reliability** | Guaranteed delivery (acknowledgments) | Unreliable (best-effort delivery) |\n| **Ordering** | Arrives in order | No ordering guaranteed |\n| **Speed** | Slower (overhead of headers & flow control) | Fast (minimal overhead) |\n| **Flow Control** | Yes | No |\n| **Header Size** | 20-60 bytes | 8 bytes |\n| **Use Cases** | Web browsing (HTTP), Email (SMTP), File transfer (FTP) | Live streaming, VoIP, Gaming, DNS |' }
        ]
      },
      {
        title: 'Prepare for placement interview',
        messages: [
          { role: 'user', content: 'I have a placement interview at a software product company next week. How do I prepare?' },
          { role: 'assistant', content: 'Hi, I\'m CampusBuddy, your AI study companion. A typical product-based technical interview consists of:\n\n1. **Coding Rounds (DSA)**: Focus on HashMaps, Trees, DP, and Arrays. Be ready to explain time and space complexity.\n2. **CS Core Subjects**: Revise Acid properties, SQL Queries, Joins, OS Semaphores, Page replacement, OSI layers.\n3. **Projects Deep Dive**: Be ready to talk about architecture, trade-offs, schemas, and challenges in your MERN or AI projects.\n4. **System Design (optional for grads)**: Brush up on Scalability, Load Balancers, Caching, and SQL vs NoSQL.' },
          { role: 'user', content: 'Should I prepare HR behavioral questions too?' },
          { role: 'assistant', content: 'Yes, absolutely! Use the **STAR method** (Situation, Task, Action, Result) to talk about teamwork, conflict resolution, or technical challenge. Common questions: "Tell me about a time you resolved a technical dispute" or "What is your biggest failure?".' }
        ]
      },
      {
        title: 'Create startup pitch',
        messages: [
          { role: 'user', content: 'Can you help me outline a startup pitch deck structure?' },
          { role: 'assistant', content: 'Hi, I\'m CampusBuddy, your AI study companion. A solid startup pitch deck has 10 core slides:\n\n1. **Title Slide**: Vision, logo, name.\n2. **The Problem**: What paint point are you solving?\n3. **The Solution**: How does your software/app solve this problem?\n4. **Market Size (TAM, SAM, SOM)**: Who is your target audience?\n5. **The Product**: Highlight key features, architectural layout, tech stack.\n6. **Business Model**: How will you make money (subscription, freemium)?\n7. **Competition**: Contrast your product against competitors.\n8. **Go-To-Market Strategy**: How will you acquire users?\n9. **The Team**: Credentials and roles of founders.\n10. **The Ask**: Funding or help required to achieve milestones.' }
        ]
      },
      {
        title: 'Explain quantum gates',
        messages: [
          { role: 'user', content: 'Can you explain the basic quantum gates?' },
          { role: 'assistant', content: 'Hi, I\'m CampusBuddy, your AI study companion. Quantum gates modify qubit states in quantum computing. The basic gates are:\n\n- **Hadamard Gate (H)**: Puts a qubit into a 50/50 superposition state ($|0\\rangle \\rightarrow \\frac{|0\\rangle + |1\\rangle}{\\sqrt{2}}$).\n- **Pauli-X Gate (NOT)**: Flips the qubit state ($|0\\rangle \\leftrightarrow |1\\rangle$).\n- **Pauli-Z Gate**: Flips the phase of a qubit ($|1\\rangle \\rightarrow -|1\\rangle$).\n- **CNOT Gate (Controlled-NOT)**: Flips the target qubit if control qubit is $|1\\rangle$. Essential for creating quantum entanglement.' }
        ]
      },
      {
        title: 'Build Node.js backend',
        messages: [
          { role: 'user', content: 'How do I start building a secure backend API in Node.js?' },
          { role: 'assistant', content: 'Hi, I\'m CampusBuddy, your AI study companion. Here are the steps:\n\n1. Run `npm init -y` and install `express`, `mongoose`, `jsonwebtoken`, `bcryptjs`, and `dotenv`.\n2. Set up your entry point (`server.js`) and load environment variables.\n3. Configure security middlewares: `helmet` for headers, `cors` for cross-origin, and express rate limits.\n4. Design schemas, routing structures, controllers, and register them as middleware routes.' }
        ]
      },
      {
        title: 'Resume review',
        messages: [
          { role: 'user', content: 'Can you check my resume? I need recommendations on my projects section.' },
          { role: 'assistant', content: 'Hi, I\'m CampusBuddy, your AI study companion. Focus on these points for projects:\n- **Use Action Verbs**: (e.g. Developed, Architected, Optimized).\n- **Quantify Impact**: "Boosted query latency by 40% with custom indexing" or "Deployed app to 500+ active campus users".\n- **List Stack**: Explicitly detail (React, Express, Node.js, MongoDB, WebSockets).' }
        ]
      },
      {
        title: 'System design preparation',
        messages: [
          { role: 'user', content: 'How should I start learning System Design?' },
          { role: 'assistant', content: 'Hi, I\'m CampusBuddy, your AI study companion. Start with these building blocks:\n- **Monolith vs Microservices**.\n- **Load Balancers**: Round Robin, Least Connections, Nginx.\n- **Caching**: Memcached or Redis configurations.\n- **Database Scaling**: Sharding, Master-Slave Replication.' }
        ]
      },
      {
        title: 'Explain database indexes',
        messages: [
          { role: 'user', content: 'Why do indexes speed up database queries, and what is the trade-off?' },
          { role: 'assistant', content: 'Hi, I\'m CampusBuddy, your AI study companion. Indexes speed up search queries by creating a separate data structure (usually a B-Tree or B+ Tree) that stores pointer locations. Trade-offs: slower inserts/updates/deletes due to overhead of maintaining the index structure, and extra memory disk storage space.' }
        ]
      },
      {
        title: 'AI Agent architectures',
        messages: [
          { role: 'user', content: 'What is the difference between Single Agent and Multi-Agent AI systems?' },
          { role: 'assistant', content: 'Hi, I\'m CampusBuddy, your AI study companion. Single agent handles tasks end-to-end, prompting context repeatedly. Multi-agent systems delegate sub-tasks to specialized agents who interact with each other (e.g., Code Reviewer, Tester, Coder) via messaging, lowering context size and producing higher-quality outputs.' }
        ]
      },
      {
        title: 'Explain CORS mechanism',
        messages: [
          { role: 'user', content: 'What is CORS and how do I fix "Blocked by CORS Policy" in Express?' },
          { role: 'assistant', content: 'Hi, I\'m CampusBuddy, your AI study companion. Cross-Origin Resource Sharing (CORS) is a browser security mechanism that blocks scripts from requesting resources from a different origin (domain/port) than the page itself. In Express, fix it by importing the `cors` package and applying it as middleware configured with permitted client URLs.' }
        ]
      },
      {
        title: 'AWS vs Heroku vs Render',
        messages: [
          { role: 'user', content: 'Should I deploy my MERN app on Heroku, Render, or AWS?' },
          { role: 'assistant', content: 'Hi, I\'m CampusBuddy, your AI study companion. Here\'s the breakdown:\n- **Heroku**: Paid-only now, but very easy.\n- **Render**: Free tier available for web apps/cron jobs, great developer experience for MERN.\n- **AWS**: High learning curve, but enterprise-grade scalability and cost-efficiency when deploying via EC2, ECS, or Amplify.' }
        ]
      },
      {
        title: 'Explain time complexity',
        messages: [
          { role: 'user', content: 'Can you explain Big O notation in simple terms?' },
          { role: 'assistant', content: 'Hi, I\'m CampusBuddy, your AI study companion. Big O notation measures how the running time or space required by an algorithm grows as the size of the input data ($N$) grows. It describes the worst-case scenario: e.g. $O(1)$ is constant, $O(N)$ is linear, $O(N^2)$ is quadratic (e.g. nested loops).' }
        ]
      }
    ];

    await AIChatConversation.insertMany(
      conversationsData.map(c => ({
        userId,
        title: c.title,
        isPinned: false,
        isFavorite: false,
        messages: c.messages.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: new Date()
        }))
      }))
    );
    console.log('15 Chat conversations seeded.');

    // ==========================================
    // 7. STUDY PLANS (Already generated 10)
    // ==========================================
    console.log('Seeding 10 study plans...');
    const studyPlansData = [
      {
        title: '30 Day DSA Plan',
        subject: 'Data Structures & Algorithms',
        examDate: daysFromNow(30),
        topics: ['Arrays', 'Linked Lists', 'Stacks', 'Queues', 'Trees', 'Graphs', 'DP', 'Recursion'],
        dailyHours: 3,
        plan: {
          timetable: [
            { day: 'Monday-Wednesday', topic: 'Arrays & Linked Lists', duration: '3 hours' },
            { day: 'Thursday-Friday', topic: 'Stacks & Queues', duration: '3 hours' },
            { day: 'Saturday-Sunday', topic: 'Algorithm revision & coding exercises', duration: '3 hours' }
          ],
          revisionSchedule: [
            { week: 'Week 1', focus: 'Linear Data Structures & Coding Problems' },
            { week: 'Week 2', focus: 'Non-linear Data Structures (Trees, Graphs)' },
            { week: 'Week 3', focus: 'Dynamic Programming & Backtracking' },
            { week: 'Week 4', focus: 'Mock Interviews & Mock Tests' }
          ],
          priorityTopics: [
            { topic: 'Recursion and Backtracking', weight: 'High' },
            { topic: 'Dynamic Programming Patterns', weight: 'Critical' },
            { topic: 'Graph Traversals (BFS & DFS)', weight: 'Medium' }
          ],
          dailyGoals: [
            'Solve 2 Easy and 1 Medium question on the active topic.',
            'Document optimizations in a code repository.',
            'Verify complexity bounds of code implementations.'
          ]
        }
      },
      {
        title: '7 Day Quantum Computing Revision',
        subject: 'Quantum Computing',
        examDate: daysFromNow(7),
        topics: ['Qubits', 'Dirac Notation', 'Bloch Sphere', 'Hadamard Gate', 'Quantum Teleportation'],
        dailyHours: 2,
        plan: {
          timetable: [
            { day: 'Day 1-2', topic: 'Qubits, Superposition & Bloch Sphere math', duration: '2 hours' },
            { day: 'Day 3-4', topic: 'Single & Multi-qubit gates (H, X, Z, CNOT)', duration: '2 hours' },
            { day: 'Day 5-6', topic: 'Quantum algorithms & Teleportation proofs', duration: '2 hours' },
            { day: 'Day 7', topic: 'Formula review & past exam questions', duration: '2 hours' }
          ],
          revisionSchedule: [
            { week: 'Revision Week', focus: 'Dirac Notation proofs and Gate operations' }
          ],
          priorityTopics: [
            { topic: 'Hadamard gates and superposition matrix calculations', weight: 'High' },
            { topic: 'CNOT entanglement and EPR pairs', weight: 'Critical' }
          ],
          dailyGoals: [
            'Revise lecture notes on Quantum Gates.',
            'Solve 5 bracket-notation calculations.',
            'Review quantum entanglement equations.'
          ]
        }
      },
      {
        title: '15 Day DBMS Interview Preparation',
        subject: 'DBMS',
        examDate: daysFromNow(15),
        topics: ['SQL Queries', 'Joins', 'Normalization', 'Indexing', 'Transactions', 'ACID'],
        dailyHours: 2,
        plan: {
          timetable: [
            { day: 'Day 1-5', topic: 'SQL commands, Joins, subqueries, aggregate queries', duration: '2 hours' },
            { day: 'Day 6-10', topic: 'Normalization forms (1NF-BCNF) & dependencies', duration: '2 hours' },
            { day: 'Day 11-15', topic: 'ACID properties, transactions, indexing, locks', duration: '2 hours' }
          ],
          revisionSchedule: [
            { week: 'Week 1', focus: 'SQL queries and Joins' },
            { week: 'Week 2', focus: 'Transactions, indexing, and normalization forms' }
          ],
          priorityTopics: [
            { topic: 'BCNF vs 3NF normalization rules', weight: 'High' },
            { topic: 'ACID transactional logs and recovery systems', weight: 'Critical' }
          ],
          dailyGoals: [
            'Solve 5 complex SQL query questions.',
            'Draw functional dependency diagrams for normalization exercises.',
            'Revise difference between Clustered and Non-clustered indexing.'
          ]
        }
      },
      {
        title: 'MERN Stack Mastery Plan',
        subject: 'Web Development',
        examDate: daysFromNow(60),
        topics: ['React Hooks', 'Node/Express API', 'MongoDB Schema Design', 'JWT Authentication', 'Redux State Management'],
        dailyHours: 4,
        plan: {
          timetable: [
            { day: 'Week 1-2', topic: 'Advanced React: hooks, Context, custom hooks', duration: '4 hours' },
            { day: 'Week 3-4', topic: 'Express server, middlewares, security headers', duration: '4 hours' },
            { day: 'Week 5-6', topic: 'MongoDB schema design, index performance', duration: '4 hours' },
            { day: 'Week 7-8', topic: 'Authentication, cookies, deployment and CI/CD', duration: '4 hours' }
          ],
          revisionSchedule: [
            { week: 'Month 1', focus: 'React, Node, Express, MongoDB CRUD applications' },
            { week: 'Month 2', focus: 'JWT authentication, state management, full-stack integration, deployment' }
          ],
          priorityTopics: [
            { topic: 'React render cycles & dependency array optimizations', weight: 'High' },
            { topic: 'JWT validation middleware & token storage security', weight: 'Critical' }
          ],
          dailyGoals: [
            'Code one full CRUD controller daily.',
            'Review network headers and security parameters.',
            'Practice lifting state and modularizing UI components.'
          ]
        }
      },
      {
        title: 'Cloud Computing Crash Course',
        subject: 'Cloud Computing',
        examDate: daysFromNow(10),
        topics: ['AWS Architecture', 'EC2 instances', 'S3 buckets', 'Load Balancers', 'Serverless Lambda'],
        dailyHours: 2,
        plan: {
          timetable: [
            { day: 'Day 1-3', topic: 'EC2 provisioning, VPC setups, IAM policies', duration: '2 hours' },
            { day: 'Day 4-6', topic: 'S3 static site hosting, CDN CloudFront configurations', duration: '2 hours' },
            { day: 'Day 7-9', topic: 'Auto Scaling, Route53 DNS, AWS Lambda functions', duration: '2 hours' },
            { day: 'Day 10', topic: 'Architectural exam prep and practice tests', duration: '2 hours' }
          ],
          revisionSchedule: [
            { week: 'Crash Week', focus: 'AWS compute, storage, networking and security' }
          ],
          priorityTopics: [
            { topic: 'VPC security groups & subnet routing tables', weight: 'High' },
            { topic: 'Serverless architecture utilizing AWS Lambda and API Gateway', weight: 'Critical' }
          ],
          dailyGoals: [
            'Build and launch a mock EC2 container instance.',
            'Configure S3 lifecycle bucket permissions.',
            'Deploy a simple Node.js lambda api function.'
          ]
        }
      },
      {
        title: 'Operating Systems Core Exam Guide',
        subject: 'Operating Systems',
        examDate: daysFromNow(14),
        topics: ['Process Scheduling', 'Deadlocks', 'Paging & Segmentation', 'Virtual Memory'],
        dailyHours: 2,
        plan: {
          timetable: [
            { day: 'Day 1-4', topic: 'CPU scheduling calculations (Gantt charts)', duration: '2 hours' },
            { day: 'Day 5-8', topic: 'Deadlock Banker algorithm safety states', duration: '2 hours' },
            { day: 'Day 9-12', topic: 'Paging, TLB, page replacement algorithms', duration: '2 hours' },
            { day: 'Day 13-14', topic: 'File systems & disk scheduling (SCAN, C-LOOK)', duration: '2 hours' }
          ],
          revisionSchedule: [
            { week: 'Week 1', focus: 'CPU scheduling and deadlocks mathematical solving' },
            { week: 'Week 2', focus: 'Memory management, paging and page replacement exercises' }
          ],
          priorityTopics: [
            { topic: 'LRU & FIFO Page Replacement calculations', weight: 'High' },
            { topic: 'Bankers Algorithm Resource safety matrix proofs', weight: 'Critical' }
          ],
          dailyGoals: [
            'Solve 3 CPU scheduling Gantt chart problems.',
            'Revise translation lookaside buffer (TLB) page checks.',
            'Solve 2 page replacement algorithms exercises.'
          ]
        }
      },
      {
        title: 'Computer Networks Protocols Guide',
        subject: 'Computer Networks',
        examDate: daysFromNow(21),
        topics: ['IP Addressing', 'Subnetting', 'Routing Protocols', 'Application Layer'],
        dailyHours: 2,
        plan: {
          timetable: [
            { day: 'Day 1-7', topic: 'Classful/Classless IP subnet masks computations', duration: '2 hours' },
            { day: 'Day 8-14', topic: 'Routing protocols RIP, OSPF, BGP configurations', duration: '2 hours' },
            { day: 'Day 15-21', topic: 'HTTP, DNS, DHCP, SMTP handshakes details', duration: '2 hours' }
          ],
          revisionSchedule: [
            { week: 'Week 1', focus: 'Subnet masking calculations' },
            { week: 'Week 2', focus: 'Routing protocols logic' },
            { week: 'Week 3', focus: 'Application layer protocol handshakes' }
          ],
          priorityTopics: [
            { topic: 'CIDR Subnet mask allocations and address range math', weight: 'Critical' },
            { topic: 'TCP congestion control window graphs', weight: 'High' }
          ],
          dailyGoals: [
            'Calculate subnet parameters for 3 network setups.',
            'Trace DNS lookup query flow step-by-step.',
            'Review TCP sliding window flow control.'
          ]
        }
      },
      {
        title: 'Machine Learning Deep Dive',
        subject: 'Machine Learning',
        examDate: daysFromNow(25),
        topics: ['Linear Regression', 'SVM', 'Decision Trees', 'Deep Learning'],
        dailyHours: 3,
        plan: {
          timetable: [
            { day: 'Week 1', topic: 'Linear models and Gradient Descent optimizations', duration: '3 hours' },
            { day: 'Week 2', topic: 'Support Vector Machines & Kernel functions', duration: '3 hours' },
            { day: 'Week 3', topic: 'Ensemble methods: Random Forests & Gradient Boosting', duration: '3 hours' }
          ],
          revisionSchedule: [
            { week: 'Phase 1', focus: 'Supervised classification models' },
            { week: 'Phase 2', focus: 'Neural networks backpropagation mathematical models' }
          ],
          priorityTopics: [
            { topic: 'Gradient Descent convergence calculations', weight: 'High' },
            { topic: 'Backpropagation chain rule calculations', weight: 'Critical' }
          ],
          dailyGoals: [
            'Write python training script utilizing sklearn models.',
            'Trace derivative computations in a simple neural node.',
            'Review SVM hyperplane maximum margin calculations.'
          ]
        }
      },
      {
        title: 'Software Testing Revision Plan',
        subject: 'Software Engineering',
        examDate: daysFromNow(12),
        topics: ['Unit Testing', 'Integration Testing', 'System Testing', 'Agile Methodologies'],
        dailyHours: 2,
        plan: {
          timetable: [
            { day: 'Day 1-4', topic: 'White-box testing: Basis path & cyclomatic complexity', duration: '2 hours' },
            { day: 'Day 5-8', topic: 'Black-box testing: equivalence partition & boundary value', duration: '2 hours' },
            { day: 'Day 9-12', topic: 'Integration pipelines, unit testing with Jest', duration: '2 hours' }
          ],
          revisionSchedule: [
            { week: 'Revision Week', focus: 'Testing patterns and cyclomatic complexity mathematical formulas' }
          ],
          priorityTopics: [
            { topic: 'Cyclomatic complexity flow-graphs calculation', weight: 'High' },
            { topic: 'Jest mock functions and testing routing assertions', weight: 'Critical' }
          ],
          dailyGoals: [
            'Calculate cyclomatic complexity on 2 control flowcharts.',
            'Write 3 Jest test suites testing express API handlers.',
            'Detail difference between stub and driver mock modules.'
          ]
        }
      },
      {
        title: 'Data Structures Advanced Study',
        subject: 'Data Structures',
        examDate: daysFromNow(28),
        topics: ['Red-Black Trees', 'B-Trees', 'Tries', 'Segment Trees'],
        dailyHours: 3,
        plan: {
          timetable: [
            { day: 'Day 1-7', topic: 'Balanced tree insertions (Red-Black, AVL)', duration: '3 hours' },
            { day: 'Day 8-14', topic: 'Trie insert, search, prefix functionalities', duration: '3 hours' },
            { day: 'Day 15-21', topic: 'Segment tree construction & range sum query', duration: '3 hours' },
            { day: 'Day 22-28', topic: 'Advanced Graph structures (Segment & Fenwick)', duration: '3 hours' }
          ],
          revisionSchedule: [
            { week: 'Week 1-2', focus: 'Balanced search tree insertion and node rotations' },
            { week: 'Week 3-4', focus: 'Advanced query segment trees and prefix search tries' }
          ],
          priorityTopics: [
            { topic: 'Red-Black tree color flips & rotation adjustments', weight: 'Critical' },
            { topic: 'Trie character indexing maps performance', weight: 'High' }
          ],
          dailyGoals: [
            'Perform node rotations in Red-Black insertion exercises.',
            'Construct a prefix Trie mapping a set of 10 words.',
            'Code Range Query and Update logic in Segment Trees.'
          ]
        }
      }
    ];

    await AIStudyPlan.insertMany(studyPlansData.map(p => ({
      userId,
      title: p.title,
      subject: p.subject,
      examDate: p.examDate,
      topics: p.topics,
      dailyHours: p.dailyHours,
      plan: p.plan
    })));
    console.log('10 Study plans seeded.');

    // ==========================================
    // 8. QUIZ ENGINE (15 Quizzes & Attempts)
    // ==========================================
    console.log('Seeding 15 quizzes and attempts...');
    const quizSubjects = ['Python', 'Java', 'DBMS', 'OS', 'CN', 'Quantum Computing', 'React', 'Node.js', 'Data Structures', 'Git'];
    const difficultyLevels = ['easy', 'medium', 'hard'];

    // Define helper to generate 10 questions for a topic
    const generateQuestionsForQuiz = (topic, difficulty) => {
      const questions = [];
      const topicsVocabulary = {
        Python: [
          { q: 'What is the correct file extension for Python files?', o: ['.py', '.pyt', '.pyw', '.pyc'], a: '0', e: '.py is standard.' },
          { q: 'Which function outputs text in Python?', o: ['print()', 'echo()', 'console.log()', 'system.out.print()'], a: '0', e: 'print() is standard.' },
          { q: 'What is mutable in Python?', o: ['List', 'Tuple', 'String', 'Integer'], a: '0', e: 'Lists can be edited after creation.' },
          { q: 'How do you create a dictionary?', o: ['d = {}', 'd = []', 'd = ()', 'd = set()'], a: '0', e: '{} creates a dict.' },
          { q: 'What is PEP 8?', o: ['Python style guide', 'A packaging tool', 'Python Compiler version', 'Security framework'], a: '0', e: 'PEP 8 is style guide.' },
          { q: 'What does len() do?', o: ['Returns length of sequence', 'Deletes item', 'Finds index', 'Compares variables'], a: '0', e: 'len() computes length.' },
          { q: 'How do you insert comments?', o: ['# comment', '// comment', '/* comment */', '<!-- comment -->'], a: '0', e: '# starts comments.' },
          { q: 'What does range(5) return?', o: ['0 to 4 numbers list', '0 to 5 numbers list', '1 to 5 numbers list', 'Array of 5s'], a: '0', e: 'range(5) goes from 0 to 4.' },
          { q: 'Which keyword defines a function?', o: ['def', 'func', 'function', 'define'], a: '0', e: 'def starts a function.' },
          { q: 'How do you import a module?', o: ['import math', 'require("math")', 'include math', 'using math'], a: '0', e: 'import math is standard.' }
        ],
        Java: [
          { q: 'Which keyword inherits a class in Java?', o: ['extends', 'implements', 'inherits', 'exports'], a: '0', e: 'extends inherits classes.' },
          { q: 'What is the default value of an boolean primitive?', o: ['false', 'true', 'null', '0'], a: '0', e: 'booleans default to false.' },
          { q: 'Which memory stores local variables?', o: ['Stack', 'Heap', 'Method Area', 'Registers'], a: '0', e: 'Local vars reside on Stack.' },
          { q: 'How do you declare a constant in Java?', o: ['final', 'const', 'static', 'stable'], a: '0', e: 'final prevents alterations.' },
          { q: 'What is Java Virtual Machine (JVM)?', o: ['Executes bytecode', 'Compiles source code', 'Formats layout files', 'Database manager'], a: '0', e: 'JVM runs compiled bytecodes.' },
          { q: 'Which class is root of all classes?', o: ['Object', 'Class', 'System', 'String'], a: '0', e: 'Object is parent root.' },
          { q: 'What does garbage collection do?', o: ['Reclaims unused heap memory', 'Deletes source files', 'Clears database logs', 'Reboots server'], a: '0', e: 'Reclaims heap space.' },
          { q: 'How do you start execution in Java?', o: ['main method', 'init method', 'start method', 'constructor'], a: '0', e: 'main() is entry point.' },
          { q: 'What is an Interface?', o: ['Abstract template of methods', 'Concrete subclass', 'Database connection', 'CSS class'], a: '0', e: 'Interfaces define contracts.' },
          { q: 'Which package is imported by default?', o: ['java.lang', 'java.util', 'java.io', 'java.net'], a: '0', e: 'java.lang is auto-imported.' }
        ],
        DBMS: [
          { q: 'Which normal form removes partial dependencies?', o: ['2NF', '1NF', '3NF', 'BCNF'], a: '0', e: '2NF requires no partial deps.' },
          { q: 'What is ACID in transactions?', o: ['Atomicity, Consistency, Isolation, Durability', 'Access, Control, Index, Data', 'Activity, Cache, Import, Delete', 'Aggregate, Constraint, Integrity, Dependency'], a: '0', e: 'ACID guarantees database reliability.' },
          { q: 'What does a join query do?', o: ['Combines records from multiple tables', 'Deletes tables', 'Sorts records', 'Encrypts storage'], a: '0', e: 'Joins pull data across tables.' },
          { q: 'What is a Primary Key?', o: ['Unique row identifier', 'Secondary index link', 'Password encryption key', 'API routing parameter'], a: '0', e: 'Uniquely identifies table records.' },
          { q: 'Which SQL keyword filters groups?', o: ['HAVING', 'WHERE', 'GROUP BY', 'ORDER BY'], a: '0', e: 'HAVING filters aggregated groups.' },
          { q: 'What is a foreign key?', o: ['Links records to another table primary key', 'External table index', 'Secure security token', 'Alternative primary key'], a: '0', e: 'Establishes cross-table links.' },
          { q: 'What does database indexing do?', o: ['Speeds up SELECT searches', 'Encrypts tables data', 'Validates email inputs', 'Truncates table records'], a: '0', e: 'Speeds up query operations.' },
          { q: 'Which command deletes table data but keeps structure?', o: ['TRUNCATE', 'DROP', 'DELETE', 'REMOVE'], a: '0', e: 'TRUNCATE empties tables.' },
          { q: 'What is a database transaction?', o: ['Logical unit of work', 'Financial data transfer', 'API route request', 'Collection validation rule'], a: '0', e: 'A single unit of operations.' },
          { q: 'Which level of abstraction describes physical storage?', o: ['Physical level', 'Logical level', 'View level', 'Schema level'], a: '0', e: 'Physical details hardware storage.' }
        ],
        OS: [
          { q: 'Which scheduler selects processes to load into memory?', o: ['Long-term scheduler', 'Short-term scheduler', 'Medium-term scheduler', 'Dispatcher'], a: '0', e: 'Long-term controls degree of multitasking.' },
          { q: 'What is virtual memory?', o: ['Extension of RAM onto secondary storage', 'Fast cache register', 'Graphics card memory', 'CPU execution thread'], a: '0', e: 'Uses disk to expand RAM.' },
          { q: 'What does fork() system call return to child process?', o: ['0', 'Child PID', '-1', '1'], a: '0', e: 'fork() returns 0 to the child.' },
          { q: 'What is a deadlock condition?', o: ['Circular dependency of resource locks', 'System shutdown command', 'Infinite loop of code execution', 'Network routing error'], a: '0', e: 'Processes locked waiting for each other.' },
          { q: 'Which algorithm is used for page replacement?', o: ['Least Recently Used (LRU)', 'Shortest Job First', 'Round Robin', 'First In First Out Disk SCAN'], a: '0', e: 'LRU swaps old inactive pages.' },
          { q: 'What is thrashing in OS?', o: ['High paging activity causing low CPU use', 'Hard drive deletion process', 'System crash error', 'Task schedule overflow'], a: '0', e: 'Excessive paging drains resources.' },
          { q: 'What does a Semaphore do?', o: ['Synchronizes process access to critical section', 'Compiles binary operations', 'Directs network traffic packets', 'Stores user login sessions'], a: '0', e: 'Provides locking signals.' },
          { q: 'What is context switching?', o: ['Saving process state to switch tasks', 'Changing environment variables', 'Database schema migration', 'Frontend routing switch'], a: '0', e: 'Swaps execution states.' },
          { q: 'Which is a CPU scheduling algorithm?', o: ['Round Robin', 'Dijkstra Algorithm', 'LRU', 'TCP Handshake'], a: '0', e: 'Round Robin allocates time slices.' },
          { q: 'What is a thread?', o: ['Basic unit of CPU utilization', 'Database table index', 'Secure communication network', 'Recursive function call'], a: '0', e: 'Threads are lightweight processes.' }
        ],
        CN: [
          { q: 'Which layer of OSI model performs routing?', o: ['Network Layer', 'Transport Layer', 'Data Link Layer', 'Physical Layer'], a: '0', e: 'Network layer handles routing.' },
          { q: 'What is the size of an IPv4 address?', o: ['32 bits', '64 bits', '128 bits', '16 bits'], a: '0', e: 'IPv4 contains 4 bytes (32 bits).' },
          { q: 'Which protocol translates domain names to IP addresses?', o: ['DNS', 'DHCP', 'HTTP', 'SMTP'], a: '0', e: 'DNS resolves addresses.' },
          { q: 'What is the function of DHCP?', o: ['Assigns dynamic IP addresses', 'Translates domain names', 'Encrypts web traffic', 'Routes packets globally'], a: '0', e: 'DHCP configures client IPs.' },
          { q: 'Which protocol is connection-oriented?', o: ['TCP', 'UDP', 'IP', 'ICMP'], a: '0', e: 'TCP establishes stable links.' },
          { q: 'What is subnetting?', o: ['Dividing a network into smaller sub-networks', 'Building firewalls rules', 'Hosting virtual servers', 'Hashing security passwords'], a: '0', e: 'Subnetting partitions ip blocks.' },
          { q: 'Which device operates at Network Layer?', o: ['Router', 'Switch', 'Hub', 'Repeater'], a: '0', e: 'Routers perform network routing.' },
          { q: 'What port does HTTP default to?', o: ['80', '443', '22', '8080'], a: '0', e: 'HTTP defaults to port 80.' },
          { q: 'What does NAT stand for?', o: ['Network Address Translation', 'Network Allocation Token', 'Node Access Table', 'Network Architecture Template'], a: '0', e: 'NAT translates local IPs.' },
          { q: 'Which layer handles encryption in OSI?', o: ['Presentation Layer', 'Application Layer', 'Session Layer', 'Transport Layer'], a: '0', e: 'Presentation handles formatting/crypto.' }
        ],
        'Quantum Computing': [
          { q: 'What is superposition?', o: ['Coexisting in multiple states', 'High processing velocity', 'Quantum memory encryption', 'System compiler logic'], a: '0', e: 'Qubits exist in $|0\\rangle$ and $|1\\rangle$ simultaneously.' },
          { q: 'Which gate creates quantum superposition?', o: ['Hadamard Gate', 'Pauli-X Gate', 'CNOT Gate', 'Phase Shift Gate'], a: '0', e: 'Hadamard puts qubit in superposition.' },
          { q: 'What is entanglement?', o: ['Correlated states between qubits', 'Code compile error', 'Database constraint violation', 'Infinite logic loop'], a: '0', e: 'Entangled qubits share properties.' },
          { q: 'What is the base unit of quantum information?', o: ['Qubit', 'Bit', 'Byte', 'Node'], a: '0', e: 'Qubits store quantum states.' },
          { q: 'What does Bloch Sphere represent?', o: ['State space of a single qubit', 'Quantum network architecture', 'Database cluster topology', 'Process thread stack'], a: '0', e: 'Geometrical representation of qubit.' },
          { q: 'Which gate performs NOT equivalent in quantum?', o: ['Pauli-X Gate', 'Hadamard Gate', 'Pauli-Z Gate', 'Phase Gate'], a: '0', e: 'Pauli-X flips states.' },
          { q: 'What is quantum teleportation?', o: ['Transferring qubit state over distance', 'Moving server databases', 'Speeding up api loads', 'Visual image cropping'], a: '0', e: 'Transfers states using entanglement.' },
          { q: 'What does CNOT gate stand for?', o: ['Controlled-NOT Gate', 'Complex-Node Gate', 'Configuration-Normal Gate', 'Circular-Network Gate'], a: '0', e: 'Controlled-NOT flips target based on control.' },
          { q: 'Which math structure describes qubit states?', o: ['Complex Vector Space', 'Real Integer Matrix', 'Binary Hash Table', 'B-Tree Index'], a: '0', e: 'Hilbert spaces utilize complex vectors.' },
          { q: 'What is quantum coherence?', o: ['Duration qubit holds state', 'Speed of quantum processing', 'Encryption key strength', 'Thread scheduler alignment'], a: '0', e: 'Coherence is state lifetime.' }
        ],
        React: [
          { q: 'Which hook handles side effects in React?', o: ['useEffect', 'useState', 'useContext', 'useMemo'], a: '0', e: 'useEffect runs side effects.' },
          { q: 'How do you prevent re-rendering of child components?', o: ['React.memo()', 'useCallback()', 'useRef()', 'useState()'], a: '0', e: 'React.memo memoizes components.' },
          { q: 'What is Virtual DOM?', o: ['In-memory representation of UI', 'Direct browser DOM connection', 'Database schema visualizer', 'Style sheet layout'], a: '0', e: 'Virtual DOM syncs changes.' },
          { q: 'Which hook stores mutable values without re-renders?', o: ['useRef', 'useState', 'useReducer', 'useLayoutEffect'], a: '0', e: 'useRef updates don\'t trigger render.' },
          { q: 'How do you pass data through component tree without props?', o: ['React Context API', 'React Router', 'Redux Store Thunks', 'State lifting controllers'], a: '0', e: 'Context shares data globally.' },
          { q: 'What does useState hook return?', o: ['State value and setter function', 'State value only', 'Render function trigger', 'DOM reference pointer'], a: '0', e: 'Returns [state, setState].' },
          { q: 'What is key prop used for in Lists?', o: ['Identifies items for reconciliation', 'Styles individual list nodes', 'Binds click event handlers', 'Encrypts item data fields'], a: '0', e: 'Keys guide DOM updates.' },
          { q: 'Which hook optimizes expensive calculations?', o: ['useMemo', 'useCallback', 'useContext', 'useEffect'], a: '0', e: 'useMemo caches computations.' },
          { q: 'Can you update props inside a child component?', o: ['No, props are read-only', 'Yes, child can edit props', 'Only if props are public', 'Only inside class constructors'], a: '0', e: 'Props are strictly immutable.' },
          { q: 'Which hook manages complex state transitions?', o: ['useReducer', 'useState', 'useCallback', 'useRef'], a: '0', e: 'useReducer utilizes action dispatches.' }
        ],
        'Node.js': [
          { q: 'Which mechanism handles asynchronous operations in Node?', o: ['Event Loop', 'Multi-thread Spawning', 'Virtual Database Cluster', 'Routing Controller API'], a: '0', e: 'Event Loop executes non-blocking tasks.' },
          { q: 'Which module handles file paths in Node?', o: ['path', 'fs', 'http', 'os'], a: '0', e: 'path utility handles dirs.' },
          { q: 'What is npm?', o: ['Node Package Manager', 'Node Programming Method', 'Network Protocol Module', 'Node Parallel Multitasker'], a: '0', e: 'npm manages external packages.' },
          { q: 'How do you read environment variables in Node?', o: ['process.env.VAR_NAME', 'env.get(VAR_NAME)', 'process.variables.VAR_NAME', 'system.env(VAR_NAME)'], a: '0', e: 'process.env reads config.' },
          { q: 'Which function registers routes in Express?', o: ['app.get()', 'app.route()', 'app.register()', 'app.link()'], a: '0', e: 'app.get/post registers handlers.' },
          { q: 'Which command initializes a node project?', o: ['npm init', 'npm install', 'node start', 'node init'], a: '0', e: 'npm init builds package.json.' },
          { q: 'What does fs.readFile do?', o: ['Asynchronously reads files', 'Deletes local directories', 'Binds database ports', 'Encrypts user passwords'], a: '0', e: 'fs.readFile reads files.' },
          { q: 'How do you export modules in CommonJS?', o: ['module.exports = ...', 'export default ...', 'export const ...', 'module.send = ...'], a: '0', e: 'module.exports exposes modules.' },
          { q: 'What is middleware in Express?', o: ['Functions executing during request-response cycle', 'CSS layout styling wrapper', 'Database index cataloger', 'Process scheduler thread'], a: '0', e: 'Middlewares process req/res objects.' },
          { q: 'What port does Express default to in development?', o: ['User specified port', '80', '443', '21'], a: '0', e: 'Specified via process.env.PORT.' }
        ]
      };

      const fallbackList = [
        { q: `What is the core concept of ${topic}?`, o: ['Option A', 'Option B', 'Option C', 'Option D'], a: '0', e: 'Option A explanation.' },
        { q: `Explain recursion in ${topic}.`, o: ['Option A', 'Option B', 'Option C', 'Option D'], a: '0', e: 'Option A explanation.' },
        { q: `Why use ${topic} in engineering?`, o: ['Option A', 'Option B', 'Option C', 'Option D'], a: '0', e: 'Option A explanation.' },
        { q: `Explain complexity of ${topic}.`, o: ['Option A', 'Option B', 'Option C', 'Option D'], a: '0', e: 'Option A explanation.' },
        { q: `What is key feature of ${topic}?`, o: ['Option A', 'Option B', 'Option C', 'Option D'], a: '0', e: 'Option A explanation.' },
        { q: `Detail routing in ${topic}.`, o: ['Option A', 'Option B', 'Option C', 'Option D'], a: '0', e: 'Option A explanation.' },
        { q: `What is index in ${topic}?`, o: ['Option A', 'Option B', 'Option C', 'Option D'], a: '0', e: 'Option A explanation.' },
        { q: `Detail operations in ${topic}.`, o: ['Option A', 'Option B', 'Option C', 'Option D'], a: '0', e: 'Option A explanation.' },
        { q: `Explain synchronization in ${topic}.`, o: ['Option A', 'Option B', 'Option C', 'Option D'], a: '0', e: 'Option A explanation.' },
        { q: `What is memory model of ${topic}?`, o: ['Option A', 'Option B', 'Option C', 'Option D'], a: '0', e: 'Option A explanation.' }
      ];

      const baseList = topicsVocabulary[topic] || topicsVocabulary[Object.keys(topicsVocabulary).find(k => topic.includes(k))] || fallbackList;

      return baseList.map((item, idx) => ({
        id: idx + 1,
        type: 'mcq',
        questionText: item.q,
        options: item.o,
        correctAnswer: item.a,
        explanation: item.e,
        difficultyLevel: difficulty
      }));
    };

    const quizzesToCreate = [
      { title: 'Python Core Programming', topic: 'Python', difficulty: 'easy' },
      { title: 'Java Object-Oriented Principles', topic: 'Java', difficulty: 'medium' },
      { title: 'Database Management Systems Concepts', topic: 'DBMS', difficulty: 'medium' },
      { title: 'Operating Systems Process Management', topic: 'OS', difficulty: 'medium' },
      { title: 'Computer Networks Routing Protocols', topic: 'CN', difficulty: 'hard' },
      { title: 'Quantum Computing Basics', topic: 'Quantum Computing', difficulty: 'medium' },
      { title: 'React Hooks and State Management', topic: 'React', difficulty: 'medium' },
      { title: 'Node.js Web Server Development', topic: 'Node.js', difficulty: 'medium' },
      { title: 'Data Structures & Complexity', topic: 'Data Structures', difficulty: 'hard' },
      { title: 'SQL Query Optimization', topic: 'DBMS', difficulty: 'hard' },
      { title: 'Machine Learning Supervised Models', topic: 'Machine Learning', difficulty: 'medium' },
      { title: 'REST API Design Best Practices', topic: 'Node.js', difficulty: 'medium' },
      { title: 'AWS Cloud Architecture Basics', topic: 'Cloud Computing', difficulty: 'medium' },
      { title: 'Docker Containerization Foundations', topic: 'Cloud Computing', difficulty: 'easy' },
      { title: 'Git Version Control & Workflows', topic: 'Git', difficulty: 'easy' }
    ];

    const createdQuizzes = [];
    for (const qDef of quizzesToCreate) {
      const qQuestions = generateQuestionsForQuiz(qDef.topic, qDef.difficulty);
      const quizDoc = await AIQuiz.create({
        userId,
        title: qDef.title,
        topic: qDef.topic,
        difficulty: qDef.difficulty,
        questionCount: 10,
        quiz: { questions: qQuestions }
      });
      createdQuizzes.push(quizDoc);
    }
    console.log('15 Quizzes created.');

    // Seed attempts: different scores: 65%, 72%, 80%, 90%, 95%
    const attemptsData = [
      { userId, topic: 'OS Scheduling', score: 13, totalQuestions: 20, difficulty: 'medium' }, // 65%
      { userId, topic: 'DBMS Normalization', score: 18, totalQuestions: 25, difficulty: 'medium' }, // 72%
      { userId, topic: 'React Hooks', score: 8, totalQuestions: 10, difficulty: 'medium' }, // 80%
      { userId, topic: 'Networking Protocols', score: 9, totalQuestions: 10, difficulty: 'hard' }, // 90%
      { userId, topic: 'Python Core', score: 19, totalQuestions: 20, difficulty: 'easy' }, // 95%
      { userId, topic: 'Java Inheritance', score: 8, totalQuestions: 10, difficulty: 'medium' }, // 80%
      { userId, topic: 'Quantum Teleportation', score: 7, totalQuestions: 10, difficulty: 'hard' }, // 70%
      { userId, topic: 'Cloud AWS S3', score: 9, totalQuestions: 10, difficulty: 'medium' }, // 90%
      { userId, topic: 'Git Branching Merge', score: 10, totalQuestions: 10, difficulty: 'easy' }, // 100%
      { userId, topic: 'Machine Learning SVM', score: 7, totalQuestions: 10, difficulty: 'hard' } // 70%
    ];
    await QuizAttempt.insertMany(attemptsData);
    console.log('10 Quiz attempts seeded.');

    // ==========================================
    // 9. FLASHCARDS (12 Decks & Mastery)
    // ==========================================
    console.log('Seeding 12 flashcard decks and mastery...');
    const flashcardDecksData = [
      { title: 'DBMS Concepts', topic: 'DBMS', count: 18 },
      { title: 'OS Scheduling', topic: 'Operating Systems', count: 15 },
      { title: 'Networking Protocols', topic: 'Computer Networks', count: 16 },
      { title: 'React Hooks', topic: 'React', count: 15 },
      { title: 'Node.js APIs', topic: 'Node.js', count: 15 },
      { title: 'Quantum Computing Basics', topic: 'Quantum Computing', count: 15 },
      { title: 'Machine Learning Algorithms', topic: 'Machine Learning', count: 15 },
      { title: 'AWS Cloud Services', topic: 'Cloud Computing', count: 15 },
      { title: 'Algorithmic Complexities', topic: 'Algorithms', count: 16 },
      { title: 'System Design Patterns', topic: 'Software Engineering', count: 15 },
      { title: 'Software Testing Types', topic: 'Software Engineering', count: 15 },
      { title: 'Java OOP Principles', topic: 'Java', count: 15 }
    ];

    const generateCardsForDeck = (topic, count) => {
      const cards = [];
      for (let i = 1; i <= count; i++) {
        cards.push({
          id: `fc_${topic.replace(/\s+/g, '_')}_${i}`,
          question: `Concept Question ${i} for ${topic}?`,
          answer: `Detailed explanation and study answer details for concept card number ${i} in ${topic}.`,
          front: `Concept Question ${i} for ${topic}?`,
          back: `Detailed explanation and study answer details for concept card number ${i} in ${topic}.`
        });
      }
      return cards;
    };

    for (const deckDef of flashcardDecksData) {
      const cards = generateCardsForDeck(deckDef.topic, deckDef.count);
      const deckDoc = await AIFlashcardDeck.create({
        userId,
        title: deckDef.title,
        topic: deckDef.topic,
        cardCount: deckDef.count,
        deck: { flashcards: cards },
        masteryProgress: Math.floor(deckDef.count * 0.45) // 45% mastered
      });

      // Seed mastery record for each deck
      const masteredCount = Math.floor(deckDef.count * 0.45);
      const knownCards = cards.slice(0, masteredCount).map(c => c.id);
      const repetition = cards.map(c => ({
        cardId: c.id,
        box: knownCards.includes(c.id) ? 3 : 1,
        nextReviewDate: knownCards.includes(c.id) ? daysFromNow(5) : daysFromNow(1)
      }));

      await FlashcardMastery.create({
        userId,
        topic: deckDef.title,
        masteredCount,
        totalCards: deckDef.count,
        knownCards,
        studyStreak: 4,
        dailyRevisionGoal: 5,
        cardRepetition: repetition
      });
    }
    console.log('12 Flashcard decks and masteries seeded.');

    // ==========================================
    // 10. CAREER ADVISOR (8 Roadmaps)
    // ==========================================
    console.log('Seeding 8 career advisor roadmaps...');
    const rolesData = [
      { role: 'MERN Developer', company: 'Startup Tech Ecosystems' },
      { role: 'Backend Engineer', company: 'ScaleUp Fintechs' },
      { role: 'AI Engineer', company: 'OpenAI Research Partners' },
      { role: 'Data Scientist', company: 'Global Retail Analytics' },
      { role: 'Cloud Engineer', company: 'AWS Partner Networks' },
      { role: 'DevOps Engineer', company: 'Enterprise SaaS Providers' },
      { role: 'Full Stack Developer', company: 'Unicorn Tech Hubs' },
      { role: 'Software Engineer', company: 'Google & Microsoft Scale' }
    ];

    for (const roleDef of rolesData) {
      const roadmapData = {
        recommendedSkills: [
          { skill: 'Core Language Syntax Mastery', importance: 'Critical', resources: 'Official Documentation & Guides' },
          { skill: 'API Architecture & Integrations', importance: 'High', resources: 'System Design blogs' },
          { skill: 'Database Optimization & Indexes', importance: 'High', resources: 'DBMS textbooks' }
        ],
        mernRoadmap: [
          { phase: 'Foundations', duration: 'Weeks 1-2', actionItems: ['Implement HTML/CSS layouts', 'Write JS script structures'] },
          { phase: 'APIs & Server', duration: 'Weeks 3-4', actionItems: ['Build Node/Express server routing', 'Integrate MongoDB connections'] }
        ],
        atsKeywords: [roleDef.role.replace(/\s+/g, ''), 'REST API', 'JSON', 'NoSQL', 'System Design', 'Git'],
        careerPrepPlan: [
          { phase: 'Phase 1', timeline: 'Month 1', focus: 'Algorithmic DSA & coding patterns', milestones: ['Solve 50 coding problems'] },
          { phase: 'Phase 2', timeline: 'Month 2', focus: 'Portfolio development & resume tweaks', milestones: ['Deploy 2 full-scale projects'] }
        ],
        companyInterviewPrep: {
          interviewStyle: `Technical screening followed by 2 code loops and a system design round at ${roleDef.company}.`,
          commonQuestions: [`Explain the lifecycle of requests in your recent project.`, `How do you resolve memory leaks?`],
          preparationStrategy: 'Revise core computer science theory and practice whiteboarding algorithms.'
        },
        resumeImprovements: [
          `Quantify impact in project bullets.`,
          `Highlight experience using Docker, JWT, and Cloud hosting.`
        ],
        careerRecommendations: [roleDef.role, 'Software Engineer', 'Technical Consultant']
      };

      await AICareerRoadmap.create({
        userId,
        title: `${roleDef.role} Roadmap`,
        targetRole: roleDef.role,
        targetCompany: roleDef.company,
        roadmap: roadmapData
      });
    }
    console.log('8 Career roadmaps seeded.');

    // ==========================================
    // 11. AI INTERACTIONS (425 usage logs)
    // ==========================================
    console.log('Seeding 425 historical AI interaction logs...');
    const featuresList = [
      { name: 'chat', count: 150, prompt: 'Ask CampusBuddy coding questions' },
      { name: 'notes-summary', count: 80, prompt: 'Upload notes for PDF summarizing' },
      { name: 'quiz-generator', count: 60, prompt: 'Generate timed MCQ quiz' },
      { name: 'flashcards', count: 50, prompt: 'Create study flashcard decks' },
      { name: 'study-plan', count: 30, prompt: 'Create revision planner schedule' },
      { name: 'career-advisor', count: 25, prompt: 'Request SDE career roadmap' },
      { name: 'productivity-insights', count: 20, prompt: 'Fetch weekly coach recommendations' },
      { name: 'interview-prep', count: 10, prompt: 'Generate mock technical interview questions' }
    ];

    const logsToCreate = [];
    const logsNow = new Date();

    for (const f of featuresList) {
      for (let i = 0; i < f.count; i++) {
        // Distribute dates over last 90 days:
        // 50% in last 7 days, 35% in days 8-30, 15% in days 31-90
        let dateOffsetDays = 0;
        const rand = Math.random();
        if (rand < 0.5) {
          dateOffsetDays = Math.floor(Math.random() * 7); // last 7 days
        } else if (rand < 0.85) {
          dateOffsetDays = Math.floor(Math.random() * 23) + 7; // days 8-30
        } else {
          dateOffsetDays = Math.floor(Math.random() * 60) + 30; // days 31-90
        }

        const logDate = new Date(logsNow.getTime() - dateOffsetDays * 24 * 60 * 60 * 1000);

        logsToCreate.push({
          userId,
          feature: f.name,
          prompt: `${f.prompt} log entry ${i + 1}`,
          response: { details: 'Generated response data containing summary text and key points.' },
          meta: { source: 'Seeder Auto Log' },
          createdAt: logDate,
          updatedAt: logDate
        });
      }
    }

    // Insert in batches of 100 to optimize performance
    const batchSize = 100;
    for (let i = 0; i < logsToCreate.length; i += batchSize) {
      const batch = logsToCreate.slice(i, i + batchSize);
      await AIInteraction.insertMany(batch);
    }
    console.log(`Successfully seeded ${logsToCreate.length} AI interaction logs.`);

    console.log('\n==========================================');
    console.log('DEMO DATA SEEDING COMPLETED SUCCESSFULLY!');
    console.log(`Email: ${demoEmail}`);
    console.log('Password: Demo@123456');
    console.log('==========================================\n');

    mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('Seeding process failed with error:', error);
    process.exit(1);
  }
};

seed();
