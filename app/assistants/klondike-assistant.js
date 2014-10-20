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

var KlondikeAssistant = Class.create(SolitaireAssistant, {

initialize: function(gameid)
{
	this.gamename = 'klondike';

	switch ((this.gameid = gameid)) {
		case 'klondike_draw_3':
			this.gametitle		= 'Klondike deal 3';
			this.drawcount		= 3;
			this.thoughtful		= false;
			this.tableaustart	= 13;
			break;

		case 'klondike_draw_1':
			this.gametitle		= 'Klondike deal 1';
			this.drawcount		= 1;
			this.thoughtful		= false;
			this.tableaustart	= 13;
			break;

		case 'klondike_thoughtful':
			this.gametitle		= 'Thoughtful Klondike';
			this.drawcount		= 3;
			this.thoughtful		= true;
			this.tableaustart	= 13;
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

	/* Setup the foundations */
	var i = 0;
	this.foundation = this.controller.get('foundation');
	Element.select(this.foundation, 'div').each(function(div) {
		this.controller.setupWidget(div.id, {
			'baserank': 1,
			'suit':	this.suits[i++],
			'add': function(stack, cards)
			{
				if (this.drawleft) return(false);

				/*
					Return true if the provided list of cards can legally be
					added to this stack.

						- First card must be A
						- Cards must all be of suit of the foundation
						- Cards must be ascending sequentially in rank
				*/
				var suit		= stack.mojo.getAttributes()['suit'];
				var existing	= stack.mojo.getCards();

				if (!cards || !cards.length || cards.length > 1) {
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
					/* A foundation must start with an A */
					if (cards[0].rank != 1) {
						return(false);
					}
				} else {
					if (existing[existing.length - 1].rank != cards[0].rank - 1) {
						return(false);
					}
				}

				return(true);
			}.bind(this),

			'take': function(stack)
			{
				/* Only the top card can be moved from the foundations */
				if (!this.foundationsfixed) {
					return(1);
				} else {
					return(0);
				}
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
			'offset': [ 0, 17, 0, 8 ],
			'inplay': true,

			'add': function(stack, cards)
			{
				if (this.drawleft) return(false);

				/*
					Return true if the provided list of cards can legally be
					added to this stack.

						- First card must be a K
						- Cards must alternate in color
						- Cards must be decending sequentially in rank
				*/
				var existing	= stack.mojo.getCards();

				if (!cards || !cards.length) {
					return(false);
				}

				if (existing && existing.length) {
					var dest	= existing[existing.length - 1];
					var acolor	= this.cardColor(dest);
					var bcolor	= this.cardColor(cards[0]);

					if (acolor == bcolor || dest.rank != cards[0].rank + 1) {
						return(false);
					}
				} else if (undefined != this.tableaustart &&
					cards[0].rank != this.tableaustart
				) {
					/* A tableau must start with a K */
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
				/* Return the draggable sequence of cards */
				var cards	= stack.mojo.getCards();

				for (i = cards.length - 1; i > 0; i--) {
					var acolor	= this.cardColor(cards[i - 1]);
					var bcolor	= this.cardColor(cards[i]);

					if (cards[i - 1].facedown || acolor == bcolor ||
						cards[i - 1].rank != cards[i].rank + 1
					) {
						break;
					}
				}

				return(cards.length - i);
			}.bind(this),

			'changed': function(stack, human, dealer, added)
			{
				var cards	= stack.mojo.getCards();

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
			 this.deckTap(true);
		}.bind(this),

		'changed': function(stack, human, dealer, added)
		{
			if (added) this.changed(human, dealer);
		}.bind(this)
	}, {});

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
},

/*
	TODO: Implement klondike style scoring:
		Waste to Tableau		5
		Waste to Foundation		10
		Tableau to Foundation	10
		Turn over Tableau card	5
		Foundation to Tableau	-15
*/
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
		if (undefined != this.redealcount) {
			if (this.redealcount <= 0) {
				return;
			}
			this.redealcount--;
		}

		/* Move all the cards from the waste back to the deck */
		wcards.each(function(card) {
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

	/* Deal the cards to the tableaus */
	var tableaus = Element.select(this.controller.get('tableau'), '.CardStack');
	for (i = 1; i <= tableaus.length; i++) {
		for (c = i; c <= tableaus.length; c++) {
			var card = deck.shift();

			if (card) {
				if (!this.thoughtful) {
					card.facedown = true;
				}
				d[tableaus[c - 1].id].push(card);
			}
		}
	}

	/* Put this.drawcount cards into the waste */
	if (this.prefs.autoplay) {
		for (i = 0; i < this.drawcount; i++) {
			d['waste'].push(deck.pop());
		}
	}
	this.drawleft = 0;
	waste.mojo.setMaxLoose(this.drawcount);

	/* Put the rest of the cards in the deck, but face down */
	for (i = 0; i < deck.length; i++) {
		deck[i].facedown = true;
	}
	d['deck']		= deck;

	d['gamenum']	= gamenum;
	d['moves']		= 0;
	return(d);
},

autoPlayCard: function($super, stack, destinations, human, dealer)
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

	return($super(stack, destinations, human, dealer));
},

autoPlayCards: function($super, destinations)
{
	if (this.skipAuto) return;

	/* If there are any cards left to deal then take care of them first */
	if (!destinations) {
		var waste = this.controller.get('waste');

		if (this.drawleft) {
			this.drawleft--;
			waste.mojo.setMaxLoose(this.drawcount - this.drawleft);

			if (!this.autoPlayCard(this.controller.get('deck'), [ waste ], true, true)) {
				this.drawleft = 0;
				waste.mojo.setMaxLoose(this.drawcount);
			}
			return;
		}

		if (!waste.mojo.getCards().length) {
			this.deckTap(false);
		}
	}

	if (!destinations) {
		destinations = Element.select(this.foundation, '.CardStack');
	}

	var sources = Element.select(this.tableau, '.CardStack');

	sources.push(this.controller.get('waste'));

	for (var i = sources.length - 1; i >= 0; i--) {
		if (this.autoPlayCard(sources[i])) {
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
	if (rank <= 2) {
		/*
			There is no reason not to play an A or a 2.  Sure an A could be
			played on a 2, but the A can always go to the foundation, so who
			cares.  Just play it.
		*/
		return(true);
	}

	/* Are there any cards in play that can be played on this card? */
	switch (suit) {
		case 'diams': case 'hearts':
			if (this.lowest['clubs'] < rank || this.lowest['spades'] < rank) {
				return(false);
			}
			break;

		case 'clubs': case 'spades':
			if (this.lowest['diams'] < rank || this.lowest['diams'] < rank) {
				return(false);
			}
			break;
	}

	return(true);
}

});


var WestcliffAssistant = Class.create(KlondikeAssistant, {

initialize: function(gameid)
{
	/*
		Westcliff is a variant of Klondike, with 10 tableaus, anything can go on
		an empty space and no redeal.
	*/
	if (!this.gamename) {
		this.gamename = 'Westcliff';

		switch ((this.gameid = gameid)) {
			case 'westcliff':
			case 'westcliff_draw_1':
				this.gametitle			= 'Westcliff';
				this.redealcount		= 0;
				this.drawcount			= 1;
				this.thoughtful			= false;
				this.foundationsfixed	= true;
				break;

			case 'westcliff_draw_3':
				this.gametitle			= 'Westcliff deal 3';
				this.redealcount		= 0;
				this.drawcount			= 3;
				this.thoughtful			= false;
				this.foundationsfixed	= true;
				break;

			case 'westcliff_thoughtful':
				this.gametitle			= 'Thoughtful Westcliff';
				this.redealcount		= 0;
				this.drawcount			= 1;
				this.thoughtful			= true;
				this.foundationsfixed	= true;
				break;

			default:
				Mojo.log('Unknown variant:', variant);
				break;
		}
	}
},

deal: function(dealtype, gamenum)
{
	var waste	= this.controller.get('waste');
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

	/* Deal 3 cards to each tableau */
	var tableaus = Element.select(this.controller.get('tableau'), '.CardStack');
	for (i = 0; i < 3; i++) {
		for (c = 1; c <= tableaus.length; c++) {
			var card = deck.shift();

			if (card) {
				if (!this.thoughtful) {
					card.facedown = true;
				}
				d[tableaus[c - 1].id].push(card);
			}
		}
	}

	/* Put this.drawcount cards into the waste */
	for (i = 0; i < this.drawcount; i++) {
		d['waste'].push(deck.shift());
	}
	this.drawleft = 0;
	waste.mojo.setMaxLoose(this.drawcount);

	/* Put the rest of the cards in the deck, but face down */
	for (i = 0; i < deck.length; i++) {
		deck[i].facedown = true;
	}
	d['deck']		= deck;

	d['gamenum']	= gamenum;
	d['moves']		= 0;
	return(d);
}

});
