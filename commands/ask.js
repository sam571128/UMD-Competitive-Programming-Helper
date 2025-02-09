require('dotenv').config()
const { Configuration, OpenAIApi } = require("openai");
const openai = new OpenAIApi({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY
});

const { SlashCommandBuilder, EmbedBuilder  } = require('discord.js');

const wait = require('node:timers/promises').setTimeout;

module.exports = {
    data : new SlashCommandBuilder()
         .setName('ask')
         .setDescription('Chat with the bot')
         .addStringOption(option =>
			option
				.setName('question')
				.setDescription('Ask a question')
                .setRequired(true)),
          
    async execute(interaction) {
        await interaction.deferReply();   
        const question = interaction.options.getString('question') ?? " ";

        if (question == " "){
			await interaction.editReply('Please ask a question!')
			return;
        }

        const messages = [
            {
                role: 'system',
                content: 'You are an AI assistant specialized in competitive programming in the University of Maryland Competitive Programming Club Discord server, provide concise answers to the members of the server.'
            },
            {
                role: 'user',
                content: question
            }
        ];

        try {
            const completion = await openai.chat.completions.create({
                model: 'deepseek-chat',
                messages: messages,
            });

            const completion_text = completion.data.choices[0].message.content;

            await interaction.editReply(completion_text);
        } catch (error) {
            console.error(error);
            await interaction.editReply('Failed to generate response.');
        }
    },
}
