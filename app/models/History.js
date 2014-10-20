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

function History(name) {
	this.name	= name;
	this.offset	= -1;
	this.db		= openDatabase('History', '1.0', 'History', 2000);
}

/* Remove the current state from history, and return the previous state */
History.prototype.pop = function(callback)
{
Mojo.log('History.pop');
	if (this.offset <= 0) {
		this.offset = 0;
		this.get(callback);
	}

	this.db.transaction(function(t) {
		// DROP anything with an offset >= the current one
		t.executeSql('DELETE FROM ' + this.name + ' WHERE offset >= ?', [ this.offset ],
			function(t, result) {
				this.get(callback);
			}.bind(this),
			function(t, err) {
				Mojo.log('Failed to undo:', err.message);

				callback(null);
			}.bind(this));
	}.bind(this));
};

/* Return the current state */
History.prototype.get = function(callback)
{
Mojo.log('History.get');
	this.db.transaction(function(t) {
		t.executeSql('SELECT history, offset FROM ' + this.name + ' ORDER BY offset DESC LIMIT 1', [],
			function(t, result) {
				if (result.rows.length) {
					var row = result.rows.item(0);

					this.offset		= row['offset'];
					this.current	= row['history'];

					if (callback) callback(this.current.evalJSON());
				} else {
					if (callback) callback(null);
				}
			}.bind(this),
			function(t, err) {
				Mojo.log('Failed to load history:', err.message);

				t.executeSql('CREATE TABLE ' + this.name + ' (history TEXT, offset REAL)', [], function(result) {});

				if (callback) callback(null);
			}.bind(this));
	}.bind(this));
};

/* Add a state */
History.prototype.add = function(state, callback, clear, force)
{
Mojo.log('History.add');
	var json	= null;

	if (state) {
		json = Object.toJSON(state);
	}

	if (!clear) {
		if (!force && this.current && this.current == json) {
			/* This matches the previous value, so don't bother adding it */
			if (callback) callback(state);
		}

		this.offset++;
	} else {
		this.offset = 0;
	}

	if (isNaN(this.offset)) {
		Mojo.log('Refusing to save an invalid state:', this.offset);
		return;
	}

	this.db.transaction(function(t) {
		t.executeSql('DELETE FROM ' + this.name + ' WHERE offset >= ?', [ this.offset ],
			function(t, result) {
				if (!state) {
					if (callback) callback(null);
					return;
				}

				t.executeSql('INSERT INTO ' + this.name + ' (history, offset) VALUES (?, ?)',
					[ json, this.offset ],
					function() {
						if (callback) callback(state);
					}.bind(this),
					function(t, err) {
						Mojo.log('Failed to save state:', err.message);
						if (callback) callback(null);
					}.bind(this));
			}.bind(this));
	}.bind(this));
};

/* Remove all states except the first, and pass that first state to the callback */
History.prototype.restart = function(callback)
{
Mojo.log('History.restart');
	this.db.transaction(function(t) {
		t.executeSql('DELETE FROM ' + this.name + ' WHERE offset >= 1', [ ],
			function(t, result) {
				this.get(callback);
			}.bind(this),
			function(t, err) {
				Mojo.log('Failed to restart game:', err.message);
				if (callback) callback(null);
			}.bind(this));
	}.bind(this));
};

/* Remove all states */
History.prototype.reset = function(callback)
{
Mojo.log('History.reset');
	this.db.transaction(function(t) {
		t.executeSql('DELETE FROM ' + this.name, [ ],
			function(t, result) {
				if (callback) callback(true);
			}.bind(this),
			function(t, err) {
				Mojo.log('Failed to reset game:', err.message);
				if (callback) callback(false);
			}.bind(this));
	}.bind(this));
};

