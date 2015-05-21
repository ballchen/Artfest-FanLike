var fb = require('./fan');

fb.login(function(err, fbuser) {
	if (err) {
		console.log(err);
	} else {
		fb.pingpong(fbuser);
		fb.geteventguest(0);
	}
});