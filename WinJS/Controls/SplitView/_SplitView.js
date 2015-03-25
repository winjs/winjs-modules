// Copyright (c) Microsoft Corporation.  All Rights Reserved. Licensed under the MIT License. See License.txt in the project root for license information.
/// <reference path="../../../../../typings/require.d.ts" />
define(["require", "exports", '../../Animations', '../../Core/_Base', '../../Core/_BaseUtils', '../../Utilities/_Control', '../../Utilities/_Dispose', '../../Utilities/_ElementUtilities', '../../Core/_ErrorFromName', '../../Core/_Events', '../../Core/_Global', '../../_LightDismissService', '../../Promise', '../../_Signal'], function(require, exports, Animations, _Base, _BaseUtils, _Control, _Dispose, _ElementUtilities, _ErrorFromName, _Events, _Global, _LightDismissService, Promise, _Signal) {
    require(["require-style!less/styles-splitview"]);
    require(["require-style!less/colors-splitview"]);

    "use strict";

    var transformNames = _BaseUtils._browserStyleEquivalents["transform"];
    var Strings = {
        get duplicateConstruction() {
            return "Invalid argument: Controls may only be instantiated one time for each DOM element";
        }
    };
    var ClassNames = {
        splitView: "win-splitview",
        pane: "win-splitview-pane",
        content: "win-splitview-content",
        // hidden/shown
        paneHidden: "win-splitview-pane-hidden",
        paneShown: "win-splitview-pane-shown",
        _panePlaceholder: "win-splitview-paneplaceholder",
        _paneWrapper: "win-splitview-panewrapper",
        _contentWrapper: "win-splitview-contentwrapper",
        // placement
        _placementLeft: "win-splitview-placementleft",
        _placementRight: "win-splitview-placementright",
        _placementTop: "win-splitview-placementtop",
        _placementBottom: "win-splitview-placementbottom",
        // hidden display mode
        _hiddenDisplayNone: "win-splitview-hiddendisplaynone",
        _hiddenDisplayInline: "win-splitview-hiddendisplayinline",
        // shown display mode
        _shownDisplayInline: "win-splitview-showndisplayinline",
        _shownDisplayOverlay: "win-splitview-showndisplayoverlay"
    };
    var EventNames = {
        beforeShow: "beforeshow",
        afterShow: "aftershow",
        beforeHide: "beforehide",
        afterHide: "afterhide"
    };
    var Dimension = {
        width: "width",
        height: "height"
    };

    var HiddenDisplayMode = {
        /// <field locid="WinJS.UI.SplitView.HiddenDisplayMode.none" helpKeyword="WinJS.UI.SplitView.HiddenDisplayMode.none">
        /// When the pane is hidden, it is not visible and doesn't take up any space.
        /// </field>
        none: "none",
        /// <field locid="WinJS.UI.SplitView.HiddenDisplayMode.inline" helpKeyword="WinJS.UI.SplitView.HiddenDisplayMode.inline">
        /// When the pane is hidden, it occupies space leaving less room for the SplitView's content.
        /// </field>
        inline: "inline"
    };
    var ShownDisplayMode = {
        /// <field locid="WinJS.UI.SplitView.ShownDisplayMode.inline" helpKeyword="WinJS.UI.SplitView.ShownDisplayMode.inline">
        /// When the pane is shown, it occupies space leaving less room for the SplitView's content.
        /// </field>
        inline: "inline",
        /// <field locid="WinJS.UI.SplitView.ShownDisplayMode.overlay" helpKeyword="WinJS.UI.SplitView.ShownDisplayMode.overlay">
        /// When the pane is shown, it doesn't take up any space and it is light dismissable.
        /// </field>
        overlay: "overlay"
    };
    var PanePlacement = {
        /// <field locid="WinJS.UI.SplitView.PanePlacement.left" helpKeyword="WinJS.UI.SplitView.PanePlacement.left">
        /// Pane is positioned left of the SplitView's content.
        /// </field>
        left: "left",
        /// <field locid="WinJS.UI.SplitView.PanePlacement.right" helpKeyword="WinJS.UI.SplitView.PanePlacement.right">
        /// Pane is positioned right of the SplitView's content.
        /// </field>
        right: "right",
        /// <field locid="WinJS.UI.SplitView.PanePlacement.top" helpKeyword="WinJS.UI.SplitView.PanePlacement.top">
        /// Pane is positioned above the SplitView's content.
        /// </field>
        top: "top",
        /// <field locid="WinJS.UI.SplitView.PanePlacement.bottom" helpKeyword="WinJS.UI.SplitView.PanePlacement.bottom">
        /// Pane is positioned below the SplitView's content.
        /// </field>
        bottom: "bottom"
    };
    var hiddenDisplayModeClassMap = {};
    hiddenDisplayModeClassMap[HiddenDisplayMode.none] = ClassNames._hiddenDisplayNone;
    hiddenDisplayModeClassMap[HiddenDisplayMode.inline] = ClassNames._hiddenDisplayInline;
    var shownDisplayModeClassMap = {};
    shownDisplayModeClassMap[ShownDisplayMode.overlay] = ClassNames._shownDisplayOverlay;
    shownDisplayModeClassMap[ShownDisplayMode.inline] = ClassNames._shownDisplayInline;
    var panePlacementClassMap = {};
    panePlacementClassMap[PanePlacement.left] = ClassNames._placementLeft;
    panePlacementClassMap[PanePlacement.right] = ClassNames._placementRight;
    panePlacementClassMap[PanePlacement.top] = ClassNames._placementTop;
    panePlacementClassMap[PanePlacement.bottom] = ClassNames._placementBottom;

    // Versions of add/removeClass that are no ops when called with falsy class names.
    function addClass(element, className) {
        className && _ElementUtilities.addClass(element, className);
    }
    function removeClass(element, className) {
        className && _ElementUtilities.removeClass(element, className);
    }

    function rectToThickness(rect, dimension) {
        return (dimension === Dimension.width) ? {
            content: rect.contentWidth,
            total: rect.totalWidth
        } : {
            content: rect.contentHeight,
            total: rect.totalHeight
        };
    }

    // WinJS animation promises always complete successfully. This
    // helper allows an animation promise to complete in the canceled state
    // so that the success handler can be skipped when the animation is
    // interrupted.
    function cancelablePromise(animationPromise) {
        return Promise._cancelBlocker(animationPromise, function () {
            animationPromise.cancel();
        });
    }

    function resizeTransition(elementClipper, element, options) {
        return cancelablePromise(Animations._resizeTransition(elementClipper, element, options));
    }

    //
    // State machine
    //
    // Noop function, used in the various states to indicate that they don't support a given
    // message. Named with the somewhat cute name '_' because it reads really well in the states.
    function _() {
    }

    // Implementing the control as a state machine helps us correctly handle:
    //   - re-entrancy while firing events
    //   - calls into the control during asynchronous operations (e.g. animations)
    //
    // Many of the states do their "enter" work within a promise chain. The idea is that if
    // the state is interrupted and exits, the rest of its work can be skipped by canceling
    // the promise chain.
    // An interesting detail is that anytime the state may call into app code (e.g. due to
    // firing an event), the current promise must end and a new promise must be chained off of it.
    // This is necessary because the app code may interact with the control and cause it to
    // change states. If we didn't create a new promise, then the very next line of code that runs
    // after calling into app code may not be valid because the state may have exited. Starting a
    // new promise after each call into app code prevents us from having to worry about this
    // problem. In this configuration, when a promise's success handler runs, it guarantees that
    // the state hasn't exited.
    // For similar reasons, each of the promise chains created in "enter" starts off with a _Signal
    // which is completed at the end of the "enter" function (this boilerplate is abstracted away by
    // the "interruptible" function). The reason is that we don't want any of the code in "enter"
    // to run until the promise chain has been stored in a variable. If we didn't do this (e.g. instead,
    // started the promise chain with Promise.wrap()), then the "enter" code could trigger the "exit"
    // function (via app code) before the promise chain had been stored in a variable. Under these
    // circumstances, the promise chain would be uncancelable and so the "enter" work would be
    // unskippable. This wouldn't be good when we needed the state to exit early.
    // These two functions manage interruptible work promises (one creates them the other cancels
    // them). They communicate with each other thru the _interruptibleWorkPromises property which
    //  "interruptible" creates on your object.
    function interruptible(object, workFn) {
        object["_interruptibleWorkPromises"] = object["_interruptibleWorkPromises"] || [];
        var workStoredSignal = new _Signal();
        object["_interruptibleWorkPromises"].push(workFn(workStoredSignal.promise));
        workStoredSignal.complete();
    }

    function cancelInterruptibles() {
        (this["_interruptibleWorkPromises"] || []).forEach(function (workPromise) {
            workPromise.cancel();
        });
    }

    // Transitions:
    //   When created, the control will take one of the following initialization transitions depending on
    //   how the control's APIs have been used by the time it is inserted into the DOM:
    //     Init -> Hidden
    //     Init -> Shown
    //   Following that, the life of the SplitView will be dominated by the following
    //   sequences of transitions. In geneneral, these sequences are uninterruptible.
    //     Hidden -> BeforeShow -> Hidden (when preventDefault is called on beforeshow event)
    //     Hidden -> BeforeShow -> Showing -> Shown
    //     Shown -> BeforeHide -> Shown (when preventDefault is called on beforehide event)
    //     Shown -> BeforeHide -> Hiding -> Hidden
    //   However, any state can be interrupted to go to the Disposed state:
    //     * -> Disposed
    var States;
    (function (States) {
        function updateDomImpl() {
            this.splitView._updateDomImpl();
        }

        // Initial state. Initializes state on the SplitView shared by the various states.
        var Init = (function () {
            function Init() {
                this.name = "Init";
                this.exit = cancelInterruptibles;
                this.updateDom = _;
            }
            Init.prototype.enter = function (options) {
                var _this = this;
                interruptible(this, function (ready) {
                    return ready.then(function () {
                        options = options || {};

                        _this.splitView._dismissable = new _LightDismissService.LightDismissableElement({
                            element: _this.splitView._dom.paneWrapper,
                            tabIndex: -1,
                            onLightDismiss: function () {
                                _this.splitView.hidePane();
                            }
                        });
                        _this.splitView._cachedHiddenPaneThickness = null;

                        _this.splitView.paneHidden = true;
                        _this.splitView.hiddenDisplayMode = HiddenDisplayMode.inline;
                        _this.splitView.shownDisplayMode = ShownDisplayMode.overlay;
                        _this.splitView.panePlacement = PanePlacement.left;
                        _Control.setOptions(_this.splitView, options);

                        return _ElementUtilities._inDom(_this.splitView._dom.root).then(function () {
                            _this.splitView._rtl = _Global.getComputedStyle(_this.splitView._dom.root).direction === 'rtl';
                            _this.splitView._isShownMode = !_this._paneHidden;
                            _this.splitView._updateDomImpl();
                            _this.splitView._setState(_this._paneHidden ? Hidden : Shown);
                        });
                    });
                });
            };

            Object.defineProperty(Init.prototype, "paneHidden", {
                get: function () {
                    return this._paneHidden;
                },
                enumerable: true,
                configurable: true
            });
            Init.prototype.showPane = function () {
                this._paneHidden = false;
            };
            Init.prototype.hidePane = function () {
                this._paneHidden = true;
            };
            return Init;
        })();
        States.Init = Init;

        // A rest state. The SplitView pane is hidden and is waiting for the app to call showPane.
        var Hidden = (function () {
            function Hidden() {
                this.name = "Hidden";
                this.exit = _;
                this.paneHidden = true;
                this.hidePane = _;
                this.updateDom = updateDomImpl;
            }
            Hidden.prototype.enter = function (args) {
                args = args || {};
                if (args.showIsPending) {
                    this.showPane();
                }
            };

            Hidden.prototype.showPane = function () {
                this.splitView._setState(BeforeShow);
            };
            return Hidden;
        })();

        // An event state. The SplitView fires the beforeshow event.
        var BeforeShow = (function () {
            function BeforeShow() {
                this.name = "BeforeShow";
                this.exit = cancelInterruptibles;
                this.paneHidden = true;
                this.showPane = _;
                this.hidePane = _;
                this.updateDom = updateDomImpl;
            }
            BeforeShow.prototype.enter = function () {
                var _this = this;
                interruptible(this, function (ready) {
                    return ready.then(function () {
                        return _this.splitView._fireBeforeShow();
                    }).then(function (shouldShow) {
                        if (shouldShow) {
                            _this.splitView._setState(Showing);
                        } else {
                            _this.splitView._setState(Hidden);
                        }
                    });
                });
            };
            return BeforeShow;
        })();

        // An animation/event state. The SplitView plays its show animation and fires aftershow.
        var Showing = (function () {
            function Showing() {
                this.name = "Showing";
                this.exit = cancelInterruptibles;
                this.updateDom = _;
            }
            Showing.prototype.enter = function () {
                var _this = this;
                interruptible(this, function (ready) {
                    return ready.then(function () {
                        _this._hideIsPending = false;

                        _this.splitView._cachedHiddenPaneThickness = null;
                        var hiddenPaneThickness = _this.splitView._getHiddenPaneThickness();

                        _this.splitView._isShownMode = true;
                        _this.splitView._updateDomImpl();
                        return _this.splitView._playShowAnimation(hiddenPaneThickness);
                    }).then(function () {
                        _this.splitView._fireEvent(EventNames.afterShow); // Give opportunity for chain to be canceled when calling into app code
                    }).then(function () {
                        _this.splitView._updateDomImpl();
                        _this.splitView._setState(Shown, { hideIsPending: _this._hideIsPending });
                    });
                });
            };

            Object.defineProperty(Showing.prototype, "paneHidden", {
                get: function () {
                    return this._hideIsPending;
                },
                enumerable: true,
                configurable: true
            });
            Showing.prototype.showPane = function () {
                this._hideIsPending = false;
            };
            Showing.prototype.hidePane = function () {
                this._hideIsPending = true;
            };
            return Showing;
        })();

        // A rest state. The SplitView pane is shown and is waiting for the app to trigger hidePane.
        var Shown = (function () {
            function Shown() {
                this.name = "Shown";
                this.exit = _;
                this.paneHidden = false;
                this.showPane = _;
                this.updateDom = updateDomImpl;
            }
            Shown.prototype.enter = function (args) {
                args = args || {};
                if (args.hideIsPending) {
                    this.hidePane();
                }
            };

            Shown.prototype.hidePane = function () {
                this.splitView._setState(BeforeHide);
            };
            return Shown;
        })();

        // An event state. The SplitView fires the beforehide event.
        var BeforeHide = (function () {
            function BeforeHide() {
                this.name = "BeforeHide";
                this.exit = cancelInterruptibles;
                this.paneHidden = false;
                this.showPane = _;
                this.hidePane = _;
                this.updateDom = updateDomImpl;
            }
            BeforeHide.prototype.enter = function () {
                var _this = this;
                interruptible(this, function (ready) {
                    return ready.then(function () {
                        return _this.splitView._fireBeforeHide();
                    }).then(function (shouldHide) {
                        if (shouldHide) {
                            _this.splitView._setState(Hiding);
                        } else {
                            _this.splitView._setState(Shown);
                        }
                    });
                });
            };
            return BeforeHide;
        })();

        // An animation/event state. The SpitView plays the hide animation and fires the afterhide event.
        var Hiding = (function () {
            function Hiding() {
                this.name = "Hiding";
                this.exit = cancelInterruptibles;
                this.updateDom = _;
            }
            Hiding.prototype.enter = function () {
                var _this = this;
                interruptible(this, function (ready) {
                    return ready.then(function () {
                        _this._showIsPending = false;
                        return _this.splitView._playHideAnimation(_this.splitView._getHiddenPaneThickness());
                    }).then(function () {
                        _this.splitView._isShownMode = false;
                        _this.splitView._updateDomImpl();
                        _this.splitView._fireEvent(EventNames.afterHide); // Give opportunity for chain to be canceled when calling into app code
                    }).then(function () {
                        _this.splitView._updateDomImpl();
                        _this.splitView._setState(Hidden, { showIsPending: _this._showIsPending });
                    });
                });
            };

            Object.defineProperty(Hiding.prototype, "paneHidden", {
                get: function () {
                    return !this._showIsPending;
                },
                enumerable: true,
                configurable: true
            });
            Hiding.prototype.showPane = function () {
                this._showIsPending = true;
            };
            Hiding.prototype.hidePane = function () {
                this._showIsPending = false;
            };
            return Hiding;
        })();

        var Disposed = (function () {
            function Disposed() {
                this.name = "Disposed";
                this.exit = _;
                this.paneHidden = true;
                this.showPane = _;
                this.hidePane = _;
                this.updateDom = _;
            }
            Disposed.prototype.enter = function () {
                _LightDismissService.hidden(this.splitView._dismissable);
            };
            return Disposed;
        })();
        States.Disposed = Disposed;
    })(States || (States = {}));

    /// <field>
    /// <summary locid="WinJS.UI.SplitView">
    /// Displays a SplitView which renders a collapsable pane next to arbitrary HTML content.
    /// </summary>
    /// </field>
    /// <icon src="ui_winjs.ui.splitview.12x12.png" width="12" height="12" />
    /// <icon src="ui_winjs.ui.splitview.16x16.png" width="16" height="16" />
    /// <htmlSnippet supportsContent="true"><![CDATA[<div data-win-control="WinJS.UI.SplitView"></div>]]></htmlSnippet>
    /// <event name="beforeshow" locid="WinJS.UI.SplitView_e:beforeshow">Raised just before showing the pane. Call preventDefault on this event to stop the pane from being shown.</event>
    /// <event name="aftershow" locid="WinJS.UI.SplitView_e:aftershow">Raised immediately after the pane is fully shown.</event>
    /// <event name="beforehide" locid="WinJS.UI.SplitView_e:beforehide">Raised just before hiding the pane. Call preventDefault on this event to stop the pane from being hidden.</event>
    /// <event name="afterhide" locid="WinJS.UI.SplitView_e:afterhide">Raised immediately after the pane is fully hidden.</event>
    /// <part name="splitview" class="win-splitview" locid="WinJS.UI.SplitView_part:splitview">The entire SplitView control.</part>
    /// <part name="splitview-pane" class="win-splitview-pane" locid="WinJS.UI.SplitView_part:splitview-pane">The element which hosts the SplitView's pane.</part>
    /// <part name="splitview-content" class="win-splitview-content" locid="WinJS.UI.SplitView_part:splitview-content">The element which hosts the SplitView's content.</part>
    /// <resource type="javascript" src="//WinJS.4.0/js/WinJS.js" shared="true" />
    /// <resource type="css" src="//WinJS.4.0/css/ui-dark.css" shared="true" />
    var SplitView = (function () {
        function SplitView(element, options) {
            if (typeof options === "undefined") { options = {}; }
            // State private to _updateDomImpl. No other method should make use of it.
            //
            // Nothing has been rendered yet so these are all initialized to undefined. Because
            // they are undefined, the first time _updateDomImpl is called, they will all be
            // rendered.
            this._updateDomImpl_rendered = {
                paneIsFirst: undefined,
                isShownMode: undefined,
                hiddenDisplayMode: undefined,
                shownDisplayMode: undefined,
                panePlacement: undefined,
                panePlaceholderWidth: undefined,
                panePlaceholderHeight: undefined,
                isOverlayShown: undefined
            };
            /// <signature helpKeyword="WinJS.UI.SplitView.SplitView">
            /// <summary locid="WinJS.UI.SplitView.constructor">
            /// Creates a new SplitView control.
            /// </summary>
            /// <param name="element" type="HTMLElement" domElement="true" isOptional="true" locid="WinJS.UI.SplitView.constructor_p:element">
            /// The DOM element that hosts the SplitView control.
            /// </param>
            /// <param name="options" type="Object" isOptional="true" locid="WinJS.UI.SplitView.constructor_p:options">
            /// An object that contains one or more property/value pairs to apply to the new control.
            /// Each property of the options object corresponds to one of the control's properties or events.
            /// Event names must begin with "on". For example, to provide a handler for the beforehide event,
            /// add a property named "onbeforehide" to the options object and set its value to the event handler.
            /// </param>
            /// <returns type="WinJS.UI.SplitView" locid="WinJS.UI.SplitView.constructor_returnValue">
            /// The new SplitView.
            /// </returns>
            /// </signature>
            // Check to make sure we weren't duplicated
            if (element && element["winControl"]) {
                throw new _ErrorFromName("WinJS.UI.SplitView.DuplicateConstruction", Strings.duplicateConstruction);
            }

            this._disposed = false;

            this._initializeDom(element || _Global.document.createElement("div"));
            this._setState(States.Init, options);
        }
        Object.defineProperty(SplitView.prototype, "element", {
            /// <field type="HTMLElement" domElement="true" readonly="true" hidden="true" locid="WinJS.UI.SplitView.element" helpKeyword="WinJS.UI.SplitView.element">
            /// Gets the DOM element that hosts the SplitView control.
            /// </field>
            get: function () {
                return this._dom.root;
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(SplitView.prototype, "paneElement", {
            /// <field type="HTMLElement" domElement="true" readonly="true" hidden="true" locid="WinJS.UI.SplitView.paneElement" helpKeyword="WinJS.UI.SplitView.paneElement">
            /// Gets the DOM element that hosts the SplitView pane.
            /// </field>
            get: function () {
                return this._dom.pane;
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(SplitView.prototype, "contentElement", {
            /// <field type="HTMLElement" domElement="true" readonly="true" hidden="true" locid="WinJS.UI.SplitView.contentElement" helpKeyword="WinJS.UI.SplitView.contentElement">
            /// Gets the DOM element that hosts the SplitView's content.
            /// </field>
            get: function () {
                return this._dom.content;
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(SplitView.prototype, "hiddenDisplayMode", {
            /// <field type="String" oamOptionsDatatype="WinJS.UI.SplitView.HiddenDisplayMode" locid="WinJS.UI.SplitView.HiddenDisplayMode" helpKeyword="WinJS.UI.SplitView.HiddenDisplayMode">
            /// Gets or sets the display mode of the SplitView's pane when it is hidden.
            /// </field>
            get: function () {
                return this._hiddenDisplayMode;
            },
            set: function (value) {
                if (HiddenDisplayMode[value] && this._hiddenDisplayMode !== value) {
                    this._hiddenDisplayMode = value;
                    this._cachedHiddenPaneThickness = null;
                    this._state.updateDom();
                }
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(SplitView.prototype, "shownDisplayMode", {
            /// <field type="String" oamOptionsDatatype="WinJS.UI.SplitView.ShownDisplayMode" locid="WinJS.UI.SplitView.shownDisplayMode" helpKeyword="WinJS.UI.SplitView.shownDisplayMode">
            /// Gets or sets the display mode of the SplitView's pane when it is shown.
            /// </field>
            get: function () {
                return this._shownDisplayMode;
            },
            set: function (value) {
                if (ShownDisplayMode[value] && this._shownDisplayMode !== value) {
                    this._shownDisplayMode = value;
                    this._cachedHiddenPaneThickness = null;
                    this._state.updateDom();
                }
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(SplitView.prototype, "panePlacement", {
            /// <field type="String" oamOptionsDatatype="WinJS.UI.SplitView.PanePlacement" locid="WinJS.UI.SplitView.panePlacement" helpKeyword="WinJS.UI.SplitView.panePlacement">
            /// Gets or sets the placement of the SplitView's pane.
            /// </field>
            get: function () {
                return this._panePlacement;
            },
            set: function (value) {
                if (PanePlacement[value] && this._panePlacement !== value) {
                    this._panePlacement = value;
                    this._cachedHiddenPaneThickness = null;
                    this._state.updateDom();
                }
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(SplitView.prototype, "paneHidden", {
            /// <field type="Boolean" hidden="true" locid="WinJS.UI.SplitView.paneHidden" helpKeyword="WinJS.UI.SplitView.paneHidden">
            /// Gets or sets whether the SpitView's pane is currently collapsed.
            /// </field>
            get: function () {
                return this._state.paneHidden;
            },
            set: function (value) {
                if (value) {
                    this.hidePane();
                } else {
                    this.showPane();
                }
            },
            enumerable: true,
            configurable: true
        });

        SplitView.prototype.dispose = function () {
            /// <signature helpKeyword="WinJS.UI.SplitView.dispose">
            /// <summary locid="WinJS.UI.SplitView.dispose">
            /// Disposes this control.
            /// </summary>
            /// </signature>
            if (this._disposed) {
                return;
            }
            this._setState(States.Disposed);
            this._disposed = true;
            _Dispose._disposeElement(this._dom.pane);
            _Dispose._disposeElement(this._dom.content);
        };

        SplitView.prototype.showPane = function () {
            /// <signature helpKeyword="WinJS.UI.SplitView.showPane">
            /// <summary locid="WinJS.UI.SplitView.showPane">
            /// Shows the SplitView's pane.
            /// </summary>
            /// </signature>
            this._state.showPane();
        };

        SplitView.prototype.hidePane = function () {
            /// <signature helpKeyword="WinJS.UI.SplitView.hidePane">
            /// <summary locid="WinJS.UI.SplitView.hidePane">
            /// Hides the SplitView's pane.
            /// </summary>
            /// </signature>
            this._state.hidePane();
        };

        SplitView.prototype._initializeDom = function (root) {
            // The first child is the pane
            var paneEl = root.firstElementChild || _Global.document.createElement("div");
            _ElementUtilities.addClass(paneEl, ClassNames.pane);

            // All other children are members of the content
            var contentEl = _Global.document.createElement("div");
            _ElementUtilities.addClass(contentEl, ClassNames.content);
            var child = paneEl.nextSibling;
            while (child) {
                var sibling = child.nextSibling;
                contentEl.appendChild(child);
                child = sibling;
            }

            // paneWrapper's purpose is to clip the pane during the pane resize animation
            var paneWrapperEl = _Global.document.createElement("div");
            paneWrapperEl.className = ClassNames._paneWrapper;
            paneWrapperEl.appendChild(paneEl);

            var panePlaceholderEl = _Global.document.createElement("div");
            panePlaceholderEl.className = ClassNames._panePlaceholder;

            // contentWrapper is an extra element we need to allow heights to be specified as percentages (e.g. height: 100%)
            // for elements within the content area. It works around this Chrome bug:
            //   Issue 428049: 100% height doesn't work on child of a definite-flex-basis flex item (in vertical flex container)
            //   https://code.google.com/p/chromium/issues/detail?id=428049
            // The workaround is that putting a position: absolute element (_dom.content) within the flex item (_dom.contentWrapper)
            // allows percentage heights to work within the absolutely positioned element (_dom.content).
            var contentWrapperEl = _Global.document.createElement("div");
            contentWrapperEl.className = ClassNames._contentWrapper;
            contentWrapperEl.appendChild(contentEl);

            root["winControl"] = this;
            _ElementUtilities.addClass(root, ClassNames.splitView);
            _ElementUtilities.addClass(root, "win-disposable");

            this._dom = {
                root: root,
                pane: paneEl,
                paneWrapper: paneWrapperEl,
                panePlaceholder: panePlaceholderEl,
                content: contentEl,
                contentWrapper: contentWrapperEl
            };
        };

        SplitView.prototype._measureElement = function (element) {
            var style = getComputedStyle(element);
            var position = _ElementUtilities._getPositionRelativeTo(element, this._dom.root);
            var marginLeft = parseInt(style.marginLeft, 10);
            var marginTop = parseInt(style.marginTop, 10);
            return {
                left: position.left - marginLeft,
                top: position.top - marginTop,
                contentWidth: _ElementUtilities.getContentWidth(element),
                contentHeight: _ElementUtilities.getContentHeight(element),
                totalWidth: _ElementUtilities.getTotalWidth(element),
                totalHeight: _ElementUtilities.getTotalHeight(element)
            };
        };

        SplitView.prototype._setContentRect = function (contentRect) {
            var contentWrapperStyle = this._dom.contentWrapper.style;
            contentWrapperStyle.left = contentRect.left + "px";
            contentWrapperStyle.top = contentRect.top + "px";
            contentWrapperStyle.height = contentRect.contentHeight + "px";
            contentWrapperStyle.width = contentRect.contentWidth + "px";
        };

        // Overridden by tests.
        SplitView.prototype._prepareAnimation = function (paneRect, contentRect) {
            var paneWrapperStyle = this._dom.paneWrapper.style;
            paneWrapperStyle.position = "absolute";
            paneWrapperStyle.left = paneRect.left + "px";
            paneWrapperStyle.top = paneRect.top + "px";
            paneWrapperStyle.height = paneRect.totalHeight + "px";
            paneWrapperStyle.width = paneRect.totalWidth + "px";

            var contentWrapperStyle = this._dom.contentWrapper.style;
            contentWrapperStyle.position = "absolute";
            this._setContentRect(contentRect);
        };

        // Overridden by tests.
        SplitView.prototype._clearAnimation = function () {
            var paneWrapperStyle = this._dom.paneWrapper.style;
            paneWrapperStyle.position = "";
            paneWrapperStyle.left = "";
            paneWrapperStyle.top = "";
            paneWrapperStyle.height = "";
            paneWrapperStyle.width = "";
            paneWrapperStyle[transformNames.scriptName] = "";

            var contentWrapperStyle = this._dom.contentWrapper.style;
            contentWrapperStyle.position = "";
            contentWrapperStyle.left = "";
            contentWrapperStyle.top = "";
            contentWrapperStyle.height = "";
            contentWrapperStyle.width = "";
            contentWrapperStyle[transformNames.scriptName] = "";

            var paneStyle = this._dom.pane.style;
            paneStyle.height = "";
            paneStyle.width = "";
            paneStyle[transformNames.scriptName] = "";
        };

        SplitView.prototype._getHiddenContentRect = function (shownContentRect, hiddenPaneThickness, shownPaneThickness) {
            if (this.shownDisplayMode === ShownDisplayMode.overlay) {
                return shownContentRect;
            } else {
                var placementRight = this._rtl ? PanePlacement.left : PanePlacement.right;
                var multiplier = this.panePlacement === placementRight || this.panePlacement === PanePlacement.bottom ? 0 : 1;
                var paneDiff = {
                    content: shownPaneThickness.content - hiddenPaneThickness.content,
                    total: shownPaneThickness.total - hiddenPaneThickness.total
                };
                return this._horizontal ? {
                    left: shownContentRect.left - multiplier * paneDiff.total,
                    top: shownContentRect.top,
                    contentWidth: shownContentRect.contentWidth + paneDiff.content,
                    contentHeight: shownContentRect.contentHeight,
                    totalWidth: shownContentRect.totalWidth + paneDiff.total,
                    totalHeight: shownContentRect.totalHeight
                } : {
                    left: shownContentRect.left,
                    top: shownContentRect.top - multiplier * paneDiff.total,
                    contentWidth: shownContentRect.contentWidth,
                    contentHeight: shownContentRect.contentHeight + paneDiff.content,
                    totalWidth: shownContentRect.totalWidth,
                    totalHeight: shownContentRect.totalHeight + paneDiff.total
                };
            }
        };

        Object.defineProperty(SplitView.prototype, "_horizontal", {
            //
            // Methods called by states
            //
            get: function () {
                return this.panePlacement === PanePlacement.left || this.panePlacement === PanePlacement.right;
            },
            enumerable: true,
            configurable: true
        });

        SplitView.prototype._setState = function (NewState, arg0) {
            if (!this._disposed) {
                this._state && this._state.exit();
                this._state = new NewState();
                this._state.splitView = this;
                this._state.enter(arg0);
            }
        };

        // Calls into arbitrary app code
        SplitView.prototype._fireEvent = function (eventName, options) {
            options = options || {};
            var detail = options.detail || null;
            var cancelable = !!options.cancelable;

            var eventObject = _Global.document.createEvent("CustomEvent");
            eventObject.initCustomEvent(eventName, true, cancelable, detail);
            return this._dom.root.dispatchEvent(eventObject);
        };

        // Calls into arbitrary app code
        SplitView.prototype._fireBeforeShow = function () {
            return this._fireEvent(EventNames.beforeShow, {
                cancelable: true
            });
        };

        // Calls into arbitrary app code
        SplitView.prototype._fireBeforeHide = function () {
            return this._fireEvent(EventNames.beforeHide, {
                cancelable: true
            });
        };

        SplitView.prototype._getHiddenPaneThickness = function () {
            if (this._cachedHiddenPaneThickness === null) {
                if (this._hiddenDisplayMode === HiddenDisplayMode.none) {
                    this._cachedHiddenPaneThickness = { content: 0, total: 0 };
                } else {
                    if (this._isShownMode) {
                        _ElementUtilities.removeClass(this._dom.root, ClassNames.paneShown);
                        _ElementUtilities.addClass(this._dom.root, ClassNames.paneHidden);
                    }
                    var size = this._measureElement(this._dom.pane);
                    this._cachedHiddenPaneThickness = rectToThickness(size, this._horizontal ? Dimension.width : Dimension.height);
                    if (this._isShownMode) {
                        _ElementUtilities.removeClass(this._dom.root, ClassNames.paneHidden);
                        _ElementUtilities.addClass(this._dom.root, ClassNames.paneShown);
                    }
                }
            }

            return this._cachedHiddenPaneThickness;
        };

        // Should be called while SplitView is rendered in its shown mode
        // Overridden by tests.
        SplitView.prototype._playShowAnimation = function (hiddenPaneThickness) {
            var _this = this;
            var dim = this._horizontal ? Dimension.width : Dimension.height;
            var shownPaneRect = this._measureElement(this._dom.pane);
            var shownContentRect = this._measureElement(this._dom.content);
            var shownPaneThickness = rectToThickness(shownPaneRect, dim);
            var hiddenContentRect = this._getHiddenContentRect(shownContentRect, hiddenPaneThickness, shownPaneThickness);
            this._prepareAnimation(shownPaneRect, hiddenContentRect);

            var playPaneAnimation = function () {
                var placementRight = _this._rtl ? PanePlacement.left : PanePlacement.right;

                // What percentage of the size change should be skipped? (e.g. let's do the first
                // 30% of the size change instantly and then animate the other 70%)
                var animationOffsetFactor = 0.3;
                var from = hiddenPaneThickness.total + animationOffsetFactor * (shownPaneThickness.total - hiddenPaneThickness.total);

                return resizeTransition(_this._dom.paneWrapper, _this._dom.pane, {
                    from: from,
                    to: shownPaneThickness.total,
                    actualSize: shownPaneThickness.total,
                    dimension: dim,
                    anchorTrailingEdge: _this.panePlacement === placementRight || _this.panePlacement === PanePlacement.bottom
                });
            };

            var playShowAnimation = function () {
                if (_this.shownDisplayMode === ShownDisplayMode.inline) {
                    _this._setContentRect(shownContentRect);
                }
                return playPaneAnimation();
            };

            return playShowAnimation().then(function () {
                _this._clearAnimation();
            });
        };

        // Should be called while SplitView is rendered in its shown mode
        // Overridden by tests.
        SplitView.prototype._playHideAnimation = function (hiddenPaneThickness) {
            var _this = this;
            var dim = this._horizontal ? Dimension.width : Dimension.height;
            var shownPaneRect = this._measureElement(this._dom.pane);
            var shownContentRect = this._measureElement(this._dom.content);
            var shownPaneThickness = rectToThickness(shownPaneRect, dim);
            var hiddenContentRect = this._getHiddenContentRect(shownContentRect, hiddenPaneThickness, shownPaneThickness);
            this._prepareAnimation(shownPaneRect, shownContentRect);

            var playPaneAnimation = function () {
                var placementRight = _this._rtl ? PanePlacement.left : PanePlacement.right;

                // What percentage of the size change should be skipped? (e.g. let's do the first
                // 30% of the size change instantly and then animate the other 70%)
                var animationOffsetFactor = 0.3;
                var from = shownPaneThickness.total - animationOffsetFactor * (shownPaneThickness.total - hiddenPaneThickness.total);

                return resizeTransition(_this._dom.paneWrapper, _this._dom.pane, {
                    from: from,
                    to: hiddenPaneThickness.total,
                    actualSize: shownPaneThickness.total,
                    dimension: dim,
                    anchorTrailingEdge: _this.panePlacement === placementRight || _this.panePlacement === PanePlacement.bottom
                });
            };

            var playHideAnimation = function () {
                if (_this.shownDisplayMode === ShownDisplayMode.inline) {
                    _this._setContentRect(hiddenContentRect);
                }
                return playPaneAnimation();
            };

            return playHideAnimation().then(function () {
                _this._clearAnimation();
            });
        };

        SplitView.prototype._updateDomImpl = function () {
            var rendered = this._updateDomImpl_rendered;

            var paneShouldBeFirst = this.panePlacement === PanePlacement.left || this.panePlacement === PanePlacement.top;
            if (paneShouldBeFirst !== rendered.paneIsFirst) {
                // TODO: restore focus
                if (paneShouldBeFirst) {
                    this._dom.root.appendChild(this._dom.panePlaceholder);
                    this._dom.root.appendChild(this._dom.paneWrapper);
                    this._dom.root.appendChild(this._dom.contentWrapper);
                } else {
                    this._dom.root.appendChild(this._dom.contentWrapper);
                    this._dom.root.appendChild(this._dom.paneWrapper);
                    this._dom.root.appendChild(this._dom.panePlaceholder);
                }
            }
            rendered.paneIsFirst = paneShouldBeFirst;

            if (rendered.isShownMode !== this._isShownMode) {
                if (this._isShownMode) {
                    _ElementUtilities.removeClass(this._dom.root, ClassNames.paneHidden);
                    _ElementUtilities.addClass(this._dom.root, ClassNames.paneShown);
                } else {
                    _ElementUtilities.removeClass(this._dom.root, ClassNames.paneShown);
                    _ElementUtilities.addClass(this._dom.root, ClassNames.paneHidden);
                }
            }
            rendered.isShownMode = this._isShownMode;

            if (rendered.panePlacement !== this.panePlacement) {
                removeClass(this._dom.root, panePlacementClassMap[rendered.panePlacement]);
                addClass(this._dom.root, panePlacementClassMap[this.panePlacement]);
                rendered.panePlacement = this.panePlacement;
            }

            if (rendered.hiddenDisplayMode !== this.hiddenDisplayMode) {
                removeClass(this._dom.root, hiddenDisplayModeClassMap[rendered.hiddenDisplayMode]);
                addClass(this._dom.root, hiddenDisplayModeClassMap[this.hiddenDisplayMode]);
                rendered.hiddenDisplayMode = this.hiddenDisplayMode;
            }

            if (rendered.shownDisplayMode !== this.shownDisplayMode) {
                removeClass(this._dom.root, shownDisplayModeClassMap[rendered.shownDisplayMode]);
                addClass(this._dom.root, shownDisplayModeClassMap[this.shownDisplayMode]);
                rendered.shownDisplayMode = this.shownDisplayMode;
            }

            var isOverlayShown = this._isShownMode && this.shownDisplayMode === ShownDisplayMode.overlay;

            // panePlaceholder's purpose is to take up the amount of space occupied by the
            // hidden pane while the pane is shown in overlay mode. Without this, the content
            // would shift as the pane shows and hides in overlay mode.
            var width, height;
            if (isOverlayShown) {
                var hiddenPaneThickness = this._getHiddenPaneThickness();
                if (this._horizontal) {
                    width = hiddenPaneThickness.total + "px";
                    height = "";
                } else {
                    width = "";
                    height = hiddenPaneThickness.total + "px";
                }
            } else {
                width = "";
                height = "";
            }
            if (rendered.panePlaceholderWidth !== width || rendered.panePlaceholderHeight !== height) {
                var style = this._dom.panePlaceholder.style;
                style.width = width;
                style.height = height;
                rendered.panePlaceholderWidth = width;
                rendered.panePlaceholderHeight = height;
            }

            if (rendered.isOverlayShown !== isOverlayShown) {
                if (isOverlayShown) {
                    _LightDismissService.shown(this._dismissable);
                } else {
                    _LightDismissService.hidden(this._dismissable);
                }
                rendered.isOverlayShown = isOverlayShown;
            }
        };
        SplitView.HiddenDisplayMode = HiddenDisplayMode;

        SplitView.ShownDisplayMode = ShownDisplayMode;

        SplitView.PanePlacement = PanePlacement;

        SplitView.supportedForProcessing = true;

        SplitView._ClassNames = ClassNames;
        return SplitView;
    })();
    exports.SplitView = SplitView;

    _Base.Class.mix(SplitView, _Events.createEventProperties(EventNames.beforeShow, EventNames.afterShow, EventNames.beforeHide, EventNames.afterHide));
    _Base.Class.mix(SplitView, _Control.DOMEventMixin);
});
