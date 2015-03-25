// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
define(["require", "exports", "../Menu/_Command"], function(require, exports, _MenuCommandBase) {
    var _MenuCommand = (function (_super) {
        __extends(_MenuCommand, _super);
        function _MenuCommand(isAttachedMode, element, options) {
            if (options && options.beforeInvoke) {
                this._beforeInvoke = options.beforeInvoke;
            }
            this._isAttachedMode = isAttachedMode;
            _super.call(this, element, options);
        }
        _MenuCommand.prototype._invoke = function (event) {
            this._beforeInvoke && this._beforeInvoke(event);
            _super.prototype._invoke.call(this, event);
        };
        return _MenuCommand;
    })(_MenuCommandBase.MenuCommand);
    exports._MenuCommand = _MenuCommand;
});
