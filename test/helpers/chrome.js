/** Event Handler **/
function eventHandler() { }

eventHandler.prototype.addListener = function() { };


/** Local Storage **/

function localStorage() { }

localStorage.prototype.get = function() {
	return "value";
}

/** Runtime **/

function runtime() { 
	this.onMessage = new eventHandler();
	this.onInstalled = new eventHandler();
	this.onStartup = new eventHandler();
}

runtime.prototype.getURL = function(base) {
	return "chrome://abcdefg/"+base;
};

/** Extension **/

function extension() { };

extension.prototype.getURL = function(base) {
	return "chrome://abcdefg/"+base;
};

extension.prototype.getBackgroundPage = function() {
	return global;
};

global.chrome = {
	storage: {
		local: new localStorage()
	},
	runtime: new runtime(),
	extension: new extension()
}