const Discord = require('discord.js');
const twit = require('twit');
const client = new Discord.Client();
const NO_CHANNEL = -1;
const fetch = require('node-fetch');

const {prefix, token, youtubetoken} = require("./config.json");
const twitter = require('./twitter-keys');

var youtube = require('youtube-search');
const { post } = require('request');
const { stringify } = require('querystring');
const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require('constants');

client.once('ready', () => {
    console.log("Bot running.");
    client.user.setActivity(`Under construction.. ${prefix}help`);
});
var T = new twit(twitter);

var opts = {
    maxResults: 1,
    key: youtubetoken,
};

var channel = NO_CHANNEL, active = 0, dirty = 0, INTERVAL = 5*3600000, VID_INTERVAL = 12*3600*1000;
var ROLES_CHANNEL = NO_CHANNEL;
let tweets = new Set();
var vids = new Set(), ytchannels = new Set(['UC1_uAIS3r8Vu6JjXWvastJg','UCtAIs1VCQrymlAnw3mGonhw','UCoxcjq-8xIDTYp3uz647V5A',
'UC9-y-6csu5WGm29I7JiwpnA','UCHnyfMqiRRG1u-2MsSQLbXA','UC6nSFpj9HTCZ5t-N3Rm3-HA','UCbfYPyITQ-7l4upoX8nvctg',
'UCUHW94eEFW7hkUMVaZz4eDg','UC6jM0RFkr4eSkzT5Gx0HOAw','UCBa659QWEk1AI4Tg--mrJ2A','UCYO_jab_esuFRV4b17AJtAw','UCv0nF8zWevEsSVcmz6mlw6A']);
var emojiname = ['1⃣','2⃣', '3⃣', '4⃣', '5⃣', '6⃣', '7⃣', '8⃣', '9⃣'];
    rolename = ["Algebra", "Statistics & Probability", "Precalc and Trig", 
            "Calculus", "Linear Algebra", "Discrete Maths", "Advanced Math", "Computer Science",
            "Physics"];


async function react(message) {
    for (var i = 0; i < emojiname.length; i++)
        message.react(emojiname[i]).catch();
}

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
        await new Promise(r => setTimeout(r, INTERVAL));
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

function set_interval(message) {
    arguments = message.content.split(" ");
    if (arguments.length < 2 || !isNumeric(arguments[1]))
        return;
    INTERVAL = parseInt(arguments[1])*1000;
    message.channel.send(":white_check_mark: Interval set to " + arguments[1] + ".");
    console.log("Interval set by: " + message.member.user.tag + " to "+INTERVAL.toString());
}

async function update_vids() {
    var temp = VID_INTERVAL;
    VID_INTERVAL = 10000;
    while (true) {
        await new Promise(r => setTimeout(r, VID_INTERVAL));
        if (channel == NO_CHANNEL || !active) continue;
        VID_INTERVAL = temp;
        for (let channel_id of ytchannels) {
            var response = await fetch(`https://www.googleapis.com/youtube/v3/search?key=${youtubetoken}&channelId=${channel_id}&part=snippet,id&order=date&maxResults=1`);
            if (response.status != 200) {
                console.log(response.status);
                console.log(channel_id);
                continue;
            }
            response = await response.text();
            response = JSON.parse(response);
            var id = response.items[0].id.videoId;
            var date = new Date();
            date = date.toISOString();
            if (!vids.has(id) && date.split('T')[0] == response.items[0].snippet.publishTime.split('T')[0]) {
                channel.send(`https://www.youtube.com/watch?v=${response.items[0].id.videoId}`);
                vids.add(id);
            }
        }
    }
}

update_vids();

function add_channel(message) {
    arguments = message.content.split(" ");
    if (arguments.length > 1) {
        ytchannels.add(arguments[1]);
        message.channel.send(":white_check_mark: Channel ID added successfully.");
    }
    console.log("Add channel query by: " + message.member.user.tag);
}

function remove_channel(message) {
    arguments = message.content.split(" ");
    if (arguments.length > 1 && ytchannels.has(arguments[1]))  {
        ytchannels.delete(arguments[1]);
    } else {
        message.channel.send(":x: Invalid query.");
    }
    console.log("Remove channel query by: " + message.member.user.tag);
}

