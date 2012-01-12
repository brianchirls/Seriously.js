 (function (window) {

	var p, globalProperties = [];
	
	window.globalProperties = globalProperties;

	for (p in window) {
		globalProperties.push(p);
	}
	
}(window));
