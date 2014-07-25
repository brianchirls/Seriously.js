/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously) {
	'use strict';

	Seriously.plugin('noise', {
		shader: function (inputs, shaderSource, utilities) {
			var frag = [
				'precision mediump float;',

				'#define Blend(base, blend, funcf)		vec3(funcf(base.r, blend.r), funcf(base.g, blend.g), funcf(base.b, blend.b))',
				'#define BlendOverlayf(base, blend) (base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend)))',
				'#define BlendOverlay(base, blend)		Blend(base, blend, BlendOverlayf)',
				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',

				'uniform vec2 resolution;',
				'uniform float amount;',
				'uniform float timer;',

				utilities.shader.noiseHelpers,
				utilities.shader.snoise3d,
				utilities.shader.random,

				'void main(void) {',
				'	vec4 pixel = texture2D(source, vTexCoord);',
				'	float r = random(vec2(timer * vTexCoord.xy));',
				'	float noise = snoise(vec3(vTexCoord * (1024.4 + r * 512.0), timer)) * 0.5;'
			];

			if (inputs.overlay) {
				frag.push('	vec3 overlay = BlendOverlay(pixel.rgb, vec3(noise));');
				frag.push('	pixel.rgb = mix(pixel.rgb, overlay, amount);');
			} else {
				frag.push('	pixel.rgb += noise * amount;');
			}
			frag.push('	gl_FragColor = pixel;}');

			shaderSource.fragment = frag.join('\n');
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			},
			overlay: {
				type: 'boolean',
				shaderDirty: true,
				defaultValue: true
			},
			amount: {
				type: 'number',
				uniform: 'amount',
				min: 0,
				max: 1,
				defaultValue: 1
			},
			timer: {
				type: 'number',
				uniform: 'timer',
				defaultValue: 0,
				step: 1
			}
		},
		title: 'Noise',
		description: 'Add noise'
	});
}));
