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

/*
	Attribute Properties:
		suit:		(string)
			A suit to display for the stack base.

		offset:
			An array of integers to specify where each card in a stack should be
			displayed in relation to the previous card.  The first 2 values are
			added to the left and top position of the previous card.

			If 4 values are provided then the 3rd and 4th values are used for
			a facedown card.

		hidebase	(boolean)
			If true then a base will not be drawn

		add			(function)
			A callback that is used to determine if cards can legally be added
			to a stack.

		take		(function)
			A callback function used to determine which cards can legally be
			removed from a stack.  It should return the number of cards that can
			be taken.
*/
Mojo.Widget.CardStack = Class.create({});

/*
	Return the offset of the top left corner of the specified card from the
	position of the stack.

	If 'opposite' is truthy then return the bottom right corner instead.
*/
Mojo.Widget.CardStack.prototype.cardOffset = function(offset, opposite)
{
	var cards = this.getCards();

	if (isNaN(offset)) {
		offset = cards.length - 1;
	}

	var x		= 0;
	var y		= 0;
	var tight	= 0;

	/*
		Cards that are face down use the second set of values in this.offset to
		keep them packed tighter and save a few pixels.  If this.maxLoose is set
		then the tighter spacing should be applied to face up cards as well if
		there are more than this.maxLoose face up, starting from the top.
	*/
	if (!isNaN(this.maxLoose)) {
		tight = Math.max(cards.length, offset + 1) - this.maxLoose;
	}

	for (var i = 0; i < offset; i++) {
		if (i < cards.length && cards[i]['offset']) {
			x += cards[i]['offset'][0];
			y += cards[i]['offset'][1];
		} else if (i >= cards.length || (!cards[i].facedown && tight <= i)) {
			x += this.offset[0];
			y += this.offset[1];
		} else {
			x += this.offset[2];
			y += this.offset[3];
		}
	}

	if (!opposite) {
		return([ x, y ]);
	} else {
		var d = Element.getDimensions(this.base);

		return([ x + d['width'], y + d['height'] ]);
	}
};

/*
	Return true if the specified suit and rank are allowed to be added to
	this stack.
*/
Mojo.Widget.CardStack.prototype.checkCards = function(cards)
{
	if (!this.add) {
		return(false);
	}

	return(this.add(this.controller.element, cards));
};

Mojo.Widget.CardStack.prototype.nudgeCard = function(card, sloppy)
{
	if (sloppy) {
		/*
			Generate a random number based on the card's rank and suit so that
			it gets nudged the same amount for this whole game.  The seed will
			use the game number so that this will be reset when the game changes
		*/
		var seed = this.gamenumber * card.rank;

		var suits = [ 'clubs', 'diams', 'hearts', 'spades' ];
		for (var i = 0; i < suits.length; i++) {
			if (card.suit == suits[i]) {
				break;
			}
			seed = seed * 2;
		}

		/* Move the card by a random amount */
		var r = (WRand.value(seed)[0] % 100) / 100;
		var x = (WRand.value(seed)[0] % 100) / 100;
		var y = (WRand.value(seed)[0] % 100) / 100;

		card.style.webkitTransform	= 'rotate(' + ((r * 4) - 2) + 'deg)';
		card.style.marginLeft		= ((x * 4) - 2) + 'px';
		card.style.marginTop		= ((y * 4) - 2) + 'px';
	} else {
		/* Restore the card to it's neat original position */

		card.style.webkitTransform	= 'rotate(0deg)';
		card.style.marginLeft		= '0px';
		card.style.marginTop		= '0px';
	}
};

Mojo.Widget.CardStack.prototype.setSloppy = function(sloppy)
{
	var cards	= this.getCards();

	this.sloppy = sloppy;
	cards.each(function(card) {
		this.nudgeCard(card, sloppy);
	}.bind(this));
};

