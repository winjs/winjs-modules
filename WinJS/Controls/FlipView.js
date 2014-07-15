// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Controls/FlipView/_Constants',[
    ], function constantsInit() {
    "use strict";

    var members = {};

    members.datasourceCountChangedEvent = "datasourcecountchanged";
    members.pageVisibilityChangedEvent = "pagevisibilitychanged";
    members.pageSelectedEvent = "pageselected";
    members.pageCompletedEvent = "pagecompleted";

    return members;
});

// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

define('WinJS/Controls/FlipView/_PageManager',[
    'exports',
    '../../Core/_Global',
    '../../Core/_Base',
    '../../Core/_BaseUtils',
    '../../Core/_ErrorFromName',
    '../../Core/_Log',
    '../../Core/_Resources',
    '../../Core/_WriteProfilerMark',
    '../../Animations',
    '../../Promise',
    '../../_Signal',
    '../../Scheduler',
    '../../Utilities/_Dispose',
    '../../Utilities/_ElementUtilities',
    '../../Utilities/_TabContainer',
    './_Constants'
    ], function flipperPageManagerInit(exports, _Global, _Base, _BaseUtils, _ErrorFromName, _Log, _Resources, _WriteProfilerMark, Animations, Promise, _Signal, Scheduler, _Dispose, _ElementUtilities, _TabContainer, _Constants) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {

        // Definition of our private utility
        _FlipPageManager: _Base.Namespace._lazy(function () {
            var uniqueID = _ElementUtilities._uniqueID;
            var styleEquivalents = _BaseUtils._browserStyleEquivalents;

            var leftBufferAmount = 50,
                itemSelectedEventDelay = 250;

            var strings = {
                get badCurrentPage() { return _Resources._getWinJSString("ui/badCurrentPage").value; }
            };

            function isFlipper(element) {
                var control = element.winControl;
                if (control && control._isFlipView) {
                    return true;
                }

                return false;
            }

            function flipperPropertyChanged(list) {
                list.forEach(function (record) {
                    var element = record.target;
                    if (element.winControl && element.tabIndex >= 0) {
                        element.winControl._pageManager._updateTabIndex(element.tabIndex);
                        element.tabIndex = -1;
                    }
                    var that = element.winControl;
                    if (that && that._isFlipView) {
                        var dirChanged = false;
                        if (record.attributeName === "dir") {
                            dirChanged = true;
                        } else if (record.attributeName === "style") {
                            dirChanged = (that._cachedStyleDir !== element.style.direction);
                        }
                        if (dirChanged) {
                            that._cachedStyleDir = element.style.direction;
                            that._pageManager._rtl = _Global.getComputedStyle(that._pageManager._flipperDiv, null).direction === "rtl";
                            that._pageManager.resized();
                        }
                    }
                });
            }

            var _FlipPageManager = _Base.Class.define(function _FlipPageManager_ctor(flipperDiv, panningDiv, panningDivContainer, itemsManager, itemSpacing, environmentSupportsTouch, buttonVisibilityHandler) {
                // Construction
                this._visibleElements = [];
                this._flipperDiv = flipperDiv;
                this._panningDiv = panningDiv;
                this._panningDivContainer = panningDivContainer;
                this._buttonVisibilityHandler = buttonVisibilityHandler;
                this._currentPage = null;
                this._rtl = _Global.getComputedStyle(this._flipperDiv, null).direction === "rtl";
                this._itemsManager = itemsManager;
                this._itemSpacing = itemSpacing;
                this._tabIndex = _ElementUtilities.getTabIndex(flipperDiv);
                if (this._tabIndex < 0) {
                    this._tabIndex = 0;
                }
                flipperDiv.tabIndex = -1;
                this._tabManager = new _TabContainer.TabContainer(this._panningDivContainer);
                this._tabManager.tabIndex = this._tabIndex;
                this._lastSelectedPage = null;
                this._lastSelectedElement = null;
                this._bufferSize = _FlipPageManager.flipPageBufferCount;
                this._cachedSize = -1;
                this._environmentSupportsTouch = environmentSupportsTouch;

                var that = this;
                this._panningDiv.addEventListener("keydown", function (event) {
                    if (that._blockTabs && event.keyCode === _ElementUtilities.Key.tab) {
                        event.stopImmediatePropagation();
                        event.preventDefault();
                    }
                }, true);
                _ElementUtilities._addEventListener(this._flipperDiv, "focusin", function (event) {
                    if (event.target === that._flipperDiv) {
                        if (that._currentPage.element) {
                            _ElementUtilities._setActive(that._currentPage.element);
                        }
                    }
                }, false);
                new _ElementUtilities._MutationObserver(flipperPropertyChanged).observe(this._flipperDiv, { attributes: true, attributeFilter: ["dir", "style", "tabindex"] });
                this._cachedStyleDir = this._flipperDiv.style.direction;
                this._panningDiv.addEventListener("activate", function () {
                    that._hasFocus = true;
                }, true);
                this._panningDiv.addEventListener("deactivate", function () {
                    that._hasFocus = false;
                }, true);
                if (this._environmentSupportsTouch) {
                    this._panningDivContainer.addEventListener(_BaseUtils._browserEventEquivalents["manipulationStateChanged"], function (event) {
                        that._manipulationState = event.currentState;
                        if (event.currentState === 0 && event.target === that._panningDivContainer) {
                            that._itemSettledOn();
                            that._ensureCentered();
                        }
                    }, true);
                }
            }, {
                // Public Methods

                initialize: function (initialIndex, horizontal) {
                    var currPage = null;
                    // Every call to offsetWidth/offsetHeight causes an switch from Script to Layout which affects
                    // the performance of the control. The values will be cached and will be updated when a resize occurs.
                    this._panningDivContainerOffsetWidth = this._panningDivContainer.offsetWidth;
                    this._panningDivContainerOffsetHeight = this._panningDivContainer.offsetHeight;
                    this._horizontal = horizontal;
                    if (!this._currentPage) {
                        this._bufferAriaStartMarker = _Global.document.createElement("div");
                        this._bufferAriaStartMarker.id = uniqueID(this._bufferAriaStartMarker);
                        this._panningDiv.appendChild(this._bufferAriaStartMarker);

                        this._currentPage = this._createFlipPage(null, this);
                        currPage = this._currentPage;
                        this._panningDiv.appendChild(currPage.pageRoot);

                        // flipPageBufferCount is added here twice. 
                        // Once for the buffer prior to the current item, and once for the buffer ahead of the current item.
                        var pagesToInit = 2 * this._bufferSize;
                        for (var i = 0; i < pagesToInit; i++) {
                            currPage = this._createFlipPage(currPage, this);
                            this._panningDiv.appendChild(currPage.pageRoot);
                        }

                        this._bufferAriaEndMarker = _Global.document.createElement("div");
                        this._bufferAriaEndMarker.id = uniqueID(this._bufferAriaEndMarker);
                        this._panningDiv.appendChild(this._bufferAriaEndMarker);
                    }

                    this._prevMarker = this._currentPage.prev.prev;

                    if (this._itemsManager) {
                        this.setNewItemsManager(this._itemsManager, initialIndex);
                    }
                },

                dispose: function () {
                    var curPage = this._currentPage;

                    var tmpPage = curPage;
                    do {
                        _Dispose._disposeElement(tmpPage.element);
                        tmpPage = tmpPage.next;
                    } while (tmpPage !== curPage);
                },

                setOrientation: function (horizontal) {
                    if (this._notificationsEndedSignal) {
                        var that = this;
                        this._notificationsEndedSignal.promise.done(function () {
                            that._notificationsEndedSignal = null;
                            that.setOrientation(horizontal);
                        });
                        return;
                    }

                    if (horizontal !== this._horizontal) {
                        this._isOrientationChanging = true;
                        this._horizontal = horizontal;
                        this._forEachPage(function (curr) {
                            var currStyle = curr.pageRoot.style;
                            currStyle.left = "0px";
                            currStyle.top = "0px";
                        });
                        _ElementUtilities.setScrollPosition(this._panningDivContainer, { scrollLeft: 0, scrollTop: 0 });
                        var containerStyle = this._panningDivContainer.style;
                        containerStyle.overflowX = "hidden";
                        containerStyle.overflowY = "hidden";

                        var that = this;
                        _Global.requestAnimationFrame(function () {
                            that._isOrientationChanging = false;
                            containerStyle.overflowX = ((that._horizontal && that._environmentSupportsTouch) ? "scroll" : "hidden");
                            containerStyle.overflowY = ((that._horizontal || !that._environmentSupportsTouch) ? "hidden" : "scroll");
                            that._ensureCentered();
                        });
                    }
                },

                resetState: function (initialIndex) {
                    this._writeProfilerMark("WinJS.UI.FlipView:resetState,info");
                    if (initialIndex !== 0) {
                        var indexValid = this.jumpToIndex(initialIndex, true);
                        if (!indexValid && _BaseUtils.validation) {
                            throw new _ErrorFromName("WinJS.UI.FlipView.BadCurrentPage", strings.badCurrentPage);
                        }
                        return indexValid;
                    } else {
                        _Dispose.disposeSubTree(this._flipperDiv);
                        this._resetBuffer(null, true);
                        var that = this;
                        var work = Promise.wrap(true);
                        if (this._itemsManager) {
                            work = that._itemsManager._firstItem().then(function (e) {
                                that._currentPage.setElement(e);
                                return that._fetchPreviousItems(true).
                                    then(function () {
                                        return that._fetchNextItems();
                                    }).then(function () {
                                        that._setButtonStates();
                                    });
                            });
                        }
                        return work.then(function () {
                            that._tabManager.childFocus = that._currentPage.element;
                            that._ensureCentered();
                            that._itemSettledOn();
                        });
                    }
                },

                setNewItemsManager: function (manager, initialIndex) {
                    this._itemsManager = manager;
                    var that = this;
                    return this.resetState(initialIndex).then(function () {
                        // resetState already configures the tabManager, calls _ensureCentered and _itemSettledOn when the initial index is 0
                        if (initialIndex !== 0) {
                            that._tabManager.childFocus = that._currentPage.element;
                            that._ensureCentered();
                            that._itemSettledOn();
                        }
                    });
                },

                currentIndex: function () {
                    if (!this._itemsManager) {
                        return 0;
                    }
                    var index = 0;
                    var element = (this._navigationAnimationRecord ? this._navigationAnimationRecord.newCurrentElement : this._currentPage.element);
                    if (element) {
                        index = this._getElementIndex(element);
                    }
                    return index;
                },

                resetScrollPos: function () {
                    this._ensureCentered();
                },

                scrollPosChanged: function () {
                    if (!this._itemsManager || !this._currentPage.element || this._isOrientationChanging) {
                        return;
                    }

                    var newPos = this._viewportStart(),
                        bufferEnd = (this._lastScrollPos > newPos ? this._getTailOfBuffer() : this._getHeadOfBuffer());

                    if (newPos === this._lastScrollPos) {
                        return;
                    }

                    while (this._currentPage.element && this._itemStart(this._currentPage) > newPos && this._currentPage.prev.element) {
                        this._currentPage = this._currentPage.prev;
                        this._fetchOnePrevious(bufferEnd.prev);
                        bufferEnd = bufferEnd.prev;
                    }

                    while (this._currentPage.element && this._itemEnd(this._currentPage) <= newPos && this._currentPage.next.element) {
                        this._currentPage = this._currentPage.next;
                        this._fetchOneNext(bufferEnd.next);
                        bufferEnd = bufferEnd.next;
                    }
                    this._setButtonStates();
                    this._checkElementVisibility(false);
                    this._blockTabs = true;
                    this._lastScrollPos = newPos;
                    if (this._currentPage.element) {
                        this._tabManager.childFocus = this._currentPage.element;
                    }
                    this._setListEnds();

                    if (!this._manipulationState && this._viewportOnItemStart()) {
                        // Setup a timeout to invoke _itemSettledOn in cases where the scroll position is changed, and the control 
                        // does not know when it has settled on an item (e.g. 1-finger swipe with narrator touch).
                        this._currentPage.element.setAttribute("aria-setsize", this._cachedSize);
                        this._currentPage.element.setAttribute("aria-posinset", this.currentIndex() + 1);
                        this._timeoutPageSelection();
                    }
                },

                itemRetrieved: function (real, placeholder) {
                    var that = this;
                    this._forEachPage(function (curr) {
                        if (curr.element === placeholder) {
                            if (curr === that._currentPage || curr === that._currentPage.next) {
                                that._changeFlipPage(curr, placeholder, real);
                            } else {
                                curr.setElement(real, true);
                            }
                            return true;
                        }
                    });
                    if (this._navigationAnimationRecord && this._navigationAnimationRecord.elementContainers) {
                        var animatingElements = this._navigationAnimationRecord.elementContainers;
                        for (var i = 0, len = animatingElements.length; i < len; i++) {
                            if (animatingElements[i].element === placeholder) {
                                that._changeFlipPage(animatingElements[i], placeholder, real);
                                animatingElements[i].element = real;
                            }
                        }
                    }
                    this._checkElementVisibility(false);
                },

                resized: function () {
                    this._panningDivContainerOffsetWidth = this._panningDivContainer.offsetWidth;
                    this._panningDivContainerOffsetHeight = this._panningDivContainer.offsetHeight;
                    var that = this;
                    this._forEachPage(function (curr) {
                        curr.pageRoot.style.width = that._panningDivContainerOffsetWidth + "px";
                        curr.pageRoot.style.height = that._panningDivContainerOffsetHeight + "px";
                    });

                    // Call _ensureCentered to adjust all the width/height of the pages in the buffer
                    this._ensureCentered();
                    this._writeProfilerMark("WinJS.UI.FlipView:resize,StopTM");
                },

                jumpToIndex: function (index, forceJump) {
                    // If we force jumping to an index, we are not interested in making sure that there is distance
                    // between the current and the new index.
                    if (!forceJump) {
                        if (!this._itemsManager || !this._currentPage.element || index < 0) {
                            return Promise.wrap(false);
                        }

                        // If we have to keep our pages in memory, we need to iterate through every single item from our current position to the desired target
                        var currIndex = this._getElementIndex(this._currentPage.element),
                            distance = Math.abs(index - currIndex);

                        if (distance === 0) {
                            return Promise.wrap(false);
                        }
                    }

                    var tail = Promise.wrap(true);
                    var that = this;

                    tail = tail.then(function () {
                        var itemPromise = that._itemsManager._itemPromiseAtIndex(index);
                        return Promise.join({
                            element: that._itemsManager._itemFromItemPromise(itemPromise),
                            item: itemPromise
                        }).then(function (v) {
                            var elementAtIndex = v.element;

                            // Reset the buffer regardless of whether we have elementAtIndex or not
                            that._resetBuffer(elementAtIndex, forceJump);

                            if (!elementAtIndex) {
                                return false;
                            }

                            that._currentPage.setElement(elementAtIndex);
                            return that._fetchNextItems().
                                then(function () {
                                    return that._fetchPreviousItems(true);
                                }).
                                then(function () {
                                    return true;
                                });
                        });
                    });
                    tail = tail.then(function (v) {
                        that._setButtonStates();
                        return v;
                    });

                    return tail;
                },

                startAnimatedNavigation: function (goForward, cancelAnimationCallback, completionCallback) {
                    this._writeProfilerMark("WinJS.UI.FlipView:startAnimatedNavigation,info");
                    if (this._currentPage.element) {
                        var outgoingPage = this._currentPage,
                            incomingPage = (goForward ? this._currentPage.next : this._currentPage.prev);

                        if (incomingPage.element) {
                            if (this._hasFocus) {
                                // Give focus to the panning div ONLY if anything inside the flipview control currently has
                                // focus; otherwise, it will be lost when the current page is animated during the navigation.
                                _ElementUtilities._setActive(this._panningDiv);
                            }
                            this._navigationAnimationRecord = {};
                            this._navigationAnimationRecord.goForward = goForward;
                            this._navigationAnimationRecord.cancelAnimationCallback = cancelAnimationCallback;
                            this._navigationAnimationRecord.completionCallback = completionCallback;
                            this._navigationAnimationRecord.oldCurrentPage = outgoingPage;
                            this._navigationAnimationRecord.newCurrentPage = incomingPage;
                            var outgoingElement = outgoingPage.element;
                            var incomingElement = incomingPage.element;
                            this._navigationAnimationRecord.newCurrentElement = incomingElement;

                            // When a page element is animated during a navigation, it is temporarily appended on a different container during the animation (see _createDiscardablePage).
                            // However, updates in the data source can happen (change, remove, insert, etc) during the animation affecting the element that is being animated.
                            // Therefore, the page object also maintains the elementUniqueID, and the functions that deal with re-building the internal buffer (shifting/remove/etc)
                            // do all the comparissons, based on the page.elementUniqueID that way even if the element of the page is being animated, we are able to restore/discard it
                            // into the internal buffer back in the correct place.
                            outgoingPage.setElement(null, true);
                            outgoingPage.elementUniqueID = uniqueID(outgoingElement);
                            incomingPage.setElement(null, true);
                            incomingPage.elementUniqueID = uniqueID(incomingElement);

                            var outgoingFlipPage = this._createDiscardablePage(outgoingElement),
                                incomingFlipPage = this._createDiscardablePage(incomingElement);

                            outgoingFlipPage.pageRoot.itemIndex = this._getElementIndex(outgoingElement);
                            incomingFlipPage.pageRoot.itemIndex = outgoingFlipPage.pageRoot.itemIndex + (goForward ? 1 : -1);
                            outgoingFlipPage.pageRoot.style.position = "absolute";
                            incomingFlipPage.pageRoot.style.position = "absolute";
                            outgoingFlipPage.pageRoot.style.zIndex = 1;
                            incomingFlipPage.pageRoot.style.zIndex = 2;
                            this._itemStart(outgoingFlipPage, 0, 0);
                            this._itemStart(incomingFlipPage, 0, 0);
                            this._blockTabs = true;
                            this._visibleElements.push(incomingElement);
                            this._announceElementVisible(incomingElement);
                            this._navigationAnimationRecord.elementContainers = [outgoingFlipPage, incomingFlipPage];
                            return {
                                outgoing: outgoingFlipPage,
                                incoming: incomingFlipPage
                            };
                        }
                    }
                    return null;
                },

                endAnimatedNavigation: function (goForward, outgoing, incoming) {
                    this._writeProfilerMark("WinJS.UI.FlipView:endAnimatedNavigation,info");
                    if (this._navigationAnimationRecord &&
                        this._navigationAnimationRecord.oldCurrentPage &&
                        this._navigationAnimationRecord.newCurrentPage) {
                        var outgoingRemoved = this._restoreAnimatedElement(this._navigationAnimationRecord.oldCurrentPage, outgoing);
                        this._restoreAnimatedElement(this._navigationAnimationRecord.newCurrentPage, incoming);
                        if (!outgoingRemoved) {
                            // Advance only when the element in the current page was not removed because if it did, all the pages
                            // were shifted.
                            this._viewportStart(this._itemStart(goForward ? this._currentPage.next : this._currentPage.prev));
                        }
                        this._navigationAnimationRecord = null;
                        this._itemSettledOn();
                    }
                },

                startAnimatedJump: function (index, cancelAnimationCallback, completionCallback) {
                    this._writeProfilerMark("WinJS.UI.FlipView:startAnimatedJump,info");
                    if (this._currentPage.element) {
                        var oldElement = this._currentPage.element;
                        var oldIndex = this._getElementIndex(oldElement);
                        var that = this;

                        return that.jumpToIndex(index).then(function (v) {
                            if (!v) {
                                return null;
                            }
                            that._navigationAnimationRecord = {};
                            that._navigationAnimationRecord.cancelAnimationCallback = cancelAnimationCallback;
                            that._navigationAnimationRecord.completionCallback = completionCallback;
                            that._navigationAnimationRecord.oldCurrentPage = null;
                            that._forEachPage(function (curr) {
                                if (curr.element === oldElement) {
                                    that._navigationAnimationRecord.oldCurrentPage = curr;
                                    return true;
                                }
                            });
                            that._navigationAnimationRecord.newCurrentPage = that._currentPage;
                            if (that._navigationAnimationRecord.newCurrentPage === that._navigationAnimationRecord.oldCurrentPage) {
                                return null;
                            }
                            var newElement = that._currentPage.element;
                            that._navigationAnimationRecord.newCurrentElement = newElement;

                            // When a page element is animated during a jump, it is temporarily appended on a different container during the animation (see _createDiscardablePage).
                            // However, updates in the data source can happen (change, remove, insert, etc) during the animation affecting the element that is being animated.
                            // Therefore, the page object also maintains the elementUniqueID, and the functions that deal with re-building the internal buffer (shifting/remove/etc)
                            // do all the comparissons, based on the page.elementUniqueID that way even if the element of the page is being animated, we are able to restore/discard it
                            // into the internal buffer back in the correct place.
                            that._currentPage.setElement(null, true);
                            that._currentPage.elementUniqueID = uniqueID(newElement);

                            if (that._navigationAnimationRecord.oldCurrentPage) {
                                that._navigationAnimationRecord.oldCurrentPage.setElement(null, true);
                            }

                            var oldFlipPage = that._createDiscardablePage(oldElement),
                                newFlipPage = that._createDiscardablePage(newElement);
                            oldFlipPage.pageRoot.itemIndex = oldIndex;
                            newFlipPage.pageRoot.itemIndex = index;
                            oldFlipPage.pageRoot.style.position = "absolute";
                            newFlipPage.pageRoot.style.position = "absolute";
                            oldFlipPage.pageRoot.style.zIndex = 1;
                            newFlipPage.pageRoot.style.zIndex = 2;
                            that._itemStart(oldFlipPage, 0, 0);
                            that._itemStart(newFlipPage, that._itemSize(that._currentPage), 0);
                            that._visibleElements.push(newElement);
                            that._announceElementVisible(newElement);
                            that._navigationAnimationRecord.elementContainers = [oldFlipPage, newFlipPage];
                            that._blockTabs = true;
                            return {
                                oldPage: oldFlipPage,
                                newPage: newFlipPage
                            };
                        });
                    }

                    return Promise.wrap(null);
                },

                endAnimatedJump: function (oldCurr, newCurr) {
                    this._writeProfilerMark("WinJS.UI.FlipView:endAnimatedJump,info");
                    if (this._navigationAnimationRecord.oldCurrentPage) {
                        this._navigationAnimationRecord.oldCurrentPage.setElement(oldCurr.element, true);
                    } else {
                        if (oldCurr.element.parentNode) {
                            oldCurr.element.parentNode.removeChild(oldCurr.element);
                        }
                    }
                    this._navigationAnimationRecord.newCurrentPage.setElement(newCurr.element, true);
                    this._navigationAnimationRecord = null;
                    this._ensureCentered();
                    this._itemSettledOn();
                },

                inserted: function (element, prev, next, animateInsertion) {
                    this._writeProfilerMark("WinJS.UI.FlipView:inserted,info");
                    var curr = this._prevMarker,
                        passedCurrent = false,
                        elementSuccessfullyPlaced = false;

                    if (animateInsertion) {
                        this._createAnimationRecord(uniqueID(element), null);
                        this._getAnimationRecord(element).inserted = true;
                    }

                    if (!prev) {
                        if (!next) {
                            this._currentPage.setElement(element);
                        } else {
                            while (curr.next !== this._prevMarker && curr.elementUniqueID !== uniqueID(next)) {
                                if (curr === this._currentPage) {
                                    passedCurrent = true;
                                }
                                curr = curr.next;
                            }

                            if (curr.elementUniqueID === uniqueID(next) && curr !== this._prevMarker) {
                                curr.prev.setElement(element);
                                elementSuccessfullyPlaced = true;
                            } else {
                                this._releaseElementIfNotAnimated(element);
                            }
                        }
                    } else {
                        do {
                            if (curr === this._currentPage) {
                                passedCurrent = true;
                            }
                            if (curr.elementUniqueID === uniqueID(prev)) {
                                elementSuccessfullyPlaced = true;
                                var pageShifted = curr,
                                    lastElementMoved = element,
                                    lastElementMovedUniqueID = uniqueID(element),
                                    temp;
                                if (passedCurrent) {
                                    while (pageShifted.next !== this._prevMarker) {
                                        temp = pageShifted.next.element;
                                        lastElementMovedUniqueID = pageShifted.next.elementUniqueID;
                                        pageShifted.next.setElement(lastElementMoved, true);
                                        if (!lastElementMoved && lastElementMovedUniqueID) {
                                            // Shift the uniqueID of the page manually since its element is being animated.
                                            // This page  will not contain the element until the animation completes.
                                            pageShifted.next.elementUniqueID = lastElementMovedUniqueID;
                                        }
                                        lastElementMoved = temp;
                                        pageShifted = pageShifted.next;
                                    }
                                } else {
                                    if (curr.elementUniqueID === curr.next.elementUniqueID && curr.elementUniqueID) {
                                        pageShifted = curr.next;
                                    }
                                    while (pageShifted.next !== this._prevMarker) {
                                        temp = pageShifted.element;
                                        lastElementMovedUniqueID = pageShifted.elementUniqueID;
                                        pageShifted.setElement(lastElementMoved, true);
                                        if (!lastElementMoved && lastElementMovedUniqueID) {
                                            // Shift the uniqueID of the page manually since its element is being animated.
                                            // This page  will not contain the element until the animation completes.
                                            pageShifted.elementUniqueID = lastElementMovedUniqueID;
                                        }
                                        lastElementMoved = temp;
                                        pageShifted = pageShifted.prev;
                                    }
                                }
                                if (lastElementMoved) {
                                    var reused = false;
                                    this._forEachPage(function (curr) {
                                        if (uniqueID(lastElementMoved) === curr.elementUniqueID) {
                                            reused = true;
                                            return true;
                                        }
                                    });
                                    if (!reused) {
                                        this._releaseElementIfNotAnimated(lastElementMoved);
                                    }
                                }
                                break;
                            }
                            curr = curr.next;
                        } while (curr !== this._prevMarker);
                    }

                    this._getAnimationRecord(element).successfullyMoved = elementSuccessfullyPlaced;
                    this._setButtonStates();
                },

                changed: function (newVal, element) {
                    this._writeProfilerMark("WinJS.UI.FlipView:changed,info");
                    var that = this;
                    this._forEachPage(function (curr) {
                        if (curr.elementUniqueID === uniqueID(element)) {
                            var record = that._animationRecords[curr.elementUniqueID];
                            record.changed = true;
                            record.oldElement = element;
                            record.newElement = newVal;
                            curr.element = newVal; // We set curr's element field here so that next/prev works, but we won't update the visual until endNotifications
                            curr.elementUniqueID = uniqueID(newVal);
                            that._animationRecords[uniqueID(newVal)] = record;
                            return true;
                        }
                    });

                    if (this._navigationAnimationRecord && this._navigationAnimationRecord.elementContainers) {
                        for (var i = 0, len = this._navigationAnimationRecord.elementContainers.length; i < len; i++) {
                            var page = this._navigationAnimationRecord.elementContainers[i];
                            if (page && page.elementUniqueID === uniqueID(element)) {
                                page.element = newVal;
                                page.elementUniqueID = uniqueID(newVal);
                            }
                        }

                        var newElement = this._navigationAnimationRecord.newCurrentElement;
                        if (newElement && uniqueID(newElement) === uniqueID(element)) {
                            this._navigationAnimationRecord.newCurrentElement = newVal;
                        }
                    }
                },

                moved: function (element, prev, next) {
                    this._writeProfilerMark("WinJS.UI.FlipView:moved,info");
                    var record = this._getAnimationRecord(element);

                    if (!record) {
                        record = this._createAnimationRecord(uniqueID(element));
                    }

                    record.moved = true;
                    this.removed(element, false, false);
                    if (prev || next) {
                        this.inserted(element, prev, next, false);
                    } else {
                        record.successfullyMoved = false;
                    }
                },

                removed: function (element, mirage, animateRemoval) {
                    this._writeProfilerMark("WinJS.UI.FlipView:removed,info");
                    var that = this;
                    var prevMarker = this._prevMarker;
                    var work = Promise.wrap();

                    if (mirage) {
                        var clearNext = false;
                        this._forEachPage(function (curr) {
                            if (curr.elementUniqueID === uniqueID(element) || clearNext) {
                                curr.setElement(null, true);
                                clearNext = true;
                            }
                        });
                        this._setButtonStates();
                        return;
                    }

                    if (animateRemoval) {
                        var record = this._getAnimationRecord(element);
                        if (record) {
                            record.removed = true;
                        }
                    }
                    if (this._currentPage.elementUniqueID === uniqueID(element)) {
                        if (this._currentPage.next.elementUniqueID) {
                            this._shiftLeft(this._currentPage);
                            this._ensureCentered();
                        } else if (this._currentPage.prev.elementUniqueID) {
                            this._shiftRight(this._currentPage);
                        } else {
                            this._currentPage.setElement(null, true);
                        }
                    } else if (prevMarker.elementUniqueID === uniqueID(element)) {
                        if (prevMarker.next.element) {
                            work = this._itemsManager._previousItem(prevMarker.next.element).
                                then(function (e) {
                                    if (e === element) {
                                        // Because the VDS and Binding.List can send notifications in 
                                        // different states we accomodate this here by fixing the case 
                                        // where VDS hasn't yet removed an item when it sends a removed
                                        // or moved notification.
                                        //
                                        e = that._itemsManager._previousItem(e);
                                    }
                                    return e;
                                }).
                                then(function (e) {
                                    prevMarker.setElement(e, true);
                                });
                        } else {
                            prevMarker.setElement(null, true);
                        }
                    } else if (prevMarker.prev.elementUniqueID === uniqueID(element)) {
                        if (prevMarker.prev.prev && prevMarker.prev.prev.element) {
                            work = this._itemsManager._nextItem(prevMarker.prev.prev.element).
                                then(function (e) {
                                    if (e === element) {
                                        // Because the VDS and Binding.List can send notifications in 
                                        // different states we accomodate this here by fixing the case 
                                        // where VDS hasn't yet removed an item when it sends a removed
                                        // or moved notification.
                                        //
                                        e = that._itemsManager._nextItem(e);
                                    }
                                    return e;
                                }).
                                then(function (e) {
                                    prevMarker.prev.setElement(e, true);
                                });
                        } else {
                            prevMarker.prev.setElement(null, true);
                        }
                    } else {
                        var curr = this._currentPage.prev,
                            handled = false;
                        while (curr !== prevMarker && !handled) {
                            if (curr.elementUniqueID === uniqueID(element)) {
                                this._shiftRight(curr);
                                handled = true;
                            }

                            curr = curr.prev;
                        }

                        curr = this._currentPage.next;
                        while (curr !== prevMarker && !handled) {
                            if (curr.elementUniqueID === uniqueID(element)) {
                                this._shiftLeft(curr);
                                handled = true;
                            }

                            curr = curr.next;
                        }
                    }

                    return work.then(function () {
                        that._setButtonStates();
                    });
                },

                reload: function () {
                    this._writeProfilerMark("WinJS.UI.FlipView:reload,info");
                    this.resetState(0);
                },

                getItemSpacing: function () {
                    return this._itemSpacing;
                },

                setItemSpacing: function (space) {
                    this._itemSpacing = space;
                    this._ensureCentered();
                },

                notificationsStarted: function () {
                    this._writeProfilerMark("WinJS.UI.FlipView:changeNotifications,StartTM");
                    this._logBuffer();
                    this._notificationsStarted = this._notificationsStarted || 0;
                    this._notificationsStarted++;
                    // _notificationsEndedSignal is also used in the FlipView unit tests for coordination in the datasource tests
                    this._notificationsEndedSignal = new _Signal();
                    this._temporaryKeys = [];
                    this._animationRecords = {};
                    var that = this;
                    this._forEachPage(function (curr) {
                        that._createAnimationRecord(curr.elementUniqueID, curr);
                    });

                    // Since the current item is defined as the left-most item in the view, the only possible elements that can be in view at any time are
                    // the current item and the item proceeding it. We'll save these two elements for animations during the notificationsEnded cycle
                    this._animationRecords.currentPage = this._currentPage.element;
                    this._animationRecords.nextPage = this._currentPage.next.element;
                },

                notificationsEnded: function () {
                    // The animations are broken down into three parts.
                    // First, we move everything back to where it was before the changes happened. Elements that were inserted between two pages won't have their flip pages moved.
                    // Next, we figure out what happened to the two elements that used to be in view. If they were removed/moved, they get animated as appropriate in this order:
                    // removed, moved
                    // Finally, we figure out how the items that are now in view got there, and animate them as necessary, in this order: moved, inserted.
                    // The moved animation of the last part is joined with the moved animation of the previous part, so in the end it is:
                    // removed -> moved items in view + moved items not in view -> inserted.
                    var that = this;
                    this._endNotificationsWork  && this._endNotificationsWork.cancel();
                    this._endNotificationsWork = this._ensureBufferConsistency().then(function () {
                        var animationPromises = [];
                        that._forEachPage(function (curr) {
                            var record = that._getAnimationRecord(curr.element);
                            if (record) {
                                if (record.changed) {
                                    record.oldElement.removedFromChange = true;
                                    animationPromises.push(that._changeFlipPage(curr, record.oldElement, record.newElement));
                                }
                                record.newLocation = curr.location;
                                that._itemStart(curr, record.originalLocation);
                                if (record.inserted) {
                                    curr.elementRoot.style.opacity = 0.0;
                                }
                            }
                        });

                        function flipPageFromElement(element) {
                            var flipPage = null;
                            that._forEachPage(function (curr) {
                                if (curr.element === element) {
                                    flipPage = curr;
                                    return true;
                                }
                            });
                            return flipPage;
                        }

                        function animateOldViewportItemRemoved(record, item) {
                            that._writeProfilerMark("WinJS.UI.FlipView:_animateOldViewportItemRemoved,info");
                            var removedPage = that._createDiscardablePage(item);
                            that._itemStart(removedPage, record.originalLocation);
                            animationPromises.push(that._deleteFlipPage(removedPage));
                        }

                        function animateOldViewportItemMoved(record, item) {
                            that._writeProfilerMark("WinJS.UI.FlipView:_animateOldViewportItemMoved,info");
                            var newLocation = record.originalLocation,
                                movedPage;
                            if (!record.successfullyMoved) {
                                // If the old visible item got moved, but the next/prev of that item don't match up with anything
                                // currently in our flip page buffer, we need to figure out in which direction it moved.
                                // The exact location doesn't matter since we'll be deleting it anyways, but we do need to
                                // animate it going in the right direction.
                                movedPage = that._createDiscardablePage(item);
                                var indexMovedTo = that._getElementIndex(item);
                                var newCurrentIndex = (that._currentPage.element ? that._getElementIndex(that._currentPage.element) : 0);
                                newLocation += (newCurrentIndex > indexMovedTo ? -100 * that._bufferSize : 100 * that._bufferSize);
                            } else {
                                movedPage = flipPageFromElement(item);
                                newLocation = record.newLocation;
                            }
                            if (movedPage) {
                                that._itemStart(movedPage, record.originalLocation);
                                animationPromises.push(that._moveFlipPage(movedPage, function () {
                                    that._itemStart(movedPage, newLocation);
                                }));
                            }
                        }

                        var oldCurrent = that._animationRecords.currentPage,
                            oldCurrentRecord = that._getAnimationRecord(oldCurrent),
                            oldNext = that._animationRecords.nextPage,
                            oldNextRecord = that._getAnimationRecord(oldNext);
                        if (oldCurrentRecord && oldCurrentRecord.changed) {
                            oldCurrent = oldCurrentRecord.newElement;
                        }
                        if (oldNextRecord && oldNextRecord.changed) {
                            oldNext = oldNextRecord.newElement;
                        }

                        if (oldCurrent !== that._currentPage.element || oldNext !== that._currentPage.next.element) {
                            if (oldCurrentRecord && oldCurrentRecord.removed) {
                                animateOldViewportItemRemoved(oldCurrentRecord, oldCurrent);
                            }
                            if (oldNextRecord && oldNextRecord.removed) {
                                animateOldViewportItemRemoved(oldNextRecord, oldNext);
                            }
                        }

                        function joinAnimationPromises() {
                            if (animationPromises.length === 0) {
                                animationPromises.push(Promise.wrap());
                            }

                            return Promise.join(animationPromises);
                        }
                        that._blockTabs = true;
                        joinAnimationPromises().then(function () {
                            animationPromises = [];
                            if (oldCurrentRecord && oldCurrentRecord.moved) {
                                animateOldViewportItemMoved(oldCurrentRecord, oldCurrent);
                            }
                            if (oldNextRecord && oldNextRecord.moved) {
                                animateOldViewportItemMoved(oldNextRecord, oldNext);
                            }
                            var newCurrRecord = that._getAnimationRecord(that._currentPage.element),
                                newNextRecord = that._getAnimationRecord(that._currentPage.next.element);
                            that._forEachPage(function (curr) {
                                var record = that._getAnimationRecord(curr.element);
                                if (record) {
                                    if (!record.inserted) {
                                        if (record.originalLocation !== record.newLocation) {
                                            if ((record !== oldCurrentRecord && record !== oldNextRecord) ||
                                                (record === oldCurrentRecord && !oldCurrentRecord.moved) ||
                                                (record === oldNextRecord && !oldNextRecord.moved)) {
                                                animationPromises.push(that._moveFlipPage(curr, function () {
                                                    that._itemStart(curr, record.newLocation);
                                                }));
                                            }
                                        }
                                    } else if (record !== newCurrRecord && record !== newNextRecord) {
                                        curr.elementRoot.style.opacity = 1.0;
                                    }
                                }
                            });
                            joinAnimationPromises().then(function () {
                                animationPromises = [];
                                if (newCurrRecord && newCurrRecord.inserted) {
                                    animationPromises.push(that._insertFlipPage(that._currentPage));
                                }
                                if (newNextRecord && newNextRecord.inserted) {
                                    animationPromises.push(that._insertFlipPage(that._currentPage.next));
                                }
                                joinAnimationPromises().then(function () {
                                    that._checkElementVisibility(false);
                                    that._itemSettledOn();
                                    that._setListEnds();
                                    that._notificationsStarted--;
                                    if (that._notificationsStarted === 0) {
                                        that._notificationsEndedSignal.complete();
                                    }
                                    that._writeProfilerMark("WinJS.UI.FlipView:changeNotifications,StopTM");
                                    that._logBuffer();
                                    that._endNotificationsWork = null;
                                });
                            });
                        });
                    });
                },

                // Private methods

                _timeoutPageSelection: function () {
                    var that = this;
                    if (this._lastTimeoutRequest) {
                        this._lastTimeoutRequest.cancel();
                    }
                    this._lastTimeoutRequest = Promise.timeout(itemSelectedEventDelay).then(function () {
                        that._itemSettledOn();
                    });
                },

                _updateTabIndex: function (newIndex) {
                    this._forEachPage(function (curr) {
                        if (curr.element) {
                            curr.element.tabIndex = newIndex;
                        }
                    });
                    this._tabIndex = newIndex;
                    this._tabManager.tabIndex = newIndex;
                },

                _releaseElementIfNotAnimated: function (element) {
                    var animatedRecord = this._getAnimationRecord(element);
                    if (!(animatedRecord && (animatedRecord.changed || animatedRecord.inserted || animatedRecord.moved || animatedRecord.removed))) {
                        this._itemsManager.releaseItem(element);
                    }
                },

                _getAnimationRecord: function (element) {
                    return (element ? this._animationRecords[uniqueID(element)] : null);
                },

                _createAnimationRecord: function (elementUniqueID, flipPage) {
                    if (elementUniqueID) {
                        var record = this._animationRecords[elementUniqueID] = {
                            removed: false,
                            changed: false,
                            inserted: false
                        };

                        if (flipPage) {
                            record.originalLocation = flipPage.location;
                        }

                        return record;
                    }
                },

                _writeProfilerMark: function(message) {
                    _WriteProfilerMark(message);
                    if (this._flipperDiv.winControl.constructor._enabledDebug) {
                        _Log.log && _Log.log(message, null, "flipviewdebug");
                    }
                },

                _getElementIndex: function(element) {
                    var index = 0;
                    try {
                        index = this._itemsManager.itemObject(element).index;
                    }
                    catch (e) {
                        // Failures are expected in cases where items are moved and then deleted. Animations will simply animate as if the item
                        // moved to the beginning of the list.
                    }
                    return index;
                },

                _resetBuffer: function (elementToSave, skipReleases) {
                    this._writeProfilerMark("WinJS.UI.FlipView:_resetBuffer,info");
                    var head = this._currentPage,
                        curr = head;
                    do {
                        if ((curr.element && curr.element === elementToSave) || skipReleases) {
                            curr.setElement(null, true);
                        } else {
                            curr.setElement(null);
                        }
                        curr = curr.next;
                    } while (curr !== head);
                },

                _getHeadOfBuffer: function () {
                    return this._prevMarker.prev;
                },

                _getTailOfBuffer: function () {
                    return this._prevMarker;
                },

                _insertNewFlipPage: function (prevElement) {
                    this._writeProfilerMark("WinJS.UI.FlipView:_insertNewFlipPage,info");
                    var newPage = this._createFlipPage(prevElement, this);
                    this._panningDiv.appendChild(newPage.pageRoot);
                    return newPage;
                },

                _fetchNextItems: function () {
                    this._writeProfilerMark("WinJS.UI.FlipView:_fetchNextItems,info");
                    var tail = Promise.wrap(this._currentPage);
                    var that = this;

                    for (var i = 0; i < this._bufferSize; i++) {
                        tail = tail.then(function (curr) {
                            if (curr.next === that._prevMarker) {
                                that._insertNewFlipPage(curr);
                            }
                            if (curr.element) {
                                return that._itemsManager._nextItem(curr.element).
                                    then(function (element) {
                                        curr.next.setElement(element);
                                        return curr.next;
                                    });
                            } else {
                                curr.next.setElement(null);
                                return curr.next;
                            }
                        });
                    }

                    return tail;
                },

                _fetchOneNext: function (target) {
                    this._writeProfilerMark("WinJS.UI.FlipView:_fetchOneNext,info");
                    var prevElement = target.prev.element;
                    // If the target we want to fill with the next item is the end of the circular buffer but we want to keep everything in memory, we've got to increase the buffer size
                    // so that we don't reuse prevMarker.
                    if (this._prevMarker === target) {
                        this._prevMarker = this._prevMarker.next;
                    }
                    if (!prevElement) {
                        target.setElement(null);
                        return;
                    }
                    var that = this;
                    return this._itemsManager._nextItem(prevElement).
                        then(function (element) {
                            target.setElement(element);
                            that._movePageAhead(target.prev, target);
                        });
                },

                _fetchPreviousItems: function (setPrevMarker) {
                    this._writeProfilerMark("WinJS.UI.FlipView:_fetchPreviousItems,info");
                    var that = this;

                    var tail = Promise.wrap(this._currentPage);

                    for (var i = 0; i < this._bufferSize; i++) {
                        tail = tail.then(function (curr) {
                            if (curr.element) {
                                return that._itemsManager._previousItem(curr.element).
                                    then(function (element) {
                                        curr.prev.setElement(element);
                                        return curr.prev;
                                    });
                            } else {
                                curr.prev.setElement(null);
                                return curr.prev;
                            }
                        });
                    }

                    return tail.then(function (curr) {
                        if (setPrevMarker) {
                            that._prevMarker = curr;
                        }
                    });
                },

                _fetchOnePrevious: function (target) {
                    this._writeProfilerMark("WinJS.UI.FlipView:_fetchOnePrevious,info");
                    var nextElement = target.next.element;

                    // If the target we want to fill with the previous item is the end of the circular buffer but we want to keep everything in memory, we've got to increase the buffer size
                    // so that we don't reuse prevMarker. We'll add a new element to be prevMarker's prev, then set prevMarker to point to that new element.
                    if (this._prevMarker === target.next) {
                        this._prevMarker = this._prevMarker.prev;
                    }
                    if (!nextElement) {
                        target.setElement(null);
                        return Promise.wrap();
                    }
                    var that = this;
                    return this._itemsManager._previousItem(nextElement).
                        then(function (element) {
                            target.setElement(element);
                            that._movePageBehind(target.next, target);
                        });
                },

                _setButtonStates: function () {
                    if (this._currentPage.prev.element) {
                        this._buttonVisibilityHandler.showPreviousButton();
                    } else {
                        this._buttonVisibilityHandler.hidePreviousButton();
                    }

                    if (this._currentPage.next.element) {
                        this._buttonVisibilityHandler.showNextButton();
                    } else {
                        this._buttonVisibilityHandler.hideNextButton();
                    }
                },

                _ensureCentered: function (delayBoundariesSet) {
                    this._writeProfilerMark("WinJS.UI.FlipView:_ensureCentered,info");
                    this._itemStart(this._currentPage, leftBufferAmount * this._viewportSize());
                    var curr = this._currentPage;
                    while (curr !== this._prevMarker) {
                        this._movePageBehind(curr, curr.prev);
                        curr = curr.prev;
                    }

                    curr = this._currentPage;
                    while (curr.next !== this._prevMarker) {
                        this._movePageAhead(curr, curr.next);
                        curr = curr.next;
                    }
                    var boundariesSet = false;
                    if (this._lastScrollPos && !delayBoundariesSet) {
                        this._setListEnds();
                        boundariesSet = true;
                    }
                    this._lastScrollPos = this._itemStart(this._currentPage);
                    this._viewportStart(this._lastScrollPos);
                    this._checkElementVisibility(true);
                    this._setupSnapPoints();
                    if (!boundariesSet) {
                        this._setListEnds();
                    }
                },

                _ensureBufferConsistency: function () {
                    var that = this;
                    var currentElement = this._currentPage.element;
                    if (!currentElement) {
                        return Promise.wrap();
                    }

                    var refreshBuffer = false;
                    var seenUniqueIDs = {};
                    var seenLocations = {};
                    this._forEachPage(function (page) {
                        if (page && page.elementUniqueID) {
                            if (!seenUniqueIDs[page.elementUniqueID]) {
                                seenUniqueIDs[page.elementUniqueID] = true;
                            } else {
                                refreshBuffer = true;
                                return true;
                            }

                            if (page.location > 0) {
                                if (!seenLocations[page.location]) {
                                    seenLocations[page.location] = true;
                                } else {
                                    refreshBuffer = true;
                                    return true;
                                }
                            }
                        }
                    });

                    var animationKeys = Object.keys(this._animationRecords);
                    animationKeys.forEach(function (key) {
                        var record = that._animationRecords[key];
                        if (record && (record.changed || record.inserted || record.moved || record.removed)) {
                            refreshBuffer = true;
                        }
                    });

                    if (refreshBuffer) {
                        this._resetBuffer(null, true);
                        this._currentPage.setElement(currentElement);
                        return this._fetchNextItems().
                            then(function () {
                                return that._fetchPreviousItems(true);
                            }).
                            then(function () {
                                that._ensureCentered();
                            });
                    } else {
                        return Promise.wrap();
                    }
                },

                _shiftLeft: function (startingPoint) {
                    this._writeProfilerMark("WinJS.UI.FlipView:_shiftLeft,info");
                    var curr = startingPoint,
                        nextEl = null;
                    while (curr !== this._prevMarker && curr.next !== this._prevMarker) {
                        nextEl = curr.next.element;
                        if (!nextEl && curr.next.elementUniqueID) {
                            // Shift the uniqueID of the page manually since its element is being animated.
                            // This page  will not contain the element until the animation completes.
                            curr.elementUniqueID = curr.next.elementUniqueID;
                        }
                        curr.next.setElement(null, true);
                        curr.setElement(nextEl, true);
                        curr = curr.next;
                    }
                    if (curr !== this._prevMarker && curr.prev.element) {
                        var that = this;
                        return this._itemsManager._nextItem(curr.prev.element).
                            then(function (element) {
                                curr.setElement(element);
                                that._createAnimationRecord(curr.elementUniqueID, curr);
                            });
                    }
                },

                _logBuffer: function () {
                    if (this._flipperDiv.winControl.constructor._enabledDebug) {
                        _Log.log && _Log.log(this._currentPage.next.next.next.elementUniqueID + "\t@:" + this._currentPage.next.next.next.location + (this._currentPage.next.next.next.element ? ("\t" + this._currentPage.next.next.next.element.textContent) : ""), null, "flipviewdebug");
                        _Log.log && _Log.log(this._currentPage.next.next.next.next.elementUniqueID + "\t@:" + this._currentPage.next.next.next.next.location + (this._currentPage.next.next.next.next.element ? ("\t" + this._currentPage.next.next.next.next.element.textContent) : ""), null, "flipviewdebug");
                        _Log.log && _Log.log("> " + this._currentPage.elementUniqueID + "\t@:" + this._currentPage.location + (this._currentPage.element ? ("\t" + this._currentPage.element.textContent) : ""), null, "flipviewdebug");
                        _Log.log && _Log.log(this._currentPage.next.elementUniqueID + "\t@:" + this._currentPage.next.location + (this._currentPage.next.element ? ("\t" + this._currentPage.next.element.textContent) : ""), null, "flipviewdebug");
                        _Log.log && _Log.log(this._currentPage.next.next.elementUniqueID + "\t@:" + this._currentPage.next.next.location + (this._currentPage.next.next.element ? ("\t" + this._currentPage.next.next.element.textContent) : ""), null, "flipviewdebug");

                        var keys = Object.keys(this._itemsManager._elementMap);
                        var bufferKeys = [];
                        this._forEachPage(function (page) {
                            if (page && page.elementUniqueID) {
                                bufferKeys.push(page.elementUniqueID);
                            }
                        });
                        _Log.log && _Log.log("itemsmanager  = [" + keys.join(" ") + "] flipview [" + bufferKeys.join(" ") + "]", null, "flipviewdebug");
                    }
                },

                _shiftRight: function (startingPoint) {
                    this._writeProfilerMark("WinJS.UI.FlipView:_shiftRight,info");
                    var curr = startingPoint,
                        prevEl = null;
                    while (curr !== this._prevMarker) {
                        prevEl = curr.prev.element;
                        if (!prevEl && curr.prev.elementUniqueID) {
                            // Shift the uniqueID of the page manually since its element is being animated.
                            // This page  will not contain the element until the animation completes.
                            curr.elementUniqueID = curr.prev.elementUniqueID;
                        }
                        curr.prev.setElement(null, true);
                        curr.setElement(prevEl, true);
                        curr = curr.prev;
                    }
                    if (curr.next.element) {
                        var that = this;
                        return this._itemsManager._previousItem(curr.next.element).
                            then(function (element) {
                                curr.setElement(element);
                                that._createAnimationRecord(curr.elementUniqueID, curr);
                            });
                    }
                },

                _checkElementVisibility: function (viewWasReset) {
                    var i,
                        len;
                    if (viewWasReset) {
                        var currentElement = this._currentPage.element;
                        for (i = 0, len = this._visibleElements.length; i < len; i++) {
                            if (this._visibleElements[i] !== currentElement) {
                                this._announceElementInvisible(this._visibleElements[i]);
                            }
                        }

                        this._visibleElements = [];
                        if (currentElement) {
                            this._visibleElements.push(currentElement);
                            this._announceElementVisible(currentElement);
                        }
                    } else {
                        // Elements that have been removed completely from the flipper still need to raise pageVisibilityChangedEvents if they were visible prior to being removed,
                        // so before going through all the elements we go through the ones that we knew were visible and see if they're missing a parentNode. If they are,
                        // the elements were removed and we announce them as invisible.
                        for (i = 0, len = this._visibleElements.length; i < len; i++) {
                            if (!this._visibleElements[i].parentNode || this._visibleElements[i].removedFromChange) {
                                this._announceElementInvisible(this._visibleElements[i]);
                            }
                        }
                        this._visibleElements = [];
                        var that = this;
                        this._forEachPage(function (curr) {
                            var element = curr.element;
                            if (element) {
                                if (that._itemInView(curr)) {
                                    that._visibleElements.push(element);
                                    that._announceElementVisible(element);
                                } else {
                                    that._announceElementInvisible(element);
                                }
                            }
                        });
                    }
                },

                _announceElementVisible: function (element) {
                    if (element && !element.visible) {
                        element.visible = true;

                        var event = _Global.document.createEvent("CustomEvent");
                        this._writeProfilerMark("WinJS.UI.FlipView:pageVisibilityChangedEvent(visible:true),info");
                        event.initCustomEvent(_Constants.pageVisibilityChangedEvent, true, false, { source: this._flipperDiv, visible: true });

                        element.dispatchEvent(event);
                    }
                },

                _announceElementInvisible: function (element) {
                    if (element && element.visible) {
                        element.visible = false;

                        // Elements that have been removed from the flipper still need to fire invisible events, but they can't do that without being in the DOM.
                        // To fix that, we add the element back into the flipper, fire the event, then remove it.
                        var addedToDomForEvent = false;
                        if (!element.parentNode) {
                            addedToDomForEvent = true;
                            this._panningDivContainer.appendChild(element);
                        }

                        var event = _Global.document.createEvent("CustomEvent");
                        this._writeProfilerMark("WinJS.UI.FlipView:pageVisibilityChangedEvent(visible:false),info");
                        event.initCustomEvent(_Constants.pageVisibilityChangedEvent, true, false, { source: this._flipperDiv, visible: false });

                        element.dispatchEvent(event);
                        if (addedToDomForEvent) {
                            this._panningDivContainer.removeChild(element);
                        }
                    }
                },

                _createDiscardablePage: function (content) {
                    var pageDivs = this._createPageContainer(),
                        page = {
                            pageRoot: pageDivs.root,
                            elementRoot: pageDivs.elementContainer,
                            discardable: true,
                            element: content,
                            elementUniqueID: uniqueID(content),
                            discard: function () {
                                if (page.pageRoot.parentNode) {
                                    page.pageRoot.parentNode.removeChild(page.pageRoot);
                                }
                                if (page.element.parentNode) {
                                    page.element.parentNode.removeChild(page.element);
                                }
                            }
                        };
                    page.pageRoot.style.top = "0px";
                    page.elementRoot.appendChild(content);
                    this._panningDiv.appendChild(page.pageRoot);
                    return page;
                },

                _createPageContainer: function () {
                    var width = this._panningDivContainerOffsetWidth,
                        height = this._panningDivContainerOffsetHeight,
                        parentDiv = _Global.document.createElement("div"),
                        pageStyle = parentDiv.style,
                        flexBox = _Global.document.createElement("div");
                    flexBox.className = "win-item";
                    pageStyle.position = "absolute";
                    pageStyle.overflow = "hidden";
                    pageStyle.width = width + "px";
                    pageStyle.height = height + "px";

                    parentDiv.appendChild(flexBox);
                    return {
                        root: parentDiv,
                        elementContainer: flexBox
                    };
                },

                _createFlipPage: function (prev, manager) {
                    var page = {};
                    page.element = null;
                    page.elementUniqueID = null;

                    // The flip pages are managed as a circular doubly-linked list. this.currentItem should always refer to the current item in view, and this._prevMarker marks the point 
                    // in the list where the last previous item is stored. Why a circular linked list?
                    // The virtualized flipper reuses its flip pages. When a new item is requested, the flipper needs to reuse an old item from the buffer. In the case of previous items,
                    // the flipper has to go all the way back to the farthest next item in the buffer and recycle it (which is why having a .prev pointer on the farthest previous item is really useful),
                    // and in the case of the next-most item, it needs to recycle next's next (ie, the this._prevMarker). The linked structure comes in really handy when iterating through the list
                    // and separating out prev items from next items (like removed and ensureCentered do). If we were to use a structure like an array it would be pretty messy to do that and still
                    // maintain a buffer of recyclable items.
                    if (!prev) {
                        page.next = page;
                        page.prev = page;
                    } else {
                        page.prev = prev;
                        page.next = prev.next;
                        page.next.prev = page;
                        prev.next = page;
                    }
                    var pageContainer = this._createPageContainer();
                    page.elementRoot = pageContainer.elementContainer;
                    page.elementRoot.style["msOverflowStyle"] = "auto";
                    page.pageRoot = pageContainer.root;

                    // Sets the element to display in this flip page
                    page.setElement = function (element, isReplacement) {
                        if (element === undefined) {
                            element = null;
                        }
                        if (element === page.element) {
                            if (!element) {
                                // If there are data source updates during the animation (e.g. item removed), a page element can be set to null when the shiftLeft/Right functions
                                // call this function with a null element. However, since the element in the page is in the middle of an animation its page.elementUniqueID
                                // is still set, so we need to explicitly clear its value so that when the animation completes, the animated element is not 
                                // restored back into the internal buffer.
                                page.elementUniqueID = null;
                            }
                            return;
                        }
                        if (page.element) {
                            if (!isReplacement) {
                                manager._itemsManager.releaseItem(page.element);
                                _Dispose._disposeElement(page.element);
                            }
                        }
                        page.element = element;
                        page.elementUniqueID = (element ? uniqueID(element) : null);
                        _ElementUtilities.empty(page.elementRoot);

                        if (page.element) {
                            if (page === manager._currentPage) {
                                manager._tabManager.childFocus = element;
                            }
                            if (!isFlipper(page.element)) {
                                page.element.tabIndex = manager._tabIndex;
                                page.element.setAttribute("role", "option");
                                page.element.setAttribute("aria-selected", false);
                                if (!page.element.id) {
                                    page.element.id = uniqueID(page.element);
                                }

                                var setFlowAttribute = function (source, target, attributeName) {
                                    source.setAttribute(attributeName, target.id);
                                };

                                var isEnd = !page.next.element || page === manager._prevMarker.prev;
                                if (isEnd) {
                                    setFlowAttribute(page.element, manager._bufferAriaEndMarker, "aria-flowto");
                                    setFlowAttribute(manager._bufferAriaEndMarker, page.element, "x-ms-aria-flowfrom");
                                }

                                if (page !== manager._prevMarker && page.prev.element) {
                                    setFlowAttribute(page.prev.element, page.element, "aria-flowto");
                                    setFlowAttribute(page.element, page.prev.element, "x-ms-aria-flowfrom");
                                }
                                if (page.next !== manager._prevMarker && page.next.element) {
                                    setFlowAttribute(page.element, page.next.element, "aria-flowto");
                                    setFlowAttribute(page.next.element, page.element, "x-ms-aria-flowfrom");
                                }

                                if (!page.prev.element) {
                                    setFlowAttribute(page.element, manager._bufferAriaStartMarker, "x-ms-aria-flowfrom");
                                    // aria-flowto in the start marker is configured in itemSettledOn to point to the current page in view
                                }
                            }
                            page.elementRoot.appendChild(page.element);
                        }
                    };

                    return page;
                },

                _itemInView: function (flipPage) {
                    return this._itemEnd(flipPage) > this._viewportStart() && this._itemStart(flipPage) < this._viewportEnd();
                },

                _viewportStart: function (newValue) {
                    if (!this._panningDivContainer.parentNode) {
                        return;
                    }

                    if (this._horizontal) {
                        if (newValue === undefined) {
                            return _ElementUtilities.getScrollPosition(this._panningDivContainer).scrollLeft;
                        }
                        _ElementUtilities.setScrollPosition(this._panningDivContainer, { scrollLeft: newValue });
                    } else {
                        if (newValue === undefined) {
                            return this._panningDivContainer.scrollTop;
                        }

                        this._panningDivContainer.scrollTop = newValue;
                    }
                },

                _viewportEnd: function () {
                    var element = this._panningDivContainer;
                    if (this._horizontal) {
                        if (this._rtl) {
                            return this._viewportStart() + this._panningDivContainerOffsetWidth;
                        } else {
                            return _ElementUtilities.getScrollPosition(element).scrollLeft + this._panningDivContainerOffsetWidth;
                        }
                    } else {
                        return element.scrollTop + this._panningDivContainerOffsetHeight;
                    }
                },

                _viewportSize: function () {
                    return this._horizontal ? this._panningDivContainerOffsetWidth : this._panningDivContainerOffsetHeight;
                },

                _itemStart: function (flipPage, newValue) {
                    if (newValue === undefined) {
                        return flipPage.location;
                    }

                    if (this._horizontal) {
                        flipPage.pageRoot.style.left = (this._rtl ? -newValue : newValue) + "px";
                    } else {
                        flipPage.pageRoot.style.top = newValue + "px";
                    }

                    flipPage.location = newValue;
                },

                _itemEnd: function (flipPage) {
                    return (this._horizontal ? flipPage.location + this._panningDivContainerOffsetWidth : flipPage.location + this._panningDivContainerOffsetHeight) + this._itemSpacing;
                },

                _itemSize: function () {
                    return this._horizontal ? this._panningDivContainerOffsetWidth : this._panningDivContainerOffsetHeight;
                },

                _movePageAhead: function (referencePage, pageToPlace) {
                    var delta = this._itemSize(referencePage) + this._itemSpacing;
                    this._itemStart(pageToPlace, this._itemStart(referencePage) + delta);
                },

                _movePageBehind: function (referencePage, pageToPlace) {
                    var delta = this._itemSize(referencePage) + this._itemSpacing;
                    this._itemStart(pageToPlace, this._itemStart(referencePage) - delta);
                },

                _setupSnapPoints: function () {
                    if (!this._environmentSupportsTouch) {
                        return;
                    }
                    var containerStyle = this._panningDivContainer.style;
                    containerStyle[styleEquivalents["scroll-snap-type"].scriptName] = "mandatory";
                    var viewportSize = this._viewportSize();
                    var snapInterval = viewportSize + this._itemSpacing;
                    var propertyName = "scroll-snap-points";
                    var startSnap = 0;
                    var currPos = this._itemStart(this._currentPage);
                    startSnap = currPos % (viewportSize + this._itemSpacing);
                    containerStyle[styleEquivalents[(this._horizontal ? propertyName + "-x" : propertyName + "-y")].scriptName] = "snapInterval(" + startSnap + "px, " + snapInterval + "px)";
                },

                _setListEnds: function () {
                    if (!this._environmentSupportsTouch) {
                        return;
                    }

                    if (this._currentPage.element) {
                        var containerStyle = this._panningDivContainer.style,
                            startScroll = 0,
                            endScroll = 0,
                            startNonEmptyPage = this._getTailOfBuffer(),
                            endNonEmptyPage = this._getHeadOfBuffer(),
                            startBoundaryStyle = styleEquivalents["scroll-limit-" + (this._horizontal ? "x-min" : "y-min")].scriptName,
                            endBoundaryStyle = styleEquivalents["scroll-limit-" + (this._horizontal ? "x-max" : "y-max")].scriptName;

                        while (!endNonEmptyPage.element) {
                            endNonEmptyPage = endNonEmptyPage.prev;

                            // We started at the item before prevMarker (going backwards), so we will exit if all
                            // the pages in the buffer are empty.
                            if (endNonEmptyPage === this._prevMarker.prev) {
                                break;
                            }
                        }

                        while (!startNonEmptyPage.element) {
                            startNonEmptyPage = startNonEmptyPage.next;

                            // We started at prevMarker (going forward), so we will exit if all the pages in the
                            // buffer are empty.
                            if (startNonEmptyPage === this._prevMarker) {
                                break;
                            }
                        }

                        endScroll = this._itemStart(endNonEmptyPage);
                        startScroll = this._itemStart(startNonEmptyPage);
                        containerStyle[startBoundaryStyle] = startScroll + "px";
                        containerStyle[endBoundaryStyle] = endScroll + "px";
                    }
                },

                _viewportOnItemStart: function () {
                    return this._itemStart(this._currentPage) === this._viewportStart();
                },

                _restoreAnimatedElement: function (oldPage, discardablePage) {
                    var removed = true;
                    // Restore the element in the old page only if it still matches the uniqueID, and the page
                    // does not have new updated content. If the element was removed, it won't be restore in the
                    // old page.
                    if (oldPage.elementUniqueID === uniqueID(discardablePage.element) && !oldPage.element) {
                        oldPage.setElement(discardablePage.element, true);
                        removed = false;
                    } else {
                        // Iterate through the pages to see if the element was moved
                        this._forEachPage(function (curr) {
                            if (curr.elementUniqueID === discardablePage.elementUniqueID && !curr.element) {
                                curr.setElement(discardablePage.element, true);
                                removed = false;
                            }
                        });
                    }
                    return removed;
                },

                _itemSettledOn: function () {
                    if (this._lastTimeoutRequest) {
                        this._lastTimeoutRequest.cancel();
                        this._lastTimeoutRequest = null;
                    }

                    var that = this;
                    // Need to yield to the host here
                    _BaseUtils._setImmediate(function () {
                        if (that._viewportOnItemStart()) {
                            that._blockTabs = false;
                            if (that._currentPage.element) {
                                if (that._hasFocus) {
                                    _ElementUtilities._setActive(that._currentPage.element);
                                    that._tabManager.childFocus = that._currentPage.element;
                                }
                                if (that._lastSelectedElement !== that._currentPage.element) {
                                    if (that._lastSelectedPage && that._lastSelectedPage.element && !isFlipper(that._lastSelectedPage.element)) {
                                        that._lastSelectedPage.element.setAttribute("aria-selected", false);
                                    }
                                    that._lastSelectedPage = that._currentPage;
                                    that._lastSelectedElement = that._currentPage.element;
                                    if (!isFlipper(that._currentPage.element)) {
                                        that._currentPage.element.setAttribute("aria-selected", true);
                                    }

                                    // Need to schedule this:
                                    // - to be able to register for the pageselected event after instantiating the control and still get the event
                                    // - in case a FlipView navigation is triggered inside the pageselected listener (avoid reentering _itemSettledOn)
                                    Scheduler.schedule(function FlipView_dispatchPageSelectedEvent() {
                                        if (that._currentPage.element) {
                                            var event = _Global.document.createEvent("CustomEvent");
                                            event.initCustomEvent(_Constants.pageSelectedEvent, true, false, { source: that._flipperDiv });
                                            that._writeProfilerMark("WinJS.UI.FlipView:pageSelectedEvent,info");
                                            that._currentPage.element.dispatchEvent(event);

                                            // Fire the pagecompleted event when the render completes if we are still looking  at the same element.
                                            // Check that the current element is not null, since the app could've triggered a navigation inside the 
                                            // pageselected event handler.
                                            var originalElement = that._currentPage.element;
                                            if (originalElement) {
                                                var record = that._itemsManager._recordFromElement(originalElement, true);
                                                if (record) {
                                                    record.renderComplete.then(function () {
                                                        if (originalElement === that._currentPage.element) {
                                                            that._currentPage.element.setAttribute("aria-setsize", that._cachedSize);
                                                            that._currentPage.element.setAttribute("aria-posinset", that.currentIndex() + 1);
                                                            that._bufferAriaStartMarker.setAttribute("aria-flowto", that._currentPage.element.id);
                                                            event = _Global.document.createEvent("CustomEvent");
                                                            event.initCustomEvent(_Constants.pageCompletedEvent, true, false, { source: that._flipperDiv });
                                                            that._writeProfilerMark("WinJS.UI.FlipView:pageCompletedEvent,info");
                                                            that._currentPage.element.dispatchEvent(event);
                                                        }
                                                    });
                                                }
                                            }
                                        }
                                    }, Scheduler.Priority.normal, null, "WinJS.UI.FlipView._dispatchPageSelectedEvent");
                                }
                            }
                        }
                    });
                },

                _forEachPage: function (callback) {
                    var curr = this._prevMarker;
                    do {
                        if (callback(curr)) {
                            break;
                        }
                        curr = curr.next;
                    } while(curr !== this._prevMarker);
                },

                _changeFlipPage: function (page, oldElement, newElement) {
                    this._writeProfilerMark("WinJS.UI.FlipView:_changeFlipPage,info");
                    page.element = null;
                    if (page.setElement) {
                        page.setElement(newElement, true);
                    } else {
                        // Discardable pages that are created for animations aren't full fleged pages, and won't have some of the functions a normal page would.
                        // changeFlipPage will be called on them when an item that's animating gets fetched. When that happens, we need to replace its element
                        // manually, then center it.
                        oldElement.parentNode.removeChild(oldElement);
                        page.elementRoot.appendChild(newElement);
                    }

                    var style = oldElement.style;
                    style.position = "absolute";
                    style.left = "0px";
                    style.top = "0px";
                    style.opacity = 1.0;

                    page.pageRoot.appendChild(oldElement);
                    oldElement.style.left = Math.max(0, (page.pageRoot.offsetWidth - oldElement.offsetWidth) / 2) + "px";
                    oldElement.style.top = Math.max(0, (page.pageRoot.offsetHeight - oldElement.offsetHeight) / 2) + "px";

                    return Animations.fadeOut(oldElement).then(function () {
                        oldElement.parentNode && oldElement.parentNode.removeChild(oldElement);
                    });
                },

                _deleteFlipPage: function (page) {
                    _WriteProfilerMark("WinJS.UI.FlipView:_deleteFlipPage,info");
                    page.elementRoot.style.opacity = 0;
                    var animation = Animations.createDeleteFromListAnimation([page.elementRoot]);

                    var that = this;
                    return animation.execute().then(function () {
                        if (page.discardable) {
                            page.discard();
                            that._itemsManager.releaseItem(page.element);
                        }
                    });
                },

                _insertFlipPage: function (page) {
                    _WriteProfilerMark("WinJS.UI.FlipView:_insertFlipPage,info");
                    page.elementRoot.style.opacity = 1.0;
                    var animation = Animations.createAddToListAnimation([page.elementRoot]);

                    return animation.execute().then(function () {
                        if (page.discardable) {
                            page.discard();
                        }
                    });
                },

                _moveFlipPage: function (page, move) {
                    _WriteProfilerMark("WinJS.UI.FlipView:_moveFlipPage,info");
                    var animation = Animations.createRepositionAnimation(page.pageRoot);

                    move();

                    var that = this;
                    return animation.execute().then(function () {
                        if (page.discardable) {
                            page.discard();
                            var animationRecord = that._getAnimationRecord(page.element);
                            if (animationRecord && !animationRecord.successfullyMoved) {
                                // If the animationRecord was not succesfully moved, the item is now outside of the buffer,
                                // and we can release it.
                                that._itemsManager.releaseItem(page.element);
                            }
                        }
                    });
                }
            }, {
                supportedForProcessing: false,
            });
            _FlipPageManager.flipPageBufferCount = 2; // The number of items that should surround the current item as a buffer at any time
            return _FlipPageManager;
        })
    });

});


