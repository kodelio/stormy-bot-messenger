/**
 * Created by Laurent on 14/04/2017.
 */

var login = require("facebook-chat-api");
var apiai = require('apiai');
var https = require('https');
var moment = require('moment');
var cheerio = require('cheerio');
var google = require('googleapis');
var scraper = require('google-search-scraper');
var FeedParser = require('feedparser');
var app = apiai(process.env.API_AI);

login({ email: process.env.FB_LOGIN, password: process.env.FB_PW }, function callback(err, api) {
    if (err) return console.error(err);

    api.setOptions({ listenEvents: true });

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
                api.sendMessage("Voici les commandes disponibles :\n\n- '@Ai-bot' + 'message' (exemple : @Ai-bot salut)\n- '/google' + 'mot clé' (exemple : /google chaise)\n- '/t411' + 'series'\n- '/t411' + 'films'\n- '/t411' + 'animes' \n- '/shortUrl' + 'lien'\n- '/planningToday'\n- '/planningDemain'", message.threadID);
            } else if (message.body.toLowerCase().includes('@Ai-bot')) {
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
            } else if (message.body.toLowerCase().includes('/shortUrl')) {
                var urlshortener = google.urlshortener('v1');

                var params = {
                    key: process.env.API_GOOGLE,
                    'resource': { longUrl: message.body.replace('/shortUrl ', '') }
                };

                urlshortener.url.insert(params, function (err, response) {
                    if (err) {
                        console.log('Encountered error', err);
                    } else {
                        console.log('Short url -> ' + response.id, message.threadID);
                        api.sendMessage('Short url -> ' + response.id, message.threadID);
                    }
                });
            } else if (message.body.toLowerCase().includes('/google')) {
                var options = {
                    query: message.body.replace('/google ', ''),
                    limit: 5,
                    host: 'www.google.fr'
                };

                scraper.search(options, function (err, url) {
                    if (err) console.log(err);
                    var results = [];
                    results.push(url);

                    for (var i = 0; i < 5; i++) {
                        console.log(results[i]);
                        api.sendMessage(results[i], message.threadID);
                    }
                });
            } else if (message.body.toLowerCase().includes('/t411')) {
                var request = require('request');
                if (message.body.toLowerCase() === "/t411 series") {
                    var req = request('https://www.t411.ai/rss/?cat=433');
                } else if (message.body.toLowerCase() === "/t411 animes") {
                    var req = request('https://www.t411.ai/rss/?cat=637');
                } else if (message.body.toLowerCase() === "/t411 films") {
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
            } else if (message.body.toLowerCase() === '/planningToday') {
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
                            var name = '';var hour = '';var prof = '';var salle = '';var groupe = '';
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
                        api.sendMessage(send, message.threadID);
                    });
                });
            } else if (message.body.toLowerCase() === '/planningDemain') {
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
                            var name = '';var hour = '';var prof = '';var salle = '';var groupe = '';
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
                        api.sendMessage(send, message.threadID);
                    });
                });
            }
        }
    });
});