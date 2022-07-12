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
}(window, function (Seriously) {
	'use strict';

	Seriously.plugin('distortion', {
			commonShader: true,
			shader: function (inputs, shaderSource) {
				shaderSource.vertex = [
					
					'precision highp float;',
					
					
					'attribute vec3 aVertexPosition;',
					
					'attribute vec2 aTextureCoord;',
					
					'varying vec3 vPosition;',
					'varying vec2 vTextureCoord;',
					
					'void main(void){',
						'vPosition = aVertexPosition;',
						'vTextureCoord = aTextureCoord;',
					
						'gl_Position = vec4(vPosition,1.0);',
					'}',
				].join('\n');
				shaderSource.fragment = [
					'precision highp float;',
				
					'uniform vec3 uLensS;',
					'uniform vec2 uLensF;',

					'uniform vec2 uFov;',

					'uniform sampler2D source;',

					'varying vec3 vPosition;',
					'varying vec2 vTextureCoord;',

					'vec2 GLCoord2TextureCoord(vec2 glCoord) {',
					'	return glCoord  * vec2(1.0, -1.0)/ 2.0 + vec2(0.5, 0.5);',
					'}',

					'void main(void){',
						'float scale = uLensS.z;',
						'vec3 vPos = vPosition;',
						'float Fx = uLensF.x;',
						'float Fy = uLensF.y;',
						'vec2 vMapping = vPos.xy;',
						'vMapping.x = vMapping.x + ((pow(vPos.y, 2.0)/scale)*vPos.x/scale)*-Fx;',
						'vMapping.y = vMapping.y + ((pow(vPos.x, 2.0)/scale)*vPos.y/scale)*-Fy;',
						'vMapping = vMapping * uLensS.xy;',
						'vMapping = GLCoord2TextureCoord(vMapping/scale);',
						'vec4 texture = texture2D(source, vec2(vMapping.x, 1.0 - abs(vMapping.y)));',
						'if(vMapping.x > 0.99 || vMapping.x < 0.01 || vMapping.y > 0.99 || vMapping.y < 0.01){',
						'	texture = vec4(0.0, 0.0, 0.0, 1.0);',
						'}',
						'gl_FragColor = texture;',
					'}'
				].join('\n');
				return shaderSource;
			},
			inPlace: true,
			inputs: {
				source: {
					type: 'image',
					uniform: 'source'					
				},
				uLensS: {
					type: 'vector',
					uniform: 'uLensS',
					dimensions: 3,
					defaultValue: [1.0, 1.0, 1.5]
				},
				uLensF: {
					type: 'vector',
					uniform: 'uLensF',
					dimensions: 2,
					defaultValue: [0.0, 0.0]
				}

				
			},
			title: 'distortion',
			description: ''	
	});
}));
