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

function LaunchGame(game, transition)
{
	var scroll = false;

	if (!game) {
		try {
			game = Preferences.get('gameselectionview', 'gamegrid');
		} catch (e) {
			game = 'gamegrid';
		}
		scroll = true;
	}

	/* Split the scene name from the game id */
	var scene			= game.split('_')[0];
	var appController	= Mojo.Controller.getAppController();
	var stageController	= null;
	var name;

	Mojo.log('Trying to open game:', game);

	/*
		Find the name of the game that was previously active in this stage (if
		there was one) and unset it.
	*/
	if ((stageController = appController.getActiveStageController())) {
		try {
			name = Preferences.get(stageController.window.name + '_game', null);
		} catch (e) {
			name = null;
		}

		if (name) {
			Preferences.set(name + '_stage', null);
		}
	}

	/* Is there already a stage for this game? */
	try {
		name = Preferences.get(game + '_stage', null);
	} catch (e) {
		name = null;
	}
	if (name && (stageController = appController.getStageController(name))) {
		Mojo.log('Activating existing stage:', name);
		/* The game was already open in another card */
		stageController.activate();
		return;
	}

	if ((stageController = appController.getActiveStageController())) {
		/* This is the name that was used to create the stage originally */
		name = stageController.window.name;
	} else {
		/* There is no stage, create one with a time based name */
		name = 's_' + (new Date()).getTime();
	}

	/* Make sure we can find this stage and game from other cards */
	Preferences.set(game + '_stage', name);
	Preferences.set(name + '_game', game);

	var options = {
		name:					scene,
		transition:				transition || Mojo.Transition.defaultTransition,
		disableSceneScroller:	!scroll
	};

	if (stageController) {
		/* Launch the scene for the game */
		Mojo.log('Starting game in existing stage:', name);

		stageController.swapScene(options, game);
	} else {
		Mojo.log('Creating a new stage:', name);

		appController.createStageWithCallback(name,
			function(stageController) {
				stageController.pushScene(options, game);
			}
		);
	}
}

function AppAssistant(controller)
{
}

AppAssistant.prototype.handleCommand = function(event)
{
};

AppAssistant.prototype.handleLaunch = function(params)
{
	var stage	= params['id'];

	if (MinegoApp.expired && MinegoApp.expired()) {
		stage = 'expired';
	} else if (!stage && MinegoApp.defaultStage) {
		stage = MinegoApp.defaultStage();
	}

	LaunchGame(stage);
};

