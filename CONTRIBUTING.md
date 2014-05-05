# Contributing to Seriously.js #

Contributions are welcome, whether new core features, effects, bug fixes or examples. Please follow these guidelines.

## Workflow ##
* All contributions should be based off the latest `develop` branch, and pull requests must be submitted to `develop`. Any pull requests to `master` will be rejected.
* Create a separate branch for each patch or feature
* Any modifications to the core script must pass unit tests. Whenever possible, especially for new features, please add a test.
* New features or effects should have an example.
* Any copied assets (e.g. images, shaders or code) should have the appropriate license and credit allowing for their use in this repository.
* When refactoring existing code, make sure all relevant examples still work or are updated to work.
* If a patch is relevant to a [GitHub issue](https://github.com/brianchirls/Seriously.js/issues?state=open), please reference the issue number with a hash in the commit message.
* All Javascript code should follow the style guide below

## Code Style ##
* Indent with tabs, not spaces
* No trailing spaces
* Single quotes for strings
* Spaces around binary operators (e.g. `a + b`, not `a+b`), but not unary ones
* `if`, `while`, `try`, etc. must all have braces and span multiple lines.
* All local variables should be declared in one `var` statement at the top of each function
* functions should be declared after `var` but before any other statements.
* Lots of comments please, but put them on the line before the code, not at the end of the line.
* When in doubt, refer to existing code.

## Best Practices ##
* Prioritize speed for code that runs in render loops, but prioritize readability, simplicity and usability for everything else.
* Publicly accessible methods should be simple to use and forgiving of mistakes whenever possible. Assume they're being used by inexperienced programmers.
* Observe [WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/WebGL/WebGL_best_practices)
* Private or protected code may assume more advanced users, to prioritize speed and power.
* Minimize impact on the global environment. No unnecessary global variables, and shim when necessary but don't polyfill.
* All plugins must support either AMD or global declarations (see [UMD](https://github.com/umdjs/umd/blob/master/returnExportsGlobal.js)). Examples may use AMD, but it's not required.
* Check all Javascript code with jshint or jslint, but use your brain. The following options are recommended:
`    devel: true, bitwise: true, browser: true, white: true, nomen: true, plusplus: true, maxerr: 50, indent: 4, todo: true`