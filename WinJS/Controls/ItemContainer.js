// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Controls/ItemContainer/_Constants',[
    'exports',
    '../../Core/_Base'
    ], function constantsInit(exports, _Base) {
    "use strict";

    var members = {};
    members._listViewClass = "win-listview";
    members._viewportClass = "win-viewport";
    members._rtlListViewClass = "win-rtl";
    members._horizontalClass = "win-horizontal";
    members._verticalClass = "win-vertical";
    members._scrollableClass = "win-surface";
    members._itemsContainerClass = "win-itemscontainer";
    members._padderClass = "win-itemscontainer-padder";
    members._proxyClass = "_win-proxy";
    members._itemClass = "win-item";
    members._itemBoxClass = "win-itembox";
    members._itemsBlockClass = "win-itemsblock";
    members._containerClass = "win-container";
    members._backdropClass = "win-backdrop";
    members._footprintClass = "win-footprint";
    members._groupsClass = "win-groups";
    members._selectedClass = "win-selected";
    members._swipeableClass = "win-swipeable";
    members._swipeClass = "win-swipe";
    members._selectionBorderClass = "win-selectionborder";
    members._selectionBackgroundClass = "win-selectionbackground";
    members._selectionCheckmarkClass = "win-selectioncheckmark";
    members._selectionCheckmarkBackgroundClass = "win-selectioncheckmarkbackground";
    members._pressedClass = "win-pressed";
    members._headerClass = "win-groupheader";
    members._headerContainerClass = "win-groupheadercontainer";
    members._groupLeaderClass = "win-groupleader";
    members._progressClass = "win-progress";
    members._selectionHintClass = "win-selectionhint";
    members._revealedClass = "win-revealed";
    members._itemFocusClass = "win-focused";
    members._itemFocusOutlineClass = "win-focusedoutline";
    members._zoomingXClass = "win-zooming-x";
    members._zoomingYClass = "win-zooming-y";
    members._listLayoutClass = "win-listlayout";
    members._gridLayoutClass = "win-gridlayout";
    members._headerPositionTopClass = "win-headerpositiontop";
    members._headerPositionLeftClass = "win-headerpositionleft";
    members._structuralNodesClass = "win-structuralnodes";
    members._uniformGridLayoutClass = "win-uniformgridlayout";
    members._uniformListLayoutClass = "win-uniformlistlayout";
    members._cellSpanningGridLayoutClass = "win-cellspanninggridlayout";
    members._laidOutClass = "win-laidout";
    members._nonDraggableClass = "win-nondraggable";
    members._nonSelectableClass = "win-nonselectable";
    members._nonSwipeableClass = "win-nonswipeable";
    members._dragOverClass = "win-dragover";
    members._dragSourceClass = "win-dragsource";
    members._clipClass = "win-clip";
    members._selectionModeClass = "win-selectionmode";
    members._noCSSGrid = "win-nocssgrid";
    
    members._INVALID_INDEX = -1;
    members._UNINITIALIZED = -1;

    members._LEFT_MSPOINTER_BUTTON = 0;
    members._RIGHT_MSPOINTER_BUTTON = 2;

    members._TAP_END_THRESHOLD = 10;
    
    members._DEFAULT_PAGES_TO_LOAD = 5;
    members._DEFAULT_PAGE_LOAD_THRESHOLD = 2;

    members._MIN_AUTOSCROLL_RATE = 150;
    members._MAX_AUTOSCROLL_RATE = 1500;
    members._AUTOSCROLL_THRESHOLD = 100;
    members._AUTOSCROLL_DELAY = 50;

    members._DEFERRED_ACTION = 250;
    members._DEFERRED_SCROLL_END = 250;

    // For horizontal layouts
    members._VERTICAL_SWIPE_SELECTION_THRESHOLD = 39;
    members._VERTICAL_SWIPE_SPEED_BUMP_START = 0;
    members._VERTICAL_SWIPE_SPEED_BUMP_END = 127;
    members._VERTICAL_SWIPE_SELF_REVEAL_GESTURE = 15;

    // For vertical layouts
    members._HORIZONTAL_SWIPE_SELECTION_THRESHOLD = 27;
    members._HORIZONTAL_SWIPE_SPEED_BUMP_START = 0;
    members._HORIZONTAL_SWIPE_SPEED_BUMP_END = 150;
    members._HORIZONTAL_SWIPE_SELF_REVEAL_GESTURE = 23;

    members._SELECTION_CHECKMARK = "\uE081";

    members._LISTVIEW_PROGRESS_DELAY = 2000;

    var ScrollToPriority = {
        uninitialized: 0,
        low: 1,             // used by layoutSite.invalidateLayout, forceLayout, _processReload, _update and _onMSElementResize - operations that preserve the scroll position
        medium: 2,          // used by dataSource change, layout change and etc - operations that reset the scroll position to 0
        high: 3             // used by indexOfFirstVisible, ensureVisible, scrollPosition - operations in which the developer explicitly sets the scroll position
    };

    var ViewChange = {
        rebuild: 0,
        remeasure: 1,
        relayout: 2,
        realize: 3
    };

    members._ScrollToPriority = ScrollToPriority;
    members._ViewChange = ViewChange;

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", members);
});

// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Controls/ItemContainer/_ItemEventsHandler',[
    'exports',
    '../../Core/_Global',
    '../../Core/_WinRT',
    '../../Core/_Base',
    '../../Core/_BaseUtils',
    '../../Core/_WriteProfilerMark',
    '../../Animations',
    '../../Animations/_TransitionAnimation',
    '../../Promise',
    '../../Utilities/_ElementUtilities',
    '../../Utilities/_UI',
    './_Constants'
    ], function itemEventsHandlerInit(exports, _Global, _WinRT, _Base, _BaseUtils, _WriteProfilerMark, Animations, _TransitionAnimation, Promise, _ElementUtilities, _UI, _Constants) {
    "use strict";

    var transformNames = _BaseUtils._browserStyleEquivalents["transform"];
    var MAX_TILT_ROTATION = 0.15;
    var MAX_TILT_SHRINK = 0.025;
    var uniqueID = _ElementUtilities._uniqueID;
    var MSManipulationEventStates = _ElementUtilities._MSManipulationEvent;

    function unitVector3d(v) {
        var mag = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        return {
            x: v.x / mag,
            y: v.y / mag,
            z: v.z / mag
        };
    }

    // Returns a CSS rotation matrix which rotates by *angle* radians over *axis*.
    // *axis* is an object of the form: { x: number, y: number, z: number }
    function rotationTransform3d(angle, axis) {
        var u = unitVector3d(axis);
        var cos = Math.cos(angle);
        var sin = Math.sin(angle);
        var matrix = [
            cos + u.x * u.x * (1 - cos),
            u.x * u.y * (1 - cos) - u.z * sin,
            u.x * u.z * (1 - cos) + u.y * sin,
            0,

            u.y * u.x * (1 - cos) + u.z * sin,
            cos + u.y * u.y * (1 - cos),
            u.y * u.z * (1 - cos) - u.x * sin,
            0,

            u.z * u.x * (1 - cos) - u.y * sin,
            u.z * u.y * (1 - cos) + u.x * sin,
            cos + u.z * u.z * (1 - cos),
            0,

            0, 0, 0, 1
        ];

        // Scientific notation in transform values breaks the CSS3 values spec.
        matrix = matrix.map(function (value) {
            return value.toFixed(8);
        });
        return "matrix3d(" + matrix.join(",") + ")";
    }

    // Returns a CSS transformation to rotate and shrink an element when it is
    // pressed. The closer the click is to the center of the item, the more it
    // shrinks and the less it rotates.
    // *elementRect* should be of the form returned by getBoundingClientRect. All
    // of the parameters must be relative to the same coordinate system.
    // This function was translated from the Splash implementation.
    function tiltTransform(clickX, clickY, elementRect) {
        // x and y range from 0.0 thru 1.0 inclusive with the origin being at the top left.
        var x = _ElementUtilities._clamp((clickX - elementRect.left) / elementRect.width, 0, 1);
        var y = _ElementUtilities._clamp((clickY - elementRect.top) / elementRect.height, 0, 1);

        // Axis is perpendicular to the line drawn between the click position and the center of the item.
        // We set z to a small value so that even if x and y turn out to be 0, we still have an axis.
        var axis = {
            x: y - 0.5,
            y: -(x - 0.5),
            z: 0.0001
        };

        // The angle of the rotation is larger when the click is farther away from the center.
        var magnitude = Math.abs(x - 0.5) + Math.abs(y - 0.5); // an approximation
        var angle = magnitude * MAX_TILT_ROTATION;

        // The distance the control is pushed into z-space is larger when the click is closer to the center.
        var scale = 1 - (1 - magnitude) * MAX_TILT_SHRINK;

        var transform = "perspective(800px) scale(" + scale + ", " + scale + ") " + rotationTransform3d(angle, axis);

        return transform;
    }

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        // Expose these to the unit tests
        _rotationTransform3d: rotationTransform3d,
        _tiltTransform: tiltTransform,

        _ItemEventsHandler: _Base.Namespace._lazy(function () {
            var PT_TOUCH = _ElementUtilities._MSPointerEvent.MSPOINTER_TYPE_TOUCH || "touch";

            function getElementWithClass(parent, className) {
                return parent.querySelector("." + className);
            }

            function createNodeWithClass(className, skipAriaHidden) {
                var element = _Global.document.createElement("div");
                element.className = className;
                if (!skipAriaHidden) {
                    element.setAttribute("aria-hidden", true);
                }
                return element;
            }

            var ItemEventsHandler =  _Base.Class.define(function ItemEventsHandler_ctor(site) {
                this._site = site;

                this._work = [];
                this._animations = {};
                this._selectionHintTracker = {};
                this._swipeClassTracker = {};

                // The gesture recognizer is used for SRG, which is not supported on Phone
                if (!_BaseUtils.isPhone && this._selectionAllowed()) {
                    var that = this;
                    _Global.setTimeout(function () {
                        if (!that._gestureRecognizer && !site.isZombie()) {
                            that._gestureRecognizer = that._createGestureRecognizer();
                        }
                    }, 500);
                }
            }, {
                dispose: function () {
                    if (this._disposed) {
                        return;
                    }
                    this._disposed = true;
                    this._gestureRecognizer = null;
                    _Global.removeEventListener("pointerup", this._resetPointerDownStateBound);
                    _Global.removeEventListener("pointercancel", this._resetPointerDownStateBound);
                },

                onMSManipulationStateChanged: function ItemEventsHandler_onMSManipulationStateChanged(eventObject) {
                    var state = eventObject.currentState;
                    // We're not necessarily guaranteed to get onMSPointerDown before we get a selection event from cross slide,
                    // so if we hit a select state with no pressed item box recorded, we need to set up the pressed info before
                    // processing the selection.
                    if (state === MSManipulationEventStates.MS_MANIPULATION_STATE_PRESELECT && !this._site.pressedItemBox) {
                        var currentPressedIndex = this._site.indexForItemElement(eventObject.target);

                        this._site.pressedEntity = { type: _UI.ObjectType.item, index: currentPressedIndex };
                        if (this._site.pressedEntity.index !== _Constants._INVALID_INDEX) {
                            this._site.pressedItemBox = this._site.itemBoxAtIndex(this._site.pressedEntity.index);
                            this._site.pressedContainer = this._site.containerAtIndex(this._site.pressedEntity.index);
                            this._site.animatedElement = _BaseUtils.isPhone ? this._site.pressedItemBox : this._site.pressedContainer;
                            this._site.pressedHeader = null;
                            var allowed = this._site.verifySelectionAllowed(this._site.pressedEntity);
                            this._canSelect = allowed.canSelect;
                            this._canTapSelect = allowed.canTapSelect;
                            this._swipeBehaviorSelectionChanged = false;
                            this._selectionHint = null;
                            if (this._canSelect) {
                                this._addSelectionHint();
                            }
                        }
                    }
                    if (this._canSelect && (state === MSManipulationEventStates.MS_MANIPULATION_STATE_PRESELECT ||
                        state === MSManipulationEventStates.MS_MANIPULATION_STATE_COMMITTED ||
                        state === MSManipulationEventStates.MS_MANIPULATION_STATE_CANCELLED ||
                        state === MSManipulationEventStates.MS_MANIPULATION_STATE_SELECTING ||
                        state === MSManipulationEventStates.MS_MANIPULATION_STATE_DRAGGING)) {
                        this._dispatchSwipeBehavior(state);
                    }

                    if (state === MSManipulationEventStates.MS_MANIPULATION_STATE_COMMITTED ||
                        state === MSManipulationEventStates.MS_MANIPULATION_STATE_CANCELLED ||
                        state === MSManipulationEventStates.MS_MANIPULATION_STATE_STOPPED) {
                        this.resetPointerDownState();
                    }
                },

                onPointerDown: function ItemEventsHandler_onPointerDown(eventObject) {
                    _WriteProfilerMark("WinJS.UI._ItemEventsHandler:MSPointerDown,StartTM");
                    var site = this._site,
                        touchInput = (eventObject.pointerType === PT_TOUCH),
                        leftButton,
                        rightButton;
                    site.pressedElement = eventObject.target;
                    if (_WinRT.Windows.UI.Input.PointerPoint) {
                        // xButton is true when you've x-clicked with a mouse or pen. Otherwise it is false.
                        var currentPoint = this._getCurrentPoint(eventObject);
                        var pointProps = currentPoint.properties;
                        if (!(touchInput || pointProps.isInverted || pointProps.isEraser || pointProps.isMiddleButtonPressed)) {
                            rightButton = pointProps.isRightButtonPressed;
                            leftButton = !rightButton && pointProps.isLeftButtonPressed;
                        } else {
                            leftButton = rightButton = false;
                        }
                    } else {
                        // xButton is true when you've x-clicked with a mouse. Otherwise it is false.
                        leftButton = (eventObject.button === _Constants._LEFT_MSPOINTER_BUTTON);
                        rightButton = (eventObject.button === _Constants._RIGHT_MSPOINTER_BUTTON);
                    }

                    this._DragStartBound = this._DragStartBound || this.onDragStart.bind(this);
                    this._PointerEnterBound = this._PointerEnterBound || this.onPointerEnter.bind(this);
                    this._PointerLeaveBound = this._PointerLeaveBound || this.onPointerLeave.bind(this);

                    this._swipeBehaviorState = MSManipulationEventStates.MS_MANIPULATION_STATE_STOPPED;
                    var swipeEnabled = site.swipeBehavior === _UI.SwipeBehavior.select,
                        isInteractive = this._isInteractive(eventObject.target),
                        currentPressedIndex = site.indexForItemElement(eventObject.target),
                        currentPressedHeaderIndex = site.indexForHeaderElement(eventObject.target),
                        mustSetCapture = !isInteractive && currentPressedIndex !== _Constants._INVALID_INDEX;

                    if ((touchInput || leftButton || (this._selectionAllowed() && swipeEnabled && rightButton)) && this._site.pressedEntity.index === _Constants._INVALID_INDEX && !isInteractive) {
                        if (currentPressedHeaderIndex === _Constants._INVALID_INDEX) {
                            this._site.pressedEntity = { type: _UI.ObjectType.item, index: currentPressedIndex };
                        } else {
                            this._site.pressedEntity = { type: _UI.ObjectType.groupHeader, index: currentPressedHeaderIndex };
                        }

                        if (this._site.pressedEntity.index !== _Constants._INVALID_INDEX) {
                            this._site.pressedPosition = _ElementUtilities._getCursorPos(eventObject);

                            var allowed = site.verifySelectionAllowed(this._site.pressedEntity);
                            this._canSelect = allowed.canSelect;
                            this._canTapSelect = allowed.canTapSelect;

                            this._swipeBehaviorSelectionChanged = false;
                            this._selectionHint = null;

                            if (this._site.pressedEntity.type !== _UI.ObjectType.groupHeader) {
                                this._site.pressedItemBox = site.itemBoxAtIndex(this._site.pressedEntity.index);
                                this._site.pressedContainer = site.containerAtIndex(this._site.pressedEntity.index);
                                this._site.animatedElement = _BaseUtils.isPhone ? this._site.pressedItemBox : this._site.pressedContainer;
                                this._site.pressedHeader = null;
                                this._togglePressed(true, false, eventObject);
                                this._site.pressedContainer.addEventListener('dragstart', this._DragStartBound);
                                if (!touchInput) {
                                    // This only works for non touch input because on touch input we set capture which immediately fires the MSPointerOut.
                                    _ElementUtilities._addEventListener(this._site.pressedContainer, 'pointerenter', this._PointerEnterBound, false);
                                    _ElementUtilities._addEventListener(this._site.pressedContainer, 'pointerleave', this._PointerLeaveBound, false);
                                }
                            } else {
                                this._site.pressedHeader = this._site.headerFromElement(eventObject.target);
                                // Interactions with the headers on phone show an animation
                                if (_BaseUtils.isPhone) {
                                    this._site.animatedElement = this._site.pressedHeader;
                                    this._togglePressed(true, false, eventObject);
                                } else {
                                    this._site.pressedItemBox = null;
                                    this._site.pressedContainer = null;
                                    this._site.animatedElement = null;
                                }
                            }

                            if (!this._resetPointerDownStateBound) {
                                this._resetPointerDownStateBound = this._resetPointerDownStateForPointerId.bind(this);
                            }

                            if (!touchInput) {
                                _ElementUtilities._addEventListener(_Global, "pointerup", this._resetPointerDownStateBound, false);
                                _ElementUtilities._addEventListener(_Global, "pointercancel", this._resetPointerDownStateBound, false);
                            }

                            // The gesture recognizer is used for SRG, which is not supported on Phone
                            if (this._canSelect && !_BaseUtils.isPhone) {
                                if (!this._gestureRecognizer) {
                                    this._gestureRecognizer = this._createGestureRecognizer();
                                }
                                this._addSelectionHint();
                            }
                            this._pointerId = eventObject.pointerId;
                            this._pointerRightButton = rightButton;
                            this._pointerTriggeredSRG = false;

                            if (this._gestureRecognizer && touchInput) {
                                try {
                                    this._gestureRecognizer.addPointer(this._pointerId);
                                } catch (e) {
                                    this._gestureRecognizer.stop();
                                }
                            }
                        }
                    }

                    if (mustSetCapture) {
                        if (touchInput) {
                            try {
                                // Move pointer capture to avoid hover visual on second finger
                                _ElementUtilities._setPointerCapture(site.canvasProxy, eventObject.pointerId);
                            } catch (e) {
                                _WriteProfilerMark("WinJS.UI._ItemEventsHandler:MSPointerDown,StopTM");
                                return;
                            }
                        }
                    }

                    // Once the shift selection pivot is set, it remains the same until the user
                    // performs a left- or right-click without holding the shift key down.
                    if (this._site.pressedEntity.type !== _UI.ObjectType.groupHeader &&
                            this._selectionAllowed() && this._multiSelection() &&       // Multi selection enabled
                            this._site.pressedEntity.index !== _Constants._INVALID_INDEX &&    // A valid item was clicked
                            site.selection._getFocused().index !== _Constants._INVALID_INDEX && site.selection._pivot === _Constants._INVALID_INDEX) {
                        site.selection._pivot = site.selection._getFocused().index;
                    }

                    _WriteProfilerMark("WinJS.UI._ItemEventsHandler:MSPointerDown,StopTM");
                },

                onPointerEnter: function ItemEventsHandler_onPointerEnter(eventObject) {
                    if (this._site.pressedContainer && this._pointerId === eventObject.pointerId) {
                        this._togglePressed(true, false, eventObject);
                    }
                },

                onPointerLeave: function ItemEventsHandler_onPointerLeave(eventObject) {
                    if (this._site.pressedContainer && this._pointerId === eventObject.pointerId) {
                        this._togglePressed(false, true /* synchronous */, eventObject);
                    }
                },

                onDragStart: function ItemEventsHandler_onDragStart() {
                    this._resetPressedContainer();
                },

                _resetPressedContainer: function ItemEventsHandler_resetPressedContainer() {
                    if ((this._site.pressedContainer || this._site.pressedHeader) && this._site.animatedElement) {
                        this._togglePressed(false);
                        if (this._site.pressedContainer) {
                            this._site.pressedContainer.removeEventListener('dragstart', this._DragStartBound);
                            _ElementUtilities._removeEventListener(this._site.pressedContainer, 'pointerenter', this._PointerEnterBound, false);
                            _ElementUtilities._removeEventListener(this._site.pressedContainer, 'pointerleave', this._PointerLeaveBound, false);
                        }
                    }
                },

                onClick: function ItemEventsHandler_onClick(eventObject) {
                    if (!this._skipClick) {
                        // Handle the UIA invoke action on an item. this._skipClick is false which tells us that we received a click
                        // event without an associated MSPointerUp event. This means that the click event was triggered thru UIA
                        // rather than thru the GUI.
                        var entity = { type: _UI.ObjectType.item, index: this._site.indexForItemElement(eventObject.target) };
                        if (entity.index === _Constants._INVALID_INDEX) {
                            entity.index = this._site.indexForHeaderElement(eventObject.target);
                            if (entity.index !== _Constants._INVALID_INDEX) {
                                entity.type = _UI.ObjectType.groupHeader;
                            }
                        }

                        if (entity.index !== _Constants._INVALID_INDEX &&
                            (_ElementUtilities.hasClass(eventObject.target, this._site.accessibleItemClass) || _ElementUtilities.hasClass(eventObject.target, _Constants._headerClass))) {
                            var allowed = this._site.verifySelectionAllowed(entity);
                            if (allowed.canTapSelect) {
                                this.handleTap(entity);
                            }
                            this._site.fireInvokeEvent(entity, eventObject.target);
                        }
                    }
                },

                onPointerUp: function ItemEventsHandler_onPointerUp(eventObject) {
                    _WriteProfilerMark("WinJS.UI._ItemEventsHandler:MSPointerUp,StartTM");

                    var site = this._site;
                    this._skipClick = true;
                    var that = this;
                    var swipeEnabled = this._site.swipeBehavior === _UI.SwipeBehavior.select;
                    _BaseUtils._yieldForEvents(function () {
                        that._skipClick = false;
                    });

                    try {
                        // Release the pointer capture to allow in air touch pointers to be reused for multiple interactions
                        _ElementUtilities._releasePointerCapture(site.canvasProxy, eventObject.pointerId);
                    } catch (e) {
                        // This can throw if SeZo had capture or if the pointer was not already captured
                    }

                    var touchInput = (eventObject.pointerType === PT_TOUCH),
                        releasedElement = this._releasedElement(eventObject),
                        releasedIndex = site.indexForItemElement(releasedElement),
                        releasedHeaderIndex = releasedElement && _ElementUtilities.hasClass(releasedElement, _Constants._headerContainerClass) ? site.indexForHeaderElement(site.pressedHeader) : site.indexForHeaderElement(releasedElement);

                    if (this._pointerId === eventObject.pointerId) {
                        var releasedEntity;
                        if (releasedHeaderIndex === _Constants._INVALID_INDEX) {
                            releasedEntity = { type: _UI.ObjectType.item, index: releasedIndex };
                        } else {
                            releasedEntity = { type: _UI.ObjectType.groupHeader, index: releasedHeaderIndex };
                        }

                        this._resetPressedContainer();

                        if (this._site.pressedEntity.type !== _UI.ObjectType.groupHeader && releasedEntity.type !== _UI.ObjectType.groupHeader &&
                                this._site.pressedContainer && this._site.pressedEntity.index === releasedEntity.index) {

                            if (!eventObject.shiftKey) {
                                // Reset the shift selection pivot when the user clicks w/o pressing shift
                                site.selection._pivot = _Constants._INVALID_INDEX;
                            }

                            if (eventObject.shiftKey) {
                                // Shift selection should work when shift or shift+ctrl are depressed for both left- and right-click
                                if (this._selectionAllowed() && this._multiSelection() && site.selection._pivot !== _Constants._INVALID_INDEX) {
                                    var firstIndex = Math.min(this._site.pressedEntity.index, site.selection._pivot),
                                        lastIndex = Math.max(this._site.pressedEntity.index, site.selection._pivot),
                                        additive = (this._pointerRightButton || eventObject.ctrlKey || site.tapBehavior === _UI.TapBehavior.toggleSelect);
                                    site.selectRange(firstIndex, lastIndex, additive);
                                }
                            } else if (eventObject.ctrlKey || (this._selectionAllowed() && swipeEnabled && this._pointerRightButton)) {
                                // Swipe emulation
                                this.handleSwipeBehavior(this._site.pressedEntity.index);
                            }
                        }

                        if ((this._site.pressedHeader || this._site.pressedContainer) && this._swipeBehaviorState !== MSManipulationEventStates.MS_MANIPULATION_STATE_COMMITTED) {
                            var upPosition = _ElementUtilities._getCursorPos(eventObject);
                            var isTap = Math.abs(upPosition.left - this._site.pressedPosition.left) <= _Constants._TAP_END_THRESHOLD &&
                                Math.abs(upPosition.top - this._site.pressedPosition.top) <= _Constants._TAP_END_THRESHOLD;

                            this._endSelfRevealGesture();
                            this._clearItem(this._site.pressedEntity, this._isSelected(this._site.pressedEntity.index));

                            // We do not care whether or not the pressed and released indices are equivalent when the user is using touch. The only time they won't be is if the user
                            // tapped the edge of an item and the pressed animation shrank the item such that the user's finger was no longer over it. In this case, the item should
                            // be considered tapped.
                            // However, if the user is using touch then we must perform an extra check. Sometimes we receive MSPointerUp events when the user intended to pan or swipe.
                            // This extra check ensures that these intended pans/swipes aren't treated as taps.
                            if (!this._pointerRightButton && !this._pointerTriggeredSRG && !eventObject.ctrlKey && !eventObject.shiftKey &&
                                    ((touchInput && isTap) ||
                                    (!touchInput && this._site.pressedEntity.index === releasedEntity.index && this._site.pressedEntity.type === releasedEntity.type))) {
                                if (releasedEntity.type === _UI.ObjectType.groupHeader) {
                                    this._site.pressedHeader = site.headerAtIndex(releasedEntity.index);
                                    this._site.pressedItemBox = null;
                                    this._site.pressedContainer = null;
                                } else {
                                    this._site.pressedItemBox = site.itemBoxAtIndex(releasedEntity.index);
                                    this._site.pressedContainer = site.containerAtIndex(releasedEntity.index);
                                    this._site.pressedHeader = null;
                                }

                                if (this._canTapSelect) {
                                    this.handleTap(this._site.pressedEntity);
                                }
                                this._site.fireInvokeEvent(this._site.pressedEntity, this._site.pressedItemBox || this._site.pressedHeader);
                            }
                        }

                        if (this._site.pressedEntity.index !== _Constants._INVALID_INDEX) {
                            site.changeFocus(this._site.pressedEntity, true, false, true);
                        }

                        this.resetPointerDownState();
                    }

                    _WriteProfilerMark("WinJS.UI._ItemEventsHandler:MSPointerUp,StopTM");
                },

                onPointerCancel: function ItemEventsHandler_onPointerCancel(eventObject) {
                    if (this._pointerId === eventObject.pointerId && this._swipeBehaviorState !== MSManipulationEventStates.MS_MANIPULATION_STATE_PRESELECT) {
                        _WriteProfilerMark("WinJS.UI._ItemEventsHandler:MSPointerCancel,info");
                        this.resetPointerDownState();
                    }
                },

                onLostPointerCapture: function ItemEventsHandler_onLostPointerCapture(eventObject) {
                    if (this._pointerId === eventObject.pointerId && this._swipeBehaviorState !== MSManipulationEventStates.MS_MANIPULATION_STATE_PRESELECT) {
                        _WriteProfilerMark("WinJS.UI._ItemEventsHandler:MSLostPointerCapture,info");
                        this.resetPointerDownState();
                    }
                },

                // In order for the control to play nicely with other UI controls such as the app bar, it calls preventDefault on
                // contextmenu events. It does this only when selection is enabled, the event occurred on or within an item, and
                // the event did not occur on an interactive element.
                onContextMenu: function ItemEventsHandler_onContextMenu(eventObject) {
                    var containerElement = this._site.containerFromElement(eventObject.target);

                    if (this._selectionAllowed() && containerElement && !this._isInteractive(eventObject.target)) {
                        eventObject.preventDefault();
                    }
                },

                onMSHoldVisual: function ItemEventsHandler_onMSHoldVisual(eventObject) {
                    if (!this._isInteractive(eventObject.target)) {
                        eventObject.preventDefault();
                    }
                },

                onDataChanged: function ItemEventsHandler_onDataChanged() {
                    this.resetPointerDownState();
                },

                handleSwipeBehavior: function ItemEventsHandler_handleSwipeBehavior(itemIndex) {
                    if (this._selectionAllowed(itemIndex)) {
                        this._toggleItemSelection(itemIndex);
                    }
                },

                handleTap: function ItemEventsHandler_handleTap(entity) {
                    if (entity.type === _UI.ObjectType.groupHeader) {
                        return;
                    }

                    var site = this._site,
                        selection = site.selection;

                    if (this._selectionAllowed(entity.index) && this._selectOnTap()) {
                        if (site.tapBehavior === _UI.TapBehavior.toggleSelect) {
                            this._toggleItemSelection(entity.index);
                        } else {
                            // site.tapBehavior === _UI.TapBehavior.directSelect so ensure only itemIndex is selected
                            if (site.selectionMode === _UI.SelectionMode.multi || !selection._isIncluded(entity.index)) {
                                selection.set(entity.index);
                            }
                        }
                    }
                },

                // In single selection mode, in addition to itemIndex's selection state being toggled,
                // all other items will become deselected
                _toggleItemSelection: function ItemEventsHandler_toggleItemSelection(itemIndex) {
                    var site = this._site,
                        selection = site.selection,
                        selected = selection._isIncluded(itemIndex);

                    if (site.selectionMode === _UI.SelectionMode.single) {
                        if (!selected) {
                            selection.set(itemIndex);
                        } else {
                            selection.clear();
                        }
                    } else {
                        if (!selected) {
                            selection.add(itemIndex);
                        } else {
                            selection.remove(itemIndex);
                        }
                    }
                },

                _getCurrentPoint: function ItemEventsHandler_getCurrentPoint(eventObject) {
                    return _WinRT.Windows.UI.Input.PointerPoint.getCurrentPoint(eventObject.pointerId);
                },

                _containedInElementWithClass: function ItemEventsHandler_containedInElementWithClass(element, className) {
                    if (element.parentNode) {
                        var matches = element.parentNode.querySelectorAll("." + className + ", ." + className + " *");
                        for (var i = 0, len = matches.length; i < len; i++) {
                            if (matches[i] === element) {
                                return true;
                            }
                        }
                    }
                    return false;
                },

                _isSelected: function ItemEventsHandler_isSelected(index) {
                    return (!this._swipeBehaviorSelectionChanged && this._site.selection._isIncluded(index)) || (this._swipeBehaviorSelectionChanged && this.swipeBehaviorSelected);
                },

                _isInteractive: function ItemEventsHandler_isInteractive(element) {
                    return this._containedInElementWithClass(element, "win-interactive");
                },

                _togglePressed: function ItemEventsHandler_togglePressed(add, synchronous, eventObject) {
                    var that = this;
                    var isHeader = this._site.pressedEntity.type === _UI.ObjectType.groupHeader;

                    this._site.animatedDownPromise && this._site.animatedDownPromise.cancel();

                    if (_BaseUtils.isPhone && !isHeader && _ElementUtilities.hasClass(this._site.pressedItemBox, _Constants._nonSelectableClass)) {
                        return;
                    }

                    if (!this._staticMode(isHeader)) {
                        if (add) {
                            if (!_ElementUtilities.hasClass(this._site.animatedElement, _Constants._pressedClass)) {
                                _WriteProfilerMark("WinJS.UI._ItemEventsHandler:applyPressedUI,info");
                                _ElementUtilities.addClass(this._site.animatedElement, _Constants._pressedClass);

                                if (eventObject && _BaseUtils.isPhone) {
                                    var boundingElement = isHeader ? that._site.pressedHeader : that._site.pressedContainer;
                                    var transform = tiltTransform(eventObject.clientX, eventObject.clientY, boundingElement.getBoundingClientRect());
                                    // Timeout prevents item from looking like it was pressed down during swipes and pans
                                    this._site.animatedDownPromise = Promise.timeout(50).then(function () {
                                        applyDownVisual(transform);
                                    });
                                } else {
                                    // Shrink by 97.5% unless that is larger than 7px in either direction. In that case we cap the
                                    // scale so that it is no larger than 7px in either direction. We keep the scale uniform in both x
                                    // and y directions. Note that this scale cap only works if getItemPosition returns synchronously
                                    // which it does for the built in layouts.
                                    var scale = 0.975;
                                    var maxPixelsToShrink = 7;

                                    this._site.getItemPosition(this._site.pressedEntity).then(function (pos) {
                                        if (pos.contentWidth > 0) {
                                            scale = Math.max(scale, (1 - (maxPixelsToShrink / pos.contentWidth)));
                                        }
                                        if (pos.contentHeight > 0) {
                                            scale = Math.max(scale, (1 - (maxPixelsToShrink / pos.contentHeight)));
                                        }
                                    }, function () {
                                        // Swallow errors in case data source changes
                                    });
                                    applyDownVisual("scale(" + scale + "," + scale + ")");
                                }
                            }
                        } else {
                            if (_ElementUtilities.hasClass(this._site.animatedElement, _Constants._pressedClass)) {
                                var element = this._site.animatedElement;
                                var expectingStyle = this._site.animatedElementScaleTransform;
                                if (synchronous) {
                                    applyUpVisual(element, expectingStyle);
                                } else {
                                    // Force removal of the _pressedClass to be asynchronous so that users will see at
                                    // least one frame of the shrunken item when doing a quick tap.
                                    //
                                    // setImmediate is used rather than requestAnimationFrame to ensure that the item
                                    // doesn't get stuck down for too long -- apps are told to put long running invoke
                                    // code behind a setImmediate and togglePressed's async code needs to run first.
                                    _BaseUtils._setImmediate(function () {
                                        if (_ElementUtilities.hasClass(element, _Constants._pressedClass)) {
                                            applyUpVisual(element, expectingStyle);
                                        }
                                    });
                                }
                            }
                        }
                    }

                    function applyDownVisual(transform) {
                        if (that._site.animatedElement.style[transformNames.scriptName] === "") {
                            that._site.animatedElement.style[transformNames.scriptName] = transform;
                            that._site.animatedElementScaleTransform = that._site.animatedElement.style[transformNames.scriptName];
                        } else {
                            that._site.animatedElementScaleTransform = "";
                        }
                    }

                    function applyUpVisual(element, expectingStyle) {
                        _WriteProfilerMark("WinJS.UI._ItemEventsHandler:removePressedUI,info");
                        _ElementUtilities.removeClass(element, _Constants._pressedClass);
                        if (_BaseUtils.isPhone) {
                            if (that._containsTransform(element, expectingStyle)) {
                                _TransitionAnimation.executeTransition(element, {
                                    property: transformNames.cssName,
                                    delay: 0,
                                    duration: 500,
                                    timing: "cubic-bezier(0.7025,0,0.9225,-0.115)",
                                    to: element.style[transformNames.scriptName].replace(expectingStyle, "")
                                });
                            }
                        } else {
                            that._removeTransform(element, expectingStyle);
                        }
                    }
                },

                _containsTransform: function ItemEventsHandler_containsTransform(element, transform) {
                    return transform && element.style[transformNames.scriptName].indexOf(transform) !== -1;
                },

                _removeTransform: function ItemEventsHandler_removeTransform(element, transform) {
                    if (this._containsTransform(element, transform)) {
                        element.style[transformNames.scriptName] = element.style[transformNames.scriptName].replace(transform, "");
                    }
                },

                _endSwipeBehavior: function ItemEventsHandler_endSwipeBehavior() {
                    if (!(this._swipeBehaviorState === MSManipulationEventStates.MS_MANIPULATION_STATE_PRESELECT ||
                        this._swipeBehaviorState === MSManipulationEventStates.MS_MANIPULATION_STATE_SELECTING ||
                        this._swipeBehaviorState === MSManipulationEventStates.MS_MANIPULATION_STATE_DRAGGING ||
                        this._swipeBehaviorState === MSManipulationEventStates.MS_MANIPULATION_STATE_COMMITTED ||
                        this._swipeBehaviorState === MSManipulationEventStates.MS_MANIPULATION_STATE_CANCELLED)) {
                        return;
                    }

                    if (this._site.pressedEntity.type === _UI.ObjectType.groupHeader) {
                        return;
                    }

                    this._flushUIBatches();
                    var selectionHint = this._selectionHint;
                    this._selectionHint = null;

                    if (this._site.pressedItemBox) {
                        var pressedIndex = this._site.pressedEntity.index,
                            selected = this._site.selection._isIncluded(pressedIndex);
                        if (selected) {
                            var elementsToShowHide = _ElementUtilities._getElementsByClasses(this._site.pressedItemBox, [_Constants._selectionCheckmarkClass, _Constants._selectionCheckmarkBackgroundClass]);
                            for (var i = 0; i < elementsToShowHide.length; i++) {
                                elementsToShowHide[i].style.opacity = 1;
                            }
                        }
                        this._clearItem(this._site.pressedEntity, selected);
                        if (selectionHint) {
                            this._removeSelectionHint(selectionHint);
                        }
                        delete this._animations[pressedIndex];
                    }
                },

                _createGestureRecognizer: function ItemEventsHandler_createGestureRecognizer() {
                    var rootElement = this._site.eventHandlerRoot;
                    var recognizer = _ElementUtilities._createGestureRecognizer();
                    recognizer.target = rootElement;
                    var that = this;
                    rootElement.addEventListener("MSGestureHold", function (eventObject) {
                        if (that._site.pressedEntity.index !== -1 && eventObject.detail === _ElementUtilities._MSGestureEvent.MSGESTURE_FLAG_BEGIN) {
                            that._startSelfRevealGesture();
                        }
                    });
                    return recognizer;
                },

                _dispatchSwipeBehavior: function ItemEventsHandler_dispatchSwipeBehavior(manipulationState) {
                    if (this._site.pressedEntity.type === _UI.ObjectType.groupHeader) {
                        return;
                    }
                    this._site.selection._pivot = _Constants._INVALID_INDEX;
                    if (this._site.pressedItemBox) {
                        var pressedIndex = this._site.pressedEntity.index;
                        if (this._swipeBehaviorState !== manipulationState) {
                            if (manipulationState === MSManipulationEventStates.MS_MANIPULATION_STATE_DRAGGING && this._canSelect) {
                                this._animateSelectionChange(this._site.selection._isIncluded(pressedIndex));
                                this._removeSelectionHint(this._selectionHint);
                            } else if (manipulationState === MSManipulationEventStates.MS_MANIPULATION_STATE_PRESELECT) {
                                _WriteProfilerMark("WinJS.UI._ItemEventsHandler:crossSlidingStarted,info");
                                var site = this._site,
                                    pressedElement = site.itemAtIndex(pressedIndex),
                                    selected = site.selection._isIncluded(pressedIndex);

                                if (this._selfRevealGesture) {
                                    this._selfRevealGesture.finishAnimation();
                                    this._selfRevealGesture = null;
                                } else if (this._canSelect) {
                                    this._prepareItem(this._site.pressedEntity, pressedElement, selected);
                                }

                                if (this._swipeBehaviorState !== MSManipulationEventStates.MS_MANIPULATION_STATE_SELECTING) {
                                    if (this._site.animatedElement && _ElementUtilities.hasClass(this._site.animatedElement, _Constants._pressedClass)) {
                                        this._site.animatedDownPromise && this._site.animatedDownPromise.cancel();
                                        _ElementUtilities.removeClass(this._site.animatedElement, _Constants._pressedClass);
                                        this._removeTransform(this._site.animatedElement, this._site.animatedElementScaleTransform);
                                    }

                                    this._showSelectionHintCheckmark();
                                } else {
                                    this._animateSelectionChange(this._site.selection._isIncluded(pressedIndex));
                                }
                            } else if (manipulationState === MSManipulationEventStates.MS_MANIPULATION_STATE_COMMITTED) {
                                _WriteProfilerMark("WinJS.UI._ItemEventsHandler:crossSlidingCompleted,info");
                                var site = this._site,
                                    selection = site.selection,
                                    swipeBehaviorSelectionChanged = this._swipeBehaviorSelectionChanged,
                                    swipeBehaviorSelected = this.swipeBehaviorSelected;

                                if (this._swipeBehaviorState === MSManipulationEventStates.MS_MANIPULATION_STATE_SELECTING && swipeBehaviorSelectionChanged) {
                                    if (this._selectionAllowed() && site.swipeBehavior === _UI.SwipeBehavior.select) {
                                        if (site.selectionMode === _UI.SelectionMode.single) {
                                            if (swipeBehaviorSelected) {
                                                selection.set(pressedIndex);
                                            } else if (selection._isIncluded(pressedIndex)) {
                                                selection.remove(pressedIndex);
                                            }
                                        } else {
                                            if (swipeBehaviorSelected) {
                                                selection.add(pressedIndex);
                                            } else if (selection._isIncluded(pressedIndex)) {
                                                selection.remove(pressedIndex);
                                            }
                                        }
                                    }
                                }

                                // snap back and remove addional elements
                                this._endSwipeBehavior();
                            } else if (manipulationState === MSManipulationEventStates.MS_MANIPULATION_STATE_SELECTING && this._canSelect) {
                                this._animateSelectionChange(!this._site.selection._isIncluded(pressedIndex));
                            } else if (this._swipeBehaviorState === MSManipulationEventStates.MS_MANIPULATION_STATE_SELECTING && this._canSelect) {
                                this._animateSelectionChange(this._site.selection._isIncluded(pressedIndex), (manipulationState === MSManipulationEventStates.MS_MANIPULATION_STATE_CANCELLED));
                            }
                        }
                    }

                    this._swipeBehaviorState = manipulationState;
                },


                _resetPointerDownStateForPointerId: function ItemEventsHandler_resetPointerDownState(eventObject) {
                    if (this._pointerId === eventObject.pointerId) {
                        this.resetPointerDownState();
                    }
                },

                resetPointerDownState: function ItemEventsHandler_resetPointerDownState() {
                    if (this._gestureRecognizer) {
                        this._endSelfRevealGesture();
                        this._endSwipeBehavior();
                    }
                    this._site.pressedElement = null;
                    _Global.removeEventListener("pointerup", this._resetPointerDownStateBound);
                    _Global.removeEventListener("pointercancel", this._resetPointerDownStateBound);

                    this._resetPressedContainer();

                    this._site.pressedContainer = null;
                    this._site.animatedElement = null;
                    this._site.pressedHeader = null;
                    this._site.pressedItemBox = null;

                    this._removeSelectionHint(this._selectionHint);
                    this._selectionHint = null;

                    this._site.pressedEntity = { type: _UI.ObjectType.item, index: _Constants._INVALID_INDEX };
                    this._pointerId = null;
                },

                // Play the self-reveal gesture (SRG) animation which jiggles the item to reveal the selection hint behind it.
                // This function is overridden by internal teams to add a tooltip on SRG start - treat this function as a public API for the sake of function name/parameter changes.
                _startSelfRevealGesture: function ItemEventsHandler_startSelfRevealGesture() {
                    if (this._canSelect && this._site.swipeBehavior === _UI.SwipeBehavior.select) {
                        _WriteProfilerMark("WinJS.UI._ItemEventsHandler:playSelfRevealGesture,info");

                        var that = this;
                        var site = this._site,
                            index = this._site.pressedEntity.index,
                            itemBox = site.itemBoxAtIndex(index),
                            selected = site.selection._isIncluded(index),
                            finished = false;

                        var swipeReveal = function () {
                            var top,
                                left;

                            if (site.horizontal) {
                                top = _Constants._VERTICAL_SWIPE_SELF_REVEAL_GESTURE + "px";
                                left = "0px";
                            } else {
                                top = "0px";
                                left = (site.rtl() ? "" : "-") + _Constants._HORIZONTAL_SWIPE_SELF_REVEAL_GESTURE + "px";
                            }

                            return Animations.swipeReveal(itemBox, { top: top, left: left });
                        };

                        var swipeHide = function () {
                            return finished ? Promise.wrap() : Animations.swipeReveal(itemBox, { top: "0px", left: "0px" });
                        };

                        var cleanUp = function (selectionHint) {
                            if (!site.isZombie()) {
                                if (selectionHint) {
                                    that._removeSelectionHint(selectionHint);
                                }
                                that._clearItem(site.pressedEntity, site.selection._isIncluded(index));
                            }
                        };

                        // Immediately begins the last phase of the SRG animation which animates the item back to its original location
                        var finishAnimation = function () {
                            that._selfRevealGesture._promise.cancel();
                            finished = true;
                            var selectionHint = that._selectionHint;
                            that._selectionHint = null;
                            return swipeHide().then(function () {
                                itemBox.style[transformNames.scriptName] = "";
                                cleanUp(selectionHint);
                            });
                        };

                        this._prepareItem(this._site.pressedEntity, itemBox, selected);
                        this._showSelectionHintCheckmark();

                        this._pointerTriggeredSRG = true;
                        this._selfRevealGesture = {
                            finishAnimation: finishAnimation,
                            _promise: swipeReveal().
                                then(swipeHide).
                                then(function () {
                                    if (!finished) {
                                        that._hideSelectionHintCheckmark();
                                        cleanUp();
                                        that._selfRevealGesture = null;
                                    }
                                })
                        };
                    }
                },

                // This function is overridden by internal teams to remove a tooltip on SRG completion - treat this function as a public API for the sake of function name/parameter changes
                _endSelfRevealGesture: function ItemEventsHandler_endSelfRevealGesture() {
                    if (this._selfRevealGesture) {
                        this._selfRevealGesture.finishAnimation();
                        this._selfRevealGesture = null;
                    }
                },

                _prepareItem: function ItemEventsHandler_prepareItem(pressedEntity, pressedElement, selected) {
                    if (pressedEntity.type === _UI.ObjectType.groupHeader) {
                        return;
                    }

                    var that = this,
                        site = this._site,
                        pressedIndex = pressedEntity.index;

                    function addSwipeClass(container) {
                        if (!that._swipeClassTracker[uniqueID(container)]) {
                            _ElementUtilities.addClass(container, _Constants._swipeClass);
                            that._swipeClassTracker[uniqueID(container)] = 1;
                        } else {
                            that._swipeClassTracker[uniqueID(container)]++;
                        }
                    }

                    if (!selected) {
                        (this._animations[pressedIndex] || Promise.wrap()).then(function () {
                            if (!site.isZombie() && pressedEntity.type !== _UI.ObjectType.groupHeader && site.pressedEntity.index !== -1) {
                                pressedIndex = site.pressedEntity.index;

                                var pressedElement = site.itemAtIndex(pressedIndex),
                                    itemBox = site.itemBoxAtIndex(pressedIndex),
                                    container = site.containerAtIndex(pressedIndex);

                                addSwipeClass(container);

                                if (!_ElementUtilities._isSelectionRendered(itemBox)) {
                                    ItemEventsHandler.renderSelection(itemBox, pressedElement, true, container);

                                    _ElementUtilities.removeClass(itemBox, _Constants._selectedClass);
                                    _ElementUtilities.removeClass(container, _Constants._selectedClass);

                                    var nodes = itemBox.querySelectorAll(_ElementUtilities._selectionPartsSelector);
                                    for (var i = 0, len = nodes.length; i < len; i++) {
                                        nodes[i].style.opacity = 0;
                                    }
                                }
                            }
                        });
                    } else {
                        var container = site.containerAtIndex(pressedIndex);
                        addSwipeClass(container);
                    }
                },

                _clearItem: function ItemEventsHandler_clearItem(pressedEntity, selected) {
                    if (pressedEntity.type !== _UI.ObjectType.item) {
                        return;
                    }

                    var that = this,
                        site = this._site,
                        container = site.containerAtIndex(pressedEntity.index),
                        itemBox = site.itemBoxAtIndex(pressedEntity.index),
                        element = site.itemAtIndex(pressedEntity.index);

                    function removeSwipeClass(container) {
                        var refCount = --that._swipeClassTracker[uniqueID(container)];
                        if (!refCount) {
                            delete that._swipeClassTracker[uniqueID(container)];
                            _ElementUtilities.removeClass(container, _Constants._swipeClass);
                            return true;
                        }
                        return false;
                    }

                    function removeSwipeFromItemsBlock(container) {
                        var itemsBlock = container.parentNode;
                        if (itemsBlock && _ElementUtilities.hasClass(itemsBlock, _Constants._itemsBlockClass)) {
                            removeSwipeClass(itemsBlock);
                        }
                    }

                    if (container && itemBox && element) {
                        var doneSwiping = removeSwipeClass(container);
                        removeSwipeFromItemsBlock(container);
                        if (doneSwiping) {
                            ItemEventsHandler.renderSelection(itemBox, element, selected, true, container);
                        }
                    }
                },

                _animateSelectionChange: function ItemEventsHandler_animateSelectionChange(select, includeCheckmark) {
                    var that = this,
                        pressedContainer = this._site.pressedContainer,
                        pressedItemBox = this._site.pressedItemBox;

                    function toggleClasses() {
                        var classOperation = select ? "addClass" : "removeClass";
                        _ElementUtilities[classOperation](pressedItemBox, _Constants._selectedClass);
                        _ElementUtilities[classOperation](pressedContainer, _Constants._selectedClass);
                        if (that._selectionHint) {
                            var hintCheckMark = getElementWithClass(that._selectionHint, _Constants._selectionHintClass);
                            if (hintCheckMark) {
                                _ElementUtilities[classOperation](hintCheckMark, _Constants._revealedClass);
                            }
                        }
                    }

                    this._swipeBehaviorSelectionChanged = true;
                    this.swipeBehaviorSelected = select;

                    var elementsToShowHide = _ElementUtilities._getElementsByClasses(this._site.pressedItemBox, [_Constants._selectionBorderClass, _Constants._selectionBackgroundClass]);

                    if (!select || includeCheckmark) {
                        elementsToShowHide = elementsToShowHide.concat(_ElementUtilities._getElementsByClasses(this._site.pressedItemBox, [_Constants._selectionCheckmarkBackgroundClass, _Constants._selectionCheckmarkClass]));
                    }

                    _WriteProfilerMark("WinJS.UI._ItemEventsHandler:" + (select ? "hitSelectThreshold" : "hitUnselectThreshold") + ",info");

                    this._applyUIInBatches(function () {
                        _WriteProfilerMark("WinJS.UI._ItemEventsHandler:" + (select ? "apply" : "remove") + "SelectionVisual,info");
                        var opacity = (select ? 1 : 0);
                        for (var i = 0; i < elementsToShowHide.length; i++) {
                            elementsToShowHide[i].style.opacity = opacity;
                        }

                        toggleClasses();
                    });
                },

                _showSelectionHintCheckmark: function ItemEventsHandler_showSelectionHintCheckmark() {
                    if (this._selectionHint) {
                        var hintCheckMark = getElementWithClass(this._selectionHint, _Constants._selectionHintClass);
                        if (hintCheckMark) {
                            hintCheckMark.style.display = 'block';
                        }
                    }
                },

                _hideSelectionHintCheckmark: function ItemEventsHandler_hideSelectionHintCheckmark() {
                    if (this._selectionHint) {
                        var hintCheckMark = getElementWithClass(this._selectionHint, _Constants._selectionHintClass);
                        if (hintCheckMark) {
                            hintCheckMark.style.display = 'none';
                        }
                    }
                },

                _addSelectionHint: function ItemEventsHandler_addSelectionHint() {
                    if (this._site.pressedEntity.type === _UI.ObjectType.groupHeader) {
                        return;
                    }

                    var selectionHint,
                        site = this._site;

                    if (site.customFootprintParent) {
                        selectionHint = this._selectionHint = _Global.document.createElement("div");
                        selectionHint.className = _Constants._containerClass;

                        var that = this;
                        site.getItemPosition(this._site.pressedEntity).then(function (pos) {
                            if (!site.isZombie() && that._selectionHint && that._selectionHint === selectionHint) {
                                var style = selectionHint.style;
                                var cssText = ";position:absolute;" +
                                    (site.rtl() ? "right:" : "left:") + pos.left + "px;top:" +
                                    pos.top + "px;width:" + pos.contentWidth + "px;height:" + pos.contentHeight + "px";
                                style.cssText += cssText;
                                site.customFootprintParent.insertBefore(that._selectionHint, that._site.pressedItemBox);
                            }
                        }, function () {
                            // Swallow errors in case data source changes
                        });
                    } else {
                        selectionHint = this._selectionHint = this._site.pressedContainer;
                    }

                    if (!this._selectionHintTracker[uniqueID(selectionHint)]) {
                        _ElementUtilities.addClass(selectionHint, _Constants._footprintClass);

                        if (!site.selection._isIncluded(this._site.pressedEntity.index)) {
                            var element = _Global.document.createElement("div");
                            element.className = _Constants._selectionHintClass;
                            element.textContent = _Constants._SELECTION_CHECKMARK;
                            element.style.display = 'none';
                            this._selectionHint.insertBefore(element, this._selectionHint.firstElementChild);
                        }

                        this._selectionHintTracker[uniqueID(selectionHint)] = 1;
                    } else {
                        this._selectionHintTracker[uniqueID(selectionHint)]++;
                    }
                },

                _removeSelectionHint: function ItemEventsHandler_removeSelectionHint(selectionHint) {
                    if (selectionHint) {
                        var refCount = --this._selectionHintTracker[uniqueID(selectionHint)];
                        if (!refCount) {
                            delete this._selectionHintTracker[uniqueID(selectionHint)];

                            if (!this._site.customFootprintParent) {
                                _ElementUtilities.removeClass(selectionHint, _Constants._footprintClass);
                                var hintCheckMark = getElementWithClass(selectionHint, _Constants._selectionHintClass);
                                if (hintCheckMark) {
                                    hintCheckMark.parentNode.removeChild(hintCheckMark);
                                }
                            } else if (selectionHint.parentNode) {
                                selectionHint.parentNode.removeChild(selectionHint);
                            }
                        }
                    }
                },

                _releasedElement: function ItemEventsHandler_releasedElement(eventObject) {
                    return _Global.document.elementFromPoint(eventObject.clientX, eventObject.clientY);
                },

                _applyUIInBatches: function ItemEventsHandler_applyUIInBatches(work) {
                    var that = this;
                    this._work.push(work);

                    if (!this._paintedThisFrame) {
                        applyUI();
                    }

                    function applyUI() {
                        if (that._work.length > 0) {
                            that._flushUIBatches();
                            that._paintedThisFrame = _Global.requestAnimationFrame(applyUI.bind(that));
                        } else {
                            that._paintedThisFrame = null;
                        }
                    }
                },

                _flushUIBatches: function ItemEventsHandler_flushUIBatches() {
                    if (this._work.length > 0) {
                        var workItems = this._work;
                        this._work = [];

                        for (var i = 0; i < workItems.length; i++) {
                            workItems[i]();
                        }
                    }
                },

                _selectionAllowed: function ItemEventsHandler_selectionAllowed(itemIndex) {
                    var item = (itemIndex !== undefined ? this._site.itemAtIndex(itemIndex) : null),
                        itemSelectable = !(item && _ElementUtilities.hasClass(item, _Constants._nonSelectableClass));
                    return itemSelectable && this._site.selectionMode !== _UI.SelectionMode.none;
                },

                _multiSelection: function ItemEventsHandler_multiSelection() {
                    return this._site.selectionMode === _UI.SelectionMode.multi;
                },

                _selectOnTap: function ItemEventsHandler_selectOnTap() {
                    return this._site.tapBehavior === _UI.TapBehavior.toggleSelect || this._site.tapBehavior === _UI.TapBehavior.directSelect;
                },

                _staticMode: function ItemEventsHandler_staticMode(isHeader) {
                    if (isHeader) {
                        return this._site.headerTapBehavior === _UI.GroupHeaderTapBehavior.none;
                    } else {
                        return this._site.tapBehavior === _UI.TapBehavior.none && this._site.selectionMode === _UI.SelectionMode.none;
                    }
                },
            }, {
                // Avoids unnecessary UIA selection events by only updating aria-selected if it has changed
                setAriaSelected: function ItemEventsHandler_setAriaSelected(itemElement, isSelected) {
                    var ariaSelected = (itemElement.getAttribute("aria-selected") === "true");

                    if (isSelected !== ariaSelected) {
                        itemElement.setAttribute("aria-selected", isSelected);
                    }
                },

                renderSelection: function ItemEventsHandler_renderSelection(itemBox, element, selected, aria, container) {
                    if (!ItemEventsHandler._selectionTemplate) {
                        ItemEventsHandler._selectionTemplate = [];
                        ItemEventsHandler._selectionTemplate.push(createNodeWithClass(_Constants._selectionBackgroundClass));
                        ItemEventsHandler._selectionTemplate.push(createNodeWithClass(_Constants._selectionBorderClass));
                        ItemEventsHandler._selectionTemplate.push(createNodeWithClass(_Constants._selectionCheckmarkBackgroundClass));
                        var checkmark = createNodeWithClass(_Constants._selectionCheckmarkClass);
                        checkmark.textContent = _Constants._SELECTION_CHECKMARK;
                        ItemEventsHandler._selectionTemplate.push(checkmark);
                    }

                    // Update the selection rendering if necessary
                    if (selected !== _ElementUtilities._isSelectionRendered(itemBox)) {
                        if (selected) {
                            itemBox.insertBefore(ItemEventsHandler._selectionTemplate[0].cloneNode(true), itemBox.firstElementChild);

                            for (var i = 1, len = ItemEventsHandler._selectionTemplate.length; i < len; i++) {
                                itemBox.appendChild(ItemEventsHandler._selectionTemplate[i].cloneNode(true));
                            }
                        } else {
                            var nodes = itemBox.querySelectorAll(_ElementUtilities._selectionPartsSelector);
                            for (var i = 0, len = nodes.length; i < len; i++) {
                                itemBox.removeChild(nodes[i]);
                            }
                        }

                        _ElementUtilities[selected ? "addClass" : "removeClass"](itemBox, _Constants._selectedClass);
                        if (container) {
                            _ElementUtilities[selected ? "addClass" : "removeClass"](container, _Constants._selectedClass);
                        }
                    }

                    // To allow itemPropertyChange to work properly, aria needs to be updated after the selection visuals are added to the itemBox
                    if (aria) {
                        ItemEventsHandler.setAriaSelected(element, selected);
                    }
                },
            });

            return ItemEventsHandler;
        })

    });

});
// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Controls/ItemContainer',[
    'exports',
    '../Core/_Global',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_ErrorFromName',
    '../Core/_Events',
    '../Core/_Log',
    '../Core/_Resources',
    '../Core/_WriteProfilerMark',
    '../Promise',
    '../Scheduler',
    '../Utilities/_Control',
    '../Utilities/_Dispose',
    '../Utilities/_ElementUtilities',
    '../Utilities/_KeyboardBehavior',
    '../Utilities/_UI',
    './ItemContainer/_Constants',
    './ItemContainer/_ItemEventsHandler'
    ], function itemContainerInit(exports, _Global, _Base, _BaseUtils, _ErrorFromName, _Events, _Log, _Resources, _WriteProfilerMark, Promise, Scheduler, _Control, _Dispose, _ElementUtilities, _KeyboardBehavior, _UI, _Constants, _ItemEventsHandler) {
    "use strict";

    var createEvent = _Events._createEventProperty;
    var eventNames = {
        invoked: "invoked",
        selectionchanging: "selectionchanging",
        selectionchanged: "selectionchanged"
    };

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.ItemContainer">
        /// Defines an item that can be pressed, swiped, and dragged. 
        /// </summary>
        /// </field>
        /// <icon src="ui_winjs.ui.itemcontainer.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.itemcontainer.16x16.png" width="16" height="16" />
        /// <htmlSnippet supportsContent="true"><![CDATA[
        /// <div data-win-control="WinJS.UI.ItemContainer" data-win-options="{swipeBehavior: 'select'}">HTML content</div>
        /// ]]></htmlSnippet>
        /// <event name="invoked" bubbles="true" locid="WinJS.UI.ItemContainer_e:invoked">Raised when the user taps or clicks the item.</event>
        /// <event name="selectionchanging" bubbles="true" locid="WinJS.UI.ItemContainer_e:selectionchanging">Raised before the item is selected or deselected.</event>
        /// <event name="selectionchanged" bubbles="true" locid="WinJS.UI.ItemContainer_e:selectionchanged">Raised after the item is selected or deselected.</event>
        /// <part name="itemcontainer" class="win-itemcontainer" locid="WinJS.UI.ItemContainer_part:itemcontainer">Main container for the selection item control.</part>
        /// <part name="selectionbackground" class="win-selectionbackground" locid="WinJS.UI.ItemContainer_part:selectionbackground">The background of a selection checkmark.</part>
        /// <part name="selectioncheckmark" class="win-selectioncheckmark" locid="WinJS.UI.ItemContainer_part:selectioncheckmark">A selection checkmark.</part>
        /// <part name="focusedoutline" class="win-focusedoutline" locid="WinJS.UI.ItemContainer_part:focusedoutline">Used to display an outline when the main container has keyboard focus.</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        ItemContainer: _Base.Namespace._lazy(function () {
            var strings = {
                get duplicateConstruction() { return _Resources._getWinJSString("ui/duplicateConstruction").value; }
            };

            var ItemContainer = _Base.Class.define(function ItemContainer_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.ItemContainer.ItemContainer">
                /// <summary locid="WinJS.UI.ItemContainer.constructor">
                /// Creates a new ItemContainer control.
                /// </summary>
                /// <param name="element" type="HTMLElement" domElement="true" isOptional="true" locid="WinJS.UI.ItemContainer.constructor_p:element">
                /// The DOM element that hosts the ItemContainer control.
                /// </param>
                /// <param name="options" type="Object" isOptional="true" locid="WinJS.UI.ItemContainer.constructor_p:options">
                /// An object that contains one or more property/value pairs to apply to the new control.
                /// Each property of the options object corresponds to one of the control's properties or events.
                /// Event names must begin with "on". For example, to provide a handler for the selectionchanging event,
                /// add a property named "onselectionchanging" to the options object and set its value to the event handler.
                /// </param>
                /// <returns type="WinJS.UI.ItemContainer" locid="WinJS.UI.ItemContainer.constructor_returnValue">
                /// The new ItemContainer control.
                /// </returns>
                /// </signature>
                element = element || _Global.document.createElement("DIV");
                this._id = element.id || _ElementUtilities._uniqueID(element);
                this._writeProfilerMark("constructor,StartTM");

                options = options || {};

                if (element.winControl) {
                    throw new _ErrorFromName("WinJS.UI.ItemContainer.DuplicateConstruction", strings.duplicateConstruction);
                }

                // Attaching JS control to DOM element
                element.winControl = this;

                this._element = element;
                _ElementUtilities.addClass(element, "win-disposable");
                this._selectionMode = _UI.SelectionMode.single;
                this._draggable = false;
                this._pressedEntity = { type: _UI.ObjectType.item, index: _Constants._INVALID_INDEX };

                this.tapBehavior = _UI.TapBehavior.invokeOnly;
                this.swipeOrientation = _UI.Orientation.vertical;
                this.swipeBehavior = _UI.SwipeBehavior.select;

                _ElementUtilities.addClass(this.element, ItemContainer._ClassName.itemContainer + " " + _Constants._containerClass);

                this._setupInternalTree();

                this._selection = new exports._SingleItemSelectionManager(element, this._itemBox);
                this._setTabIndex();

                _Control.setOptions(this, options);

                this._mutationObserver = new _ElementUtilities._MutationObserver(this._itemPropertyChange.bind(this));
                this._mutationObserver.observe(element, { attributes: true, attributeFilter: ["aria-selected"] });
                this._setAriaRole();

                var that = this;
                if (!this.selectionDisabled) {
                    Scheduler.schedule(function ItemContainer_async_initialize() {
                        that._setDirectionClass();
                    }, Scheduler.Priority.normal, null, "WinJS.UI.ItemContainer_async_initialize");
                }
                this._itemEventsHandler = new _ItemEventsHandler._ItemEventsHandler(Object.create({
                    containerFromElement: function () {
                        return that.element;
                    },
                    indexForItemElement: function () {
                        return 1;
                    },
                    indexForHeaderElement: function () {
                        return _Constants._INVALID_INDEX;
                    },
                    itemBoxAtIndex: function () {
                        return that._itemBox;
                    },
                    itemAtIndex: function () {
                        return that.element;
                    },
                    headerAtIndex: function () {
                        return null;
                    },
                    containerAtIndex: function () {
                        return that.element;
                    },
                    isZombie: function () {
                        return this._disposed;
                    },
                    getItemPosition: function () {
                        return that._getItemPosition();
                    },
                    rtl: function () {
                        return that._rtl();
                    },
                    fireInvokeEvent: function () {
                        that._fireInvokeEvent();
                    },
                    verifySelectionAllowed: function () {
                        return that._verifySelectionAllowed();
                    },
                    changeFocus: function () { },
                    selectRange: function (firstIndex, lastIndex) {
                        return that._selection.set({ firstIndex: firstIndex, lastIndex: lastIndex });
                    }
                }, {
                    pressedEntity: {
                        get: function () {
                            return that._pressedEntity;
                        },
                        set: function (value) {
                            that._pressedEntity = value;
                        }
                    },
                    pressedElement: {
                        enumerable: true,
                        set: function (value) {
                            that._pressedElement = value;
                        }
                    },
                    eventHandlerRoot: {
                        enumerable: true,
                        get: function () {
                            return that.element;
                        }
                    },
                    swipeBehavior: {
                        enumerable: true,
                        get: function () {
                            return that._swipeBehavior;
                        }
                    },
                    selectionMode: {
                        enumerable: true,
                        get: function () {
                            return that._selectionMode;
                        }
                    },
                    accessibleItemClass: {
                        enumerable: true,
                        get: function () {
                            // CSS class of the element with the aria role
                            return _Constants._containerClass;
                        }
                    },
                    canvasProxy: {
                        enumerable: true,
                        get: function () {
                            return that._captureProxy;
                        }
                    },
                    tapBehavior: {
                        enumerable: true,
                        get: function () {
                            return that._tapBehavior;
                        }
                    },
                    draggable: {
                        enumerable: true,
                        get: function () {
                            return that._draggable;
                        }
                    },
                    selection: {
                        enumerable: true,
                        get: function () {
                            return that._selection;
                        }
                    },
                    horizontal: {
                        enumerable: true,
                        get: function () {
                            return that._swipeOrientation === _UI.Orientation.vertical;
                        }
                    },
                    customFootprintParent: {
                        enumerable: true,
                        get: function () {
                            // Use the main container as the footprint
                            return null;
                        }
                    },
                    skipPreventDefaultOnPointerDown: {
                        enumerable: true,
                        get: function () {
                            return true;
                        }
                    }
                }));

                function eventHandler(eventName, caseSensitive, capture) {
                    return {
                        name: (caseSensitive ? eventName : eventName.toLowerCase()),
                        handler: function (eventObject) {
                            that["_on" + eventName](eventObject);
                        },
                        capture: capture
                    };
                }
                var events = [
                    eventHandler("MSManipulationStateChanged", true, true),
                    eventHandler("PointerDown"),
                    eventHandler("Click"),
                    eventHandler("PointerUp"),
                    eventHandler("PointerCancel"),
                    eventHandler("LostPointerCapture"),
                    eventHandler("ContextMenu"),
                    eventHandler("MSHoldVisual", true),
                    eventHandler("FocusIn"),
                    eventHandler("FocusOut"),
                    eventHandler("DragStart"),
                    eventHandler("DragEnd"),
                    eventHandler("KeyDown")
                ];
                events.forEach(function (eventHandler) {
                    _ElementUtilities._addEventListener(that.element, eventHandler.name, eventHandler.handler, !!eventHandler.capture);
                });

                this._writeProfilerMark("constructor,StopTM");
            }, {
                /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.ItemContainer.element" helpKeyword="WinJS.UI.ItemContainer.element">
                /// Gets the DOM element that hosts the itemContainer control.
                /// </field>
                element: {
                    get: function () {
                        return this._element;
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.ItemContainer.draggable" helpKeyword="WinJS.UI.ItemContainer.draggable">
                /// Gets or sets a value that specifies whether the item can be dragged. The default value is false. 
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                draggable: {
                    get: function () {
                        return this._draggable;
                    },

                    set: function (value) {
                        if (_BaseUtils.isPhone) {
                            return;
                        }
                        if (this._draggable !== value) {
                            this._draggable = value;
                            this._updateDraggableAttribute();
                        }
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.ItemContainer.selected" helpKeyword="WinJS.UI.ItemContainer.selected">
                /// Gets or sets a value that specifies whether the item is selected.
                /// </field>
                selected: {
                    get: function () {
                        return this._selection.selected;
                    },

                    set: function (value) {
                        if (this._selection.selected !== value) {
                            this._selection.selected = value;
                        }
                    }
                },

                /// <field type="String" oamOptionsDatatype="WinJS.UI.Orientation" locid="WinJS.UI.ItemContainer.swipeOrientation" helpKeyword="WinJS.UI.ItemContainer.swipeOrientation">
                /// Gets or sets the swipe orientation of the ItemContainer control.
                /// The default value is "vertical".
                /// </field>
                swipeOrientation: {
                    get: function () {
                        return this._swipeOrientation;
                    },
                    set: function (value) {
                        if (value === _UI.Orientation.vertical) {
                            _ElementUtilities.removeClass(this.element, ItemContainer._ClassName.horizontal);
                            _ElementUtilities.addClass(this.element, ItemContainer._ClassName.vertical);
                        } else {
                            value = _UI.Orientation.horizontal;
                            _ElementUtilities.removeClass(this.element, ItemContainer._ClassName.vertical);
                            _ElementUtilities.addClass(this.element, ItemContainer._ClassName.horizontal);
                        }
                        this._swipeOrientation = value;
                    }
                },

                /// <field type="String" oamOptionsDatatype="WinJS.UI.TapBehavior" locid="WinJS.UI.ItemContainer.tapBehavior" helpKeyword="WinJS.UI.ItemContainer.tapBehavior">
                /// Gets or sets how the ItemContainer control reacts when the user taps or clicks an item.
                /// The tap or click can invoke the item, select it and invoke it, or have no effect. 
                /// Possible values: "toggleSelect", "invokeOnly", and "none". The default value is "invokeOnly".
                /// </field>
                tapBehavior: {
                    get: function () {
                        return this._tapBehavior;
                    },
                    set: function (value) {
                        if (_BaseUtils.isPhone && value === _UI.TapBehavior.directSelect) {
                            return;
                        }
                        this._tapBehavior = value;
                        this._setAriaRole();
                    }
                },

                /// <field type="String" oamOptionsDatatype="WinJS.UI.SwipeBehavior" locid="WinJS.UI.ItemContainer.swipeBehavior" helpKeyword="WinJS.UI.ItemContainer.swipeBehavior">
                /// Gets or sets how the ItemContainer control reacts to the swipe interaction.
                /// The swipe gesture can select the item or it can have no effect on the current selection.
                /// Possible values: "select", "none". The default value is: "select".
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                swipeBehavior: {
                    get: function () {
                        return this._swipeBehavior;
                    },
                    set: function (value) {
                        this._swipeBehavior = value;
                        this._setSwipeClass();
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.ItemContainer.selectionDisabled" helpKeyword="WinJS.UI.ItemContainer.selectionDisabled">
                /// Gets or sets whether the item selection is disabled. The default value is false. 
                /// </field>
                selectionDisabled: {
                    get: function () {
                        return this._selectionMode === _UI.SelectionMode.none;
                    },

                    set: function (value) {
                        if (value) {
                            this._selectionMode = _UI.SelectionMode.none;
                        } else {
                            this._setDirectionClass();
                            this._selectionMode = _UI.SelectionMode.single;
                        }
                        this._setSwipeClass();
                        this._setAriaRole();
                    }
                },

                /// <field type="Function" locid="WinJS.UI.ItemCotrol.oninvoked" helpKeyword="WinJS.UI.ItemCotrol.oninvoked">
                /// Raised when the item is invoked. You can use the tapBehavior property to specify whether taps and clicks invoke the item. 
                /// </field>
                oninvoked: createEvent(eventNames.invoked),

                /// <field type="Function" locid="WinJS.UI.ItemCotrol.onselectionchanging" helpKeyword="WinJS.UI.ItemCotrol.onselectionchanging">
                /// Raised just before the item is selected or deselected.
                /// </field>
                onselectionchanging: createEvent(eventNames.selectionchanging),

                /// <field type="Function" locid="WinJS.UI.ItemCotrol.onselectionchanged" helpKeyword="WinJS.UI.ItemCotrol.onselectionchanged">
                /// Raised after the item is selected or deselected.
                /// </field>
                onselectionchanged: createEvent(eventNames.selectionchanged),

                forceLayout: function () {
                    /// <signature helpKeyword="WinJS.UI.ItemContainer.forceLayout">
                    /// <summary locid="WinJS.UI.ItemContainer.forceLayout">
                    /// Forces the ItemContainer control to update its layout.
                    /// Use this function when the reading direction  of the app changes after the control has been initialized.
                    /// </summary>
                    /// </signature>
                    this._forceLayout();
                },

                dispose: function () {
                    /// <signature helpKeyword="WinJS.UI.ItemContainer.dispose">
                    /// <summary locid="WinJS.UI.ItemContainer.dispose">
                    /// Disposes this control.
                    /// </summary>
                    /// </signature>

                    if (this._disposed) {
                        return;
                    }
                    this._disposed = true;

                    this._itemEventsHandler.dispose();
                    _Dispose.disposeSubTree(this.element);
                },

                _onMSManipulationStateChanged: function ItemContainer_onMSManipulationStateChanged(eventObject) {
                    this._itemEventsHandler.onMSManipulationStateChanged(eventObject);
                },

                _onPointerDown: function ItemContainer_onPointerDown(eventObject) {
                    this._itemEventsHandler.onPointerDown(eventObject);
                },

                _onClick: function ItemContainer_onClick(eventObject) {
                    this._itemEventsHandler.onClick(eventObject);
                },

                _onPointerUp: function ItemContainer_onPointerUp(eventObject) {
                    if (_ElementUtilities.hasClass(this._itemBox, _Constants._itemFocusClass)) {
                        this._onFocusOut(eventObject);
                    }
                    this._itemEventsHandler.onPointerUp(eventObject);
                },

                _onPointerCancel: function ItemContainer_onPointerCancel(eventObject) {
                    this._itemEventsHandler.onPointerCancel(eventObject);
                },

                _onLostPointerCapture: function ItemContainer_onLostPointerCapture(eventObject) {
                    this._itemEventsHandler.onLostPointerCapture(eventObject);
                },

                _onContextMenu: function ItemContainer_onContextMenu(eventObject) {
                    this._itemEventsHandler.onContextMenu(eventObject);
                },

                _onMSHoldVisual: function ItemContainer_onMSHoldVisual(eventObject) {
                    this._itemEventsHandler.onMSHoldVisual(eventObject);
                },

                _onFocusIn: function ItemContainer_onFocusIn() {
                    if (this._itemBox.querySelector("." + _Constants._itemFocusOutlineClass) || !_KeyboardBehavior._keyboardSeenLast) {
                        return;
                    }
                    _ElementUtilities.addClass(this._itemBox, _Constants._itemFocusClass);
                    var outline = _Global.document.createElement("div");
                    outline.className = _Constants._itemFocusOutlineClass;
                    this._itemBox.appendChild(outline);
                },

                _onFocusOut: function ItemContainer_onFocusOut() {
                    _ElementUtilities.removeClass(this._itemBox, _Constants._itemFocusClass);
                    var outline = this._itemBox.querySelector("." + _Constants._itemFocusOutlineClass);
                    if (outline) {
                        outline.parentNode.removeChild(outline);
                    }
                },

                _onDragStart: function ItemContainer_onDragStart(eventObject) {
                    // Drag shouldn't be initiated when the user holds down the mouse on a win-interactive element and moves.
                    // The problem is that the dragstart event's srcElement+target will both be an itembox (which has draggable=true), so we can't check for win-interactive in the dragstart event handler.
                    // The itemEventsHandler sets our _pressedElement field on PointerDown, so we use that instead when checking for interactive.
                    if (this._pressedElement && this._itemEventsHandler._isInteractive(this._pressedElement)) {
                        eventObject.preventDefault();
                    } else {
                        this._dragging = true;
                        var that = this;

                        // Firefox requires setData to be called on the dataTransfer object in order for DnD to continue.
                        // Firefox also has an issue rendering the item's itemBox+element, so we need to use setDragImage, using the item's container, to get it to render.
                        eventObject.dataTransfer.setData("text", "");
                        if (eventObject.dataTransfer.setDragImage) {
                            var rect = this.element.getBoundingClientRect();
                            eventObject.dataTransfer.setDragImage(this.element, eventObject.clientX - rect.left, eventObject.clientY - rect.top);
                        }
                        // We delay setting the win-dragsource CSS class so that IE has time to create a thumbnail before me make it opaque
                        _BaseUtils._yieldForDomModification(function () {
                            if (that._dragging) {
                                _ElementUtilities.addClass(that._itemBox, _Constants._dragSourceClass);
                            }
                        });
                    }
                },

                _onDragEnd: function ItemContainer_onDragEnd() {
                    this._dragging = false;
                    _ElementUtilities.removeClass(this._itemBox, _Constants._dragSourceClass);
                    this._itemEventsHandler.resetPointerDownState();
                },

                _onKeyDown: function ItemContainer_onKeyDown(eventObject) {
                    if (!this._itemEventsHandler._isInteractive(eventObject.target)) {
                        var Key = _ElementUtilities.Key,
                            keyCode = eventObject.keyCode,
                            swipeEnabled = this._swipeBehavior === _UI.SwipeBehavior.select;

                        var handled = false;
                        if (!eventObject.ctrlKey && keyCode === Key.enter) {
                            var allowed = this._verifySelectionAllowed();
                            if (allowed.canTapSelect) {
                                this.selected = !this.selected;
                            }
                            this._fireInvokeEvent();
                            handled = true;
                        } else if (eventObject.ctrlKey && keyCode === Key.enter ||
                            (swipeEnabled && eventObject.shiftKey && keyCode === Key.F10) ||
                            (swipeEnabled && keyCode === Key.menu) ||
                            keyCode === Key.space) {
                            if (!this.selectionDisabled) {
                                this.selected = !this.selected;
                                handled = _ElementUtilities._setActive(this.element);
                            }
                        } else if (keyCode === Key.escape && this.selected) {
                            this.selected = false;
                            handled = true;
                        }

                        if (handled) {
                            eventObject.stopPropagation();
                            eventObject.preventDefault();
                        }
                    }
                },

                _setTabIndex: function ItemContainer_setTabIndex() {
                    var currentTabIndex = this.element.getAttribute("tabindex");
                    if (!currentTabIndex) {
                        // Set the tabindex to 0 only if the application did not already
                        // provide a tabindex
                        this.element.setAttribute("tabindex", "0");
                    }
                },

                _rtl: function ItemContainer_rtl() {
                    if (typeof this._cachedRTL !== "boolean") {
                        this._cachedRTL = _Global.getComputedStyle(this.element, null).direction === "rtl";
                    }
                    return this._cachedRTL;
                },

                _setDirectionClass: function ItemContainer_setDirectionClass() {
                    _ElementUtilities[this._rtl() ? "addClass" : "removeClass"](this.element, _Constants._rtlListViewClass);
                },

                _forceLayout: function ItemContainer_forceLayout() {
                    this._cachedRTL = _Global.getComputedStyle(this.element, null).direction === "rtl";
                    this._setDirectionClass();
                },

                _getItemPosition: function ItemContainer_getItemPosition() {
                    var container = this.element;
                    if (container) {
                        return Promise.wrap({
                            left: (this._rtl() ?
                                container.offsetParent.offsetWidth - container.offsetLeft - container.offsetWidth :
                                container.offsetLeft),
                            top: container.offsetTop,
                            totalWidth: _ElementUtilities.getTotalWidth(container),
                            totalHeight: _ElementUtilities.getTotalHeight(container),
                            contentWidth: _ElementUtilities.getContentWidth(container),
                            contentHeight: _ElementUtilities.getContentHeight(container)
                        });
                    } else {
                        return Promise.cancel;
                    }
                },

                _itemPropertyChange: function ItemContainer_itemPropertyChange(list) {
                    if (this._disposed) { return; }

                    var container = list[0].target;
                    var ariaSelected = container.getAttribute("aria-selected") === "true";

                    // Only respond to aria-selected changes coming from UIA. This check
                    // relies on the fact that, in renderSelection, we update the selection
                    // visual before aria-selected.
                    if (ariaSelected !== _ElementUtilities._isSelectionRendered(this._itemBox)) {
                        if (this.selectionDisabled) {
                            // Revert the change made by UIA since the control has selection disabled
                            _ElementUtilities._setAttribute(container, "aria-selected", !ariaSelected);
                        } else {
                            this.selected = ariaSelected;
                            // Revert the change because the update was prevented on the selectionchanging event
                            if (ariaSelected !== this.selected) {
                                _ElementUtilities._setAttribute(container, "aria-selected", !ariaSelected);
                            }
                        }
                    }
                },

                _setSwipeClass: function ItemContainer_setSwipeClass() {
                    if (_BaseUtils.isPhone) {
                        // Cross-slide is disabled on phone
                        return;
                    }
                    // We apply an -ms-touch-action style to block panning and swiping from occurring at the same time.
                    if ((this._swipeBehavior === _UI.SwipeBehavior.select && this._selectionMode !== _UI.SelectionMode.none) || this._draggable) {
                        _ElementUtilities.addClass(this._element, _Constants._swipeableClass);
                    } else {
                        _ElementUtilities.removeClass(this._element, _Constants._swipeableClass);
                    }
                },

                _updateDraggableAttribute: function ItemContainer_updateDraggableAttribute() {
                    this._setSwipeClass();
                    this._itemBox.setAttribute("draggable", this._draggable);
                },

                _verifySelectionAllowed: function ItemContainer_verifySelectionAllowed() {
                    if (this._selectionMode !== _UI.SelectionMode.none && (this._tapBehavior === _UI.TapBehavior.toggleSelect || this._swipeBehavior === _UI.SwipeBehavior.select)) {
                        var canSelect = this._selection.fireSelectionChanging();
                        return {
                            canSelect: canSelect,
                            canTapSelect: canSelect && this._tapBehavior === _UI.TapBehavior.toggleSelect
                        };
                    } else {
                        return {
                            canSelect: false,
                            canTapSelect: false
                        };
                    }
                },

                _setupInternalTree: function ItemContainer_setupInternalTree() {
                    var item = _Global.document.createElement("div");
                    item.className = _Constants._itemClass;
                    this._captureProxy = _Global.document.createElement("div");
                    this._itemBox = _Global.document.createElement("div");
                    this._itemBox.className = _Constants._itemBoxClass;
                    var child = this.element.firstChild;
                    while (child) {
                        var sibling = child.nextSibling;
                        item.appendChild(child);
                        child = sibling;
                    }
                    this.element.appendChild(this._itemBox);
                    this._itemBox.appendChild(item);
                    this.element.appendChild(this._captureProxy);
                },

                _fireInvokeEvent: function ItemContainer_fireInvokeEvent() {
                    if (this.tapBehavior !== _UI.TapBehavior.none) {
                        var eventObject = _Global.document.createEvent("CustomEvent");
                        eventObject.initCustomEvent(eventNames.invoked, true, false, {});
                        this.element.dispatchEvent(eventObject);
                    }
                },

                _setAriaRole: function ItemContainer_setAriaRole() {
                    if (!this.element.getAttribute("role") || this._usingDefaultItemRole) {
                        this._usingDefaultItemRole = true;
                        var defaultItemRole;
                        if (this.tapBehavior === _UI.TapBehavior.none && this.selectionDisabled) {
                            defaultItemRole = "listitem";
                        } else {
                            defaultItemRole = "option";
                        }
                        _ElementUtilities._setAttribute(this.element, "role", defaultItemRole);
                    }
                },

                _writeProfilerMark: function ItemContainer_writeProfilerMark(text) {
                    var message = "WinJS.UI.ItemContainer:" + this._id + ":" + text;
                    _WriteProfilerMark(message);
                    _Log.log && _Log.log(message, null, "itemcontainerprofiler");
                }
            }, {
                // Names of classes used by the ItemContainer.
                _ClassName: {
                    itemContainer: "win-itemcontainer",
                    vertical: "win-vertical",
                    horizontal: "win-horizontal",
                }
            });
            _Base.Class.mix(ItemContainer, _Control.DOMEventMixin);
            return ItemContainer;
        }),

        _SingleItemSelectionManager: _Base.Namespace._lazy(function () {
            return _Base.Class.define(function SingleItemSelectionManager_ctor(element, itemBox) {
                this._selected = false;
                this._element = element;
                this._itemBox = itemBox;
            }, {
                selected: {
                    get: function () {
                        return this._selected;
                    },
                    set: function (value) {
                        value = !!value;
                        if (this._selected !== value) {
                            if (this.fireSelectionChanging()) {
                                this._selected = value;
                                _ItemEventsHandler._ItemEventsHandler.renderSelection(this._itemBox, this._element, value, true, this._element);
                                this.fireSelectionChanged();
                            }
                        }
                    }
                },

                count: function SingleItemSelectionManager_count() {
                    return this._selected ? 1 : 0;
                },

                getIndices: function SingleItemSelectionManager_getIndices() {
                    // not used
                },

                getItems: function SingleItemSelectionManager_getItems() {
                    // not used
                },

                getRanges: function SingleItemSelectionManager_getRanges() {
                    // not used
                },

                isEverything: function SingleItemSelectionManager_isEverything() {
                    return false;
                },

                set: function SingleItemSelectionManager_set() {
                    this.selected = true;
                },

                clear: function SingleItemSelectionManager_clear() {
                    this.selected = false;
                },

                add: function SingleItemSelectionManager_add() {
                    this.selected = true;
                },

                remove: function SingleItemSelectionManager_remove() {
                    this.selected = false;
                },

                selectAll: function SingleItemSelectionManager_selectAll() {
                    // not used
                },

                fireSelectionChanging: function SingleItemSelectionManager_fireSelectionChanging() {
                    var eventObject = _Global.document.createEvent("CustomEvent");
                    eventObject.initCustomEvent(eventNames.selectionchanging, true, true, {});
                    return this._element.dispatchEvent(eventObject);
                },

                fireSelectionChanged: function ItemContainer_fireSelectionChanged() {
                    var eventObject = _Global.document.createEvent("CustomEvent");
                    eventObject.initCustomEvent(eventNames.selectionchanged, true, false, {});
                    this._element.dispatchEvent(eventObject);
                },

                _isIncluded: function SingleItemSelectionManager_isIncluded() {
                    return this._selected;
                },

                _getFocused: function SingleItemSelectionManager_getFocused() {
                    return { type: _UI.ObjectType.item, index: _Constants._INVALID_INDEX };
                }
            });
        })
    });
});

define('require-style!less/animation-library',[],function(){});

define('require-style!less/typography',[],function(){});

define('require-style!less/desktop/styles-intrinsic',[],function(){});

define('require-style!less/desktop/colors-intrinsic',[],function(){});
