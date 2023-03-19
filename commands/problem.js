const { SlashCommandBuilder, EmbedBuilder  } = require('discord.js');

const { getProblem } = require('./fetch/cfAPI.js');

const wait = require('node:timers/promises').setTimeout;

module.exports = {
    data : new SlashCommandBuilder()
         .setName('problem')
         .setDescription('Get a problem from Codeforces')
         .addStringOption(option =>
			option
				.setName('tag1')
				.setDescription('Input Problem Tag 1'))
         .addStringOption(option =>
			option
				.setName('tag2')
                .setDescription('Input Problem Tag 2'))
         .addStringOption(option =>
			option
				.setName('tag3')
                .setDescription('Input Problem Tag 3'))
         .addNumberOption(option =>
            option
                .setName("min_rating")
                .setDescription('Input the Minimum Rating of a Problem')
                .setMinValue(800)
                .setMaxValue(3500))
         .addNumberOption(option =>
            option
                .setName("max_rating")
                .setDescription('Input the Maximum Rating of a Problem')
                .setMinValue(800)
                .setMaxValue(3500)),
          
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });     
        const min_rating = interaction.options.getNumber('min_rating') ?? 800;
        const max_rating = interaction.options.getNumber('max_rating') ?? 3500;

        let user_tags = [];
    
        for(let i = 1; i <= 3; i++){
            const tag = interaction.options.getString(`tag${i}`);
            if(tag) user_tags.push(tag);
        }
        
        let result; //The result will be a JSON

        try{
            const body = await getProblem(user_tags);
            result = body.result;
        }catch(err){
            if(err.status && err.status === 400){
                await interaction.reply(`There is some problem with CF API, please try again later`);
                return;
            }
        }

        let problems = [];
        try{
            problems = result.problems;
        }catch(err){
            await interaction.reply(`There is some problem with CF API, please try again later`);
            return;
        }
    
        if(!problems.length){
            await interaction.reply(`Cannot find any requested problem, please try again`);
            return;
        }

        problems = problems.filter(problem => (problem.rating != null && problem.rating >= min_rating && problem.rating <= max_rating 
            && !problem.tags.includes('*special') && !problem.tags.length==0));

        let r = Math.round((Math.random()*(problems.length-1)));

        
        const embedFooter = `User: ${interaction.user.tag}`;
        
        const { name, contestId, index, tags, rating } = problems[r];

        const ProblemEmbed = new EmbedBuilder()
            .setColor(0x00FF55)
            .setThumbnail('https://sta.codeforces.com/s/76530/images/codeforces-telegram-square.png')
            .setTitle(name)
            .addFields(
                { name: 'From', value: `${contestId}${index}` },
                { name: 'tags', value: `||${tags.join(', ')}||` },
                { name: 'Difficulty', value: `||${rating}||` },
            )
            .setURL(`http://codeforces.com/contest/${contestId}/problem/${index}`)
            .setFooter({text: embedFooter, iconURL:`${interaction.user.displayAvatarURL({
                size: 4096,
                dynamic: true
            })}`});

        await interaction.channel.send({ embeds: [ProblemEmbed] });

        await interaction.editReply('Finished!');
        
        await interaction.deleteReply();
    },
}