client.on('message', message => {
    // BEGIN HELP
    if (message.content.startsWith(`${prefix}help`)) {
        var temp = "`";
        message.channel.send("A brief description and guide on how to use me was sent to your DMs!");
        message.author.send("Commands:\n"+temp+temp+temp+
        prefix+"mkroles -- sets roles channel and adds emojis from the source file\n"+
        prefix+"setpostchannel -- sets the channel where posts will be made\n"+
        prefix+"enablepost -- enables auto posts in postchannel\n"+
        prefix+"disablepost -- disables auto posts\n"+
        prefix+"setpostinterval x -- sets the interval between 2 posts to x seconds\n"+
        prefix+"post -- replies with a random post\n"+
        prefix+"yt title -- searches for title on youtube\n"+
        prefix+"addyt channel_id -- adds youtube channel with id channel_id to the list of youtube channels to get posts from\n"+
        prefix+"removeyt channel_id -- removes youtube channel with id channel_id from the list of youtube channels to get posts from\n"+
        prefix+"number x -- replies with a math post about number x\n"+
        prefix+"number x t -- replies with a general post about number x\n"+
        prefix+"number m d -- replies with an event that happened on the d-th of m\n"+
        temp+temp+temp)
    }
    // END HELP
    if (!message.channel.guild) return;
    if (message.content.startsWith(prefix + "setpostchannel") 
    && message.member.hasPermission('MANAGE_CHANNELS')) {
        stop_run();
        message.channel.send(":white_check_mark: Channel set to " + message.guild.channels.cache.get(message.channel.id).toString()) + ".";
        channel = message.channel;
        update();
    } else if (message.content.startsWith(prefix + "setpostchannel")) {
        message.channel.send(":x:**" + message.member.user.tag.split("#")[0] + "**, you can't use that.");
    } else if (message.content == prefix + "enablepost") {
        if (channel == NO_CHANNEL) {
            message.channel.send(":x: Please set the channel first using `" + prefix + "setpostchannel`.");
            return;
        } else message.channel.send(":white_check_mark: Enabled in " +  message.guild.channels.cache.get(channel.id).toString() + ".");
        if (active) return;
        active = 1;
        update();
    } else if (message.content == prefix + "disablepost") {
        stop_run();
        message.channel.send(":no_entry_sign: Disabled.");
        active = 0;
    } else if (message.content.startsWith(`${prefix}setpostinterval`)
    && message.member.hasPermission('MANAGE_CHANNELS')) {
        set_interval(message);
        stop_run();
        update();
    } else if (message.content.startsWith(`${prefix}setpostinterval`)) {
        message.channel.send(":x:**" + message.member.user.tag.split("#")[0] + "**, you can't use that.");
    } else if (message.content == prefix + "fact") {
        send_fact(message.channel);
        console.log("Fact query by: " + message.member.user.tag);
    } else if (message.content.startsWith(prefix + "gender")) {
        get_gender(message);
    } else if (message.content.startsWith(prefix + "number")) {
        get_number(message);
    } else if (message.content.startsWith(`${prefix}yt`)) {
        var arguments = message.content.split(" ");
        var title = "";
        if (arguments.length >= 2) {
            for (var i = 1; i < arguments.length; i++)
                title = title + arguments[i] + " "; 
            youtube(title, opts, function(err, results) {
                if(err) return console.log(err);
                message.channel.send(results[0].link);
            });
        }
        console.log("YouTube search query by: " + message.member.user.tag);
    } else if (message.content.startsWith(`${prefix}addyt`)
    && message.member.hasPermission('MANAGE_CHANNELS')) {
        add_channel(message);
    } else if (message.content.startsWith(`${prefix}addyt`)) {
        message.channel.send(":x:**" + message.member.user.tag.split("#")[0] + "**, you can't use that.");
    } else if (message.content.startsWith(`${prefix}removeyt`)
    && message.member.hasPermission('MANAGE_CHANNELS')) {
        remove_channel(message);
    } else if (message.content.startsWith(`${prefix}removeyt`)) {
        message.channel.send(":x:**" + message.member.user.tag.split("#")[0] + "**, you can't use that.");
    } else if (message.content.startsWith(prefix + "mkroles")
    && message.member.hasPermission('MANAGE_ROLES')
    && message.member.hasPermission('MANAGE_CHANNELS')) {
        if (!message.channel.guild) return;
        react(message);
        ROLES_CHANNEL = message.channel;
    } else if (message.content.startsWith(prefix + "mkroles")) {
        message.channel.send(":x:**" + message.member.user.tag.split("#")[0] + "**, you can't use that.");
    }
});

client.on("messageReactionAdd", (e, n) => {
    if (n && !n.bot && e.message.channel.guild && ROLES_CHANNEL != NO_CHANNEL 
        && e.message.channel == ROLES_CHANNEL) {
            for (let o in emojiname)
                if (e.emoji.name == emojiname[o]) {
                    let i = e.message.guild.roles.cache.find(e => e.name == rolename[o]);
                    e.message.guild.member(n).roles.add(i).catch(console.error)
                }
        }
});

client.on("messageReactionRemove", (e, n) => {
    if (n && !n.bot && e.message.channel.guild && ROLES_CHANNEL != NO_CHANNEL 
        && e.message.channel == ROLES_CHANNEL) {
            for (let o in emojiname)
                if (e.emoji.name == emojiname[o]) {
                    let i = e.message.guild.roles.cache.find(e => e.name == rolename[o]);
                    e.message.guild.member(n).roles.remove(i).catch(console.error)
                }
        }
});

process.on('uncaughtException', (err) => {
    console.log(err);
});

client.login(token);