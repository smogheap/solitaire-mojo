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

function Stats(name)
{
	this.name	= name + '_db';
	this.offset	= -1;

	var db = openDatabase('Statistics', '');

	if (db.version != '2.0') {
		db.changeVersion(db.version, '2.0', function(t) {
			/* Delete the tables from earlier versions of the beta */
			[
				'freecell',
				'freecell_relaxed',
				'freecell_bakers',
				'freecell_forecell',
				'freecell_challenge',
				'freecell_super_challenge',

				'klondike_draw_1',
				'klondike_draw_3',
				'klondike_thoughtful',

				'spider_4_suits',
				'spider_2_suits',
				'spider_1_suit',
				'spiderette_4_suits',
				'spiderette_2_suits',
				'spiderette_1_suit',

				'golf',
				'golf_relaxed',
				'golf_dead_king',

				'canfield',
				'acesup',
				'acesup_2_suits',
				'acesup_1_suit',
				'pyramid'
			].each(function(gameid) {
				t.executeSql('DROP TABLE ' + gameid, []);
			});
		}.bind(this));
	}
}

Stats.prototype.add = function(gamenum, moves, score, scoretext, time, callback, preventcreate)
{
	var db = openDatabase('Statistics', '');

	db.transaction(function(t) {
		/* Insert the values */
		t.executeSql('INSERT INTO ' + this.name + ' (game, moves, score, scoretext, time) VALUES (?, ?, ?, ?, ?)',
			[ gamenum, moves, score, scoretext, time ],

			function(t, result) {
				if (callback) callback(true);
			}.bind(this),

			function(t, err) {
				if (preventcreate) {
					Mojo.log('Failed to insert game stats:', err.message);
					if (callback) callback(false);
					return;
				}

				/*
					Assume that the table hasn't been created for this game yet,
					or that it happens to be an old one from the beta.
				*/
				t.executeSql('CREATE TABLE ' + this.name + ' (game REAL, moves REAL, score REAL, time REAL, scoretext TEXT)', [],
					function(t, result) {
						this.add(gamenum, moves, score, scoretext, time, callback, true);
					}.bind(this),

					function(t, err) {
						Mojo.log('Failed to create table:', err.message);
						if (callback) callback(false);
					}.bind(this)
				);
			}.bind(this)
		);
	}.bind(this));
};

Stats.prototype.query = function(query, values, callback)
{
	var db = openDatabase('Statistics', '');

	db.transaction(function(t) {
		t.executeSql(query, values,
			function(t, result) {
				if (result.rows.length) {
					callback(result.rows);
				} else {
					callback(null);
				}
			}.bind(this),

			function(t, err) {
				Mojo.log('Failed to read stats:',
					err.message);
				callback(null);
			}.bind(this)
		);
	}.bind(this));
};

/* Get the stats for a specific game number */
Stats.prototype.get = function(gamenum, callback)
{
	this.query('SELECT moves, score, scoretext, time FROM ' + this.name + ' WHERE game=? ' +
					'ORDER BY score ASC, moves ASC, time ASC LIMIT 1',
					[ gamenum ], callback);
};

Stats.prototype.reset = function(callback)
{
	var db = openDatabase('Statistics', '');

	db.transaction(function(t) {
		t.executeSql('DROP TABLE ' + this.name, [],
			function(t, result) {
				callback(true);
			}.bind(this),

			function(t, err) {
				Mojo.log('Failed to reset stats:', err.message);
				callback(false);
			}.bind(this)
		);
	}.bind(this));
};

