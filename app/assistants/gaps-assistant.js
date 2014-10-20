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
var GapsAssistant = Class.create(SolitaireAssistant, {

initialize: function(gameid)
{
	this.gamename = 'gaps';

	this.shuffle = {
		allowed:		NaN,
		used:			0
	};

	switch ((this.gameid = gameid)) {
		case 'gaps':
			this.gametitle			= 'Gaps';
			this.shuffle.allowed	= 2;
			break;

		case 'gaps_relaxed':
			this.gametitle			= 'Relaxed Gaps';
			this.shuffle.allowed	= NaN;
			break;

		case 'gaps_addiction':
			/*
				Addiction is exactly the same as gaps, except that on a shuffle
				the gaps are moved to random positions, and you get an extra
				round.
			*/
			this.gametitle			= 'Addiction';
			this.shuffle.allowed	= 3;
			this.shuffle.movegaps	= true;
			break;

		case 'gaps_spaces':
			/*
				Spaces is exactly the same as gaps, except that on a shuffle the
				gaps are moved to random positions.
			*/
			this.gametitle			= 'Spaces';
			this.shuffle.allowed	= 2;
			this.shuffle.movegaps	= true;
			break;

		case 'gaps_spaces_relaxed':
			this.gametitle			= 'Relaxed Spaces';
			this.shuffle.allowed	= NaN;
			this.shuffle.movegaps	= true;
			break;


		default:
			Mojo.log('Unknown game');
			this.gameid			= null;
			break;
	}

	/*
		Show a 'shuffle' button, with the number of remaining shuffles in the
		label (and update it when tapped).  Overwride handleCommand to get the
		event when the button is pushed.
	*/
	var label = $L('Shuffle');
	if (!isNaN(this.shuffle.allowed)) {
		label += ' (' + this.shuffle.allowed + ')';
	}

	this.buttons = [
		{ label: label, command: 'shuffle'	}
	];
},

setup: function($super)
{
	$super();

	/* Hide fields in preferences that don't make sense for this game */
	this.prefs.hide = [ 'autoplay', 'deckposition' ];

	/* Setup the tableaus */
	this.tableau = this.controller.get('tableau');
	Element.select(this.tableau, '.row').each(function(row) {
		var prev = null;

		Element.select(row, 'div').each(function(div) {
			/* Link each stack to the one before it */
			div.prev = prev;
			prev = div;

			this.controller.setupWidget(div.id, {
				'inplay': true,
				'hidebase': true,

				'add': function(stack, cards)
				{
					/*
						Return true if the provided list of cards can legally be
						added to this stack.

							- Stack must be empty (you can only move cards to a "gap")
							- The card in the stack to the left must be the same
							  suit and one lower in rank.  If this is the left most
							  stack then any 2 can be added.
					*/
					var existing	= stack.mojo.getCards();
					if (existing && existing.length) {
						return(false);
					}

					if (!cards || 1 != cards.length) {
						return(false);
					}

					if (stack.prev) {
						existing = stack.prev.mojo.getCards();

						if (!existing || 1 != existing.length ||
							existing[0].rank != cards[0].rank - 1 ||
							existing[0].suit != cards[0].suit
						) {
							return(false);
						}
					} else if (2 != cards[0].rank) {
						return(false);
					}

					return(true);
				}.bind(this),

				'take': function(stack)
				{
					/* There can never be more than one card in a stack */
					return(1);
				}.bind(this),

				'changed': function(stack, human, dealer, added)
				{
					if (added) this.changed(human, dealer);
					this.autoPlayCards();
				}.bind(this),

				'tap': function(stack)
				{
					/* Attempt to auto play the card that just got tapped on. */
					this.autoPlayCard(stack, null, true);
				}.bind(this)
			}, {});
		}.bind(this));
	}.bind(this));
},

deal: function($super, dealtype, gamenum)
{
	var type	= '';
	var d;
	var deck;

	if (!(d = $super(dealtype, gamenum))) {
		return(d);
	}

	$$('.CardStack').each(function(div) {
		d[div.id] = [];
	}.bind(this));

	if (isNaN(gamenum)) {
		/* Choose a random game */
		gamenum = Math.floor(Math.random() * 9999);
	}

	/* Shuffle the cards */
	if (-99 == gamenum) {
		/* Test game */
		deck = [];
		for (var r = 0; r < 4; r++) {
			for (var i = 2; i <= 13; i++) {
				if (i == 13) {
					/*
						Insert the ace (the gap) before the king to make sure
						game isn't over from the start.
					*/
					deck.push({ rank: 1, suit: this.suits[r] });
				}
				deck.push({ rank: i, suit: this.suits[r] });
			}
		}
	} else if (!isNaN(gamenum)) {
		Mojo.log('Dealing game #', gamenum);
		deck	= WRand.shuffle(gamenum);
		d.dealt	= true;
	} else {
		deck	= [];
		d.dealt	= false;
	}

	/*
		Deal one card to each stack.  All aces should be removed from play and
		stacks that they would have been placed in are left empty, leaving a gap
	*/
	var tableaus = Element.select(this.controller.get('tableau'), '.CardStack');
	for (var i = 0; i < tableaus.length; i++) {
		var card = deck.shift();

		if (card && card.rank != 1) {
			d[tableaus[i].id].push(card);
		}
	}

	this.shuffle.used	= 0;

	d['gamenum']		= gamenum;
	d['moves']			= 0;
	return(d);
},

shuffleCards: function()
{
	if (this.shuffle.dest) {
		return;
	}

	if (isNaN(this.shuffle.allowed) || this.shuffle.used < this.shuffle.allowed) {
		var deck = [];
		this.shuffle.used++;

		/* Remove all cards that aren't in sequence */
		Element.select(this.tableau, '.row').each(function(row) {
			var next	= 2;
			var suit	= null;

			Element.select(row, '.CardStack').each(function(stack) {
				var cards = stack.mojo.getCards();

				if (isNaN(next) || !cards || !cards.length ||
					cards[0].rank != next || (suit && suit != cards[0].suit)
				) {
					/* This card is out of sequence, it gets shuffled */
					next = NaN;

					if (cards && cards.length) {
						deck.push({ suit: cards[0].suit, rank: cards[0].rank });
						stack.mojo.removeCards(cards);
					}
				} else {
					next++;
					suit = cards[0].suit;
				}
			}.bind(this));
		}.bind(this));

		if (this.shuffle.movegaps) {
			/*
				Put the aces back in the deck before shuffling, then remove them
				while dealing the cards to leave random gaps, instead of gaps on
				the far left.
			*/
			this.suits.each(function(suit) {
				deck.push({ suit: suit, rank: 1 });
			});
		}

		/* Shuffle the cards in deck */
		deck = WRand.reshuffle(this.gamenum + this.shuffle.used, deck);

		/* Build a list of destinations */
		this.shuffle.dest = [];
		Element.select(this.tableau, '.row').each(function(row) {
			var havegap = this.shuffle.movegaps;

			Element.select(row, '.CardStack').each(function(stack) {
				var cards = stack.mojo.getCards();

				if (!cards || !cards.length) {
					if (havegap) {
						this.shuffle.dest.push(stack);
					} else {
						/* The next stack gets a card */
						havegap = true;
					}
				}
			}.bind(this));
		}.bind(this));

		/*
			Place all the cards in the first tableau, then use auto play to move
			them so that they are animated.
		*/
		this.first = this.controller.get('tableau1');
		this.first.mojo.addCards(deck, false, true);

		this.autoPlayCards();
	}

	this.updateButton();
},

updateButton: function()
{
	if (!isNaN(this.shuffle.allowed)) {
		/* Update the button label */
		if (!this.shuffle.button) {
			for (var i = 0; i < this.buttons.length; i++) {
				if (this.buttons[i].command == 'shuffle') {
					this.shuffle.button = this.buttons[i];
					break;
				}
			}
		}

		if (this.shuffle.button) {
			var left = this.shuffle.allowed - this.shuffle.used;

			if (left > 0 && !this.shuffle.dest) {
				this.shuffle.button.label = $L('Shuffle') + ' (' + left + ')';
				this.shuffle.button.disabled = false;
			} else {
				this.shuffle.button.label = $L('Shuffle');
				this.shuffle.button.disabled = true;
			}

			this.controller.modelChanged(this.buttonbar);
		}
	}
},

changed: function($super, human, dealer)
{
	return($super(human, dealer,
		(this.shuffle.dest && this.shuffle.dest.length) ? true : false));
},

handleCommand: function($super, event)
{
	var cmd;

	if (this.shuffle.dest) {
		return;
	}

	if (typeof event == 'string') {
		cmd = event;
	} else if (event && event.type && event.type == Mojo.Event.command) {
		cmd = event.command;
	} else {
		cmd = null;
	}

	if (cmd == 'shuffle') {
		this.shuffleCards();
	} else {
		$super(event);
	}
},

autoPlayCard: function($super, stack, destinations, human, dealer)
{
	/* Try to auto play a card. */
	if (!destinations && human) {
		destinations = Element.select(this.tableau, '.CardStack');
	}

	return($super(stack, destinations, human, dealer));
},

autoPlayCards: function($super, destinations)
{
	if (this.skipAuto) return;

	/* If there are any cards left to deal then take care of them first */
	if (!destinations && this.shuffle.dest) {
		var dest	= this.shuffle.dest.shift();
		var cards	= this.first.mojo.getCards();

		if (cards && cards.length && cards[cards.length - 1].rank == 1) {
			/* Remove the aces */
			this.first.mojo.removeCards([ cards[cards.length - 1] ]);
		} else if (!dest || !this.autoPlayCard(this.first, [ dest ], true, true)) {
			/* We're done shuffling */
			this.shuffle.dest = null;
			this.updateButton();
			this.highlightCards();
		}
		return;
	}

	/* Nothing got played */
	this.endAutoPlay();
},

isCardFree: function(suit, rank)
{
	return(false);
},

/* Highlight the card that can be played to the specified stack */
highlightCard: function(stack)
{
	if (this.prefs.hints) {
		/* Highlight the next card */
		if (stack.prev) {
			cards = stack.prev.mojo.getCards();

			if (cards.length && (card = this.findCardInPlay(cards[0].suit, cards[0].rank + 1))) {
				card.addClassName('highlight');
			}
		} else {
			/*
				The left most card in the row is empty, so highlight
				all the 2s.  This may mean up to 7 cards highlighted.
			*/
			this.suits.each(function(suit) {
				if ((card = this.findCardInPlay(suit, 2))) {
					card.addClassName('highlight');
				}
			}.bind(this));
		}
	}
},

/*
	Highlight any cards that can fill a gap, and calculate remaining which is
	needed to detect when the game has been won, and to calculate the score.

	Calculating this.remaining here makes sense because getState() and
	setState() both call this.
*/
highlightCards: function()
{
	if (this.shuffle.dest) {
		return;
	}

	Element.select(this.tableau, '.highlight').each(function(card) {
		card.removeClassName('highlight');
	});

	var remaining	= (52 - 4);
	var rows		= Element.select(this.tableau, '.row');

	for (var r = 0; r < rows.length; r++) {
		var tableaus	= Element.select(rows[r], '.CardStack');
		var suit		= null;
		var t;

		for (t = 0; t < tableaus.length; t++) {
			var cards = tableaus[t].mojo.getCards();

			if (!cards || !cards.length) {
				this.highlightCard(tableaus[t]);

				break;
			}

			if (cards[0].rank != t + 2) {
				break;
			}

			if (!suit) {
				suit = cards[0].suit;
			} else if (cards[0].suit != suit) {
				break;
			}

			remaining--;
		}

		if (this.prefs.hints) {
			/* Stop counting, but continue highlighting */

			for (; t < tableaus.length; t++) {
				var cards = tableaus[t].mojo.getCards();

				if (!cards || !cards.length) {
					this.highlightCard(tableaus[t]);
				}
			}
		}
	}
	this.remaining = remaining;
},

saveState: function($super, ignore, state)
{
	if (!state) {
		state = {};
	}

	state['shuffleused'] = this.shuffle.used;

	return($super(ignore, state));
},

setState: function($super, state, setElapsed)
{
	if (state) {
		this.shuffle.used = state['shuffleused'] || 0;
		this.updateButton();
	}

	return($super(state, setElapsed));
},

gameWon: function(stats)
{
	if (0 == this.remaining) {
		return(true);
	} else {
		return(false);
	}
},

getScore: function(complete)
{
	if (complete) {
		/*
			Factor the number of shuffles into the score in order to ensure that
			a game with more shuffles will appear lower in the sorted scores.
		*/
		return(this.remaining + (this.shuffle.used * 10000));
	} else {
		return(this.remaining);
	}
},

getScoreText: function(complete)
{
	if (!isNaN(this.remaining)) {
		if (complete) {
			return(this.remaining + ' ' + $L('cards after') + ' ' +
				this.shuffle.used + ' ' + $L('shuffles'));
		}

		return(this.remaining + ' ' + $L('cards remaining'));
	}
}

});

