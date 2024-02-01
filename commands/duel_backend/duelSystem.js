const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder  } = require('discord.js');

const { saveData, getData, removeData } = require('../database/data.js');
const { getProblem, getUser, getUserSubmission } = require('../fetch/cfAPI.js');

const sleep = ms => new Promise(r => setTimeout(r, ms));

class duelSystem {
    // class variables
    // - playerA (stored as discord user id)
    // - playerB (stored as discord user id)
    // - minRating / maxRating (stored as integer from 800 to 3500)
    // - time (stored as integer, and as seconds)
    // - interaction (discord interaction)
    // - problems (store all problems from cf as an array)
    // - timer (created with setInterval)
    // - scoreA, scoreB
    constructor(playerA, playerB, minRating, maxRating, time, interaction){
        this.playerA = playerA;
        this.playerB = playerB; 
        this.minRating = minRating;
        this.maxRating = maxRating;
        this.time = time * 60;
        this.interaction = interaction;
        this.problems = [];
        this.timer = undefined;
        this.scoreA = 0, this.scoreB = 0;
        this.checkedSubmissions = new Map();
    }

    async prepareProblems(){
        // This method should prepare problems, and put into this.problems

        let APIresult; //The result will be a JSON
        try{
            const body = await getProblem([]);
            APIresult = body.result;
        }catch(err){
            if(err.status && err.status === 400){
                await this.interaction.editReply(`There is some problem with CF API while fetching problems, please try again later`);
                await removeData(`IN DUEL_${this.playerA}`);
                await removeData(`IN DUEL_${this.playerB}`);
                return;
            }
        }

        let problems = [];
        try{
            problems = APIresult.problems;
        }catch(err){
            await this.interaction.editReply(`There is some problem with CF API while fetching problems, please try again later`);
            await removeData(`IN DUEL_${this.playerA}`);
            await removeData(`IN DUEL_${this.playerB}`);
            return;
        }

        problems = problems.filter(problem => (problem.rating != null && problem.rating >= this.minRating && problem.rating <= this.maxRating 
            && !problem.tags.includes('*special') && !problem.tags.length==0));

        while(this.problems.length < 5){
            let r = Math.round((Math.random()*(problems.length-1)));
            if(!this.problems.includes(problems[r])) this.problems.push(problems[r]);
        }
        
        this.problems.sort((a,b) => a.rating - b.rating);
        for (let i = 0; i < this.problems.length; i++) {
            let problem = this.problems[i];
            const { name, contestId, index, tags, rating } = problem;
            this.problems[i].score = (i + 1) * 100;
            console.log(`http://codeforces.com/contest/${contestId}/problem/${index}`);
        }
    }

    async start() {
        await this.prepareProblems();
        this.updateStatus()
        this.timer = setInterval(() => this.updateStatus(), 1000);
    }

    async updateStatus() {
        // Update the embed with current status (we will do this every second)
        this.time--;
        
        if (this.time <= 0) {
            clearInterval(this.timer);
            await this.checkWinner();
            return;
        }
        
        if (this.time % 5 == 0) {
            await this.checkSubmissions();
        }

        if(this.problems.length == 0){
            clearInterval(this.timer);
            await this.checkWinner();
            return;
        }

        if (this.time % 5 == 0){
            let handleA = await getData(this.playerA);
            let handleB = await getData(this.playerB);

            let problemStr = this.problems.map((p) => `[${p.name}](http://codeforces.com/contest/${p.contestId}/problem/${p.index})`).join('\n');
            let difficultyStr = this.problems.map((p) => `Difficulty: ${p.rating} \t Score: ${p.score}`).join('\n');

            const statusEmbed = new EmbedBuilder()
                    .setColor(0xC99136)
                    .setTitle(`Current Status \n${handleA} Current Score ${this.scoreA} vs ${this.scoreB} Current Score ${handleB}`)
                    .addFields(
                        { name: 'Problems', value: problemStr },
                        { name: 'Difficulty \& Score', value: difficultyStr },
                        { name: 'Time Left (will be update every 5 seconds)', value: `${Math.floor(this.time / 60 / 24)} hours ${Math.floor(this.time / 60)} minutes ${this.time % 60} seconds`}
                    );
            await this.interaction.editReply({content: "", embeds: [statusEmbed]});
        }
    }

