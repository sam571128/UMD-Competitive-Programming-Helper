// discord-bot/commands/daily.js

const { EmbedBuilder } = require('discord.js');
const { getProblem } = require('./fetch/cfAPI.js');
const { saveData, getData } = require('./database/data.js');
const cron = require('node-cron');
require('dotenv').config();

// Option 1: Specify the channel ID directly
const DAILY_CHANNEL_ID = '1278476936057983127';

// Option 2: Use an environment variable for the channel ID
// const DAILY_CHANNEL_ID = process.env.DAILY_CHANNEL_ID;

module.exports = {
    // This function initializes the daily problem scheduler
    initialize: (client) => {
        // Schedule the task to run every day at a specific time (e.g., 09:00 AM)
        cron.schedule('0 9 * * *', async () => { // Runs at 09:00 AM server time
            try {
                // Fetch a random problem without any specific tags
                const tags = [];
                const body = await getProblem(tags);
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

                const easyProblems = filteredProblems.filter(probelm => (
                    problem.rating <= 1400
                ));

                const mediumProblems = filteredProblems.filter(probelm => (
                    problem.rating > 1400 &&
                    problem.rating <= 2100
                ));

                const hardProblems = filteredProblems.filter(probelm => (
                    problem.rating > 2100
                ));

                if (!filteredProblems.length) {
                    console.error('No suitable problems found after filtering.');
                    return;
                }

                // Select a random problem from the filtered list
                const easyListIndex = Math.floor(Math.random() * easyProblems.length);
                const easyProblem = easyProblems[easyListIndex];
                const { easyName, easyContestId, easyIndex, tags: easyProblemTags, easyRating } = easyProblem;

                const mediumListIndex = Math.floor(Math.random() * mediumProblems.length);
                const mediumProblem = mediumProblems[mediumListIndex];
                const { mediumName, mediumContestId, mediumIndex, tags: mediumProblemTags, mediumRating } = mediumProblem;

                const hardListIndex = Math.floor(Math.random() * hardProblems.length);
                const hardProblem = hardProblems[hardListIndex];
                const { hardName, hardContestId, hardIndex, tags: hardProblemTags, hardRating } = hardProblem;

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

                

                // Fetch the channel and send the embed
                const channel = client.channels.cache.get(DAILY_CHANNEL_ID);
                if (!channel) {
                    console.error(`Channel with ID ${DAILY_CHANNEL_ID} not found.`);
                    return;
                }

                await channel.send({ embeds: [easyProblemEmbed, mediumProblemEmbed, hardProblemEmbed] });
                console.log(`Daily problem sent to channel ${DAILY_CHANNEL_ID}`);

            } catch (error) {
                console.error('Error fetching or sending daily problem:', error);
            }
        }, {
            timezone: "UTC" // Replace with your timezone, e.g., "Asia/Taipei"
        });

        console.log('Daily problem scheduler initialized.');
    }
};
