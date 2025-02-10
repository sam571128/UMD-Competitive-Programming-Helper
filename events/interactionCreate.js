const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction) {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Error executing ${interaction.commandName}`);
                console.error(error);
            }
        }
        // Handle component interactions (buttons and select menus)
        else if (interaction.isButton() || interaction.isStringSelectMenu()) {
            // Get the base command name (everything before the first underscore)
            const commandName = 'cf_calendar';  // Since we only have one command with components for now
            const command = interaction.client.commands.get(commandName);

            if (!command || !command.handleInteraction) {
                console.error(`No matching command handler for ${interaction.customId}`);
                return;
            }

            try {
                await command.handleInteraction(interaction);
            } catch (error) {
                console.error(`Error handling interaction ${interaction.customId}`);
                console.error(error);
                await interaction.reply({
                    content: 'There was an error while processing your request.',
                    ephemeral: true
                });
            }
        }
    },
};
