{
    "baseUrl": ".",
    "name": "WinJS-custom",
    "deps": [
        "amd"
    ],
    "optimize": "none",
    "useStrict": true,
    "out": "bin/js/WinJS.js",
    "wrap": {
        "start": "\n/*! Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information. */\n(function (global) {\n\n    (function (factory) {\n        if (typeof define === 'function' && define.amd) {\n            define([], factory);\n        } else {\n            global.msWriteProfilerMark && msWriteProfilerMark('WinJS.4.0 4.0.0-preview.winjs.2015.3.25 WinJS-custom.js,StartTM');\n            factory(global.WinJS);\n            global.msWriteProfilerMark && msWriteProfilerMark('WinJS.4.0 4.0.0-preview.winjs.2015.3.25 WinJS-custom.js,StopTM');\n        }\n    }(function (WinJS) {\n\n",
        "end": "\n        require(['WinJS/Core/_WinJS', 'WinJS-custom'], function (_WinJS) {\n            global.WinJS = _WinJS;\n        });\n        return global.WinJS;\n    }));\n}(this));\n\n"
    },
    "paths": {
        "amd": "node_modules/winjs-modules/amd",
        "require-style": "node_modules/winjs-modules/require-style",
        "require-json": "node_modules/winjs-modules/require-json",
        "WinJS": "node_modules/winjs-modules/WinJS"
    },
    "findNestedDependencies": true
}