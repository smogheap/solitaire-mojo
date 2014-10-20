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
var SolitaireAssistant = Class.create({

setup: function()
{
	if (!this.gameid) return;

	if (!this.history)	this.history	= new History(this.gameid);
	if (!this.prefs)	this.prefs		= new Preferences(this.gameid);
	if (!this.suits)	this.suits		= [ 'diams', 'clubs', 'hearts', 'spades' ];

	this.skipAuto = 0;

	/* Set the stylesheet for the game */
	this.controller.get('gamecss').href = 'stylesheets/' + this.gameid.split('_')[0] + '.css';

	var chooseicon;
	if ('gamelist' != Preferences.get('gameselectionview', null)) {
		chooseicon = 'images/header-icon-grid-view.png';
	} else {
		chooseicon = 'images/header-icon-list-view.png';
	}

	this.appmenu = [
		{ command: 'gamelist',			label: $L('Choose Game'),	iconPath: chooseicon				},
		{ command: 'newgame',			label: $L('New Deal'),		iconPath: 'images/menu-new.png'		},
		{ command: 'restart',			label: $L('Restart'),		iconPath: 'images/menu-restart.png'	},
		{ command: 'undo',				label: $L('Undo'),			iconPath: 'images/menu-undo.png'	},
		{ command: 'stats',				label: $L('Statistics')											},
		{ command: Mojo.Menu.prefsCmd,	label: $L('Preferences')										},
		{ command: Mojo.Menu.helpCmd,	label: $L('Help')												}
	].concat(this.appmenu || []);

	this.controller.setupWidget(Mojo.Menu.appMenu,
		{ omitDefaultItems: true },
		{
			visible:		true,
			items:			this.appmenu
		}
	);

	this.buttons = [
		this.menubutton =
		{ command: 'menu',		label:		$L('...')					},
		{ command: 'undo',		iconPath:	'images/btn-undo.png'		},
		{ command: 'restart',	iconPath:	'images/btn-restart.png'	},
		{ command: 'newgame',	icon:		'new'						}
	].concat(this.buttons || []);

	this.controller.setupWidget(Mojo.Menu.commandMenu,
		{
			omitDefaultItems:	true,
			menuClass:			'no-fade'
		},
		this.buttonbar = {
			visible:			true,
			items: 				this.buttons
		}
	);

	// this.controller.enableFullScreenMode(true);

	/* Back should function as undo even in horizontal mode */
	this.controller.useLandscapePageUpDown(false);

	/* We want to know if the screen size changes */
	this.controller.listen(this.controller.window, 'resize',
		this.screenSizeChanged.bind(this));
	this.screenSizeChanged();

	/* Allow key presses without the gesture button as well */
	this.controller.listen(document, 'keyup',
		this.keyUp.bindAsEventListener(this), true);

	/* Pause the timer if the game is put in the background */
	this.controller.listen(document, Mojo.Event.stageDeactivate,
		this.background.bindAsEventListener(this), true);
	this.controller.listen(document, Mojo.Event.stageActivate,
		this.foreground.bindAsEventListener(this), true);

	/* Make sure the screen is oriented correctly before we load content */
	this.orientationChanged(this.controller.stageController.getWindowOrientation());

	/*
		Monitor dragging.  The stacks take care of it, but the game changes
		some styling when dragging.
	*/
	this.controller.listen(this.controller.get('all'), 'dragStart',
		this.cardsDragStart.bindAsEventListener(this));
	this.controller.listen(this.controller.get('all'), 'dragStop',
		this.cardsDragStop.bindAsEventListener(this));
},

ready: function()
{
	/*
		Attempt to load the game that was being played when the card was closed
		last time.  If the game can't be loaded then show the 'new game' dialog.

		In most cases we do NOT want to set the elapsed time from the saved
		state, but since we are loading fresh we do here.
	*/
	this.history.get(function(state) {
		this.setState(state, true);
		var s = this.saveState(true);

		/* reset the event log */
		MinegoApp.events = [];
		if (state) {
			MinegoApp.events.push('Resumed game #' + state.gamenum);
		}

		$$('.CardStack').each(function(stack)
		{
			stack.mojo.setSloppy(this.prefs.sloppy);
		}.bind(this));

		if (this.gameWon(s) || !this.gameValid(s)) {
			this.newGame({});
		}
	}.bind(this));

	if (!this.stats) {
		this.stats = new Stats(this.gameid);
	}

	this.activate();
},

activate: function()
{
	var body	= this.controller.get('body');

	$$('.CardStack').each(function(stack)
	{
		stack.mojo.setSloppy(this.prefs.sloppy);
	}.bind(this));

	switch (this.prefs.bgtype) {
		default:
		case 'felt':
			body.style.background = 'url(images/felt-alpha.png)';
			Element.removeClassName(body, 'wallpaper');
			break;

		case 'image':
			body.style.background = 'url(' + this.prefs.bgimage + ')';
			Element.addClassName(body, 'wallpaper');
			break;

		case 'color':
			body.style.background = '';
			Element.removeClassName(body, 'wallpaper');
			break;
	}

	/*
		Set the color after the image because setting the background image
		seems to overwrite the color.  The felt background image is
		transparent so that you can use it with multiple colors.
	*/
	switch (this.prefs.bgcolor) {
		/* Use the default from the palm dark theme */
		case 'darkgrey':	body.style.backgroundColor = '';		break;

		case 'green':		body.style.backgroundColor = '#136b2c';	break;
		case 'blue':		body.style.backgroundColor = '#2c52b3';	break;
		case 'black':		body.style.backgroundColor = '#1a1b1b';	break;
		case 'orange':		body.style.backgroundColor = '#e06325';	break;
		case 'red':			body.style.backgroundColor = '#a61919';	break;
		case 'yellow':		body.style.backgroundColor = '#c4aa32';	break;

		case 'brightyellow':body.style.backgroundColor = '#ffff00';	break;
		case 'brown':		body.style.backgroundColor = '#8B7355';	break;
		case 'coral':		body.style.backgroundColor = '#ff7f50';	break;
		case 'aquamarine':	body.style.backgroundColor = '#7fffd4';	break;
		case 'olive':		body.style.backgroundColor = '#6E8B3D';	break;
		case 'purple':		body.style.backgroundColor = '#8B0A50';	break;
		case 'pink':		body.style.backgroundColor = '#FF1493';	break;
		case 'navy':		body.style.backgroundColor = '#000080';	break;

		default:			body.style.backgroundColor = this.prefs.bgcolor;
																	break;
	}

	/* Add or remove the auto play button */
	for (var i = 0; i < this.buttons.length; i++) {
		if (this.buttons[i].command == 'auto') {
			this.buttons.splice(i, 1);
			break;
		}
	}
	if (!this.prefs.autoplay && this.autoPlayCards) {
		/* Insert the auto play button after undo, if it is NOT enabled */
		this.buttons.splice(2, 0, { command: 'auto', iconPath: 'images/menu-autoplay.png' });
	}
	this.controller.modelChanged(this.buttonbar);

	this.orientationChanged(this.controller.stageController.getWindowOrientation());
},

deactivate: function()
{
	this.controller.get('body').style.background		= '';
	this.controller.get('body').style.backgroundColor	= '';
},

cleanup: function()
{
	this.controller.stopListening(this.controller.window, 'resize',
		this.screenSizeChanged.bind(this));
	this.controller.stopListening(document, 'keyup',
		this.keyUp.bindAsEventListener(this), true);
	this.controller.stopListening(document, Mojo.Event.stageDeactivate,
		this.background.bindAsEventListener(this), true);
	this.controller.stopListening(document, Mojo.Event.stageActivate,
		this.foreground.bindAsEventListener(this), true);
	this.controller.stopListening(this.controller.get('all'), 'dragStart',
		this.cardsDragStart.bind(this));
	this.controller.stopListening(this.controller.get('all'), 'dragStop',
		this.cardsDragStop.bind(this));

	this.controller.stageController.setWindowOrientation('up');
},

orientationChanged: function(orientation)
{
	var body		= this.controller.get('body');
	var all			= this.controller.get('#all');

	if ('free' != this.prefs.orientation) {
		orientation = this.prefs.orientation;
	}

	/* Update classes based on orientation and preferences */
	switch (orientation) {
		default:
			Element.addClassName(body, 'vert');
			Element.removeClassName(body, 'horiz');
			break;

		case 'left': case 'right':
			Element.addClassName(body, 'horiz');
			Element.removeClassName(body, 'vert');
			break;
	}
	this.controller.stageController.setWindowOrientation(orientation);

	Element.removeClassName(body, 'leftdeck');
	Element.removeClassName(body, 'rightdeck');
	Element.addClassName(body, this.prefs.deckposition + 'deck');
},

screenSizeChanged: function()
{
	if (!this.controller) {
		/*
			When the scene has been popped this will be called but
			this.controller will be null.  Ignore it.
		*/
		return;
	}

	var all		= this.controller.get('all');
	var status	= this.controller.get('status');
	var h		= parseInt(this.controller.window.innerHeight);
	var w		= parseInt(this.controller.window.innerWidth);

	all.style.position		= 'absolute';
	all.style.left			= '0px';
	all.style.top			= '0px';

	all.style.width			= w + 'px';
	all.style.height		= h + 'px';

	status.style.width		= w + 'px';
	status.style.top		= (h - 20) + 'px';
	status.style.left		= Math.floor( w / 2) + 'px';
	status.style.marginLeft	= Math.floor(-w / 2) + 'px';
},

background: function(event)
{
	if (this.interval) {
		this.pauseTimer();
	}
},

foreground: function(event)
{
	if (!this.interval) {
		this.startTimer();
	}
},

handleCommand: function(event)
{
	var cmd	= null;
	var e	= null;

	if (typeof event == 'string') {
		cmd = event;
	} else if (!event || !event.type) {
		return;
	} else {
		e = event.originalEvent;

		switch (event.type) {
			case Mojo.Event.back:
				cmd = 'undo';
				break;

			case Mojo.Event.command:
				cmd = event.command;
				break;

			default:
				return;
		}
	}

	switch (cmd) {
		case 'menu':
			this.controller.popupSubmenu({
				onChoose:	this.handleCommand.bind(this),
				items:		this.appmenu,
				placeNear:	e.target
			});
			break;

		case 'addtolauncher':
			this.controller.serviceRequest('palm://com.palm.applicationManager/addLaunchPoint', {
				parameters:	{
					'id':		'net.minego.solitaire',
					'icon':		'icon.png',
					'title':	this.gametitle,
					'params':	{
						'id':	this.gameid
					}
				},
				onSuccess:	function()
				{
					Mojo.log('success');
				}.bind(this),
				onFailure:	function()
				{
					Mojo.log('failure');
				}.bind(this)
			});
			break;

		case 'gamelist':
			LaunchGame();
			break;

		case 'restart':
			this.restartGame();
			break;

		case 'newgame':
			this.newGame({ 'cancel': true });
			break;

		case 'undo':
			this.history.pop(function(state) {
				this.setState(state, false);
			}.bind(this));
			break;

		case 'auto':
			if (this.autoPlayCards) {
				this.autoplaying = true;
				this.autoPlayCards();
			}
			break;

		case 'deck':
			break;

		case 'flip':
			/* Toggle orientation */
			var orientation = this.prefs.orientation;

			if ('free' == this.prefs.orientation) {
				this.prefs.orientation = this.controller.stageController.getWindowOrientation();
			}

			if ('up' != this.prefs.orientation) {
				this.prefs.orientation = 'up';
			} else {
				this.prefs.orientation = 'left';
			}
			this.prefs.save();
			this.orientationChanged(this.controller.stageController.getWindowOrientation());
			break;

		case 'stats':
			this.controller.stageController.pushScene('stats', this.stats);
			break;

		case 'dump':
			$$('.CardStack').each(function(stack)
			{
				if (this.state[stack.id]) {
					Mojo.log('stack', stack.id + ':', Object.toJSON(this.state[stack.id]));
				}
			}.bind(this));
			break;

		case 'log':
			if (MinegoApp.events) {
				MinegoApp.events.each(function(e)
				{
					Mojo.log(e);
				});
			}
			break;

		case 'mail':
			if (MinegoApp.events) {
				this.controller.serviceRequest("palm://com.palm.applicationManager", {
					method:						'open',
					parameters: {
						id:						'com.palm.app.email',
						params:	{
							summary:			'Play Log: ' + this.gameid,
							text:				'Description of the problem:<br /><br />' +
												'Log:<br />' + MinegoApp.events.join('<br />') +

												'<br /><br />Preferences:<br />' +
												Object.toJSON(this.prefs.dump()) +

												'<br /><br />Device Info:<br />' +
												Object.toJSON(Mojo.Environment.DeviceInfo),
							recipients: [{
								type:			'email',
								role:			1,
								value:			'solitaire@minego.net',
								contactDisplay:	'minego'
							}]
						}
					}
				});
			}
			break;

		case Mojo.Menu.prefsCmd:
			this.controller.stageController.pushScene('prefs',
				this.prefs, this.gametitle, this.gameid);
			break;

		case 'about':
			this.controller.stageController.pushScene('about');
			break;

		case Mojo.Menu.helpCmd:
			this.controller.stageController.pushScene('howto', 'howto_' + this.gamename);
			break;

		default:
			/* Let the event through */
			return;
	}

	if (!MinegoApp.events) {
		MinegoApp.events = [];
	}
	MinegoApp.events.push('Command: ' + cmd);

	if (typeof event != 'string') {
		event.stop();
	}
},

setState: function(state, setElapsed)
{
	if (!state) {
		return(false);
	}

	this.skipAuto++;
	$$('.CardStack').each(function(stack) {
		stack.mojo.setCards(state[stack.id], state['gamenum']);
	}.bind(this));
	this.skipAuto--;

	this.state			= state;
	this.gamenum		= state['gamenum'];
	this.moves			= state['moves']		|| 0;
	this.remaining		= state['remaining']	|| 0;
	this.lowest			= state['lowest']		|| {};

	if (setElapsed) {
		this.pauseTimer();
		this.prevTime	= state['elapsed'];

		if (isNaN(this.prevTime) || this.prevTime > (60 * 60 * 24 * 3)) {
			this.prevTime = 0;
		}

		this.startTime	= new Date();
		this.startTimer();
	}

	/*
		The save state often doesn't include all the details about the state
		so use saveState() to calculate the rest of the needed values, but don't
		actually add it to the history.

		This needs to be done last, because it can override some things that are
		in the state, such as the elapsed time.
	*/
	this.oldlowest = null;
	this.saveState(true, state);
	this.highlightCards();

	return(true);
},

/*
	If ignore is truthy then all the work for saving the state will be done but
	noting with be added to the history.

	Return the number of cards that are NOT in play so the caller can tell if
	the game has been won.

	Also keep track of the lowest card in each suit.  These should be
	highlighted, unless it has been disabled.  If it doesn't make sense for a
	game then it can over write the highlightCards() function.
*/
saveState: function(ignore, state)
{
	var remaining	= 0;
	var total		= 0;
	var lowest		= {};

	if (!state) {
		state = {};
	}

	$$('.CardStack').each(function(stack) {
		var s		= [];
		var cards	= stack.mojo.getCards();
		var inplay	= stack.mojo.getAttributes()['inplay'];

		cards.each(function(card) {
			s.push({
				'suit':		card.suit,
				'rank':		card.rank,
				'facedown':	card.facedown,
				'offset':	card.offset
			});

			if (inplay) {
				remaining++;

				lowest[card.suit] = this.lowerRank(lowest[card.suit], card.rank);
			}
			total++;
		}.bind(this));

		state[stack.id] = s;
	}.bind(this));

	state['gamenum']	= this.gamenum;
	state['elapsed']	= this.getElapsedTime();
	state['moves']		= this.moves || 0;
	state['remaining']	= this.remaining = remaining;
	state['lowest']		= this.lowest = lowest;

	this.highlightCards();

	this.state = state;
	if (!ignore) {
		this.history.add(state, null, false);
	}

	return([total - remaining, total, remaining]);
},

changed: function(human, dealer, ignore)
{
	if (human) this.moves++;

	var s = this.saveState(ignore);

	if (this.gameWon(s) && this.pauseTimer()) {
		/* You won! */
		var elapsed = this.getElapsedTime();

		var s	= elapsed % 60;
		var m	= Math.floor((elapsed / 60)) % 60;
		var h	= Math.floor((elapsed / 60) / 60);

		var msg = [];

		msg.push('You finished game #' + this.gamenum + ' in');
		if (h) msg.push(h + ' hours');
		if (m) msg.push(m + ' minutes');
		if (s) msg.push(s + ' seconds');

		msg.push('with ' + this.moves + ' moves.');

		this.newGame({
			'title':	$L('You Won!'),
			'message':	msg.join(' '),
			'restart':	true,
			'stats':	true
		});
	}

	this.updateStatus();
},

/* Stats should be an array containing: played, total, remaining */
gameWon: function(stats)
{
	if (stats[0] == 52) {
		return(true);
	} else {
		return(false);
	}
},

/* Stats should be an array containing: played, total, remaining */
gameValid: function(stats)
{
	if (stats[2]) {
		return(true);
	} else {
		return(false);
	}
},

lowerRank: function(a, b)
{
	if (isNaN(a)) return(b);
	if (isNaN(b)) return(a);

	if (a < b) {
		return(a);
	} else {
		return(b);
	}
},

highlightCards: function()
{
	if (!this.prefs.hints) {
		return;
	}

	var oldlowest = {};

	this.suits.each(function(suit)
	{
		var card;
		var old;

		if (!isNaN(this.lowest[suit]) &&
			(card = this.findCardInPlay(suit, this.lowest[suit]))
		) {
			if (this.oldlowest && !isNaN(this.oldlowest[suit]) &&
				this.oldlowest[suit] != this.lowest[suit] &&
				(old  = this.findCardInPlay(suit, this.oldlowest[suit]))
			) {
				old.removeClassName('highlight');
			}

// Mojo.log('Highlighting', this.lowest[suit], suit);
			card.addClassName('highlight');
		}

		oldlowest[suit] = this.lowest[suit];
	}.bind(this));

	this.oldlowest = oldlowest;
},

deal: function(dealtype, gamenum)
{
	return({});
},

/* Find a specific card in play */
findCardInPlay: function(suit, rank)
{
	var stacks = $$('.CardStack');

	for (var s = stacks.length - 1; s >= 0; s--) {
		if (!stacks[s].mojo.getAttributes()['inplay']) continue;

		var cards = stacks[s].mojo.getCards();

		for (var c = cards.length - 1; c >= 0; c--) {
			if (cards[c].suit == suit && cards[c].rank == rank) {
				return(cards[c]);
			}
		}
	}

	return(null);
},

getScore: function(complete)
{
	return(this.remaining);
},

getScoreText: function(complete)
{
	if (!isNaN(this.remaining)) {
		return(this.remaining + ' ' + $L('cards remaining'));
	}
},

updateStatus: function()
{
	if (!this.controller) {
		this.pauseTimer();
		return;
	}

	/* Update the status text */
	var status = [];

	if (!isNaN(this.gamenum)) {
		status.push($L('Game #') + this.gamenum);
	}

	var score;

	if ((score = this.getScoreText())) {
		status.push(score);
	}

	if (this.prefs.timer) {
		var elapsed	= this.getElapsedTime();
		var s		= elapsed % 60;
		var m		= Math.floor((elapsed / 60)) % 60;
		var h		= Math.floor((elapsed / 60) / 60);

		status.push((h < 10 ? ('0' + h) : h) + ':' +
					(m < 10 ? ('0' + m) : m) + ':' +
					(s < 10 ? ('0' + s) : s));
	}

	this.controller.get('status').update(status.join('.&nbsp;&nbsp;&nbsp;'));
},

getElapsedTime: function()
{
	var elapsed = 0;

	if (this.prevTime && !isNaN(this.prevTime)) {
		elapsed += this.prevTime;
	}

	if (this.startTime) {
		var now = new Date();

		elapsed += Math.floor((now - this.startTime) / 1000);
	}

	return(elapsed);
},

pauseTimer: function()
{
	var now		= new Date();
	var elapsed = Math.floor((now - this.startTime) / 1000) + this.prevTime;
	var i;

	this.prevTime	= elapsed;
	this.startTime	= null;

	if ((i = this.interval)) {
		this.interval = null;
		window.clearInterval(i);

		return(true);
	} else {
		return(false);
	}
},

startTimer: function()
{
	if (!this.startTime) {
		this.startTime = new Date();
	}

	if (!this.interval) {
		this.updateStatus();
		this.interval = window.setInterval(this.updateStatus.bind(this), 1000);
	}
},

restartTimer: function()
{
	this.pauseTimer();

	this.prevTime	= 0;
	this.startTime	= null;

	this.startTimer();
},

newGame: function(options)
{
	var dealsleft	= undefined;

	if (!options) options = {};

	if (MinegoApp.allowGame) {
		dealsleft = MinegoApp.allowGame(this.gameid);
Mojo.log('Deals Left:', dealsleft);
	}

	if (undefined != dealsleft && !dealsleft) {
		/* Display the up-sell dialog */
		Mojo.log('No deals left for this game');

		this.controller.showAlertDialog({
			title:			$L('Upgrade'),
			message:		$L('Upgrade Message'),
			choices:		[
				{ label: $L('Keep Playing'),	value: 'upgrade',	'type': 'affirmative' 	}
			],
			onChoose:		function(value)
			{
				if (!value || value == 'cancel') return;

				new Mojo.Service.Request('palm://com.palm.applicationManager', {
					method: "open",
					parameters: {
						target: 'http://developer.palm.com/appredirect/?packageid=net.minego.solitaire'
					}
				});
			}.bind(this)
		});

		return;
	}

	if (undefined != dealsleft) {
		options['dealsleft'] = dealsleft;
	}

	options['dealtype']	= this.prefs.dealtype;
	options['gamenum']	= this.gamenum;
	options['callback']	= function(dealtype, gamenum) {
		if (dealtype == 'changegame') {
			LaunchGame();
			return;
		}

		if (dealtype == 'cancel') {
			return;
		}

		if (options['cancel']) {
			/*
				Save stats about the previous game.  This can't be saved until
				now because the user is allowed to cancel so this game isn't
				actually done until the user does something with this dialog.
			*/
			this.stats.add(this.gamenum, this.moves, this.getScore(true),
				this.getScoreText(true), this.getElapsedTime());
		}

		/* Remember the deal type */
		this.prefs.dealtype = dealtype;
		this.prefs.save();

		this.history.add(this.deal(dealtype, gamenum), function(state) {
			this.pauseTimer();

			$$('.CardStack').each(function(stack)
			{
				stack.mojo.setSloppy(this.prefs.sloppy);
			}.bind(this));

			this.setState(state, false);
			this.saveState();

			if (MinegoApp.allowGame) {
				MinegoApp.allowGame(this.gameid, true);
			}

			/* reset the event log */
			MinegoApp.events = [];
			MinegoApp.events.push('Preferences: ' + Object.toJSON(this.prefs.dump()));
			MinegoApp.events.push('Dealt game #' + state.gamenum);

			this.restartTimer();
		}.bind(this), true);
	}.bind(this);

	if (!options['cancel']) {
		/*
			Save stats about the previous game.  Since cancel is off the current
			game should be put into stats before showing the dialog.

			Since the dialog can't be canceled remove the game history as well
			because leaving it there may cause strange results if the app is
			closed while the dialog is up.
		*/
		var now		= new Date();
		var elapsed	= Math.floor((now - this.startTime) / 1000);

		this.stats.add(this.gamenum, this.moves, this.getScore(true),
			this.getScoreText(true), this.getElapsedTime());
		this.history.reset();
	}

	this.controller.showDialog({
		'template':			'newgame/newgame-dialog',
		'preventCancel':	true,
		'assistant':		new NewGameDialog(this, options, this.stats)
	});
},

restartGame: function()
{
	this.controller.showAlertDialog({
		onChoose: function(value) {
			if (value == 'restart') {
				this.history.restart(function(state) {
					this.setState(state, false);
					this.restartTimer();
				}.bind(this));
			}
		}.bind(this),

		title:		$L('Restart Game'),
		message:	$L('restart-sure'),

		choices:[
			{ label: $L('Restart'),	value:'restart',	type:'affirmative'	},
			{ label: $L('Cancel'),	value:'cancel',		type:'dismiss'		}
		]
	});
},

keyUp: function(event)
{
	if (!this.controller) return;

	var key	= String.fromCharCode(event.keyCode);
	var cmd	= null;

	Mojo.log('key: "' + key + '"');

	switch (key) {
		case ' ':			cmd = 'flip';		break;
		case 'u': case 'U':	cmd = 'undo';		break;
		case 'n': case 'N':	cmd = 'newgame';	break;
		case 'r': case 'R':	cmd = 'restart';	break;
		case 's': case 'S':	cmd = 'stats';		break;
		case 'x': case 'X':	cmd = 'dump';		break;
		case 'l': case 'L':	cmd = 'log';		break;
		case 'm': case 'M':	cmd = 'mail';		break;
	}

	if (cmd) {
		this.handleCommand(cmd);
	}
},

cardsDragStart: function()
{
	var f = this.controller.get('fade');
	var q = Mojo.Animation.queueForElement(f);

	if (!this.prefs.fade) {
		f.style.display	= 'none';
		return;
	}

	if (this.fadeAnimation) {
		this.fadeAnimation.cancel();
	}

	f.style.opacity	= 0.0;
	f.style.display	= 'block';

	this.fadeAnimation = Mojo.Animation.animateValue(q, 'bezier',
		function(value) {
			f.style.opacity = value;
		}.bind(this), {
			from:		0.0,
			to:			0.5,

			duration:	0.05,
			curve:		Mojo.Animation.easeOut,
			onComplete:	function() {

			}.bind(this)
		});
},

cardsDragStop: function()
{
	var f = this.controller.get('fade');
	var q = Mojo.Animation.queueForElement(f);

	if (!this.prefs.fade) {
		f.style.display	= 'none';
		return;
	}

	if (this.fadeAnimation) {
		this.fadeAnimation.cancel();
	}

	this.fadeAnimation = Mojo.Animation.animateValue(q, 'bezier',
		function(value) {
			f.style.opacity = 0.5 - value;
		}.bind(this), {
			from:		0.0,
			to:			f.style.opacity,

			duration:	0.05,
			curve:		Mojo.Animation.easeOut,
			onComplete:	function() {
				f.style.display	= 'none';
			}.bind(this)
		});
},

/*
	This function is called to determine if a card should be auto played
	without any user intervention.

	Basically the idea is that if the card MAY be needed by the player then
	it shouldn't be moved unless the player moves it.  If the card can never
	be useful then it should be moved.
*/
isCardFree: function(suit, rank)
{
	return(false);
},

/*
	Attempt to move a card to the foundation, or to another spot in the
	tableau when a user taps on it.

	When the card gets there it calls the dragDrop() call just like we would
	if the user dragged the card there, so the same rules apply.  If the
	user does something before the drag finishes then the card will get
	moved back to it's original spot.  No harm, no foul.

	Change the event name for a user triggered auto play vs an automatically
	triggered auto play so that we can keep track of the number of moves.

	If human is not truthy then a card should only be auto played if there are
	no other cards in play that can be played on it.
*/
autoPlayCard: function(stack, destinations, human, dealer, debug)
{
	if ((!this.prefs.autoplay || !this.interval) &&
		!this.autoplaying && !human && !dealer
	) {
		return(false);
	}

	if (this.skipAuto || !destinations || !destinations.length || !stack) {
		if (debug) {
			if (this.skipAuto) Mojo.log('skipAuto is on');
			if (!destinations || !destinations.length) Mojo.log('no destinations');
			if (!stack) Mojo.log('no source');
		}
		return(false);
	}
	var cards	= stack.mojo.getCards();
	if (!cards || !cards.length) {
		if (debug) Mojo.log('Source has no cards');
		return(false);
	}
	var last = cards[cards.length - 1];

	if (!dealer) {
		var free = human || this.isCardFree(last.suit, last.rank);

		for (var i = 0; i < destinations.length; i++) {
			if (destinations[i].mojo.checkCards([ last ]) && free) {
				break;
			}
		}
	} else {
		/* No point in trying more than one if dealer is true */
		var i = 0;
	}

	if (i >= destinations.length) {
		if (debug) Mojo.log('No stack wanted it');
		return(false);
	}

	this.skipAuto++;

	var dest	= destinations[i];
	var from	= Element.cumulativeOffset(stack);
	var to		= Element.cumulativeOffset(dest);

	from[0]		+= stack.mojo.cardOffset(NaN)[0];
	from[1]		+= stack.mojo.cardOffset(NaN)[1];

	var d		= dest.mojo.cardOffset(dest.mojo.getCards().length);
	to[0]		+= d[0];
	to[1]		+= d[1];

	var diff	= [ from[0] - to[0], from[1] - to[1] ];
	var was		= [ parseInt(last.style.left), parseInt(last.style.top) ];

	last.facedown = false;
	Mojo.Animation.animateValue(Mojo.Animation.queueForElement(last), 'bezier',
		function(value) {
			if (value > 1) value = 1;

			last.style.left		= (parseInt(was[0] - value * diff[0])) + 'px';
			last.style.top		= (parseInt(was[1] - value * diff[1])) + 'px';
			last.style.zIndex	= 200;
		}.bind(this), {
			from:		0.0,
			to:			1.2,

			duration:	0.1,
			curve:		Mojo.Animation.easeOut,
			onComplete:	function() {
				var cards = Element.up(last, 0);

				if (cards) {
					dest.mojo.dragDrop(cards, human, dealer, 1);
				}
				this.skipAuto--;

				if (this.autoPlayCards) {
					this.autoPlayCards();
				}
			}.bind(this)
		});

	return(true);
},

endAutoPlay: function()
{
	this.autoplaying = false;
},

/* Simple helper to determine the color of a card */
cardColor: function(card)
{
	switch (card['suit']) {
		case 'hearts':
		case 'diams':
			return('red');

		default:
			return('black');
	}
}

});

