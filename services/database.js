require('dotenv').config();
const Keyv = require('@keyv/mongo');
const { handleCommandError } = require('../utils/errorHandler');

// Connection pool and retry settings
let keyvInstance = null;
let isConnecting = false;
let connectionRetries = 0;
const MAX_RETRIES = 5;
const RETRY_DELAY = 3000; // 3 seconds

/**
 * Initialize database connection
 * @returns {Promise<Keyv>} - Keyv instance
 */
async function getConnection() {
  // If we already have a connection, return it
  if (keyvInstance) {
    return keyvInstance;
  }
  
  // If we're already trying to connect, wait and return the result
  if (isConnecting) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return getConnection();
  }
  
  isConnecting = true;
  
  try {
    const mongoUrl = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASS}@${process.env.MONGODB_HOST}/?retryWrites=true&w=majority`;
    
    keyvInstance = new Keyv(mongoUrl);
    
    keyvInstance.on('error', err => {
      console.error('MongoDB connection error:', err);
      keyvInstance = null;
      connectionRetries++;
      
      if (connectionRetries <= MAX_RETRIES) {
        console.log(`Retrying connection (${connectionRetries}/${MAX_RETRIES})...`);
        setTimeout(() => {
          isConnecting = false;
          getConnection();
        }, RETRY_DELAY);
      } else {
        console.error('Maximum connection retries reached');
      }
    });
    
    // Test connection by setting and getting a value
    await keyvInstance.set('connection_test', Date.now());
    await keyvInstance.get('connection_test');
    
    console.log('Successfully connected to MongoDB');
    connectionRetries = 0;
    isConnecting = false;
    return keyvInstance;
  } catch (error) {
    console.error('Failed to initialize database connection:', error);
    keyvInstance = null;
    connectionRetries++;
    
    if (connectionRetries <= MAX_RETRIES) {
      console.log(`Retrying connection (${connectionRetries}/${MAX_RETRIES})...`);
      setTimeout(() => {
        isConnecting = false;
        getConnection();
      }, RETRY_DELAY);
    } else {
      console.error('Maximum connection retries reached');
      isConnecting = false;
      throw new Error('Failed to connect to database after multiple attempts');
    }
  }
}

/**
 * Save data to database
 * @param {string} key - Key to store data under
 * @param {any} value - Value to store
 * @returns {Promise<boolean>} - Success status
 */
async function saveData(key, value) {
  try {
    const keyv = await getConnection();
    await keyv.set(key, value);
    return true;
  } catch (error) {
    console.error(`Database error (saveData - ${key}):`, error);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Get data from database
 * @param {string} key - Key to retrieve
 * @returns {Promise<any>} - Retrieved value or undefined
 */
async function getData(key) {
  try {
    const keyv = await getConnection();
    return await keyv.get(key);
  } catch (error) {
    console.error(`Database error (getData - ${key}):`, error);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Remove data from database
 * @param {string} key - Key to remove
 * @returns {Promise<boolean>} - Success status
 */
async function removeData(key) {
  try {
    const keyv = await getConnection();
    return await keyv.delete(key);
  } catch (error) {
    console.error(`Database error (removeData - ${key}):`, error);
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * Update a field in an object stored in the database
 * @param {string} key - Key of the object to update
 * @param {string} field - Field in the object to update
 * @param {any} value - New value for the field
 * @returns {Promise<boolean>} - Success status
 */
async function updateField(key, field, value) {
  try {
    const data = await getData(key);
    
    if (!data) {
      throw new Error(`No data found for key: ${key}`);
    }
    
    data[field] = value;
    await saveData(key, data);
    return true;
  } catch (error) {
    console.error(`Database error (updateField - ${key}.${field}):`, error);
    throw new Error(`Database error: ${error.message}`);
  }
}

module.exports = {
  saveData,
  getData,
  removeData,
  updateField
};