require('dotenv').config()
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const { SlashCommandBuilder, EmbedBuilder  } = require('discord.js');

const wait = require('node:timers/promises').setTimeout;

module.exports = {
    data : new SlashCommandBuilder()
         .setName('ask')
         .setDescription('Chat with the bot')
         .addStringOption(option =>
			option
				.setName('question')
				.setDescription('Ask a question')),
          
    async execute(interaction) {
        await interaction.deferReply();   
        const question = interaction.options.getString('question') ?? " ";

        if (question == " "){
			await interaction.editReply('Please ask a question!')
			return;
        }

        const messages = [];

        messages.push({role: "user", content: "You are a Discord bot assistant for Competitive Programming, your job is to answer the questions."});
        
        const completion1 = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: messages,
          });

        const completion_text1 = completion1.data.choices[0].message.content;

        messages.push({role: "assistant", content: completion_text1});

        messages.push({role: "user", content: question});
        
		const completion = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: messages,
          });

        const completion_text = completion.data.choices[0].message.content;

        await interaction.editReply(completion_text);
    },
}
