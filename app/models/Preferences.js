/*
	Copyright (c) 2010, Micah N Gorrell
	All rights reserved.

	THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR IMPLIED
	WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
	MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO
	EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
	SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
	PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
	OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
	WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
	OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
	ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
function Preferences(name) {
	this.name	= name;
	this.hide	= {};

    this.load();
}

Preferences.get = function(key, defaultValue) {
	var cookie	= new Mojo.Model.Cookie(key);
	var value;

	if (!(value = cookie.get())) {
		cookie.put(defaultValue);
		value = cookie.get();
	}

	return(value);
};

Preferences.set = function(key, value) {
	var cookie = new Mojo.Model.Cookie(key);

	cookie.put(value);
	return(value);
};

Preferences.prototype.load = function(ignoreglobal)
{
	var prefs	= Preferences.get(this.name + '_options', {});
	var global	= Preferences.get('global_options', {});

	/*
		If the user used the 'Apply to all Games' menu option then the global
		settings will have a higher timestamp than the game's options.  If that
		is the case then use the global settings instead of the per game
		settings.
	*/
	if (!ignoreglobal && (global['timestamp'] || 0) > (prefs['timestamp'] || 0)) {
		prefs = global;
		this.global = true;
	} else {
		this.global = false;
	}
	delete global;

	this.reset();

	if (prefs['autoplay'] != undefined) {
		this.autoplay	= prefs['autoplay'];
	}

	if (prefs['fade'] != undefined) {
		this.fade		= prefs['fade'];
	}

	if (prefs['hints'] != undefined) {
		this.hints		= prefs['hints'];
	}

	if (prefs['sloppy'] != undefined) {
		this.sloppy		= prefs['sloppy'];
	}

	if (prefs['timer'] != undefined) {
		this.timer		= prefs['timer'];
	}

	this.gametype		= prefs['gametype']		|| this.gametype;
	this.dealtype		= prefs['dealtype']		|| this.dealtype;
	this.orientation	= prefs['orientation']	|| this.orientation;
	this.deckposition	= prefs['deckposition']	|| this.deckposition;
	this.bgtype			= prefs['bgtype']		|| this.bgtype;
	this.bgcolor		= prefs['bgcolor']		|| this.bgcolor;
	this.bgimage		= prefs['bgimage']		|| this.bgimage;
	this.launcherid		= prefs['launcherid']	|| this.launcherid;

	/* Support for preferences stored with old versions */
	if (!this.bgtype) {
		switch (prefs['boardcolor']) {
			case 'felt':
				this.bgtype		= 'felt';
				this.bgcolor	= 'green';
				break;

			case 'wallpaper':
				this.bgtype		= 'image';
				this.bgimage	= prefs['wallpaper'];
				break;

			default:
				this.bgtype		= 'color';
				this.bgcolor	= prefs['boardcolor'];
				break;
		}

		this.save();
	}
};

Preferences.prototype.dump = function()
{
	return({
		'timestamp':	(new Date()).getTime(),

		'autoplay':		this.autoplay,
		'fade':			this.fade,
		'hints':		this.hints,
		'sloppy':		this.sloppy,
		'timer':		this.timer,
		'gametype':		this.gametype,
		'dealtype':		this.dealtype,
		'orientation':	this.orientation,
		'deckposition':	this.deckposition,
		'bgtype':		this.bgtype,
		'bgcolor':		this.bgcolor,
		'bgimage':		this.bgimage,
		'launcherid':	this.launcherid
	});
};

Preferences.prototype.save = function()
{
	Preferences.set(this.name + '_options', this.dump());
};

Preferences.prototype.reset = function()
{
	this.autoplay		= true;
	this.fade			= true;
	this.hints			= true;
	this.sloppy			= true;
	this.timer			= true;
	this.gametype		= 'traditional';
	this.dealtype		= 'random';
	this.orientation	= 'free';
	this.deckposition	= 'left';
	this.bgtype			= 'felt';
	this.bgcolor		= 'green';
	this.bgimage		= null;
};

