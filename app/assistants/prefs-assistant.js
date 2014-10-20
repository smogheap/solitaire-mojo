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

function PrefsAssistant(prefs, title, id)
{
    this.prefs		= prefs;
	this.gametitle	= title;
	this.gameid		= id;
}

PrefsAssistant.prototype.setup = function()
{
    $$('.translate').each(function(e) { e.update($L(e.innerHTML)); });
	this.controller.setupWidget(Mojo.Menu.appMenu,
		{ omitDefaultItems: true },
		this.menu = {
			visible:		true,
			items: [
				Mojo.Menu.editItem,
				{ label: $L('Reset'),				command: 'reset'		},
				{ label: $L('Apply to all games'),	command: 'applytoall'	},
				{ label: $L('Restore'),				command: 'restore',
													checkEnabled: true		}
			]
		}
	);

	this.controller.setupWidget('autoplay', {
		trueLabel:		$L('on'),
		falseLabel:		$L('off'),
		trueValue:		true,
		falseValue:		false,
		modelProperty:	'autoplay'
	}, this.prefs);

	this.controller.setupWidget('showtimer', {
		trueLabel:		$L('on'),
		falseLabel:		$L('off'),
		trueValue:		true,
		falseValue:		false,
		modelProperty:	'timer'
	}, this.prefs);

	this.controller.setupWidget('showfade', {
		trueLabel:		$L('on'),
		falseLabel:		$L('off'),
		trueValue:		true,
		falseValue:		false,
		modelProperty:	'fade'
	}, this.prefs);

	this.controller.setupWidget('sloppy', {
		trueLabel:		$L('on'),
		falseLabel:		$L('off'),
		trueValue:		true,
		falseValue:		false,
		modelProperty:	'sloppy'
	}, this.prefs);

	this.controller.setupWidget('hints', {
		trueLabel:		$L('on'),
		falseLabel:		$L('off'),
		trueValue:		true,
		falseValue:		false,
		modelProperty:	'hints'
	}, this.prefs);

    this.controller.setupWidget('deckposition', {
		label:			$L('Deck Position'),
		modelProperty:	'deckposition',
		choices: [
			{ label: $L('Left'),		value:'left'		},
			{ label: $L('Right'),		value:'right'		}
		]
	}, this.prefs);

    this.controller.setupWidget('orientation', {
		label:			$L('Layout'),
		modelProperty:	'orientation',
		choices: [
			{ label: $L('Automatic'),	value:'free'		},
			{ label: $L('Vertical'),	value:'up'			},
			{ label: $L('Horizontal'),	value:'left'		}
		]
	}, this.prefs);

	this.controller.listen(this.controller.get('orientation'),
		Mojo.Event.propertyChange, this.orientationChange.bindAsEventListener(this));

	/* Allow the user to choose a color, or an image for the background */
	this.controller.setupWidget('bgtype', {
		label:			$L('Type'),
		modelProperty:	'bgtype',
		choices: [
			{ label: $L('Felt'),		value:'felt'		},
			{ label: $L('Solid Color'),	value:'color'		},
			{ label: $L('Wallpaper'),	value:'image'		}
		]
	}, this.prefs);

	this.controller.listen(this.controller.get('bgtype'),
		Mojo.Event.propertyChange, this.bgTypeChange.bindAsEventListener(this));
	this.bgTypeChange();

    this.controller.setupWidget('bgcolor', {
		label:			$L('Color'),
		modelProperty:	'bgcolor',

		choices: [
			{ label: $L('Green'),			value:'green'		},
			{ label: $L('Grey'),			value:'darkgrey'	},
			{ label: $L('Black'),			value:'black'		},
			{ label: $L('Orange'),			value:'orange'		},
			{ label: $L('Red'),				value:'red'			},
			{ label: $L('Blue'),			value:'blue'		},
			{ label: $L('Yellow'),			value:'yellow'		},
			{ label: $L('Bright Yellow'),	value:'brightyellow'},
			{ label: $L('Brown'),			value:'brown'		},
			{ label: $L('Coral'),			value:'coral'		},
			{ label: $L('Aqua Marine'),		value:'aquamarine'	},
			{ label: $L('Olive'),			value:'olive'		},
			{ label: $L('Purple'),			value:'purple'		},
			{ label: $L('Pink'),			value:'pink'		},
			{ label: $L('Navy Blue'),		value:'navy'		}
		]
	}, this.prefs);

	/* Hide fields that don't make sense for this game */
	for (var i = this.prefs.hide.length - 1; i >= 0; i--) {
		Mojo.log('Hiding field:', this.prefs.hide[i]);

		Element.up(this.controller.get(this.prefs.hide[i]), '.palm-row').hide();
	}

	this.controller.listen(this.controller.get('bgimage'), Mojo.Event.tap,
		this.chooseWallpaper.bindAsEventListener(this));

	this.controller.listen(this.controller.get('addtolauncher'), Mojo.Event.tap,
		this.addToLauncher.bindAsEventListener(this));

	this.controller.listen(this.controller.get('applytoall'), Mojo.Event.tap,
		this.applyToAll.bindAsEventListener(this));
};

