/*
Copyright (c) 2016 Mike Almond - @mikedotalmond - https://github.com/mikedotalmond

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/**
* The shader takes a set of 1 pixel wide vertical slices from the source and 
* interpolates between them to generate the output. The positions of (up to) 
* 8 slices can be specified, along with noise and a y-position offset amount 
* to further distort the output.

* The effect it produces is a horizontally-smeared, low-detail version
* of the input.
* 
* It's based on the shader I made to generate the background scene for this project:
* http://mikedotalmond.co.uk/horizon/
* https://github.com/mikedotalmond/Horizon
* 
* There are two examples in /examples/slicer/ 
* 
* @author @mikedotalmond
*
*/

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
		
		if(typeof options !== 'object') {
			options = {};
		}
		
		var getSlicePositions = function(target){
				var u = options.effect.uniforms;
				for(var i=0; i < 4; i++){
					target[i] = u.slicesA[i];
					target[i + 4] = u.slicesB[i];
				}
			},
			setSlicePositions = function(positions){
				var u = options.effect.uniforms;
				for(var i=0;i < 4;i++){
					u.slicesA[i] = positions[i];
					u.slicesB[i] = positions[i + 4];
				}
			},
			reset = function(){
				var p = [];
				for(var i=0; i < 8; i++){ 
					p[i] = i/7;
				}
				setSlicePositions(p);
			},
			randomise = function(){
				var p=[];
				for(var i=0; i < 8; i++){ 
					p[i] = i/7 + Math.random() * 1/8;
				}
				setSlicePositions(p);
			};
			
		return {
			initialize: function (initialize, gl) {
				initialize();
				options.effect = this;
				options.reset = reset;
				options.randomise = randomise;	
				options.getSlicePositions = getSlicePositions;
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
				defaultValue: [0.0, 1/7, 2/7, 3/7]
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
