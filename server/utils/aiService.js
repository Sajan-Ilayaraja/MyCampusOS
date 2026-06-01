const axios = require('axios');

// In-memory cache for prompt responses to optimize API costs and latency
const aiCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes cache

// Check cache
const checkAiCache = (promptKey) => {
  const cached = aiCache.get(promptKey);
  if (cached && (Date.now() - cached.cachedAt < CACHE_TTL_MS)) {
    return cached.data;
  }
  return null;
};

// Save cache
const saveAiCache = (promptKey, data) => {
  aiCache.set(promptKey, { data, cachedAt: Date.now() });
};

// Prompt compression for large notes to reduce API costs
const compressNoteText = (text) => {
  if (typeof text !== 'string') return '';
  
  // Trim multiple whitespaces and consecutive newlines to compress content
  let compressed = text.replace(/\s+/g, ' ').trim();
  
  // Truncate to optimize token size (around 1500 tokens limit)
  if (compressed.length > 6000) {
    // Preserve the beginning and conclusion of notes
    const startPart = compressed.substring(0, 3000);
    const endPart = compressed.substring(compressed.length - 3000);
    compressed = `${startPart}\n\n... [Content compressed to prevent excessive token costs] ...\n\n${endPart}`;
  }
  
  return compressed;
};

// Simple Prompt Sanitizer & Injection Guard
const sanitizeInputPrompt = (input) => {
  if (typeof input !== 'string') return '';
  
  let sanitized = input.trim();

  // Expanded prompt injection and content safety detection
  const safetyPatterns = [
    /ignore (all )?previous instructions/i,
    /system prompt/i,
    /bypass safety/i,
    /you are now an? (evil|different) AI/i,
    /forget everything/i,
    /do not follow the rules/i,
    /ignore the constraints/i,
    /bypass developer/i,
    /jailbreak/i,
    /ignore policies/i,
    /\b(kill|suicide|exploit|hack|cyberattack|hacked|bomb)\b/i
  ];

  for (const pattern of safetyPatterns) {
    if (pattern.test(sanitized)) {
      throw new Error('Unsafe prompt input detected: Prompt injection or unsafe topic block triggered.');
    }
  }

  // General length truncation safety limit for free-form inputs
  if (sanitized.length > 8000) {
    sanitized = sanitized.substring(0, 8000) + '... [Content truncated for token cost optimization]';
  }

  return sanitized;
};

/**
 * Execute Gemini REST API call with retry exponential backoff and mock fallbacks
 * @param {string} prompt - Raw input prompt
 * @param {string} fallbackStructure - Stringified JSON fallback to parse on failure
 * @returns {Promise<Object>}
 */
