const { SlashCommandBuilder } = require('discord.js');
const { saveData, getData } = require('../services/database.js');

module.exports = {
    data : new SlashCommandBuilder()
         .setName('daily_lb_reg')
         .setDescription('Register for the Daily Problem Leaderboard'),
          
    async execute(interaction) {
        await interaction.deferReply();
        const user = interaction.user.id;
        const username = interaction.user.displayName || interaction.user.username || interaction.user.tag;

        try {
            const handle = await getData(user);
            if(handle === undefined) {
                await interaction.editReply(`You are not registered with the bot! Use the /cf_reg command to register first.`);
                return;
            }
        } catch (e) {
            await interaction.editReply("There is an error with the database, please contact Sam");
            return;
        }

        const users_key = 'DAILY_LB_USERS';
        const username_key_prefix = 'DLBU_UNAME_';

        await saveData(username_key_prefix + user, username);

        let curr_list = await getData(users_key);
        if (!Array.isArray(curr_list)) curr_list = [];
        
        if (!curr_list.includes(user)) {
            const new_list = [...curr_list, user];
            await saveData(users_key, new_list);
        }

        await interaction.editReply("Successfully Registered!");
    },
}
