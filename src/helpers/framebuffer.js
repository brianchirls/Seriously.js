function FrameBuffer(gl, width, height, options) {
	let frameBuffer,
		renderBuffer,
		tex,
		status,
		useFloat = options === true ? options : (options && options.useFloat);

	useFloat = false;//useFloat && !!gl.getExtension('OES_texture_float'); //useFloat is not ready!
	if (useFloat) {
		this.type = gl.FLOAT;
	} else {
		this.type = gl.UNSIGNED_BYTE;
	}

	frameBuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

	if (options && options.texture) {
		this.texture = options.texture;
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		this.ownTexture = false;
	} else {
		this.texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		this.ownTexture = true;
	}

	try {
		if (this.type === gl.FLOAT) {
			tex = new Float32Array(width * height * 4);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, tex);
		} else {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
			this.type = gl.UNSIGNED_BYTE;
		}
	} catch (e) {
		// Null rejected
		this.type = gl.UNSIGNED_BYTE;
		tex = new Uint8Array(width * height * 4);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, tex);
	}

	renderBuffer = gl.createRenderbuffer();
	gl.bindRenderbuffer(gl.RENDERBUFFER, renderBuffer);
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderBuffer);

	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);

	status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);

	if (status === gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT) {
		throw new Error('Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_ATTACHMENT');
	}

	if (status === gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT) {
		throw new Error('Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT');
	}

	if (status === gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS) {
		throw new Error('Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_DIMENSIONS');
	}

	if (status === gl.FRAMEBUFFER_UNSUPPORTED) {
		throw new Error('Incomplete framebuffer: FRAMEBUFFER_UNSUPPORTED');
	}

	if (status !== gl.FRAMEBUFFER_COMPLETE) {
		throw new Error('Incomplete framebuffer: ' + status);
	}

	//clean up
	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);

	this.gl = gl;
	this.frameBuffer = frameBuffer;
	this.renderBuffer = renderBuffer;
	this.width = width;
	this.height = height;
}

FrameBuffer.prototype.resize = function (width, height) {
	const gl = this.gl;

	if (this.width === width && this.height === height) {
		return;
	}

	this.width = width;
	this.height = height;

	if (!gl) {
		return;
	}

	gl.bindTexture(gl.TEXTURE_2D, this.texture);
	gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
	gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderBuffer);

	//todo: handle float
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);

	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

FrameBuffer.prototype.destroy = function () {
	const gl = this.gl;

	if (gl) {
		gl.deleteFramebuffer(this.frameBuffer);
		gl.deleteRenderbuffer(this.renderBuffer);
		if (this.ownTexture) {
			gl.deleteTexture(this.texture);
		}
	}

	delete this.frameBuffer;
	delete this.renderBuffer;
	delete this.texture;
	delete this.gl;
};

export default FrameBuffer;
