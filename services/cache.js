/**
 * Simple in-memory cache with TTL support
 */

// In-memory store with structure: { key: { value, expiry } }
const cacheStore = new Map();

/**
 * Get a value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any>} - Cached value or undefined if not found/expired
 */
async function get(key) {
  const item = cacheStore.get(key);
  
  // Return undefined if item doesn't exist
  if (!item) {
    return undefined;
  }
  
  // Check if item has expired
  if (item.expiry && item.expiry < Date.now()) {
    cacheStore.delete(key);
    return undefined;
  }
  
  return item.value;
}

/**
 * Set a value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in ms (optional)
 * @returns {Promise<void>}
 */
async function set(key, value, ttl = null) {
  const item = {
    value,
    expiry: ttl ? Date.now() + ttl : null
  };
  
  cacheStore.set(key, item);
}

/**
 * Delete a value from cache
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} - True if deleted, false if not found
 */
async function del(key) {
  return cacheStore.delete(key);
}

/**
 * Clear all cache entries
 * @returns {Promise<void>}
 */
async function clear() {
  cacheStore.clear();
}

// Periodically clean up expired items (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  cacheStore.forEach((item, key) => {
    if (item.expiry && item.expiry < now) {
      cacheStore.delete(key);
    }
  });
}, 10 * 60 * 1000);

module.exports = {
  get,
  set,
  del,
  clear
};