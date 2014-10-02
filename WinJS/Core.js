// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Core/_WinJS',{});

// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
(function (global) {
    "use strict";

    define('WinJS/Core/_Global',global);
}(this));

// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Core/_BaseCoreUtils',[
    './_Global'
    ], function baseCoreUtilsInit(_Global) {
    "use strict";

    var hasWinRT = !!_Global.Windows;

    function markSupportedForProcessing(func) {
        /// <signature helpKeyword="WinJS.Utilities.markSupportedForProcessing">
        /// <summary locid="WinJS.Utilities.markSupportedForProcessing">
        /// Marks a function as being compatible with declarative processing, such as WinJS.UI.processAll
        /// or WinJS.Binding.processAll.
        /// </summary>
        /// <param name="func" type="Function" locid="WinJS.Utilities.markSupportedForProcessing_p:func">
        /// The function to be marked as compatible with declarative processing.
        /// </param>
        /// <returns type="Function" locid="WinJS.Utilities.markSupportedForProcessing_returnValue">
        /// The input function.
        /// </returns>
        /// </signature>
        func.supportedForProcessing = true;
        return func;
    }

    return {
        hasWinRT: hasWinRT,
        markSupportedForProcessing: markSupportedForProcessing,
        _setImmediate: _Global.setImmediate ? _Global.setImmediate.bind(_Global) : function (handler) {
            _Global.setTimeout(handler, 0);
        }
    };
});
// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Core/_WriteProfilerMark',[
    './_Global'
], function profilerInit(_Global) {
    "use strict";

    return _Global.msWriteProfilerMark || function () { };
});
// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Core/_Base',[
    './_WinJS',
    './_Global',
    './_BaseCoreUtils',
    './_WriteProfilerMark'
    ], function baseInit(_WinJS, _Global, _BaseCoreUtils, _WriteProfilerMark) {
    "use strict";

    function initializeProperties(target, members, prefix) {
        var keys = Object.keys(members);
        var isArray = Array.isArray(target);
        var properties;
        var i, len;
        for (i = 0, len = keys.length; i < len; i++) {
            var key = keys[i];
            var enumerable = key.charCodeAt(0) !== /*_*/95;
            var member = members[key];
            if (member && typeof member === 'object') {
                if (member.value !== undefined || typeof member.get === 'function' || typeof member.set === 'function') {
                    if (member.enumerable === undefined) {
                        member.enumerable = enumerable;
                    }
                    if (prefix && member.setName && typeof member.setName === 'function') {
                        member.setName(prefix + "." + key);
                    }
                    properties = properties || {};
                    properties[key] = member;
                    continue;
                }
            }
            if (!enumerable) {
                properties = properties || {};
                properties[key] = { value: member, enumerable: enumerable, configurable: true, writable: true };
                continue;
            }
            if (isArray) {
                target.forEach(function (target) {
                    target[key] = member;
                });
            } else {
                target[key] = member;
            }
        }
        if (properties) {
            if (isArray) {
                target.forEach(function (target) {
                    Object.defineProperties(target, properties);
                });
            } else {
                Object.defineProperties(target, properties);
            }
        }
    }

    (function () {

        var _rootNamespace = _WinJS;
        if (!_rootNamespace.Namespace) {
            _rootNamespace.Namespace = Object.create(Object.prototype);
        }

        function createNamespace(parentNamespace, name) {
            var currentNamespace = parentNamespace || {};
            if (name) {
                var namespaceFragments = name.split(".");
                if (currentNamespace === _Global && namespaceFragments[0] === "WinJS") {
                    currentNamespace = _WinJS;
                    namespaceFragments.splice(0, 1);
                }
                for (var i = 0, len = namespaceFragments.length; i < len; i++) {
                    var namespaceName = namespaceFragments[i];
                    if (!currentNamespace[namespaceName]) {
                        Object.defineProperty(currentNamespace, namespaceName,
                            { value: {}, writable: false, enumerable: true, configurable: true }
                        );
                    }
                    currentNamespace = currentNamespace[namespaceName];
                }
            }
            return currentNamespace;
        }

        function defineWithParent(parentNamespace, name, members) {
            /// <signature helpKeyword="WinJS.Namespace.defineWithParent">
            /// <summary locid="WinJS.Namespace.defineWithParent">
            /// Defines a new namespace with the specified name under the specified parent namespace.
            /// </summary>
            /// <param name="parentNamespace" type="Object" locid="WinJS.Namespace.defineWithParent_p:parentNamespace">
            /// The parent namespace.
            /// </param>
            /// <param name="name" type="String" locid="WinJS.Namespace.defineWithParent_p:name">
            /// The name of the new namespace.
            /// </param>
            /// <param name="members" type="Object" locid="WinJS.Namespace.defineWithParent_p:members">
            /// The members of the new namespace.
            /// </param>
            /// <returns type="Object" locid="WinJS.Namespace.defineWithParent_returnValue">
            /// The newly-defined namespace.
            /// </returns>
            /// </signature>
            var currentNamespace = createNamespace(parentNamespace, name);

            if (members) {
                initializeProperties(currentNamespace, members, name || "<ANONYMOUS>");
            }

            return currentNamespace;
        }

        function define(name, members) {
            /// <signature helpKeyword="WinJS.Namespace.define">
            /// <summary locid="WinJS.Namespace.define">
            /// Defines a new namespace with the specified name.
            /// </summary>
            /// <param name="name" type="String" locid="WinJS.Namespace.define_p:name">
            /// The name of the namespace. This could be a dot-separated name for nested namespaces.
            /// </param>
            /// <param name="members" type="Object" locid="WinJS.Namespace.define_p:members">
            /// The members of the new namespace.
            /// </param>
            /// <returns type="Object" locid="WinJS.Namespace.define_returnValue">
            /// The newly-defined namespace.
            /// </returns>
            /// </signature>
            return defineWithParent(_Global, name, members);
        }

        var LazyStates = {
            uninitialized: 1,
            working: 2,
            initialized: 3,
        };

        function lazy(f) {
            var name;
            var state = LazyStates.uninitialized;
            var result;
            return {
                setName: function (value) {
                    name = value;
                },
                get: function () {
                    switch (state) {
                        case LazyStates.initialized:
                            return result;

                        case LazyStates.uninitialized:
                            state = LazyStates.working;
                            try {
                                _WriteProfilerMark("WinJS.Namespace._lazy:" + name + ",StartTM");
                                result = f();
                            } finally {
                                _WriteProfilerMark("WinJS.Namespace._lazy:" + name + ",StopTM");
                                state = LazyStates.uninitialized;
                            }
                            f = null;
                            state = LazyStates.initialized;
                            return result;

                        case LazyStates.working:
                            throw "Illegal: reentrancy on initialization";

                        default:
                            throw "Illegal";
                    }
                },
                set: function (value) {
                    switch (state) {
                        case LazyStates.working:
                            throw "Illegal: reentrancy on initialization";

                        default:
                            state = LazyStates.initialized;
                            result = value;
                            break;
                    }
                },
                enumerable: true,
                configurable: true,
            };
        }

        // helper for defining AMD module members
        function moduleDefine(exports, name, members) {
            var target = [exports];
            var publicNS = null;
            if (name) {
                publicNS = createNamespace(_Global, name);
                target.push(publicNS);
            }
            initializeProperties(target, members, name || "<ANONYMOUS>");
            return publicNS;
        }

        // Establish members of the "WinJS.Namespace" namespace
        Object.defineProperties(_rootNamespace.Namespace, {

            defineWithParent: { value: defineWithParent, writable: true, enumerable: true, configurable: true },

            define: { value: define, writable: true, enumerable: true, configurable: true },

            _lazy: { value: lazy, writable: true, enumerable: true, configurable: true },

            _moduleDefine: { value: moduleDefine, writable: true, enumerable: true, configurable: true }

        });

    })();

    (function () {

        function define(constructor, instanceMembers, staticMembers) {
            /// <signature helpKeyword="WinJS.Class.define">
            /// <summary locid="WinJS.Class.define">
            /// Defines a class using the given constructor and the specified instance members.
            /// </summary>
            /// <param name="constructor" type="Function" locid="WinJS.Class.define_p:constructor">
            /// A constructor function that is used to instantiate this class.
            /// </param>
            /// <param name="instanceMembers" type="Object" locid="WinJS.Class.define_p:instanceMembers">
            /// The set of instance fields, properties, and methods made available on the class.
            /// </param>
            /// <param name="staticMembers" type="Object" locid="WinJS.Class.define_p:staticMembers">
            /// The set of static fields, properties, and methods made available on the class.
            /// </param>
            /// <returns type="Function" locid="WinJS.Class.define_returnValue">
            /// The newly-defined class.
            /// </returns>
            /// </signature>
            constructor = constructor || function () { };
            _BaseCoreUtils.markSupportedForProcessing(constructor);
            if (instanceMembers) {
                initializeProperties(constructor.prototype, instanceMembers);
            }
            if (staticMembers) {
                initializeProperties(constructor, staticMembers);
            }
            return constructor;
        }

        function derive(baseClass, constructor, instanceMembers, staticMembers) {
            /// <signature helpKeyword="WinJS.Class.derive">
            /// <summary locid="WinJS.Class.derive">
            /// Creates a sub-class based on the supplied baseClass parameter, using prototypal inheritance.
            /// </summary>
            /// <param name="baseClass" type="Function" locid="WinJS.Class.derive_p:baseClass">
            /// The class to inherit from.
            /// </param>
            /// <param name="constructor" type="Function" locid="WinJS.Class.derive_p:constructor">
            /// A constructor function that is used to instantiate this class.
            /// </param>
            /// <param name="instanceMembers" type="Object" locid="WinJS.Class.derive_p:instanceMembers">
            /// The set of instance fields, properties, and methods to be made available on the class.
            /// </param>
            /// <param name="staticMembers" type="Object" locid="WinJS.Class.derive_p:staticMembers">
            /// The set of static fields, properties, and methods to be made available on the class.
            /// </param>
            /// <returns type="Function" locid="WinJS.Class.derive_returnValue">
            /// The newly-defined class.
            /// </returns>
            /// </signature>
            if (baseClass) {
                constructor = constructor || function () { };
                var basePrototype = baseClass.prototype;
                constructor.prototype = Object.create(basePrototype);
                _BaseCoreUtils.markSupportedForProcessing(constructor);
                Object.defineProperty(constructor.prototype, "constructor", { value: constructor, writable: true, configurable: true, enumerable: true });
                if (instanceMembers) {
                    initializeProperties(constructor.prototype, instanceMembers);
                }
                if (staticMembers) {
                    initializeProperties(constructor, staticMembers);
                }
                return constructor;
            } else {
                return define(constructor, instanceMembers, staticMembers);
            }
        }

        function mix(constructor) {
            /// <signature helpKeyword="WinJS.Class.mix">
            /// <summary locid="WinJS.Class.mix">
            /// Defines a class using the given constructor and the union of the set of instance members
            /// specified by all the mixin objects. The mixin parameter list is of variable length.
            /// </summary>
            /// <param name="constructor" locid="WinJS.Class.mix_p:constructor">
            /// A constructor function that is used to instantiate this class.
            /// </param>
            /// <returns type="Function" locid="WinJS.Class.mix_returnValue">
            /// The newly-defined class.
            /// </returns>
            /// </signature>
            constructor = constructor || function () { };
            var i, len;
            for (i = 1, len = arguments.length; i < len; i++) {
                initializeProperties(constructor.prototype, arguments[i]);
            }
            return constructor;
        }

        // Establish members of "WinJS.Class" namespace
        _WinJS.Namespace.define("WinJS.Class", {
            define: define,
            derive: derive,
            mix: mix
        });

    })();

    return {
        Namespace: _WinJS.Namespace,
        Class: _WinJS.Class
    };

});
// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Core/_ErrorFromName',[
    './_Base'
    ], function errorsInit(_Base) {
    "use strict";

    var ErrorFromName = _Base.Class.derive(Error, function (name, message) {
        /// <signature helpKeyword="WinJS.ErrorFromName">
        /// <summary locid="WinJS.ErrorFromName">
        /// Creates an Error object with the specified name and message properties.
        /// </summary>
        /// <param name="name" type="String" locid="WinJS.ErrorFromName_p:name">The name of this error. The name is meant to be consumed programmatically and should not be localized.</param>
        /// <param name="message" type="String" optional="true" locid="WinJS.ErrorFromName_p:message">The message for this error. The message is meant to be consumed by humans and should be localized.</param>
        /// <returns type="Error" locid="WinJS.ErrorFromName_returnValue">Error instance with .name and .message properties populated</returns>
        /// </signature>
        this.name = name;
        this.message = message || name;
    }, {
        /* empty */
    }, {
        supportedForProcessing: false,
    });

    _Base.Namespace.define("WinJS", {
        // ErrorFromName establishes a simple pattern for returning error codes.
        //
        ErrorFromName: ErrorFromName
    });

    return ErrorFromName;

});


// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Core/_WinRT',[
    'exports',
    './_Global',
    './_Base',
], function winrtInit(exports, _Global, _Base) {
    "use strict";

    exports.msGetWeakWinRTProperty = _Global.msGetWeakWinRTProperty;
    exports.msSetWeakWinRTProperty = _Global.msSetWeakWinRTProperty;

    var APIs = [
        "Windows.ApplicationModel.DesignMode.designModeEnabled",
        "Windows.ApplicationModel.Resources.Core.ResourceContext",
        "Windows.ApplicationModel.Resources.Core.ResourceManager",
        "Windows.ApplicationModel.Search.Core.SearchSuggestionManager",
        "Windows.ApplicationModel.Search.SearchQueryLinguisticDetails",
        "Windows.Data.Text.SemanticTextQuery",
        "Windows.Foundation.Collections.CollectionChange",
        "Windows.Foundation.Uri",
        "Windows.Globalization.ApplicationLanguages",
        "Windows.Globalization.Calendar",
        "Windows.Globalization.DateTimeFormatting",
        "Windows.Globalization.Language",
        "Windows.Phone.UI.Input.HardwareButtons",
        "Windows.Storage.ApplicationData",
        "Windows.Storage.CreationCollisionOption",
        "Windows.Storage.BulkAccess.FileInformationFactory",
        "Windows.Storage.FileIO",
        "Windows.Storage.FileProperties.ThumbnailType",
        "Windows.Storage.FileProperties.ThumbnailMode",
        "Windows.Storage.FileProperties.ThumbnailOptions",
        "Windows.Storage.KnownFolders",
        "Windows.Storage.Search.FolderDepth",
        "Windows.Storage.Search.IndexerOption",
        "Windows.Storage.Streams.RandomAccessStreamReference",
        "Windows.UI.ApplicationSettings.SettingsEdgeLocation",
        "Windows.UI.ApplicationSettings.SettingsCommand",
        "Windows.UI.ApplicationSettings.SettingsPane",
        "Windows.UI.Core.AnimationMetrics",
        "Windows.UI.Input.EdgeGesture",
        "Windows.UI.Input.EdgeGestureKind",
        "Windows.UI.Input.PointerPoint",
        "Windows.UI.ViewManagement.HandPreference",
        "Windows.UI.ViewManagement.InputPane",
        "Windows.UI.ViewManagement.UISettings",
        "Windows.UI.WebUI.Core.WebUICommandBar",
        "Windows.UI.WebUI.Core.WebUICommandBarBitmapIcon",
        "Windows.UI.WebUI.Core.WebUICommandBarClosedDisplayMode",
        "Windows.UI.WebUI.Core.WebUICommandBarIconButton",
        "Windows.UI.WebUI.Core.WebUICommandBarSymbolIcon",
        "Windows.UI.WebUI.WebUIApplication",
    ];

    APIs.forEach(function (api) {
        var parts = api.split(".");
        var leaf = {};
        leaf[parts[parts.length - 1]] = {
            get: function () {
                return parts.reduce(function (current, part) { return current ? current[part] : null; }, _Global);
            }
        };
        _Base.Namespace.defineWithParent(exports, parts.slice(0, -1).join("."), leaf);
    });

});

// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Core/_Events',[
    'exports',
    './_Base'
    ], function eventsInit(exports, _Base) {
    "use strict";


    function createEventProperty(name) {
        var eventPropStateName = "_on" + name + "state";

        return {
            get: function () {
                var state = this[eventPropStateName];
                return state && state.userHandler;
            },
            set: function (handler) {
                var state = this[eventPropStateName];
                if (handler) {
                    if (!state) {
                        state = { wrapper: function (evt) { return state.userHandler(evt); }, userHandler: handler };
                        Object.defineProperty(this, eventPropStateName, { value: state, enumerable: false, writable:true, configurable: true });
                        this.addEventListener(name, state.wrapper, false);
                    }
                    state.userHandler = handler;
                } else if (state) {
                    this.removeEventListener(name, state.wrapper, false);
                    this[eventPropStateName] = null;
                }
            },
            enumerable: true
        };
    }

    function createEventProperties() {
        /// <signature helpKeyword="WinJS.Utilities.createEventProperties">
        /// <summary locid="WinJS.Utilities.createEventProperties">
        /// Creates an object that has one property for each name passed to the function.
        /// </summary>
        /// <param name="events" locid="WinJS.Utilities.createEventProperties_p:events">
        /// A variable list of property names.
        /// </param>
        /// <returns type="Object" locid="WinJS.Utilities.createEventProperties_returnValue">
        /// The object with the specified properties. The names of the properties are prefixed with 'on'.
        /// </returns>
        /// </signature>
        var props = {};
        for (var i = 0, len = arguments.length; i < len; i++) {
            var name = arguments[i];
            props["on" + name] = createEventProperty(name);
        }
        return props;
    }

    var EventMixinEvent = _Base.Class.define(
        function EventMixinEvent_ctor(type, detail, target) {
            this.detail = detail;
            this.target = target;
            this.timeStamp = Date.now();
            this.type = type;
        },
        {
            bubbles: { value: false, writable: false },
            cancelable: { value: false, writable: false },
            currentTarget: {
                get: function () { return this.target; }
            },
            defaultPrevented: {
                get: function () { return this._preventDefaultCalled; }
            },
            trusted: { value: false, writable: false },
            eventPhase: { value: 0, writable: false },
            target: null,
            timeStamp: null,
            type: null,

            preventDefault: function () {
                this._preventDefaultCalled = true;
            },
            stopImmediatePropagation: function () {
                this._stopImmediatePropagationCalled = true;
            },
            stopPropagation: function () {
            }
        }, {
            supportedForProcessing: false,
        }
    );

    var eventMixin = {
        _listeners: null,

        addEventListener: function (type, listener, useCapture) {
            /// <signature helpKeyword="WinJS.Utilities.eventMixin.addEventListener">
            /// <summary locid="WinJS.Utilities.eventMixin.addEventListener">
            /// Adds an event listener to the control.
            /// </summary>
            /// <param name="type" locid="WinJS.Utilities.eventMixin.addEventListener_p:type">
            /// The type (name) of the event.
            /// </param>
            /// <param name="listener" locid="WinJS.Utilities.eventMixin.addEventListener_p:listener">
            /// The listener to invoke when the event is raised.
            /// </param>
            /// <param name="useCapture" locid="WinJS.Utilities.eventMixin.addEventListener_p:useCapture">
            /// if true initiates capture, otherwise false.
            /// </param>
            /// </signature>
            useCapture = useCapture || false;
            this._listeners = this._listeners || {};
            var eventListeners = (this._listeners[type] = this._listeners[type] || []);
            for (var i = 0, len = eventListeners.length; i < len; i++) {
                var l = eventListeners[i];
                if (l.useCapture === useCapture && l.listener === listener) {
                    return;
                }
            }
            eventListeners.push({ listener: listener, useCapture: useCapture });
        },
        dispatchEvent: function (type, details) {
            /// <signature helpKeyword="WinJS.Utilities.eventMixin.dispatchEvent">
            /// <summary locid="WinJS.Utilities.eventMixin.dispatchEvent">
            /// Raises an event of the specified type and with the specified additional properties.
            /// </summary>
            /// <param name="type" locid="WinJS.Utilities.eventMixin.dispatchEvent_p:type">
            /// The type (name) of the event.
            /// </param>
            /// <param name="details" locid="WinJS.Utilities.eventMixin.dispatchEvent_p:details">
            /// The set of additional properties to be attached to the event object when the event is raised.
            /// </param>
            /// <returns type="Boolean" locid="WinJS.Utilities.eventMixin.dispatchEvent_returnValue">
            /// true if preventDefault was called on the event.
            /// </returns>
            /// </signature>
            var listeners = this._listeners && this._listeners[type];
            if (listeners) {
                var eventValue = new EventMixinEvent(type, details, this);
                // Need to copy the array to protect against people unregistering while we are dispatching
                listeners = listeners.slice(0, listeners.length);
                for (var i = 0, len = listeners.length; i < len && !eventValue._stopImmediatePropagationCalled; i++) {
                    listeners[i].listener(eventValue);
                }
                return eventValue.defaultPrevented || false;
            }
            return false;
        },
        removeEventListener: function (type, listener, useCapture) {
            /// <signature helpKeyword="WinJS.Utilities.eventMixin.removeEventListener">
            /// <summary locid="WinJS.Utilities.eventMixin.removeEventListener">
            /// Removes an event listener from the control.
            /// </summary>
            /// <param name="type" locid="WinJS.Utilities.eventMixin.removeEventListener_p:type">
            /// The type (name) of the event.
            /// </param>
            /// <param name="listener" locid="WinJS.Utilities.eventMixin.removeEventListener_p:listener">
            /// The listener to remove.
            /// </param>
            /// <param name="useCapture" locid="WinJS.Utilities.eventMixin.removeEventListener_p:useCapture">
            /// Specifies whether to initiate capture.
            /// </param>
            /// </signature>
            useCapture = useCapture || false;
            var listeners = this._listeners && this._listeners[type];
            if (listeners) {
                for (var i = 0, len = listeners.length; i < len; i++) {
                    var l = listeners[i];
                    if (l.listener === listener && l.useCapture === useCapture) {
                        listeners.splice(i, 1);
                        if (listeners.length === 0) {
                            delete this._listeners[type];
                        }
                        // Only want to remove one element for each call to removeEventListener
                        break;
                    }
                }
            }
        }
    };

    _Base.Namespace._moduleDefine(exports, "WinJS.Utilities", {
        _createEventProperty: createEventProperty,
        createEventProperties: createEventProperties,
        eventMixin: eventMixin
    });

});



