// discord-bot/commands/daily.js

const { SlashCommandBuilder, EmbedBuilder  } = require('discord.js');

const { getProblem } = require('./fetch/cfAPI.js');
const { saveData, getData } = require('./database/data.js');
const cron = require('node-cron');
require('dotenv').config();

// Function to send daily problems. If 'message' is provided, it sends to that channel (command triggered). Otherwise, it sends to the default daily channel (cron trigger).
function sendDailyProblems(client, message) {
    // Fetch a random problem without any specific tags
    const tags = [];
    getProblem(tags).then(body => {
        const problems = body.result.problems;

        if (!problems.length) {
            console.error('No problems found.');
            return;
        }

        // Filter problems with valid ratings and non-special tags
        const filteredProblems = problems.filter(problem => (
            problem.rating != null &&
            !problem.tags.includes('*special') &&
            problem.tags.length > 0
        ));

        const easyProblems = filteredProblems.filter(problem => (
            problem.rating <= 1400
        ));

        const mediumProblems = filteredProblems.filter(problem => (
            problem.rating > 1400 &&
            problem.rating <= 2100
        ));

        const hardProblems = filteredProblems.filter(problem => (
            problem.rating > 2100
        ));

        if (!filteredProblems.length) {
            console.error('No suitable problems found after filtering.');
            return;
        }

        // Select a random problem from the filtered list
        const easyListIndex = Math.floor(Math.random() * easyProblems.length);
        const easyProblem = easyProblems[easyListIndex];
        const { name: easyName, contestId: easyContestId, index: easyIndex, tags: easyProblemTags, rating: easyRating } = easyProblem;

        const mediumListIndex = Math.floor(Math.random() * mediumProblems.length);
        const mediumProblem = mediumProblems[mediumListIndex];
        const { name: mediumName, contestId: mediumContestId, index: mediumIndex, tags: mediumProblemTags, rating: mediumRating } = mediumProblem;

        const hardListIndex = Math.floor(Math.random() * hardProblems.length);
        const hardProblem = hardProblems[hardListIndex];
        const { name: hardName, contestId: hardContestId, index: hardIndex, tags: hardProblemTags, rating: hardRating } = hardProblem;

        // Create an embed message
        const easyProblemEmbed = new EmbedBuilder()
            .setColor(0x00FF55)
            .setThumbnail('https://sta.codeforces.com/s/76530/images/codeforces-telegram-square.png')
            .setTitle("Easy Problem: " + easyName)
            .addFields(
                { name: 'From', value: `${easyContestId}${easyIndex}` },
                { name: 'Tags', value: `||${easyProblemTags.join(', ')}||` },
                { name: 'Difficulty', value: `||${easyRating}||` },
            )
            .setURL(`http://codeforces.com/contest/${easyContestId}/problem/${easyIndex}`)
            .setFooter({ text: `Daily Easy Problem | ${new Date().toLocaleDateString()}` });

        const mediumProblemEmbed = new EmbedBuilder()
            .setColor(0xFFDD00)
            .setThumbnail('https://sta.codeforces.com/s/76530/images/codeforces-telegram-square.png')
            .setTitle("Medium Problem: " + mediumName)
            .addFields(
                { name: 'From', value: `${mediumContestId}${mediumIndex}` },
                { name: 'Tags', value: `||${mediumProblemTags.join(', ')}||` },
                { name: 'Difficulty', value: `||${mediumRating}||` },
            )
            .setURL(`http://codeforces.com/contest/${mediumContestId}/problem/${mediumIndex}`)
            .setFooter({ text: `Daily Medium Problem | ${new Date().toLocaleDateString()}` });

        const hardProblemEmbed = new EmbedBuilder()
            .setColor(0xFF0033)
            .setThumbnail('https://sta.codeforces.com/s/76530/images/codeforces-telegram-square.png')
            .setTitle("Hard Problem: " + hardName)
            .addFields(
                { name: 'From', value: `${hardContestId}${hardIndex}` },
                { name: 'Tags', value: `||${hardProblemTags.join(', ')}||` },
                { name: 'Difficulty', value: `||${hardRating}||` },
            )
            .setURL(`http://codeforces.com/contest/${hardContestId}/problem/${hardIndex}`)
            .setFooter({ text: `Daily Hard Problem | ${new Date().toLocaleDateString()}` });

        const todayDate = `Today's Date: ${new Date().toLocaleDateString()}`;
        if (message) {
            message.channel.send(todayDate);
            message.channel.send({ embeds: [easyProblemEmbed, mediumProblemEmbed, hardProblemEmbed] });
        } else {
            const dailyChannel = client.channels.cache.get(process.env.DAILY_CHANNEL_ID);
            if (dailyChannel) {
                dailyChannel.send(todayDate);
                dailyChannel.send({ embeds: [easyProblemEmbed, mediumProblemEmbed, hardProblemEmbed] });
            } else {
                console.error('Daily channel not found. Please check DAILY_CHANNEL_ID environment variable.');
            }
        }
    }).catch(error => {
        console.error('Error fetching or sending daily problem:', error);
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Sends daily problems'),

    initialize(client) {
        // Schedule the task to run every day at a specific time (e.g., 09:00 AM)
        cron.schedule('0 9 * * *', () => { // Runs at 09:00 AM server time
            sendDailyProblems(client, null);
        }, {
            timezone: "UTC" // Replace with your timezone, e.g., "Asia/Taipei"
        });

        console.log('Daily problem scheduler initialized.');
    },

    async execute(interaction) {
        const message = interaction; // Preserve compatibility with existing code
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply('You do not have permission to run this command.');
        }
        sendDailyProblems(interaction.client, interaction);
    }
};
