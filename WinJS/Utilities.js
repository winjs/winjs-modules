// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Utilities/_Control',[
    'exports',
    '../Core/_Global',
    '../Core/_Base'
    ], function controlInit(exports, _Global, _Base) {
    "use strict";

    // not supported in WebWorker
    if (!_Global.document) {
        return;
    }

    function setOptions(control, options) {
        /// <signature helpKeyword="WinJS.UI.DOMEventMixin.setOptions">
        /// <summary locid="WinJS.UI.DOMEventMixin.setOptions">
        /// Adds the set of declaratively specified options (properties and events) to the specified control.
        /// If name of the options property begins with "on", the property value is a function and the control
        /// supports addEventListener. The setOptions method calls the addEventListener method on the control.
        /// </summary>
        /// <param name="control" type="Object" domElement="false" locid="WinJS.UI.DOMEventMixin.setOptions_p:control">
        /// The control on which the properties and events are to be applied.
        /// </param>
        /// <param name="options" type="Object" domElement="false" locid="WinJS.UI.DOMEventMixin.setOptions_p:options">
        /// The set of options that are specified declaratively.
        /// </param>
        /// </signature>
        _setOptions(control, options);
    }

    function _setOptions(control, options, eventsOnly) {
        if (typeof options === "object") {
            var keys = Object.keys(options);
            for (var i = 0, len = keys.length; i < len; i++) {
                var key = keys[i];
                var value = options[key];
                if (key.length > 2) {
                    var ch1 = key[0];
                    var ch2 = key[1];
                    if ((ch1 === 'o' || ch1 === 'O') && (ch2 === 'n' || ch2 === 'N')) {
                        if (typeof value === "function") {
                            if (control.addEventListener) {
                                control.addEventListener(key.substr(2), value);
                                continue;
                            }
                        }
                    }
                }

                if (!eventsOnly) {
                    control[key] = value;
                }
            }
        }
    }

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        DOMEventMixin: _Base.Namespace._lazy(function () {
            return {
                _domElement: null,

                addEventListener: function (type, listener, useCapture) {
                    /// <signature helpKeyword="WinJS.UI.DOMEventMixin.addEventListener">
                    /// <summary locid="WinJS.UI.DOMEventMixin.addEventListener">
                    /// Adds an event listener to the control.
                    /// </summary>
                    /// <param name="type" type="String" locid="WinJS.UI.DOMEventMixin.addEventListener_p:type">
                    /// The type (name) of the event.
                    /// </param>
                    /// <param name="listener" type="Function" locid="WinJS.UI.DOMEventMixin.addEventListener_p:listener">
                    /// The listener to invoke when the event gets raised.
                    /// </param>
                    /// <param name="useCapture" type="Boolean" locid="WinJS.UI.DOMEventMixin.addEventListener_p:useCapture">
                    /// true to initiate capture; otherwise, false.
                    /// </param>
                    /// </signature>
                    (this.element || this._domElement).addEventListener(type, listener, useCapture || false);
                },
                dispatchEvent: function (type, eventProperties) {
                    /// <signature helpKeyword="WinJS.UI.DOMEventMixin.dispatchEvent">
                    /// <summary locid="WinJS.UI.DOMEventMixin.dispatchEvent">
                    /// Raises an event of the specified type, adding the specified additional properties.
                    /// </summary>
                    /// <param name="type" type="String" locid="WinJS.UI.DOMEventMixin.dispatchEvent_p:type">
                    /// The type (name) of the event.
                    /// </param>
                    /// <param name="eventProperties" type="Object" locid="WinJS.UI.DOMEventMixin.dispatchEvent_p:eventProperties">
                    /// The set of additional properties to be attached to the event object when the event is raised.
                    /// </param>
                    /// <returns type="Boolean" locid="WinJS.UI.DOMEventMixin.dispatchEvent_returnValue">
                    /// true if preventDefault was called on the event, otherwise false.
                    /// </returns>
                    /// </signature>
                    var eventValue = _Global.document.createEvent("Event");
                    eventValue.initEvent(type, false, false);
                    eventValue.detail = eventProperties;
                    if (typeof eventProperties === "object") {
                        Object.keys(eventProperties).forEach(function (key) {
                            eventValue[key] = eventProperties[key];
                        });
                    }
                    return (this.element || this._domElement).dispatchEvent(eventValue);
                },
                removeEventListener: function (type, listener, useCapture) {
                    /// <signature helpKeyword="WinJS.UI.DOMEventMixin.removeEventListener">
                    /// <summary locid="WinJS.UI.DOMEventMixin.removeEventListener">
                    /// Removes an event listener from the control.
                    /// </summary>
                    /// <param name="type" type="String" locid="WinJS.UI.DOMEventMixin.removeEventListener_p:type">
                    /// The type (name) of the event.
                    /// </param>
                    /// <param name="listener" type="Function" locid="WinJS.UI.DOMEventMixin.removeEventListener_p:listener">
                    /// The listener to remove.
                    /// </param>
                    /// <param name="useCapture" type="Boolean" locid="WinJS.UI.DOMEventMixin.removeEventListener_p:useCapture">
                    /// true to initiate capture; otherwise, false.
                    /// </param>
                    /// </signature>
                    (this.element || this._domElement).removeEventListener(type, listener, useCapture || false);
                }
            };
        }),

        setOptions: setOptions,

        _setOptions: _setOptions
    });

});


// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Utilities/_ElementUtilities',[
    'exports',
    '../Core/_Global',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Promise',
    '../Scheduler'
], function elementUtilities(exports, _Global, _Base, _BaseUtils, Promise, Scheduler) {
    "use strict";

    // not supported in WebWorker
    if (!_Global.document) {
        return;
    }

    var _zoomToDuration = 167;

    function removeEmpties(arr) {
        var len = arr.length;
        for (var i = len - 1; i >= 0; i--) {
            if (!arr[i]) {
                arr.splice(i, 1);
                len--;
            }
        }
        return len;
    }

    function getClassName(e) {
        var name = e.className || "";
        if (typeof (name) === "string") {
            return name;
        } else {
            return name.baseVal || "";
        }
    }
    function setClassName(e, value) {
        // SVG elements (which use e.className.baseVal) are never undefined,
        // so this logic makes the comparison a bit more compact.
        //
        var name = e.className || "";
        if (typeof (name) === "string") {
            e.className = value;
        } else {
            e.className.baseVal = value;
        }
        return e;
    }
    function addClass(e, name) {
        /// <signature helpKeyword="WinJS.Utilities.addClass">
        /// <summary locid="WinJS.Utilities.addClass">
        /// Adds the specified class(es) to the specified element. Multiple classes can be added using space delimited names.
        /// </summary>
        /// <param name="e" type="HTMLElement" locid="WinJS.Utilities.addClass_p:e">
        /// The element to which to add the class.
        /// </param>
        /// <param name="name" type="String" locid="WinJS.Utilities.addClass_p:name">
        /// The name of the class to add, multiple classes can be added using space delimited names
        /// </param>
        /// <returns type="HTMLElement" locid="WinJS.Utilities.addClass_returnValue">
        /// The element.
        /// </returns>
        /// </signature>
        if (e.classList) {
            // Fastpath: adding a single class, no need to string split the argument
            if (name.indexOf(" ") < 0) {
                e.classList.add(name);
            } else {
                var namesToAdd = name.split(" ");
                removeEmpties(namesToAdd);

                for (var i = 0, len = namesToAdd.length; i < len; i++) {
                    e.classList.add(namesToAdd[i]);
                }
            }
            return e;
        } else {
            var className = getClassName(e);
            var names = className.split(" ");
            var l = removeEmpties(names);
            var toAdd;

            // we have a fast path for the common case of a single name in the class name
            //
            if (name.indexOf(" ") >= 0) {
                var namesToAdd = name.split(" ");
                removeEmpties(namesToAdd);
                for (var i = 0; i < l; i++) {
                    var found = namesToAdd.indexOf(names[i]);
                    if (found >= 0) {
                        namesToAdd.splice(found, 1);
                    }
                }
                if (namesToAdd.length > 0) {
                    toAdd = namesToAdd.join(" ");
                }
            } else {
                var saw = false;
                for (var i = 0; i < l; i++) {
                    if (names[i] === name) {
                        saw = true;
                        break;
                    }
                }
                if (!saw) { toAdd = name; }

            }
            if (toAdd) {
                if (l > 0 && names[0].length > 0) {
                    setClassName(e, className + " " + toAdd);
                } else {
                    setClassName(e, toAdd);
                }
            }
            return e;
        }
    }
    function removeClass(e, name) {
        /// <signature helpKeyword="WinJS.Utilities.removeClass">
        /// <summary locid="WinJS.Utilities.removeClass">
        /// Removes the specified class from the specified element.
        /// </summary>
        /// <param name="e" type="HTMLElement" locid="WinJS.Utilities.removeClass_p:e">
        /// The element from which to remove the class.
        /// </param>
        /// <param name="name" type="String" locid="WinJS.Utilities.removeClass_p:name">
        /// The name of the class to remove.
        /// </param>
        /// <returns type="HTMLElement" locid="WinJS.Utilities.removeClass_returnValue">
        /// The element.
        /// </returns>
        /// </signature>
        if (e.classList) {

            // Fastpath: Nothing to remove
            if (e.classList.length === 0) {
                return e;
            }
            var namesToRemove = name.split(" ");
            removeEmpties(namesToRemove);

            for (var i = 0, len = namesToRemove.length; i < len; i++) {
                e.classList.remove(namesToRemove[i]);
            }
            return e;
        } else {
            var original = getClassName(e);
            var namesToRemove;
            var namesToRemoveLen;

            if (name.indexOf(" ") >= 0) {
                namesToRemove = name.split(" ");
                namesToRemoveLen = removeEmpties(namesToRemove);
            } else {
                // early out for the case where you ask to remove a single
                // name and that name isn't found.
                //
                if (original.indexOf(name) < 0) {
                    return e;
                }
                namesToRemove = [name];
                namesToRemoveLen = 1;
            }
            var removed;
            var names = original.split(" ");
            var namesLen = removeEmpties(names);

            for (var i = namesLen - 1; i >= 0; i--) {
                if (namesToRemove.indexOf(names[i]) >= 0) {
                    names.splice(i, 1);
                    removed = true;
                }
            }

            if (removed) {
                setClassName(e, names.join(" "));
            }
            return e;
        }
    }
    function toggleClass(e, name) {
        /// <signature helpKeyword="WinJS.Utilities.toggleClass">
        /// <summary locid="WinJS.Utilities.toggleClass">
        /// Toggles (adds or removes) the specified class on the specified element.
        /// If the class is present, it is removed; if it is absent, it is added.
        /// </summary>
        /// <param name="e" type="HTMLElement" locid="WinJS.Utilities.toggleClass_p:e">
        /// The element on which to toggle the class.
        /// </param>
        /// <param name="name" type="String" locid="WinJS.Utilities.toggleClass_p:name">
        /// The name of the class to toggle.
        /// </param>
        /// <returns type="HTMLElement" locid="WinJS.Utilities.toggleClass_returnValue">
        /// The element.
        /// </returns>
        /// </signature>
        if (e.classList) {
            e.classList.toggle(name);
            return e;
        } else {
            var className = getClassName(e);
            var names = className.trim().split(" ");
            var l = names.length;
            var found = false;
            for (var i = 0; i < l; i++) {
                if (names[i] === name) {
                    found = true;
                }
            }
            if (!found) {
                if (l > 0 && names[0].length > 0) {
                    setClassName(e, className + " " + name);
                } else {
                    setClassName(e, className + name);
                }
            } else {
                setClassName(e, names.reduce(function (r, e) {
                    if (e === name) {
                        return r;
                    } else if (r && r.length > 0) {
                        return r + " " + e;
                    } else {
                        return e;
                    }
                }, ""));
            }
            return e;
        }
    }

    // Only set the attribute if its value has changed
    function setAttribute(element, attribute, value) {
        if (element.getAttribute(attribute) !== "" + value) {
            element.setAttribute(attribute, value);
        }
    }

    function _clamp(value, lowerBound, upperBound, defaultValue) {
        var n = Math.max(lowerBound, Math.min(upperBound, +value));
        return n === 0 ? 0 : n || Math.max(lowerBound, Math.min(upperBound, defaultValue));
    }
    var _pixelsRE = /^-?\d+\.?\d*(px)?$/i;
    var _numberRE = /^-?\d+/i;
    function convertToPixels(element, value) {
        /// <signature helpKeyword="WinJS.Utilities.convertToPixels">
        /// <summary locid="WinJS.Utilities.convertToPixels">
        /// Converts a CSS positioning string for the specified element to pixels.
        /// </summary>
        /// <param name="element" type="HTMLElement" locid="WinJS.Utilities.convertToPixels_p:element">
        /// The element.
        /// </param>
        /// <param name="value" type="String" locid="WinJS.Utilities.convertToPixels_p:value">
        /// The CSS positioning string.
        /// </param>
        /// <returns type="Number" locid="WinJS.Utilities.convertToPixels_returnValue">
        /// The number of pixels.
        /// </returns>
        /// </signature>
        if (!_pixelsRE.test(value) && _numberRE.test(value)) {
            var previousValue = element.style.left;

            element.style.left = value;
            value = element.style.pixelLeft;

            element.style.left = previousValue;

            return value;
        } else {
            return Math.round(parseFloat(value)) || 0;
        }
    }
    function getDimension(element, property) {
        return convertToPixels(element, _Global.getComputedStyle(element, null)[property]);
    }

    var _MSGestureEvent = _Global.MSGestureEvent || {
        MSGESTURE_FLAG_BEGIN: 1,
        MSGESTURE_FLAG_CANCEL: 4,
        MSGESTURE_FLAG_END: 2,
        MSGESTURE_FLAG_INERTIA: 8,
        MSGESTURE_FLAG_NONE: 0
    };

    var _MSManipulationEvent = _Global.MSManipulationEvent || {
        MS_MANIPULATION_STATE_ACTIVE: 1,
        MS_MANIPULATION_STATE_CANCELLED: 6,
        MS_MANIPULATION_STATE_COMMITTED: 7,
        MS_MANIPULATION_STATE_DRAGGING: 5,
        MS_MANIPULATION_STATE_INERTIA: 2,
        MS_MANIPULATION_STATE_PRESELECT: 3,
        MS_MANIPULATION_STATE_SELECTING: 4,
        MS_MANIPULATION_STATE_STOPPED: 0
    };

    var _MSPointerEvent = _Global.MSPointerEvent || {
        MSPOINTER_TYPE_TOUCH: "touch",
        MSPOINTER_TYPE_PEN: "pen",
        MSPOINTER_TYPE_MOUSE: "mouse",
    };

    // Helpers for managing element._eventsMap for custom events
    //

    function addListenerToEventMap(element, type, listener, useCapture, data) {
        var eventNameLowercase = type.toLowerCase();
        if (!element._eventsMap) {
            element._eventsMap = {};
        }
        if (!element._eventsMap[eventNameLowercase]) {
            element._eventsMap[eventNameLowercase] = [];
        }
        element._eventsMap[eventNameLowercase].push({
            listener: listener,
            useCapture: useCapture,
            data: data
        });
    }

    function removeListenerFromEventMap(element, type, listener, useCapture) {
        var eventNameLowercase = type.toLowerCase();
        var mappedEvents = element._eventsMap && element._eventsMap[eventNameLowercase];
        if (mappedEvents) {
            for (var i = mappedEvents.length - 1; i >= 0; i--) {
                var mapping = mappedEvents[i];
                if (mapping.listener === listener && (!!useCapture === !!mapping.useCapture)) {
                    mappedEvents.splice(i, 1);
                    return mapping;
                }
            }
        }
        return null;
    }

    function lookupListeners(element, type) {
        var eventNameLowercase = type.toLowerCase();
        return element._eventsMap && element._eventsMap[eventNameLowercase] && element._eventsMap[eventNameLowercase].slice(0) || [];
    }

    // Custom focusin/focusout events
    // Generally, use these instead of using the browser's blur/focus/focusout/focusin events directly.
    // However, this doesn't support the window object. If you need to listen to focus events on the window,
    // use the browser's events directly.
    //

    function bubbleEvent(element, type, eventObject) {
        while (element) {
            var handlers = lookupListeners(element, type);
            for (var i = 0, len = handlers.length; i < len; i++) {
                handlers[i].listener.call(element, eventObject);
            }

            element = element.parentNode;
        }
    }

    function prepareFocusEvent(eventObject) {
        // If an iframe is involved, then relatedTarget should be null.
        if (eventObject.relatedTarget && eventObject.relatedTarget.tagName === "IFRAME" ||
                eventObject.target && eventObject.target.tagName === "IFRAME") {
            eventObject.relatedTarget = null;
        }

        return eventObject;
    }

    var activeElement = null;
    _Global.addEventListener("blur", function () {
        // Fires focusout when focus move to another window or into an iframe.
        var previousActiveElement = activeElement;
        if (previousActiveElement) {
            bubbleEvent(previousActiveElement, "focusout", prepareFocusEvent({
                type: "focusout",
                target: previousActiveElement,
                relatedTarget: null
            }));
        }
        activeElement = null;
    });

    _Global.document.documentElement.addEventListener("focus", function (eventObject) {
        var previousActiveElement = activeElement;
        activeElement = eventObject.target;
        if (previousActiveElement) {
            bubbleEvent(previousActiveElement, "focusout", prepareFocusEvent({
                type: "focusout",
                target: previousActiveElement,
                relatedTarget: activeElement
            }));
        }
        if (activeElement) {
            bubbleEvent(activeElement, "focusin", prepareFocusEvent({
                type: "focusin",
                target: activeElement,
                relatedTarget: previousActiveElement
            }));
        }
    }, true);

    function registerBubbleListener(element, type, listener, useCapture) {
        if (useCapture) {
            throw "This custom WinJS event only supports bubbling";
        }
        addListenerToEventMap(element, type, listener, useCapture);
    }

    // Custom pointer events
    //

    // Sets the properties in *overrideProperties* on the object. Delegates all other
    // property accesses to *eventObject*.
    //
    // The purpose of PointerEventProxy is that it allows us to customize properties on
    // an eventObject despite those properties being unwritable and unconfigurable.
    var PointerEventProxy = function (eventObject, overrideProperties) {
        overrideProperties = overrideProperties || {};
        this.__eventObject = eventObject;
        var that = this;
        Object.keys(overrideProperties).forEach(function (propertyName) {
            Object.defineProperty(that, propertyName, {
                value: overrideProperties[propertyName]
            });
        });
    };

    // Define PointerEventProxy properties which should be delegated to the original eventObject.
    [
        "altKey", "AT_TARGET", "bubbles", "BUBBLING_PHASE", "button", "buttons",
        "cancelable", "cancelBubble", "CAPTURING_PHASE", "clientX", "clientY",
        "ctrlKey", "currentTarget", "defaultPrevented", "detail", "eventPhase",
        "fromElement", "getModifierState", "height", "hwTimestamp", "initEvent",
        "initMouseEvent", "initPointerEvent", "initUIEvent", "isPrimary", "isTrusted",
        "layerX", "layerY", "metaKey", "offsetX", "offsetY", "pageX", "pageY",
        "pointerId", "pointerType", "pressure", "preventDefault", "relatedTarget",
        "rotation", "screenX", "screenY", "shiftKey", "srcElement", "stopImmediatePropagation",
        "stopPropagation", "target", "tiltX", "tiltY", "timeStamp", "toElement", "type",
        "view", "which", "width", "x", "y", "_normalizedType", "_fakedBySemanticZoom"
    ].forEach(function (propertyName) {
        Object.defineProperty(PointerEventProxy.prototype, propertyName, {
            get: function () {
                var value = this.__eventObject[propertyName];
                return typeof value === "function" ? value.bind(this.__eventObject) : value;
            },
            configurable: true
        });
    });

    function touchEventTranslator(callback, eventObject) {
        var changedTouches = eventObject.changedTouches,
            retVal = null;

        if (!changedTouches) {
            return retVal;
        }

        for (var i = 0, len = changedTouches.length; i < len; i++) {
            var touchObject = changedTouches[i];
            var pointerEventObject = new PointerEventProxy(eventObject, {
                pointerType: _MSPointerEvent.MSPOINTER_TYPE_TOUCH,
                pointerId: touchObject.identifier,
                screenX: touchObject.screenX,
                screenY: touchObject.screenY,
                clientX: touchObject.clientX,
                clientY: touchObject.clientY,
                radiusX: touchObject.radiusX,
                radiusY: touchObject.radiusY,
                rotationAngle: touchObject.rotationAngle,
                force: touchObject.force,
                _currentTouch: touchObject
            });
            var newRetVal = callback(pointerEventObject);
            retVal = retVal || newRetVal;
        }
        return retVal;
    }

    function mouseEventTranslator(callback, eventObject) {
        eventObject.pointerType = _MSPointerEvent.MSPOINTER_TYPE_MOUSE;
        eventObject.pointerId = -1;
        return callback(eventObject);
    }

    function mspointerEventTranslator(callback, eventObject) {
        return callback(eventObject);
    }

    var eventTranslations = {
        pointerdown: {
            touch: "touchstart",
            mspointer: "MSPointerDown",
            mouse: "mousedown"
        },
        pointerup: {
            touch: "touchend",
            mspointer: "MSPointerUp",
            mouse: "mouseup"
        },
        pointermove: {
            touch: "touchmove",
            mspointer: "MSPointerMove",
            mouse: "mousemove"
        },
        pointerenter: {
            touch: "touchenter",
            mspointer: "MSPointerEnter",
            mouse: "mouseenter"
        },
        pointerover: {
            touch: null,
            mspointer: "MSPointerOver",
            mouse: "mouseover"
        },
        pointerout: {
            touch: "touchleave",
            mspointer: "MSPointerOut",
            mouse: "mouseout"
        },
        pointercancel: {
            touch: "touchcancel",
            mspointer: "MSPointerCancel",
            mouse: null
        }
    };

    function registerPointerEvent(element, type, callback, capture) {
        var eventNameLowercase = type.toLowerCase();

        var mouseWrapper,
            touchWrapper,
            mspointerWrapper;
        var translations = eventTranslations[eventNameLowercase];

        // Browsers fire a touch event and then a mouse event when the input is touch. touchHandled is used to prevent invoking the pointer callback twice.
        var touchHandled;

        // If we are in IE10, we should use MSPointer as it provides a better interface than touch events
        if (_Global.MSPointerEvent) {
            mspointerWrapper = function (eventObject) {
                eventObject._normalizedType = eventNameLowercase;
                touchHandled = true;
                return mspointerEventTranslator(callback, eventObject);
            };
            element.addEventListener(translations.mspointer, mspointerWrapper, capture);
        } else {
            // Otherwise, use a mouse and touch event
            if (translations.mouse) {
                mouseWrapper = function (eventObject) {
                    eventObject._normalizedType = eventNameLowercase;
                    if (!touchHandled) {
                        return mouseEventTranslator(callback, eventObject);
                    }
                    touchHandled = false;
                };
                element.addEventListener(translations.mouse, mouseWrapper, capture);
            }
            if (translations.touch) {
                touchWrapper = function (eventObject) {
                    eventObject._normalizedType = eventNameLowercase;
                    touchHandled = true;
                    return touchEventTranslator(callback, eventObject);
                };
                element.addEventListener(translations.touch, touchWrapper, capture);
            }
        }

        addListenerToEventMap(element, type, callback, capture, {
            mouseWrapper: mouseWrapper,
            touchWrapper: touchWrapper,
            mspointerWrapper: mspointerWrapper
        });
    }

    function unregisterPointerEvent(element, type, callback, capture) {
        var eventNameLowercase = type.toLowerCase();

        var mapping = removeListenerFromEventMap(element, type, callback, capture);
        if (mapping) {
            var translations = eventTranslations[eventNameLowercase];
            if (mapping.data.mouseWrapper) {
                element.removeEventListener(translations.mouse, mapping.data.mouseWrapper, capture);
            }
            if (mapping.data.touchWrapper) {
                element.removeEventListener(translations.touch, mapping.data.touchWrapper, capture);
            }
            if (mapping.data.mspointerWrapper) {
                element.removeEventListener(translations.mspointer, mapping.data.mspointerWrapper, capture);
            }
        }
    }

    // Custom events dispatch table. Event names should be lowercased.
    //

    var customEvents = {
        focusout: {
            register: registerBubbleListener,
            unregister: removeListenerFromEventMap
        },
        focusin: {
            register: registerBubbleListener,
            unregister: removeListenerFromEventMap
        }
    };
    if (!_Global.PointerEvent) {
        var pointerEventEntry = {
            register: registerPointerEvent,
            unregister: unregisterPointerEvent
        };

        customEvents.pointerdown = pointerEventEntry;
        customEvents.pointerup = pointerEventEntry;
        customEvents.pointermove = pointerEventEntry;
        customEvents.pointerenter = pointerEventEntry;
        customEvents.pointerover = pointerEventEntry;
        customEvents.pointerout = pointerEventEntry;
        customEvents.pointercancel = pointerEventEntry;
    }

    // The MutationObserverShim only supports the following configuration:
    //  attributes
    //  attributeFilter
    var MutationObserverShim = _Base.Class.define(
        function MutationObserverShim_ctor(callback) {
            this._callback = callback;
            this._toDispose = [];
            this._attributeFilter = [];
            this._scheduled = false;
            this._pendingChanges = [];
            this._observerCount = 0;
            this._handleCallback = this._handleCallback.bind(this);
            this._targetElements = [];
        },
        {
            observe: function MutationObserverShim_observe(element, configuration) {
                if (this._targetElements.indexOf(element) === -1) {
                    this._targetElements.push(element);
                }
                this._observerCount++;
                if (configuration.attributes) {
                    this._addRemovableListener(element, "DOMAttrModified", this._handleCallback);
                }
                if (configuration.attributeFilter) {
                    this._attributeFilter = configuration.attributeFilter;
                }
            },
            disconnect: function MutationObserverShim_disconnect() {
                this._observerCount = 0;
                this._targetElements = [];
                this._toDispose.forEach(function (disposeFunc) {
                    disposeFunc();
                });
            },
            _addRemovableListener: function MutationObserverShim_addRemovableListener(target, event, listener) {
                target.addEventListener(event, listener);
                this._toDispose.push(function () {
                    target.removeEventListener(event, listener);
                });
            },
            _handleCallback: function MutationObserverShim_handleCallback(evt) {

                // prevent multiple events from firing when nesting observers
                evt.stopPropagation();

                if (this._attributeFilter.length && this._attributeFilter.indexOf(evt.attrName) === -1) {
                    return;
                }

                // subtree:true is not currently supported
                if (this._targetElements.indexOf(evt.target) === -1) {
                    return;
                }

                var attrName = evt.attrName;

                // DOM mutation events use different naming for this attribute
                if (attrName === 'tabindex') {
                    attrName = 'tabIndex';
                }

                this._pendingChanges.push({
                    type: 'attributes',
                    target: evt.target,
                    attributeName: attrName
                });

                if (this._observerCount === 1) {
                    this._dispatchEvent();
                } else if (this._scheduled === false) {
                    this._scheduled = true;
                    _BaseUtils._setImmediate(this._dispatchEvent.bind(this));
                }

            },
            _dispatchEvent: function MutationObserverShim_dispatchEvent() {
                try {
                    this._callback(this._pendingChanges);
                }
                finally {
                    this._pendingChanges = [];
                    this._scheduled = false;
                }
            }
        },
        {
            _isShim: true
        }
    );

    var _MutationObserver = _Global.MutationObserver || MutationObserverShim;

    // Lazily init singleton on first access.
    var _resizeNotifier = null;

    // Class to provide a global listener for window.onresize events.
    // This keeps individual elements from having to listen to window.onresize
    // and having to dispose themselves to avoid leaks.
    var ResizeNotifier = _Base.Class.define(
        function ElementResizer_ctor() {
            _Global.addEventListener("resize", this._handleResize.bind(this));
        },
        {
            subscribe: function ElementResizer_subscribe(element, handler) {
                element.addEventListener(this._resizeEvent, handler);
                addClass(element, this._resizeClass);
            },
            unsubscribe: function ElementResizer_unsubscribe(element, handler) {
                removeClass(element, this._resizeClass);
                element.removeEventListener(this._resizeEvent, handler);
            },
            _handleResize: function ElementResizer_handleResize() {
                var resizables = _Global.document.querySelectorAll('.' + this._resizeClass);
                var length = resizables.length;
                for (var i = 0; i < length; i++) {
                    var event = _Global.document.createEvent("Event");
                    event.initEvent(this._resizeEvent, false, true);
                    resizables[i].dispatchEvent(event);
                }
            },
            _resizeClass: { get: function () { return 'win-element-resize'; } },
            _resizeEvent: { get: function () { return 'WinJSElementResize'; } }
        }
    );


    var GlobalListener = new (_Base.Class.define(
        function GlobalListener_ctor() {
            this.capture = {};
            this.bubble = {};
        },
        {
            addEventListener: function GlobalListener_addEventListener(element, name, listener, capture) {
                name = name.toLowerCase();
                var handlers = this._getHandlers(capture);
                var handler = handlers[name];

                if (!handler) {
                    handler = this._getListener(name, capture);
                    handler.refCount = 0;
                    handlers[name] = handler;

                    exports._addEventListener(_Global, name, handler, capture);
                }

                handler.refCount++;
                element.addEventListener(this._getEventName(name, capture), listener);
                addClass(element, this._getClassName(name, capture));
            },
            removeEventListener: function GlobalListener_removeEventListener(element, name, listener, capture) {
                name = name.toLowerCase();
                var handlers = this._getHandlers(capture);
                var handler = handlers[name];

                if (handler) {
                    handler.refCount--;
                    if (handler.refCount === 0) {
                        exports._removeEventListener(_Global, name, handler, capture);
                    }
                    delete handlers[name];
                }

                removeClass(element, this._getClassName(name, capture));
                element.removeEventListener(this._getEventName(name, capture), listener);
            },

            _getHandlers: function GlobalListener_getHandlers(capture) {
                if (capture) {
                    return this.capture;
                } else {
                    return this.bubble;
                }
            },

            _getClassName: function GlobalListener_getClassName(name, capture) {
                var captureSuffix = capture ? 'capture' : 'bubble';
                return 'win-global-event-' + name + captureSuffix;
            },

            _getEventName: function GlobalListener_getEventName(name, capture) {
                var captureSuffix = capture ? 'capture' : 'bubble';
                return 'WinJSGlobalEvent-' + name + captureSuffix;
            },

            _getListener: function GlobalListener_getListener(name, capture) {
                var listener = function GlobalListener_generatedListener(ev) {

                    var targets = _Global.document.querySelectorAll('.' + this._getClassName(name, capture));
                    var length = targets.length;
                    for (var i = 0; i < length; i++) {
                        var event = _Global.document.createEvent("Event");
                        event.initEvent(this._getEventName(name, capture), false, true);
                        event.detail = { originalEvent: ev };
                        targets[i].dispatchEvent(event);
                    }
                };

                return listener.bind(this);
            }
        }
    ))();

    var determinedRTLEnvironment = false,
        usingWebkitScrollCoordinates = false,
        usingFirefoxScrollCoordinates = false;
    function determineRTLEnvironment() {
        var element = _Global.document.createElement("div");
        element.style.direction = "rtl";
        element.innerHTML = "" +
            "<div style='width: 100px; height: 100px; overflow: scroll; visibility:hidden'>" +
                "<div style='width: 10000px; height: 100px;'></div>" +
            "</div>";
        _Global.document.body.appendChild(element);
        var elementScroller = element.firstChild;
        if (elementScroller.scrollLeft > 0) {
            usingWebkitScrollCoordinates = true;
        }
        elementScroller.scrollLeft += 100;
        if (elementScroller.scrollLeft === 0) {
            usingFirefoxScrollCoordinates = true;
        }
        _Global.document.body.removeChild(element);
        determinedRTLEnvironment = true;
    }

    function getAdjustedScrollPosition(element) {
        var computedStyle = _Global.getComputedStyle(element),
            scrollLeft = element.scrollLeft;
        if (computedStyle.direction === "rtl") {
            if (!determinedRTLEnvironment) {
                determineRTLEnvironment();
            }
            if (usingWebkitScrollCoordinates) {
                scrollLeft = element.scrollWidth - element.clientWidth - scrollLeft;
            }
            scrollLeft = Math.abs(scrollLeft);
        }

        return {
            scrollLeft: scrollLeft,
            scrollTop: element.scrollTop
        };
    }

    function setAdjustedScrollPosition(element, scrollLeft, scrollTop) {
        if (scrollLeft !== undefined) {
            var computedStyle = _Global.getComputedStyle(element);
            if (computedStyle.direction === "rtl") {
                if (!determinedRTLEnvironment) {
                    determineRTLEnvironment();
                }
                if (usingFirefoxScrollCoordinates) {
                    scrollLeft = -scrollLeft;
                } else if (usingWebkitScrollCoordinates) {
                    scrollLeft = element.scrollWidth - element.clientWidth - scrollLeft;
                }
            }
            element.scrollLeft = scrollLeft;
        }

        if (scrollTop !== undefined) {
            element.scrollTop = scrollTop;
        }
    }

    function getScrollPosition(element) {
        /// <signature helpKeyword="WinJS.Utilities.getScrollPosition">
        /// <summary locid="WinJS.Utilities.getScrollPosition">
        /// Gets the scrollLeft and scrollTop of the specified element, adjusting the scrollLeft to change from browser specific coordinates to logical coordinates when in RTL.
        /// </summary>
        /// <param name="element" type="HTMLElement" domElement="true" locid="WinJS.Utilities.getScrollPosition_p:element">
        /// The element.
        /// </param>
        /// <returns type="Object" locid="WinJS.Utilities.getScrollPosition_returnValue">
        /// An object with two properties: scrollLeft and scrollTop
        /// </returns>
        /// </signature>
        return getAdjustedScrollPosition(element);
    }

    function setScrollPosition(element, position) {
        /// <signature helpKeyword="WinJS.Utilities.setScrollPosition">
        /// <summary locid="WinJS.Utilities.setScrollPosition">
        /// Sets the scrollLeft and scrollTop of the specified element, changing the scrollLeft from logical coordinates to browser-specific coordinates when in RTL.
        /// </summary>
        /// <param name="element" type="HTMLElement" domElement="true" locid="WinJS.Utilities.setScrollPosition_p:element">
        /// The element.
        /// </param>
        /// <param name="position" type="Object" domElement="true" locid="WinJS.Utilities.setScrollPosition_p:position">
        /// The element.
        /// </param>
        /// </signature>
        position = position || {};
        setAdjustedScrollPosition(element, position.scrollLeft, position.scrollTop);
    }

    var supportsZoomTo = !!_Global.HTMLElement.prototype.msZoomTo;
    var supportsTouchDetection = !!(_Global.MSPointerEvent || _Global.TouchEvent);

    var uniqueElementIDCounter = 0;

    function uniqueID(e) {
        if (!(e.uniqueID || e._uniqueID)) {
            e._uniqueID = "element__" + (++uniqueElementIDCounter);
        }

        return e.uniqueID || e._uniqueID;
    }

    function ensureId(element) {
        if (!element.id) {
            element.id = uniqueID(element);
        }
    }

    function _getCursorPos(eventObject) {
        var docElement = _Global.document.documentElement;
        var docScrollPos = getScrollPosition(docElement);

        return {
            left: eventObject.clientX + (_Global.document.body.dir === "rtl" ? -docScrollPos.scrollLeft : docScrollPos.scrollLeft),
            top: eventObject.clientY + docElement.scrollTop
        };
    }

    function _getElementsByClasses(parent, classes) {
        var retVal = [];

        for (var i = 0, len = classes.length; i < len; i++) {
            var element = parent.querySelector("." + classes[i]);
            if (element) {
                retVal.push(element);
            }
        }
        return retVal;
    }

    var _selectionPartsSelector = ".win-selectionborder, .win-selectionbackground, .win-selectioncheckmark, .win-selectioncheckmarkbackground";
    var _dataKey = "_msDataKey";
    _Base.Namespace._moduleDefine(exports, "WinJS.Utilities", {
        _dataKey: _dataKey,

        _supportsTouchDetection: {
            get: function () {
                return supportsTouchDetection;
            }
        },

        _supportsZoomTo: {
            get: function () {
                return supportsZoomTo;
            }
        },

        _uniqueID: uniqueID,

        _ensureId: ensureId,

        _clamp: _clamp,

        _getCursorPos: _getCursorPos,

        _getElementsByClasses: _getElementsByClasses,

        _createGestureRecognizer: function () {
            if (_Global.MSGesture) {
                return new _Global.MSGesture();
            }

            var doNothing = function () {
            };
            return {
                addEventListener: doNothing,
                removeEventListener: doNothing,
                addPointer: doNothing,
                stop: doNothing
            };
        },

        _supportsTouchActionCrossSlide: {
            get: function () {
                if (this._supportsTouchActionCrossSlideValue === undefined) {
                    this._supportsTouchActionCrossSlideValue = false;
                    var touchActionStyle = _BaseUtils._browserStyleEquivalents["touch-action"];
                    if (touchActionStyle) {
                        var div = _Global.document.createElement("div");
                        div.style.touchAction = "cross-slide-x";
                        _Global.document.body.appendChild(div);
                        this._supportsTouchActionCrossSlideValue = _Global.getComputedStyle(div).touchAction === "cross-slide-x";
                        _Global.document.body.removeChild(div);
                    }
                }
                return this._supportsTouchActionCrossSlideValue;
            }
        },

        _detectSnapPointsSupport: function () {
            // Snap point feature detection is special - On most platforms it is enough to check if 'msZoomTo'
            // is available, however, Windows Phone IEs claim that they support it but don't really do so we
            // test by creating a scroller with mandatory snap points and test against ManipulationStateChanged events.
            if (!this._snapPointsDetectionPromise) {
                if (!_Global.HTMLElement.prototype.msZoomTo) {
                    this._snapPointsDetectionPromise = Promise.wrap(false);
                } else {
                    this._snapPointsDetectionPromise = new Promise(function (c) {
                        var scroller = _Global.document.createElement("div");
                        scroller.style.width = "100px";
                        scroller.style.overflowX = "scroll";
                        scroller.style.msScrollSnapType = "mandatory";
                        scroller.style.position = "absolute";
                        scroller.style.opacity = "0";
                        scroller.style.visibility = "hidden";
                        var handler = function (e) {
                            scroller.removeEventListener("MSManipulationStateChanged", handler);
                            _Global.clearTimeout(timeoutHandle);
                            _Global.document.body.removeChild(scroller);
                            c(true);
                        };
                        scroller.addEventListener("MSManipulationStateChanged", handler);

                        var content = _Global.document.createElement("div");
                        content.style.width = content.style.height = "200px";
                        scroller.appendChild(content);

                        _Global.document.body.appendChild(scroller);
                        scroller.msZoomTo({ contentX: 90 });

                        var timeoutHandle = _Global.setTimeout(function () {
                            scroller.removeEventListener("MSManipulationStateChanged", handler);
                            _Global.document.body.removeChild(scroller);
                            c(false);
                        }, 50);
                    });
                }
            }
            return this._snapPointsDetectionPromise;
        },

        _MSGestureEvent: _MSGestureEvent,
        _MSManipulationEvent: _MSManipulationEvent,

        _elementsFromPoint: function (x, y) {
            if (_Global.document.msElementsFromPoint) {
                return _Global.document.msElementsFromPoint(x, y);
            } else {
                var element = _Global.document.elementFromPoint(x, y);
                return element ? [element] : null;
            }
        },

        _matchesSelector: function _matchesSelector(element, selectorString) {
            var matchesSelector = element.matches
                    || element.msMatchesSelector
                    || element.mozMatchesSelector
                    || element.webkitMatchesSelector;
            return matchesSelector.call(element, selectorString);
        },

        _selectionPartsSelector: _selectionPartsSelector,

        _isSelectionRendered: function _isSelectionRendered(itemBox) {
            // The tree is changed at pointerDown but _selectedClass is added only when the user drags an item below the selection threshold so checking for _selectedClass is not reliable.
            return itemBox.querySelectorAll(_selectionPartsSelector).length > 0;
        },

        _addEventListener: function _addEventListener(element, type, listener, useCapture) {
            var eventNameLower = type && type.toLowerCase();
            var entry = customEvents[eventNameLower];
            var equivalentEvent = _BaseUtils._browserEventEquivalents[type];
            if (entry) {
                entry.register(element, type, listener, useCapture);
            } else if (equivalentEvent) {
                element.addEventListener(equivalentEvent, listener, useCapture);
            } else {
                element.addEventListener(type, listener, useCapture);
            }
        },

        _removeEventListener: function _removeEventListener(element, type, listener, useCapture) {
            var eventNameLower = type && type.toLowerCase();
            var entry = customEvents[eventNameLower];
            var equivalentEvent = _BaseUtils._browserEventEquivalents[type];
            if (entry) {
                entry.unregister(element, type, listener, useCapture);
            } else if (equivalentEvent) {
                element.removeEventListener(equivalentEvent, listener, useCapture);
            } else {
                element.removeEventListener(type, listener, useCapture);
            }
        },

        _initEventImpl: function (initType, event, eventType) {
            eventType = eventType.toLowerCase();
            var mapping = eventTranslations[eventType];
            if (mapping) {
                switch (initType.toLowerCase()) {
                    case "pointer":
                        arguments[2] = mapping.mspointer;
                        break;

                    default:
                        arguments[2] = mapping[initType.toLowerCase()];
                        break;
                }
            }
            event["init" + initType + "Event"].apply(event, Array.prototype.slice.call(arguments, 2));
        },

        _initMouseEvent: function (event) {
            this._initEventImpl.apply(this, ["Mouse", event].concat(Array.prototype.slice.call(arguments, 1)));
        },

        _initPointerEvent: function (event) {
            this._initEventImpl.apply(this, ["Pointer", event].concat(Array.prototype.slice.call(arguments, 1)));
        },

        _PointerEventProxy: PointerEventProxy,

        _bubbleEvent: bubbleEvent,

        _setPointerCapture: function (element, pointerId) {
            if (element.setPointerCapture) {
                element.setPointerCapture(pointerId);
            }
        },

        _releasePointerCapture: function (element, pointerId) {
            if (element.releasePointerCapture) {
                element.releasePointerCapture(pointerId);
            }
        },

        _MSPointerEvent: _MSPointerEvent,

        _zoomToDuration: _zoomToDuration,

        _zoomTo: function _zoomTo(element, args) {
            if (element.msZoomTo) {
                element.msZoomTo(args);
            } else {
                // Schedule to ensure that we're not running from within an event handler. For example, if running
                // within a focus handler triggered by WinJS.Utilities._setActive, scroll position will not yet be
                // restored.
                Scheduler.schedule(function () {
                    var initialPos = getAdjustedScrollPosition(element);
                    var effectiveScrollLeft = (typeof element._zoomToDestX === "number" ? element._zoomToDestX : initialPos.scrollLeft);
                    var effectiveScrollTop = (typeof element._zoomToDestY === "number" ? element._zoomToDestY : initialPos.scrollTop);
                    var cs = _Global.getComputedStyle(element);
                    var scrollLimitX = element.scrollWidth - parseInt(cs.width, 10) - parseInt(cs.paddingLeft, 10) - parseInt(cs.paddingRight, 10);
                    var scrollLimitY = element.scrollHeight - parseInt(cs.height, 10) - parseInt(cs.paddingTop, 10) - parseInt(cs.paddingBottom, 10);

                    if (typeof args.contentX !== "number") {
                        args.contentX = effectiveScrollLeft;
                    }
                    if (typeof args.contentY !== "number") {
                        args.contentY = effectiveScrollTop;
                    }

                    var zoomToDestX = _clamp(args.contentX, 0, scrollLimitX);
                    var zoomToDestY = _clamp(args.contentY, 0, scrollLimitY);
                    if (zoomToDestX === effectiveScrollLeft && zoomToDestY === effectiveScrollTop) {
                        // Scroll position is already in the proper state. This zoomTo is a no-op.
                        return;
                    }

                    element._zoomToId = element._zoomToId || 0;
                    element._zoomToId++;
                    element._zoomToDestX = zoomToDestX;
                    element._zoomToDestY = zoomToDestY;

                    var thisZoomToId = element._zoomToId;
                    var start = _BaseUtils._now();
                    var xFactor = (element._zoomToDestX - initialPos.scrollLeft) / _zoomToDuration;
                    var yFactor = (element._zoomToDestY - initialPos.scrollTop) / _zoomToDuration;

                    var update = function () {
                        var t = _BaseUtils._now() - start;
                        if (element._zoomToId !== thisZoomToId) {
                            return;
                        } else if (t > _zoomToDuration) {
                            setAdjustedScrollPosition(element, element._zoomToDestX, element._zoomToDestY);
                            element._zoomToDestX = null;
                            element._zoomToDestY = null;
                        } else {
                            setAdjustedScrollPosition(element, initialPos.scrollLeft + t * xFactor, initialPos.scrollTop + t * yFactor);
                            _Global.requestAnimationFrame(update);
                        }
                    };

                    _Global.requestAnimationFrame(update);
                }, Scheduler.Priority.high, null, "WinJS.Utilities._zoomTo");
            }
        },

        _setActive: function _setActive(element, scroller) {
            var success = true;
            try {
                if (_Global.HTMLElement && _Global.HTMLElement.prototype.setActive) {
                    element.setActive();
                } else {
                    // We are aware the unlike setActive(), focus() will scroll to the element that gets focus. However, this is
                    // our current cross-browser solution until there is an equivalent for setActive() in other browsers.
                    //
                    // This _setActive polyfill does have limited support for preventing scrolling: via the scroller parameter, it
                    // can prevent one scroller from scrolling. This functionality is necessary in some scenarios. For example, when using
                    // _zoomTo and _setActive together.

                    var scrollLeft,
                        scrollTop;

                    if (scroller) {
                        scrollLeft = scroller.scrollLeft;
                        scrollTop = scroller.scrollTop;
                    }
                    element.focus();
                    if (scroller) {
                        scroller.scrollLeft = scrollLeft;
                        scroller.scrollTop = scrollTop;
                    }
                }
            } catch (e) {
                // setActive() raises an exception when trying to focus an invisible item. Checking visibility is non-trivial, so it's best
                // just to catch the exception and ignore it. focus() on the other hand, does not raise exceptions.
                success = false;
            }
            return success;
        },

        _MutationObserver: _MutationObserver,

        _resizeNotifier: {
            get: function () {
                if (!_resizeNotifier) {
                    _resizeNotifier = new ResizeNotifier();
                }
                return _resizeNotifier;
            }
        },

        _globalListener: GlobalListener,

        // Appends a hidden child to the given element that will listen for being added
        // to the DOM. When the hidden element is added to the DOM, it will dispatch a
        // "WinJSNodeInserted" event on the provided element.
        _addInsertedNotifier: function (element) {
            var hiddenElement = _Global.document.createElement("div");
            hiddenElement.style[_BaseUtils._browserStyleEquivalents["animation-name"].scriptName] = "WinJS-node-inserted";
            hiddenElement.style[_BaseUtils._browserStyleEquivalents["animation-duration"].scriptName] = "0.01s";
            hiddenElement.style["position"] = "absolute";
            element.appendChild(hiddenElement);

            exports._addEventListener(hiddenElement, "animationStart", function (e) {
                if (e.animationName === "WinJS-node-inserted") {
                    var e = _Global.document.createEvent("Event");
                    e.initEvent("WinJSNodeInserted", false, true);
                    element.dispatchEvent(e);
                }
            }, false);

            return hiddenElement;
        },

        // Browser agnostic method to set element flex style
        // Param is an object in the form {grow: flex-grow, shrink: flex-shrink, basis: flex-basis}
        // All fields optional
        _setFlexStyle: function (element, flexParams) {
            var styleObject = element.style;
            if (typeof flexParams.grow !== "undefined") {
                styleObject.msFlexPositive = flexParams.grow;
                styleObject.webkitFlexGrow = flexParams.grow;
                styleObject.flexGrow = flexParams.grow;
            }
            if (typeof flexParams.shrink !== "undefined") {
                styleObject.msFlexNegative = flexParams.shrink;
                styleObject.webkitFlexShrink = flexParams.shrink;
                styleObject.flexShrink = flexParams.shrink;
            }
            if (typeof flexParams.basis !== "undefined") {
                styleObject.msFlexPreferredSize = flexParams.basis;
                styleObject.webkitFlexBasis = flexParams.basis;
                styleObject.flexBasis = flexParams.basis;
            }
        },

        /// <field locid="WinJS.Utilities.Key" helpKeyword="WinJS.Utilities.Key">
        /// Defines a set of keyboard values.
        /// </field>
        Key: {
            /// <field locid="WinJS.Utilities.Key.backspace" helpKeyword="WinJS.Utilities.Key.backspace">
            /// BACKSPACE key.
            /// </field>
            backspace: 8,

            /// <field locid="WinJS.Utilities.Key.tab" helpKeyword="WinJS.Utilities.Key.tab">
            /// TAB key.
            /// </field>
            tab: 9,

            /// <field locid="WinJS.Utilities.Key.enter" helpKeyword="WinJS.Utilities.Key.enter">
            /// ENTER key.
            /// </field>
            enter: 13,

            /// <field locid="WinJS.Utilities.Key.shift" helpKeyword="WinJS.Utilities.Key.shift">
            /// Shift key.
            /// </field>
            shift: 16,

            /// <field locid="WinJS.Utilities.Key.ctrl" helpKeyword="WinJS.Utilities.Key.ctrl">
            /// CTRL key.
            /// </field>
            ctrl: 17,

            /// <field locid="WinJS.Utilities.Key.alt" helpKeyword="WinJS.Utilities.Key.alt">
            /// ALT key
            /// </field>
            alt: 18,

            /// <field locid="WinJS.Utilities.Key.pause" helpKeyword="WinJS.Utilities.Key.pause">
            /// Pause key.
            /// </field>
            pause: 19,

            /// <field locid="WinJS.Utilities.Key.capsLock" helpKeyword="WinJS.Utilities.Key.capsLock">
            /// CAPS LOCK key.
            /// </field>
            capsLock: 20,

            /// <field locid="WinJS.Utilities.Key.escape" helpKeyword="WinJS.Utilities.Key.escape">
            /// ESCAPE key.
            /// </field>
            escape: 27,

            /// <field locid="WinJS.Utilities.Key.space" helpKeyword="WinJS.Utilities.Key.space">
            /// SPACE key.
            /// </field>
            space: 32,

            /// <field locid="WinJS.Utilities.Key.pageUp" helpKeyword="WinJS.Utilities.Key.pageUp">
            /// PAGE UP key.
            /// </field>
            pageUp: 33,

            /// <field locid="WinJS.Utilities.Key.pageDown" helpKeyword="WinJS.Utilities.Key.pageDown">
            /// PAGE DOWN key.
            /// </field>
            pageDown: 34,

            /// <field locid="WinJS.Utilities.Key.end" helpKeyword="WinJS.Utilities.Key.end">
            /// END key.
            /// </field>
            end: 35,

            /// <field locid="WinJS.Utilities.Key.home" helpKeyword="WinJS.Utilities.Key.home">
            /// HOME key.
            /// </field>
            home: 36,

            /// <field locid="WinJS.Utilities.Key.leftArrow" helpKeyword="WinJS.Utilities.Key.leftArrow">
            /// Left arrow key.
            /// </field>
            leftArrow: 37,

            /// <field locid="WinJS.Utilities.Key.upArrow" helpKeyword="WinJS.Utilities.Key.upArrow">
            /// Up arrow key.
            /// </field>
            upArrow: 38,

            /// <field locid="WinJS.Utilities.Key.rightArrow" helpKeyword="WinJS.Utilities.Key.rightArrow">
            /// Right arrow key.
            /// </field>
            rightArrow: 39,

            /// <field locid="WinJS.Utilities.Key.downArrow" helpKeyword="WinJS.Utilities.Key.downArrow">
            /// Down arrow key.
            /// </field>
            downArrow: 40,

            /// <field locid="WinJS.Utilities.Key.insert" helpKeyword="WinJS.Utilities.Key.insert">
            /// INSERT key.
            /// </field>
            insert: 45,

            /// <field locid="WinJS.Utilities.Key.deleteKey" helpKeyword="WinJS.Utilities.Key.deleteKey">
            /// DELETE key.
            /// </field>
            deleteKey: 46,

            /// <field locid="WinJS.Utilities.Key.num0" helpKeyword="WinJS.Utilities.Key.num0">
            /// Number 0 key.
            /// </field>
            num0: 48,

            /// <field locid="WinJS.Utilities.Key.num1" helpKeyword="WinJS.Utilities.Key.num1">
            /// Number 1 key.
            /// </field>
            num1: 49,

            /// <field locid="WinJS.Utilities.Key.num2" helpKeyword="WinJS.Utilities.Key.num2">
            /// Number 2 key.
            /// </field>
            num2: 50,

            /// <field locid="WinJS.Utilities.Key.num3" helpKeyword="WinJS.Utilities.Key.num3">
            /// Number 3 key.
            /// </field>
            num3: 51,

            /// <field locid="WinJS.Utilities.Key.num4" helpKeyword="WinJS.Utilities.Key.num4">
            /// Number 4 key.
            /// </field>
            num4: 52,

            /// <field locid="WinJS.Utilities.Key.num5" helpKeyword="WinJS.Utilities.Key.num5">
            /// Number 5 key.
            /// </field>
            num5: 53,

            /// <field locid="WinJS.Utilities.Key.num6" helpKeyword="WinJS.Utilities.Key.num6">
            /// Number 6 key.
            /// </field>
            num6: 54,

            /// <field locid="WinJS.Utilities.Key.num7" helpKeyword="WinJS.Utilities.Key.num7">
            /// Number 7 key.
            /// </field>
            num7: 55,

            /// <field locid="WinJS.Utilities.Key.num8" helpKeyword="WinJS.Utilities.Key.num8">
            /// Number 8 key.
            /// </field>
            num8: 56,

            /// <field locid="WinJS.Utilities.Key.num9" helpKeyword="WinJS.Utilities.Key.num9">
            /// Number 9 key.
            /// </field>
            num9: 57,

            /// <field locid="WinJS.Utilities.Key.a" helpKeyword="WinJS.Utilities.Key.a">
            /// A key.
            /// </field>
            a: 65,

            /// <field locid="WinJS.Utilities.Key.b" helpKeyword="WinJS.Utilities.Key.b">
            /// B key.
            /// </field>
            b: 66,

            /// <field locid="WinJS.Utilities.Key.c" helpKeyword="WinJS.Utilities.Key.c">
            /// C key.
            /// </field>
            c: 67,

            /// <field locid="WinJS.Utilities.Key.d" helpKeyword="WinJS.Utilities.Key.d">
            /// D key.
            /// </field>
            d: 68,

            /// <field locid="WinJS.Utilities.Key.e" helpKeyword="WinJS.Utilities.Key.e">
            /// E key.
            /// </field>
            e: 69,

            /// <field locid="WinJS.Utilities.Key.f" helpKeyword="WinJS.Utilities.Key.f">
            /// F key.
            /// </field>
            f: 70,

            /// <field locid="WinJS.Utilities.Key.g" helpKeyword="WinJS.Utilities.Key.g">
            /// G key.
            /// </field>
            g: 71,

            /// <field locid="WinJS.Utilities.Key.h" helpKeyword="WinJS.Utilities.Key.h">
            /// H key.
            /// </field>
            h: 72,

            /// <field locid="WinJS.Utilities.Key.i" helpKeyword="WinJS.Utilities.Key.i">
            /// I key.
            /// </field>
            i: 73,

            /// <field locid="WinJS.Utilities.Key.j" helpKeyword="WinJS.Utilities.Key.j">
            /// J key.
            /// </field>
            j: 74,

            /// <field locid="WinJS.Utilities.Key.k" helpKeyword="WinJS.Utilities.Key.k">
            /// K key.
            /// </field>
            k: 75,

            /// <field locid="WinJS.Utilities.Key.l" helpKeyword="WinJS.Utilities.Key.l">
            /// L key.
            /// </field>
            l: 76,

            /// <field locid="WinJS.Utilities.Key.m" helpKeyword="WinJS.Utilities.Key.m">
            /// M key.
            /// </field>
            m: 77,

            /// <field locid="WinJS.Utilities.Key.n" helpKeyword="WinJS.Utilities.Key.n">
            /// N key.
            /// </field>
            n: 78,

            /// <field locid="WinJS.Utilities.Key.o" helpKeyword="WinJS.Utilities.Key.o">
            /// O key.
            /// </field>
            o: 79,

            /// <field locid="WinJS.Utilities.Key.p" helpKeyword="WinJS.Utilities.Key.p">
            /// P key.
            /// </field>
            p: 80,

            /// <field locid="WinJS.Utilities.Key.q" helpKeyword="WinJS.Utilities.Key.q">
            /// Q key.
            /// </field>
            q: 81,

            /// <field locid="WinJS.Utilities.Key.r" helpKeyword="WinJS.Utilities.Key.r">
            /// R key.
            /// </field>
            r: 82,

            /// <field locid="WinJS.Utilities.Key.s" helpKeyword="WinJS.Utilities.Key.s">
            /// S key.
            /// </field>
            s: 83,

            /// <field locid="WinJS.Utilities.Key.t" helpKeyword="WinJS.Utilities.Key.t">
            /// T key.
            /// </field>
            t: 84,

            /// <field locid="WinJS.Utilities.Key.u" helpKeyword="WinJS.Utilities.Key.u">
            /// U key.
            /// </field>
            u: 85,

            /// <field locid="WinJS.Utilities.Key.v" helpKeyword="WinJS.Utilities.Key.v">
            /// V key.
            /// </field>
            v: 86,

            /// <field locid="WinJS.Utilities.Key.w" helpKeyword="WinJS.Utilities.Key.w">
            /// W key.
            /// </field>
            w: 87,

            /// <field locid="WinJS.Utilities.Key.x" helpKeyword="WinJS.Utilities.Key.x">
            /// X key.
            /// </field>
            x: 88,

            /// <field locid="WinJS.Utilities.Key.y" helpKeyword="WinJS.Utilities.Key.y">
            /// Y key.
            /// </field>
            y: 89,

            /// <field locid="WinJS.Utilities.Key.z" helpKeyword="WinJS.Utilities.Key.z">
            /// Z key.
            /// </field>
            z: 90,

            /// <field locid="WinJS.Utilities.Key.leftWindows" helpKeyword="WinJS.Utilities.Key.leftWindows">
            /// Left Windows key.
            /// </field>
            leftWindows: 91,

            /// <field locid="WinJS.Utilities.Key.rightWindows" helpKeyword="WinJS.Utilities.Key.rightWindows">
            /// Right Windows key.
            /// </field>
            rightWindows: 92,

            /// <field locid="WinJS.Utilities.Key.menu" helpKeyword="WinJS.Utilities.Key.menu">
            /// Menu key.
            /// </field>
            menu: 93,

            /// <field locid="WinJS.Utilities.Key.numPad0" helpKeyword="WinJS.Utilities.Key.numPad0">
            /// Number pad 0 key.
            /// </field>
            numPad0: 96,

            /// <field locid="WinJS.Utilities.Key.numPad1" helpKeyword="WinJS.Utilities.Key.numPad1">
            /// Number pad 1 key.
            /// </field>
            numPad1: 97,

            /// <field locid="WinJS.Utilities.Key.numPad2" helpKeyword="WinJS.Utilities.Key.numPad2">
            /// Number pad 2 key.
            /// </field>
            numPad2: 98,

            /// <field locid="WinJS.Utilities.Key.numPad3" helpKeyword="WinJS.Utilities.Key.numPad3">
            /// Number pad 3 key.
            /// </field>
            numPad3: 99,

            /// <field locid="WinJS.Utilities.Key.numPad4" helpKeyword="WinJS.Utilities.Key.numPad4">
            /// Number pad 4 key.
            /// </field>
            numPad4: 100,

            /// <field locid="WinJS.Utilities.Key.numPad5" helpKeyword="WinJS.Utilities.Key.numPad5">
            /// Number pad 5 key.
            /// </field>
            numPad5: 101,

            /// <field locid="WinJS.Utilities.Key.numPad6" helpKeyword="WinJS.Utilities.Key.numPad6">
            /// Number pad 6 key.
            /// </field>
            numPad6: 102,

            /// <field locid="WinJS.Utilities.Key.numPad7" helpKeyword="WinJS.Utilities.Key.numPad7">
            /// Number pad 7 key.
            /// </field>
            numPad7: 103,

            /// <field locid="WinJS.Utilities.Key.numPad8" helpKeyword="WinJS.Utilities.Key.numPad8">
            /// Number pad 8 key.
            /// </field>
            numPad8: 104,

            /// <field locid="WinJS.Utilities.Key.numPad9" helpKeyword="WinJS.Utilities.Key.numPad9">
            /// Number pad 9 key.
            /// </field>
            numPad9: 105,

            /// <field locid="WinJS.Utilities.Key.multiply" helpKeyword="WinJS.Utilities.Key.multiply">
            /// Multiplication key.
            /// </field>
            multiply: 106,

            /// <field locid="WinJS.Utilities.Key.add" helpKeyword="WinJS.Utilities.Key.add">
            /// Addition key.
            /// </field>
            add: 107,

            /// <field locid="WinJS.Utilities.Key.subtract" helpKeyword="WinJS.Utilities.Key.subtract">
            /// Subtraction key.
            /// </field>
            subtract: 109,

            /// <field locid="WinJS.Utilities.Key.decimalPoint" helpKeyword="WinJS.Utilities.Key.decimalPoint">
            /// Decimal point key.
            /// </field>
            decimalPoint: 110,

            /// <field locid="WinJS.Utilities.Key.divide" helpKeyword="WinJS.Utilities.Key.divide">
            /// Division key.
            /// </field>
            divide: 111,

            /// <field locid="WinJS.Utilities.Key.F1" helpKeyword="WinJS.Utilities.Key.F1">
            /// F1 key.
            /// </field>
            F1: 112,

            /// <field locid="WinJS.Utilities.Key.F2" helpKeyword="WinJS.Utilities.Key.F2">
            /// F2 key.
            /// </field>
            F2: 113,

            /// <field locid="WinJS.Utilities.Key.F3" helpKeyword="WinJS.Utilities.Key.F3">
            /// F3 key.
            /// </field>
            F3: 114,

            /// <field locid="WinJS.Utilities.Key.F4" helpKeyword="WinJS.Utilities.Key.F4">
            /// F4 key.
            /// </field>
            F4: 115,

            /// <field locid="WinJS.Utilities.Key.F5" helpKeyword="WinJS.Utilities.Key.F5">
            /// F5 key.
            /// </field>
            F5: 116,

            /// <field locid="WinJS.Utilities.Key.F6" helpKeyword="WinJS.Utilities.Key.F6">
            /// F6 key.
            /// </field>
            F6: 117,

            /// <field locid="WinJS.Utilities.Key.F7" helpKeyword="WinJS.Utilities.Key.F7">
            /// F7 key.
            /// </field>
            F7: 118,

            /// <field locid="WinJS.Utilities.Key.F8" helpKeyword="WinJS.Utilities.Key.F8">
            /// F8 key.
            /// </field>
            F8: 119,

            /// <field locid="WinJS.Utilities.Key.F9" helpKeyword="WinJS.Utilities.Key.F9">
            /// F9 key.
            /// </field>
            F9: 120,

            /// <field locid="WinJS.Utilities.Key.F10" helpKeyword="WinJS.Utilities.Key.F10">
            /// F10 key.
            /// </field>
            F10: 121,

            /// <field locid="WinJS.Utilities.Key.F11" helpKeyword="WinJS.Utilities.Key.F11">
            /// F11 key.
            /// </field>
            F11: 122,

            /// <field locid="WinJS.Utilities.Key.F12" helpKeyword="WinJS.Utilities.Key.F12">
            /// F12 key.
            /// </field>
            F12: 123,

            /// <field locid="WinJS.Utilities.Key.numLock" helpKeyword="WinJS.Utilities.Key.numLock">
            /// NUMBER LOCK key.
            /// </field>
            numLock: 144,

            /// <field locid="WinJS.Utilities.Key.scrollLock" helpKeyword="WinJS.Utilities.Key.scrollLock">
            /// SCROLL LOCK key.
            /// </field>
            scrollLock: 145,

            /// <field locid="WinJS.Utilities.Key.browserBack" helpKeyword="WinJS.Utilities.Key.browserBack">
            /// Browser back key.
            /// </field>
            browserBack: 166,

            /// <field locid="WinJS.Utilities.Key.browserForward" helpKeyword="WinJS.Utilities.Key.browserForward">
            /// Browser forward key.
            /// </field>
            browserForward: 167,

            /// <field locid="WinJS.Utilities.Key.semicolon" helpKeyword="WinJS.Utilities.Key.semicolon">
            /// SEMICOLON key.
            /// </field>
            semicolon: 186,

            /// <field locid="WinJS.Utilities.Key.equal" helpKeyword="WinJS.Utilities.Key.equal">
            /// EQUAL key.
            /// </field>
            equal: 187,

            /// <field locid="WinJS.Utilities.Key.comma" helpKeyword="WinJS.Utilities.Key.comma">
            /// COMMA key.
            /// </field>
            comma: 188,

            /// <field locid="WinJS.Utilities.Key.dash" helpKeyword="WinJS.Utilities.Key.dash">
            /// DASH key.
            /// </field>
            dash: 189,

            /// <field locid="WinJS.Utilities.Key.period" helpKeyword="WinJS.Utilities.Key.period">
            /// PERIOD key.
            /// </field>
            period: 190,

            /// <field locid="WinJS.Utilities.Key.forwardSlash" helpKeyword="WinJS.Utilities.Key.forwardSlash">
            /// FORWARD SLASH key.
            /// </field>
            forwardSlash: 191,

            /// <field locid="WinJS.Utilities.Key.graveAccent" helpKeyword="WinJS.Utilities.Key.graveAccent">
            /// Accent grave key.
            /// </field>
            graveAccent: 192,

            /// <field locid="WinJS.Utilities.Key.openBracket" helpKeyword="WinJS.Utilities.Key.openBracket">
            /// OPEN BRACKET key.
            /// </field>
            openBracket: 219,

            /// <field locid="WinJS.Utilities.Key.backSlash" helpKeyword="WinJS.Utilities.Key.backSlash">
            /// BACKSLASH key.
            /// </field>
            backSlash: 220,

            /// <field locid="WinJS.Utilities.Key.closeBracket" helpKeyword="WinJS.Utilities.Key.closeBracket">
            /// CLOSE BRACKET key.
            /// </field>
            closeBracket: 221,

            /// <field locid="WinJS.Utilities.Key.singleQuote" helpKeyword="WinJS.Utilities.Key.singleQuote">
            /// SINGLE QUOTE key.
            /// </field>
            singleQuote: 222,

            /// <field locid="WinJS.Utilities.Key.IME" helpKeyword="WinJS.Utilities.Key.IME">
            /// Any IME input.
            /// </field>
            IME: 229
        },

        data: function (element) {
            /// <signature helpKeyword="WinJS.Utilities.data">
            /// <summary locid="WinJS.Utilities.data">
            /// Gets the data value associated with the specified element.
            /// </summary>
            /// <param name="element" type="HTMLElement" locid="WinJS.Utilities.data_p:element">
            /// The element.
            /// </param>
            /// <returns type="Object" locid="WinJS.Utilities.data_returnValue">
            /// The value associated with the element.
            /// </returns>
            /// </signature>
            if (!element[_dataKey]) {
                element[_dataKey] = {};
            }
            return element[_dataKey];
        },

        hasClass: function (e, name) {
            /// <signature helpKeyword="WinJS.Utilities.hasClass">
            /// <summary locid="WinJS.Utilities.hasClass">
            /// Determines whether the specified element has the specified class.
            /// </summary>
            /// <param name="e" type="HTMLElement" locid="WinJS.Utilities.hasClass_p:e">
            /// The element.
            /// </param>
            /// <param name="name" type="String" locid="WinJS.Utilities.hasClass_p:name">
            /// The name of the class.
            /// </param>
            /// <returns type="Boolean" locid="WinJS.Utilities.hasClass_returnValue">
            /// true if the specified element contains the specified class; otherwise, false.
            /// </returns>
            /// </signature>

            if (e.classList) {
                return e.classList.contains(name);
            } else {
                var className = getClassName(e);
                var names = className.trim().split(" ");
                var l = names.length;
                for (var i = 0; i < l; i++) {
                    if (names[i] === name) {
                        return true;
                    }
                }
                return false;
            }
        },

        addClass: addClass,

        removeClass: removeClass,

        toggleClass: toggleClass,

        _setAttribute: setAttribute,

        getRelativeLeft: function (element, parent) {
            /// <signature helpKeyword="WinJS.Utilities.getRelativeLeft">
            /// <summary locid="WinJS.Utilities.getRelativeLeft">
            /// Gets the left coordinate of the specified element relative to the specified parent.
            /// </summary>
            /// <param name="element" domElement="true" locid="WinJS.Utilities.getRelativeLeft_p:element">
            /// The element.
            /// </param>
            /// <param name="parent" domElement="true" locid="WinJS.Utilities.getRelativeLeft_p:parent">
            /// The parent element.
            /// </param>
            /// <returns type="Number" locid="WinJS.Utilities.getRelativeLeft_returnValue">
            /// The relative left coordinate.
            /// </returns>
            /// </signature>
            if (!element) {
                return 0;
            }

            var left = element.offsetLeft;
            var e = element.parentNode;
            while (e) {
                left -= e.offsetLeft;

                if (e === parent) {
                    break;
                }
                e = e.parentNode;
            }

            return left;
        },

        getRelativeTop: function (element, parent) {
            /// <signature helpKeyword="WinJS.Utilities.getRelativeTop">
            /// <summary locid="WinJS.Utilities.getRelativeTop">
            /// Gets the top coordinate of the element relative to the specified parent.
            /// </summary>
            /// <param name="element" domElement="true" locid="WinJS.Utilities.getRelativeTop_p:element">
            /// The element.
            /// </param>
            /// <param name="parent" domElement="true" locid="WinJS.Utilities.getRelativeTop_p:parent">
            /// The parent element.
            /// </param>
            /// <returns type="Number" locid="WinJS.Utilities.getRelativeTop_returnValue">
            /// The relative top coordinate.
            /// </returns>
            /// </signature>
            if (!element) {
                return 0;
            }

            var top = element.offsetTop;
            var e = element.parentNode;
            while (e) {
                top -= e.offsetTop;

                if (e === parent) {
                    break;
                }
                e = e.parentNode;
            }

            return top;
        },

        getScrollPosition: getScrollPosition,

        setScrollPosition: setScrollPosition,

        empty: function (element) {
            /// <signature helpKeyword="WinJS.Utilities.empty">
            /// <summary locid="WinJS.Utilities.empty">
            /// Removes all the child nodes from the specified element.
            /// </summary>
            /// <param name="element" type="HTMLElement" domElement="true" locid="WinJS.Utilities.empty_p:element">
            /// The element.
            /// </param>
            /// <returns type="HTMLElement" locid="WinJS.Utilities.empty_returnValue">
            /// The element.
            /// </returns>
            /// </signature>
            if (element.childNodes && element.childNodes.length > 0) {
                for (var i = element.childNodes.length - 1; i >= 0; i--) {
                    element.removeChild(element.childNodes.item(i));
                }
            }
            return element;
        },

        _isDOMElement: function (element) {
            return element &&
                typeof element === "object" &&
                typeof element.tagName === "string";
        },

        getContentWidth: function (element) {
            /// <signature helpKeyword="WinJS.Utilities.getContentWidth">
            /// <summary locid="WinJS.Utilities.getContentWidth">
            /// Gets the width of the content of the specified element. The content width does not include borders or padding.
            /// </summary>
            /// <param name="element" type="HTMLElement" locid="WinJS.Utilities.getContentWidth_p:element">
            /// The element.
            /// </param>
            /// <returns type="Number" locid="WinJS.Utilities.getContentWidth_returnValue">
            /// The content width of the element.
            /// </returns>
            /// </signature>
            var border = getDimension(element, "borderLeftWidth") + getDimension(element, "borderRightWidth"),
                padding = getDimension(element, "paddingLeft") + getDimension(element, "paddingRight");
            return element.offsetWidth - border - padding;
        },

        getTotalWidth: function (element) {
            /// <signature helpKeyword="WinJS.Utilities.getTotalWidth">
            /// <summary locid="WinJS.Utilities.getTotalWidth">
            /// Gets the width of the element, including margins.
            /// </summary>
            /// <param name="element" type="HTMLElement" locid="WinJS.Utilities.getTotalWidth_p:element">
            /// The element.
            /// </param>
            /// <returns type="Number" locid="WinJS.Utilities.getTotalWidth_returnValue">
            /// The width of the element including margins.
            /// </returns>
            /// </signature>
            var margin = getDimension(element, "marginLeft") + getDimension(element, "marginRight");
            return element.offsetWidth + margin;
        },

        getContentHeight: function (element) {
            /// <signature helpKeyword="WinJS.Utilities.getContentHeight">
            /// <summary locid="WinJS.Utilities.getContentHeight">
            /// Gets the height of the content of the specified element. The content height does not include borders or padding.
            /// </summary>
            /// <param name="element" type="HTMLElement" locid="WinJS.Utilities.getContentHeight_p:element">
            /// The element.
            /// </param>
            /// <returns type="Number" integer="true" locid="WinJS.Utilities.getContentHeight_returnValue">
            /// The content height of the element.
            /// </returns>
            /// </signature>
            var border = getDimension(element, "borderTopWidth") + getDimension(element, "borderBottomWidth"),
                padding = getDimension(element, "paddingTop") + getDimension(element, "paddingBottom");
            return element.offsetHeight - border - padding;
        },

        getTotalHeight: function (element) {
            /// <signature helpKeyword="WinJS.Utilities.getTotalHeight">
            /// <summary locid="WinJS.Utilities.getTotalHeight">
            /// Gets the height of the element, including its margins.
            /// </summary>
            /// <param name="element" type="HTMLElement" locid="WinJS.Utilities.getTotalHeight_p:element">
            /// The element.
            /// </param>
            /// <returns type="Number" locid="WinJS.Utilities.getTotalHeight_returnValue">
            /// The height of the element including margins.
            /// </returns>
            /// </signature>
            var margin = getDimension(element, "marginTop") + getDimension(element, "marginBottom");
            return element.offsetHeight + margin;
        },

        getPosition: function (element) {
            /// <signature helpKeyword="WinJS.Utilities.getPosition">
            /// <summary locid="WinJS.Utilities.getPosition">
            /// Gets the position of the specified element.
            /// </summary>
            /// <param name="element" type="HTMLElement" locid="WinJS.Utilities.getPosition_p:element">
            /// The element.
            /// </param>
            /// <returns type="Object" locid="WinJS.Utilities.getPosition_returnValue">
            /// An object that contains the left, top, width and height properties of the element.
            /// </returns>
            /// </signature>
            var fromElement = element,
                offsetParent = element.offsetParent,
                top = element.offsetTop,
                left = element.offsetLeft;

            while ((element = element.parentNode) &&
                    element !== _Global.document.body &&
                    element !== _Global.document.documentElement) {
                top -= element.scrollTop;
                var dir = _Global.document.defaultView.getComputedStyle(element, null).direction;
                left -= dir !== "rtl" ? element.scrollLeft : -getAdjustedScrollPosition(element).scrollLeft;

                if (element === offsetParent) {
                    top += element.offsetTop;
                    left += element.offsetLeft;
                    offsetParent = element.offsetParent;
                }
            }

            return {
                left: left,
                top: top,
                width: fromElement.offsetWidth,
                height: fromElement.offsetHeight
            };
        },

        getTabIndex: function (element) {
            /// <signature helpKeyword="WinJS.Utilities.getTabIndex">
            /// <summary locid="WinJS.Utilities.getTabIndex">
            /// Gets the tabIndex of the specified element.
            /// </summary>
            /// <param name="element" type="HTMLElement" locid="WinJS.Utilities.getTabIndex_p:element">
            /// The element.
            /// </param>
            /// <returns type="Number" locid="WinJS.Utilities.getTabIndex_returnValue">
            /// The tabIndex of the element. Returns -1 if the element cannot be tabbed to
            /// </returns>
            /// </signature>
            // For reference: http://www.w3.org/html/wg/drafts/html/master/single-page.html#specially-focusable
            var tabbableElementsRE = /BUTTON|COMMAND|MENUITEM|OBJECT|SELECT|TEXTAREA/;
            if (element.disabled) {
                return -1;
            }
            var tabIndex = element.getAttribute("tabindex");
            if (tabIndex === null || tabIndex === undefined) {
                var name = element.tagName;
                if (tabbableElementsRE.test(name) ||
                    (element.href && (name === "A" || name === "AREA" || name === "LINK")) ||
                    (name === "INPUT" && element.type !== "hidden") ||
                    (name === "TH" && element.sorted)) {
                    return 0;
                }
                return -1;
            }
            return parseInt(tabIndex, 10);
        },

        convertToPixels: convertToPixels,

        eventWithinElement: function (element, event) {
            /// <signature helpKeyword="WinJS.Utilities.eventWithinElement">
            /// <summary locid="WinJS.Utilities.eventWithinElement">
            /// Determines whether the specified event occurred within the specified element.
            /// </summary>
            /// <param name="element" type="HTMLElement" locid="WinJS.Utilities.eventWithinElement_p:element">
            /// The element.
            /// </param>
            /// <param name="event" type="Event" locid="WinJS.Utilities.eventWithinElement_p:event">
            /// The event.
            /// </param>
            /// <returns type="Boolean" locid="WinJS.Utilities.eventWithinElement_returnValue">
            /// true if the event occurred within the element; otherwise, false.
            /// </returns>
            /// </signature>
            var related = event.relatedTarget;
            if (related && related !== element) {
                return element.contains(related);
            }

            return false;
        },

        //UI Utilities
        _deprecated: function (message) {
            _Global.console && _Global.console.warn(message);
        },

        // Take a renderer which may be a function (signature: (data) => element) or a WinJS.Binding.Template
        //  and return a function with a unified synchronous contract which is:
        //
        //  (data, container) => element
        //
        // Where:
        //
        //  1) if you pass container the content will be rendered into the container and the
        //     container will be returned.
        //
        //  2) if you don't pass a container the content will be rendered and returned.
        //
        _syncRenderer: function (renderer, tagName) {
            tagName = tagName || "div";
            if (typeof renderer === "function") {
                return function (data, container) {
                    if (container) {
                        container.appendChild(renderer(data));
                        return container;
                    } else {
                        return renderer(data);
                    }
                };
            }

            var template;
            if (typeof renderer.render === "function") {
                template = renderer;
            } else if (renderer.winControl && typeof renderer.winControl.render === "function") {
                template = renderer.winControl;
            }

            return function (data, container) {
                var host = container || _Global.document.createElement(tagName);
                template.render(data, host);
                if (container) {
                    return container;
                } else {
                    // The expectation is that the creation of the DOM elements happens synchronously
                    //  and as such we steal the first child and make it the root element.
                    //
                    var element = host.firstElementChild;

                    // Because we have changed the "root" we may need to move the dispose method
                    //  created by the template to the child and do a little switcheroo on dispose.
                    //
                    if (element && host.dispose) {
                        var prev = element.dispose;
                        element.dispose = function () {
                            element.dispose = prev;
                            host.appendChild(element);
                            host.dispose();
                        };
                    }
                    return element;
                }
            };
        },


        _getLowestTabIndexInList: function Utilities_getLowestTabIndexInList(elements) {
            // Returns the lowest positive tabIndex in a list of elements.
            // Returns 0 if there are no positive tabIndices.
            var lowestTabIndex = 0;
            var elmTabIndex;
            for (var i = 0; i < elements.length; i++) {
                elmTabIndex = parseInt(elements[i].getAttribute("tabIndex"), 10);
                if ((0 < elmTabIndex)
                 && ((elmTabIndex < lowestTabIndex) || !lowestTabIndex)) {
                    lowestTabIndex = elmTabIndex;
                }
            }

            return lowestTabIndex;
        },

        _getHighestTabIndexInList: function Utilities_getHighestTabIndexInList(elements) {
            // Returns 0 if any element is explicitly set to 0. (0 is the highest tabIndex)
            // Returns the highest tabIndex in the list of elements.
            // Returns 0 if there are no positive tabIndices.
            var highestTabIndex = 0;
            var elmTabIndex;
            for (var i = 0; i < elements.length; i++) {
                elmTabIndex = parseInt(elements[i].getAttribute("tabIndex"), 10);
                if (elmTabIndex === 0) {
                    return elmTabIndex;
                } else if (highestTabIndex < elmTabIndex) {
                    highestTabIndex = elmTabIndex;
                }
            }

            return highestTabIndex;
        },

        _trySetActive: function Utilities_trySetActive(elem, scroller) {
            return this._tryFocus(elem, true, scroller);
        },

        _tryFocus: function Utilities_tryFocus(elem, useSetActive, scroller) {
            var previousActiveElement = _Global.document.activeElement;

            if (elem === previousActiveElement) {
                return true;
            }

            var simpleLogicForValidTabStop = (exports.getTabIndex(elem) >= 0);
            if (!simpleLogicForValidTabStop) {
                return false;
            }

            if (useSetActive) {
                exports._setActive(elem, scroller);
            } else {
                elem.focus();
            }

            if (previousActiveElement !== _Global.document.activeElement) {
                return true;
            }
            return false;
        },

        _setActiveFirstFocusableElement: function Utilities_setActiveFirstFocusableElement(rootEl, scroller) {
            return this._focusFirstFocusableElement(rootEl, true, scroller);
        },

        _focusFirstFocusableElement: function Utilities_focusFirstFocusableElement(rootEl, useSetActive, scroller) {
            var _elms = rootEl.getElementsByTagName("*");

            // Get the tabIndex set to the firstDiv (which is the lowest)
            var _lowestTabIndex = this._getLowestTabIndexInList(_elms);
            var _nextLowestTabIndex = 0;

            // If there are positive tabIndices, set focus to the element with the lowest tabIndex.
            // Keep trying with the next lowest tabIndex until all tabIndices have been exhausted.
            // Otherwise set focus to the first focusable element in DOM order.
            var i;
            while (_lowestTabIndex) {
                for (i = 0; i < _elms.length; i++) {
                    if (_elms[i].tabIndex === _lowestTabIndex) {
                        if (this._tryFocus(_elms[i], useSetActive, scroller)) {
                            return true;
                        }
                    } else if ((_lowestTabIndex < _elms[i].tabIndex)
                            && ((_elms[i].tabIndex < _nextLowestTabIndex) || (_nextLowestTabIndex === 0))) {
                        // Here if _lowestTabIndex < _elms[i].tabIndex < _nextLowestTabIndex
                        _nextLowestTabIndex = _elms[i].tabIndex;
                    }
                }

                // We weren't able to set focus to anything at that tabIndex
                // If we found a higher valid tabIndex, try that now
                _lowestTabIndex = _nextLowestTabIndex;
                _nextLowestTabIndex = 0;
            }

            // Wasn't able to set focus to anything with a positive tabIndex, try everything now.
            // This is where things with tabIndex of 0 will be tried.
            for (i = 0; i < _elms.length; i++) {
                if (this._tryFocus(_elms[i], useSetActive, scroller)) {
                    return true;
                }
            }

            return false;
        },

        _setActiveLastFocusableElement: function Utilities_setActiveLastFocusableElement(rootEl, scroller) {
            return this._focusLastFocusableElement(rootEl, true, scroller);
        },

        _focusLastFocusableElement: function Utilities_focusLastFocusableElement(rootEl, useSetActive, scroller) {
            var _elms = rootEl.getElementsByTagName("*");
            // Get the tabIndex set to the finalDiv (which is the highest)
            var _highestTabIndex = this._getHighestTabIndexInList(_elms);
            var _nextHighestTabIndex = 0;

            // Try all tabIndex 0 first. After this conditional the _highestTabIndex
            // should be equal to the highest positive tabIndex.
            var i;
            if (_highestTabIndex === 0) {
                for (i = _elms.length - 1; i >= 0; i--) {
                    if (_elms[i].tabIndex === _highestTabIndex) {
                        if (this._tryFocus(_elms[i], useSetActive, scroller)) {
                            return true;
                        }
                    } else if (_nextHighestTabIndex < _elms[i].tabIndex) {
                        _nextHighestTabIndex = _elms[i].tabIndex;
                    }
                }

                _highestTabIndex = _nextHighestTabIndex;
                _nextHighestTabIndex = 0;
            }

            // If there are positive tabIndices, set focus to the element with the highest tabIndex.
            // Keep trying with the next highest tabIndex until all tabIndices have been exhausted.
            // Otherwise set focus to the last focusable element in DOM order.
            while (_highestTabIndex) {
                for (i = _elms.length - 1; i >= 0; i--) {
                    if (_elms[i].tabIndex === _highestTabIndex) {
                        if (this._tryFocus(_elms[i], useSetActive, scroller)) {
                            return true;
                        }
                    } else if ((_nextHighestTabIndex < _elms[i].tabIndex) && (_elms[i].tabIndex < _highestTabIndex)) {
                        // Here if _nextHighestTabIndex < _elms[i].tabIndex < _highestTabIndex
                        _nextHighestTabIndex = _elms[i].tabIndex;
                    }
                }

                // We weren't able to set focus to anything at that tabIndex
                // If we found a lower valid tabIndex, try that now
                _highestTabIndex = _nextHighestTabIndex;
                _nextHighestTabIndex = 0;
            }

            // Wasn't able to set focus to anything with a tabIndex, try everything now
            for (i = _elms.length - 2; i > 0; i--) {
                if (this._tryFocus(_elms[i], useSetActive, scroller)) {
                    return true;
                }
            }

            return false;
        }

    });
});

// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Utilities/_Dispose',[
    'exports',
    '../Core/_Base',
    '../Core/_WriteProfilerMark',
    './_ElementUtilities'
    ], function (exports, _Base, _WriteProfilerMark, _ElementUtilities) {
    "use strict";

    function markDisposable(element, disposeImpl) {
            /// <signature helpKeyword="WinJS.Utilities.markDisposable">
            /// <summary locid="WinJS.Utilities.markDisposable">
            /// Adds the specified dispose implementation to the specified element and marks it as disposable.
            /// </summary>
            /// <param name="element" type="HTMLElement" locid="WinJS.Utilities.markDisposable_p:element">
            /// The element to mark as disposable.
            /// </param>
            /// <param name="disposeImpl" type="Function" locid="WinJS.Utilities.markDisposable_p:disposeImpl">
            /// The function containing the element-specific dispose logic that will be called by the dispose function.
            /// </param>
            /// </signature>
            var disposed = false;
            _ElementUtilities.addClass(element, "win-disposable");

            var disposable = element.winControl || element;
            disposable.dispose = function () {
                if (disposed) {
                    return;
                }

                disposed = true;
                disposeSubTree(element);
                if (disposeImpl) {
                    disposeImpl();
                }
            };
        }

    function disposeSubTree(element) {
        /// <signature helpKeyword="WinJS.Utilities.disposeSubTree">
        /// <summary locid="WinJS.Utilities.disposeSubTree">
        /// Disposes all first-generation disposable elements that are descendents of the specified element.
        /// The specified element itself is not disposed.
        /// </summary>
        /// <param name="element" type="HTMLElement" locid="WinJS.Utilities.disposeSubTree_p:element">
        /// The root element whose sub-tree is to be disposed.
        /// </param>
        /// </signature>
        if (!element) {
            return;
        }

        _WriteProfilerMark("WinJS.Utilities.disposeSubTree,StartTM");
        var query = element.querySelectorAll(".win-disposable");

        var index = 0;
        var length = query.length;
        while (index < length) {
            var disposable = query[index];
            if (disposable.winControl && disposable.winControl.dispose) {
                disposable.winControl.dispose();
            }
            if (disposable.dispose) {
                disposable.dispose();
            }

            // Skip over disposable's descendants since they are this disposable's responsibility to clean up.
            index += disposable.querySelectorAll(".win-disposable").length + 1;
        }
        _WriteProfilerMark("WinJS.Utilities.disposeSubTree,StopTM");
    }

    function _disposeElement(element) {
        // This helper should only be used for supporting dispose scenarios predating the dispose pattern.
        // The specified element should be well enough defined so we don't have to check whether it
        // a) has a disposable winControl,
        // b) is disposable itself,
        // or has disposable descendants in which case either a) or b) must have been true when designed correctly.
        if (!element) {
            return;
        }

        var disposed = false;
        if (element.winControl && element.winControl.dispose) {
            element.winControl.dispose();
            disposed = true;
        }
        if (element.dispose) {
            element.dispose();
            disposed = true;
        }

        if (!disposed) {
            disposeSubTree(element);
        }
    }

    _Base.Namespace._moduleDefine(exports, "WinJS.Utilities", {

        markDisposable: markDisposable,

        disposeSubTree: disposeSubTree,

        _disposeElement: _disposeElement
    });
});

// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Utilities/_ElementListUtilities',[
    'exports',
    '../Core/_Global',
    '../Core/_Base',
    '../ControlProcessor',
    '../Promise',
    '../Utilities/_Control',
    '../Utilities/_ElementUtilities'
    ], function elementListUtilities(exports, _Global, _Base, ControlProcessor, Promise, _Control, _ElementUtilities) {
    "use strict";

    // not supported in WebWorker
    if (!_Global.document) {
        return;
    }

    _Base.Namespace._moduleDefine(exports, "WinJS.Utilities", {
        QueryCollection: _Base.Class.derive(Array, function (items) {
            /// <signature helpKeyword="WinJS.Utilities.QueryCollection">
            /// <summary locid="WinJS.Utilities.QueryCollection">
            /// Represents the result of a query selector, and provides
            /// various operations that perform actions over the elements of
            /// the collection.
            /// </summary>
            /// <param name="items" locid="WinJS.Utilities.QueryCollection_p:items">
            /// The items resulting from the query.
            /// </param>
            /// </signature>
            if (items) {
                this.include(items);
            }
        }, {
            forEach: function (callbackFn, thisArg) {
                /// <signature helpKeyword="WinJS.Utilities.QueryCollection.forEach">
                /// <summary locid="WinJS.Utilities.QueryCollection.forEach">
                /// Performs an action on each item in the QueryCollection
                /// </summary>
                /// <param name="callbackFn" type="function(value, Number index, traversedObject)" locid="WinJS.Utilities.QueryCollection.forEach_p:callbackFn">
                /// Action to perform on each item.
                /// </param>
                /// <param name="thisArg" isOptional="true" type="function(value, Number index, traversedObject)" locid="WinJS.Utilities.QueryCollection.forEach_p:thisArg">
                /// Argument to bind to callbackFn
                /// </param>
                /// <returns type="WinJS.Utilities.QueryCollection" locid="WinJS.Utilities.QueryCollection.forEach_returnValue">
                /// Returns the QueryCollection
                /// </returns>
                /// </signature>
                Array.prototype.forEach.apply(this, [callbackFn, thisArg]);
                return this;
            },
            get: function (index) {
                /// <signature helpKeyword="WinJS.Utilities.QueryCollection.get">
                /// <summary locid="WinJS.Utilities.QueryCollection.get">
                /// Gets an item from the QueryCollection.
                /// </summary>
                /// <param name="index" type="Number" locid="WinJS.Utilities.QueryCollection.get_p:index">
                /// The index of the item to return.
                /// </param>
                /// <returns type="Object" locid="WinJS.Utilities.QueryCollection.get_returnValue">
                /// A single item from the collection.
                /// </returns>
                /// </signature>
                return this[index];
            },
            setAttribute: function (name, value) {
                /// <signature helpKeyword="WinJS.Utilities.QueryCollection.setAttribute">
                /// <summary locid="WinJS.Utilities.QueryCollection.setAttribute">
                /// Sets an attribute value on all the items in the collection.
                /// </summary>
                /// <param name="name" type="String" locid="WinJS.Utilities.QueryCollection.setAttribute_p:name">
                /// The name of the attribute to be set.
                /// </param>
                /// <param name="value" type="String" locid="WinJS.Utilities.QueryCollection.setAttribute_p:value">
                /// The value of the attribute to be set.
                /// </param>
                /// <returns type="WinJS.Utilities.QueryCollection" locid="WinJS.Utilities.QueryCollection.setAttribute_returnValue">
                /// This QueryCollection object.
                /// </returns>
                /// </signature>
                this.forEach(function (item) {
                    item.setAttribute(name, value);
                });
                return this;
            },
            getAttribute: function (name) {
                /// <signature helpKeyword="WinJS.Utilities.QueryCollection.getAttribute">
                /// <summary locid="WinJS.Utilities.QueryCollection.getAttribute">
                /// Gets an attribute value from the first element in the collection.
                /// </summary>
                /// <param name="name" type="String" locid="WinJS.Utilities.QueryCollection.getAttribute_p:name">
                /// The name of the attribute.
                /// </param>
                /// <returns type="String" locid="WinJS.Utilities.QueryCollection.getAttribute_returnValue">
                /// The value of the attribute.
                /// </returns>
                /// </signature>
                if (this.length > 0) {
                    return this[0].getAttribute(name);
                }
            },
            addClass: function (name) {
                /// <signature helpKeyword="WinJS.Utilities.QueryCollection.addClass">
                /// <summary locid="WinJS.Utilities.QueryCollection.addClass">
                /// Adds the specified class to all the elements in the collection.
                /// </summary>
                /// <param name="name" type="String" locid="WinJS.Utilities.QueryCollection.addClass_p:name">
                /// The name of the class to add.
                /// </param>
                /// <returns type="WinJS.Utilities.QueryCollection" locid="WinJS.Utilities.QueryCollection.addClass_returnValue">
                /// This QueryCollection object.
                /// </returns>
                /// </signature>
                this.forEach(function (item) {
                    _ElementUtilities.addClass(item, name);
                });
                return this;
            },
            hasClass: function (name) {
                /// <signature helpKeyword="WinJS.Utilities.QueryCollection.hasClass">
                /// <summary locid="WinJS.Utilities.QueryCollection.hasClass">
                /// Determines whether the specified class exists on the first element of the collection.
                /// </summary>
                /// <param name="name" type="String" locid="WinJS.Utilities.QueryCollection.hasClass_p:name">
                /// The name of the class.
                /// </param>
                /// <returns type="Boolean" locid="WinJS.Utilities.QueryCollection.hasClass_returnValue">
                /// true if the element has the specified class; otherwise, false.
                /// </returns>
                /// </signature>
                if (this.length > 0) {
                    return _ElementUtilities.hasClass(this[0], name);
                }
                return false;
            },
            removeClass: function (name) {
                /// <signature helpKeyword="WinJS.Utilities.QueryCollection.removeClass">
                /// <summary locid="WinJS.Utilities.QueryCollection.removeClass">
                /// Removes the specified class from all the elements in the collection.
                /// </summary>
                /// <param name="name" type="String" locid="WinJS.Utilities.QueryCollection.removeClass_p:name">
                /// The name of the class to be removed.
                /// </param>
                /// <returns type="WinJS.Utilities.QueryCollection" locid="WinJS.Utilities.QueryCollection.removeClass_returnValue">
                /// This QueryCollection object.
                /// </returns>
                /// </signature>
                this.forEach(function (item) {
                    _ElementUtilities.removeClass(item, name);
                });
                return this;
            },
            toggleClass: function (name) {
                /// <signature helpKeyword="WinJS.Utilities.QueryCollection.toggleClass">
                /// <summary locid="WinJS.Utilities.QueryCollection.toggleClass">
                /// Toggles (adds or removes) the specified class on all the elements in the collection.
                /// If the class is present, it is removed; if it is absent, it is added.
                /// </summary>
                /// <param name="name" type="String" locid="WinJS.Utilities.QueryCollection.toggleClass_p:name">
                /// The name of the class to be toggled.
                /// </param>
                /// <returns type="WinJS.Utilities.QueryCollection" locid="WinJS.Utilities.QueryCollection.toggleClass_returnValue">
                /// This QueryCollection object.
                /// </returns>
                /// </signature>
                this.forEach(function (item) {
                    _ElementUtilities.toggleClass(item, name);
                });
                return this;
            },
            listen: function (eventType, listener, capture) {
                /// <signature helpKeyword="WinJS.Utilities.QueryCollection.listen">
                /// <summary locid="WinJS.Utilities.QueryCollection.listen">
                /// Registers the listener for the specified event on all the elements in the collection.
                /// </summary>
                /// <param name="eventType" type="String" locid="WinJS.Utilities.QueryCollection.listen_p:eventType">
                /// The name of the event.
                /// </param>
                /// <param name="listener" type="Function" locid="WinJS.Utilities.QueryCollection.listen_p:listener">
                /// The event handler function to be called when the event occurs.
                /// </param>
                /// <param name="capture" type="Boolean" locid="WinJS.Utilities.QueryCollection.listen_p:capture">
                /// true if capture == true is to be passed to addEventListener; otherwise, false.
                /// </param>
                /// <returns type="WinJS.Utilities.QueryCollection" locid="WinJS.Utilities.QueryCollection.listen_returnValue">
                /// This QueryCollection object.
                /// </returns>
                /// </signature>
                this.forEach(function (item) {
                    item.addEventListener(eventType, listener, capture);
                });
                return this;
            },
            removeEventListener: function (eventType, listener, capture) {
                /// <signature helpKeyword="WinJS.Utilities.QueryCollection.removeEventListener">
                /// <summary locid="WinJS.Utilities.QueryCollection.removeEventListener">
                /// Unregisters the listener for the specified event on all the elements in the collection.
                /// </summary>
                /// <param name="eventType" type="String" locid="WinJS.Utilities.QueryCollection.removeEventListener_p:eventType">
                /// The name of the event.
                /// </param>
                /// <param name="listener" type="Function" locid="WinJS.Utilities.QueryCollection.removeEventListener_p:listener">
                /// The event handler function.
                /// </param>
                /// <param name="capture" type="Boolean" locid="WinJS.Utilities.QueryCollection.removeEventListener_p:capture">
                /// true if capture == true; otherwise, false.
                /// </param>
                /// <returns type="WinJS.Utilities.QueryCollection" locid="WinJS.Utilities.QueryCollection.removeEventListener_returnValue">
                /// This QueryCollection object.
                /// </returns>
                /// </signature>
                this.forEach(function (item) {
                    item.removeEventListener(eventType, listener, capture);
                });
                return this;
            },
            setStyle: function (name, value) {
                /// <signature helpKeyword="WinJS.Utilities.QueryCollection.setStyle">
                /// <summary locid="WinJS.Utilities.QueryCollection.setStyle">
                /// Sets the specified style property for all the elements in the collection.
                /// </summary>
                /// <param name="name" type="String" locid="WinJS.Utilities.QueryCollection.setStyle_p:name">
                /// The name of the style property.
                /// </param>
                /// <param name="value" type="String" locid="WinJS.Utilities.QueryCollection.setStyle_p:value">
                /// The value for the property.
                /// </param>
                /// <returns type="WinJS.Utilities.QueryCollection" locid="WinJS.Utilities.QueryCollection.setStyle_returnValue">
                /// This QueryCollection object.
                /// </returns>
                /// </signature>
                this.forEach(function (item) {
                    item.style[name] = value;
                });
                return this;
            },
            clearStyle: function (name) {
                /// <signature helpKeyword="WinJS.Utilities.QueryCollection.clearStyle">
                /// <summary locid="WinJS.Utilities.QueryCollection.clearStyle">
                /// Clears the specified style property for all the elements in the collection.
                /// </summary>
                /// <param name="name" type="String" locid="WinJS.Utilities.QueryCollection.clearStyle_p:name">
                /// The name of the style property to be cleared.
                /// </param>
                /// <returns type="WinJS.Utilities.QueryCollection" locid="WinJS.Utilities.QueryCollection.clearStyle_returnValue">
                /// This QueryCollection object.
                /// </returns>
                /// </signature>
                this.forEach(function (item) {
                    item.style[name] = "";
                });
                return this;
            },
            query: function (query) {
                /// <signature helpKeyword="WinJS.Utilities.QueryCollection.query">
                /// <summary locid="WinJS.Utilities.QueryCollection.query">
                /// Executes a query selector on all the elements in the collection
                /// and aggregates the result into a QueryCollection.
                /// </summary>
                /// <param name="query" type="String" locid="WinJS.Utilities.QueryCollection.query_p:query">
                /// The query selector string.
                /// </param>
                /// <returns type="WinJS.Utilities.QueryCollection" locid="WinJS.Utilities.QueryCollection.query_returnValue">
                /// A QueryCollection object containing the aggregate results of
                /// executing the query on all the elements in the collection.
                /// </returns>
                /// </signature>
                var newCollection = new exports.QueryCollection();
                this.forEach(function (item) {
                    newCollection.include(item.querySelectorAll(query));
                });
                return newCollection;
            },
            include: function (items) {
                /// <signature helpKeyword="WinJS.Utilities.QueryCollection.include">
                /// <summary locid="WinJS.Utilities.QueryCollection.include">
                /// Adds a set of items to this QueryCollection.
                /// </summary>
                /// <param name="items" locid="WinJS.Utilities.QueryCollection.include_p:items">
                /// The items to add to the QueryCollection. This may be an
                /// array-like object, a document fragment, or a single item.
                /// </param>
                /// </signature>
                if (typeof items.length === "number") {
                    for (var i = 0; i < items.length; i++) {
                        this.push(items[i]);
                    }
                } else if (items.DOCUMENT_FRAGMENT_NODE && items.nodeType === items.DOCUMENT_FRAGMENT_NODE) {
                    this.include(items.childNodes);
                } else {
                    this.push(items);
                }
            },
            control: function (Ctor, options) {
                /// <signature helpKeyword="WinJS.Utilities.QueryCollection.control">
                /// <summary locid="WinJS.Utilities.QueryCollection.control">
                /// Creates controls that are attached to the elements in this QueryCollection.
                /// </summary>
                /// <param name='Ctor' locid="WinJS.Utilities.QueryCollection.control_p:ctor">
                /// A constructor function that is used to create controls to attach to the elements.
                /// </param>
                /// <param name='options' locid="WinJS.Utilities.QueryCollection.control_p:options">
                /// The options passed to the newly-created controls.
                /// </param>
                /// <returns type="WinJS.Utilities.QueryCollection" locid="WinJS.Utilities.QueryCollection.control_returnValue">
                /// This QueryCollection object.
                /// </returns>
                /// </signature>
                /// <signature>
                /// <summary locid="WinJS.Utilities.QueryCollection.control2">
                /// Configures the controls that are attached to the elements in this QueryCollection.
                /// </summary>
                /// <param name='ctor' locid="WinJS.Utilities.QueryCollection.control_p:ctor2">
                /// The options passed to the controls.
                /// </param>
                /// <returns type="WinJS.Utilities.QueryCollection" locid="WinJS.Utilities.QueryCollection.control_returnValue2">
                /// This QueryCollection object.
                /// </returns>
                /// </signature>

                if (Ctor && typeof (Ctor) === "function") {
                    this.forEach(function (element) {
                        element.winControl = new Ctor(element, options);
                    });
                } else {
                    options = Ctor;
                    this.forEach(function (element) {
                        ControlProcessor.process(element).done(function (control) {
                            control && _Control.setOptions(control, options);
                        });
                    });
                }
                return this;
            },
            template: function (templateElement, data, renderDonePromiseCallback) {
                /// <signature helpKeyword="WinJS.Utilities.QueryCollection.template">
                /// <summary locid="WinJS.Utilities.QueryCollection.template">
                /// Renders a template that is bound to the given data
                /// and parented to the elements included in the QueryCollection.
                /// If the QueryCollection contains multiple elements, the template
                /// is rendered multiple times, once at each element in the QueryCollection
                /// per item of data passed.
                /// </summary>
                /// <param name="templateElement" type="DOMElement" locid="WinJS.Utilities.QueryCollection.template_p:templateElement">
                /// The DOM element to which the template control is attached to.
                /// </param>
                /// <param name="data" type="Object" locid="WinJS.Utilities.QueryCollection.template_p:data">
                /// The data to render. If the data is an array (or any other object
                /// that has a forEach method) then the template is rendered
                /// multiple times, once for each item in the collection.
                /// </param>
                /// <param name="renderDonePromiseCallback" type="Function" locid="WinJS.Utilities.QueryCollection.template_p:renderDonePromiseCallback">
                /// If supplied, this function is called
                /// each time the template gets rendered, and is passed a promise
                /// that is fulfilled when the template rendering is complete.
                /// </param>
                /// <returns type="WinJS.Utilities.QueryCollection" locid="WinJS.Utilities.QueryCollection.template_returnValue">
                /// The QueryCollection.
                /// </returns>
                /// </signature>
                if (templateElement instanceof exports.QueryCollection) {
                    templateElement = templateElement[0];
                }
                var template = templateElement.winControl;

                if (data === null || data === undefined || !data.forEach) {
                    data = [data];
                }

                renderDonePromiseCallback = renderDonePromiseCallback || function () { };

                var that = this;
                var donePromises = [];
                data.forEach(function (datum) {
                    that.forEach(function (element) {
                        donePromises.push(template.render(datum, element));
                    });
                });
                renderDonePromiseCallback(Promise.join(donePromises));

                return this;
            }
        }, {
            supportedForProcessing: false,
        }),

        query: function (query, element) {
            /// <signature helpKeyword="WinJS.Utilities.query">
            /// <summary locid="WinJS.Utilities.query">
            /// Executes a query selector on the specified element or the entire document.
            /// </summary>
            /// <param name="query" type="String" locid="WinJS.Utilities.query_p:query">
            /// The query selector to be executed.
            /// </param>
            /// <param name="element" optional="true" type="HTMLElement" locid="WinJS.Utilities.query_p:element">
            /// The element on which to execute the query. If this parameter is not specified, the
            /// query is executed on the entire document.
            /// </param>
            /// <returns type="WinJS.Utilities.QueryCollection" locid="WinJS.Utilities.query_returnValue">
            /// The QueryCollection that contains the results of the query.
            /// </returns>
            /// </signature>
            return new exports.QueryCollection((element || _Global.document).querySelectorAll(query));
        },

        id: function (id) {
            /// <signature helpKeyword="WinJS.Utilities.id">
            /// <summary locid="WinJS.Utilities.id">
            /// Looks up an element by ID and wraps the result in a QueryCollection.
            /// </summary>
            /// <param name="id" type="String" locid="WinJS.Utilities.id_p:id">
            /// The ID of the element.
            /// </param>
            /// <returns type="WinJS.Utilities.QueryCollection" locid="WinJS.Utilities.id_returnValue">
            /// A QueryCollection that contains the element, if it is found.
            /// </returns>
            /// </signature>
            var e = _Global.document.getElementById(id);
            return new exports.QueryCollection(e ? [e] : []);
        },

        children: function (element) {
            /// <signature helpKeyword="WinJS.Utilities.children">
            /// <summary locid="WinJS.Utilities.children">
            /// Creates a QueryCollection that contains the children of the specified parent element.
            /// </summary>
            /// <param name="element" type="HTMLElement" locid="WinJS.Utilities.children_p:element">
            /// The parent element.
            /// </param>
            /// <returns type="WinJS.Utilities.QueryCollection" locid="WinJS.Utilities.children_returnValue">
            /// The QueryCollection that contains the children of the element.
            /// </returns>
            /// </signature>
            return new exports.QueryCollection(element.children);
        }
    });
});

// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Utilities/_Hoverable',[
    'exports',
    '../Core/_Global'
], function hoverable(exports, _Global) {
    "use strict";

    // not supported in WebWorker
    if (!_Global.document) {
        return;
    }

    _Global.document.documentElement.classList.add("win-hoverable");
    exports.isHoverable = true;

    if (!_Global.MSPointerEvent) {
        var touchStartHandler = function () {
            _Global.document.removeEventListener("touchstart", touchStartHandler);
            // Remove win-hoverable CSS class fromstartt . <html> to avoid :hover styles in webkit when there is
            // touch support.
            _Global.document.documentElement.classList.remove("win-hoverable");
            exports.isHoverable = false;
        };

        _Global.document.addEventListener("touchstart", touchStartHandler);
    }
});

// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Utilities/_ParallelWorkQueue',[
    'exports',
    '../Core/_Base',
    '../Promise',
    '../Scheduler'
    ], function parallelWorkQueueInit(exports, _Base, Promise, Scheduler) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        _ParallelWorkQueue : _Base.Namespace._lazy(function () {
            return _Base.Class.define(function ParallelWorkQueue_ctor(maxRunning) {
                var workIndex = 0;
                var workItems = {};
                var workQueue = [];

                maxRunning = maxRunning || 3;
                var running = 0;
                var processing = 0;
                function runNext() {
                    running--;
                    // if we have fallen out of this loop, then we know we are already
                    // async, so "post" is OK. If we are still in the loop, then the
                    // loop will continue to run, so we don't need to "post" or
                    // recurse. This avoids stack overflow in the sync case.
                    //
                    if (!processing) {
                        Scheduler.schedule(run, Scheduler.Priority.normal,
                            null, "WinJS._ParallelWorkQueue.runNext");
                    }
                }
                function run() {
                    processing++;
                    for (; running < maxRunning; running++) {
                        var next;
                        var nextWork;
                        do {
                            next = workQueue.shift();
                            nextWork = next && workItems[next];
                        } while (next && !nextWork);

                        if (nextWork) {
                            delete workItems[next];
                            try {
                                nextWork().then(runNext, runNext);
                            }
                            catch (err) {
                                // this will only get hit if there is a queued item that
                                // fails to return something that conforms to the Promise
                                // contract
                                //
                                runNext();
                            }
                        } else {
                            break;
                        }
                    }
                    processing--;
                }
                function queue(f, data, first) {
                    var id = "w" + (workIndex++);
                    var workPromise;
                    return new Promise(
                        function (c, e, p) {
                            var w = function () {
                                workPromise = f().then(c, e, p);
                                return workPromise;
                            };
                            w.data = data;
                            workItems[id] = w;
                            if (first) {
                                workQueue.unshift(id);
                            } else {
                                workQueue.push(id);
                            }
                            run();
                        },
                        function () {
                            delete workItems[id];
                            if (workPromise) {
                                workPromise.cancel();
                            }
                        }
                    );
                }

                this.sort = function (f) {
                    workQueue.sort(function (a, b) {
                        a = workItems[a];
                        b = workItems[b];
                        return a === undefined && b === undefined ? 0 : a === undefined ? 1 : b === undefined ? -1 : f(a.data, b.data);
                    });
                };
                this.queue = queue;
            }, {
                /* empty */
            }, {
                supportedForProcessing: false,
            });
        })
    });

});


// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Utilities/_VersionManager',[
    'exports',
    '../Core/_Base',
    '../_Signal'
    ], function versionManagerInit(exports, _Base, _Signal) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        _VersionManager: _Base.Namespace._lazy(function () {
            return _Base.Class.define(function _VersionManager_ctor() {
                this._unlocked = new _Signal();
                this._unlocked.complete();
            }, {
                _cancelCount: 0,
                _notificationCount: 0,
                _updateCount: 0,
                _version: 0,

                // This should be used generally for all logic that should be suspended while data changes are happening
                //
                locked: { get: function () { return this._notificationCount !== 0 || this._updateCount !== 0; } },

                // this should only be accessed by the update logic in ListViewImpl.js
                //
                noOutstandingNotifications: { get: function () { return this._notificationCount === 0; } },
                version: { get: function () { return this._version; } },

                unlocked: { get: function () { return this._unlocked.promise; } },

                _dispose: function () {
                    if (this._unlocked) {
                        this._unlocked.cancel();
                        this._unlocked = null;
                    }
                },

                beginUpdating: function () {
                    this._checkLocked();
                    this._updateCount++;
                },
                endUpdating: function () {
                    this._updateCount--;
                    this._checkUnlocked();
                },
                beginNotifications: function () {
                    this._checkLocked();
                    this._notificationCount++;
                },
                endNotifications: function () {
                    this._notificationCount--;
                    this._checkUnlocked();
                },
                _checkLocked: function () {
                    if (!this.locked) {
                        this._dispose();
                        this._unlocked = new _Signal();
                    }
                },
                _checkUnlocked: function () {
                    if (!this.locked) {
                        this._unlocked.complete();
                    }
                },
                receivedNotification: function () {
                    this._version++;
                    if (this._cancel) {
                        var cancel = this._cancel;
                        this._cancel = null;
                        cancel.forEach(function (p) { p && p.cancel(); });
                    }
                },
                cancelOnNotification: function (promise) {
                    if (!this._cancel) {
                        this._cancel = [];
                        this._cancelCount = 0;
                    }
                    this._cancel[this._cancelCount++] = promise;
                    return this._cancelCount - 1;
                },
                clearCancelOnNotification: function (token) {
                    if (this._cancel) {
                        delete this._cancel[token];
                    }
                }
            }, {
                supportedForProcessing: false,
            });
        })
    });

});


// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// Items Manager

