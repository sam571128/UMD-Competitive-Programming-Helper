require('dotenv').config();
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const aiService = require('../services/ai');
const { handleCommandError } = require('../utils/errorHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Chat with the AI assistant about competitive programming')
    .addStringOption(option =>
      option
        .setName('question')
        .setDescription('Your question about competitive programming, algorithms, or coding')
        .setRequired(true))
    .addBooleanOption(option =>
      option
        .setName('private')
        .setDescription('Make the response visible only to you (default: false)')
        .setRequired(false)),
    
  async execute(interaction) {
    try {
      await interaction.deferReply({
        ephemeral: interaction.options.getBoolean('private') || false
      });
      
      const question = interaction.options.getString('question');
      
      if (!question || question.trim().length === 0) {
        return interaction.editReply('Please ask a question!');
      }
      
      // Get system prompt for competitive programming
      const systemPrompt = aiService.getCompetitiveProgrammingPrompt();
      
      // Get response from AI service
      const response = await aiService.getResponse(question, systemPrompt);
      
      // Check response length - Discord has a 2000 character limit
      if (response.length > 2000) {
        // Create embedded response for long text
        const embed = new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle('Response to your question')
          .setDescription(response.substring(0, 4000)) // Embed supports longer text
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      } else {
        // Send direct message for shorter text
        await interaction.editReply(response);
      }
    } catch (error) {
      await handleCommandError(error, interaction);
    }
  },
};