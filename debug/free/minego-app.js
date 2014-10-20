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

function MinegoApp() {
}

MinegoApp.allowGame = function(name, dealt)
{
	if (!name) return(true);

	var type	= name.split('_')[0];
	var count 	= 15;

	if (name == 'freecell' || name == 'freecell_relaxed') {
		return(undefined);
	}

	var dealcount = Preferences.get('dealcount_1', {});

	if (dealcount[type] == undefined) {
		dealcount[type] = count;
	} else if (isNaN(dealcount[type]) || dealcount[type] <= 0) {
		dealcount[type] = count = 0;
	} else {
		count = dealcount[type];

		if (dealt) {
			dealcount[type] = count - 1;
		}
	}

	Preferences.set('dealcount_1', dealcount);

	return(count);
};

MinegoApp.showWelcome = function(controller)
{
	if (MinegoApp.showedWelcome) {
		return;
	}

	MinegoApp.showedWelcome = true;

	controller.showAlertDialog({
		title:			$L('Welcome'),
		message:		$L('Demo Welcome Message'),
		choices:		[
			{ label: $L('Play Demo'),				value: 'try'				},
			{ label: $L('Buy full version'),		value: 'buy'				},
			{ label: $L('Return to FreeCell'),		value: 'freecell'			}
		],

		onChoose:		function(value)
		{
			if (!value || value == 'try') {
				return;
			}

			if (value == 'buy') {
				new Mojo.Service.Request('palm://com.palm.applicationManager', {
					method: "open",
					parameters: {
						target: 'http://developer.palm.com/appredirect/?packageid=net.minego.solitaire'
					}
				});
				reeturn;
			}

			/* Split the scene name from the game id. */
			var scene	= value.split('_')[0];

			if (scene == 'howto') {
				controller.stageController.pushScene(scene, value);
			} else {
				LaunchGame(value);
			}
		}
	});
};

MinegoApp.defaultStage = function()
{
	return('freecell');
};
