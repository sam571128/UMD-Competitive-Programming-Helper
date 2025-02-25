const OpenAI = require("openai");
const cache = require('./cache');

// Initialize OpenAI with environment variables
let openai = null;
let baseURL = process.env.AI_API_BASE_URL;
let model = process.env.AI_MODEL || "deepseek-chat";

/**
 * Initialize the AI service
 */
function initialize() {
  if (!process.env.AI_API_KEY) {
    console.error('AI_API_KEY environment variable is not set');
    return;
  }

  const config = {
    apiKey: process.env.AI_API_KEY,
  };

  if (baseURL) {
    config.baseURL = baseURL;
  }

  openai = new OpenAI(config);
}

/**
 * Get AI response to a question
 * @param {string} question - User's question
 * @param {string} systemPrompt - System prompt to guide the AI
 * @param {boolean} useCache - Whether to use caching (default: true)
 * @returns {Promise<string>} - AI's response
 */
async function getResponse(question, systemPrompt, useCache = true) {
  if (!openai) {
    initialize();
    if (!openai) {
      throw new Error('AI service not initialized');
    }
  }

  // Create cache key based on question and system prompt
  const cacheKey = `ai:${Buffer.from(question + systemPrompt).toString('base64')}`;
  
  // Check cache first if enabled
  if (useCache) {
    const cachedResponse = await cache.get(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }
  }

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: question }
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000
    });

    const responseText = completion.choices[0].message.content;
    
    // Cache the response for future requests
    if (useCache) {
      await cache.set(cacheKey, responseText, 24 * 60 * 60 * 1000); // 24 hours
    }
    
    return responseText;
  } catch (error) {
    console.error('Error getting AI response:', error);
    throw new Error(`AI service error: ${error.message}`);
  }
}

/**
 * Get a competitive programming AI prompt
 * @returns {string} - The system prompt for competitive programming
 */
function getCompetitiveProgrammingPrompt() {
  return `You are a knowledgeable competitive programming assistant for the UMD Competitive Programming Club. Your expertise includes:
  - Algorithms and data structures
  - Problem-solving strategies and techniques
  - Time and space complexity analysis
  - Programming contest tips and best practices
  - Solutions to common competitive programming problems
  
  You should:
  - Provide clear, concise explanations with example code when relevant
  - Help debug algorithmic issues
  - Suggest optimal approaches to problems
  - Reference specific algorithms or data structures when applicable
  - Encourage learning and understanding rather than just giving solutions
  
  You should not:
  - Provide direct solutions to active contest problems
  - Give vague or overly theoretical answers
  - Ignore time/space complexity considerations
  
  Always strive to help members improve their problem-solving skills.`;
}

module.exports = {
  initialize,
  getResponse,
  getCompetitiveProgrammingPrompt
};