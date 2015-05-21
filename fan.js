var cheerio = require('cheerio');
var fs = require('fs');
var request = require('request');
var _ = require('underscore');
var async = require('async');
var secret = require('./secret.js');
var CronJob = require('cron').CronJob;
var ent = require('ent');
var fs = require('fs');

var message = 'https://www.facebook.com/ajax/mercury/send_messages.php';
var friends = 'https://www.facebook.com/friends'

var plan_id = '798605910236376';

//initial a cookie jar to save the session
var j = request.jar();
var fbrequest = request.defaults({
	headers: {
		'User-Agent': 'Mozilla/5.0 (Windows NT 5.1; rv:31.0) Gecko/20100101 Firefox/31.0'
	},
	jar: j
});

var download = function(uri, filename, callback) {
	fbrequest.head(uri, function(err, res, body) {
		// console.log('content-type:', res.headers['content-type']);
		// console.log('content-length:', res.headers['content-length']);

		fbrequest(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
	});
};

// let fb know you are alive 
exports.pingpong = function(fbid) {
	var ping = 'https://3-edge-chat.facebook.com/active_ping?channel=p_' + fbid.id + '&partition=-2&clientid=67c47f2f&cb=hsod&cap=8&uid=' + fbid.id + '&viewer_uid=' + fbid.id + '&sticky_token=444&sticky_pool=ash2c07_chat-proxy&state=active'
	var job = new CronJob({
		cronTime: '0 * * * * *',
		onTick: function() {
			fbrequest({
				method: "GET",
				url: ping
			}, function(err, httpResponse, body) {
				if (body) {
					// console.log(body);
				}
			});
		},
		start: false,
		timeZone: "Asia/Taipei"
	});

	job.start();
};



exports.login = function login(callback) {
	console.log('login....')
	fbrequest({
		method: 'GET',
		url: 'https://www.facebook.com/login.php',
	}, function(err, httpResponse, body) {
		if (err) return callback('error: login failed.')

		$ = cheerio.load(body);
		var login_form = new Object();
		$('form#login_form input').each(function(i, elem) {
			login_form[$(this).attr('name')] = $(this).attr('value')
		})

		login_form.pass = secret.password
		login_form.email = secret.email
		fbrequest({
			method: 'POST',
			url: 'https://www.facebook.com/login.php',
			form: login_form,
		}, function(err, httpResponse, body) {
			if (err) console.log(err)

			fbrequest({
				method: 'GET',
				url: 'https://www.facebook.com'
			}, function(err, httpResponse, body) {

				console.log('logged in!');

				fb_userid = (body.split(/USER_ID":"(\d+)/)[1]);
				fb_dtsg = (body.split(/fb_dtsg" value="(.*?)"/)[1]);

				var fbuser = {
					id: fb_userid,
					dtsg: fb_dtsg
				};

				if (fb_userid == '0') {
					callback('error:2');
				} else {
					console.log('User_id: ' + fb_userid);
					callback(null, fbuser);
				}
			});
		});
	});
};

exports.get_messages = function get_messages(seq, callback) {

	var url = 'https://3-edge-chat.facebook.com/pull?channel=p_' + fb_userid + '&partition=-2&clientid=67c47f2f&cb=hsod&cap=8&uid=' + fb_userid + '&viewer_uid=' + fb_userid + '&sticky_token=444&sticky_pool=ash2c07_chat-proxy&state=active'
	if (seq) url = url + '&seq=' + seq;
	fbrequest({
		method: 'GET',
		url: url,
		timeout: 60000
	}, function(err, httpResponse, body) {
		var cuthead = /for \(;;\); (.+)/;
		try {
			var raw = JSON.parse(cuthead.exec(body)[1]);
			// console.log(raw.seq);
			if (raw.ms) {
				_.each(raw.ms, function(elem) {
					if (elem.type == "notification_json") {
						// console.log(elem.nodes[0].title.text);
						elem.nodes[0].title.ranges.forEach(function(it, idx) {
							// console.log(it);
						});
					} else if (elem.type == "notification") {
						try {
							var real = ent.decode(elem.markup);
							// console.log(real);
							$ = cheerio.load(real);
							var datagt = JSON.parse(real.match(/data-gt="(.+?)" data/)[1]);
							if (datagt.notif_type == 'page_new_likes' && datagt.context_id == '583989995037428') {
								var name = $('#notification_' + datagt.alert_id + '_info .blueName')[0].children[0].data;
								var image = $('img')[0].attribs.src;
								var uid = datagt.from_uids[Object.keys(datagt.from_uids)[0]];
								console.log(name);
								console.log(image);
								console.log(uid);
								fs.appendFileSync('./name.txt', name + '\t' + uid + '\n');
								download(image, './image/' + uid + '.jpg', function() {
									console.log('download done');
								});
							}
							if (datagt.notif_type == 'plan_mall_activity' && datagt.context_id == plan_id) {
								console.log(datagt);
								var name = $('#notification_' + datagt.alert_id + '_info .blueName')[0].children[0].data;
								var image = $('img')[0].attribs.src;
								var uid = datagt.from_uids[Object.keys(datagt.from_uids)[0]];
								console.log(name);
								console.log(image);

								console.log(uid);
								download(image, './image/' + uid + '.jpg', function() {
									console.log('download done');
								});
								var link = $('.notifMainLink').attr('href');
								var sp = link.split(/(798605910236376\/)/);
								var permal = sp[0] + sp[1] + 'permalink/' + sp[2];
								console.log(permal);
								fbrequest.get(permal, function(err, httpResponse, body) {
									// fs.writeFileSync('a.html', body);
									var gethidden = body.match(/code class="hidden_elem" id=".+"><!-- (<div.+userContent.+)? --><\/code/);
									// console.log(gethidden[1]);
									$ = cheerio.load(ent.decode(gethidden[1]));
									var content = $('.userContent').text();
									fs.appendFileSync('./name.txt', name + '\t' + uid + '\t' + content + '\n');


								});

							} else if (datagt.notif_type == 'plan_user_joined' && datagt.context_id == plan_id) {
								console.log(datagt);
								var name = $('#notification_' + datagt.alert_id + '_info .blueName')[0].children[0].data;
								var image = $('img')[0].attribs.src;
								var uid = datagt.from_uids[Object.keys(datagt.from_uids)[0]];
								console.log(name);
								console.log(image);
								console.log(uid);
								// fs.appendFileSync('./name.txt', name + '\t' + uid + '\t我要參加！\n');
								// download(image, './image/' + uid + '.jpg', function() {
								// 	console.log('download done');
								// });
							}


						} catch (err) {
							console.log(err)
								//do nothing
						}
					}
				});
			}
		} catch (error) {
			console.log(error)
		};

		get_messages(raw.seq);
	});
};

var search_user = function(fbid, ids, callback) {
	var search = 'https://www.facebook.com/chat/user_info/?__user=' + fbid + '&__a=1&__dyn=7nm8RW8BgCBynzpQ9UoGya4Au74qbx2mbAKGiyFqzQC-C26m5-9V8CdDx2ubhHximmey8szoyfwgo&__req=j&__rev=1579293'
	_.each(ids, function(elem, idx) {
		search += '&ids[' + idx + ']=' + elem;
	}) ;
	// console.log(search)
	// 'ids[0]=100002343712028&ids[1]=100002343712028'
	// 
	fbrequest.get(search, function(err, httpResponse, body) {
		if (err) callback(err);
		var cuthead = /for \(;;\);(.+)/;
		var raw = JSON.parse(cuthead.exec(body)[1]);

		callback(null, raw.payload.profiles);
	});
};
var already = fs.readFileSync('./join.json');
var join = JSON.parse(already.toString());
exports.geteventguest = function geteventguest(from) {

	// console.log(join);

	fbrequest.get('https://www.facebook.com/ajax/browser/list/event_members/?id=798605910236376&edge=temporal_groups%3Amember_of_temporal_group&start=' + from + '&__user=' + fb_userid + '&__a=1&__dyn=7nmajEyl2lm9o-t2u5bGya4Au7pEsx6iqAdy9VQC-K26m6oKeG3t6zUybxu3fzob8iUkUyF8izam8y99EnGp3p8&__req=11&__rev=1744086', function(err, httpResponse, body) {
		console.log(from);
		var cuthead = /for \(;;\);(.+)/;
		var raw = JSON.parse(cuthead.exec(body)[1]);

		var raw_uni = ent.decode(raw.domops[0][3]['__html']);
		// console.log(raw_uni)
		if (raw_uni == '') {
			console.log('目前' + join.length + '人');
			fs.writeFile('./join.json', JSON.stringify(join), function(err, data) {
				console.log('結束');
			});
		} else {
			// console.log(raw_uni);
			$ = cheerio.load(raw_uni);
			$('.fbProfileBrowserListItem').each(function(i, elem) {
				// console.log(i)
				var image = $(this).find('img').attr('src');
				var name = $(this).find('.fcb a').text();
				// console.log(image);
				// console.log(name);
				var i_name = image.match(/\/\w\d+x\d+\/(.+)\.jpg\?/)[1];
				var obj = {
					name: name,
					i_name: i_name,
					image: image
				};
				if (!_.find(join, function(elem) {
						return elem.i_name == i_name;
					})) {
					console.log('new user: ' + obj.name);
					join.push(obj);
					download(image, './image/' + i_name + '.jpg', function() {
						// console.log('download done');
					});
				}


			});
			geteventguest(from + 100);
		}



	});
};