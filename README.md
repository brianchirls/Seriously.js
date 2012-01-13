# Seriously.js

Seriously.js is a real-time, node-based video compositor for the web.
Inspired by professional software such as After Effects and Nuke,
Seriously.js renders high-quality video effects, but allows them to be
dynamic and interactive.

## Features

- Optimized rendering path and GPU accelerated up to 60 frames per second
- Accept input from varied sources: videos, images, canvases, arrays or WebGL Textures
- Output to multiple canvases
- Effect parameters accept multiple formats and can monitor HTML form inputs
- Basic 2D transforms (translate, rotate, scale, skew) on effect nodes
- Plugin architecture for adding new effects
- Read pixel array from any node

### Included Effects
- Bleach Bypass
- Blend
- Chroma Key
- Color generator
- [Color Cube](http://www.youtube.com/watch?v=rfQ8rKGTVlg&t=24m30s)
- Edge Detect
- Exposure Adjust
- Fader
- Hue/Saturation Adjust
- Invert
- Luma Key
- Night Vision
- Ripple
- Scanlines
- Sepia tone
- Split
- Tone Adjust
- Vignette

### Requirements

#### WebGL

Seriously.js requires a browser that supports WebGL. Development is
targeted to and tested in Firefox (4.0+) and Google Chrome (9+). Safari
and Opera are [expected to support WebGL](http://caniuse.com/#search=webgl)
in the near future. There are no public plans for Internet Explorer to
support WebGL, though it may be available using the Chrome Frame plugin.

Even though a browser may support WebGL, the ability to run it depends
on the system's graphics card. Serioulsy.js is heavily optimized, so most
modern desktops and notebooks should be sufficient. Older systems may
run slower, especially when using high-resolution videos.

Mobile browser support for WebGL is limited. Mobile Firefox has some
support, but the Android Browser and Mobile Safari do not.

Seriously.js will provide methods to detect support wherever possible.

#### Cross-Origin Videos and Images

Due to security limitations of WebGL, Seriously.js can only process video
or images that are served from the same domain, unless they are served
with [CORS headers](http://hacks.mozilla.org/2011/11/using-cors-to-load-webgl-textures-from-cross-domain-images/). Firefox only [supports CORS for video](https://bugzilla.mozilla.org/show_bug.cgi?id=682299) in pre-release
versions, and videos served with CORS are rare. So for now, it is best
to host your own video files.

### Roadmap:

- API documentation and plugin developer guidelines
- More examples
- 3D transforms (perspective) on any node
- Accept input from typed arrays
- Benchmarking utility to determine client capabilities
- Automatic resolution tuning to maintain minimum frame rate
- Debug mode
- Graphical interface
- Effects:
	- Perlin Noise
	- Clouds
	- Gaussian Blur
	- TV Glitch
	- Channel Mapping
	- Curves

## License
Seriously.js is made available under the [MIT License](http://www.opensource.org/licenses/mit-license.php).

Individual plugins may be licensed differently. Check source code comments.

## Credits

Seriously.js is created and maintained by [Brian Chirls](http://chirls.com) with support from

<a href="http://mozillapopcorn.org"><img src="data:image/png;base64,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" alt="mozilla" title="Mozilla"/></a>
