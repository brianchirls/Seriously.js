(function (window, undefined) {
"use strict";

var Seriously = window.Seriously = window.Seriously ||
	{ plugin: function (name, opt) { this[name] = opt; } };

var channelOptions = [
		'Red',
		'Green',
		'Blue',
		'Alpha'
	],
	channelLookup = {
		r: 0,
		g: 1,
		b: 2,
		a: 3,
		x: 0,
		y: 1,
		z: 2,
		w: 3
	};

function validateChannel(value, input, name) {
	var val;
	if (typeof value === 'string') {
		val = value.charAt(0).toLowerCase();
		val = channelLookup[val];
		if (val === undefined) {
			val = -1;
		}
		if (val < 0) {
			val = parseFloat(value);
		}
	} else {
		val = value;
	}
	
	if (val === 0 || val === 1 || val === 2 || val === 3) {
		return val;
	}

	return this.inputs[name];
}


Seriously.plugin('channels', (function () {
	var shaders = [],
		sources = [],
		matrices = [
			[],
			[],
			[],
			[]
		];

	return {
		shader: function(inputs, shaderSource, utilities) {
			var i, j,
				frag,
				shader,
				uniforms = '',
				samples = '',
				source,
				matrix;

			function validateSource(name, i) {
				var s, j;
				s = inputs[name];
				if (!s) {
					s = inputs[name] = inputs.source;
				}

				j = sources.indexOf(s);
				if (j < 0) {
					j = sources.length;
					sources.push(s);
				}
			}
			sources.splice(0, sources.length);

			validateSource('redSource');
			validateSource('greenSource');
			validateSource('blueSource');
			validateSource('alphaSource');

			for (i = 0; i < sources.length; i++) {
				source = sources[i];
				matrix = matrices[i];

				for (j = 0; j < 16; j++) {
					matrix[j] = 0;
				}

				matrix[inputs.red] = (inputs.redSource === source) ? 1 : 0;
				matrix[4 + inputs.green] = (inputs.greenSource === source) ? 1 : 0;
				matrix[8 + inputs.blue] = (inputs.blueSource === source) ? 1 : 0;
				matrix[12 + inputs.alpha] = (inputs.alphaSource === source) ? 1 : 0;
				this.uniforms['source' + i] = source;
				this.uniforms['channel' + i] = matrix;

			}


			if (shaders[sources.length]) {
				return shaders[sources.length];
			}

			for (i = 0; i < sources.length; i++) {
				uniforms += 'uniform sampler2D source' + i + ';\n' +
					'uniform mat4 channel' + i + ';\n';
				samples += 'gl_FragColor += texture2D(source' + i + ', vTexCoord) * channel' + i + ';\n';
			}

			frag = '#ifdef GL_ES\n\n' +
				'precision mediump float;\n\n' +
				'#endif\n\n' +
				'\n' +
				'varying vec2 vTexCoord;\n' +
				'varying vec4 vPosition;\n' +
				'\n' +
				uniforms +
				'\n' +
				'void main(void) {\n' +
				'	gl_FragColor = vec4(0.0);\n' +
				samples +
				'}\n';
			shader = new Seriously.util.ShaderProgram(this.gl,
				shaderSource.vertex,
				frag);

			shaders[sources.length] = shader;
			return shader;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				shaderDirty: true
			},
			redSource: {
				type: 'image',
				shaderDirty: true
			},
			greenSource: {
				type: 'image',
				shaderDirty: true
			},
			blueSource: {
				type: 'image',
				shaderDirty: true
			},
			alphaSource: {
				type: 'image',
				shaderDirty: true
			},
			red: {
				type: 'enum',
				options: channelOptions,
				validate: validateChannel,
				defaultValue: 0
			},
			green: {
				type: 'enum',
				options: channelOptions,
				validate: validateChannel,
				defaultValue: 1
			},
			blue: {
				type: 'enum',
				options: channelOptions,
				validate: validateChannel,
				defaultValue: 2
			},
			alpha: {
				type: 'enum',
				options: channelOptions,
				validate: validateChannel,
				defaultValue: 3
			}
		},
		title: 'Channel Mapping',
		description: ''
	};
}()) );

}(window));
