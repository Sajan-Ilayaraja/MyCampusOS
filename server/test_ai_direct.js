const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const testStreamingGemini = async () => {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = 'gemini-2.5-flash';
  console.log('Testing Gemini API key:', apiKey);
  console.log('Using model:', model);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`;
  const payload = {
    contents: [
      {
        parts: [
          { text: "Hello! Reply with a short JSON containing 'status': 'success'" }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 100,
      temperature: 0.2
    }
  };

  try {
    const response = await axios.post(url, payload, {
      responseType: 'stream',
      timeout: 10000
    });
    
    console.log('Streaming started successfully!');
    
    response.data.on('data', (chunk) => {
      console.log('Chunk received:', chunk.toString('utf-8'));
    });

    response.data.on('end', () => {
      console.log('Streaming finished.');
    });

  } catch (error) {
    console.error('Gemini API Error:', error.message);
  }
};

testStreamingGemini();
