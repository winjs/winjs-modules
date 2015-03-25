/*!
  Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
  Build: 4.0.0-preview.winjs.2015.3.25
  Version: WinJS.4.0
*/

(function (global) {
    global.strings = global.strings || {};

    var appxVersion = "WinJS.4.0";
    var developerPrefix = "Developer.";
    if (appxVersion.indexOf(developerPrefix) === 0) {
        appxVersion = appxVersion.substring(developerPrefix.length);
    }

    function addStrings(keyPrefix,  strings) {
        Object.keys(strings).forEach(function (key) {
            global.strings[keyPrefix + key.replace("\\", "/")] = strings[key];
        });
    }
    addStrings("ms-resource://"+appxVersion+"/ui/",