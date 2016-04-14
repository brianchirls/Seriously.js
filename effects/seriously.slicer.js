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
		
		var setSlicePositions = function(positions){
				var u = options.effect.uniforms;
				u.slicesA[0] = positions[0];
				u.slicesA[1] = positions[1];
				u.slicesA[2] = positions[2];
				u.slicesA[3] = positions[3];
				u.slicesB[0] = positions[4];
				u.slicesB[1] = positions[5];
				u.slicesB[2] = positions[6];
				u.slicesB[3] = positions[7];
			},
			reset = function(){
				var p = [];
				for(var i=0; i<8; i++){ p[i] = i/7; }
				setSlicePositions(p);
			},
			randomise = function(){
				var p=[];
				for(var i=0; i<8; i++){ p[i] = i/7 + Math.random()*1/8; }
				setSlicePositions(p);
			};
			
		return {
			initialize: function (initialize, gl) {
				initialize();
				options.effect = this;
				options.reset = reset;
				options.randomise = randomise;	
				options.setSlicePositions = setSlicePositions;
			},
			resize: function () {
				this.uniforms.invHeight = 1.0 / this.height;
			},
			commonShader: true,
			shader: function (inputs, shaderSource) {
				
				shaderSource.fragment = [
					
					'precision mediump float;',
					
					
					'varying vec2 vTexCoord;',
					
					'uniform sampler2D source;',
					
					'uniform vec4 slicesA;',
					'uniform vec4 slicesB;',
					
					'uniform float seed;', 
					'uniform float noiseAmt;', // = .04;',
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
	{	// metadata
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
			noiseAmount : {
				type: 'number',
				uniform: 'noiseAmt',
				min: 0,
				max: 1,
				defaultValue: 0.05
			},
			seed: {
				type: 'number',
				uniform: 'seed',
				min: 1,
				max: 1024,
				defaultValue: 1 + Math.random() * 1023
			}
		},
		inPlace: true,
		title: 'Slicer',
		description: 'Slicer Effect'
	});
}));
