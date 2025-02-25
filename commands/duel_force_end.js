const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder  } = require('discord.js');

const { getProblem, getUser, getUserSubmission } = require('../services/codeforces.js');

const { saveData, getData, removeData } = require('../services/database.js');

const { allDuels } = require('./duel.js');

const { get } = require('node:http');

const wait = require('node:timers/promises').setTimeout;

module.exports = {
    data : new SlashCommandBuilder()
         .setName('duel_force_end')
         .setDescription('Duel with someone (Codeforces Lockout)'),
          
    async execute(interaction) {
        await interaction.deferReply();  

        const user = interaction.user.id;

        let inDuel = await getData(`IN DUEL_${user}`);

        if (inDuel == true) {
            let mainDuelSystem = allDuels.get(user);
            
            if (mainDuelSystem != undefined){
                mainDuelSystem.forceEnd();
            }

            await removeData(`IN DUEL_${user}`);
        }

        await interaction.editReply("The duel has been force ended");
    },
}
