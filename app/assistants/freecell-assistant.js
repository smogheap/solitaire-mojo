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

var FreecellAssistant = Class.create(SolitaireAssistant, {

initialize: function(gameid)
{
	this.gamename = 'freecell';

	switch ((this.gameid = gameid)) {
		case 'freecell':
			this.gametitle	= 'FreeCell';
			break;

		case 'freecell_relaxed':
			/*
				Like freecell, but any number of cards can be moved in a
				sequence even if there are not enough empty freecells and
				tableaus to allow the move.
			*/
			this.gametitle	= 'Relaxed FreeCell';
			break;

		case 'freecell_bakers':
			/*
				Like freecell, but the tableaus are built down in sequence
				in matching suit instead of alternating colors.
			*/
			this.gametitle	= "Baker's Game";
			break;

		case 'freecell_forecell':
			/*
				Like freecell, but the free cells are filled at the start with
				the last four cards in the deck, and empty tableaus can only be
				filled with a king.
			*/
			this.gametitle	= 'ForeCell';
			this.kingsonly	= true;
			break;

		case 'freecell_challenge':
			/*
				Normal freecell, but the duces and aces are dealt before any
				other card to make it harder.
			*/
			this.gametitle	= 'Challenge FreeCell';
			break;

		case 'freecell_super_challenge':
			/*
				Like Challenge FreeCell, but with the kings only rule as well.
			*/
			this.gametitle	= 'Super Challenge FreeCell';
			this.kingsonly	= true;
			break;

		default:
			Mojo.log('Unknown game');
			this.gameid = null;
			break;
	}
},

setup: function($super)
{
	/*
		Keep track of the number of empty free cells and the empty tableaus in
		order to make calculating the number of draggable cards easy.  The
		changed callbacks for the stacks will modify these as needed.
	*/
	this.emptyFreeCells	= 0;
	this.emptyTableaus	= 0;

	$super();

	/* Hide fields in preferences that don't make sense for this game */
	this.prefs.hide = [ 'deckposition' ];

	/* Setup the free cells */
	this.free = this.controller.get('free');
	Element.select(this.free, 'div').each(function(div) {
		this.controller.setupWidget(div.id, {
			'inplay': true,
			'label': $L('FREE'),

			'add': function(stack, cards)
			{
				if (!cards || !cards.length) {
					/* Why did you even ask? */
					return(false);
				}

				if ((stack.mojo.getCards().length + cards.length) > 1) {
					/* Each free cell can only hold one card at a time */
					return(false);
				}

				return(true);
			}.bind(this),

			'take': function(stack)
			{
				/* A card in a free cell may always be removed */
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
				/* Cards can not be moved out of a foundation */
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
				/*
					Return true if the provided list of cards can legally be
					added to this stack.

						- Cards must alternate in color (In Baker's game they
						  must be the same suit)
						- Cards must be decending sequentially in rank
						- There must be enough empty freecells and tableaus to
						  allow the move.  A stack of cards can only be moved if
						  that same stack can be moved one card at a time.
				*/
				var existing	= stack.mojo.getCards();

				if (!cards || !cards.length) {
					return(false);
				}

				if (existing && existing.length) {
					var dest = existing[existing.length - 1];

					if (this.gameid != 'freecell_bakers') {
						/* Normal freecell requires alternating colors */
						if (this.cardColor(dest) == this.cardColor(cards[0])) {
							return(false);
						}
					} else {
						/* Baker's game requires matching suits */
						if (dest.suit != cards[0].suit) {
							return(false);
						}
					}

					if (dest.rank != cards[0].rank + 1) {
						return(false);
					}
				} else if (this.kingsonly && cards[0].rank != 13) {
					/*
						In forecell and other variants that use the 'kingsonly'
						rule empty tableaus must start with a king.
					*/
					return(false);
				}

				if (this.gameid != 'freecell_relaxed') {
					/*
						Calculate the drag limit.  Freecell allows moves that
						can be done one card at a time.  This allows 1 card plus
						all the empty freecells.  The value is doubled for each
						empty tableau.

						If the variant of freecell uses the 'kingsonly' rule
						then empty tableaus can not be used.
					*/
					var d = 1 + this.emptyFreeCells;

					if (!this.kingsonly) {
						var		i;

						if (existing.length) {
							i = 0;
						} else {
							/*
								Each empty tableau can double the number of
								cards to move in a stack, but the destination
								can not be used in this way.
							*/
							i = 1;
						}

						for (; i < this.emptyTableaus; i++) {
							d = d * 2;
						}
					}

					if (cards.length > d) {
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
					if (cards[i - 1].facedown ||
						cards[i - 1].rank != cards[i].rank + 1
					) {
						break;
					}

					if (this.gameid != 'freecell_bakers') {
						/* Normal freecell requires alternating colors */
						if (this.cardColor(cards[i]) == this.cardColor(cards[i - 1])) {
							break;
						}
					} else {
						/* Baker's game requires matching suits */
						if (cards[i].suit != cards[i - 1].suit) {
							break;
						}
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
},

highlightCards: function($super)
{
	/*
		Figure out how many empty freecells and empty tableaus there are so that
		it is easy to calculate the number of cards in a sequence that can be
		drug to a tableau.
	*/
	var empty = 0;
	Element.select(this.free, '.CardStack').each(function(stack)
	{
		if (!stack.mojo.getCards().length) {
			empty++;
		}
	});
	this.emptyFreeCells	= empty;

	empty = 0;
	Element.select(this.tableau, '.CardStack').each(function(stack)
	{
		if (!stack.mojo.getCards().length) {
			empty++;
		}
	});
	this.emptyTableaus = empty;
Mojo.log('Empty free cells:', this.emptyFreeCells, ', empty tableaus: ', this.emptyTableaus);

	return($super());
},

deal: function($super, dealtype, gamenum)
{
	var difficulty	= NaN;
	var type		= '';
	var d;
	var deck;

	if (!(d = $super(dealtype, gamenum))) {
		return(d);
	}

	switch (dealtype) {
		case 'easy':	difficulty = -1;	break;
		case 'medium':	difficulty = 0;		break;
		case 'hard':	difficulty = 1;		break;
	}

	do {
		d = {};
		$$('.CardStack').each(function(div) {
			d[div.id] = [];
		}.bind(this));

		if (isNaN(gamenum) && !isNaN(difficulty)) {
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

		var tableaus = Element.select(this.controller.get('tableau'), '.CardStack');

		switch (this.gameid) {
			case 'freecell_forecell':
				/* Deal the last 4 cards to the free cells */
				var free = Element.select(this.free, '.CardStack');

				for (var i = free.length - 1; i >= 0; i--) {
					d[free[i].id].push(deck.pop());
				}
				break;

			case 'freecell_challenge':
			case 'freecell_super_challenge':
				var suits = [ 'clubs', 'spades', 'hearts', 'diams' ];

				/*
					Deal the duces and then the aces as the first card in the
					tableaus, in a fixed suit order.
				*/
				for (var c  = 0; c < deck.length; c++) {
					if (deck[c].rank < 3) {
						deck.splice(c--, 1);
					}
				}

				for (var i = 0; i < suits.length; i++) {
					d[tableaus[i    ].id].push( { 'suit': suits[i], 'rank': 2 } );
					d[tableaus[i + 4].id].push( { 'suit': suits[i], 'rank': 1 } );
				}
				break;
		}

		/* Deal the cards to the tableaus */
		var c = 0;
		while (deck.length) {
			d[tableaus[c++ % tableaus.length].id].push(deck.shift());
		}

		/*
			If a difficulty was specified then determine the difficulty for this
			deal, and throw it out if it doesn't match.
		*/
		if (!isNaN(difficulty)) {
			var		dif = NaN;

			for (var i = 0; dif != 0 && i < tableaus.length; i++) {
				var p = d[tableaus[i].id];

				for (var c = 0; dif != 0 && c < p.length; c++) {
					if (p[c].rank == 1) {
						/* We found an ace */
						if (c < 4) {
							if (isNaN(dif) || dif == 1) {
								dif = 1;
							} else {
								dif = 0;
							}
						} else {
							if (isNaN(dif) || dif == -1) {
								dif = -1;
							} else {
								dif = 0;
							}
						}
					}
				}
			}

			switch (dif) {
				case 1:		Mojo.log('Deal was hard');		break;
				case 0:		Mojo.log('Deal was medium');	break;
				case -1:	Mojo.log('Deal was easy');		break;

				default:	Mojo.log('Deal was', dif);		break;
			}

			if (dif != difficulty) {
				/* This hand didn't match, so throw it away */
				Mojo.log('Throwing away the deal');
				d = null;
				gamenum++;
			}
		}
	} while (!d);

	d['gamenum']	= gamenum;
	d['moves']		= 0;
	return(d);
},

newGame: function($super, options)
{
	if (!options) options = {};

	/* Turn on all difficulties */
	options['extrachoices'] = [
		{ label: $L('Easy'),	value:'easy'	},
		{ label: $L('Medium'),	value:'medium'	},
		{ label: $L('Hard'),	value:'hard'	}
	];

	return($super(options));
},

autoPlayCard: function($super, stack, destinations, human, dealer)
{
	/*
		Try to auto play a card.

		Foundations are prefered of course, followed by tableaus with cards,
		empty free cells, and finally empty tableaus.
	*/
	if (!destinations) {
		if (human) {
			var d	= Element.select(this.foundation,	'.CardStack');
			var t	= Element.select(this.tableau,		'.CardStack');
			var f	= Element.select(this.free,			'.CardStack');

			/* Include any tableaus that have cards, since this is cheap */
			t.each(function(stack) {
				if (stack.mojo.getCards().length) {
					d.push(stack);
				}
			});

			/*
				Allow moving to the first empty free cell, unless the card is
				already in a freecell.  There is no reason to jump back and
				forth from one freecell to another.
			*/
			if (!Element.up(stack, '#free')) {
				for (var i = 0; i < f.length; i++) {
					if (!f[i].mojo.getCards().length) {
						d.push(f[i]);
						break;
					}
				}
			}

			/*
				Finally allow moving to any empty tableaus.  This is last
				because it makes the biggest impact to the number of cards a
				player can move.
			*/
			t.each(function(stack) {
				if (!stack.mojo.getCards().length) {
					d.push(stack);
				}
			});

			destinations = d;
		} else {
			destinations = Element.select(this.foundation, '.CardStack');
		}
	}

	return($super(stack, destinations, human, dealer));
},

autoPlayCards: function($super, destinations)
{
	if (this.skipAuto) return;

	if (!destinations) {
		destinations = Element.select(this.foundation, '.CardStack');
	}

	var sources = Element.select(this.tableau, '.CardStack').concat(
		Element.select(this.free, '.CardStack')
	);

	for (var i = sources.length - 1; i >= 0; i--) {
		if (this.autoPlayCard(sources[i], destinations)) {
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


