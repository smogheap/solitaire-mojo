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

function NewGameDialog(scene, options, stats)
{
	this.stats		= stats;
	this.controller	= scene.controller;
	this.options	= options || {};

	if (!this.options['dealtype']) {
		this.options['dealtype'] = 'random';
	}

	this.options['lastgamenum'] = this.options['gamenum'] || 0;
	if (isNaN(this.options['gamenum'])) {
		this.options['gamenum'] = Math.floor(Math.random() * 1000000);
	}
}

NewGameDialog.prototype.setup = function(widget)
{
	this.widget	= widget;

	this.controller.get('title').update(this.options['title'] || $L('New Deal'));
	this.controller.get('subtitle').update(this.options['message'] || '');

	if (!isNaN(this.options['dealsleft'])) {
		this.controller.get('dealsleft').update(this.options['dealsleft'] + ' ' +
			$L('deals remaining in demo.'));
	}

	var choices = [
		{ label: $L('Random'),				value:'random'		},
		{ label: $L('Select by number'),	value:'choose'		}
	];

	this.controller.setupWidget('dealtype', {
		label:			$L('Deal'),
		modelProperty:	'dealtype',
		choices: 		choices.concat(this.options['extrachoices'])
	}, this.options);

	this.controller.setupWidget('gamenum', {
		'modelProperty':		'gamenum',
		'modifierState':		Mojo.Widget.numLock,
		'focusMode':			Mojo.Widget.focusSelectMode,
		'autoFocus':			false,
		'changeOnKeyPress':		true
	}, this.options);

	this.options['okdisabled'] = false;
	this.controller.setupWidget('OkButton', {
		'label':			$L('Deal'),
		'disabledProperty':	'okdisabled'
	}, this.options);

	this.controller.setupWidget('CancelButton', {
		'label':	$L('Cancel')
	}, {});
	if (!this.options['cancel']) {
		this.controller.get('CancelButton').style.display = 'none';
	}

	this.controller.setupWidget('StatsButton', {
		'label':	$L('View Statistics')
	}, {});
	if (this.options['stats']) {
		/* Show an option to view the stats page */
		this.controller.get('StatsButton').style.display = 'block';
	}

	this.controller.setupWidget('ChooseGameButton', {
		'label':	$L('Change Game')
	}, {});
	if (!this.options['cancel']) {
		/* If cancel isn't shown then allow choosing another game instead */
		this.controller.get('ChooseGameButton').style.display = 'block';
	}

	this.controller.listen('dealtype',			Mojo.Event.propertyChange, this.changeDealType.bindAsEventListener(this));
	this.controller.listen('gamenum',			Mojo.Event.propertyChange, this.changeGameNum.bindAsEventListener(this));
	this.controller.listen('OkButton',			Mojo.Event.tap, this.handleOk.bind(this));
	this.controller.listen('CancelButton',		Mojo.Event.tap, this.handleCancel.bind(this));
	this.controller.listen('StatsButton',		Mojo.Event.tap, this.handleStats.bind(this));
	this.controller.listen('ChooseGameButton',	Mojo.Event.tap, this.handleChooseGame.bind(this));

	this.changeDealType();
	this.changeGameNum();
};

NewGameDialog.prototype.cleanup = function()
{
	this.controller.stopListening('dealtype',		Mojo.Event.propertyChange, this.changeDealType.bindAsEventListener(this));
	this.controller.stopListening('gamenum',		Mojo.Event.propertyChange, this.changeGameNum.bindAsEventListener(this));
	this.controller.stopListening('OkButton', 		Mojo.Event.tap, this.handleOk.bind(this));
	this.controller.stopListening('CancelButton',	Mojo.Event.tap, this.handleCancel.bind(this));
	this.controller.stopListening('StatsButton',	Mojo.Event.tap, this.handleStats.bind(this));
	this.controller.stopListening('ChooseGameButton',	Mojo.Event.tap, this.handleChooseGame.bind(this));
};

NewGameDialog.prototype.changeDealType = function(event)
{
	this.controller.get('message').update($L(''));
	this.options['okdisabled'] = false;

	switch (this.options['dealtype']) {
		case 'choose':
			this.controller.get('gamenum').style.display = 'block';
			this.options['gamenum'] = parseInt(this.options['lastgamenum']) + 1;
			if (this.options['gamenum'] < 1) {
				this.options['gamenum'] = 1;
			}
			break;

		default:
			this.options['gamenum'] = Math.floor(Math.random() * 1000000);
			this.controller.get('gamenum').style.display = 'none';
			break;
	}

	if (event) {
		this.controller.modelChanged(this.options);
	}
};

NewGameDialog.prototype.changeGameNum = function(event)
{
	/* Verify the game number.  -99 is a special case testing game. */
	if (this.options['gamenum'] == parseInt(this.options['gamenum']) &&
		((this.options['gamenum'] > 0 && this.options['gamenum'] < 1000001) || -99 == this.options['gamenum'])
	) {
		this.options['okdisabled'] = false;

		/*
			Let the user know if they have played this game before, and how they
			did.
		*/
		var msg = this.controller.get('message');

		msg.update('');
		this.stats.get(this.options['gamenum'], function(rows) {
			if (!rows || !rows.length) {
				msg.update('');
				return;
			}

			var row = rows.item(0);
			if (isNaN(row['moves'])) {
				msg.update('');
			} else if (0 == row['score']) {
				/* The player has already won this game # */
				var t	= row['time'];
				var s	= t % 60;
				var m	= Math.floor(t / 60) % 60;
				var h	= Math.floor((t / 60) / 60);

				msg.update('Last time you played game #' +
					this.options['gamenum'] +
					' you won in ' + row['moves'] +
					' moves.  It took you' +
					(h ? (' ' + h + ' hours'	) : '') +
					(m ? (' ' + m + ' minutes'	) : '') +
					(s ? (' ' + s + ' seconds'	) : '') +
					'.  Can you do better this time?');
			} else {
				/* The player has already played this game #, but didn't win */
				msg.update('Last time you attempted game #' +
					this.options['gamenum'] +
					' you gave up with ' + row['scoretext'] +
					'.  Can you do better this time?');
			}
		}.bind(this));
	} else {
		this.controller.get('message').update($L('Invalid game number'));

		this.options['okdisabled'] = true;
	}

	if (event) {
		this.controller.modelChanged(this.options);
	}
};

NewGameDialog.prototype.handleOk = function()
{
	this.widget.mojo.close();
	this.options['callback'](this.options['dealtype'], this.options['gamenum']);
};

NewGameDialog.prototype.handleCancel = function() {
	if (this.options['cancel']) {
		this.widget.mojo.close();
		this.options['callback']('cancel');
	}
};

NewGameDialog.prototype.handleChooseGame = function() {
	this.widget.mojo.close();
	this.options['callback']('changegame');
};

NewGameDialog.prototype.handleStats = function()
{
	this.controller.stageController.pushScene('stats', this.stats);
};

NewGameDialog.prototype.handleCommand = function(event)
{
	event.stop();

	if (this.options['cancel']) {
		this.widget.mojo.close();
		this.options['callback']('cancel');
	}
};