Mojo.Widget.CardStack.prototype.newCard = function(card, className)
{
	var div = document.createElement('div');

	div.addClassName(className || 'card');

	div.suit		= card['suit'];
	div.rank		= card['rank'];
	div.facedown	= card['facedown'];
	div.offset		= card['offset'];

	if (card['label']) {
		var l = document.createElement('div');

		l.update(card['label']);
		l.addClassName('label');

		div.appendChild(l);
	}

	if (!isNaN(card['rank'] && card['rank'] > 0)) {
		var name;

		switch (card['rank']) {
			/* Used for cells and foundation */
			case 14:
			case 1:		name = 'A';				break;
			default:	name = card['rank'];	break;
			case 11:	name = 'J';				break;
			case 12:	name = 'Q';				break;
			case 13:	name = 'K';				break;
		}

		div.update(name);
		if (!card['big']) {
			div.addClassName('small');

			if (this.sloppy) {
				/*
					Make the cards look more natural by rotating slightly and
					nudging them a bit.
				*/
				this.nudgeCard(div, true);
			}
		} else {
			div.addClassName('big');
		}
	}

	if (card['suit']) {
		div.addClassName(card['suit']);
	}

	if (card['facedown']) {
		div.addClassName('facedown');
	}
	return(div);
};

Mojo.Widget.CardStack.prototype.getAttributes = function()
{
	return(this.controller.attributes);
};

Mojo.Widget.CardStack.prototype.getElement = function()
{
	return(this.controller.element);
};

/*
	Add the provided array of cards to the stack.  If dealer is true then no
	callbacks will be made to verify that the cards can be added legally.
*/
Mojo.Widget.CardStack.prototype.addCards = function(cards, human, dealer, ignore, clean)
{
	if (!dealer && !this.checkCards(cards)) {
		return(false);
	}

	cards.each(function(card)
	{
		if (clean) {
			card.offset = null;
		}
		this.good.appendChild(this.newCard(card));
	}.bind(this));

	if (this.changed) {
		this.changed(this.controller.element, human, dealer, !ignore);
	}

	this.drawCards(NaN);
	return(true);
};

Mojo.Widget.CardStack.prototype.removeCards = function(cards)
{
	for (i = cards.length - 1; i >= 0; i--) {
		var mom = cards[i].parentNode;

		mom.removeChild(cards[i]);
	}

	if (this.changed) {
		this.changed(this.controller.element, false, false, false);
	}
	this.drawCards(NaN);
};

Mojo.Widget.CardStack.prototype.getCards = function()
{
	return(Element.select(this.controller.element, '.card'));
};

Mojo.Widget.CardStack.prototype.setCards = function(cards, gamenumber)
{
	/*
		Remove all existing cards, and then add the new ones.  Remove the cards
		manually instead of calling removeCards() to prevent calling the update
		callback multiple times.  The call to addCards() will take care of that.
	*/
	this.gamenumber = gamenumber;
	this.getCards().each(function(card) {
		var mom = card.parentNode;

		mom.removeChild(card);
	});

	/* Don't save state */
	this.addCards(cards, false, true, true);
};

Mojo.Widget.CardStack.prototype.setBase = function(options)
{
	if (!options) options = {};

	if (!options['rank']) options['rank'] = this.base.rank;
	if (!options['suit']) options['suit'] = this.base.suit;

	/* Destroy our base and recreate it */
	if (this.base) {
		this.controller.element.removeChild(this.base);
	}

	options['big'] = true;

	this.controller.element.appendChild((this.base = this.newCard(options, 'base')));
	if (this.hidebase) {
		this.base.style.display = 'none';
	}
};

Mojo.Widget.CardStack.prototype.setMaxLoose = function(maxLoose)
{
	this.maxLoose = maxLoose;
};

Mojo.Widget.CardStack.prototype.setOffset = function(offset)
{
	this.offset = offset || [];

	/*
		Add default values to the offset array if needed.  The first 2 values
		are the left and top offsets, and should default to 0.  The second 2
		values are the same thing for hidden cards, and by default should match
		the first 2 values.
	*/
	while (this.offset.length < 2) {
		this.offset.push(0);
	}
	if (this.offset.length < 3) {
		this.offset.push(this.offset[0]);
	}
	if (this.offset.length < 4) {
		this.offset.push(this.offset[1]);
	}
};

