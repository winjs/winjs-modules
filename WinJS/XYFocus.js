define(["require", "exports", "./Core/_Global", "./Core/_Base", "./Core/_BaseUtils", "./Utilities/_ElementUtilities", "./Core/_Events", "./ControlProcessor/_OptionsParser"], function(require, exports, _Global, _Base, _BaseUtils, _ElementUtilities, _Events, _OptionsParser) {
    "use strict";

    var AttributeNames = {
        focusOverride: "data-win-xyfocus",
        focusOverrideLegacy: "data-win-focus"
    };

    var ClassNames = {
        focusable: "win-focusable"
    };

    var CrossDomainMessageConstants = {
        messageDataProperty: "msWinJSXYFocusControlMessage",
        register: "register",
        unregister: "unregister",
        dFocusEnter: "dFocusEnter",
        dFocusExit: "dFocusExit"
    };

    var DirectionNames = {
        left: "left",
        right: "right",
        up: "up",
        down: "down"
    };

    var EventNames = {
        focusChanging: "focuschanging",
        focusChanged: "focuschanged"
    };

    var FocusableTagNames = [
        "A",
        "BUTTON",
        "IFRAME",
        "INPUT",
        "SELECT",
        "TEXTAREA"
    ];

    // These factors can be tweaked to adjust which elements are favored by the focus algorithm
    var ScoringConstants = {
        primaryAxisDistanceWeight: 30,
        secondaryAxisDistanceWeight: 20,
        percentInHistoryShadowWeight: 100000
    };

    /**
    * Gets the mapping object that maps keycodes to XYFocus actions.
    **/
    exports.keyCodeMap = {
        left: [_ElementUtilities.Key.leftArrow],
        right: [_ElementUtilities.Key.rightArrow],
        up: [_ElementUtilities.Key.upArrow],
        down: [_ElementUtilities.Key.downArrow]
    };

    /**
    * Gets or sets the focus root when invoking XYFocus APIs.
    **/
    exports.focusRoot;

    

    function findNextFocusElement(direction, options) {
        var result = _findNextFocusElementInternal(direction, options);
        return result ? result.target : null;
    }
    exports.findNextFocusElement = findNextFocusElement;

    

    function moveFocus(direction, options) {
        var result = exports.findNextFocusElement(direction, options);
        if (result) {
            var previousFocusElement = _Global.document.activeElement;
            if (_trySetFocus(result, -1)) {
                eventSrc.dispatchEvent(EventNames.focusChanged, { previousFocusElement: previousFocusElement, keyCode: -1 });

                return result;
            }
        }
    }
    exports.moveFocus = moveFocus;

    function enableXYFocus() {
        if (!_xyFocusEnabled) {
            _Global.document.addEventListener("keydown", _handleKeyEvent);
            _xyFocusEnabled = true;
        }
    }
    exports.enableXYFocus = enableXYFocus;

    function disableXYFocus() {
        if (_xyFocusEnabled) {
            _Global.document.removeEventListener("keydown", _handleKeyEvent);
            _xyFocusEnabled = false;
        }
    }
    exports.disableXYFocus = disableXYFocus;

    // Privates
    var _xyFocusEnabled = false;
    var _lastTarget;
    var _cachedLastTargetRect;
    var _historyRect;
    var _afEnabledFrames = [];
    function _xyFocus(direction, keyCode, referenceRect) {
        // If focus has moved since the last XYFocus movement, scrolling occured, or an explicit
        // reference rectangle was given to us, then we invalidate the history rectangle.
        if (referenceRect || _Global.document.activeElement !== _lastTarget) {
            _historyRect = null;
            _lastTarget = null;
            _cachedLastTargetRect = null;
        } else if (_lastTarget && _cachedLastTargetRect) {
            var lastTargetRect = _toIRect(_lastTarget.getBoundingClientRect());
            if (lastTargetRect.left !== _cachedLastTargetRect.left || lastTargetRect.top !== _cachedLastTargetRect.top) {
                _historyRect = null;
                _lastTarget = null;
                _cachedLastTargetRect = null;
            }
        }

        var activeElement = _Global.document.activeElement;
        var lastTarget = _lastTarget;

        var result = _findNextFocusElementInternal(direction, {
            focusRoot: exports.focusRoot,
            historyRect: _historyRect,
            referenceElement: _lastTarget,
            referenceRect: referenceRect
        });

        if (result && _trySetFocus(result.target, keyCode)) {
            // A focus target was found
            updateHistoryRect(direction, result);
            _lastTarget = result.target;
            _cachedLastTargetRect = result.targetRect;

            if (result.target.tagName === "IFRAME") {
                var index = _afEnabledFrames.lastIndexOf(result.target.contentWindow);
                if (index >= 0) {
                    // If we successfully moved focus and the new focused item is an IFRAME, then we need to notify it
                    // Note on coordinates: When signaling enter, DO transform the coordinates into the child frame's coordinate system.
                    var refRect = _toIRect({
                        left: result.referenceRect.left - result.targetRect.left,
                        top: result.referenceRect.top - result.targetRect.top,
                        width: result.referenceRect.width,
                        height: result.referenceRect.height
                    });

                    var message = {};
                    message[CrossDomainMessageConstants.messageDataProperty] = {
                        type: CrossDomainMessageConstants.dFocusEnter,
                        direction: direction,
                        referenceRect: refRect
                    };
                    result.target.contentWindow.postMessage(message, "*");
                }
            }
            eventSrc.dispatchEvent(EventNames.focusChanged, { previousFocusElement: activeElement, keyCode: keyCode });
            return true;
        } else {
            // No focus target was found; if we are inside an IFRAME, notify the parent that focus is exiting this IFRAME
            // Note on coordinates: When signaling exit, do NOT transform the coordinates into the parent's coordinate system.
            if (top !== window) {
                var refRect = referenceRect;
                if (!refRect) {
                    refRect = _Global.document.activeElement ? _toIRect(_Global.document.activeElement.getBoundingClientRect()) : _defaultRect();
                }

                var message = {};
                message[CrossDomainMessageConstants.messageDataProperty] = {
                    type: CrossDomainMessageConstants.dFocusExit,
                    direction: direction,
                    referenceRect: refRect
                };
                _Global.parent.postMessage(message, "*");
                return true;
            }
        }
        return false;

        // Nested Helpers
        function updateHistoryRect(direction, result) {
            var newHistoryRect = _defaultRect();

            // It's possible to get into a situation where the target element has no overlap with the reference edge.
            //
            //..╔══════════════╗..........................
            //..║   reference  ║..........................
            //..╚══════════════╝..........................
            //.....................╔═══════════════════╗..
            //.....................║                   ║..
            //.....................║       target      ║..
            //.....................║                   ║..
            //.....................╚═══════════════════╝..
            //
            // If that is the case, we need to reset the coordinates to the edge of the target element.
            if (direction === DirectionNames.left || direction === DirectionNames.right) {
                newHistoryRect.top = _Global.Math.max(result.targetRect.top, result.referenceRect.top, _historyRect ? _historyRect.top : Number.MIN_VALUE);
                newHistoryRect.bottom = _Global.Math.min(result.targetRect.bottom, result.referenceRect.bottom, _historyRect ? _historyRect.bottom : Number.MAX_VALUE);
                if (newHistoryRect.bottom <= newHistoryRect.top) {
                    newHistoryRect.top = result.targetRect.top;
                    newHistoryRect.bottom = result.targetRect.bottom;
                }
                newHistoryRect.height = newHistoryRect.bottom - newHistoryRect.top;

                newHistoryRect.width = Number.MAX_VALUE;
                newHistoryRect.left = Number.MIN_VALUE;
                newHistoryRect.right = Number.MAX_VALUE;
            } else {
                newHistoryRect.left = _Global.Math.max(result.targetRect.left, result.referenceRect.left, _historyRect ? _historyRect.left : Number.MIN_VALUE);
                newHistoryRect.right = _Global.Math.min(result.targetRect.right, result.referenceRect.right, _historyRect ? _historyRect.right : Number.MAX_VALUE);
                if (newHistoryRect.right <= newHistoryRect.left) {
                    newHistoryRect.left = result.targetRect.left;
                    newHistoryRect.right = result.targetRect.right;
                }
                newHistoryRect.width = newHistoryRect.right - newHistoryRect.left;

                newHistoryRect.height = Number.MAX_VALUE;
                newHistoryRect.top = Number.MIN_VALUE;
                newHistoryRect.bottom = Number.MAX_VALUE;
            }
            _historyRect = newHistoryRect;
        }
    }

    function _findNextFocusElementInternal(direction, options) {
        options = options || {};
        options.focusRoot = options.focusRoot || exports.focusRoot || _Global.document.body;
        options.historyRect = options.historyRect || _defaultRect();

        var maxDistance = _Global.Math.max(_Global.screen.availHeight, _Global.screen.availWidth);
        var refObj = getReferenceObject(options.referenceElement, options.referenceRect);

        // Handle override
        if (refObj.element) {
            var manualOverrideOptions = refObj.element.getAttribute(AttributeNames.focusOverride) || refObj.element.getAttribute(AttributeNames.focusOverrideLegacy);
            if (manualOverrideOptions) {
                var parsedOptions = _OptionsParser.optionsParser(manualOverrideOptions);

                // The left-hand side can be cased as either "left" or "Left".
                var selector = parsedOptions[direction] || parsedOptions[direction[0].toUpperCase() + direction.substr(1)];

                if (selector) {
                    var target;
                    var element = refObj.element;
                    while (!target && element) {
                        target = element.querySelector(selector);
                        element = element.parentElement;
                    }
                    if (target) {
                        if (target === _Global.document.activeElement) {
                            return null;
                        }
                        return { target: target, targetRect: _toIRect(target.getBoundingClientRect()), referenceRect: refObj.rect, usedOverride: true };
                    }
                }
            }
        }

        // Calculate scores for each element in the root
        var bestPotential = {
            element: null,
            rect: null,
            score: 0
        };
        var allElements = options.focusRoot.querySelectorAll("*");
        for (var i = 0, length = allElements.length; i < length; i++) {
            var potentialElement = allElements[i];

            if (refObj.element === potentialElement || !isFocusable(potentialElement)) {
                continue;
            }

            var potentialRect = _toIRect(potentialElement.getBoundingClientRect());

            // Skip elements that have either a width of zero or a height of zero
            if (potentialRect.width === 0 || potentialRect.height === 0) {
                continue;
            }

            var score = calculateScore(direction, maxDistance, options.historyRect, refObj.rect, potentialRect);

            if (score > bestPotential.score) {
                bestPotential.element = potentialElement;
                bestPotential.rect = potentialRect;
                bestPotential.score = score;
            }
        }

        return bestPotential.element ? { target: bestPotential.element, targetRect: bestPotential.rect, referenceRect: refObj.rect, usedOverride: false } : null;

        // Nested Helpers
        function calculatePercentInShadow(minReferenceCoord, maxReferenceCoord, minPotentialCoord, maxPotentialCoord) {
            /// Calculates the percentage of the potential element that is in the shadow of the reference element.
            if ((minReferenceCoord >= maxPotentialCoord) || (maxReferenceCoord <= minPotentialCoord)) {
                return 0;
            }

            var pixelOverlapWithTheReferenceShadow = _Global.Math.min(maxReferenceCoord, maxPotentialCoord) - _Global.Math.max(minReferenceCoord, minPotentialCoord);
            var referenceEdgeLength = maxReferenceCoord - minReferenceCoord;
            return pixelOverlapWithTheReferenceShadow / referenceEdgeLength;
        }

        function calculateScore(direction, maxDistance, historyRect, referenceRect, potentialRect) {
            var score = 0;

            var percentInShadow;
            var primaryAxisDistance;
            var secondaryAxisDistance = 0;
            var percentInHistoryShadow = 0;
            switch (direction) {
                case DirectionNames.left:
                    // Make sure we don't evaluate any potential elements to the right of the reference element
                    if (potentialRect.left >= referenceRect.left) {
                        break;
                    }

                    percentInShadow = calculatePercentInShadow(referenceRect.top, referenceRect.bottom, potentialRect.top, potentialRect.bottom);
                    primaryAxisDistance = referenceRect.left - potentialRect.right;

                    if (percentInShadow > 0) {
                        percentInHistoryShadow = calculatePercentInShadow(historyRect.top, historyRect.bottom, potentialRect.top, potentialRect.bottom);
                    } else {
                        // If the potential element is not in the shadow, then we calculate secondary axis distance
                        secondaryAxisDistance = (referenceRect.bottom <= potentialRect.top) ? (potentialRect.top - referenceRect.bottom) : referenceRect.top - potentialRect.bottom;
                    }
                    break;

                case DirectionNames.right:
                    // Make sure we don't evaluate any potential elements to the left of the reference element
                    if (potentialRect.right <= referenceRect.right) {
                        break;
                    }

                    percentInShadow = calculatePercentInShadow(referenceRect.top, referenceRect.bottom, potentialRect.top, potentialRect.bottom);
                    primaryAxisDistance = potentialRect.left - referenceRect.right;

                    if (percentInShadow > 0) {
                        percentInHistoryShadow = calculatePercentInShadow(historyRect.top, historyRect.bottom, potentialRect.top, potentialRect.bottom);
                    } else {
                        // If the potential element is not in the shadow, then we calculate secondary axis distance
                        secondaryAxisDistance = (referenceRect.bottom <= potentialRect.top) ? (potentialRect.top - referenceRect.bottom) : referenceRect.top - potentialRect.bottom;
                    }
                    break;

                case DirectionNames.up:
                    // Make sure we don't evaluate any potential elements below the reference element
                    if (potentialRect.top >= referenceRect.top) {
                        break;
                    }

                    percentInShadow = calculatePercentInShadow(referenceRect.left, referenceRect.right, potentialRect.left, potentialRect.right);
                    primaryAxisDistance = referenceRect.top - potentialRect.bottom;

                    if (percentInShadow > 0) {
                        percentInHistoryShadow = calculatePercentInShadow(historyRect.left, historyRect.right, potentialRect.left, potentialRect.right);
                    } else {
                        // If the potential element is not in the shadow, then we calculate secondary axis distance
                        secondaryAxisDistance = (referenceRect.right <= potentialRect.left) ? (potentialRect.left - referenceRect.right) : referenceRect.left - potentialRect.right;
                    }
                    break;

                case DirectionNames.down:
                    // Make sure we don't evaluate any potential elements above the reference element
                    if (potentialRect.bottom <= referenceRect.bottom) {
                        break;
                    }

                    percentInShadow = calculatePercentInShadow(referenceRect.left, referenceRect.right, potentialRect.left, potentialRect.right);
                    primaryAxisDistance = potentialRect.top - referenceRect.bottom;

                    if (percentInShadow > 0) {
                        percentInHistoryShadow = calculatePercentInShadow(historyRect.left, historyRect.right, potentialRect.left, potentialRect.right);
                    } else {
                        // If the potential element is not in the shadow, then we calculate secondary axis distance
                        secondaryAxisDistance = (referenceRect.right <= potentialRect.left) ? (potentialRect.left - referenceRect.right) : referenceRect.left - potentialRect.right;
                    }
                    break;
            }

            if (primaryAxisDistance >= 0) {
                // The score needs to be a positive number so we make these distances positive numbers
                primaryAxisDistance = maxDistance - primaryAxisDistance;
                secondaryAxisDistance = maxDistance - secondaryAxisDistance;

                if (primaryAxisDistance >= 0 && secondaryAxisDistance >= 0) {
                    // Potential elements in the shadow get a multiplier to their final score
                    primaryAxisDistance += primaryAxisDistance * percentInShadow;

                    score = primaryAxisDistance * ScoringConstants.primaryAxisDistanceWeight + secondaryAxisDistance * ScoringConstants.secondaryAxisDistanceWeight + percentInHistoryShadow * ScoringConstants.percentInHistoryShadowWeight;
                }
            }
            return score;
        }

        function getReferenceObject(referenceElement, referenceRect) {
            var refElement;
            var refRect;

            if ((!referenceElement && !referenceRect) || (referenceElement && !referenceElement.parentNode)) {
                // Note: We need to check to make sure 'parentNode' is not null otherwise there is a case
                // where _lastTarget is defined, but calling getBoundingClientRect will throw a native exception.
                // This case happens if the innerHTML of the parent of the _lastTarget is set to "".
                // If no valid reference is supplied, we'll use _Global.document.activeElement unless it's the body
                if (_Global.document.activeElement !== _Global.document.body) {
                    referenceElement = _Global.document.activeElement;
                }
            }

            if (referenceElement) {
                refElement = referenceElement;
                refRect = _toIRect(refElement.getBoundingClientRect());
            } else if (referenceRect) {
                refRect = _toIRect(referenceRect);
            } else {
                refRect = _defaultRect();
            }
            return {
                element: refElement,
                rect: refRect
            };
        }

        function isFocusable(element) {
            var elementTagName = element.tagName;
            if (!element.hasAttribute("tabindex") && FocusableTagNames.indexOf(elementTagName) === -1 && !_ElementUtilities.hasClass(element, ClassNames.focusable)) {
                // If the current potential element is not one of the tags we consider to be focusable, then exit
                return false;
            }

            if (elementTagName === "IFRAME" && _afEnabledFrames.indexOf(element.contentWindow) === -1) {
                // Skip IFRAMEs without compatible XYFocus implementation
                return false;
            }

            if (elementTagName === "DIV" && element["winControl"] && element["winControl"].disabled) {
                // Skip disabled WinJS controls
                return false;
            }

            var style = getComputedStyle(element);
            if (element.getAttribute("tabIndex") === "-1" || style.display === "none" || style.visibility === "hidden" || element.disabled) {
                // Skip elements that are hidden
                // Note: We don't check for opacity === 0, because the browser cannot tell us this value accurately.
                return false;
            }
            return true;
        }
    }

    function _defaultRect() {
        // We set the top, left, bottom and right properties of the referenceBoundingRectangle to '-1'
        // (as opposed to '0') because we want to make sure that even elements that are up to the edge
        // of the screen can receive focus.
        return {
            top: -1,
            bottom: -1,
            right: -1,
            left: -1,
            height: 0,
            width: 0
        };
    }

    function _toIRect(rect) {
        return {
            top: _Global.Math.floor(rect.top),
            bottom: _Global.Math.floor(rect.top + rect.height),
            right: _Global.Math.floor(rect.left + rect.width),
            left: _Global.Math.floor(rect.left),
            height: _Global.Math.floor(rect.height),
            width: _Global.Math.floor(rect.width)
        };
    }

    function _trySetFocus(element, keyCode) {
        // We raise an event on the focusRoot before focus changes to give listeners
        // a chance to prevent the next focus target from receiving focus if they want.
        var canceled = eventSrc.dispatchEvent(EventNames.focusChanging, { nextFocusElement: element, keyCode: keyCode });
        if (!canceled) {
            element.focus();
        }
        return _Global.document.activeElement === element;
    }

    function _getIFrameFromWindow(win) {
        var iframes = _Global.document.querySelectorAll("IFRAME");
        var found = Array.prototype.filter.call(iframes, function (x) {
            return x.contentWindow === win;
        });
        return found.length ? found[0] : null;
    }

    function _handleKeyEvent(e) {
        if (e.defaultPrevented) {
            return;
        }

        var keys = Object.keys(exports.keyCodeMap);
        for (var i = 0; i < keys.length; i++) {
            // Note: key is 'left', 'right', 'up', or 'down'
            var key = keys[i];
            var keyMappings = exports.keyCodeMap[key];
            if (keyMappings.indexOf(e.keyCode) >= 0) {
                if (_xyFocus(key, e.keyCode)) {
                    e.preventDefault();
                }
                return;
            }
        }
    }

    _Global.addEventListener("message", function (e) {
        if (!e.data || !e.data[CrossDomainMessageConstants.messageDataProperty]) {
            return;
        }

        var data = e.data[CrossDomainMessageConstants.messageDataProperty];
        switch (data.type) {
            case CrossDomainMessageConstants.register:
                _afEnabledFrames.push(e.source);
                break;

            case CrossDomainMessageConstants.unregister:
                var index = _afEnabledFrames.indexOf(e.source);
                if (index >= 0) {
                    _afEnabledFrames.splice(index, 1);
                }
                break;

            case CrossDomainMessageConstants.dFocusEnter:
                // The coordinates stored in data.refRect are already in this frame's coordinate system.
                // When we get this message we will force-enable XYFocus to support scenarios where
                // websites running WinJS are put into an IFRAME and the parent frame has XYFocus enabled.
                exports.enableXYFocus();
                _xyFocus(data.direction, -1, data.referenceRect);
                break;

            case CrossDomainMessageConstants.dFocusExit:
                var iframe = _getIFrameFromWindow(e.source);
                if (_Global.document.activeElement !== iframe) {
                    break;
                }

                // The coordinates stored in data.refRect are in the IFRAME's coordinate system,
                // so we must first transform them into this frame's coordinate system.
                var refRect = data.referenceRect;
                refRect.left += iframe.offsetLeft;
                refRect.top += iframe.offsetTop;
                _xyFocus(data.direction, -1, refRect);
                break;
        }
    });

    _Global.document.addEventListener("DOMContentLoaded", function () {
        if (_ElementUtilities.hasWinRT && _Global["Windows"] && _Global["Windows"]["Xbox"]) {
            exports.enableXYFocus();
        }

        // If we are running within an iframe, we send a registration message to the parent window
        if (_Global.top !== _Global.window) {
            var message = {};
            message[CrossDomainMessageConstants.messageDataProperty] = {
                type: CrossDomainMessageConstants.register,
                version: 1.0
            };
            _Global.parent.postMessage(message, "*");
        }
    });

    // Publish to WinJS namespace
    var toPublish = {
        keyCodeMap: exports.keyCodeMap,
        focusRoot: {
            get: function () {
                return exports.focusRoot;
            },
            set: function (value) {
                exports.focusRoot = value;
            }
        },
        enableXYFocus: exports.enableXYFocus,
        disableXYFocus: exports.disableXYFocus,
        findNextFocusElement: exports.findNextFocusElement,
        moveFocus: exports.moveFocus,
        _xyFocus: _xyFocus
    };
    toPublish = _BaseUtils._merge(toPublish, _Events.eventMixin);
    toPublish["_listeners"] = {};
    var eventSrc = toPublish;
    _Base.Namespace.define("WinJS.UI.XYFocus", toPublish);
});
