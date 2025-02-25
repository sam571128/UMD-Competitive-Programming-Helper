const { EmbedBuilder } = require('discord.js');

/**
 * Error types for different scenarios
 */
const ErrorType = {
  API_ERROR: 'API_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  USER_INPUT_ERROR: 'USER_INPUT_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  GENERAL_ERROR: 'GENERAL_ERROR'
};

/**
 * Creates a standardized error response embed
 * @param {ErrorType} type - Type of error
 * @param {string} message - Error message
 * @param {string} [detail] - Optional detailed error information
 * @returns {EmbedBuilder} - Discord embed for error response
 */
function createErrorEmbed(type, message, detail = null) {
  const embed = new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle('Error')
    .setDescription(message)
    .setTimestamp();
    
  if (detail && process.env.NODE_ENV !== 'production') {
    embed.addFields({ name: 'Details', value: detail });
  }
  
  return embed;
}

/**
 * Handles command errors with standardized responses
 * @param {Error} error - The error object
 * @param {Object} interaction - Discord interaction object
 */
async function handleCommandError(error, interaction) {
  console.error(`Error in command ${interaction.commandName}:`, error);
  
  try {
    // Check if interaction has already been replied to
    if (interaction.deferred && !interaction.replied) {
      await handleErrorResponse(error, interaction, 'editReply');
    } else if (!interaction.replied) {
      await handleErrorResponse(error, interaction, 'reply');
    } else {
      await handleErrorResponse(error, interaction, 'followUp');
    }
  } catch (followUpError) {
    console.error('Failed to send error message:', followUpError);
  }
}

/**
 * Determines error type and sends appropriate response
 * @param {Error} error - The error object
 * @param {Object} interaction - Discord interaction
 * @param {string} responseMethod - Method to use for responding ('reply', 'editReply', 'followUp')
 */
async function handleErrorResponse(error, interaction, responseMethod) {
  let errorType = ErrorType.GENERAL_ERROR;
  let message = 'An unexpected error occurred. Please try again later.';
  
  // Determine error type and message based on error content
  if (error.message?.includes('Failed to fetch') || error.message?.includes('API')) {
    errorType = ErrorType.API_ERROR;
    message = 'There was an error connecting to Codeforces. Please try again later.';
  } else if (error.message?.includes('database') || error.message?.includes('MongoDB')) {
    errorType = ErrorType.DATABASE_ERROR;
    message = 'There was a database error. Please try again later.';
  } else if (error.message?.includes('handle') || error.message?.includes('not exist')) {
    errorType = ErrorType.USER_INPUT_ERROR;
    message = 'The Codeforces handle does not exist or was entered incorrectly.';
  } else if (error.message?.includes('permission')) {
    errorType = ErrorType.PERMISSION_ERROR;
    message = 'You do not have permission to use this command.';
  } else if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
    errorType = ErrorType.TIMEOUT_ERROR;
    message = 'The operation timed out. Please try again later.';
  }
  
  const embed = createErrorEmbed(errorType, message, process.env.NODE_ENV === 'development' ? error.stack : null);
  
  const options = { 
    embeds: [embed], 
    ephemeral: errorType === ErrorType.USER_INPUT_ERROR || errorType === ErrorType.PERMISSION_ERROR 
  };
  
  await interaction[responseMethod](options);
}

module.exports = {
  ErrorType,
  handleCommandError,
  createErrorEmbed
};