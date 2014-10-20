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

var SpiderAssistant = Class.create(SolitaireAssistant, {

initialize: function(gameid)
{
	if (!this.gamename) {
		this.gamename = 'spider';

		switch ((this.gameid = gameid)) {
			case 'spider':
			case 'spider_4_suits':
				this.gametitle	= 'Spider';
				this.suits		= [ 'diams', 'clubs', 'hearts', 'spades' ];
				break;

			case 'spider_2_suits':
				this.gametitle	= '2 suit Spider';
				this.suits		= [ 'clubs', 'hearts' ];
				break;

			case 'spider_1_suit':
				this.gametitle	= '1 suit Spider';
				this.suits		= [ 'clubs' ];
				break;

			case 'spider_relaxed':
				this.gametitle	= 'Relaxed Spider';
				this.suits		= [ 'diams', 'clubs', 'hearts', 'spades' ];
				this.relaxed	= true;
				break;

			case 'spider_easy':
				this.gametitle	= 'Easy Spider';
				this.suits		= [ 'diams', 'clubs', 'hearts', 'spades' ];
				this.relaxed	= true;
				this.easy		= true;
				break;

			default:
				Mojo.log('Unknown variant:', variant);
				break;
		}
	}

	/*
		Show a 'draw' button.  Overwride handleCommand to get the event when the
		button is pushed.
	*/
	this.buttons = [
		{ label: $L('Draw'), command: 'draw'	}
	];
},

setup: function($super)
{
	$super();

	/* Hide fields in preferences that don't make sense for this game */
	this.prefs.hide = [ 'hints', 'autoplay' ];

	/* Setup the foundations */
	var i = 0;
	this.foundation = this.controller.get('foundation');
	Element.select(this.foundation, 'div').each(function(div) {
		this.controller.setupWidget(div.id, {
			'suit':	this.suits[i++ % this.suits.length],
			'add': function(stack, cards)
			{
				if ((this.dealto && this.dealto.length) || this.sourcestack) {
					return(false);
				}

				/*
					Return true if the provided list of cards can legally be
					added to this stack.

					Cards may only be moved to a foundation in a full suite,
					meaning K through A all of the same suit.
				*/
				var suit		= stack.mojo.getAttributes()['suit'];
				var existing	= stack.mojo.getCards();

				if (existing && existing.length) {
					return(false);
				}

				if (cards.length != 13) {
					return(false);
				}

				for (i = 0; i < cards.length; i++) {
					if (cards[i].rank != 13 - i) {
						return(false);
					}

					if (cards[i].suit != suit) {
						return(false);
					}
				}

				return(true);
			}.bind(this),

			'take': function(stack)
			{
				/* Cards can not be moved out of the foundations */
				return(0);
			}.bind(this),

			'changed': function(stack, human, dealer, added)
			{
				if (added) this.changed(human, dealer);
			}.bind(this)
		}, {});
	}.bind(this));

	/* Setup the tableaus */
	this.tableau = this.controller.get('tableau');
	Element.select(this.tableau, 'div').each(function(div) {
		this.controller.setupWidget(div.id, {
			/*
				maxLoose is set to 12 meaning that after the first 12 cards they
				will be spaced 3 pixels apart instead of 17.  This isn't the
				most ideal setup, but ya gotta make comprimises when playing
				spider on a screen this small.  I mean, come on.  What do you
				want?
			*/
			'offset': [ 0, 17, 0, 3 ],
			'maxLoose': 12,
			'inplay': true,

			'add': function(stack, cards)
			{
				if ((this.dealto && this.dealto.length) || this.sourcestack) {
					return(false);
				}

				/*
					Return true if the provided list of cards can legally be
					added to this stack.
						- Cards must decend sequentially in rank
				*/
				var existing	= stack.mojo.getCards();

				if (!cards || !cards.length) {
					return(false);
				}

				if (existing && existing.length &&
					existing[existing.length - 1].rank != cards[0].rank + 1
				) {
					return(false);
				}

				/*
					Don't bother checking the rest of the cards because
					cards can only be dragged from a stack if they are in
					sequence thanks to the callback below.
				*/
				return(true);
			}.bind(this),

			'take': function(stack)
			{
				/*
					Return the draggable sequence of cards
						- Cards must decend sequentially in rank
						- Cards must all be of the same suit
				*/
				var cards	= stack.mojo.getCards();

				for (i = cards.length - 1; i > 0; i--) {
					if (cards[i - 1].facedown) {
						break;
					}

					if (cards[i - 1].rank != cards[i].rank + 1) {
						break;
					}

					if (this.easy) {
						/* Allow taking any cards, regardless of suit or color */

					} else if (this.relaxed) {
						/* Allow taking cards with matching colors */

						if (this.cardColor(cards[i - 1]) !=
							this.cardColor(cards[i])
						) {
							break;
						}
					} else {
						/* Allow taking cards of the same suit */

						if (cards[i - 1].suit != cards[i].suit) {
							break;
						}
					}
				}

				return(cards.length - i);
			}.bind(this),

			'changed': function(stack, human, dealer, added)
			{
				var cards	= stack.mojo.getCards();

				/* Detect a full sequence of cards in suit from A to K */
				if (cards.length >= 13 && !this.sourcestack) {
					var start	= cards.length - 13;
					var suit	= cards[start].suit;

					for (var i = 0; i < 13; i++) {
						if (cards[start + i].facedown ||
							cards[start + i].suit != suit ||
							cards[start + i].rank != 13 - i
						) {
							break;
						}
					}

					if (i == 13) {
						/*
							We found a full sequence.  Move it to an empty
							foundation with a matching suit.  Move the first one
							let the auto play system handle the rest.
						*/
						var stacks = Element.select(this.foundation, '.CardStack');

						for (i = stacks.length - 1; i >= 0; i--) {
							if (suit == stacks[i].mojo.getAttributes()['suit'] &&
								0 == stacks[i].mojo.getCards().length
							) {
								break;
							}
						}

						/*
							Setup the stacks and let autoPlayCards() take care
							of the rest.
						*/
						if (i >= 0) {
							Mojo.log('Moving full suite to the foundation');

							this.sourcestack	= stack;
							this.deststack		= stacks[i];
						}
					}
				}

				/* The top card should not be face down */
				if (cards && cards.length) {
					cards[cards.length - 1].facedown = false;
				}

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

	this.controller.setupWidget('deck', {
		'inplay': true,
		'tap': function(stack)
		{
			this.deckTap();
		}.bind(this),

		'take': function(stack)
		{
			return(1);
		}.bind(this),

		'changed': function(stack, human, dealer, added)
		{
			this.deckcount = stack.mojo.getCards().length;
			if (added) this.changed(human, dealer);
		}.bind(this)
	}, {});
},

changed: function($super, human, dealer)
{
	var ignore;

	if (this.sourcestack || (this.dealto && this.dealto.length)) {
		ignore = true;
	} else {
		ignore = false;
	}

	return($super(human, dealer, ignore));
},

handleCommand: function($super, event)
{
	var cmd;

	if (typeof event == 'string') {
		cmd = event;
	} else if (event && event.type && event.type == Mojo.Event.command) {
		cmd = event.command;
	} else {
		cmd = null;
	}

	if (cmd == 'draw') {
		this.deckTap();
	} else {
		$super(event);
	}
},

deckTap: function()
{
	if (this.dealto && this.dealto.length) {
		/* A deal is already in progress */
		Mojo.log('A deal is already in progress');
		return;
	}

	var tableaus = Element.select(this.tableau, '.CardStack');
	for (var i = tableaus.length - 1; i >= 0; i--) {
		/*
			Dealing from the deck is only permitted if all tableaus have
			at least one card.
		*/
		if (tableaus[i].mojo.getCards().length == 0) {
			return;
		}
	}

	/*
		Deal one card to each tableau.  Start here, and let the
		AutoPlayCards function do the next until they are all done.
	*/
	this.dealto = Element.select(this.tableau, '.CardStack');
	this.autoPlayCards();
},

gameWon: function($super, stats)
{
	if (stats[0] == (52 * 2)) {
		return(true);
	} else {
		return(false);
	}
},

/*
	It doesn't make sense to track the lowest card in play like it does in the
	other variants of solitaire because spider uses multiple decks, and the
	lowest card isn't useful anyway.
*/
highlightCards: function()
{
},

autoPlayCard: function($super, stack, destinations, human, dealer)
{
	/*
		Try to auto play a card

		Priorities are:
			- Tableau with a matching suit
			- Tableau with mis-matched suit
			- Empty Tableau
	*/
	var cards = stack.mojo.getCards();

	if (!cards || !cards.length) {
		return(false);
	}

	if (!destinations && human) {
		var t = Element.select(this.tableau, '.CardStack');
		var m = [];
		var n = [];
		var e = [];

		t.each(function(stack) {
			var c = stack.mojo.getCards();

			if (!c || !c.length) {
				e.push(stack);
			} else if (c[c.length - 1].suit == cards[cards.length - 1].suit) {
				m.push(stack);
			} else {
				n.push(stack);
			}
		});

		destinations = m.concat(n, e);
	}

	return($super(stack, destinations, human, dealer));
},

autoPlayCards: function($super, destinations)
{
	if (this.skipAuto) return;

	/* If there are any cards left to deal then take care of them first */
	if (!destinations && this.dealto && this.dealto.length) {
		var deck = this.controller.get('deck');

		if (!this.autoPlayCard(deck, [ this.dealto.shift() ], true, true)) {
			Mojo.log('Could not deal');
			this.dealto = null;
		}
		return;
	}

	/* If there are any cards being moved to the foundations move them */
	if (this.sourcestack && this.deststack) {
		var cards	= this.sourcestack.mojo.getCards();
		var done	= !cards.length || cards[cards.length - 1].rank == 13;

		if (!this.autoPlayCard(this.sourcestack, [ this.deststack ], true, true) || done) {
			if (!done) {
				Mojo.log('Could not deal to the foundation');
			} else {
				Mojo.log('Finished moving cards to the foundation');
			}

			this.sourcestack	= null;
			this.deststack		= null;
		}
		return;
	}

	/* Nothing got played */
	this.endAutoPlay();
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
		for (var i = (52 * 2) - 1; i >= 0; i--) {
			deck.push({ 'rank': Math.floor(i / 8) + 1, 'suit': this.suits[i % this.suits.length] });
		}
	} else if (!isNaN(gamenum)) {
		Mojo.log('Dealing game #', gamenum);
		deck	= WRand.shuffle(gamenum, this.suits, 2);
		d.dealt	= true;
	} else {
		deck	= [];
		d.dealt	= false;
	}

	/*
		Deal 54 cards to the tableaus, all face down. Let the 'changed' callback
		flip the top card.
	*/
	var c = 0;
	var tableaus = Element.select(this.controller.get('tableau'), '.CardStack');
	while (deck.length > 50) {
		var card = deck.shift();

		card.facedown = true;
		d[tableaus[c++ % tableaus.length].id].push(card);
	}

	/* Put the rest of the cards in the deck, but face down */
	for (i = 0; i < deck.length; i++) {
		deck[i].facedown = true;
	}
	d['deck']		= deck;

	d['gamenum']	= gamenum;
	d['moves']		= 0;
	return(d);
},

isCardFree: function(suit, rank)
{
	return(false);
},

getScoreText: function()
{
	if (this.deckcount > 1) {
		return(this.deckcount + ' ' + $L('cards in the deck'));
	} else if (this.deckcount == 1) {
		return($L('1 card in the deck'));
	} else {
		return(this.remaining + ' ' + $L('cards left'));
	}
}

});



var SpideretteAssistant = Class.create(SpiderAssistant, {

initialize: function(gameid)
{
	/*
		Spiderette behaves exactly like spider, except with 7 tableaus with a
		klondike like deal pattern.
	*/
	if (!this.gamename) {
		this.gamename = 'spiderette';

		switch ((this.gameid = gameid)) {
			case 'spiderette':
			case 'spiderette_4_suits':
				this.gametitle	= 'Spiderette';
				this.suits		= [ 'diams', 'clubs', 'hearts', 'spades' ];
				break;

			case 'spiderette_2_suits':
				this.gametitle	= '2 suit Spiderette';
				this.suits		= [ 'clubs', 'hearts' ];
				break;

			case 'spiderette_1_suit':
				this.gametitle	= '1 suit Spiderette';
				this.suits		= [ 'clubs' ];
				break;

			case 'spiderette_relaxed':
				this.gametitle	= 'Relaxed Spiderette';
				this.suits		= [ 'diams', 'clubs', 'hearts', 'spades' ];
				this.relaxed	= true;
				break;

			case 'spiderette_easy':
				this.gametitle	= 'Easy Spiderette';
				this.suits		= [ 'diams', 'clubs', 'hearts', 'spades' ];
				this.relaxed	= true;
				this.easy		= true;
				break;

			default:
				Mojo.log('Unknown variant:', variant);
				break;
		}
	}
},

deal: function(dealtype, gamenum)
{
	var type	= '';
	var d		= {};
	var deck;

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
		for (var i = 52 - 1; i >= 0; i--) {
			deck.push({ 'rank': Math.floor(i / 8) + 1, 'suit': this.suits[i % this.suits.length] });
		}
	} else if (!isNaN(gamenum)) {
		Mojo.log('Dealing game #', gamenum);
		deck	= WRand.shuffle(gamenum, this.suits);
		d.dealt	= true;
	} else {
		deck	= [];
		d.dealt	= false;
	}

	/*
		Deal to the tableaus in a klondike layout, 1 card in the first tableau,
		2 in the second and so on.
	*/
	var c = 0;
	var tableaus = Element.select(this.controller.get('tableau'), '.CardStack');
	for (i = 1; i <= tableaus.length; i++) {
		for (c = i; c <= tableaus.length; c++) {
			var card = deck.shift();

			if (card) {
				card.facedown = true;
				d[tableaus[c - 1].id].push(card);
			}
		}
	}

	/* Put the rest of the cards in the deck, but face down */
	for (i = 0; i < deck.length; i++) {
		deck[i].facedown = true;
	}
	d['deck']		= deck;

	d['gamenum']	= gamenum;
	d['moves']		= 0;
	return(d);
},

gameWon: function($super, stats)
{
	if (stats[0] == 52) {
		return(true);
	} else {
		return(false);
	}
}

});


