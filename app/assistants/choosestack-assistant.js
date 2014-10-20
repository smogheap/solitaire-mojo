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

function ChooseStackDialog(controller, src, dest, options, cards, callback)
{
	this.controller	= controller;
	this.src		= src;
	this.dest		= dest;
	this.options	= options;
	this.cards		= cards;
	this.callback	= callback;
}

ChooseStackDialog.prototype.setup = function(widget)
{
	var content	= this.controller.get('card-stacks');
	var size	= Element.getDimensions(content);

	this.widget	= widget;

	this.controller.get('title').update($L('Multiple Valid Moves'));
	this.controller.setupWidget('cancel', {
		'label':	$L('Cancel')
	}, {});
	this.controller.listen('cancel', Mojo.Event.tap, this.handleCancel.bind(this));

	/*
		this.options is an array of booleans that indicates which cards are
		valid as the top card of the play.  Display all of the cards spread out
		and dim any that are not true in this.options.
	*/
	for (var i = 0; i < this.cards.length; i++) {
		var div = document.createElement('div');

		div.id = 'CardStackOption' + i;
		div.setAttribute('x-mojo-element', 'CardStack');

		content.appendChild(div);

		if (this.options[i]) {
			div.count = this.cards.length - i;
		}

		this.controller.setupWidget(div.id, {
			'cards':	[ this.cards[i] ],
			'offset':	[ 0, 17 ],
			'maxLoose': 12,
			'tap':		function(stack)
			{
				if (!isNaN(stack.count)) {
					this.callback(stack.count);
					this.widget.mojo.close();
				}
			}.bind(this)
		}, {});

		div.style.position	= 'relative';
		div.style.left		= Math.floor((i + 0.5) * (size['width' ] / (this.cards.length + 1))) + 'px';
		div.style.top		= Math.floor((i + 0.5) * (size['height'] / (this.cards.length + 1))) + 'px';


		if (!this.options[i]) {
			div.addClassName('disabled');
		}
	}

	// content.style.height = ((this.cards.length * 20) + 50) + 'px';
};

ChooseStackDialog.prototype.cleanup = function()
{
	this.controller.stopListening('cancel', Mojo.Event.tap, this.handleCancel.bind(this));
};

ChooseStackDialog.prototype.handleCommand = function(event)
{
	event.stop();
	this.widget.mojo.close();
};

ChooseStackDialog.prototype.handleCancel = function() {
	this.widget.mojo.close();
};

