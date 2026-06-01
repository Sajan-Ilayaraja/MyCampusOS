const axios = require('axios');
const crypto = require('crypto');
const AICache = require('../models/AICache');
const AIProviderLog = require('../models/AIProviderLog');

// Dynamic in-memory health tracking
const providerHealth = {
  groq: {
    healthy: true,
    lastSuccess: null,
    averageLatency: 0,
    totalRequests: 0,
    totalLatency: 0,
    failures: 0
  },
  openrouter: {
    healthy: true,
    lastSuccess: null,
    averageLatency: 0,
    totalRequests: 0,
    totalLatency: 0,
    failures: 0
  }
};

// Initialize health tracking from recent database logs on startup
async function initializeHealth() {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentLogs = await AIProviderLog.find({ createdAt: { $gte: oneHourAgo } });
    
    const stats = {
      groq: { count: 0, totalLatency: 0, failures: 0 },
      openrouter: { count: 0, totalLatency: 0, failures: 0 }
    };
    
    recentLogs.forEach(log => {
      const prov = log.provider.toLowerCase();
      if (stats[prov]) {
        stats[prov].count++;
        stats[prov].totalLatency += log.latencyMs;
        if (!log.success) {
          stats[prov].failures++;
        }
      }
    });

    ['groq', 'openrouter'].forEach(prov => {
      if (stats[prov].count > 0) {
        providerHealth[prov].totalRequests = stats[prov].count;
        providerHealth[prov].totalLatency = stats[prov].totalLatency;
        providerHealth[prov].averageLatency = Math.round(stats[prov].totalLatency / stats[prov].count);
        providerHealth[prov].failures = stats[prov].failures;
        // If failure rate in the last hour is high (e.g. > 50%), mark unhealthy
        providerHealth[prov].healthy = (stats[prov].failures / stats[prov].count) < 0.5;
        if (stats[prov].failures === 0) {
          providerHealth[prov].lastSuccess = new Date();
        }
      }
    });
    console.log('[AI Provider Router] Initialized health stats from DB logs:', providerHealth);
  } catch (err) {
    console.error('[AI Provider Router] Failed to initialize health stats:', err.message);
  }
}

// Call initialization asynchronously
initializeHealth();

/**
 * Generate a SHA-256 hash of prompt content + feature name for cache keys
 */
function generatePromptHash(prompt, feature) {
  const content = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
  return crypto.createHash('sha256').update(content + '|' + feature).digest('hex');
}

/**
 * JSON clean and recovery layer
 */
