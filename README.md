# Seriously.js

Seriously.js is a real-time, node-based video compositor for the web.
Inspired by professional software such as After Effects and Nuke,
Seriously.js renders high-quality video effects, but allows them to be
dynamic and interactive.

## Getting Started

Full documentation is in progress at the [wiki](https://github.com/brianchirls/Seriously.js/wiki). Start with the
[Tutorial](https://github.com/brianchirls/Seriously.js/wiki/Tutorial) and
[FAQ](https://github.com/brianchirls/Seriously.js/wiki/Frequently-Asked-Questions).

## Features

- Optimized rendering path and GPU accelerated up to 60 frames per second
- Accept image input from varied sources: videos, images, canvases and arrays
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

Seriously.js requires a browser that supports [WebGL](http://en.wikipedia.org/wiki/Webgl). 
Development is targeted to and tested in Firefox (4.0+) and Google Chrome (9+). Safari
and Opera are [expected to support WebGL](http://caniuse.com/#search=webgl)
in the near future. There are no public plans for Internet Explorer to
support WebGL, though it may be available using the Chrome Frame plugin.

Even though a browser may support WebGL, the ability to run it depends
on the system's graphics card. Serioulsy.js is heavily optimized, so most
modern desktops and notebooks should be sufficient. Older systems may
run slower, especially when using high-resolution videos.

Mobile browser support for WebGL is limited. Mobile Firefox has some
support, but the Android Browser and Mobile Safari do not.

Seriously.js provides a method to detect browser support and offer
descriptive error messages wherever possible.

#### Cross-Origin Videos and Images

Due to security limitations of WebGL, Seriously.js can only process video
or images that are served from the same domain, unless they are served
with [CORS headers](http://hacks.mozilla.org/2011/11/using-cors-to-load-webgl-textures-from-cross-domain-images/). Firefox only [supports CORS for video](https://bugzilla.mozilla.org/show_bug.cgi?id=682299) in pre-release
versions, and videos served with CORS are rare. So for now, it is best
to host your own video files.

### Roadmap:

- API documentation and plugin developer guidelines
- More examples and tutorials
- 3D transforms (perspective) on any node
- Accept input from typed arrays and WebGL Textures
- Benchmarking utility to determine client capabilities
- Automatic resolution tuning to maintain minimum frame rate
- Handle lost WebGL context
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

Seriously.js is created and maintained by [Brian Chirls](http://chirls.com) with support from:

<a href="http://mozillapopcorn.org"><img src="http://seriouslyjs.org/images/mozilla.png" alt="Mozilla"/></a>
