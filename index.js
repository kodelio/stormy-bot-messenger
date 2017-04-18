'use strict';

/**
 * Created by Laurent on 14/04/2017.
 */

var login = require("facebook-chat-api");
var apiai = require('apiai');
var https = require('https');
var moment = require('moment');
var cheerio = require('cheerio');
//var FeedParser = require('feedparser');
var app = apiai(process.env.API_AI);
var Settings = require('./settings');

login({email: process.env.FB_LOGIN, password: process.env.FB_PW}, function callback(err, api) {
    if (err) return console.error(err);

    api.setOptions({listenEvents: true});

    api.listen(function (err, event) {
        if (err) return console.error(err);

        switch (event.type) {
            case "message":
                api.markAsRead(event.threadID, function (err) {
                    if (err) console.log(err);
                });
                if (event.body === '/stormyStop') {
                    api.sendMessage("Prout ...", event.threadID);
                    api.logout();
                } else if (event.body.toLowerCase() === '/help') {
                    api.sendMessage("Voici les commandes disponibles :\n\n- 'Ai-bot' + 'message' (exemple : Ai-bot salut)\n- '/search' + 'mot clé' (exemple : /search chaise)\n- '/shorturl' + 'lien'\n- '/planningToday'\n- '/planningDemain'", event.threadID);
                } else if (event.body.toLowerCase().includes('ai-bot')) {
                    console.log(event.body.toLowerCase().replace('ai-bot ', '').replace('bot ', '').replace('@', ''));
                    var request = app.textRequest(event.body.toLowerCase().replace('ai-bot ', '').replace('bot ', '').replace('@', ''), {
                        sessionId: 'stormy-messenger-bot'
                    });

                    request.on('response', function (response) {
                        console.log(response.result.fulfillment.speech);
                        api.sendMessage(response.result.fulfillment.speech, event.threadID);
                    });

                    request.on('error', function (error) {
                        console.log(error);
                    });

                    request.end();
                } else if (event.body.includes('/shorturl')) {
                    var request = require('request');

                    var options = {
                        url: 'https://www.googleapis.com/urlshortener/v1/url?key=' + process.env.API_GOOGLE,
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        json: {"longUrl": event.body.replace('/shorturl ', '')}
                    };

                    request(options, function (error, response, body) {
                        if (!error && response.statusCode == 200) {
                            api.sendMessage(body.longUrl + ' -> ' + body.id, event.threadID);
                            console.log(body.longUrl + ' -> ' + body.id);
                        }
                    });
                } else if (event.body.includes('/search')) {
                    https.get('https://www.googleapis.com/customsearch/v1?q=' + encodeURIComponent(event.body.replace('/search ', '')) + '&cx=' + process.env.ID_SEARCH + '&num=3&key=' + process.env.API_SEARCH, function (res) {
                        var body = '';

                        res.on('data', function (chunk) {
                            body += chunk;
                        });

                        res.on('end', function () {
                            var googleResults = JSON.parse(body);
                            for (var i = 0; i < googleResults.items.length; i++) {
                                var item = googleResults.items[i];
                                api.sendMessage(item.title.substring(0, 20) + '... -> ' + item.link, event.threadID);
                                console.log(item.title.substring(0, 20) + '... -> ' + item.link);
                            }
                        });
                    }).on('error', function (e) {
                        console.log("Got an error: ", e);
                    });
                } else if (event.body.toLowerCase() === '/planningtoday') {
                    var today = moment().format('YYYYMMDD');

                    https.get('https://planning-ema.fr/promo/42/' + today, function (res) {
                        res.setEncoding('utf8');
                        var body = '';
                        res.on('data', function (chunk) {
                            body += chunk;
                        });
                        res.on('end', function () {
                            var $ = cheerio.load(body);
                            var send = $('.element').map(function (i, el) {
                                // this === el
                                var name = '';
                                var hour = '';
                                var prof = '';
                                var salle = '';
                                var groupe = '';
                                if ($(this).children('b').html() != null) {
                                    name = $(this).children('b').html().replace(/  /g, "").replace(/\n/g, '').replace(/\t/g, '') + ' - ';
                                }
                                if ($(this).children('i').children('span').html() != null) {
                                    hour = $(this).children('i').children('span').html().replace(/ /g, "").replace(/\n/g, '').replace(/\t/g, '') + ' - ';
                                }
                                if ($(this).children('.teal-text').html() != null) {
                                    prof = $(this).children('.teal-text').html().replace(/\n/g, '').replace(/\t/g, '') + ' - ';
                                }
                                if ($(this).children('.red-text').html() != null) {
                                    salle = $(this).children('.red-text').html().replace(/\n/g, '').replace(/\t/g, '') + ' - ';
                                }
                                if ($(this).children('span').html() != null) {
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
                    var demain = moment().add(1, 'days').format('YYYYMMDD');

                    https.get('https://planning-ema.fr/promo/42/' + demain, function (res) {
                        res.setEncoding('utf8');
                        var body = '';
                        res.on('data', function (chunk) {
                            body += chunk;
                        });
                        res.on('end', function () {
                            var $ = cheerio.load(body);
                            var send = $('.element').map(function (i, el) {
                                // this === el
                                var name = '';
                                var hour = '';
                                var prof = '';
                                var salle = '';
                                var groupe = '';
                                if ($(this).children('b').html() != null) {
                                    name = $(this).children('b').html().replace(/  /g, "").replace(/\n/g, '').replace(/\t/g, '') + ' - ';
                                }
                                if ($(this).children('i').children('span').html() != null) {
                                    hour = $(this).children('i').children('span').html().replace(/ /g, "").replace(/\n/g, '').replace(/\t/g, '') + ' - ';
                                }
                                if ($(this).children('.teal-text').html() != null) {
                                    prof = $(this).children('.teal-text').html().replace(/\n/g, '').replace(/\t/g, '') + ' - ';
                                }
                                if ($(this).children('.red-text').html() != null) {
                                    salle = $(this).children('.red-text').html().replace(/\n/g, '').replace(/\t/g, '') + ' - ';
                                }
                                if ($(this).children('span').html() != null) {
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
                break;
            case "event":
                console.log(event);
                if (event.logMessageType == 'log:unsubscribe') {
                    if (typeof event.logMessageData !== "undefined") {

                        if (Array.isArray(Settings.threads)) Settings.threads.forEach(function (thread) {
                            //forEach threads registered
                            if (typeof thread.threadID !== "undefined" && thread.threadID == event.threadID) {
                                //Check if event thread is in the settings

                                if (Array.isArray(thread.userIDs) && thread.userIDs.indexOf(event.logMessageData.leftParticipantFbId) !== -1) {
                                    //Kicked user is in the list
                                    console.log("ReAdd userID " + event.logMessageData.leftParticipantFbId);

                                    api.addUserToGroup(event.logMessageData.leftParticipantFbId, event.threadID); //ReAdd the user
                                }
                            }
                        });
                    }
                }
                break;
        }
    });
});