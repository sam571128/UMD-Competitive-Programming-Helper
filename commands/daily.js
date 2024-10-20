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
                    problem.rating >= 800 &&
                    problem.rating <= 3500 &&
                    !problem.tags.includes('*special') &&
                    problem.tags.length > 0
                ));

                if (!filteredProblems.length) {
                    console.error('No suitable problems found after filtering.');
                    return;
                }

                // Select a random problem from the filtered list
                const randomIndex = Math.floor(Math.random() * filteredProblems.length);
                const selectedProblem = filteredProblems[randomIndex];

                const { name, contestId, index, tags: problemTags, rating } = selectedProblem;

                // Create an embed message
                const problemEmbed = new EmbedBuilder()
                    .setColor(0x00FF55)
                    .setThumbnail('https://sta.codeforces.com/s/76530/images/codeforces-telegram-square.png')
                    .setTitle(name)
                    .addFields(
                        { name: 'From', value: `${contestId}${index}` },
                        { name: 'Tags', value: `||${problemTags.join(', ')}||` },
                        { name: 'Difficulty', value: `||${rating}||` },
                    )
                    .setURL(`http://codeforces.com/contest/${contestId}/problem/${index}`)
                    .setFooter({ text: `Daily Problem | ${new Date().toLocaleDateString()}` });

                // Fetch the channel and send the embed
                const channel = client.channels.cache.get(DAILY_CHANNEL_ID);
                if (!channel) {
                    console.error(`Channel with ID ${DAILY_CHANNEL_ID} not found.`);
                    return;
                }

                await channel.send({ embeds: [problemEmbed] });
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
