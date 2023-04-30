const { SlashCommandBuilder, EmbedBuilder  } = require('discord.js');

const { getProblem, getUser, getUserSubmission } = require('./fetch/cfAPI.js');

const { saveData, getData } = require('./database/data.js');
const { get } = require('node:http');

const wait = require('node:timers/promises').setTimeout;

module.exports = {
    data : new SlashCommandBuilder()
         .setName('cf')
         .setDescription('Find the User on Codeforces')
         .addStringOption(option =>
			option
				.setName('handle')
				.setDescription('Input a Handle')),
    async execute(interaction) {
        await interaction.deferReply();  

        let handle = interaction.options.getString('handle') ?? " ";

        if (handle == " "){
            const user = interaction.user.id;
            handle = await getData(user);
            if (handle == undefined) {
                interaction.editReply("You need to register or input a handle");
                return;
            }
        }

        try {
            const status = await getUser(handle);

            let city, organization, rank, maxRank, rating;

            try {
                city = status.result[0].city;
            } catch (e) {
                city = 'None';
            }

            try {
                organization = status.result[0].organization;
            } catch (e) {
                organization = 'None';
            }

            try {
                rank = status.result[0].rank;
            } catch (e) {
                rank = 'None';
            }

            try {
                maxRank = status.result[0].maxRank;
            } catch (e) {
                maxRank = 'None';
            }

            try {
                rating = status.result[0].rating;
            } catch (e) {
                rating = 'None';
            }

            const embedFooter = `User: ${interaction.user.tag}`;
                const ResultEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setThumbnail(status.result[0].titlePhoto)
                .setTitle('Codeforces User Search')
                .addFields(
                    { name: 'Codeforces Handle', value: handle },
                    { name: 'Rating', value: `${rating}` },
                    { name: 'Rank', value: `${rank}` },
                    { name: 'Maximum Rank', value: `${maxRank}` },
                    { name: 'City', value: `${city}` },
                    { name: 'Organization', value: `${organization}` }
                )
                .setFooter({text: embedFooter, iconURL:`${interaction.user.displayAvatarURL({
                    size: 4096,
                    dynamic: true
                })}`});
            await interaction.editReply({ embeds: [ResultEmbed] });
        } catch (e) {
            interaction.editReply("Codeforces API is not working, please try later");
            return;
        }
    },
}