PrefsAssistant.prototype.deactivate	= function()
{
    this.prefs.save();
};

PrefsAssistant.prototype.handleCommand = function(event)
{
	switch (event.type) {
		case Mojo.Event.commandEnable:
			switch (event.command) {
				case 'restore':
					if (!this.prefs.global) {
						event.preventDefault();
					}
					break;
			}

			break;

		case Mojo.Event.command:
			Mojo.log('handleCommand: ', event.command);

			switch (event.command) {
				case 'reset':
					this.prefs.reset();
					this.controller.modelChanged(this.prefs, this);
					break;

				case 'applytoall':
					this.applyToAll();
					break;

				case 'restore':
					this.prefs.load(true);
					this.prefs.save();
					break;
			}
			break;
    }
};

PrefsAssistant.prototype.orientationChange = function()
{
	if (this.prefs.orientation == 'left') {
		this.controller.showAlertDialog({
			onChoose: function(value) {
				if ('cancel' == value) {
					this.prefs.orientation = 'free';
					this.prefs.save();
					this.controller.modelChanged(this.prefs, this);
				}
			}.bind(this),

			title:		$L('Warning'),
			message:	$L('horizontal-warning'),

			choices:[
				{ label: $L('Ok'),		value:'ok',		type:'affirmative'	},
				{ label: $L('Cancel'),	value:'cancel',	type:'dismiss'		}
			]
		});
	}
};

PrefsAssistant.prototype.bgTypeChange = function()
{
	switch (this.prefs.bgtype) {
		case 'felt':
		case 'color':
			this.controller.get('bgcolor').style.display = 'block';
			this.controller.get('bgimage').style.display = 'none';

			if (!this.prefs.bgcolor) {
				this.prefs.bgcolor = 'green';
			}

			this.prefs.bgimage = null;
			this.prefs.save();
			break;

		case 'image':
			this.controller.get('bgcolor').style.display = 'none';
			this.controller.get('bgimage').style.display = 'block';

			if (!this.prefs.bgimage) {
				this.chooseWallpaper();
			}
			break;
	}
};

PrefsAssistant.prototype.chooseWallpaper = function()
{
	/* Let the user choose a wallpaper */
	Mojo.FilePicker.pickFile({
		kinds:			[ 'image' ],
		actionType:		'select',
		onSelect:		function (choice) {
			Mojo.log(choice.fullPath);

			this.prefs.bgimage = choice.fullPath;
			this.prefs.save();
		}.bind(this)
	}, this.controller.stageController);
};

PrefsAssistant.prototype.addToLauncher = function()
{
	var title = this.gametitle;

	if (-1 != Mojo.appInfo.id.indexOf('beta')) {
		title += " Beta";
	}

	this.controller.serviceRequest('palm://com.palm.applicationManager', {
		method: 'addLaunchPoint',
		parameters:	{
			'id':		Mojo.appInfo.id,
			'icon':		'icon.png',
			'title':	title,
			'params':	{
				'id':	this.gameid
			}
		},
		onSuccess: function(response)
		{
			Mojo.log('success');

			this.prefs.launcherid = response.launchPointId;
			this.prefs.save();


			this.controller.showAlertDialog({
				title:		$L('Success'),
				message:	$L('Added icon to Launcher'),
				choices:	[ { label: $L('Ok') } ]
			});
		}.bind(this),
		onFailure: function()
		{
			Mojo.log('failure');

			this.controller.showAlertDialog({
				title:		$L('Failed'),
				message:	$L('Could not add to Launcher'),
				choices:	[ { label: $L('Ok') } ]
			});
		}.bind(this)
	});
};

PrefsAssistant.prototype.applyToAll = function()
{
	this.controller.showAlertDialog({
		onChoose: function(value) {
			if ('ok' == value) {
				/*
					Store the current settings over the global
					settings, with a higher timestamp.  The
					timestamp will determine which settings to
					load.
				*/
				Preferences.set('global_options', this.prefs.dump());
			}
		}.bind(this),

		title:		$L('Apply settings to all games'),
		message:	$L('apply-all-warning'),

		choices:[
			{ label: $L('Ok'),		value:'ok',		type:'affirmative'	},
			{ label: $L('Cancel'),	value:'cancel',	type:'dismiss'		}
		]
	});
};

