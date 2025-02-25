const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getData } = require('../services/database.js');

function getAchievementBadge(total) {
    if (total >= 100) return '🏆'; // Trophy for 100+ problems
    if (total >= 50) return '🌟'; // Star for 50+ problems
    if (total >= 25) return '🥈'; // Silver for 25+ problems
    if (total >= 10) return '🥉'; // Bronze for 10+ problems
    return '🎯'; // Target for getting started
}

function getMotivationalMessage(stats) {
    const total = stats.totalEasy + stats.totalMedium + stats.totalHard;
    const messages = [
        `Keep pushing! Every problem solved is a step forward! 💪`,
        `You're on fire! ${stats.streakCount} days and counting! 🔥`,
        `Consistency is key! You're building great habits! 🗝️`,
        `Rome wasn't built in a day, and neither is coding mastery! 🏛️`,
        `Small steps every day lead to big achievements! 🚀`
    ];
    return messages[Math.floor(Math.random() * messages.length)];
}

function getDifficultyRating(easy, medium, hard) {
    const total = easy + medium + hard;
    if (total === 0) return "Getting Started 🌱";
    if (hard > medium && hard > easy) return "Hard Mode Warrior ⚔️";
    if (medium > easy) return "Balanced Achiever 🎭";
    return "Foundation Builder 🏗️";
}

function getDifficultyGoals(count) {
    // Base goal is 10
    const baseGoal = 10;
    
    // Use logarithmic growth for a smooth progression
    // Formula: goal = baseGoal * (1 + log(current/baseGoal + 1) * factor)
    // This creates a curve that grows faster at first and then slows down
    const factor = 2;
    
    if (count < baseGoal) {
        return { goal: baseGoal, barSize: 8 };
    }

    const nextGoal = Math.ceil(baseGoal * (1 + Math.log(count/baseGoal + 1) * factor));
    
    // Bar size also grows logarithmically but more slowly
    const barSize = Math.min(20, Math.floor(8 + Math.log(count/baseGoal + 1) * 4));
    
    return { 
        goal: nextGoal, 
        barSize: barSize
    };
}

function createProgressBar(count, difficulty) {
    const { goal, barSize } = getDifficultyGoals(count);
    // Use Math.ceil instead of Math.floor for a more encouraging progress display
    const progress = Math.min(Math.ceil((count / goal) * barSize), barSize);
    
    let emoji;
    switch(difficulty) {
        case 'easy':
            emoji = '🟩';
            break;
        case 'medium':
            emoji = '🟨';
            break;
        case 'hard':
            emoji = '🟥';
            break;
    }
    
    const progressBar = emoji.repeat(progress) + '⬜'.repeat(Math.max(0, barSize - progress));
    // Also ceil the percentage for consistency
    const percentage = Math.min(Math.ceil((count / goal) * 100), 100);
    
    // Add a sparkle emoji when close to goal (>80%)
    const closeToGoal = percentage >= 80 ? ' ✨' : '';
    
    return {
        bar: progressBar + closeToGoal,
        goal,
        percentage
    };
}

function calculateAverageRatings(difficultyRatings = {}) {
    // Initialize default structure if not present
    const ratings = {
        easy: difficultyRatings?.easy || [],
        medium: difficultyRatings?.medium || [],
        hard: difficultyRatings?.hard || []
    };

    const result = {
        easy: { avg: 0, count: 0 },
        medium: { avg: 0, count: 0 },
        hard: { avg: 0, count: 0 }
    };

    for (const [diff, ratingArray] of Object.entries(ratings)) {
        if (ratingArray && ratingArray.length > 0) {
            result[diff].avg = Math.round(ratingArray.reduce((a, b) => a + b, 0) / ratingArray.length);
            result[diff].count = ratingArray.length;
        }
    }

    return result;
}

function getRatingEmoji(rating) {
    if (rating >= 2100) return '🔥'; // Expert
    if (rating >= 1900) return '💎'; // Advanced
    if (rating >= 1600) return '🌟'; // Intermediate
    if (rating >= 1200) return '🎯'; // Regular
    return '🌱'; // Beginner
}

