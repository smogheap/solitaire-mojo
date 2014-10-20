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

var YukonAssistant = Class.create(SolitaireAssistant, {

initialize: function(gameid)
{
	this.gamename = 'yukon';

	switch ((this.gameid = gameid)) {
		case 'yukon':
			/* Build down by alternating color */

			this.gametitle		= 'Yukon';
			this.tableaustart	= 13;
			break;

		case 'yukon_relaxed':
			this.gametitle		= 'Yukon';
			this.tableaustart	= 13;
			this.relaxed		= true;
			break;

		case 'yukon_russian':
			/* Build down by suit */

			this.gametitle		= 'Russian Solitaire';
			this.tableaustart	= 13;
			break;

		case 'yukon_alaska':
			/* Build up or down by suit */

			this.gametitle		= 'Alaska';
			this.tableaustart	= 13;
			break;

		case 'yukon_moosehide':
			/* Build down by non-matching suit */

			this.gametitle		= 'Moosehide';
			this.tableaustart	= 13;
			break;

		default:
			Mojo.log('Unknown game');
			this.gameid		= null;
			break;
	}
},

setup: function($super)
{
	$super();

	/* Hide fields in preferences that don't make sense for this game */
	this.prefs.hide = [ 'deckposition' ];

	/* Setup the foundations */
	var i = 0;
	this.foundation = this.controller.get('foundation');
	Element.select(this.foundation, 'div').each(function(div) {
		this.controller.setupWidget(div.id, {
			'baserank': 1,
			'suit':	this.suits[i++],
			'add': function(stack, cards)
			{
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
				/* Cards are no longer in play once they are in the foundations */
				if (this.relaxed) {
					return(1);
				}
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
			'offset': [ 0, 17, 0, 8 ],
			'inplay': true,

			/*
				This ensures that the user will be asked which card to play even
				if the stack being drug to is empty.  By default the user is not
				asked on an empty stack unless they are touching the gesture
				area.
			*/
			'alwaysask': true,

			'add': function(stack, cards)
			{
				/*
					Return true if the provided list of cards can legally be
					added to this stack.

						- First card must be a K
						- First card being added must not match color of last
						  card already in the stack
						- Rank of first card added must be one below the rank of
						  the last card already in the stack
				*/
				var existing	= stack.mojo.getCards();

				if (!cards || !cards.length) {
					return(false);
				}

				if (existing && existing.length) {
					var dest = existing[existing.length - 1];

					/* Check rank */
					switch (this.gameid) {
						case 'yukon':
						case 'yukon_relaxed':
						case 'yukon_russian':
						case 'yukon_moosehide':
							/* Build down */

							if (dest.rank != cards[0].rank + 1) {
								return(false);
							}
							break;

						case 'yukon_alaska':
							/* Build up or down */

							if (dest.rank != cards[0].rank + 1 &&
								dest.rank != cards[0].rank - 1
							) {
								return(false);
							}
							break;
					}

					/* Check suit */
					switch (this.gameid) {
						case 'yukon':
						case 'yukon_relaxed':
							/* Alternating color */

							if (this.cardColor(dest) == this.cardColor(cards[0])) {
								return(false);
							}
							break;

						case 'yukon_russian':
						case 'yukon_alaska':
							/* matching suit */

							if (dest.suit != cards[0].suit) {
								return(false);
							}
							break;

						case 'yukon_moosehide':
							/* Non-matching suit */

							if (dest.suit == cards[0].suit) {
								return(false);
							}
							break;
					}
				} else if (undefined != this.tableaustart &&
					cards[0].rank != this.tableaustart
				) {
					/* A tableau must start with a K */
					return(false);
				}

				/*
					Don't bother checking the rest of the cards because cards
					can be moved even if they aren't in sequence.  Only the top
					card matters.
				*/
				return(true);
			}.bind(this),

			'take': function(stack)
			{
				/* All faceup cards can be moved, even if not in sequence */
				var cards	= stack.mojo.getCards();

				for (i = cards.length - 1; i > 0; i--) {
					if (cards[i - 1].facedown) {
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

	/*
		Deal an accending number of face down cards to each tableau, from 0 to 6.
		Then the first tableau gets one card face up and the others each get 5.
	*/
	var tableaus = Element.select(this.controller.get('tableau'), '.CardStack');
	for (var i = 1; i < tableaus.length; i++) {
		for (c = i; c < tableaus.length; c++) {
			var card = deck.shift();

			if (card) {
				card.facedown = true;
				d[tableaus[c].id].push(card);
			}
		}
	}

	d[tableaus[0].id].push(deck.shift());
	for (var i = 1; i < tableaus.length; i++) {
		for (var c = 0; c < 5; c++) {
			var card = deck.shift();

			if (card) {
				d[tableaus[i].id].push(card);
			}
		}
	}

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
		destinations = Element.select(this.foundation, '.CardStack');
	}

	var sources = Element.select(this.tableau, '.CardStack');
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

