(window.webpackJsonp=window.webpackJsonp||[]).push([[29],{231:function(t,e,n){"use strict";n.r(e);var a=n(6),s=Object(a.a)({},(function(){var t=this,e=t.$createElement,n=t._self._c||e;return n("ContentSlotsDistributor",{attrs:{"slot-key":t.$parent.slotKey}},[n("h1",{attrs:{id:"mandelbrot-example"}},[n("a",{staticClass:"header-anchor",attrs:{href:"#mandelbrot-example"}},[t._v("#")]),t._v(" Mandelbrot example")]),t._v(" "),n("p",[t._v("Renders the "),n("a",{attrs:{href:"https://en.wikipedia.org/wiki/Mandelbrot_set",target:"_blank",rel:"noopener noreferrer"}},[t._v("Mandelbrot set"),n("OutboundLink")],1),t._v(" to a canvas using 2048 discrete color values computed on the JS side.")]),t._v(" "),n("h2",{attrs:{id:"contents"}},[n("a",{staticClass:"header-anchor",attrs:{href:"#contents"}},[t._v("#")]),t._v(" Contents")]),t._v(" "),n("ul",[n("li",[t._v("Exporting functions from a WebAssembly module.")]),t._v(" "),n("li",[t._v("Calling functions exported from WebAssembly.")]),t._v(" "),n("li",[t._v("Instantiating the module's memory in JavaScript and import it using "),n("code",[t._v("--importMemory")]),t._v(".")]),t._v(" "),n("li",[t._v("Utilizing JavaScript's "),n("code",[t._v("Math")]),t._v(" instead of native libm to reduce module size via "),n("code",[t._v("--use Math=JSMath")]),t._v(".")]),t._v(" "),n("li",[t._v("And finally: Reading and translating data from WebAssembly memory to colors rendered to a canvas.")])]),t._v(" "),n("h2",{attrs:{id:"example"}},[n("a",{staticClass:"header-anchor",attrs:{href:"#example"}},[t._v("#")]),t._v(" Example")]),t._v(" "),n("div",{staticClass:"language-editor extra-class"},[n("pre",{pre:!0,attrs:{class:"language-text"}},[n("code",[t._v('#!optimize=speed&runtime=stub&importMemory&use=Math=JSMath\n/** Number of discrete color values on the JS side. */\nconst NUM_COLORS = 2048;\n\n/** Updates the rectangle `width` x `height`. */\nexport function update(width: u32, height: u32, limit: u32): void {\n  var translateX = width  * (1.0 / 1.6);\n  var translateY = height * (1.0 / 2.0);\n  var scale      = 10.0 / min(3 * width, 4 * height);\n  var realOffset = translateX * scale;\n  var invLimit   = 1.0 / limit;\n\n  var minIterations = min(8, limit);\n\n  for (let y: u32 = 0; y < height; ++y) {\n    let imaginary = (y - translateY) * scale;\n    let yOffset   = (y * width) << 1;\n\n    for (let x: u32 = 0; x < width; ++x) {\n      let real = x * scale - realOffset;\n\n      // Iterate until either the escape radius or iteration limit is exceeded\n      let ix = 0.0, iy = 0.0, ixSq: f64, iySq: f64;\n      let iteration: u32 = 0;\n      while ((ixSq = ix * ix) + (iySq = iy * iy) <= 4.0) {\n        iy = 2.0 * ix * iy + imaginary;\n        ix = ixSq - iySq + real;\n        if (iteration >= limit) break;\n        ++iteration;\n      }\n\n      // Do a few extra iterations for quick escapes to reduce error margin\n      while (iteration < minIterations) {\n        let ixNew = ix * ix - iy * iy + real;\n        iy = 2.0 * ix * iy + imaginary;\n        ix = ixNew;\n        ++iteration;\n      }\n\n      // Iteration count is a discrete value in the range [0, limit] here, but we\'d like it to be\n      // normalized in the range [0, 2047] so it maps to the gradient computed in JS.\n      // see also: http://linas.org/art-gallery/escape/escape.html\n      let colorIndex = NUM_COLORS - 1;\n      let distanceSq = ix * ix + iy * iy;\n      if (distanceSq > 1.0) {\n        let fraction = Math.log2(0.5 * Math.log(distanceSq));\n        colorIndex = <u32>((NUM_COLORS - 1) * clamp<f64>((iteration + 1 - fraction) * invLimit, 0.0, 1.0));\n      }\n      store<u16>(yOffset + (x << 1), colorIndex);\n    }\n  }\n}\n\n/** Clamps a value between the given minimum and maximum. */\nfunction clamp<T>(value: T, minValue: T, maxValue: T): T {\n  return min(max(value, minValue), maxValue);\n}\n\n#!html\n<canvas id="canvas" style="width: 100%; height: 100%"></canvas>\n<script type="module">\n\n// Set up the canvas with a 2D rendering context\nconst canvas = document.getElementById("canvas");\nconst boundingRect = canvas.getBoundingClientRect();\nconst ctx = canvas.getContext("2d");\n\n// Compute the size of the viewport\nconst ratio  = window.devicePixelRatio || 1;\nconst width  = (boundingRect.width  | 0) * ratio;\nconst height = (boundingRect.height | 0) * ratio;\nconst size = width * height;\nconst byteSize = size << 1; // discrete color indices in range [0, 2047] (2 bytes per pixel)\n\ncanvas.width  = width;\ncanvas.height = height;\n\nctx.scale(ratio, ratio);\n\n// Compute the size (in pages) of and instantiate the module\'s memory.\n// Pages are 64kb. Rounds up using mask 0xffff before shifting to pages.\nconst memory = new WebAssembly.Memory({ initial: ((byteSize + 0xffff) & ~0xffff) >>> 16 });\nconst buffer = new Uint16Array(memory.buffer);\nconst imageData = ctx.createImageData(width, height);\nconst argb = new Uint32Array(imageData.data.buffer);\nconst colors = computeColors();\n\nconst exports = await instantiate(await compile(), {\n  env: {\n    memory\n  }\n})\n\n// Update state\nexports.update(width, height, 40);\n\n// Translate 16-bit color indices to colors\nfor (let y = 0; y < height; ++y) {\n  const yx = y * width;\n  for (let x = 0; x < width; ++x) {\n    argb[yx + x] = colors[buffer[yx + x]];\n  }\n}\n\n// Render the image buffer.\nctx.putImageData(imageData, 0, 0);\n\n/** Computes a nice set of colors using a gradient. */\nfunction computeColors() {\n  const canvas = document.createElement("canvas");\n  canvas.width = 2048;\n  canvas.height = 1;\n  const ctx = canvas.getContext("2d");\n  const grd = ctx.createLinearGradient(0, 0, 2048, 0);\n  grd.addColorStop(0.00, "#000764");\n  grd.addColorStop(0.16, "#2068CB");\n  grd.addColorStop(0.42, "#EDFFFF");\n  grd.addColorStop(0.6425, "#FFAA00");\n  grd.addColorStop(0.8575, "#000200");\n  ctx.fillStyle = grd;\n  ctx.fillRect(0, 0, 2048, 1);\n  return new Uint32Array(ctx.getImageData(0, 0, 2048, 1).data.buffer);\n}\n<\/script>\n')])])]),n("div",{staticClass:"custom-block tip"},[n("p",{staticClass:"custom-block-title"},[t._v("NOTE")]),t._v(" "),n("p",[t._v("The example makes a couple assumptions. For instance, using the entire memory of the program as the image buffer as in this example is only possible because we know that no interferring static memory segments will be created, which is achieved by")]),t._v(" "),n("ul",[n("li",[t._v("using JavaScript's Math instead of native libm (usually adds lookup tables),")]),t._v(" "),n("li",[t._v("not using a more sophisticated runtime (typically adds bookkeeping) and")]),t._v(" "),n("li",[t._v("the rest of the example being relatively simple (i.e. no strings or similar).")])]),t._v(" "),n("p",[t._v("As soon as these conditions are no longer met, one would instead either reserve some space by specifying a suitable "),n("code",[t._v("--memoryBase")]),t._v(" or export a dynamically instantiated chunk of memory, like an "),n("code",[t._v("Uint16Array")]),t._v(", and utilize it as the color index buffer both in WebAssembly and in JavaScript.")])]),t._v(" "),n("h2",{attrs:{id:"running-locally"}},[n("a",{staticClass:"header-anchor",attrs:{href:"#running-locally"}},[t._v("#")]),t._v(" Running locally")]),t._v(" "),n("p",[t._v("Set up a new AssemblyScript project as described in "),n("RouterLink",{attrs:{to:"/getting-started.html"}},[t._v("Getting started")]),t._v(" and copy "),n("code",[t._v("module.ts")]),t._v(" to "),n("code",[t._v("assembly/index.ts")]),t._v(" and "),n("code",[t._v("index.html")]),t._v(" to the project's top-level directory. Edit the build commands in "),n("code",[t._v("package.json")]),t._v(" to include")],1),t._v(" "),n("div",{staticClass:"language- extra-class"},[n("pre",{pre:!0,attrs:{class:"language-text"}},[n("code",[t._v("--runtime stub --use Math=JSMath --importMemory\n")])])]),n("p",[t._v("The example can now be compiled with")]),t._v(" "),n("div",{staticClass:"language-sh extra-class"},[n("pre",{pre:!0,attrs:{class:"language-sh"}},[n("code",[n("span",{pre:!0,attrs:{class:"token function"}},[t._v("npm")]),t._v(" run asbuild\n")])])]),n("p",[t._v("To view the example, one can modify the instantiation in "),n("code",[t._v("index.html")]),t._v(" from")]),t._v(" "),n("div",{staticClass:"language-js extra-class"},[n("pre",{pre:!0,attrs:{class:"language-js"}},[n("code",[t._v("loader"),n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),n("span",{pre:!0,attrs:{class:"token function"}},[t._v("instantiate")]),n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),t._v("module_wasm"),n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v(" "),n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("{")]),t._v("\n  "),n("span",{pre:!0,attrs:{class:"token literal-property property"}},[t._v("env")]),n("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("{")]),t._v("\n    memory\n  "),n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("}")]),t._v("\n"),n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("}")]),n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),n("span",{pre:!0,attrs:{class:"token function"}},[t._v("then")]),n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),n("span",{pre:!0,attrs:{class:"token parameter"}},[n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("{")]),t._v(" exports "),n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("}")])]),n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v(" "),n("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=>")]),t._v(" "),n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("{")]),t._v("\n")])])]),n("p",[t._v("to")]),t._v(" "),n("div",{staticClass:"language-js extra-class"},[n("pre",{pre:!0,attrs:{class:"language-js"}},[n("code",[t._v("WebAssembly"),n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),n("span",{pre:!0,attrs:{class:"token function"}},[t._v("instantiateStreaming")]),n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),n("span",{pre:!0,attrs:{class:"token function"}},[t._v("fetch")]),n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),n("span",{pre:!0,attrs:{class:"token string"}},[t._v("'./build/optimized.wasm'")]),n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v(" "),n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("{")]),t._v("\n  "),n("span",{pre:!0,attrs:{class:"token literal-property property"}},[t._v("env")]),n("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("{")]),t._v("\n    memory\n  "),n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("}")]),n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v("\n  Math\n"),n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("}")]),n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),n("span",{pre:!0,attrs:{class:"token function"}},[t._v("then")]),n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),n("span",{pre:!0,attrs:{class:"token parameter"}},[n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("{")]),t._v(" exports "),n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("}")])]),n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v(" "),n("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=>")]),t._v(" "),n("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("{")]),t._v("\n")])])]),n("p",[t._v("because using the "),n("RouterLink",{attrs:{to:"/loader.html"}},[t._v("loader")]),t._v(" is not ultimately necessary here (no managed objects are exchanged). If the loader is used instead, it will automatically provide JavaScript's "),n("code",[t._v("Math")]),t._v(".")],1),t._v(" "),n("p",[t._v("Some browsers may restrict "),n("code",[t._v("fetch")]),t._v("ing local resources when just opening "),n("code",[t._v("index.html")]),t._v(" now, but one can set up a local server as a workaround:")]),t._v(" "),n("div",{staticClass:"language-sh extra-class"},[n("pre",{pre:!0,attrs:{class:"language-sh"}},[n("code",[n("span",{pre:!0,attrs:{class:"token function"}},[t._v("npm")]),t._v(" "),n("span",{pre:!0,attrs:{class:"token function"}},[t._v("install")]),t._v(" --save-dev http-server\nhttp-server "),n("span",{pre:!0,attrs:{class:"token builtin class-name"}},[t._v(".")]),t._v(" -o -c-1\n")])])])])}),[],!1,null,null,null);e.default=s.exports}}]);