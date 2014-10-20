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

var PyramidAssistant = Class.create(SolitaireAssistant, {

initialize: function(gameid)
{
	this.gamename = 'pyramid';

	switch ((this.gameid = gameid)) {
		case 'pyramid':
			this.gametitle	= 'Pyramid';
			this.decks		= 1;
			break;

		case 'pyramid_relaxed':
			this.gametitle	= 'Relaxed Pyramid';
			this.decks		= 1;
			this.relaxed	= true;
			break;

		// TODO: Add Elevator, Triangle, Up and Down, Relaxed Pyramid, Giza,
		// Thirteen, Thirteens, Elevens, Fifteens, Triple Alliance, Pharohs,
		// Baroness, Apophis, Cheops, Exit, Two Pyramids, King Tut, Hurricane

		default:
			Mojo.log('Unknown game');
			this.gameid		= null;
			break;
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
	this.prefs.hide = [ 'hints', 'autoplay', 'deckposition' ];

	/* Setup the foundations */
	var i = 0;
	this.foundation = this.controller.get('foundation');
	this.controller.setupWidget('foundation', {
		'add': function(stack, cards)
		{
			/* Auto play is responsible for moving pairs to the foundation */
			return(false);
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
	});

	this.deck = this.controller.get('deck');
	this.controller.setupWidget('deck', {
		'inplay':	!this.relaxed,
		'tap':		function(stack)
		{
			/*
				If there is a selected card then the user may be attempting to
				play this card with the selected card.  Try that first, and if
				it doesn't work then flip a card.
			*/
			if (!this.autoPlayCard(stack, null, true, false)) {
				this.deckTap();
			}
		}.bind(this),

		'add':		this.tableauAdd.bind(this),
		'changed':	function(stack, human, dealer, added)
		{
			this.tableauChanged(stack, human, dealer, added);

			var cards = stack.mojo.getCards();

			/* The top card should not be face down */
			if (cards && cards.length) {
				cards[cards.length - 1].facedown = false;
			}
		}.bind(this),

		'take':		function(stack)
		{
			return(1);
		}.bind(this)
	}, {});

	this.waste = this.controller.get('waste');
	this.controller.setupWidget('waste', {
		'inplay':	!this.relaxed,
		'hidebase':	true,

		'add':		this.tableauAdd.bind(this),
		'changed':	this.tableauChanged.bind(this),
		'tap':		this.tableauTap.bind(this),

		'take':		function(stack)
		{
			/* Only the top card can be moved from the waste */
			return(1);
		}.bind(this)

	}, {});

	/* Setup the tableaus */
	var i		= 0;
	var row		= 0;
	var left	= 1;
	var size	= 1;

	this.selected = null;
	this.tableau = this.controller.get('tableau');
	Element.select(this.tableau, 'div').each(function(div) {
		i++; left--;

		this.controller.setupWidget(div.id, {
			'hidebase':	true,
			'height':	this.controller.window.innerHeight - 65,
			'offset':	[ 0, 0 ],
			'inplay':	true,

			'add':		this.tableauAdd.bind(this),
			'changed':	this.tableauChanged.bind(this),
			'tap':		this.tableauTap.bind(this),

			'take': function(stack)
			{
				if (this.tableauExposed(stack)) {
					return(1);
				} else {
					return(0);
				}
			}.bind(this)
		}, {});

		// Mojo.log('Stack', i, 'is overlapped by', (row + i + 1), 'and', (row + i + 2));
		div.overlap = [];
		div.overlap.push(this.controller.get('tableau' + (row + i + 1)));
		div.overlap.push(this.controller.get('tableau' + (row + i + 2)));

		if (left == 0) {
			/* The next row is larger by one */
			size++;
			left = size;
			row++;
		}
	}.bind(this));

	/* Go through the tableaus again and set their horizontal position */
	var rows	= row;
	var o		= 100 / (rows * 2);
	var x		= 0;
	row			= 0;
	i			= 0;
	left		= 1;
	size		= 1;

	Element.select(this.tableau, 'div').each(function(div) {
		i++; left--;

		// TODO: FIXME: The - o shouldn't be needed here... what is wrong?
		div.style.left = (50 + x - o) + '%';
		x += o;

		if (left > 0) {
			x += o;
		} else {
			/* The next row is larger by one */
			x = x * -1;

			size++;
			left = size;
			row++;
		}
	}.bind(this));
},

tableauExposed: function(stack, relaxed)
{
	/*
		Are there any stacks overlapping this?  The overlapping tableaus where
		calculated when the game was setup.
	*/
	if (stack.overlap) {
		for (var i = 0; i < stack.overlap.length; i++) {
			if (!stack.overlap[i]) {
				continue;
			}

			if (relaxed && stack.overlap[i].mojo.isDragging()) {
				continue;
			}

			var c = stack.overlap[i].mojo.getCards();
			if (c && c.length) {
				return(false);
			}
		}
	}

	return(true);
},


tableauAdd: function(stack, cards)
{
	/*
		The card being added and the card already in the stack must add up to 13.

		The card can't actually be added according to the rules, but we'll let
		the changed callback take care of moving them to the foundation.

		Nothing can be added unless the stack is exposed.  To start only the
		bottom row of stacks is exposed.
	*/
	var existing	= stack.mojo.getCards();

	if (!cards || !cards.length || !existing.length) {
		return(false);
	}

	if (cards[cards.length - 1].rank + existing[existing.length - 1].rank != 13) {
		return(false);
	}

	return(this.tableauExposed(stack, this.relaxed));
},

tableauChanged: function(stack, human, dealer, added)
{
	var cards = stack.mojo.getCards();

	if (!this.drawleft && human && cards && 2 <= cards.length) {
		var a = cards[cards.length - 1];
		var b = cards[cards.length - 2];

		if (!a.facedown) {
			if (a.rank == 13) {
				this.srcstack	= stack;
				this.drawleft	= 1;
			} else if (!b.facedown && (a.rank + b.rank) == 13) {
				this.srcstack	= stack;
				this.drawleft	= 2;
			}
		}
	}

	if (added) this.changed(human, dealer);
	this.autoPlayCards();
},

tableauTap: function(stack)
{
	if (this.drawleft) return;

	/* Attempt to auto play the card that just got tapped on. */
	var cards = stack.mojo.getCards();

	if (cards && cards.length && cards[cards.length - 1].rank == 13) {
		/* The king can go right to the foundation */
		this.srcstack	= stack;
		this.drawleft	= 1;

		this.autoPlayCards();
		return;
	}

	this.autoPlayCard(stack, null, true, false);
},

changed: function($super, human, dealer)
{
	if (this.active) {
		this.active.mojo.drawCards(NaN);

		var cards = this.active.mojo.getCards();
		cards.each(function(card) {
			card.removeClassName('highlight');
		});

		this.active = null;
	}

	/* Don't save the state if there are still cards to move */
	return($super(human, dealer, this.drawleft ? true : false));
},

deckTap: function()
{
	if (this.drawleft) {
		return;
	}

	var deck	= this.controller.get('deck');
	var waste	= this.controller.get('waste');
	var dcards	= deck.mojo.getCards();
	var wcards	= waste.mojo.getCards();

	if (!dcards.length) {
		/* Move all the cards from the waste back to the deck */
		wcards.each(function(card) {
			card.facedown = true;
		}.bind(this));

		waste.mojo.removeCards(wcards);
		deck.mojo.addCards(wcards.reverse(), false, true);
		return;
	}

	/* Deal a card from the deck to the waste */
	this.drawleft = 1;
	if (!this.autoPlayCard(deck, [ waste ], false, true)) {
		Mojo.log('Could not deal to the waste');
		this.drawleft = 0;
	} else {
		this.drawleft--;
	}
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
	if (!this.decks) this.decks = 1;
	if (-99 == gamenum) {
		/* Test game */
		deck = [];
		for (var i = (52 * this.decks) - 1; i >= 0; i--) {
			deck.push({ 'rank': Math.floor(i / 8) + 1, 'suit': this.suits[i % this.suits.length] });
		}
	} else if (!isNaN(gamenum)) {
		Mojo.log('Dealing game #', gamenum);
		deck	= WRand.shuffle(gamenum, this.suits, this.decks);
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

	/* Put 1 card into the waste */
	d['waste'].push(deck.shift());
	this.drawleft = 0;

	/* Put the rest of the cards in the deck, all face down except the top card */
	for (i = 0; i < deck.length - 1; i++) {
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
			if (this.active) {
				if ($super(stack, [ this.active ], human, dealer)) {
					return(true);
				}

				this.changed(human, dealer);
			}

			/*
				Try to autoplay the card to the foundation.  If that doesn't
				work then set it as the 'active' card to be used for the
				next time the user taps a card.
			*/
			if ($super(stack, [ this.foundation ], human, dealer)) {
				return(true);
			}

			this.active = stack;
			stack.mojo.drawCards(NaN, 200);

			var cards = stack.mojo.getCards();
			cards.each(function(card) {
				card.addClassName('highlight');
			});
		} else {
			destinations = Element.select(this.foundation, '.CardStack');
			destinations = d.concat(t);
		}
	}

	return($super(stack, destinations, human, dealer));
},

autoPlayCards: function($super, destinations)
{
	if (this.skipAuto) return;

	if (this.drawleft && this.srcstack) {
		if (this.autoPlayCard(this.srcstack ? this.srcstack : this.deck, [ this.foundation ], false, true)) {
			this.drawleft--;
		} else {
			this.drawleft = 0;
		}

		return;
	}

	/* Nothing got played */
	this.endAutoPlay();
},

isCardFree: function(suit, rank)
{
	if (rank == 13) {
		/* A king can move right to the foundation */
		return(true);
	}

	return(false);
},

gameWon: function($super, stats)
{
	if (stats[0] == (52 * this.decks)) {
		return(true);
	} else {
		return(false);
	}
},

/* Highlighting low cards doesn't make sense in pyramid */
highlightCards: function()
{
}

});


/* Double Pyramid is it's own class so that it can have it's own view and css */
var DoublepyramidAssistant = Class.create(PyramidAssistant, {

initialize: function(gameid)
{
	this.gamename = 'pyramid';

	switch ((this.gameid = gameid)) {
		case 'doublepyramid':
			this.gametitle	= 'Double Pyramid';
			this.decks		= 2;
			break;

		case 'doublepyramid_relaxed':
			this.gametitle	= 'Relaxed Double Pyramid';
			this.decks		= 2;
			this.relaxed	= true;
			break;

		default:
			Mojo.log('Unknown game');
			this.gameid		= null;
			break;
	}
}

});

