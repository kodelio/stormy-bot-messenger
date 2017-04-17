/**
 * Created by Laurent on 14/04/2017.
 */

var login = require("facebook-chat-api");
var apiai = require('apiai');
var https = require('https');
var moment = require('moment');
var cheerio = require('cheerio');
var scraper = require('google-search-scraper');
var FeedParser = require('feedparser');
var app = apiai(process.env.API_AI);

login({email: process.env.FB_LOGIN, password: process.env.FB_PW}, function callback(err, api) {
    if (err) return console.error(err);

    api.setOptions({listenEvents: true});

    api.listen(function (err, message) {
        if (err) return console.error(err);
        if (message && message.body) {
            api.markAsRead(message.threadID, function (err) {
                if (err) console.log(err);
            });
            if (message.body === '/stormyStop') {
                api.sendMessage("Prout ...", message.threadID);
                api.logout();
            } else if (message.body.toLowerCase() === '/help') {
                api.sendMessage("Voici les commandes disponibles :\n\n- 'Ai-bot' + 'message' (exemple : Ai-bot salut)\n- '/search' + 'mot clé' (exemple : /search chaise)\n- '/t411' + 'series'\n- '/t411' + 'films'\n- '/t411' + 'animes' \n- '/shorturl' + 'lien'\n- '/planningToday'\n- '/planningDemain'", message.threadID);
            } else if (message.body.toLowerCase().includes('ai-bot')) {
                var request = app.textRequest(message.body, {
                    sessionId: 'stormybot_messenger'
                });

                request.on('response', function (response) {
                    console.log(response.result.fulfillment.speech);
                    api.sendMessage(response.result.fulfillment.speech, message.threadID);
                });

                request.on('error', function (error) {
                    console.log(error);
                });

                request.end();
            } else if (message.body.includes('/shorturl')) {
                var google = require('googleapis');
                var urlshortener = google.urlshortener('v1');

                var params = {
                    key: process.env.API_GOOGLE,
                    'resource': {longUrl: message.body.replace('/shorturl ', '')}
                };

                urlshortener.url.insert(params, function (err, response) {
                    if (err) {
                        console.log('Encountered error', err);
                    } else {
                        api.sendMessage('Short url -> ' + response.id, message.threadID);
                        console.log('Short url -> ' + response.id, message.threadID);
                    }
                });
            } else if (message.body.includes('/search')) {
                https.get('https://www.googleapis.com/customsearch/v1?q=' + encodeURIComponent(message.body.replace('/search ', '')) + '&cx=' + process.env.ID_SEARCH + '&num=5&key=' + process.env.API_SEARCH, function (res) {
                    var body = '';

                    res.on('data', function (chunk) {
                        body += chunk;
                    });

                    res.on('end', function () {
                        var googleResults = JSON.parse(body);
                        for (var i = 0; i < googleResults.items.length; i++) {
                            var item = googleResults.items[i];
                            setTimeout(function () {
                                api.sendMessage(item.title.substring(0,20) + '... -> ' + item.link, message.threadID);
                                console.log(item.title.substring(0,20) + '... -> ' + item.link);
                            }, 700);
                        }
                    });
                }).on('error', function (e) {
                    console.log("Got an error: ", e);
                });
            } else if (message.body.includes('/t411')) {
                var request = require('request');
                if (message.body === "/t411 series") {
                    var req = request('https://www.t411.ai/rss/?cat=433');
                } else if (message.body === "/t411 animes") {
                    var req = request('https://www.t411.ai/rss/?cat=637');
                } else if (message.body === "/t411 films") {
                    var req = request('https://www.t411.ai/rss/?cat=631');
                }

                var feedparser = new FeedParser([options]);

                req.on('error', function (error) {
                    console.log(error);
                });

                req.on('response', function (res) {
                    var stream = this;

                    if (res.statusCode !== 200) {
                        this.emit('error', new Error('Bad status code'));
                    } else {
                        stream.pipe(feedparser);
                    }
                });

                feedparser.on('error', function (error) {
                    console.log(error);
                });

                feedparser.on('readable', function () {
                    var stream = this;
                    var meta = this.meta;
                    var item;

                    while (item = stream.read()) {
                        console.log(item.title + ' : ' + item.link);
                        api.sendMessage(item.title + ' : ' + item.link, message.threadID);
                    }
                });
            } else if (message.body.toLowerCase() === '/planningtoday') {
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
                            api.sendMessage("Pas de cours aujourd'hui", message.threadID);
                        }
                        else {
                            api.sendMessage(send, message.threadID);
                        }
                    });
                });
            } else if (message.body.toLowerCase() === '/planningdemain') {
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
                            api.sendMessage("Pas de cours demain", message.threadID);
                        }
                        else {
                            api.sendMessage(send, message.threadID);
                        }
                    });
                });
            }
        }
    });
});