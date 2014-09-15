
define('require-style!less/desktop/controls',[],function(){});

define('require-style!less/phone/controls',[],function(){});
// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// Menu Command
/// <dictionary>appbar,appbars,Flyout,Flyouts,onclick,Statics</dictionary>
define('WinJS/Controls/Menu/_Command',[
    'exports',
    '../../Core/_Global',
    '../../Core/_Base',
    '../../Core/_ErrorFromName',
    '../../Core/_Resources',
    '../../Utilities/_Control',
    '../../Utilities/_ElementUtilities',
    '../AppBar/_Constants',
    '../Flyout/_Overlay'
    ], function menuCommandInit(exports, _Global, _Base, _ErrorFromName, _Resources, _Control, _ElementUtilities, _Constants, _Overlay) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.MenuCommand">
        /// Represents a command to be displayed in a Menu. MenuCommand objects provide button, toggle button, flyout button,
        /// or separator functionality for Menu controls.
        /// </summary>
        /// <compatibleWith platform="Windows" minVersion="8.0"/>
        /// </field>
        /// <icon src="ui_winjs.ui.menucommand.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.menucommand.16x16.png" width="16" height="16" />
        /// <htmlSnippet><![CDATA[<button data-win-control="WinJS.UI.MenuCommand" data-win-options="{type:'button',label:'Button'}"></button>]]></htmlSnippet>
        /// <part name="MenuCommand" class="win-command" locid="WinJS.UI.MenuCommand_name">The MenuCommand control itself</part>
        /// <resource type="javascript" src="//WinJS.3.0/js/base.js" shared="true" />
        /// <resource type="javascript" src="//WinJS.3.0/js/ui.js" shared="true" />
        /// <resource type="css" src="//WinJS.3.0/css/ui-dark.css" shared="true" />
        MenuCommand: _Base.Namespace._lazy(function () {

            function _handleMenuClick(event) {
                /*jshint validthis: true */
                var command = this.winControl;
                if (command) {
                    var hideParent = true;
                    if (command._type === _Constants.typeToggle) {
                        command.selected = !command.selected;
                    } else if (command._type === _Constants.typeFlyout && command._flyout) {
                        var flyout = command._flyout;
                        // Flyout may not have processAll'd, so this may be a DOM object
                        if (typeof flyout === "string") {
                            flyout = _Global.document.getElementById(flyout);
                        }
                        if (!flyout.show) {
                            flyout = flyout.winControl;
                        }
                        if (flyout && flyout.show) {
                            if (command._parentFlyout) {
                                hideParent = false;
                                flyout.show(command._parentFlyout._currentAnchor, command._parentFlyout._currentPlacement, command._parentFlyout._currentAlignment);
                            } else {
                                flyout.show(this);
                            }
                        }
                    }
                    if (command.onclick) {
                        command.onclick(event);
                    }
                    // Dismiss parent flyout
                    if (hideParent && command._parentFlyout) {
                        command._parentFlyout.hide();
                    }
                }
            }

            function _handleMouseOver() {
                /*jshint validthis: true */
                if (this && this.focus) {
                    this.focus();

                    this.addEventListener("mousemove", _handleMouseMove, false);
                }
            }

            function _handleMouseMove() {
                /*jshint validthis: true */
                if (this && this.focus && this !== _Global.document.activeElement) {
                    this.focus();
                }
            }

            function _handleMouseOut() {
                /*jshint validthis: true */
                var that = this;
                var parentFlyout = _getParentFlyout(that);
                if (parentFlyout
                 && this === _Global.document.activeElement
                 && _ElementUtilities.hasClass(parentFlyout, _Constants.menuClass)
                 && parentFlyout.focus) {
                    // Menu gives focus to the menu itself
                    parentFlyout.focus();
                } else if (parentFlyout
                        && this === _Global.document.activeElement
                        && parentFlyout.children
                        && parentFlyout.children.length > 0
                        && parentFlyout.children[0]
                        && _ElementUtilities.hasClass(parentFlyout.children[0], _Constants.firstDivClass)
                        && parentFlyout.children[0].focus) {
                    // Flyout gives focus to firstDiv
                    parentFlyout.children[0].focus();
                }

                this.removeEventListener("mousemove", _handleMouseMove, false);
            }

            function _getParentFlyout(element) {
                while (element && !_ElementUtilities.hasClass(element, _Constants.flyoutClass)) {
                    element = element.parentElement;
                }

                return element;
            }

            var strings = {
                get ariaLabel() { return _Resources._getWinJSString("ui/menuCommandAriaLabel").value; },
                get duplicateConstruction() { return "Invalid argument: Controls may only be instantiated one time for each DOM element"; },
                get badClick() { return "Invalid argument: The onclick property for an {0} must be a function"; },
                get badHrElement() { return "Invalid argument: For a separator, the element must be null or an hr element"; },
                get badButtonElement() { return "Invalid argument: For a button, toggle, or flyout command, the element must be null or a button element"; }
            };

            return _Base.Class.define(function MenuCommand_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.AppBarCommand.MenuCommand">
                /// <summary locid="WinJS.UI.MenuCommand.constructor">
                /// Creates a new MenuCommand object.
                /// </summary>
                /// <param name="element" domElement="true" locid="WinJS.UI.MenuCommand.constructor_p:element">
                /// The DOM element that will host the control.
                /// </param>
                /// <param name="options" type="Object" locid="WinJS.UI.MenuCommand.constructor_p:options">
                /// The set of properties and values to apply to the new MenuCommand.
                /// </param>
                /// <returns type="WinJS.UI.MenuCommand" locid="WinJS.UI.MenuCommand.constructor_returnValue">
                /// A MenuCommand control.
                /// </returns>
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </signature>

                // Check to make sure we weren't duplicated
                if (element && element.winControl) {
                    throw new _ErrorFromName("WinJS.UI.MenuCommand.DuplicateConstruction", strings.duplicateConstruction);
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

                // Go ahead and create it, separator types look different than buttons
                // Don't forget to use passed in element if one was provided.
                this._element = element;
                if (options.type === _Constants.typeSeparator) {
                    this._createSeparator();
                } else {
                    // This will also set the icon & label
                    this._createButton();
                }
                _ElementUtilities.addClass(this._element, "win-disposable");

                // Remember ourselves
                this._element.winControl = this;

                // Attach our css class
                _ElementUtilities.addClass(this._element, _Constants.menuCommandClass);

                if (!options.selected && options.type === _Constants.typeToggle) {
                    // Make sure toggle's have selected false for CSS
                    this.selected = false;
                }
                if (options.onclick) {
                    this.onclick = options.onclick;
                }
                options.onclick = _handleMenuClick;

                _Control.setOptions(this, options);

                // Set our options
                if (this._type !== _Constants.typeSeparator) {
                    // Make sure we have an ARIA role
                    var role = this._element.getAttribute("role");
                    if (role === null || role === "" || role === undefined) {
                        role = "menuitem";
                        if (this._type === _Constants.typeToggle) {
                            role = "menuitemcheckbox";
                        }
                        this._element.setAttribute("role", role);
                        if (this._type === _Constants.typeFlyout) {
                            this._element.setAttribute("aria-haspopup", true);
                        }
                    }
                    var label = this._element.getAttribute("aria-label");
                    if (label === null || label === "" || label === undefined) {
                        this._element.setAttribute("aria-label", strings.ariaLabel);
                    }
                }

                this._element.addEventListener("mouseover", _handleMouseOver, false);
                this._element.addEventListener("mouseout", _handleMouseOut, false);
            }, {
                /// <field type="String" locid="WinJS.UI.MenuCommand.id" helpKeyword="WinJS.UI.MenuCommand.id" isAdvanced="true">
                /// Gets the  ID of the MenuCommand.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                id: {
                    get: function () {
                        return this._element.id;
                    },
                    set: function (value) {
                        // we allow setting first time only. otherwise we ignore it.
                        if (!this._element.id) {
                            this._element.id = value;
                        }
                    }
                },

                /// <field type="String" readonly="true" defaultValue="button" oamOptionsDatatype="WinJS.UI.MenuCommand.type" locid="WinJS.UI.MenuCommand.type" helpKeyword="WinJS.UI.MenuCommand.type" isAdvanced="true">
                /// Gets the type of the MenuCommand. Possible values are "button", "toggle", "flyout", or "separator".
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                type: {
                    get: function () {
                        return this._type;
                    },
                    set: function (value) {
                        // we allow setting first time only. otherwise we ignore it.
                        if (!this._type) {
                            if (value !== _Constants.typeButton && value !== _Constants.typeFlyout && value !== _Constants.typeToggle && value !== _Constants.typeSeparator) {
                                this._type = _Constants.typeButton;
                            } else {
                                this._type = value;
                            }
                        }
                    }
                },

                /// <field type="String" locid="WinJS.UI.MenuCommand.label" helpKeyword="WinJS.UI.MenuCommand.label">
                /// The label of the MenuCommand
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                label: {
                    get: function () {
                        return this._label;
                    },
                    set: function (value) {
                        this._label = value;
                        this._element.textContent = this.label;

                        // Update aria-label
                        this._element.setAttribute("aria-label", this.label);
                    }
                },

                /// <field type="Function" locid="WinJS.UI.MenuCommand.onclick" helpKeyword="WinJS.UI.MenuCommand.onclick">
                /// Gets or sets the function to invoke when the command is clicked.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                onclick: {
                    get: function () {
                        return this._onclick;
                    },
                    set: function (value) {
                        if (value && typeof value !== "function") {
                            throw new _ErrorFromName("WinJS.UI.MenuCommand.BadClick", _Resources._formatString(strings.badClick, "MenuCommand"));
                        }
                        this._onclick = value;
                    }
                },

                /// <field type="Object" locid="WinJS.UI.MenuCommand.flyout" helpKeyword="WinJS.UI.MenuCommand.flyout">
                /// For flyout type MenuCommands, this property  returns the WinJS.UI.Flyout that this command invokes. When setting this property, you can set
                /// it to the string ID of the Flyout, the DOM object that hosts the Flyout, or the Flyout object itself.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
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

                /// <field type="Boolean" locid="WinJS.UI.MenuCommand.selected" helpKeyword="WinJS.UI.MenuCommand.selected">
                /// Gets or sets the selected state of a toggle button. This property is true if the toggle button is selected; otherwise, it's false.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                selected: {
                    get: function () {
                        // Ensure it's a boolean because we're using the DOM element to keep in-sync
                        return this._element.getAttribute("aria-checked") === "true";
                    },
                    set: function (value) {
                        this._element.setAttribute("aria-checked", !!value);
                    }
                },

                /// <field type="HTMLElement" domElement="true" readonly="true" hidden="true" locid="WinJS.UI.MenuCommand.element" helpKeyword="WinJS.UI.MenuCommand.element">
                /// Gets the DOM element that hosts this MenuCommand.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                element: {
                    get: function () {
                        return this._element;
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.MenuCommand.disabled" helpKeyword="WinJS.UI.MenuCommand.disabled">
                /// Gets or sets a value that indicates whether the MenuCommand is disabled. This value is true if the MenuCommand is disabled; otherwise, false.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                disabled: {
                    get: function () {
                        // Ensure it's a boolean because we're using the DOM element to keep in-sync
                        return !!this._element.disabled;
                    },
                    set: function (value) {
                        this._element.disabled = !!value;
                    }
                },

                /// <field type="Boolean" hidden="true" locid="WinJS.UI.MenuCommand.hidden" helpKeyword="WinJS.UI.MenuCommand.hidden">
                /// Determine if a command is currently hidden.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                hidden: {
                    get: function () {
                        // Ensure it's a boolean because we're using the DOM element to keep in-sync
                        return this._element.style.visibility === "hidden";
                    },
                    set: function (value) {
                        var menuControl = _Overlay._Overlay._getParentControlUsingClassName(this._element, _Constants.menuClass);
                        if (menuControl && !menuControl.hidden) {
                            throw new _ErrorFromName("WinJS.UI.MenuCommand.CannotChangeHiddenProperty", _Resources._formatString(_Overlay._Overlay.commonstrings.cannotChangeHiddenProperty, "Menu"));
                        }

                        var style = this._element.style;
                        if (value) {
                            style.visibility = "hidden";
                            style.display = "none";
                        } else {
                            style.visibility = "";
                            style.display = "block";
                        }
                    }
                },

                /// <field type="String" locid="WinJS.UI.MenuCommand.extraClass" isAdvanced="true" helpKeyword="WinJS.UI.MenuCommand.extraClass">
                /// Gets or sets the extra CSS class that is applied to the host DOM element.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
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


                dispose: function () {
                    /// <signature helpKeyword="WinJS.UI.MenuCommand.dispose">
                    /// <summary locid="WinJS.UI.MenuCommand.dispose">
                    /// Disposes this control.
                    /// </summary>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>
                    if (this._disposed) {
                        return;
                    }
                    this._disposed = true;

                    if (this._flyout) {
                        this._flyout.dispose();
                    }
                },

                addEventListener: function (type, listener, useCapture) {
                    /// <signature helpKeyword="WinJS.UI.MenuCommand.addEventListener">
                    /// <summary locid="WinJS.UI.MenuCommand.addEventListener">
                    /// Registers an event handler for the specified event.
                    /// </summary>
                    /// <param name="type" type="String" locid="WinJS.UI.MenuCommand.addEventListener_p:type">The name of the event to register.</param>
                    /// <param name="listener" type="Function" locid="WinJS.UI.MenuCommand.addEventListener_p:listener">The function that handles the event.</param>
                    /// <param name="useCapture" type="Boolean" locid="WinJS.UI.MenuCommand.addEventListener_p:useCapture">
                    /// Set to true to register the event handler for the capturing phase; otherwise, set to false to register the  event handler for the bubbling phase.
                    /// </param>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>
                    return this._element.addEventListener(type, listener, useCapture);
                },

                removeEventListener: function (type, listener, useCapture) {
                    /// <signature helpKeyword="WinJS.UI.MenuCommand.removeEventListener">
                    /// <summary locid="WinJS.UI.MenuCommand.removeEventListener">
                    /// Removes the specified event handler that the addEventListener method registered.
                    /// </summary>
                    /// <param name="type" type="String" locid="WinJS.UI.MenuCommand.removeEventListener_p:type">The name of the event to remove.</param>
                    /// <param name="listener" type="Function" locid="WinJS.UI.MenuCommand.removeEventListener_p:listener">The event handler function to remove.</param>
                    /// <param name="useCapture" type="Boolean" locid="WinJS.UI.MenuCommand.removeEventListener_p:useCapture">
                    /// Set to true to remove the capturing phase event handler; set to false to remove the bubbling phase event handler.
                    /// </param>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>
                    return this._element.removeEventListener(type, listener, useCapture);
                },

                // Private properties
                _createSeparator: function MenuCommand_createSeparator() {
                    // Make sure there's an input element
                    if (!this._element) {
                        this._element = _Global.document.createElement("hr");
                    } else {
                        // Verify the input was an hr
                        if (this._element.tagName !== "HR") {
                            throw new _ErrorFromName("WinJS.UI.MenuCommand.BadHrElement", strings.badHrElement);
                        }
                    }
                },

                _createButton: function MenuCommand_createButton() {
                    // Make sure there's an input element
                    if (!this._element) {
                        this._element = _Global.document.createElement("button");
                    } else {
                        // Verify the input was a button
                        if (this._element.tagName !== "BUTTON") {
                            throw new _ErrorFromName("WinJS.UI.MenuCommand.BadButtonElement", strings.badButtonElement);
                        }
                        this._element.innerHTML = "";
                    }

                    // MenuCommand buttons need to look like this:
                    //// <button type="button" onclick="" class="win-command">Command 1</button>
                    this._element.type = "button";

                    // 'textContent' label is added later by caller
                }
            });
        })
    });

});


// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// Menu
/// <dictionary>Menu,Menus,Flyout,Flyouts,Statics</dictionary>
define('WinJS/Controls/Menu',[
    '../Core/_Global',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_ErrorFromName',
    '../Core/_Resources',
    '../Core/_WriteProfilerMark',
    '../Utilities/_ElementUtilities',
    '../Utilities/_Hoverable',
    './AppBar/_Constants',
    './Flyout',
    './Flyout/_Overlay',
    './Menu/_Command',
    'require-style!less/desktop/controls',
    'require-style!less/phone/controls'
    ], function menuInit(_Global,_Base, _BaseUtils, _ErrorFromName, _Resources, _WriteProfilerMark, _ElementUtilities, _Hoverable, _Constants, Flyout, _Overlay, _Command) {
    "use strict";

    _Base.Namespace.define("WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.Menu">Represents a menu flyout for displaying commands.</summary>
        /// <compatibleWith platform="Windows" minVersion="8.0"/>
        /// </field>
        /// <name locid="WinJS.UI.Menu_name">Menu</name>
        /// <icon src="ui_winjs.ui.menu.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.menu.16x16.png" width="16" height="16" />
        /// <htmlSnippet supportsContent="true"><![CDATA[<div data-win-control="WinJS.UI.Menu">
        /// <button data-win-control="WinJS.UI.MenuCommand" data-win-options="{id:'',label:'example',type:'button',onclick:null}"></button>
        /// </div>]]></htmlSnippet>
        /// <event name="beforeshow" locid="WinJS.UI.Menu_e:beforeshow">Raised just before showing a menu.</event>
        /// <event name="aftershow" locid="WinJS.UI.Menu_e:aftershow">Raised immediately after a menu is fully shown.</event>
        /// <event name="beforehide" locid="WinJS.UI.Menu_e:beforehide">Raised just before hiding a menu.</event>
        /// <event name="afterhide" locid="WinJS.UI.Menu_e:afterhide">Raised immediately after a menu is fully hidden.</event>
        /// <part name="menu" class="win-menu" locid="WinJS.UI.Menu_part:menu">The Menu control itself</part>
        /// <resource type="javascript" src="//WinJS.3.0/js/base.js" shared="true" />
        /// <resource type="javascript" src="//WinJS.3.0/js/ui.js" shared="true" />
        /// <resource type="css" src="//WinJS.3.0/css/ui-dark.css" shared="true" />
        Menu: _Base.Namespace._lazy(function () {
            var Key = _ElementUtilities.Key;

            var strings = {
                get ariaLabel() { return _Resources._getWinJSString("ui/menuAriaLabel").value; },
                get requiresCommands() { return "Invalid argument: commands must not be empty"; },
                get nullCommand() { return "Invalid argument: command must not be null"; },
            };

            var Menu = _Base.Class.derive(Flyout.Flyout, function Menu_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.Menu.Menu">
                /// <summary locid="WinJS.UI.Menu.constructor">
                /// Creates a new Menu control.
                /// </summary>
                /// <param name="element" type="HTMLElement" domElement="true" locid="WinJS.UI.Menu.constructor_p:element">
                /// The DOM element that will host the control.
                /// </param>
                /// <param name="options" type="Object" domElement="false" locid="WinJS.UI.Menu.constructor_p:options">
                /// The set of properties and values to apply to the control.
                /// </param>
                /// <returns type="WinJS.UI.Menu" locid="WinJS.UI.Menu.constructor_returnValue">The new Menu control.</returns>
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </signature>

                // We need to be built on top of a Flyout, so stomp on the user's input
                options = options || {};

                // Make sure there's an input element
                this._element = element || _Global.document.createElement("div");
                this._id = this._element.id || _ElementUtilities._uniqueID(this._element);
                this._writeProfilerMark("constructor,StartTM");

                // validate that if they didn't set commands, in which
                // case any HTML only contains commands.  Do this first
                // so that we don't leave partial Menus in the DOM.
                if (!options.commands && this._element) {
                    // Shallow copy object so we can modify it.
                    options = _BaseUtils._shallowCopy(options);
                    options.commands = this._verifyCommandsOnly(this._element, "WinJS.UI.MenuCommand");
                }

                // Remember aria role in case base constructor changes it
                var role = this._element ? this._element.getAttribute("role") : null;
                var label = this._element ? this._element.getAttribute("aria-label") : null;

                // Call the base overlay constructor helper
                this._baseFlyoutConstructor(this._element, options);

                // Make sure we have an ARIA role
                if (role === null || role === "" || role === undefined) {
                    this._element.setAttribute("role", "menu");
                }
                if (label === null || label === "" || label === undefined) {
                    this._element.setAttribute("aria-label", strings.ariaLabel);
                }

                // Handle "esc" & "up/down" key presses
                this._element.addEventListener("keydown", this._handleKeyDown, true);

                // Attach our css class
                _ElementUtilities.addClass(this._element, _Constants.menuClass);

                // Need to set our commands, making sure we're hidden first
                this.hide();
                this._writeProfilerMark("constructor,StopTM");
            }, {
                // Public Properties

                /// <field type="Array" locid="WinJS.UI.Menu.commands" helpKeyword="WinJS.UI.Menu.commands" isAdvanced="true">
                /// Sets the MenuCommand objects that appear in the Menu. You can set this to a single MenuCommand or an array of MenuCommand objects.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                commands: {
                    set: function (value) {
                        // Fail if trying to set when visible
                        if (!this.hidden) {
                            throw new _ErrorFromName("WinJS.UI.Menu.CannotChangeCommandsWhenVisible", _Resources._formatString(_Overlay._Overlay.commonstrings.cannotChangeCommandsWhenVisible, "Menu"));
                        }

                        // Start from scratch
                        _ElementUtilities.empty(this._element);

                        // In case they had only one...
                        if (!Array.isArray(value)) {
                            value = [value];
                        }

                        // Add commands
                        var len = value.length;
                        for (var i = 0; i < len; i++) {
                            this._addCommand(value[i]);
                        }
                    }
                },

                getCommandById: function (id) {
                    /// <signature helpKeyword="WinJS.UI.Menu.getCommandById">
                    /// <summary locid="WinJS.UI.Menu.getCommandById">
                    /// Retrieve the command with the specified ID from this Menu.  If more than one command is found, all are returned.
                    /// </summary>
                    /// <param name="id" type="String" locid="WinJS.UI.Menu.getCommandById_p:id">The ID of the command to find.</param>
                    /// <returns type="object" locid="WinJS.UI.Menu.getCommandById_returnValue">
                    /// The command found, an array of commands if more than one have the same ID, or null if no command is found.
                    /// </returns>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
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
                    /// <signature helpKeyword="WinJS.UI.Menu.showCommands">
                    /// <summary locid="WinJS.UI.Menu.showCommands">
                    /// Shows the specified commands of the Menu.
                    /// </summary>
                    /// <param name="commands" type="Array" locid="WinJS.UI.Menu.showCommands_p:commands">
                    /// The commands to show. The array elements may be Menu objects, or the string identifiers (IDs) of commands.
                    /// </param>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>
                    if (!commands) {
                        throw new _ErrorFromName("WinJS.UI.Menu.RequiresCommands", strings.requiresCommands);
                    }

                    this._showCommands(commands, true);
                },

                hideCommands: function (commands) {
                    /// <signature helpKeyword="WinJS.UI.Menu.hideCommands">
                    /// <summary locid="WinJS.UI.Menu.hideCommands">
                    /// Hides the Menu.
                    /// </summary>
                    /// <param name="commands" type="Array" locid="WinJS.UI.Menu.hideCommands_p:commands">
                    /// Required. Command or Commands to hide, either String, DOM elements, or WinJS objects.
                    /// </param>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>
                    if (!commands) {
                        throw new _ErrorFromName("WinJS.UI.Menu.RequiresCommands", strings.requiresCommands);
                    }

                    this._hideCommands(commands, true);
                },

                showOnlyCommands: function (commands) {
                    /// <signature helpKeyword="WinJS.UI.Menu.showOnlyCommands">
                    /// <summary locid="WinJS.UI.Menu.showOnlyCommands">
                    /// Shows the specified commands of the Menu while hiding all other commands.
                    /// </summary>
                    /// <param name="commands" type="Array" locid="WinJS.UI.Menu.showOnlyCommands_p:commands">
                    /// The commands to show. The array elements may be MenuCommand objects, or the string identifiers (IDs) of commands.
                    /// </param>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>
                    if (!commands) {
                        throw new _ErrorFromName("WinJS.UI.Menu.RequiresCommands", strings.requiresCommands);
                    }

                    this._showOnlyCommands(commands, true);
                },

                show: function (anchor, placement, alignment) {
                    /// <signature helpKeyword="WinJS.UI.Menu.show">
                    /// <summary locid="WinJS.UI.Menu.show">
                    /// Shows the Menu, if hidden, regardless of other states.
                    /// </summary>
                    /// <param name="anchor" type="HTMLElement" domElement="true" locid="WinJS.UI.Menu.show_p:anchor">
                    /// The DOM element, or ID of a DOM element,  to anchor the Menu. This parameter overrides the anchor property for this method call only.
                    /// </param>
                    /// <param name="placement" type="object" domElement="false" locid="WinJS.UI.Menu.show_p:placement">
                    /// The placement of the Menu to the anchor: 'auto' (default), 'top', 'bottom', 'left', or 'right'. This parameter overrides the placement
                    /// property for this method call only.
                    /// </param>
                    /// <param name="alignment" type="object" domElement="false" locid="WinJS.UI.Menu.show_p:alignment">
                    /// For 'top' or 'bottom' placement, the alignment of the Menu to the anchor's edge: 'center' (default), 'left', or 'right'. This parameter
                    /// overrides the alignment property for this method call only.
                    /// </param>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>
                    // Just call private version to make appbar flags happy
                    this._writeProfilerMark("show,StartTM"); // The corresponding "stop" profiler mark is handled in _Overlay._baseEndShow().
                    this._show(anchor, placement, alignment);
                },

                _show: function Menu_show(anchor, placement, alignment) {
                    // Before we show, we also need to check for children flyouts needing anchors
                    this._checkForFlyoutCommands();

                    // Call flyout show
                    this._baseFlyoutShow(anchor, placement, alignment);

                    // We need to check for toggles after we send the beforeshow event,
                    // so the developer has a chance to show or hide more commands.
                    // Flyout's _findPosition will make that call.
                },

                _addCommand: function Menu_addCommand(command) {
                    if (!command) {
                        throw new _ErrorFromName("WinJS.UI.Menu.NullCommand", strings.nullCommand);
                    }
                    // See if it's a command already
                    if (!command._element) {
                        // Not a command, so assume it's options for a command
                        command = new _Command.MenuCommand(null, command);
                    }
                    // If we were attached somewhere else, detach us
                    if (command._element.parentElement) {
                        command._element.parentElement.removeChild(command._element);
                    }

                    // Reattach us
                    this._element.appendChild(command._element);
                },

                // Called by flyout's _findPosition so that application can update it status
                // we do the test and we can then fix this last-minute before showing.
                _checkToggle: function Menu_checkToggle() {
                    var toggles = this._element.querySelectorAll(".win-command[aria-checked]");
                    var hasToggle = false;
                    if (toggles) {
                        for (var i = 0; i < toggles.length; i++) {
                            if (toggles[i] && toggles[i].winControl && !toggles[i].winControl.hidden) {
                                // Found a visible toggle control
                                hasToggle = true;
                                break;
                            }
                        }
                    }
                    if (hasToggle) {
                        _ElementUtilities.addClass(this._element, _Constants.menuToggleClass);
                    } else {
                        _ElementUtilities.removeClass(this._element, _Constants.menuToggleClass);
                    }
                },

                _checkForFlyoutCommands: function Menu_checkForFlyoutCommands() {
                    var commands = this._element.querySelectorAll(".win-command");
                    for (var count = 0; count < commands.length; count++) {
                        if (commands[count].winControl) {
                            // Remember our anchor in case it's a flyout
                            commands[count].winControl._parentFlyout = this;
                        }
                    }
                },

                _handleKeyDown: function Menu_handleKeyDown(event) {
                    var that = this;
                    if (event.keyCode === Key.escape) {
                        // Show a focus rect on what we move focus to
                        this.winControl._keyboardInvoked = true;
                        this.winControl._hide();
                    } else if ((event.keyCode === Key.space || event.keyCode === Key.enter)
                           && (this === _Global.document.activeElement)) {
                        event.preventDefault();
                        this.winControl.hide();
                    } else if (event.keyCode === Key.upArrow) {
                        Menu._focusOnPreviousElement(that);

                        // Prevent the page from scrolling
                        event.preventDefault();
                    } else if (event.keyCode === Key.downArrow) {
                        Menu._focusOnNextElement(that);

                        // Prevent the page from scrolling
                        event.preventDefault();
                    } else if (event.keyCode === Key.tab) {
                        event.preventDefault();
                    }
                },

                _writeProfilerMark: function Menu_writeProfilerMark(text) {
                    _WriteProfilerMark("WinJS.UI.Menu:" + this._id + ":" + text);
                }
            });

            // Statics

            // Set focus to next focusable element in the menu (loop if necessary).
            //   Note: The loop works by first setting focus to the menu itself.  If the menu is
            //         what had focus before, then we break.  Otherwise we try the first child next.
            // Focus remains on the menu if nothing is focusable.
            Menu._focusOnNextElement = function (menu) {
                var _currentElement = _Global.document.activeElement;

                do {
                    if (_currentElement === menu) {
                        _currentElement = _currentElement.firstElementChild;
                    } else {
                        _currentElement = _currentElement.nextElementSibling;
                    }

                    if (_currentElement) {
                        _currentElement.focus();
                    } else {
                        _currentElement = menu;
                    }

                } while (_currentElement !== _Global.document.activeElement);
            };

            // Set focus to previous focusable element in the menu (loop if necessary).
            //   Note: The loop works by first setting focus to the menu itself.  If the menu is
            //         what had focus before, then we break.  Otherwise we try the last child next.
            // Focus remains on the menu if nothing is focusable.
            Menu._focusOnPreviousElement = function (menu) {
                var _currentElement = _Global.document.activeElement;

                do {
                    if (_currentElement === menu) {
                        _currentElement = _currentElement.lastElementChild;
                    } else {
                        _currentElement = _currentElement.previousElementSibling;
                    }

                    if (_currentElement) {
                        _currentElement.focus();
                    } else {
                        _currentElement = menu;
                    }

                } while (_currentElement !== _Global.document.activeElement);
            };

            return Menu;
        })
    });

});

