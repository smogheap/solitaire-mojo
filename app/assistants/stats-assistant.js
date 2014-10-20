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


function StatsAssistant(stats)
{
	this.stats = stats;
}

/*
	Statistics
	----------

	Games Played:               30
	Games Won:            15 (50%)
	Fastest Win:          00:04:05
	Winning Streak:        3 Games

	Games Won
	---------
	Game #25              00:04:05
	Game #5               00:09:34

	Games Lost
	----------
	Game #1          13 cards left
	Game #2            1 card left
*/
StatsAssistant.prototype.setup = function()
{
    $$('.translate').each(function(e) { e.update($L(e.innerHTML)); });
	this.controller.setupWidget(Mojo.Menu.appMenu,
		{ omitDefaultItems: true },
		this.menu = {
			visible:		true,
			items: [
				Mojo.Menu.editItem,
				{ label: $L('Reset'), command: 'reset' }
			]
		}
	);

	this.wonmodel	= { items: [] };
	this.lostmodel	= { items: [] };

	this.controller.setupWidget('wonlist',
		{ itemTemplate:	'stats/won-item' },
		this.wonmodel
	);

	this.controller.setupWidget('lostlist',
		{ itemTemplate:	'stats/lost-item' },
		this.lostmodel
	);

	this.update();
};

StatsAssistant.prototype.update = function()
{
	/*
		Fill out the stats:
			gamecount, wincount, besttime, winstreak
	*/
	this.stats.query("SELECT game, score, scoretext, time FROM " + this.stats.name, [], function(rows) {
		var won			= 0;
		var streak		= 0;
		var fastest		= NaN;
		var wonitems	= [];
		var lostitems	= [];
		var spent		= 0;
		var scoretotal	= 0;
		var gamecount	= 0;

		if (!rows) rows = [];

		for (var i = 0; i < rows.length; i++) {
			var row = rows.item(i);

			if (isNaN(row['game'])) {
				continue;
			}
			gamecount++;

			scoretotal	+= row['score'];
			spent		+= row['time'];

			if (row['score'] == 0) {
				won++; streak++;

				var s	= row['time'] % 60;
				var m	= Math.floor((row['time'] / 60)) % 60;
				var h	= Math.floor((row['time'] / 60) / 60);

				wonitems.push({
					'num':			row['game'],
					'game':			$L('Game #') + ' ' + row['game'],
					'time':			(h < 10 ? ('0' + h) : h) + ':' +
									(m < 10 ? ('0' + m) : m) + ':' +
									(s < 10 ? ('0' + s) : s)
				});

				if (row['time'] > 0 && (isNaN(fastest) || row['time'] < fastest)) {
					fastest = row['time'];
				}
			} else {
				streak = 0;

				lostitems.push({
					'num':			row['game'],
					'score':		row['scoretext'],
					'game':			$L('Game #') + ' ' + row['game']
				});
			}
		}

		$$('.ifwon').each(function(e) {
			if (won) {
				e.style.display = 'block';
			} else {
				e.style.display = 'none';
			}
		});

		if (gamecount) {
			this.controller.get('gamecount').update(gamecount);
			this.controller.get('wincount').update(won + ' (' + Math.floor(won / gamecount * 100) + '%)');
		} else {
			this.controller.get('wincount').update('0');
		}

		if (streak > 1) {
			this.controller.get('winstreak').update(streak + ' ' + $L('Games'));
			this.controller.get('winstreak').up('.palm-row').style.display = 'block';
		} else {
			this.controller.get('winstreak').up('.palm-row').style.display = 'none';
		}

		if (!isNaN(fastest)) {
			var s	= fastest % 60;
			var m	= Math.floor((fastest / 60)) % 60;
			var h	= Math.floor((fastest / 60) / 60);
			this.controller.get('besttime').update(
				(h < 10 ? ('0' + h) : h) + ':' +
				(m < 10 ? ('0' + m) : m) + ':' +
				(s < 10 ? ('0' + s) : s));
		} else {
			this.controller.get('besttime').update('...');
		}

		if (!isNaN(spent) && spent > 0) {
			var s	= spent % 60;
			var m	= Math.floor((spent / 60)) % 60;
			var h	= Math.floor((spent / 60) / 60);
			this.controller.get('totaltime').update(
				(h < 10 ? ('0' + h) : h) + ':' +
				(m < 10 ? ('0' + m) : m) + ':' +
				(s < 10 ? ('0' + s) : s));
		} else {
			this.controller.get('totaltime').update('...');
		}

		this.controller.get('bank').up('.palm-row').style.display = 'none';
		if (this.stats.dollarValue) {
			var money = this.stats.dollarValue(gamecount, scoretotal);

			if (!isNaN(money)) {
				this.controller.get('bank').update('$' + money);
				this.controller.get('bank').up('.palm-row').style.display = 'block';
			}
		}

		wonitems.sort(function(a, b) {
			var r = a['num'] - b['num'];

			if (r == 0) {
				r = a['elapsed'] - b['elapsed'];
			}

			return(r);
		});

		lostitems.sort(function(a, b) {
			var r = a['num'] - b['num'];

			if (r == 0) {
				r = a['score'] - b['score'];
			}

			return(r);
		});


Mojo.log('won: ', Object.toJSON(wonitems));
Mojo.log('lost:', Object.toJSON(lostitems));

		this.wonmodel['items']	= wonitems;
		this.lostmodel['items']	= lostitems;

		this.controller.modelChanged(this.wonmodel);
		this.controller.modelChanged(this.lostmodel);
	}.bind(this));
};

StatsAssistant.prototype.deactivate	= function()
{
};

StatsAssistant.prototype.handleCommand = function(event)
{
	switch (event.type) {
		case Mojo.Event.command:
			Mojo.log('handleCommand: ', event.command);

			switch (event.command) {
				case 'reset':
					this.stats.reset(function() {
						this.update();
					}.bind(this));
					break;
			}
			break;
    }
};


