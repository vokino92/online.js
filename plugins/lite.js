(function () {
    'use strict';

	var update = false
	var events = JSON.parse(localStorage.getItem('events') || '[]');
	var append = [
		{online}
	]

	function merge(add){
		var find = false

		for (var i = 0; i < events.length; i++) {
			if(events[i].url == add.url) find = true
		}

		if(!find){
			update = true

			events.push(add)
		}
	}

	for (var i = 0; i < append.length; i++) {
		merge(append[i])
	}

	if(update){
		localStorage.setItem('events', JSON.stringify(events))
	}

})();