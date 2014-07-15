// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Controls/AppBar/_Constants',[
     'exports',
     '../../Core/_Base',
], function appBarConstantsInit(exports, _Base) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, null, {
        // AppBar class names.
        appBarClass: "win-appbar",
        firstDivClass: "win-firstdiv",
        finalDivClass: "win-finaldiv",
        invokeButtonClass: "win-appbar-invokebutton",
        ellipsisClass: "win-appbar-ellipsis",
        primaryCommandsClass: "win-primarygroup",
        secondaryCommandsClass: "win-secondarygroup",
        reducedClass: "win-reduced",
        commandLayoutClass: "win-commandlayout",
        topClass: "win-top",
        bottomClass: "win-bottom",
        showingClass : "win-appbar-showing",
        shownClass : "win-appbar-shown",
        hidingClass : "win-appbar-hiding",
        hiddenClass : "win-appbar-hidden",

        // Constants for AppBar placement
        appBarPlacementTop: "top",
        appBarPlacementBottom: "bottom",

        // Constants for AppBar layouts
        appBarLayoutCustom: "custom",
        appBarLayoutCommands: "commands",

        // Constant for AppBar invokebutton width
        appBarInvokeButtonWidth: 40,

        // Constants for Commands
        typeSeparator: "separator",
        typeContent: "content",
        typeButton: "button",
        typeToggle: "toggle",
        typeFlyout: "flyout",
        menuCommandClass: "win-command",
        appBarCommandClass: "win-command",
        appBarCommandGlobalClass: "win-global",
        appBarCommandSelectionClass: "win-selection",
        sectionSelection: "selection",
        sectionGlobal: "global",

        // Prevents the element from showing a focus rect
        hideFocusClass: "win-hidefocus",

        // Other class names
        overlayClass: "win-overlay",
        flyoutClass: "win-flyout",
        flyoutSelector: ".win-flyout",
        flyoutLightClass: "win-ui-light",
        menuClass: "win-menu",
        menuToggleClass: "win-menu-toggle",
        settingsFlyoutClass: "win-settingsflyout",
        settingsFlyoutSelector: ".win-settingsflyout",
        scrollsClass: "win-scrolls",

        // Constants for AppBarCommand full-size widths.
        separatorWidth: 60,
        buttonWidth: 100,

        narrowClass: "win-narrow",
        wideClass: "win-wide",
        _clickEatingAppBarClass: "win-appbarclickeater",
        _clickEatingFlyoutClass: "win-flyoutmenuclickeater",
    });
});

define('require-style!less/desktop/controls',[],function(){});