Mojo.Widget.CardStack.prototype.drawCards = function(seqCount, zIndex, offset, highlight)
{
	var cards	= this.getCards();

	if (isNaN(seqCount)) {
		if (this.take) {
			seqCount = this.take(this.controller.element);
		} else {
			seqCount = 0;
		}
	}

	var good	= Element.select(this.good, '.card');
	var junk	= Element.select(this.junk, '.card');
	var diff	= seqCount - good.length;

	for (; diff > 0; diff--) {
		var tmp = junk.pop();

		if (!tmp) break;

		if (good.length) {
			this.good.insertBefore(tmp, good[0]);
		} else {
			this.good.appendChild(tmp);
		}

		/* Reset the good list */
		good = Element.select(this.good, '.card');
	}

	for (; diff < 0; diff++) {
		var tmp = good.shift();

		if (!tmp) break;
		this.junk.appendChild(tmp);
	}

	var i		= 0;
	var z		= 0;
	var x		= 0;
	var y		= 0;
	var	tight	= 0;

	/*
		Cards that are face down use the second set of values in this.offset to
		keep them packed tighter and save a few pixels.  If this.maxLoose is set
		then the tighter spacing should be applied to face up cards as well if
		there are more than this.maxLoose face up, starting from the top.
	*/
	if (!isNaN(this.maxLoose)) {
		tight = cards.length - this.maxLoose;
	}

	cards.each(function(card) {
		card.style.left			= x + 'px';
		card.style.top			= y + 'px';
		card.style.zIndex		= ++i;

		if (offset) {
			x += offset[0];
			y += offset[1];
		} else if (card['offset']) {
			x += card['offset'][0];
			y += card['offset'][1];
		} else if (!card['facedown'] && tight < i) {
			x += this.offset[0];
			y += this.offset[1];
		} else {
			x += this.offset[2];
			y += this.offset[3];
		}

		if (zIndex && i > cards.length - seqCount) {
			if (zIndex) {
				if (!highlight || !highlight.length) {
					card.style.zIndex = i + zIndex;
				} else {
					highlight.each(function(h)
					{
						if (cards.length - i == h) {
							card.style.zIndex = i + zIndex;
						}
					});
				}
			}
		}
		last = card;

		if (card['facedown']) {
			card.addClassName('facedown');
		} else {
			card.removeClassName('facedown');
		}
	}.bind(this));

	if (cards.length) {
		this.base.style.zIndex	= 0;
	} else {
		this.base.style.zIndex	= zIndex || 0;
	}

	/*
		Set the size of this.good to allow dragging from below the card
		stack, which makes for easier game play.
	*/
	var size = this.cardOffset(cards.length, true);
	this.good.style.width	= size[0] + 'px';
	this.good.style.height	= this.height + 'px';
};

Mojo.Widget.CardStack.prototype.mouseDown = function(event)
{
	this.controller.listen(document, "mouseup",		this.mouseUpHandler);
	this.controller.listen(document, "mousemove",	this.mouseMoveHandler);

	this.dragging = true;

	/*
		Calling this.drawCards() will put all the cards that are in sequence
		into this.good.  We need to do this to figure out how many cards can
		go into each of the other stacks.
	*/
	this.drawCards(NaN, 200);
	var cards = Element.select(this.good, '.card');
	// Mojo.log('There are', cards.length, 'cards in sequence');

	/*
		Save the starting position of this.good because it's position will
		need to be set relative to it's starting position.
	*/
	this.good.position	= Element.cumulativeOffset(this.good);
	this.good.count		= cards.length;
	this.dimensions		= Element.getDimensions(this.base);

	/*
		Calculate some information about all of the stacks so that we don't
		have to figure it out while dragging.
	*/
	this.stacks = [];
	$$('.CardStack').each(function(stack) {
		if (stack.id == this.controller.element.id) {
			return;
		}

		/* Copy the cards */
		var valid = cards.concat();
		while (valid.length) {
			if (stack.mojo.checkCards(valid)) {
				break;
			} else {
				valid.shift();
			}
		}

		if (!valid.length) {
			/*
				This stack can't accept any cards from the stack
				that we are dragging from, so ignore it.
			*/
			return;
		}

		/*
			Save position (x, y) of the top left corner of the top card
			on the stack, and the number of cards that can be legally
			moved from this stack.
		*/
		var pos		= Element.cumulativeOffset(stack);
		var off		= stack.mojo.cardOffset();
		var a		= stack.mojo.getAttributes();

		/*
			If a dragging height was provided for this stack then use it as the
			height for the drag destination as well.  This means that in a game
			like spider you can do your drags entirely horizontally.
		*/

		this.stacks.push({
			x: 		pos[0] + off[0],
			y: 		pos[1] + off[1],
			w:		this.cardOffset(valid.length, false)[0],
			h:		a['height'] || this.cardOffset(valid.length, true )[1],
			valid:	valid.length,
			id:		stack.id
		});
	}.bind(this));

Mojo.log('Valid Moves:', Object.toJSON(this.stacks));
	this.closest		= null;
	this.sentDragStart	= false;
};

