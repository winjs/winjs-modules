// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Binding/_BindingParser',[
    'exports',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_ErrorFromName',
    '../Core/_Log',
    '../Core/_Resources',
    '../Core/_WriteProfilerMark',
    '../ControlProcessor/_OptionsLexer',
    '../ControlProcessor/_OptionsParser'
    ], function bindingParserInit(exports, _Base, _BaseUtils, _ErrorFromName, _Log, _Resources, _WriteProfilerMark, _OptionsLexer, _OptionsParser) {
    "use strict";


    var strings = {
        get invalidBinding() { return _Resources._getWinJSString("base/invalidBinding").value; },
        get bindingInitializerNotFound() { return _Resources._getWinJSString("base/bindingInitializerNotFound").value; },
    };

/*
    See comment for data-win-options attribute grammar for context.

    Syntactic grammar for the value of the data-win-bind attribute.

        BindDeclarations:
            BindDeclaration
            BindDeclarations ; BindDeclaration

        BindDeclaration:
            DestinationPropertyName : SourcePropertyName
            DestinationPropertyName : SourcePropertyName InitializerName

        DestinationPropertyName:
            IdentifierExpression

        SourcePropertyName:
            IdentifierExpression

        InitializerName:
            IdentifierExpression

        Value:
            NumberLiteral
            StringLiteral

        AccessExpression:
            [ Value ]
            . Identifier

        AccessExpressions:
            AccessExpression
            AccessExpressions AccessExpression

        IdentifierExpression:
            Identifier
            Identifier AccessExpressions

*/
    var imports = _Base.Namespace.defineWithParent(null, null, {
        lexer: _Base.Namespace._lazy(function() {
            return _OptionsLexer._optionsLexer;
        }),
        tokenType: _Base.Namespace._lazy(function() {
            return _OptionsLexer._optionsLexer.tokenType;
        }),
    });

    var requireSupportedForProcessing = _BaseUtils.requireSupportedForProcessing;

    var local = _Base.Namespace.defineWithParent(null, null, {

        BindingInterpreter: _Base.Namespace._lazy(function () {
            return _Base.Class.derive(_OptionsParser.optionsParser._BaseInterpreter, function (tokens, originalSource, context) {
                this._initialize(tokens, originalSource, context);
            }, {
                _error: function (message) {
                    throw new _ErrorFromName("WinJS.Binding.ParseError", _Resources._formatString(strings.invalidBinding, this._originalSource, message));
                },
                _evaluateInitializerName: function () {
                    if (this._current.type === imports.tokenType.identifier) {
                        var initializer = this._evaluateIdentifierExpression();
                        if (_Log.log && !initializer) {
                            _Log.log(_Resources._formatString(strings.bindingInitializerNotFound, this._originalSource), "winjs binding", "error");
                        }
                        return requireSupportedForProcessing(initializer);
                    }
                    return;
                },
                _evaluateValue: function () {
                    switch (this._current.type) {
                        case imports.tokenType.stringLiteral:
                        case imports.tokenType.numberLiteral:
                            var value = this._current.value;
                            this._read();
                            return value;

                        default:
                            this._unexpectedToken(imports.tokenType.stringLiteral, imports.tokenType.numberLiteral);
                            return;
                    }
                },
                _readBindDeclarations: function () {
                    var bindings = [];
                    while (true) {
                        switch (this._current.type) {
                            case imports.tokenType.identifier:
                            case imports.tokenType.thisKeyword:
                                bindings.push(this._readBindDeclaration());
                                break;

                            case imports.tokenType.semicolon:
                                this._read();
                                break;

                            case imports.tokenType.eof:
                                return bindings;

                            default:
                                this._unexpectedToken(imports.tokenType.identifier, imports.tokenType.semicolon, imports.tokenType.eof);
                                return;
                        }
                    }
                },
                _readBindDeclaration: function () {
                    var dest = this._readDestinationPropertyName();
                    this._read(imports.tokenType.colon);
                    var src = this._readSourcePropertyName();
                    var initializer = this._evaluateInitializerName();
                    return {
                        destination: dest,
                        source: src,
                        initializer: initializer,
                    };
                },
                _readDestinationPropertyName: function () {
                    return this._readIdentifierExpression();
                },
                _readSourcePropertyName: function () {
                    return this._readIdentifierExpression();
                },
                run: function () {
                    return this._readBindDeclarations();
                }
            }, {
                supportedForProcessing: false,
            });
        }),

        BindingParser: _Base.Namespace._lazy(function () {
            return _Base.Class.derive(local.BindingInterpreter, function (tokens, originalSource) {
                this._initialize(tokens, originalSource, {});
            }, {
                _readInitializerName: function () {
                    if (this._current.type === imports.tokenType.identifier) {
                        return this._readIdentifierExpression();
                    }
                    return;
                },
                _readBindDeclaration: function () {
                    var dest = this._readDestinationPropertyName();
                    this._read(imports.tokenType.colon);
                    var src = this._readSourcePropertyName();
                    var initializer = this._readInitializerName();
                    return {
                        destination: dest,
                        source: src,
                        initializer: initializer,
                    };
                },
            }, {
                supportedForProcessing: false,
            });
        })

    });

    function parser(text, context) {
        _WriteProfilerMark("WinJS.Binding:bindingParser,StartTM");
        var tokens = imports.lexer(text);
        var interpreter = new local.BindingInterpreter(tokens, text, context || {});
        var res = interpreter.run();
        _WriteProfilerMark("WinJS.Binding:bindingParser,StopTM");
        return res;
    }

    function parser2(text) {
        _WriteProfilerMark("WinJS.Binding:bindingParser,StartTM");
        var tokens = imports.lexer(text);
        var interpreter = new local.BindingParser(tokens, text);
        var res = interpreter.run();
        _WriteProfilerMark("WinJS.Binding:bindingParser,StopTM");
        return res;
    }

    _Base.Namespace._moduleDefine(exports, "WinJS.Binding", {
        _bindingParser: parser,
        _bindingParser2: parser2,
    });

});

// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Binding/_DomWeakRefTable',[
    'exports',
    '../Core/_Global',
    '../Core/_WinRT',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Scheduler'
    ], function DOMWeakRefTableInit(exports, _Global, _WinRT, _Base, _BaseUtils, Scheduler) {
    "use strict";

    if (_WinRT.Windows.Foundation.Uri && _WinRT.msSetWeakWinRTProperty && _WinRT.msGetWeakWinRTProperty) {

        var host = new _WinRT.Windows.Foundation.Uri("about://blank");

        _Base.Namespace._moduleDefine(exports, "WinJS.Utilities", {

            _createWeakRef: function (element, id) {
                _WinRT.msSetWeakWinRTProperty(host, id, element);
                return id;
            },

            _getWeakRefElement: function (id) {
                return _WinRT.msGetWeakWinRTProperty(host, id);
            }

        });

        return;

    }

    // Defaults 
    var SWEEP_PERIOD = 500;
    var TIMEOUT = 1000;
    var table = {};
    var cleanupToken;
    var noTimeoutUnderDebugger = true;
    var fastLoadPath = false;

    function cleanup() {
        if (SWEEP_PERIOD === 0) {     // If we're using post
            cleanupToken = 0;          // indicate that cleanup has run
        }
        var keys = Object.keys(table);
        var time = Date.now() - TIMEOUT;
        var i, len;
        for (i = 0, len = keys.length; i < len; i++) {
            var id = keys[i];
            if (table[id].time < time) {
                delete table[id];
            }
        }
        unscheduleCleanupIfNeeded();
    }

    function scheduleCleanupIfNeeded() {
        if ((_Global.Debug && _Global.Debug.debuggerEnabled && noTimeoutUnderDebugger) || cleanupToken) {
            return;
        }
        if (SWEEP_PERIOD === 0) {
            Scheduler.schedule(cleanup, Scheduler.Priority.idle, null, "WinJS.Utilities._DOMWeakRefTable.cleanup");
            cleanupToken = 1;
        } else {
            cleanupToken = _Global.setInterval(cleanup, SWEEP_PERIOD);
        }
    }

    function unscheduleCleanupIfNeeded() {
        if (_Global.Debug && _Global.Debug.debuggerEnabled && noTimeoutUnderDebugger) {
            return;
        }
        if (SWEEP_PERIOD === 0) {                           // if we're using post
            if (!cleanupToken) {                            // and there isn't already one scheduled
                if (Object.keys(table).length !== 0) {      // and there are items in the table
                    Scheduler.schedule(     // schedule another call to cleanup
                        cleanup,
                        Scheduler.Priority.idle,
                        null, "WinJS.Utilities._DOMWeakRefTable.cleanup"
                    );
                    cleanupToken = 1;                       // and protect against overscheduling
                }
            }
        } else if (cleanupToken) {
            if (Object.keys(table).length === 0) {
                _Global.clearInterval(cleanupToken);
                cleanupToken = 0;
            }
        }
    }

    function createWeakRef(element, id) {
        table[id] = { element: element, time: Date.now() };
        scheduleCleanupIfNeeded();
        return id;
    }

    function getWeakRefElement(id) {
        if (fastLoadPath) {
            var entry = table[id];
            if (entry) {
                return entry.element;
            }
            else {
                return _Global.document.getElementById(id);
            }
        }
        else {
            var element = _Global.document.getElementById(id);
            if (element) {
                delete table[id];
                unscheduleCleanupIfNeeded();
            } else {
                var entry = table[id];
                if (entry) {
                    entry.time = Date.now();
                    element = entry.element;
                }
            }
            return element;
        }
    }

    _Base.Namespace._moduleDefine(exports, "WinJS.Utilities",  {
        _DOMWeakRefTable_noTimeoutUnderDebugger: {
            get: function() {
                return noTimeoutUnderDebugger;
            },
            set: function(value) {
                noTimeoutUnderDebugger = value;
            }
        },
        _DOMWeakRefTable_sweepPeriod: {
            get: function() {
                return SWEEP_PERIOD;
            },
            set: function(value) {
                SWEEP_PERIOD = value;
            }
        },
        _DOMWeakRefTable_timeout: {
            get: function() {
                return TIMEOUT;
            },
            set: function(value) {
                TIMEOUT = value;
            }
        },
        _DOMWeakRefTable_tableSize: { get: function () { return Object.keys(table).length; } },
        _DOMWeakRefTable_fastLoadPath: {
            get: function() {
                return fastLoadPath;
            },
            set: function(value) {
                fastLoadPath = value;
            }
        },
        _createWeakRef: createWeakRef,
        _getWeakRefElement: getWeakRefElement

    });

});
// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Binding/_Data',[
    'exports',
    '../Core/_WinRT',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_ErrorFromName',
    '../Core/_Log',
    '../Core/_Resources',
    '../Promise',
    '../Scheduler',
    './_DomWeakRefTable'
    ], function dataInit(exports, _WinRT, _Base, _BaseUtils, _ErrorFromName, _Log, _Resources, Promise, Scheduler, _DomWeakRefTable) {
    "use strict";


    var strings = {
        get exceptionFromBindingInitializer() { return _Resources._getWinJSString("base/exceptionFromBindingInitializer").value; },
        get propertyIsUndefined() { return _Resources._getWinJSString("base/propertyIsUndefined").value; },
        get unsupportedDataTypeForBinding() { return _Resources._getWinJSString("base/unsupportedDataTypeForBinding").value; },
    };

    var observableMixin = {
        _listeners: null,
        _pendingNotifications: null,
        _notifyId: 0,

        _getObservable: function () {
            return this;
        },

        _cancel: function (name) {
            var v = this._pendingNotifications;
            var hit = false;
            if (v) {
                var k = Object.keys(v);
                for (var i = k.length - 1; i >= 0; i--) {
                    var entry = v[k[i]];
                    if (entry.target === name) {
                        if (entry.promise) {
                            entry.promise.cancel();
                            entry.promise = null;
                        }
                        delete v[k[i]];
                        hit = true;
                    }
                }
            }
            return hit;
        },

        notify: function (name, newValue, oldValue) {
            /// <signature helpKeyword="WinJS.Binding.observableMixin.notify">
            /// <summary locid="WinJS.Binding.observableMixin.notify">
            /// Notifies listeners that a property value was updated.
            /// </summary>
            /// <param name="name" type="String" locid="WinJS.Binding.observableMixin.notify_p:name">The name of the property that is being updated.</param>
            /// <param name="newValue" type="Object" locid="WinJS.Binding.observableMixin.notify_p:newValue">The new value for the property.</param>
            /// <param name="oldValue" type="Object" locid="WinJS.Binding.observableMixin.notify_p:oldValue">The old value for the property.</param>
            /// <returns type="WinJS.Promise" locid="WinJS.Binding.observableMixin.notify_returnValue">A promise that is completed when the notifications are complete.</returns>
            /// </signature>
            var listeners = this._listeners && this._listeners[name];
            if (listeners) {
                var that = this;

                // Handle the case where we are updating a value that is currently updating
                //
                that._cancel(name);

                // Starting new work, we cache the work description and queue up to do the notifications
                //
                that._pendingNotifications = that._pendingNotifications || {};
                var x = that._notifyId++;
                var cap = that._pendingNotifications[x] = { target: name };

                var cleanup = function () {
                    delete that._pendingNotifications[x];
                };

                // Binding guarantees async notification, so we do timeout()
                //
                cap.promise = Scheduler.schedulePromiseNormal(null, "WinJS.Binding.observableMixin.notify").
                    then(function () {
                        // cap.promise is removed after canceled, so we use this as a signal
                        // to indicate that we should abort early
                        //
                        for (var i = 0, l = listeners.length; i < l && cap.promise; i++) {
                            try {
                                listeners[i](newValue, oldValue);
                            }
                            catch (e) {
                                _Log.log && _Log.log(_Resources._formatString(strings.exceptionFromBindingInitializer, e.toString()), "winjs binding", "error");
                            }
                        }
                        cleanup();
                        return newValue;
                    });

                return cap.promise;
            }

            return Promise.as();
        },

        bind: function (name, action) {
            /// <signature helpKeyword="WinJS.Binding.observableMixin.bind">
            /// <summary locid="WinJS.Binding.observableMixin.bind">
            /// Links the specified action to the property specified in the name parameter.
            /// This function is invoked when the value of the property may have changed.
            /// It is not guaranteed that the action will be called only when a value has actually changed,
            /// nor is it guaranteed that the action will be called for every value change. The implementation
            /// of this function coalesces change notifications, such that multiple updates to a property
            /// value may result in only a single call to the specified action.
            /// </summary>
            /// <param name="name" type="String" locid="WinJS.Binding.observableMixin.bind_p:name">
            /// The name of the property to which to bind the action.
            /// </param>
            /// <param name="action" type="function" locid="WinJS.Binding.observableMixin.bind_p:action">
            /// The function to invoke asynchronously when the property may have changed.
            /// </param>
            /// <returns type="Object" locid="WinJS.Binding.observableMixin.bind_returnValue">
            /// This object is returned.
            /// </returns>
            /// </signature>

            this._listeners = this._listeners || {};
            var listeners = this._listeners[name] = this._listeners[name] || [];

            // duplicate detection, multiple binds with the same action should have no effect
            //
            var found = false;
            for (var i = 0, l = listeners.length; i < l; i++) {
                if (listeners[i] === action) {
                    found = true;
                    break;
                }
            }

            if (!found) {
                listeners.push(action);

                // out of band notification, we want to avoid a broadcast to all listeners
                // so we can't just call notify.
                //
                action(unwrap(this[name]));
            }
            return this;
        },

        unbind: function (name, action) {
            /// <signature helpKeyword="WinJS.Binding.observableMixin.unbind">
            /// <summary locid="WinJS.Binding.observableMixin.unbind">
            /// Removes one or more listeners from the notification list for a given property.
            /// </summary>
            /// <param name="name" type="String" optional="true" locid="WinJS.Binding.observableMixin.unbind_p:name">
            /// The name of the property to unbind. If this parameter is omitted, all listeners
            /// for all events are removed.
            /// </param>
            /// <param name="action" type="function" optional="true" locid="WinJS.Binding.observableMixin.unbind_p:action">
            /// The function to remove from the listener list for the specified property. If this parameter is omitted, all listeners
            /// are removed for the specific property.
            /// </param>
            /// <returns type="Object" locid="WinJS.Binding.observableMixin.unbind_returnValue">
            /// This object is returned.
            /// </returns>
            /// </signature>

            this._listeners = this._listeners || {};

            if (name && action) {
                // this assumes we rarely have more than one
                // listener, so we optimize to not do a lot of
                // array manipulation, although it means we
                // may do some extra GC churn in the other cases...
                //
                var listeners = this._listeners[name];
                if (listeners) {
                    var nl;
                    for (var i = 0, l = listeners.length; i < l; i++) {
                        if (listeners[i] !== action) {
                            (nl = nl || []).push(listeners[i]);
                        }
                    }
                    this._listeners[name] = nl;
                }

                // we allow any pending notification sweep to complete,
                // which means that "unbind" inside of a notification
                // will not prevent that notification from occuring.
                //
            }
            else if (name) {
                this._cancel(name);
                delete this._listeners[name];
            }
            else {
                var that = this;
                if (that._pendingNotifications) {
                    var v = that._pendingNotifications;
                    that._pendingNotifications = {};
                    Object.keys(v).forEach(function (k) {
                        var n = v[k];
                        if (n.promise) { n.promise.cancel(); }
                    });
                }
                this._listeners = {};
            }
            return this;
        }
    };

    var dynamicObservableMixin = {
        _backingData: null,

        _initObservable: function (data) {
            this._backingData = data || {};
        },

        getProperty: function (name) {
            /// <signature helpKeyword="WinJS.Binding.dynamicObservableMixin.getProperty">
            /// <summary locid="WinJS.Binding.dynamicObservableMixin.getProperty">
            /// Gets a property value by name.
            /// </summary>
            /// <param name="name" type="String" locid="WinJS.Binding.dynamicObservableMixin.getProperty_p:name">
            /// The name of property to get.
            /// </param>
            /// <returns type="Object" locid="WinJS.Binding.dynamicObservableMixin.getProperty_returnValue">
            /// The value of the property as an observable object.
            /// </returns>
            /// </signature>
            var data = this._backingData[name];
            if (_Log.log && data === undefined) {
                _Log.log(_Resources._formatString(strings.propertyIsUndefined, name), "winjs binding", "warn");
            }
            return as(data);
        },

        setProperty: function (name, value) {
            /// <signature helpKeyword="WinJS.Binding.dynamicObservableMixin.setProperty">
            /// <summary locid="WinJS.Binding.dynamicObservableMixin.setProperty">
            /// Updates a property value and notifies any listeners.
            /// </summary>
            /// <param name="name" type="String" locid="WinJS.Binding.dynamicObservableMixin.setProperty_p:name">
            /// The name of the property to update.
            /// </param>
            /// <param name="value" locid="WinJS.Binding.dynamicObservableMixin.setProperty_p:value">
            /// The new value of the property.
            /// </param>
            /// <returns type="Object" locid="WinJS.Binding.dynamicObservableMixin.setProperty_returnValue">
            /// This object is returned.
            /// </returns>
            /// </signature>

            this.updateProperty(name, value);
            return this;
        },

        addProperty: function (name, value) {
            /// <signature helpKeyword="WinJS.Binding.dynamicObservableMixin.addProperty">
            /// <summary locid="WinJS.Binding.dynamicObservableMixin.addProperty">
            /// Adds a property with change notification to this object, including a ECMAScript5 property definition.
            /// </summary>
            /// <param name="name" type="String" locid="WinJS.Binding.dynamicObservableMixin.addProperty_p:name">
            /// The name of the property to add.
            /// </param>
            /// <param name="value" locid="WinJS.Binding.dynamicObservableMixin.addProperty_p:value">
            /// The value of the property.
            /// </param>
            /// <returns type="Object" locid="WinJS.Binding.dynamicObservableMixin.addProperty_returnValue">
            /// This object is returned.
            /// </returns>
            /// </signature>

            // we could walk Object.keys to more deterministically determine this,
            // however in the normal case this avoids a bunch of string compares
            //
            if (!this[name]) {
                Object.defineProperty(this,
                    name, {
                        get: function () { return this.getProperty(name); },
                        set: function (value) { this.setProperty(name, value); },
                        enumerable: true,
                        configurable: true
                    }
                );
            }
            return this.setProperty(name, value);
        },

        updateProperty: function (name, value) {
            /// <signature helpKeyword="WinJS.Binding.dynamicObservableMixin.updateProperty">
            /// <summary locid="WinJS.Binding.dynamicObservableMixin.updateProperty">
            /// Updates a property value and notifies any listeners.
            /// </summary>
            /// <param name="name" type="String" locid="WinJS.Binding.dynamicObservableMixin.updateProperty_p:name">
            /// The name of the property to update.
            /// </param>
            /// <param name="value" locid="WinJS.Binding.dynamicObservableMixin.updateProperty_p:value">
            /// The new value of the property.
            /// </param>
            /// <returns type="WinJS.Promise" locid="WinJS.Binding.dynamicObservableMixin.updateProperty_returnValue">
            /// A promise that completes when the notifications for
            /// this property change have been processed. If multiple notifications are coalesced,
            /// the promise may be canceled or the value of the promise may be updated.
            /// The fulfilled value of the promise is the new value of the property for
            /// which the notifications have been completed.
            /// </returns>
            /// </signature>

            var oldValue = this._backingData[name];
            var newValue = unwrap(value);
            if (oldValue !== newValue) {
                this._backingData[name] = newValue;

                // This will complete when the listeners are notified, even
                // if a new value is used. The only time this promise will fail
                // (cancel) will be if we start notifying and then have to
                // cancel in the middle of processing it. That's a pretty
                // subtle contract.
                //
                // IE has a bug where readonly properties will not throw,
                // even in strict mode, when set using a string accessor.
                // To be consistent across browsers, only notify if the
                // set succeeded.
                if(this._backingData[name] === newValue) {
                    return this.notify(name, newValue, oldValue);
                }
            }
            return Promise.as();
        },

        removeProperty: function (name) {
            /// <signature helpKeyword="WinJS.Binding.dynamicObservableMixin.removeProperty">
            /// <summary locid="WinJS.Binding.dynamicObservableMixin.removeProperty">
            /// Removes a property value.
            /// </summary>
            /// <param name="name" type="String" locid="WinJS.Binding.dynamicObservableMixin.removeProperty_p:name">
            /// The name of the property to remove.
            /// </param>
            /// <returns type="Object" locid="WinJS.Binding.dynamicObservableMixin.removeProperty_returnValue">
            /// This object is returned.
            /// </returns>
            /// </signature>

            var oldValue = this._backingData[name];
            var value; // capture "undefined"
            // in strict mode these may throw
            try {
                delete this._backingData[name];
            } catch (e) { }
            try {
                delete this[name];
            } catch (e) { }
            this.notify(name, value, oldValue);
            return this;
        }
    };

    // Merge "obsevable" into "dynamicObservable"
    //
    Object.keys(observableMixin).forEach(function (k) {
        dynamicObservableMixin[k] = observableMixin[k];
    });


    var bind = function (observable, bindingDescriptor) {
        /// <signature helpKeyword="WinJS.Binding.bind">
        /// <summary locid="WinJS.Binding.bind">
        /// Binds to one or more properties on the observable object or or on child values
        /// of that object.
        /// </summary>
        /// <param name="observable" type="Object" locid="WinJS.Binding.bind_p:observable">
        /// The object to bind to.
        /// </param>
        /// <param name="bindingDescriptor" type="Object" locid="WinJS.Binding.bind_p:bindingDescriptor">
        /// An object literal containing the binding declarations. Binding declarations take the form:
        /// { propertyName: (function | bindingDeclaration), ... }
        ///
        /// For example, binding to a nested member of an object is declared like this:
        /// bind(someObject, { address: { street: function(v) { ... } } });
        /// </param>
        /// <returns type="Object" locid="WinJS.Binding.bind_returnValue">
        /// An object that contains at least a "cancel" field, which is
        /// a function that removes all bindings associated with this bind
        /// request.
        /// </returns>
        /// </signature>
        return bindImpl(observable, bindingDescriptor);
    };
    var bindRefId = 0;
    var createBindRefId = function () {
        return "bindHandler" + (bindRefId++);
    };
    var createProxy = function (func, bindStateRef) {
        if (!_WinRT.msGetWeakWinRTProperty) {
            return func;
        }

        var id = createBindRefId();
        _DomWeakRefTable._getWeakRefElement(bindStateRef)[id] = func;
        return function (n, o) {
            var bindState = _DomWeakRefTable._getWeakRefElement(bindStateRef);
            if (bindState) {
                bindState[id](n, o);
            }
        };
    };
    var bindImpl = function (observable, bindingDescriptor, bindStateRef) {
        observable = as(observable);
        if (!observable) {
            return { cancel: function () { }, empty: true };
        }

        var bindState;
        if (!bindStateRef) {
            bindStateRef = createBindRefId();
            bindState = {};
            _DomWeakRefTable._createWeakRef(bindState, bindStateRef);
        }

        var complexLast = {};
        var simpleLast = null;

        function cancelSimple() {
            if (simpleLast) {
                simpleLast.forEach(function (e) {
                    e.source.unbind(e.prop, e.listener);
                });
            }
            simpleLast = null;
        }

        function cancelComplex(k) {
            if (complexLast[k]) {
                complexLast[k].complexBind.cancel();
                delete complexLast[k];
            }
        }

        Object.keys(bindingDescriptor).forEach(function (k) {
            var listener = bindingDescriptor[k];
            if (listener instanceof Function) {
                // Create a proxy for the listener which indirects weakly through the bind
                // state, if this is the root object tack the bind state onto the listener
                //
                listener = createProxy(listener, bindStateRef);
                listener.bindState = bindState;
                simpleLast = simpleLast || [];
                simpleLast.push({ source: observable, prop: k, listener: listener });
                observable.bind(k, listener);
            }
            else {
                var propChanged = function (v) {
                    cancelComplex(k);
                    var complexBind = bindImpl(as(v), listener, bindStateRef);

                    // In the case that we hit an "undefined" in the chain, we prop the change
                    // notification to all listeners, basically saying that x.y.z where "y"
                    // is undefined resolves to undefined.
                    //
                    if (complexBind.empty) {
                        var recursiveNotify = function (root) {
                            Object.keys(root).forEach(function (key) {
                                var item = root[key];
                                if (item instanceof Function) {
                                    item(undefined, undefined);
                                }
                                else {
                                    recursiveNotify(item);
                                }
                            });
                        };
                        recursiveNotify(listener);
                    }
                    complexLast[k] = { source: v, complexBind: complexBind };
                };

                // Create a proxy for the listener which indirects weakly through the bind
                // state, if this is the root object tack the bind state onto the listener
                //
                propChanged = createProxy(propChanged, bindStateRef);
                propChanged.bindState = bindState;
                simpleLast = simpleLast || [];
                simpleLast.push({ source: observable, prop: k, listener: propChanged });
                observable.bind(k, propChanged);
            }
        });

        return {
            cancel: function () {
                cancelSimple();
                Object.keys(complexLast).forEach(function (k) { cancelComplex(k); });
            }
        };
    };

    
    var ObservableProxy = _Base.Class.mix(function (data) {
        this._initObservable(data);
        Object.defineProperties(this, expandProperties(data));
    }, dynamicObservableMixin);

    var expandProperties = function (shape) {
        /// <signature helpKeyword="WinJS.Binding.expandProperties">
        /// <summary locid="WinJS.Binding.expandProperties">
        /// Wraps the specified object so that all its properties
        /// are instrumented for binding. This is meant to be used in
        /// conjunction with the binding mixin.
        /// </summary>
        /// <param name="shape" type="Object" locid="WinJS.Binding.expandProperties_p:shape">
        /// The specification for the bindable object.
        /// </param>
        /// <returns type="Object" locid="WinJS.Binding.expandProperties_returnValue">
        /// An object with a set of properties all of which are wired for binding.
        /// </returns>
        /// </signature>
        var props = {};
        function addToProps(k) {
            props[k] = {
                get: function () { return this.getProperty(k); },
                set: function (value) { this.setProperty(k, value); },
                enumerable: true,
                configurable: true // enables delete
            };
        }
        while (shape && shape !== Object.prototype) {
            Object.keys(shape).forEach(addToProps);
            shape = Object.getPrototypeOf(shape);
        }
        return props;
    };

    var define = function (data) {
        /// <signature helpKeyword="WinJS.Binding.define">
        /// <summary locid="WinJS.Binding.define">
        /// Creates a new constructor function that supports observability with
        /// the specified set of properties.
        /// </summary>
        /// <param name="data" type="Object" locid="WinJS.Binding.define_p:data">
        /// The object to use as the pattern for defining the set of properties, for example:
        /// var MyPointClass = define({x:0,y:0});
        /// </param>
        /// <returns type="Function" locid="WinJS.Binding.define_returnValue">
        /// A constructor function with 1 optional argument that is the initial state of
        /// the properties.
        /// </returns>
        /// </signature>

        // Common unsupported types, we just coerce to be an empty record
        //
        if (!data || typeof (data) !== "object" || (data instanceof Date) || Array.isArray(data)) {
            if (_BaseUtils.validation) {
                throw new _ErrorFromName("WinJS.Binding.UnsupportedDataType", _Resources._formatString(strings.unsupportedDataTypeForBinding));
            }
            else {
                return;
            }
        }

        return _Base.Class.mix(
            function (init) {
                /// <signature helpKeyword="WinJS.Binding.define.return">
                /// <summary locid="WinJS.Binding.define.return">
                /// Creates a new observable object.
                /// </summary>
                /// <param name="init" type="Object" locid="WinJS.Binding.define.return_p:init">
                /// The initial values for the properties.
                /// </param>
                /// </signature>

                this._initObservable(init || Object.create(data));
            },
            dynamicObservableMixin,
            expandProperties(data)
        );
    };

    var as = function (data) {
        /// <signature helpKeyword="WinJS.Binding.as">
        /// <summary locid="WinJS.Binding.as">
        /// Returns an observable object. This may be an observable proxy for the specified object, an existing proxy, or
        /// the specified object itself if it directly supports observability.
        /// </summary>
        /// <param name="data" type="Object" locid="WinJS.Binding.as_p:data">
        /// Object to provide observability for.
        /// </param>
        /// <returns type="Object" locid="WinJS.Binding.as_returnValue">
        /// The observable object.
        /// </returns>
        /// </signature>

        if (!data) {
            return data;
        }

        var type = typeof data;
        if (type === "object"
            && !(data instanceof Date)
            && !(Array.isArray(data))) {
                if (data._getObservable) {
                    return data._getObservable();
                }

                var observable = new ObservableProxy(data);
                observable.backingData = data;
                Object.defineProperty(
                data,
                "_getObservable",
                {
                    value: function () { return observable; },
                    enumerable: false,
                    writable: false
                }
            );
                return observable;
            }
        else {
            return data;
        }
    };

    var unwrap = function (data) {
        /// <signature helpKeyword="WinJS.Binding.unwrap">
        /// <summary locid="WinJS.Binding.unwrap">
        /// Returns the original (non-observable) object is returned if the specified object is an observable proxy, .
        /// </summary>
        /// <param name="data" type="Object" locid="WinJS.Binding.unwrap_p:data">
        /// The object for which to retrieve the original value.
        /// </param>
        /// <returns type="Object" locid="WinJS.Binding.unwrap_returnValue">
        /// If the specified object is an observable proxy, the original object is returned, otherwise the same object is returned.
        /// </returns>
        /// </signature>
        if (data && data.backingData) {
            return data.backingData;
        }
        else {
            return data;
        }
    };

    _Base.Namespace._moduleDefine(exports, "WinJS.Binding", {
        // must use long form because mixin has "get" and "set" as members, so the define
        // method thinks it's a property
        mixin: { value: dynamicObservableMixin, enumerable: false, writable: true, configurable: true },
        dynamicObservableMixin: { value: dynamicObservableMixin, enumerable: true, writable: true, configurable: true },
        observableMixin: { value: observableMixin, enumerable: true, writable: true, configurable: true },
        expandProperties: expandProperties,
        define: define,
        as: as,
        unwrap: unwrap,
        bind: bind
    });
});

// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Binding/_Declarative',[
    'exports',
    '../Core/_Global',
    '../Core/_WinRT',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_ErrorFromName',
    '../Core/_Log',
    '../Core/_Resources',
    '../Core/_WriteProfilerMark',
    '../Promise',
    '../Utilities/_ElementUtilities',
    './_BindingParser',
    './_Data',
    './_DomWeakRefTable'
    ], function declarativeInit(exports, _Global, _WinRT, _Base, _BaseUtils, _ErrorFromName, _Log, _Resources, _WriteProfilerMark, Promise, _ElementUtilities, _BindingParser, _Data, _DomWeakRefTable) {
    "use strict";

    var uid = (Math.random() * 1000) >> 0;

    // If we have proper weak references then we can move away from using the element's ID property
    //
    var optimizeBindingReferences = _WinRT.msSetWeakWinRTProperty && _WinRT.msGetWeakWinRTProperty;

    var strings = {
        get attributeBindingSingleProperty() { return _Resources._getWinJSString("base/attributeBindingSingleProperty").value; },
        get cannotBindToThis() { return _Resources._getWinJSString("base/cannotBindToThis").value; },
        get creatingNewProperty() { return _Resources._getWinJSString("base/creatingNewProperty").value; },
        get duplicateBindingDetected() { return _Resources._getWinJSString("base/duplicateBindingDetected").value; },
        get elementNotFound() { return _Resources._getWinJSString("base/elementNotFound").value; },
        get errorInitializingBindings() { return _Resources._getWinJSString("base/errorInitializingBindings").value; },
        get propertyDoesNotExist() { return _Resources._getWinJSString("base/propertyDoesNotExist").value; },
        get idBindingNotSupported() { return _Resources._getWinJSString("base/idBindingNotSupported").value; },
        get nestedDOMElementBindingNotSupported() { return _Resources._getWinJSString("base/nestedDOMElementBindingNotSupported").value; }
    };

    var markSupportedForProcessing = _BaseUtils.markSupportedForProcessing;
    var requireSupportedForProcessing = _BaseUtils.requireSupportedForProcessing;

    function registerAutoDispose(bindable, callback) {
        var d = bindable._autoDispose;
        d && d.push(callback);
    }
    function autoDispose(bindable) {
        bindable._autoDispose = (bindable._autoDispose || []).filter(function (callback) { return callback(); });
    }

    function checkBindingToken(element, bindingId) {
        if (element) {
            if (element.winBindingToken === bindingId) {
                return element;
            }
            else {
                _Log.log && _Log.log(_Resources._formatString(strings.duplicateBindingDetected, element.id), "winjs binding", "error");
            }
        }
        else {
            return element;
        }
    }

    function setBindingToken(element) {
        if (element.winBindingToken) {
            return element.winBindingToken;
        }

        var bindingToken = "_win_bind" + (uid++);
        Object.defineProperty(element, "winBindingToken", { configurable: false, writable: false, enumerable: false, value: bindingToken });
        return bindingToken;
    }

    function initializerOneBinding(bind, ref, bindingId, source, e, pend, cacheEntry) {
        var initializer = bind.initializer;
        if (initializer) {
            initializer = initializer.winControl || initializer["data-win-control"] || initializer;
        }
        if (initializer instanceof Function) {
            var result = initializer(source, bind.source, e, bind.destination);

            if (cacheEntry) {
                if (result && result.cancel) {
                    cacheEntry.bindings.push(function () { result.cancel(); });
                }
                else {
                    // notify the cache that we encountered an uncancellable thing
                    //
                    cacheEntry.nocache = true;
                }
            }
            return result;
        }
        else if (initializer && initializer.render) {
            pend.count++;

            // notify the cache that we encountered an uncancellable thing
            //
            if (cacheEntry) {
                cacheEntry.nocache = true;
            }

            requireSupportedForProcessing(initializer.render).call(initializer, getValue(source, bind.source), e).
                then(function () {
                    pend.checkComplete();
                });
        }
    }

    function makeBinding(ref, bindingId, pend, bindable, bind, cacheEntry) {
        var first = true;
        var bindResult;
        var canceled = false;

        autoDispose(bindable);

        var resolveWeakRef = function () {
            if (canceled) { return; }

            var found = checkBindingToken(_DomWeakRefTable._getWeakRefElement(ref), bindingId);
            if (!found) {
                _Log.log && _Log.log(_Resources._formatString(strings.elementNotFound, ref), "winjs binding", "info");
                if (bindResult) {
                    bindResult.cancel();
                }
            }
            return found;
        };
        var bindingAction = function (v) {
            var found = resolveWeakRef();
            if (found) {
                nestedSet(found, bind.destination, v);
            }
            if (first) {
                pend.checkComplete();
                first = false;
            }
        };
        registerAutoDispose(bindable, resolveWeakRef);

        bindResult = bindWorker(bindable, bind.source, bindingAction);
        if (bindResult) {
            var cancel = bindResult.cancel;
            bindResult.cancel = function () {
                canceled = true;
                return cancel.call(bindResult);
            };
            if (cacheEntry) {
                cacheEntry.bindings.push(function () { bindResult.cancel(); });
            }
        }

        return bindResult;
    }

    function sourceOneBinding(bind, ref, bindingId, source, e, pend, cacheEntry) {
        var bindable;
        if (source !== _Global) {
            source = _Data.as(source);
        }
        if (source._getObservable) {
            bindable = source._getObservable();
        }
        if (bindable) {
            pend.count++;
            // declarative binding must use a weak ref to the target element
            //
            return makeBinding(ref, bindingId, pend, bindable, bind, cacheEntry);
        }
        else {
            nestedSet(e, bind.destination, getValue(source, bind.source));
        }
    }

    function filterIdBinding(declBind, bindingStr) {
        for (var bindIndex = declBind.length - 1; bindIndex >= 0; bindIndex--) {
            var bind = declBind[bindIndex];
            var dest = bind.destination;
            if (dest.length === 1 && dest[0] === "id") {
                if (_BaseUtils.validation) {
                    throw new _ErrorFromName("WinJS.Binding.IdBindingNotSupported", _Resources._formatString(strings.idBindingNotSupported, bindingStr));
                }
                _Log.log && _Log.log(_Resources._formatString(strings.idBindingNotSupported, bindingStr), "winjs binding", "error");
                declBind.splice(bindIndex, 1);
            }
        }
        return declBind;
    }

    function calcBinding(bindingStr, bindingCache) {
        if (bindingCache) {
            var declBindCache = bindingCache.expressions[bindingStr];
            var declBind;
            if (!declBindCache) {
                declBind = filterIdBinding(_BindingParser._bindingParser(bindingStr, _Global), bindingStr);
                bindingCache.expressions[bindingStr] = declBind;
            }
            if (!declBind) {
                declBind = declBindCache;
            }
            return declBind;
        }
        else {
            return filterIdBinding(_BindingParser._bindingParser(bindingStr, _Global), bindingStr);
        }
    }

    function declarativeBindImpl(rootElement, dataContext, skipRoot, bindingCache, defaultInitializer, c) {
        _WriteProfilerMark("WinJS.Binding:processAll,StartTM");

        var pend = {
            count: 0,
            checkComplete: function checkComplete() {
                this.count--;
                if (this.count === 0) {
                    _WriteProfilerMark("WinJS.Binding:processAll,StopTM");
                    c();
                }
            }
        };
        var baseElement = (rootElement || _Global.document.body);
        var selector = "[data-win-bind],[data-win-control]";
        var elements = baseElement.querySelectorAll(selector);
        var neg;
        if (!skipRoot && baseElement.getAttribute("data-win-bind")) {
            neg = baseElement;
        }

        pend.count++;
        var source = dataContext || _Global;

        _DomWeakRefTable._DOMWeakRefTable_fastLoadPath = true;
        try {
            var baseElementData = _ElementUtilities.data(baseElement);
            baseElementData.winBindings = baseElementData.winBindings || [];

            for (var i = (neg ? -1 : 0), l = elements.length; i < l; i++) {
                var element = i < 0 ? neg : elements[i];

                // If we run into a declarative control container (e.g. Binding.Template) we don't process its
                //  children, but we do give it an opportunity to process them later using this data context.
                //
                if (element.winControl && element.winControl.constructor && element.winControl.constructor.isDeclarativeControlContainer) {
                    i += element.querySelectorAll(selector).length;

                    var idcc = element.winControl.constructor.isDeclarativeControlContainer;
                    if (typeof idcc === "function") {
                        idcc = requireSupportedForProcessing(idcc);
                        idcc(element.winControl, function (element) {
                            return declarativeBind(element, dataContext, false, bindingCache, defaultInitializer);
                        });
                    }
                }

                // In order to catch controls above we may have elements which don't have bindings, skip them
                //
                if (!element.hasAttribute("data-win-bind")) {
                    continue;
                }

                var original = element.getAttribute("data-win-bind");
                var declBind = calcBinding(original, bindingCache);

                if (!declBind.implemented) {
                    for (var bindIndex = 0, bindLen = declBind.length; bindIndex < bindLen; bindIndex++) {
                        var bind = declBind[bindIndex];
                        bind.initializer = bind.initializer || defaultInitializer;
                        if (bind.initializer) {
                            bind.implementation = initializerOneBinding;
                        }
                        else {
                            bind.implementation = sourceOneBinding;
                        }
                    }
                    declBind.implemented = true;
                }

                pend.count++;

                var bindingId = setBindingToken(element);
                var ref = optimizeBindingReferences ? bindingId : element.id;

                if (!ref) {
                    // We use our own counter here, as the IE "uniqueId" is only
                    // global to a document, which means that binding against
                    // unparented DOM elements would get duplicate IDs.
                    //
                    // The elements may not be parented at this point, but they
                    // will be parented by the time the binding action is fired.
                    //
                    element.id = ref = bindingId;
                }

                _DomWeakRefTable._createWeakRef(element, ref);
                var elementData = _ElementUtilities.data(element);
                elementData.winBindings = null;
                var cacheEntry;
                if (bindingCache && bindingCache.elements) {
                    cacheEntry = bindingCache.elements[ref];
                    if (!cacheEntry) {
                        bindingCache.elements[ref] = cacheEntry = { bindings: [] };
                    }
                }

                for (var bindIndex2 = 0, bindLen2 = declBind.length; bindIndex2 < bindLen2; bindIndex2++) {
                    var bind2 = declBind[bindIndex2];
                    var cancel2 = bind2.implementation(bind2, ref, bindingId, source, element, pend, cacheEntry);
                    if (cancel2) {
                        elementData.winBindings = elementData.winBindings || [];
                        elementData.winBindings.push(cancel2);
                        baseElementData.winBindings.push(cancel2);
                    }
                }
                pend.count--;
            }
        }
        finally {
            _DomWeakRefTable._DOMWeakRefTable_fastLoadPath = false;
        }
        pend.checkComplete();
    }

    function declarativeBind(rootElement, dataContext, skipRoot, bindingCache, defaultInitializer) {
        /// <signature helpKeyword="WinJS.Binding.declarativeBind">
        /// <summary locid="WinJS.Binding.declarativeBind">
        /// Binds values from the specified data context to elements that are descendants of the specified root element
        /// and have declarative binding attributes (data-win-bind).
        /// </summary>
        /// <param name="rootElement" type="DOMElement" optional="true" locid="WinJS.Binding.declarativeBind_p:rootElement">
        /// The element at which to start traversing to find elements to bind to. If this parameter is omitted, the entire document
        /// is searched.
        /// </param>
        /// <param name="dataContext" type="Object" optional="true" locid="WinJS.Binding.declarativeBind_p:dataContext">
        /// The object to use for default data binding.
        /// </param>
        /// <param name="skipRoot" type="Boolean" optional="true" locid="WinJS.Binding.declarativeBind_p:skipRoot">
        /// If true, the elements to be bound skip the specified root element and include only the children.
        /// </param>
        /// <param name="bindingCache" optional="true" locid="WinJS.Binding.declarativeBind_p:bindingCache">
        /// The cached binding data.
        /// </param>
        /// <param name="defaultInitializer" optional="true" locid="WinJS.Binding.declarativeBind_p:defaultInitializer">
        /// The binding initializer to use in the case that one is not specified in a binding expression. If not
        /// provided the behavior is the same as WinJS.Binding.defaultBind.
        /// </param>
        /// <returns type="WinJS.Promise" locid="WinJS.Binding.declarativeBind_returnValue">
        /// A promise that completes when each item that contains binding declarations has
        /// been processed and the update has started.
        /// </returns>
        /// </signature>

        return new Promise(function (c, e, p) {
            declarativeBindImpl(rootElement, dataContext, skipRoot, bindingCache, defaultInitializer, c, e, p);
        }).then(null, function (e) {
            _Log.log && _Log.log(_Resources._formatString(strings.errorInitializingBindings, e && e.message), "winjs binding", "error");
            return Promise.wrapError(e);
        });
    }

    function converter(convert) {
        /// <signature helpKeyword="WinJS.Binding.converter">
        /// <summary locid="WinJS.Binding.converter">
        /// Creates a default binding initializer for binding between a source
        /// property and a destination property with a provided converter function
        /// that is executed on the value of the source property.
        /// </summary>
        /// <param name="convert" type="Function" locid="WinJS.Binding.converter_p:convert">
        /// The conversion that operates over the result of the source property
        /// to produce a value that is set to the destination property.
        /// </param>
        /// <returns type="Function" locid="WinJS.Binding.converter_returnValue">
        /// The binding initializer.
        /// </returns>
        /// </signature>
        var userConverter = function (source, sourceProperties, dest, destProperties, initialValue) {
            var bindingId = setBindingToken(dest);
            var ref = optimizeBindingReferences ? bindingId : dest.id;

            if (!ref) {
                dest.id = ref = bindingId;
            }

            _DomWeakRefTable._createWeakRef(dest, ref);

            var bindable;
            if (source !== _Global) {
                source = _Data.as(source);
            }
            if (source._getObservable) {
                bindable = source._getObservable();
            }
            if (bindable) {
                var counter = 0;
                var workerResult = bindWorker(_Data.as(source), sourceProperties, function (v) {
                    if (++counter === 1) {
                        if (v === initialValue) {
                            return;
                        }
                    }
                    var found = checkBindingToken(_DomWeakRefTable._getWeakRefElement(ref), bindingId);
                    if (found) {
                        nestedSet(found, destProperties, convert(requireSupportedForProcessing(v)));
                    }
                    else if (workerResult) {
                        _Log.log && _Log.log(_Resources._formatString(strings.elementNotFound, ref), "winjs binding", "info");
                        workerResult.cancel();
                    }
                });
                return workerResult;
            } else {
                var value = getValue(source, sourceProperties);
                if (value !== initialValue) {
                    nestedSet(dest, destProperties, convert(value));
                }
            }
        };
        return markSupportedForProcessing(userConverter);
    }

    function getValue(obj, path) {
        if (obj !== _Global) {
            obj = requireSupportedForProcessing(obj);
        }
        if (path) {
            for (var i = 0, len = path.length; i < len && (obj !== null && obj !== undefined) ; i++) {
                obj = requireSupportedForProcessing(obj[path[i]]);
            }
        }
        return obj;
    }

    function nestedSet(dest, destProperties, v) {
        requireSupportedForProcessing(v);
        dest = requireSupportedForProcessing(dest);
        for (var i = 0, len = (destProperties.length - 1) ; i < len; i++) {
            dest = requireSupportedForProcessing(dest[destProperties[i]]);
            if (!dest) {
                _Log.log && _Log.log(_Resources._formatString(strings.propertyDoesNotExist, destProperties[i], destProperties.join(".")), "winjs binding", "error");
                return;
            }
            else if (dest instanceof _Global.Node) {
                _Log.log && _Log.log(_Resources._formatString(strings.nestedDOMElementBindingNotSupported, destProperties[i], destProperties.join(".")), "winjs binding", "error");
                return;
            }
        }
        if (destProperties.length === 0) {
            _Log.log && _Log.log(strings.cannotBindToThis, "winjs binding", "error");
            return;
        }
        var prop = destProperties[destProperties.length - 1];
        if (_Log.log) {
            if (dest[prop] === undefined) {
                _Log.log(_Resources._formatString(strings.creatingNewProperty, prop, destProperties.join(".")), "winjs binding", "warn");
            }
        }
        dest[prop] = v;
    }

    function attributeSet(dest, destProperties, v) {
        dest = requireSupportedForProcessing(dest);
        if (!destProperties || destProperties.length !== 1 || !destProperties[0]) {
            _Log.log && _Log.log(strings.attributeBindingSingleProperty, "winjs binding", "error");
            return;
        }
        dest.setAttribute(destProperties[0], v);
    }

    function setAttribute(source, sourceProperties, dest, destProperties, initialValue) {
        /// <signature helpKeyword="WinJS.Binding.setAttribute">
        /// <summary locid="WinJS.Binding.setAttribute">
        /// Creates a one-way binding between the source object and
        /// an attribute on the destination element.
        /// </summary>
        /// <param name="source" type="Object" locid="WinJS.Binding.setAttribute_p:source">
        /// The source object.
        /// </param>
        /// <param name="sourceProperties" type="Array" locid="WinJS.Binding.setAttribute_p:sourceProperties">
        /// The path on the source object to the source property.
        /// </param>
        /// <param name="dest" type="Object" locid="WinJS.Binding.setAttribute_p:dest">
        /// The destination object (must be a DOM element).
        /// </param>
        /// <param name="destProperties" type="Array" locid="WinJS.Binding.setAttribute_p:destProperties">
        /// The path on the destination object to the destination property, this must be a single name.
        /// </param>
        /// <param name="initialValue" optional="true" locid="WinJS.Binding.setAttribute_p:initialValue">
        /// The known initial value of the target, if the source value is the same as this initial
        /// value (using ===) then the target is not set the first time.
        /// </param>
        /// <returns type="{ cancel: Function }" locid="WinJS.Binding.setAttribute_returnValue">
        /// An object with a cancel method that is used to coalesce bindings.
        /// </returns>
        /// </signature>

        var bindingId = setBindingToken(dest);
        var ref = optimizeBindingReferences ? bindingId : dest.id;

        if (!ref) {
            dest.id = ref = bindingId;
        }

        _DomWeakRefTable._createWeakRef(dest, ref);

        var bindable;
        if (source !== _Global) {
            source = _Data.as(source);
        }
        if (source._getObservable) {
            bindable = source._getObservable();
        }
        if (bindable) {
            var counter = 0;
            var workerResult = bindWorker(bindable, sourceProperties, function (v) {
                if (++counter === 1) {
                    if (v === initialValue) {
                        return;
                    }
                }
                var found = checkBindingToken(_DomWeakRefTable._getWeakRefElement(ref), bindingId);
                if (found) {
                    attributeSet(found, destProperties, requireSupportedForProcessing(v));
                }
                else if (workerResult) {
                    _Log.log && _Log.log(_Resources._formatString(strings.elementNotFound, ref), "winjs binding", "info");
                    workerResult.cancel();
                }
            });
            return workerResult;
        } else {
            var value = getValue(source, sourceProperties);
            if (value !== initialValue) {
                attributeSet(dest, destProperties, value);
            }
        }
    }
    function setAttributeOneTime(source, sourceProperties, dest, destProperties) {
        /// <signature helpKeyword="WinJS.Binding.setAttributeOneTime">
        /// <summary locid="WinJS.Binding.setAttributeOneTime">
        /// Sets an attribute on the destination element to the value of the source property
        /// </summary>
        /// <param name="source" type="Object" locid="WinJS.Binding.setAttributeOneTime_p:source">
        /// The source object.
        /// </param>
        /// <param name="sourceProperties" type="Array" locid="WinJS.Binding.setAttributeOneTime_p:sourceProperties">
        /// The path on the source object to the source property.
        /// </param>
        /// <param name="dest" type="Object" locid="WinJS.Binding.setAttributeOneTime_p:dest">
        /// The destination object (must be a DOM element).
        /// </param>
        /// <param name="destProperties" type="Array" locid="WinJS.Binding.setAttributeOneTime_p:destProperties">
        /// The path on the destination object to the destination property, this must be a single name.
        /// </param>
        /// </signature>
        return attributeSet(dest, destProperties, getValue(source, sourceProperties));
    }

    function addClassOneTime(source, sourceProperties, dest) {
        /// <signature helpKeyword="WinJS.Binding.addClassOneTime">
        /// <summary locid="WinJS.Binding.addClassOneTime">
        /// Adds a class or Array list of classes on the destination element to the value of the source property
        /// </summary>
        /// <param name="source" type="Object" locid="WinJS.Binding.addClassOneTime:source">
        /// The source object.
        /// </param>
        /// <param name="sourceProperties" type="Array" locid="WinJS.Binding.addClassOneTime:sourceProperties">
        /// The path on the source object to the source property.
        /// </param>
        /// <param name="dest" type="Object" locid="WinJS.Binding.addClassOneTime:dest">
        /// The destination object (must be a DOM element).
        /// </param>
        /// </signature>
        dest = requireSupportedForProcessing(dest);
        var value = getValue(source, sourceProperties);
        if (Array.isArray(value)) {
            value.forEach(function(className) {
                _ElementUtilities.addClass(dest, className);
            });
        } else if (value) {
            _ElementUtilities.addClass(dest, value);
        }
    }

    var defaultBindImpl = converter(function defaultBind_passthrough(v) { return v; });

    function defaultBind(source, sourceProperties, dest, destProperties, initialValue) {
        /// <signature helpKeyword="WinJS.Binding.defaultBind">
        /// <summary locid="WinJS.Binding.defaultBind">
        /// Creates a one-way binding between the source object and
        /// the destination object.
        /// </summary>
        /// <param name="source" type="Object" locid="WinJS.Binding.defaultBind_p:source">
        /// The source object.
        /// </param>
        /// <param name="sourceProperties" type="Array" locid="WinJS.Binding.defaultBind_p:sourceProperties">
        /// The path on the source object to the source property.
        /// </param>
        /// <param name="dest" type="Object" locid="WinJS.Binding.defaultBind_p:dest">
        /// The destination object.
        /// </param>
        /// <param name="destProperties" type="Array" locid="WinJS.Binding.defaultBind_p:destProperties">
        /// The path on the destination object to the destination property.
        /// </param>
        /// <param name="initialValue" optional="true" locid="WinJS.Binding.defaultBind_p:initialValue">
        /// The known initial value of the target, if the source value is the same as this initial
        /// value (using ===) then the target is not set the first time.
        /// </param>
        /// <returns type="{ cancel: Function }" locid="WinJS.Binding.defaultBind_returnValue">
        /// An object with a cancel method that is used to coalesce bindings.
        /// </returns>
        /// </signature>

        return defaultBindImpl(source, sourceProperties, dest, destProperties, initialValue);
    }
    function bindWorker(bindable, sourceProperties, func) {
        if (sourceProperties.length > 1) {
            var root = {};
            var current = root;
            for (var i = 0, l = sourceProperties.length - 1; i < l; i++) {
                current = current[sourceProperties[i]] = {};
            }
            current[sourceProperties[sourceProperties.length - 1]] = func;

            return _Data.bind(bindable, root, true);
        }
        else if (sourceProperties.length === 1) {
            bindable.bind(sourceProperties[0], func, true);
            return {
                cancel: function () {
                    bindable.unbind(sourceProperties[0], func);
                    this.cancel = noop;
                }
            };
        }
        else {
            // can't bind to object, so we just push it through
            //
            func(bindable);
        }
    }
    function noop() { }
    function oneTime(source, sourceProperties, dest, destProperties) {
        /// <signature helpKeyword="WinJS.Binding.oneTime">
        /// <summary locid="WinJS.Binding.oneTime">
        /// Sets the destination property to the value of the source property.
        /// </summary>
        /// <param name="source" type="Object" locid="WinJS.Binding.oneTime_p:source">
        /// The source object.
        /// </param>
        /// <param name="sourceProperties" type="Array" locid="WinJS.Binding.oneTime_p:sourceProperties">
        /// The path on the source object to the source property.
        /// </param>
        /// <param name="dest" type="Object" locid="WinJS.Binding.oneTime_p:dest">
        /// The destination object.
        /// </param>
        /// <param name="destProperties" type="Array" locid="WinJS.Binding.oneTime_p:destProperties">
        /// The path on the destination object to the destination property.
        /// </param>
        /// <returns type="{ cancel: Function }" locid="WinJS.Binding.oneTime_returnValue">
        /// An object with a cancel method that is used to coalesce bindings.
        /// </returns>
        /// </signature>
        nestedSet(dest, destProperties, getValue(source, sourceProperties));
        return { cancel: noop };
    }

    function initializer(customInitializer) {
        /// <signature helpKeyword="WinJS.Binding.initializer">
        /// <summary locid="WinJS.Binding.initializer">
        /// Marks a custom initializer function as being compatible with declarative data binding.
        /// </summary>
        /// <param name="customInitializer" type="Function" locid="WinJS.Binding.initializer_p:customInitializer">
        /// The custom initializer to be marked as compatible with declarative data binding.
        /// </param>
        /// <returns type="Function" locid="WinJS.Binding.initializer_returnValue">
        /// The input customInitializer.
        /// </returns>
        /// </signature>
        return markSupportedForProcessing(customInitializer);
    }

    _Base.Namespace._moduleDefine(exports, "WinJS.Binding", {
        processAll: declarativeBind,
        oneTime: initializer(oneTime),
        defaultBind: initializer(defaultBind),
        converter: converter,
        initializer: initializer,
        getValue: getValue,
        setAttribute: initializer(setAttribute),
        setAttributeOneTime: initializer(setAttributeOneTime),
        addClassOneTime: initializer(addClassOneTime),
    });

});

define('WinJS/Binding',[
    './Binding/_BindingParser',
    './Binding/_Data',
    './Binding/_Declarative',
    './Binding/_DomWeakRefTable'], function() {
    //Wrapper module
});