define('require-style!less/phone/controls',[],function(){});
// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// Glyph Enumeration
/// <dictionary>Segoe</dictionary>
define('WinJS/Controls/AppBar/_Icon',[
     'exports',
     '../../Core/_Base',
     '../../Core/_Resources'
     ], function appBarIconInit(exports, _Base, _Resources) {
    "use strict";

    var glyphs = ["previous",
                    "next",
                    "play",
                    "pause",
                    "edit",
                    "save",
                    "clear",
                    "delete",
                    "remove",
                    "add",
                    "cancel",
                    "accept",
                    "more",
                    "redo",
                    "undo",
                    "home",
                    "up",
                    "forward",
                    "right",
                    "back",
                    "left",
                    "favorite",
                    "camera",
                    "settings",
                    "video",
                    "sync",
                    "download",
                    "mail",
                    "find",
                    "help",
                    "upload",
                    "emoji",
                    "twopage",
                    "leavechat",
                    "mailforward",
                    "clock",
                    "send",
                    "crop",
                    "rotatecamera",
                    "people",
                    "closepane",
                    "openpane",
                    "world",
                    "flag",
                    "previewlink",
                    "globe",
                    "trim",
                    "attachcamera",
                    "zoomin",
                    "bookmarks",
                    "document",
                    "protecteddocument",
                    "page",
                    "bullets",
                    "comment",
                    "mail2",
                    "contactinfo",
                    "hangup",
                    "viewall",
                    "mappin",
                    "phone",
                    "videochat",
                    "switch",
                    "contact",
                    "rename",
                    "pin",
                    "musicinfo",
                    "go",
                    "keyboard",
                    "dockleft",
                    "dockright",
                    "dockbottom",
                    "remote",
                    "refresh",
                    "rotate",
                    "shuffle",
                    "list",
                    "shop",
                    "selectall",
                    "orientation",
                    "import",
                    "importall",
                    "browsephotos",
                    "webcam",
                    "pictures",
                    "savelocal",
                    "caption",
                    "stop",
                    "showresults",
                    "volume",
                    "repair",
                    "message",
                    "page2",
                    "calendarday",
                    "calendarweek",
                    "calendar",
                    "characters",
                    "mailreplyall",
                    "read",
                    "link",
                    "accounts",
                    "showbcc",
                    "hidebcc",
                    "cut",
                    "attach",
                    "paste",
                    "filter",
                    "copy",
                    "emoji2",
                    "important",
                    "mailreply",
                    "slideshow",
                    "sort",
                    "manage",
                    "allapps",
                    "disconnectdrive",
                    "mapdrive",
                    "newwindow",
                    "openwith",
                    "contactpresence",
                    "priority",
                    "uploadskydrive",
                    "gototoday",
                    "font",
                    "fontcolor",
                    "contact2",
                    "folder",
                    "audio",
                    "placeholder",
                    "view",
                    "setlockscreen",
                    "settile",
                    "cc",
                    "stopslideshow",
                    "permissions",
                    "highlight",
                    "disableupdates",
                    "unfavorite",
                    "unpin",
                    "openlocal",
                    "mute",
                    "italic",
                    "underline",
                    "bold",
                    "movetofolder",
                    "likedislike",
                    "dislike",
                    "like",
                    "alignright",
                    "aligncenter",
                    "alignleft",
                    "zoom",
                    "zoomout",
                    "openfile",
                    "otheruser",
                    "admin",
                    "street",
                    "map",
                    "clearselection",
                    "fontdecrease",
                    "fontincrease",
                    "fontsize",
                    "cellphone",
                    "reshare",
                    "tag",
                    "repeatone",
                    "repeatall",
                    "outlinestar",
                    "solidstar",
                    "calculator",
                    "directions",
                    "target",
                    "library",
                    "phonebook",
                    "memo",
                    "microphone",
                    "postupdate",
                    "backtowindow",
                    "fullscreen",
                    "newfolder",
                    "calendarreply",
                    "unsyncfolder",
                    "reporthacked",
                    "syncfolder",
                    "blockcontact",
                    "switchapps",
                    "addfriend",
                    "touchpointer",
                    "gotostart",
                    "zerobars",
                    "onebar",
                    "twobars",
                    "threebars",
                    "fourbars",
                    "scan",
                    "preview"];

    // Provide properties to grab resources for each of the icons
    /// <summary locid="WinJS.UI.AppBarIcon">
    /// The AppBarIcon enumeration provides a set of glyphs for use with the AppBarCommand icon property.
    /// </summary>
    var icons = glyphs.reduce(function (fixedIcons, item) {
       fixedIcons[item] = { get: function () { return _Resources._getWinJSString("ui/appBarIcons/" + item).value; } };
       return fixedIcons;
     }, {});

    _Base.Namespace._moduleDefine(exports, "WinJS.UI.AppBarIcon", icons);
});
// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// AppBarCommand
/// <dictionary>appbar,appbars,Flyout,Flyouts,onclick,Statics</dictionary>
define('WinJS/Controls/AppBar/_Command',[
    'exports',
    '../../Core/_Global',
    '../../Core/_WinRT',
    '../../Core/_Base',
    '../../Core/_ErrorFromName',
    '../../Core/_Resources',
    '../../Utilities/_Control',
    '../../Utilities/_Dispose',
    '../../Utilities/_ElementUtilities',
    '../Flyout/_Overlay',
    '../Tooltip',
    './_Constants',
    './_Icon'
    ], function appBarCommandInit(exports, _Global, _WinRT, _Base, _ErrorFromName, _Resources, _Control, _Dispose, _ElementUtilities, _Overlay, Tooltip, _Constants, _Icon) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.AppBarCommand">
        /// Represents a command to display in an AppBar. 
        /// </summary>
        /// </field>
        /// <icon src="ui_winjs.ui.appbarcommand.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.appbarcommand.16x16.png" width="16" height="16" />
        /// <htmlSnippet><![CDATA[<button data-win-control="WinJS.UI.AppBarCommand" data-win-options="{type:'button',label:'Button'}"></button>]]></htmlSnippet>
        /// <part name="appBarCommand" class="win-command" locid="WinJS.UI.AppBarCommand_part:appBarCommand">The AppBarCommand control itself.</part>
        /// <part name="appBarCommandIcon" class="win-commandicon" locid="WinJS.UI.AppBarCommand_part:appBarCommandIcon">The AppBarCommand's icon box.</part>
        /// <part name="appBarCommandImage" class="win-commandimage" locid="WinJS.UI.AppBarCommand_part:appBarCommandImage">The AppBarCommand's icon's image formatting.</part>
        /// <part name="appBarCommandRing" class="win-commandring" locid="WinJS.UI.AppBarCommand_part:appBarCommandRing">The AppBarCommand's icon's ring.</part>
        /// <part name="appBarCommandLabel" class="win-label" locid="WinJS.UI.AppBarCommand_part:appBarCommandLabel">The AppBarCommand's label</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        AppBarCommand: _Base.Namespace._lazy(function () {


            function _handleClick(event) {
                /*jshint validthis: true */
                var command = this.winControl;
                if (command) {
                    if (command._type === _Constants.typeToggle) {
                        command.selected = !command.selected;
                    } else if (command._type === _Constants.typeFlyout && command._flyout) {
                        var parentAppBar = _Overlay._Overlay._getParentControlUsingClassName(this, _Constants.appBarClass);
                        var placement = "top";
                        if (parentAppBar && parentAppBar.placement === "top") {
                            placement = "bottom";
                        }
                        var flyout = command._flyout;
                        // Flyout may not have processAll'd, so this may be a DOM object
                        if (typeof flyout === "string") {
                            flyout = _Global.document.getElementById(flyout);
                        }
                        if (!flyout.show) {
                            flyout = flyout.winControl;
                        }
                        if (flyout && flyout.show) {
                            flyout.show(this, placement);
                        }
                    }
                    if (command.onclick) {
                        command.onclick(event);
                    }
                }
            }

            var strings = {
                get ariaLabel() { return _Resources._getWinJSString("ui/appBarCommandAriaLabel").value; },
                get duplicateConstruction() { return _Resources._getWinJSString("ui/duplicateConstruction").value; },
                get badClick() { return _Resources._getWinJSString("ui/badClick").value; },
                get badDivElement() { return _Resources._getWinJSString("ui/badDivElement").value; },
                get badHrElement() { return _Resources._getWinJSString("ui/badHrElement").value; },
                get badButtonElement() { return _Resources._getWinJSString("ui/badButtonElement").value; }
            };

            return _Base.Class.define(function AppBarCommand_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.AppBarCommand.AppBarCommand">
                /// <summary locid="WinJS.UI.AppBarCommand.constructor">
                /// Creates a new AppBarCommand control.
                /// </summary>
                /// <param name="element" domElement="true" locid="WinJS.UI.AppBarCommand.constructor_p:element">
                /// The DOM element that will host the control. AppBarCommand will create one if null.
                /// </param>
                /// <param name="options" type="Object" locid="WinJS.UI.AppBarCommand.constructor_p:options">
                /// The set of properties and values to apply to the new AppBarCommand. 
                /// </param>
                /// <returns type="WinJS.UI.AppBarCommand" locid="WinJS.UI.AppBarCommand.constructor_returnValue">
                /// The new AppBarCommand control.
                /// </returns>
                /// </signature>

                // Check to make sure we weren't duplicated
                if (element && element.winControl) {
                    throw new _ErrorFromName("WinJS.UI.AppBarCommand.DuplicateConstruction", strings.duplicateConstruction);
                }

                this._disposed = false;

                // Don't blow up if they didn't pass options
                if (!options) {
                    options = {};
                }

                // Need a type before we can create our element
                if (!options.type) {
                    this._type = _Constants.typeButton;
                }

                options.section = options.section || _Constants.sectionGlobal;

                // Go ahead and create it, separator and content types look different than buttons
                // Don't forget to use passed in element if one was provided.
                this._element = element;

                if (options.type === _Constants.typeContent) {
                    this._createContent();
                }
                else if (options.type === _Constants.typeSeparator) {
                    this._createSeparator();
                } else {
                    // This will also set the icon & label
                    this._createButton();
                }
                _ElementUtilities.addClass(this._element, "win-disposable");

                // Remember ourselves
                this._element.winControl = this;

                // Attach our css class
                _ElementUtilities.addClass(this._element, _Constants.appBarCommandClass);

                if (options.onclick) {
                    this.onclick = options.onclick;
                }
                // We want to handle some clicks
                options.onclick = _handleClick;

                _Control.setOptions(this, options);

                if (this._type === _Constants.typeToggle && !options.selected) {
                    this.selected = false;
                }

                // Set up pointerdown handler and clean up ARIA if needed
                if (this._type !== _Constants.typeSeparator) {

                    // Hide the modern focus rect on click or touch
                    var that = this;
                    _ElementUtilities._addEventListener(this._element, "pointerdown", function () { _Overlay._Overlay._addHideFocusClass(that._element); }, false);

                    // Make sure we have an ARIA role
                    var role = this._element.getAttribute("role");
                    if (role === null || role === "" || role === undefined) {
                        if (this._type === _Constants.typeToggle) {
                            role = "menuitemcheckbox";
                        } else if (this._type === _Constants.typeContent) {
                            role = "group";
                        } else {
                            role = "menuitem";
                        }
                        this._element.setAttribute("role", role);
                        if (this._type === _Constants.typeFlyout) {
                            this._element.setAttribute("aria-haspopup", true);
                        }
                    }
                    // Label should've been set by label, but if it was missed for some reason:
                    var label = this._element.getAttribute("aria-label");
                    if (label === null || label === "" || label === undefined) {
                        this._element.setAttribute("aria-label", strings.ariaLabel);
                    }
                }
            }, {
                /// <field type="String" locid="WinJS.UI.AppBarCommand.id" helpKeyword="WinJS.UI.AppBarCommand.id" isAdvanced="true">
                /// Gets or sets the ID of the AppBarCommand.
                /// </field>
                id: {
                    get: function () {
                        return this._element.id;
                    },

                    set: function (value) {
                        // we allow setting first time only. otherwise we ignore it.
                        if (value && !this._element.id) {
                            this._element.id = value;
                        }
                    }
                },

                /// <field type="String" defaultValue="button" readonly="true" oamOptionsDatatype="WinJS.UI.AppBarCommand.type" locid="WinJS.UI.AppBarCommand.type" helpKeyword="WinJS.UI.AppBarCommand.type" isAdvanced="true">
                /// Gets or sets the type of the AppBarCommand. Possible values are "button", "toggle", "flyout", "content" or "separator".
                /// </field>
                type: {
                    get: function () {
                        return this._type;
                    },
                    set: function (value) {
                        // we allow setting first time only. otherwise we ignore it.
                        if (!this._type) {
                            if (value !== _Constants.typeContent && value !== _Constants.typeFlyout && value !== _Constants.typeToggle && value !== _Constants.typeSeparator) {
                                this._type = _Constants.typeButton;
                            } else {
                                this._type = value;
                            }
                        }
                    }
                },

                /// <field type="String" locid="WinJS.UI.AppBarCommand.label" helpKeyword="WinJS.UI.AppBarCommand.label">
                /// Gets or sets the label of the AppBarCommand.
                /// </field>
                label: {
                    get: function () {
                        return this._label;
                    },
                    set: function (value) {
                        this._label = value;
                        if (this._labelSpan) {
                            this._labelSpan.textContent = this.label;
                        }

                        // Ensure that we have a tooltip, by updating already-constructed tooltips.  Separators won't have these:
                        if (!this.tooltip && this._tooltipControl) {
                            this._tooltip = this.label;
                            this._tooltipControl.innerHTML = this.label;
                        }

                        // Update aria-label
                        this._element.setAttribute("aria-label", this.label);

                        // Check if we need to suppress the tooltip
                        this._testIdenticalTooltip();
                    }
                },

                /// <field type="String" locid="WinJS.UI.AppBarCommand.icon" helpKeyword="WinJS.UI.AppBarCommand.icon">
                /// Gets or sets the icon of the AppBarCommand.
                /// </field>
                icon: {
                    get: function () {
                        return this._icon;
                    },
                    set: function (value) {

                        this._icon = _Icon[value] || value;

                        if (this._imageSpan) {
                            // If the icon's a single character, presume a glyph
                            if (this._icon && this._icon.length === 1) {
                                // Set the glyph
                                this._imageSpan.textContent = this._icon;
                                this._imageSpan.style.backgroundImage = "";
                                this._imageSpan.style.msHighContrastAdjust = "";
                            } else {
                                // Must be an image, set that
                                this._imageSpan.textContent = "";
                                this._imageSpan.style.backgroundImage = this._icon;
                                this._imageSpan.style.msHighContrastAdjust = "none";
                            }
                        }
                    }
                },

                /// <field type="Function" locid="WinJS.UI.AppBarCommand.onclick" helpKeyword="WinJS.UI.AppBarCommand.onclick">
                /// Gets or sets the function to invoke when the command is clicked.
                /// </field>
                onclick: {
                    get: function () {
                        return this._onclick;
                    },
                    set: function (value) {
                        if (value && typeof value !== "function") {
                            throw new _ErrorFromName("WinJS.UI.AppBarCommand.BadClick", _Resources._formatString(strings.badClick, "AppBarCommand"));
                        }
                        this._onclick = value;
                    }
                },

                /// <field type="Object" locid="WinJS.UI.AppBarCommand.flyout" helpKeyword="WinJS.UI.AppBarCommand.flyout">
                /// For flyout-type AppBarCommands, this property returns the WinJS.UI.Flyout that this command invokes.
                /// When setting this property, you may also use the String ID of the flyout to invoke, the DOM object 
                /// for the flyout, or the WinJS.UI.Flayout object itself.
                /// </field>
                flyout: {
                    get: function () {
                        // Resolve it to the flyout
                        var flyout = this._flyout;
                        if (typeof flyout === "string") {
                            flyout = _Global.document.getElementById(flyout);
                        }
                        // If it doesn't have a .element, then we need to getControl on it
                        if (flyout && !flyout.element) {
                            flyout = flyout.winControl;
                        }

                        return flyout;
                    },
                    set: function (value) {
                        // Need to update aria-owns with the new ID.
                        var id = value;
                        if (id && typeof id !== "string") {
                            // Our controls have .element properties
                            if (id.element) {
                                id = id.element;
                            }
                            // Hope it's a DOM element, get ID from DOM element
                            if (id) {
                                if (id.id) {
                                    id = id.id;
                                } else {
                                    // No id, have to fake one
                                    id.id = _ElementUtilities._uniqueID(id);
                                    id = id.id;
                                }
                            }
                        }
                        if (typeof id === "string") {
                            this._element.setAttribute("aria-owns", id);
                        }

                        // Remember it
                        this._flyout = value;
                    }
                },

                /// <field type="String" defaultValue="global" oamOptionsDatatype="WinJS.UI.AppBarCommand.section" locid="WinJS.UI.AppBarCommand.section" helpKeyword="WinJS.UI.AppBarCommand.section">
                /// Gets or sets the section that the AppBarCommand is in. Possible values are "selection" and "global".
                /// </field>
                section: {
                    get: function () {
                        return this._section;
                    },
                    set: function (value) {
                        // we allow settings section only one time 
                        if (!this._section || _WinRT.Windows.ApplicationModel.DesignMode.designModeEnabled) {
                            this._setSection(value);
                        }
                    }
                },

                /// <field type="String" locid="WinJS.UI.AppBarCommand.tooltip" helpKeyword="WinJS.UI.AppBarCommand.tooltip">Gets or sets the tooltip text of the AppBarCommand.</field>
                tooltip: {
                    get: function () {
                        return this._tooltip;
                    },
                    set: function (value) {
                        this._tooltip = value;

                        // Update already-constructed tooltips. Separators and content commands won't have these:
                        if (this._tooltipControl) {
                            this._tooltipControl.innerHTML = this._tooltip;
                        }

                        // Check if we need to suppress the tooltip
                        this._testIdenticalTooltip();
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.AppBarCommand.selected" helpKeyword="WinJS.UI.AppBarCommand.selected">Set or get the selected state of a toggle button.</field>
                selected: {
                    get: function () {
                        // Ensure it's a boolean because we're using the DOM element to keep in-sync
                        return this._element.getAttribute("aria-checked") === "true";
                    },
                    set: function (value) {
                        this._element.setAttribute("aria-checked", value);
                    }
                },

                /// <field type="HTMLElement" domElement="true" readonly="true" hidden="true" locid="WinJS.UI.AppBarCommand.element" helpKeyword="WinJS.UI.AppBarCommand.element">
                /// The DOM element that hosts the AppBarCommad.
                /// </field>
                element: {
                    get: function () {
                        return this._element;
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.AppBarCommand.disabled" helpKeyword="WinJS.UI.AppBarCommand.disabled">
                /// Gets or sets a value that indicates whether the AppBarCommand is disabled. A value of true disables the AppBarCommand, and a value of false enables it.
                /// </field>
                disabled: {
                    get: function () {
                        // Ensure it's a boolean because we're using the DOM element to keep in-sync
                        return !!this._element.disabled;
                    },
                    set: function (value) {
                        this._element.disabled = value;
                    }
                },

                /// <field type="Boolean" hidden="true" locid="WinJS.UI.AppBarCommand.hidden" helpKeyword="WinJS.UI.AppBarCommand.hidden">
                /// Gets a value that indicates whether the AppBarCommand is hiding or in the process of becoming hidden.
                /// A value of true indicates that the AppBarCommand is hiding or in the process of becoming hidden.
                /// </field>
                hidden: {
                    get: function () {
                        // Ensure it's a boolean because we're using the DOM element to keep in-sync
                        return this._element.style.visibility === "hidden";
                    },
                    set: function (value) {
                        var appbarControl = _Overlay._Overlay._getParentControlUsingClassName(this._element, _Constants.appBarClass);
                        if (appbarControl && !appbarControl.hidden) {
                            throw new _ErrorFromName("WinJS.UI.AppBarCommand.CannotChangeHiddenProperty", _Resources._formatString(_Overlay._Overlay.commonstrings.cannotChangeHiddenProperty, "AppBar"));
                        }

                        if (value === this.hidden) {
                            // No changes to make.
                            return;
                        }

                        var style = this._element.style;

                        if (value) {
                            style.visibility = "hidden";
                            style.display = "none";
                        } else {
                            style.visibility = "";
                            style.display = "inline-block";
                        }
                        if (appbarControl) {
                            appbarControl._commandsUpdated();
                        }
                    }
                },

                /// <field type="HTMLElement" domElement="true" locid="WinJS.UI.AppBarCommand.firstElementFocus" helpKeyword="WinJS.UI.AppBarCommand.firstElementFocus">
                /// Gets or sets the HTMLElement within a "content" type AppBarCommand that should receive focus whenever focus moves via Home or the arrow keys, 
                /// from the previous AppBarCommand to the this AppBarCommand. Returns the AppBarCommand object's host element by default.
                /// </field>
                firstElementFocus: {
                    get: function () {
                        return this._firstElementFocus || this._lastElementFocus || this._element;
                    },
                    set: function (element) {
                        // Arguments of null and this.element should treated the same to ensure that this.element is never a tabstop when either focus property has been set.
                        this._firstElementFocus = (element === this.element) ? null : element;
                        this._updateTabStop();
                    }
                },

                /// <field type="HTMLElement" domElement="true" locid="WinJS.UI.AppBarCommand.lastElementFocus" helpKeyword="WinJS.UI.AppBarCommand.lastElementFocus">
                /// Gets or sets the HTMLElement within a "content" type AppBarCommand that should receive focus whenever focus would move, via End or arrow keys,
                /// from the next AppBarCommand to this AppBarCommand. Returns this AppBarCommand object's host element by default.
                /// </field>
                lastElementFocus: {
                    get: function () {
                        return this._lastElementFocus || this._firstElementFocus || this._element;
                    },
                    set: function (element) {
                        // Arguments of null and this.element should treated the same to ensure that this.element is never a tabstop when either focus property has been set.
                        this._lastElementFocus = (element === this.element) ? null : element;
                        this._updateTabStop();
                    }
                },

                dispose: function () {
                    /// <signature helpKeyword="WinJS.UI.AppBarCommand.dispose">
                    /// <summary locid="WinJS.UI.AppBarCommand.dispose">
                    /// Disposes this control.
                    /// </summary>
                    /// </signature>
                    if (this._disposed) {
                        return;
                    }
                    this._disposed = true;

                    if (this._tooltipControl) {
                        this._tooltipControl.dispose();
                    }

                    if (this._type === _Constants.typeContent) {
                        _Dispose.disposeSubTree(this.element);
                    }
                },

                addEventListener: function (type, listener, useCapture) {
                    /// <signature helpKeyword="WinJS.UI.AppBarCommand.addEventListener">
                    /// <summary locid="WinJS.UI.AppBarCommand.addEventListener">
                    /// Registers an event handler for the specified event. 
                    /// </summary>
                    /// <param name="type" type="String" locid="WinJS.UI.AppBarCommand.addEventListener_p:type">
                    /// Required. The name of the event to register. It must be "beforeshow", "beforehide", "aftershow", or "afterhide".
                    /// </param>
                    /// <param name="listener" type="Function" locid="WinJS.UI.AppBarCommand.addEventListener_p:listener">Required. The event handler function to associate with this event.</param>
                    /// <param name="useCapture" type="Boolean" locid="WinJS.UI.AppBarCommand.addEventListener_p:useCapture">
                    /// Optional. Set to true to register the event handler for the capturing phase; otherwise, set to false to register the event handler for the bubbling phase.
                    /// </param>
                    /// </signature>
                    return this._element.addEventListener(type, listener, useCapture);
                },

                removeEventListener: function (type, listener, useCapture) {
                    /// <signature helpKeyword="WinJS.UI.AppBarCommand.removeEventListener">
                    /// <summary locid="WinJS.UI.AppBarCommand.removeEventListener">
                    /// Removes an event handler that the addEventListener method registered. 
                    /// </summary>
                    /// <param name="type" type="String" locid="WinJS.UI.AppBarCommand.removeEventListener_p:type">Required. The name of the event to remove.</param>
                    /// <param name="listener" type="Function" locid="WinJS.UI.AppBarCommand.removeEventListener_p:listener">Required. The event handler function to remove.</param>
                    /// <param name="useCapture" type="Boolean" locid="WinJS.UI.AppBarCommand.removeEventListener_p:useCapture">
                    /// Optional. Set to true to remove the capturing phase event handler; otherwise, set to false to remove the bubbling phase event handler.
                    /// </param>
                    /// </signature>
                    return this._element.removeEventListener(type, listener, useCapture);
                },

                /// <field type="String" locid="WinJS.UI.AppBarCommand.extraClass" helpKeyword="WinJS.UI.AppBarCommand.extraClass" isAdvanced="true">Adds an extra CSS class during construction.</field>
                extraClass: {
                    get: function () {
                        return this._extraClass;
                    },
                    set: function (value) {
                        if (this._extraClass) {
                            _ElementUtilities.removeClass(this._element, this._extraClass);
                        }
                        this._extraClass = value;
                        _ElementUtilities.addClass(this._element, this._extraClass);
                    }
                },

                // Private
                _testIdenticalTooltip: function AppBarCommand_testIdenticalToolTip() {
                    this._hideIfFullSize = (this._label === this._tooltip);
                },

                _createContent: function AppBarCommand_createContent() {
                    // Make sure there's an element
                    if (!this._element) {
                        this._element = _Global.document.createElement("div");
                    } else {
                        // Verify the element was a div
                        if (this._element.tagName !== "DIV") {
                            throw new _ErrorFromName("WinJS.UI.AppBarCommand.BadDivElement", strings.badDivElement);
                        }
                    }

                    // If a tabIndex isnt set, default to 0;
                    if (parseInt(this._element.getAttribute("tabIndex"), 10) !== this._element.tabIndex) {
                        this._element.tabIndex = 0;
                    }
                },

                _createSeparator: function AppBarCommand_createSeparator() {
                    // Make sure there's an element
                    if (!this._element) {
                        this._element = _Global.document.createElement("hr");
                    } else {
                        // Verify the element was an hr
                        if (this._element.tagName !== "HR") {
                            throw new _ErrorFromName("WinJS.UI.AppBarCommand.BadHrElement", strings.badHrElement);
                        }
                    }
                },

                _createButton: function AppBarCommand_createButton() {
                    // Make sure there's an element
                    if (!this._element) {
                        this._element = _Global.document.createElement("button");
                    } else {
                        // Verify the element was a button
                        if (this._element.tagName !== "BUTTON") {
                            throw new _ErrorFromName("WinJS.UI.AppBarCommand.BadButtonElement", strings.badButtonElement);
                        }
                        // Make sure it has a type="button"
                        var type = this._element.getAttribute("type");
                        if (type === null || type === "" || type === undefined) {
                            this._element.setAttribute("type", "button");
                        }
                        this._element.innerHTML = "";
                    }

                    // AppBarCommand buttons need to look like this:
                    //// <button type="button" onclick="" class="win-command win-global">
                    ////      <span class="win-commandicon win-commandring"><span class="win-commandimage">&#xE0D5;</span></span><span class="win-label">Command 1</span>
                    //// Or This:
                    ////      <span class="win-commandicon win-commandring"><span class="win-commandimage" style="background-image:url('customimage.png')"></span></span><span class="win-label">Command 1</span>
                    //// </button>
                    this._element.type = "button";
                    this._iconSpan = _Global.document.createElement("span");
                    this._iconSpan.setAttribute("aria-hidden", "true");
                    this._iconSpan.className = "win-commandicon win-commandring";
                    this._iconSpan.tabIndex = -1;
                    this._element.appendChild(this._iconSpan);
                    this._imageSpan = _Global.document.createElement("span");
                    this._imageSpan.setAttribute("aria-hidden", "true");
                    this._imageSpan.className = "win-commandimage";
                    this._imageSpan.tabIndex = -1;
                    this._iconSpan.appendChild(this._imageSpan);
                    this._labelSpan = _Global.document.createElement("span");
                    this._labelSpan.setAttribute("aria-hidden", "true");
                    this._labelSpan.className = "win-label";
                    this._labelSpan.tabIndex = -1;
                    this._element.appendChild(this._labelSpan);
                    // 'win-global' or 'win-selection' are added later by caller.
                    // Label and icon are added later by caller.

                    // Attach a tooltip - Note: we're going to stomp on it's setControl so we don't have to make another DOM element to hang it off of.
                    // This private _tooltipControl attribute is used by other pieces, changing the name could break them.
                    this._tooltipControl = new Tooltip.Tooltip(this._element);
                    var that = this;
                    this._tooltipControl.addEventListener("beforeopen", function () {
                        if (that._hideIfFullSize && !_Overlay._Overlay._getParentControlUsingClassName(that._element.parentElement, _Constants.reducedClass)) {
                            that._tooltipControl.close();
                        }
                    }, false);
                },

                _setSection: function AppBarCommand_setSection(section) {
                    if (!section) {
                        section = _Constants.sectionGlobal;
                    }
                    if (this._section) {
                        // Remove the old section class
                        if (this._section === _Constants.sectionGlobal) {
                            _ElementUtilities.removeClass(this._element, _Constants.appBarCommandGlobalClass);
                        } else if (this.section === _Constants.sectionSelection) {
                            _ElementUtilities.removeClass(this._element, _Constants.appBarCommandSelectionClass);
                        }
                    }
                    // Add the new section class
                    this._section = section;
                    if (section === _Constants.sectionGlobal) {
                        _ElementUtilities.addClass(this._element, _Constants.appBarCommandGlobalClass);
                    } else if (section === _Constants.sectionSelection) {
                        _ElementUtilities.addClass(this._element, _Constants.appBarCommandSelectionClass);
                    }
                },

                _updateTabStop: function AppBarCommand_updateTabStop() {
                    // Whenever the firstElementFocus or lastElementFocus properties are set for content type AppBarCommands, 
                    // the containing command element is no longer a tabstop.                

                    if (this._firstElementFocus || this._lastElementFocus) {
                        this.element.tabIndex = -1;
                    } else {
                        this.element.tabIndex = 0;
                    }
                },

                _isFocusable: function AppBarCommand_isFocusable() {
                    return (!this.hidden && this._type !== _Constants.typeSeparator && !this.element.disabled &&
                        (this.firstElementFocus.tabIndex >= 0 || this.lastElementFocus.tabIndex >= 0));
                },
            });
        })
    });

});

// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Controls/AppBar/_Layouts',[
    'exports',
    '../../Core/_Global',
    '../../Core/_Base',
    '../../Core/_ErrorFromName',
    '../../Core/_Resources',
    '../../Scheduler',
    '../../Utilities/_Control',
    '../../Utilities/_Dispose',
    '../../Utilities/_ElementUtilities',
    './_Command',
    './_Constants'
    ], function appBarLayoutsInit(exports, _Global, _Base, _ErrorFromName, _Resources, Scheduler, _Control, _Dispose, _ElementUtilities, _Command, _Constants) {
    "use strict";

    // AppBar will use this when AppBar.layout property is set to "custom"
    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        _AppBarBaseLayout: _Base.Namespace._lazy(function () {
            var baseType = _Constants.appBarLayoutCustom;

            var strings = {
                get nullCommand() { return _Resources._getWinJSString("ui/nullCommand").value; }
            };

            var _AppBarBaseLayout = _Base.Class.define(function _AppBarBaseLayout_ctor(appBarEl, options) {
                this._disposed = false;

                options = options || {};
                _Control.setOptions(this, options);

                if (appBarEl) {
                    this.connect(appBarEl);
                }
            }, {
                // Members               
                className: {
                    get: function _AppBarBaseLayout_get_className() {
                        return this._className;
                    },
                },
                type: {
                    get: function _AppBarBaseLayout_get_className() {
                        return this._type || baseType;
                    },
                },
                commandsInOrder: {
                    get: function _AppBarBaseLayout_get_commandsInOrder() {
                        // Gets a DOM ordered Array of the AppBarCommand elements in the AppBar.                        
                        var commands = this.appBarEl.querySelectorAll("." + _Constants.appBarCommandClass);

                        // Needs to be an array, in case these are getting passed to a new layout.
                        // The new layout will invoke the AppBar._layoutCommands, and it expects an 
                        // Array.
                        return Array.prototype.slice.call(commands);
                    }
                },
                connect: function _AppBarBaseLayout_connect(appBarEl) {
                    if (this.className) {
                        _ElementUtilities.addClass(appBarEl, this.className);
                    }
                    this.appBarEl = appBarEl;
                },
                disconnect: function _AppBarBaseLayout_disconnect() {
                    if (this.className) {
                        _ElementUtilities.removeClass(this.appBarEl, this.className);
                    }
                    this.appBarEl = null;
                    this.dispose();
                },
                layout: function _AppBarBaseLayout_layout(commands) {
                    // Append commands to the DOM.
                    var len = commands.length;
                    for (var i = 0; i < len; i++) {
                        var command = this.sanitizeCommand(commands[i]);
                        this.appBarEl.appendChild(command._element);
                    }
                },
                sanitizeCommand: function _AppBarBaseLayout_sanitizeCommand(command) {
                    if (!command) {
                        throw new _ErrorFromName("WinJS.UI.AppBar.NullCommand", strings.nullCommand);
                    }
                    // See if it's a command already
                    command = command.winControl || command;
                    if (!command._element) {
                        // Not a command, so assume it is options for the command's constructor.
                        command = new _Command.AppBarCommand(null, command);
                    }
                    // If we were attached somewhere else, detach us
                    if (command._element.parentElement) {
                        command._element.parentElement.removeChild(command._element);
                    }

                    return command;
                },
                dispose: function _AppBarBaseLayout_dispose() {
                    this._disposed = true;
                },
                disposeChildren: function _AppBarBaseLayout_disposeChildren() {
                    var appBarFirstDiv = this.appBarEl.querySelectorAll("." + _Constants.firstDivClass);
                    appBarFirstDiv = appBarFirstDiv.length >= 1 ? appBarFirstDiv[0] : null;
                    var appBarFinalDiv = this.appBarEl.querySelectorAll("." + _Constants.finalDivClass);
                    appBarFinalDiv = appBarFinalDiv.length >= 1 ? appBarFinalDiv[0] : null;

                    var children = this.appBarEl.children;
                    var length = children.length;
                    for (var i = 0; i < length; i++) {
                        var element = children[i];
                        if (element === appBarFirstDiv || element === appBarFinalDiv) {
                            continue;
                        } else {
                            _Dispose.disposeSubTree(element);
                        }
                    }
                },
                handleKeyDown: function _AppBarBaseLayout_handleKeyDown() {
                    // NOP
                },
                commandsUpdated: function _AppBarBaseLayout_commandsUpdated() {
                    // NOP
                },
                beginAnimateCommands: function _AppBarBaseLayout_beginAnimateCommands() {
                    // The parameters are 3 mutually exclusive arrays of win-command elements contained in this Overlay.
                    // 1) showCommands[]: All of the HIDDEN win-command elements that ARE scheduled to show. 
                    // 2) hideCommands[]: All of the VISIBLE win-command elements that ARE scheduled to hide.
                    // 3) otherVisibleCommands[]: All VISIBLE win-command elements that ARE NOT scheduled to hide. 

                    // NOP
                },
                endAnimateCommands: function _AppBarBaseLayout_endAnimateCommands() {
                    // NOP
                },
                scale: function _AppBarBaseLayout_scale() {
                    // NOP
                },
                resize: function _AppBarBaseLayout_resize() {
                    // NOP
                },
            });
            return _AppBarBaseLayout;
        }),
    });

    // AppBar will use this when AppBar.layout property is set to "commands"
    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        _AppBarCommandsLayout: _Base.Namespace._lazy(function () {
            var layoutClassName = _Constants.commandLayoutClass;
            var layoutType = _Constants.appBarLayoutCommands;

            var _AppBarCommandsLayout = _Base.Class.derive(exports._AppBarBaseLayout, function _AppBarCommandsLayout_ctor(appBarEl) {
                exports._AppBarBaseLayout.call(this, appBarEl, {_className: layoutClassName, _type: layoutType});
                this._commandLayoutsInit(appBarEl);
            }, {
                _getWidthOfFullSizeCommands: function _AppBarCommandsLayout_getWidthOfFullSizeCommands(commands) {
                    // Commands layout puts primary commands and secondary commands into the primary row.
                    // Return the total width of all visible primary and secondary commands as if they were full-size.

                    // Perform any pending measurements on "content" type AppBarCommands.
                    if (this._needToMeasureNewCommands) {
                        this._measureContentCommands();
                    }
                    var accumulatedWidth = 0;
                    var separatorsCount = 0;
                    var buttonsCount = 0;

                    if (!commands) {
                        // Return the cached full size width of the last known visible commands in the AppBar.
                        return this._fullSizeWidthOfLastKnownVisibleCommands;
                    } else {
                        // Return the width of the specified commands.
                        var command;
                        for (var i = 0, len = commands.length; i < len; i++) {
                            command = commands[i].winControl || commands[i];
                            if (command._type === _Constants.typeSeparator) {
                                separatorsCount++;
                            } else if (command._type !== _Constants.typeContent) {
                                // button, toggle, and flyout types all have the same width.
                                buttonsCount++;
                            } else {
                                accumulatedWidth += command._fullSizeWidth;
                            }
                        }
                    }
                    return accumulatedWidth += (separatorsCount * _Constants.separatorWidth) + (buttonsCount * _Constants.buttonWidth);
                },
                _getFocusableCommandsInLogicalOrder: function _AppBarCommandsLayout_getCommandsInLogicalOrder() {
                    // Function returns an array of all the contained AppBarCommands which are reachable by left/right arrows.

                    var selectionCommands = this._secondaryCommands.children,
                        globalCommands = this._primaryCommands.children,
                        focusedIndex = -1;

                    var getFocusableCommandsHelper = function (commandsInReach) {
                        var focusableCommands = [];
                        for (var i = 0, len = commandsInReach.length; i < len; i++) {
                            var element = commandsInReach[i];
                            if (_ElementUtilities.hasClass(element, _Constants.appBarCommandClass) && element.winControl) {
                                var containsFocus = element.contains(_Global.document.activeElement);
                                // With the inclusion of content type commands, it may be possible to tab to elements in AppBarCommands that are not reachable by arrow keys.
                                // Regardless, when an AppBarCommand contains the element with focus, we just include the whole command so that we can determine which
                                // commands are adjacent to it when looking for the next focus destination.
                                if (element.winControl._isFocusable() || containsFocus) {
                                    focusableCommands.push(element);
                                    if (containsFocus) {
                                        focusedIndex = focusableCommands.length - 1;
                                    }
                                }
                            }
                        }
                        return focusableCommands;
                    };

                    // Determines which set of commands the user could potentially reach through Home, End, and arrow keys.
                    // All commands in the commands layout AppBar, from left to right are in reach. Selection then Global.
                    var commandsInReach = Array.prototype.slice.call(selectionCommands).concat(Array.prototype.slice.call(globalCommands));

                    var focusableCommands = getFocusableCommandsHelper(commandsInReach);
                    focusableCommands.focusedIndex = focusedIndex;
                    return focusableCommands;
                },
            });

            // Override some our base implementations and expand our API surface with the commandLayoutsMixin object.
            _Base.Class.mix(_AppBarCommandsLayout, _commandLayoutsMixin);
            return _AppBarCommandsLayout;
        }),
    });

    // These are functions and properties that any new command layout would want to share with our existing "commands" layout.
    var _commandLayoutsMixin = {
        layout: function _commandLayoutsMixin_layout(commands) {
            // Insert commands and other layout specific DOM into the AppBar element.

            // Empty our tree.
            _ElementUtilities.empty(this._primaryCommands);
            _ElementUtilities.empty(this._secondaryCommands);

            // Keep track of the order we receive the commands in.
            this._commandsInOriginalOrder = [];

            // Layout commands
            for (var i = 0, len = commands.length; i < len; i++) {
                var command = this.sanitizeCommand(commands[i]);

                this._commandsInOriginalOrder.push(command.element);

                if ("global" === command.section) {
                    this._primaryCommands.appendChild(command._element);
                } else {
                    this._secondaryCommands.appendChild(command._element);
                }
            }

            // Append layout containers to AppBar element. 
            // Secondary Commands should come first in Tab Order.
            this.appBarEl.appendChild(this._secondaryCommands);
            this.appBarEl.appendChild(this._primaryCommands);


            // Need to measure all content commands after they have been added to the AppBar to make sure we allow 
            // user defined CSS rules based on the ancestor of the content command to take affect.                     
            this._needToMeasureNewCommands = true;

            // In case this is called from the constructor before the AppBar element has been appended to the DOM, 
            // we schedule the initial scaling of commands, with the expectation that the element will be added 
            // synchronously, in the same block of code that called the constructor.
            Scheduler.schedule(function () {
                if (this._needToMeasureNewCommands && !this._disposed) {
                    this.scale();
                }
            }.bind(this), Scheduler.Priority.idle, this, "WinJS._commandLayoutsMixin._scaleNewCommands");

        },
        commandsInOrder: {
            get: function () {
                return this._commandsInOriginalOrder.filter(function (command) {
                    // Make sure the element is still in the AppBar.
                    return this.appBarEl.contains(command);
                }, this);
            }
        },
        disposeChildren: function _commandLayoutsMixin_disposeChildren() {
            _Dispose.disposeSubTree(this._primaryCommands);
            _Dispose.disposeSubTree(this._secondaryCommands);
        },
        handleKeyDown: function _commandLayoutsMixin_handleKeyDown(event) {
            var Key = _ElementUtilities.Key;

            if (_ElementUtilities._matchesSelector(event.target, ".win-interactive, .win-interactive *")) {
                return; // Ignore left, right, home & end keys if focused element has win-interactive class.
            }
            var rtl = _Global.getComputedStyle(this.appBarEl).direction === "rtl";
            var leftKey = rtl ? Key.rightArrow : Key.leftArrow;
            var rightKey = rtl ? Key.leftArrow : Key.rightArrow;

            if (event.keyCode === leftKey || event.keyCode === rightKey || event.keyCode === Key.home || event.keyCode === Key.end) {

                var globalCommandHasFocus = this._primaryCommands.contains(_Global.document.activeElement);
                var focusableCommands = this._getFocusableCommandsInLogicalOrder(globalCommandHasFocus);
                var targetCommand;

                if (focusableCommands.length) {
                    switch (event.keyCode) {
                        case leftKey:
                            // Arrowing past the last command wraps back around to the first command.
                            var index = Math.max(-1, focusableCommands.focusedIndex - 1) + focusableCommands.length;
                            targetCommand = focusableCommands[index % focusableCommands.length].winControl.lastElementFocus;
                            break;

                        case rightKey:
                            // Arrowing previous to the first command wraps back around to the last command.
                            var index = focusableCommands.focusedIndex + 1 + focusableCommands.length;
                            targetCommand = focusableCommands[index % focusableCommands.length].winControl.firstElementFocus;
                            break;

                        case Key.home:
                            var index = 0;
                            targetCommand = focusableCommands[index].winControl.firstElementFocus;
                            break;

                        case Key.end:
                            var index = focusableCommands.length - 1;
                            targetCommand = focusableCommands[index].winControl.lastElementFocus;
                            break;
                    }
                }

                if (targetCommand) {
                    targetCommand.focus();
                    // Prevent default so that the browser doesn't also evaluate the keydown event on the newly focused element.
                    event.preventDefault();
                }
            }
        },
        commandsUpdated: function _commandLayoutsMixin_commandsUpdated(newSetOfVisibleCommands) {
            // Whenever new commands are set or existing commands are hiding/showing in the AppBar, this
            // function is called to update the cached width measurement of all visible AppBarCommands.            

            var visibleCommands = (newSetOfVisibleCommands) ? newSetOfVisibleCommands : this.commandsInOrder.filter(function (command) {
                return !command.winControl.hidden;
            });
            this._fullSizeWidthOfLastKnownVisibleCommands = this._getWidthOfFullSizeCommands(visibleCommands);
        },
        beginAnimateCommands: function _commandLayoutsMixin_beginAnimateCommands(showCommands, hideCommands, otherVisibleCommands) {
            // The parameters are 3 mutually exclusive arrays of win-command elements contained in this Overlay.
            // 1) showCommands[]: All of the HIDDEN win-command elements that ARE scheduled to show. 
            // 2) hideCommands[]: All of the VISIBLE win-command elements that ARE scheduled to hide.
            // 3) otherVisibleCommands[]: All VISIBLE win-command elements that ARE NOT scheduled to hide.                               

            this._scaleAfterAnimations = false;

            // Determine if the overall width of visible commands in the primary row will be increasing OR decreasing.                        
            var changeInWidth = this._getWidthOfFullSizeCommands(showCommands) - this._getWidthOfFullSizeCommands(hideCommands);
            if (changeInWidth > 0) {
                // Width of contents is going to increase, update our command counts now, to what they will be after we complete the animations.
                var visibleCommandsAfterAnimations = otherVisibleCommands.concat(showCommands);
                this.commandsUpdated(visibleCommandsAfterAnimations);
                // Make sure we will have enough room to fit everything on a single row.
                this.scale();
            } else if (changeInWidth < 0) {
                // Width of contents is going to decrease. Once animations are complete, check if 
                // there is enough available space to make the remaining commands full size.
                this._scaleAfterAnimations = true;
            }
        },
        endAnimateCommands: function _commandLayoutsMixin_endAnimateCommands() {
            if (this._scaleAfterAnimations) {
                this.commandsUpdated();
                this.scale();
            }
        },
        scale: function _commandLayoutsMixin_scale() {
            // If the total width of all AppBarCommands in the primary row is greater than the
            // width of the AppBar, add the win-reduced class to the AppBar element and all 
            // AppBarCommands will reduce in size.

            // Measure the width all visible commands in  AppBar's primary row, the AppBar's offsetWidth and the AppBar horizontal padding:
            var fullSizeWidthOfVisibleContent = this._getWidthOfFullSizeCommands();
            if (this._appBarTotalKnownWidth !== +this._appBarTotalKnownWidth) {
                this._appBarTotalKnownWidth = this._scaleHelper();
            }

            if (fullSizeWidthOfVisibleContent <= this._appBarTotalKnownWidth) {
                // Full size commands
                _ElementUtilities.removeClass(this.appBarEl, _Constants.reducedClass);
            } else {
                // Reduced size commands
                _ElementUtilities.addClass(this.appBarEl, _Constants.reducedClass);
            }
        },
        resize: function _commandLayoutsMixin_resize() {
            if (!this._disposed) {
                // Check for horizontal window resizes.
                this._appBarTotalKnownWidth = null;
                if (!this.appBarEl.winControl.hidden) {
                    this.scale();
                }
            }
        },
        _commandLayoutsInit: function _commandLayoutsMixin_commandLayoutsInit() {
            // Create layout infrastructure
            this._primaryCommands = _Global.document.createElement("DIV");
            this._secondaryCommands = _Global.document.createElement("DIV");
            _ElementUtilities.addClass(this._primaryCommands, _Constants.primaryCommandsClass);
            _ElementUtilities.addClass(this._secondaryCommands, _Constants.secondaryCommandsClass);
        },
        _scaleHelper: function _commandLayoutsMixin_scaleHelper() {
            // This exists as a single line function so that unit tests can 
            // overwrite it since they can't resize the WWA window.

            // It is expected that AppBar is an immediate child of the <body> and will have 100% width.
            // We measure the clientWidth of the documentElement so that we can scale the AppBar lazily
            // even while its element is display: 'none'
            var extraPadding = this.appBarEl.winControl.closedDisplayMode === "minimal" ? _Constants.appBarInvokeButtonWidth : 0;
            return _Global.document.documentElement.clientWidth - extraPadding;
        },
        _measureContentCommands: function _commandLayoutsMixin_measureContentCommands() {
            // AppBar measures the width of content commands when they are first added
            // and then caches that value to avoid additional layouts in the future.     

            // Can't measure unless We're in the document body     
            if (_Global.document.body.contains(this.appBarEl)) {
                this._needToMeasureNewCommands = false;

                // Remove the reducedClass from AppBar to ensure fullsize measurements
                var hadReducedClass = _ElementUtilities.hasClass(this.appBarEl, _Constants.reducedClass);
                _ElementUtilities.removeClass(this.appBarEl, _Constants.reducedClass);

                var hadHiddenClass = _ElementUtilities.hasClass(this.appBarEl, _Constants.hiddenClass);
                _ElementUtilities.removeClass(this.appBarEl, _Constants.hiddenClass);

                // Make sure AppBar and children have width dimensions.
                var prevAppBarDisplay = this.appBarEl.style.display;
                this.appBarEl.style.display = "";
                var prevCommandDisplay;

                var contentElements = this.appBarEl.querySelectorAll("div." + _Constants.appBarCommandClass);
                var element;
                for (var i = 0, len = contentElements.length; i < len; i++) {
                    element = contentElements[i];
                    if (element.winControl && element.winControl._type === _Constants.typeContent) {
                        // Make sure command has width dimensions before we measure.
                        prevCommandDisplay = element.style.display;
                        element.style.display = "";
                        element.winControl._fullSizeWidth = _ElementUtilities.getTotalWidth(element) || 0;
                        element.style.display = prevCommandDisplay;
                    }
                }

                // Restore state to AppBar.
                this.appBarEl.style.display = prevAppBarDisplay;
                if (hadReducedClass) {
                    _ElementUtilities.addClass(this.appBarEl, _Constants.reducedClass);
                }
                if (hadHiddenClass) {
                    _ElementUtilities.addClass(this.appBarEl, _Constants.hiddenClass);
                }

                this.commandsUpdated();
            }
        },
    };
});

// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// AppBar
/// <dictionary>appbar,appBars,Flyout,Flyouts,iframe,Statics,unfocus,WinJS</dictionary>
define('WinJS/Controls/AppBar',[
    'exports',
    '../Core/_Global',
    '../Core/_WinRT',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_ErrorFromName',
    '../Core/_Resources',
    '../Core/_WriteProfilerMark',
    '../Animations',
    '../Promise',
    '../Scheduler',
    '../Utilities/_Control',
    '../Utilities/_Dispose',
    '../Utilities/_ElementUtilities',
    '../Utilities/_KeyboardBehavior',
    '../Utilities/_UIUtilities',
    './AppBar/_Constants',
    './AppBar/_Layouts',
    './AppBar/_Command',
    './AppBar/_Icon',
    './Flyout/_Overlay',
    'require-style!less/desktop/controls',
    'require-style!less/phone/controls'
], function appBarInit(exports, _Global, _WinRT, _Base, _BaseUtils, _ErrorFromName, _Resources, _WriteProfilerMark, Animations, Promise, Scheduler, _Control, _Dispose, _ElementUtilities, _KeyboardBehavior, _UIUtilities, _Constants, _Layouts, _Command, _Icon, _Overlay) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.AppBar">
        /// Represents an application toolbar for display commands.
        /// </summary>
        /// </field>
        /// <icon src="ui_winjs.ui.appbar.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.appbar.16x16.png" width="16" height="16" />
        /// <htmlSnippet supportsContent="true"><![CDATA[<div data-win-control="WinJS.UI.AppBar">
        /// <button data-win-control="WinJS.UI.AppBarCommand" data-win-options="{id:'',label:'example',icon:'back',type:'button',onclick:null,section:'global'}"></button>
        /// </div>]]></htmlSnippet>
        /// <event name="beforeshow" locid="WinJS.UI.AppBar_e:beforeshow">Raised just before showing the AppBar.</event>
        /// <event name="aftershow" locid="WinJS.UI.AppBar_e:aftershow">Raised immediately after the AppBar is fully shown.</event>
        /// <event name="beforehide" locid="WinJS.UI.AppBar_e:beforehide">Raised just before hiding the AppBar.</event>
        /// <event name="afterhide" locid="WinJS.UI.AppBar_e:afterhide">Raised immediately after the AppBar is fully hidden.</event>
        /// <part name="appbar" class="win-commandlayout" locid="WinJS.UI.AppBar_part:appbar">The AppBar control itself.</part>
        /// <part name="appBarCustom" class="win-appbar" locid="WinJS.UI.AppBar_part:appBarCustom">Style for a custom layout AppBar.</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        AppBar: _Base.Namespace._lazy(function () {
            var Key = _ElementUtilities.Key;

            // Enum of known constant pixel values for display modes. 
            var knownVisibleHeights = {
                disabled: 0,
                none: 0,
                hidden: 0,
                minimal: 25,
            };

            // Maps each notion of a display modes to the corresponding visible position
            var displayModeVisiblePositions = {
                disabled: "hidden",
                none: "hidden",
                hidden: "hidden",
                minimal: "minimal",
                shown: "shown",
            };

            // Enum of closedDisplayMode constants 
            var closedDisplayModes = {
                none: "none",
                minimal: "minimal",
            };

            // Constants shown/hidden states
            var appbarShownState = "shown",
                appbarHiddenState = "hidden";

            // Hook into event
            var appBarCommandEvent = false;
            var edgyHappening = null;

            // Handler for the edgy starting/completed/cancelled events
            function _completedEdgy(e) {
                // If we had a right click on a flyout, ignore it.
                if (_Overlay._Overlay._rightMouseMightEdgy &&
                    e.kind === _WinRT.Windows.UI.Input.EdgeGestureKind.mouse) {
                    return;
                }
                if (edgyHappening) {
                    // Edgy was happening, just skip it
                    edgyHappening = null;
                } else {
                    // Edgy wasn't happening, so toggle
                    var keyboardInvoked = e.kind === _WinRT.Windows.UI.Input.EdgeGestureKind.keyboard;
                    AppBar._toggleAppBarEdgy(keyboardInvoked);
                }
            }

            function _startingEdgy() {
                if (!edgyHappening) {
                    // Edgy wasn't happening, so toggle & start it
                    edgyHappening = AppBar._toggleAppBarEdgy(false);
                }
            }

            function _canceledEdgy() {
                // Shouldn't get here unless edgy was happening.
                // Undo whatever we were doing.
                var bars = _getDynamicBarsForEdgy();
                if (edgyHappening === "showing") {
                    _Overlay._Overlay._hideAllBars(bars, false);
                } else if (edgyHappening === "hiding") {
                    _showAllBars(bars, false);
                }
                edgyHappening = null;
            }

            function _allManipulationChanged(event) {
                var elements = _Global.document.querySelectorAll("." + _Constants.appBarClass);
                if (elements) {
                    var len = elements.length;
                    for (var i = 0; i < len; i++) {
                        var element = elements[i];
                        var appbar = element.winControl;
                        if (appbar && !element.disabled) {
                            appbar._manipulationChanged(event);
                        }
                    }
                }
            }

            // Get all the non-sticky bars and return them.
            // Returns array of AppBar objects.
            // The array also has _hidden and/or _shown set if ANY are hidden or shown.
            function _getDynamicBarsForEdgy() {
                var elements = _Global.document.querySelectorAll("." + _Constants.appBarClass);
                var len = elements.length;
                var AppBars = [];
                AppBars._shown = false;
                AppBars._hidden = false;
                for (var i = 0; i < len; i++) {
                    var element = elements[i];
                    if (element.disabled) {
                        // Skip disabled AppBars
                        continue;
                    }
                    var AppBar = element.winControl;
                    if (AppBar) {
                        AppBars.push(AppBar);
                        if (_ElementUtilities.hasClass(AppBar._element, _Constants.hiddenClass) || _ElementUtilities.hasClass(AppBar._element, _Constants.hidingClass)) {
                                AppBars._hidden = true;
                            } else {
                            AppBars._shown = true;
                            }
                            }
                        }

                return AppBars;
            }

            function _showAllBars(bars, keyboardInvoked) {
                var len = bars.length;
                var allBarsAnimationPromises = new Array(len);
                for (var i = 0; i < len; i++) {
                    bars[i]._keyboardInvoked = keyboardInvoked;
                    bars[i]._doNotFocus = false;
                    bars[i]._show();
                    allBarsAnimationPromises[i] = bars[i]._animationPromise;
                }
                return Promise.join(allBarsAnimationPromises);
            }

            // Sets focus to the last AppBar in the provided appBars array with given placement.
            // Returns true if focus was set.  False otherwise.
            function _setFocusToPreviousAppBarHelper(startIndex, appBarPlacement, appBars) {
                for (var i = startIndex; i >= 0; i--) {
                    if (appBars[i].winControl
                     && appBars[i].winControl.placement === appBarPlacement
                     && !appBars[i].winControl.hidden
                     && appBars[i].winControl._focusOnLastFocusableElement
                     && appBars[i].winControl._focusOnLastFocusableElement()) {
                        return true;
                    }
                }
                return false;
            }

            // Sets focus to the last tab stop of the previous AppBar
            // AppBar tabbing order:
            //    1) Bottom AppBars
            //    2) Top AppBars
            // DOM order is respected, because an AppBar should not have a defined tabIndex
            function _setFocusToPreviousAppBar() {
                /*jshint validthis: true */
                var appBars = _Global.document.querySelectorAll("." + _Constants.appBarClass);
                if (!appBars.length) {
                    return;
                }

                var thisAppBarIndex = 0;
                for (var i = 0; i < appBars.length; i++) {
                    if (appBars[i] === this.parentElement) {
                        thisAppBarIndex = i;
                        break;
                    }
                }

                var appBarControl = this.parentElement.winControl;
                if (appBarControl.placement === _Constants.appBarPlacementBottom) {
                    // Bottom appBar: Focus order: (1)previous bottom appBars (2)top appBars (3)bottom appBars
                    if (thisAppBarIndex && _setFocusToPreviousAppBarHelper(thisAppBarIndex - 1, _Constants.appBarPlacementBottom, appBars)) { return; }
                    if (_setFocusToPreviousAppBarHelper(appBars.length - 1, _Constants.appBarPlacementTop, appBars)) { return; }
                    if (_setFocusToPreviousAppBarHelper(appBars.length - 1, _Constants.appBarPlacementBottom, appBars)) { return; }
                } else if (appBarControl.placement === _Constants.appBarPlacementTop) {
                    // Top appBar: Focus order: (1)previous top appBars (2)bottom appBars (3)top appBars
                    if (thisAppBarIndex && _setFocusToPreviousAppBarHelper(thisAppBarIndex - 1, _Constants.appBarPlacementTop, appBars)) { return; }
                    if (_setFocusToPreviousAppBarHelper(appBars.length - 1, _Constants.appBarPlacementBottom, appBars)) { return; }
                    if (_setFocusToPreviousAppBarHelper(appBars.length - 1, _Constants.appBarPlacementTop, appBars)) { return; }
                }
            }

            // Sets focus to the first AppBar in the provided appBars array with given placement.
            // Returns true if focus was set.  False otherwise.
            function _setFocusToNextAppBarHelper(startIndex, appBarPlacement, appBars) {
                var appBar;
                for (var i = startIndex; i < appBars.length; i++) {
                    appBar = appBars[i].winControl;
                    if (appBar
                     && appBar.placement === appBarPlacement
                     && appBar.hidden
                     && appBar._focusOnFirstFocusableElement
                     && appBar._focusOnFirstFocusableElement()) {
                        return true;
                    }
                }
                return false;
            }

            // Sets focus to the first tab stop of the next AppBar
            // AppBar tabbing order:
            //    1) Bottom AppBars
            //    2) Top AppBars
            // DOM order is respected, because an AppBar should not have a defined tabIndex
            function _setFocusToNextAppBar() {
                /*jshint validthis: true */
                var appBars = _Global.document.querySelectorAll("." + _Constants.appBarClass);

                var thisAppBarIndex = 0;
                for (var i = 0; i < appBars.length; i++) {
                    if (appBars[i] === this.parentElement) {
                        thisAppBarIndex = i;
                        break;
                    }
                }

                if (this.parentElement.winControl.placement === _Constants.appBarPlacementBottom) {
                    // Bottom appBar: Focus order: (1)next bottom appBars (2)top appBars (3)bottom appBars
                    if (_setFocusToNextAppBarHelper(thisAppBarIndex + 1, _Constants.appBarPlacementBottom, appBars)) { return; }
                    if (_setFocusToNextAppBarHelper(0, _Constants.appBarPlacementTop, appBars)) { return; }
                    if (_setFocusToNextAppBarHelper(0, _Constants.appBarPlacementBottom, appBars)) { return; }
                } else if (this.parentElement.winControl.placement === _Constants.appBarPlacementTop) {
                    // Top appBar: Focus order: (1)next top appBars (2)bottom appBars (3)top appBars
                    if (_setFocusToNextAppBarHelper(thisAppBarIndex + 1, _Constants.appBarPlacementTop, appBars)) { return; }
                    if (_setFocusToNextAppBarHelper(0, _Constants.appBarPlacementBottom, appBars)) { return; }
                    if (_setFocusToNextAppBarHelper(0, _Constants.appBarPlacementTop, appBars)) { return; }
                }
            }

            // Updates the firstDiv & finalDiv of all shown AppBars
            function _updateAllAppBarsFirstAndFinalDiv() {
                var appBars = _Global.document.querySelectorAll("." + _Constants.appBarClass);
                var appBar;
                for (var i = 0; i < appBars.length; i++) {
                    appBar = appBars[i].winControl;
                    if (appBar
                     && !appBar.hidden
                     && appBar._updateFirstAndFinalDiv) {
                        appBar._updateFirstAndFinalDiv();
                    }
                }
            }

            // Returns true if a visible non-sticky (light dismiss) AppBar is found in the document
            function _isThereVisibleNonStickyBar() {
                var appBars = _Global.document.querySelectorAll("." + _Constants.appBarClass);
                for (var i = 0; i < appBars.length; i++) {
                    var appBarControl = appBars[i].winControl;
                    if (appBarControl && !appBarControl.sticky &&
                        (!appBarControl.hidden || appBarControl._element.winAnimating === displayModeVisiblePositions.shown)) {
                        return true;
                    }
                }
                return false;
            }

            // If the previous focus was not a AppBar or CED, store it in the cache
            // (_isAppBarOrChild tests CED for us).
            function _checkStorePreviousFocus(focusEvent) {
                if (focusEvent.relatedTarget
                 && focusEvent.relatedTarget.focus
                 && !_Overlay._Overlay._isAppBarOrChild(focusEvent.relatedTarget)) {
                    _storePreviousFocus(focusEvent.relatedTarget);
                }
            }

            // Cache the previous focus information
            function _storePreviousFocus(element) {
                if (element) {
                    _Overlay._Overlay._ElementWithFocusPreviousToAppBar = element;
                }
            }

            // Try to return focus to what had focus before.
            // If successfully return focus to a textbox, restore the selection too.
            function _restorePreviousFocus() {
                _Overlay._Overlay._trySetActive(_Overlay._Overlay._ElementWithFocusPreviousToAppBar);
            }

            var strings = {
                get ariaLabel() { return _Resources._getWinJSString("ui/appBarAriaLabel").value; },
                get requiresCommands() { return _Resources._getWinJSString("ui/requiresCommands").value; },
                get cannotChangePlacementWhenVisible() { return _Resources._getWinJSString("ui/cannotChangePlacementWhenVisible").value; },
                get badLayout() { return _Resources._getWinJSString("ui/badLayout").value; },
                get cannotChangeLayoutWhenVisible() { return _Resources._getWinJSString("ui/cannotChangeLayoutWhenVisible").value; }
            };

            var appBarSynchronizationPromise = Promise.as();

            var AppBar = _Base.Class.derive(_Overlay._Overlay, function AppBar_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.AppBar.AppBar">
                /// <summary locid="WinJS.UI.AppBar.constructor">
                /// Creates a new AppBar control.
                /// </summary>
                /// <param name="element" type="HTMLElement" domElement="true" locid="WinJS.UI.AppBar.constructor_p:element">
                /// The DOM element that will host the control.
                /// </param>
                /// <param name="options" type="Object" locid="WinJS.UI.AppBar.constructor_p:options">
                /// The set of properties and values to apply to the new AppBar control.
                /// </param>
                /// <returns type="WinJS.UI.AppBar" locid="WinJS.UI.AppBar.constructor_returnValue">
                /// The new AppBar control.
                /// </returns>
                /// </signature>

                this._initializing = true;

                // Simplify checking later
                options = options || {};

                // Make sure there's an element            
                this._element = element || _Global.document.createElement("div");
                this._id = this._element.id || _ElementUtilities._uniqueID(this._element);
                this._writeProfilerMark("constructor,StartTM");

                if (!this._element.hasAttribute("tabIndex")) {
                    this._element.tabIndex = -1;
                }

                // Attach our css class.
                _ElementUtilities.addClass(this._element, _Constants.appBarClass);

                // Make sure we have an ARIA role
                var role = this._element.getAttribute("role");
                if (!role) {
                    this._element.setAttribute("role", "menubar");
                }
                var label = this._element.getAttribute("aria-label");
                if (!label) {
                    this._element.setAttribute("aria-label", strings.ariaLabel);
                }

                // Call the _Overlay constructor helper to finish setting up our element.
                // Don't pass constructor options, AppBar needs to set those itself specific order.
                this._baseOverlayConstructor(this._element);

                // Start off hidden
                this._lastPositionVisited = displayModeVisiblePositions.none;
                _ElementUtilities.addClass(this._element, _Constants.hiddenClass);

                // validate that if they didn't set commands, but want command
                // layout that the HTML only contains commands.  Do this first
                // so that we don't leave partial AppBars in the DOM.
                if (options.layout !== _Constants.appBarLayoutCustom && !options.commands && this._element) {
                    // Shallow copy object so we can modify it.
                    options = _BaseUtils._shallowCopy(options);
                    options.commands = this._verifyCommandsOnly(this._element, "WinJS.UI.AppBarCommand");
                }

                // Add Invoke button.
                this._invokeButton = _Global.document.createElement("DIV");
                this._invokeButton.tabIndex = 0;
                this._invokeButton.innerHTML = "<span class='" + _Constants.ellipsisClass + "'></span>";
                _ElementUtilities.addClass(this._invokeButton, _Constants.invokeButtonClass);
                this._element.appendChild(this._invokeButton);
                this._invokeButtonPointerDown = function AppBar_invokeButtonPointerDown() {
                    _Overlay._Overlay._addHideFocusClass(this._invokeButton);
                };
                this._invokeButtonClick = function AppBar_invokeButtonClick() {
                    AppBar._toggleAppBarEdgy(_KeyboardBehavior._keyboardSeenLast);
                };
                this._invokeButton.addEventListener("pointerdown", this._invokeButtonPointerDown.bind(this), false);
                this._invokeButton.addEventListener("click", this._invokeButtonClick.bind(this), false);


                // Run layout setter immediately. We need to know our layout in order to correctly 
                // position any commands that may be getting set through the constructor. 
                this.layout = options.layout || _Constants.appBarLayoutCommands;
                delete options.layout;

                // Need to set placement before closedDisplayMode, closedDisplayMode sets our starting position, which is dependant on placement.
                this.placement = options.placement || _Constants.appBarPlacementBottom;
                this.closedDisplayMode = options.closedDisplayMode || closedDisplayModes.none;

                _Control.setOptions(this, options);

                this._initializing = false;

                // Make a click eating div
                _Overlay._Overlay._createClickEatingDivAppBar();

                // Handle key down (esc) and (left & right)
                this._element.addEventListener("keydown", this._handleKeyDown.bind(this), false);

                // Attach event handler
                if (!appBarCommandEvent) {
                    // We'll trigger on invoking.  Could also have invoked or canceled
                    // Eventually we may want click up on invoking and drop back on invoked.
                    // Check for namespace so it'll behave in the designer.
                    if (_WinRT.Windows.UI.Input.EdgeGesture) {
                        var commandUI = _WinRT.Windows.UI.Input.EdgeGesture.getForCurrentView();
                        commandUI.addEventListener("starting", _startingEdgy);
                        commandUI.addEventListener("completed", _completedEdgy);
                        commandUI.addEventListener("canceled", _canceledEdgy);
                    }

                    // Need to know if the IHM is done scrolling
                    _Global.document.addEventListener("MSManipulationStateChanged", _allManipulationChanged, false);

                    appBarCommandEvent = true;
                }

                // Make sure _Overlay event handlers are hooked up (this aids light dismiss)
                this._addOverlayEventHandlers(false);

                // Need to store what had focus before
                _ElementUtilities._addEventListener(this._element, "focusin", function (event) { _checkStorePreviousFocus(event); }, false);

                // Need to hide ourselves if we lose focus
                _ElementUtilities._addEventListener(this._element, "focusout", function () { _Overlay._Overlay._hideIfAllAppBarsLostFocus(); }, false);

                // Commands layout AppBar measures and caches its content synchronously in setOptions through the .commands property setter.
                // Remove the commands layout AppBar from the layout tree at this point so we don't cause unnecessary layout costs whenever
                // the window resizes or when CSS changes are applied to the commands layout AppBar's parent element.
                if (this.layout === _Constants.appBarLayoutCommands) {
                    this._element.style.display = "none";
                }

                this._writeProfilerMark("constructor,StopTM");

                return this;
            }, {
                // Public Properties

                /// <field type="String" defaultValue="bottom" oamOptionsDatatype="WinJS.UI.AppBar.placement" locid="WinJS.UI.AppBar.placement" helpKeyword="WinJS.UI.AppBar.placement">The placement of the AppBar on the display.  Values are "top" or "bottom".</field>
                placement: {
                    get: function AppBar_get_placement() {
                        return this._placement;
                    },
                    set: function AppBar_set_placement(value) {
                        // In designer we may have to move it
                        var wasShown = false;
                        if (_WinRT.Windows.ApplicationModel.DesignMode.designModeEnabled) {
                            this._hide();
                            wasShown = true;
                        }

                        if (!this.hidden) {
                            throw new _ErrorFromName("WinJS.UI.AppBar.CannotChangePlacementWhenVisible", strings.cannotChangePlacementWhenVisible);
                        }

                        // Set placement, coerce invalid values to 'bottom'
                        this._placement = (value === _Constants.appBarPlacementTop) ? _Constants.appBarPlacementTop : _Constants.appBarPlacementBottom;

                        // Clean up win-top, win-bottom styles
                        if (this._placement === _Constants.appBarPlacementTop) {
                            _ElementUtilities.addClass(this._element, _Constants.topClass);
                            _ElementUtilities.removeClass(this._element, _Constants.bottomClass);
                        } else if (this._placement === _Constants.appBarPlacementBottom) {
                            _ElementUtilities.removeClass(this._element, _Constants.topClass);
                            _ElementUtilities.addClass(this._element, _Constants.bottomClass);
                        }

                        // Show again if we hid ourselves for the designer
                        if (wasShown) {
                            this._show();
                        }
                    }
                },

                /// <field type="String" defaultValue="commands" oamOptionsDatatype="WinJS.UI.AppBar.layout" locid="WinJS.UI.AppBar.layout" helpKeyword="WinJS.UI.AppBar.layout">
                /// Gets or sets the layout of the AppBar contents to either "commands" or "custom".
                /// </field>
                layout: {
                    get: function AppBar_get_layout() {
                        return this._layout.type;
                    },
                    set: function (layout) {
                        if (layout !== _Constants.appBarLayoutCommands && layout !== _Constants.appBarLayoutCustom) {
                            throw new _ErrorFromName("WinJS.UI.AppBar.BadLayout", strings.badLayout);
                        }

                        // In designer we may have to redraw it
                        var wasShown = false;
                        if (_WinRT.Windows.ApplicationModel.DesignMode.designModeEnabled) {
                            this._hide();
                            wasShown = true;
                        }

                        if (!this.hidden) {
                            throw new _ErrorFromName("WinJS.UI.AppBar.CannotChangeLayoutWhenVisible", strings.cannotChangeLayoutWhenVisible);
                        }

                        var commands;
                        if (!this._initializing) {
                            // Gather commands in preparation for hand off to new layout.
                            // We expect prev layout to return commands in the order they were set in,
                            // not necessarily the current DOM order the layout is using.
                            commands = this._layout.commandsInOrder;
                            this._layout.disconnect();
                        }

                        // Set layout
                        if (layout === _Constants.appBarLayoutCommands) {
                            this._layout = new _Layouts._AppBarCommandsLayout();
                        } else {
                            // Custom layout uses Base AppBar Layout class.
                            this._layout = new _Layouts._AppBarBaseLayout();
                        }
                        this._layout.connect(this._element);

                        if (commands && commands.length) {
                            // Reset AppBar since layout changed.
                            this._layoutCommands(commands);
                        }
                        this._layout.connect(this._element);

                        if (commands && commands.length) {
                            // Reset AppBar since layout changed.
                            this._layoutCommands(commands);
                        }

                        // Show again if we hid ourselves for the designer
                        if (wasShown) {
                            this._show();
                        }
                    },
                    configurable: true
                },

                /// <field type="Boolean" locid="WinJS.UI.AppBar.sticky" isAdvanced="true" helpKeyword="WinJS.UI.AppBar.sticky">
                /// Gets or sets value that indicates whether the AppBar is sticky.
                /// This value is true if the AppBar is sticky; otherwise, it's false.
                /// </field>
                sticky: {
                    get: function AppBar_get_sticky() {
                        return this._sticky;
                    },
                    set: function AppBar_set_sticky(value) {
                        // If it doesn't change, do nothing
                        if (this._sticky === !!value) {
                            return;
                        }

                        this._sticky = !!value;

                        // Note: caller still has to call .show() if also want it shown.

                        // Show or hide the click eating div based on sticky value
                        if (!this.hidden && this._element.style.visibility === "visible") {
                            // May have changed sticky state for keyboard navigation
                            _updateAllAppBarsFirstAndFinalDiv();

                            // Ensure that the click eating div is in the correct state
                            if (this._sticky) {
                                if (!_isThereVisibleNonStickyBar()) {
                                    _Overlay._Overlay._hideClickEatingDivAppBar();
                                }
                            } else {
                                _Overlay._Overlay._showClickEatingDivAppBar();

                                if (this._shouldStealFocus()) {
                                    _storePreviousFocus(_Global.document.activeElement);
                                    this._setFocusToAppBar();
                                }
                            }
                        }
                    }
                },

                /// <field type="Array" locid="WinJS.UI.AppBar.commands" helpKeyword="WinJS.UI.AppBar.commands" isAdvanced="true">
                /// Sets the AppBarCommands in the AppBar. This property accepts an array of AppBarCommand objects.
                /// </field>
                commands: {
                    set: function AppBar_set_commands(commands) {
                        // Fail if trying to set when shown
                        if (!this.hidden) {
                            throw new _ErrorFromName("WinJS.UI.AppBar.CannotChangeCommandsWhenVisible", _Resources._formatString(_Overlay._Overlay.commonstrings.cannotChangeCommandsWhenVisible, "AppBar"));
                        }

                        // Dispose old commands before tossing them out.
                        if (!this._initializing) {
                            // AppBarCommands defined in markup don't want to be disposed during initialization.
                            this._disposeChildren();
                        }
                        this._layoutCommands(commands);
                    }
                },

                _layoutCommands: function AppBar_layoutCommands(commands) {
                    // Function precondition: AppBar must not be shown.

                    // Empties AppBar HTML and repopulates with passed in commands.
                    _ElementUtilities.empty(this._element);
                    this._element.appendChild(this._invokeButton); // Keep our Show/Hide button.

                    // In case they had only one command to set...
                    if (!Array.isArray(commands)) {
                        commands = [commands];
                    }

                    this._layout.layout(commands);
                },

                /// <field type="String" defaultValue="minimal" locid="WinJS.UI.AppBar.closedDisplayMode" helpKeyword="WinJS.UI.AppBar.closedDisplayMode" isAdvanced="true">
                /// Gets/Sets how AppBar will display itself while hidden. Values are "none" and "minimal".
                /// </field>
                closedDisplayMode: {
                    get: function AppBar_get_closedDisplayMode() {
                        return this._closedDisplayMode;
                    },
                    set: function AppBar_set_closedDisplayMode(value) {
                        var oldValue = this._closedDisplayMode;

                        if (oldValue !== value) {
                            if (value === closedDisplayModes.none) {
                                this._closedDisplayMode = closedDisplayModes.none;
                                this._invokeButton.style.display = "none";
                                this._element.style.paddingRight = "";
                                this._element.style.width = "";
                            } else {
                                // Minimal is default fallback.
                                this._closedDisplayMode = closedDisplayModes.minimal;
                                this._invokeButton.style.display = "";
                                this._element.style.paddingRight = _Constants.appBarInvokeButtonWidth + "px";
                                this._element.style.width = "calc(100% - " + _Constants.appBarInvokeButtonWidth + "px)";
                            }

                            // The invoke button has changed the amount of available space in the AppBar. Layout might need to scale.
                            this._layout.resize();

                            if (_ElementUtilities.hasClass(this._element, _Constants.hiddenClass) || _ElementUtilities.hasClass(this._element, _Constants.hidingClass)) {
                                // If the value is being set while we are not showing, change to our new position.
                                this._changeVisiblePosition(displayModeVisiblePositions[this._closedDisplayMode]);
                            }
                        }
                    },
                },

                /// <field type="Boolean" locid="WinJS.UI.AppBar.disabled" helpKeyword="WinJS.UI.AppBar.disabled">
                /// Disable an AppBar, setting or getting the HTML disabled attribute. While disabled, the AppBar is hidden completely, and will not respond to attempts to show it.
                /// </field>
                disabled: {
                    get: function () {
                        // Ensure it's a boolean because we're using the DOM element to keep in-sync
                        return !!this._element.disabled;
                    },
                    set: function (disable) {
                        var disable = !!disable;
                        if (this.disabled !== disable) {
                            this._element.disabled = disable;
                            var toPosition;
                            if (disable) {
                                // Disabling. Move to the position mapped to the disabled state.                                                           
                                toPosition = displayModeVisiblePositions.disabled;
                            } else {
                                // Enabling. Move to the position mapped to our closedDisplayMode.
                                toPosition = displayModeVisiblePositions[this.closedDisplayMode];
                            }
                            this._hide(toPosition);
                        }
                    },
                },

                /// <field type="Boolean" hidden="true" locid="WinJS.UI._AppBar.hidden" helpKeyword="WinJS.UI._AppBar.hidden">Read only, true if an AppBar is 'hidden'.</field>
                hidden: {
                    get: function () {
                        // Returns true if AppBar is 'hidden'.
                        return _ElementUtilities.hasClass(this._element, _Constants.hiddenClass) ||
                            _ElementUtilities.hasClass(this._element, _Constants.hidingClass) ||
                            this._doNext === displayModeVisiblePositions.minimal ||
                            this._doNext === displayModeVisiblePositions.none;
                    },
                },

                getCommandById: function (id) {
                    /// <signature helpKeyword="WinJS.UI.AppBar.getCommandById">
                    /// <summary locid="WinJS.UI.AppBar.getCommandById">
                    /// Retrieves the command with the specified ID from this AppBar.
                    /// If more than one command is found, this method returns them all.
                    /// </summary>
                    /// <param name="id" type="String" locid="WinJS.UI.AppBar.getCommandById_p:id">Id of the command to return.</param>
                    /// <returns type="object" locid="WinJS.UI.AppBar.getCommandById_returnValue">
                    /// The command found, an array of commands if more than one have the same ID, or null if no command is found.
                    /// </returns>
                    /// </signature>
                    var commands = this.element.querySelectorAll("#" + id);
                    var newCommands = [];
                    for (var count = 0, len = commands.length; count < len; count++) {
                        if (commands[count].winControl) {
                            newCommands.push(commands[count].winControl);
                        }
                    }

                    if (newCommands.length === 1) {
                        return newCommands[0];
                    } else if (newCommands.length === 0) {
                        return null;
                    }

                    return newCommands;
                },

                showCommands: function (commands) {
                    /// <signature helpKeyword="WinJS.UI.AppBar.showCommands">
                    /// <summary locid="WinJS.UI.AppBar.showCommands">
                    /// Show the specified commands of the AppBar.
                    /// </summary>
                    /// <param name="commands" type="Array" locid="WinJS.UI.AppBar.showCommands_p:commands">
                    /// An array of the commands to show. The array elements may be AppBarCommand objects, or the string identifiers (IDs) of commands.
                    /// </param>
                    /// </signature>
                    if (!commands) {
                        throw new _ErrorFromName("WinJS.UI.AppBar.RequiresCommands", strings.requiresCommands);
                    }

                    this._showCommands(commands);
                },

                hideCommands: function (commands) {
                    /// <signature helpKeyword="WinJS.UI.AppBar.hideCommands">
                    /// <summary locid="WinJS.UI.AppBar.hideCommands">
                    /// Hides the specified commands of the AppBar.
                    /// </summary>
                    /// <param name="commands" type="Array" locid="WinJS.UI.AppBar.hideCommands_p:commands">Required. Command or Commands to hide, either String, DOM elements, or WinJS objects.</param>
                    /// </signature>
                    if (!commands) {
                        throw new _ErrorFromName("WinJS.UI.AppBar.RequiresCommands", strings.requiresCommands);
                    }

                    this._hideCommands(commands);
                },

                showOnlyCommands: function (commands) {
                    /// <signature helpKeyword="WinJS.UI.AppBar.showOnlyCommands">
                    /// <summary locid="WinJS.UI.AppBar.showOnlyCommands">
                    /// Show the specified commands, hiding all of the others in the AppBar.
                    /// </summary>
                    /// <param name="commands" type="Array" locid="WinJS.UI.AppBar.showOnlyCommands_p:commands">
                    /// An array of the commands to show. The array elements may be AppBarCommand objects, or the string identifiers (IDs) of commands.
                    /// </param>
                    /// </signature>
                    if (!commands) {
                        throw new _ErrorFromName("WinJS.UI.AppBar.RequiresCommands", strings.requiresCommands);
                    }

                    this._showOnlyCommands(commands);
                },

                show: function () {
                    /// <signature helpKeyword="WinJS.UI.AppBar.show">
                    /// <summary locid="WinJS.UI.AppBar.show">
                    /// Shows the AppBar, if hidden and not disabled, regardless of other state.
                    /// </summary>
                    /// </signature>
                    // Just wrap the private one, turning off keyboard invoked flag
                    this._writeProfilerMark("show,StartTM");
                    this._keyboardInvoked = false;
                    this._doNotFocus = !!this.sticky;
                    this._show();
                },

                _show: function AppBar_show() {

                    var toPosition = displayModeVisiblePositions.shown;
                    var showing = null;

                    // If we're already shown, we are just going to animate our position, not fire events or manage focus.
                    if (!this.disabled && (_ElementUtilities.hasClass(this._element, _Constants.hiddenClass) || _ElementUtilities.hasClass(this._element, _Constants.hidingClass))) {
                        showing = appbarShownState;
                    }

                    this._changeVisiblePosition(toPosition, showing);

                    if (showing) {
                        // Configure shown state for lightdismiss & sticky appbars.
                    if (!this.sticky) {
                        // Need click-eating div to be visible ASAP.
                        _Overlay._Overlay._showClickEatingDivAppBar();
                    }

                    // Clean up tabbing behavior by making sure first and final divs are correct after showing.
                    if (!this.sticky && _isThereVisibleNonStickyBar()) {
                        _updateAllAppBarsFirstAndFinalDiv();
                    } else {
                        this._updateFirstAndFinalDiv();
                    }

                    // Check if we should steal focus
                    if (!this._doNotFocus && this._shouldStealFocus()) {
                        // Store what had focus if nothing currently is stored
                        if (!_Overlay._Overlay._ElementWithFocusPreviousToAppBar) {
                            _storePreviousFocus(_Global.document.activeElement);
                        }

                        this._setFocusToAppBar();
                    }
                    }
                },

                hide: function () {
                    /// <signature helpKeyword="WinJS.UI.AppBar.hide">
                    /// <summary locid="WinJS.UI.AppBar.hide">
                    /// Hides the AppBar.
                    /// </summary>
                    /// </signature>
                    // Just wrap the private one
                    this._writeProfilerMark("hide,StartTM");
                    this._hide();
                },

                _hide: function AppBar_hide(toPosition) {

                    var toPosition = toPosition || displayModeVisiblePositions[this.closedDisplayMode];
                    var hiding = null;

                    // If were already hidden, we are just going to animate our position, not fire events or manage focus again.
                    if (!_ElementUtilities.hasClass(this._element, _Constants.hiddenClass) && !_ElementUtilities.hasClass(this._element, _Constants.hidingClass)) {
                        hiding = appbarHiddenState;
                    }

                    this._changeVisiblePosition(toPosition, hiding);
                    if (hiding) {
                        // Determine if there are any AppBars that are shown.
                        // Set the focus to the next shown AppBar.
                    // If there are none, set the focus to the control stored in the cache, which
                    //   is what had focus before the AppBars were given focus.
                    var appBars = _Global.document.querySelectorAll("." + _Constants.appBarClass);
                    var areOtherAppBars = false;
                    var areOtherNonStickyAppBars = false;
                    var i;
                    for (i = 0; i < appBars.length; i++) {
                        var appBarControl = appBars[i].winControl;
                        if (appBarControl && !appBarControl.hidden && (appBarControl !== this)) {
                            areOtherAppBars = true;

                            if (!appBarControl.sticky) {
                                areOtherNonStickyAppBars = true;
                                break;
                            }
                        }
                    }

                    var settingsFlyouts = _Global.document.querySelectorAll("." + _Constants.settingsFlyoutClass);
                    var areVisibleSettingsFlyouts = false;
                    for (i = 0; i < settingsFlyouts.length; i++) {
                        var settingsFlyoutControl = settingsFlyouts[i].winControl;
                        if (settingsFlyoutControl && !settingsFlyoutControl.hidden) {
                            areVisibleSettingsFlyouts = true;
                            break;
                        }
                    }

                    if (!areOtherNonStickyAppBars && !areVisibleSettingsFlyouts) {
                        // Hide the click eating div because there are no other AppBars showing
                        _Overlay._Overlay._hideClickEatingDivAppBar();
                    }

                    var that = this;
                    if (!areOtherAppBars) {
                        // Set focus to what had focus before showing the AppBar
                        if (_Overlay._Overlay._ElementWithFocusPreviousToAppBar &&
                            (!_Global.document.activeElement || _Overlay._Overlay._isAppBarOrChild(_Global.document.activeElement))) {
                            _restorePreviousFocus();
                        }
                        // Always clear the previous focus (to prevent temporary leaking of element)
                        _Overlay._Overlay._ElementWithFocusPreviousToAppBar = null;
                    } else if (AppBar._isWithinAppBarOrChild(_Global.document.activeElement, that.element)) {
                        // Set focus to next visible AppBar in DOM

                        var foundCurrentAppBar = false;
                        for (i = 0; i <= appBars.length; i++) {
                            if (i === appBars.length) {
                                i = 0;
                            }

                            var appBar = appBars[i];
                            if (appBar === this.element) {
                                foundCurrentAppBar = true;
                            } else if (foundCurrentAppBar && !appBar.winControl.hidden) {
                                appBar.winControl._keyboardInvoked = !!this._keyboardInvoked;
                                appBar.winControl._setFocusToAppBar();
                                break;
                            }
                        }
                    }

                    // If we are hiding the last lightDismiss AppBar,
                    //   then we need to update the tabStops of the other AppBars
                    if (!this.sticky && !_isThereVisibleNonStickyBar()) {
                        _updateAllAppBarsFirstAndFinalDiv();
                    }

                    // Reset these values
                    this._keyboardInvoked = false;
                    this._doNotFocus = false;
                    }
                },

                _dispose: function AppBar_dispose() {
                    _Dispose.disposeSubTree(this.element);
                    this._layout.dispose();
                    this.disabled = true;

                },

                _disposeChildren: function AppBar_disposeChildren() {
                    // Be purposeful about what we dispose.
                    this._layout.disposeChildren();
                },

                _handleKeyDown: function AppBar_handleKeyDown(event) {
                    // On Left/Right arrow keys, moves focus to previous/next AppbarCommand element.
                    // On "Esc" key press hide flyouts and hide light dismiss AppBars.

                    // Esc hides light-dismiss AppBars in all layouts but if the user has a text box with an IME 
                    // candidate window open, we want to skip the ESC key event since it is handled by the IME.
                    // When the IME handles a key it sets event.keyCode === Key.IME for an easy check.
                    if (event.keyCode === Key.escape && event.keyCode !== Key.IME) {
                        event.preventDefault();
                        event.stopPropagation();
                        _Overlay._Overlay._hideAllFlyouts();
                        _Overlay._Overlay._hideLightDismissAppBars(null, true);
                    }

                    // Layout might want to handle additional keys
                    this._layout.handleKeyDown(event);
                },

                _visiblePixels: {
                    get: function () {
                        // Returns object containing pixel height of each visible position
                        return {
                            hidden: knownVisibleHeights.hidden,
                            minimal: knownVisibleHeights.minimal,
                            // Element can change size as content gets added or removed or if it 
                            // experinces style changes. We have to look this up at run time.      
                            shown: this._element.offsetHeight,
                        };
                    }
                },

                _visiblePosition: {
                    // Returns string value of our nearest, stationary, visible position.
                    get: function () {
                        // If we're animating into a new posistion, return the position we're animating into.  
                        if (this._animating && displayModeVisiblePositions[this._element.winAnimating]) {
                            return this._element.winAnimating;
                        } else {
                            return this._lastPositionVisited;
                        }
                    }
                },

                _visible: {
                    // Returns true if our visible position is not completely hidden, else false.
                    get: function () {
                        return (this._visiblePosition !== displayModeVisiblePositions.none);
                    }
                },

                _changeVisiblePosition: function (toPosition, newState) {
                    /// <signature helpKeyword="WinJS.UI.AppBar._changeVisiblePosition">
                    /// <summary locid="WinJS.UI.AppBar._changeVisiblePosition">
                    /// Changes the visible position of the AppBar.                    
                    /// </summary>
                    /// <param name="toPosition" type="String" locid="WinJS.UI.AppBar._changeVisiblePosition_p:toPosition">
                    /// Name of the visible position we want to move to.
                    /// </param>
                    /// <param name="newState" type="String" locid="WinJS.UI.AppBar._changeVisiblePosition_p:newState">
                    /// Name of the state we are entering. Values can be "showing", "hiding" or null.
                    /// If the value is null, then we are not changing states, only changing visible position.
                    /// </param>
                    /// </signature>                   

                    if ((this._visiblePosition === toPosition && !this._keyboardObscured) ||
                        (this.disabled && toPosition !== displayModeVisiblePositions.disabled)) {
                        // If we want to go where we already are, or we're disabled, return false.
                        this._afterPositionChange(null);
                    } else if (this._animating || this._needToHandleShowingKeyboard || this._needToHandleHidingKeyboard) {
                        // Only do one thing at a time. If we are already animating, 
                        // or the IHM is animating, schedule this for later.
                        this._doNext = toPosition;
                        this._afterPositionChange(null);
                    } else {
                        // Begin position changing sequence.

                        // Set the animating flag to block any queued position changes until we're done.
                        this._element.winAnimating = toPosition;
                        var performAnimation = this._initializing ? false : true;

                        // Assume we are animating from the last position visited.
                        var fromPosition = this._lastPositionVisited;

                        // We'll need to measure our element to determine how far we need to animate. 
                        // Make sure we have dimensions.
                        this._element.style.display = "";

                        // Are we hiding completely, or about to become visible?
                        var hidingCompletely = (toPosition === displayModeVisiblePositions.hidden);

                        if (this._keyboardObscured) {
                            // We're changing position while covered by the IHM.                        
                            if (hidingCompletely) {
                                // If we're covered by the IHM we already look hidden. 
                                // We can skip our animation and just hide.
                                performAnimation = false;
                            } else {
                                // Some portion of the AppBar should be visible to users after its position changes.

                                // Un-obscure ourselves and become visible to the user again. 
                                // Need to animate to our desired position as if we were coming up from behind the keyboard.
                                fromPosition = displayModeVisiblePositions.hidden;
                            }
                            this._keyboardObscured = false;
                        }

                        // Fire "before" event if we are changing state.
                        if (newState === appbarShownState) {
                            this._beforeShow();
                        } else if (newState === appbarHiddenState) {
                            this._beforeHide();
                        }

                        // Position our element into the correct "end of animation" position, 
                        // also accounting for any viewport scrolling or soft keyboard positioning.                
                        this._ensurePosition();

                        this._animationPromise = (performAnimation) ? this._animatePositionChange(fromPosition, toPosition) : Promise.wrap();
                        this._animationPromise.then(
                            function () { this._afterPositionChange(toPosition, newState); }.bind(this),
                            function () { this._afterPositionChange(toPosition, newState); }.bind(this)
                        );
                    }
                },

                _afterPositionChange: function AppBar_afterPosiitonChange(newPosition, newState) {
                    // Defines body of work to perform after changing positions. 
                    if (this._disposed) {
                        return;
                    }

                    if (newPosition) {
                        // Clear animation flag and record having visited this position.
                        this._element.winAnimating = "";
                        this._lastPositionVisited = newPosition;

                        if (newPosition === displayModeVisiblePositions.hidden) {
                            // Make sure animation is finished.
                            this._element.style.visibility = "hidden";
                            this._element.style.display = "none";
                        }

                        if (this._doNext === this._lastPositionVisited) {
                            this._doNext = "";
                        }

                        // Fire "after" event if we changed state.
                        if (newState === appbarShownState) {
                            this._afterShow();
                        } else if (newState === appbarHiddenState) {
                            this._afterHide();
                        }

                        // If we had something queued, do that
                        Scheduler.schedule(this._checkDoNext, Scheduler.Priority.normal, this, "WinJS.UI.AppBar._checkDoNext");
                    }

                    this._afterPositionChangeCallBack();
                },

                _afterPositionChangeCallBack: function () {
                    // Leave this blank for unit tests to overwrite.
                },

                _beforeShow: function AppBar_beforeShow() {
                    // Each overlay tracks the window width for triggering light-dismiss in the resize handler.
                    this._currentDocumentWidth = this._currentDocumentWidth || _Global.document.documentElement.offsetWidth;

                    // In case their event 'beforeshow' event listener is going to manipulate commands, 
                    // first see if there are any queued command animations we can handle while we're still hidden.
                    if (this._queuedCommandAnimation) {
                        this._showAndHideFast(this._queuedToShow, this._queuedToHide);
                        this._queuedToShow = [];
                        this._queuedToHide = [];
                    }

                    // Make sure everything fits before showinging
                    this._layout.scale();

                    _ElementUtilities.removeClass(this._element, _Constants.hiddenClass);
                    _ElementUtilities.addClass(this._element, _Constants.showingClass);

                    // Send our "beforeShow" event 
                    this._sendEvent(_Overlay._Overlay.beforeShow);
                },

                _afterShow: function AppBar_afterShow() {
                    _ElementUtilities.removeClass(this._element, _Constants.showingClass);
                    _ElementUtilities.addClass(this._element, _Constants.shownClass);

                    // Send our "afterShow" event
                    this._sendEvent(_Overlay._Overlay.afterShow);
                    this._writeProfilerMark("show,StopTM");
                },

                _beforeHide: function AppBar_beforeHide() {

                    _ElementUtilities.removeClass(this._element, _Constants.shownClass);
                    _ElementUtilities.addClass(this._element, _Constants.hidingClass);

                    // Send our "beforeHide" event
                    this._sendEvent(_Overlay._Overlay.beforeHide);
                },

                _afterHide: function AppBar_afterHide() {

                    // In case their 'afterhide' event handler is going to manipulate commands, 
                    // first see if there are any queued command animations we can handle now we're hidden.
                    if (this._queuedCommandAnimation) {
                        this._showAndHideFast(this._queuedToShow, this._queuedToHide);
                        this._queuedToShow = [];
                        this._queuedToHide = [];
                    }

                    _ElementUtilities.removeClass(this._element, _Constants.hidingClass);
                    _ElementUtilities.addClass(this._element, _Constants.hiddenClass);

                    // Send our "afterHide" event
                    this._sendEvent(_Overlay._Overlay.afterHide);
                    this._writeProfilerMark("hide,StopTM");
                },

                _animatePositionChange: function AppBar_animatePositionChange(fromPosition, toPosition) {
                    // Determines and executes the proper transition between visible positions

                    // Get values in terms of pixels to perform animation.
                    var beginningOffset,
                        startingHeight = this._visiblePixels[fromPosition],
                        endingHeight = this._visiblePixels[toPosition],
                        distanceToMove = endingHeight - startingHeight;

                    // Get animation direction and clear other value
                    if (this._placement === _Constants.appBarPlacementTop) {
                        // Top Bar
                        beginningOffset = { top: -distanceToMove + "px", left: "0px" };
                    } else {
                        // Bottom Bar
                        beginningOffset = { top: distanceToMove + "px", left: "0px" };
                    }

                    // Animate
                    this._element.style.opacity = 1;
                    this._element.style.visibility = "visible";
                    return Animations.showEdgeUI(this._element, beginningOffset, { mechanism: "transition" });
                },

                _checkDoNext: function AppBar_checkDoNext() {
                    // Do nothing if we're still animating
                    if (this._animating || this._needToHandleShowingKeyboard || this._needToHandleHidingKeyboard || this._disposed) {
                        return;
                    }

                    if (this._doNext === displayModeVisiblePositions.disabled ||
                        this._doNext === displayModeVisiblePositions.hidden ||
                        this._doNext === displayModeVisiblePositions.minimal) {
                        // Do hide first because animating commands would be easier
                        this._hide(this._doNext);
                        this._doNext = "";
                    } else if (this._queuedCommandAnimation) {
                        // Do queued commands before showing if possible
                        this._showAndHideQueue();
                    } else if (this._doNext === displayModeVisiblePositions.shown) {
                        // Show last so that we don't unnecessarily animate commands
                        this._show();
                        this._doNext = "";
                    }
                },

                _isABottomAppBarInTheProcessOfShowing: function AppBar_isABottomAppBarInTheProcessOfShowing() {
                    var appbars = _Global.document.querySelectorAll("." + _Constants.appBarClass + "." + _Constants.bottomClass);
                    for (var i = 0; i < appbars.length; i++) {
                        if (appbars[i].winAnimating === displayModeVisiblePositions.shown) {
                            return true;
                        }
                    }

                    return false;
                },

                // Returns true if
                //   1) This is a bottom appbar
                //   2) No appbar has focus and a bottom appbar is not in the process of showing
                //   3) What currently has focus is neither a bottom appbar nor a top appbar
                //      AND a bottom appbar is not in the process of showing.
                // Otherwise Returns false
                _shouldStealFocus: function AppBar_shouldStealFocus() {
                    var activeElementAppBar = _Overlay._Overlay._isAppBarOrChild(_Global.document.activeElement);
                    if (this._element === activeElementAppBar) {
                        // This appbar already has focus and we don't want to move focus
                        // from where it currently is in this appbar.
                        return false;
                    }
                    if (this._placement === _Constants.appBarPlacementBottom) {
                        // This is a bottom appbar
                        return true;
                    }

                    var isBottomAppBarShowing = this._isABottomAppBarInTheProcessOfShowing();
                    if (!activeElementAppBar) {
                        // Currently no appbar has focus.
                        // Return true if a bottom appbar is not in the process of showing.
                        return !isBottomAppBarShowing;
                    }
                    if (!activeElementAppBar.winControl) {
                        // This should not happen, but if it does we want to make sure
                        // that an AppBar ends up with focus.
                        return true;
                    }
                    if ((activeElementAppBar.winControl._placement !== _Constants.appBarPlacementBottom)
                     && (activeElementAppBar.winControl._placement !== _Constants.appBarPlacementTop)
                     && !isBottomAppBarShowing) {
                        // What currently has focus is neither a bottom appbar nor a top appbar
                        // -and-
                        // a bottom appbar is not in the process of showing.
                        return true;
                    }
                    return false;
                },

                // Set focus to the passed in AppBar
                _setFocusToAppBar: function AppBar_setFocusToAppBar() {
                    if (this._focusOnFirstFocusableElement()) {
                        // Prevent what is gaining focus from showing that it has focus,
                        // but only in the non-keyboard scenario.
                        if (!this._keyboardInvoked) {
                            _Overlay._Overlay._addHideFocusClass(_Global.document.activeElement);
                        }
                    } else {
                        // No first element, set it to appbar itself
                        _Overlay._Overlay._trySetActive(this._element);
                    }
                },

                _commandsUpdated: function AppBar_commandsUpdated() {
                    // If we are still initializing then we don't have a layout yet so it doesn't need updating. 
                    if (!this._initializing) {
                    this._layout.commandsUpdated();
                    this._layout.scale();
                    }
                },

                _beginAnimateCommands: function AppBar_beginAnimateCommands(showCommands, hideCommands, otherVisibleCommands) {
                    // The parameters are 3 mutually exclusive arrays of win-command elements contained in this Overlay.
                    // 1) showCommands[]: All of the HIDDEN win-command elements that ARE scheduled to show.
                    // 2) hideCommands[]: All of the VISIBLE win-command elements that ARE scheduled to hide.
                    // 3) otherVisibleCommands[]: All VISIBLE win-command elements that ARE NOT scheduled to hide.
                    this._layout.beginAnimateCommands(showCommands, hideCommands, otherVisibleCommands);
                },

                _endAnimateCommands: function AppBar_endAnimateCommands() {
                    this._layout.endAnimateCommands();
                    this._endAnimateCommandsCallBack();
                },

                _endAnimateCommandsCallBack: function AppBar__endAnimateCommandsCallBack(){
                    // Leave this blank for unit tests to overwrite.
                },

                // Get the top of the top appbars, this is always 0 because appbar uses
                // -ms-device-fixed positioning.
                _getTopOfVisualViewport: function AppBar_getTopOfVisualViewPort() {
                    return 0;
                },

                // Get the bottom of the bottom appbars, Bottom is just 0, if there's no IHM.
                // When the IHM appears, the default behavior is to resize the view. If a resize
                // happens, we can rely on -ms-device-fixed positioning and leave the bottom
                // at 0. However if resize doesn't happen, then the keyboard obscures the appbar
                // and we will need to adjust the bottom of the appbar by distance of the keyboard.
                _getAdjustedBottom: function AppBar_getAdjustedBottom() {
                    // Need the distance the IHM moved as well.
                    return _Overlay._Overlay._keyboardInfo._visibleDocBottomOffset;
                },

                _showingKeyboard: function AppBar_showingKeyboard(event) {
                    // Remember keyboard showing state.
                    this._keyboardObscured = false;
                    this._needToHandleHidingKeyboard = false;

                    // If we're already moved, then ignore the whole thing
                    if (_Overlay._Overlay._keyboardInfo._visible && this._alreadyInPlace()) {
                        return;
                    }

                    this._needToHandleShowingKeyboard = true;
                    // If focus is in the appbar, don't cause scrolling.
                    if (!this.hidden && this._element.contains(_Global.document.activeElement)) {
                        event.ensuredFocusedElementInView = true;
                    }

                    // Check if appbar moves or if we're ok leaving it obscured instead.
                    if (this._visible && this._placement !== _Constants.appBarPlacementTop && _Overlay._Overlay._isFlyoutVisible()) {
                        // Remember that we're obscured
                        this._keyboardObscured = true;
                    } else {
                        // Don't be obscured, clear _scrollHappened flag to give us inference later on when to re-show ourselves.
                        this._scrollHappened = false;
                    }

                    // Also set timeout regardless, so we can clean up our _keyboardShowing flag.
                    var that = this;
                    _Global.setTimeout(function (e) { that._checkKeyboardTimer(e); }, _Overlay._Overlay._keyboardInfo._animationShowLength + _Overlay._Overlay._scrollTimeout);
                },

                _hidingKeyboard: function AppBar_hidingKeyboard() {
                    // We'll either just reveal the current space under the IHM or restore the window height.

                    // We won't be obscured
                    this._keyboardObscured = false;
                    this._needToHandleShowingKeyboard = false;
                    this._needToHandleHidingKeyboard = true;

                    // We'll either just reveal the current space or resize the window
                    if (!_Overlay._Overlay._keyboardInfo._isResized) {
                        // If we're not completely hidden, only fake hiding under keyboard, or already animating,
                        // then snap us to our final position.
                        if (this._visible || this._animating) {
                            // Not resized, update our final position immediately
                            this._checkScrollPosition();
                            this._element.style.display = "";
                        }
                        this._needToHandleHidingKeyboard = false;
                    }
                    // Else resize should clear keyboardHiding.
                },

                _resize: function AppBar_resize(event) {
                    // If we're hidden by the keyboard, then hide bottom appbar so it doesn't pop up twice when it scrolls
                    if (this._needToHandleShowingKeyboard) {
                        // Top is allowed to scroll off the top, but we don't want bottom to peek up when
                        // scrolled into view since we'll show it ourselves and don't want a stutter effect.
                        if (this._visible) {
                            if (this._placement !== _Constants.appBarPlacementTop && !this._keyboardObscured) {
                                // If viewport doesn't match window, need to vanish momentarily so it doesn't scroll into view,
                                // however we don't want to toggle the visibility="hidden" hidden flag.
                                this._element.style.display = "none";
                            }
                        }
                        // else if we're top we stay, and if there's a flyout, stay obscured by the keyboard.
                    } else if (this._needToHandleHidingKeyboard) {
                        this._needToHandleHidingKeyboard = false;
                        if (this._visible || this._animating) {
                            // Snap to final position
                            this._checkScrollPosition();
                            this._element.style.display = "";
                        }
                    }

                    // Make sure everything still fits.
                    this._layout.resize(event);
                },

                _checkKeyboardTimer: function AppBar_checkKeyboardTimer() {
                    if (!this._scrollHappened) {
                        this._mayEdgeBackIn();
                    }
                },

                _manipulationChanged: function AppBar_manipulationChanged(event) {
                    // See if we're at the not manipulating state, and we had a scroll happen,
                    // which is implicitly after the keyboard animated.
                    if (event.currentState === 0 && this._scrollHappened) {
                        this._mayEdgeBackIn();
                    }
                },

                _mayEdgeBackIn: function AppBar_mayEdgeBackIn() {
                    // May need to react to IHM being resized event
                    if (this._needToHandleShowingKeyboard) {
                        // If not top appbar or viewport isn't still at top, then need to show again
                        this._needToHandleShowingKeyboard = false;
                        // If obscured (IHM + flyout showing), it's ok to stay obscured.
                        // If bottom we have to move, or if top scrolled off screen.
                        if (!this._keyboardObscured &&
                            (this._placement !== _Constants.appBarPlacementTop || _Overlay._Overlay._keyboardInfo._visibleDocTop !== 0)) {
                            var toPosition = this._visiblePosition;
                            this._lastPositionVisited = displayModeVisiblePositions.hidden;
                            this._changeVisiblePosition(toPosition, false);
                        } else {
                            // Ensure any animations dropped during the showing keyboard are caught up.
                            this._checkDoNext();
                        }
                    }
                    this._scrollHappened = false;
                },

                _ensurePosition: function AppBar_ensurePosition() {
                    // Position the AppBar element relative to the top or bottom edge of the visible
                    // document, based on the the visible position we think we need to be in.
                    var offSet = this._computePositionOffset();
                    this._element.style.bottom = offSet.bottom;
                    this._element.style.top = offSet.top;

                },

                _computePositionOffset: function AppBar_computePositionOffset() {
                    // Calculates and returns top and bottom offsets for the AppBar element, relative to the top or bottom edge of the visible
                    // document, based on the the visible position we think we need to be in.
                    var positionOffSet = {};

                    if (_ElementUtilities.hasClass(this._element, _Constants.hiddenClass) || _ElementUtilities.hasClass(this._element, _Constants.hidingClass)) {
                        var innerEdgeOffSet = _Overlay._Overlay._keyboardInfo._visibleDocHeight - this._visiblePixels[this._visiblePosition];

                        if (this._placement === _Constants.appBarPlacementBottom) {
                            positionOffSet.bottom = "";
                            positionOffSet.top = innerEdgeOffSet + "px";
                        } else {
                            positionOffSet.bottom = innerEdgeOffSet + "px";
                            positionOffSet.top = "";
                        }
                    } else {
                    if (this._placement === _Constants.appBarPlacementBottom) {
                            // If the IHM is shown, the bottom of the visual viewport may or may not be obscured 
                            // Use _getAdjustedBottom to account for the IHM if it is covering the bottom edge.
                            positionOffSet.bottom = this._getAdjustedBottom() + "px";
                            positionOffSet.top = "";
                        } else {
                            positionOffSet.bottom = "";
                            positionOffSet.top = this._getTopOfVisualViewport() + "px";
                        }
                    }
                    return positionOffSet;
                },

                _checkScrollPosition: function AppBar_checkScrollPosition() {
                    // If IHM has appeared, then remember we may come in
                    if (this._needToHandleShowingKeyboard) {
                        // Tag that it's OK to edge back in.
                        this._scrollHappened = true;
                        return;
                    }

                    // We only need to update if we're not completely hidden.
                    if (this._visible || this._animating) {
                        this._ensurePosition();
                        // Ensure any animations dropped during the showing keyboard are caught up.
                        this._checkDoNext();
                    }
                },

                _alreadyInPlace: function AppBar_alreadyInPlace() {
                    // See if we're already where we're supposed to be.
                    var offSet = this._computePositionOffset();
                    return (offSet.top === this._element.style.top && offSet.bottom === this._element.style.bottom);
                },

                // If there is a shown non-sticky AppBar then it sets the firstDiv tabIndex to
                //   the minimum tabIndex found in the AppBars and finalDiv to the max found.
                // Otherwise sets their tabIndex to -1 so they are not tab stops.
                _updateFirstAndFinalDiv: function AppBar_updateFirstAndFinalDiv() {
                    var appBarFirstDiv = this._element.querySelectorAll("." + _Constants.firstDivClass);
                    appBarFirstDiv = appBarFirstDiv.length >= 1 ? appBarFirstDiv[0] : null;

                    var appBarFinalDiv = this._element.querySelectorAll("." + _Constants.finalDivClass);
                    appBarFinalDiv = appBarFinalDiv.length >= 1 ? appBarFinalDiv[0] : null;

                    // Remove the firstDiv & finalDiv if they are not at the appropriate locations
                    if (appBarFirstDiv && (this._element.children[0] !== appBarFirstDiv)) {
                        appBarFirstDiv.parentNode.removeChild(appBarFirstDiv);
                        appBarFirstDiv = null;
                    }
                    if (appBarFinalDiv && (this._element.children[this._element.children.length - 1] !== appBarFinalDiv)) {
                        appBarFinalDiv.parentNode.removeChild(appBarFinalDiv);
                        appBarFinalDiv = null;
                    }

                    // Create and add the firstDiv & finalDiv if they don't already exist
                    if (!appBarFirstDiv) {
                        // Add a firstDiv that will be the first child of the appBar.
                        // On focus set focus to the previous appBar.
                        // The div should only be focusable if there are shown non-sticky AppBars.
                        appBarFirstDiv = _Global.document.createElement("div");
                        // display: inline is needed so that the div doesn't take up space and cause the page to scroll on focus
                        appBarFirstDiv.style.display = "inline";
                        appBarFirstDiv.className = _Constants.firstDivClass;
                        appBarFirstDiv.tabIndex = -1;
                        appBarFirstDiv.setAttribute("aria-hidden", "true");
                        _ElementUtilities._addEventListener(appBarFirstDiv, "focusin", _setFocusToPreviousAppBar, false);
                        // add to beginning
                        if (this._element.children[0]) {
                            this._element.insertBefore(appBarFirstDiv, this._element.children[0]);
                        } else {
                            this._element.appendChild(appBarFirstDiv);
                        }
                    }
                    if (!appBarFinalDiv) {
                        // Add a finalDiv that will be the last child of the appBar.
                        // On focus set focus to the next appBar.
                        // The div should only be focusable if there are shown non-sticky AppBars.
                        appBarFinalDiv = _Global.document.createElement("div");
                        // display: inline is needed so that the div doesn't take up space and cause the page to scroll on focus
                        appBarFinalDiv.style.display = "inline";
                        appBarFinalDiv.className = _Constants.finalDivClass;
                        appBarFinalDiv.tabIndex = -1;
                        appBarFinalDiv.setAttribute("aria-hidden", "true");
                        _ElementUtilities._addEventListener(appBarFinalDiv, "focusin", _setFocusToNextAppBar, false);
                        this._element.appendChild(appBarFinalDiv);
                    }


                    // invokeButton should be the second to last element in the AppBar's tab order. Second to the finalDiv.
                    if (this._element.children[this._element.children.length - 2] !== this._invokeButton) {
                        this._element.insertBefore(this._invokeButton, appBarFinalDiv);
                    }
                    var elms = this._element.getElementsByTagName("*");
                    var highestTabIndex = _UIUtilities._getHighestTabIndexInList(elms);
                    this._invokeButton.tabIndex = highestTabIndex;

                    // Update the tabIndex of the firstDiv & finalDiv
                    if (_isThereVisibleNonStickyBar()) {

                        if (appBarFirstDiv) {
                            appBarFirstDiv.tabIndex = _UIUtilities._getLowestTabIndexInList(elms);
                        }
                        if (appBarFinalDiv) {
                            appBarFinalDiv.tabIndex = highestTabIndex;
                        }
                    } else {
                        if (appBarFirstDiv) {
                            appBarFirstDiv.tabIndex = -1;
                        }
                        if (appBarFinalDiv) {
                            appBarFinalDiv.tabIndex = -1;
                        }
                    }
                },

                _writeProfilerMark: function AppBar_writeProfilerMark(text) {
                    _WriteProfilerMark("WinJS.UI.AppBar:" + this._id + ":" + text);
                }
            }, {
                // Statics

                // Returns true if the element or what had focus before the element (if a Flyout) is either:
                //   1) the appBar or subtree
                //   2) OR in a flyout spawned by the appBar
                // Returns false otherwise.
                _isWithinAppBarOrChild: function (element, appBar) {
                    if (!element || !appBar) {
                        return false;
                    }
                    if (appBar.contains(element)) {
                        return true;
                    }
                    var flyout = _Overlay._Overlay._getParentControlUsingClassName(element, _Constants.flyoutClass);
                    return (flyout && appBar.contains(flyout._previousFocus));
                },

                // Callback for AppBar Edgy Event Command
                _toggleAppBarEdgy: function (keyboardInvoked) {
                    var bars = _getDynamicBarsForEdgy();

                    // If they're all shown, hide them. Otherwise show them all
                    if (bars._shown && !bars._hidden) {
                        appBarSynchronizationPromise = appBarSynchronizationPromise.then(function () {
                            return _Overlay._Overlay._hideAllBars(bars, keyboardInvoked);
                        });
                        return "hiding";
                    } else {
                        appBarSynchronizationPromise = appBarSynchronizationPromise.then(function () {
                            return _showAllBars(bars, keyboardInvoked);
                        });
                        return "showing";
                    }
                }
            });

            return AppBar;
        })
    });

});


define('require-style!less/animation-library',[],function(){});

define('require-style!less/typography',[],function(){});

define('require-style!less/desktop/styles-intrinsic',[],function(){});

define('require-style!less/desktop/colors-intrinsic',[],function(){});
