import logger from '../logger';
import { getElement, getTestContext } from './dom';

const SOURCE_TAGS = ['img', 'canvas', 'video'],
	document = window.document;

function checkSource(source, incompatibility) {
	var element, canvas, ctx, texture;

	element = getElement(source, SOURCE_TAGS);
	if (!element) {
		return false;
	}

	canvas = document.createElement('canvas');
	if (!canvas) {
		logger.warn('Browser does not support canvas or Seriously.js');
		return false;
	}

	if (element.naturalWidth === 0 && element.tagName === 'IMG') {
		logger.warn('Image not loaded');
		return false;
	}

	if (element.readyState === 0 && element.videoWidth === 0 && element.tagName === 'VIDEO') {
		logger.warn('Video not loaded');
		return false;
	}

	ctx = getTestContext(incompatibility);
	if (ctx) {
		texture = ctx.createTexture();
		if (!texture) {
			logger.error('Test WebGL context has been lost');
		}

		ctx.bindTexture(ctx.TEXTURE_2D, texture);

		try {
			ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGBA, ctx.RGBA, ctx.UNSIGNED_BYTE, element);
		} catch (textureError) {
			if (textureError.code === window.DOMException.SECURITY_ERR) {
				logger.log('Unable to access cross-domain image');
			} else {
				logger.error('Error storing image to texture: ' + textureError.message);
			}
			ctx.deleteTexture(texture);
			return false;
		}
		ctx.deleteTexture(texture);
	} else {
		ctx = canvas.getContext('2d');
		try {
			ctx.drawImage(element, 0, 0);
			ctx.getImageData(0, 0, 1, 1);
		} catch (drawImageError) {
			if (drawImageError.code === window.DOMException.SECURITY_ERR) {
				logger.log('Unable to access cross-domain image');
			} else {
				logger.error('Error drawing image to canvas: ' + drawImageError.message);
			}
			return false;
		}
	}

	// This method will return a false positive for resources that aren't
	// actually images or haven't loaded yet

	return true;
}

function makeGlModel(shape, gl) {
	let vertex, index, texCoord;

	if (!gl) {
		return false;
	}

	vertex = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex);
	gl.bufferData(gl.ARRAY_BUFFER, shape.vertices, gl.STATIC_DRAW);
	vertex.size = 3;

	index = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, shape.indices, gl.STATIC_DRAW);

	texCoord = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, texCoord);
	gl.bufferData(gl.ARRAY_BUFFER, shape.coords, gl.STATIC_DRAW);
	texCoord.size = 2;

	return {
		vertex: vertex,
		index: index,
		texCoord: texCoord,
		length: shape.indices.length,
		mode: shape.mode || gl.TRIANGLES
	};
}

function buildRectangleModel(gl) {
	let shape = {
		vertices: new Float32Array([
			-1, -1, 0,
			1, -1, 0,
			1, 1, 0,
			-1, 1, 0
		]),
		indices: new Uint16Array([
			0, 1, 2,
			0, 2, 3	// Front face
		]),
		coords: new Float32Array([
			0, 0,
			1, 0,
			1, 1,
			0, 1
		])
	};

	return makeGlModel(shape, gl);
}

export {
	checkSource,
	makeGlModel,
	buildRectangleModel
};
