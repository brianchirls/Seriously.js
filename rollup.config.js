import progress from 'rollup-plugin-progress';
import filesize from 'rollup-plugin-filesize';

export default {
	entry: 'src/seriously.js',
	targets: [{
		dest: 'seriously.js',
		format: 'umd',
		moduleName: 'Seriously',
		amd: {
			id: 'seriously'
		}
	}],
	plugins: [
		progress({
			clearLine: false
		}),
		filesize()
	],
	banner: '/*jslint devel: true, bitwise: true, browser: true, white: true, nomen: true, plusplus: true, maxerr: 50, indent: 4, todo: true */\n' +
	'/*global Float32Array, Uint8Array, Uint16Array, WebGLTexture, HTMLInputElement, HTMLSelectElement, HTMLElement, WebGLFramebuffer, HTMLCanvasElement, WebGLRenderingContext, define, module, exports */'
};
