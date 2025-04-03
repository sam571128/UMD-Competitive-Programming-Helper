const { SlashCommandBuilder } = require('discord.js');
const { sendDailyLeaderboardMessage } = require('./daily.js');

module.exports = {
    data : new SlashCommandBuilder()
         .setName('daily_lb')
         .setDescription('Print the current Daily Problem Leaderboard'),
          
    async execute(interaction) {
        await interaction.deferReply();
        sendDailyLeaderboardMessage(interaction.channel);
    },
}