function formatRatingStats(avgRatings) {
    const lines = [];
    for (const [diff, stats] of Object.entries(avgRatings)) {
        if (stats.count > 0) {
            lines.push(`${diff.charAt(0).toUpperCase() + diff.slice(1)}: ${stats.avg} ${getRatingEmoji(stats.avg)} (${stats.count} solved)`);
        } else {
            lines.push(`${diff.charAt(0).toUpperCase() + diff.slice(1)}: No problems solved yet`);
        }
    }
    return lines.join('\n');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View your problem-solving statistics'),

    async execute(interaction) {
        await interaction.deferReply();
        
        const userId = interaction.user.id;
        const today = new Date().toLocaleDateString();
        
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

        // Ensure difficultyRatings exists and has correct structure
        if (!userStats.difficultyRatings) {
            userStats.difficultyRatings = {
                easy: [],
                medium: [],
                hard: []
            };
        }

        const totalProblems = userStats.totalEasy + userStats.totalMedium + userStats.totalHard;
        const todayProgress = userStats.dailyCheckins[today] || [];
        
        // Calculate some fun statistics
        const averagePerDay = totalProblems / Math.max(userStats.streakCount, 1);
        const difficultyRating = getDifficultyRating(userStats.totalEasy, userStats.totalMedium, userStats.totalHard);

        // Calculate average ratings for each difficulty
        const avgRatings = calculateAverageRatings(userStats.difficultyRatings);
        
        // Create progress bars with goals
        const easyProgress = createProgressBar(userStats.totalEasy, 'easy');
        const mediumProgress = createProgressBar(userStats.totalMedium, 'medium');
        const hardProgress = createProgressBar(userStats.totalHard, 'hard');

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(`${interaction.user.username}'s Coding Journey ${getAchievementBadge(totalProblems)}`)
            .setDescription(getMotivationalMessage(userStats))
            .addFields(
                { 
                    name: '📊 Problem Solving Progress', 
                    value: 
                        `Easy:    ${easyProgress.bar} ${userStats.totalEasy}/${easyProgress.goal} (${easyProgress.percentage}%)\n` +
                        `Medium:  ${mediumProgress.bar} ${userStats.totalMedium}/${mediumProgress.goal} (${mediumProgress.percentage}%)\n` +
                        `Hard:    ${hardProgress.bar} ${userStats.totalHard}/${hardProgress.goal} (${hardProgress.percentage}%)\n`,
                    inline: false 
                },
                { 
                    name: '📈 Average Ratings', 
                    value: formatRatingStats(avgRatings),
                    inline: false 
                },
                { 
                    name: '🎯 Today\'s Progress', 
                    value: todayProgress.length > 0 
                        ? todayProgress.map(diff => `✅ ${diff}`).join('\n')
                        : "No problems solved yet today! Time to code! 💻",
                    inline: true 
                },
                { 
                    name: '🏅 Statistics', 
                    value: 
                        `Total Problems: ${totalProblems}\n` +
                        `Current Streak: ${userStats.streakCount} day(s) 🔥\n` +
                        `Avg. Per Day: ${averagePerDay.toFixed(1)} 📈\n` +
                        `Style: ${difficultyRating}`,
                    inline: true 
                }
            )
            .setFooter({ text: 'Keep coding, keep growing! 🌱' })
            .setTimestamp();

        // Add next milestone message
        const nextMilestone = Math.ceil(totalProblems / 10) * 10;
        if (nextMilestone > totalProblems) {
            embed.addFields({
                name: '🎯 Next Milestone',
                value: `${nextMilestone - totalProblems} more problems until ${nextMilestone}! You can do it! 💪`,
                inline: false
            });
        }

        // Add special celebration for milestones
        if (totalProblems > 0 && totalProblems % 10 === 0) {
            embed.addFields({
                name: '🎉 Milestone Achieved!',
                value: `Congratulations on solving ${totalProblems} problems! Here's to many more! 🎊`,
                inline: false
            });
        }

        await interaction.editReply({ embeds: [embed] });
    },
};
