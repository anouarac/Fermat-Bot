const Discord = require('discord.js');
const twit = require('twit');
const client = new Discord.Client();
const NO_CHANNEL = -1;
const fetch = require('node-fetch');

const {prefix, token, youtubetoken} = require("./config.json");
const twitter = require('./twitter-keys');

client.once('ready', () => {
    console.log("Bot running.");
    client.user.setActivity(`Under construction.. ${prefix}help`);
});
var T = new twit(twitter);


var channel = NO_CHANNEL, active = 0, dirty = 0;
let tweets = new Set();

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

async function send_fact(c) {
    var Text = "", url = "";
    response = await T.get('statuses/user_timeline', {user_id: '3511430425', count: 200, tweet_mode: "extended"});
    var idx = getRandomInt(200);
    var iter = 0;
    while (tweets.has(response.data[idx].id_str) && iter++ < 20) {
        idx = getRandomInt(200);
        if (iter == 20)
            idx = 0;
    }
    Text = await response.data[idx].full_text;
    url = await response.data[idx].id_str;
    tweets.add(url);
    url = `https://twitter.com/fermatslibrary/status/${url}`;
    c.send("`" + Text +"`\nVia: " + url);
    console.log("Sending a fact");
}

async function update() {
    while (channel != NO_CHANNEL && active) {
        send_fact(channel);
        await new Promise(r => setTimeout(r, 5*360000));
        if (dirty) {
            dirty--;
            return;
        }
    }
}

function stop_run() {
    dirty += (active && channel != NO_CHANNEL);
}

async function get_gender(message) {
    var arguments = message.content.split(" ");
        if (arguments.length > 1) {
            var res = await fetch("https://api.genderize.io?name="+arguments[1]);
            var {name, gender, probability, count} = await res.json();
            gender[0] = gender[0].toUpperCase();

            const Embed = new Discord.MessageEmbed()
            .setColor('#008000')
            .setTitle("Genderize")
            .setDescription("Name: " + name +
            "\nGender: " + gender + "\nProbability: " + String(probability)
            + "\nCount: " + String(count))
            .setFooter("Queried by " + message.member.user.tag.split("#")[0]);

            message.channel.send(Embed);
        }
        console.log("Genderize query by: " + message.member.user.tag);
}

function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

async function get_number(message) {
    arguments = message.content.split(" ");
    if (arguments.length < 2) return;
    if (isNumeric(arguments[1])) {
        arguments[1] = Math.floor(arguments[1]);
        c = 'm';
        if (arguments.length > 2) {
            if (!isNumeric(arguments[2][0]))
                c = arguments[2][0].toLowerCase();
            else {
                c = 0;
                arguments[2] = Math.floor(arguments[2]);
            }
        }
        var res = 0;
        if (c == 'm')
            res = await fetch("http://numbersapi.com/" + arguments[1] + "/math");
        else if (c == 't')
            res = await fetch("http://numbersapi.com/" + arguments[1]);
        else res = await fetch("http://numbersapi.com/" + arguments[1] + "/" + arguments[2] + "/date");
        message.channel.send(await res.text());
    }
    console.log("Number query by: " + message.member.user.tag);
}

client.on('message', message => {
    if (message.content.startsWith(prefix + "setfactchannel") 
    && message.member.hasPermission('MANAGE_CHANNELS')) {
        stop_run();
        message.channel.send(":white_check_mark: Channel set to " + message.guild.channels.cache.get(message.channel.id).toString()) + ".";
        channel = message.channel;
        update();
    } else if (message.content.startsWith(prefix + "setfactchannel")) {
        message.channel.send(":x:**" + message.member.user.tag.split("#")[0] + "**, you can't use that.");
    } else if (message.content == prefix + "enablefact") {
        if (channel == NO_CHANNEL) {
            message.channel.send(":x: Please set the channel first using `" + prefix + "setfactchannel`.");
            return;
        } else message.channel.send(":white_check_mark: Enabled in " +  message.guild.channels.cache.get(channel.id).toString() + ".");
        if (active) return;
        active = 1;
        update();
    } else if (message.content == prefix + "disablefact") {
        stop_run();
        message.channel.send(":no_entry_sign: Disabled.");
        active = 0;
    } else if (message.content == prefix + "fact") {
        send_fact(message.channel);
        console.log("Fact query by: " + message.member.user.tag);
    } else if (message.content.startsWith(prefix + "gender")) {
        get_gender(message);
    } else if (message.content.startsWith(prefix + "number")) {
        get_number(message);
    } else if (message.content.startsWith(`${prefix}help`)) {
        var temp = "`";
        message.channel.send("A brief description and guide on how to use me was sent to your DMs!");
        message.author.send("Commands:\n"+temp+temp+temp+
        prefix+"setfactchannel -- sets the channel where tweets by Fermat's library will be posted.\n"+
        prefix+"enable -- enables auto messages in factchannel\n"+
        prefix+"disable -- disables auto messages\n"+
        prefix+"fact -- replies with a random tweet\n"+
        prefix+"number x -- replies with a math fact about number x\n"+
        prefix+"number x t -- replies with a general fact about number x\n"+
        prefix+"number m d -- replies with an event that happened on the d-th of m\n"+
        temp+temp+temp)
    }
});

client.login(token);