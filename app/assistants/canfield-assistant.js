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

var CanfieldAssistant = Class.create(SolitaireAssistant, {

initialize: function(gameid)
{
	this.gamename = 'canfield';

/*
	TODO:
	- Add 'rainbow'.  Like canfield, but tableaus build down by rank regardless
	  of suit or color, draw 1 and no redeal
	- Add 'ranfall'.  Like canfield, but draw 1 and only 2 redeals
	- Add 'storehouse'.  Like canfield but tableaus build down by suit, draw 1
	  and 2 redeals.
	- Add 'Superior Canfield'.  The reserve is dealt face up and empty rows are
	  not automatically filled.
*/

	switch ((this.gameid = gameid)) {
		case 'canfield':
			this.gametitle	= 'Canfield';
			this.drawcount	= 3;
			break;

		default:
			Mojo.log('Unknown game');
			this.gameid		= null;
			break;
	}


	/*
		Show a 'draw' button, with the draw count included in the label.
		Overwride handleCommand to get the event when the button is pushed.
	*/
	this.buttons = [
		{ label: $L('Draw') + ' ' + this.drawcount, command: 'draw'	}
	];
},

setup: function($super)
{
	$super();

	if (this.stats) {
		this.stats.dollarValue = function(games, score)
		{
			/*
				The 'score' for this game is the number of cards left in play,
				and this callback will be called with the number of games and
				the total added up of the score of all of those games.
			*/
			var cards = (52 * games) - score;

			return((-52 * games) + (5 * cards));
		};
	}

	/* Setup the foundations */
	var i = 0;
	this.foundation = this.controller.get('foundation');
	Element.select(this.foundation, 'div').each(function(div) {
		this.controller.setupWidget(div.id, {
			'suit':	this.suits[i++],
			'add': function(stack, cards)
			{
				if (this.drawleft) return(false);

				/*
					Return true if the provided list of cards can legally be
					added to this stack.
						- At the start of the deal one card will be dealt to the
						  foundations.  The other foundations must start with
						  that card.
						- Cards must all be of suit of the foundation
						- Cards must be ascending sequentially in rank, and may
						  wrap.
				*/
				var suit		= stack.mojo.getAttributes()['suit'];
				var existing	= stack.mojo.getCards();

				if (!cards || 1 != cards.length) {
					/*
						Only one card can be dropped on a foundation at a
						time because the tableaus use alternating colors in
						their sequences, so we know only one will match.
					*/
					return(false);
				}

				if (cards[0].suit != suit) {
					return(false);
				}

				if (!existing || !existing.length) {
					if (cards[0].rank != this.startrank) {
						return(false);
					}
				} else {
					if (existing[existing.length - 1].rank != cards[0].rank - 1 &&
						existing[existing.length - 1].rank != cards[0].rank + 12
					) {
						return(false);
					}
				}

				return(true);
			}.bind(this),

			'take': function(stack)
			{
				/* Cards can't be removed from the foundation */
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
			'height': this.controller.window.innerHeight - 65,
			'offset': [ 0, 17 ],
			'inplay': true,

			'add': function(stack, cards)
			{
				if (this.drawleft) return(false);

				/*
					Return true if the provided list of cards can legally be
					added to this stack.
						- Cards must alternate in color
						- Cards must be decending sequentially in rank, and may
						  wrap
						- Sequences can not be moved, just single cards
						- An empty tableau will be filled with the top card in
						  the reserve.  When the reserve is empty it can be
						  filled with any card.
				*/
				var existing	= stack.mojo.getCards();

				if (!cards || !cards.length) {
					return(false);
				}

				if (existing && existing.length) {
					var dest	= existing[existing.length - 1];

					if (this.cardColor(dest) == this.cardColor(cards[0])) {
						return(false);
					}

					if (dest.rank != cards[0].rank + 1 &&
						dest.rank != cards[0].rank - 12
					) {
						return(false);
					}
				} else {
					cards = this.reserve.mojo.getCards();

					if (cards && cards.length) {
						return(false);
					}
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
				/* Return the draggable sequence of cards */
				var cards	= stack.mojo.getCards();

				for (i = cards.length - 1; i > 0; i--) {
					if (cards[i - 1].facedown) {
						break;
					}

					if (this.cardColor(cards[i]) == this.cardColor(cards[i - 1])) {
						break;
					}

					if (cards[i - 1].rank != cards[i].rank + 1 &&
						cards[i - 1].rank != cards[i].rank - 12
					) {
						break;
					}
				}

				return(cards.length - i);
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

	this.deck = this.controller.get('deck');
	this.controller.setupWidget('deck', {
		'inplay': true,
		'tap': function(stack)
		{
			 this.deckTap(true);
		}.bind(this),

		'changed': function(stack, human, dealer, added)
		{
			if (added) this.changed(human, dealer);
		}.bind(this)
	}, {});

	this.waste = this.controller.get('waste');
	this.controller.setupWidget('waste', {
		'inplay': true,
		'hidebase': true,
		'offset': [ 20, 0, 0, 0 ],
		'maxLoose': this.drawcount,

		'take': function(stack)
		{
			/* Only the top card can be moved from the waste */
			return(1);
		}.bind(this),

		'changed': function(stack, human, dealer, added)
		{
			this.autoPlayCards();
			if (added) this.changed(human, dealer);
		}.bind(this),

		'tap': function(stack)
		{
			this.autoPlayCard(stack, null, true);
		}.bind(this)
	}, {});

	this.reserve = this.controller.get('reserve');
	this.controller.setupWidget('reserve', {
		'inplay': true,
		'hidebase': true,
		'offset': [ 0, 4 ],

		'take': function(stack)
		{
			/* Only the top card can be moved from the reserve */
			return(1);
		}.bind(this),

		'changed': function(stack, human, dealer, added)
		{
			var cards	= stack.mojo.getCards();

			/* The top card should not be face down */
			if (cards && cards.length) {
				cards[cards.length - 1].facedown = false;
			}

			this.autoPlayCards();
			if (added) this.changed(human, dealer);
		}.bind(this),

		'tap': function(stack)
		{
			this.autoPlayCard(stack, null, true);
		}.bind(this)
	}, {});
},

changed: function($super, human, dealer)
{
	var ignore;

	if (this.drawleft) {
		ignore = true;
	} else {
		ignore = false;
	}

	return($super(human, dealer, ignore));
},

getScoreText: function()
{
	return('$' + (-52 + ((52 - this.remaining) * 5)));
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
		this.deckTap(true);
	} else {
		$super(event);
	}
},

deckTap: function(human)
{
	if (this.drawleft) {
		return;
	}

	var deck	= this.controller.get('deck');
	var waste	= this.controller.get('waste');
	var dcards	= deck.mojo.getCards();
	var wcards	= waste.mojo.getCards();

	if (!human && wcards.length) {
		/* Only auto deal if the waste is empty */
		return;
	}

	if (human && !dcards.length) {
		/* Move all the cards from the waste back to the deck */
		wcards.each(function(card)
		{
			card.facedown	= true;
		}.bind(this));

		waste.mojo.removeCards(wcards);
		deck.mojo.addCards(wcards.reverse(), false, true);

		dcards = deck.mojo.getCards();
		return;
	}

	/* Deal this.drawcount cards from the deck to the waste */
	var drawcount;

	if ((drawcount = Math.min(this.drawcount, dcards.length)) > 0) {
		this.drawleft = drawcount - 1;
		waste.mojo.setMaxLoose(this.drawcount - this.drawleft);

		if (!this.autoPlayCard(deck, [ waste ], true, true)) {
			this.drawleft = 0;
		}
		waste.mojo.setMaxLoose(this.drawcount - this.drawleft);
	}

	return;
},

deal: function($super, dealtype, gamenum)
{
	var waste	= this.controller.get('waste');
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
		for (var i = 51; i >= 0; i--) {
			deck.push({ 'rank': Math.floor(i / 4) + 1, 'suit': this.suits[i % 4] });
		}
	} else if (!isNaN(gamenum)) {
		Mojo.log('Dealing game #', gamenum);
		deck	= WRand.shuffle(gamenum);
		d.dealt	= true;
	} else {
		deck	= [];
		d.dealt	= false;
	}

	/* Deal 1 card to each tableau */
	var tableaus = Element.select(this.controller.get('tableau'), '.CardStack');
	for (var i = 0; i < tableaus.length; i++) {
		d[tableaus[i].id].push(deck.shift());
	}

	/*
		Deal to the reserve.  Leave 31 cards for the deck, and 1 to go to the
		foundation which will set the starting rank for the other foundations.
	*/
	while (deck.length > 32) {
		var card = deck.shift();

		card.facedown = true;
		d['reserve'].push(card);
	}

	/* Deal one card to the foundation */
	var card	= deck.shift();
	var stacks	= Element.select(this.foundation,	'.CardStack');

	for (var i = stacks.length - 1; i >= 0; i--) {
		if (card.suit == stacks[i].mojo.getAttributes()['suit']) {
			d[stacks[i].id].push(card);
			d['startrank'] = card.rank;
			break;
		}
	}

	/* Put this.drawcount cards into the waste */
	if (this.prefs.autoplay) {
		for (var i = 0; i < this.drawcount; i++) {
			d['waste'].push(deck.pop());
		}
	}
	this.drawleft = 0;
	waste.mojo.setMaxLoose(this.drawcount);

	/* Put the rest of the cards in the deck, but face down */
	for (var i = 0; i < deck.length; i++) {
		deck[i].facedown = true;
	}

	d['deck']		= deck;
	d['gamenum']	= gamenum;
	d['moves']		= 0;

	return(d);
},

autoPlayCard: function($super, stack, destinations, human, dealer, debug)
{
	/* Try to auto play a card. */
	if (!destinations) {
		if (human) {
			var d	= Element.select(this.foundation,	'.CardStack');
			var t	= Element.select(this.tableau,		'.CardStack');

			destinations = d.concat(t);
		} else {
			destinations = Element.select(this.foundation, '.CardStack');
		}
	}

	return($super(stack, destinations, human, dealer, debug));
},

autoPlayCards: function($super, destinations)
{
	if (this.skipAuto) return;

	var stacks = Element.select(this.tableau, '.CardStack');

	if (!destinations) {
		/* If there are any cards left to deal then take care of them first */
		var waste = this.controller.get('waste');

		if (this.drawleft) {
			this.drawleft--;
			waste.mojo.setMaxLoose(this.drawcount - this.drawleft);

			if (!this.autoPlayCard(this.controller.get('deck'), [ waste ], true, true, true)) {
				this.drawleft = 0;
				waste.mojo.setMaxLoose(this.drawcount);
			}
			return;
		}

		if (!waste.mojo.getCards().length) {
			this.deckTap(false);
		}

		/* If there are any empty tableaus, fill them from the reserve */
		for (var i = 0; i < stacks.length; i++) {
			if (stacks[i].mojo.getCards().length) {
				continue;
			}

			if (this.autoPlayCard(this.reserve, [ stacks[i] ], false, true)) {
				return;
			}
		}
	}

	if (!destinations) {
		destinations = Element.select(this.foundation, '.CardStack');
	}

	stacks.push(this.controller.get('waste'));

	for (var i = stacks.length - 1; i >= 0; i--) {
		if (this.autoPlayCard(stacks[i])) {
			/*
				Stop as soon as something gets played.  The auto play will
				cause this function to be called again when it is done.
			*/
			return;
		}
	}

	/* Nothing got played */
	this.endAutoPlay();
},

isCardFree: function(suit, rank)
{
	/*
		Any card may be useful in a sequence in the tableaus because canfield
		allows wrapping.
	*/
	return(false);
},

setState: function($super, state, setElapsed)
{
	if (!state) return(false);

	this.startrank = state['startrank'];
	if ($super(state, setElapsed)) {
		Element.select(this.foundation, '.CardStack').each(function(stack)
		{
			stack.mojo.setBase({'rank': state['startrank'] });
		});

		return(true);
	} else {
		return(false);
	}
},

saveState: function($super, ignore)
{
	var state = {};

	if (this.startrank) {
		state['startrank'] = this.startrank;
	}

	return($super(ignore, state));
},

/* The 'low' card is relative to this.startrank in canfield */
lowerRank: function(a, b)
{
	if (isNaN(a)) return(b);
	if (isNaN(b)) return(a);

	var aa = a;
	var bb = b;

	if (aa < this.startrank) aa += 13;
	if (bb < this.startrank) bb += 13;

	if (aa < bb) {
		return(a);
	} else {
		return(b);
	}
}


});


