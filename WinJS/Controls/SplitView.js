// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
/// <reference path="../../../../typings/require.d.ts" />
define(["require", "exports", '../Core/_Base'], function(require, exports, _Base) {
    var module = null;

    _Base.Namespace.define("WinJS.UI", {
        SplitView: {
            get: function () {
                if (!module) {
                    require(["./SplitView/_SplitView"], function (m) {
                        module = m;
                    });
                }
                return module.SplitView;
            }
        }
    });
});
