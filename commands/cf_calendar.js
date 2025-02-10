const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const { getUserSubmission } = require('./fetch/cfAPI.js');
const { getData } = require('./database/data.js');

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

async function getSubmissions(handle) {
    try {
        const response = await getUserSubmission(handle);
        if (response.status === 'OK') {
            return response.result;
        }
        throw new Error('Failed to fetch submissions');
    } catch (error) {
        console.error('Error fetching submissions:', error);
        throw error;
    }
}

function filterSubmissionsByMonth(submissions, year, month) {
    return submissions.filter(sub => {
        const subDate = new Date(sub.creationTimeSeconds * 1000);
        return subDate.getFullYear() === year && 
               subDate.getMonth() === month && 
               sub.verdict === 'OK';
    });
}

function createCalendarEmbed(submissions, year, month, handle) {
    const daysInMonth = getDaysInMonth(year, month);
    const monthName = new Date(year, month).toLocaleString('default', { month: 'long' });
    
    // Filter submissions for the specified month
    const monthSubmissions = filterSubmissionsByMonth(submissions, year, month);
    
    // Initialize calendar data
    const calendarData = {};
    for (let day = 1; day <= daysInMonth; day++) {
        calendarData[day] = {
            problems: [],
            ratings: []
        };
    }

    // Process submissions
    monthSubmissions.forEach(sub => {
        const subDate = new Date(sub.creationTimeSeconds * 1000);
        const day = subDate.getDate();
        if (!calendarData[day].problems.includes(sub.problem.name)) {
            calendarData[day].problems.push(sub.problem.name);
            if (sub.problem.rating) {
                calendarData[day].ratings.push(sub.problem.rating);
            }
        }
    });

    // Create calendar display
    let calendarStr = '```\n';
    calendarStr += `${monthName} ${year} Problem Calendar\n\n`;
    calendarStr += 'Su Mo Tu We Th Fr Sa\n';

    const firstDay = new Date(year, month, 1).getDay();
    let currentDay = 1;
    
    // Add initial spaces with XX for non-existent dates
    for (let i = 0; i < firstDay; i++) {
        calendarStr += 'XX ';
    }

    // Fill in the days with problem counts
    while (currentDay <= daysInMonth) {
        const dayStats = calendarData[currentDay];
        const problemCount = dayStats.problems.length;
        
        // Format problem count as 2 digits (01, 02, ..., 99)
        const countStr = problemCount.toString().padStart(2, '0');
        calendarStr += countStr;

        if ((firstDay + currentDay) % 7 === 0 || currentDay === daysInMonth) {
            calendarStr += '\n';
        } else {
            calendarStr += ' ';
        }
        
        currentDay++;
    }

    // Fill remaining spaces in last week with XX
    const lastDayPosition = (firstDay + daysInMonth - 1) % 7;
    if (lastDayPosition !== 6) {
        for (let i = lastDayPosition + 1; i <= 6; i++) {
            calendarStr += 'XX ';
        }
        calendarStr += '\n';
    }
    
    calendarStr += '```';

    // Calculate monthly statistics
    const allRatings = Object.values(calendarData)
        .flatMap(day => day.ratings)
        .filter(rating => rating > 0);
    
    const totalProblems = Object.values(calendarData)
        .reduce((sum, day) => sum + day.problems.length, 0);
    
    const avgRating = allRatings.length > 0
        ? Math.round(allRatings.reduce((a, b) => a + b, 0) / allRatings.length)
        : 0;
    
    const maxRating = allRatings.length > 0 ? Math.max(...allRatings) : 0;
    const minRating = allRatings.length > 0 ? Math.min(...allRatings) : 0;

    const activeDays = Object.values(calendarData)
        .filter(day => day.problems.length > 0).length;
    
    const streakDays = getMaxStreak(calendarData);

    const embed = new EmbedBuilder()
        .setColor('#FF4500')
        .setTitle(`🏆 ${handle}'s Problem Solving Stats`)
        .setDescription(calendarStr)
        .addFields(
            {
                name: '📊 Monthly Overview',
                value: [
                    `Total Problems: **${totalProblems}**`,
                    `Active Days: **${activeDays}/${daysInMonth}**`,
                    `Best Streak: **${streakDays}** days`,
                ].join('\n'),
                inline: true
            },
            {
                name: '📈 Rating Stats',
                value: [
                    `Average: **${avgRating}**`,
                    `Highest: **${maxRating}**`,
                    `Lowest: **${minRating}**`,
                ].join('\n'),
                inline: true
            }
        )
        .setTimestamp();

    return embed;
}

