const { SlashCommandBuilder, EmbedBuilder  } = require('discord.js');

const { getProblem, getUser, getUserSubmission } = require('./fetch/cfAPI.js');

const { saveData, getData } = require('./database/data.js');
const { get } = require('node:http');

const wait = require('node:timers/promises').setTimeout;

module.exports = {
    data : new SlashCommandBuilder()
         .setName('cf_reg')
         .setDescription('Register your codeforces handle for the Bot')
         .addStringOption(option =>
			option
				.setName('handle')
				.setDescription('Input Codeforces Handle')),
          
    async execute(interaction) {
        await interaction.deferReply();  
        const handle = interaction.options.getString('handle');
        const user = interaction.user.id;

        try {
            const checkUser = await getUser(handle);
            if(checkUser.status === 'FAILED'){
                interaction.editReply("The username does not exist")
                return;
            }
        } catch (e) {
            interaction.editReply("Codeforces API is not working, please try later");
            return;
        }

        try {
            const checkDataBase = await getData(user);
            if(checkDataBase != undefined) {
                interaction.editReply(`You connected to an account before!`);
                return;
            }
        } catch (e) {
            interaction.editReply("There is an error with the database, please contact Sam");
            return;
        }

        let p;

        try {
            const empty_tag = [];
            const getproblem = await getProblem(empty_tag);
            let result = getproblem.result;
            
            const { problems } = result;
            
            let r = Math.round(Math.random()*(problems.length-1));
            const { contestId, index } = problems[r];
            p = problems[r];
            

            const embedFooter = `User: ${interaction.user.tag}`;
            const ProblemEmbed = new EmbedBuilder()
                .setColor(0x00FF55)
                .setThumbnail('https://sta.codeforces.com/s/76530/images/codeforces-telegram-square.png')
                .setTitle("Codeforces Handle Reg")
                .addFields(
                    { name: 'Register', value: `Please submit a CE to this problem in a minute` },
                    { name: 'Problem', value: `http://codeforces.com/contest/${contestId}/problem/${index}` }
                )
                .setFooter({text: embedFooter, iconURL:`${interaction.user.displayAvatarURL({
                    size: 4096,
                    dynamic: true
                })}`});
            
            await interaction.editReply({ embeds: [ProblemEmbed] });
        } catch (e) {
            interaction.editReply("Codeforces API is not working, please try later");
            return;
        }

        await wait(60000);

        try {
            const sub = await getUserSubmission(handle,1);
            const {result} = sub;
            let {problem} = result[0];
            const {contestId,index} = problem;

            if(result[0].verdict === 'COMPILATION_ERROR' && p.contestId===contestId && p.index === index) {
                const status = await getUser(handle);
                const embedFooter = `User: ${interaction.user.tag}`;
                const ResultEmbed = new EmbedBuilder()
                .setColor(0x00FF55)
                .setThumbnail('https://sta.codeforces.com/s/76530/images/codeforces-telegram-square.png')
                .setTitle("Registration Successful")
                .addFields(
                    { name: 'Codeforces Handle', value: handle },
                    { name: 'Rating', value: `${status.result[0].rating}` },
                    { name: 'Rank', value: `${status.result[0].rank}` }
                )
                .setFooter({text: embedFooter, iconURL:`${interaction.user.displayAvatarURL({
                    size: 4096,
                    dynamic: true
                })}`});
                await interaction.editReply({ embeds: [ResultEmbed] });

                saveData(user, handle);
            } else {
                const embedFooter = `User: ${interaction.user.tag}`;
                const ResultEmbed = new EmbedBuilder()
                    .setColor(0xFF2222)
                    .setTitle("Registration Failed")
                    .setFooter({text: embedFooter, iconURL:`${interaction.user.displayAvatarURL({
                        size: 4096,
                        dynamic: true
                    })}`});
                await interaction.editReply({ embeds: [ResultEmbed] });
            }
        } catch (e) {
            const embedFooter = `User: ${interaction.user.tag}`;
            const ResultEmbed = new EmbedBuilder()
                .setColor(0xFF2222)
                .setTitle("Codeforces API is not working, please try again later")
                .setFooter({text: embedFooter, iconURL:`${interaction.user.displayAvatarURL({
                    size: 4096,
                    dynamic: true
                })}`});
            await interaction.editReply({ embeds: [ResultEmbed] });
        }

    },
}
