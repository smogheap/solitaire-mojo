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

function WRand() {
}

/*
	Mimick the random number generator used by windows in order to allow using
	the game numbers from the windows freecell.
*/
WRand.shuffle = function(seed, suits, decks)
{
	var result = [];

	if (isNaN(decks)) {
		decks = 1;
	}

	if (!suits) {
		suits = [ 'clubs', 'diams', 'hearts', 'spades' ];
	}

	for (; decks > 0; decks--) {
		var deck	= [];

		for (var i = 0; i < 52; i++) {
			deck[i] = i;
		}

		for (var i = 0; i < 52; i++) {
			var t	= WRand.value(seed);
			var	r	= t[0] % (52 - i);
			seed	= t[1];

			result.push({
				'suit':	suits[Math.floor(deck[r] % suits.length)],
				'rank':	Math.floor(deck[r] / 4) + 1
			});

			deck[r] = deck[52 - 1 - i];
		}
	}

	return(result);
};

WRand.reshuffle = function(seed, cards)
{
	var result	= [];
	var deck	= [];

	for (var i = 0; i < cards.length; i++) {
		deck[i] = i;
	}

	for (var i = 0; i < cards.length; i++) {
		var t	= WRand.value(seed);
		var	r	= t[0] % (cards.length - i);
		seed	= t[1];

		result.push(cards[deck[r]]);
		deck[r] = deck[cards.length - 1 - i];
	}

	return(result);
};

WRand.value = function(seed)
{
	seed = seed * 214013 + 2531011;
	seed = seed & 4294967295;
	var r = ((seed >> 16) & 32767);

	return([ r, seed ]);
};

