// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <reference path="ms-appx://WinJS.2.1/js/WinJS.js" />
(function (global) {
    global.WinJS = global.WinJS || {};
    WinJS.Utilities = WinJS.Utilities || {};
    WinJS.Utilities._writeProfilerMark = function _writeProfilerMark(text) {
        global.msWriteProfilerMark && msWriteProfilerMark(text);
    };
})(this);
WinJS.Utilities._writeProfilerMark("WinJS.2.1 2.0.1.WinJS.2014.7.15 WinJS.js,StartTM");
(function (global, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else {
        factory();
    }
}(this, function () {