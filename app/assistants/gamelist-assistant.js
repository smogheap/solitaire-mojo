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

function GamelistAssistant()
{
}

GamelistAssistant.prototype.setup = function()
{
	this.controller.listen(this.controller.get('view-toggle'), Mojo.Event.tap,
		this.toggleView.bindAsEventListener(this));

	this.games = [
		{ type: 'freecell',	label: "FreeCell",					value: 'freecell'					},
		{ type: 'freecell',	label: "Relaxed FreeCell",			value: 'freecell_relaxed'			},
		{ type: 'freecell',	label: "Baker's Game",				value: 'freecell_bakers'			},
		{ type: 'freecell',	label: "ForeCell",					value: 'freecell_forecell'			},
		{ type: 'freecell',	label: "Challenge FreeCell",		value: 'freecell_challenge'			},
		{ type: 'freecell',	label: "Super Challenge FreeCell",	value: 'freecell_super_challenge'	},

		{ type: 'klondike',	label: "Klondike",					value: 'klondike_draw_1'			},
		{ type: 'klondike',	label: "Klondike (Draw 3)",			value: 'klondike_draw_3'			},
		{ type: 'klondike',	label: "Thoughtful Klondike",		value: 'klondike_thoughtful'		},
		{ type: 'klondike',	label: "Westcliff",					value: 'westcliff'					},

		{ type: 'spider',	label: "Spider",					value: 'spider_4_suits'				},
		{ type: 'spider',	label: "Spider (2 suits)",			value: 'spider_2_suits'				},
		{ type: 'spider',	label: "Spider (1 suits)",			value: 'spider_1_suit'				},
		{ type: 'spider',	label: "Relaxed Spider",			value: 'spider_relaxed'				},
		{ type: 'spider',	label: "Easy Spider",				value: 'spider_easy'				},

		{ type: 'spider',	label: "Spiderette",				value: 'spiderette_4_suits'			},
		{ type: 'spider',	label: "Spiderette (2 suits)",		value: 'spiderette_2_suits'			},
		{ type: 'spider',	label: "Spiderette (1 suits)",		value: 'spiderette_1_suit'			},
		{ type: 'spider',	label: "Relaxed Spiderette",		value: 'spiderette_relaxed'			},
		{ type: 'spider',	label: "Easy Spiderette",			value: 'spiderette_easy'			},

		{ type: 'golf',		label: "Golf",						value: 'golf'						},
		{ type: 'golf',		label: "Relaxed Golf",				value: 'golf_relaxed'				},
		{ type: 'golf',		label: "Dead King Golf",			value: 'golf_dead_king'				},

		{ type: 'canfield',	label: "Canfield",					value: 'canfield'					},

		{ type: 'acesup',	label: "Aces Up",					value: 'acesup'						},
		{ type: 'acesup',	label: "Aces Up (2 suits)",			value: 'acesup_2_suits'				},
		{ type: 'acesup',	label: "Aces Up (1 suits)",			value: 'acesup_1_suit'				},

		{ type: 'pyramid',	label: "Pyramid",					value: 'pyramid'					},
		{ type: 'pyramid',	label: "Relaxed Pyramid",			value: 'pyramid_relaxed'			},
		{ type: 'pyramid',	label: "Double Pyramid",			value: 'doublepyramid'				},
		{ type: 'pyramid',	label: "Relaxed Double Pyramid",	value: 'doublepyramid_relaxed'		},

		{ type: 'gaps',		label: "Gaps (Montana)",			value: 'gaps'						},
		{ type: 'gaps',		label: "Relaxed Gaps",				value: 'gaps_relaxed'				},
		{ type: 'gaps',		label: "Spaces",					value: 'gaps_spaces'				},
		{ type: 'gaps',		label: "Relaxed Spaces",			value: 'gaps_spaces_relaxed'		},
		{ type: 'gaps',		label: "Addiction",					value: 'gaps_addiction'				},

		{ type: 'yukon',	label: "Yukon",						value: 'yukon'						},
		{ type: 'yukon',	label: "Relaxed Yukon",				value: 'yukon_relaxed'				},
		{ type: 'yukon',	label: "Russian Solitaire",			value: 'yukon_russian'				},
		{ type: 'yukon',	label: "Alaska",					value: 'yukon_alaska'				},
		{ type: 'yukon',	label: "Moosehide",					value: 'yukon_moosehide'			}
	];

	this.favorites = Preferences.get('favoritegames', [
		'freecell',
		'klondike_draw_3',
		'golf'
	]);

	this.controller.get('gamecss').href = '#';

	this.controller.setupWidget(Mojo.Menu.appMenu,
		{ omitDefaultItems: true },
		this.menu = {
			visible:		true,
			items: [
				Mojo.Menu.editItem,
				{ label: $L('About'),					command: 'about'	},
				{ label: $L('Contact'),
					items: [
						{ label: $L('E-Mail'),			command: 'email'	},
						{ label: $L('Twitter'),			command: 'twitter'	},
						{ label: $L('Leave a Review'),	command: 'review'	}
					]
				}
			]
		}
	);

	this.gamelist = this.controller.get('gamelist');
	this.controller.setupWidget('gamelist',
	{
		itemTemplate:		'gamelist/item',
		dividerTemplate:	'gamelist/group',
		filterFunction:		this.getItems.bind(this),
		dividerFunction:	this.getType.bind(this),
		formatters:			{ label: this.formatLabel.bind(this) }
	}, this.gameListModel = {});

	Mojo.Event.listen(this.controller.get('gamelist'), Mojo.Event.listTap, this.listTap.bindAsEventListener(this));

	if (MinegoApp.allowGame && MinegoApp.showWelcome) {
		/*
			The MinegoApp.allowGame callback only exists in the demo version of
			the app.  Give the user a little welcome screen explaining the
			limits of the demo, and giving them an option to buy the full game.
		*/
		MinegoApp.showWelcome(this.controller);
	}

	if (-1 != Mojo.appInfo.id.indexOf('beta')) {
		$$(".beta").each(function(e) {
			e.style.display = 'block';
		});
	}
};

