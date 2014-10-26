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
- Accept image input from varied sources: video, image, canvas, array, webcam, Three.js
- Effect parameters accept multiple formats and can monitor HTML form inputs
- Basic 2D transforms (translate, rotate, scale, skew) on effect nodes
- Plugin architecture for adding new effects, sources and targets
- Read pixel array from any node
- Load with [AMD](http://requirejs.org/docs/whyamd.html#amd)/[RequireJS](http://www.requirejs.org/)

### Included Effects
- Accumulator
- Ascii Text
- Bleach Bypass
- Blend
- Brightness/Contrast
- Channel Mapping
- Checkerboard Generator
- Chroma Key
- Color Complements
- Color Generator
- [Color Cube](http://www.youtube.com/watch?v=rfQ8rKGTVlg&t=24m30s)
- Color Select
- Crop
- [Daltonize](http://www.daltonize.org/p/about.html)
- Directional Blur
- Displacement Map
- Dither
- Edge Detect
- Emboss
- Exposure Adjust
- Expressions
- Fader
- False Color
- Fast Approximate Anti-Aliasing
- Film Grain
- Freeze Frame
- Gaussian Blur
- Hex Tiles
- Highlights/Shadows
- Hue/Saturation Adjust
- Invert
- Kaleidoscope
- Layers
- Linear Transfer
- Luma Key
- Mirror
- Night Vision
- Panorama
- Pixelate
- Polar Coordinates
- Ripple
- Scanlines
- Sepia tone
- Simplex Noise
- Sketch
- Split
- Throttle Frame Rate
- Tone Adjust
- TV Glitch
- Vibrance
- Vignette
- White Balance

### Requirements

#### WebGL

Seriously.js requires a browser that supports [WebGL](http://en.wikipedia.org/wiki/Webgl). 
Development is targeted to and tested in Firefox (4.0+), Google Chrome (9+), Internet Explorer (11+) and Opera (18+). Safari is [expected to support WebGL](http://caniuse.com/#search=webgl)
in the near future.

Even though a browser may support WebGL, the ability to run it depends
on the system's graphics card. Seriously.js is heavily optimized, so most
modern desktops and notebooks should be sufficient. Older systems may
run slower, especially when using high-resolution videos.

Mobile browser support for WebGL has improved. Mobile Firefox, Chrome and Safari have decent
support, but they can be slower than desktop versions due to limited system resources.

Seriously.js provides a method to detect browser support and offer
descriptive error messages wherever possible.

#### Cross-Origin Videos and Images

Due to security limitations of WebGL, Seriously.js can only process video
or images that are served from the same domain, unless they are served
with [CORS headers](http://hacks.mozilla.org/2011/11/using-cors-to-load-webgl-textures-from-cross-domain-images/).
Firefox, Chrome and Opera support CORS for video, but Safari and Internet Explorer do not, and videos served with CORS are rare. So for now, it is best to host your own video files.

## Contributing

Bug fixes, new features, effects and examples are welcome and appreciated. Please follow the [Contributing Guidelines](https://github.com/brianchirls/Seriously.js/wiki/Contributing).

## License
Seriously.js is made available under the [MIT License](http://www.opensource.org/licenses/mit-license.php).

Individual plugins may be licensed differently. Check source code comments.

## Credits

Seriously.js is created and maintained by [Brian Chirls](http://chirls.com)