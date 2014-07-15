// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <dictionary>animatable,appbar,appbars,divs,Flyout,Flyouts,iframe,Statics,unfocus,unselectable</dictionary>
define('WinJS/Controls/Flyout/_Overlay',[
    'exports',
    '../../Core/_Global',
    '../../Core/_WinRT',
    '../../Core/_Base',
    '../../Core/_BaseUtils',
    '../../Core/_ErrorFromName',
    '../../Core/_Events',
    '../../Core/_Resources',
    '../../Core/_WriteProfilerMark',
    '../../Animations',
    '../../ControlProcessor',
    '../../Promise',
    '../../Scheduler',
    '../../Utilities/_Control',
    '../../Utilities/_ElementUtilities',
    '../../Utilities/_UIUtilities',
    '../AppBar/_Constants'
    ], function overlayInit(exports, _Global, _WinRT, _Base, _BaseUtils, _ErrorFromName, _Events, _Resources, _WriteProfilerMark, Animations, ControlProcessor, Promise, Scheduler, _Control, _ElementUtilities, _UIUtilities, _Constants) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        _Overlay: _Base.Namespace._lazy(function () {
            var createEvent = _Events._createEventProperty;

            // Event Names
            var BEFORESHOW = "beforeshow";
            var AFTERSHOW = "aftershow";
            var BEFOREHIDE = "beforehide";
            var AFTERHIDE = "afterhide";

            // Helper to get DOM elements from input single object or array or IDs/toolkit/dom elements
            function _resolveElements(elements) {
                // No input is just an empty array
                if (!elements) {
                    return [];
                }

                // Make sure it's in array form.
                if (typeof elements === "string" || !elements || !elements.length) {
                    elements = [elements];
                }

                // Make sure we have a DOM element for each one, (could be string id name or toolkit object)
                var i,
                    realElements = [];
                for (i = 0; i < elements.length; i++) {
                    if (elements[i]) {
                        if (typeof elements[i] === "string") {
                            var element = _Global.document.getElementById(elements[i]);
                            if (element) {
                                realElements.push(element);
                            }
                        } else if (elements[i].element) {
                            realElements.push(elements[i].element);
                        } else {
                            realElements.push(elements[i]);
                        }
                    }
                }

                return realElements;
            }

            // Helpers for keyboard showing related events
            function _allOverlaysCallback(event, command) {
                var elements = _Global.document.querySelectorAll("." + _Constants.overlayClass);
                if (elements) {
                    var len = elements.length;
                    for (var i = 0; i < len; i++) {
                        var element = elements[i];
                        var control = element.winControl;
                        if (!control._disposed) {
                            if (control) {
                                control[command](event);
                            }
                        }
                    }
                }
            }

            function _edgyMayHideFlyouts() {
                if (!_Overlay._rightMouseMightEdgy) {
                    _Overlay._hideAllFlyouts();
                }
            }

            var strings = {
                get duplicateConstruction() { return _Resources._getWinJSString("ui/duplicateConstruction").value; },
                get mustContainCommands() { return _Resources._getWinJSString("ui/mustContainCommands").value; },
                get closeOverlay() { return _Resources._getWinJSString("ui/closeOverlay").value; },
            };

            var _Overlay = _Base.Class.define(function _Overlay_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI._Overlay">
                /// <summary locid="WinJS.UI._Overlay">
                /// Constructs the Overlay control and associates it with the underlying DOM element.
                /// </summary>
                /// <param name="element" type="HTMLElement" domElement="true" locid="WinJS.UI._Overlay_p:element">
                /// The DOM element to be associated with the Overlay control.
                /// </param>
                /// <param name="options" type="Object" domElement="false" locid="WinJS.UI._Overlay_p:options">
                /// The set of options to be applied initially to the Overlay control.
                /// </param>
                /// <returns type="WinJS.UI._Overlay" locid="WinJS.UI._Overlay_returnValue">A fully constructed Overlay control.</returns>
                /// </signature>
                this._baseOverlayConstructor(element, options);
            }, {
                // Functions/properties
                _baseOverlayConstructor: function _Overlay_baseOverlayConstructor(element, options) {
                    this._disposed = false;

                    // Make sure there's an input element
                    if (!element) {
                        element = _Global.document.createElement("div");
                    }

                    // Check to make sure we weren't duplicated
                    var overlay = element.winControl;
                    if (overlay) {
                        throw new _ErrorFromName("WinJS.UI._Overlay.DuplicateConstruction", strings.duplicateConstruction);
                    }

                    if (!this._element) {
                        this._element = element;
                    }
                    this._sticky = false;
                    this._doNext = "";

                    this._element.style.visibility = "hidden";
                    this._element.style.opacity = 0;

                    // Remember ourselves
                    element.winControl = this;

                    // Attach our css class
                    _ElementUtilities.addClass(this._element, _Constants.overlayClass);
                    _ElementUtilities.addClass(this._element, "win-disposable");

                    // We don't want to be selectable, set UNSELECTABLE
                    var unselectable = this._element.getAttribute("unselectable");
                    if (unselectable === null || unselectable === undefined) {
                        this._element.setAttribute("unselectable", "on");
                    }

                    // Base animation is popIn/popOut
                    this._currentAnimateIn = this._baseAnimateIn;
                    this._currentAnimateOut = this._baseAnimateOut;
                    this._animationPromise = Promise.as();

                    // Command Animations to Queue
                    this._queuedToShow = [];
                    this._queuedToHide = [];
                    this._queuedCommandAnimation = false;

                    if (options) {
                        _Control.setOptions(this, options);
                    }
                },

                /// <field type="HTMLElement" domElement="true" readonly="true" hidden="true" locid="WinJS.UI._Overlay.element" helpKeyword="WinJS.UI._Overlay.element">The DOM element the Overlay is attached to</field>
                element: {
                    get: function () {
                        return this._element;
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI._Overlay.disabled" helpKeyword="WinJS.UI._Overlay.disabled">Disable an Overlay, setting or getting the HTML disabled attribute.  When disabled the Overlay will no longer display with show(), and will hide if currently visible.</field>
                disabled: {
                    get: function () {
                        // Ensure it's a boolean because we're using the DOM element to keep in-sync
                        return !!this._element.disabled;
                    },
                    set: function (value) {
                        // Force this check into a boolean because our current state could be a bit confused since we tie to the DOM element
                        value = !!value;
                        var oldValue = !!this._element.disabled;
                        if (oldValue !== value) {
                            this._element.disabled = value;
                            if (!this.hidden && this._element.disabled) {
                                this._hideOrDismiss();
                            }
                        }
                    }
                },

                /// <field type="Function" locid="WinJS.UI._Overlay.onbeforeshow" helpKeyword="WinJS.UI._Overlay.onbeforeshow">
                /// Occurs immediately before the control is shown.
                /// </field>
                onbeforeshow: createEvent(BEFORESHOW),

                /// <field type="Function" locid="WinJS.UI._Overlay.onaftershow" helpKeyword="WinJS.UI._Overlay.onaftershow">
                /// Occurs immediately after the control is shown.
                /// </field>
                onaftershow: createEvent(AFTERSHOW),

                /// <field type="Function" locid="WinJS.UI._Overlay.onbeforehide" helpKeyword="WinJS.UI._Overlay.onbeforehide">
                /// Occurs immediately before the control is hidden.
                /// </field>
                onbeforehide: createEvent(BEFOREHIDE),

                /// <field type="Function" locid="WinJS.UI._Overlay.onafterhide" helpKeyword="WinJS.UI._Overlay.onafterhide">
                /// Occurs immediately after the control is hidden.
                /// </field>
                onafterhide: createEvent(AFTERHIDE),

                dispose: function () {
                    /// <signature helpKeyword="WinJS.UI.Overlay.dispose">
                    /// <summary locid="WinJS.UI.Overlay.dispose">
                    /// Disposes this Overlay.
                    /// </summary>
                    /// </signature>
                    if (this._disposed) {
                        return;
                    }

                    this._disposed = true;
                    this._dispose();
                },

                _dispose: function _Overlay_dispose() {
                    // To be overridden by subclasses
                },

                show: function () {
                    /// <signature helpKeyword="WinJS.UI._Overlay.show">
                    /// <summary locid="WinJS.UI._Overlay.show">
                    /// Shows the Overlay, if hidden, regardless of other state
                    /// </summary>
                    /// </signature>
                    // call private show to distinguish it from public version
                    this._show();
                },

                _show: function _Overlay_show() {
                    // We call our base _baseShow because AppBar may need to override show
                    this._baseShow();
                },

                hide: function () {
                    /// <signature helpKeyword="WinJS.UI._Overlay.hide">
                    /// <summary locid="WinJS.UI._Overlay.hide">
                    /// Hides the Overlay, if visible, regardless of other state
                    /// </summary>
                    /// </signature>
                    // call private hide to distinguish it from public version
                    this._hide();
                },

                _hide: function _Overlay_hide() {
                    // We call our base _baseHide because AppBar may need to override hide
                    this._baseHide();
                },

                // Is the overlay "hidden"?
                /// <field type="Boolean" hidden="true" locid="WinJS.UI._Overlay.hidden" helpKeyword="WinJS.UI._Overlay.hidden">Read only, true if an overlay is currently not visible.</field>
                hidden: {
                    get: function () {
                        return (this._element.style.visibility === "hidden" ||
                                this._element.winAnimating === "hiding" ||
                                this._doNext === "hide");
                    }
                },

                addEventListener: function (type, listener, useCapture) {
                    /// <signature helpKeyword="WinJS.UI._Overlay.addEventListener">
                    /// <summary locid="WinJS.UI._Overlay.addEventListener">
                    /// Add an event listener to the DOM element for this Overlay
                    /// </summary>
                    /// <param name="type" type="String" locid="WinJS.UI._Overlay.addEventListener_p:type">Required. Event type to add, "beforehide", "afterhide", "beforeshow", or "aftershow"</param>
                    /// <param name="listener" type="Function" locid="WinJS.UI._Overlay.addEventListener_p:listener">Required. The event handler function to associate with this event.</param>
                    /// <param name="useCapture" type="Boolean" locid="WinJS.UI._Overlay.addEventListener_p:useCapture">Optional. True, register for the event capturing phase.  False for the event bubbling phase.</param>
                    /// </signature>
                    return this._element.addEventListener(type, listener, useCapture);
                },

                removeEventListener: function (type, listener, useCapture) {
                    /// <signature helpKeyword="WinJS.UI._Overlay.removeEventListener">
                    /// <summary locid="WinJS.UI._Overlay.removeEventListener">
                    /// Remove an event listener to the DOM element for this Overlay
                    /// </summary>
                    /// <param name="type" type="String" locid="WinJS.UI._Overlay.removeEventListener_p:type">Required. Event type to remove, "beforehide", "afterhide", "beforeshow", or "aftershow"</param>
                    /// <param name="listener" type="Function" locid="WinJS.UI._Overlay.removeEventListener_p:listener">Required. The event handler function to associate with this event.</param>
                    /// <param name="useCapture" type="Boolean" locid="WinJS.UI._Overlay.removeEventListener_p:useCapture">Optional. True, register for the event capturing phase.  False for the event bubbling phase.</param>
                    /// </signature>
                    return this._element.removeEventListener(type, listener, useCapture);
                },

                _baseShow: function _Overlay_baseShow() {
                    // If we are already animating, just remember this for later
                    if (this._animating || this._needToHandleShowingKeyboard || this._needToHandleHidingKeyboard) {
                        this._doNext = "show";
                        return false;
                    }

                    // Each overlay tracks the window width for detecting resizes in the resize handler.
                    this._currentDocumentWidth = this._currentDocumentWidth || _Global.document.documentElement.offsetWidth;

                    // "hiding" would need to cancel.
                    if (this._element.style.visibility !== "visible") {
                        // Let us know we're showing.
                        this._element.winAnimating = "showing";

                        // Hiding, but not none
                        this._element.style.display = "";
                            this._element.style.visibility = "hidden";

                        // In case their event is going to manipulate commands, see if there are
                        // any queued command animations we can handle while we're still hidden.
                        if (this._queuedCommandAnimation) {
                            this._showAndHideFast(this._queuedToShow, this._queuedToHide);
                            this._queuedToShow = [];
                            this._queuedToHide = [];
                        }

                        // Send our "beforeShow" event
                        this._sendEvent(_Overlay.beforeShow);

                        // Need to measure
                        this._findPosition();

                        // Make sure it's visible, and fully opaque.
                        // Do the popup thing, sending event afterward.
                        var that = this;
                        this._animationPromise = this._currentAnimateIn().
                        then(function () {
                            that._baseEndShow();
                        }, function () {
                            that._baseEndShow();
                        });
                        return true;
                    }
                    return false;
                },

                // Flyout in particular will need to measure our positioning.
                _findPosition: function _Overlay_findPosition() {
                },

                _baseEndShow: function _Overlay_baseEndShow() {
                    if (this._disposed) {
                        return;
                    }

                    // Make sure it's visible after showing
                    this._element.setAttribute("aria-hidden", "false");

                    this._element.winAnimating = "";

                    // Do our derived classes show stuff
                    this._endShow();

                    // We're shown now
                    if (this._doNext === "show") {
                        this._doNext = "";
                    }

                    // After showing, send the after showing event
                    this._sendEvent(_Overlay.afterShow);
                    this._writeProfilerMark("show,StopTM"); // Overlay writes the stop profiler mark for all of its derived classes.

                    // If we had something queued, do that
                    Scheduler.schedule(this._checkDoNext, Scheduler.Priority.normal, this, "WinJS.UI._Overlay._checkDoNext");

                },

                _endShow: function _Overlay_endShow() {
                    // Nothing by default
                },

                _baseHide: function _Overlay_baseHide() {
                    // If we are already animating, just remember this for later
                    if (this._animating || this._needToHandleShowingKeyboard) {
                        this._doNext = "hide";
                        return false;
                    }

                    // In the unlikely event we're between the hiding keyboard and the resize events, just snap it away:
                    if (this._needToHandleHidingKeyboard) {
                        // use the "uninitialized" flag
                        this._element.style.visibility = "";
                    }

                    // "showing" would need to queue up.
                    if (this._element.style.visibility !== "hidden") {
                        // Let us know we're hiding, accessibility as well.
                        this._element.winAnimating = "hiding";
                        this._element.setAttribute("aria-hidden", "true");

                        // Send our "beforeHide" event
                        this._sendEvent(_Overlay.beforeHide);

                        // If our visibility is empty, then this is the first time, just hide it
                        if (this._element.style.visibility === "") {
                            // Initial hiding, just hide it
                            this._element.style.opacity = 0;
                            this._baseEndHide();
                        } else {
                            // Make sure it's hidden, and fully transparent.
                            var that = this;
                            this._animationPromise = this._currentAnimateOut().
                            then(function () {
                                that._baseEndHide();
                            }, function () {
                                that._baseEndHide();
                            });
                        }
                        return true;
                    }

                    return false;
                },

                _baseEndHide: function _Overlay_baseEndHide() {
                    if (this._disposed) {
                        return;
                    }

                    // Make sure animation is finished.
                    this._element.style.visibility = "hidden";
                    this._element.style.display = "none";
                    this._element.winAnimating = "";

                    // In case their event is going to manipulate commands, see if there
                    // are any queued command animations we can handle now we're hidden.
                    if (this._queuedCommandAnimation) {
                        this._showAndHideFast(this._queuedToShow, this._queuedToHide);
                        this._queuedToShow = [];
                        this._queuedToHide = [];
                    }

                    // We're hidden now
                    if (this._doNext === "hide") {
                        this._doNext = "";
                    }

                    // After hiding, send our "afterHide" event
                    this._sendEvent(_Overlay.afterHide);
                    this._writeProfilerMark("hide,StopTM"); // Overlay writes the stop profiler mark for all of its derived classes.


                    // If we had something queued, do that.  This has to be after
                    // the afterHide event in case it triggers a show() and they
                    // have something to do in beforeShow that requires afterHide first.
                    Scheduler.schedule(this._checkDoNext, Scheduler.Priority.normal, this, "WinJS.UI._Overlay._checkDoNext");
                },

                _checkDoNext: function _Overlay_checkDoNext() {
                    // Do nothing if we're still animating
                    if (this._animating || this._needToHandleShowingKeyboard || this._needToHandleHidingKeyboard || this._disposed) {
                        return;
                    }

                    if (this._doNext === "hide") {
                        // Do hide first because animating commands would be easier
                        this._hide();
                        this._doNext = "";
                    } else if (this._queuedCommandAnimation) {
                        // Do queued commands before showing if possible
                        this._showAndHideQueue();
                    } else if (this._doNext === "show") {
                        // Show last so that we don't unnecessarily animate commands
                        this._show();
                        this._doNext = "";
                    }
                },

                // Default animations
                _baseAnimateIn: function _Overlay_baseAnimateIn() {
                    this._element.style.opacity = 0;
                    this._element.style.visibility = "visible";
                    // touch opacity so that IE fades from the 0 we just set to 1
                    _Global.getComputedStyle(this._element, null).opacity;
                    return Animations.fadeIn(this._element);
                },

                _baseAnimateOut: function _Overlay_baseAnimateOut() {
                    this._element.style.opacity = 1;
                    // touch opacity so that IE fades from the 1 we just set to 0
                    _Global.getComputedStyle(this._element, null).opacity;
                    return Animations.fadeOut(this._element);
                },

                _animating: {
                    get: function _Overlay_animating_get() {
                        // Ensure it's a boolean because we're using the DOM element to keep in-sync
                        return !!this._element.winAnimating;
                    }
                },

                // Send one of our events
                _sendEvent: function _Overlay_sendEvent(eventName, detail) {
                    if (this._disposed) {
                        return;
                    }
                    var event = _Global.document.createEvent("CustomEvent");
                    event.initEvent(eventName, true, true, (detail || {}));
                    this._element.dispatchEvent(event);
                },

                // Show commands
                _showCommands: function _Overlay_showCommands(commands, immediate) {
                    var showHide = this._resolveCommands(commands);
                    this._showAndHideCommands(showHide.commands, [], immediate);
                },

                // Hide commands
                _hideCommands: function _Overlay_hideCommands(commands, immediate) {
                    var showHide = this._resolveCommands(commands);
                    this._showAndHideCommands([], showHide.commands, immediate);
                },

                // Hide commands
                _showOnlyCommands: function _Overlay_showOnlyCommands(commands, immediate) {
                    var showHide = this._resolveCommands(commands);
                    this._showAndHideCommands(showHide.commands, showHide.others, immediate);
                },

                _showAndHideCommands: function _Overlay_showAndHideCommands(showCommands, hideCommands, immediate) {
                    // Immediate is "easy"
                    if (immediate || (this.hidden && !this._animating)) {
                        // Immediate mode (not animated)
                        this._showAndHideFast(showCommands, hideCommands);
                        // Need to remove them from queues, but others could be queued
                        this._removeFromQueue(showCommands, this._queuedToShow);
                        this._removeFromQueue(hideCommands, this._queuedToHide);
                    } else {

                        // Queue Commands
                        this._updateAnimateQueue(showCommands, this._queuedToShow, this._queuedToHide);
                        this._updateAnimateQueue(hideCommands, this._queuedToHide, this._queuedToShow);
                    }
                },

                _removeFromQueue: function _Overlay_removeFromQueue(commands, queue) {
                    // remove commands from queue.
                    var count;
                    for (count = 0; count < commands.length; count++) {
                        // Remove if it was in queue
                        var countQ;
                        for (countQ = 0; countQ < queue.length; countQ++) {
                            if (queue[countQ] === commands[count]) {
                                queue.splice(countQ, 1);
                                break;
                            }
                        }
                    }
                },

                _updateAnimateQueue: function _Overlay_updateAnimateQueue(addCommands, toQueue, fromQueue) {
                    if (this._disposed) {
                        return;
                    }

                    // Add addCommands to toQueue and remove addCommands from fromQueue.
                    var count;
                    for (count = 0; count < addCommands.length; count++) {
                        // See if it's already in toQueue
                        var countQ;
                        for (countQ = 0; countQ < toQueue.length; countQ++) {
                            if (toQueue[countQ] === addCommands[count]) {
                                break;
                            }
                        }
                        if (countQ === toQueue.length) {
                            // Not found, add it
                            toQueue[countQ] = addCommands[count];
                        }
                        // Remove if it was in fromQueue
                        for (countQ = 0; countQ < fromQueue.length; countQ++) {
                            if (fromQueue[countQ] === addCommands[count]) {
                                fromQueue.splice(countQ, 1);
                                break;
                            }
                        }
                    }
                    // If we haven't queued the actual animation
                    if (!this._queuedCommandAnimation) {
                        // If not already animating, we'll need to call _checkDoNext
                        if (!this._animating) {
                            Scheduler.schedule(this._checkDoNext, Scheduler.Priority.normal, this, "WinJS.UI._Overlay._checkDoNext");
                        }
                        this._queuedCommandAnimation = true;
                    }
                },

                // show/hide commands without doing any animation.
                _showAndHideFast: function _Overlay_showAndHideFast(showCommands, hideCommands) {
                    var count;
                    var command;
                    for (count = 0; count < showCommands.length; count++) {
                        command = showCommands[count];
                        if (command && command.style) {
                            command.style.visibility = "";
                            command.style.display = "";
                        }
                    }
                    for (count = 0; count < hideCommands.length; count++) {
                        command = hideCommands[count];
                        if (command && command.style) {
                            command.style.visibility = "hidden";
                            command.style.display = "none";
                        }
                    }

                    this._commandsUpdated();

                },

                // show and hide the queued commands, perhaps animating if overlay isn't hidden.
                _showAndHideQueue: function _Overlay_showAndHideQueue() {
                    // Only called if not currently animating.
                    // We'll be done with the queued stuff when we return.
                    this._queuedCommandAnimation = false;

                    // Shortcut if hidden
                    if (this.hidden) {
                        this._showAndHideFast(this._queuedToShow, this._queuedToHide);
                        // Might be something else to do
                        Scheduler.schedule(this._checkDoNext, Scheduler.Priority.normal, this, "WinJS.UI._Overlay._checkDoNext");
                    } else {
                        // Animation has 3 parts:  "hiding", "showing", and "moving"
                        // PVL has "addToList" and "deleteFromList", both of which allow moving parts.
                        // So we'll set up "add" for showing, and use "delete" for "hiding" + moving,
                        // then trigger both at the same time.
                        var showCommands = this._queuedToShow;
                        var hideCommands = this._queuedToHide;
                        var siblings = this._findSiblings(showCommands.concat(hideCommands));

                        // Filter out the commands queued for animation that don't need to be animated. 
                        var count;
                        for (count = 0; count < showCommands.length; count++) {
                            // If this one's not real or not attached, skip it
                            if (!showCommands[count] ||
                                !showCommands[count].style ||
                                !_Global.document.body.contains(showCommands[count])) {
                                // Not real, skip it
                                showCommands.splice(count, 1);
                                count--;
                            } else if (showCommands[count].style.visibility !== "hidden" && showCommands[count].style.opacity !== "0") {
                                // Don't need to animate showing this one, already visible, so now it's a sibling
                                siblings.push(showCommands[count]);
                                showCommands.splice(count, 1);
                                count--;
                            }
                        }
                        for (count = 0; count < hideCommands.length; count++) {
                            // If this one's not real or not attached, skip it
                            if (!hideCommands[count] ||
                                !hideCommands[count].style ||
                                !_Global.document.body.contains(hideCommands[count]) ||
                                hideCommands[count].style.visibility === "hidden" ||
                                hideCommands[count].style.opacity === "0") {
                                // Don't need to animate hiding this one, not real, or it's hidden,
                                // so don't even need it as a sibling.
                                hideCommands.splice(count, 1);
                                count--;
                            }
                        }

                        // Start command animations.
                        var commandsAnimationPromise = this._baseBeginAnimateCommands(showCommands, hideCommands, siblings);

                        // Hook end animations
                        var that = this;
                        if (commandsAnimationPromise) {
                            // Needed to animate
                            commandsAnimationPromise.done(
                                function () { that._baseEndAnimateCommands(hideCommands); },
                                function () { that._baseEndAnimateCommands(hideCommands); }
                                );
                        } else {
                            // Already positioned correctly
                            Scheduler.schedule(function Overlay_async_baseEndAnimationCommands() { that._baseEndAnimateCommands([]); },
                                Scheduler.Priority.normal, null,
                                "WinJS.UI._Overlay._endAnimateCommandsWithoutAnimation");
                        }
                    }

                    // Done, clear queues
                    this._queuedToShow = [];
                    this._queuedToHide = [];
                },

                _baseBeginAnimateCommands: function _Overlay_baseBeginAnimateCommands(showCommands, hideCommands, siblings) {
                    // The parameters are 3 mutually exclusive arrays of win-command elements contained in this Overlay.
                    // 1) showCommands[]: All of the HIDDEN win-command elements that ARE scheduled to show. 
                    // 2) hideCommands[]: All of the VISIBLE win-command elements that ARE shceduled to hide.
                    // 3) siblings[]: i. All VISIBLE win-command elements that ARE NOT scheduled to hide.
                    //               ii. All HIDDEN win-command elements that ARE NOT scheduled to hide OR show. 
                    this._beginAnimateCommands(showCommands, hideCommands, this._getVisibleCommands(siblings));

                    var showAnimated = null,
                        hideAnimated = null;

                    // Hide commands first, with siblings if necessary, 
                    // so that the showing commands don't disrupt the hiding commands position.
                    if (hideCommands.length > 0) {
                        hideAnimated = Animations.createDeleteFromListAnimation(hideCommands, showCommands.length === 0 ? siblings : undefined);
                    }
                    if (showCommands.length > 0) {
                        showAnimated = Animations.createAddToListAnimation(showCommands, siblings);
                    }

                    // Update hiding commands
                    for (var count = 0, len = hideCommands.length; count < len; count++) {
                        // Need to fix our position
                        var rectangle = hideCommands[count].getBoundingClientRect(),
                            style = _Global.getComputedStyle(hideCommands[count]);

                        // Use the bounding box, adjusting for margins
                        hideCommands[count].style.top = (rectangle.top - parseFloat(style.marginTop)) + "px";
                        hideCommands[count].style.left = (rectangle.left - parseFloat(style.marginLeft)) + "px";
                        hideCommands[count].style.opacity = 0;
                        hideCommands[count].style.position = "fixed";
                    }

                    // Mark as animating
                    this._element.winAnimating = "rearranging";

                    // Start hiding animations
                    // Hide needs extra cleanup when done
                    var promise = null;
                    if (hideAnimated) {
                        promise = hideAnimated.execute();
                    }

                    // Update showing commands,
                    // After hiding commands so that the hiding ones fade in the right place.
                    for (count = 0; count < showCommands.length; count++) {
                        showCommands[count].style.visibility = "";
                        showCommands[count].style.display = "";
                        showCommands[count].style.opacity = 1;
                    }

                    // Start showing animations
                    if (showAnimated) {
                        var newPromise = showAnimated.execute();
                        if (promise) {
                            promise = Promise.join([promise, newPromise]);
                        } else {
                            promise = newPromise;
                        }
                    }

                    return promise;
                },

                _beginAnimateCommands: function _Overlay_beginAnimateCommands() {
                    // Nothing by default
                },

                _getVisibleCommands: function _Overlay_getVisibleCommands(commandSubSet) {
                    var command,
                        commands = commandSubSet,
                        visibleCommands = [];

                    if (!commands) {
                        // Crawl the inner HTML for the commands. 
                        commands = this.element.querySelectorAll(".win-command");
                    }

                    for (var i = 0, len = commands.length; i < len; i++) {
                        command = commands[i].winControl || commands[i];
                        if (!command.hidden) {
                            visibleCommands.push(command);
                        }
                    }

                    return visibleCommands;
                },

                // Once animation is complete, ensure that the commands are display:none
                // and check if there's another animation to start.
                _baseEndAnimateCommands: function _Overlay_baseEndAnimateCommands(hideCommands) {
                    if (this._disposed) {
                        return;
                    }

                    // Update us
                    var count;
                    for (count = 0; count < hideCommands.length; count++) {
                        // Force us back into our appbar so that we can show again correctly
                        hideCommands[count].style.position = "";
                        hideCommands[count].getBoundingClientRect();
                        // Now make us really hidden
                        hideCommands[count].style.visibility = "hidden";
                        hideCommands[count].style.display = "none";
                        hideCommands[count].style.opacity = 1;
                    }
                    // Done animating
                    this._element.winAnimating = "";

                    this._endAnimateCommands();

                    // Might be something else to do
                    this._checkDoNext();
                },

                _endAnimateCommands: function _Overlay_endAnimateCommands() {
                    // Nothing by default
                },

                // Resolves our commands
                _resolveCommands: function _Overlay_resolveCommands(commands) {
                    // First make sure they're all DOM elements.
                    commands = _resolveElements(commands);

                    // Now make sure they're all in this container
                    var result = {};
                    result.commands = [];
                    result.others = [];
                    var allCommands = this.element.querySelectorAll(".win-command");
                    var countAll, countIn;
                    for (countAll = 0; countAll < allCommands.length; countAll++) {
                        var found = false;
                        for (countIn = 0; countIn < commands.length; countIn++) {
                            if (commands[countIn] === allCommands[countAll]) {
                                result.commands.push(allCommands[countAll]);
                                commands.splice(countIn, 1);
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            result.others.push(allCommands[countAll]);
                        }
                    }
                    return result;
                },

                // Find siblings, all DOM elements now.
                // Returns all .win-commands in this Overlay that are NOT in the passed in 'commands' array.
                _findSiblings: function _Overlay_findSiblings(commands) {
                    // Now make sure they're all in this container
                    var siblings = [];
                    var allCommands = this.element.querySelectorAll(".win-command");
                    var countAll, countIn;
                    for (countAll = 0; countAll < allCommands.length; countAll++) {
                        var found = false;
                        for (countIn = 0; countIn < commands.length; countIn++) {
                            if (commands[countIn] === allCommands[countAll]) {
                                commands.splice(countIn, 1);
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            siblings.push(allCommands[countAll]);
                        }
                    }
                    return siblings;
                },

                _baseResize: function _Overlay_baseResize(event) {
                    // Avoid the cost of a resize if the Overlay is hidden.
                    if (this._currentDocumentWidth !== undefined) {
                        if (this.hidden) {
                            this._currentDocumentWidth = undefined;
                        } else {
                            // Overlays can light dismiss on horizontal resize.
                            var newWidth = _Global.document.documentElement.offsetWidth;
                            if (this._currentDocumentWidth !== newWidth) {
                                this._currentDocumentWidth = newWidth;
                                if (!this._sticky) {
                                    this._hideOrDismiss();
                                }
                            }
                        }
                    }

                    // Call specific resize
                    this._resize(event);
                },

                _hideOrDismiss: function _Overlay_hideOrDismiss() {
                    var element = this._element;
                    if (element && _ElementUtilities.hasClass(element, _Constants.settingsFlyoutClass)) {
                        this._dismiss();
                    } else {
                        this.hide();
                    }
                },

                _resize: function _Overlay_resize() {
                    // Nothing by default
                },

                _commandsUpdated: function _Overlay_commandsUpdated() {
                    // Nothing by default
                },

                _checkScrollPosition: function _Overlay_checkScrollPosition() {
                    // Nothing by default
                },

                _showingKeyboard: function _Overlay_showingKeyboard() {
                    // Nothing by default
                },

                _hidingKeyboard: function _Overlay_hidingKeyboard() {
                    // Nothing by default
                },

                // Verify that this HTML AppBar only has AppBar/MenuCommands.
                _verifyCommandsOnly: function _Overlay_verifyCommandsOnly(element, type) {
                    var children = element.children;
                    var commands = new Array(children.length);
                    for (var i = 0; i < children.length; i++) {
                        // If constructed they have win-command class, otherwise they have data-win-control
                        if (!_ElementUtilities.hasClass(children[i], "win-command") &&
                        children[i].getAttribute("data-win-control") !== type) {
                            // Wasn't tagged with class or AppBar/MenuCommand, not an AppBar/MenuCommand
                            throw new _ErrorFromName("WinJS.UI._Overlay.MustContainCommands", strings.mustContainCommands);
                        } else {
                            // Instantiate the commands.
                            ControlProcessor.processAll(children[i]);
                            commands[i] = children[i].winControl;
                        }
                    }
                    return commands;
                },

                // Sets focus on what we think is the last tab stop. If nothing is focusable will
                // try to set focus on itself.
                _focusOnLastFocusableElementOrThis: function _Overlay_focusOnLastFocusableElementOrThis() {
                    if (!this._focusOnLastFocusableElement()) {
                        // Nothing is focusable.  Set focus to this.
                        _Overlay._trySetActive(this._element);
                    }
                },

                // Sets focus to what we think is the last tab stop. This element must have
                // a firstDiv with tabIndex equal to the lowest tabIndex in the element
                // and a finalDiv with tabIndex equal to the highest tabIndex in the element.
                // Also the firstDiv must be its first child and finalDiv be its last child.
                // Returns true if successful, false otherwise.
                _focusOnLastFocusableElement: function _Overlay_focusOnLastFocusableElement() {
                    if (this._element.firstElementChild) {
                        var oldFirstTabIndex = this._element.firstElementChild.tabIndex;
                        var oldLastTabIndex = this._element.lastElementChild.tabIndex;
                        this._element.firstElementChild.tabIndex = -1;
                        this._element.lastElementChild.tabIndex = -1;

                        var tabResult = _UIUtilities._focusLastFocusableElement(this._element);

                        if (tabResult) {
                            _Overlay._trySelect(_Global.document.activeElement);
                        }

                        this._element.firstElementChild.tabIndex = oldFirstTabIndex;
                        this._element.lastElementChild.tabIndex = oldLastTabIndex;

                        return tabResult;
                    } else {
                        return false;
                    }
                },


                // Sets focus on what we think is the first tab stop. If nothing is focusable will
                // try to set focus on itself.
                _focusOnFirstFocusableElementOrThis: function _Overlay_focusOnFirstFocusableElementOrThis() {
                    if (!this._focusOnFirstFocusableElement()) {
                        // Nothing is focusable.  Set focus to this.
                        _Overlay._trySetActive(this._element);
                    }
                },

                // Sets focus to what we think is the first tab stop. This element must have
                // a firstDiv with tabIndex equal to the lowest tabIndex in the element
                // and a finalDiv with tabIndex equal to the highest tabIndex in the element.
                // Also the firstDiv must be its first child and finalDiv be its last child.
                // Returns true if successful, false otherwise.
                _focusOnFirstFocusableElement: function _Overlay__focusOnFirstFocusableElement() {
                    if (this._element.firstElementChild) {
                        var oldFirstTabIndex = this._element.firstElementChild.tabIndex;
                        var oldLastTabIndex = this._element.lastElementChild.tabIndex;
                        this._element.firstElementChild.tabIndex = -1;
                        this._element.lastElementChild.tabIndex = -1;

                        var tabResult = _UIUtilities._focusFirstFocusableElement(this._element);

                        if (tabResult) {
                            _Overlay._trySelect(_Global.document.activeElement);
                        }

                        this._element.firstElementChild.tabIndex = oldFirstTabIndex;
                        this._element.lastElementChild.tabIndex = oldLastTabIndex;

                        return tabResult;
                    } else {
                        return false;
                    }
                },

                _addOverlayEventHandlers: function _Overlay_addOverlayEventHandlers(isFlyoutOrSettingsFlyout) {
                    // Set up global event handlers for all overlays
                    if (!_Overlay._flyoutEdgeLightDismissEvent) {
                        // Dismiss on blur & resize
                        // Focus handlers generally use WinJS.Utilities._addEventListener with focusout/focusin. This
                        // uses the browser's blur event directly beacuse _addEventListener doesn't support focusout/focusin
                        // on window.
                        _Global.addEventListener("blur", _Overlay._checkBlur, false);

                        var that = this;

                        // Be careful so it behaves in designer as well.
                        if (_WinRT.Windows.UI.Input.EdgeGesture) {
                            // Catch edgy events too
                            var commandUI = _WinRT.Windows.UI.Input.EdgeGesture.getForCurrentView();
                            commandUI.addEventListener("starting", _Overlay._hideAllFlyouts);
                            commandUI.addEventListener("completed", _edgyMayHideFlyouts);
                        }

                        if (_WinRT.Windows.UI.ViewManagement.InputPane) {
                            // React to Soft Keyboard events
                            var inputPane = _WinRT.Windows.UI.ViewManagement.InputPane.getForCurrentView();
                            inputPane.addEventListener("showing", function (event) {
                                that._writeProfilerMark("_showingKeyboard,StartTM");
                                _allOverlaysCallback(event, "_showingKeyboard");
                                that._writeProfilerMark("_showingKeyboard,StopTM");
                            });
                            inputPane.addEventListener("hiding", function (event) {
                                that._writeProfilerMark("_hidingKeyboard,StartTM");
                                _allOverlaysCallback(event, "_hidingKeyboard");
                                that._writeProfilerMark("_hidingKeyboard,StopTM");
                            });
                            // Document scroll event
                            _Global.document.addEventListener("scroll", function (event) {
                                that._writeProfilerMark("_checkScrollPosition,StartTM");
                                _allOverlaysCallback(event, "_checkScrollPosition");
                                that._writeProfilerMark("_checkScrollPosition,StopTM");
                            });
                        }

                        // Window resize event
                        _Global.addEventListener("resize", function (event) {
                            that._writeProfilerMark("_baseResize,StartTM");
                            _allOverlaysCallback(event, "_baseResize");
                            that._writeProfilerMark("_baseResize,StopTM");
                        });

                        _Overlay._flyoutEdgeLightDismissEvent = true;
                    }

                    // Individual handlers for Flyouts only
                    if (isFlyoutOrSettingsFlyout) {
                        this._handleEventsForFlyoutOrSettingsFlyout();
                    }
                },

                _handleEventsForFlyoutOrSettingsFlyout: function _Overlay_handleEventsForFlyoutOrSettingsFlyout() {
                    var that = this;
                    // Need to hide ourselves if we lose focus
                    _ElementUtilities._addEventListener(this._element, "focusout", function (e) { _Overlay._hideIfLostFocus(that, e); }, false);

                    // Attempt to flag right clicks that may turn into edgy
                    _ElementUtilities._addEventListener(this._element, "pointerdown", _Overlay._checkRightClickDown, true);
                    _ElementUtilities._addEventListener(this._element, "pointerup", _Overlay._checkRightClickUp, true);
                },

                _writeProfilerMark: function _Overlay_writeProfilerMark(text) {
                    _WriteProfilerMark("WinJS.UI._Overlay:" + this._id + ":" + text);
                }
            },
            {
                // Statics
                _clickEatingAppBarDiv: false,
                _clickEatingFlyoutDiv: false,
                _flyoutEdgeLightDismissEvent: false,

                _hideFlyouts: function (testElement, notSticky) {
                    var elements = testElement.querySelectorAll(_Constants.flyoutSelector);
                    var len = elements.length;
                    for (var i = 0; i < len; i++) {
                        var element = elements[i];
                        if (element.style.visibility !== "hidden") {
                            var flyout = element.winControl;
                            if (flyout && (!notSticky || !flyout._sticky)) {
                                flyout._hideOrDismiss();
                            }
                        }
                    }
                },

                _hideSettingsFlyouts: function (testElement, notSticky) {
                    var elements = testElement.querySelectorAll(_Constants.settingsFlyoutSelector);
                    var len = elements.length;
                    for (var i = 0; i < len; i++) {
                        var element = elements[i];
                        if (element.style.visibility !== "hidden") {
                            var settingsFlyout = element.winControl;
                            if (settingsFlyout && (!notSticky || !settingsFlyout._sticky)) {
                                settingsFlyout._hideOrDismiss();
                            }
                        }
                    }
                },

                _hideAllFlyouts: function () {
                    _Overlay._hideFlyouts(_Global.document, true);
                    _Overlay._hideSettingsFlyouts(_Global.document, true);
                },

                _createClickEatingDivTemplate: function (divClass, hideClickEatingDivFunction) {
                    var clickEatingDiv = _Global.document.createElement("section");
                    _ElementUtilities.addClass(clickEatingDiv, divClass);
                    _ElementUtilities._addEventListener(clickEatingDiv, "pointerdown", function (event) { _Overlay._checkSameClickEatingPointerUp(event, true); }, true);
                    _ElementUtilities._addEventListener(clickEatingDiv, "pointerup", function (event) { _Overlay._checkClickEatingPointerDown(event, true); }, true);
                    clickEatingDiv.addEventListener("click", hideClickEatingDivFunction, true);
                    // Tell Aria that it's clickable
                    clickEatingDiv.setAttribute("role", "menuitem");
                    clickEatingDiv.setAttribute("aria-label", strings.closeOverlay);
                    // Prevent CED from removing any current selection
                    clickEatingDiv.setAttribute("unselectable", "on");
                    _Global.document.body.appendChild(clickEatingDiv);
                    return clickEatingDiv;
                },

                // Used by AppBar, and Settings Pane
                _createClickEatingDivAppBar: function () {
                    if (!_Overlay._clickEatingAppBarDiv) {
                        _Overlay._clickEatingAppBarDiv = _Overlay._createClickEatingDivTemplate(_Constants._clickEatingAppBarClass, _Overlay._handleAppBarClickEatingClick);
                    }
                },

                // Used by Flyout and Menu
                _createClickEatingDivFlyout: function () {
                    if (!_Overlay._clickEatingFlyoutDiv) {
                        _Overlay._clickEatingFlyoutDiv = _Overlay._createClickEatingDivTemplate(_Constants._clickEatingFlyoutClass, _Overlay._handleFlyoutClickEatingClick);
                    }
                },

                // All click-eaters eat "down" clicks so that we can still eat
                // the "up" click that'll come later.
                _checkClickEatingPointerDown: function (event, stopPropogation) {
                    var target = event.currentTarget;
                    if (target) {
                        try {
                            // Remember pointer id and remember right mouse
                            target._winPointerId = event.pointerId;
                            // Cache right mouse if that was what happened
                            target._winRightMouse = (event.button === 2);
                        } catch (e) { }
                    }

                    if (stopPropogation && !target._winRightMouse) {
                        event.stopPropagation();
                        event.preventDefault();
                    }
                },

                // Make sure that if we have an up we had an earlier down of the same kind
                _checkSameClickEatingPointerUp: function (event, stopPropogation) {
                    var result = false,
                        rightMouse = false,
                        target = event.currentTarget;

                    // Same pointer we were watching?
                    try {
                        if (target && target._winPointerId === event.pointerId) {
                            // Same pointer
                            result = true;
                            rightMouse = target._winRightMouse;
                            // For click-eaters, don't count right click the same because edgy will dismiss
                            if (rightMouse && stopPropogation) {
                                result = false;
                            }
                        }
                    } catch (e) { }


                    if (stopPropogation && !rightMouse) {
                        event.stopPropagation();
                        event.preventDefault();
                    }

                    return result;
                },

                // If they click on a click eating div, even with a right click,
                // touch or anything, then we want to light dismiss that layer.
                _handleAppBarClickEatingClick: function (event) {
                    event.stopPropagation();
                    event.preventDefault();

                    _Overlay._hideLightDismissAppBars(null, false);
                    _Overlay._hideClickEatingDivAppBar();
                    _Overlay._hideAllFlyouts();
                },

                // If they click on a click eating div, even with a right click,
                // touch or anything, then we want to light dismiss that layer.
                _handleFlyoutClickEatingClick: function (event) {
                    event.stopPropagation();
                    event.preventDefault();

                    // Don't light dismiss AppBars because edgy will do that as needed,
                    // so flyouts only.
                    _Overlay._hideClickEatingDivFlyout();
                    _Overlay._hideFlyouts(_Global.document, true);
                },

                _checkRightClickDown: function (event) {
                    _Overlay._checkClickEatingPointerDown(event, false);
                },

                _checkRightClickUp: function (event) {
                    if (_Overlay._checkSameClickEatingPointerUp(event, false)) {
                        // It was a right click we may want to eat.
                        _Overlay._rightMouseMightEdgy = true;
                        _BaseUtils._yieldForEvents(function () { _Overlay._rightMouseMightEdgy = false; });
                    }
                },

                _showClickEatingDivAppBar: function () {
                    Scheduler.schedule(function Overlay_async_showClickEatingDivAppBar() {
                        if (_Overlay._clickEatingAppBarDiv) {
                        _Overlay._clickEatingAppBarDiv.style.display = "block";
                        }
                    }, Scheduler.Priority.high, null, "WinJS.UI._Overlay._showClickEatingDivAppBar");
                },

                _hideClickEatingDivAppBar: function () {
                    Scheduler.schedule(function Overlay_async_hideClickEatingDivAppBar() {
                        if (_Overlay._clickEatingAppBarDiv) {
                        _Overlay._clickEatingAppBarDiv.style.display = "none";
                        }
                    }, Scheduler.Priority.high, null, "WinJS.UI._Overlay._hideClickEatingDivAppBar");
                },

                _showClickEatingDivFlyout: function () {
                    Scheduler.schedule(function Overlay_async_showClickEatingDivFlyout() {
                        if (_Overlay._clickEatingFlyoutDiv) {
                        _Overlay._clickEatingFlyoutDiv.style.display = "block";
                        }
                    }, Scheduler.Priority.high, null, "WinJS.UI._Overlay._showClickEatingDivFlyout");
                },

                _hideClickEatingDivFlyout: function () {
                    Scheduler.schedule(function Overlay_async_hideClickEatingDivFlyout() {
                        if (_Overlay._clickEatingFlyoutDiv) {
                        _Overlay._clickEatingFlyoutDiv.style.display = "none";
                        }
                    }, Scheduler.Priority.high, null, "WinJS.UI._Overlay._hideClickEatingDivFlyout");
                },

                _isFlyoutVisible: function () {
                    if (!_Overlay._clickEatingFlyoutDiv) {
                        return false;
                    }
                    return (_Overlay._clickEatingFlyoutDiv.style.display === "block");
                },

                _hideIfLostFocus: function (overlay) {
                    // If we're still showing we haven't really lost focus
                    if (overlay.hidden || overlay.element.winAnimating === "showing" || overlay._sticky) {
                        return;
                    }
                    // If the active thing is within our element, we haven't lost focus
                    var active = _Global.document.activeElement;
                    if (overlay._element && overlay._element.contains(active)) {
                        return;
                    }
                    // SettingFlyouts don't dismiss if they spawned a flyout
                    if (_ElementUtilities.hasClass(overlay._element, _Constants.settingsFlyoutClass)) {
                        var settingsFlyout = overlay;
                        var flyoutControl = _Overlay._getParentControlUsingClassName(active, "win-flyout");
                        if (flyoutControl && flyoutControl._previousFocus && settingsFlyout.element.contains(flyoutControl._previousFocus)) {
                            _ElementUtilities._addEventListener(flyoutControl.element, 'focusout', function focusOut(event) {
                                // When the Flyout closes, hide the SetingsFlyout if it didn't regain focus.
                                _Overlay._hideIfLostFocus(settingsFlyout, event);
                                _ElementUtilities._removeEventListener(flyoutControl.element, 'focusout', focusOut, false);
                            }, false);
                            return;
                        }
                    }
                    // Do not hide focus if focus moved to a CED. Let the click handler on the CED take care of hiding us.
                    if (active &&
                        (_ElementUtilities.hasClass(active, _Constants._clickEatingFlyoutClass) ||
                         _ElementUtilities.hasClass(active, _Constants._clickEatingAppBarClass))) {
                        return;
                    }

                    overlay._hideOrDismiss();
                },

                // Want to hide flyouts on blur.
                // We get blur if we click off the window, including to an iframe within our window.
                // Both blurs call this function, but fortunately document.hasFocus is true if either
                // the document window or our iframe window has focus.
                _checkBlur: function () {
                    if (!_Global.document.hasFocus()) {
                        // The document doesn't have focus, so they clicked off the app, so light dismiss.
                        _Overlay._hideAllFlyouts();
                        _Overlay._hideLightDismissAppBars(null, false);
                    } else {
                        if ((_Overlay._clickEatingFlyoutDiv &&
                             _Overlay._clickEatingFlyoutDiv.style.display === "block") ||
                            (_Overlay._clickEatingAppBarDiv &&
                             _Overlay._clickEatingAppBarDiv.style.display === "block")) {
                            // We were trying to unfocus the window, but document still has focus,
                            // so make sure the iframe that took the focus will check for blur next time.
                            // We don't have to do this if the click eating div is hidden because then
                            // there would be no flyout or appbar needing light dismiss.
                            var active = _Global.document.activeElement;
                            if (active && active.tagName === "IFRAME" && !active.msLightDismissBlur) {
                                // - This will go away when the IFRAME goes away, and we only create one.
                                // - This only works in IE because other browsers don't fire focus events on iframe elements.
                                // - Can't use WinJS.Utilities._addEventListener's focusout because it doesn't fire when an
                                //   iframe loses focus due to changing windows.
                                active.addEventListener("blur", _Overlay._checkBlur, false);
                                active.msLightDismissBlur = true;
                            }
                        }
                    }
                },

                // Try to set us as active
                _trySetActive: function (element) {
                    if (!element || !_Global.document.body || !_Global.document.body.contains(element)) {
                        return false;
                    }
                    if (!_ElementUtilities._setActive(element)) {
                        return false;
                    }
                    return (element === _Global.document.activeElement);
                },

                // Try to select the text so keyboard can be used.
                _trySelect: function (element) {
                    try {
                        if (element && element.select) {
                            element.select();
                        }
                    } catch (e) { }
                },

                // Prevent the document.activeElement from showing focus
                _addHideFocusClass: function (element) {
                    if (element) {
                        _ElementUtilities.addClass(element, _Constants.hideFocusClass);
                        _ElementUtilities._addEventListener(element, "focusout", _Overlay._removeHideFocusClass, false);
                    }
                },

                // Allow the event.target (element that is losing focus) to show focus next time it gains focus
                _removeHideFocusClass: function (event) {
                    // Make sure we really lost focus and was not just an App switch
                    var target = event.target;
                    if (target && target !== _Global.document.activeElement) {
                        _ElementUtilities.removeClass(target, _Constants.hideFocusClass);
                        _ElementUtilities._removeEventListener(event.target, "focusout", _Overlay._removeHideFocusClass, false);
                    }
                },

                _getParentControlUsingClassName: function (element, className) {
                    while (element && element !== _Global.document.body) {
                        if (_ElementUtilities.hasClass(element, className)) {
                            return element.winControl;
                        }
                        element = element.parentNode;
                    }
                    return null;
                },

                // Hide all light dismiss AppBars if what has focus is not part of a AppBar or flyout.
                _hideIfAllAppBarsLostFocus: function _hideIfAllAppBarsLostFocus() {
                    if (!_Overlay._isAppBarOrChild(_Global.document.activeElement)) {
                        _Overlay._hideLightDismissAppBars(null, false);
                        // Ensure that sticky appbars clear cached focus after light dismiss are dismissed, which moved focus.
                        _Overlay._ElementWithFocusPreviousToAppBar = null;
                    }
                },

                _hideLightDismissAppBars: function (event, keyboardInvoked) {
                    var elements = _Global.document.querySelectorAll("." + _Constants.appBarClass);
                    var len = elements.length;
                    var AppBars = [];
                    for (var i = 0; i < len; i++) {
                        var AppBar = elements[i].winControl;
                        if (AppBar && !AppBar.sticky && !AppBar.hidden) {
                            AppBars.push(AppBar);
                        }
                    }

                    _Overlay._hideAllBars(AppBars, keyboardInvoked);
                },

                // Show or hide all bars
                _hideAllBars: function _hideAllBars(bars, keyboardInvoked) {
                    var allBarsAnimationPromises = bars.map(function (bar) {
                        bar._keyboardInvoked = keyboardInvoked;
                        bar.hide();
                        return bar._animationPromise;
                    });
                    return Promise.join(allBarsAnimationPromises);
                },

                // Returns appbar element (or CED/sentinal) if the element or what had focus before the element (if a Flyout) is either:
                //   1) an AppBar,
                //   2) OR in the subtree of an AppBar,
                //   3) OR an AppBar click eating div.
                // Returns null otherwise.
                _isAppBarOrChild: function (element) {
                    // If it's null, we can't do this
                    if (!element) {
                        return null;
                    }

                    // click eating divs and sentinals should not have children
                    if (_ElementUtilities.hasClass(element, _Constants._clickEatingAppBarClass) ||
                        _ElementUtilities.hasClass(element, _Constants._clickEatingFlyoutClass) ||
                        _ElementUtilities.hasClass(element, _Constants.firstDivClass) ||
                        _ElementUtilities.hasClass(element, _Constants.finalDivClass) ||
                        _ElementUtilities.hasClass(element, _Constants.ellipsisClass)) {
                        return element;
                    }

                    while (element && element !== _Global.document) {
                        if (_ElementUtilities.hasClass(element, _Constants.appBarClass)) {
                            return element;
                        }
                        if (_ElementUtilities.hasClass(element, "win-flyout")
                         && element !== element.winControl._previousFocus) {
                            var flyoutControl = element.winControl;
                            // If _previousFocus was in a light dismissable AppBar, then this Flyout is considered of an extension of it and that AppBar should not hide.
                            // Hook up a 'focusout' listener to this Flyout element to make sure that light dismiss AppBars hide if focus moves anywhere other than back to an AppBar.
                            var appBarElement = _Overlay._isAppBarOrChild(flyoutControl._previousFocus);
                            if (appBarElement) {
                                _ElementUtilities._addEventListener(flyoutControl.element, 'focusout', function focusOut() {
                                    // Hides any shown AppBars if the new activeElement is not in an AppBar.
                                    _Overlay._hideIfAllAppBarsLostFocus();
                                    _ElementUtilities._removeEventListener(flyoutControl.element, 'focusout', focusOut, false);
                                }, false);
                            }
                            return appBarElement;
                        }

                        element = element.parentNode;
                    }

                    return null;
                },

                // Global keyboard hiding offset
                _keyboardInfo: {
                    // Determine if the keyboard is visible or not.
                    get _visible() {
                        try {
                            return (
                                _WinRT.Windows.UI.ViewManagement.InputPane &&
                                _WinRT.Windows.UI.ViewManagement.InputPane.getForCurrentView().occludedRect.height > 0
                            );
                        } catch (e) {
                            return false;
                        }
                    },

                    // See if we have to reserve extra space for the IHM
                    get _extraOccluded() {
                        var occluded;
                        if (_WinRT.Windows.UI.ViewManagement.InputPane) {
                            try {
                                occluded = _WinRT.Windows.UI.ViewManagement.InputPane.getForCurrentView().occludedRect.height;
                            } catch (e) {
                            }
                        }

                        // Nothing occluded if not visible.
                        if (occluded && !_Overlay._keyboardInfo._isResized) {
                            // View hasn't been resized, need to return occluded height.
                            return occluded;
                        }

                        // View already has space for keyboard or there's no keyboard
                        return 0;
                    },

                    // See if the view has been resized to fit a keyboard
                    get _isResized() {
                        // Compare ratios.  Very different includes IHM space.
                        var heightRatio = _Global.document.documentElement.clientHeight / _Global.innerHeight,
                            widthRatio = _Global.document.documentElement.clientWidth / _Global.innerWidth;

                        // If they're nearly identical, then the view hasn't been resized for the IHM
                        // Only check one bound because we know the IHM will make it shorter, not skinnier.
                        return (widthRatio / heightRatio < 0.99);
                    },

                    // Get the top of our visible area in terms of its absolute distance from the top of document.documentElement. 
                    // Normalizes any offsets which have have occured between the visual viewport and the layout viewport due to resizing the viewport to fit the IHM and/or optical zoom.
                    get _visibleDocTop() {
                        return _Global.pageYOffset - _Global.document.documentElement.scrollTop;
                    },

                    // Get the bottom of our visible area.
                    get _visibleDocBottom() {
                        return _Overlay._keyboardInfo._visibleDocTop + _Overlay._keyboardInfo._visibleDocHeight;
                    },

                    // Get the height of the visible document, e.g. the height of the visual viewport minus any IHM occlusion.
                    get _visibleDocHeight() {
                        return _Overlay._keyboardInfo._visualViewportHeight - _Overlay._keyboardInfo._extraOccluded;
                    },

                    // Get the visual viewport height. window.innerHeight doesn't return floating point values which are present with high DPI.
                    get _visualViewportHeight() {
                        var boundingRect = _Overlay._keyboardInfo._visualViewportSpace;
                        return boundingRect.bottom - boundingRect.top;
                    },

                    // Get the visual viewport width. window.innerHeight doesn't return floating point values which are present with high DPI.
                    get _visualViewportWidth() {
                        var boundingRect = _Overlay._keyboardInfo._visualViewportSpace;
                        return boundingRect.right - boundingRect.left;
                    },

                    get _visualViewportSpace() {
                        var className = "win-visualviewport-space";
                        var visualViewportSpace = _Global.document.body.querySelector("." + className);
                        if (!visualViewportSpace) {
                            visualViewportSpace = _Global.document.createElement("DIV");
                            visualViewportSpace.className = className;
                            _Global.document.body.appendChild(visualViewportSpace);
                        }

                        return visualViewportSpace.getBoundingClientRect();
                    },

                    // Get offset of visible window from bottom.
                    get _visibleDocBottomOffset() {
                        // If the view resizes we can return 0 and rely on appbar's -ms-device-fixed css positioning. 
                        return (_Overlay._keyboardInfo._isResized) ? 0 : _Overlay._keyboardInfo._extraOccluded;
                    },

                    // Get total length of the IHM showPanel animation
                    get _animationShowLength() {
                        if (_WinRT.Windows.UI.Core.AnimationMetrics) {
                            var a = _WinRT.Windows.UI.Core.AnimationMetrics,
                            animationDescription = new a.AnimationDescription(a.AnimationEffect.showPanel, a.AnimationEffectTarget.primary);
                        var animations = animationDescription.animations;
                        var max = 0;
                        for (var i = 0; i < animations.size; i++) {
                            var animation = animations[i];
                            max = Math.max(max, animation.delay + animation.duration);
                        }
                        return max;
                        } else {
                            return 0;
                        }
                    }
                },

                _ElementWithFocusPreviousToAppBar: null,

                // for tests
                _clickEatingAppBarClass: _Constants._clickEatingAppBarClass,
                _clickEatingFlyoutClass: _Constants._clickEatingFlyoutClass,

                // Padding for IHM timer to allow for first scroll event
                _scrollTimeout: 150,

                // Events
                beforeShow: BEFORESHOW,
                beforeHide: BEFOREHIDE,
                afterShow: AFTERSHOW,
                afterHide: AFTERHIDE,

                commonstrings: {
                    get cannotChangeCommandsWhenVisible() { return _Resources._getWinJSString("ui/cannotChangeCommandsWhenVisible").value; },
                    get cannotChangeHiddenProperty() { return _Resources._getWinJSString("ui/cannotChangeHiddenProperty").value; }
                }
            });

            _Base.Class.mix(_Overlay, _Control.DOMEventMixin);

            return _Overlay;
        })
    });

});