define('require-style!less/desktop/controls',[],function(){});

define('require-style!less/phone/controls',[],function(){});
// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Controls/FlipView',[
    '../Core/_Global',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_ErrorFromName',
    '../Core/_Events',
    '../Core/_Resources',
    '../Core/_WriteProfilerMark',
    '../Animations',
    '../Animations/_TransitionAnimation',
    '../BindingList',
    '../Promise',
    '../Scheduler',
    '../Utilities/_Control',
    '../Utilities/_Dispose',
    '../Utilities/_ElementUtilities',
    '../Utilities/_ItemsManager',
    '../Utilities/_UI',
    './FlipView/_Constants',
    './FlipView/_PageManager',
    'require-style!less/desktop/controls',
    'require-style!less/phone/controls'
    ], function flipperInit(_Global,_Base, _BaseUtils, _ErrorFromName, _Events, _Resources, _WriteProfilerMark, Animations, _TransitionAnimation, BindingList, Promise, Scheduler, _Control, _Dispose, _ElementUtilities, _ItemsManager, _UI, _Constants, _PageManager) {
    "use strict";

    _Base.Namespace.define("WinJS.UI", {
        /// <field>
        /// <summary locid="WinJS.UI.FlipView">
        /// Displays a collection, such as a set of photos, one item at a time.
        /// </summary>
        /// </field>
        /// <icon src="ui_winjs.ui.flipview.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.flipview.16x16.png" width="16" height="16" />
        /// <htmlSnippet><![CDATA[<div data-win-control="WinJS.UI.FlipView"></div>]]></htmlSnippet>
        /// <event name="datasourcecountchanged" bubbles="true" locid="WinJS.UI.FlipView_e:datasourcecountchanged">Raised when the number of items in the itemDataSource changes.</event>
        /// <event name="pagevisibilitychanged" bubbles="true" locid="WinJS.UI.FlipView_e:pagevisibilitychanged">Raised when a FlipView page becomes visible or invisible.</event>
        /// <event name="pageselected" bubbles="true" locid="WinJS.UI.FlipView_e:pageselected">Raised when the FlipView flips to a page.</event>
        /// <event name="pagecompleted" bubbles="true" locid="WinJS.UI.FlipView_e:pagecompleted">Raised when the FlipView flips to a page and its renderer function completes.</event>
        /// <part name="flipView" class="win-flipview" locid="WinJS.UI.FlipView_part:flipView">The entire FlipView control.</part>
        /// <part name="navigationButton" class="win-navbutton" locid="WinJS.UI.FlipView_part:navigationButton">The general class for all FlipView navigation buttons.</part>
        /// <part name="leftNavigationButton" class="win-navleft" locid="WinJS.UI.FlipView_part:leftNavigationButton">The left navigation button.</part>
        /// <part name="rightNavigationButton" class="win-navright" locid="WinJS.UI.FlipView_part:rightNavigationButton">The right navigation button.</part>
        /// <part name="topNavigationButton" class="win-navtop" locid="WinJS.UI.FlipView_part:topNavigationButton">The top navigation button.</part>
        /// <part name="bottomNavigationButton" class="win-navbottom" locid="WinJS.UI.FlipView_part:bottomNavigationButton">The bottom navigation button.</part>
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/base.js" shared="true" />
        /// <resource type="javascript" src="//$(TARGET_DESTINATION)/js/ui.js" shared="true" />
        /// <resource type="css" src="//$(TARGET_DESTINATION)/css/ui-dark.css" shared="true" />
        FlipView: _Base.Namespace._lazy(function () {

            // Class names
            var navButtonClass = "win-navbutton",
                flipViewClass = "win-flipview",
                navButtonLeftClass = "win-navleft",
                navButtonRightClass = "win-navright",
                navButtonTopClass = "win-navtop",
                navButtonBottomClass = "win-navbottom";

            // Aria labels
            var previousButtonLabel = "Previous",
                nextButtonLabel = "Next";

            var buttonFadeDelay = 3000,
                avoidTrapDelay = 500,
                leftArrowGlyph = "&#57570;",
                rightArrowGlyph = "&#57571;",
                topArrowGlyph = "&#57572;",
                bottomArrowGlyph = "&#57573;",
                animationMoveDelta = 40;

            function flipViewPropertyChanged(list) {
                var that = list[0].target.winControl;
                if (that && that instanceof FlipView) {
                    if (list.some(function (record) {
                        if (record.attributeName === "dir") {
                            return true;
                    } else if (record.attributeName === "style") {
                            return (that._cachedStyleDir !== record.target.style.direction);
                    } else {
                            return false;
                    }
                    })) {
                        that._cachedStyleDir = that._flipviewDiv.style.direction;
                        that._rtl = _Global.getComputedStyle(that._flipviewDiv, null).direction === "rtl";
                        that._setupOrientation();
                    }
                }
            }

            function flipviewResized(e) {
                var that = e.target && e.target.winControl;
                if (that && that instanceof FlipView) {
                    _WriteProfilerMark("WinJS.UI.FlipView:resize,StartTM");
                    that._resize();
                }
            }

            var strings = {
                get badAxis() { return _Resources._getWinJSString("ui/badAxis").value; },
                get badCurrentPage() { return _Resources._getWinJSString("ui/badCurrentPage").value; },
                get noitemsManagerForCount() { return _Resources._getWinJSString("ui/noitemsManagerForCount").value; },
                get badItemSpacingAmount() { return _Resources._getWinJSString("ui/badItemSpacingAmount").value; },
                get navigationDuringStateChange() { return _Resources._getWinJSString("ui/flipViewNavigationDuringStateChange").value; },
                get panningContainerAriaLabel() { return _Resources._getWinJSString("ui/flipViewPanningContainerAriaLabel").value; }
            };

            var FlipView = _Base.Class.define(function FlipView_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.FlipView.FlipView">
                /// <summary locid="WinJS.UI.FlipView.constructor">
                /// Creates a new FlipView.
                /// </summary>
                /// <param name="element" domElement="true" locid="WinJS.UI.FlipView.constructor_p:element">
                /// The DOM element that hosts the control.
                /// </param>
                /// <param name="options" type="Object" locid="WinJS.UI.FlipView.constructor_p:options">
                /// An object that contains one or more property/value pairs to apply to the new control.
                /// Each property of the options object corresponds to one of the control's properties or events.
                /// Event names must begin with "on". For example, to provide a handler for the pageselected event,
                /// add a property named "onpageselected" to the options object and set its value to the event handler.
                /// This parameter is optional.
                /// </param>
                /// <returns type="WinJS.UI.FlipView" locid="WinJS.UI.FlipView.constructor_returnValue">
                /// The new FlipView control.
                /// </returns>
                /// </signature>
                _WriteProfilerMark("WinJS.UI.FlipView:constructor,StartTM");

                this._disposed = false;

                element = element || _Global.document.createElement("div");

                var horizontal = true,
                    dataSource = null,
                    itemRenderer = _ItemsManager._trivialHtmlRenderer,
                    initialIndex = 0,
                    itemSpacing = 0;

                if (options) {
                    // flipAxis parameter checking. Must be a string, either "horizontal" or "vertical"
                    if (options.orientation) {
                        if (typeof options.orientation === "string") {
                            switch (options.orientation.toLowerCase()) {
                                case "horizontal":
                                    horizontal = true;
                                    break;

                                case "vertical":
                                    horizontal = false;
                                    break;
                            }
                        }
                    }

                    if (options.currentPage) {
                        initialIndex = options.currentPage >> 0;
                        initialIndex = initialIndex < 0 ? 0 : initialIndex;
                    }

                    if (options.itemDataSource) {
                        dataSource = options.itemDataSource;
                    }

                    if (options.itemTemplate) {
                        itemRenderer = this._getItemRenderer(options.itemTemplate);
                    }

                    if (options.itemSpacing) {
                        itemSpacing = options.itemSpacing >> 0;
                        itemSpacing = itemSpacing < 0 ? 0 : itemSpacing;
                    }
                }

                if (!dataSource) {
                    var list = new BindingList.List();
                    dataSource = list.dataSource;
                }
                _ElementUtilities.empty(element);

                // Set _flipviewDiv so the element getter works correctly, then call _setOption with eventsOnly flag on before calling _initializeFlipView
                // so that event listeners are added before page loading
                this._flipviewDiv = element;
                element.winControl = this;
                _Control._setOptions(this, options, true);
                this._initializeFlipView(element, horizontal, dataSource, itemRenderer, initialIndex, itemSpacing);
                _ElementUtilities.addClass(element, "win-disposable");
                this._avoidTrappingTime = 0;
                this._windowWheelHandlerBound = this._windowWheelHandler.bind(this);
                _Global.addEventListener('wheel', this._windowWheelHandlerBound);

                _WriteProfilerMark("WinJS.UI.FlipView:constructor,StopTM");
            }, {

                // Public methods

                dispose: function FlipView_dispose() {
                    /// <signature helpKeyword="WinJS.UI.FlipView.dispose">
                    /// <summary locid="WinJS.UI.FlipView.dispose">
                    /// Disposes this FlipView.
                    /// </summary>
                    /// </signature>
                    _WriteProfilerMark("WinJS.UI.FlipView:dispose,StopTM");
                    if (this._disposed) {
                        return;
                    }

                    _Global.removeEventListener('wheel', this._windowWheelHandlerBound);
                    _ElementUtilities._resizeNotifier.unsubscribe(this._flipviewDiv, flipviewResized);


                    this._disposed = true;
                    this._pageManager.dispose();
                    this._itemsManager.release();
                    this.itemDataSource = null;
                },

                next: function FlipView_next() {
                    /// <signature helpKeyword="WinJS.UI.FlipView.next">
                    /// <summary locid="WinJS.UI.FlipView.next">
                    /// Navigates to the next item.
                    /// </summary>
                    /// <returns type="Boolean" locid="WinJS.UI.FlipView.next_returnValue">
                    /// true if the FlipView begins navigating to the next page;
                    /// false if the FlipView is at the last page or is in the middle of another navigation animation.
                    /// </returns>
                    /// </signature>
                    _WriteProfilerMark("WinJS.UI.FlipView:next,info");
                    var cancelAnimationCallback = this._nextAnimation ? null : this._cancelDefaultAnimation;
                    return this._navigate(true, cancelAnimationCallback);
                },

                previous: function FlipView_previous() {
                    /// <signature helpKeyword="WinJS.UI.FlipView.previous">
                    /// <summary locid="WinJS.UI.FlipView.previous">
                    /// Navigates to the previous item.
                    /// </summary>
                    /// <returns type="Boolean" locid="WinJS.UI.FlipView.previous_returnValue">
                    /// true if FlipView begins navigating to the previous page;
                    /// false if the FlipView is already at the first page or is in the middle of another navigation animation.
                    /// </returns>
                    /// </signature>
                    _WriteProfilerMark("WinJS.UI.FlipView:prev,info");
                    var cancelAnimationCallback = this._prevAnimation ? null : this._cancelDefaultAnimation;
                    return this._navigate(false, cancelAnimationCallback);
                },

                /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.FlipView.element" helpKeyword="WinJS.UI.FlipView.element">
                /// The DOM element that hosts the FlipView control.
                /// </field>
                element: {
                    get: function () {
                        return this._flipviewDiv;
                    }
                },

                /// <field type="Number" integer="true" locid="WinJS.UI.FlipView.currentPage" helpKeyword="WinJS.UI.FlipView.currentPage" minimum="0">
                /// Gets or sets the index of the currently displayed page. The minimum value is 0 and the maximum value is one less than the total number of items returned by the data source.
                /// </field>
                currentPage: {
                    get: function () {
                        return this._getCurrentIndex();
                    },
                    set: function (index) {
                        _WriteProfilerMark("WinJS.UI.FlipView:set_currentPage,info");

                        if (this._pageManager._notificationsEndedSignal) {
                            var that = this;
                            this._pageManager._notificationsEndedSignal.promise.done(function () {
                                that._pageManager._notificationsEndedSignal = null;
                                that.currentPage = index;
                            });
                            return;
                        }

                        if (this._animating && !this._cancelAnimation()) {
                            return;
                        }

                        index = index >> 0;
                        index = index < 0 ? 0 : index;

                        if (this._refreshTimer) {
                            this._indexAfterRefresh = index;
                        } else {
                            if (this._pageManager._cachedSize > 0) {
                                index = Math.min(this._pageManager._cachedSize - 1, index);
                            } else if (this._pageManager._cachedSize === 0) {
                                index = 0;
                            }

                            var that = this;
                            if (this._jumpingToIndex === index) {
                                return;
                            }
                            var clearJumpToIndex = function () {
                                that._jumpingToIndex = null;
                            };
                            this._jumpingToIndex = index;
                            var jumpAnimation = (this._jumpAnimation ? this._jumpAnimation : this._defaultAnimation.bind(this)),
                                cancelAnimationCallback = (this._jumpAnimation ? null : this._cancelDefaultAnimation),
                                completionCallback = function () { that._completeJump(); };
                            this._pageManager.startAnimatedJump(index, cancelAnimationCallback, completionCallback).
                            then(function (elements) {
                                if (elements) {
                                    that._animationsStarted();
                                    var currElement = elements.oldPage.pageRoot;
                                    var newCurrElement = elements.newPage.pageRoot;
                                    that._contentDiv.appendChild(currElement);
                                    that._contentDiv.appendChild(newCurrElement);

                                    that._completeJumpPending = true;
                                    jumpAnimation(currElement, newCurrElement).
                                        then(function () {
                                            if (that._completeJumpPending) {
                                                completionCallback();
                                                _WriteProfilerMark("WinJS.UI.FlipView:set_currentPage.animationComplete,info");
                                            }
                                        }).done(clearJumpToIndex, clearJumpToIndex);
                                } else {
                                    clearJumpToIndex();
                                }
                            }, clearJumpToIndex);
                        }
                    }
                },

                /// <field type="String" oamOptionsDatatype="WinJS.UI.Orientation" locid="WinJS.UI.FlipView.orientation" helpKeyword="WinJS.UI.FlipView.orientation">
                /// Gets or sets the layout orientation of the FlipView, horizontal or vertical.
                /// </field>
                orientation: {
                    get: function () {
                        return this._axisAsString();
                    },
                    set: function (orientation) {
                        _WriteProfilerMark("WinJS.UI.FlipView:set_orientation,info");
                        var horizontal = orientation === "horizontal";
                        if (horizontal !== this._horizontal) {
                            this._horizontal = horizontal;
                            this._setupOrientation();
                            this._pageManager.setOrientation(this._horizontal);
                        }
                    }
                },

                /// <field type="object" locid="WinJS.UI.FlipView.itemDataSource" helpKeyword="WinJS.UI.FlipView.itemDataSource">
                /// Gets or sets the data source that provides the FlipView with items to display.
                /// The FlipView displays one item at a time, each on its own page.
                /// </field>
                itemDataSource: {
                    get: function () {
                        return this._dataSource;
                    },

                    set: function (dataSource) {
                        _WriteProfilerMark("WinJS.UI.FlipView:set_itemDataSource,info");
                        this._dataSourceAfterRefresh = dataSource || new BindingList.List().dataSource;
                        this._refresh();
                    }
                },

                /// <field type="Function" locid="WinJS.UI.FlipView.itemTemplate" helpKeyword="WinJS.UI.FlipView.itemTemplate" potentialValueSelector="[data-win-control='WinJS.Binding.Template']">
                /// Gets or sets a WinJS.Binding.Template or a function that defines the HTML for each item's page.
                /// </field>
                itemTemplate: {
                    get: function () {
                        return this._itemRenderer;
                    },

                    set: function (itemTemplate) {
                        _WriteProfilerMark("WinJS.UI.FlipView:set_itemTemplate,info");
                        this._itemRendererAfterRefresh = this._getItemRenderer(itemTemplate);
                        this._refresh();
                    }
                },

                /// <field type="Number" integer="true" locid="WinJS.UI.FlipView.itemSpacing" helpKeyword="WinJS.UI.FlipView.itemSpacing">
                /// Gets or sets the spacing between items, in pixels.
                /// </field>
                itemSpacing: {
                    get: function () {
                        return this._pageManager.getItemSpacing();
                    },

                    set: function (spacing) {
                        _WriteProfilerMark("WinJS.UI.FlipView:set_itemSpacing,info");
                        spacing = spacing >> 0;
                        spacing = spacing < 0 ? 0 : spacing;
                        this._pageManager.setItemSpacing(spacing);
                    }
                },

                count: function FlipView_count() {
                    /// <signature helpKeyword="WinJS.UI.FlipView.count">
                    /// <summary locid="WinJS.UI.FlipView.count">
                    /// Returns the number of items in the FlipView object's itemDataSource.
                    /// </summary>
                    /// <returns type="WinJS.Promise" locid="WinJS.UI.FlipView.count_returnValue">
                    /// A Promise that contains the number of items in the list
                    /// or WinJS.UI.CountResult.unknown if the count is unavailable.
                    /// </returns>
                    /// </signature>

                    _WriteProfilerMark("WinJS.UI.FlipView:count,info");
                    var that = this;
                    return new Promise(function (complete, error) {
                        if (that._itemsManager) {
                            if (that._pageManager._cachedSize === _UI.CountResult.unknown || that._pageManager._cachedSize >= 0) {
                                complete(that._pageManager._cachedSize);
                            } else {
                                that._dataSource.getCount().then(function (count) {
                                    that._pageManager._cachedSize = count;
                                    complete(count);
                                });
                            }
                        } else {
                            error(FlipView.noitemsManagerForCount);
                        }
                    });
                },

                setCustomAnimations: function FlipView_setCustomAnimations(animations) {
                    /// <signature helpKeyword="WinJS.UI.FlipView.setCustomAnimations">
                    /// <summary locid="WinJS.UI.FlipView.setCustomAnimations">
                    /// Sets custom animations for the FlipView to use when navigating between pages.
                    /// </summary>
                    /// <param name="animations" type="Object" locid="WinJS.UI.FlipView.setCustomAnimations_p:animations">
                    /// An object containing up to three fields, one for each navigation action: next, previous, and jump
                    /// Each of those fields must be a function with this signature: function (outgoingPage, incomingPage).
                    /// This function returns a WinJS.Promise object that completes once the animations are finished.
                    /// If a field is null or undefined, the FlipView reverts to its default animation for that action.
                    /// </param>
                    /// </signature>
                    _WriteProfilerMark("WinJS.UI.FlipView:setCustomAnimations,info");

                    if (animations.next !== undefined) {
                        this._nextAnimation = animations.next;
                    }
                    if (animations.previous !== undefined) {
                        this._prevAnimation = animations.previous;
                    }
                    if (animations.jump !== undefined) {
                        this._jumpAnimation = animations.jump;
                    }
                },

                forceLayout: function FlipView_forceLayout() {
                    /// <signature helpKeyword="WinJS.UI.FlipView.forceLayout">
                    /// <summary locid="WinJS.UI.FlipView.forceLayout">
                    /// Forces the FlipView to update its layout.
                    /// Use this function when making the FlipView visible again after its style.display property had been set to "none".
                    /// </summary>
                    /// </signature>
                    _WriteProfilerMark("WinJS.UI.FlipView:forceLayout,info");

                    this._pageManager.resized();
                },

                // Private members

                _initializeFlipView: function FlipView_initializeFlipView(element, horizontal, dataSource, itemRenderer, initialIndex, itemSpacing) {
                    this._flipviewDiv = element;
                    _ElementUtilities.addClass(this._flipviewDiv, flipViewClass);
                    this._contentDiv = _Global.document.createElement("div");
                    this._panningDivContainer = _Global.document.createElement("div");
                    this._panningDivContainer.className = "win-surface";
                    this._panningDiv = _Global.document.createElement("div");
                    this._prevButton = _Global.document.createElement("button");
                    this._nextButton = _Global.document.createElement("button");
                    this._horizontal = horizontal;
                    this._dataSource = dataSource;
                    this._itemRenderer = itemRenderer;
                    this._itemsManager = null;
                    this._pageManager = null;

                    var stylesRequiredForFullFeatureMode = [
                        "scroll-limit-x-max",
                        "scroll-limit-x-min",
                        "scroll-limit-y-max",
                        "scroll-limit-y-min",
                        "scroll-snap-type",
                        "scroll-snap-x",
                        "scroll-snap-y",
                        "overflow-style",
                    ];
                    var allFeaturesSupported = true,
                        styleEquivalents = _BaseUtils._browserStyleEquivalents;
                    for (var i = 0, len = stylesRequiredForFullFeatureMode.length; i < len; i++) {
                        allFeaturesSupported = allFeaturesSupported && !!(styleEquivalents[stylesRequiredForFullFeatureMode[i]]);
                    }
                    allFeaturesSupported = allFeaturesSupported && !!_BaseUtils._browserEventEquivalents["manipulationStateChanged"];
                    this._environmentSupportsTouch = allFeaturesSupported;

                    var accName = this._flipviewDiv.getAttribute("aria-label");
                    if (!accName) {
                        this._flipviewDiv.setAttribute("aria-label", "");
                    }

                    this._flipviewDiv.setAttribute("role", "listbox");
                    if (!this._flipviewDiv.style.overflow) {
                        this._flipviewDiv.style.overflow = "hidden";
                    }
                    this._contentDiv.style.position = "relative";
                    this._contentDiv.style.zIndex = 0;
                    this._contentDiv.style.width = "100%";
                    this._contentDiv.style.height = "100%";
                    this._panningDiv.style.position = "relative";
                    this._panningDivContainer.style.position = "relative";
                    this._panningDivContainer.style.width = "100%";
                    this._panningDivContainer.style.height = "100%";
                    this._panningDivContainer.setAttribute("role", "group");
                    this._panningDivContainer.setAttribute("aria-label", strings.panningContainerAriaLabel);

                    this._contentDiv.appendChild(this._panningDivContainer);
                    this._flipviewDiv.appendChild(this._contentDiv);

                    this._panningDiv.style.width = "100%";
                    this._panningDiv.style.height = "100%";
                    this._setupOrientation();
                    function setUpButton(button) {
                        button.setAttribute("aria-hidden", true);
                        button.style.visibility = "hidden";
                        button.style.opacity = 0.0;
                        button.tabIndex = -1;
                        button.style.zIndex = 1000;
                    }
                    setUpButton(this._prevButton);
                    setUpButton(this._nextButton);
                    this._prevButton.setAttribute("aria-label", previousButtonLabel);
                    this._nextButton.setAttribute("aria-label", nextButtonLabel);
                    this._prevButton.setAttribute("type", "button");
                    this._nextButton.setAttribute("type", "button");
                    this._panningDivContainer.appendChild(this._panningDiv);
                    this._contentDiv.appendChild(this._prevButton);
                    this._contentDiv.appendChild(this._nextButton);

                    var that = this;

                    this._itemsManagerCallback = {
                        // Callbacks for itemsManager
                        inserted: function FlipView_inserted(itemPromise, previousHandle, nextHandle) {
                            that._itemsManager._itemFromPromise(itemPromise).then(function (element) {
                                var previous = that._itemsManager._elementFromHandle(previousHandle);
                                var next = that._itemsManager._elementFromHandle(nextHandle);
                                that._pageManager.inserted(element, previous, next, true);
                            });
                        },

                        countChanged: function FlipView_countChanged(newCount, oldCount) {
                            that._pageManager._cachedSize = newCount;

                            // Don't fire the datasourcecountchanged event when there is a state transition
                            if (oldCount !== _UI.CountResult.unknown) {
                                that._fireDatasourceCountChangedEvent();
                            }
                        },

                        changed: function FlipView_changed(newElement, oldElement) {
                            that._pageManager.changed(newElement, oldElement);
                        },

                        moved: function FlipView_moved(element, prev, next, itemPromise) {
                            var elementReady = function (element) {
                                that._pageManager.moved(element, prev, next);
                            };

                            // If we haven't instantiated this item yet, do so now
                            if (!element) {
                                that._itemsManager._itemFromPromise(itemPromise).then(elementReady);
                            }
                            else {
                                elementReady(element);
                            }

                        },

                        removed: function FlipView_removed(element, mirage) {
                            if (element) {
                                that._pageManager.removed(element, mirage, true);
                            }
                        },

                        knownUpdatesComplete: function FlipView_knownUpdatesComplete() {
                        },

                        beginNotifications: function FlipView_beginNotifications() {
                            that._cancelAnimation();
                            that._pageManager.notificationsStarted();
                        },

                        endNotifications: function FlipView_endNotifications() {
                            that._pageManager.notificationsEnded();
                        },

                        itemAvailable: function FlipView_itemAvailable(real, placeholder) {
                            that._pageManager.itemRetrieved(real, placeholder);
                        },

                        reload: function FlipView_reload() {
                            that._pageManager.reload();
                        }
                    };

                    if (this._dataSource) {
                        this._itemsManager = _ItemsManager._createItemsManager(this._dataSource, this._itemRenderer, this._itemsManagerCallback, {
                            ownerElement: this._flipviewDiv
                        });
                    }

                    this._pageManager = new _PageManager._FlipPageManager(this._flipviewDiv, this._panningDiv, this._panningDivContainer, this._itemsManager, itemSpacing, allFeaturesSupported,
                    {
                        hidePreviousButton: function () {
                            that._hasPrevContent = false;
                            that._fadeOutButton("prev");
                            that._prevButton.setAttribute("aria-hidden", true);
                        },

                        showPreviousButton: function () {
                            that._hasPrevContent = true;
                            that._fadeInButton("prev");
                            that._prevButton.setAttribute("aria-hidden", false);
                        },

                        hideNextButton: function () {
                            that._hasNextContent = false;
                            that._fadeOutButton("next");
                            that._nextButton.setAttribute("aria-hidden", true);
                        },

                        showNextButton: function () {
                            that._hasNextContent = true;
                            that._fadeInButton("next");
                            that._nextButton.setAttribute("aria-hidden", false);
                        }
                    });

                    this._pageManager.initialize(initialIndex, this._horizontal, this._environmentSupportsTouch);

                    this._dataSource.getCount().then(function (count) {
                        that._pageManager._cachedSize = count;
                    });

                    this._prevButton.addEventListener("click", function () {
                        that.previous();
                    }, false);

                    this._nextButton.addEventListener("click", function () {
                        that.next();
                    }, false);

                    new _ElementUtilities._MutationObserver(flipViewPropertyChanged).observe(this._flipviewDiv, { attributes: true, attributeFilter: ["dir", "style"] });
                    this._cachedStyleDir = this._flipviewDiv.style.direction;

                    this._flipviewDiv.addEventListener("mselementresize", flipviewResized);
                    _ElementUtilities._resizeNotifier.subscribe(this._flipviewDiv, flipviewResized);

                    this._contentDiv.addEventListener("mouseleave", function () {
                        that._mouseInViewport = false;
                    }, false);

                    var PT_TOUCH = _ElementUtilities._MSPointerEvent.MSPOINTER_TYPE_TOUCH || "touch";
                    function handleShowButtons(e) {
                        if (e.pointerType !== PT_TOUCH) {
                            that._touchInteraction = false;
                            if (e.screenX === that._lastMouseX && e.screenY === that._lastMouseY) {
                                return;
                            }
                            that._lastMouseX = e.screenX;
                            that._lastMouseY = e.screenY;
                            that._mouseInViewport = true;
                            that._fadeInButton("prev");
                            that._fadeInButton("next");
                            that._fadeOutButtons();
                        }
                    }

                    if (this._environmentSupportsTouch) {
                        _ElementUtilities._addEventListener(this._contentDiv, "pointerdown", function (e) {
                            if (e.pointerType === PT_TOUCH) {
                                that._mouseInViewport = false;
                                that._touchInteraction = true;
                                that._fadeOutButtons(true);
                            } else {
                                that._touchInteraction = false;
                                if (!that._isInteractive(e.target)) {
                                    // Disable the default behavior of the mouse wheel button to avoid auto-scroll
                                    if ((e.buttons & 4) !== 0) {
                                        e.stopPropagation();
                                        e.preventDefault();
                                    }
                                }
                            }
                        }, false);

                        _ElementUtilities._addEventListener(this._contentDiv, "pointermove", handleShowButtons, false);
                        
                        _ElementUtilities._addEventListener(this._contentDiv, "pointerup", function (e) {
                            if (e.pointerType !== PT_TOUCH) {
                                that._touchInteraction = false;
                            }
                        }, false);
                    }

                    this._panningDivContainer.addEventListener("scroll", function () {
                        that._scrollPosChanged();
                    }, false);

                    this._panningDiv.addEventListener("deactivate", function () {
                        if (!that._touchInteraction) {
                            that._fadeOutButtons();
                        }
                    }, true);

                    // When an element is removed and inserted, its scroll position gets reset to 0 (and no onscroll event is generated). This is a major problem
                    // for the flipview thanks to the fact that we 1) Do a lot of inserts/removes of child elements, and 2) Depend on our scroll location being right to
                    // display the right stuff. The page manager preserves scroll location. When a flipview element is reinserted, it'll fire DOMNodeInserted and we can reset
                    // its scroll location there.
                    // This event handler won't be hit in IE8.
                    this._flipviewDiv.addEventListener("DOMNodeInserted", function (event) {
                        if (event.target === that._flipviewDiv) {
                            that._pageManager.resized();
                        }
                    }, false);

                    this._flipviewDiv.addEventListener("keydown", function (event) {
                        var cancelBubbleIfHandled = true;
                        if (!that._isInteractive(event.target)) {
                            var Key = _ElementUtilities.Key,
                                handled = false;
                            if (that._horizontal) {
                                switch (event.keyCode) {
                                    case Key.leftArrow:
                                        (that._rtl ? that.next() : that.previous());
                                        handled = true;
                                        break;

                                    case Key.pageUp:
                                        that.previous();
                                        handled = true;
                                        break;

                                    case Key.rightArrow:
                                        (that._rtl ? that.previous() : that.next());
                                        handled = true;
                                        break;

                                    case Key.pageDown:
                                        that.next();
                                        handled = true;
                                        break;

                                        // Prevent scrolling pixel by pixel, but let the event bubble up
                                    case Key.upArrow:
                                    case Key.downArrow:
                                        handled = true;
                                        cancelBubbleIfHandled = false;
                                        break;
                                }
                            } else {
                                switch (event.keyCode) {
                                    case Key.upArrow:
                                    case Key.pageUp:
                                        that.previous();
                                        handled = true;
                                        break;

                                    case Key.downArrow:
                                    case Key.pageDown:
                                        that.next();
                                        handled = true;
                                        break;

                                    case Key.space:
                                        handled = true;
                                        break;
                                }
                            }

                            switch (event.keyCode) {
                                case Key.home:
                                    that.currentPage = 0;
                                    handled = true;
                                    break;

                                case Key.end:
                                    if (that._pageManager._cachedSize > 0) {
                                        that.currentPage = that._pageManager._cachedSize - 1;
                                    }
                                    handled = true;
                                    break;
                            }

                            if (handled) {
                                event.preventDefault();
                                event.cancelBubble = cancelBubbleIfHandled;
                                return true;
                            }
                        }
                    }, false);
                },

                _windowWheelHandler: function FlipView_windowWheelHandler(ev) {
                    // When you are using the mouse wheel to scroll a horizontal area such as a WinJS.UI.Hub and one of the sections
                    // has a WinJS.UI.FlipView you may get stuck on that item. This logic is to allow a scroll event to skip the flipview's
                    // overflow scroll div and instead go to the parent scroller. We only skip the scroll wheel event for a fixed amount of time
                    var wheelWithinFlipper = ev.target && (this._flipviewDiv.contains(ev.target) || this._flipviewDiv === ev.target);
                    var that = this;
                    var now = _BaseUtils._now();
                    var withinAvoidTime = this._avoidTrappingTime > now;

                    if (!wheelWithinFlipper || withinAvoidTime) {
                        this._avoidTrappingTime = now + avoidTrapDelay;
                    }

                    if (wheelWithinFlipper && withinAvoidTime) {
                        this._panningDivContainer.style["overflowX"] = "hidden";
                        this._panningDivContainer.style["overflowY"] = "hidden";
                        _BaseUtils._yieldForDomModification(function () {
                            // Avoid being stuck between items
                            that._pageManager._ensureCentered();

                            if (that._horizontal) {
                                that._panningDivContainer.style["overflowX"] = (that._environmentSupportsTouch ? "scroll" : "hidden");
                                that._panningDivContainer.style["overflowY"] = "hidden";
                            } else {
                                that._panningDivContainer.style["overflowY"] = (that._environmentSupportsTouch ? "scroll" : "hidden");
                                that._panningDivContainer.style["overflowX"] = "hidden";
                            }
                        });
                    }
                },

                _isInteractive: function FlipView_isInteractive(element) {
                    if (element.parentNode) {
                        var matches = element.parentNode.querySelectorAll(".win-interactive, .win-interactive *");
                        for (var i = 0, len = matches.length; i < len; i++) {
                            if (matches[i] === element) {
                                return true;
                            }
                        }
                    }
                    return false;
                },

                _refreshHandler: function FlipView_refreshHandler() {
                    var dataSource = this._dataSourceAfterRefresh || this._dataSource,
                        renderer = this._itemRendererAfterRefresh || this._itemRenderer,
                        initialIndex = this._indexAfterRefresh || 0;
                    this._setDatasource(dataSource, renderer, initialIndex);
                    this._dataSourceAfterRefresh = null;
                    this._itemRendererAfterRefresh = null;
                    this._indexAfterRefresh = 0;
                    this._refreshTimer = false;
                },

                _refresh: function FlipView_refresh() {
                    if (!this._refreshTimer) {
                        var that = this;
                        this._refreshTimer = true;
                        // Batch calls to _refresh
                        Scheduler.schedule(function FlipView_refreshHandler() {
                            if (that._refreshTimer && !that._disposed) {
                                that._refreshHandler();
                            }
                        }, Scheduler.Priority.high, null, "WinJS.UI.FlipView._refreshHandler");
                    }
                },

                _getItemRenderer: function FlipView_getItemRenderer(itemTemplate) {
                    var itemRenderer = null;
                    if (typeof itemTemplate === "function") {
                        var itemPromise = new Promise(function () { });
                        var itemTemplateResult = itemTemplate(itemPromise);
                        if (itemTemplateResult.element) {
                            if (typeof itemTemplateResult.element === "object" && typeof itemTemplateResult.element.then === "function") {
                                // This renderer returns a promise to an element
                                itemRenderer = function (itemPromise) {
                                    var elementRoot = _Global.document.createElement("div");
                                    elementRoot.className = "win-template";
                                    _Dispose.markDisposable(elementRoot);
                                    return {
                                        element: elementRoot,
                                        renderComplete: itemTemplate(itemPromise).element.then(function (element) {
                                            elementRoot.appendChild(element);
                                        })
                                    };
                                };
                            } else {
                                // This renderer already returns a placeholder
                                itemRenderer = itemTemplate;
                            }
                        } else {
                            // Return a renderer that has return a placeholder
                            itemRenderer = function (itemPromise) {
                                var elementRoot = _Global.document.createElement("div");
                                elementRoot.className = "win-template";
                                _Dispose.markDisposable(elementRoot);
                                // The pagecompleted event relies on this elementRoot
                                // to ensure that we are still looking at the same
                                // item after the render completes.
                                return {
                                    element: elementRoot,
                                    renderComplete: itemPromise.then(function () {
                                        return Promise.as(itemTemplate(itemPromise)).then(function (element) {
                                            elementRoot.appendChild(element);
                                        });
                                    })
                                };
                            };
                        }
                    } else if (typeof itemTemplate === "object") {
                        itemRenderer = itemTemplate.renderItem;
                    }
                    return itemRenderer;
                },

                _navigate: function FlipView_navigate(goForward, cancelAnimationCallback) {
                    if (_BaseUtils.validation && this._refreshTimer) {
                        throw new _ErrorFromName("WinJS.UI.FlipView.NavigationDuringStateChange", strings.navigationDuringStateChange);
                    }

                    if (!this._animating) {
                        this._animatingForward = goForward;
                    }
                    this._goForward = goForward;

                    if (this._animating && !this._cancelAnimation()) {
                        return false;
                    }
                    var that = this;
                    var customAnimation = (goForward ? this._nextAnimation : this._prevAnimation),
                        animation = (customAnimation ? customAnimation : this._defaultAnimation.bind(this)),
                        completionCallback = function (goForward) { that._completeNavigation(goForward); },
                        elements = this._pageManager.startAnimatedNavigation(goForward, cancelAnimationCallback, completionCallback);
                    if (elements) {
                        this._animationsStarted();
                        var outgoingElement = elements.outgoing.pageRoot,
                            incomingElement = elements.incoming.pageRoot;
                        this._contentDiv.appendChild(outgoingElement);
                        this._contentDiv.appendChild(incomingElement);

                        this._completeNavigationPending = true;
                        animation(outgoingElement, incomingElement).then(function () {
                            if (that._completeNavigationPending) {
                                completionCallback(that._goForward);
                            }
                        }).done();
                        return true;
                    } else {
                        return false;
                    }
                },

                _cancelDefaultAnimation: function FlipView_cancelDefaultAnimation(outgoingElement, incomingElement) {
                    // Cancel the fadeOut animation
                    outgoingElement.style.opacity = 0;

                    // Cancel the enterContent animation
                    incomingElement.style.animationName = "";
                    incomingElement.style.opacity = 1;
                },

                _cancelAnimation: function FlipView_cancelAnimation() {
                    if (this._pageManager._navigationAnimationRecord &&
                        this._pageManager._navigationAnimationRecord.completionCallback) {

                        var cancelCallback = this._pageManager._navigationAnimationRecord.cancelAnimationCallback;
                        if (cancelCallback) {
                            cancelCallback = cancelCallback.bind(this);
                        }

                        if (this._pageManager._navigationAnimationRecord && this._pageManager._navigationAnimationRecord.elementContainers) {
                            var outgoingPage = this._pageManager._navigationAnimationRecord.elementContainers[0],
                            incomingPage = this._pageManager._navigationAnimationRecord.elementContainers[1],
                            outgoingElement = outgoingPage.pageRoot,
                            incomingElement = incomingPage.pageRoot;

                            // Invoke the function that will cancel the animation
                            if (cancelCallback) {
                                cancelCallback(outgoingElement, incomingElement);
                            }

                            // Invoke the completion function after cancelling the animation
                            this._pageManager._navigationAnimationRecord.completionCallback(this._animatingForward);

                            return true;
                        }
                    }
                    return false;
                },

                _completeNavigation: function FlipView_completeNavigation(goForward) {
                    if (this._disposed) {
                        return;
                    }

                    this._pageManager._resizing = false;
                    if (this._pageManager._navigationAnimationRecord &&
                        this._pageManager._navigationAnimationRecord.elementContainers) {

                        var outgoingPage = this._pageManager._navigationAnimationRecord.elementContainers[0],
                            incomingPage = this._pageManager._navigationAnimationRecord.elementContainers[1],
                            outgoingElement = outgoingPage.pageRoot,
                            incomingElement = incomingPage.pageRoot;

                        if (outgoingElement.parentNode) {
                            outgoingElement.parentNode.removeChild(outgoingElement);
                        }
                        if (incomingElement.parentNode) {
                            incomingElement.parentNode.removeChild(incomingElement);
                        }
                        this._pageManager.endAnimatedNavigation(goForward, outgoingPage, incomingPage);
                        this._fadeOutButtons();
                        this._scrollPosChanged();
                        this._pageManager._ensureCentered(true);
                        this._animationsFinished();
                    }
                    this._completeNavigationPending = false;
                },

                _completeJump: function FlipView_completeJump() {
                    if (this._disposed) {
                        return;
                    }

                    this._pageManager._resizing = false;
                    if (this._pageManager._navigationAnimationRecord &&
                        this._pageManager._navigationAnimationRecord.elementContainers) {

                        var outgoingPage = this._pageManager._navigationAnimationRecord.elementContainers[0],
                            incomingPage = this._pageManager._navigationAnimationRecord.elementContainers[1],
                            outgoingElement = outgoingPage.pageRoot,
                            incomingElement = incomingPage.pageRoot;

                        if (outgoingElement.parentNode) {
                            outgoingElement.parentNode.removeChild(outgoingElement);
                        }
                        if (incomingElement.parentNode) {
                            incomingElement.parentNode.removeChild(incomingElement);
                        }

                        this._pageManager.endAnimatedJump(outgoingPage, incomingPage);
                        this._animationsFinished();
                    }
                    this._completeJumpPending = false;
                },

                _resize: function FlipView_resize() {
                    this._pageManager.resized();
                },

                _setCurrentIndex: function FlipView_setCurrentIndex(index) {
                    return this._pageManager.jumpToIndex(index);
                },

                _getCurrentIndex: function FlipView_getCurrentIndex() {
                    return this._pageManager.currentIndex();
                },

                _setDatasource: function FlipView_setDatasource(source, template, index) {
                    if (this._animating) {
                        this._cancelAnimation();
                    }

                    var initialIndex = 0;
                    if (index !== undefined) {
                        initialIndex = index;
                    }
                    this._dataSource = source;
                    this._itemRenderer = template;
                    var oldItemsManager = this._itemsManager;
                    this._itemsManager = _ItemsManager._createItemsManager(this._dataSource, this._itemRenderer, this._itemsManagerCallback, {
                        ownerElement: this._flipviewDiv
                    });
                    this._dataSource = this._itemsManager.dataSource;

                    var that = this;
                    this._dataSource.getCount().then(function (count) {
                        that._pageManager._cachedSize = count;
                    });
                    this._pageManager.setNewItemsManager(this._itemsManager, initialIndex);
                    oldItemsManager && oldItemsManager.release();
                },

                _fireDatasourceCountChangedEvent: function FlipView_fireDatasourceCountChangedEvent() {
                    var that = this;
                    Scheduler.schedule(function FlipView_dispatchDataSourceCountChangedEvent() {
                        var event = _Global.document.createEvent("Event");
                        event.initEvent(FlipView.datasourceCountChangedEvent, true, true);
                        _WriteProfilerMark("WinJS.UI.FlipView:dataSourceCountChangedEvent,info");
                        that._flipviewDiv.dispatchEvent(event);
                    }, Scheduler.Priority.normal, null, "WinJS.UI.FlipView._dispatchDataSourceCountChangedEvent");
                },

                _scrollPosChanged: function FlipView_scrollPosChanged() {
                    this._pageManager.scrollPosChanged();
                },

                _axisAsString: function FlipView_axisAsString() {
                    return (this._horizontal ? "horizontal" : "vertical");
                },

                _setupOrientation: function FlipView_setupOrientation() {
                    if (this._horizontal) {
                        this._panningDivContainer.style["overflowX"] = (this._environmentSupportsTouch ? "scroll" : "hidden");
                        this._panningDivContainer.style["overflowY"] = "hidden";
                        var rtl = _Global.getComputedStyle(this._flipviewDiv, null).direction === "rtl";
                        this._rtl = rtl;
                        if (rtl) {
                            this._prevButton.className = navButtonClass + " " + navButtonRightClass;
                            this._nextButton.className = navButtonClass + " " + navButtonLeftClass;
                        } else {
                            this._prevButton.className = navButtonClass + " " + navButtonLeftClass;
                            this._nextButton.className = navButtonClass + " " + navButtonRightClass;
                        }
                        this._prevButton.innerHTML = (rtl ? rightArrowGlyph : leftArrowGlyph);
                        this._nextButton.innerHTML = (rtl ? leftArrowGlyph : rightArrowGlyph);
                    } else {
                        this._panningDivContainer.style["overflowY"] = (this._environmentSupportsTouch ? "scroll" : "hidden");
                        this._panningDivContainer.style["overflowX"] = "hidden";
                        this._prevButton.className = navButtonClass + " " + navButtonTopClass;
                        this._nextButton.className = navButtonClass + " " + navButtonBottomClass;
                        this._prevButton.innerHTML = topArrowGlyph;
                        this._nextButton.innerHTML = bottomArrowGlyph;
                    }
                    this._panningDivContainer.style["msOverflowStyle"] = "none";
                },

                _fadeInButton: function FlipView_fadeInButton(button, forceShow) {
                    if (this._mouseInViewport || forceShow || !this._environmentSupportsTouch) {
                        if (button === "next" && this._hasNextContent) {
                            if (this._nextButtonAnimation) {
                                this._nextButtonAnimation.cancel();
                                this._nextButtonAnimation = null;
                            }

                            this._nextButton.style.visibility = "visible";
                            this._nextButtonAnimation = this._fadeInFromCurrentValue(this._nextButton);
                        } else if (button === "prev" && this._hasPrevContent) {
                            if (this._prevButtonAnimation) {
                                this._prevButtonAnimation.cancel();
                                this._prevButtonAnimation = null;
                            }

                            this._prevButton.style.visibility = "visible";
                            this._prevButtonAnimation = this._fadeInFromCurrentValue(this._prevButton);
                        }
                    }
                },

                _fadeOutButton: function FlipView_fadeOutButton(button) {
                    var that = this;
                    if (button === "next") {
                        if (this._nextButtonAnimation) {
                            this._nextButtonAnimation.cancel();
                            this._nextButtonAnimation = null;
                        }

                        this._nextButtonAnimation = Animations.fadeOut(this._nextButton).
                            then(function () {
                                that._nextButton.style.visibility = "hidden";
                            });
                        return this._nextButtonAnimation;
                    } else {
                        if (this._prevButtonAnimation) {
                            this._prevButtonAnimation.cancel();
                            this._prevButtonAnimation = null;
                        }

                        this._prevButtonAnimation = Animations.fadeOut(this._prevButton).
                            then(function () {
                                that._prevButton.style.visibility = "hidden";
                            });
                        return this._prevButtonAnimation;
                    }
                },

                _fadeOutButtons: function FlipView_fadeOutButtons(immediately) {
                    if (!this._environmentSupportsTouch) {
                        return;
                    }

                    if (this._buttonFadePromise) {
                        this._buttonFadePromise.cancel();
                        this._buttonFadePromise = null;
                    }

                    var that = this;
                    this._buttonFadePromise = (immediately ? Promise.wrap() : Promise.timeout(_TransitionAnimation._animationTimeAdjustment(buttonFadeDelay))).then(function () {
                        that._fadeOutButton("prev");
                        that._fadeOutButton("next");
                        that._buttonFadePromise = null;
                    });
                },

                _animationsStarted: function FlipView_animationsStarted() {
                    this._animating = true;
                },

                _animationsFinished: function FlipView_animationsFinished() {
                    this._animating = false;
                },

                _defaultAnimation: function FlipView_defaultAnimation(curr, next) {
                    var incomingPageMove = {};
                    next.style.left = "0px";
                    next.style.top = "0px";
                    next.style.opacity = 0.0;
                    var pageDirection = ((curr.itemIndex > next.itemIndex) ? -animationMoveDelta : animationMoveDelta);
                    incomingPageMove.left = (this._horizontal ? (this._rtl ? -pageDirection : pageDirection) : 0) + "px";
                    incomingPageMove.top = (this._horizontal ? 0 : pageDirection) + "px";
                    var fadeOutPromise = Animations.fadeOut(curr),
                        enterContentPromise = Animations.enterContent(next, [incomingPageMove], { mechanism: "transition" });
                    return Promise.join([fadeOutPromise, enterContentPromise]);
                },

                _fadeInFromCurrentValue: function FlipView_fadeInFromCurrentValue(shown) {
                    // Intentionally not using the PVL fadeIn animation because we don't want
                    // to start always from 0 in some cases
                    return _TransitionAnimation.executeTransition(
                        shown,
                        {
                            property: "opacity",
                            delay: 0,
                            duration: 167,
                            timing: "linear",
                            to: 1
                        });
                }
            }, _Constants);

            _Base.Class.mix(FlipView, _Events.createEventProperties(
                FlipView.datasourceCountChangedEvent,
                FlipView.pageVisibilityChangedEvent,
                FlipView.pageSelectedEvent,
                FlipView.pageCompletedEvent));
            _Base.Class.mix(FlipView, _Control.DOMEventMixin);

            return FlipView;
        })
    });

});

define('require-style!less/animation-library',[],function(){});

define('require-style!less/typography',[],function(){});

define('require-style!less/desktop/styles-intrinsic',[],function(){});

define('require-style!less/desktop/colors-intrinsic',[],function(){});
