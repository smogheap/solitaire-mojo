var timers = {};

start = function(name)
{
	timers[name] = (new Date()).getTime();
};

stop = function(name, min)
{
	var a = timers[name];
	var b = (new Date()).getTime();

	if (isNaN(min)) {
		min = 10;
	}

	timers[name] = undefined;

	if ((b - a) > min) {
		Mojo.log('TIMER', name + ':', b - a);
	}
};

timefunc = function(name, fn, min)
{
	if (!fn) return(null);

	return function() {
		start(name);
		var ret = fn.apply(window, arguments);
		stop(name, min);
		return ret;
	};
};
