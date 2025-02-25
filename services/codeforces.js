const fetch = require('node-fetch');
const cache = require('./cache');

// API endpoints
const API = {
  user: 'http://codeforces.com/api/user.info',
  problem: 'http://codeforces.com/api/problemset.problems',
  submissions: 'http://codeforces.com/api/problemset.recentStatus',
  userStatus: 'http://codeforces.com/api/user.status'
};

// Cache TTLs in milliseconds
const CACHE_TTL = {
  user: 5 * 60 * 1000, // 5 minutes
  problems: 30 * 60 * 1000, // 30 minutes
  submissions: 60 * 1000 // 1 minute
};

/**
 * Handles API request with caching and error handling
 * @param {string} url - API endpoint
 * @param {string} cacheKey - Key for cache storage
 * @param {number} ttl - Time to live for cache in ms
 * @returns {Promise<Object>} - API response
 */
async function apiRequest(url, cacheKey, ttl) {
  try {
    // Check cache first
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // Make API request
    const response = await fetch(url);
    
    // Handle HTTP errors
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Handle API errors
    if (data.status === 'FAILED') {
      throw new Error(`Codeforces API error: ${data.comment}`);
    }
    
    // Cache successful response
    if (data.status === 'OK') {
      await cache.set(cacheKey, data, ttl);
    }
    
    return data;
  } catch (error) {
    console.error(`Codeforces API error: ${error.message}`);
    throw error;
  }
}

/**
 * Gets user information from Codeforces
 * @param {string} handle - Codeforces handle
 * @returns {Promise<Object>} - User information
 */
async function getUser(handle) {
  const url = new URL(API.user);
  url.searchParams.append('handles', handle);
  return apiRequest(url.toString(), `user:${handle}`, CACHE_TTL.user);
}

/**
 * Gets user submissions from Codeforces
 * @param {string} handle - Codeforces handle
 * @param {number} count - Number of submissions to fetch (0 for all)
 * @returns {Promise<Object>} - User submissions
 */
async function getUserSubmission(handle, count = 0) {
  const url = new URL(API.userStatus);
  url.searchParams.append('handle', handle);
  
  if (count !== 0) {
    url.searchParams.append('from', 1);
    url.searchParams.append('count', count);
  }
  
  // For submissions, use a different cache key if count is specified
  const cacheKey = `submissions:${handle}:${count || 'all'}`;
  return apiRequest(url.toString(), cacheKey, CACHE_TTL.submissions);
}

/**
 * Gets problems from Codeforces
 * @param {string[]} tags - Problem tags to filter by
 * @returns {Promise<Object>} - Problems
 */
async function getProblem(tags) {
  const params = tags.join(';');
  const url = new URL(API.problem);
  url.searchParams.append('tags', params);
  
  // Create cache key based on tags
  const cacheKey = `problems:${params || 'all'}`;
  return apiRequest(url.toString(), cacheKey, CACHE_TTL.problems);
}

/**
 * Gets recent submissions from Codeforces
 * @param {number} count - Number of submissions to fetch
 * @returns {Promise<Object>} - Recent submissions
 */
async function getSubmission(count) {
  const url = new URL(API.submissions);
  url.searchParams.append('count', count);
  return apiRequest(url.toString(), `recent:${count}`, CACHE_TTL.submissions);
}

module.exports = {
  getUser,
  getSubmission,
  getUserSubmission,
  getProblem
};