// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
/// <reference path="../../../../typings/require.d.ts" />
define(["require", "exports", '../Core/_Base'], function(require, exports, _Base) {
    var module = null;

    function getModule() {
        if (!module) {
            require(["./ToolBar/_ToolBar"], function (m) {
                module = m;
            });
        }
        return module.ToolBar;
    }

    _Base.Namespace.define("WinJS.UI", {
        ToolBar: {
            get: getModule
        }
    });

    var publicMembers = Object.create({}, {
        ToolBar: {
            get: function () {
                return getModule();
            }
        }
    });

    
    return publicMembers;
});
