(function (window, undefined) {
"use strict";

window.Seriously = window.Seriously ||
	{ plugin: function (name, opt) { this[name] = opt; } };

//based on tutorial: http://www.geeks3d.com/20091009/shader-library-night-vision-post-processing-filter-glsl/
//todo: make noise better?

Seriously.plugin('nightvision', {
	shader: function(inputs, shaderSource, utilities) {
		shaderSource.fragment = '#ifdef GL_ES\n\n' +
				'precision mediump float;\n\n' +
				'#endif\n\n' +
				'\n' +
				'varying vec2 vTexCoord;\n' +
				'varying vec4 vPosition;\n' +
				'\n' +
				'uniform sampler2D source;\n' +
				'uniform float timer;\n' +
				'uniform float luminanceThreshold;\n' +
				'uniform float amplification;\n' +
				'uniform vec3 nightVisionColor;\n' +
				'\n' +
				utilities.shader.makeNoise +
				'\n' +
				'void main(void) {\n' +
				'	vec3 noise = vec3(' + 
						'makeNoise(vTexCoord.x, vTexCoord.y, timer), ' +
						'makeNoise(vTexCoord.x, vTexCoord.y, timer * 200.0 + 1.0), ' +
						'makeNoise(vTexCoord.x, vTexCoord.y, timer * 100.0 + 3.0)' +
					');\n' +
				'	vec4 pixel = texture2D(source, vTexCoord + noise.xy * 0.0025);\n' +
				'	float luminance = dot(vec3(0.299, 0.587, 0.114), pixel.rgb);\n' +
				'	pixel.rgb *= step(luminanceThreshold, luminance) * amplification;\n' +
				'	gl_FragColor = vec4( (pixel.rgb + noise * 0.1) * nightVisionColor, pixel.a);\n' +
				'}\n';
		return shaderSource;
	},
	inputs: {
		source: {
			type: 'image',
			uniform: 'source',
			shaderDirty: false
		},
		timer: {
			type: 'number',
			uniform: 'timer',
			defaultValue: 0
		},
		luminanceThreshold: {
			type: 'number',
			uniform: 'luminanceThreshold',
			defaultValue: 0.2,
			min: 0,
			max: 1
		},
		amplification: {
			type: 'number',
			uniform: 'amplification',
			defaultValue: 3,
			min: 0
		},
		color: {
			type: 'color',
			uniform: 'nightVisionColor',
			defaultValue: [0.1, 0.95, 0.2]
		}
	},
	title: 'Night Vision',
	description: ''
});

}(window));