Mojo.Widget.CardStack.prototype.mouseMove = function(event)
{
	/*
		Find the closest stack.

		Calculate the distance from the top card being drug to the position it
		would be in if it where added to a stack.  This means that the top card
		may change from stack to stack.

		Use Pythagorean's theorem to calculate the distance.  Since relative
		values are all that we need don't bother getting the square root.

		The position of this.good offset by the number of cards that will not be
		moved is the starting position.  The position of the other stack offset
		by the number of cards it already contains + 1 is the end position.  The
		pre calculated positions of each stack takes the card count on both
		sides into account.
	*/
	var match	= null;
	var mdist	= NaN;
	var count	= NaN;
	var wasin	= this.closest;

	// Mojo.log('mousemove');

	this.stacks.each(function(stack) {
		if (stack.valid > 0) {
			var x = (event.pageX - (this.dimensions['width' ] / 2));
			var y = (event.pageY - (this.dimensions['height'] / 2));

			if (y < stack.y) {
				/* The mouse is above this stack */
				y = stack.y - y;
			} else if (y > (stack.y + stack.h)) {
				/* The mouse is below this stack */
				y = stack.y - y + stack.h;
			} else {
				/* The mouse is directly to the left or right of this stack */
				y = 0;
			}

			if (x < stack.x) {
				/* The mouse is left of this stack */
				x = stack.x - x;
			} else if (x > (stack.x + stack.w)) {
				/* The mouse is right of this stack */
				x = stack.x - x + stack.w;
			} else {
				/* The mouse is directly above or below this stack */
				x = 0;
			}

			var d = (x * x) + (y * y);
// Mojo.log('distance: ', Math.floor(Math.sqrt(d)), d, x, y);

			/*
				Minimum distance is 10000.  This is actually the distance
				squared since we are trying to avoid taking the square root when
				calculating which is closest.
			*/
			if (d < 10000 && (isNaN(mdist) || d < mdist)) {
				mdist = d;
				match = stack;
			}
		}
	}.bind(this));

	if (this.closest && (!match || match.id != this.closest.id)) {
		/* We've left the previous stack */
		var stack = this.controller.scene.get(this.closest.id);

		stack.mojo.dragLeave(this.good);
		this.closest = null;
	}

	if (!this.closest && match) {
		/* We've entered a stack */
		var stack = this.controller.scene.get(match.id);

		count = match.valid;
		stack.mojo.dragEnter(this.good, count);
		Mojo.log('closest is', match.id);

		this.closest = match;
	}

	if (!this.sentDragStart) {
		/*
			Either we just started dragging, or we've switched the number of
			cards being drug.  Adjust the margins on this.good so that
			setting it's top and left to the position of the mouse will make
			the stack appear above the user's finger.
		*/
		var offset = this.cardOffset(this.getCards().length);

		this.good.style.marginLeft	= (0 - this.good.position[0] -
			(this.dimensions['width'] / 2) - offset[0]) + 'px';

		this.good.style.marginTop	= (-5 - this.good.position[1] -
			this.dimensions['height'] - offset[1]) + 'px';
	}

	if (!isNaN(count) || (wasin && !this.closest)) {
		/* We've either entered or exited a stack (or both) so redraw */
		this.drawCards(count, 200);
	}

	if (this.closest) {
		this.good.removeClassName('disabled');
	} else {
		this.good.addClassName('disabled');
	}

	if (!this.sentDragStart) {
		/* We are now dragging.  Let the consumer know. */
		this.sentDragStart = true;
		Mojo.Event.send(this.controller.element, 'dragStart');
	}

	/*
		Move the stack

		The goal is to position the stack so that it is visible right above
		the user's finger.
	*/
	this.good.style.left	= event.pageX + 'px';
	this.good.style.top		= event.pageY + 'px';
};

