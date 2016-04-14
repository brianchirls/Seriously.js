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
}(window, function (Seriously) {
	'use strict';

	Seriously.plugin('slicer',  function (options) {
		
		if(typeof options !== 'object') options = {};
		
		var u,
			slicePositions,
			updateSlices = function(){
				u.slicesA = slicePositions.slice(0,4);
				u.slicesB = slicePositions.slice(4);
			},
			reset = function(){
				slicePositions=[];
				for(var i=0; i<8; i++){ slicePositions[i] = i/7; }
				updateSlices();
			},
			randomise = function(){
				slicePositions=[];
				for(var i=0; i<8; i++){ slicePositions[i] = i/7 + Math.random()*1/8; }
				updateSlices();
			};
		
		return {
			initialize: function (initialize, gl) {
				initialize();
				u = this.uniforms;
				
				options.reset = reset;
				options.randomise = randomise;	
				
				slicePositions=[];
				for(var i=0; i<8; i++){ slicePositions.push(.0); }
			},
			resize: function () {
				this.uniforms.invHeight = 1.0 / this.height;
			},				
			commonShader: true,
			shader: function (inputs, shaderSource) {
				
				shaderSource.fragment = [
					
					'precision mediump float;',
					
					'const float noiseAmt = .04;', // just add a low level of noise. make configurable if you want...
					
					'varying vec2 vTexCoord;',
					
					'uniform sampler2D source;',
					
					'uniform vec4 slicesA;',
					'uniform vec4 slicesB;',
					
					'uniform float seed;', 
					'uniform float invHeight;',
					'uniform float ySpread;',
					
					'float rnd(vec2 x) {',
						'return fract(sin(dot(x.xy, vec2(12.9898, 78.233))) * 43758.5453);',
					'}',
					
					'void main() {',
					  
					  'float vx = vTexCoord.x;',
					  'float r = rnd(seed * vTexCoord);',
					  
					  // get y position, and add offsets to scale and position some Y noise
					  'float y = vTexCoord.y + (r-.5) * ySpread * invHeight;',
					  
					  'vec2 sliceACoord = vec2(0, y);',
					  'vec2 sliceBCoord = vec2(0, y);',
					  
					  'if(vx < slicesA[1]) {',
						'sliceACoord.x = slicesA[0];',
						'sliceBCoord.x = slicesA[1];',
					  '}',
					  'else if(vx < slicesA[2]) {',
						'sliceACoord.x = slicesA[1];',
						'sliceBCoord.x = slicesA[2];',
					  '}',
					  'else if(vx < slicesA[3]) {',
						'sliceACoord.x = slicesA[2];',
						'sliceBCoord.x = slicesA[3];',
					  '}',
					  'else if(vx < slicesB[0]) {',
						'sliceACoord.x = slicesA[3];',
						'sliceBCoord.x = slicesB[0];',
					  '}',
					  'else if(vx < slicesB[1]) {',
						'sliceACoord.x = slicesB[0];',
						'sliceBCoord.x = slicesB[1];',
					  '}',
					  'else if(vx < slicesB[2]) {',
						'sliceACoord.x = slicesB[1];',
						'sliceBCoord.x = slicesB[2];',
					  '}',
					  'else {',
						'sliceACoord.x = slicesB[2];',
						'sliceBCoord.x = slicesB[3];',
					  '}',
					  
					  'float f2 =  (vx - sliceACoord.x) / (sliceBCoord.x - sliceACoord.x);',
					 
					  // lerp between the two sampling positions
					  'vec4 c = mix(texture2D(source, sliceACoord), texture2D(source, sliceBCoord), f2);',
					  
					  // add noise (monochromatic)
					  'c += (r - 0.5) * noiseAmt;',
					  
					  // output
					  'gl_FragColor = c;',
					'}'
				].join('\n');
				return shaderSource;
			}
		};
	},
	{	// meta
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			},
			ySpread:{
				type:'number',
				uniform: 'ySpread',
				min: 0,
				max: 1024,
				defaultValue:1.5
			},
			slicesA: {
				type: 'vector',
				dimensions: 4,
				uniform: 'slicesA',
				defaultValue: [.0, 1/7, 2/7, 3/7]
			},
			slicesB: {
				type: 'vector',
				dimensions: 4,
				uniform: 'slicesB',
				defaultValue: [4/7, 5/7, 6/7, 1.0]
			},
			seed: {
				type: 'number',
				uniform: 'seed',
				min: 1,
				max: 1024,
				defaultValue: 1 + Math.random() * 1023
			}
		},
		title: 'Slicer',
		description: 'Slicer Effect'
	});
}));
