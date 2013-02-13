(function (window, undefined) {
"use strict";

/*
todo: consider an alternative algorithm:
http://tllabs.io/asciistreetview/
http://sol.gfxile.net/textfx/index.html
*/
window.Seriously = window.Seriously ||
	{ plugin: function (name, opt) { this[name] = opt; } };

var letters = document.createElement('img');
letters.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAvAAAAAICAYAAACf+MsnAAAFY0lEQVR4Xu2Z644bOwyDN+//0NsOigEMQdRHyU6CFDnA+bHVWNaFojiTx8/Pz+/f/4/89/v7z9Xj8Tjib3XyTN9usFcMz8gt3h9zXf/O6nD/W1V7Vb9uXad+nHucZ9xenX7OqTHdSfmRXfmPsSn8xPMrllcfCkdVfHSe7Ned0/yp7jv2GPfqK+MCByc0zzvxKi5RPq8cuvE4+JrwpFM7N78K2yu+qb9kd3qV+ZjUx5n/+xnXP81ctW/UHQ5P3Gd360vxKf+n8dGpxXTeKu6h2ansFT6pvo5G2/FP99NsUf9d/xleInfetcj629m9cf9WOV5K+78R8ERGRLYO8VQiecd/1vwKEJV46JBJRzhRfXftVL/MTgM48UmL0l2OSmzs9kctAJfE4/1KkNFzbj8cjFHsJ/u460vhnPDfqddujJ27poLCWWBuHt0YKr/ki+yOKJnk5Z7pPLfLf4TZif+qvi7XuDWg+HbtNEe79ds9H7m1m2/3+YzLK5Hc9e/gYxdfNP+ZfdV9lT3usWn+9310/qiAdxa1O5gTEqVhoLudxVwVNPrvCqDp/ZX4d0Uk1Y7sbgyU4zooCk8nB3i9Y61V5wWpIjDlP+ZJsxPvmLxEOD2sntk5Pz1LBOb0L+sPfQGs6ksYpt7QAiHuUwtkgl+F3Qyf2YxTX53+Vdjfjc8VYIq7KT+abzof7ervZ8fX8d/Jyc3PmTcnRrrPEbyVTnD8T+Y38pH624mfNIr6muzO95S/sh1Gvog/XmW/a6N+scww43zgqLjcOX9cwFeESQK3Gpx32QggTlwk8Ei8OXfE4VMLeCLQiLBjfJM7VA069XefnZBGJz7Vr24dK3GwEoqLD7p/1+4IMWdRdxaMK9CmP4E62F7nm8S7s4B3BMCkBzQPVQ0IM06+2WLvzlDlI+NfF4d0ljiHuF/Zb/4m/4ojTgnA6f0qfiWA135P5l/NoFv/7txm+5ZyyOw0e1R/skd8ZKKwwnjXf9xLrkBV+2x3Pib9Vz3JOMaNL/KZ+oCkXhDUTLxEwLsC41OfI5DEYe9+mXfr0l2mJH5ISHTOUw2U8IjD5LyVUtxEmrvi4V5ejvijWNWicBbOyfsrYejkMMXmdIFEAZH19ASWnNyrPlBdKH+yU3y0gGjGKf4Mv51ft9zzKk83vul5qr9r7+CT9gHx2zvs0/yofpGX1AuC4svqhYJeJJydNZk/urcSxet91dfiUy94HX6oBHCHi5+F38svCeg1h+zZ6nyF5VUzVC8Q0X9LwE/IkMjmpJ3i27XvxuqQ0c4dp/JTfnb9T847AoNIW/nokIYrYKvnJvln/siPwtD0XAeTU+x0luEugWdLNeY4ecl260vxK8Efl3OnZi4uaZZIMBFeJ/hw6xrFvppvV1Q559d8MwwR50cskIBQ2KhE3y7/ZeddAUjxOr3diZ/8U3+I953z7uzR7Lj4rvjl9HxXvaHaOflSfSkf93y24xx94PpX89I5H2t9+fwK+KVzNOwdIeM+e905+ZqqRIj7pYHiU3FNFnBnkO+41EKige3cpX7GunwoARfjIwKrxNhEJFLfMrsbI+G/smfkojAa60vxPcNeCZCqhjSra6ydBaAWSFzaqnb01c4VEdVCWWPM7svstKDWuKrZpwUb7dVsOzPcxUeGdYdfdgV8Vr+Mv1R8Tn/iHcSNWR8jjjv9URzama9qbp0XlBP4y2Jw6u/E577AZTVz/BM/OfySzSjl79o73FRxaFdfuPG5/XE58PbXEvAT8UBn1HKuSIB8ThYwiZfJnd8z768Aib/3R/iN4J0VeMXcVwvynbl/735OBV6BKTfyT+e/T4/f7dP3uW8F3Aqs/PIHbWXeeeKjnSsAAAAASUVORK5CYII=";

Seriously.plugin('ascii', (function () {
	var baseShader,
		scaledBuffer,
		lettersTexture,
		gl,
		width,
		height,
		scaledWidth,
		scaledHeight,
		unif;
	return {
		initialize: function(parent) {
			function setLetters() {
				gl.bindTexture(gl.TEXTURE_2D, lettersTexture);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, letters);
				gl.bindTexture(gl.TEXTURE_2D, null);
			}

			var me = this;

			parent();
			this.texture = this.frameBuffer.texture;

			gl = this.gl;

			lettersTexture = gl.createTexture();
			if (letters.naturalWidth) {
				setLetters();
			} else {
				letters.addEventListener('load', function() {
					setLetters();
					me.setDirty();
				});
			}

			unif = {
				letters: lettersTexture
			};

			//when the output scales up, don't smooth it out
			gl.bindTexture(gl.TEXTURE_2D, this.texture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.bindTexture(gl.TEXTURE_2D, null);
		},
		shader: function(inputs, shaderSource, utilities) {
			baseShader = new Seriously.util.ShaderProgram(this.gl, shaderSource.vertex, shaderSource.fragment);
			
			shaderSource.fragment = '#ifdef GL_ES\n\n' +
				'precision mediump float;\n\n' +
				'#endif\n\n' +
				'\n' +
				'varying vec2 vTexCoord;\n' +
				'varying vec4 vPosition;\n' +
				'\n' +
				'uniform sampler2D source;\n' +
				'uniform sampler2D letters;\n' +
				'uniform vec2 dim;\n' +
				'\n' +
				'const vec3 lumcoeff = vec3(0.2125,0.7154,0.0721);\n' +
				'const vec2 fontSize = vec2(8.0, 8.0);\n' +
				'\n' +
				'vec4 lookup(float ascii) {\n' +
				'	vec2 pos = mod(vTexCoord * dim, fontSize) / vec2(752.0, fontSize.x) + vec2(ascii, 0.0);\n' +
				'	return texture2D(letters, pos);\n' +
				'}\n' +
				'\n' +
				'void main(void) {\n' +
				'	vec4 sample = texture2D(source, vTexCoord);\n' +
				'	float luma = dot(sample.rgb,lumcoeff);\n' +
				'	vec4 clamped = vec4(floor(sample.rgb * 8.0) / 8.0, sample.a);\n' +
				'	float char = floor(luma * 94.0) / 94.0;\n' +
				'	gl_FragColor = clamped * lookup(char);\n' + //
				'}\n';
			
			return shaderSource;
		},
		draw: function (shader, model, uniforms, frameBuffer, parent) {
			//set up scaledBuffer if (width or height have changed)
			if (height !== this.height || width !== this.width) {
				height = this.height;
				width = this.width;
				scaledWidth = Math.ceil(width / 8);
				scaledHeight = Math.ceil(height / 8);
				unif.dim = [width, height];

				scaledBuffer = new Seriously.util.FrameBuffer(gl, scaledWidth, scaledHeight);

				//so it stays blocky
				gl.bindTexture(gl.TEXTURE_2D, scaledBuffer.texture);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

			}

			parent(baseShader, model, uniforms, scaledBuffer.frameBuffer, false, {
				width: scaledWidth,
				height: scaledHeight,
				blend: false
			});

			unif.transform = uniforms.transform;
			unif.source = scaledBuffer.texture;

			parent(shader, model, unif, frameBuffer);
		},
		inPlace: false,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			}
		},
		description: 'Display image as ascii text in 8-bit color.',
		title: 'Ascii Text'
	};
}()) );

}(window));
