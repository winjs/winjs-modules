define(["require", "exports", "../../Animations", "../../Core/_Base", "../../Core/_BaseUtils", "../../BindingList", "../../ControlProcessor", "../ToolBar/_Constants", "../AppBar/_Command", "../../Utilities/_Control", "../../Utilities/_Dispose", "../../Utilities/_ElementUtilities", "../../Core/_ErrorFromName", "../../Controls/Flyout", "../../Core/_Global", "../../Utilities/_Hoverable", "../../Utilities/_KeyboardBehavior", "../../Controls/Menu", "../Menu/_Command", "../../Core/_Resources", "../../Scheduler", "../ToolBar/_MenuCommand", "../../Core/_WriteProfilerMark"], function(require, exports, Animations, _Base, _BaseUtils, BindingList, ControlProcessor, _Constants, _Command, _Control, _Dispose, _ElementUtilities, _ErrorFromName, _Flyout, _Global, _Hoverable, _KeyboardBehavior, Menu, _MenuCommand, _Resources, Scheduler, _ToolBarMenuCommand, _WriteProfilerMark) {
    require(["require-style!less/styles-toolbar"]);
    require(["require-style!less/colors-toolbar"]);

    "use strict";

    var strings = {
        get ariaLabel() {
            return _Resources._getWinJSString("ui/toolbarAriaLabel").value;
        },
        get overflowButtonAriaLabel() {
            return _Resources._getWinJSString("ui/toolbarOverflowButtonAriaLabel").value;
        },
        get badData() {
            return "Invalid argument: The data property must an instance of a WinJS.Binding.List";
        },
        get mustContainCommands() {
            return "The toolbar can only contain WinJS.UI.Command or WinJS.UI.AppBarCommand controls";
        }
    };

    /// <field>
    /// <summary locid="WinJS.UI.ToolBar">
    /// Represents a toolbar for displaying commands.
    /// </summary>
    /// </field>
    /// <icon src="ui_winjs.ui.toolbar.12x12.png" width="12" height="12" />
    /// <icon src="ui_winjs.ui.toolbar.16x16.png" width="16" height="16" />
    /// <htmlSnippet supportsContent="true"><![CDATA[<div data-win-control="WinJS.UI.ToolBar">
    /// <button data-win-control="WinJS.UI.Command" data-win-options="{id:'',label:'example',icon:'back',type:'button',onclick:null,section:'primary'}"></button>
    /// </div>]]></htmlSnippet>
    /// <part name="toolbar" class="win-toolbar" locid="WinJS.UI.ToolBar_part:toolbar">The entire ToolBar control.</part>
    /// <part name="toolbar-overflowbutton" class="win-toolbar-overflowbutton" locid="WinJS.UI.ToolBar_part:ToolBar-overflowbutton">The toolbar overflow button.</part>
    /// <part name="toolbar-overflowarea" class="win-toolbar-overflowarea" locid="WinJS.UI.ToolBar_part:ToolBar-overflowarea">The container for toolbar commands that overflow.</part>
    /// <resource type="javascript" src="//WinJS.4.0/js/WinJS.js" shared="true" />
    /// <resource type="css" src="//WinJS.4.0/css/ui-dark.css" shared="true" />
    var ToolBar = (function () {
        function ToolBar(element, options) {
            if (typeof options === "undefined") { options = {}; }
            var _this = this;
            this._measured = false;
            this._initializing = true;
            this._hoverable = _Hoverable.isHoverable;
            this._dataChangedEvents = ["itemchanged", "iteminserted", "itemmoved", "itemremoved", "reload"];
            /// <signature helpKeyword="WinJS.UI.ToolBar.ToolBar">
            /// <summary locid="WinJS.UI.ToolBar.constructor">
            /// Creates a new ToolBar control.
            /// </summary>
            /// <param name="element" type="HTMLElement" domElement="true" locid="WinJS.UI.ToolBar.constructor_p:element">
            /// The DOM element that will host the control.
            /// </param>
            /// <param name="options" type="Object" locid="WinJS.UI.ToolBar.constructor_p:options">
            /// The set of properties and values to apply to the new ToolBar control.
            /// </param>
            /// <returns type="WinJS.UI.ToolBar" locid="WinJS.UI.ToolBar.constructor_returnValue">
            /// The new ToolBar control.
            /// </returns>
            /// </signature>
            // Make sure there's an element
            this._element = element || _Global.document.createElement("div");

            // Attaching JS control to DOM element
            this._element["winControl"] = this;

            this._id = this._element.id || _ElementUtilities._uniqueID(this._element);
            this._writeProfilerMark("constructor,StartTM");

            if (!this._element.hasAttribute("tabIndex")) {
                this._element.tabIndex = -1;
            }

            // Attach our css class.
            _ElementUtilities.addClass(this._element, _Constants.controlCssClass);

            this._disposed = false;
            _ElementUtilities.addClass(this._element, "win-disposable");

            // Make sure we have an ARIA role
            var role = this._element.getAttribute("role");
            if (!role) {
                this._element.setAttribute("role", "menubar");
            }

            var label = this._element.getAttribute("aria-label");
            if (!label) {
                this._element.setAttribute("aria-label", strings.ariaLabel);
            }

            this._customContentCommandsWidth = {};
            this._separatorWidth = 0;
            this._standardCommandWidth = 0;

            this._refreshBound = this._refresh.bind(this);

            this._setupTree();

            if (!options.data || !options.shownDisplayMode) {
                // Shallow copy object so we can modify it.
                options = _BaseUtils._shallowCopy(options);

                // Set defaults
                options.data = options.data || this._getDataFromDOMElements();
                options.shownDisplayMode = options.shownDisplayMode || _Constants.shownDisplayModes.reduced;
            }

            _Control.setOptions(this, options);

            this._resizeHandlerBound = this._resizeHandler.bind(this);
            _ElementUtilities._resizeNotifier.subscribe(this._element, this._resizeHandlerBound);

            var initiallyParented = _Global.document.body.contains(this._element);
            _ElementUtilities._addInsertedNotifier(this._element);
            if (initiallyParented) {
                this._measureCommands();
                this._positionCommands();
            } else {
                var nodeInsertedHandler = function () {
                    _this._writeProfilerMark("_setupTree_WinJSNodeInserted:initiallyParented:" + initiallyParented + ",info");
                    _this._element.removeEventListener("WinJSNodeInserted", nodeInsertedHandler, false);
                    _this._measureCommands();
                    _this._positionCommands();
                };
                this._element.addEventListener("WinJSNodeInserted", nodeInsertedHandler, false);
            }

            this.element.addEventListener('keydown', this._keyDownHandler.bind(this));
            this._winKeyboard = new _KeyboardBehavior._WinKeyboard(this.element);

            this._initializing = false;

            this._writeProfilerMark("constructor,StopTM");

            return this;
        }
        Object.defineProperty(ToolBar.prototype, "element", {
            /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.ToolBar.element" helpKeyword="WinJS.UI.ToolBar.element">
            /// Gets the DOM element that hosts the ToolBar.
            /// </field>
            get: function () {
                return this._element;
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(ToolBar.prototype, "shownDisplayMode", {
            /// <field type="String" defaultValue="reduced" locid="WinJS.UI.ToolBar.shownDisplayMode" helpKeyword="WinJS.UI.ToolBar.shownDisplayMode" isAdvanced="true">
            /// Gets/Sets how ToolBar will display overflow commands while shown. Values are "reduced" and "full".
            /// </field>
            get: function () {
                return this._shownDisplayMode;
            },
            set: function (value) {
                this._writeProfilerMark("set_shownDisplayMode,info");

                if (value === this._shownDisplayMode) {
                    return;
                }

                if (value === _Constants.shownDisplayModes.full) {
                    this._shownDisplayMode = _Constants.shownDisplayModes.full;
                    _ElementUtilities.addClass(this.element, _Constants.shownDisplayFullCssClass);
                    _ElementUtilities.removeClass(this.element, _Constants.shownDisplayReducedCssClass);
                    if (!this._inlineOverflowArea) {
                        this._inlineOverflowArea = _Global.document.createElement("div");
                        _ElementUtilities.addClass(this._inlineOverflowArea, _Constants.overflowAreaCssClass);
                        _ElementUtilities.addClass(this._inlineOverflowArea, _Constants.menuCssClass);
                        this.element.appendChild(this._inlineOverflowArea);
                    }
                } else {
                    // 'reduced' is default
                    this._shownDisplayMode = _Constants.shownDisplayModes.reduced;
                    _ElementUtilities.addClass(this.element, _Constants.shownDisplayReducedCssClass);
                    _ElementUtilities.removeClass(this.element, _Constants.shownDisplayFullCssClass);
                }
                if (!this._initializing) {
                    this._positionCommands();
                }
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(ToolBar.prototype, "extraClass", {
            /// <field type="String" locid="WinJS.UI.ToolBar.extraClass" helpKeyword="WinJS.UI.ToolBar.extraClass">
            /// Gets or sets the extra CSS class that is applied to the host DOM element, and the corresponding
            /// overflow menu created by the ToolBar when its shownDisplayMode property is 'reduced'.
            /// </field>
            get: function () {
                return this._extraClass;
            },
            set: function (value) {
                this._writeProfilerMark("set_extraClass,info");

                if (this._extraClass) {
                    _ElementUtilities.removeClass(this._element, this._extraClass);
                    this._menu && _ElementUtilities.removeClass(this._menu.element, this._extraClass);
                }

                this._extraClass = value;
                _ElementUtilities.addClass(this._element, this._extraClass);
                this._menu && _ElementUtilities.addClass(this._menu.element, this.extraClass);
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(ToolBar.prototype, "data", {
            /// <field type="WinJS.Binding.List" locid="WinJS.UI.ToolBar.data" helpKeyword="WinJS.UI.ToolBar.data">
            /// Gets or sets the Binding List of WinJS.UI.Command for the ToolBar.
            /// </field>
            get: function () {
                return this._data;
            },
            set: function (value) {
                this._writeProfilerMark("set_data,info");

                if (value === this.data) {
                    return;
                }
                if (!(value instanceof BindingList.List)) {
                    throw new _ErrorFromName("WinJS.UI.ToolBar.BadData", strings.badData);
                }

                if (this._data) {
                    this._removeDataListeners();
                }
                this._data = value;
                this._addDataListeners();
                this._dataUpdated();
            },
            enumerable: true,
            configurable: true
        });

        ToolBar.prototype.dispose = function () {
            /// <signature helpKeyword="WinJS.UI.ToolBar.dispose">
            /// <summary locid="WinJS.UI.ToolBar.dispose">
            /// Disposes this ToolBar.
            /// </summary>
            /// </signature>
            if (this._disposed) {
                return;
            }

            _ElementUtilities._resizeNotifier.unsubscribe(this._element, this._resizeHandlerBound);

            if (this._customContentFlyout) {
                this._customContentFlyout.dispose();
                this._customContentFlyout.element.parentNode.removeChild(this._customContentFlyout.element);
            }

            if (this._menu) {
                this._menu.dispose();
                this._menu.element.parentNode.removeChild(this._menu.element);
            }

            _Dispose.disposeSubTree(this.element);
            this._disposed = true;
        };

        ToolBar.prototype.forceLayout = function () {
            /// <signature helpKeyword="WinJS.UI.ToolBar.forceLayout">
            /// <summary locid="WinJS.UI.ToolBar.forceLayout">
            /// Forces the ToolBar to update its layout. Use this function when the window did not change size, but the container of the ToolBar changed size.
            /// </summary>
            /// </signature>
            this._measureCommands();
            this._positionCommands();
        };

        ToolBar.prototype._writeProfilerMark = function (text) {
            _WriteProfilerMark("WinJS.UI.ToolBar:" + this._id + ":" + text);
        };

        ToolBar.prototype._setupTree = function () {
            var _this = this;
            this._writeProfilerMark("_setupTree,info");

            this._primaryCommands = [];
            this._secondaryCommands = [];

            this._mainActionArea = _Global.document.createElement("div");
            _ElementUtilities.addClass(this._mainActionArea, _Constants.actionAreaCssClass);
            _ElementUtilities._reparentChildren(this.element, this._mainActionArea);
            this.element.appendChild(this._mainActionArea);

            this._spacer = _Global.document.createElement("div");
            _ElementUtilities.addClass(this._spacer, _Constants.spacerCssClass);
            this._mainActionArea.appendChild(this._spacer);

            this._overflowButton = _Global.document.createElement("button");
            this._overflowButton.tabIndex = 0;
            this._overflowButton.innerHTML = "<span class='" + _Constants.ellipsisCssClass + "'></span>";
            _ElementUtilities.addClass(this._overflowButton, _Constants.overflowButtonCssClass);
            this._mainActionArea.appendChild(this._overflowButton);
            this._overflowButton.addEventListener("click", function () {
                if (_this._menu) {
                    var isRTL = _Global.getComputedStyle(_this._element).direction === 'rtl';
                    _this._menu.show(_this._overflowButton, "autovertical", isRTL ? "left" : "right");
                }
            });
            this._overflowButtonWidth = _ElementUtilities.getTotalWidth(this._overflowButton);
            _ElementUtilities.addClass(this.element, _Constants.shownDisplayReducedCssClass);
        };

        ToolBar.prototype._getFocusableElementsInfo = function () {
            var _this = this;
            var focusableCommandsInfo = {
                elements: [],
                focusedIndex: -1
            };
            var elementsInReach = Array.prototype.slice.call(this._mainActionArea.children);
            if (this.shownDisplayMode === _Constants.shownDisplayModes.full && _Global.getComputedStyle(this._inlineOverflowArea).visibility !== "hidden") {
                elementsInReach = elementsInReach.concat(Array.prototype.slice.call(this._inlineOverflowArea.children));
            }

            elementsInReach.forEach(function (element) {
                if (_this._isElementFocusable(element)) {
                    focusableCommandsInfo.elements.push(element);
                    if (element.contains(_Global.document.activeElement)) {
                        focusableCommandsInfo.focusedIndex = focusableCommandsInfo.elements.length - 1;
                    }
                }
            });

            return focusableCommandsInfo;
        };

        ToolBar.prototype._dataUpdated = function () {
            var _this = this;
            this._writeProfilerMark("_dataUpdated,info");

            var changeInfo = this._getDataChangeInfo();

            // Take a snapshot of the current state
            var updateCommandAnimation = Animations._createUpdateListAnimation(changeInfo.addedElements, changeInfo.deletedElements, changeInfo.currentElements);

            // Remove deleted elements
            changeInfo.deletedElements.forEach(function (element) {
                if (element.parentElement) {
                    element.parentElement.removeChild(element);
                }
            });

            // Add elements in the right order
            changeInfo.dataElements.forEach(function (element) {
                _this._mainActionArea.appendChild(element);
            });

            if (this._overflowButton) {
                // Ensure that the overflow button is the last element in the main action area
                this._mainActionArea.appendChild(this._overflowButton);
            }

            this._primaryCommands = [];
            this._secondaryCommands = [];

            if (this.data.length > 0) {
                _ElementUtilities.removeClass(this.element, _Constants.emptyToolBarCssClass);
                this.data.forEach(function (command) {
                    if (command.section === "secondary") {
                        _this._secondaryCommands.push(command);
                    } else {
                        _this._primaryCommands.push(command);
                    }
                });

                if (!this._initializing) {
                    this._measureCommands();
                    this._positionCommands();
                }
            } else {
                this._setupOverflowArea([]);
                _ElementUtilities.addClass(this.element, _Constants.emptyToolBarCssClass);
            }

            // Execute the animation.
            updateCommandAnimation.execute();
        };

        ToolBar.prototype._getDataChangeInfo = function () {
            var child;
            var i = 0, len = 0;
            var dataElements = [];
            var deletedElements = [];
            var addedElements = [];
            var currentElements = [];

            for (i = 0, len = this.data.length; i < len; i++) {
                dataElements.push(this.data.getAt(i).element);
            }

            for (i = 0, len = this._mainActionArea.children.length; i < len; i++) {
                child = this._mainActionArea.children[i];
                if (child.style.display !== "none" || (child["winControl"] && child["winControl"].section === "secondary")) {
                    currentElements.push(child);
                    if (dataElements.indexOf(child) === -1 && child !== this._overflowButton && child !== this._spacer) {
                        deletedElements.push(child);
                    }
                }
            }

            dataElements.forEach(function (element) {
                if (deletedElements.indexOf(element) === -1 && currentElements.indexOf(element) === -1) {
                    addedElements.push(element);
                }
            });

            return {
                dataElements: dataElements,
                deletedElements: deletedElements,
                addedElements: addedElements,
                currentElements: currentElements
            };
        };

        ToolBar.prototype._refresh = function () {
            var _this = this;
            if (!this._refreshPending) {
                this._refreshPending = true;

                // Batch calls to _dataUpdated
                Scheduler.schedule(function () {
                    if (_this._refreshPending && !_this._disposed) {
                        _this._dataUpdated();
                        _this._refreshPending = false;
                    }
                }, Scheduler.Priority.high, null, "WinJS.UI.ToolBar._refresh");
            }
        };

        ToolBar.prototype._addDataListeners = function () {
            var _this = this;
            this._dataChangedEvents.forEach(function (eventName) {
                _this._data.addEventListener(eventName, _this._refreshBound, false);
            });
        };

        ToolBar.prototype._removeDataListeners = function () {
            var _this = this;
            this._dataChangedEvents.forEach(function (eventName) {
                _this._data.removeEventListener(eventName, _this._refreshBound, false);
            });
        };

        ToolBar.prototype._isElementFocusable = function (element) {
            var focusable = false;
            if (element) {
                var command = element["winControl"];
                if (command) {
                    focusable = command.element.style.display !== "none" && command.type !== _Constants.typeSeparator && !command.hidden && !command.disabled && (!command.firstElementFocus || command.firstElementFocus.tabIndex >= 0 || command.lastElementFocus.tabIndex >= 0);
                } else {
                    // e.g. the overflow button
                    focusable = element.style.display !== "none" && getComputedStyle(element).visibility !== "hidden" && element.tabIndex >= 0;
                }
            }
            return focusable;
        };

        ToolBar.prototype._isMainActionCommand = function (element) {
            // Returns true if the element is a command in the main action area, false otherwise
            return element && element["winControl"] && element.parentElement === this._mainActionArea;
        };

        ToolBar.prototype._getLastElementFocus = function (element) {
            if (this._isMainActionCommand(element)) {
                // Only commands in the main action area support lastElementFocus
                return element["winControl"].lastElementFocus;
            } else {
                return element;
            }
        };

        ToolBar.prototype._getFirstElementFocus = function (element) {
            if (this._isMainActionCommand(element)) {
                // Only commands in the main action area support firstElementFocus
                return element["winControl"].firstElementFocus;
            } else {
                return element;
            }
        };

        ToolBar.prototype._keyDownHandler = function (ev) {
            if (!ev.altKey) {
                if (_ElementUtilities._matchesSelector(ev.target, ".win-interactive, .win-interactive *")) {
                    return;
                }
                var Key = _ElementUtilities.Key;
                var rtl = _Global.getComputedStyle(this._element).direction === "rtl";
                var focusableElementsInfo = this._getFocusableElementsInfo();
                var targetCommand;

                if (focusableElementsInfo.elements.length) {
                    switch (ev.keyCode) {
                        case (rtl ? Key.rightArrow : Key.leftArrow):
                        case Key.upArrow:
                            var index = Math.max(0, focusableElementsInfo.focusedIndex - 1);
                            targetCommand = this._getLastElementFocus(focusableElementsInfo.elements[index % focusableElementsInfo.elements.length]);
                            break;

                        case (rtl ? Key.leftArrow : Key.rightArrow):
                        case Key.downArrow:
                            var index = Math.min(focusableElementsInfo.focusedIndex + 1, focusableElementsInfo.elements.length - 1);
                            targetCommand = this._getFirstElementFocus(focusableElementsInfo.elements[index]);
                            break;

                        case Key.home:
                            var index = 0;
                            targetCommand = this._getFirstElementFocus(focusableElementsInfo.elements[index]);
                            break;

                        case Key.end:
                            var index = focusableElementsInfo.elements.length - 1;
                            if (this.shownDisplayMode === _Constants.shownDisplayModes.reduced && this._isElementFocusable(this._overflowButton)) {
                                // In detached mode, the end key goes to the last command, not the overflow button,
                                // which is the last element when it is visible.
                                index = Math.max(0, index - 1);
                            }
                            targetCommand = this._getLastElementFocus(focusableElementsInfo.elements[index]);
                            break;
                    }
                }

                if (targetCommand && targetCommand !== _Global.document.activeElement) {
                    targetCommand.focus();
                    ev.preventDefault();
                }
            }
        };

        ToolBar.prototype._getDataFromDOMElements = function () {
            this._writeProfilerMark("_getDataFromDOMElements,info");

            ControlProcessor.processAll(this._mainActionArea, true);

            var commands = [];
            var childrenLength = this._mainActionArea.children.length;
            var child;
            for (var i = 0; i < childrenLength; i++) {
                child = this._mainActionArea.children[i];
                if (child["winControl"] && child["winControl"] instanceof _Command.AppBarCommand) {
                    commands.push(child["winControl"]);
                } else if (!this._overflowButton) {
                    throw new _ErrorFromName("WinJS.UI.ToolBar.MustContainCommands", strings.mustContainCommands);
                }
            }
            return new BindingList.List(commands);
        };

        ToolBar.prototype._resizeHandler = function () {
            if (this.element.offsetWidth > 0) {
                this._measureCommands(true);
                this._positionCommands();
            }
        };

        ToolBar.prototype._commandUniqueId = function (command) {
            return _ElementUtilities._uniqueID(command.element);
        };

        ToolBar.prototype._getCommandsInfo = function () {
            var width = 0;
            var commands = [];
            var priority = 0;
            var currentAssignedPriority = 0;

            for (var i = this._primaryCommands.length - 1; i >= 0; i--) {
                var command = this._primaryCommands[i];
                if (command.priority === undefined) {
                    priority = currentAssignedPriority--;
                } else {
                    priority = command.priority;
                }
                width = (command.element.style.display === "none" ? 0 : this._getCommandWidth(command));

                commands.unshift({
                    command: command,
                    width: width,
                    priority: priority
                });
            }

            return commands;
        };

        ToolBar.prototype._getPrimaryCommandsLocation = function (mainActionWidth) {
            this._writeProfilerMark("_getCommandsLocation,info");

            var mainActionCommands = [];
            var overflowCommands = [];
            var spaceLeft = mainActionWidth;
            var overflowButtonSpace = 0;
            var hasSecondaryCommands = this._secondaryCommands.length > 0;

            var commandsInfo = this._getCommandsInfo();
            var sortedCommandsInfo = commandsInfo.slice(0).sort(function (commandInfo1, commandInfo2) {
                return commandInfo1.priority - commandInfo2.priority;
            });

            var maxPriority = Number.MAX_VALUE;
            var availableWidth = mainActionWidth;

            for (var i = 0, len = sortedCommandsInfo.length; i < len; i++) {
                availableWidth -= sortedCommandsInfo[i].width;

                // The overflow button needs space if there are secondary commands, shownDisplayMode is 'full',
                // or we are not evaluating the last command.
                overflowButtonSpace = (this.shownDisplayMode === _Constants.shownDisplayModes.full || hasSecondaryCommands || (i < len - 1) ? this._overflowButtonWidth : 0);

                if (availableWidth - overflowButtonSpace < 0) {
                    maxPriority = sortedCommandsInfo[i].priority - 1;
                    break;
                }
            }

            commandsInfo.forEach(function (commandInfo) {
                if (commandInfo.priority <= maxPriority) {
                    mainActionCommands.push(commandInfo.command);
                } else {
                    overflowCommands.push(commandInfo.command);
                }
            });

            return {
                mainArea: mainActionCommands,
                overflowArea: overflowCommands
            };
        };

        ToolBar.prototype._getCommandWidth = function (command) {
            if (command.type === _Constants.typeContent) {
                return this._customContentCommandsWidth[this._commandUniqueId(command)];
            } else if (command.type === _Constants.typeSeparator) {
                return this._separatorWidth;
            } else {
                return this._standardCommandWidth;
            }
        };

        ToolBar.prototype._measureCommands = function (skipIfMeasured) {
            var _this = this;
            if (typeof skipIfMeasured === "undefined") { skipIfMeasured = false; }
            this._writeProfilerMark("_measureCommands,info");

            if (this._disposed || !_Global.document.body.contains(this._element) || this.element.offsetWidth === 0) {
                return;
            }

            if (!skipIfMeasured) {
                this._customContentCommandsWidth = {};
                this._separatorWidth = 0;
                this._standardCommandWidth = 0;
            }
            this._primaryCommands.forEach(function (command) {
                if (!command.element.parentElement) {
                    _this._mainActionArea.appendChild(command.element);
                }

                // Ensure that the element we are measuring does not have display: none (e.g. it was just added, and it
                // will be animated in)
                var originalDisplayStyle = command.element.style.display;
                command.element.style.display = "";

                if (command.type === _Constants.typeContent && !_this._customContentCommandsWidth[_this._commandUniqueId(command)]) {
                    _this._customContentCommandsWidth[_this._commandUniqueId(command)] = _ElementUtilities.getTotalWidth(command.element);
                } else if (command.type === _Constants.typeSeparator) {
                    if (!_this._separatorWidth) {
                        _this._separatorWidth = _ElementUtilities.getTotalWidth(command.element);
                    }
                } else {
                    // Button, toggle, flyout command types have the same width
                    if (!_this._standardCommandWidth) {
                        _this._standardCommandWidth = _ElementUtilities.getTotalWidth(command.element);
                    }
                }

                // Restore the original display style
                command.element.style.display = originalDisplayStyle;
            });

            if (this._overflowButton && !this._overflowButtonWidth) {
                this._overflowButtonWidth = _ElementUtilities.getTotalWidth(this._overflowButton);
            }

            this._measured = true;
        };

        ToolBar.prototype._positionCommands = function () {
            this._writeProfilerMark("_positionCommands,StartTM");

            if (this._disposed || !this._measured) {
                this._writeProfilerMark("_positionCommands,StopTM");
                return;
            }

            if (this._overflowButton) {
                // Ensure that the overflow button is the last element in the main action area
                this._mainActionArea.appendChild(this._overflowButton);
            }

            this._primaryCommands.forEach(function (command) {
                command.element.style.display = (command.hidden ? "none" : "");
            });

            var mainActionWidth = _ElementUtilities.getContentWidth(this.element);

            var commandsLocation = this._getPrimaryCommandsLocation(mainActionWidth);

            this._hideSeparatorsIfNeeded(commandsLocation.mainArea);

            // Primary commands that will be mirrored in the overflow area should be hidden so
            // that they are not visible in the main action area.
            commandsLocation.overflowArea.forEach(function (command) {
                command.element.style.display = "none";
            });

            // The secondary commands in the the main action area should be hidden since they are always
            // mirrored as new elements in the overflow area.
            this._secondaryCommands.forEach(function (command) {
                command.element.style.display = "none";
            });

            this._setupOverflowArea(commandsLocation.overflowArea);

            this._writeProfilerMark("_positionCommands,StopTM");
        };

        ToolBar.prototype._getMenuCommand = function (command) {
            var _this = this;
            var menuCommand = new _ToolBarMenuCommand._MenuCommand(this.shownDisplayMode === _Constants.shownDisplayModes.full, null, {
                label: command.label,
                type: (command.type === _Constants.typeContent ? _Constants.typeFlyout : command.type) || _Constants.typeButton,
                disabled: command.disabled,
                flyout: command.flyout,
                beforeInvoke: function () {
                    // Save the command that was selected
                    _this._chosenCommand = (menuCommand["_originalToolBarCommand"]);

                    // If this WinJS.UI.MenuCommand has type: toggle, we should also toggle the value of the original WinJS.UI.Command
                    if (_this._chosenCommand.type === _Constants.typeToggle) {
                        _this._chosenCommand.selected = !_this._chosenCommand.selected;
                    }
                }
            });

            if (command.selected) {
                menuCommand.selected = true;
            }

            if (command.extraClass) {
                menuCommand.extraClass = command.extraClass;
            }

            if (command.type === _Constants.typeContent) {
                if (!menuCommand.label) {
                    menuCommand.label = _Constants.contentMenuCommandDefaultLabel;
                }
                menuCommand.flyout = this._customContentFlyout;
            } else {
                menuCommand.onclick = command.onclick;
            }
            menuCommand["_originalToolBarCommand"] = command;
            return menuCommand;
        };

        ToolBar.prototype._setupOverflowArea = function (additionalCommands) {
            var _this = this;
            // Set up custom flyout for "content" typed commands in the overflow area.
            var isCustomContent = function (command) {
                return command.type === _Constants.typeContent;
            };
            var hasCustomContent = additionalCommands.some(isCustomContent) || this._secondaryCommands.filter(isCustomContent);

            if (hasCustomContent && !this._customContentFlyout) {
                var mainFlyout = _Global.document.createElement("div");
                this._customContentContainer = _Global.document.createElement("div");
                _ElementUtilities.addClass(this._customContentContainer, _Constants.overflowContentFlyoutCssClass);
                mainFlyout.appendChild(this._customContentContainer);
                this._customContentFlyout = new _Flyout.Flyout(mainFlyout);
                _Global.document.body.appendChild(this._customContentFlyout.element);
                this._customContentFlyout.onbeforeshow = function () {
                    _ElementUtilities.empty(_this._customContentContainer);
                    _ElementUtilities._reparentChildren(_this._chosenCommand.element, _this._customContentContainer);
                };
                this._customContentFlyout.onafterhide = function () {
                    _ElementUtilities._reparentChildren(_this._customContentContainer, _this._chosenCommand.element);
                };
            }

            if (this.shownDisplayMode === _Constants.shownDisplayModes.full) {
                // Inline menu mode always has the overflow button hidden
                this._overflowButton.style.display = "";

                this._setupOverflowAreaInline(additionalCommands);
            } else {
                var showOverflowButton = (additionalCommands.length > 0 || this._secondaryCommands.length > 0);
                this._overflowButton.style.display = showOverflowButton ? "" : "none";

                this._setupOverflowAreaDetached(additionalCommands);
            }
        };

        ToolBar.prototype._setupOverflowAreaInline = function (additionalCommands) {
            var _this = this;
            this._writeProfilerMark("_setupOverflowAreaInline,info");

            var hasToggleCommands = false, hasFlyoutCommands = false;

            _ElementUtilities.empty(this._inlineOverflowArea);

            this._hideSeparatorsIfNeeded(additionalCommands);

            // Add primary commands that should overflow
            additionalCommands.forEach(function (command) {
                if (command.type === _Constants.typeToggle) {
                    hasToggleCommands = true;
                }
                if (command.type === _Constants.typeFlyout) {
                    hasFlyoutCommands = true;
                }

                _this._inlineOverflowArea.appendChild(_this._getMenuCommand(command).element);
            });

            // Add separator between primary and secondary command if applicable
            var secondaryCommandsLength = this._secondaryCommands.length;
            if (additionalCommands.length > 0 && secondaryCommandsLength > 0) {
                var separator = new _ToolBarMenuCommand._MenuCommand(this.shownDisplayMode === _Constants.shownDisplayModes.full, null, {
                    type: _Constants.typeSeparator
                });
                this._inlineOverflowArea.appendChild(separator.element);
            }

            this._hideSeparatorsIfNeeded(this._secondaryCommands);

            // Add secondary commands
            this._secondaryCommands.forEach(function (command) {
                if (!command.hidden) {
                    if (command.type === _Constants.typeToggle) {
                        hasToggleCommands = true;
                    }
                    if (command.type === _Constants.typeFlyout) {
                        hasFlyoutCommands = true;
                    }
                    _this._inlineOverflowArea.appendChild(_this._getMenuCommand(command).element);
                }
            });

            _ElementUtilities[hasToggleCommands ? "addClass" : "removeClass"](this._inlineOverflowArea, _Constants.menuContainsToggleCommandClass);
            _ElementUtilities[hasFlyoutCommands ? "addClass" : "removeClass"](this._inlineOverflowArea, _Constants.menuContainsFlyoutCommandClass);
        };

        ToolBar.prototype._setupOverflowAreaDetached = function (additionalCommands) {
            var _this = this;
            this._writeProfilerMark("_setupOverflowAreaDetached,info");

            if (!this._menu) {
                this._menu = new Menu.Menu();
                _ElementUtilities.addClass(this._menu.element, _Constants.overflowAreaCssClass);
                this.extraClass && _ElementUtilities.addClass(this._menu.element, this.extraClass);
                _Global.document.body.appendChild(this._menu.element);
            }

            var menuCommands = [];

            // Add primary commands that should overflow to the menu commands
            additionalCommands.forEach(function (command) {
                menuCommands.push(_this._getMenuCommand(command));
            });

            // Add separator between primary and secondary command if applicable
            if (additionalCommands.length > 0 && this._secondaryCommands.length > 0) {
                menuCommands.push(new _MenuCommand.MenuCommand(null, {
                    type: _Constants.typeSeparator
                }));
            }

            // Add secondary commands to the menu commands
            this._secondaryCommands.forEach(function (command) {
                if (!command.hidden) {
                    menuCommands.push(_this._getMenuCommand(command));
                }
            });

            this._hideSeparatorsIfNeeded(menuCommands);

            // Set the menu commands
            this._menu.commands = menuCommands;
        };

        ToolBar.prototype._hideSeparatorsIfNeeded = function (commands) {
            var prevType = _Constants.typeSeparator;
            var command;

            // Hide all leading or consecutive separators
            var commandsLength = commands.length;
            commands.forEach(function (command) {
                if (command.type === _Constants.typeSeparator && prevType === _Constants.typeSeparator) {
                    command.element.style.display = "none";
                }
                prevType = command.type;
            });

            for (var i = commandsLength - 1; i >= 0; i--) {
                command = commands[i];
                if (command.type === _Constants.typeSeparator) {
                    command.element.style.display = "none";
                } else {
                    break;
                }
            }
        };

        ToolBar.supportedForProcessing = true;
        return ToolBar;
    })();
    exports.ToolBar = ToolBar;

    // addEventListener, removeEventListener, dispatchEvent
    _Base.Class.mix(ToolBar, _Control.DOMEventMixin);
});
