require('dotenv').config()
const OpenAI = require("openai");
const openai = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com/v1'
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

        const messages = [];

        messages.push({
            role: "system", 
            content: `You are a knowledgeable competitive programming assistant for the UMD Competitive Programming Club. Your expertise includes:
            - Algorithms and data structures
            - Problem-solving strategies and techniques
            - Time and space complexity analysis
            - Programming contest tips and best practices
            - Solutions to common competitive programming problems
            
            You should:
            - Provide clear, concise explanations with example code when relevant
            - Help debug algorithmic issues
            - Suggest optimal approaches to problems
            - Reference specific algorithms or data structures when applicable
            - Encourage learning and understanding rather than just giving solutions
            
            You should not:
            - Provide direct solutions to active contest problems
            - Give vague or overly theoretical answers
            - Ignore time/space complexity considerations
            
            Always strive to help members improve their problem-solving skills.`
        });
        
        messages.push({role: "user", content: question});
        
        const completion = await openai.chat.completions.create({
            model: "deepseek-chat",
            messages: messages,
            temperature: 0.7,
            max_tokens: 2000
        });

        const completion_text = completion.choices[0].message.content;

        await interaction.editReply(completion_text);
    },
}
