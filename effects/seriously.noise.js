(function (root, factory) {
	'use strict';

	if (typeof exports === 'object') {
		// Node/CommonJS
		factory(root.require('seriously'));
	} else if (typeof root.define === 'function' && root.define.amd) {
		// AMD. Register as an anonymous module.
		root.define(['seriously'], factory);
	} else {
		var Seriously = root.Seriously;
		if (!Seriously) {
			Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(Seriously);
	}
}(this, function (Seriously, undefined) {
	'use strict';

	Seriously.plugin('noise', (function () {

		return {
			shader: function (inputs, shaderSource, utilities) {
				var frag;
				frag = '#ifdef GL_ES\n\n' +
					'precision mediump float;\n\n' +
					'#endif\n\n' +
					'\n' +
					'#define Blend(base, blend, funcf)		vec3(funcf(base.r, blend.r), funcf(base.g, blend.g), funcf(base.b, blend.b))\n' +
					'#define BlendOverlayf(base, blend) (base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend)))\n' +
					'#define BlendOverlay(base, blend)		Blend(base, blend, BlendOverlayf)\n' +
					'varying vec2 vTexCoord;\n' +
					'varying vec4 vPosition;\n' +
					'\n' +
					'uniform sampler2D source;\n' +
					'\n' +
					'uniform vec3 srsSize;\n' +
					'uniform float amount;\n' +
					'uniform float timer;\n' +

					utilities.shader.noiseHelpers +
					utilities.shader.snoise3d +
					utilities.shader.random +

					'void main(void) {\n' +
					'	vec4 pixel = texture2D(source, vTexCoord);\n' +
					'	float r = random(vec2(timer * vTexCoord.xy));\n' +
					'	float noise = snoise(vec3(vTexCoord * (1024.4 + r * 512.0), timer)) * 0.5;';

				if (inputs.overlay) {
					frag += '	vec3 overlay = BlendOverlay(pixel.rgb, vec3(noise));\n' +
							'	pixel.rgb = mix(pixel.rgb, overlay, amount);\n';
				} else {
					frag += '	pixel.rgb += noise * amount;\n';
				}
				frag += '	gl_FragColor = pixel;\n}';

				shaderSource.fragment = frag;
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
		};
	}()));
}));
