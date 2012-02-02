(function (window, undefined) {
"use strict";

window.Seriously = window.Seriously ||
	{ plugin: function (name, opt) { this[name] = opt; } };

Seriously.plugin('split', (function () {
	var baseShader;
	return {
		initialize: function(parent) {
			parent();
		},
		shader: function(inputs, shaderSource, utilities) {
			baseShader = new Seriously.util.ShaderProgram(this.gl, shaderSource.vertex, shaderSource.fragment);
			
			shaderSource.vertex = '#ifdef GL_ES\n' +
				'precision mediump float;\n' +
				'#endif \n' +
				'\n' +
				'attribute vec3 position;\n' +
				'attribute vec2 texCoord;\n' +
				'\n' +
				'uniform mat4 transform;\n' +
				'\n' +
				'varying vec2 vTexCoord;\n' +
				'varying vec4 vPosition;\n' +
				'\n' +
				'uniform float angle;\n' +
				'varying float c;\n' +
				'varying float s;\n' +
				'varying float t;\n' +
				'\n' +
				'void main(void) {\n' +
				'   c = cos(angle);\n' +
				'   s = sin(angle);\n' +
				'	t = abs(c + s);\n' +
				'\n' +
//				'	gl_Position = vec4(position, 1.0);\n' +
		'	gl_Position = transform * vec4(position, 1.0);\n' +
				'	vTexCoord = vec2(texCoord.s, texCoord.t);\n' +
				'}\n';
			shaderSource.fragment = '#ifdef GL_ES\n\n' +
				'precision mediump float;\n\n' +
				'#endif\n\n' +
				'\n' +
				'varying vec2 vTexCoord;\n' +
				'varying vec4 vPosition;\n' +
				'\n' +
				'varying float c;\n' +
				'varying float s;\n' +
				'varying float t;\n' +
				'\n' +
				'uniform sampler2D sourceA;\n' +
				'uniform sampler2D sourceB;\n' +
				'uniform float split;\n' +
				'uniform float angle;\n' +
				'uniform float fuzzy;\n' +
				'\n' +
				'void main(void) {\n' +
				'	vec4 pixel1 = texture2D(sourceA, vTexCoord);\n' +
				'	vec4 pixel2 = texture2D(sourceB, vTexCoord);\n' +
				'	gl_FragColor = mix(pixel2, pixel1, smoothstep((split - fuzzy * (1.0 - split)) * t, (split + fuzzy * split) * t, c * vTexCoord.x + s * vTexCoord.y));\n' +
				'}\n';
			
			return shaderSource;
		},
		draw: function (shader, model, uniforms, frameBuffer, parent) {
			if (uniforms.split >= 1) {
				uniforms.source = uniforms.sourceB;
				parent(baseShader, model, uniforms, frameBuffer);
				return;
			}
			
			if (uniforms.split <= 0) {
				uniforms.source = uniforms.sourceA;
				parent(baseShader, model, uniforms, frameBuffer);
				return;
			}

			parent(shader, model, uniforms, frameBuffer);
		},
		inPlace: false,
		requires: function (sourceName, inputs) {
			if (sourceName === 'sourceA' && inputs.split >= 1) {
				return false;
			}
	
			if (sourceName === 'sourceB' && inputs.split <= 0) {
				return false;
			}
			
			return true;
		},
		inputs: {
			sourceA: {
				type: 'image',
				uniform: 'sourceA',
				shaderDirty: false
			},
			sourceB: {
				type: 'image',
				uniform: 'sourceB',
				shaderDirty: false
			},
			split: {
				type: 'number',
				uniform: 'split',
				defaultValue: 0.5,
				min: 0,
				max: 1
			},
			angle: {
				type: 'number',
				uniform: 'angle',
				defaultValue: 0
			},
			fuzzy: {
				type: 'number',
				uniform: 'fuzzy',
				defaultValue: 0,
				min: 0,
				max: 1
			}
		},
		description: 'Split screen or wipe',
		title: 'Split'
	};
}()) );

}(window));
