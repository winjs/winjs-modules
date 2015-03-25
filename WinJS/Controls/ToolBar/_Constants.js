// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
define(["require", "exports"], function(require, exports) {
    // ToolBar class names
    exports.controlCssClass = "win-toolbar";
    exports.actionAreaCssClass = "win-toolbar-actionarea";
    exports.overflowButtonCssClass = "win-toolbar-overflowbutton";
    exports.spacerCssClass = "win-toolbar-spacer";
    exports.ellipsisCssClass = "win-toolbar-ellipsis";
    exports.overflowAreaCssClass = "win-toolbar-overflowarea";
    exports.overflowContentFlyoutCssClass = "win-toolbar-contentflyout";
    exports.shownDisplayReducedCssClass = "win-toolbar-showndisplayreduced";
    exports.shownDisplayFullCssClass = "win-toolbar-showndisplayfull";
    exports.emptyToolBarCssClass = "win-toolbar-empty";
    exports.menuCssClass = "win-menu";
    exports.menuContainsToggleCommandClass = "win-menu-containstogglecommand";
    exports.menuContainsFlyoutCommandClass = "win-menu-containsflyoutcommand";

    exports.contentMenuCommandDefaultLabel = "Custom content";

    // Constants for shownDisplayModes
    exports.shownDisplayModes = {
        full: "full",
        reduced: "reduced"
    };

    // Constants for commands
    exports.typeSeparator = "separator";
    exports.typeContent = "content";
    exports.typeButton = "button";
    exports.typeToggle = "toggle";
    exports.typeFlyout = "flyout";
});
