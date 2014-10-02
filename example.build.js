({
    "baseUrl": ".",
    "name": "WinJS-custom",
    "deps": [
        "amd"
    ],
    "optimize": "none",
    "useStrict": true,
    "out": "bin/WinJS.js",
    "wrap": {
        "start": "\n/*! Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information. */\n(function (global) {\n\n    (function (factory) {\n        if (typeof define === 'function' && define.amd) {\n            define([], factory);\n        } else {\n            global.msWriteProfilerMark && msWriteProfilerMark('WinJS.3.0 3.0.1.winjs.2014.10.2 WinJS-custom.js,StartTM');\n            factory(global.WinJS);\n            global.msWriteProfilerMark && msWriteProfilerMark('WinJS.3.0 3.0.1.winjs.2014.10.2 WinJS-custom.js,StopTM');\n        }\n    }(function (WinJS) {\n\n",
        "end": "\n        require(['WinJS/Core/_WinJS', 'WinJS-custom'], function (_WinJS) {\n            global.WinJS = _WinJS;\n            return _WinJS;\n        });\n    }));\n}(this));\n\n"
    },
    "paths": {
        "amd": "node_modules/winjs-modules/amd",
        "require-style": "node_modules/winjs-modules/require-style",
        "require-json": "node_modules/winjs-modules/require-json",
        "WinJS": "node_modules/winjs-modules/WinJS",
        "less-phone": "empty:",
        "less-desktop": "empty:"
    },
    "bundles": {
        "WinJS/Animations": [
            "WinJS/Animations/_Constants",
            "WinJS/Animations/_TransitionAnimation"
        ],
        "WinJS/Application": [
            "WinJS/Application/_State"
        ],
        "WinJS/Binding": [
            "WinJS/Binding/_BindingParser",
            "WinJS/Binding/_Data",
            "WinJS/Binding/_Declarative",
            "WinJS/Binding/_DomWeakRefTable"
        ],
        "WinJS/BindingList": [
            "WinJS/BindingList/_BindingListDataSource"
        ],
        "WinJS/BindingTemplate": [
            "WinJS/BindingTemplate/_DataTemplateCompiler"
        ],
        "WinJS/ControlProcessor": [
            "WinJS/ControlProcessor/_OptionsParser",
            "WinJS/ControlProcessor/_OptionsLexer"
        ],
        "WinJS/Controls/AppBar": [
            "WinJS/Controls/AppBar/_Command",
            "WinJS/Controls/AppBar/_Constants",
            "WinJS/Controls/AppBar/_Icon",
            "WinJS/Controls/AppBar/_Layouts"
        ],
        "WinJS/Controls/FlipView": [
            "WinJS/Controls/FlipView/_Constants",
            "WinJS/Controls/FlipView/_PageManager"
        ],
        "WinJS/Controls/Flyout": [
            "WinJS/Controls/Flyout/_Overlay"
        ],
        "WinJS/Controls/Hub": [
            "WinJS/Controls/Hub/_Section"
        ],
        "WinJS/Controls/ItemContainer": [
            "WinJS/Controls/ItemContainer/_Constants",
            "WinJS/Controls/ItemContainer/_ItemEventsHandler"
        ],
        "WinJS/Controls/ListView": [
            "WinJS/Controls/ListView/_BrowseMode",
            "WinJS/Controls/ListView/_ErrorMessages",
            "WinJS/Controls/ListView/_GroupFocusCache",
            "WinJS/Controls/ListView/_GroupsContainer",
            "WinJS/Controls/ListView/_Helpers",
            "WinJS/Controls/ListView/_ItemsContainer",
            "WinJS/Controls/ListView/_Layouts",
            "WinJS/Controls/ListView/_SelectionManager",
            "WinJS/Controls/ListView/_VirtualizeContentsView"
        ],
        "WinJS/Controls/Menu": [
            "WinJS/Controls/Menu/_Command"
        ],
        "WinJS/Controls/NavBar": [
            "WinJS/Controls/NavBar/_Command",
            "WinJS/Controls/NavBar/_Container"
        ],
        "WinJS/Controls/Pivot": [
            "WinJS/Controls/Pivot/_Constants",
            "WinJS/Controls/Pivot/_Item"
        ],
        "WinJS/Controls/SearchBox": [
            "WinJS/Controls/SearchBox/_SearchSuggestionManagerShim"
        ],
        "WinJS/Core": [
            "require-json!en-US/ui.resjson",
            "WinJS/Core/_Base",
            "WinJS/Core/_BaseCoreUtils",
            "WinJS/Core/_BaseUtils",
            "WinJS/Core/_ErrorFromName",
            "WinJS/Core/_Events",
            "WinJS/Core/_Global",
            "WinJS/Core/_Log",
            "WinJS/Core/_Resources",
            "WinJS/Core/_Trace",
            "WinJS/Core/_WinRT",
            "WinJS/Core/_WriteProfilerMark",
            "WinJS/Core/_WinJS"
        ],
        "WinJS/Pages": [
            "WinJS/Pages/_BasePage"
        ],
        "WinJS/Promise": [
            "WinJS/Promise/_StateMachine"
        ],
        "WinJS/Utilities": [
            "WinJS/Utilities/_Control",
            "WinJS/Utilities/_Dispose",
            "WinJS/Utilities/_ElementListUtilities",
            "WinJS/Utilities/_ElementUtilities",
            "WinJS/Utilities/_Hoverable",
            "WinJS/Utilities/_ItemsManager",
            "WinJS/Utilities/_KeyboardBehavior",
            "WinJS/Utilities/_ParallelWorkQueue",
            "WinJS/Utilities/_SafeHtml",
            "WinJS/Utilities/_Select",
            "WinJS/Utilities/_TabContainer",
            "WinJS/Utilities/_UI",
            "WinJS/Utilities/_VersionManager",
            "WinJS/Utilities/_Xhr"
        ],
        "WinJS/VirtualizedDataSource": [
            "WinJS/VirtualizedDataSource/_GroupDataSource",
            "WinJS/VirtualizedDataSource/_GroupedItemDataSource",
            "WinJS/VirtualizedDataSource/_StorageDataSource",
            "WinJS/VirtualizedDataSource/_VirtualizedDataSourceImpl"
        ]
    }
})