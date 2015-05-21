var fb = require('./fan');
var CronJob = require('cron').CronJob;


fb.login(function(err, fbuser) {
	if (err) {
		console.log(err);
	} else {
		fb.pingpong(fbuser);
		fb.get_messages();
		new CronJob('*/5 * * * * *', function() {
			fb.geteventguest(0);
		}, null, true, 'Asia/Taipei');
	}
});