    async checkSubmissions() {
        // Check submissions of both players 
        let solvedA = await this.checkSubmissionA();
        let solvedB = await this.checkSubmissionB();
        if (solvedA != undefined && solvedB != undefined) {
            this.interaction.channel.send(`Both player has solved ${this.problems[solvedA].name}, and get ${this.problems[solvedA].score} points!`);
            this.scoreA += this.problems[solvedA].score;
            this.scoreB += this.problems[solvedA].score;
            this.problems.splice(solvedA, 1);
        } else if (solvedA != undefined) {
            this.interaction.channel.send(`<@${this.playerA}> has solved ${this.problems[solvedA].name}, and get ${this.problems[solvedA].score} points!`);
            this.scoreA += this.problems[solvedA].score;
            this.problems.splice(solvedA, 1);
        } else if (solvedB != undefined) {
            this.interaction.channel.send(`<@${this.playerB}> has solved ${this.problems[solvedB].name}, and get ${this.problems[solvedB].score} points!`);
            this.scoreB += this.problems[solvedB].score;
            this.problems.splice(solvedB, 1);
        }
    }

    async checkSubmissionA() {
        let handleA = await getData(this.playerA);
        try {
            const submission = await getUserSubmission(handleA,1);
            const result = submission.result;

            let solved = undefined;
            let p = result[0];

            for (let i = 0; i < this.problems.length; i++){
                const problem = this.problems[i];
                const {contestId,index} = problem;
                if(p.verdict === 'OK' && p.contestId===contestId && p.problem.index === index && this.checkedSubmissions.get(p.id) == undefined) {
                    this.checkedSubmissions.set(p.id, true);
                    solved = i;
                }
            }

            return solved;
        } catch (e) {
            console.log("There are some problem with checking submissions");
            return undefined;
        }
    }
    
    async checkSubmissionB() {
        let handleB = await getData(this.playerB);
        try {
            const submission = await getUserSubmission(handleB,1);
            const result = submission.result;

            let solved = undefined;
            let p = result[0];

            for (let i = 0; i < this.problems.length; i++){
                const problem = this.problems[i];
                const {contestId,index} = problem;
                if(p.verdict === 'OK' && p.contestId===contestId && p.problem.index === index && this.checkedSubmissions.get(p.id) == undefined) {
                    this.checkedSubmissions.set(p.id, true);
                    solved = i;
                }
            }

            return solved;
        } catch (e) {
            console.log("There are some problem with checking submissions");
            return undefined;
        }
    }

    async checkWinner() {
        // Check who the winner is, and announce the results

        let handleA = await getData(this.playerA);
        let handleB = await getData(this.playerB);
        const endEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle(`The duel has ended`)
                .addFields(
                    { name: `Score of ${handleA}`, value: `${this.scoreA}` },
                    { name: `Score of ${handleB}`, value: `${this.scoreB}` },
                    { name: 'Winner', value: (this.scoreA >= this.scoreB ? `<@${this.playerA}>` : `<@${this.playerB}>`) },
                );
        await this.interaction.editReply({content: "", embeds: [endEmbed]});

        await removeData(`IN DUEL_${this.playerA}`);
        await removeData(`IN DUEL_${this.playerB}`);
    }

    async forceEnd() {
        // Force end the duel

        let handleA = await getData(this.playerA);
        let handleB = await getData(this.playerB);
        if (this.timer != undefined){
            clearInterval(this.timer);
        }
        const endEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle(`The duel has been force ended`)
                .addFields(
                    { name: `Score of ${handleA}`, value: `${this.scoreA}` },
                    { name: `Score of ${handleB}`, value: `${this.scoreB}` },
                    { name: 'Winner', value: (this.scoreA >= this.scoreB ? `<@${this.playerA}>` : `<@${this.playerB}>`) },
                );
        await this.interaction.editReply({content: "", embeds: [endEmbed]});

        await removeData(`IN DUEL_${this.playerA}`);
        await removeData(`IN DUEL_${this.playerB}`);
    }
    
}

module.exports = duelSystem;