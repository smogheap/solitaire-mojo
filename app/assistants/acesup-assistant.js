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

var AcesupAssistant = Class.create(SolitaireAssistant, {

initialize: function(gameid)
{
	this.gamename = 'acesup';

	switch ((this.gameid = gameid)) {
		case 'acesup':
		case 'acesup_4_suits':
			this.gametitle	= 'Aces Up';
			this.suits		= [ 'diams', 'clubs', 'hearts', 'spades' ];
			break;

		case 'acesup_2_suits':
			this.gametitle	= '2 suit Aces Up';
			this.suits		= [ 'clubs', 'hearts' ];
			break;

		case 'acesup_1_suit':
			this.gametitle	= '1 suit Aces Up';
			this.suits		= [ 'clubs' ];
			break;

		default:
			Mojo.log('Unknown variant:', variant);
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
	this.prefs.hide = [ 'hints', 'autoplay', 'showfade' ];

	/* Setup the tableaus */
	this.tableau = this.controller.get('tableau');
	Element.select(this.tableau, 'div').each(function(div) {
		this.controller.setupWidget(div.id, {
			'height': this.controller.window.innerHeight - 65,
			'offset': [ 0, 17 ],
			'inplay': true,

			'take': function(stack)
			{
				/* Only 1 card can be moved at a time */
				return(1);
			}.bind(this),

			'add': function(stack, cards)
			{
				if (this.dealto && this.dealto.length) {
					return(false);
				}

				/*
					Cards can only be moved to an empty tableau.  There are no
					sequences built in the tableaus.
				*/
				if (0 == stack.mojo.getCards().length) {
					return(true);
				} else {
					return(false);
				}
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
			this.deckTap();
		}.bind(this),

		'changed': function(stack, human, dealer, added)
		{
			this.deckcount = stack.mojo.getCards().length;
			if (added) this.changed(human, dealer);
		}.bind(this)
	}, {});

	var offset;

	if (this.prefs.deckposition != 'right') {
		offset = [ 4, 0, 0, 0 ];
	} else {
		offset = [ -4, 0, 0, 0 ];
	}

	this.waste = this.controller.get('waste');
	this.controller.setupWidget('waste', {
		'inplay': false,
		'offset': offset,

		'add': function(stack, cards)
		{
			if (this.dealto && this.dealto.length) {
				return(false);
			}

			/*
				A card can be moved to the waste if it is lower than another
				exposed card in the tableau of the same suit.  (I think 1 and 2
				suit variations would be nice for this game.)
			*/
			if (1 != cards.length) {
				return(false);
			}

			var stacks = Element.select(this.tableau, '.CardStack');
			for (var i = stacks.length - 1; i >= 0; i--) {
				var t = stacks[i].mojo.getCards();

				if (t.length > 0 && cards[0].rank <= 13 &&
					t[t.length - 1].suit == cards[0].suit &&
					t[t.length - 1].rank > cards[0].rank
				) {
					return(true);
				}
			}

			return(false);
		}.bind(this),

		'changed': function(stack, human, dealer, added)
		{
			if (added) this.changed(human, dealer);
		}.bind(this)
	}, {});
},

activate: function($super)
{
	/*
		If the layout switched from right to left then we need to change the
		offset for the waste so that it won't overlap the deck.
	*/
	if (this.prefs.deckposition != 'right') {
		this.waste.mojo.setOffset( [ 4, 0, 0, 0 ] );
	} else {
		this.waste.mojo.setOffset( [ -4, 0, 0, 0 ] );
	}
	this.waste.mojo.drawCards(NaN);

	return($super());
},

changed: function($super, human, dealer)
{
	var ignore;

	if (this.dealto && this.dealto.length) {
		ignore = true;
	} else {
		ignore = false;
	}

	return($super(human, dealer, ignore));
},

deckTap: function()
{
	if (this.dealto && this.dealto.length) {
		/* A deal is already in progress */
		Mojo.log('A deal is already in progress');
		return;
	}

	/*
		Deal one card to each tableau.  Start here, and let the
		AutoPlayCards function do the next until they are all done.
	*/
	this.dealto = Element.select(this.tableau, '.CardStack');

	if (!this.autoPlayCard(deck, [ this.dealto.shift() ], true, true)) {
		Mojo.log('Could not deal');
		this.dealto = null;
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

/* Stats should be an array containing: played, total, remaining */
gameWon: function($super, stats)
{
	/* A game of aces up is won when only aces remain in play */
	if (stats[0] == (52 - 4)) {
		return(true);
	} else {
		return(false);
	}
},

deal: function($super, dealtype, gamenum)
{
	var type	= '';
	var deck;
	var d;

	if (!(d = $super(dealtype, gamenum))) {
		return(d);
	}

	if (isNaN(gamenum)) {
		/* Choose a random game */
		gamenum = Math.floor(Math.random() * 9999);
	}

	/* Shuffle the cards */
	if (-99 == gamenum) {
		/* Test game */
		deck = [];

		for (var i = 0; i < 52; i++) {
			deck.push({ 'rank': Math.floor(i % 13) + 1, 'suit': this.suits[i % this.suits.length] });
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
		Set all aces to 14.  The CardStack will render it the same, but will
		treat it as a high card.
	*/
	for (i = 0; i < deck.length; i++) {
		if (deck[i].rank == 1) {
			deck[i].rank += 13;
		}
	}

	/* Setup a fresh table */
	$$('.CardStack').each(function(div) {
		d[div.id] = [];
	}.bind(this));

	/* Deal 1 card to each tableau */
	var tableaus = Element.select(this.controller.get('tableau'), '.CardStack');
	for (var t = 0; t < tableaus.length; t++) {
		d[tableaus[t].id].push(deck.shift());
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

autoPlayCard: function($super, stack, destinations, human, dealer)
{
	/*
		Try to auto play a card.

		Cards may be moved to the waste, or to any empty tableau.
	*/
	if (!destinations) {
		var t = Element.select(this.tableau,		'.CardStack');

		destinations = [ this.waste ];

		t.each(function(stack) {
			if (!stack.mojo.getCards().length) {
				destinations.push(stack);
			}
		});
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

	/* Nothing got played */
	this.endAutoPlay();
},

getScore: function()
{
	/* the four aces do not count against the players score */
	if (this.remaining > 4) {
		return(this.remaining - 4);
	} else {
		return(0);
	}
},

getScoreText: function()
{
	if (this.deckcount > 1) {
		return(this.deckcount + ' ' + $L('cards in the deck'));
	} else if (this.deckcount == 1) {
		return($L('1 card in the deck'));
	} else if (this.remaining > 4) {
		return((this.remaining - 4) + ' ' + $L('cards left'));
	} else {
		return("...");
	}
},

/*
	It doesn't make sense to track the lowest card in play like it does in the
	other variants of solitaire.
*/
highlightCards: function()
{
}

});


