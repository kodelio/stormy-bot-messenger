/**
 * Created by Laurent on 14/04/2017.
 */

const login = require("facebook-chat-api");
const apiai = require('apiai');
const https = require('https');
const moment = require('moment');
const cheerio = require('cheerio');
//const FeedParser = require('feedparser');
const app = apiai(process.env.API_AI);
const Settings = require('./settings');
const request = require('request');

login({email: process.env.FB_LOGIN, password: process.env.FB_PW}, function callback(err, api) {
    if (err) return console.error(err);

    api.setOptions({listenEvents: true});

    const stopListening = api.listen((err, event) => {
        if (err) return console.error(err);
        switch (event.type) {
            case "message":
                api.markAsRead(event.threadID, err => {
                    if (err) console.log(err);
                });
                if (event.body !== undefined) {
                    if (event.body === '/stop' && event.senderID === '100002103238768') {
                        api.sendMessage("Au revoir ...", event.threadID);
                        return stopListening();
                    } else if (event.body.toLowerCase() === '/help') {
                        api.sendMessage("Voici les commandes disponibles :\n\n- 'Infres Bot' + 'message' (exemple : Infres salut)\n- '/search' + 'mot clé' (exemple : /search chaise)\n- '/shorturl' + 'lien'\n- '/planningToday'\n- '/planningDemain'", event.threadID);
                    } else if (event.body.toLowerCase().includes('ai-bot')) {
                        console.log(event.body.toLowerCase().replace('infres bot ', '').replace('bot ', '').replace('@', ''));
                        const request = app.textRequest(event.body.toLowerCase().replace('infres bot ', '').replace('bot ', '').replace('@', ''), {
                            sessionId: 'stormy-messenger-bot'
                        });
                        request.on('response', response => {
                            console.log(response.result.fulfillment.speech);
                            api.sendMessage(response.result.fulfillment.speech, event.threadID);
                        });
                        request.on('error', error => {
                            console.log(error);
                        });
                        request.end();
                    } else if (event.body.includes('/shorturl')) {
                        const options = {
                            url: `https://www.googleapis.com/urlshortener/v1/url?key=${process.env.API_GOOGLE}`,
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            json: {"longUrl": event.body.replace('/shorturl ', '')}
                        };
                        request(options, (error, response, body) => {
                            if (!error && response.statusCode === 200) {
                                api.sendMessage(`${body.longUrl} -> ${body.id}`, event.threadID);
                                console.log(`${body.longUrl} -> ${body.id}`);
                            }
                        });
                    } else if (event.body.includes('/search')) {
                        https.get(`https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(event.body.replace('/search ', ''))}&cx=${process.env.ID_SEARCH}&num=3&key=${process.env.API_SEARCH}`, res => {
                            let body = '';
                            res.on('data', chunk => {
                                body += chunk;
                            });
                            res.on('end', () => {
                                const googleResults = JSON.parse(body);
                                for (const item of googleResults.items) {
                                    api.sendMessage(`${item.title.substring(0, 20)}... -> ${item.link}`, event.threadID);
                                    console.log(`${item.title.substring(0, 20)}... -> ${item.link}`);
                                }
                            });
                        }).on('error', e => {
                            console.log("Got an error: ", e);
                        });
                    } else if (event.body.toLowerCase() === '/planningtoday') {
                        const today = moment().format('YYYYMMDD');
                        https.get(`https://planning-ema.fr/promo/42/${today}`, res => {
                            res.setEncoding('utf8');
                            let body = '';
                            res.on('data', chunk => {
                                body += chunk;
                            });
                            res.on('end', () => {
                                const $ = cheerio.load(body);
                                const send = $('.element').map(function (i, el) {
                                    // this === el
                                    let name = '';
                                    let hour = '';
                                    let prof = '';
                                    let salle = '';
                                    let groupe = '';
                                    if ($(this).children('b').html() !== null) {
                                        name = `${$(this).children('b').html().replace(/  /g, "").replace(/\n/g, '').replace(/\t/g, '')} - `;
                                    }
                                    if ($(this).children('i').children('span').html() !== null) {
                                        hour = `${$(this).children('i').children('span').html().replace(/ /g, "").replace(/\n/g, '').replace(/\t/g, '')} - `;
                                    }
                                    if ($(this).children('.teal-text').html() !== null) {
                                        prof = `${$(this).children('.teal-text').html().replace(/\n/g, '').replace(/\t/g, '')} - `;
                                    }
                                    if ($(this).children('.red-text').html() !== null) {
                                        salle = `${$(this).children('.red-text').html().replace(/\n/g, '').replace(/\t/g, '')} - `;
                                    }
                                    if ($(this).children('span').html() !== null) {
                                        groupe = $(this).children('span').html().replace(/\n/g, '').replace(/\t/g, '');
                                    }
                                    return name + hour + prof + salle + groupe;
                                }).get().join('\n\n');
                                console.log(send);
                                if (!send) {
                                    api.sendMessage("Pas de cours aujourd'hui", event.threadID);
                                } else {
                                    api.sendMessage(send, event.threadID);
                                }
                            });
                        });
                    } else if (event.body.toLowerCase() === '/planningdemain') {
                        const demain = moment().add(1, 'days').format('YYYYMMDD');
                        https.get(`https://planning-ema.fr/promo/42/${demain}`, res => {
                            res.setEncoding('utf8');
                            let body = '';
                            res.on('data', chunk => {
                                body += chunk;
                            });
                            res.on('end', () => {
                                const $ = cheerio.load(body);
                                const send = $('.element').map(function (i, el) {
                                    // this === el
                                    let name = '';
                                    let hour = '';
                                    let prof = '';
                                    let salle = '';
                                    let groupe = '';
                                    if ($(this).children('b').html() !== null) {
                                        name = `${$(this).children('b').html().replace(/  /g, "").replace(/\n/g, '').replace(/\t/g, '')} - `;
                                    }
                                    if ($(this).children('i').children('span').html() !== null) {
                                        hour = `${$(this).children('i').children('span').html().replace(/ /g, "").replace(/\n/g, '').replace(/\t/g, '')} - `;
                                    }
                                    if ($(this).children('.teal-text').html() !== null) {
                                        prof = `${$(this).children('.teal-text').html().replace(/\n/g, '').replace(/\t/g, '')} - `;
                                    }
                                    if ($(this).children('.red-text').html() !== null) {
                                        salle = `${$(this).children('.red-text').html().replace(/\n/g, '').replace(/\t/g, '')} - `;
                                    }
                                    if ($(this).children('span').html() !== null) {
                                        groupe = $(this).children('span').html().replace(/\n/g, '').replace(/\t/g, '');
                                    }
                                    return name + hour + prof + salle + groupe;
                                }).get().join('\n\n');
                                console.log(send);
                                if (!send) {
                                    api.sendMessage("Pas de cours demain", event.threadID);
                                } else {
                                    api.sendMessage(send, event.threadID);
                                }
                            });
                        });
                    }
                }
                break;
            case "event":
                console.log(event);
                if (event.logMessageType === 'log:unsubscribe') {
                    if (typeof event.logMessageData !== "undefined") {
                        if (Array.isArray(Settings.threads)) Settings.threads.forEach(thread => {
                            //forEach threads registered
                            if (typeof thread.threadID !== "undefined" && thread.threadID === event.threadID) {
                                //Check if event thread is in the settings
                                if (Array.isArray(thread.userIDs) && thread.userIDs.includes(event.logMessageData.leftParticipantFbId)) {
                                    //Kicked user is in the list
                                    console.log(`ReAdd userID ${event.logMessageData.leftParticipantFbId}`);
                                    api.addUserToGroup(event.logMessageData.leftParticipantFbId, event.threadID); //ReAdd the user
                                    //api.sendMessage("Bien essayé PD !", event.threadID);
                                }
                            }
                        });
                    }
                }
                break;
        }
    });
});
