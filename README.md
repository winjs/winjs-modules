# WinJS-modules

This is a modular build seed for custom compiling your own version of WinJS.


## Build


1. npm install -g requirejs
1. npm install winjs-modules
1. cp node_modules/winjs-modules/WinJS-custom.js . <br/>
   (on Windows: copy node_modules\winjs-modules\WinJS-custom.js .)
1. cp node_modules/winjs-modules/example.build.js ./build.js <br/>
   (on Windows: copy node_modules\winjs-modules\example.build.js .\build.js)
1. Edit the paths in build.js (if necessary)
1. Edit WinJS-custom.js, commenting out the modules you don't need
1. r.js -o build.js <br/>
   (on Windows: r.js.cmd -o build.js)
1. Your custom build is in bin\WinJS.js




## Limitations / Known Issues

*  Currently the modular build doesn't custom-compile CSS since the CSS has not been modularized yet. Pre-built CSS is inside the "css" directory.