define('require-style!less/desktop/controls',[],function(){});

define('require-style!less/phone/controls',[],function(){});
// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
/// <dictionary>appbar,Flyout,Flyouts,Statics</dictionary>
define('WinJS/Controls/Flyout',[
    'exports',
    '../Core/_Global',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_ErrorFromName',
    '../Core/_Resources',
    '../Core/_WriteProfilerMark',
    '../Animations',
    '../Utilities/_Dispose',
    '../Utilities/_ElementUtilities',
    '../Utilities/_UIUtilities',
    './AppBar/_Constants',
    './Flyout/_Overlay',
    'require-style!less/desktop/controls',
    'require-style!less/phone/controls'
    ], function flyoutInit(exports, _Global, _Base, _BaseUtils, _ErrorFromName, _Resources, _WriteProfilerMark, Animations, _Dispose, _ElementUtilities, _UIUtilities, _Constants, _Overlay) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.Flyout">
        /// Displays lightweight UI that is either informational, or requires user interaction.
        /// Unlike a dialog, a Flyout can be light dismissed by clicking or tapping off of it.
        /// </summary>
        /// <compatibleWith platform="Windows" minVersion="8.0"/>
        /// </field>
        /// <name locid="WinJS.UI.Flyout_name">Flyout</name>
        /// <icon src="ui_winjs.ui.flyout.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.flyout.16x16.png" width="16" height="16" />
        /// <htmlSnippet supportsContent="true"><![CDATA[<div data-win-control="WinJS.UI.Flyout"></div>]]></htmlSnippet>
        /// <event name="beforeshow" locid="WinJS.UI.Flyout_e:beforeshow">Raised just before showing a flyout.</event>
        /// <event name="aftershow" locid="WinJS.UI.Flyout_e:aftershow">Raised immediately after a flyout is fully shown.</event>
        /// <event name="beforehide" locid="WinJS.UI.Flyout_e:beforehide">Raised just before hiding a flyout.</event>
        /// <event name="afterhide" locid="WinJS.UI.Flyout_e:afterhide">Raised immediately after a flyout is fully hidden.</event>
        /// <part name="flyout" class="win-flyout" locid="WinJS.UI.Flyout_part:flyout">The Flyout control itself.</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        Flyout: _Base.Namespace._lazy(function () {
            var Key = _ElementUtilities.Key;

            function getDimension(element, property) {
                return parseFloat(element, _Global.getComputedStyle(element, null)[property]);
            }

            var strings = {
                get ariaLabel() { return _Resources._getWinJSString("ui/flyoutAriaLabel").value; },
                get noAnchor() { return _Resources._getWinJSString("ui/noAnchor").value; },
                get badPlacement() { return _Resources._getWinJSString("ui/badPlacement").value; },
                get badAlignment() { return _Resources._getWinJSString("ui/badAlignment").value; }
            };

            var Flyout = _Base.Class.derive(_Overlay._Overlay, function Flyout_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.Flyout.Flyout">
                /// <summary locid="WinJS.UI.Flyout.constructor">
                /// Creates a new Flyout control.
                /// </summary>
                /// <param name="element" type="HTMLElement" domElement="true" locid="WinJS.UI.Flyout.constructor_p:element">
                /// The DOM element that hosts the control.
                /// </param>
                /// <param name="options" type="Object" domElement="false" locid="WinJS.UI.Flyout.constructor_p:options">
                /// The set of properties and values to apply to the new Flyout. 
                /// </param>
                /// <returns type="WinJS.UI.Flyout" locid="WinJS.UI.Flyout.constructor_returnValue">The new Flyout control.</returns>
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </signature>

                // Simplify checking later
                options = options || {};

                // Make sure there's an input element            
                this._element = element || _Global.document.createElement("div");
                this._id = this._element.id || _ElementUtilities._uniqueID(this._element);
                this._writeProfilerMark("constructor,StartTM");

                this._baseFlyoutConstructor(this._element, options);

                var _elms = this._element.getElementsByTagName("*");
                var firstDiv = this._addFirstDiv();
                firstDiv.tabIndex = _UIUtilities._getLowestTabIndexInList(_elms);
                var finalDiv = this._addFinalDiv();
                finalDiv.tabIndex = _UIUtilities._getHighestTabIndexInList(_elms);

                // Handle "esc" & "tab" key presses
                this._element.addEventListener("keydown", this._handleKeyDown, true);

                this._writeProfilerMark("constructor,StopTM");
                return this;
            }, {
                _lastMaxHeight: null,

                _baseFlyoutConstructor: function Flyout_baseFlyoutContstructor(element, options) {
                    // Flyout constructor

                    // We have some options with defaults
                    this._placement = "auto";
                    this._alignment = "center";

                    // Call the base overlay constructor helper
                    this._baseOverlayConstructor(element, options);

                    // Make a click eating div
                    _Overlay._Overlay._createClickEatingDivFlyout();

                    // Start flyouts hidden
                    this._element.style.visibilty = "hidden";
                    this._element.style.display = "none";

                    // Attach our css class
                    _ElementUtilities.addClass(this._element, _Constants.flyoutClass);
                    _ElementUtilities.addClass(this._element, _Constants.flyoutLightClass);

                    // Make sure we have an ARIA role
                    var role = this._element.getAttribute("role");
                    if (role === null || role === "" || role === undefined) {
                        if (_ElementUtilities.hasClass(this._element, _Constants.menuClass)) {
                            this._element.setAttribute("role", "menu");
                        } else {
                            this._element.setAttribute("role", "dialog");
                        }
                    }
                    var label = this._element.getAttribute("aria-label");
                    if (label === null || label === "" || label === undefined) {
                        this._element.setAttribute("aria-label", strings.ariaLabel);
                    }

                    // Base animation is popIn, but our flyout has different arguments
                    this._currentAnimateIn = this._flyoutAnimateIn;
                    this._currentAnimateOut = this._flyoutAnimateOut;

                    // Make sure _Overlay event handlers are hooked up
                    this._addOverlayEventHandlers(true);
                },

                /// <field type="String" locid="WinJS.UI.Flyout.anchor" helpKeyword="WinJS.UI.Flyout.anchor">
                /// Gets or sets the Flyout control's anchor. The anchor element is the HTML element which the Flyout originates from and is positioned relative to.
                /// (This setting can be overridden when you call the show method.)
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                anchor: {
                    get: function () {
                        return this._anchor;
                    },
                    set: function (value) {
                        this._anchor = value;
                    }
                },

                /// <field type="String" defaultValue="auto" oamOptionsDatatype="WinJS.UI.Flyout.placement" locid="WinJS.UI.Flyout.placement" helpKeyword="WinJS.UI.Flyout.placement">
                /// Gets or sets the default placement of this Flyout. (This setting can be overridden when you call the show method.)
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                placement: {
                    get: function () {
                        return this._placement;
                    },
                    set: function (value) {
                        if (value !== "top" && value !== "bottom" && value !== "left" && value !== "right" && value !== "auto") {
                            // Not a legal placement value
                            throw new _ErrorFromName("WinJS.UI.Flyout.BadPlacement", strings.badPlacement);
                        }
                        this._placement = value;
                    }
                },

                /// <field type="String" defaultValue="center" oamOptionsDatatype="WinJS.UI.Flyout.alignment" locid="WinJS.UI.Flyout.alignment" helpKeyword="WinJS.UI.Flyout.alignment">
                /// Gets or sets the default alignment for this Flyout. (This setting can be overridden when you call the show method.)
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                alignment: {
                    get: function () {
                        return this._alignment;
                    },
                    set: function (value) {
                        if (value !== "right" && value !== "left" && value !== "center") {
                            // Not a legal alignment value
                            throw new _ErrorFromName("WinJS.UI.Flyout.BadAlignment", strings.badAlignment);
                        }
                        this._alignment = value;
                    }
                },

                _dispose: function Flyout_dispose() {
                    _Dispose.disposeSubTree(this.element);
                    this._hide();
                    this.anchor = null;
                },

                show: function (anchor, placement, alignment) {
                    /// <signature helpKeyword="WinJS.UI.Flyout.show">
                    /// <summary locid="WinJS.UI.Flyout.show">
                    /// Shows the Flyout, if hidden, regardless of other states. 
                    /// </summary>
                    /// <param name="anchor" type="HTMLElement" domElement="true" locid="WinJS.UI.Flyout.show_p:anchor">
                    /// The DOM element, or ID of a DOM element to anchor the Flyout, overriding the anchor property for this time only.
                    /// </param>
                    /// <param name="placement" type="Object" domElement="false" locid="WinJS.UI.Flyout.show_p:placement">
                    /// The placement of the Flyout to the anchor: 'auto' (default), 'top', 'bottom', 'left', or 'right'.  This parameter overrides the placement property for this show only.
                    /// </param>
                    /// <param name="alignment" type="Object" domElement="false" locid="WinJS.UI.Flyout.show:alignment">
                    /// For 'top' or 'bottom' placement, the alignment of the Flyout to the anchor's edge: 'center' (default), 'left', or 'right'.
                    /// This parameter overrides the alignment property for this show only.
                    /// </param>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>
                    this._writeProfilerMark("show,StartTM"); // The corresponding "stop" profiler mark is handled in _Overlay._baseEndShow().
                    // Just call private version to make appbar flags happy
                    this._show(anchor, placement, alignment);
                },

                _show: function Flyout_show(anchor, placement, alignment) {
                    this._baseFlyoutShow(anchor, placement, alignment);
                },

                hide: function () {
                    /// <signature helpKeyword="WinJS.UI.Flyout.hide">
                    /// <summary locid="WinJS.UI.Flyout.hide">
                    /// Hides the Flyout, if visible, regardless of other states.
                    /// </summary>
                    /// <compatibleWith platform="Windows" minVersion="8.0"/>
                    /// </signature>
                    // Just wrap the private one, turning off keyboard invoked flag
                    this._writeProfilerMark("hide,StartTM"); // The corresponding "stop" profiler mark is handled in _Overlay._baseEndHide().
                    this._keyboardInvoked = false;
                    this._hide();
                },

                _hide: function Flyout_hide() {
                    if (this._baseHide()) {
                        // Return focus if this or the flyout CED has focus
                        var active = _Global.document.activeElement;
                        if (this._previousFocus
                           && active
                           && (this._element.contains(active)
                               || _ElementUtilities.hasClass(active, _Overlay._Overlay._clickEatingFlyoutClass))
                           && this._previousFocus.focus !== undefined) {

                            // _isAppBarOrChild may return a CED or sentinal
                            var appBar = _Overlay._Overlay._isAppBarOrChild(this._previousFocus);
                            if (!appBar || (appBar.winControl && !appBar.winControl.hidden && !appBar.winAnimating)) {
                                // Don't move focus back to a appBar that is hidden
                                // We cannot rely on element.style.visibility because it will be visible while animating
                                var role = this._previousFocus.getAttribute("role");
                                var fHideRole = _Overlay._Overlay._keyboardInfo._visible && !this._keyboardWasUp;
                                if (fHideRole) {
                                    // Convince IHM to dismiss because it only came up after the flyout was up.
                                    // Change aria role and back to get IHM to dismiss.
                                    this._previousFocus.setAttribute("role", "");
                                }

                                if (this._keyboardInvoked) {
                                    this._previousFocus.focus();
                                } else {
                                    _Overlay._Overlay._trySetActive(this._previousFocus);
                                }
                                active = _Global.document.activeElement;

                                if (fHideRole) {
                                    // Restore the role so that css is applied correctly
                                    var previousFocus = this._previousFocus;
                                    if (previousFocus) {
                                        _BaseUtils._yieldForDomModification(function () {
                                            previousFocus.setAttribute("role", role);
                                        });
                                    }
                                }
                            }

                            // If the anchor gained focus we want to hide the focus in the non-keyboarding scenario
                            if (!this._keyboardInvoked && (this._previousFocus === active) && appBar && active) {
                                _Overlay._Overlay._addHideFocusClass(active);
                            }
                        }

                        this._previousFocus = null;

                        // Need click-eating div to be hidden if there are no other visible flyouts
                        if (!this._isThereVisibleFlyout()) {
                            _Overlay._Overlay._hideClickEatingDivFlyout();
                        }
                    }
                },

                _baseFlyoutShow: function Flyout_baseFlyoutShow(anchor, placement, alignment) {
                    // Don't do anything if disabled
                    if (this.disabled) {
                        return;
                    }
                    // Pick up defaults
                    if (!anchor) {
                        anchor = this._anchor;
                    }
                    if (!placement) {
                        placement = this._placement;
                    }
                    if (!alignment) {
                        alignment = this._alignment;
                    }

                    // Dereference the anchor if necessary
                    if (typeof anchor === "string") {
                        anchor = _Global.document.getElementById(anchor);
                    } else if (anchor && anchor.element) {
                        anchor = anchor.element;
                    }

                    // We expect an anchor
                    if (!anchor) {
                        // If we have _nextLeft, etc., then we were continuing an old animation, so that's OK
                        if (!this._retryLast) {
                            throw new _ErrorFromName("WinJS.UI.Flyout.NoAnchor", strings.noAnchor);
                        }
                        // Last call was incomplete, so use the previous _current values.
                        this._retryLast = null;
                    } else {
                        // Remember the anchor so that if we lose focus we can go back
                        this._currentAnchor = anchor;
                        // Remember current values
                        this._currentPlacement = placement;
                        this._currentAlignment = alignment;
                    }

                    // Need click-eating div to be visible, no matter what
                    if (!this._sticky) {
                        _Overlay._Overlay._showClickEatingDivFlyout();
                    }

                    // If we're animating (eg baseShow is going to fail), then don't mess up our current state.
                    // Queue us up to wait for current animation to finish first.
                    if (this._element.winAnimating) {
                        this._doNext = "show";
                        this._retryLast = true;
                        return;
                    }

                    // We call our base _baseShow to handle the actual animation
                    if (this._baseShow()) {
                        // (_baseShow shouldn't ever fail because we tested winAnimating above).
                        if (!_ElementUtilities.hasClass(this.element, "win-menu")) {
                            // Verify that the firstDiv is in the correct location.
                            // Move it to the correct location or add it if not.
                            var _elms = this._element.getElementsByTagName("*");
                            var firstDiv = this.element.querySelectorAll(".win-first");
                            if (this.element.children.length && !_ElementUtilities.hasClass(this.element.children[0], _Constants.firstDivClass)) {
                                if (firstDiv && firstDiv.length > 0) {
                                    firstDiv.item(0).parentNode.removeChild(firstDiv.item(0));
                                }

                                firstDiv = this._addFirstDiv();
                            }
                            firstDiv.tabIndex = _UIUtilities._getLowestTabIndexInList(_elms);

                            // Verify that the finalDiv is in the correct location.
                            // Move it to the correct location or add it if not.
                            var finalDiv = this.element.querySelectorAll(".win-final");
                            if (!_ElementUtilities.hasClass(this.element.children[this.element.children.length - 1], _Constants.finalDivClass)) {
                                if (finalDiv && finalDiv.length > 0) {
                                    finalDiv.item(0).parentNode.removeChild(finalDiv.item(0));
                                }

                                finalDiv = this._addFinalDiv();
                            }
                            finalDiv.tabIndex = _UIUtilities._getHighestTabIndexInList(_elms);
                        }

                        // Hide all other flyouts
                        this._hideAllOtherFlyouts(this);

                        // Store what had focus before showing the Flyout.
                        // This must happen after we hide all other flyouts so that we store the correct element.
                        this._previousFocus = _Global.document.activeElement;
                    }
                },

                _endShow: function Flyout_endShow() {
                    // Remember if the IHM was up since we may need to hide it when the flyout hides.
                    // This check needs to happen after the IHM has a chance to hide itself after we force hide
                    // all other visible Flyouts.
                    this._keyboardWasUp = _Overlay._Overlay._keyboardInfo._visible;

                    if (!_ElementUtilities.hasClass(this.element, _Constants.menuClass)) {
                        // Put focus on the first child in the Flyout
                        this._focusOnFirstFocusableElementOrThis();

                        // Prevent what is gaining focus from showing that it has focus
                        _Overlay._Overlay._addHideFocusClass(_Global.document.activeElement);
                    } else {
                        // Make sure the menu has focus, but don't show a focus rect
                        _Overlay._Overlay._trySetActive(this._element);
                    }
                },

                // Find our new flyout position.
                _findPosition: function Flyout_findPosition() {
                    this._nextHeight = null;
                    this._keyboardMovedUs = false;
                    this._hasScrolls = false;
                    this._keyboardSquishedUs = 0;

                    // Make sure menu toggles behave
                    if (this._checkToggle) {
                        this._checkToggle();
                    }

                    // Update margins for this alignment and remove old scrolling
                    this._updateAdjustments(this._currentAlignment);

                    // Set up the new position, and prep the offset for showPopup
                    this._getTopLeft();
                    // Panning top offset is calculated top
                    this._scrollTop = this._nextTop;

                    // Adjust position
                    if (this._nextTop < 0) {
                        // Need to attach to bottom
                        this._element.style.bottom = "0px";
                        this._element.style.top = "auto";
                    } else {
                        // Normal, attach to top
                        this._element.style.top = this._nextTop + "px";
                        this._element.style.bottom = "auto";
                    }
                    if (this._nextLeft < 0) {
                        // Overran right, attach to right
                        this._element.style.right = "0px";
                        this._element.style.left = "auto";
                    } else {
                        // Normal, attach to left
                        this._element.style.left = this._nextLeft + "px";
                        this._element.style.right = "auto";
                    }

                    // Adjust height/scrollbar
                    if (this._nextHeight !== null) {
                        _ElementUtilities.addClass(this._element, _Constants.scrollsClass);
                        this._lastMaxHeight = this._element.style.maxHeight;
                        this._element.style.maxHeight = this._nextHeight + "px";
                        this._nextBottom = this._nextTop + this._nextHeight;
                        this._hasScrolls = true;
                    }
                    
                    // May need to adjust if the IHM is showing.
                    if (_Overlay._Overlay._keyboardInfo._visible) {
                        // Use keyboard logic
                        this._checkKeyboardFit();

                        if (this._keyboardMovedUs) {
                            this._adjustForKeyboard();
                        }
                    }
                },

                // This determines our positioning.  We have 5 modes, the 1st four are explicit, the last is automatic:
                // * top - position explicitly on the top of the anchor, shrinking and adding scrollbar as needed.
                // * bottom - position explicitly below the anchor, shrinking and adding scrollbar as needed.
                // * left - position left of the anchor, shrinking and adding a vertical scrollbar as needed.
                // * right - position right of the anchor, shrinking and adding a vertical scroolbar as needed.
                // * auto - Automatic placement.
                // Auto tests the height of the anchor and the flyout.  For consistency in orientation, we imagine
                // that the anchor is placed in the vertical center of the display.  If the flyout would fit above
                // that centered anchor, then we will place the flyout vertically in relation to the anchor, otherwise
                // placement will be horizontal.
                // Vertical auto placement will be positioned on top of the anchor if room, otherwise below the anchor.
                //   - this is because touch users would be more likely to obscure flyouts below the anchor.
                // Horizontal auto placement will be positioned to the left of the anchor if room, otherwise to the right.
                //   - this is because right handed users would be more likely to obscure a flyout on the right of the anchor.
                // Auto placement will add a vertical scrollbar if necessary.
                _getTopLeft: function Flyout_getTopLeft() {
                    var anchorRawRectangle = this._currentAnchor.getBoundingClientRect(),
                        flyout = {},
                        anchor = {};

                    // Adjust for the anchor's margins.
                    anchor.top = anchorRawRectangle.top;
                    anchor.bottom = anchorRawRectangle.bottom;
                    anchor.left = anchorRawRectangle.left;
                    anchor.right = anchorRawRectangle.right;
                    anchor.height = anchor.bottom - anchor.top;
                    anchor.width = anchor.right - anchor.left;

                    // Get our flyout and margins, note that getDimension calls
                    // window.getComputedStyle, which ensures layout is updated.
                    flyout.marginTop = getDimension(this._element, "marginTop");
                    flyout.marginBottom = getDimension(this._element, "marginBottom");
                    flyout.marginLeft = getDimension(this._element, "marginLeft");
                    flyout.marginRight = getDimension(this._element, "marginRight");
                    flyout.width = _ElementUtilities.getTotalWidth(this._element);
                    flyout.height = _ElementUtilities.getTotalHeight(this._element);
                    flyout.innerWidth = _ElementUtilities.getContentWidth(this._element);
                    flyout.innerHeight = _ElementUtilities.getContentHeight(this._element);
                    this._nextMarginPadding = (flyout.height - flyout.innerHeight);

                    // Check fit for requested this._currentPlacement, doing fallback if necessary
                    switch (this._currentPlacement) {
                        case "top":
                            if (!this._fitTop(anchor, flyout)) {
                                // Didn't fit, needs scrollbar
                                this._nextTop = 0;
                                this._nextHeight = anchor.top - this._nextMarginPadding;
                            }
                            this._centerHorizontally(anchor, flyout, this._currentAlignment);
                            break;
                        case "bottom":
                            if (!this._fitBottom(anchor, flyout)) {
                                // Didn't fit, needs scrollbar
                                this._nextTop = -1;
                                this._nextHeight = _Overlay._Overlay._keyboardInfo._visibleDocHeight - anchor.bottom - this._nextMarginPadding;
                            }
                            this._centerHorizontally(anchor, flyout, this._currentAlignment);
                            break;
                        case "left":
                            if (!this._fitLeft(anchor, flyout)) {
                                // Didn't fit, just shove it to edge
                                this._nextLeft = 0;
                            }
                            this._centerVertically(anchor, flyout);
                            break;
                        case "right":
                            if (!this._fitRight(anchor, flyout)) {
                                // Didn't fit,just shove it to edge
                                this._nextLeft = -1;
                            }
                            this._centerVertically(anchor, flyout);
                            break;
                        case "auto":
                            // Auto, if the anchor was in the vertical center of the display would we fit above it?
                            if (this._sometimesFitsAbove(anchor, flyout)) {
                                // It will fit above or below the anchor
                                if (!this._fitTop(anchor, flyout)) {
                                    // Didn't fit above (preferred), so go below.
                                    this._fitBottom(anchor, flyout);
                                }
                                this._centerHorizontally(anchor, flyout, this._currentAlignment);
                            } else {
                                // Won't fit above or below, try a side
                                if (!this._fitLeft(anchor, flyout) &&
                                    !this._fitRight(anchor, flyout)) {
                                    // Didn't fit left or right either, is top or bottom bigger?
                                    if (this._topHasMoreRoom(anchor)) {
                                        // Top, won't fit, needs scrollbar
                                        this._nextTop = 0;
                                        this._nextHeight = anchor.top - this._nextMarginPadding;
                                    } else {
                                        // Bottom, won't fit, needs scrollbar
                                        this._nextTop = -1;
                                        this._nextHeight = _Overlay._Overlay._keyboardInfo._visibleDocHeight - anchor.bottom - this._nextMarginPadding;
                                    }
                                    this._centerHorizontally(anchor, flyout, this._currentAlignment);
                                } else {
                                    this._centerVertically(anchor, flyout);
                                }
                            }
                            break;
                        default:
                            // Not a legal this._currentPlacement value
                            throw new _ErrorFromName("WinJS.UI.Flyout.BadPlacement", strings.badPlacement);
                    }

                    // Remember "bottom" in case we need to consider keyboard later, only tested for top-pinned bars
                    this._nextBottom = this._nextTop + flyout.height;
                },

                // If the anchor is centered vertically, would the flyout fit above it?
                _sometimesFitsAbove: function Flyout_sometimesFitsAbove(anchor, flyout) {
                    return ((_Overlay._Overlay._keyboardInfo._visibleDocHeight - anchor.height) / 2) >= flyout.height;
                },

                _topHasMoreRoom: function Flyout_topHasMoreRoom(anchor) {
                    return anchor.top > _Overlay._Overlay._keyboardInfo._visibleDocHeight - anchor.bottom;
                },

                // See if we can fit in various places, fitting in the main view,
                // ignoring viewport changes, like for the IHM.
                _fitTop: function Flyout_fitTop(anchor, flyout) {
                    this._nextTop = anchor.top - flyout.height;
                    this._nextAnimOffset = { top: "50px", left: "0px", keyframe: "WinJS-showFlyoutTop" };
                    return (this._nextTop >= 0 &&
                            this._nextTop + flyout.height <= _Overlay._Overlay._keyboardInfo._visibleDocBottom);
                },

                _fitBottom: function Flyout_fitBottom(anchor, flyout) {
                    this._nextTop = anchor.bottom;
                    this._nextAnimOffset = { top: "-50px", left: "0px", keyframe: "WinJS-showFlyoutBottom" };
                    return (this._nextTop >= 0 &&
                            this._nextTop + flyout.height <= _Overlay._Overlay._keyboardInfo._visibleDocBottom);
                },

                _fitLeft: function Flyout_fitLeft(anchor, flyout) {
                    this._nextLeft = anchor.left - flyout.width;
                    this._nextAnimOffset = { top: "0px", left: "50px", keyframe: "WinJS-showFlyoutLeft" };
                    return (this._nextLeft >= 0 && this._nextLeft + flyout.width <= _Overlay._Overlay._keyboardInfo._visualViewportWidth);
                },

                _fitRight: function Flyout_fitRight(anchor, flyout) {
                    this._nextLeft = anchor.right;
                    this._nextAnimOffset = { top: "0px", left: "-50px", keyframe: "WinJS-showFlyoutRight" };
                    return (this._nextLeft >= 0 && this._nextLeft + flyout.width <= _Overlay._Overlay._keyboardInfo._visualViewportWidth);
                },

                _centerVertically: function Flyout_centerVertically(anchor, flyout) {
                    this._nextTop = anchor.top + anchor.height / 2 - flyout.height / 2;
                    if (this._nextTop < 0) {
                        this._nextTop = 0;
                    } else if (this._nextTop + flyout.height >= _Overlay._Overlay._keyboardInfo._visibleDocBottom) {
                        // Flag to put on bottom
                        this._nextTop = -1;
                    }
                },

                _centerHorizontally: function Flyout_centerHorizontally(anchor, flyout, alignment) {
                    if (alignment === "center") {
                        this._nextLeft = anchor.left + anchor.width / 2 - flyout.width / 2;
                    } else if (alignment === "left") {
                        this._nextLeft = anchor.left;
                    } else if (alignment === "right") {
                        this._nextLeft = anchor.right - flyout.width;
                    } else {
                        throw new _ErrorFromName("WinJS.UI.Flyout.BadAlignment", strings.badAlignment);
                    }
                    if (this._nextLeft < 0) {
                        this._nextLeft = 0;
                    } else if (this._nextLeft + flyout.width >= _Global.document.documentElement.clientWidth) {
                        // flag to put on right
                        this._nextLeft = -1;
                    }
                },

                _updateAdjustments: function Flyout_updateAdjustments(alignment) {
                    // Move to 0,0 in case it is off screen, so that it lays out at a reasonable size
                    this._element.style.top = "0px";
                    this._element.style.bottom = "auto";
                    this._element.style.left = "0px";
                    this._element.style.right = "auto";

                    // Scrolling may not be necessary
                    _ElementUtilities.removeClass(this._element, _Constants.scrollsClass);
                    if (this._lastMaxHeight !== null) {
                        this._element.style.maxHeight = this._lastMaxHeight;
                        this._lastMaxHeight = null;
                    }
                    // Alignment
                    if (alignment === "center") {
                        _ElementUtilities.removeClass(this._element, "win-leftalign");
                        _ElementUtilities.removeClass(this._element, "win-rightalign");
                    } else if (alignment === "left") {
                        _ElementUtilities.addClass(this._element, "win-leftalign");
                        _ElementUtilities.removeClass(this._element, "win-rightalign");
                    } else if (alignment === "right") {
                        _ElementUtilities.addClass(this._element, "win-rightalign");
                        _ElementUtilities.removeClass(this._element, "win-leftalign");
                    }
                },

                _showingKeyboard: function Flyout_showingKeyboard(event) {
                    if (this.hidden) {
                        return;
                    }

                    // The only way that we can be showing a keyboard when a flyout is up is because the input was
                    // in the flyout itself, in which case we'll be moving ourselves.  There is no practical way
                    // for the application to override this as the focused element is in our flyout.
                    event.ensuredFocusedElementInView = true;

                    // See if the keyboard is going to force us to move
                    this._checkKeyboardFit();

                    if (this._keyboardMovedUs) {
                        // Pop out immediately, then move to new spot
                        this._element.style.opacity = 0;
                        var that = this;
                        _Global.setTimeout(function () { that._adjustForKeyboard(); that._baseAnimateIn(); }, _Overlay._Overlay._keyboardInfo._animationShowLength);
                    }
                },

                _resize: function Flyout_resize() {
                    // If hidden and not busy animating, then nothing to do
                    if (this.hidden && !this._animating) {
                        return;
                    }

                    // This should only happen if the IHM is dismissing,
                    // the only other way is for viewstate changes, which
                    // would dismiss any flyout.
                    if (this._needToHandleHidingKeyboard) {
                        // Hiding keyboard, update our position, giving the anchor a chance to update first.
                        var that = this;
                        _BaseUtils._setImmediate(function () { that._findPosition(); });
                        this._needToHandleHidingKeyboard = false;
                    }
                },

                _checkKeyboardFit: function Flyout_checkKeyboardFit() {
                    // Check for moving to fit keyboard:
                    // - Too Tall, above top, or below bottom.
                    var height = _ElementUtilities.getTotalHeight(this._element);
                    var viewportHeight = _Overlay._Overlay._keyboardInfo._visibleDocHeight - this._nextMarginPadding;
                    if (height > viewportHeight) {
                        // Too Tall, pin to top with max height
                        this._keyboardMovedUs = true;
                        this._scrollTop = 0;
                        this._keyboardSquishedUs = viewportHeight;
                    } else if (this._nextTop === -1) {
                        // Pinned to bottom counts as moved
                        this._keyboardMovedUs = true;
                    } else if (this._nextTop < 0) {
                        // Above the top of the viewport
                        this._scrollTop = 0;
                        this._keyboardMovedUs = true;
                    } else if (this._nextBottom > _Overlay._Overlay._keyboardInfo._visibleDocBottom) {
                        // Below the bottom of the viewport
                        this._scrollTop = -1;
                        this._keyboardMovedUs = true;
                    }
                },

                _adjustForKeyboard: function Flyout_adjustForKeyboard() {
                    // Keyboard moved us, update our metrics as needed
                    if (this._keyboardSquishedUs) {
                        // Add scrollbar if we didn't already have scrollsClass
                        if (!this._hasScrolls) {
                            _ElementUtilities.addClass(this._element, _Constants.scrollsClass);
                            this._lastMaxHeight = this._element.style.maxHeight;
                        }
                        // Adjust height
                        this._element.style.maxHeight = this._keyboardSquishedUs + "px";
                    }

                    // Update top/bottom
                    this._checkScrollPosition(true);
                },

                _hidingKeyboard: function Flyout_hidingKeyboard() {
                    // If we aren't visible and not animating, or haven't been repositioned, then nothing to do
                    // We don't know if the keyboard moved the anchor, so _keyboardMovedUs doesn't help here
                    if (this.hidden && !this._animating) {
                        return;
                    }

                    // Snap to the final position
                    // We'll either just reveal the current space or resize the window
                    if (_Overlay._Overlay._keyboardInfo._isResized) {
                        // Flag resize that we'll need an updated position
                        this._needToHandleHidingKeyboard = true;
                    } else {
                        // Not resized, update our final position, giving the anchor a chance to update first.
                        var that = this;
                        _BaseUtils._setImmediate(function () { that._findPosition(); });
                    }
                },

                _checkScrollPosition: function Flyout_checkScrollPosition(showing) {
                    if (this.hidden && !showing) {
                        return;
                    }

                    // May need to adjust top by viewport offset
                    if (this._scrollTop < 0) {
                        // Need to attach to bottom
                        this._element.style.bottom = _Overlay._Overlay._keyboardInfo._visibleDocBottomOffset + "px";
                        this._element.style.top = "auto";
                    } else {
                        // Normal, attach to top
                        this._element.style.top = "0px";
                        this._element.style.bottom = "auto";
                    }
                },

                // AppBar flyout animations
                _flyoutAnimateIn: function Flyout_flyoutAnimateIn() {
                    if (this._keyboardMovedUs) {
                        return this._baseAnimateIn();
                    } else {
                        this._element.style.opacity = 1;
                        this._element.style.visibility = "visible";
                        return Animations.showPopup(this._element, this._nextAnimOffset);
                    }
                },

                _flyoutAnimateOut: function Flyout_flyoutAnimateOut() {
                    if (this._keyboardMovedUs) {
                        return this._baseAnimateOut();
                    } else {
                        this._element.style.opacity = 0;
                        return Animations.hidePopup(this._element, this._nextAnimOffset);
                    }
                },

                // Hide all other flyouts besides this one
                _hideAllOtherFlyouts: function Flyout_hideAllOtherFlyouts(thisFlyout) {
                    var flyouts = _Global.document.querySelectorAll(_Constants.flyoutSelector);
                    for (var i = 0; i < flyouts.length; i++) {
                        var flyoutControl = flyouts[i].winControl;
                        if (flyoutControl && !flyoutControl.hidden && (flyoutControl !== thisFlyout)) {
                            flyoutControl.hide();
                        }
                    }
                },

                // Returns true if there is a flyout in the DOM that is not hidden
                _isThereVisibleFlyout: function Flyout_isThereVisibleFlyout() {
                    var flyouts = _Global.document.querySelectorAll(_Constants.flyoutSelector);
                    for (var i = 0; i < flyouts.length; i++) {
                        var flyoutControl = flyouts[i].winControl;
                        if (flyoutControl && !flyoutControl.hidden) {
                            return true;
                        }
                    }

                    return false;
                },

                _handleKeyDown: function Flyout_handleKeyDown(event) {
                    // Escape closes flyouts but if the user has a text box with an IME candidate 
                    // window open, we want to skip the ESC key event since it is handled by the IME.
                    // When the IME handles a key it sets event.keyCode === Key.IME for an easy check.
                    if (event.keyCode === Key.escape && event.keyCode !== Key.IME) {
                        // Show a focus rect on what we move focus to
                        event.preventDefault();
                        event.stopPropagation();
                        this.winControl._keyboardInvoked = true;
                        this.winControl._hide();
                    } else if ((event.keyCode === Key.space || event.keyCode === Key.enter)
                         && (this === _Global.document.activeElement)) {
                        event.preventDefault();
                        event.stopPropagation();
                        this.winControl.hide();
                    } else if (event.shiftKey && event.keyCode === Key.tab
                          && this === _Global.document.activeElement
                          && !event.altKey && !event.ctrlKey && !event.metaKey) {
                        event.preventDefault();
                        event.stopPropagation();
                        this.winControl._focusOnLastFocusableElementOrThis();
                    }
                },

                // Create and add a new first div as the first child
                _addFirstDiv: function Flyout_addFirstDiv() {
                    var firstDiv = _Global.document.createElement("div");
                    firstDiv.className = _Constants.firstDivClass;
                    firstDiv.style.display = "inline";
                    firstDiv.setAttribute("role", "menuitem");
                    firstDiv.setAttribute("aria-hidden", "true");

                    // add to beginning
                    if (this._element.children[0]) {
                        this._element.insertBefore(firstDiv, this._element.children[0]);
                    } else {
                        this._element.appendChild(firstDiv);
                    }

                    var that = this;
                    _ElementUtilities._addEventListener(firstDiv, "focusin", function () { that._focusOnLastFocusableElementOrThis(); }, false);

                    return firstDiv;
                },

                // Create and add a new final div as the last child
                _addFinalDiv: function Flyout_addFinalDiv() {
                    var finalDiv = _Global.document.createElement("div");
                    finalDiv.className = _Constants.finalDivClass;
                    finalDiv.style.display = "inline";
                    finalDiv.setAttribute("role", "menuitem");
                    finalDiv.setAttribute("aria-hidden", "true");

                    this._element.appendChild(finalDiv);
                    var that = this;
                    _ElementUtilities._addEventListener(finalDiv, "focusin", function () { that._focusOnFirstFocusableElementOrThis(); }, false);

                    return finalDiv;
                },

                _writeProfilerMark: function Flyout_writeProfilerMark(text) {
                    _WriteProfilerMark("WinJS.UI.Flyout:" + this._id + ":" + text);
                }
            });
            return Flyout;
        })
    });

});

define('require-style!less/animation-library',[],function(){});

define('require-style!less/typography',[],function(){});

define('require-style!less/desktop/styles-intrinsic',[],function(){});

define('require-style!less/desktop/colors-intrinsic',[],function(){});