Mojo.Widget.CardStack.prototype.mouseUp = function(event)
{
	/* Reset the position of this.good to be ready for the next drag */
	this.good.style.left		= '0px';
	this.good.style.top			= '0px';
	this.good.style.marginLeft	= '0px';
	this.good.style.marginTop	= '0px';
	this.good.removeClassName('disabled');

	if (this.sentDragStart) {
		this.sentDragStart = false;

		/*
			The card stack was moved.  Inform the new stack that it should
			attempt to take these cards.
		*/
		if (this.closest) {
			var stack = this.controller.scene.get(this.closest.id);

			stack.mojo.dragDrop(this.good, true, false, NaN, event.metaKey);
		}

		Mojo.Event.send(this.controller.element, 'dragStop');
	} else {
		/*
			The card was tapped, but wasn't moved.

			The cardstack includes a very tall div to allow dragging from below
			the stack, but tapping below doesn't make sense.  Verify that a card
			was actually tapped on.
		*/
		if (this.tap && event.target && (
			event.target.hasClassName('card') || Element.up(event.target, '.card') ||
			event.target.hasClassName('base') || Element.up(event.target, '.base')
		)) {
			if (MinegoApp.events) {
				MinegoApp.events.push('Tapped on ' + this.controller.element.id);
			}

			this.tap(this.controller.element);
		}
	}

	this.stacks = [];

	this.controller.stopListening(document, "mouseup",		this.mouseUpHandler);
	this.controller.stopListening(document, "mousemove",	this.mouseMoveHandler);

	this.drawCards(NaN);
	this.base.style.zIndex = 0;
	this.dragging = false;
};

Mojo.Widget.CardStack.prototype.dragEnter = function(element, count)
{
	var stack	= Element.up(element, 0);

	if (stack.id == this.controller.element.id) {
		/* This is the stack it left from, so don't do anything */
		return;
	}

	/*
		Reset the zIndex for this.good so that it will appear above the fade
		so it is clear where the card is being dragged to.
	*/
	this.drawCards(Element.select(this.good, '.card').length, 100);
};

Mojo.Widget.CardStack.prototype.dragLeave = function(element)
{
	if (this.debug > 1) Mojo.log('dragLeave', this.controller.element.id);

	/*
		Reset the zIndex for this.good so that it will be below the fade
		again.
	*/
	this.drawCards(Element.select(this.good, '.card').length, 0);
};

/* Return true if this stack is being drug right now */
Mojo.Widget.CardStack.prototype.isDragging = function(element)
{
	return(this.dragging);
};

Mojo.Widget.CardStack.prototype.dragDrop = function(element, human, dealer, limit, metaKey)
{
	var stack	= Element.up(element, 0);

	if (stack.id == this.controller.element.id) {
		/* This is the stack it left from, so don't do anything */
		return;
	}

	if (!dealer && !this.add) {
		return;
	}

	var cards	= Element.select(element, '.card');
	var mine	= this.getCards();

	if (isNaN(limit)) {
		limit = cards.length;
	}

	/*
		Determine which possible combinations of cards are valid here.  If there
		are more than one possible sets then the user needs to decide which to
		play.
	*/
	var options = [];
	var count	= 0;

	while (cards.length) {
		if (cards.length <= limit && (dealer || this.checkCards(cards))) {
			options.push(true);
			count++;

			if (!metaKey && !mine.length && !this.alwaysask) {
				/*
					When dragging to an empty stack only show the dialog if
					the user was touching the gesture area while dragging.
				*/
				break;
			}
		} else {
			options.push(false);
		}

		cards.shift();
	}

	/* Reset the cards list */
	cards = Element.select(element, '.card');

	if (!count) {
		/* There where no valid sets */
		return;
	}

	if (count == 1) {
		/* Don't call the changed callback until the whole action is done */
		var changed = this.changed;
		this.changed = null;

		/* There was only one valid set, so play it without prompting the user */
		while (!options[0]) {
			options.shift();
			cards.shift();
		}

		if (this.addCards(cards, human, true, false, true)) {
			stack.mojo.removeCards(cards);

			if (MinegoApp.events) {
				MinegoApp.events.push('Drug ' + cards.length +
					' cards from ' + stack.mojo.getElement().id +
					' to ' + this.controller.element.id);
			}
		}

		if ((this.changed = changed)) {
			this.changed(this.controller.element, human, dealer, true);
		}
		return;
	}

	/* There was more than one valid set of cards, so the user needs to choose */
	this.controller.scene.showDialog({
		'template':		'choosestack/choosestack-dialog',
		'assistant':	new ChooseStackDialog(this.controller.scene, stack, this,
			options, cards,
			function(count)
			{
				/* Don't call the changed callback until the whole action is done */
				var changed = this.changed;
				this.changed = null;

				while (cards.length > count) {
					cards.shift();
				}

				if (this.addCards(cards, human, true, false, true)) {
					stack.mojo.removeCards(cards);

					if (MinegoApp.events) {
						MinegoApp.events.push('Drug ' + cards.length +
							' cards from ' + stack.mojo.getElement().id +
							' to ' + this.controller.element.id);
					}
				}

				if ((this.changed = changed)) {
					this.changed(this.controller.element, human, dealer, true);
				}
				return;
			}.bind(this))
	});
};