GamelistAssistant.prototype.cleanup = function()
{
	Mojo.Event.stopListening(this.controller.get('gamelist'), Mojo.Event.listTap, this.listTap.bindAsEventListener(this));
	this.controller.stopListening(this.controller.get('view-toggle'), Mojo.Event.tap, this.toggleView.bindAsEventListener(this));
};

GamelistAssistant.prototype.getItems = function(filter, widget, offset, count)
{
	var items	= [];
	var f;
	var i;
	var c;

	if (filter && filter.length > 0) {
		f = filter.toLowerCase();
		this.controller.get('header-spacer').hide();
	} else {
		f = null;
		this.controller.get('header-spacer').show();

		/* Insert a duplicate of each of the favorites */
		for (c = 0; c < this.favorites.length; c++) {
			for (i = 0; i < this.games.length; i++) {
				if (this.games[i].value == this.favorites[c]) {
					items.push({
						type:		'favorites',
						label:		this.games[i].label,
						value:		this.games[i].value,
						favorite:	'on'
					});

					break;
				}
			}
		}
	}

	for (i = 0; i < this.games.length; i++) {
		this.games[i].favorite = 'off';
		for (c = 0; c < this.favorites.length; c++) {
			if (this.games[i].value == this.favorites[c]) {
				this.games[i].favorite = 'on';
				break;
			}
		}

		if (!f || -1 != this.games[i]['label'].toLowerCase().indexOf(f)) {
			/* match */
			items.push(this.games[i]);
		}
	}

	widget.mojo.noticeUpdatedItems(0, items);
	widget.mojo.setLength(items.length);
	widget.mojo.setCount(items.length);
};

GamelistAssistant.prototype.getType = function(item)
{
	if (item && item['type']) {
		return($L(item['type']));
	} else {
		return(null);
	}
};

GamelistAssistant.prototype.formatLabel = function(label)
{
	if (label) {
		return($L(label));
	} else {
		return(null);
	}
};

GamelistAssistant.prototype.listTap = function(event)
{
	var item			= event.item;

	if (event.originalEvent.target.nodeName.toLowerCase() == 'img') {
		/* Update favorites */

		for (var i = 0; i < this.favorites.length; i++) {
			if (this.favorites[i] == item.value) {
				/* Remove the item from favorites */
				this.favorites.splice(i, 1);

				this.gamelist.mojo.invalidateItems(0);
				Preferences.set('favoritegames', this.favorites);
				return;
			}
		}

		/* Add the item to favorites */
		this.favorites.push(item.value);

		this.gamelist.mojo.invalidateItems(0);
		Preferences.set('favoritegames', this.favorites);
	} else {
		/* Split the scene name from the game id. */
		var scene	= item.value.split('_')[0];

		if (scene == 'howto') {
			this.controller.stageController.pushScene(scene, item.value);
		} else {
			LaunchGame(item.value);
		}
	}
};

GamelistAssistant.prototype.toggleView = function(event)
{
	this.controller.setDefaultTransition(Mojo.Transition.crossFade);
	Preferences.set('gameselectionview', 'gamegrid');
	LaunchGame(null, Mojo.Transition.crossFade);
};

GamelistAssistant.prototype.handleCommand = function(event)
{
	switch (event.type) {
		case Mojo.Event.command:
			Mojo.log('handleCommand: ', event.command);

			switch (event.command) {
				case 'about':
					event.stop();
					this.controller.stageController.pushScene('about');
					return;

				case 'email':
					event.stop();
					window.location = "mailto:support@minego.net";
					return;

				case 'twitter':
					event.stop();
					window.location = "https://twitter.com/#!/webossolitaire";
					return;

				case 'review':
					event.stop();
					window.location = "https://developer.palm.com/appredirect/?packageid=net.minego.solitaire";
					return;


				case Mojo.Menu.helpCmd:
					event.stop();
					this.controller.stageController.pushScene('help');
					return;

				default:
					return;
			}
			break;

		case Mojo.Event.back:
			break;
	}
};

