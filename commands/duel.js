const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder  } = require('discord.js');

// Update these import paths to point to the new locations
const { getProblem, getUser, getUserSubmission } = require('../services/codeforces.js');
const { saveData, getData, removeData } = require('../services/database.js');
const { get } = require('node:http');
const duelSystem = require("./duel_backend/duelSystem.js")

const wait = require('node:timers/promises').setTimeout;

module.exports = {
    data : new SlashCommandBuilder()
         .setName('duel')
         .setDescription('Duel with someone (Codeforces Lockout)')
         .addUserOption(option =>
			option
				.setName('opponent')
				.setDescription('The user you want to compete against')
                .setRequired(true))
        .addIntegerOption(option =>
            option
                .setName("min_rating")
                .setDescription("Set the minimum rating of the problems")
                .setRequired(true)
                .setMinValue(800)
                .setMaxValue(3500))
        .addIntegerOption(option =>
            option
                .setName("max_rating")
                .setDescription("Set the maximum rating of the problems")
                .setRequired(true)
                .setMinValue(800)
                .setMaxValue(3500))
        .addIntegerOption(option =>
            option
                .setName("minutes")
                .setDescription("Set the time of the duel (in minutes)")
                .setRequired(true)
                .setMinValue(10)
                .setMaxValue(1440)),
    allDuels: new Map(),
    async execute(interaction) {
        await interaction.deferReply();  

        const userA = interaction.user.id;
        const userB = interaction.options.getUser('opponent').id;

        if (this.allDuels.get(userA) == undefined) {
            await removeData(`IN DUEL_${userA}`);
        }

        if (this.allDuels.get(userB) == undefined) {
            await removeData(`IN DUEL_${userB}`);
        }

        try {
            const checkDataBase = await getData(userA);
            if(checkDataBase == undefined) {
                interaction.editReply(`<@${userA}> is not connected to an account! Please connect to an account before starting a duel!`);
                return;
            }
        } catch (e) {
            interaction.editReply("There is an error with the database, please contact Sam");
            return;
        }

        try {
            const checkDataBase = await getData(userB);
            if(checkDataBase == undefined) {
                interaction.editReply(`<@${userB}> is not connected to an account! Please connect to an account before starting a duel!`);
                return;
            }
        } catch (e) {
            interaction.editReply("There is an error with the database, please contact Sam");
            return;
        }

        try {
            const inDuelA = await getData(`IN DUEL_${userA}`);
            const inDuelB = await getData(`IN DUEL_${userB}`);
            if(inDuelA != undefined) {
                interaction.editReply({ content: `You are currently in a duel (or sent an invitation), please finish the duel before starting a new duel`});
                return;
            }
            if(inDuelB != undefined) {
                interaction.editReply({ content: `<@${userB}> is currently in a duel (or sent an invitation), please let them finish the duel before starting a new duel`});
                return;
            }
        } catch (e) {
            interaction.editReply("There is an error with the database, please contact Sam");
            return;
        }

        console.log("HERE!\n");
        
        await saveData(`IN DUEL_${userA}`, true);

        let minRating = interaction.options.getInteger("min_rating");
        let maxRating = interaction.options.getInteger("max_rating");
        let minutes = interaction.options.getInteger("minutes");

        const accept = new ButtonBuilder()
			.setCustomId('accept')
			.setLabel('Accept')
			.setStyle(ButtonStyle.Success);

		const reject = new ButtonBuilder()
			.setCustomId('reject')
			.setLabel('Reject')
			.setStyle(ButtonStyle.Danger);

        const embedFooter = `User: ${interaction.user.tag}`;
        const InvitationEmbed = new EmbedBuilder()
                .setColor(0xC99136)
                .setTitle("Duel Invitation")
                .addFields(
                    { name: 'Challenger', value: `<@${userA}>` },
                    { name: 'Challenged', value: `<@${userB}>` },
                    { name: 'Problem Rating Range', value: `[${minRating}, ${maxRating}]`},
                    { name: 'Length', value: `${Math.floor(minutes / 60)} hours ${minutes % 60} minutes`}
                )
                .setFooter({text: embedFooter, iconURL:`${interaction.user.displayAvatarURL({
                    size: 4096,
                    dynamic: true
                })}`});
		const buttons = new ActionRowBuilder().addComponents(accept, reject);
        const response = await interaction.editReply({ embeds: [InvitationEmbed], 
                                      content: `<@${userB}>, you have 60 seconds to accept or reject this duel invitation.`, 
                                      components: [buttons]});

        const collectorFilter = i => i.user.id === userB;

        try {
            const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });
            if (confirmation.customId === 'accept') {
                await confirmation.update({ content: `<@${userB}> has accepted this duel. The duel is going to start.`, components: [], embeds: [] });
            } else if (confirmation.customId === 'reject') {
                await confirmation.update({ content: `<@${userB}> has rejected this duel.`, components: [], embeds: []});
                await removeData(`IN DUEL_${userA}`)
                return;
            }
        } catch (e) {
            await interaction.editReply({ content: 'Confirmation not received within 1 minute, cancelling', components: [], embeds: []});
        }

        mainDuelSystem = new duelSystem(userA, userB, minRating, maxRating, minutes, interaction);
        await saveData(`IN DUEL_${userA}`, true);
        await saveData(`IN DUEL_${userB}`, true);
        this.allDuels.set(userA, mainDuelSystem);
        this.allDuels.set(userB, mainDuelSystem);
        await mainDuelSystem.start();
    },
}
