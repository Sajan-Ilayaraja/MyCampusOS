const fs = require('fs');
const path = require('path');
const axios = require('axios');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const officeParser = require('officeparser');

/**
 * Extracts text content from a local file path based on MIME type
 * @param {string} filePath - Absolute file path
 * @param {string} mimeType - File MIME type
 * @returns {Promise<string>} Extracted text content
 */
const extractTextFromFile = async (filePath, mimeType) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist at path: ${filePath}`);
  }

  const fileBuffer = fs.readFileSync(filePath);
  const normalizedMime = (mimeType || '').toLowerCase();
  const ext = path.extname(filePath).toLowerCase();

  try {
    if (normalizedMime.includes('pdf') || ext === '.pdf') {
      const parsedData = await pdf(fileBuffer);
      return parsedData.text || '';
    } else if (
      normalizedMime.includes('wordprocessingml.document') ||
      normalizedMime.includes('msword') ||
      ext === '.docx' ||
      ext === '.doc'
    ) {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      return result.value || '';
    } else if (
      normalizedMime.includes('presentationml.presentation') ||
      normalizedMime.includes('ms-powerpoint') ||
      ext === '.pptx' ||
      ext === '.ppt'
    ) {
      const text = await officeParser.parseAsync(filePath);
      return text || '';
    } else if (
      normalizedMime.includes('spreadsheetml.sheet') ||
      normalizedMime.includes('ms-excel') ||
      ext === '.xlsx' ||
      ext === '.xls'
    ) {
      const xlsx = require('xlsx');
      const workbook = xlsx.readFile(filePath);
      let text = '';
      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const sheetText = xlsx.utils.sheet_to_csv(worksheet);
        text += `\n[Sheet: ${sheetName}]\n${sheetText}\n`;
      });
      return text;
    } else if (
      normalizedMime.includes('text') ||
      normalizedMime.includes('plain') ||
      ext === '.txt'
    ) {
      return fileBuffer.toString('utf-8');
    } else {
      return '';
    }
  } catch (error) {
    console.error(`Error in extractTextFromFile for ${ext} (${mimeType}):`, error.message);
    throw error;
  }
};

/**
 * Extracts text content from a Note document file
 * @param {Object} note - The Note model document
 * @returns {Promise<string>} Extracted text or description fallback
 */
const extractTextFromNote = async (note) => {
  if (!note) return '';

  const isLocal = note.fileUrl.includes('localhost') || note.fileUrl.includes('127.0.0.1') || !note.fileUrl.startsWith('http');

  try {
    if (isLocal) {
      const localFilePath = path.join(__dirname, '..', 'uploads', note.publicId);
      if (!fs.existsSync(localFilePath)) {
        console.warn(`Local file path does not exist: ${localFilePath}`);
        return `Title: ${note.title}\nDescription: ${note.description || ''}`;
      }
      return await extractTextFromFile(localFilePath, note.fileType || '');
    } else {
      const response = await axios.get(note.fileUrl, { responseType: 'arraybuffer' });
      const fileBuffer = Buffer.from(response.data);
      
      const ext = path.extname(note.fileUrl) || '.tmp';
      const tempPath = path.join(__dirname, '..', 'uploads', `temp-${Date.now()}${ext}`);
      fs.writeFileSync(tempPath, fileBuffer);
      
      try {
        const text = await extractTextFromFile(tempPath, note.fileType || '');
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
        return text;
      } catch (err) {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
        throw err;
      }
    }
  } catch (error) {
    console.error('Error extracting text from note file:', error.message);
    return `Title: ${note.title}\nDescription: ${note.description || ''}`;
  }
};

module.exports = {
  extractTextFromFile,
  extractTextFromNote
};