function createComponents(currentYear, currentMonth) {
    // Create month select menu
    const monthSelect = new StringSelectMenuBuilder()
        .setCustomId('month')
        .setPlaceholder('Select Month')
        .addOptions(
            Array.from({ length: 12 }, (_, i) => ({
                label: new Date(2000, i).toLocaleString('default', { month: 'long' }),
                value: i.toString(),
                default: i === currentMonth
            }))
        );

    // Create year select menu (5 years before and after current year)
    const yearSelect = new StringSelectMenuBuilder()
        .setCustomId('year')
        .setPlaceholder('Select Year')
        .addOptions(
            Array.from({ length: 11 }, (_, i) => {
                const year = currentYear - 5 + i;
                return {
                    label: year.toString(),
                    value: year.toString(),
                    default: year === currentYear
                };
            })
        );

    // Create action rows
    const monthRow = new ActionRowBuilder().addComponents(monthSelect);
    const yearRow = new ActionRowBuilder().addComponents(yearSelect);

    return [monthRow, yearRow];
}

function getMaxStreak(calendarData) {
    let currentStreak = 0;
    let maxStreak = 0;
    
    for (let day = 1; day <= Object.keys(calendarData).length; day++) {
        if (calendarData[day].problems.length > 0) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
        } else {
            currentStreak = 0;
        }
    }
    
    return maxStreak;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cf_calendar')
        .setDescription('Shows your Codeforces solved problems in a calendar view')
        .addIntegerOption(option =>
            option.setName('year')
                .setDescription('Year to show (defaults to current year)')
                .setMinValue(2000)
                .setMaxValue(2100)
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('month')
                .setDescription('Month to show (1-12, defaults to current month)')
                .setMinValue(1)
                .setMaxValue(12)
                .setRequired(false)),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            
            const discordId = interaction.user.id;
            const handle = await getData(`${discordId}`);
            
            if (!handle) {
                return interaction.editReply('Please register your Codeforces handle first using /cf_reg');
            }

            const now = new Date();
            const year = interaction.options.getInteger('year') || now.getFullYear();
            const month = (interaction.options.getInteger('month') || now.getMonth() + 1) - 1; // Convert 1-12 to 0-11

            try {
                const submissions = await getSubmissions(handle);
                const embed = createCalendarEmbed(submissions, year, month, handle);
                const components = createComponents(year, month);
                
                await interaction.editReply({
                    embeds: [embed],
                    components: components
                });
            } catch (error) {
                console.error('Error fetching Codeforces data:', error);
                await interaction.editReply({
                    content: 'Failed to fetch Codeforces submissions. Please try again later.',
                    components: []
                });
            }
        } catch (error) {
            console.error('Error executing command:', error);
            try {
                await interaction.editReply('An error occurred while executing the command. Please try again later.');
            } catch (e) {
                console.error('Failed to send error message:', e);
                try {
                    await interaction.followUp({
                        content: 'There was an error processing your request. Please try the command again.',
                        ephemeral: true
                    });
                } catch (e2) {
                    console.error('Failed to send follow-up error message:', e2);
                }
            }
        }
    },

    async handleInteraction(interaction) {
        if (!interaction.isStringSelectMenu()) return;

        try {
            // Defer the update immediately
            await interaction.deferUpdate();

            const discordId = interaction.user.id;
            const handle = await getData(`${discordId}`);
            
            if (!handle) {
                return interaction.editReply({ 
                    content: 'Please register your Codeforces handle first using /cf_reg',
                    ephemeral: true 
                });
            }

            // Get current year and month from the components
            let year = parseInt(interaction.message.components[1].components[0].values?.[0] || interaction.message.components[1].components[0].options.find(opt => opt.default)?.value || new Date().getFullYear());
            let month = parseInt(interaction.message.components[0].components[0].values?.[0] || '0');

            if (interaction.customId === 'month') {
                month = parseInt(interaction.values[0]);
            } else if (interaction.customId === 'year') {
                year = parseInt(interaction.values[0]);
            }

            try {
                const submissions = await getSubmissions(handle);
                const embed = createCalendarEmbed(submissions, year, month, handle);
                const components = createComponents(year, month);
                
                await interaction.editReply({
                    embeds: [embed],
                    components: components
                });
            } catch (error) {
                console.error('Error fetching Codeforces data:', error);
                await interaction.editReply({
                    content: 'Failed to fetch Codeforces submissions. Please try again later.',
                    components: interaction.message.components
                });
            }
        } catch (error) {
            console.error('Error handling interaction:', error);
            // If we can't defer the update, the interaction might have expired
            // Try to send a new message instead
            try {
                await interaction.followUp({
                    content: 'There was an error processing your request. Please try the command again.',
                    ephemeral: true
                });
            } catch (e) {
                console.error('Failed to send error message:', e);
            }
        }
    }
};
