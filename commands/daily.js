// discord-bot/commands/daily.js

const { SlashCommandBuilder, EmbedBuilder  } = require('discord.js');

const { getProblem } = require('./fetch/cfAPI.js');
const { saveData, getData, removeData } = require('./database/data.js');
const cron = require('node-cron');
require('dotenv').config();

// Function to send daily problems. If 'message' is provided, it sends to that channel (command triggered). Otherwise, it sends to the default daily channel (cron trigger).
async function sendDailyProblems(client, message) {
    const today = new Date().toLocaleDateString();
    
    // Check if we already have problems for today
    const dailyProblems = await getData(`daily_problems_${today}`);
    console.log(dailyProblems);
    if (dailyProblems) {
        // If we have problems, create new embeds from the stored data
        const { easy, medium, hard } = dailyProblems;
        
        const easyProblemEmbed = new EmbedBuilder()
            .setColor(0x00FF55)
            .setThumbnail('https://sta.codeforces.com/s/76530/images/codeforces-telegram-square.png')
            .setTitle("Easy Problem: " + easy.name)
            .addFields(
                { name: 'From', value: `${easy.contestId}${easy.index}` },
                { name: 'Tags', value: `||${easy.tags.join(', ')}||` },
                { name: 'Difficulty', value: `||${easy.rating}||` },
            )
            .setURL(`http://codeforces.com/contest/${easy.contestId}/problem/${easy.index}`)
            .setFooter({ text: `Daily Easy Problem | ${today}` });

        const mediumProblemEmbed = new EmbedBuilder()
            .setColor(0xFFDD00)
            .setThumbnail('https://sta.codeforces.com/s/76530/images/codeforces-telegram-square.png')
            .setTitle("Medium Problem: " + medium.name)
            .addFields(
                { name: 'From', value: `${medium.contestId}${medium.index}` },
                { name: 'Tags', value: `||${medium.tags.join(', ')}||` },
                { name: 'Difficulty', value: `||${medium.rating}||` },
            )
            .setURL(`http://codeforces.com/contest/${medium.contestId}/problem/${medium.index}`)
            .setFooter({ text: `Daily Medium Problem | ${today}` });

        const hardProblemEmbed = new EmbedBuilder()
            .setColor(0xFF0033)
            .setThumbnail('https://sta.codeforces.com/s/76530/images/codeforces-telegram-square.png')
            .setTitle("Hard Problem: " + hard.name)
            .addFields(
                { name: 'From', value: `${hard.contestId}${hard.index}` },
                { name: 'Tags', value: `||${hard.tags.join(', ')}||` },
                { name: 'Difficulty', value: `||${hard.rating}||` },
            )
            .setURL(`http://codeforces.com/contest/${hard.contestId}/problem/${hard.index}`)
            .setFooter({ text: `Daily Hard Problem | ${today}` });

        const todayDate = `Today's Date: ${today}`;
        if (message) {
            message.channel.send(todayDate);
            message.channel.send({ embeds: [easyProblemEmbed, mediumProblemEmbed, hardProblemEmbed] });
        } else {
            const channel = client.channels.cache.get(process.env.DAILY_CHANNEL_ID);
            if (channel) {
                channel.send(todayDate);
                channel.send({ embeds: [easyProblemEmbed, mediumProblemEmbed, hardProblemEmbed] });
            }
        }
        return;
    }

    // If no problems exist for today, fetch new ones
    const tags = [];
    getProblem(tags).then(async body => {
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

        // Store only the essential problem data
        const problemData = {
            easy: {
                name: easyName,
                contestId: easyContestId,
                index: easyIndex,
                tags: easyProblemTags,
                rating: easyRating
            },
            medium: {
                name: mediumName,
                contestId: mediumContestId,
                index: mediumIndex,
                tags: mediumProblemTags,
                rating: mediumRating
            },
            hard: {
                name: hardName,
                contestId: hardContestId,
                index: hardIndex,
                tags: hardProblemTags,
                rating: hardRating
            }
        };

        // Save the problem data
        await saveData(`daily_problems_${today}`, problemData);

        // Create embeds from the data
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
            .setFooter({ text: `Daily Easy Problem | ${today}` });

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
            .setFooter({ text: `Daily Medium Problem | ${today}` });

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
            .setFooter({ text: `Daily Hard Problem | ${today}` });

        const todayDate = `Today's Date: ${today}`;
        if (message) {
            message.channel.send(todayDate);
            message.channel.send({ embeds: [easyProblemEmbed, mediumProblemEmbed, hardProblemEmbed] });
        } else {
            const channel = client.channels.cache.get(process.env.DAILY_CHANNEL_ID);
            if (channel) {
                channel.send(todayDate);
                channel.send({ embeds: [easyProblemEmbed, mediumProblemEmbed, hardProblemEmbed] });
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
        // Schedule the task to run every day at 9:00 AM New York time
        cron.schedule('0 9 * * *', () => {
            sendDailyProblems(client, null);
        }, {
            timezone: "America/New_York"
        });

        console.log('Daily problem scheduler initialized (9:00 AM EST/EDT).');
    },

    async execute(interaction) {
        const message = interaction; // Preserve compatibility with existing code
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply('You do not have permission to run this command.');
        }
        sendDailyProblems(interaction.client, interaction);
    }
};
