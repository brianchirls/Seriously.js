(function (window, undefined) {
"use strict";

window.Seriously = window.Seriously ||
	{ plugin: function (name, opt) { this[name] = opt; } };

Seriously.plugin('noise', function() {

	return {
		shader: function(inputs, shaderSource, utilities) {
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
				'uniform float timer;\n';

			if (inputs.mode === 'random') {
				frag += utilities.shader.makeNoise;
			} else {
				frag += utilities.shader.noiseHelpers + utilities.shader.snoise3d + utilities.shader.random;
			}

			frag += 'void main(void) {\n' +
				'	vec4 pixel = texture2D(source, vTexCoord);\n';

			if (inputs.mode === 'random') {
				frag += '	float noise = makeNoise(vTexCoord.x * 50.0, vTexCoord.y * 17.0, timer * 200.0) * 0.5;\n';
			} else {
				frag += '	float r = random(vec2(timer * vTexCoord.xy));\n' +
						'	float noise = snoise(vec3(vTexCoord * (1024.4 + r * 512.0), timer)) * 0.5;';
			}

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
			mode: {
					type: 'enum',
					shaderDirty: true,
					defaultValue: 'simplex',
					options: [
						['simplex', 'Simplex'],
						//['perlin', 'Perlin'],
						['random', 'Pseudo-random']
					]
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
}());

}(window));
