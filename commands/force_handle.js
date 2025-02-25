const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder  } = require('discord.js');

const { getProblem, getUser, getUserSubmission } = require('../services/codeforces.js');
const { saveData, getData, removeData } = require('../services/database.js');
const { get } = require('node:http');
const duelSystem = require("./duel_backend/duelSystem.js")

const wait = require('node:timers/promises').setTimeout;

module.exports = {
    data : new SlashCommandBuilder()
         .setName('force_handle')
         .setDescription('Duel with someone (Codeforces Lockout)')
         .addUserOption(option =>
			option
				.setName('someone')
				.setDescription('The user to be forced handle')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('handle')
                .setDescription('The handle')
                .setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();  

        const user = interaction.options.getUser('someone').id;
        const handle = interaction.options.getString('handle');

        await saveData(user, handle);

        await interaction.editReply(`Set <@${user}>'s handle to ${handle}`);
    },
}