const generateAIContent = async (prompt, fallbackStructure = '{}') => {
  const apiKey = process.env.GEMINI_API_KEY;
  // Use latest stable Gemini model: gemini-1.5-flash
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    console.error('[Gemini API] GEMINI_API_KEY is not configured or using placeholder.');
    throw new Error('CampusBuddy is temporarily unavailable. Please try again in a few moments.');
  }

  // 1. Check Prompt Cache
  const cacheKey = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
  const cachedData = checkAiCache(cacheKey);
  if (cachedData) {
    console.log('AI Cache HIT for prompt');
    return cachedData;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const parts = Array.isArray(prompt) ? prompt : [{ text: prompt }];
  const payload = {
    contents: [
      {
        parts: parts
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 1500,
      temperature: 0.2
    }
  };

  let delay = 400; // Shorter initial retry delay
  const retries = 2; // Maximum 2 retries (3 attempts total)

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      console.log(`[Gemini API] Requesting model: ${model} (Attempt ${attempt}/${retries + 1})`);
      
      const response = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 2200 // Max 2.2s per request to keep total time under 8 seconds
      });

      const responseStatus = response.status;
      const resultText = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const rawLength = resultText ? resultText.length : 0;
      
      // Detailed logging
      console.log(`[Gemini API] Response Status: ${responseStatus}, Model: ${model}, Raw Length: ${rawLength} characters`);

      if (!resultText) {
        throw new Error('Malformed response from Gemini API: empty text output');
      }

      // JSON parsing & validation
      let cleanedText = resultText.trim();
      
      // Detect markdown wrapped JSON
      if (cleanedText.startsWith('```')) {
        const match = cleanedText.match(/^```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match) {
          cleanedText = match[1].trim();
        }
      }
      
      // Extract JSON safely from any code blocks or extraneous text
      const startIdx = cleanedText.indexOf('{');
      const endIdx = cleanedText.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        cleanedText = cleanedText.substring(startIdx, endIdx + 1);
      }

      // Reject malformed JSON outline check
      if (!cleanedText.startsWith('{') && !cleanedText.startsWith('[')) {
        throw new Error('JSON response outline check failed: missing opening brace');
      }

      let parsedData;
      try {
        parsedData = JSON.parse(cleanedText);
      } catch (parseError) {
        // Recovery logic for trailing commas
        console.warn(`[Gemini API] Direct JSON parse failed, attempting recovery logic... Error: ${parseError.message}`);
        const recoveredText = cleanedText
          .replace(/,\s*([\]}])/g, '$1') // remove trailing commas before ] or }
          .replace(/,\s*$/g, ''); // remove trailing comma at the very end
        
        parsedData = JSON.parse(recoveredText);
      }

      // Save to Cache
      saveAiCache(cacheKey, parsedData);
      return parsedData;

    } catch (error) {
      console.error(`[Gemini API] Connection/parsing error (Attempt ${attempt}/${retries + 1}):`, error.message);
      
      if (attempt === retries + 1) {
        console.error('[Gemini API] All attempts and retries exhausted.');
        throw new Error('CampusBuddy is temporarily unavailable. Please try again in a few moments.');
      }

      // Shorter sleep delay to keep total time under 8s
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 1.5;
    }
  }
};


/**
 * Execute Gemini REST API call as a Server-Sent Events stream
 * @param {string|Array} prompt - Raw input prompt or array of message parts
 * @param {Object} res - Express response object
 * @param {string} fallbackStructure - Stringified JSON fallback to stream if call fails
 * @param {Function} onComplete - Callback triggered with the full text response accumulated
 */
const generateAIContentStream = async (prompt, res, fallbackStructure = '{}', onComplete = null) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  // SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    console.warn('GEMINI_API_KEY is not set or placeholder. Streaming fallback mock.');
    
    // Simulate streaming the fallback data character-by-character
    const chunkData = fallbackStructure;
    const chunkSize = 20;
    for (let i = 0; i < chunkData.length; i += chunkSize) {
      const chunk = chunkData.substring(i, i + chunkSize);
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      await new Promise(resolve => setTimeout(resolve, 40));
    }
    if (onComplete) {
      onComplete(fallbackStructure);
    }
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  // Check Cache first. If hit, stream the cached object instantly
  const cacheKey = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
  const cachedData = checkAiCache(cacheKey);
  if (cachedData) {
    console.log('AI Cache HIT for stream prompt');
    const dataStr = JSON.stringify(cachedData);
    const chunkSize = 30;
    for (let i = 0; i < dataStr.length; i += chunkSize) {
      res.write(`data: ${JSON.stringify({ text: dataStr.substring(i, i + chunkSize) })}\n\n`);
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    if (onComplete) {
      onComplete(dataStr);
    }
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`;

  const parts = Array.isArray(prompt) ? prompt : [{ text: prompt }];
  const payload = {
    contents: [
      {
        parts: parts
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 2000,
      temperature: 0.2
    }
  };

  let accumulatedResponseText = '';
  let streamBuffer = '';

  try {
    const response = await axios.post(url, payload, {
      responseType: 'stream',
      timeout: 25000 // 25 seconds stream start timeout
    });

    response.data.on('data', (chunk) => {
      streamBuffer += chunk.toString('utf-8');
      
      // Extract text content from candidate JSON nodes in chunk stream
      const regex = /"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
      let match;
      let lastIndex = 0;
      
      while ((match = regex.exec(streamBuffer)) !== null) {
        try {
          const text = JSON.parse(`"${match[1]}"`);
          accumulatedResponseText += text;
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
          lastIndex = regex.lastIndex;
        } catch (e) {
          // If JSON parse fails, it may be a split escape sequence. Let next chunk handle it.
        }
      }

      // Keep only unmatched suffix in streamBuffer
      if (lastIndex > 0) {
        streamBuffer = streamBuffer.substring(lastIndex);
      }
    });

    response.data.on('end', () => {
      console.log('Gemini response:', accumulatedResponseText);
      if (onComplete) {
        onComplete(accumulatedResponseText);
      }
      // Save parsed data to cache if it is a complete valid JSON structure
      try {
        const parsed = JSON.parse(accumulatedResponseText.trim());
        saveAiCache(prompt, parsed);
      } catch (err) {
        console.warn('Completed stream content was not complete valid JSON. Skipping cache save.');
      }
      res.write('data: [DONE]\n\n');
      res.end();
    });

    response.data.on('error', (err) => {
      console.error('Gemini response stream error:', err.message);
      console.log('Gemini response (fallback):', fallbackStructure);
      if (onComplete) {
        onComplete(fallbackStructure);
      }
      res.write(`data: ${JSON.stringify({ text: fallbackStructure })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    });

  } catch (error) {
    console.error('Gemini Axios stream initiation failure:', error.message);
    console.log('Gemini response (fallback):', fallbackStructure);
    if (onComplete) {
      onComplete(fallbackStructure);
    }
    res.write(`data: ${JSON.stringify({ text: fallbackStructure })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
};

/**
 * Clean and parse JSON response from Gemini on the backend to store clean replies
 */
const extractCleanReply = (responseText) => {
  if (!responseText) return '';
  const trimmed = responseText.trim();
  try {
    const parsed = JSON.parse(trimmed);
    return parsed.reply || parsed.message || parsed.text || responseText;
  } catch {
    // If it's a markdown code block, try stripping it
    const cleaned = trimmed.replace(/^```json\s*/i, '').replace(/```\s*$/g, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      return parsed.reply || parsed.message || parsed.text || responseText;
    } catch {
      // Regex pattern to capture the body of a reply or message in a streamed JSON chunk
      const match = responseText.match(/"(?:reply|message|text)"\s*:\s*"(.*)/s);
      if (match) {
        let content = match[1];
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
  }
  return responseText;
};

module.exports = {
  sanitizeInputPrompt,
  compressNoteText,
  generateAIContent,
  generateAIContentStream,
  extractCleanReply
};
