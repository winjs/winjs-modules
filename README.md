# WinJS-modules

This is a modular build seed for custom compiling your own version of WinJS.


## Build


1. npm install -g requirejs
1. `TODO once our NPM package is published`
1. cp node_modules/winjs-modules/WinJS-custom.js .
1. cp node_modules/winjs-modules/example.build.js ./build.js
1. Edit the paths in build.js (if necessary)
1. Edit WinJS-custom.js, commenting out the modules you don't need
   * Known Issue: When commenting things out, leave in the "require-style" lines for the build to complete
1. r.js -o build.js
1. Your custom build is in bin\WinJS.js




## Limitations / Known Issues

*  Currently the modular build doesn't custom-compile CSS since the CSS has not been modularized yet. Pre-built CSS is inside the "css" directory.
*  Need to publish this repo to NPM and update the above instructions
*  The build will not complete successfully unless the top-level require-style lines are left in, due to dependencies in the controls.
