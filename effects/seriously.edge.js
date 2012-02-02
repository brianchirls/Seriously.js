(function (window, undefined) {
"use strict";

window.Seriously = window.Seriously ||
	{ plugin: function (name, opt) { this[name] = opt; } };

//	Adapted from http://rastergrid.com/blog/2011/01/frei-chen-edge-detector/

Seriously.plugin('edge', (function () {
	var sqrt = Math.sqrt,
		i, j,
		flatMatrices = [],
		matrices,
		freiChenMatrixConstants,
		sobelMatrixConstants;
	
	//initialize shader matrix arrays
	function multiplyArray(factor, a) {
		var i;
		for (i = 0; i < a.length; i++) {
			a[i] *= factor;
		}
		return a;
	}

	matrices =[
		multiplyArray(1.0/(2.0*sqrt(2.0)), [ 1.0, sqrt(2.0), 1.0, 0.0, 0.0, 0.0, -1.0, -sqrt(2.0), -1.0 ]),
		multiplyArray(1.0/(2.0*sqrt(2.0)), [1.0, 0.0, -1.0, sqrt(2.0), 0.0, -sqrt(2.0), 1.0, 0.0, -1.0] ),
		multiplyArray(1.0/(2.0*sqrt(2.0)), [0.0, -1.0, sqrt(2.0), 1.0, 0.0, -1.0, -sqrt(2.0), 1.0, 0.0] ),
		multiplyArray(1.0/(2.0*sqrt(2.0)), [sqrt(2.0), -1.0, 0.0, -1.0, 0.0, 1.0, 0.0, 1.0, -sqrt(2.0)] ),
		multiplyArray(1.0/2.0, [0.0, 1.0, 0.0, -1.0, 0.0, -1.0, 0.0, 1.0, 0.0] ),
		multiplyArray(1.0/2.0, [-1.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, -1.0] ),
		multiplyArray(1.0/6.0, [1.0, -2.0, 1.0, -2.0, 4.0, -2.0, 1.0, -2.0, 1.0] ),
		multiplyArray(1.0/6.0, [-2.0, 1.0, -2.0, 1.0, 4.0, 1.0, -2.0, 1.0, -2.0] ),
		multiplyArray(1.0/3.0, [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0] )
	];
	
	for (i = 0; i < matrices.length; i++) {
		for (j = 0; j < matrices[i].length; j++) {
			flatMatrices.push(matrices[i][j]);
		}
	}
	
	freiChenMatrixConstants = new Float32Array(flatMatrices);
	
	sobelMatrixConstants = new Float32Array([
		1.0, 2.0, 1.0, 0.0, 0.0, 0.0, -1.0, -2.0, -1.0,
		1.0, 0.0, -1.0, 2.0, 0.0, -2.0, 1.0, 0.0, -1.0
	]);

	return {
		shader: function(inputs, shaderSource, utilities) {
			var defines;
			
			if (inputs.mode === 'sobel') {
				defines = '#define N_MATRICES 2\n' +
				'#define SOBEL\n';
			} else {
				//frei-chen
				defines = '#define N_MATRICES 9\n';
			}
			
			shaderSource.fragment = defines +
				'#ifdef GL_ES\n' +
				'precision mediump float;\n' +
				'#endif\n' +
				'\n' +
				'varying vec2 vTexCoord;\n' +
				'varying vec4 vPosition;\n' +
				'\n' +
				'uniform sampler2D source;\n' +
				'uniform float pixelWidth;\n' +
				'uniform float pixelHeight;\n' +
				'uniform mat3 G[9];\n' +
				'\n' +
				'void main(void) {\n' +
				'	mat3 I;\n' +
				'	float dp3, cnv[9];\n' +
				'	vec3 tc;\n' +

				// fetch the 3x3 neighbourhood and use the RGB vector's length as intensity value
				'	float fi = 0.0, fj = 0.0;\n' +
				'	for (int i = 0; i < 3; i++) {\n' +
				'		fj = 0.0;\n' +
				'		for (int j = 0; j < 3; j++) {\n' +
				'			I[i][j] = length( ' +
							'texture2D(source, ' +
								'vTexCoord + vec2((fi - 1.0) * pixelWidth, (fj - 1.0) * pixelHeight)' +
							').rgb );\n' +
				'			fj += 1.0;\n' +
				'		};\n' +
				'		fi += 1.0;\n' +
				'	};\n' +

				// calculate the convolution values for all the masks

				'	for (int i = 0; i < N_MATRICES; i++) {\n' +
				'		dp3 = dot(G[i][0], I[0]) + dot(G[i][1], I[1]) + dot(G[i][2], I[2]);\n' +
				'		cnv[i] = dp3 * dp3;\n' +
				'	};\n' +
				'\n' +

				//Sobel
				'#ifdef SOBEL\n' +
				'	tc = vec3(0.5 * sqrt(cnv[0]*cnv[0]+cnv[1]*cnv[1]));\n' +
				'#else\n' +

				//Frei-Chen
				// Line detector
				'	float M = (cnv[4] + cnv[5]) + (cnv[6] + cnv[7]);\n' + 
				'	float S = (cnv[0] + cnv[1]) + (cnv[2] + cnv[3]) + (cnv[4] + cnv[5]) + (cnv[6] + cnv[7]) + cnv[8];\n' +
				'	tc = vec3(sqrt(M/S));\n' +
				'#endif\n' +

				'	gl_FragColor = vec4(tc, 1.0);\n' +
				'}\n';
			
			
			return shaderSource;
		},
		draw: function (shader, model, uniforms, frameBuffer, parent) {

			uniforms.pixelWidth = 1 / this.width;
			uniforms.pixelHeight = 1 / this.height;

			if (this.inputs.mode === 'sobel') {
				uniforms['G[0]'] = sobelMatrixConstants;
			} else {
				uniforms['G[0]'] = freiChenMatrixConstants;
			}

			parent(shader, model, uniforms, frameBuffer);
		},
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			},
			mode: {
				type: 'enum',
				shaderDirty: true,
				defaultValue: 'sobel',
				options: [
					['sobel', 'Sobel'],
					['frei-chen', 'Frei-Chen']
				]
			}
		},
		description: 'Edge Detect',
		title: 'Edge Detect'
	};
}()) );

}(window));
