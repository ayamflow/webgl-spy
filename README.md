# WebGL Spy

A small utility to monitor WebGL2 drawcalls and other performance-related methods.
Like a pocket-sized SpectorJS for quick peek at your pipeline.

## Usage
`npm i webgl-spy`

```js
import WebglSpy from 'webgl-spy'

const spy = new WebglSpy(context)
// three.js: new WebglSpy(renderer.getContext())
// ogl: new WebglSpy(renderer.gl)
// babylon: new WebglSpy(engine._gl)

function render() {
    requestAnimationFrame(update)

    spy.startCapture()
    renderer.render(scene, camera)
    const calls = spy.endCapture()
}
```

`calls` is an array of `{ action, program?, type }` listing at minima the draw method name and the shader name, if available.
Other info can be
- clear bits (depth, stencil, color)
- draw indices count / vertices count
- framebufferIndice (attributed by this lib, for clarity)
```js
{action: 'bindFramebuffer ID - 0', type: 'bind'}
{action: 'clear: DEPTH, STENCIL, COLOR', type: 'clear'}
{action: 'drawElements: TRIANGLES, 60192 indices', program: 'TreeMaterial', type: 'draw'}
{action: 'bindFramebuffer', type: 'bind'}
{action: 'drawArrays: TRIANGLES, 0 indices, 3 vertices', program: 'Unnamed shader', type: 'draw'}
{action: 'clear: DEPTH', type: 'clear'}
```

### API
#### new WebglSpy(context)
Creates a new instance to monitor the given WebGL2RenderingContext.

#### startCapture()
Call before any drawing operation (setRenderTarget, clear, etc).

#### endCapture()
Call after everything has been rendered. Returns an array of calls. Can be filtered by `type` (draw, clear, bind).

#### destroy()
Restore the context by removing spies. Probably not needed.

## To do
This is a simple proof of concept and might not get developed further.
If it happens, some ideas:
- show framebuffer read/write
- add state calls (i.e. enable/disable scissor, stencil, cull_face, depth_test, viewport, clearColor, blitFrameBuffer...)
- add/show number of texture bounds?
- Typescript for encapsulation & types
- Unit tests

## Credits
[BabylonJS' great SpectorJS extension](https://github.com/BabylonJS/Spector.js) for a lot of the ideas, constants & spy pattern implementation.

[threejs](https://github.com/mrdoob/three.js) for the draw methods (WebGLIndexedBufferRenderer.js and WebGLBufferRenderer.js)

[spite](https://gist.github.com/spite/7ae92212b4f28076ba29) for getting everyone to implement the `#define SHADER_NAME` hint

[Active Theory](https://activetheory.net/)'s Hydra for the console.log idea

## Unlicense
