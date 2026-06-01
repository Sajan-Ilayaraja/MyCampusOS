const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure local uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up disk storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate clean safe name from original name: remove non-alphanumeric, append unique suffix
    const ext = path.extname(file.originalname);
    const cleanBaseName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, '_'); // remove special characters
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${cleanBaseName}-${uniqueSuffix}${ext}`);
  },
});

// File validation filter
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls'];
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;

  // Validate extension and mime type
  if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(mime)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed formats: PDF, DOCX, DOC, PPTX, PPT, XLSX, XLS`), false);
  }
};

// Set up multer instance (25MB limit)
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limits
  },
});

module.exports = upload;