Mojo.Widget.CardStack.prototype.dragRemove = function(element)
{
	if (this.debug > 1) Mojo.log('dragRemove', this.controller.element.id);
};

Mojo.Widget.CardStack.prototype.setup = function()
{
	/*
		Expose public widget API

		A consumer of this widget may get a reference to it by id, and then
		may access these methods.  For example:
			this.foo = this.controller.get('foo');

			this.foo.mojo.getCards();
	*/
	this.controller.exposeMethods([
		'checkCards',	'addCards',		'removeCards',
		'drawCards',	'getCards',		'setCards',
		'setBase',		'setMaxLoose',	'setOffset',
		'setSloppy',	'cardOffset',	'getAttributes',
		'dragDrop',		'dragEnter',	'dragLeave',
		'isDragging',	'getElement'
	]);

	this.debug		= this.controller.attributes['debug'		];

	/* Styling and layout info */
	this.suit		= this.controller.attributes['suit'			];
	this.baserank	= this.controller.attributes['baserank'		];
	this.label		= this.controller.attributes['label'		];
	this.hidebase	= this.controller.attributes['hidebase'		];
	this.height		= this.controller.attributes['height'		] || NaN;
	this.maxLoose	= this.controller.attributes['maxLoose'		] || NaN;
	this.sloppy		= this.controller.attributes['sloppy'		];
	this.alwaysask	= this.controller.attributes['alwaysask'	];

	this.setOffset(this.controller.attributes['offset']);

	/* Callbacks */
	this.add		= this.controller.attributes['add'			];
	this.take		= this.controller.attributes['take'			];
	this.tap		= this.controller.attributes['tap'			];
	this.changed	= this.controller.attributes['changed'		];

	/* Make sure we can find all of the card stacks */
	this.controller.element.addClassName('CardStack');

	/*
		Create 2 divs to contain the cards.  The first (junk) is for any
		unordered cards.  The second (good) is there to hold the cards at
		the end of the stack that are in order.

		This allows dragging the ordered portion of the list while leaving
		the junk in portion in place.
	*/
	this.controller.element.appendChild((this.junk = document.createElement('div')));
	this.controller.element.appendChild((this.good = document.createElement('div')));
	this.controller.element.appendChild((this.base = this.newCard({
		'rank':		this.baserank,
		'suit':		this.suit,
		'label':	this.label,
		'big':		true
	}, 'base')));

	if (this.hidebase) {
		/* Create the base even if it is hidden because we use it later */
		this.base.style.display = 'none';
	}

	/*
		These must be set to absolute so that their children will be
		relative to them.
	*/
	this.junk.style.position	= 'absolute';
	this.good.style.position	= 'absolute';
	this.good.style.left		= '0px';
	this.good.style.top			= '0px';

	/* Insert each of the cards dealt to this deck */
	if (this.controller.attributes['cards']) {
		this.addCards(this.controller.attributes['cards'], false, true);
	}

	// this.good.style.border = '1px solid pink';

	/* Allow dragging cards from this stack */
	this.mouseMoveHandler	= this.mouseMove.bindAsEventListener(this);
	this.mouseDownHandler	= this.mouseDown.bindAsEventListener(this);
	this.mouseUpHandler		= this.mouseUp.bindAsEventListener(this);

	this.controller.listen(this.controller.element, 'mousedown',
		this.mouseDownHandler);

	this.drawCards(NaN);
};

Mojo.Widget.CardStack.prototype.cleanup = function()
{
	if (this.mouseDownHandler) {
		this.controller.stopListening(this.controller.element, 'mousedown',
			this.mouseDownHandler);
		this.mouseDownHandler = null;
	}

	if (this.mouseMoveHandler) {
		this.controller.stopListening(document, 'mousemove',
			this.mouseMoveHandler);
		this.mouseMoveHandler = null;
	}

	if (this.mouseUpHandler) {
		this.controller.stopListening(document, 'mouseup',
			this.mouseUpHandler);
		this.mouseUpHandler = null;
	}
};


