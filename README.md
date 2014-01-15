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
- Effect parameters accept multiple formats and can monitor HTML form inputs
- Basic 2D transforms (translate, rotate, scale, skew) on effect nodes
- Plugin architecture for adding new effects
- Read pixel array from any node
- Load with [AMD](http://requirejs.org/docs/whyamd.html#amd)/[RequireJS](http://www.requirejs.org/)

### Included Effects
- Ascii Text
- Bleach Bypass
- Blend
- Brightness/Contrast
- Channel Mapping
- Chroma Key
- Color Complements
- Color Generator
- [Color Cube](http://www.youtube.com/watch?v=rfQ8rKGTVlg&t=24m30s)
- [Daltonize](http://www.daltonize.org/p/about.html)
- Directional Blur
- Dither
- Edge Detect
- Emboss
- Exposure Adjust
- Fader
- False Color
- Film Grain
- Gaussian Blur
- Hex Tiles
- Highlights/Shadows
- Hue/Saturation Adjust
- Invert
- Kaleidoscope
- Linear Transfer
- Luma Key
- Night Vision
- Ripple
- Scanlines
- Sepia tone
- Simplex Noise
- Sketch
- Split
- Tone Adjust
- TV Glitch
- Vignette
- White Balance

### Requirements

#### WebGL

Seriously.js requires a browser that supports [WebGL](http://en.wikipedia.org/wiki/Webgl). 
Development is targeted to and tested in Firefox (4.0+) and Google Chrome (9+). Safari
and Opera are [expected to support WebGL](http://caniuse.com/#search=webgl)
in the near future. Internet Explorer supports WebGL but does not support video textures.

Even though a browser may support WebGL, the ability to run it depends
on the system's graphics card. Seriously.js is heavily optimized, so most
modern desktops and notebooks should be sufficient. Older systems may
run slower, especially when using high-resolution videos.

Mobile browser support for WebGL is limited. Mobile Firefox and Chrome have decent
support, but the Android Browser and Mobile Safari do not.

Seriously.js provides a method to detect browser support and offer
descriptive error messages wherever possible.

#### Cross-Origin Videos and Images

Due to security limitations of WebGL, Seriously.js can only process video
or images that are served from the same domain, unless they are served
with [CORS headers](http://hacks.mozilla.org/2011/11/using-cors-to-load-webgl-textures-from-cross-domain-images/).
Firefox 12 and up [support CORS for video](https://bugzilla.mozilla.org/show_bug.cgi?id=682299) but other browsers do not, and videos served with CORS are rare.
So for now, it is best to host your own video files.

### Roadmap:

- API documentation and plugin developer guidelines
- More examples and tutorials
- 3D transforms (perspective) on any node
- Accept input from WebGL Textures
- Benchmarking utility to determine client capabilities
- Automatic resolution tuning to maintain minimum frame rate
- Handle lost WebGL context
- Graphical interface

## Contributing

Bug fixes, new features, effects and examples are welcome and appreciated. Please follow the [Contributing Guidelines](https://github.com/brianchirls/Seriously.js/wiki/Contributing).

## License
Seriously.js is made available under the [MIT License](http://www.opensource.org/licenses/mit-license.php).

Individual plugins may be licensed differently. Check source code comments.

## Credits

Seriously.js is created and maintained by [Brian Chirls](http://chirls.com)