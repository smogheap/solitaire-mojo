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

function GamegridAssistant()
{
}

GamegridAssistant.prototype.setup = function()
{
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

	this.controller.listen(this.controller.window, Mojo.Event.tap,
		this.choose.bindAsEventListener(this));

	this.controller.listen(this.controller.get('view-toggle'), Mojo.Event.tap,
		this.toggleView.bindAsEventListener(this));

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

GamegridAssistant.prototype.ready = function()
{
};

GamegridAssistant.prototype.activate = function()
{
};

GamegridAssistant.prototype.deactivate = function()
{
};

GamegridAssistant.prototype.cleanup = function()
{
	this.controller.stopListening(this.controller.window, Mojo.Event.tap,
		this.choose.bindAsEventListener(this));
	this.controller.stopListening(this.controller.get('view-toggle'), Mojo.Event.tap,
		this.toggleView.bindAsEventListener(this));
};

GamegridAssistant.prototype.toggleView = function(event)
{
	Preferences.set('gameselectionview', 'gamelist');
	LaunchGame(null, Mojo.Transition.crossFade);
};

GamegridAssistant.prototype.choose = function(event)
{
	var game	= Element.up(event.target, '.game-link');
	var choices	= [];

	if (!game || !game.id || !this.controller) {
		return;
	}

	switch (game.id) {
		case 'freecell':
			choices = [
				{ label: $L("FreeCell"),					command: 'freecell'					},
				{ label: $L("Relaxed FreeCell"),			command: 'freecell_relaxed'			},
				{ label: $L("Baker's Game"),				command: 'freecell_bakers'			},
				{ label: $L("ForeCell"),					command: 'freecell_forecell'		},
				{ label: $L("Challenge FreeCell"),			command: 'freecell_challenge'		},
				{ label: $L("Super Challenge FreeCell"),	command: 'freecell_super_challenge'	},

				{ label: $L("How to Play FreeCell"),		command: 'howto_freecell'			}
			];
			break;

		case 'klondike':
			choices = [
				{ label: $L("Klondike"),					command: 'klondike_draw_1'			},
				{ label: $L("Klondike (Draw 3)"),			command: 'klondike_draw_3'			},
				{ label: $L("Thoughtful Klondike"),			command: 'klondike_thoughtful'		},
				{ label: $L("Westcliff"),					command: 'westcliff'				},

				{ label: $L("How to Play Klondike"),		command: 'howto_klondike'			}
			];
			break;

		case 'spider':
			choices = [
				{ label: $L("Spider"),						command: 'spider_4_suits'			},
				{ label: $L("Spider (2 suits)"),			command: 'spider_2_suits'			},
				{ label: $L("Spider (1 suits)"),			command: 'spider_1_suit'			},
				{ label: $L("Relaxed Spider"),				command: 'spider_relaxed'			},
				{ label: $L("Easy Spider"),					command: 'spider_easy'				},

				{ label: $L("Spiderette"),					command: 'spiderette_4_suits'		},
				{ label: $L("Spiderette (2 suits)"),		command: 'spiderette_2_suits'		},
				{ label: $L("Spiderette (1 suits)"),		command: 'spiderette_1_suit'		},
				{ label: $L("Relaxed Spiderette"),			command: 'spiderette_relaxed'		},
				{ label: $L("Easy Spiderette"),				command: 'spiderette_easy'			},

				{ label: $L("How to Play Spider"),			command: 'howto_spider'				}
			];
			break;

		case 'golf':
			choices = [
				{ label: $L("Golf"),						command: 'golf'						},
				{ label: $L("Relaxed Golf"),				command: 'golf_relaxed'				},
				{ label: $L("Dead King Golf"),				command: 'golf_dead_king'			},

				{ label: $L("How to Play Golf"),			command: 'howto_golf'				}
			];
			break;

		case 'canfield':
			choices = [
				{ label: $L("Canfield"),					command: 'canfield'					},

				{ label: $L("How to Play Canfield"),		command: 'howto_canfield'			}
			];
			break;

		case 'acesup':
			choices = [
				{ label: $L("Aces Up"),						command: 'acesup'					},
				{ label: $L("Aces Up (2 suits)"),			command: 'acesup_2_suits'			},
				{ label: $L("Aces Up (1 suits)"),			command: 'acesup_1_suit'			},

				{ label: $L("How to Play Aces Up"),			command: 'howto_acesup'				}
			];
			break;

		case 'pyramid':
			choices = [
				{ label: $L("Pyramid"),						command: 'pyramid'					},
				{ label: $L("Relaxed Pyramid"),				command: 'pyramid_relaxed'			},
				{ label: $L("Double Pyramid"),				command: 'doublepyramid'			},
				{ label: $L("Relaxed Double Pyramid"),		command: 'doublepyramid_relaxed'	},

				{ label: $L("How to Play Pyramid"),			command: 'howto_pyramid'			}
			];
			break;

		case 'gaps':
			choices = [
				{ label: $L("Montana"),						command: 'gaps'						},
				{ label: $L("Relaxed Montana"),				command: 'gaps_relaxed'				},
				{ label: $L("Spaces"),						command: 'gaps_spaces'				},
				{ label: $L("Relaxed Spaces"),				command: 'gaps_spaces_relaxed'		},
				{ label: $L("Addiction"),					command: 'gaps_addiction'			},

				{ label: $L("How to Play Montana"),			command: 'howto_gaps'				}
			];
			break;

		case 'yukon':
			choices = [
				{ label: $L("Yukon"),						command: 'yukon'					},
				{ label: $L("Relaxed Yukon"),				command: 'yukon_relaxed'			},
				{ label: $L("Russian Solitaire"),			command: 'yukon_russian'			},
				{ label: $L("Alaska"),						command: 'yukon_alaska'				},
				{ label: $L("Moosehide"),					command: 'yukon_moosehide'			},

				{ label: $L("How to Play Yukon"),			command: 'howto_yukon'				}
			];
			break;
	}

	this.controller.popupSubmenu({
		title: $L("Select Game Variant"),
		items: choices,
		onChoose: function(value)
		{
			if (!value) return;

			/* Split the scene name from the game id. */
			var scene	= value.split('_')[0];

			if (scene == 'howto') {
				this.controller.stageController.pushScene(scene, value);
			} else {
				LaunchGame(value);
			}
		}.bind(this)
	});
};

GamegridAssistant.prototype.handleCommand = function(event)
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