define('WinJS/Utilities/_ItemsManager',[
    'exports',
    '../Core/_Global',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_ErrorFromName',
    '../Core/_Resources',
    '../Core/_WriteProfilerMark',
    '../Promise',
    '../_Signal',
    '../Scheduler',
    '../Utilities/_ElementUtilities',
    './_ParallelWorkQueue',
    './_VersionManager'
    ], function itemsManagerInit(exports, _Global, _Base, _BaseUtils, _ErrorFromName, _Resources, _WriteProfilerMark, Promise, _Signal, Scheduler, _ElementUtilities, _ParallelWorkQueue, _VersionManager) {
    "use strict";

    var markSupportedForProcessing = _BaseUtils.markSupportedForProcessing;
    var uniqueID = _ElementUtilities._uniqueID;

    function simpleItemRenderer(f) {
        return markSupportedForProcessing(function (itemPromise, element) {
            return itemPromise.then(function (item) {
                return (item ? f(item, element) : null);
            });
        });
    }

    var trivialHtmlRenderer = simpleItemRenderer(function (item) {
        if (_ElementUtilities._isDOMElement(item.data)) {
            return item.data;
        }

        var data = item.data;
        if (data === undefined) {
            data = "undefined";
        } else if (data === null) {
            data = "null";
        } else if (typeof data === "object") {
            data = JSON.stringify(data);
        }

        var element = _Global.document.createElement("span");
        element.textContent = data.toString();
        return element;
    });

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        _normalizeRendererReturn: function (v) {
            if (v) {
                if (typeof v === "object" && v.element) {
                    var elementPromise = Promise.as(v.element);
                    return elementPromise.then(function (e) { return { element: e, renderComplete: Promise.as(v.renderComplete) }; });
                } else {
                    var elementPromise = Promise.as(v);
                    return elementPromise.then(function (e) { return { element: e, renderComplete: Promise.as() }; });
                }
            } else {
                return { element: null, renderComplete: Promise.as() };
            }
        },
        simpleItemRenderer: simpleItemRenderer,
        _trivialHtmlRenderer: trivialHtmlRenderer
    });

    // Private statics

    var strings = {
        get listDataSourceIsInvalid() { return "Invalid argument: dataSource must be an object."; },
        get itemRendererIsInvalid() { return "Invalid argument: itemRenderer must be a function."; },
        get itemIsInvalid() { return "Invalid argument: item must be a DOM element that was returned by the Items Manager, and has not been replaced or released."; },
    };

    var imageLoader;
    var lastSort = new Date();
    var minDurationBetweenImageSort = 64;

    // This optimization is good for a couple of reasons:
    // - It is a global optimizer, which means that all on screen images take precedence over all off screen images.
    // - It avoids resorting too frequently by only resorting when a new image loads and it has been at least 64 ms since
    //   the last sort.
    // Also, it is worth noting that "sort" on an empty queue does no work (besides the function call).
    function compareImageLoadPriority(a, b) {
        var aon = false;
        var bon = false;

        // Currently isOnScreen is synchronous and fast for list view
        a.isOnScreen().then(function (v) { aon = v; });
        b.isOnScreen().then(function (v) { bon = v; });

        return (aon ? 0 : 1) - (bon ? 0 : 1);
    }

    var nextImageLoaderId = 0;
    var seenUrls = {};
    var seenUrlsMRU = [];
    var SEEN_URLS_MAXSIZE = 250;
    var SEEN_URLS_MRU_MAXSIZE = 1000;

    function seenUrl(srcUrl) {
        if ((/^blob:/i).test(srcUrl)) {
            return;
        }

        seenUrls[srcUrl] = true;
        seenUrlsMRU.push(srcUrl);

        if (seenUrlsMRU.length > SEEN_URLS_MRU_MAXSIZE) {
            var mru = seenUrlsMRU;
            seenUrls = {};
            seenUrlsMRU = [];

            for (var count = 0, i = mru.length - 1; i >= 0 && count < SEEN_URLS_MAXSIZE; i--) {
                var url = mru[i];
                if (!seenUrls[url]) {
                    seenUrls[url] = true;
                    count++;
                }
            }
        }
    }

    // Exposing the seenUrl related members to use them in unit tests
    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        _seenUrl: seenUrl,
        _getSeenUrls: function () {
            return seenUrls;
        },
        _getSeenUrlsMRU: function () {
            return seenUrlsMRU;
        },
        _seenUrlsMaxSize: SEEN_URLS_MAXSIZE,
        _seenUrlsMRUMaxSize: SEEN_URLS_MRU_MAXSIZE
    });

    function loadImage(srcUrl, image, data) {
        var imageId = nextImageLoaderId++;
        imageLoader = imageLoader || new _ParallelWorkQueue._ParallelWorkQueue(6);
        return imageLoader.queue(function () {
            return new Promise(function (c, e) {
                Scheduler.schedule(function ImageLoader_async_loadImage(jobInfo) {
                    if (!image) {
                        image = _Global.document.createElement("img");
                    }

                    var seen = seenUrls[srcUrl];

                    if (!seen) {
                        jobInfo.setPromise(new Promise(function (imageLoadComplete) {
                            var tempImage = _Global.document.createElement("img");

                            var cleanup = function () {
                                tempImage.removeEventListener("load", loadComplete, false);
                                tempImage.removeEventListener("error", loadError, false);

                                // One time use blob images are cleaned up as soon as they are not referenced by images any longer.
                                // We set the image src before clearing the tempImage src to make sure the blob image is always
                                // referenced.
                                image.src = srcUrl;

                                var currentDate = new Date();
                                if (currentDate - lastSort > minDurationBetweenImageSort) {
                                    lastSort = currentDate;
                                    imageLoader.sort(compareImageLoadPriority);
                                }
                            };

                            var loadComplete = function () {
                                imageLoadComplete(jobComplete);
                            };
                            var loadError = function () {
                                imageLoadComplete(jobError);
                            };

                            var jobComplete = function () {
                                seenUrl(srcUrl);
                                cleanup();
                                c(image);
                            };
                            var jobError = function () {
                                cleanup();
                                e(image);
                            };

                            tempImage.addEventListener("load", loadComplete, false);
                            tempImage.addEventListener("error", loadError, false);
                            tempImage.src = srcUrl;
                        }));
                    } else {
                        seenUrl(srcUrl);
                        image.src = srcUrl;
                        c(image);
                    }
                }, Scheduler.Priority.normal, null, "WinJS.UI._ImageLoader._image" + imageId);
            });
        }, data);
    }

    function isImageCached(srcUrl) {
        return seenUrls[srcUrl];
    }

    function defaultRenderer() {
        return _Global.document.createElement("div");
    }

    // Public definitions

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        _createItemsManager: _Base.Namespace._lazy(function () {
            var ListNotificationHandler = _Base.Class.define(function ListNotificationHandler_ctor(itemsManager) {
                // Constructor

                this._itemsManager = itemsManager;
            }, {
                // Public methods

                beginNotifications: function () {
                    this._itemsManager._versionManager.beginNotifications();
                    this._itemsManager._beginNotifications();
                },

                // itemAvailable: not implemented

                inserted: function (itemPromise, previousHandle, nextHandle) {
                    this._itemsManager._versionManager.receivedNotification();
                    this._itemsManager._inserted(itemPromise, previousHandle, nextHandle);
                },

                changed: function (newItem, oldItem) {
                    this._itemsManager._versionManager.receivedNotification();
                    this._itemsManager._changed(newItem, oldItem);
                },

                moved: function (itemPromise, previousHandle, nextHandle) {
                    this._itemsManager._versionManager.receivedNotification();
                    this._itemsManager._moved(itemPromise, previousHandle, nextHandle);
                },

                removed: function (handle, mirage) {
                    this._itemsManager._versionManager.receivedNotification();
                    this._itemsManager._removed(handle, mirage);
                },

                countChanged: function (newCount, oldCount) {
                    this._itemsManager._versionManager.receivedNotification();
                    this._itemsManager._countChanged(newCount, oldCount);
                },

                indexChanged: function (handle, newIndex, oldIndex) {
                    this._itemsManager._versionManager.receivedNotification();
                    this._itemsManager._indexChanged(handle, newIndex, oldIndex);
                },

                affectedRange: function (range) {
                    this._itemsManager._versionManager.receivedNotification();
                    this._itemsManager._affectedRange(range);
                },

                endNotifications: function () {
                    this._itemsManager._versionManager.endNotifications();
                    this._itemsManager._endNotifications();
                },

                reload: function () {
                    this._itemsManager._versionManager.receivedNotification();
                    this._itemsManager._reload();
                }
            }, { // Static Members
                supportedForProcessing: false,
            });

            var ItemsManager = _Base.Class.define(function ItemsManager_ctor(listDataSource, itemRenderer, elementNotificationHandler, options) {
                // Constructor

                if (!listDataSource) {
                    throw new _ErrorFromName("WinJS.UI.ItemsManager.ListDataSourceIsInvalid", strings.listDataSourceIsInvalid);
                }
                if (!itemRenderer) {
                    throw new _ErrorFromName("WinJS.UI.ItemsManager.ItemRendererIsInvalid", strings.itemRendererIsInvalid);
                }

                this.$pipeline_callbacksMap = {};

                this._listDataSource = listDataSource;

                this.dataSource = this._listDataSource;

                this._elementNotificationHandler = elementNotificationHandler;

                this._listBinding = this._listDataSource.createListBinding(new ListNotificationHandler(this));

                if (options) {
                    if (options.ownerElement) {
                        this._ownerElement = options.ownerElement;
                    }
                    this._profilerId = options.profilerId;
                    this._versionManager = options.versionManager || new _VersionManager._VersionManager();
                }

                this._indexInView = options && options.indexInView;
                this._itemRenderer = itemRenderer;
                this._viewCallsReady = options && options.viewCallsReady;

                // Map of (the uniqueIDs of) elements to records for items
                this._elementMap = {};

                // Map of handles to records for items
                this._handleMap = {};

                // Owner for use with jobs on the scheduler. Allows for easy cancellation of jobs during clean up.
                this._jobOwner = Scheduler.createOwnerToken();

                // Boolean to track whether endNotifications needs to be called on the ElementNotificationHandler
                this._notificationsSent = false;

                // Only enable the lastItem method if the data source implements the itemsFromEnd method
                if (this._listBinding.last) {
                    this.lastItem = function () {
                        return this._elementForItem(this._listBinding.last());
                    };
                }
            }, {
                _itemFromItemPromise: function (itemPromise) {
                    return this._waitForElement(this._elementForItem(itemPromise));
                },
                // If stage 0 is not yet complete, caller is responsible for transitioning the item from stage 0 to stage 1
                _itemFromItemPromiseThrottled: function (itemPromise) {
                    return this._waitForElement(this._elementForItem(itemPromise, true));
                },
                _itemAtIndex: function (index) {
                    var itemPromise = this._itemPromiseAtIndex(index);
                    this._itemFromItemPromise(itemPromise).then(null, function (e) {
                        itemPromise.cancel();
                        return Promise.wrapError(e);
                    });
                },
                _itemPromiseAtIndex: function (index) {
                    return this._listBinding.fromIndex(index);
                },
                _waitForElement: function (possiblePlaceholder) {
                    var that = this;
                    return new Promise(function (c) {
                        if (possiblePlaceholder) {
                            if (!that.isPlaceholder(possiblePlaceholder)) {
                                c(possiblePlaceholder);
                            } else {
                                var placeholderID = uniqueID(possiblePlaceholder);
                                var callbacks = that.$pipeline_callbacksMap[placeholderID];
                                if (!callbacks) {
                                    that.$pipeline_callbacksMap[placeholderID] = [c];
                                } else {
                                    callbacks.push(c);
                                }
                            }
                        } else {
                            c(possiblePlaceholder);
                        }
                    });
                },
                _updateElement: function (newElement, oldElement) {
                    var placeholderID = uniqueID(oldElement);
                    var callbacks = this.$pipeline_callbacksMap[placeholderID];
                    if (callbacks) {
                        delete this.$pipeline_callbacksMap[placeholderID];
                        callbacks.forEach(function (c) { c(newElement); });
                    }
                },
                _firstItem: function () {
                    return this._waitForElement(this._elementForItem(this._listBinding.first()));
                },
                _lastItem: function () {
                    return this._waitForElement(this._elementForItem(this._listBinding.last()));
                },
                _previousItem: function (element) {
                    this._listBinding.jumpToItem(this._itemFromElement(element));
                    return this._waitForElement(this._elementForItem(this._listBinding.previous()));
                },
                _nextItem: function (element) {
                    this._listBinding.jumpToItem(this._itemFromElement(element));
                    return this._waitForElement(this._elementForItem(this._listBinding.next()));
                },
                _itemFromPromise: function (itemPromise) {
                    return this._waitForElement(this._elementForItem(itemPromise));
                },
                isPlaceholder: function (item) {
                    return !!this._recordFromElement(item).elementIsPlaceholder;
                },

                itemObject: function (element) {
                    return this._itemFromElement(element);
                },

                release: function () {
                    this._listBinding.release();
                    this._elementNotificationHandler = null;
                    this._listBinding = null;
                    this._jobOwner.cancelAll();
                    this._released = true;
                },

                releaseItemPromise: function (itemPromise) {
                    var handle = itemPromise.handle;
                    var record = this._handleMap[handle];
                    if (!record) {
                        // The item promise is not in our handle map so we didn't even try to render it yet.
                        itemPromise.cancel();
                    } else {
                        this._releaseRecord(record);
                    }
                },

                releaseItem: function (element) {
                    var record = this._elementMap[uniqueID(element)];
                    this._releaseRecord(record);
                },

                _releaseRecord: function (record) {
                    if (!record) { return; }

                    if (record.renderPromise) {
                        record.renderPromise.cancel();
                    }
                    if (record.itemPromise) {
                        record.itemPromise.cancel();
                    }
                    if (record.imagePromises) {
                        record.imagePromises.forEach(function (promise) {
                            promise.cancel();
                        });
                    }
                    if (record.itemReadyPromise) {
                        record.itemReadyPromise.cancel();
                    }
                    if (record.renderComplete) {
                        record.renderComplete.cancel();
                    }

                    this._removeEntryFromElementMap(record.element);
                    this._removeEntryFromHandleMap(record.itemPromise.handle, record);

                    if (record.item) {
                        this._listBinding.releaseItem(record.item);
                    }

                },

                refresh: function () {
                    return this._listDataSource.invalidateAll();
                },

                // Private members

                _handlerToNotifyCaresAboutItemAvailable: function () {
                    return !!(this._elementNotificationHandler && this._elementNotificationHandler.itemAvailable);
                },

                _handlerToNotify: function () {
                    if (!this._notificationsSent) {
                        this._notificationsSent = true;

                        if (this._elementNotificationHandler && this._elementNotificationHandler.beginNotifications) {
                            this._elementNotificationHandler.beginNotifications();
                        }
                    }
                    return this._elementNotificationHandler;
                },

                _defineIndexProperty: function (itemForRenderer, item, record) {
                    record.indexObserved = false;
                    Object.defineProperty(itemForRenderer, "index", {
                        get: function () {
                            record.indexObserved = true;
                            return item.index;
                        }
                    });
                },

                _renderPlaceholder: function (record) {
                    var itemForRenderer = {};
                    var elementPlaceholder = defaultRenderer(itemForRenderer);
                    record.elementIsPlaceholder = true;
                    return elementPlaceholder;
                },

                _renderItem: function (itemPromise, record, callerThrottlesStage1) {
                    var that = this;
                    var indexInView = that._indexInView || function () { return true; };
                    var stage1Signal = new _Signal();
                    var readySignal = new _Signal();
                    var perfItemPromiseId = "_renderItem(" + record.item.index + "):itemPromise";

                    var stage0RunningSync = true;
                    var stage0Ran = false;
                    itemPromise.then(function (item) {
                        stage0Ran = true;
                        if (stage0RunningSync) {
                            stage1Signal.complete(item);
                        }
                    });
                    stage0RunningSync = false;

                    var itemForRendererPromise = stage1Signal.promise.then(function (item) {
                        if (item) {
                            var itemForRenderer = Object.create(item);
                            // Derive a new item and override its index property, to track whether it is read
                            that._defineIndexProperty(itemForRenderer, item, record);
                            itemForRenderer.ready = readySignal.promise;
                            itemForRenderer.isOnScreen = function () {
                                return Promise.wrap(indexInView(item.index));
                            };
                            itemForRenderer.loadImage = function (srcUrl, image) {
                                var loadImagePromise = loadImage(srcUrl, image, itemForRenderer);
                                if (record.imagePromises) {
                                    record.imagePromises.push(loadImagePromise);
                                } else {
                                    record.imagePromises = [loadImagePromise];
                                }
                                return loadImagePromise;
                            };
                            itemForRenderer.isImageCached = isImageCached;
                            return itemForRenderer;
                        } else {
                            return Promise.cancel;
                        }
                    });

                    function queueAsyncStage1() {
                        itemPromise.then(function (item) {
                            that._writeProfilerMark(perfItemPromiseId + ",StartTM");
                            stage1Signal.complete(item);
                            that._writeProfilerMark(perfItemPromiseId + ",StopTM");
                        });
                    }
                    if (!stage0Ran) {
                        if (callerThrottlesStage1) {
                            record.stage0 = itemPromise;
                            record.startStage1 = function () {
                                record.startStage1 = null;
                                queueAsyncStage1();
                            };
                        } else {
                            queueAsyncStage1();
                        }
                    }

                    itemForRendererPromise.handle = itemPromise.handle;
                    record.itemPromise = itemForRendererPromise;
                    record.itemReadyPromise = readySignal.promise;
                    record.readyComplete = false;

                    // perfRendererWorkId = stage 1 rendering (if itemPromise is async) or stage 1+2 (if itemPromise is sync and ran inline)
                    // perfItemPromiseId = stage 2 rendering only (should only be emitted if itemPromise was async)
                    // perfItemReadyId = stage 3 rendering
                    var perfRendererWorkId = "_renderItem(" + record.item.index + (stage0Ran ? "):syncItemPromise" : "):placeholder");
                    var perfItemReadyId = "_renderItem(" + record.item.index + "):itemReady";

                    this._writeProfilerMark(perfRendererWorkId + ",StartTM");
                    var rendererPromise = Promise.as(that._itemRenderer(itemForRendererPromise, record.element)).
                        then(exports._normalizeRendererReturn).
                        then(function (v) {
                            if (that._released) {
                                return Promise.cancel;
                            }

                            itemForRendererPromise.then(function (item) {
                                // Store pending ready callback off record so ScrollView can call it during realizePage. Otherwise
                                // call it ourselves.
                                record.pendingReady = function () {
                                    if (record.pendingReady) {
                                        record.pendingReady = null;
                                        record.readyComplete = true;
                                        that._writeProfilerMark(perfItemReadyId + ",StartTM");
                                        readySignal.complete(item);
                                        that._writeProfilerMark(perfItemReadyId + ",StopTM");
                                    }
                                };
                                if (!that._viewCallsReady) {
                                    var job = Scheduler.schedule(record.pendingReady, Scheduler.Priority.normal,
                                        record, "WinJS.UI._ItemsManager._pendingReady");
                                    job.owner = that._jobOwner;
                                }
                            });
                            return v;
                        });

                    this._writeProfilerMark(perfRendererWorkId + ",StopTM");
                    return rendererPromise;
                },

                _replaceElement: function (record, elementNew) {
                    this._removeEntryFromElementMap(record.element);
                    record.element = elementNew;
                    this._addEntryToElementMap(elementNew, record);
                },

                _changeElement: function (record, elementNew, elementNewIsPlaceholder) {
                    record.renderPromise = null;
                    var elementOld = record.element,
                        itemOld = record.item;

                    if (record.newItem) {
                        record.item = record.newItem;
                        record.newItem = null;
                    }

                    this._replaceElement(record, elementNew);

                    if (record.item && record.elementIsPlaceholder && !elementNewIsPlaceholder) {
                        record.elementDelayed = null;
                        record.elementIsPlaceholder = false;
                        this._updateElement(record.element, elementOld);
                        if (this._handlerToNotifyCaresAboutItemAvailable()) {
                            this._handlerToNotify().itemAvailable(record.element, elementOld);
                        }
                    } else {
                        this._handlerToNotify().changed(elementNew, elementOld, itemOld);
                    }
                },

                _elementForItem: function (itemPromise, callerThrottlesStage1) {
                    var handle = itemPromise.handle,
                        record = this._recordFromHandle(handle, true),
                        element;

                    if (!handle) {
                        return null;
                    }

                    if (record) {
                        element = record.element;
                    } else {
                        // Create a new record for this item
                        record = {
                            item: itemPromise,
                            itemPromise: itemPromise
                        };
                        this._addEntryToHandleMap(handle, record);

                        var that = this;
                        var mirage = false;
                        var synchronous = false;

                        var renderPromise =
                            that._renderItem(itemPromise, record, callerThrottlesStage1).
                            then(function (v) {
                                var elementNew = v.element;
                                record.renderComplete = v.renderComplete;

                                itemPromise.then(function (item) {
                                    record.item = item;
                                    if (!item) {
                                        mirage = true;
                                        element = null;
                                    }
                                });

                                synchronous = true;
                                record.renderPromise = null;

                                if (elementNew) {
                                    if (element) {
                                        that._presentElements(record, elementNew);
                                    } else {
                                        element = elementNew;
                                    }
                                }
                            });

                        if (!mirage) {
                            if (!synchronous) {
                                record.renderPromise = renderPromise;
                            }

                            if (!element) {
                                element = this._renderPlaceholder(record);
                            }

                            record.element = element;
                            this._addEntryToElementMap(element, record);

                            itemPromise.retain();
                        }
                    }

                    return element;
                },

                _addEntryToElementMap: function (element, record) {
                    this._elementMap[uniqueID(element)] = record;
                },

                _removeEntryFromElementMap: function (element) {
                    delete this._elementMap[uniqueID(element)];
                },

                _recordFromElement: function (element) {
                    var record = this._elementMap[uniqueID(element)];
                    if (!record) {
                        this._writeProfilerMark("_recordFromElement:ItemIsInvalidError,info");
                        throw new _ErrorFromName("WinJS.UI.ItemsManager.ItemIsInvalid", strings.itemIsInvalid);
                    }

                    return record;
                },

                _addEntryToHandleMap: function (handle, record) {
                    this._handleMap[handle] = record;
                },

                _removeEntryFromHandleMap: function (handle) {
                    delete this._handleMap[handle];
                },

                _handleInHandleMap: function (handle) {
                    return !!this._handleMap[handle];
                },

                _recordFromHandle: function (handle, ignoreFailure) {
                    var record = this._handleMap[handle];
                    if (!record && !ignoreFailure) {
                        throw new _ErrorFromName("WinJS.UI.ItemsManager.ItemIsInvalid", strings.itemIsInvalid);
                    }
                    return record;
                },

                _foreachRecord: function (callback) {
                    var records = this._handleMap;
                    for (var property in records) {
                        var record = records[property];
                        callback(record);
                    }
                },

                _itemFromElement: function (element) {
                    return this._recordFromElement(element).item;
                },

                _elementFromHandle: function (handle) {
                    if (handle) {
                        var record = this._recordFromHandle(handle, true);

                        if (record && record.element) {
                            return record.element;
                        }
                    }

                    return null;
                },

                _inserted: function (itemPromise, previousHandle, nextHandle) {
                    this._handlerToNotify().inserted(itemPromise, previousHandle, nextHandle);
                },

                _changed: function (newItem, oldItem) {
                    if (!this._handleInHandleMap(oldItem.handle)) { return; }

                    var record = this._recordFromHandle(oldItem.handle);

                    if (record.renderPromise) {
                        record.renderPromise.cancel();
                    }
                    if (record.itemPromise) {
                        record.itemPromise.cancel();
                    }
                    if (record.imagePromises) {
                        record.imagePromises.forEach(function (promise) {
                            promise.cancel();
                        });
                    }
                    if (record.itemReadyPromise) {
                        record.itemReadyPromise.cancel();
                    }
                    if (record.renderComplete) {
                        record.renderComplete.cancel();
                    }

                    record.newItem = newItem;

                    var that = this;
                    var newItemPromise = Promise.as(newItem);
                    newItemPromise.handle = record.itemPromise.handle;
                    record.renderPromise = this._renderItem(newItemPromise, record).
                        then(function (v) {
                            record.renderComplete = v.renderComplete;
                            that._changeElement(record, v.element, false);
                            that._presentElements(record);
                        });
                },

                _moved: function (itemPromise, previousHandle, nextHandle) {
                    // no check for haveHandle, as we get move notification for items we
                    // are "next" to, so we handle the "null element" cases below
                    //
                    var element = this._elementFromHandle(itemPromise.handle);
                    var previous = this._elementFromHandle(previousHandle);
                    var next = this._elementFromHandle(nextHandle);

                    this._handlerToNotify().moved(element, previous, next, itemPromise);
                    this._presentAllElements();
                },

                _removed: function (handle, mirage) {
                    if (this._handleInHandleMap(handle)) {
                        var element = this._elementFromHandle(handle);

                        this._handlerToNotify().removed(element, mirage, handle);
                        this.releaseItem(element);
                        this._presentAllElements();
                    } else {
                        this._handlerToNotify().removed(null, mirage, handle);
                    }
                },

                _countChanged: function (newCount, oldCount) {
                    if (this._elementNotificationHandler && this._elementNotificationHandler.countChanged) {
                        this._handlerToNotify().countChanged(newCount, oldCount);
                    }
                },

                _indexChanged: function (handle, newIndex, oldIndex) {
                    var element;
                    if (this._handleInHandleMap(handle)) {
                        var record = this._recordFromHandle(handle);
                        if (record.indexObserved) {
                            if (!record.elementIsPlaceholder) {
                                if (record.item.index !== newIndex) {
                                    if (record.renderPromise) {
                                        record.renderPromise.cancel();
                                    }
                                    if (record.renderComplete) {
                                        record.renderComplete.cancel();
                                    }

                                    var itemToRender = record.newItem || record.item;
                                    itemToRender.index = newIndex;

                                    var newItemPromise = Promise.as(itemToRender);
                                    newItemPromise.handle = record.itemPromise.handle;

                                    var that = this;
                                    record.renderPromise = this._renderItem(newItemPromise, record).
                                        then(function (v) {
                                            record.renderComplete = v.renderComplete;
                                            that._changeElement(record, v.element, false);
                                            that._presentElements(record);
                                        });
                                }
                            } else {
                                this._changeElement(record, this._renderPlaceholder(record), true);
                            }
                        }
                        element = record.element;
                    }
                    if (this._elementNotificationHandler && this._elementNotificationHandler.indexChanged) {
                        this._handlerToNotify().indexChanged(element, newIndex, oldIndex);
                    }
                },

                _affectedRange: function (range) {
                    if (this._elementNotificationHandler && this._elementNotificationHandler.updateAffectedRange) {
                        this._handlerToNotify().updateAffectedRange(range);
                    }
                },

                _beginNotifications: function () {
                    // accessing _handlerToNotify will force the call to beginNotifications on the client
                    //
                    this._externalBegin = true;
                    this._handlerToNotify();
                },
                _endNotifications: function () {
                    if (this._notificationsSent) {
                        this._notificationsSent = false;
                        this._externalBegin = false;

                        if (this._elementNotificationHandler && this._elementNotificationHandler.endNotifications) {
                            this._elementNotificationHandler.endNotifications();
                        }
                    }
                },

                _reload: function () {
                    if (this._elementNotificationHandler && this._elementNotificationHandler.reload) {
                        this._elementNotificationHandler.reload();
                    }
                },

                // Some functions may be called synchronously or asynchronously, so it's best to post _endNotifications to avoid
                // calling it prematurely.
                _postEndNotifications: function () {
                    if (this._notificationsSent && !this._externalBegin && !this._endNotificationsPosted) {
                        this._endNotificationsPosted = true;
                        var that = this;
                        Scheduler.schedule(function ItemsManager_async_endNotifications() {
                            that._endNotificationsPosted = false;
                            that._endNotifications();
                        }, Scheduler.Priority.high, null, "WinJS.UI._ItemsManager._postEndNotifications");
                    }
                },

                _presentElement: function (record) {
                    var elementOld = record.element;
                    // Finish modifying the slot before calling back into user code, in case there is a reentrant call
                    this._replaceElement(record, record.elementDelayed);
                    record.elementDelayed = null;

                    record.elementIsPlaceholder = false;
                    this._updateElement(record.element, elementOld);
                    if (this._handlerToNotifyCaresAboutItemAvailable()) {
                        this._handlerToNotify().itemAvailable(record.element, elementOld);
                    }
                },

                _presentElements: function (record, elementDelayed) {
                    if (elementDelayed) {
                        record.elementDelayed = elementDelayed;
                    }

                    this._listBinding.jumpToItem(record.item);
                    if (record.elementDelayed) {
                        this._presentElement(record);
                    }

                    this._postEndNotifications();
                },

                // Presents all delayed elements
                _presentAllElements: function () {
                    var that = this;
                    this._foreachRecord(function (record) {
                        if (record.elementDelayed) {
                            that._presentElement(record);
                        }
                    });
                },

                _writeProfilerMark: function (text) {
                    var message = "WinJS.UI._ItemsManager:" + (this._profilerId ? (this._profilerId + ":") : ":") + text;
                    _WriteProfilerMark(message);
                }
            }, { // Static Members
                supportedForProcessing: false,
            });

            return function (dataSource, itemRenderer, elementNotificationHandler, options) {
                return new ItemsManager(dataSource, itemRenderer, elementNotificationHandler, options);
            };
        })
    });

});


// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Utilities/_TabContainer',[
    'exports',
    '../Core/_Global',
    '../Core/_Base',
    '../Core/_BaseUtils',
    './_ElementUtilities'
    ], function tabManagerInit(exports, _Global, _Base, _BaseUtils, _ElementUtilities) {
    "use strict";

    // not supported in WebWorker
    if (!_Global.document) {
        return;
    }

    function fireEvent(element, name, forward, cancelable) {
        var event = _Global.document.createEvent('UIEvent');
        event.initUIEvent(name, false, !!cancelable, _Global, forward ? 1 : 0);
        return !element.dispatchEvent(event);
    }

    var getTabIndex = _ElementUtilities.getTabIndex;

    // tabbableElementsNodeFilter works with the TreeWalker to create a view of the DOM tree that is built up of what we want the focusable tree to look like.
    // When it runs into a tab contained area, it rejects anything except the childFocus element so that any potentially tabbable things that the TabContainer
    // doesn't want tabbed to get ignored.
    function tabbableElementsNodeFilter(node) {
        var nodeStyle = _Global.getComputedStyle(node);
        if (nodeStyle.display === "none" || nodeStyle.visibility === "hidden") {
            return _Global.NodeFilter.FILTER_REJECT;
        }
        if (node._tabContainer) {
            return _Global.NodeFilter.FILTER_ACCEPT;
        }
        if (node.parentNode && node.parentNode._tabContainer) {
            var managedTarget = node.parentNode._tabContainer.childFocus;
            // Ignore subtrees that are under a tab manager but not the child focus. If a node is contained in the child focus, either accept it (if it's tabbable itself), or skip it and find tabbable content inside of it.
            if (managedTarget && node.contains(managedTarget)) {
                return (getTabIndex(node) >= 0 ? _Global.NodeFilter.FILTER_ACCEPT : _Global.NodeFilter.FILTER_SKIP);
            }
            return _Global.NodeFilter.FILTER_REJECT;
        }
        var tabIndex = getTabIndex(node);
        if (tabIndex >= 0) {
            return _Global.NodeFilter.FILTER_ACCEPT;
        }
        return _Global.NodeFilter.FILTER_SKIP;
    }

    // We've got to manually scrape the results the walker generated, since the walker will have generated a fairly good representation of the tabbable tree, but
    // won't have a perfect image. Trees like this cause a problem for the walker:
    //     [ tabContainer element ]
    //   [ element containing childFocus ]
    //  [ childFocus ] [ sibling of child focus that has tabIndex >= 0 ]
    // We can't tell the tree walker to jump right to the childFocus, so it'll collect the childFocus but also that sibling element. We don't want that sibling element
    // to appear in our version of the tabOrder, so scrapeTabManagedSubtree will take the pretty accurate representation we get from the TreeWalker, and do a little
    // more pruning to give us only the nodes we're interested in.
    function scrapeTabManagedSubtree(walker) {
        var tabManagedElement = walker.currentNode,
            childFocus = tabManagedElement._tabContainer.childFocus,
            elementsFound = [];

        if (!childFocus) {
            return [];
        }

        walker.currentNode = childFocus;
        function scrapeSubtree() {
            if (walker.currentNode._tabContainer) {
                elementsFound = elementsFound.concat(scrapeTabManagedSubtree(walker));
            } else {
                // A child focus can have tabIndex = -1, so check the tabIndex before marking it as valid
                if (getTabIndex(walker.currentNode) >= 0) {
                    elementsFound.push(walker.currentNode);
                }
                if (walker.firstChild()) {
                    do {
                        scrapeSubtree();
                    } while (walker.nextSibling());
                    walker.parentNode();
                }
            }
        }
        scrapeSubtree();
        walker.currentNode = tabManagedElement;

        return elementsFound;
    }

    function TabHelperObject(element, tabIndex) {
        function createCatcher() {
            var fragment = _Global.document.createElement("DIV");
            fragment.tabIndex = (tabIndex ? tabIndex : 0);
            fragment.setAttribute("aria-hidden", true);
            return fragment;
        }

        var parent = element.parentNode;

        // Insert prefix focus catcher
        var catcherBegin = createCatcher();
        parent.insertBefore(catcherBegin, element);

        // Insert postfix focus catcher
        var catcherEnd = createCatcher();
        parent.insertBefore(catcherEnd, element.nextSibling);

        catcherBegin.addEventListener("focus", function () {
            fireEvent(element, "onTabEnter", true);
        }, true);
        catcherEnd.addEventListener("focus", function () {
            fireEvent(element, "onTabEnter", false);
        }, true);

        this._catcherBegin = catcherBegin;
        this._catcherEnd = catcherEnd;
        var refCount = 1;
        this.addRef = function () {
            refCount++;
        };
        this.release = function () {
            if (--refCount === 0) {
                if (catcherBegin.parentElement) {
                    parent.removeChild(catcherBegin);
                }
                if (catcherEnd.parentElement) {
                    parent.removeChild(catcherEnd);
                }
            }
            return refCount;
        };
        this.updateTabIndex = function (tabIndex) {
            catcherBegin.tabIndex = tabIndex;
            catcherEnd.tabIndex = tabIndex;
        };
    }

    var TrackTabBehavior = {
        attach: function (element, tabIndex) {
            ///
            if (!element["win-trackTabHelperObject"]) {
                element["win-trackTabHelperObject"] = new TabHelperObject(element, tabIndex);
            } else {
                element["win-trackTabHelperObject"].addRef();
            }

            return element["win-trackTabHelperObject"];
        },

        detach: function (element) {
            ///
            if (!element["win-trackTabHelperObject"].release()) {
                delete element["win-trackTabHelperObject"];
            }
        }
    };

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        TrackTabBehavior: TrackTabBehavior,
        TabContainer: _Base.Class.define(function TabContainer_ctor(element) {
            /// <signature helpKeyword="WinJS.UI.TabContainer.TabContainer">
            /// <summary locid="WinJS.UI.TabContainer.constructor">
            /// Constructs the TabContainer.
            /// </summary>
            /// <param name="element" type="HTMLElement" domElement="true" locid="WinJS.UI.TabContainer.constructor_p:element">
            /// The DOM element to be associated with the TabContainer.
            /// </param>
            /// <param name="options" type="Object" locid="WinJS.UI.TabContainer.constructor_p:options">
            /// The set of options to be applied initially to the TabContainer.
            /// </param>
            /// <returns type="WinJS.UI.TabContainer" locid="WinJS.UI.TabContainer.constructor_returnValue">
            /// A constructed TabContainer.
            /// </returns>
            /// </signature>
            this._element = element;
            this._tabIndex = 0;
            element._tabContainer = this;
            if (element.getAttribute("tabindex") === null) {
                element.tabIndex = -1;
            }
            var that = this;

            element.addEventListener("onTabEnter", function (e) {
                var skipDefaultBehavior = fireEvent(that._element, "onTabEntered", e.detail, true);
                if (skipDefaultBehavior) {
                    return;
                }

                if (that.childFocus) {
                    that.childFocus.focus();
                } else {
                    element.focus();
                }
            });
            element.addEventListener("keydown", function (e) {
                var targetElement = e.target;
                if (e.keyCode === _ElementUtilities.Key.tab) {
                    var forwardTab = !e.shiftKey;
                    var canKeepTabbing = that._hasMoreElementsInTabOrder(targetElement, forwardTab);
                    if (!canKeepTabbing) {
                        var skipTabExitHandling = fireEvent(that._element, "onTabExiting", forwardTab, true);
                        if (skipTabExitHandling) {
                            e.stopPropagation();
                            e.preventDefault();
                            return;
                        }
                        var allTabbableElements = that._element.querySelectorAll("a[href],area[href],button,command,input,link,menuitem,object,select,textarea,th[sorted],[tabindex]"),
                            len = allTabbableElements.length,
                            originalTabIndices = [];

                        for (var i = 0; i < len; i++) {
                            var element = allTabbableElements[i];
                            originalTabIndices.push(element.tabIndex);
                            element.tabIndex = -1;
                        }
                        // If there's nothing else that can be tabbed to on the page, tab should wrap around back to the tab contained area.
                        // We'll disable the sentinel node that's directly in the path of the tab order (catcherEnd for forward tabs, and
                        // catcherBegin for shift+tabs), but leave the other sentinel node untouched so tab can wrap around back into the region.
                        that._elementTabHelper[forwardTab ? "_catcherEnd" : "_catcherBegin"].tabIndex = -1;

                        var restoreTabIndicesOnBlur = function () {
                            targetElement.removeEventListener("blur", restoreTabIndicesOnBlur, false);
                            for (var i = 0; i < len; i++) {
                                if (originalTabIndices[i] !== -1) {
                                    // When the original tabIndex was -1, don't try restoring to -1 again. A nested TabContainer might also be in the middle of handling this same code,
                                    // and so would have set tabIndex = -1 on this element. The nested tab container will restore the element's tabIndex properly.
                                    allTabbableElements[i].tabIndex = originalTabIndices[i];
                                }
                            }
                            that._elementTabHelper._catcherBegin.tabIndex = that._tabIndex;
                            that._elementTabHelper._catcherEnd.tabIndex = that._tabIndex;
                        };
                        targetElement.addEventListener("blur", restoreTabIndicesOnBlur, false);
                        _BaseUtils._yieldForEvents(function () {
                            fireEvent(that._element, "onTabExit", forwardTab);
                        });
                    }
                }
            });

            this._elementTabHelper = TrackTabBehavior.attach(element, this._tabIndex);
            this._elementTabHelper._catcherBegin.tabIndex = 0;
            this._elementTabHelper._catcherEnd.tabIndex = 0;
        }, {

            // Public members

            /// <signature helpKeyword="WinJS.UI.TabContainer.dispose">
            /// <summary locid="WinJS.UI.TabContainer.dispose">
            /// Disposes the Tab Container.
            /// </summary>
            /// </signature>
            dispose: function () {
                TrackTabBehavior.detach(this._element, this._tabIndex);
            },

            /// <field type="HTMLElement" domElement="true" locid="WinJS.UI.TabContainer.childFocus" helpKeyword="WinJS.UI.TabContainer.childFocus">
            /// Gets or sets the child element that has focus.
            /// </field>
            childFocus: {
                set: function (e) {
                    if (e !== this._focusElement) {
                        if (e && e.parentNode) {
                            this._focusElement = e;
                        } else {
                            this._focusElement = null;
                        }
                    }
                },
                get: function () {
                    return this._focusElement;
                }
            },

            /// <field type="Number" integer="true" locid="WinJS.UI.TabContainer.tabIndex" helpKeyword="WinJS.UI.TabContainer.tabIndex">
            /// Gets or sets the tab order of the control within its container.
            /// </field>
            tabIndex: {
                set: function (tabIndex) {
                    this._tabIndex = tabIndex;
                    this._elementTabHelper.updateTabIndex(tabIndex);
                },

                get: function () {
                    return this._tabIndex;
                }
            },

            // Private members

            _element: null,
            _skipper: function (e) {
                e.stopPropagation();
                e.preventDefault();
            },
            _hasMoreElementsInTabOrder: function (currentFocus, movingForwards) {
                if (!this.childFocus) {
                    return false;
                }
                var walker = _Global.document.createTreeWalker(this._element, _Global.NodeFilter.SHOW_ELEMENT, tabbableElementsNodeFilter, false);
                var tabStops = scrapeTabManagedSubtree(walker);
                for (var i = 0; i < tabStops.length; i++) {
                    if (tabStops[i] === currentFocus) {
                        return (movingForwards ? (i < tabStops.length - 1) : (i > 0));
                    }
                }
                return false;
            },
            _focusElement: null

        }, { // Static Members
            supportedForProcessing: false,
        })
    });

});
// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Utilities/_KeyboardBehavior',[
    'exports',
    '../Core/_Global',
    '../Core/_Base',
    './_Control',
    './_ElementUtilities',
    './_TabContainer'
    ], function KeyboardBehaviorInit(exports, _Global, _Base, _Control, _ElementUtilities, _TabContainer) {
    "use strict";

    // not supported in WebWorker
    if (!_Global.document) {
        return;
    }

    var _keyboardSeenLast = false;

    _ElementUtilities._addEventListener(_Global, "pointerdown", function () {
        if (_keyboardSeenLast) {
            _keyboardSeenLast = false;
        }
    }, true);

    _Global.addEventListener("keydown", function () {
        if (!_keyboardSeenLast) {
            _keyboardSeenLast = true;
        }
    }, true);

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        _keyboardSeenLast : {
            get: function _keyboardSeenLast_get() {
                return _keyboardSeenLast;
            },
            set: function _keyboardSeenLast_set(value) {
                _keyboardSeenLast = value;
            }
        },
        _WinKeyboard: function (element) {
            // Win Keyboard behavior is a solution that would be similar to -ms-keyboard-focus.
            // It monitors the last input (keyboard/mouse) and adds/removes a win-keyboard class
            // so that you can style .foo.win-keyboard:focus vs .foo:focus to add a keyboard rect
            // on an item only when the last input method was keyboard.
            // Reminder: Touch edgy does not count as an input method.
            _ElementUtilities._addEventListener(element, "pointerdown", function (ev) {
                // In case pointer down came on the active element.
                _ElementUtilities.removeClass(ev.target, "win-keyboard");
            }, true);
            element.addEventListener("keydown", function (ev) {
                _ElementUtilities.addClass(ev.target, "win-keyboard");
            }, true);
            _ElementUtilities._addEventListener(element, "focusin", function (ev) {
                exports._keyboardSeenLast && _ElementUtilities.addClass(ev.target, "win-keyboard");
            }, false);
            _ElementUtilities._addEventListener(element, "focusout", function (ev) {
                _ElementUtilities.removeClass(ev.target, "win-keyboard");
            }, false);
        },
        _KeyboardBehavior: _Base.Namespace._lazy(function () {
            var Key = _ElementUtilities.Key;

            var _KeyboardBehavior = _Base.Class.define(function KeyboardBehavior_ctor(element, options) {
                // KeyboardBehavior allows you to easily convert a bunch of tabable elements into a single tab stop with
                // navigation replaced by keyboard arrow (Up/Down/Left/Right) + Home + End + Custom keys.
                //
                // Example use cases:
                //
                // 1 Dimensional list: FixedDirection = height and FixedSize = 1;
                // [1] [ 2 ] [  3  ] [4] [  5  ]...
                //
                // 2 Dimensional list: FixedDirection = height and FixedSize = 2;
                // [1] [3] [5] [7] ...
                // [2] [4] [6] [8]
                //
                // 1 Dimensional list: FixedDirection = width and FixedSize = 1;
                // [ 1 ]
                // -   -
                // |   |
                // | 2 |
                // |   |
                // -   -
                // [ 3 ]
                // [ 4 ]
                //  ...
                //
                // 2 Dimensional list: FixedDirection = width and FixedSize = 2;
                // [1][2]
                // [3][4]
                // [5][6]
                // ...
                //
                // Currently it is a "behavior" instead of a "control" so it can be attached to the same element as a
                // winControl. The main scenario for this would be to attach it to the same element as a repeater.
                //
                // It also blocks "Portaling" where you go off the end of one column and wrap around to the other
                // column. It also blocks "Carousel" where you go from the end of the list to the beginning.
                //
                // Keyboarding behavior supports nesting. It supports your tab stops having sub tab stops. If you want
                // an interactive element within the tab stop you need to use the win-interactive classname or during the
                // keydown event stop propogation so that the event is skipped.
                //
                // If you have custom keyboarding the getAdjacent API is provided. This can be used to enable keyboarding
                // in multisize 2d lists or custom keyboard commands. PageDown and PageUp are the most common since this
                // behavior does not detect scrollers.
                //
                // It also allows developers to show/hide keyboard focus rectangles themselves.
                //
                // It has an API called currentIndex so that Tab (or Shift+Tab) or a developer imitating Tab will result in
                // the correct item having focus.
                //
                // It also allows an element to be represented as 2 arrow stops (commonly used for a split button) by calling
                // the _getFocusInto API on the child element's winControl if it exists.

                element = element || _Global.document.createElement("DIV");
                options = options || {};

                element._keyboardBehavior = this;
                this._element = element;

                this._fixedDirection = _KeyboardBehavior.FixedDirection.width;
                this._fixedSize = 1;
                this._currentIndex = 0;

                _Control.setOptions(this, options);

                // If there's a scroller, the TabContainer can't be inside of the scroller. Otherwise, tabbing into the
                // TabContainer will cause the scroller to scroll.
                this._tabContainer = new _TabContainer.TabContainer(this.scroller || this._element);
                this._tabContainer.tabIndex = 0;
                if (this._element.children.length > 0) {
                    this._tabContainer.childFocus = this._getFocusInto(this._element.children[0]);
                }

                this._element.addEventListener('keydown', this._keyDownHandler.bind(this));
                _ElementUtilities._addEventListener(this._element, 'pointerdown', this._MSPointerDownHandler.bind(this));
            }, {
                element: {
                    get: function () {
                        return this._element;
                    }
                },

                fixedDirection: {
                    get: function () {
                        return this._fixedDirection;
                    },
                    set: function (value) {
                        this._fixedDirection = value;
                    }
                },

                fixedSize: {
                    get: function () {
                        return this._fixedSize;
                    },
                    set: function (value) {
                        if (+value === value) {
                            value = Math.max(1, value);
                            this._fixedSize = value;
                        }
                    }
                },

                currentIndex: {
                    get: function () {
                        if (this._element.children.length > 0) {
                            return this._currentIndex;
                        }
                        return -1;
                    },
                    set: function (value) {
                        if (+value === value) {
                            var length = this._element.children.length;
                            value = Math.max(0, Math.min(length - 1, value));
                            this._currentIndex = value;
                            this._tabContainer.childFocus = this._getFocusInto(this._element.children[value]);
                        }
                    }
                },

                getAdjacent: {
                    get: function () {
                        return this._getAdjacent;
                    },
                    set: function (value) {
                        this._getAdjacent = value;
                    }
                },

                // If set, KeyboardBehavior will prevent *scroller* from scrolling when moving focus
                scroller: {
                    get: function () {
                        return this._scroller;
                    },
                    set: function (value) {
                        this._scroller = value;
                    }
                },

                _keyDownHandler: function _KeyboardBehavior_keyDownHandler(ev) {
                    if (!ev.altKey) {
                        if (_ElementUtilities._matchesSelector(ev.target, ".win-interactive, .win-interactive *")) {
                            return;
                        }
                        var blockScrolling = false;

                        var newIndex = this.currentIndex;
                        var maxIndex = this._element.children.length - 1;

                        var rtl = _Global.getComputedStyle(this._element).direction === "rtl";
                        var leftStr = rtl ? Key.rightArrow : Key.leftArrow;
                        var rightStr = rtl ? Key.leftArrow : Key.rightArrow;

                        var targetIndex = this.getAdjacent && this.getAdjacent(newIndex, ev.keyCode);
                        if (+targetIndex === targetIndex) {
                            blockScrolling = true;
                            newIndex = targetIndex;
                        } else {
                            var modFixedSize = newIndex % this.fixedSize;

                            if (ev.keyCode === leftStr) {
                                blockScrolling = true;
                                if (this.fixedDirection === _KeyboardBehavior.FixedDirection.width) {
                                    if (modFixedSize !== 0) {
                                        newIndex--;
                                    }
                                } else {
                                    if (newIndex >= this.fixedSize) {
                                        newIndex -= this.fixedSize;
                                    }
                                }
                            } else if (ev.keyCode === rightStr) {
                                blockScrolling = true;
                                if (this.fixedDirection === _KeyboardBehavior.FixedDirection.width) {
                                    if (modFixedSize !== this.fixedSize - 1) {
                                        newIndex++;
                                    }
                                } else {
                                    if (newIndex + this.fixedSize - modFixedSize <= maxIndex) {
                                        newIndex += this.fixedSize;
                                    }
                                }
                            } else if (ev.keyCode === Key.upArrow) {
                                blockScrolling = true;
                                if (this.fixedDirection === _KeyboardBehavior.FixedDirection.height) {
                                    if (modFixedSize !== 0) {
                                        newIndex--;
                                    }
                                } else {
                                    if (newIndex >= this.fixedSize) {
                                        newIndex -= this.fixedSize;
                                    }
                                }
                            } else if (ev.keyCode === Key.downArrow) {
                                blockScrolling = true;
                                if (this.fixedDirection === _KeyboardBehavior.FixedDirection.height) {
                                    if (modFixedSize !== this.fixedSize - 1) {
                                        newIndex++;
                                    }
                                } else {
                                    if (newIndex + this.fixedSize - modFixedSize <= maxIndex) {
                                        newIndex += this.fixedSize;
                                    }
                                }
                            } else if (ev.keyCode === Key.home) {
                                blockScrolling = true;
                                newIndex = 0;
                            } else if (ev.keyCode === Key.end) {
                                blockScrolling = true;
                                newIndex = this._element.children.length - 1;
                            } else if (ev.keyCode === Key.pageUp) {
                                blockScrolling = true;
                            } else if (ev.keyCode === Key.pageDown) {
                                blockScrolling = true;
                            }
                        }

                        newIndex = Math.max(0, Math.min(this._element.children.length - 1, newIndex));

                        if (newIndex !== this.currentIndex) {
                            this._focus(newIndex, ev.keyCode);

                            // Allow KeyboardBehavior to be nested
                            if (ev.keyCode === leftStr || ev.keyCode === rightStr || ev.keyCode === Key.upArrow || ev.keyCode === Key.downArrow) {
                                ev.stopPropagation();
                            }
                        }

                        if (blockScrolling) {
                            ev.preventDefault();
                        }
                    }
                },

                _getFocusInto: function _KeyboardBehavior_getFocusInto(elementToFocus, keyCode) {
                    return elementToFocus && elementToFocus.winControl && elementToFocus.winControl._getFocusInto ?
                        elementToFocus.winControl._getFocusInto(keyCode) :
                        elementToFocus;
                },

                _focus: function _KeyboardBehavior_focus(index, keyCode) {
                    index = (+index === index) ? index : this.currentIndex;

                    var elementToFocus = this._element.children[index];
                    if (elementToFocus) {
                        elementToFocus = this._getFocusInto(elementToFocus, keyCode);

                        this.currentIndex = index;

                        _ElementUtilities._setActive(elementToFocus, this.scroller);
                    }
                },

                _MSPointerDownHandler: function _KeyboardBehavior_MSPointerDownHandler(ev) {
                    var srcElement = ev.target;
                    if (srcElement === this.element) {
                        return;
                    }

                    while (srcElement.parentNode !== this.element) {
                        srcElement = srcElement.parentNode;
                    }

                    var index = -1;
                    while (srcElement) {
                        index++;
                        srcElement = srcElement.previousElementSibling;
                    }

                    this.currentIndex = index;
                }
            }, {
                FixedDirection: {
                    height: "height",
                    width: "width"
                }
            });

            return _KeyboardBehavior;
        })
    });

});
// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Utilities/_SafeHtml',[
    'exports',
    '../Core/_Global',
    '../Core/_Base',
    '../Core/_ErrorFromName',
    '../Core/_Resources'
    ], function safeHTMLInit(exports, _Global, _Base, _ErrorFromName, _Resources) {
    "use strict";


    var setInnerHTML,
        setInnerHTMLUnsafe,
        setOuterHTML,
        setOuterHTMLUnsafe,
        insertAdjacentHTML,
        insertAdjacentHTMLUnsafe;

    var strings = {
        get nonStaticHTML() { return "Unable to add dynamic content. A script attempted to inject dynamic content, or elements previously modified dynamically, that might be unsafe. For example, using the innerHTML property or the document.write method to add a script element will generate this exception. If the content is safe and from a trusted source, use a method to explicitly manipulate elements and attributes, such as createElement, or use setInnerHTMLUnsafe (or other unsafe method)."; },
    };

    setInnerHTML = setInnerHTMLUnsafe = function (element, text) {
        /// <signature helpKeyword="WinJS.Utilities.setInnerHTML">
        /// <summary locid="WinJS.Utilities.setInnerHTML">
        /// Sets the innerHTML property of the specified element to the specified text.
        /// </summary>
        /// <param name="element" type="HTMLElement" locid="WinJS.Utilities.setInnerHTML_p:element">
        /// The element on which the innerHTML property is to be set.
        /// </param>
        /// <param name="text" type="String" locid="WinJS.Utilities.setInnerHTML_p:text">
        /// The value to be set to the innerHTML property.
        /// </param>
        /// </signature>
        element.innerHTML = text;
    };
    setOuterHTML = setOuterHTMLUnsafe = function (element, text) {
        /// <signature helpKeyword="WinJS.Utilities.setOuterHTML">
        /// <summary locid="WinJS.Utilities.setOuterHTML">
        /// Sets the outerHTML property of the specified element to the specified text.
        /// </summary>
        /// <param name="element" type="HTMLElement" locid="WinJS.Utilities.setOuterHTML_p:element">
        /// The element on which the outerHTML property is to be set.
        /// </param>
        /// <param name="text" type="String" locid="WinJS.Utilities.setOuterHTML_p:text">
        /// The value to be set to the outerHTML property.
        /// </param>
        /// </signature>
        element.outerHTML = text;
    };
    insertAdjacentHTML = insertAdjacentHTMLUnsafe = function (element, position, text) {
        /// <signature helpKeyword="WinJS.Utilities.insertAdjacentHTML">
        /// <summary locid="WinJS.Utilities.insertAdjacentHTML">
        /// Calls insertAdjacentHTML on the specified element.
        /// </summary>
        /// <param name="element" type="HTMLElement" locid="WinJS.Utilities.insertAdjacentHTML_p:element">
        /// The element on which insertAdjacentHTML is to be called.
        /// </param>
        /// <param name="position" type="String" locid="WinJS.Utilities.insertAdjacentHTML_p:position">
        /// The position relative to the element at which to insert the HTML.
        /// </param>
        /// <param name="text" type="String" locid="WinJS.Utilities.insertAdjacentHTML_p:text">
        /// The value to be provided to insertAdjacentHTML.
        /// </param>
        /// </signature>
        element.insertAdjacentHTML(position, text);
    };

    var msApp = _Global.MSApp;
    if (msApp) {
        setInnerHTMLUnsafe = function (element, text) {
            /// <signature helpKeyword="WinJS.Utilities.setInnerHTMLUnsafe">
            /// <summary locid="WinJS.Utilities.setInnerHTMLUnsafe">
            /// Sets the innerHTML property of the specified element to the specified text.
            /// </summary>
            /// <param name='element' type='HTMLElement' locid="WinJS.Utilities.setInnerHTMLUnsafe_p:element">
            /// The element on which the innerHTML property is to be set.
            /// </param>
            /// <param name='text' type="String" locid="WinJS.Utilities.setInnerHTMLUnsafe_p:text">
            /// The value to be set to the innerHTML property.
            /// </param>
            /// </signature>
            msApp.execUnsafeLocalFunction(function () {
                element.innerHTML = text;
            });
        };
        setOuterHTMLUnsafe = function (element, text) {
            /// <signature helpKeyword="WinJS.Utilities.setOuterHTMLUnsafe">
            /// <summary locid="WinJS.Utilities.setOuterHTMLUnsafe">
            /// Sets the outerHTML property of the specified element to the specified text
            /// in the context of msWWA.execUnsafeLocalFunction.
            /// </summary>
            /// <param name="element" type="HTMLElement" locid="WinJS.Utilities.setOuterHTMLUnsafe_p:element">
            /// The element on which the outerHTML property is to be set.
            /// </param>
            /// <param name="text" type="String" locid="WinJS.Utilities.setOuterHTMLUnsafe_p:text">
            /// The value to be set to the outerHTML property.
            /// </param>
            /// </signature>
            msApp.execUnsafeLocalFunction(function () {
                element.outerHTML = text;
            });
        };
        insertAdjacentHTMLUnsafe = function (element, position, text) {
            /// <signature helpKeyword="WinJS.Utilities.insertAdjacentHTMLUnsafe">
            /// <summary locid="WinJS.Utilities.insertAdjacentHTMLUnsafe">
            /// Calls insertAdjacentHTML on the specified element in the context
            /// of msWWA.execUnsafeLocalFunction.
            /// </summary>
            /// <param name="element" type="HTMLElement" locid="WinJS.Utilities.insertAdjacentHTMLUnsafe_p:element">
            /// The element on which insertAdjacentHTML is to be called.
            /// </param>
            /// <param name="position" type="String" locid="WinJS.Utilities.insertAdjacentHTMLUnsafe_p:position">
            /// The position relative to the element at which to insert the HTML.
            /// </param>
            /// <param name="text" type="String" locid="WinJS.Utilities.insertAdjacentHTMLUnsafe_p:text">
            /// Value to be provided to insertAdjacentHTML.
            /// </param>
            /// </signature>
            msApp.execUnsafeLocalFunction(function () {
                element.insertAdjacentHTML(position, text);
            });
        };
    } else if (_Global.msIsStaticHTML) {
        var check = function (str) {
            if (!_Global.msIsStaticHTML(str)) {
                throw new _ErrorFromName("WinJS.Utitilies.NonStaticHTML", strings.nonStaticHTML);
            }
        };
        // If we ever get isStaticHTML we can attempt to recreate the behavior we have in the local
        // compartment, in the mean-time all we can do is sanitize the input.
        //
        setInnerHTML = function (element, text) {
            /// <signature helpKeyword="WinJS.Utilities.setInnerHTML">
            /// <summary locid="WinJS.Utilities.msIsStaticHTML.setInnerHTML">
            /// Sets the innerHTML property of a element to the specified text
            /// if it passes a msIsStaticHTML check.
            /// </summary>
            /// <param name="element" type="HTMLElement" locid="WinJS.Utilities.msIsStaticHTML.setInnerHTML_p:element">
            /// The element on which the innerHTML property is to be set.
            /// </param>
            /// <param name="text" type="String" locid="WinJS.Utilities.msIsStaticHTML.setInnerHTML_p:text">
            /// The value to be set to the innerHTML property.
            /// </param>
            /// </signature>
            check(text);
            element.innerHTML = text;
        };
        setOuterHTML = function (element, text) {
            /// <signature helpKeyword="WinJS.Utilities.setOuterHTML">
            /// <summary locid="WinJS.Utilities.msIsStaticHTML.setOuterHTML">
            /// Sets the outerHTML property of a element to the specified text
            /// if it passes a msIsStaticHTML check.
            /// </summary>
            /// <param name="element" type="HTMLElement" locid="WinJS.Utilities.msIsStaticHTML.setOuterHTML_p:element">
            /// The element on which the outerHTML property is to be set.
            /// </param>
            /// <param name="text" type="String" locid="WinJS.Utilities.msIsStaticHTML.setOuterHTML_p:text">
            /// The value to be set to the outerHTML property.
            /// </param>
            /// </signature>
            check(text);
            element.outerHTML = text;
        };
        insertAdjacentHTML = function (element, position, text) {
            /// <signature helpKeyword="WinJS.Utilities.insertAdjacentHTML">
            /// <summary locid="WinJS.Utilities.msIsStaticHTML.insertAdjacentHTML">
            /// Calls insertAdjacentHTML on the element if it passes
            /// a msIsStaticHTML check.
            /// </summary>
            /// <param name="element" type="HTMLElement" locid="WinJS.Utilities.msIsStaticHTML.insertAdjacentHTML_p:element">
            /// The element on which insertAdjacentHTML is to be called.
            /// </param>
            /// <param name="position" type="String" locid="WinJS.Utilities.msIsStaticHTML.insertAdjacentHTML_p:position">
            /// The position relative to the element at which to insert the HTML.
            /// </param>
            /// <param name="text" type="String" locid="WinJS.Utilities.msIsStaticHTML.insertAdjacentHTML_p:text">
            /// The value to be provided to insertAdjacentHTML.
            /// </param>
            /// </signature>
            check(text);
            element.insertAdjacentHTML(position, text);
        };
    }

    _Base.Namespace._moduleDefine(exports, "WinJS.Utilities", {
        setInnerHTML: setInnerHTML,
        setInnerHTMLUnsafe: setInnerHTMLUnsafe,
        setOuterHTML: setOuterHTML,
        setOuterHTMLUnsafe: setOuterHTMLUnsafe,
        insertAdjacentHTML: insertAdjacentHTML,
        insertAdjacentHTMLUnsafe: insertAdjacentHTMLUnsafe
    });

});

// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Utilities/_Select',[
    'exports',
    '../Core/_Base',
    './_SafeHtml'
    ], function selectInit(exports, _Base, _SafeHtml) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        _Select: _Base.Namespace._lazy(function () {
            var encodeHtmlRegEx = /[&<>'"]/g;
            var encodeHtmlEscapeMap = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                "'": "&#39;",
                '"': "&quot;"
            };
            var stringDirectionRegEx = /[\u200e\u200f]/g;
            function encodeHtml(str) {
                return str.replace(encodeHtmlRegEx, function (m) {
                    return encodeHtmlEscapeMap[m] || "";
                });
            }
            function stripDirectionMarker(str) {
                return str.replace(stringDirectionRegEx, "");
            }
            function stockGetValue(index) {
                /*jshint validthis: true */
                return this[index];
            }
            function stockGetLength() {
                /*jshint validthis: true */
                return this.length;
            }
            function fixDataSource(dataSource) {
                if (!dataSource.getValue) {
                    dataSource.getValue = stockGetValue;
                }

                if (!dataSource.getLength) {
                    dataSource.getLength = stockGetLength;
                }
                return dataSource;
            }

            return _Base.Class.define(function _Select_ctor(element, options) {
                // This is an implementation detail of the TimePicker and DatePicker, designed
                // to provide a primitive "data bound" select control. This is not designed to
                // be used outside of the TimePicker and DatePicker controls.
                //

                this._dataSource = fixDataSource(options.dataSource);
                this._index = options.index || 0;

                this._domElement = element;
                // Mark this as a tab stop
                this._domElement.tabIndex = 0;

                if (options.disabled) {
                    this.setDisabled(options.disabled);
                }

                var that = this;
                this._domElement.addEventListener("change", function () {
                    //Should be set to _index to prevent events from firing twice
                    that._index = that._domElement.selectedIndex;
                }, false);

                //update runtime accessibility value after initialization
                this._createSelectElement();
            }, {
                _index: 0,
                _dataSource: null,

                dataSource: {
                    get: function () { return this._dataSource; },
                    set: function (value) {
                        this._dataSource = fixDataSource(value);

                        //Update layout as data source change
                        if (this._domElement) {
                            this._createSelectElement();
                        }
                    }
                },

                setDisabled: function (disabled) {
                    if (disabled) {
                        this._domElement.setAttribute("disabled", "disabled");
                    } else {
                        this._domElement.removeAttribute("disabled");
                    }
                },

                _createSelectElement: function () {
                    var dataSourceLength = this._dataSource.getLength();
                    var text = "";
                    for (var i = 0; i < dataSourceLength; i++) {
                        var value = "" + this._dataSource.getValue(i);
                        var escaped = encodeHtml(value);
                        // WinRT localization often tags the strings with reading direction. We want this
                        // for display text (escaped), but don't want this in the value space, as it
                        // only present for display.
                        //
                        var stripped = stripDirectionMarker(escaped);
                        text += "<option value='" + stripped + "'>" + escaped + "</option>";
                    }
                    _SafeHtml.setInnerHTMLUnsafe(this._domElement, text);
                    this._domElement.selectedIndex = this._index;
                },

                index: {
                    get: function () {
                        return Math.max(0, Math.min(this._index, this._dataSource.getLength() - 1));
                    },
                    set: function (value) {
                        if (this._index !== value) {
                            this._index = value;

                            var d = this._domElement;
                            if (d && d.selectedIndex !== value) {
                                d.selectedIndex = value;
                            }
                        }
                    }
                },

                value: {
                    get: function () {
                        return this._dataSource.getValue(this.index);
                    }
                }
            });
        })
    });
});

// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Utilities/_UI',[
    'exports',
    '../Core/_BaseCoreUtils',
    '../Core/_Base'
    ], function uiInit(exports, _BaseCoreUtils, _Base) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        eventHandler: function (handler) {
            /// <signature helpKeyword="WinJS.UI.eventHandler">
            /// <summary locid="WinJS.UI.eventHandler">
            /// Marks a event handler function as being compatible with declarative processing.
            /// </summary>
            /// <param name="handler" type="Object" locid="WinJS.UI.eventHandler_p:handler">
            /// The handler to be marked as compatible with declarative processing.
            /// </param>
            /// <returns type="Object" locid="WinJS.UI.eventHandler_returnValue">
            /// The input handler.
            /// </returns>
            /// </signature>
            return _BaseCoreUtils.markSupportedForProcessing(handler);
        },
        /// <field locid="WinJS.UI.Orientation" helpKeyword="WinJS.UI.Orientation">
        /// Orientation options for a control's property
        /// </field>
        Orientation: {
            /// <field locid="WinJS.UI.Orientation.horizontal" helpKeyword="WinJS.UI.Orientation.horizontal">
            /// Horizontal
            /// </field>
            horizontal: "horizontal",
            /// <field locid="WinJS.UI.Orientation.vertical" helpKeyword="WinJS.UI.Orientation.vertical">
            /// Vertical
            /// </field>
            vertical: "vertical"
        },

        CountResult: {
            unknown: "unknown"
        },

        CountError: {
            noResponse: "noResponse"
        },

        DataSourceStatus: {
            ready: "ready",
            waiting: "waiting",
            failure: "failure"
        },

        FetchError: {
            noResponse: "noResponse",
            doesNotExist: "doesNotExist"
        },

        EditError: {
            noResponse: "noResponse",
            canceled: "canceled",
            notPermitted: "notPermitted",
            noLongerMeaningful: "noLongerMeaningful"
        },

        /// <field locid="WinJS.UI.ListView.ObjectType" helpKeyword="WinJS.UI.ObjectType">
        /// Specifies the type of an IListViewEntity.
        /// </field>
        ObjectType: {
            /// <field locid="WinJS.UI.ListView.ObjectType.item" helpKeyword="WinJS.UI.ObjectType.item">
            /// This value represents a ListView item.
            /// </field>
            item: "item",
            /// <field locid="WinJS.UI.ListView.ObjectType.groupHeader" helpKeyword="WinJS.UI.ObjectType.groupHeader">
            /// This value represents a ListView group header.
            /// </field>
            groupHeader: "groupHeader"
        },

        /// <field locid="WinJS.UI.ListView.SelectionMode" helpKeyword="WinJS.UI.SelectionMode">
        /// Specifies the selection mode for a ListView.
        /// </field>
        SelectionMode: {
            /// <field locid="WinJS.UI.ListView.SelectionMode.none" helpKeyword="WinJS.UI.SelectionMode.none">
            /// Items cannot be selected.
            /// </field>
            none: "none",
            /// <field locid="WinJS.UI.ListView.SelectionMode.single" helpKeyword="WinJS.UI.SelectionMode.single">
            /// A single item may be selected.
            /// <compatibleWith platform="Windows" minVersion="8.0"/>
            /// </field>
            single: "single",
            /// <field locid="WinJS.UI.ListView.SelectionMode.multi" helpKeyword="WinJS.UI.SelectionMode.multi">
            /// Multiple items may be selected.
            /// </field>
            multi: "multi"
        },

        /// <field locid="WinJS.UI.TapBehavior" helpKeyword="WinJS.UI.TapBehavior">
        /// Specifies how an ItemContainer or items in a ListView respond to the tap interaction.
        /// </field>
        TapBehavior: {
            /// <field locid="WinJS.UI.TapBehavior.directSelect" helpKeyword="WinJS.UI.TapBehavior.directSelect">
            /// Tapping the item invokes it and selects it. Navigating to the item with the keyboard changes the
            /// the selection so that the focused item is the only item that is selected.
            /// <compatibleWith platform="Windows" minVersion="8.0"/>
            /// </field>
            directSelect: "directSelect",
            /// <field locid="WinJS.UI.TapBehavior.toggleSelect" helpKeyword="WinJS.UI.TapBehavior.toggleSelect">
            /// Tapping the item invokes it. If the item was selected, tapping it clears the selection. If the item wasn't
            /// selected, tapping the item selects it.
            /// Navigating to the item with the keyboard does not select or invoke it.
            /// </field>
            toggleSelect: "toggleSelect",
            /// <field locid="WinJS.UI.TapBehavior.invokeOnly" helpKeyword="WinJS.UI.TapBehavior.invokeOnly">
            /// Tapping the item invokes it. Navigating to the item with keyboard does not select it or invoke it.
            /// </field>
            invokeOnly: "invokeOnly",
            /// <field locid="WinJS.UI.TapBehavior.none" helpKeyword="WinJS.UI.TapBehavior.none">
            /// Nothing happens.
            /// </field>
            none: "none"
        },

        /// <field locid="WinJS.UI.SwipeBehavior" helpKeyword="WinJS.UI.SwipeBehavior">
        /// Specifies whether items are selected when the user performs a swipe interaction.
        /// <compatibleWith platform="Windows" minVersion="8.0"/>
        /// </field>
        SwipeBehavior: {
            /// <field locid="WinJS.UI.SwipeBehavior.select" helpKeyword="WinJS.UI.SwipeBehavior.select">
            /// The swipe interaction selects the items touched by the swipe.
            /// </field>
            select: "select",
            /// <field locid="WinJS.UI.SwipeBehavior.none" helpKeyword="WinJS.UI.SwipeBehavior.none">
            /// The swipe interaction does not change which items are selected.
            /// </field>
            none: "none"
        },

        /// <field locid="WinJS.UI.GroupHeaderTapBehavior" helpKeyword="WinJS.UI.GroupHeaderTapBehavior">
        /// Specifies how group headers in a ListView respond to the tap interaction.
        /// </field>
        GroupHeaderTapBehavior: {
            /// <field locid="WinJS.UI.GroupHeaderTapBehavior.invoke" helpKeyword="WinJS.UI.GroupHeaderTapBehavior.invoke">
            /// Tapping the group header invokes it.
            /// </field>
            invoke: "invoke",
            /// <field locid="WinJS.UI.GroupHeaderTapBehavior.none" helpKeyword="WinJS.UI.GroupHeaderTapBehavior.none">
            /// Nothing happens.
            /// </field>
            none: "none"
        }

    });

});

// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Utilities/_Xhr',[
    '../Core/_Global',
    '../Core/_Base',
    '../Promise',
    '../Scheduler'
    ], function xhrInit(_Global, _Base, Promise, Scheduler) {
    "use strict";

    function schedule(f, arg, priority) {
        Scheduler.schedule(function xhr_callback() {
            f(arg);
        }, priority, null, "WinJS.xhr");
    }

    function noop() {
    }

    function xhr(options) {
        /// <signature helpKeyword="WinJS.xhr">
        /// <summary locid="WinJS.xhr">
        /// Wraps calls to XMLHttpRequest in a promise.
        /// </summary>
        /// <param name="options" type="Object" locid="WinJS.xhr_p:options">
        /// The options that are applied to the XMLHttpRequest object. They are: type,
        /// url, user, password, headers, responseType, data, and customRequestInitializer.
        /// </param>
        /// <returns type="WinJS.Promise" locid="WinJS.xhr_returnValue">
        /// A promise that returns the XMLHttpRequest object when it completes.
        /// </returns>
        /// </signature>
        var req;
        return new Promise(
            function (c, e, p) {
                /// <returns value="c(new XMLHttpRequest())" locid="WinJS.xhr.constructor._returnValue" />
                var priority = Scheduler.currentPriority;
                req = new _Global.XMLHttpRequest();
                req.onreadystatechange = function () {
                    if (req._canceled) {
                        req.onreadystatechange = noop;
                        return;
                    }

                    if (req.readyState === 4) {
                        if ((req.status >= 200 && req.status < 300) || req.status === 0) {
                            schedule(c, req, priority);
                        } else {
                            schedule(e, req, priority);
                        }
                        req.onreadystatechange = noop;
                    } else {
                        schedule(p, req, priority);
                    }
                };

                req.open(
                    options.type || "GET",
                    options.url,
                    // Promise based XHR does not support sync.
                    //
                    true,
                    options.user,
                    options.password
                );
                req.responseType = options.responseType || "";

                Object.keys(options.headers || {}).forEach(function (k) {
                    req.setRequestHeader(k, options.headers[k]);
                });

                if (options.customRequestInitializer) {
                    options.customRequestInitializer(req);
                }

                if (options.data === undefined) {
                    req.send();
                } else {
                    req.send(options.data);
                }
            },
            function () {
                req.onreadystatechange = noop;
                req._canceled = true;
                req.abort();
            }
        );
    }

    _Base.Namespace.define("WinJS", {
        xhr: xhr
    });

    return xhr;

});

// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Utilities',[
    './Utilities/_Control',
    './Utilities/_Dispose',
    './Utilities/_ElementListUtilities',
    './Utilities/_ElementUtilities',
    './Utilities/_Hoverable',
    './Utilities/_ItemsManager',
    './Utilities/_KeyboardBehavior',
    './Utilities/_ParallelWorkQueue',
    './Utilities/_SafeHtml',
    './Utilities/_Select',
    './Utilities/_TabContainer',
    './Utilities/_UI',
    './Utilities/_VersionManager',
    './Utilities/_Xhr' ], function () {

    //wrapper module
});