define('require-json!en-US/ui.resjson',{
    "appBarAriaLabel": "App Bar",
    "appBarCommandAriaLabel": "App Bar Item",
    "averageRating": "Average Rating",
    "backbuttonarialabel": "Back",
    "clearYourRating" : "Clear your rating",
    "closeOverlay" : "Close",
    "datePicker": "Date Picker",
    "flipViewPanningContainerAriaLabel": "Scrolling Container",
    "flyoutAriaLabel": "Flyout",
    "hubViewportAriaLabel": "Scrolling Container",
    "listViewViewportAriaLabel": "Scrolling Container",
    "menuCommandAriaLabel": "Menu Item",
    "menuAriaLabel": "Menu",
    "navBarContainerViewportAriaLabel": "Scrolling Container",
    "off" : "Off",
    "on" : "On",
    "pivotAriaLabel": "Pivot",
    "pivotViewportAriaLabel": "Scrolling Container",
    "searchBoxAriaLabel": "Searchbox",
    "searchBoxAriaLabelInputNoPlaceHolder": "Searchbox, enter to submit query, esc to clear text",
    "searchBoxAriaLabelInputPlaceHolder": "Searchbox, {0}, enter to submit query, esc to clear text",
    "searchBoxAriaLabelButton": "Click to submit query",
    "searchBoxAriaLabelQuery": "Suggestion: {0}",
    "_searchBoxAriaLabelQuery.comment": "Suggestion: query text (example: Suggestion: contoso)",
    "searchBoxAriaLabelSeparator": "Separator: {0}",
    "_searchBoxAriaLabelSeparator.comment": "Separator: separator text (example: Separator: People or Separator: Apps)",
    "searchBoxAriaLabelResult": "Result: {0}, {1}",
    "_searchBoxAriaLabelResult.comment": "Result: text, detailed text (example: Result: contoso, www.contoso.com)",
    "selectAMPM": "Select A.M P.M",
    "selectDay": "Select Day",
    "selectHour": "Select Hour",
    "selectMinute": "Select Minute",
    "selectMonth": "Select Month",
    "selectYear": "Select Year",
    "settingsFlyoutAriaLabel": "Settings Flyout",
    "tentativeRating": "Tentative Rating",
    "timePicker": "Time Picker",
    "unrated": "Unrated",
    "userRating": "User Rating",
    // AppBar Icons follow, the format of the ui.js and ui.resjson differ for
    // the AppBarIcon namespace.  The remainder of the file therefore differs.
    // Code point comments are the icon glyphs in the 'Segoe UI Symbol' font.
    "appBarIcons\\previous":                            "\uE100", //  group:Media
    "_appBarIcons\\previous.comment":                   "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\next":                                "\uE101", //  group:Media
    "_appBarIcons\\next.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\play":                                "\uE102", //  group:Media
    "_appBarIcons\\play.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\pause":                               "\uE103", //  group:Media
    "_appBarIcons\\pause.comment":                      "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\edit":                                "\uE104", //  group:File
    "_appBarIcons\\edit.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\save":                                "\uE105", //  group:File
    "_appBarIcons\\save.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\clear":                               "\uE106", //  group:File
    "_appBarIcons\\clear.comment":                      "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\delete":                              "\uE107", //  group:File
    "_appBarIcons\\delete.comment":                     "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\remove":                              "\uE108", //  group:File
    "_appBarIcons\\remove.comment":                     "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\add":                                 "\uE109", //  group:File
    "_appBarIcons\\add.comment":                        "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\cancel":                              "\uE10A", //  group:Editing
    "_appBarIcons\\cancel.comment":                     "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\accept":                              "\uE10B", //  group:General
    "_appBarIcons\\accept.comment":                     "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\more":                                "\uE10C", //  group:General
    "_appBarIcons\\more.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\redo":                                "\uE10D", //  group:Editing
    "_appBarIcons\\redo.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\undo":                                "\uE10E", //  group:Editing
    "_appBarIcons\\undo.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\home":                                "\uE10F", //  group:General
    "_appBarIcons\\home.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\up":                                  "\uE110", //  group:General
    "_appBarIcons\\up.comment":                         "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\forward":                             "\uE111", //  group:General
    "_appBarIcons\\forward.comment":                    "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\right":                               "\uE111", //  group:General
    "_appBarIcons\\right.comment":                      "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\back":                                "\uE112", //  group:General
    "_appBarIcons\\back.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\left":                                "\uE112", //  group:General
    "_appBarIcons\\left.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\favorite":                            "\uE113", //  group:Media
    "_appBarIcons\\favorite.comment":                   "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\camera":                              "\uE114", //  group:System
    "_appBarIcons\\camera.comment":                     "{Locked:qps-ploc,qps-plocm}",    
    "appBarIcons\\settings":                            "\uE115", //  group:System
    "_appBarIcons\\settings.comment":                   "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\video":                               "\uE116", //  group:Media
    "_appBarIcons\\video.comment":                      "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\sync":                                "\uE117", //  group:Media
    "_appBarIcons\\sync.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\download":                            "\uE118", //  group:Media
    "_appBarIcons\\download.comment":                   "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\mail":                                "\uE119", //  group:Mail and calendar
    "_appBarIcons\\mail.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\find":                                "\uE11A", //  group:Data
    "_appBarIcons\\find.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\help":                                "\uE11B", //  group:General
    "_appBarIcons\\help.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\upload":                              "\uE11C", //  group:Media
    "_appBarIcons\\upload.comment":                     "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\emoji":                               "\uE11D", //  group:Communications
    "_appBarIcons\\emoji.comment":                      "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\twopage":                             "\uE11E", //  group:Layout
    "_appBarIcons\\twopage.comment":                    "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\leavechat":                           "\uE11F", //  group:Communications
    "_appBarIcons\\leavechat.comment":                  "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\mailforward":                         "\uE120", //  group:Mail and calendar
    "_appBarIcons\\mailforward.comment":                "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\clock":                               "\uE121", //  group:General
    "_appBarIcons\\clock.comment":                      "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\send":                                "\uE122", //  group:Mail and calendar
    "_appBarIcons\\send.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\crop":                                "\uE123", //  group:Editing
    "_appBarIcons\\crop.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\rotatecamera":                        "\uE124", //  group:System
    "_appBarIcons\\rotatecamera.comment":               "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\people":                              "\uE125", //  group:Communications
    "_appBarIcons\\people.comment":                     "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\closepane":                           "\uE126", //  group:Layout
    "_appBarIcons\\closepane.comment":                  "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\openpane":                            "\uE127", //  group:Layout
    "_appBarIcons\\openpane.comment":                   "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\world":                               "\uE128", //  group:General
    "_appBarIcons\\world.comment":                      "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\flag":                                "\uE129", //  group:Mail and calendar
    "_appBarIcons\\flag.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\previewlink":                         "\uE12A", //  group:General
    "_appBarIcons\\previewlink.comment":                "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\globe":                               "\uE12B", //  group:Communications
    "_appBarIcons\\globe.comment":                      "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\trim":                                "\uE12C", //  group:Editing
    "_appBarIcons\\trim.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\attachcamera":                        "\uE12D", //  group:System
    "_appBarIcons\\attachcamera.comment":               "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\zoomin":                              "\uE12E", //  group:Layout
    "_appBarIcons\\zoomin.comment":                     "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\bookmarks":                           "\uE12F", //  group:Editing
    "_appBarIcons\\bookmarks.comment":                  "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\document":                            "\uE130", //  group:File
    "_appBarIcons\\document.comment":                   "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\protecteddocument":                   "\uE131", //  group:File
    "_appBarIcons\\protecteddocument.comment":          "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\page":                                "\uE132", //  group:Layout
    "_appBarIcons\\page.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\bullets":                             "\uE133", //  group:Editing
    "_appBarIcons\\bullets.comment":                    "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\comment":                             "\uE134", //  group:Communications
    "_appBarIcons\\comment.comment":                    "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\mail2":                               "\uE135", //  group:Mail and calendar
    "_appBarIcons\\mail2.comment":                      "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\contactinfo":                         "\uE136", //  group:Communications
    "_appBarIcons\\contactinfo.comment":                "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\hangup":                              "\uE137", //  group:Communications
    "_appBarIcons\\hangup.comment":                     "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\viewall":                             "\uE138", //  group:Data
    "_appBarIcons\\viewall.comment":                    "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\mappin":                              "\uE139", //  group:General
    "_appBarIcons\\mappin.comment":                     "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\phone":                               "\uE13A", //  group:Communications
    "_appBarIcons\\phone.comment":                      "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\videochat":                           "\uE13B", //  group:Communications
    "_appBarIcons\\videochat.comment":                  "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\switch":                              "\uE13C", //  group:Communications
    "_appBarIcons\\switch.comment":                     "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\contact":                             "\uE13D", //  group:Communications
    "_appBarIcons\\contact.comment":                    "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\rename":                              "\uE13E", //  group:File
    "_appBarIcons\\rename.comment":                     "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\pin":                                 "\uE141", //  group:System
    "_appBarIcons\\pin.comment":                        "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\musicinfo":                           "\uE142", //  group:Media
    "_appBarIcons\\musicinfo.comment":                  "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\go":                                  "\uE143", //  group:General
    "_appBarIcons\\go.comment":                         "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\keyboard":                            "\uE144", //  group:System
    "_appBarIcons\\keyboard.comment":                   "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\dockleft":                            "\uE145", //  group:Layout
    "_appBarIcons\\dockleft.comment":                   "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\dockright":                           "\uE146", //  group:Layout
    "_appBarIcons\\dockright.comment":                  "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\dockbottom":                          "\uE147", //  group:Layout
    "_appBarIcons\\dockbottom.comment":                 "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\remote":                              "\uE148", //  group:System
    "_appBarIcons\\remote.comment":                     "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\refresh":                             "\uE149", //  group:Data
    "_appBarIcons\\refresh.comment":                    "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\rotate":                              "\uE14A", //  group:Layout
    "_appBarIcons\\rotate.comment":                     "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\shuffle":                             "\uE14B", //  group:Media
    "_appBarIcons\\shuffle.comment":                    "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\list":                                "\uE14C", //  group:Editing
    "_appBarIcons\\list.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\shop":                                "\uE14D", //  group:General
    "_appBarIcons\\shop.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\selectall":                           "\uE14E", //  group:Data
    "_appBarIcons\\selectall.comment":                  "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\orientation":                         "\uE14F", //  group:Layout
    "_appBarIcons\\orientation.comment":                "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\import":                              "\uE150", //  group:Data
    "_appBarIcons\\import.comment":                     "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\importall":                           "\uE151", //  group:Data
    "_appBarIcons\\importall.comment":                  "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\browsephotos":                        "\uE155", //  group:Media
    "_appBarIcons\\browsephotos.comment":               "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\webcam":                              "\uE156", //  group:System
    "_appBarIcons\\webcam.comment":                     "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\pictures":                            "\uE158", //  group:Media
    "_appBarIcons\\pictures.comment":                   "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\savelocal":                           "\uE159", //  group:File
    "_appBarIcons\\savelocal.comment":                  "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\caption":                             "\uE15A", //  group:Media
    "_appBarIcons\\caption.comment":                    "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\stop":                                "\uE15B", //  group:Media
    "_appBarIcons\\stop.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\showresults":                         "\uE15C", //  group:Data
    "_appBarIcons\\showresults.comment":                "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\volume":                              "\uE15D", //  group:Media
    "_appBarIcons\\volume.comment":                     "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\repair":                              "\uE15E", //  group:System
    "_appBarIcons\\repair.comment":                     "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\message":                             "\uE15F", //  group:Communications
    "_appBarIcons\\message.comment":                    "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\page2":                               "\uE160", //  group:Layout
    "_appBarIcons\\page2.comment":                      "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\calendarday":                         "\uE161", //  group:Mail and calendar
    "_appBarIcons\\calendarday.comment":                "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\calendarweek":                        "\uE162", //  group:Mail and calendar
    "_appBarIcons\\calendarweek.comment":               "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\calendar":                            "\uE163", //  group:Mail and calendar
    "_appBarIcons\\calendar.comment":                   "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\characters":                          "\uE164", //  group:Editing
    "_appBarIcons\\characters.comment":                 "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\mailreplyall":                        "\uE165", //  group:Mail and calendar
    "_appBarIcons\\mailreplyall.comment":               "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\read":                                "\uE166", //  group:Mail and calendar
    "_appBarIcons\\read.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\link":                                "\uE167", //  group:Communications
    "_appBarIcons\\link.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\accounts":                            "\uE168", //  group:Communications
    "_appBarIcons\\accounts.comment":                   "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\showbcc":                             "\uE169", //  group:Mail and calendar
    "_appBarIcons\\showbcc.comment":                    "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\hidebcc":                             "\uE16A", //  group:Mail and calendar
    "_appBarIcons\\hidebcc.comment":                    "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\cut":                                 "\uE16B", //  group:Editing
    "_appBarIcons\\cut.comment":                        "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\attach":                              "\uE16C", //  group:Mail and calendar
    "_appBarIcons\\attach.comment":                     "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\paste":                               "\uE16D", //  group:Editing
    "_appBarIcons\\paste.comment":                      "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\filter":                              "\uE16E", //  group:Data
    "_appBarIcons\\filter.comment":                     "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\copy":                                "\uE16F", //  group:Editing
    "_appBarIcons\\copy.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\emoji2":                              "\uE170", //  group:Mail and calendar
    "_appBarIcons\\emoji2.comment":                     "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\important":                           "\uE171", //  group:Mail and calendar
    "_appBarIcons\\important.comment":                  "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\mailreply":                           "\uE172", //  group:Mail and calendar
    "_appBarIcons\\mailreply.comment":                  "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\slideshow":                           "\uE173", //  group:Media
    "_appBarIcons\\slideshow.comment":                  "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\sort":                                "\uE174", //  group:Data
    "_appBarIcons\\sort.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\manage":                              "\uE178", //  group:System
    "_appBarIcons\\manage.comment":                     "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\allapps":                             "\uE179", //  group:System
    "_appBarIcons\\allapps.comment":                    "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\disconnectdrive":                     "\uE17A", //  group:System
    "_appBarIcons\\disconnectdrive.comment":            "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\mapdrive":                            "\uE17B", //  group:System
    "_appBarIcons\\mapdrive.comment":                   "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\newwindow":                           "\uE17C", //  group:System
    "_appBarIcons\\newwindow.comment":                  "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\openwith":                            "\uE17D", //  group:System
    "_appBarIcons\\openwith.comment":                   "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\contactpresence":                     "\uE181", //  group:Communications
    "_appBarIcons\\contactpresence.comment":            "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\priority":                            "\uE182", //  group:Mail and calendar
    "_appBarIcons\\priority.comment":                   "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\uploadskydrive":                      "\uE183", //  group:File
    "_appBarIcons\\uploadskydrive.comment":             "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\gototoday":                           "\uE184", //  group:Mail and calendar
    "_appBarIcons\\gototoday.comment":                  "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\font":                                "\uE185", //  group:Editing
    "_appBarIcons\\font.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\fontcolor":                           "\uE186", //  group:Editing
    "_appBarIcons\\fontcolor.comment":                  "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\contact2":                            "\uE187", //  group:Communications
    "_appBarIcons\\contact2.comment":                   "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\folder":                              "\uE188", //  group:File
    "_appBarIcons\\folder.comment":                     "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\audio":                               "\uE189", //  group:Media
    "_appBarIcons\\audio.comment":                      "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\placeholder":                         "\uE18A", //  group:General
    "_appBarIcons\\placeholder.comment":                "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\view":                                "\uE18B", //  group:Layout
    "_appBarIcons\\view.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\setlockscreen":                       "\uE18C", //  group:System
    "_appBarIcons\\setlockscreen.comment":              "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\settile":                             "\uE18D", //  group:System
    "_appBarIcons\\settile.comment":                    "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\cc":                                  "\uE190", //  group:Media
    "_appBarIcons\\cc.comment":                         "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\stopslideshow":                       "\uE191", //  group:Media
    "_appBarIcons\\stopslideshow.comment":              "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\permissions":                         "\uE192", //  group:System
    "_appBarIcons\\permissions.comment":                "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\highlight":                           "\uE193", //  group:Editing
    "_appBarIcons\\highlight.comment":                  "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\disableupdates":                      "\uE194", //  group:System
    "_appBarIcons\\disableupdates.comment":             "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\unfavorite":                          "\uE195", //  group:Media
    "_appBarIcons\\unfavorite.comment":                 "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\unpin":                               "\uE196", //  group:System
    "_appBarIcons\\unpin.comment":                      "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\openlocal":                           "\uE197", //  group:File
    "_appBarIcons\\openlocal.comment":                  "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\mute":                                "\uE198", //  group:Media
    "_appBarIcons\\mute.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\italic":                              "\uE199", //  group:Editing
    "_appBarIcons\\italic.comment":                     "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\underline":                           "\uE19A", //  group:Editing
    "_appBarIcons\\underline.comment":                  "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\bold":                                "\uE19B", //  group:Editing
    "_appBarIcons\\bold.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\movetofolder":                        "\uE19C", //  group:File
    "_appBarIcons\\movetofolder.comment":               "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\likedislike":                         "\uE19D", //  group:Data
    "_appBarIcons\\likedislike.comment":                "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\dislike":                             "\uE19E", //  group:Data
    "_appBarIcons\\dislike.comment":                    "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\like":                                "\uE19F", //  group:Data
    "_appBarIcons\\like.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\alignright":                          "\uE1A0", //  group:Editing
    "_appBarIcons\\alignright.comment":                 "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\aligncenter":                         "\uE1A1", //  group:Editing
    "_appBarIcons\\aligncenter.comment":                "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\alignleft":                           "\uE1A2", //  group:Editing
    "_appBarIcons\\alignleft.comment":                  "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\zoom":                                "\uE1A3", //  group:Layout
    "_appBarIcons\\zoom.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\zoomout":                             "\uE1A4", //  group:Layout
    "_appBarIcons\\zoomout.comment":                    "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\openfile":                            "\uE1A5", //  group:File
    "_appBarIcons\\openfile.comment":                   "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\otheruser":                           "\uE1A6", //  group:System
    "_appBarIcons\\otheruser.comment":                  "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\admin":                               "\uE1A7", //  group:System
    "_appBarIcons\\admin.comment":                      "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\street":                              "\uE1C3", //  group:General
    "_appBarIcons\\street.comment":                     "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\map":                                 "\uE1C4", //  group:General
    "_appBarIcons\\map.comment":                        "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\clearselection":                      "\uE1C5", //  group:Data
    "_appBarIcons\\clearselection.comment":             "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\fontdecrease":                        "\uE1C6", //  group:Editing
    "_appBarIcons\\fontdecrease.comment":               "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\fontincrease":                        "\uE1C7", //  group:Editing
    "_appBarIcons\\fontincrease.comment":               "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\fontsize":                            "\uE1C8", //  group:Editing
    "_appBarIcons\\fontsize.comment":                   "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\cellphone":                           "\uE1C9", //  group:Communications
    "_appBarIcons\\cellphone.comment":                  "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\reshare":                             "\uE1CA", //  group:Communications
    "_appBarIcons\\reshare.comment":                    "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\tag":                                 "\uE1CB", //  group:Data
    "_appBarIcons\\tag.comment":                        "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\repeatone":                           "\uE1CC", //  group:Media
    "_appBarIcons\\repeatone.comment":                  "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\repeatall":                           "\uE1CD", //  group:Media
    "_appBarIcons\\repeatall.comment":                  "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\outlinestar":                         "\uE1CE", //  group:Data
    "_appBarIcons\\outlinestar.comment":                "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\solidstar":                           "\uE1CF", //  group:Data
    "_appBarIcons\\solidstar.comment":                  "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\calculator":                          "\uE1D0", //  group:General
    "_appBarIcons\\calculator.comment":                 "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\directions":                          "\uE1D1", //  group:General
    "_appBarIcons\\directions.comment":                 "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\target":                              "\uE1D2", //  group:General
    "_appBarIcons\\target.comment":                     "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\library":                             "\uE1D3", //  group:Media
    "_appBarIcons\\library.comment":                    "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\phonebook":                           "\uE1D4", //  group:Communications
    "_appBarIcons\\phonebook.comment":                  "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\memo":                                "\uE1D5", //  group:Communications
    "_appBarIcons\\memo.comment":                       "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\microphone":                          "\uE1D6", //  group:System
    "_appBarIcons\\microphone.comment":                 "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\postupdate":                          "\uE1D7", //  group:Communications
    "_appBarIcons\\postupdate.comment":                 "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\backtowindow":                        "\uE1D8", //  group:Layout
    "_appBarIcons\\backtowindow.comment":               "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\fullscreen":                          "\uE1D9", //  group:Layout
    "_appBarIcons\\fullscreen.comment":                 "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\newfolder":                           "\uE1DA", //  group:File
    "_appBarIcons\\newfolder.comment":                  "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\calendarreply":                       "\uE1DB", //  group:Mail and calendar
    "_appBarIcons\\calendarreply.comment":              "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\unsyncfolder":                        "\uE1DD", //  group:File
    "_appBarIcons\\unsyncfolder.comment":               "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\reporthacked":                        "\uE1DE", //  group:Communications
    "_appBarIcons\\reporthacked.comment":               "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\syncfolder":                          "\uE1DF", //  group:File
    "_appBarIcons\\syncfolder.comment":                 "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\blockcontact":                        "\uE1E0", //  group:Communications
    "_appBarIcons\\blockcontact.comment":               "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\switchapps":                          "\uE1E1", //  group:System
    "_appBarIcons\\switchapps.comment":                 "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\addfriend":                           "\uE1E2", //  group:Communications
    "_appBarIcons\\addfriend.comment":                  "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\touchpointer":                        "\uE1E3", //  group:System
    "_appBarIcons\\touchpointer.comment":               "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\gotostart":                           "\uE1E4", //  group:System
    "_appBarIcons\\gotostart.comment":                  "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\zerobars":                            "\uE1E5", //  group:System
    "_appBarIcons\\zerobars.comment":                   "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\onebar":                              "\uE1E6", //  group:System
    "_appBarIcons\\onebar.comment":                     "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\twobars":                             "\uE1E7", //  group:System
    "_appBarIcons\\twobars.comment":                    "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\threebars":                           "\uE1E8", //  group:System
    "_appBarIcons\\threebars.comment":                  "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\fourbars":                            "\uE1E9", //  group:System
    "_appBarIcons\\fourbars.comment":                   "{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\scan":               			"\uE294", //  group:General
    "_appBarIcons\\scan.comment":                   	"{Locked:qps-ploc,qps-plocm}",
    "appBarIcons\\preview":            			"\uE295", //  group:General
    "_appBarIcons\\preview.comment":                   	"{Locked:qps-ploc,qps-plocm}"
}
);
// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Core/_Resources',[
    'exports',
    './_Global',
    './_WinRT',
    './_Base',
    './_Events',
    'require-json!en-US/ui.resjson',
    ], function resourcesInit(exports, _Global, _WinRT, _Base, _Events, defaultStrings) {
    "use strict";

    var appxVersion = "WinJS.3.0";
    var developerPrefix = "Developer.";
    if (appxVersion.indexOf(developerPrefix) === 0) {
        appxVersion = appxVersion.substring(developerPrefix.length);
    }

    function _getWinJSString(id) {
        var result = getString("ms-resource://" + appxVersion + "/" + id);

        if (result.empty) {
            result = _getStringBuiltIn(id);
        }

        return result;
    }

    function _getStringBuiltIn(resourceId) {

        var parts = resourceId.split("/");
        parts.shift(); // ignore the leading ui/

        var str = defaultStrings[parts.join("\\")];

        if (typeof str === "string") {
            str = { value: str };
        }

        return str || { value: resourceId, empty: true };
    }

    var resourceMap;
    var mrtEventHook = false;
    var contextChangedET = "contextchanged";
    var resourceContext;

    var ListenerType = _Base.Class.mix(_Base.Class.define(null, { /* empty */ }, { supportedForProcessing: false }), _Events.eventMixin);
    var listeners = new ListenerType();
    var createEvent = _Events._createEventProperty;

    var strings = {
        get malformedFormatStringInput() { return "Malformed, did you mean to escape your '{0}'?"; },
    };

    _Base.Namespace.define("WinJS.Resources", {
        _getWinJSString: _getWinJSString
    });

    function formatString(string) {
        var args = arguments;
        if (args.length > 1) {
            string = string.replace(/({{)|(}})|{(\d+)}|({)|(})/g, function (unused, left, right, index, illegalLeft, illegalRight) {
                if (illegalLeft || illegalRight) { throw formatString(strings.malformedFormatStringInput, illegalLeft || illegalRight); }
                return (left && "{") || (right && "}") || args[(index | 0) + 1];
            });
        }
        return string;
    }

    _Base.Namespace._moduleDefine(exports, "WinJS.Resources", {
        addEventListener: function (type, listener, useCapture) {
            /// <signature helpKeyword="WinJS.Resources.addEventListener">
            /// <summary locid="WinJS.Resources.addEventListener">
            /// Registers an event handler for the specified event.
            /// </summary>
            /// <param name='type' type="String" locid='WinJS.Resources.addEventListener_p:type'>
            /// The name of the event to handle.
            /// </param>
            /// <param name='listener' type="Function" locid='WinJS.Resources.addEventListener_p:listener'>
            /// The listener to invoke when the event gets raised.
            /// </param>
            /// <param name='useCapture' type="Boolean" locid='WinJS.Resources.addEventListener_p:useCapture'>
            /// Set to true to register the event handler for the capturing phase; set to false to register for the bubbling phase.
            /// </param>
            /// </signature>
            if (_WinRT.Windows.ApplicationModel.Resources.Core.ResourceManager && !mrtEventHook) {
                if (type === contextChangedET) {
                    try {
                        var resContext = exports._getResourceContext();
                        if (resContext) {
                            resContext.qualifierValues.addEventListener("mapchanged", function (e) {
                                exports.dispatchEvent(contextChangedET, { qualifier: e.key, changed: e.target[e.key] });
                            }, false);

                        } else {
                            // The API can be called in the Background thread (web worker).
                            _WinRT.Windows.ApplicationModel.Resources.Core.ResourceManager.current.defaultContext.qualifierValues.addEventListener("mapchanged", function (e) {
                                exports.dispatchEvent(contextChangedET, { qualifier: e.key, changed: e.target[e.key] });
                            }, false);
                        }
                        mrtEventHook = true;
                    } catch (e) {
                    }
                }
            }
            listeners.addEventListener(type, listener, useCapture);
        },
        removeEventListener: listeners.removeEventListener.bind(listeners),
        dispatchEvent: listeners.dispatchEvent.bind(listeners),

        _formatString: formatString,

        _getStringWinRT: function (resourceId) {
            if (!resourceMap) {
                var mainResourceMap = _WinRT.Windows.ApplicationModel.Resources.Core.ResourceManager.current.mainResourceMap;
                try {
                    resourceMap = mainResourceMap.getSubtree('Resources');
                }
                catch (e) {
                }
                if (!resourceMap) {
                    resourceMap = mainResourceMap;
                }
            }

            var stringValue;
            var langValue;
            var resCandidate;
            try {
                var resContext = exports._getResourceContext();
                if (resContext) {
                    resCandidate = resourceMap.getValue(resourceId, resContext);
                } else {
                    resCandidate = resourceMap.getValue(resourceId);
                }

                if (resCandidate) {
                    stringValue = resCandidate.valueAsString;
                    if (stringValue === undefined) {
                        stringValue = resCandidate.toString();
                    }
                }
            }
            catch (e) { }

            if (!stringValue) {
                return exports._getStringJS(resourceId);
            }

            try {
                langValue = resCandidate.getQualifierValue("Language");
            }
            catch (e) {
                return { value: stringValue };
            }

            return { value: stringValue, lang: langValue };
        },

        _getStringJS: function (resourceId) {
            var str = _Global.strings && _Global.strings[resourceId];
            if (typeof str === "string") {
                str = { value: str };
            }
            return str || { value: resourceId, empty: true };
        },

        _getResourceContext: function () {
            if (_Global.document) {
                if (typeof (resourceContext) === 'undefined') {
                    var context = _WinRT.Windows.ApplicationModel.Resources.Core.ResourceContext;
                    if (context.getForCurrentView) {
                        resourceContext = context.getForCurrentView();
                    } else {
                        resourceContext = null;
                    }

                }
            }
            return resourceContext;
        },

        oncontextchanged: createEvent(contextChangedET)

    });

    var getStringImpl = _WinRT.Windows.ApplicationModel.Resources.Core.ResourceManager ? exports._getStringWinRT : exports._getStringJS;

    var getString = function (resourceId) {
        /// <signature helpKeyword="WinJS.Resources.getString">
        /// <summary locid='WinJS.Resources.getString'>
        /// Retrieves the resource string that has the specified resource id.
        /// </summary>
        /// <param name='resourceId' type="Number" locid='WinJS.Resources.getString._p:resourceId'>
        /// The resource id of the string to retrieve.
        /// </param>
        /// <returns type='Object' locid='WinJS.Resources.getString_returnValue'>
        /// An object that can contain these properties:
        ///
        /// value:
        /// The value of the requested string. This property is always present.
        ///
        /// empty:
        /// A value that specifies whether the requested string wasn't found.
        /// If its true, the string wasn't found. If its false or undefined,
        /// the requested string was found.
        ///
        /// lang:
        /// The language of the string, if specified. This property is only present
        /// for multi-language resources.
        ///
        /// </returns>
        /// </signature>

        return getStringImpl(resourceId);
    };

    _Base.Namespace._moduleDefine(exports, null, {
        _formatString: formatString,
        _getWinJSString: _getWinJSString
    });

    _Base.Namespace._moduleDefine(exports, "WinJS.Resources", {
        getString: {
            get: function () {
                return getString;
            },
            set: function (value) {
                getString = value;
            }
        }
    });

});

// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Core/_Trace',[
    './_Global'
    ], function traceInit(_Global) {
    "use strict";

    function nop(v) {
        return v;
    }

    return {
        _traceAsyncOperationStarting: (_Global.Debug && _Global.Debug.msTraceAsyncOperationStarting && _Global.Debug.msTraceAsyncOperationStarting.bind(_Global.Debug)) || nop,
        _traceAsyncOperationCompleted: (_Global.Debug && _Global.Debug.msTraceAsyncOperationCompleted && _Global.Debug.msTraceAsyncOperationCompleted.bind(_Global.Debug)) || nop,
        _traceAsyncCallbackStarting: (_Global.Debug && _Global.Debug.msTraceAsyncCallbackStarting && _Global.Debug.msTraceAsyncCallbackStarting.bind(_Global.Debug)) || nop,
        _traceAsyncCallbackCompleted: (_Global.Debug && _Global.Debug.msTraceAsyncCallbackCompleted && _Global.Debug.msTraceAsyncCallbackCompleted.bind(_Global.Debug)) || nop
    };
});
// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Core/_Log',[
    'exports',
    './_Global',
    './_Base',
    ], function logInit(exports, _Global, _Base) {
    "use strict";

    var spaceR = /\s+/g;
    var typeR = /^(error|warn|info|log)$/;
    var WinJSLog = null;

    function format(message, tag, type) {
        /// <signature helpKeyword="WinJS.Utilities.formatLog">
        /// <summary locid="WinJS.Utilities.formatLog">
        /// Adds tags and type to a logging message.
        /// </summary>
        /// <param name="message" type="String" locid="WinJS.Utilities.startLog_p:message">The message to format.</param>
        /// <param name="tag" type="String" locid="WinJS.Utilities.startLog_p:tag">
        /// The tag(s) to apply to the message. Separate multiple tags with spaces.
        /// </param>
        /// <param name="type" type="String" locid="WinJS.Utilities.startLog_p:type">The type of the message.</param>
        /// <returns type="String" locid="WinJS.Utilities.startLog_returnValue">The formatted message.</returns>
        /// </signature>
        var m = message;
        if (typeof (m) === "function") { m = m(); }

        return ((type && typeR.test(type)) ? ("") : (type ? (type + ": ") : "")) +
            (tag ? tag.replace(spaceR, ":") + ": " : "") +
            m;
    }
    function defAction(message, tag, type) {
        var m = exports.formatLog(message, tag, type);
        if (_Global.console) {
            _Global.console[(type && typeR.test(type)) ? type : "log"](m);
        }
    }
    function escape(s) {
        // \s (whitespace) is used as separator, so don't escape it
        return s.replace(/[-[\]{}()*+?.,\\^$|#]/g, "\\$&");
    }
    _Base.Namespace._moduleDefine(exports, "WinJS.Utilities", {
        startLog: function (options) {
            /// <signature helpKeyword="WinJS.Utilities.startLog">
            /// <summary locid="WinJS.Utilities.startLog">
            /// Configures a logger that writes messages containing the specified tags from WinJS.log to console.log.
            /// </summary>
            /// <param name="options" type="String" locid="WinJS.Utilities.startLog_p:options">
            /// The tags for messages to log. Separate multiple tags with spaces.
            /// </param>
            /// </signature>
            /// <signature>
            /// <summary locid="WinJS.Utilities.startLog2">
            /// Configure a logger to write WinJS.log output.
            /// </summary>
            /// <param name="options" type="Object" locid="WinJS.Utilities.startLog_p:options2">
            /// May contain .type, .tags, .excludeTags and .action properties.
            ///  - .type is a required tag.
            ///  - .excludeTags is a space-separated list of tags, any of which will result in a message not being logged.
            ///  - .tags is a space-separated list of tags, any of which will result in a message being logged.
            ///  - .action is a function that, if present, will be called with the log message, tags and type. The default is to log to the console.
            /// </param>
            /// </signature>
            options = options || {};
            if (typeof options === "string") {
                options = { tags: options };
            }
            var el = options.type && new RegExp("^(" + escape(options.type).replace(spaceR, " ").split(" ").join("|") + ")$");
            var not = options.excludeTags && new RegExp("(^|\\s)(" + escape(options.excludeTags).replace(spaceR, " ").split(" ").join("|") + ")(\\s|$)", "i");
            var has = options.tags && new RegExp("(^|\\s)(" + escape(options.tags).replace(spaceR, " ").split(" ").join("|") + ")(\\s|$)", "i");
            var action = options.action || defAction;

            if (!el && !not && !has && !exports.log) {
                exports.log = action;
                return;
            }

            var result = function (message, tag, type) {
                if (!((el && !el.test(type))          // if the expected log level is not satisfied
                    || (not && not.test(tag))         // if any of the excluded categories exist
                    || (has && !has.test(tag)))) {    // if at least one of the included categories doesn't exist
                        action(message, tag, type);
                    }

                result.next && result.next(message, tag, type);
            };
            result.next = exports.log;
            exports.log = result;
        },
        stopLog: function () {
            /// <signature helpKeyword="WinJS.Utilities.stopLog">
            /// <summary locid="WinJS.Utilities.stopLog">
            /// Removes the previously set up logger.
            /// </summary>
            /// </signature>
            exports.log = null;
        },
        formatLog: format
    });

    _Base.Namespace._moduleDefine(exports, "WinJS", {
        log: {
            get: function () {
                return WinJSLog;
            },
            set: function (value) {
                WinJSLog = value;
            }
        }
    });
});

// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Core/_BaseUtils',[
    'exports',
    './_Global',
    './_Base',
    './_BaseCoreUtils',
    './_ErrorFromName',
    './_Resources',
    './_Trace',
    '../Promise',
    '../Scheduler'
    ], function baseUtilsInit(exports, _Global, _Base, _BaseCoreUtils, _ErrorFromName, _Resources, _Trace, Promise, Scheduler) {
    "use strict";

    var strings = {
        get notSupportedForProcessing() { return "Value is not supported within a declarative processing context, if you want it to be supported mark it using WinJS.Utilities.markSupportedForProcessing. The value was: '{0}'"; }
    };

    var requestAnimationWorker;
    var requestAnimationId = 0;
    var requestAnimationHandlers = {};
    var isPhone = false;
    var validation = false;
    var platform = _Global.navigator.platform;
    var isiOS = platform === "iPhone" || platform === "iPad" || platform === "iPod";

    function nop(v) {
        return v;
    }

    function getMemberFiltered(name, root, filter) {
        return name.split(".").reduce(function (currentNamespace, name) {
            if (currentNamespace) {
                return filter(currentNamespace[name]);
            }
            return null;
        }, root);
    }

    function getMember(name, root) {
        /// <signature helpKeyword="WinJS.Utilities.getMember">
        /// <summary locid="WinJS.Utilities.getMember">
        /// Gets the leaf-level type or namespace specified by the name parameter.
        /// </summary>
        /// <param name="name" locid="WinJS.Utilities.getMember_p:name">
        /// The name of the member.
        /// </param>
        /// <param name="root" locid="WinJS.Utilities.getMember_p:root">
        /// The root to start in. Defaults to the global object.
        /// </param>
        /// <returns type="Object" locid="WinJS.Utilities.getMember_returnValue">
        /// The leaf-level type or namespace in the specified parent namespace.
        /// </returns>
        /// </signature>
        if (!name) {
            return null;
        }
        return getMemberFiltered(name, root || _Global, nop);
    }

    function getCamelCasedName(styleName) {
        // special case -moz prefixed styles because their JS property name starts with Moz
        if (styleName.length > 0 && styleName.indexOf("-moz") !== 0 && styleName.charAt(0) === "-") {
            styleName = styleName.slice(1);
        }
        return styleName.replace(/\-[a-z]/g, function (x) { return x[1].toUpperCase(); });
    }

    function addPrefixToCamelCasedName(prefix, name) {
        if (prefix === "") {
            return name;
        }

        return prefix + name.charAt(0).toUpperCase() + name.slice(1);
    }

    function addPrefixToCSSName(prefix, name) {
        return (prefix !== "" ? "-" + prefix.toLowerCase() + "-" : "") + name;
    }

    function getBrowserStyleEquivalents() {
        // not supported in WebWorker
        if (!_Global.document) {
            return {};
        }

        var equivalents = {},
            docStyle = _Global.document.documentElement.style,
            stylePrefixesToTest = ["", "webkit", "ms", "Moz"],
            styles = ["animation",
                "transition",
                "transform",
                "animation-name",
                "animation-duration",
                "animation-delay",
                "animation-timing-function",
                "animation-iteration-count",
                "animation-direction",
                "animation-fill-mode",
                "grid-column",
                "grid-columns",
                "grid-column-span",
                "grid-row",
                "grid-rows",
                "grid-row-span",
                "transform-origin",
                "transition-property",
                "transition-duration",
                "transition-delay",
                "transition-timing-function",
                "scroll-snap-points-x",
                "scroll-snap-points-y",
                "scroll-chaining",
                "scroll-limit",
                "scroll-limit-x-max",
                "scroll-limit-x-min",
                "scroll-limit-y-max",
                "scroll-limit-y-min",
                "scroll-snap-type",
                "scroll-snap-x",
                "scroll-snap-y",
                "touch-action",
                "overflow-style",
                "user-select" // used for Template Compiler test
            ],
            prefixesUsedOnStyles = {};

        for (var i = 0, len = styles.length; i < len; i++) {
            var originalName = styles[i],
                styleToTest = getCamelCasedName(originalName);
            for (var j = 0, prefixLen = stylePrefixesToTest.length; j < prefixLen; j++) {
                var prefix = stylePrefixesToTest[j];
                var styleName = addPrefixToCamelCasedName(prefix, styleToTest);
                if (styleName in docStyle) {
                    // Firefox doesn't support dashed style names being get/set via script. (eg, something like element.style["transform-origin"] = "" wouldn't work).
                    // For each style translation we create, we'll make a CSS name version and a script name version for it so each can be used where appropriate.
                    var cssName = addPrefixToCSSName(prefix, originalName);
                    equivalents[originalName] = {
                        cssName: cssName,
                        scriptName: styleName
                    };
                    prefixesUsedOnStyles[originalName] = prefix;
                    break;
                }
            }
        }

        // Special cases:
        equivalents.animationPrefix = addPrefixToCSSName(prefixesUsedOnStyles["animation"], "");
        equivalents.keyframes = addPrefixToCSSName(prefixesUsedOnStyles["animation"], "keyframes");

        return equivalents;
    }

    function getBrowserEventEquivalents() {
        var equivalents = {};
        var animationEventPrefixes = ["", "WebKit"],
            animationEvents = [
                {
                    eventObject: "TransitionEvent",
                    events: ["transitionStart", "transitionEnd"]
                },
                {
                    eventObject: "AnimationEvent",
                    events: ["animationStart", "animationEnd"]
                }
            ];

        for (var i = 0, len = animationEvents.length; i < len; i++) {
            var eventToTest = animationEvents[i],
                chosenPrefix = "";
            for (var j = 0, prefixLen = animationEventPrefixes.length; j < prefixLen; j++) {
                var prefix = animationEventPrefixes[j];
                if ((prefix + eventToTest.eventObject) in _Global) {
                    chosenPrefix = prefix.toLowerCase();
                    break;
                }
            }
            for (var j = 0, eventsLen = eventToTest.events.length; j < eventsLen; j++) {
                var eventName = eventToTest.events[j];
                equivalents[eventName] = addPrefixToCamelCasedName(chosenPrefix, eventName);
                if (chosenPrefix === "") {
                    // Transition and animation events are case sensitive. When there's no prefix, the event name should be in lowercase.
                    // In IE, Chrome and Firefox, an event handler listening to transitionend will be triggered properly, but transitionEnd will not.
                    // When a prefix is provided, though, the event name needs to be case sensitive.
                    // IE and Firefox will trigger an animationend event handler correctly, but Chrome won't trigger webkitanimationend -- it has to be webkitAnimationEnd.
                    equivalents[eventName] = equivalents[eventName].toLowerCase();
                }
            }
        }

        // Non-standardized events
        equivalents["manipulationStateChanged"] = ("MSManipulationEvent" in _Global ? "ManipulationEvent" : null);
        return equivalents;
    }

    _Base.Namespace._moduleDefine(exports, "WinJS.Utilities", {
        // Used for mocking in tests
        _setHasWinRT: {
            value: function (value) {
                _BaseCoreUtils.hasWinRT = value;
            },
            configurable: false,
            writable: false,
            enumerable: false
        },

        /// <field type="Boolean" locid="WinJS.Utilities.hasWinRT" helpKeyword="WinJS.Utilities.hasWinRT">Determine if WinRT is accessible in this script context.</field>
        hasWinRT: {
            get: function () { return _BaseCoreUtils.hasWinRT; },
            configurable: false,
            enumerable: true
        },

        // Used for mocking in tests
        _setIsiOS: {
            value: function (value) {
                isiOS = value;
            },
            configurable: false,
            writable: false,
            enumerable: false
        },

        _isiOS: {
            get: function () { return isiOS; },
            configurable: false,
            enumerable: true
        },

        _getMemberFiltered: getMemberFiltered,

        getMember: getMember,

        _browserStyleEquivalents: getBrowserStyleEquivalents(),
        _browserEventEquivalents: getBrowserEventEquivalents(),
        _getCamelCasedName: getCamelCasedName,

        ready: function ready(callback, async) {
            /// <signature helpKeyword="WinJS.Utilities.ready">
            /// <summary locid="WinJS.Utilities.ready">
            /// Ensures that the specified function executes only after the DOMContentLoaded event has fired
            /// for the current page.
            /// </summary>
            /// <returns type="WinJS.Promise" locid="WinJS.Utilities.ready_returnValue">A promise that completes after DOMContentLoaded has occurred.</returns>
            /// <param name="callback" optional="true" locid="WinJS.Utilities.ready_p:callback">
            /// A function that executes after DOMContentLoaded has occurred.
            /// </param>
            /// <param name="async" optional="true" locid="WinJS.Utilities.ready_p:async">
            /// If true, the callback is executed asynchronously.
            /// </param>
            /// </signature>
            return new Promise(function (c, e) {
                function complete() {
                    if (callback) {
                        try {
                            callback();
                            c();
                        }
                        catch (err) {
                            e(err);
                        }
                    } else {
                        c();
                    }
                }

                var readyState = ready._testReadyState;
                if (!readyState) {
                    if (_Global.document) {
                        readyState = _Global.document.readyState;
                    } else {
                        readyState = "complete";
                    }
                }
                if (readyState === "complete" || (_Global.document && _Global.document.body !== null)) {
                    if (async) {
                        Scheduler.schedule(function WinJS_Utilities_ready() {
                            complete();
                        }, Scheduler.Priority.normal, null, "WinJS.Utilities.ready");
                    } else {
                        complete();
                    }
                } else {
                    _Global.addEventListener("DOMContentLoaded", complete, false);
                }
            });
        },

        /// <field type="Boolean" locid="WinJS.Utilities.strictProcessing" helpKeyword="WinJS.Utilities.strictProcessing">Determines if strict declarative processing is enabled in this script context.</field>
        strictProcessing: {
            get: function () { return true; },
            configurable: false,
            enumerable: true,
        },

        markSupportedForProcessing: {
            value: _BaseCoreUtils.markSupportedForProcessing,
            configurable: false,
            writable: false,
            enumerable: true
        },

        requireSupportedForProcessing: {
            value: function (value) {
                /// <signature helpKeyword="WinJS.Utilities.requireSupportedForProcessing">
                /// <summary locid="WinJS.Utilities.requireSupportedForProcessing">
                /// Asserts that the value is compatible with declarative processing, such as WinJS.UI.processAll
                /// or WinJS.Binding.processAll. If it is not compatible an exception will be thrown.
                /// </summary>
                /// <param name="value" type="Object" locid="WinJS.Utilities.requireSupportedForProcessing_p:value">
                /// The value to be tested for compatibility with declarative processing. If the
                /// value is a function it must be marked with a property 'supportedForProcessing'
                /// with a value of true.
                /// </param>
                /// <returns type="Object" locid="WinJS.Utilities.requireSupportedForProcessing_returnValue">
                /// The input value.
                /// </returns>
                /// </signature>
                var supportedForProcessing = true;

                supportedForProcessing = supportedForProcessing && value !== _Global;
                supportedForProcessing = supportedForProcessing && value !== _Global.location;
                supportedForProcessing = supportedForProcessing && !(value instanceof _Global.HTMLIFrameElement);
                supportedForProcessing = supportedForProcessing && !(typeof value === "function" && !value.supportedForProcessing);

                switch (_Global.frames.length) {
                    case 0:
                        break;

                    case 1:
                        supportedForProcessing = supportedForProcessing && value !== _Global.frames[0];
                        break;

                    default:
                        for (var i = 0, len = _Global.frames.length; supportedForProcessing && i < len; i++) {
                            supportedForProcessing = supportedForProcessing && value !== _Global.frames[i];
                        }
                        break;
                }

                if (supportedForProcessing) {
                    return value;
                }

                throw new _ErrorFromName("WinJS.Utilities.requireSupportedForProcessing", _Resources._formatString(strings.notSupportedForProcessing, value));
            },
            configurable: false,
            writable: false,
            enumerable: true
        },

        _setImmediate: _BaseCoreUtils._setImmediate,

        _requestAnimationFrame: _Global.requestAnimationFrame ? _Global.requestAnimationFrame.bind(_Global) : function (handler) {
            var handle = ++requestAnimationId;
            requestAnimationHandlers[handle] = handler;
            requestAnimationWorker = requestAnimationWorker || _Global.setTimeout(function () {
                var toProcess = requestAnimationHandlers;
                var now = Date.now();
                requestAnimationHandlers = {};
                requestAnimationWorker = null;
                Object.keys(toProcess).forEach(function (key) {
                    toProcess[key](now);
                });
            }, 16);
            return handle;
        },

        _cancelAnimationFrame: _Global.cancelAnimationFrame ? _Global.cancelAnimationFrame.bind(_Global) : function (handle) {
            delete requestAnimationHandlers[handle];
        },

        // Allows the browser to finish dispatching its current set of events before running
        // the callback.
        _yieldForEvents: _Global.setImmediate ? _Global.setImmediate.bind(_Global) : function (handler) {
            _Global.setTimeout(handler, 0);
        },

        // Allows the browser to notice a DOM modification before running the callback.
        _yieldForDomModification: _Global.setImmediate ? _Global.setImmediate.bind(_Global) : function (handler) {
            _Global.setTimeout(handler, 0);
        },

        _shallowCopy: function _shallowCopy(a) {
            // Shallow copy a single object.
            return this._mergeAll([a]);
        },

        _merge: function _merge(a, b) {
            // Merge 2 objects together into a new object
            return this._mergeAll([a, b]);
        },

        _mergeAll: function _mergeAll(list) {
            // Merge a list of objects together
            var o = {};
            list.forEach(function (part) {
                Object.keys(part).forEach(function (k) {
                    o[k] = part[k];
                });
            });
            return o;
        },

        _getProfilerMarkIdentifier: function _getProfilerMarkIdentifier(element) {
            var profilerMarkIdentifier = "";
            if (element.id) {
                profilerMarkIdentifier += " id='" + element.id + "'";
            }
            if (element.className) {
                profilerMarkIdentifier += " class='" + element.className + "'";
            }
            return profilerMarkIdentifier;
        },

        _now: function _now() {
            return (_Global.performance && _Global.performance.now && _Global.performance.now()) || Date.now();
        },

        _traceAsyncOperationStarting: _Trace._traceAsyncOperationStarting,
        _traceAsyncOperationCompleted: _Trace._traceAsyncOperationCompleted,
        _traceAsyncCallbackStarting: _Trace._traceAsyncCallbackStarting,
        _traceAsyncCallbackCompleted: _Trace._traceAsyncCallbackCompleted,

        /// <field type="Boolean" locid="WinJS.Utilities.isPhone" helpKeyword="WinJS.Utilities.isPhone">Determine if we are currently running in the Phone.</field>
        isPhone: {
            get: function () { return isPhone; },
            configurable: false,
            enumerable: true
        },
        _setIsPhone: {
            set: function (value) {
                isPhone = value;
            }
        }
    });

    _Base.Namespace._moduleDefine(exports, "WinJS", {
        validation: {
            get: function () {
                return validation;
            },
            set: function (value) {
                validation = value;
            }
        }
    });

    // strictProcessing also exists as a module member
    _Base.Namespace.define("WinJS", {
        strictProcessing: {
            value: function () {
                /// <signature helpKeyword="WinJS.strictProcessing">
                /// <summary locid="WinJS.strictProcessing">
                /// Strict processing is always enforced, this method has no effect.
                /// </summary>
                /// </signature>
            },
            configurable: false,
            writable: false,
            enumerable: false
        }
    });
});


define('WinJS/Core',[
    './Core/_Base',
    './Core/_BaseCoreUtils',
    './Core/_BaseUtils',
    './Core/_ErrorFromName',
    './Core/_Events',
    './Core/_Global',
    './Core/_Log',
    './Core/_Resources',
    './Core/_Trace',
    './Core/_WinRT',
    './Core/_WriteProfilerMark'
    ], function () {
    // Wrapper module
});