function sanitizeJsonResponse(text) {
  if (typeof text !== 'string') return text;
  
  let cleaned = text.trim();
  
  // 1. Remove markdown code fences
  if (cleaned.startsWith('```')) {
    const match = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match) {
      cleaned = match[1].trim();
    } else {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').trim();
    }
  }
  
  cleaned = cleaned.replace(/```\s*$/g, '').trim();
  
  // Strip extraneous text around JSON object/array
  const startObj = cleaned.indexOf('{');
  const startArr = cleaned.indexOf('[');
  let startIdx = -1;
  if (startObj !== -1 && startArr !== -1) {
    startIdx = Math.min(startObj, startArr);
  } else if (startObj !== -1) {
    startIdx = startObj;
  } else if (startArr !== -1) {
    startIdx = startArr;
  }
  
  const endObj = cleaned.lastIndexOf('}');
  const endArr = cleaned.lastIndexOf(']');
  let endIdx = -1;
  if (endObj !== -1 && endArr !== -1) {
    endIdx = Math.max(endObj, endArr);
  } else if (endObj !== -1) {
    endIdx = endObj;
  } else if (endArr !== -1) {
    endIdx = endArr;
  }
  
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  }
  
  // 2. Repair trailing commas (e.g. [1, 2, ] -> [1, 2] or {"a": 1, } -> {"a": 1})
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
  
  // 3. Attempt parsing
  try {
    return JSON.parse(cleaned);
  } catch (parseError) {
    console.warn(`[JSON Recovery] Direct JSON parse failed, attempting recovery logic... Error: ${parseError.message}`);
    // Try to remove potential trailing commas that regex missed or handle whitespace issues
    const recoveredText = cleaned.replace(/,\s*$/g, '');
    try {
      return JSON.parse(recoveredText);
    } catch (err) {
      throw parseError; // Rethrow original error if recovery fails
    }
  }
}

/**
 * Log performance metrics and success rates of providers
 */
async function logProviderMetric(provider, model, feature, latencyMs, success, errorMessage = null) {
  try {
    await AIProviderLog.create({
      provider,
      model,
      feature,
      latencyMs,
      success,
      errorMessage
    });
    
    // Update in-memory health tracking
    const prov = provider.toLowerCase();
    if (providerHealth[prov]) {
      const stats = providerHealth[prov];
      stats.totalRequests++;
      stats.totalLatency += latencyMs;
      stats.averageLatency = Math.round(stats.totalLatency / stats.totalRequests);
      if (success) {
        stats.healthy = true;
        stats.lastSuccess = new Date();
        stats.failures = 0; // reset sequential failures
      } else {
        stats.failures++;
        if (stats.failures >= 3) {
          stats.healthy = false; // Mark unhealthy after 3 sequential failures
        }
      }
    }
  } catch (err) {
    console.error('[AI Provider Router] Telemetry log save error:', err.message);
  }
}

/**
 * Execute request on Groq
 */
async function requestGroq(messages, jsonMode, timeoutMs = 3000) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.startsWith('YOUR_')) {
    throw new Error('Groq API Key is not configured');
  }
  
  const payload = {
    model: 'llama-3.3-70b-versatile',
    messages,
    temperature: 0.2,
    max_tokens: 1500
  };
  
  if (jsonMode) {
    payload.response_format = { type: 'json_object' };
  }
  
  const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', payload, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: timeoutMs
  });
  
  return response.data?.choices?.[0]?.message?.content || '';
}

/**
 * Execute request on OpenRouter (DeepSeek with Qwen fallback)
 */
async function requestOpenRouter(messages, jsonMode, timeoutMs = 3000) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.startsWith('YOUR_')) {
    throw new Error('OpenRouter API Key is not configured');
  }
  
  let targetModel = 'deepseek/deepseek-chat-v3';
  const payload = {
    model: targetModel,
    messages,
    temperature: 0.2,
    max_tokens: 1500
  };
  
  if (jsonMode) {
    payload.response_format = { type: 'json_object' };
  }

  try {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', payload, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'CampusBuddy'
      },
      timeout: timeoutMs
    });
    return {
      content: response.data?.choices?.[0]?.message?.content || '',
      model: targetModel
    };
  } catch (error) {
    console.warn(`[OpenRouter] deepseek-chat-v3 round failed, falling back to qwen/qwen3-32b. Error: ${error.message}`);
    
    targetModel = 'qwen/qwen3-32b';
    payload.model = targetModel;
    
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', payload, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'CampusBuddy'
      },
      timeout: timeoutMs
    });
    
    return {
      content: response.data?.choices?.[0]?.message?.content || '',
      model: targetModel
    };
  }
}

/**
 * Primary Core Router with failover and caching
 */
async function executeWithFailover(feature, messages, jsonMode = true, preferredProvider = 'auto') {
  // Generate cache key
  const promptHash = generatePromptHash(messages, feature);
  
  // 1. Check Caching
  try {
    const cached = await AICache.findOne({ promptHash, feature });
    if (cached) {
      console.log(`[AI Cache] HIT for ${feature}`);
      return cached.response;
    }
  } catch (cacheErr) {
    console.warn('[AI Cache] Read error:', cacheErr.message);
  }

  // 2. Establish Provider execution sequence
  const providerPreference = (preferredProvider || 'auto').toLowerCase();
  let sequence = [];
  if (providerPreference === 'groq') {
    sequence = ['groq', 'openrouter'];
  } else if (providerPreference === 'openrouter') {
    sequence = ['openrouter', 'groq'];
  } else {
    // default auto
    sequence = ['groq', 'openrouter'];
  }

  let lastError = null;
  const timeoutPerAttempt = 3000; // 3 seconds timeout per provider

  for (const provider of sequence) {
    const startTime = Date.now();
    let modelName = provider === 'groq' ? 'llama-3.3-70b-versatile' : 'deepseek/deepseek-chat-v3';
    
    try {
      console.log(`[AI Provider Router] Attempting ${provider} (model: ${modelName}) for ${feature}...`);
      let content = '';
      
      if (provider === 'groq') {
        content = await requestGroq(messages, jsonMode, timeoutPerAttempt);
      } else {
        const orResult = await requestOpenRouter(messages, jsonMode, timeoutPerAttempt);
        content = orResult.content;
        modelName = orResult.model;
      }
      
      const latency = Date.now() - startTime;
      console.log(`[AI Provider Router] ${provider} success in ${latency}ms`);
      
      // Attempt JSON recovery/sanitization if required
      let responseObj = content;
      if (jsonMode) {
        responseObj = sanitizeJsonResponse(content);
      }
      
      // Save telemetry
      await logProviderMetric(provider, modelName, feature, latency, true);
      
      // Save to Cache (24 hour TTL handles deletion)
      try {
        await AICache.create({
          promptHash,
          feature,
          provider,
          response: responseObj
        });
      } catch (cacheSaveErr) {
        console.warn('[AI Cache] Save error:', cacheSaveErr.message);
      }
      
      return responseObj;
    } catch (err) {
      const latency = Date.now() - startTime;
      console.error(`[AI Provider Router] ${provider} attempt failed in ${latency}ms. Error: ${err.message}`);
      lastError = err;
      await logProviderMetric(provider, modelName, feature, latency, false, err.message);
      // Fallback loop continues to next provider
    }
  }

  // All attempts failed
  console.error('[AI Provider Router] All providers in failover chain exhausted.');
  throw new Error('CampusBuddy is temporarily unavailable. Please try again in a few moments.');
}

/**
 * Handle Streaming response with failover
 */
async function executeStreamWithFailover(feature, messages, res, preferredProvider = 'auto', onComplete = null) {
  // SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const promptHash = generatePromptHash(messages, feature);

  // 1. Check Cache
  try {
    const cached = await AICache.findOne({ promptHash, feature });
    if (cached) {
      console.log(`[AI Cache] Stream HIT for ${feature}`);
      const dataStr = typeof cached.response === 'string' ? cached.response : JSON.stringify(cached.response);
      
      // Stream cached response character-by-character to simulate real stream
      const chunkSize = 20;
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
  } catch (cacheErr) {
    console.warn('[AI Cache] Stream read error:', cacheErr.message);
  }

  const providerPreference = (preferredProvider || 'auto').toLowerCase();
  let sequence = [];
  if (providerPreference === 'groq') {
    sequence = ['groq', 'openrouter'];
  } else if (providerPreference === 'openrouter') {
    sequence = ['openrouter', 'groq'];
  } else {
    sequence = ['groq', 'openrouter'];
  }

  const timeoutPerAttempt = 3000;

  for (const provider of sequence) {
    const startTime = Date.now();
    const model = provider === 'groq' ? 'llama-3.3-70b-versatile' : 'deepseek/deepseek-chat-v3';
    const apiKey = provider === 'groq' ? process.env.GROQ_API_KEY : process.env.OPENROUTER_API_KEY;
    const url = provider === 'groq' 
      ? 'https://api.groq.com/openai/v1/chat/completions' 
      : 'https://openrouter.ai/api/v1/chat/completions';

    if (!apiKey || apiKey.startsWith('YOUR_')) {
      console.warn(`[AI Stream Router] ${provider} API Key is missing. Trying next provider.`);
      continue;
    }

    try {
      console.log(`[AI Stream Router] Attempting stream with ${provider} (model: ${model}) for ${feature}...`);
      
      const payload = {
        model,
        messages,
        temperature: 0.2,
        max_tokens: 1500,
        stream: true
      };

      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'CampusBuddy'
        },
        responseType: 'stream',
        timeout: timeoutPerAttempt
      });

      let accumulatedText = '';
      let streamBuffer = '';

      await new Promise((resolve, reject) => {
        response.data.on('data', (chunk) => {
          streamBuffer += chunk.toString('utf-8');
          const lines = streamBuffer.split('\n');
          streamBuffer = lines.pop() || '';

          for (const line of lines) {
            const cleanLine = line.trim();
            if (cleanLine.startsWith('data: ')) {
              const dataStr = cleanLine.substring(6);
              if (dataStr === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(dataStr);
                const token = parsed?.choices?.[0]?.delta?.content || '';
                if (token) {
                  accumulatedText += token;
                  res.write(`data: ${JSON.stringify({ text: token })}\n\n`);
                }
              } catch (e) {
                // Ignore chunk parse exceptions
              }
            }
          }
        });

        response.data.on('end', async () => {
          const latency = Date.now() - startTime;
          console.log(`[AI Stream Router] Streamed successfully from ${provider} in ${latency}ms`);
          
          await logProviderMetric(provider, model, feature, latency, true);
          
          // Save valid accumulated JSON outputs to cache
          try {
            const cleaned = sanitizeJsonResponse(accumulatedText);
            await AICache.create({
              promptHash,
              feature,
              provider,
              response: cleaned
            });
          } catch (cacheSaveErr) {
            console.warn('[AI Cache] Stream output cache save failed:', cacheSaveErr.message);
          }

          if (onComplete) {
            onComplete(accumulatedText);
          }

          res.write('data: [DONE]\n\n');
          res.end();
          resolve();
        });

        response.data.on('error', (err) => {
          reject(err);
        });
      });

      // Stream successfully completed, exit failover loop
      return;
    } catch (err) {
      const latency = Date.now() - startTime;
      console.error(`[AI Stream Router] Stream with ${provider} failed in ${latency}ms. Error: ${err.message}`);
      await logProviderMetric(provider, model, feature, latency, false, err.message);
      // Continue loop to attempt next provider
    }
  }

  // If we reach here, all stream providers failed
  console.error('[AI Stream Router] All providers failed during stream attempt.');
  res.write(`data: ${JSON.stringify({ error: true, message: 'CampusBuddy is temporarily unavailable. Please try again in a few moments.' })}\n\n`);
  res.write('data: [DONE]\n\n');
  res.end();
}

/**
 * High-Level Abstractions matching standard interfaces
 */

const promptTemplates = require('../utils/promptTemplates');

async function generateChat(promptText, chatHistory = [], stream = false, res = null, onComplete = null, preferredProvider = 'auto') {
  let messages = [];
  if (typeof promptText === 'string') {
    messages = [{ role: 'user', content: promptText }];
  } else if (Array.isArray(promptText)) {
    const content = promptText.map(part => {
      if (part.inlineData) {
        return {
          type: 'image_url',
          image_url: {
            url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
          }
        };
      }
      return {
        type: 'text',
        text: part.text || ''
      };
    });
    messages = [{ role: 'user', content }];
  }

  if (stream && res) {
    return await executeStreamWithFailover('chat', messages, res, preferredProvider, onComplete);
  } else {
    return await executeWithFailover('chat', messages, true, preferredProvider);
  }
}

async function generateQuiz(topic, difficulty, questionCount, preferredProvider = 'auto') {
  const prompt = promptTemplates.quizGenerator(topic, difficulty, questionCount);
  const messages = [{ role: 'user', content: prompt }];
  return await executeWithFailover('quiz-generator', messages, true, preferredProvider);
}

async function generateSummary(notesText, stream = false, res = null, preferredProvider = 'auto') {
  const prompt = promptTemplates.notesSummary(notesText);
  const messages = [{ role: 'user', content: prompt }];
  if (stream && res) {
    return await executeStreamWithFailover('notes-summary', messages, res, preferredProvider);
  } else {
    return await executeWithFailover('notes-summary', messages, true, preferredProvider);
  }
}

async function generateFlashcards(topic, cardCount, preferredProvider = 'auto') {
  const prompt = promptTemplates.flashcards(topic, cardCount);
  const messages = [{ role: 'user', content: prompt }];
  return await executeWithFailover('flashcards', messages, true, preferredProvider);
}

async function generateStudyPlan(subject, examDate, topics, hours, stream = false, res = null, preferredProvider = 'auto') {
  const prompt = promptTemplates.studyPlan(subject, examDate, topics, hours);
  const messages = [{ role: 'user', content: prompt }];
  if (stream && res) {
    return await executeStreamWithFailover('study-plan', messages, res, preferredProvider);
  } else {
    return await executeWithFailover('study-plan', messages, true, preferredProvider);
  }
}

async function generateCareerRoadmap(targetRole, targetCompany, stream = false, res = null, preferredProvider = 'auto') {
  const prompt = promptTemplates.careerAdvisor(targetRole, targetCompany);
  const messages = [{ role: 'user', content: prompt }];
  if (stream && res) {
    return await executeStreamWithFailover('career-advisor', messages, res, preferredProvider);
  } else {
    return await executeWithFailover('career-advisor', messages, true, preferredProvider);
  }
}

async function generateInterviewPrep(role, companyName, roundType, preferredProvider = 'auto') {
  const prompt = promptTemplates.interviewPrep(role, companyName, roundType);
  const messages = [{ role: 'user', content: prompt }];
  return await executeWithFailover('interview-prep', messages, true, preferredProvider);
}

module.exports = {
  providerHealth,
  executeWithFailover,
  executeStreamWithFailover,
  generateChat,
  generateQuiz,
  generateSummary,
  generateFlashcards,
  generateStudyPlan,
  generateCareerRoadmap,
  generateInterviewPrep,
  sanitizeJsonResponse
};
