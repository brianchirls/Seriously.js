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


/*
* Daltonization algorithm from:
* Digital Video Colourmaps for Checking the Legibility of Displays by Dichromats
* http://vision.psychol.cam.ac.uk/jdmollon/papers/colourmaps.pdf
*
* JavaScript implementation:
* http://mudcu.be/labs/Color/Vision/Javascript/Color.Vision.Daltonize.js
*
* Copyright (c) 2013 David Lewis, British Broadcasting Corporation
* (http://www.bbc.co.uk)
*
* MIT Licence:
* Permission is hereby granted, free of charge, to any person obtaining
* a copy of this software and associated documentation files (the
* "Software"), to deal in the Software without restriction, including
* without limitation the rights to use, copy, modify, merge, publish,
* distribute, sublicense, and/or sell copies of the Software, and to
* permit persons to whom the Software is furnished to do so, subject to
* the following conditions:

* The above copyright notice and this permission notice shall be
* included in all copies or substantial portions of the Software.

* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
* EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
* MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
* NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
* LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
* OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
* WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
* 
	*/
	Seriously.plugin('daltonize', {
		shader: function(inputs, shaderSource, utilities) {
			//Vertex shader
			shaderSource.vertex =  '#ifdef GL_ES\n' +
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
				'void main(void) {\n' +
				'	gl_Position = transform * vec4(position, 1.0);\n' +
				'	vTexCoord = vec2(texCoord.s, texCoord.t);\n' +
				'}\n';
			//Fragment shader
			shaderSource.fragment = '#ifdef GL_ES\n\n' +
				'precision mediump float;\n\n' +
				'#endif\n\n' +
				'\n' +
				'varying vec2 vTexCoord;\n' +
				'varying vec4 vPosition;\n' +
				'\n' +
				'uniform sampler2D source;\n' +
				'uniform float cbtype;\n' +
				'\n' +
				'void main(void) {\n' +
				'	vec4 color = texture2D(source, vTexCoord);\n' +
				
				//No change, skip the rest
				'if (cbtype == 0.0) {\n' +
				'	gl_FragColor = color;\n' +
				'	return;\n' +
				'}\n' +
				
				// RGB to LMS matrix conversion
				'   vec3 LMS = vec3( ' +
				'		(17.8824 * color.r) + (43.5161 * color.g) + (4.11935 * color.b),' +
				'		(3.45565 * color.r) + (27.1554 * color.g) + (3.86714 * color.b),' +
				'		(0.0299566 * color.r) + (0.184309 * color.g) + (1.46709 * color.b)' +
				'	);\n' +
				
				'	vec3 lms = vec3(0.0,0.0,0.0);\n' +
				//Protanope
				'	if (cbtype < 0.33) {\n' +
				'	   lms = vec3(	' +
				'			(2.02344 * LMS.g) + (-2.52581 * LMS.b),' +
				'			LMS.g,' +
				'			LMS.b' +
				'		);\n' +
				'	}\n' +
				//Deuteranope
				'	if (cbtype > 0.33 && cbtype < 0.66) {\n' +
				'	   lms = vec3(	' +
				'			LMS.r,' +
				'			(0.494207 * LMS.r) + (1.24827 * LMS.b),' +
				'			LMS.b' +
				'		);\n' +
				'	}\n' +
				//Tritanope
				'	if (cbtype > 0.66) {\n' +
				'	   lms = vec3(	' +
				'			LMS.r,' +
				'			LMS.g,' +
				'			(-0.395913 * LMS.r) + (0.801109 * LMS.g)' +
				'		);\n' +
				'	}\n' +
				
				// LMS to RGB matrix operation
				'   vec3 RGB = vec3(	' +
				'		(0.0809444479 * lms.r) + (-0.130504409 * lms.g) + (0.116721066 * lms.b),' +
				'		(-0.0102485335 * lms.r) + (0.0540193266 * lms.g) + (-0.113614708 * lms.b),' +
				'		(-0.000365296938 * lms.r) + (-0.00412161469 * lms.g) + (0.693511405 * lms.b)' +
				'	);\n' +
				
				// Colour shift
				// values may go over 1.0 but will get automatically clamped on output	
				'	RGB.rgb = color.rgb - RGB.rgb;\n' +
				'	RGB.g = 0.7*RGB.r + RGB.g;\n' +
				'	RGB.b = 0.7*RGB.r + RGB.b;\n' +
				'	color.rgb = color.rgb + RGB.rgb;\n' +
				
				//Output
				'gl_FragColor = color;\n' +
				
				'}\n';
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			},
			Type: {
					type: 'enum',
					uniform: 'cbtype',
					defaultValue: '0.0',
					options: [
						['0.0', 'Off'],
						['0.2', 'Protanope'],
						['0.6', 'Deuteranope'],
						['0.8', 'Tritanope']
					]
			}
		
		},
		title: 'Daltonize',
		description: 'Add contrast to colours to assist CVD (colour-blind) users.'
	});
}));