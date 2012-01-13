 (function (window) {

	var p, globalProperties = [],
		//this seems to make a Firebug-related bug go away
		console = window.console;
	
	window.globalProperties = globalProperties;

	for (p in window) {
		globalProperties.push(p);
	}
	
}(window));
