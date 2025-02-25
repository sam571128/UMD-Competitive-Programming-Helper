const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { saveData, getData, removeData } = require('../services/database.js');
const { sendDailyProblems } = require('./daily.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('checkin')
        .setDescription('Check in your daily problem solving progress')
        .addStringOption(option =>
            option.setName('difficulty')
                .setDescription('The difficulty of the problem you solved')
                .setRequired(true)
                .addChoices(
                    { name: 'Easy', value: 'easy' },
                    { name: 'Medium', value: 'medium' },
                    { name: 'Hard', value: 'hard' },
                )),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            
            const userId = interaction.user.id;
            const difficulty = interaction.options.getString('difficulty');
            const today = new Date().toLocaleDateString();
            
            // Get today's problems
            let dailyProblems = await getData(`daily_problems_${today}`);
            
            // If no problems for today, generate them first
            if (!dailyProblems) {
                try {
                    await sendDailyProblems(interaction.client);
                    dailyProblems = await getData(`daily_problems_${today}`);
                    
                    if (!dailyProblems) {
                        throw new Error('Failed to generate daily problems');
                    }
                } catch (error) {
                    console.error('Error generating daily problems:', error);
                    await interaction.editReply('Sorry, there was an error generating today\'s problems. Please try again or contact an administrator.');
                    return;
                }
            }

            // Verify the problem exists for the selected difficulty
            if (!dailyProblems[difficulty] || !dailyProblems[difficulty].rating) {
                await interaction.editReply(`Sorry, there was an error with today's ${difficulty} problem. Please try again or contact an administrator.`);
                return;
            }

            // Get the rating for the selected difficulty
            const rating = dailyProblems[difficulty].rating;
            
            // Get user's stats
            const userKey = `user_stats_${userId}`;
            let userStats = await getData(userKey) || {
                totalEasy: 0,
                totalMedium: 0,
                totalHard: 0,
                lastCheckin: null,
                streakCount: 0,
                dailyCheckins: {},
                ratingFrequency: {},
                dailyRatings: {},
                difficultyRatings: {
                    easy: [],
                    medium: [],
                    hard: []
                }
            };

            // Ensure all required objects exist
            userStats.dailyCheckins = userStats.dailyCheckins || {};
            userStats.ratingFrequency = userStats.ratingFrequency || {};
            userStats.dailyRatings = userStats.dailyRatings || {};
            userStats.difficultyRatings = userStats.difficultyRatings || {
                easy: [],
                medium: [],
                hard: []
            };

            // Initialize dailyCheckins for today if it's a new day
            if (userStats.lastCheckin !== today) {
                userStats.dailyCheckins = {};
            }

            // Check if user already checked in this difficulty today
            if (userStats.dailyCheckins[today]?.includes(difficulty)) {
                await interaction.editReply(`You have already checked in a ${difficulty} problem today! Try a different difficulty or come back tomorrow! 😊`);
                return;
            }

            // Initialize arrays for today if they don't exist
            if (!userStats.dailyCheckins[today]) {
                userStats.dailyCheckins[today] = [];
            }
            if (!userStats.dailyRatings[today]) {
                userStats.dailyRatings[today] = [];
            }

            // Add this difficulty and rating to today's check-ins
            userStats.dailyCheckins[today].push(difficulty);
            userStats.dailyRatings[today].push({
                difficulty,
                rating,
                problem: `${dailyProblems[difficulty].contestId}${dailyProblems[difficulty].index}`
            });

            // Ensure arrays exist before pushing
            if (!userStats.difficultyRatings[difficulty]) {
                userStats.difficultyRatings[difficulty] = [];
            }

            // Update stats based on difficulty
            switch (difficulty) {
                case 'easy':
                    userStats.totalEasy = (userStats.totalEasy || 0) + 1;
                    userStats.difficultyRatings.easy.push(rating);
                    break;
                case 'medium':
                    userStats.totalMedium = (userStats.totalMedium || 0) + 1;
                    userStats.difficultyRatings.medium.push(rating);
                    break;
                case 'hard':
                    userStats.totalHard = (userStats.totalHard || 0) + 1;
                    userStats.difficultyRatings.hard.push(rating);
                    break;
            }

            // Update rating frequency map
            // Group ratings into ranges of 100
            const ratingRange = Math.floor(rating / 100) * 100;
            userStats.ratingFrequency[ratingRange] = (userStats.ratingFrequency[ratingRange] || 0) + 1;

            // Update streak only if it's a new day
            if (userStats.lastCheckin !== today) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toLocaleDateString();
                
                if (userStats.lastCheckin === yesterdayStr) {
                    userStats.streakCount = (userStats.streakCount || 0) + 1;
                } else {
                    userStats.streakCount = 1;
                }
            }

            userStats.lastCheckin = today;
            
            // Save updated stats
            try {
                await saveData(userKey, userStats);
            } catch (error) {
                console.error('Error saving user stats:', error);
                await interaction.editReply('Your check-in was recorded but there was an error saving your stats. Please try again or contact an administrator.');
                return;
            }

            // Calculate average rating for this difficulty
            const difficultyRatings = userStats.difficultyRatings[difficulty] || [];
            const avgRating = difficultyRatings.length > 0 
                ? Math.round(difficultyRatings.reduce((a, b) => a + b, 0) / difficultyRatings.length)
                : rating;

            // Create response embed
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('Check-in Successful! 🎉')
                .setDescription(
                    `You've checked in today's ${difficulty} problem (rated ${rating})!\n` +
                    `Problem: ${dailyProblems[difficulty].contestId}${dailyProblems[difficulty].index}\n\n` +
                    `Today's Progress:\n` +
                    userStats.dailyRatings[today].map(prob => 
                        `✅ ${prob.difficulty} (${prob.rating}) - ${prob.problem}`
                    ).join('\n')
                )
                .addFields(
                    { name: 'Total Easy Problems', value: userStats.totalEasy?.toString() || '0', inline: true },
                    { name: 'Total Medium Problems', value: userStats.totalMedium?.toString() || '0', inline: true },
                    { name: 'Total Hard Problems', value: userStats.totalHard?.toString() || '0', inline: true },
                    { name: 'Current Streak', value: `${userStats.streakCount || 0} day(s) 🔥`, inline: true },
                    { name: `Average ${difficulty} Rating`, value: avgRating.toString(), inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in checkin command:', error);
            await interaction.editReply('Sorry, something went wrong. Please try again or contact an administrator.');
        }
    },
};
