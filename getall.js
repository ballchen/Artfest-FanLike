var fb = require('./fan');

fb.login(function(err, fbuser) {
	if (err) {
		console.log(err);
	} else {
		fb.pingpong(fbuser);
		// fb.get_messages();
		fb.geteventguest(0);
		fb.geteventguest(100);
	}
});