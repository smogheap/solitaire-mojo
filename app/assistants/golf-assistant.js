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

var GolfAssistant = Class.create(SolitaireAssistant, {

initialize: function(gameid)
{
	this.gamename = 'golf';

	switch ((this.gameid = gameid)) {
		case 'golf':
			this.gametitle	= 'Golf';
			break;

		case 'golf_relaxed':
			/*
				Just like golf, but with wrapping so that an ace can be played
				on a king and a king can be played on an ace.
			*/
			this.gametitle	= 'Relaxed Golf';
			break;

		case 'golf_dead_king':
			/* Just like golf, but NOTHING can be played on a king.  */
			this.gametitle	= 'Dead King Golf';
			break;

		/*
			TODO: Implement Elevator and Escalator.

			Elevator is a variant of relaxed golf where the cards are arranged
			in a pyramid so that you have to play 2 cards to get access to the
			card below them, until you get all the way to the single card at the
			top.

			Elevator leaves the inaccessable cards face down.  Escalator leaves
			them face up.
		*/

		default:
			Mojo.log('Unknown game');
			this.gameid	= null;
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

			'changed': function(stack, human, dealer, added)
			{
				if (added) this.changed(human, dealer);
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
		'inplay': false,
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

	this.waste = this.controller.get('waste');
	this.controller.setupWidget('waste', {
		'inplay': false,
		'hidebase': true,
		'offset': [ 4, 0, 0, 0 ],

		'add': function(stack, cards)
		{
			var existing = stack.mojo.getCards();
			if (!existing || !existing.length) {
				/* wtf? */
				return(true);
			}

			if (!cards || 1 != cards.length) {
				return(false);
			}

			var last = existing[existing.length - 1].rank;
			var next = cards[0].rank;

			if (this.gameid == 'golf_dead_king' && last == 13) {
				return(false);
			}

			if (next + 1 == last ||
				next - 1 == last
			) {
				return(true);
			}

			if (this.gameid == 'golf_relaxed') {
				if ((last == 13 && next == 1) ||
					(next == 13 && last == 1)
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

	/* Deal 5 cards to each tableau */
	var tableaus = Element.select(this.controller.get('tableau'), '.CardStack');
	for (var i = 0; i < 5; i++) {
		for (var t = 0; t < tableaus.length; t++) {
			d[tableaus[t].id].push(deck.shift());
		}
	}

	/* Put 1 card into the waste */
	d['waste'].push(deck.pop());

	/* Put the rest of the cards in the deck, but face down */
	for (i = 0; i < deck.length; i++) {
		deck[i].facedown = true;
	}
	d['deck']		= deck;

	d['gamenum']	= gamenum;
	d['moves']		= 0;
	return(d);
},

deckTap: function()
{
	var cards = this.deck.mojo.getCards();

	if (cards.length) {
		/* Deal 1 card from the deck to the waste */
		if (!this.autoPlayCard(this.deck, [ waste ], true, true)) {
			Mojo.log('Could not deal to the waste');
		}
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

autoPlayCard: function($super, stack, destinations, human, dealer)
{
	/* Try to auto play a card. */
	if (!destinations) {
		destinations = [ this.waste ];
	}

	return($super(stack, destinations, human, dealer));
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
},

/* Highlighting low cards doesn't make sense in golf */
highlightCards: function()
{
}

});


