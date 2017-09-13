import Seriously from '../seriously';

Seriously.plugin('throttle', function () {
	let lastDrawTime = 0;
	return {
		draw: function (shader, model, uniforms, frameBuffer, draw) {
			if (this.inputs.frameRate && Date.now() - lastDrawTime >= 1000 / this.inputs.frameRate) {
				draw(shader, model, uniforms, frameBuffer);
				lastDrawTime = Date.now();
			}
		},
		requires: function (sourceName, inputs) {
			if (inputs.frameRate && Date.now() - lastDrawTime >= 1000 / inputs.frameRate) {
				return true;
			}

			return false;
		}
	};
}, {
	inPlace: true,
	commonShader: true,
	title: 'Throttle',
	description: 'Throttle frame rate',
	inputs: {
		source: {
			type: 'image',
			uniform: 'source'
		},
		frameRate: {
			type: 'number',
			uniform: 'opacity',
			defaultValue: 15,
			min: 0
		}
	}
});
