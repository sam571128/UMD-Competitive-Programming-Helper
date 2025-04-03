# University of Maryland Competitive Programming Club Helper Bot

A Discord bot to assist members of the University of Maryland Competitive Programming Club with Codeforces integration, coding challenges, and more.

## Features

- **Codeforces Integration**
  - Connect your Discord account with your Codeforces handle
  - View Codeforces user profiles and statistics
  - Get personalized problem recommendations
  - Track daily solving progress with streaks and stats
  - Calendar view of your solved problems

- **Challenge System**
  - Daily competitive programming problems at different difficulty levels
  - Duel system for head-to-head competition (inspired by lockout format)
  - Tracking and statistics for problems solved

- **AI Assistance**
  - Ask questions about algorithms, data structures, and competitive programming
  - Get guidance on problem-solving approaches
  - Receive feedback on your solutions

## Getting Started

### Prerequisites

- Node.js 16+
- MongoDB database
- Discord bot token

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/umd-cp-bot.git
   cd umd-cp-bot
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env` file using the `.env.sample` template
   ```bash
   cp .env.sample .env
   ```

4. Fill in the environment variables in the `.env` file

5. Deploy slash commands
   ```bash
   node deploy-commands.js
   ```

6. Start the bot
   ```bash
   node index.js
   ```

## Commands

### Codeforces Commands

- `/cf_reg <handle>`: Register your Codeforces handle
- `/cf <handle>`: View user profile on Codeforces
- `/cf_calendar <handle> <year> <month>`: View your solved problems calendar
- `/problem <tag1> <tag2> <tag3> <min_rating> <max_rating>`: Get a problem recommendation
- `/daily`: Get daily problems (admin only)
- `/daily_lb_reg`: Register for the daily problem leaderboard (use `/cf_reg` first)
- `/daily_lb`: Print the daily problem leaderboard
- `/checkin <difficulty>`: Check in your daily problem-solving progress

### Duel Commands

- `/duel <opponent> <min_rating> <max_rating> <minutes>`: Challenge someone to a duel
- `/duel_force_end`: Force end an ongoing duel

### AI Commands

- `/ask <question> <private>`: Ask the AI assistant a question

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Codeforces for their platform and API
- Discord.js for the Discord bot framework
- The UMD Competitive Programming Club members for their feedback and suggestions