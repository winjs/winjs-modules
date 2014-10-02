// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Controls/ListView/_SelectionManager',[
    'exports',
    '../../Core/_Global',
    '../../Core/_Base',
    '../../Promise',
    '../../_Signal',
    '../../Utilities/_UI',
    '../ItemContainer/_Constants'
    ], function selectionManagerInit(exports, _Global, _Base, Promise, _Signal, _UI, _Constants) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        _ItemSet: _Base.Namespace._lazy(function () {
            var _ItemSet = _Base.Class.define(function _ItemSet_ctor(listView, ranges, count) {
                this._listView = listView;
                this._ranges = ranges;
                this._itemsCount = count;
            });
            _ItemSet.prototype = {
                getRanges: function () {
                    var ranges = [];
                    for (var i = 0, len = this._ranges.length; i < len; i++) {
                        var range = this._ranges[i];
                        ranges.push({
                            firstIndex: range.firstIndex,
                            lastIndex: range.lastIndex,
                            firstKey: range.firstKey,
                            lastKey: range.lastKey
                        });
                    }
                    return ranges;
                },

                getItems: function () {
                    return exports.getItemsFromRanges(this._listView._itemsManager.dataSource, this._ranges);
                },

                isEverything: function () {
                    return this.count() === this._itemsCount;
                },

                count: function () {
                    var count = 0;
                    for (var i = 0, len = this._ranges.length; i < len; i++) {
                        var range = this._ranges[i];
                        count += range.lastIndex - range.firstIndex + 1;
                    }
                    return count;
                },

                getIndices: function () {
                    var indices = [];
                    for (var i = 0, len = this._ranges.length; i < len; i++) {
                        var range = this._ranges[i];
                        for (var n = range.firstIndex; n <= range.lastIndex; n++) {
                            indices.push(n);
                        }
                    }
                    return indices;
                }
            };
            return _ItemSet;
        }),

        getItemsFromRanges: function (dataSource, ranges) {
            var listBinding = dataSource.createListBinding(),
                promises = [];

            function getIndices() {
                var indices = [];
                for (var i = 0, len = ranges.length; i < len; i++) {
                    var range = ranges[i];
                    for (var j = range.firstIndex; j <= range.lastIndex; j++) {
                        indices.push(j);
                    }
                }
                return Promise.wrap(indices);
            }

            return getIndices().then(function (indices) {
                for (var i = 0; i < indices.length; i++) {
                    promises.push(listBinding.fromIndex(indices[i]));
                }

                return Promise.join(promises).then(function (items) {
                    listBinding.release();
                    return items;
                });
            });
        },

        _Selection: _Base.Namespace._lazy(function () {
            function isEverythingRange(ranges) {
                return ranges && ranges.firstIndex === 0 && ranges.lastIndex === Number.MAX_VALUE;
            }

            return _Base.Class.derive(exports._ItemSet, function (listView, indexesAndRanges) {
                this._listView = listView;
                this._itemsCount = -1;
                this._ranges = [];
                if (indexesAndRanges) {
                    this.set(indexesAndRanges);
                }
            }, {
                clear: function () {
                    /// <signature helpKeyword="WinJS.UI._Selection.prototype.clear">
                    /// <summary locid="WinJS.UI._Selection.prototype.clear">
                    /// Clears the selection.
                    /// </summary>
                    /// <returns type="Promise" locid="WinJS.UI._Selection.prototype.clear_returnValue">
                    /// A Promise that is fulfilled when the clear operation completes.
                    /// </returns>
                    /// </signature>

                    this._releaseRanges(this._ranges);
                    this._ranges = [];
                    return Promise.wrap();
                },

                set: function (items) {
                    /// <signature helpKeyword="WinJS.UI._Selection.prototype.set">
                    /// <summary locid="WinJS.UI._Selection.prototype.set">
                    /// Clears the current selection and replaces it with the specified items.
                    /// </summary>
                    /// <param name="items" locid="WinJS.UI._Selection.prototype.set_items">
                    /// The indexes or keys of the items that make up the selection.
                    /// You can provide different types of objects for the items parameter:
                    /// you can specify an index, a key, or a range of indexes.
                    /// It can also be an array that contains one or more of these objects.
                    /// </param>
                    /// <returns type="Promise" locid="WinJS.UI._Selection.prototype.set_returnValue">
                    /// A Promise that is fulfilled when the operation completes.
                    /// </returns>
                    /// </signature>

                    // A range with lastIndex set to Number.MAX_VALUE used to mean selectAll. Passing such range to set was equivalent to selectAll. This code preserves this behavior.
                    if (!isEverythingRange(items)) {
                        this._releaseRanges(this._ranges);
                        this._ranges = [];

                        var that = this;
                        return this._execute("_set", items).then(function () {
                            that._ranges.sort(function (left, right) {
                                return left.firstIndex - right.firstIndex;
                            });
                            return that._ensureKeys();
                        }).then(function () {
                            return that._ensureCount();
                        });
                    } else {
                        return this.selectAll();
                    }
                },

                add: function (items) {
                    /// <signature helpKeyword="WinJS.UI._Selection.prototype.add">
                    /// <summary locid="WinJS.UI._Selection.prototype.add">
                    /// Adds one or more items to the selection.
                    /// </summary>
                    /// <param name="items" locid="WinJS.UI._Selection.prototype.add_items">
                    /// The indexes or keys of the items to add.
                    /// You can provide different types of objects for the items parameter:
                    /// you can specify an index, a key, or a range of indexes.
                    /// It can also be an array that contains one or more of these objects.
                    /// </param>
                    /// <returns type="Promise" locid="WinJS.UI._Selection.prototype.add_returnValue">
                    /// A Promise that is fulfilled when the operation completes.
                    /// </returns>
                    /// </signature>

                    if (!isEverythingRange(items)) {
                        var that = this;
                        return this._execute("_add", items).then(function () {
                            return that._ensureKeys();
                        }).then(function () {
                            return that._ensureCount();
                        });
                    } else {
                        return this.selectAll();
                    }
                },

                remove: function (items) {
                    /// <signature helpKeyword="WinJS.UI._Selection.prototype.remove">
                    /// <summary locid="WinJS.UI._Selection.prototype.remove">
                    /// Removes the specified items from the selection.
                    /// </summary>
                    /// <param name="items" locid="WinJS.UI._Selection.prototype.remove_items">
                    /// The indexes or keys of the items to remove. You can provide different types of objects for the items parameter:
                    /// you can specify an index, a key, or a range of indexes.
                    /// It can also be an array that contains one or more of these objects.
                    /// </param>
                    /// <returns type="Promise" locid="WinJS.UI._Selection.prototype.remove_returnValue">
                    /// A Promise that is fulfilled when the operation completes.
                    /// </returns>
                    /// </signature>

                    var that = this;
                    return this._execute("_remove", items).then(function () {
                        return that._ensureKeys();
                    });
                },

                selectAll: function () {
                    /// <signature helpKeyword="WinJS.UI._Selection.prototype.selectAll">
                    /// <summary locid="WinJS.UI._Selection.prototype.selectAll">
                    /// Adds all the items in the ListView to the selection.
                    /// </summary>
                    /// <returns type="Promise" locid="WinJS.UI._Selection.prototype.selectAll_returnValue">
                    /// A Promise that is fulfilled when the operation completes.
                    /// </returns>
                    /// </signature>

                    var that = this;
                    return that._ensureCount().then(function () {
                        if (that._itemsCount) {
                            var range = {
                                firstIndex: 0,
                                lastIndex: that._itemsCount - 1,
                            };
                            that._retainRange(range);
                            that._releaseRanges(that._ranges);
                            that._ranges = [range];
                            return that._ensureKeys();
                        }
                    });
                },

                _execute: function (operation, items) {
                    var that = this,
                        keysSupported = !!that._getListBinding().fromKey,
                        array = Array.isArray(items) ? items : [items],
                        promises = [Promise.wrap()];

                    function toRange(type, first, last) {
                        var retVal = {};
                        retVal["first" + type] = first;
                        retVal["last" + type] = last;
                        return retVal;
                    }

                    function handleKeys(range) {
                        var binding = that._getListBinding();

                        var promise = Promise.join([binding.fromKey(range.firstKey), binding.fromKey(range.lastKey)]).then(function (items) {
                            if (items[0] && items[1]) {
                                range.firstIndex = items[0].index;
                                range.lastIndex = items[1].index;
                                that[operation](range);
                            }
                            return range;
                        });
                        promises.push(promise);
                    }

                    for (var i = 0, len = array.length; i < len; i++) {
                        var item = array[i];
                        if (typeof item === "number") {
                            this[operation](toRange("Index", item, item));
                        } else if (item) {
                            if (keysSupported && item.key !== undefined) {
                                handleKeys(toRange("Key", item.key, item.key));
                            } else if (keysSupported && item.firstKey !== undefined && item.lastKey !== undefined) {
                                handleKeys(toRange("Key", item.firstKey, item.lastKey));
                            } else if (item.index !== undefined && typeof item.index === "number") {
                                this[operation](toRange("Index", item.index, item.index));
                            } else if (item.firstIndex !== undefined && item.lastIndex !== undefined &&
                                    typeof item.firstIndex === "number" && typeof item.lastIndex === "number") {
                                this[operation](toRange("Index", item.firstIndex, item.lastIndex));
                            }
                        }
                    }

                    return Promise.join(promises);
                },

                _set: function (range) {
                    this._retainRange(range);
                    this._ranges.push(range);
                },

                _add: function (newRange) {
                    var that = this,
                        prev = null,
                        range,
                        inserted;

                    var merge = function (left, right) {
                        if (right.lastIndex > left.lastIndex) {
                            left.lastIndex = right.lastIndex;
                            left.lastKey = right.lastKey;
                            if (left.lastPromise) {
                                left.lastPromise.release();
                            }
                            left.lastPromise = that._getListBinding().fromIndex(left.lastIndex).retain();
                        }
                    };
                    var mergeWithPrev;
                    for (var i = 0, len = this._ranges.length; i < len; i++) {
                        range = this._ranges[i];
                        if (newRange.firstIndex < range.firstIndex) {
                            mergeWithPrev = prev && newRange.firstIndex < (prev.lastIndex + 1);
                            if (mergeWithPrev) {
                                inserted = i - 1;
                                merge(prev, newRange);
                            } else {
                                this._insertRange(i, newRange);
                                inserted = i;
                            }
                            break;
                        } else if (newRange.firstIndex === range.firstIndex) {
                            merge(range, newRange);
                            inserted = i;
                            break;
                        }
                        prev = range;
                    }

                    if (inserted === undefined) {
                        var last = this._ranges.length ? this._ranges[this._ranges.length - 1] : null,
                            mergeWithLast = last && newRange.firstIndex < (last.lastIndex + 1);
                        if (mergeWithLast) {
                            merge(last, newRange);
                        } else {
                            this._retainRange(newRange);
                            this._ranges.push(newRange);
                        }
                    } else {
                        prev = null;
                        for (i = inserted + 1, len = this._ranges.length; i < len; i++) {
                            range = this._ranges[i];
                            if (newRange.lastIndex < range.firstIndex) {
                                mergeWithPrev = prev && prev.lastIndex > newRange.lastIndex;
                                if (mergeWithPrev) {
                                    merge(this._ranges[inserted], prev);
                                }
                                this._removeRanges(inserted + 1, i - inserted - 1);
                                break;
                            } else if (newRange.lastIndex === range.firstIndex) {
                                merge(this._ranges[inserted], range);
                                this._removeRanges(inserted + 1, i - inserted);
                                break;
                            }
                            prev = range;
                        }
                        if (i >= len) {
                            merge(this._ranges[inserted], this._ranges[len - 1]);
                            this._removeRanges(inserted + 1, len - inserted - 1);
                        }
                    }
                },

                _remove: function (toRemove) {
                    var that = this;

                    function retainPromise(index) {
                        return that._getListBinding().fromIndex(index).retain();
                    }

                    // This method is called when a range needs to be unselected.  It is inspecting every range in the current selection comparing
                    // it to the range which is being unselected and it is building an array of new selected ranges
                    var ranges = [];
                    for (var i = 0, len = this._ranges.length; i < len; i++) {
                        var range = this._ranges[i];
                        if (range.lastIndex < toRemove.firstIndex || range.firstIndex > toRemove.lastIndex) {
                            // No overlap with the unselected range
                            ranges.push(range);
                        } else if (range.firstIndex < toRemove.firstIndex && range.lastIndex >= toRemove.firstIndex && range.lastIndex <= toRemove.lastIndex) {
                            // The end of this range is being unselected
                            ranges.push({
                                firstIndex: range.firstIndex,
                                firstKey: range.firstKey,
                                firstPromise: range.firstPromise,
                                lastIndex: toRemove.firstIndex - 1,
                                lastPromise: retainPromise(toRemove.firstIndex - 1)
                            });
                            range.lastPromise.release();
                        } else if (range.lastIndex > toRemove.lastIndex && range.firstIndex >= toRemove.firstIndex && range.firstIndex <= toRemove.lastIndex) {
                            // The beginning of this range is being unselected
                            ranges.push({
                                firstIndex: toRemove.lastIndex + 1,
                                firstPromise: retainPromise(toRemove.lastIndex + 1),
                                lastIndex: range.lastIndex,
                                lastKey: range.lastKey,
                                lastPromise: range.lastPromise
                            });
                            range.firstPromise.release();
                        } else if (range.firstIndex < toRemove.firstIndex && range.lastIndex > toRemove.lastIndex) {
                            // The middle part of this range is being unselected
                            ranges.push({
                                firstIndex: range.firstIndex,
                                firstKey: range.firstKey,
                                firstPromise: range.firstPromise,
                                lastIndex: toRemove.firstIndex - 1,
                                lastPromise: retainPromise(toRemove.firstIndex - 1),
                            });
                            ranges.push({
                                firstIndex: toRemove.lastIndex + 1,
                                firstPromise: retainPromise(toRemove.lastIndex + 1),
                                lastIndex: range.lastIndex,
                                lastKey: range.lastKey,
                                lastPromise: range.lastPromise
                            });
                        } else {
                            // The whole range is being unselected
                            range.firstPromise.release();
                            range.lastPromise.release();
                        }
                    }
                    this._ranges = ranges;
                },

                _ensureKeys: function () {
                    var promises = [Promise.wrap()];
                    var that = this;

                    var ensureKey = function (which, range) {
                        var keyProperty = which + "Key";

                        if (!range[keyProperty]) {
                            var promise = range[which + "Promise"];
                            promise.then(function (item) {
                                if (item) {
                                    range[keyProperty] = item.key;
                                }
                            });
                            return promise;
                        } else {
                            return Promise.wrap();
                        }
                    };

                    for (var i = 0, len = this._ranges.length; i < len; i++) {
                        var range = this._ranges[i];
                        promises.push(ensureKey("first", range));
                        promises.push(ensureKey("last", range));
                    }

                    Promise.join(promises).then(function () {
                        that._ranges = that._ranges.filter(function (range) {
                            return range.firstKey && range.lastKey;
                        });
                    });
                    return Promise.join(promises);
                },

                _mergeRanges: function (target, source) {
                    target.lastIndex = source.lastIndex;
                    target.lastKey = source.lastKey;
                },

                _isIncluded: function (index) {
                    if (this.isEverything()) {
                        return true;
                    } else {
                        for (var i = 0, len = this._ranges.length; i < len; i++) {
                            var range = this._ranges[i];
                            if (range.firstIndex <= index && index <= range.lastIndex) {
                                return true;
                            }
                        }
                        return false;
                    }
                },

                _ensureCount: function () {
                    var that = this;
                    return this._listView._itemsCount().then(function (count) {
                        that._itemsCount = count;
                    });
                },

                _insertRange: function (index, newRange) {
                    this._retainRange(newRange);
                    this._ranges.splice(index, 0, newRange);
                },

                _removeRanges: function (index, howMany) {
                    for (var i = 0; i < howMany; i++) {
                        this._releaseRange(this._ranges[index + i]);
                    }
                    this._ranges.splice(index, howMany);
                },

                _retainRange: function (range) {
                    if (!range.firstPromise) {
                        range.firstPromise = this._getListBinding().fromIndex(range.firstIndex).retain();
                    }
                    if (!range.lastPromise) {
                        range.lastPromise = this._getListBinding().fromIndex(range.lastIndex).retain();
                    }
                },

                _retainRanges: function () {
                    for (var i = 0, len = this._ranges.length; i < len; i++) {
                        this._retainRange(this._ranges[i]);
                    }
                },

                _releaseRange: function (range) {
                    range.firstPromise.release();
                    range.lastPromise.release();
                },

                _releaseRanges: function (ranges) {
                    for (var i = 0, len = ranges.length; i < len; ++i) {
                        this._releaseRange(ranges[i]);
                    }
                },

                _getListBinding: function () {
                    return this._listView._itemsManager._listBinding;
                }
            }, {
                supportedForProcessing: false,
            });
        }),

        // This component is responsible for holding selection state
        _SelectionManager: _Base.Namespace._lazy(function () {
            var _SelectionManager = function (listView) {
                this._listView = listView;
                this._selected = new exports._Selection(this._listView);
                // Don't rename this member. Some apps reference it.
                this._pivot = _Constants._INVALID_INDEX;
                this._focused = { type: _UI.ObjectType.item, index: 0 };
                this._pendingChange = Promise.wrap();
            };
            _SelectionManager.prototype = {
                count: function () {
                    /// <signature helpKeyword="WinJS.UI._SelectionManager.prototype.count">
                    /// <summary locid="WinJS.UI._SelectionManager.prototype.count">
                    /// Returns the number of items in the selection.
                    /// </summary>
                    /// <returns type="Number" locid="WinJS.UI._SelectionManager.prototype.count_returnValue">
                    /// The number of items in the selection.
                    /// </returns>
                    /// </signature>
                    return this._selected.count();
                },

                getIndices: function () {
                    /// <signature helpKeyword="WinJS.UI._SelectionManager.prototype.getIndices">
                    /// <summary locid="WinJS.UI._SelectionManager.prototype.getIndices">
                    /// Returns a list of the indexes for the items in the selection.
                    /// </summary>
                    /// <returns type="Array" locid="WinJS.UI._SelectionManager.prototype.getIndices_returnValue">
                    /// The list of indexes for the items in the selection as an array of Number objects.
                    /// </returns>
                    /// </signature>
                    return this._selected.getIndices();
                },

                getItems: function () {
                    /// <signature helpKeyword="WinJS.UI._SelectionManager.prototype.getItems">
                    /// <summary locid="WinJS.UI._SelectionManager.prototype.getItems">
                    /// Returns an array that contains the items in the selection.
                    /// </summary>
                    /// <returns type="Promise" locid="WinJS.UI._SelectionManager.prototype.getItems_returnValue">
                    /// A Promise that contains an array of the requested IItem objects.
                    /// </returns>
                    /// </signature>

                    return this._selected.getItems();
                },

                getRanges: function () {
                    /// <signature helpKeyword="WinJS.UI._SelectionManager.prototype.getRanges">
                    /// <summary locid="WinJS.UI._SelectionManager.prototype.getRanges">
                    /// Gets an array of the index ranges for the selected items.
                    /// </summary>
                    /// <returns type="Array" locid="WinJS.UI._SelectionManager.prototype.getRanges_returnValue">
                    /// An array that contains an ISelectionRange object for each index range in the selection.
                    /// </returns>
                    /// </signature>
                    return this._selected.getRanges();
                },

                isEverything: function () {
                    /// <signature helpKeyword="WinJS.UI._SelectionManager.prototype.isEverything">
                    /// <summary locid="WinJS.UI._SelectionManager.prototype.isEverything">
                    /// Returns a value that indicates whether the selection contains every item in the data source.
                    /// </summary>
                    /// <returns type="Boolean" locid="WinJS.UI._SelectionManager.prototype.isEverything_returnValue">
                    /// true if the selection contains every item in the data source; otherwise, false.
                    /// </returns>
                    /// </signature>
                    return this._selected.isEverything();
                },

                set: function (items) {
                    /// <signature helpKeyword="WinJS.UI._SelectionManager.prototype.set">
                    /// <summary locid="WinJS.UI._SelectionManager.prototype.set">
                    /// Clears the current selection and replaces it with the specified items.
                    /// </summary>
                    /// <param name="items" locid="WinJS.UI._SelectionManager.prototype.set_items">
                    /// The indexes or keys of the items that make up the selection.
                    /// You can provide different types of objects for the items parameter:
                    /// you can specify an index, a key, or a range of indexes.
                    /// It can also be an array that contains one or more of these objects.
                    /// </param>
                    /// <returns type="Promise" locid="WinJS.UI._SelectionManager.prototype.set_returnValue">
                    /// A Promise that is fulfilled when the operation completes.
                    /// </returns>
                    /// </signature>
                    var that = this,
                        signal = new _Signal();
                    return this._synchronize(signal).then(function () {
                        var newSelection = new exports._Selection(that._listView);
                        return newSelection.set(items).then(
                            function () {
                                that._set(newSelection);
                                signal.complete();
                            },
                            function (error) {
                                newSelection.clear();
                                signal.complete();
                                return Promise.wrapError(error);
                            }
                        );
                    });
                },

                clear: function () {
                    /// <signature helpKeyword="WinJS.UI._SelectionManager.prototype.clear">
                    /// <summary locid="WinJS.UI._SelectionManager.prototype.clear">
                    /// Clears the selection.
                    /// </summary>
                    /// <returns type="Promise" locid="WinJS.UI._SelectionManager.prototype.clear_returnValue">
                    /// A Promise that is fulfilled when the clear operation completes.
                    /// </returns>
                    /// </signature>

                    var that = this,
                        signal = new _Signal();
                    return this._synchronize(signal).then(function () {
                        var newSelection = new exports._Selection(that._listView);
                        return newSelection.clear().then(
                            function () {
                                that._set(newSelection);
                                signal.complete();
                            },
                            function (error) {
                                newSelection.clear();
                                signal.complete();
                                return Promise.wrapError(error);
                            }
                        );
                    });
                },

                add: function (items) {
                    /// <signature helpKeyword="WinJS.UI._SelectionManager.prototype.add">
                    /// <summary locid="WinJS.UI._SelectionManager.prototype.add">
                    /// Adds one or more items to the selection.
                    /// </summary>
                    /// <param name="items" locid="WinJS.UI._SelectionManager.prototype.add_items">
                    /// The indexes or keys of the items to add.
                    /// You can provide different types of objects for the items parameter:
                    /// you can specify an index, a key, or a range of indexes.
                    /// It can also be an array that contains one or more of these objects.
                    /// </param>
                    /// <returns type="Promise" locid="WinJS.UI._SelectionManager.prototype.add_returnValue">
                    /// A Promise that is fulfilled when the operation completes.
                    /// </returns>
                    /// </signature>
                    var that = this,
                        signal = new _Signal();
                    return this._synchronize(signal).then(function () {
                        var newSelection = that._cloneSelection();
                        return newSelection.add(items).then(
                            function () {
                                that._set(newSelection);
                                signal.complete();
                            },
                            function (error) {
                                newSelection.clear();
                                signal.complete();
                                return Promise.wrapError(error);
                            }
                        );
                    });
                },

                remove: function (items) {
                    /// <signature helpKeyword="WinJS.UI._SelectionManager.prototype.remove">
                    /// <summary locid="WinJS.UI._SelectionManager.prototype.remove">
                    /// Removes the specified items from the selection.
                    /// </summary>
                    /// <param name="items" locid="WinJS.UI._SelectionManager.prototype.remove_items">
                    /// The indexes or keys of the items to remove. You can provide different types of objects for the items parameter:
                    /// you can specify an index, a key, or a range of indexes.
                    /// It can also be an array that contains one or more of these objects.
                    /// </param>
                    /// <returns type="Promise" locid="WinJS.UI._SelectionManager.prototype.remove_returnValue">
                    /// A Promise that is fulfilled when the operation completes.
                    /// </returns>
                    /// </signature>
                    var that = this,
                        signal = new _Signal();
                    return this._synchronize(signal).then(function () {
                        var newSelection = that._cloneSelection();
                        return newSelection.remove(items).then(
                            function () {
                                that._set(newSelection);
                                signal.complete();
                            },
                            function (error) {
                                newSelection.clear();
                                signal.complete();
                                return Promise.wrapError(error);
                            }
                        );
                    });
                },

                selectAll: function () {
                    /// <signature helpKeyword="WinJS.UI._SelectionManager.prototype.selectAll">
                    /// <summary locid="WinJS.UI._SelectionManager.prototype.selectAll">
                    /// Adds all the items in the ListView to the selection.
                    /// </summary>
                    /// <returns type="Promise" locid="WinJS.UI._SelectionManager.prototype.selectAll_returnValue">
                    /// A Promise that is fulfilled when the operation completes.
                    /// </returns>
                    /// </signature>
                    var that = this,
                        signal = new _Signal();
                    return this._synchronize(signal).then(function () {
                        var newSelection = new exports._Selection(that._listView);
                        return newSelection.selectAll().then(
                            function () {
                                that._set(newSelection);
                                signal.complete();
                            },
                            function (error) {
                                newSelection.clear();
                                signal.complete();
                                return Promise.wrapError(error);
                            }
                        );
                    });
                },

                _synchronize: function (signal) {
                    var that = this;
                    return this._listView._versionManager.unlocked.then(function () {
                        var currentPendingChange = that._pendingChange;
                        that._pendingChange = Promise.join([currentPendingChange, signal.promise]).then(function () { });
                        return currentPendingChange;
                    });
                },

                _reset: function () {
                    this._pivot = _Constants._INVALID_INDEX;
                    this._setFocused({ type: _UI.ObjectType.item, index: 0 }, this._keyboardFocused());
                    this._pendingChange.cancel();
                    this._pendingChange = Promise.wrap();
                    this._selected.clear();
                    this._selected = new exports._Selection(this._listView);
                },

                _dispose: function () {
                    this._selected.clear();
                    this._selected = null;
                    this._listView = null;
                },

                _set: function (newSelection) {
                    var that = this;
                    return this._fireSelectionChanging(newSelection).then(function (approved) {
                        if (approved) {
                            that._selected.clear();
                            that._selected = newSelection;
                            that._listView._updateSelection();
                            that._fireSelectionChanged();
                        } else {
                            newSelection.clear();
                        }
                        return approved;
                    });
                },

                _fireSelectionChanging: function (newSelection) {
                    var eventObject = _Global.document.createEvent("CustomEvent"),
                        newSelectionUpdated = Promise.wrap();

                    eventObject.initCustomEvent("selectionchanging", true, true, {
                        newSelection: newSelection,
                        preventTapBehavior: function () {
                        },
                        setPromise: function (promise) {
                            /// <signature helpKeyword="WinJS.UI.SelectionManager.selectionchanging.setPromise">
                            /// <summary locid="WinJS.UI.SelectionManager.selectionchanging.setPromise">
                            /// Used to inform the ListView that asynchronous work is being performed, and that this
                            /// event handler should not be considered complete until the promise completes.
                            /// </summary>
                            /// <param name="promise" type="WinJS.Promise" locid="WinJS.UI.SelectionManager.selectionchanging.setPromise_p:promise">
                            /// The promise to wait for.
                            /// </param>
                            /// </signature>

                            newSelectionUpdated = promise;
                        }
                    });

                    var approved = this._listView._element.dispatchEvent(eventObject);
                    return newSelectionUpdated.then(function () {
                        return approved;
                    });
                },

                _fireSelectionChanged: function () {
                    var eventObject = _Global.document.createEvent("CustomEvent");
                    eventObject.initCustomEvent("selectionchanged", true, false, null);
                    this._listView._element.dispatchEvent(eventObject);
                },

                _getFocused: function () {
                    return { type: this._focused.type, index: this._focused.index };
                },

                _setFocused: function (entity, keyboardFocused) {
                    this._focused = { type: entity.type, index: entity.index };
                    this._focusedByKeyboard = keyboardFocused;
                },

                _keyboardFocused: function () {
                    return this._focusedByKeyboard;
                },

                _updateCount: function (count) {
                    this._selected._itemsCount = count;
                },

                _isIncluded: function (index) {
                    return this._selected._isIncluded(index);
                },

                _cloneSelection: function () {
                    var newSelection = new exports._Selection(this._listView);
                    newSelection._ranges = this._selected.getRanges();
                    newSelection._itemsCount = this._selected._itemsCount;
                    newSelection._retainRanges();
                    return newSelection;
                }
            };
            _SelectionManager.supportedForProcessing = false;
            return _SelectionManager;
        })
    });

});

// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Controls/ListView/_BrowseMode',[
    'exports',
    '../../Core/_Global',
    '../../Core/_Base',
    '../../Core/_BaseUtils',
    '../../Animations',
    '../../Promise',
    '../../Utilities/_ElementUtilities',
    '../../Utilities/_UI',
    '../ItemContainer/_Constants',
    '../ItemContainer/_ItemEventsHandler',
    './_SelectionManager'
    ], function browseModeInit(exports, _Global, _Base, _BaseUtils, Animations, Promise, _ElementUtilities, _UI, _Constants, _ItemEventsHandler, _SelectionManager) {
    "use strict";

    var transformName = _BaseUtils._browserStyleEquivalents["transform"].scriptName;
    // This component is responsible for handling input in Browse Mode.
    // When the user clicks on an item in this mode itemInvoked event is fired.
    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {

        _SelectionMode: _Base.Namespace._lazy(function () {

            function clampToRange(first, last, x) {
                return Math.max(first, Math.min(last, x));
            }

            function dispatchKeyboardNavigating(element, oldEntity, newEntity) {
                var navigationEvent = _Global.document.createEvent("CustomEvent");
                navigationEvent.initCustomEvent("keyboardnavigating", true, true, {
                    oldFocus: oldEntity.index,
                    oldFocusType: oldEntity.type,
                    newFocus: newEntity.index,
                    newFocusType: newEntity.type
                });
                return element.dispatchEvent(navigationEvent);
            }

            var _SelectionMode = _Base.Class.define(function _SelectionMode_ctor(modeSite) {
                this.inboundFocusHandled = false;
                this._pressedContainer = null;
                this._pressedItemBox = null;
                this._pressedHeader = null;
                this._pressedEntity = { type: _UI.ObjectType.item, index: _Constants._INVALID_INDEX };
                this._pressedPosition = null;

                this.initialize(modeSite);
            },{
                _dispose: function () {
                    if (this._itemEventsHandler) {
                        this._itemEventsHandler.dispose();
                    }
                    if (this._setNewFocusItemOffsetPromise) {
                        this._setNewFocusItemOffsetPromise.cancel();
                    }
                },

                initialize: function (modeSite) {
                    this.site = modeSite;

                    this._keyboardNavigationHandlers = {};
                    this._keyboardAcceleratorHandlers = {};

                    var site = this.site,
                        that = this;
                    this._itemEventsHandler = new _ItemEventsHandler._ItemEventsHandler(Object.create({
                        containerFromElement: function (element) {
                            return site._view.items.containerFrom(element);
                        },
                        indexForItemElement: function (element) {
                            return site._view.items.index(element);
                        },
                        indexForHeaderElement: function (element) {
                            return site._groups.index(element);
                        },
                        itemBoxAtIndex: function (index) {
                            return site._view.items.itemBoxAt(index);
                        },
                        itemAtIndex: function (index) {
                            return site._view.items.itemAt(index);
                        },
                        headerAtIndex: function (index) {
                            return site._groups.group(index).header;
                        },
                        headerFromElement: function (element) {
                            return site._groups.headerFrom(element);
                        },
                        containerAtIndex: function (index) {
                            return site._view.items.containerAt(index);
                        },
                        isZombie: function () {
                            return site._isZombie();
                        },
                        getItemPosition: function (entity) {
                            return site._getItemPosition(entity);
                        },
                        rtl: function () {
                            return site._rtl();
                        },
                        fireInvokeEvent: function (entity, itemElement) {
                            return that._fireInvokeEvent(entity, itemElement);
                        },
                        verifySelectionAllowed: function (index) {
                            return that._verifySelectionAllowed(index);
                        },
                        changeFocus: function (newFocus, skipSelection, ctrlKeyDown, skipEnsureVisible, keyboardFocused) {
                            return site._changeFocus(newFocus, skipSelection, ctrlKeyDown, skipEnsureVisible, keyboardFocused);
                        },
                        selectRange: function (firstIndex, lastIndex, additive) {
                            return that._selectRange(firstIndex, lastIndex, additive);
                        }
                    }, {
                        pressedEntity: {
                            enumerable: true,
                            get: function () {
                                return that._pressedEntity;
                            },
                            set: function (value) {
                                that._pressedEntity = value;
                            }
                        },
                        pressedContainerScaleTransform: {
                            enumerable: true,
                            get: function () {
                                return that._pressedContainerScaleTransform;
                            },
                            set: function (value) {
                                that._pressedContainerScaleTransform = value;
                            }
                        },
                        pressedContainer: {
                            enumerable: true,
                            get: function () {
                                return that._pressedContainer;
                            },
                            set: function (value) {
                                that._pressedContainer = value;
                            }
                        },

                        pressedItemBox: {
                            enumerable: true,
                            get: function () {
                                return that._pressedItemBox;
                            },
                            set: function (value) {
                                that._pressedItemBox = value;
                            }
                        },

                        pressedHeader: {
                            enumerable: true,
                            get: function () {
                                return that._pressedHeader;
                            },
                            set: function (value) {
                                return that._pressedHeader = value;
                            }
                        },

                        pressedPosition: {
                            enumerable: true,
                            get: function () {
                                return that._pressedPosition;
                            },
                            set: function (value) {
                                that._pressedPosition = value;
                            }
                        },

                        pressedElement: {
                            enumerable: true,
                            set: function (value) {
                                that._pressedElement = value;
                            }
                        },

                        swipeBehavior: {
                            enumerable: true,
                            get: function () {
                                return site._swipeBehavior;
                            }
                        },
                        eventHandlerRoot: {
                            enumerable: true,
                            get: function () {
                                return site._viewport;
                            }
                        },
                        selectionMode: {
                            enumerable: true,
                            get: function () {
                                return site._selectionMode;
                            }
                        },
                        accessibleItemClass: {
                            enumerable: true,
                            get: function () {
                                // CSS class of the element with the aria role
                                return _Constants._itemClass;
                            }
                        },
                        canvasProxy: {
                            enumerable: true,
                            get: function () {
                                return site._canvasProxy;
                            }
                        },
                        tapBehavior: {
                            enumerable: true,
                            get: function () {
                                return site._tap;
                            }
                        },
                        headerTapBehavior: {
                            enumerable: true,
                            get: function () {
                                return site._groupHeaderTap;
                            }
                        },
                        draggable: {
                            enumerable: true,
                            get: function () {
                                return site.itemsDraggable || site.itemsReorderable;
                            }
                        },
                        selection: {
                            enumerable: true,
                            get: function () {
                                return site._selection;
                            }
                        },
                        horizontal: {
                            enumerable: true,
                            get: function () {
                                return site._horizontal();
                            }
                        },
                        customFootprintParent: {
                            enumerable: true,
                            get: function () {
                                return null;
                            }
                        }
                    }));

                    function createArrowHandler(direction, clampToBounds) {
                        var handler = function (oldFocus) {
                            return modeSite._view.getAdjacent(oldFocus, direction);
                        };
                        handler.clampToBounds = clampToBounds;
                        return handler;
                    }

                    var Key = _ElementUtilities.Key;
                    this._keyboardNavigationHandlers[Key.upArrow] = createArrowHandler(Key.upArrow);
                    this._keyboardNavigationHandlers[Key.downArrow] = createArrowHandler(Key.downArrow);
                    this._keyboardNavigationHandlers[Key.leftArrow] = createArrowHandler(Key.leftArrow);
                    this._keyboardNavigationHandlers[Key.rightArrow] = createArrowHandler(Key.rightArrow);
                    this._keyboardNavigationHandlers[Key.pageUp] = createArrowHandler(Key.pageUp, true);
                    this._keyboardNavigationHandlers[Key.pageDown] = createArrowHandler(Key.pageDown, true);
                    this._keyboardNavigationHandlers[Key.home] = function (oldFocus) {
                        return Promise.wrap({ type: oldFocus.type, index: 0 });
                    };
                    this._keyboardNavigationHandlers[Key.end] = function (oldFocus) {
                        if (oldFocus.type === _UI.ObjectType.groupHeader) {
                            return Promise.wrap({ type: oldFocus.type, index: site._groups.length() - 1 });
                        } else {
                            // Get the index of the last container
                            return that.site._view.finalItem().then(function (index) {
                                return { type: oldFocus.type, index: index };
                            }, function (error) {
                                return Promise.wrapError(error);
                            });
                        }
                    };

                    this._keyboardAcceleratorHandlers[Key.a] = function () {
                        if (that.site._multiSelection()) {
                            that._selectAll();
                        }
                    };
                },

                staticMode: function SelectionMode_staticMode() {
                    return this.site._tap === _UI.TapBehavior.none && this.site._selectionMode === _UI.SelectionMode.none;
                },

                itemUnrealized: function SelectionMode_itemUnrealized(index, itemBox) {
                    if (this._pressedEntity.type === _UI.ObjectType.groupHeader) {
                        return;
                    }

                    if (this._pressedEntity.index === index) {
                        this._resetPointerDownState();
                    }

                    if (this._itemBeingDragged(index)) {
                        for (var i = this._draggedItemBoxes.length - 1; i >= 0; i--) {
                            if (this._draggedItemBoxes[i] === itemBox) {
                                _ElementUtilities.removeClass(itemBox, _Constants._dragSourceClass);
                                this._draggedItemBoxes.splice(i, 1);
                            }
                        }
                    }
                },

                _fireInvokeEvent: function SelectionMode_fireInvokeEvent(entity, itemElement) {
                    if (!itemElement) {
                        return;
                    }

                    var that = this;
                    function fireInvokeEventImpl(dataSource, isHeader) {
                        var listBinding = dataSource.createListBinding(),
                             promise = listBinding.fromIndex(entity.index),
                             eventName = isHeader ? "groupheaderinvoked" : "iteminvoked";

                        promise.done(function () {
                            listBinding.release();
                        });

                        var eventObject = _Global.document.createEvent("CustomEvent");
                        eventObject.initCustomEvent(eventName, true, true, isHeader ? {
                            groupHeaderPromise: promise,
                            groupHeaderIndex: entity.index
                        } : {
                            itemPromise: promise,
                            itemIndex: entity.index
                        });

                        // If preventDefault was not called, call the default action on the site
                        if (itemElement.dispatchEvent(eventObject)) {
                            that.site._defaultInvoke(entity);
                        }
                    }

                    if (entity.type === _UI.ObjectType.groupHeader) {
                        if (this.site._groupHeaderTap === _UI.GroupHeaderTapBehavior.invoke &&
                            entity.index !== _Constants._INVALID_INDEX) {
                            fireInvokeEventImpl(this.site.groupDataSource, true);
                        }
                    } else {
                        if (this.site._tap !== _UI.TapBehavior.none && entity.index !== _Constants._INVALID_INDEX) {
                            fireInvokeEventImpl(this.site.itemDataSource, false);
                        }
                    }
                },

                _verifySelectionAllowed: function SelectionMode_verifySelectionAllowed(entity) {
                    if (entity.type === _UI.ObjectType.groupHeader) {
                        return {
                            canSelect: false,
                            canTapSelect: false
                        };
                    }

                    var itemIndex = entity.index;
                    var site = this.site;
                    var item = this.site._view.items.itemAt(itemIndex);
                    if (site._selectionAllowed() && (site._selectOnTap() || site._swipeBehavior === _UI.SwipeBehavior.select) && !(item && _ElementUtilities.hasClass(item, _Constants._nonSelectableClass))) {
                        var selected = site._selection._isIncluded(itemIndex),
                            single = !site._multiSelection(),
                            newSelection = site._selection._cloneSelection();

                        if (selected) {
                            if (single) {
                                newSelection.clear();
                            } else {
                                newSelection.remove(itemIndex);
                            }
                        } else {
                            if (single) {
                                newSelection.set(itemIndex);
                            } else {
                                newSelection.add(itemIndex);
                            }
                        }

                        var eventObject = _Global.document.createEvent("CustomEvent"),
                            newSelectionUpdated = Promise.wrap(),
                            completed = false,
                            preventTap = false,
                            included;

                        eventObject.initCustomEvent("selectionchanging", true, true, {
                            newSelection: newSelection,
                            preventTapBehavior: function () {
                                preventTap = true;
                            },
                            setPromise: function (promise) {
                                /// <signature helpKeyword="WinJS.UI.BrowseMode.selectionchanging.setPromise">
                                /// <summary locid="WinJS.UI.BrowseMode.selectionchanging.setPromise">
                                /// Used to inform the ListView that asynchronous work is being performed, and that this
                                /// event handler should not be considered complete until the promise completes.
                                /// </summary>
                                /// <param name="promise" type="WinJS.Promise" locid="WinJS.UI.BrowseMode.selectionchanging.setPromise_p:promise">
                                /// The promise to wait for.
                                /// </param>
                                /// </signature>

                                newSelectionUpdated = promise;
                            }
                        });

                        var defaultBehavior = site._element.dispatchEvent(eventObject);

                        newSelectionUpdated.then(function () {
                            completed = true;
                            included = newSelection._isIncluded(itemIndex);
                            newSelection.clear();
                        });

                        var canSelect = defaultBehavior && completed && (selected || included);

                        return {
                            canSelect: canSelect,
                            canTapSelect: canSelect && !preventTap
                        };
                    } else {
                        return {
                            canSelect: false,
                            canTapSelect: false
                        };
                    }
                },

                _containedInElementWithClass: function SelectionMode_containedInElementWithClass(element, className) {
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

                _isDraggable: function SelectionMode_isDraggable(element) {
                    return (!this._containedInElementWithClass(element, _Constants._nonDraggableClass));
                },

                _isInteractive: function SelectionMode_isInteractive(element) {
                    return this._containedInElementWithClass(element, "win-interactive");
                },

                _resetPointerDownState: function SelectionMode_resetPointerDownState() {
                    this._itemEventsHandler.resetPointerDownState();
                },

                onMSManipulationStateChanged: function (eventObject) {
                    this._itemEventsHandler.onMSManipulationStateChanged(eventObject);
                },

                onPointerDown: function SelectionMode_onPointerDown(eventObject) {
                    this._itemEventsHandler.onPointerDown(eventObject);
                },

                onclick: function SelectionMode_onclick(eventObject) {
                    this._itemEventsHandler.onClick(eventObject);
                },

                onPointerUp: function SelectionMode_onPointerUp(eventObject) {
                    this._itemEventsHandler.onPointerUp(eventObject);
                },

                onPointerCancel: function SelectionMode_onPointerCancel(eventObject) {
                    this._itemEventsHandler.onPointerCancel(eventObject);
                },

                onLostPointerCapture: function SelectionMode_onLostPointerCapture(eventObject) {
                    this._itemEventsHandler.onLostPointerCapture(eventObject);
                },

                onContextMenu: function SelectionMode_onContextMenu(eventObject) {
                    this._itemEventsHandler.onContextMenu(eventObject);
                },

                onMSHoldVisual: function SelectionMode_onMSHoldVisual(eventObject) {
                    this._itemEventsHandler.onMSHoldVisual(eventObject);
                },

                onDataChanged: function SelectionMode_onDataChanged(eventObject) {
                    this._itemEventsHandler.onDataChanged(eventObject);
                },

                _removeTransform: function SelectionMode_removeTransform(element, transform) {
                    if (transform && element.style[transformName].indexOf(transform) !== -1) {
                        element.style[transformName] = element.style[transformName].replace(transform, "");
                    }
                },

                _selectAll: function SelectionMode_selectAll() {
                    var unselectableRealizedItems = [];
                    this.site._view.items.each(function (index, item) {
                        if (item && _ElementUtilities.hasClass(item, _Constants._nonSelectableClass)) {
                            unselectableRealizedItems.push(index);
                        }
                    });

                    this.site._selection.selectAll();
                    if (unselectableRealizedItems.length > 0) {
                        this.site._selection.remove(unselectableRealizedItems);
                    }
                },

                _selectRange: function SelectionMode_selectRange(firstIndex, lastIndex, additive) {
                    var ranges = [];
                    var currentStartRange = -1;
                    for (var i = firstIndex; i <= lastIndex; i++) {
                        var item = this.site._view.items.itemAt(i);
                        if (item && _ElementUtilities.hasClass(item, _Constants._nonSelectableClass)) {
                            if (currentStartRange !== -1) {
                                ranges.push({
                                    firstIndex: currentStartRange,
                                    lastIndex: i - 1
                                });
                                currentStartRange = -1;
                            }
                        } else if (currentStartRange === -1) {
                            currentStartRange = i;
                        }
                    }
                    if (currentStartRange !== -1) {
                        ranges.push({
                            firstIndex: currentStartRange,
                            lastIndex: lastIndex
                        });
                    }
                    if (ranges.length > 0) {
                        this.site._selection[additive ? "add" : "set"](ranges);
                    }
                },

                onDragStart: function SelectionMode_onDragStart(eventObject) {
                    this._pressedEntity = { type: _UI.ObjectType.item, index: this.site._view.items.index(eventObject.target) };
                    this.site._selection._pivot = _Constants._INVALID_INDEX;
                    // Drag shouldn't be initiated when the user holds down the mouse on a win-interactive element and moves.
                    // The problem is that the dragstart event's srcElement+target will both be an itembox (which has draggable=true), so we can't check for win-interactive in the dragstart event handler.
                    // The itemEventsHandler sets our _pressedElement field on MSPointerDown, so we use that instead when checking for interactive.
                    if (this._pressedEntity.index !== _Constants._INVALID_INDEX &&
                            (this.site.itemsDraggable || this.site.itemsReorderable) &&
                            !this.site._view.animating &&
                            this._isDraggable(eventObject.target) &&
                            (!this._pressedElement || !this._isInteractive(this._pressedElement))) {
                        this._dragging = true;
                        this._dragDataTransfer = eventObject.dataTransfer;
                        this._pressedPosition = _ElementUtilities._getCursorPos(eventObject);
                        this._dragInfo = null;
                        this._lastEnteredElement = eventObject.target;

                        if (this.site._selection._isIncluded(this._pressedEntity.index)) {
                            this._dragInfo = this.site.selection;
                        } else {
                            this._draggingUnselectedItem = true;
                            this._dragInfo = new _SelectionManager._Selection(this.site, [{ firstIndex: this._pressedEntity.index, lastIndex: this._pressedEntity.index }]);
                        }

                        var dropTarget = this.site.itemsReorderable;
                        var event = _Global.document.createEvent("CustomEvent");
                        event.initCustomEvent("itemdragstart", true, false, {
                            dataTransfer: eventObject.dataTransfer,
                            dragInfo: this._dragInfo
                        });

                        // Firefox requires setData to be called on the dataTransfer object in order for DnD to continue.
                        // Firefox also has an issue rendering the item's itemBox+element, so we need to use setDragImage, using the item's container, to get it to render.
                        eventObject.dataTransfer.setData("text", "");
                        if (eventObject.dataTransfer.setDragImage) {
                            var pressedItemData = this.site._view.items.itemDataAt(this._pressedEntity.index);
                            if (pressedItemData && pressedItemData.container) {
                                var rect = pressedItemData.container.getBoundingClientRect();
                                eventObject.dataTransfer.setDragImage(pressedItemData.container, eventObject.clientX - rect.left, eventObject.clientY - rect.top);
                            }
                        }
                        this.site.element.dispatchEvent(event);
                        if (this.site.itemsDraggable && !this.site.itemsReorderable) {
                            if (!this._firedDragEnter) {
                                if (this._fireDragEnterEvent(eventObject.dataTransfer)) {
                                    dropTarget = true;
                                    this._dragUnderstood = true;
                                }
                            }
                        }

                        if (dropTarget) {
                            this._addedDragOverClass = true;
                            _ElementUtilities.addClass(this.site._element, _Constants._dragOverClass);
                        }

                        this._draggedItemBoxes = [];

                        var that = this;
                        // A dragged element can be removed from the DOM by a number of actions - datasource removes/changes, being scrolled outside of the realized range, etc.
                        // The dragend event is fired on the original source element of the drag. If that element isn't in the DOM, though, the dragend event will only be fired on the element
                        // itself and not bubble up through the ListView's tree to the _viewport element where all the other drag event handlers are.
                        // The dragend event handler has to be added to the event's srcElement so that we always receive the event, even when the source element is unrealized.
                        var sourceElement = eventObject.target;
                        sourceElement.addEventListener("dragend", function itemDragEnd(eventObject) {
                            sourceElement.removeEventListener("dragend", itemDragEnd);
                            that.onDragEnd(eventObject);
                        });
                        // We delay setting the opacity of the dragged items so that IE has time to create a thumbnail before me make them invisible
                        _BaseUtils._yieldForDomModification(function () {
                            if (that._dragging) {
                                var indicesSelected = that._dragInfo.getIndices();
                                for (var i = 0, len = indicesSelected.length; i < len; i++) {
                                    var itemData = that.site._view.items.itemDataAt(indicesSelected[i]);
                                    if (itemData && itemData.itemBox) {
                                        that._addDragSourceClass(itemData.itemBox);
                                    }
                                }
                            }
                        });
                    } else {
                        eventObject.preventDefault();
                    }
                },

                onDragEnter: function (eventObject) {
                    var eventHandled = this._dragUnderstood;
                    this._lastEnteredElement = eventObject.target;
                    if (this._exitEventTimer) {
                        _Global.clearTimeout(this._exitEventTimer);
                        this._exitEventTimer = 0;
                    }

                    if (!this._firedDragEnter) {
                        if (this._fireDragEnterEvent(eventObject.dataTransfer)) {
                            eventHandled = true;
                        }
                    }

                    if (eventHandled || (this._dragging && this.site.itemsReorderable)) {
                        eventObject.preventDefault();
                        this._dragUnderstood = true;
                        if (!this._addedDragOverClass) {
                            this._addedDragOverClass = true;
                            _ElementUtilities.addClass(this.site._element, _Constants._dragOverClass);
                        }
                    }
                    this._pointerLeftRegion = false;
                },

                onDragLeave: function (eventObject) {
                    if (eventObject.target === this._lastEnteredElement) {
                        this._pointerLeftRegion = true;
                        this._handleExitEvent();
                    }
                },

                fireDragUpdateEvent: function () {
                    var event = _Global.document.createEvent("CustomEvent");
                    event.initCustomEvent("itemdragchanged", true, false, {
                        dataTransfer: this._dragDataTransfer,
                        dragInfo: this._dragInfo
                    });
                    this.site.element.dispatchEvent(event);
                },

                _fireDragEnterEvent: function (dataTransfer) {
                    var event = _Global.document.createEvent("CustomEvent");
                    event.initCustomEvent("itemdragenter", true, true, {
                        dataTransfer: dataTransfer
                    });
                    // The end developer must tell a ListView when a drag can be understood by calling preventDefault() on the event we fire
                    var dropTarget = (!this.site.element.dispatchEvent(event));
                    this._firedDragEnter = true;
                    return dropTarget;
                },

                _fireDragBetweenEvent: function (index, insertAfterIndex, dataTransfer) {
                    var event = _Global.document.createEvent("CustomEvent");
                    event.initCustomEvent("itemdragbetween", true, true, {
                        index: index,
                        insertAfterIndex: insertAfterIndex,
                        dataTransfer: dataTransfer
                    });
                    return this.site.element.dispatchEvent(event);
                },

                _fireDropEvent: function (index, insertAfterIndex, dataTransfer) {
                    var event = _Global.document.createEvent("CustomEvent");
                    event.initCustomEvent("itemdragdrop", true, true, {
                        index: index,
                        insertAfterIndex: insertAfterIndex,
                        dataTransfer: dataTransfer
                    });
                    return this.site.element.dispatchEvent(event);
                },

                _handleExitEvent: function () {
                    if (this._exitEventTimer) {
                        _Global.clearTimeout(this._exitEventTimer);
                        this._exitEventTimer = 0;
                    }
                    var that = this;
                    this._exitEventTimer = _Global.setTimeout(function () {
                        if (that.site._disposed) { return; }

                        if (that._pointerLeftRegion) {
                            that.site._layout.dragLeave && that.site._layout.dragLeave();
                            that._pointerLeftRegion = false;
                            that._dragUnderstood = false;
                            that._lastEnteredElement = null;
                            that._lastInsertPoint = null;
                            that._dragBetweenDisabled = false;
                            if (that._firedDragEnter) {
                                var event = _Global.document.createEvent("CustomEvent");
                                event.initCustomEvent("itemdragleave", true, false, {
                                });
                                that.site.element.dispatchEvent(event);
                                that._firedDragEnter = false;
                            }
                            if (that._addedDragOverClass) {
                                that._addedDragOverClass = false;
                                _ElementUtilities.removeClass(that.site._element, _Constants._dragOverClass);
                            }
                            that._exitEventTimer = 0;
                            that._stopAutoScroll();
                        }
                    }, 40);
                },

                _getEventPositionInElementSpace: function (element, eventObject) {
                    var elementRect = { left: 0, top: 0 };
                    try {
                        elementRect = element.getBoundingClientRect();
                    }
                    catch (err) { }

                    var computedStyle = _Global.getComputedStyle(element, null),
                        paddingLeft = parseInt(computedStyle["paddingLeft"]),
                        paddingTop = parseInt(computedStyle["paddingTop"]),
                        borderLeft = parseInt(computedStyle["borderLeftWidth"]),
                        borderTop = parseInt(computedStyle["borderTopWidth"]),
                        clientX = eventObject.clientX,
                        clientY = eventObject.clientY;

                    var position = {
                        x: +clientX === clientX ? (clientX - elementRect.left - paddingLeft - borderLeft) : 0,
                        y: +clientY === clientY ? (clientY - elementRect.top - paddingTop - borderTop) : 0
                    };

                    if (this.site._rtl()) {
                        position.x = (elementRect.right - elementRect.left) - position.x;
                    }

                    return position;
                },

                _getPositionInCanvasSpace: function (eventObject) {
                    var scrollLeft = this.site._horizontal() ? this.site.scrollPosition : 0,
                        scrollTop = this.site._horizontal() ? 0 : this.site.scrollPosition,
                        position = this._getEventPositionInElementSpace(this.site.element, eventObject);

                    return {
                        x: position.x + scrollLeft,
                        y: position.y + scrollTop
                    };
                },

                _itemBeingDragged: function (itemIndex) {
                    if (!this._dragging) {
                        return false;
                    }

                    return ((this._draggingUnselectedItem && this._dragInfo._isIncluded(itemIndex)) || (!this._draggingUnselectedItem && this.site._isSelected(itemIndex)));
                },

                _addDragSourceClass: function (itemBox) {
                    this._draggedItemBoxes.push(itemBox);
                    _ElementUtilities.addClass(itemBox, _Constants._dragSourceClass);
                    if (itemBox.parentNode) {
                        _ElementUtilities.addClass(itemBox.parentNode, _Constants._footprintClass);
                    }
                },

                renderDragSourceOnRealizedItem: function (itemIndex, itemBox) {
                    if (this._itemBeingDragged(itemIndex)) {
                        this._addDragSourceClass(itemBox);
                    }
                },

                onDragOver: function (eventObject) {
                    if (!this._dragUnderstood) {
                        return;
                    }
                    this._pointerLeftRegion = false;
                    eventObject.preventDefault();

                    var cursorPositionInCanvas = this._getPositionInCanvasSpace(eventObject),
                        cursorPositionInRoot = this._getEventPositionInElementSpace(this.site.element, eventObject);
                    this._checkAutoScroll(cursorPositionInRoot.x, cursorPositionInRoot.y);
                    if (this.site._layout.hitTest) {
                        if (this._autoScrollFrame) {
                            if (this._lastInsertPoint) {
                                this.site._layout.dragLeave();
                                this._lastInsertPoint = null;
                            }
                        } else {
                            var insertPoint = this.site._view.hitTest(cursorPositionInCanvas.x, cursorPositionInCanvas.y);
                            insertPoint.insertAfterIndex = clampToRange(-1, this.site._cachedCount - 1, insertPoint.insertAfterIndex);
                            if (!this._lastInsertPoint || this._lastInsertPoint.insertAfterIndex !== insertPoint.insertAfterIndex || this._lastInsertPoint.index !== insertPoint.index) {
                                this._dragBetweenDisabled = !this._fireDragBetweenEvent(insertPoint.index, insertPoint.insertAfterIndex, eventObject.dataTransfer);
                                if (!this._dragBetweenDisabled) {
                                    this.site._layout.dragOver(cursorPositionInCanvas.x, cursorPositionInCanvas.y, this._dragInfo);
                                } else {
                                    this.site._layout.dragLeave();
                                }
                            }
                            this._lastInsertPoint = insertPoint;
                        }
                    }
                },

                _clearDragProperties: function () {
                    if (this._addedDragOverClass) {
                        this._addedDragOverClass = false;
                        _ElementUtilities.removeClass(this.site._element, _Constants._dragOverClass);
                    }
                    if (this._draggedItemBoxes) {
                        for (var i = 0, len = this._draggedItemBoxes.length; i < len; i++) {
                            _ElementUtilities.removeClass(this._draggedItemBoxes[i], _Constants._dragSourceClass);
                            if (this._draggedItemBoxes[i].parentNode) {
                                _ElementUtilities.removeClass(this._draggedItemBoxes[i].parentNode, _Constants._footprintClass);
                            }
                        }
                        this._draggedItemBoxes = [];
                    }
                    this.site._layout.dragLeave();
                    this._dragging = false;
                    this._dragInfo = null;
                    this._draggingUnselectedItem = false;
                    this._dragDataTransfer = null;
                    this._lastInsertPoint = null;
                    this._resetPointerDownState();
                    this._lastEnteredElement = null;
                    this._dragBetweenDisabled = false;
                    this._firedDragEnter = false;
                    this._dragUnderstood = false;
                    this._stopAutoScroll();
                },

                onDragEnd: function () {
                    var event = _Global.document.createEvent("CustomEvent");
                    event.initCustomEvent("itemdragend", true, false, {});
                    this.site.element.dispatchEvent(event);
                    this._clearDragProperties();
                },

                _findFirstAvailableInsertPoint: function (selectedItems, startIndex, searchForwards) {
                    var indicesSelected = selectedItems.getIndices(),
                        dropIndexInSelection = -1,
                        count = this.site._cachedCount,
                        selectionCount = indicesSelected.length,
                        startIndexInSelection = -1,
                        dropIndex = startIndex;
                    for (var i = 0; i < selectionCount; i++) {
                        if (indicesSelected[i] === dropIndex) {
                            dropIndexInSelection = i;
                            startIndexInSelection = i;
                            break;
                        }
                    }

                    while (dropIndexInSelection >= 0 && dropIndex >= 0) {
                        if (searchForwards) {
                            dropIndex++;
                            if (dropIndexInSelection < selectionCount && indicesSelected[dropIndexInSelection + 1] === dropIndex && dropIndex < count) {
                                dropIndexInSelection++;
                            } else if (dropIndex >= count) {
                                // If we hit the end of the list when looking for a new location ahead of our start index, it means everything from the starting point
                                // to the end is selected, so no valid index can be located to move the items. We need to start searching again, moving backwards
                                // from the starting location, to find the first available insert location to move the selected items.
                                searchForwards = false;
                                dropIndex = startIndex;
                                dropIndexInSelection = startIndexInSelection;
                            } else {
                                dropIndexInSelection = -1;
                            }
                        } else {
                            dropIndex--;
                            if (dropIndexInSelection > 0 && indicesSelected[dropIndexInSelection - 1] === dropIndex) {
                                dropIndexInSelection--;
                            } else {
                                dropIndexInSelection = -1;
                            }
                        }
                    }

                    return dropIndex;
                },

                _reorderItems: function (dropIndex, reorderedItems, reorderingUnselectedItem, useMoveBefore, ensureVisibleAtEnd) {
                    var site = this.site;
                    var updateSelection = function updatedSelectionOnDrop(items) {
                        // Update selection if the items were selected. If there is a range with length > 0 a move operation
                        // on the first or last item removes the range.
                        if (!reorderingUnselectedItem) {
                            site._selection.set({ firstKey: items[0].key, lastKey: items[items.length - 1].key });
                        } else {
                            site._selection.remove({ key: items[0].key });
                        }
                        if (ensureVisibleAtEnd) {
                            site.ensureVisible(site._selection._getFocused());
                        }
                    };
                    reorderedItems.getItems().then(function (items) {
                        var ds = site.itemDataSource;
                        if (dropIndex === -1) {
                            ds.beginEdits();
                            for (var i = items.length - 1; i >= 0; i--) {
                                ds.moveToStart(items[i].key);
                            }
                            ds.endEdits();
                            updateSelection(items);
                        } else {
                            var listBinding = ds.createListBinding();
                            listBinding.fromIndex(dropIndex).then(function (item) {
                                listBinding.release();
                                ds.beginEdits();
                                if (useMoveBefore) {
                                    for (var i = 0, len = items.length; i < len; i++) {
                                        ds.moveBefore(items[i].key, item.key);
                                    }
                                } else {
                                    for (var i = items.length - 1; i >= 0; i--) {
                                        ds.moveAfter(items[i].key, item.key);
                                    }
                                }
                                ds.endEdits();
                                updateSelection(items);
                            });
                        }
                    });
                },

                onDrop: function SelectionMode_onDrop(eventObject) {
                    // If the listview or the handler of the drop event we fire triggers a reorder, the dragged items can end up having different container nodes than what they started with.
                    // Because of that, we need to remove the footprint class from the item boxes' containers before we do any processing of the drop event.
                    if (this._draggedItemBoxes) {
                        for (var i = 0, len = this._draggedItemBoxes.length; i < len; i++) {
                            if (this._draggedItemBoxes[i].parentNode) {
                                _ElementUtilities.removeClass(this._draggedItemBoxes[i].parentNode, _Constants._footprintClass);
                            }
                        }
                    }
                    if (!this._dragBetweenDisabled) {
                        var cursorPosition = this._getPositionInCanvasSpace(eventObject);
                        var dropLocation = this.site._view.hitTest(cursorPosition.x, cursorPosition.y),
                            dropIndex = clampToRange(-1, this.site._cachedCount - 1, dropLocation.insertAfterIndex),
                            allowDrop = true;
                        // We don't fire dragBetween events during autoscroll, so if a user drops during autoscroll, we need to get up to date information
                        // on the drop location, and fire dragBetween before the insert so that the developer can prevent the drop if they choose.
                        if (!this._lastInsertPoint || this._lastInsertPoint.insertAfterIndex !== dropIndex || this._lastInsertPoint.index !== dropLocation.index) {
                            allowDrop = this._fireDragBetweenEvent(dropLocation.index, dropIndex, eventObject.dataTransfer);
                        }
                        if (allowDrop) {
                            this._lastInsertPoint = null;
                            this.site._layout.dragLeave();
                            if (this._fireDropEvent(dropLocation.index, dropIndex, eventObject.dataTransfer) && this._dragging && this.site.itemsReorderable) {
                                if (this._dragInfo.isEverything() || this.site._groupsEnabled()) {
                                    return;
                                }

                                dropIndex = this._findFirstAvailableInsertPoint(this._dragInfo, dropIndex, false);
                                this._reorderItems(dropIndex, this._dragInfo, this._draggingUnselectedItem);
                            }
                        }
                    }
                    this._clearDragProperties();
                    eventObject.preventDefault();
                },

                _checkAutoScroll: function (x, y) {
                    var viewportSize = this.site._getViewportLength(),
                        horizontal = this.site._horizontal(),
                        cursorPositionInViewport = (horizontal ? x : y),
                        canvasSize = this.site._viewport[horizontal ? "scrollWidth" : "scrollHeight"],
                        scrollPosition = Math.floor(this.site.scrollPosition),
                        travelRate = 0;

                    if (cursorPositionInViewport < _Constants._AUTOSCROLL_THRESHOLD) {
                        travelRate = cursorPositionInViewport - _Constants._AUTOSCROLL_THRESHOLD;
                    } else if (cursorPositionInViewport > (viewportSize - _Constants._AUTOSCROLL_THRESHOLD)) {
                        travelRate = (cursorPositionInViewport - (viewportSize - _Constants._AUTOSCROLL_THRESHOLD));
                    }
                    travelRate = Math.round((travelRate / _Constants._AUTOSCROLL_THRESHOLD) * (_Constants._MAX_AUTOSCROLL_RATE - _Constants._MIN_AUTOSCROLL_RATE));

                    // If we're at the edge of the content, we don't need to keep scrolling. We'll set travelRate to 0 to stop the autoscroll timer.
                    if ((scrollPosition === 0 && travelRate < 0) || (scrollPosition >= (canvasSize - viewportSize) && travelRate > 0)) {
                        travelRate = 0;
                    }
                    if (travelRate === 0) {
                        if (this._autoScrollDelay) {
                            _Global.clearTimeout(this._autoScrollDelay);
                            this._autoScrollDelay = 0;
                        }
                    } else {
                        if (!this._autoScrollDelay && !this._autoScrollFrame) {
                            var that = this;
                            this._autoScrollDelay = _Global.setTimeout(function () {
                                if (that._autoScrollRate) {
                                    that._lastDragTimeout = _BaseUtils._now();
                                    var nextFrame = function () {
                                        if ((!that._autoScrollRate && that._autoScrollFrame) || that.site._disposed) {
                                            that._stopAutoScroll();
                                        } else {
                                            // Timeout callbacks aren't reliably timed, so extra math is needed to figure out how far the scroll position should move since the last callback
                                            var currentTime = _BaseUtils._now();
                                            var delta = that._autoScrollRate * ((currentTime - that._lastDragTimeout) / 1000);
                                            delta = (delta < 0 ? Math.min(-1, delta) : Math.max(1, delta));
                                            var newScrollPos = {};
                                            newScrollPos[that.site._scrollProperty] = that.site._viewportScrollPosition + delta;
                                            _ElementUtilities.setScrollPosition(that.site._viewport, newScrollPos);
                                            that._lastDragTimeout = currentTime;
                                            that._autoScrollFrame = _BaseUtils._requestAnimationFrame(nextFrame);
                                        }
                                    };
                                    that._autoScrollFrame = _BaseUtils._requestAnimationFrame(nextFrame);
                                }
                            }, _Constants._AUTOSCROLL_DELAY);
                        }
                    }
                    this._autoScrollRate = travelRate;
                },

                _stopAutoScroll: function () {
                    if (this._autoScrollDelay) {
                        _Global.clearTimeout(this._autoScrollDelay);
                        this._autoScrollDelay = 0;
                    }
                    this._autoScrollRate = 0;
                    this._autoScrollFrame = 0;
                },

                onKeyDown: function SelectionMode_onKeyDown(eventObject) {
                    var that = this,
                        site = this.site,
                        swipeEnabled = site._swipeBehavior === _UI.SwipeBehavior.select,
                        view = site._view,
                        oldEntity = site._selection._getFocused(),
                        handled = true,
                        ctrlKeyDown = eventObject.ctrlKey;

                    function setNewFocus(newEntity, skipSelection, clampToBounds) {
                        function setNewFocusImpl(maxIndex) {
                            var moveView = true,
                                invalidIndex = false;
                            // Since getKeyboardNavigatedItem is purely geometry oriented, it can return us out of bounds numbers, so this check is necessary
                            if (clampToBounds) {
                                newEntity.index = Math.max(0, Math.min(maxIndex, newEntity.index));
                            } else if (newEntity.index < 0 || newEntity.index > maxIndex) {
                                invalidIndex = true;
                            }
                            if (!invalidIndex && (oldEntity.index !== newEntity.index || oldEntity.type !== newEntity.type)) {
                                var changeFocus = dispatchKeyboardNavigating(site._element, oldEntity, newEntity);
                                if (changeFocus) {
                                    moveView = false;

                                    // If the oldEntity is completely off-screen then we mimic the desktop
                                    // behavior. This is consistent with navbar keyboarding.
                                    if (that._setNewFocusItemOffsetPromise) {
                                        that._setNewFocusItemOffsetPromise.cancel();
                                    }
                                    site._batchViewUpdates(_Constants._ViewChange.realize, _Constants._ScrollToPriority.high, function () {
                                        that._setNewFocusItemOffsetPromise = site._getItemOffset(oldEntity, true).then(function (range) {
                                            range = site._convertFromCanvasCoordinates(range);
                                            var oldItemOffscreen = range.end <= site.scrollPosition || range.begin >= site.scrollPosition + site._getViewportLength() - 1;
                                            that._setNewFocusItemOffsetPromise = site._getItemOffset(newEntity).then(function (range) {
                                                that._setNewFocusItemOffsetPromise = null;
                                                var retVal = {
                                                    position: site.scrollPosition,
                                                    direction: "right"
                                                };
                                                if (oldItemOffscreen) {
                                                    // oldEntity is completely off-screen
                                                    site._selection._setFocused(newEntity, true);
                                                    range = site._convertFromCanvasCoordinates(range);
                                                    if (newEntity.index > oldEntity.index) {
                                                        retVal.direction = "right";
                                                        retVal.position = range.end - site._getViewportLength();
                                                    } else {
                                                        retVal.direction = "left";
                                                        retVal.position = range.begin;
                                                    }
                                                }
                                                site._changeFocus(newEntity, skipSelection, ctrlKeyDown, oldItemOffscreen, true);
                                                if (!oldItemOffscreen) {
                                                    return Promise.cancel;
                                                } else {
                                                    return retVal;
                                                }
                                            }, function (error) {
                                                site._changeFocus(newEntity, skipSelection, ctrlKeyDown, true, true);
                                                return Promise.wrapError(error);
                                            });
                                            return that._setNewFocusItemOffsetPromise;
                                        }, function (error) {
                                            site._changeFocus(newEntity, skipSelection, ctrlKeyDown, true, true);
                                            return Promise.wrapError(error);
                                        });
                                        return that._setNewFocusItemOffsetPromise;
                                    }, true);
                                }
                            }
                            // When a key is pressed, we want to make sure the current focus is in view. If the keypress is changing to a new valid index,
                            // _changeFocus will handle moving the viewport for us. If the focus isn't moving, though, we need to put the view back on
                            // the current item ourselves and call setFocused(oldFocus, true) to make sure that the listview knows the focused item was
                            // focused via keyboard and renders the rectangle appropriately.
                            if (moveView) {
                                site._selection._setFocused(oldEntity, true);
                                site.ensureVisible(oldEntity);
                            }
                            if (invalidIndex) {
                                return { type: _UI.ObjectType.item, index: _Constants._INVALID_INDEX };
                            } else {
                                return newEntity;
                            }
                        }

                        // We need to get the final item in the view so that we don't try setting focus out of bounds.
                        if (newEntity.type !== _UI.ObjectType.groupHeader) {
                            return view.finalItem().then(setNewFocusImpl);
                        } else {
                            return Promise.wrap(site._groups.length() - 1).then(setNewFocusImpl);
                        }
                    }

                    var Key = _ElementUtilities.Key,
                        keyCode = eventObject.keyCode,
                        rtl = site._rtl();

                    if (!this._isInteractive(eventObject.target)) {
                        if (eventObject.ctrlKey && !eventObject.altKey && !eventObject.shiftKey && this._keyboardAcceleratorHandlers[keyCode]) {
                            this._keyboardAcceleratorHandlers[keyCode]();
                        }
                        if (site.itemsReorderable && (!eventObject.ctrlKey && eventObject.altKey && eventObject.shiftKey && oldEntity.type === _UI.ObjectType.item) &&
                            (keyCode === Key.leftArrow || keyCode === Key.rightArrow || keyCode === Key.upArrow || keyCode === Key.downArrow)) {
                            var selection = site._selection,
                                focusedIndex = oldEntity.index,
                                movingUnselectedItem = false,
                                processReorder = true;
                            if (!selection.isEverything()) {
                                if (!selection._isIncluded(focusedIndex)) {
                                    var item = site._view.items.itemAt(focusedIndex);
                                    // Selected items should never be marked as non draggable, so we only need to check for nonDraggableClass when trying to reorder an unselected item.
                                    if (item && _ElementUtilities.hasClass(item, _Constants._nonDraggableClass)) {
                                        processReorder = false;
                                    } else {
                                        movingUnselectedItem = true;
                                        selection = new _SelectionManager._Selection(this.site, [{ firstIndex: focusedIndex, lastIndex: focusedIndex }]);
                                    }
                                }
                                if (processReorder) {
                                    var dropIndex = focusedIndex;
                                    if (keyCode === Key.rightArrow) {
                                        dropIndex += (rtl ? -1 : 1);
                                    } else if (keyCode === Key.leftArrow) {
                                        dropIndex += (rtl ? 1 : -1);
                                    } else if (keyCode === Key.upArrow) {
                                        dropIndex--;
                                    } else {
                                        dropIndex++;
                                    }
                                    // If the dropIndex is larger than the original index, we're trying to move items forward, so the search for the first unselected item to insert after should move forward.
                                    var movingAhead = (dropIndex > focusedIndex),
                                        searchForward = movingAhead;
                                    if (movingAhead && dropIndex >= this.site._cachedCount) {
                                        // If we're at the end of the list and trying to move items forward, dropIndex should be >= cachedCount.
                                        // That doesn't mean we don't have to do any reordering, though. A selection could be broken down into
                                        // a few blocks. We need to make the selection contiguous after this reorder, so we've got to search backwards
                                        // to find the first unselected item, then move everything in the selection after it.
                                        searchForward = false;
                                        dropIndex = this.site._cachedCount - 1;
                                    }
                                    dropIndex = this._findFirstAvailableInsertPoint(selection, dropIndex, searchForward);
                                    dropIndex = Math.min(Math.max(-1, dropIndex), this.site._cachedCount - 1);
                                    var reportedInsertAfterIndex = dropIndex - (movingAhead || dropIndex === -1 ? 0 : 1),
                                        reportedIndex = dropIndex,
                                        groupsEnabled = this.site._groupsEnabled();

                                    if (groupsEnabled) {
                                        // The indices we picked for the index/insertAfterIndex to report in our events is always correct in an ungrouped list,
                                        // and mostly correct in a grouped list. The only problem occurs when you move an item (or items) ahead into a new group,
                                        // or back into a previous group, such that the items should be the first/last in the group. Take this list as an example:
                                        // [Group A] [a] [b] [c] [Group B] [d] [e]
                                        // When [d] is focused, right/down arrow reports index: 4, insertAfterIndex: 4, which is right -- it means move [d] after [e].
                                        // Similarily, when [c] is focused and left/up is pressed, we report index: 1, insertAfterIndex: 0 -- move [c] to after [a].
                                        // Take note that index does not tell us where focus is / what item is being moved.
                                        // Like mouse/touch DnD, index tells us what the dragBetween slots would be were we to animate a dragBetween.
                                        // The problem cases are moving backwards into a previous group, or forward into the next group.
                                        // If [c] were focused and the user pressed right/down, we would report index: 3, insertAfterIndex: 3. In other words, move [c] after [d].
                                        // That's not right at all - [c] needs to become the first element of [Group B]. When we're moving ahead, then, and our dropIndex
                                        // is the first index of a new group, we adjust insertAfterIndex to be dropIndex - 1. Now we'll report index:3, insertAfterIndex: 2, which means
                                        // [c] is now the first element of [Group B], rather than the last element of [Group A]. This is exactly the same as what we would report when
                                        // the user mouse/touch drags [c] right before [d].
                                        // Similarily, when [d] is focused and we press left/up, without the logic below we would report index: 2, insertAfterIndex: 1, so we'd try to move
                                        // [d] ahead of [b]. Again, [d] first needs the opportunity to become the last element in [Group A], so we adjust the insertAfterIndex up by 1.
                                        // We then will report index:2, insertAfterIndex:2, meaning insert [d] in [Group A] after [c], which again mimics the mouse/touch API.
                                        var groups = this.site._groups,
                                            groupIndex = (dropIndex > -1 ? groups.groupFromItem(dropIndex) : 0);
                                        if (movingAhead) {
                                            if (groups.group(groupIndex).startIndex === dropIndex) {
                                                reportedInsertAfterIndex--;
                                            }
                                        } else if (groupIndex < (groups.length() - 1) && dropIndex === (groups.group(groupIndex + 1).startIndex - 1)) {
                                            reportedInsertAfterIndex++;
                                        }
                                    }

                                    if (this._fireDragBetweenEvent(reportedIndex, reportedInsertAfterIndex, null) && this._fireDropEvent(reportedIndex, reportedInsertAfterIndex, null)) {
                                        if (groupsEnabled) {
                                            return;
                                        }

                                        this._reorderItems(dropIndex, selection, movingUnselectedItem, !movingAhead, true);
                                    }
                                }
                            }
                        } else if (!eventObject.altKey) {

                            if (this._keyboardNavigationHandlers[keyCode]) {
                                this._keyboardNavigationHandlers[keyCode](oldEntity).then(function (newEntity) {
                                    var clampToBounds = that._keyboardNavigationHandlers[keyCode].clampToBounds;
                                    if (newEntity.type !== _UI.ObjectType.groupHeader && eventObject.shiftKey && site._selectionAllowed() && site._multiSelection()) {
                                        // Shift selection should work when shift or shift+ctrl are depressed
                                        if (site._selection._pivot === _Constants._INVALID_INDEX) {
                                            site._selection._pivot = oldEntity.index;
                                        }
                                        setNewFocus(newEntity, true, clampToBounds).then(function (newEntity) {
                                            if (newEntity.index !== _Constants._INVALID_INDEX) {
                                                var firstIndex = Math.min(newEntity.index, site._selection._pivot),
                                                    lastIndex = Math.max(newEntity.index, site._selection._pivot),
                                                    additive = (eventObject.ctrlKey || site._tap === _UI.TapBehavior.toggleSelect);
                                                that._selectRange(firstIndex, lastIndex, additive);
                                            }
                                        });
                                    } else {
                                        site._selection._pivot = _Constants._INVALID_INDEX;
                                        setNewFocus(newEntity, false, clampToBounds);
                                    }
                                });
                            } else if (!eventObject.ctrlKey && keyCode === Key.enter) {
                                var element = oldEntity.type === _UI.ObjectType.groupHeader ? site._groups.group(oldEntity.index).header : site._view.items.itemBoxAt(oldEntity.index);
                                if (element) {
                                    if (oldEntity.type === _UI.ObjectType.groupHeader) {
                                        this._pressedHeader = element;
                                        this._pressedItemBox = null;
                                        this._pressedContainer = null;
                                    } else {
                                        this._pressedItemBox = element;
                                        this._pressedContainer = site._view.items.containerAt(oldEntity.index);
                                        this._pressedHeader = null;
                                    }

                                    var allowed = this._verifySelectionAllowed(oldEntity);
                                    if (allowed.canTapSelect) {
                                        this._itemEventsHandler.handleTap(oldEntity);
                                    }
                                    this._fireInvokeEvent(oldEntity, element);
                                }
                            } else if (oldEntity.type !== _UI.ObjectType.groupHeader &&
                                    ((eventObject.ctrlKey && keyCode === Key.enter) ||
                                    (swipeEnabled && eventObject.shiftKey && keyCode === Key.F10) ||
                                    (swipeEnabled && keyCode === Key.menu) ||
                                    keyCode === Key.space)) {
                                // Swipe emulation
                                this._itemEventsHandler.handleSwipeBehavior(oldEntity.index);
                                site._changeFocus(oldEntity, true, ctrlKeyDown, false, true);
                            } else if (keyCode === Key.escape && site._selection.count() > 0) {
                                site._selection._pivot = _Constants._INVALID_INDEX;
                                site._selection.clear();
                            } else {
                                handled = false;
                            }
                        } else {
                            handled = false;
                        }

                        this._keyDownHandled = handled;
                        if (handled) {
                            eventObject.stopPropagation();
                            eventObject.preventDefault();
                        }
                    }

                    if (keyCode === Key.tab) {
                        this.site._keyboardFocusInbound = true;
                    }
                },

                onKeyUp: function (eventObject) {
                    if (this._keyDownHandled) {
                        eventObject.stopPropagation();
                        eventObject.preventDefault();
                    }
                },

                onTabEntered: function (eventObject) {
                    if (this.site._groups.length() === 0) {
                        return;
                    }

                    var site = this.site,
                        focused = site._selection._getFocused(),
                        forward = eventObject.detail;

                    // We establish whether focus is incoming on the ListView by checking keyboard focus and the srcElement.
                    // If the ListView did not have keyboard focus, then it is definitely incoming since keyboard focus is cleared
                    // on blur which works for 99% of all scenarios. When the ListView is the only tabbable element on the page,
                    // then tabbing out of the ListView will make focus wrap around and focus the ListView again. The blur event is
                    // handled after TabEnter, so the keyboard focus flag is not yet cleared. Therefore, we examine the srcElement and see
                    // if it is the _viewport since it is the first tabbable element in the ListView DOM tree.
                    var inboundFocus = !site._hasKeyboardFocus || eventObject.target === site._viewport;
                    if (inboundFocus) {
                        this.inboundFocusHandled = true;

                        // We tabbed into the ListView
                        focused.index = (focused.index === _Constants._INVALID_INDEX ? 0 : focused.index);

                        if (forward || !this.site._supportsGroupHeaderKeyboarding) {
                            // We tabbed into the ListView from before the ListView, so focus should go to items
                            var entity = { type: _UI.ObjectType.item };
                            if (focused.type === _UI.ObjectType.groupHeader) {
                                entity.index = site._groupFocusCache.getIndexForGroup(focused.index);
                                if (dispatchKeyboardNavigating(site._element, focused, entity)) {
                                    site._changeFocus(entity, true, false, false, true);
                                } else {
                                    site._changeFocus(focused, true, false, false, true);
                                }
                            } else {
                                entity.index = focused.index;
                                site._changeFocus(entity, true, false, false, true);
                            }
                            eventObject.preventDefault();
                        } else {
                            // We tabbed into the ListView from after the ListView, focus should go to headers
                            var entity = { type: _UI.ObjectType.groupHeader };
                            if (focused.type !== _UI.ObjectType.groupHeader) {
                                entity.index = site._groups.groupFromItem(focused.index);
                                if (dispatchKeyboardNavigating(site._element, focused, entity)) {
                                    site._changeFocus(entity, true, false, false, true);
                                } else {
                                    site._changeFocus(focused, true, false, false, true);
                                }
                            } else {
                                entity.index = focused.index;
                                site._changeFocus(entity, true, false, false, true);
                            }
                            eventObject.preventDefault();
                        }
                    }
                },

                onTabExiting: function (eventObject) {
                    if (!this.site._supportsGroupHeaderKeyboarding || this.site._groups.length() === 0) {
                        return;
                    }

                    var site = this.site,
                        focused = site._selection._getFocused(),
                        forward = eventObject.detail;

                    if (forward && focused.type !== _UI.ObjectType.groupHeader) {
                        // Tabbing and we were focusing an item, go to headers
                        var entity = { type: _UI.ObjectType.groupHeader, index: site._groups.groupFromItem(focused.index) };
                        if (dispatchKeyboardNavigating(site._element, focused, entity)) {
                            site._changeFocus(entity, true, false, false, true);
                            eventObject.preventDefault();
                        }
                    } else if (!forward && focused.type === _UI.ObjectType.groupHeader) {
                        // Shift tabbing and we were focusing a header, go to items
                        var entity = { type: _UI.ObjectType.item, index: site._groupFocusCache.getIndexForGroup(focused.index) };
                        if (dispatchKeyboardNavigating(site._element, focused, entity)) {
                            site._changeFocus(entity, true, false, false, true);
                            eventObject.preventDefault();
                        }
                    }
                }
            });
            return _SelectionMode;
        })
    });

});

// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Controls/ListView/_ErrorMessages',[
        'exports',
        '../../Core/_Base',
        '../../Core/_Resources'
    ], function errorMessagesInit(exports, _Base, _Resources) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, null, {

        modeIsInvalid: {
            get: function () { return "Invalid argument: mode must be one of following values: 'none', 'single' or 'multi'."; }
        },

        loadingBehaviorIsDeprecated: {
            get: function () { return "Invalid configuration: loadingBehavior is deprecated. The control will default this property to 'randomAccess'. Please refer to the 'ListView loading behaviors' SDK Sample for guidance on how to implement incremental load behavior."; }
        },

        pagesToLoadIsDeprecated: {
            get: function () { return "Invalid configuration: pagesToLoad is deprecated. The control will not use this property. Please refer to the 'ListView loading behaviors' SDK Sample for guidance on how to implement incremental load behavior."; }
        },

        pagesToLoadThresholdIsDeprecated: {
            get: function () { return "Invalid configuration: pagesToLoadThreshold is deprecated.  The control will not use this property. Please refer to the 'ListView loading behaviors' SDK Sample for guidance on how to implement incremental load behavior."; }
        },

        automaticallyLoadPagesIsDeprecated: {
            get: function () { return "Invalid configuration: automaticallyLoadPages is deprecated. The control will default this property to false. Please refer to the 'ListView loading behaviors' SDK Sample for guidance on how to implement incremental load behavior."; }
        },

        invalidTemplate: {
            get: function () { return "Invalid template: Templates must be created before being passed to the ListView, and must contain a valid tree of elements."; }
        },

        loadMorePagesIsDeprecated: {
            get: function () { return "loadMorePages is deprecated. Invoking this function will not have any effect. Please refer to the 'ListView loading behaviors' SDK Sample for guidance on how to implement incremental load behavior."; }
        },

        disableBackdropIsDeprecated: {
            get: function () { return "Invalid configuration: disableBackdrop is deprecated. Style: .win-listview .win-container.win-backdrop { background-color:transparent; } instead."; }
        },

        backdropColorIsDeprecated: {
            get: function () { return "Invalid configuration: backdropColor is deprecated. Style: .win-listview .win-container.win-backdrop { rgba(155,155,155,0.23); } instead."; }
        },

        itemInfoIsDeprecated: {
            get: function () { return "GridLayout.itemInfo may be altered or unavailable in future versions. Instead, use CellSpanningLayout."; }
        },

        groupInfoIsDeprecated: {
            get: function () { return "GridLayout.groupInfo may be altered or unavailable in future versions. Instead, use CellSpanningLayout."; }
        },

        resetItemIsDeprecated: {
            get: function () { return "resetItem may be altered or unavailable in future versions. Instead, mark the element as disposable using WinJS.Utilities.markDisposable."; }
        },

        resetGroupHeaderIsDeprecated: {
            get: function () { return "resetGroupHeader may be altered or unavailable in future versions. Instead, mark the header element as disposable using WinJS.Utilities.markDisposable."; }
        },

        maxRowsIsDeprecated: {
            get: function () { return "GridLayout.maxRows may be altered or unavailable in future versions. Instead, use the maximumRowsOrColumns property."; }
        }
    });

});

// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Controls/ListView/_GroupFocusCache',[
    'exports',
    '../../Core/_Base'
    ], function GroupFocusCacheInit(exports, _Base) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        _GroupFocusCache: _Base.Namespace._lazy(function () {
            return _Base.Class.define(function GroupFocusCache_ctor(listView) {
                this._listView = listView;
                this.clear();
            }, {
                // We store indices as strings in the cache so index=0 does not evaluate to false as
                // when we check for the existance of an index in the cache. The index is converted
                // back into a number when calling getIndexForGroup

                updateCache: function (groupKey, itemKey, itemIndex) {
                    itemIndex = "" + itemIndex;
                    this._itemToIndex[itemKey] = itemIndex;
                    this._groupToItem[groupKey] = itemKey;
                },

                deleteItem: function (itemKey) {
                    if (!this._itemToIndex[itemKey]) {
                        return;
                    }

                    var that = this;
                    var keys = Object.keys(this._groupToItem);
                    for (var i = 0, len = keys.length; i < len; i++) {
                        var key = keys[i];
                        if (that._groupToItem[key] === itemKey) {
                            that.deleteGroup(key);
                            break;
                        }
                    }
                },

                deleteGroup: function (groupKey) {
                    var itemKey = this._groupToItem[groupKey];
                    if (itemKey) {
                        delete this._itemToIndex[itemKey];
                    }
                    delete this._groupToItem[groupKey];
                },

                updateItemIndex: function (itemKey, itemIndex) {
                    if (!this._itemToIndex[itemKey]) {
                        return;
                    }
                    this._itemToIndex[itemKey] = "" + itemIndex;
                },

                getIndexForGroup: function (groupIndex) {
                    var groupKey = this._listView._groups.group(groupIndex).key;

                    var itemKey = this._groupToItem[groupKey];
                    if (itemKey && this._itemToIndex[itemKey]) {
                        return +this._itemToIndex[itemKey];
                    } else {
                        return this._listView._groups.fromKey(groupKey).group.startIndex;
                    }
                },

                clear: function () {
                    this._groupToItem = {};
                    this._itemToIndex = {};
                }
            });
        }),

        _UnsupportedGroupFocusCache: _Base.Namespace._lazy(function () {
            return _Base.Class.define(null, {
                updateCache: function () {
                },

                deleteItem: function () {
                },

                deleteGroup: function () {
                },

                updateItemIndex: function () {
                },

                getIndexForGroup: function () {
                    return 0;
                },

                clear: function () {
                }
            });
        })
    });

});
// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Controls/ListView/_GroupsContainer',[
    'exports',
    '../../Core/_Base',
    '../../Promise',
    '../../Utilities/_Dispose',
    '../../Utilities/_ElementUtilities',
    '../../Utilities/_ItemsManager',
    '../../Utilities/_UI',
    '../ItemContainer/_Constants'
    ], function groupsContainerInit(exports, _Base, Promise, _Dispose, _ElementUtilities, _ItemsManager, _UI, _Constants) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        _GroupsContainerBase: _Base.Namespace._lazy(function () {
            return _Base.Class.define(function () {
            }, {
                index: function (element) {
                    var header = this.headerFrom(element);
                    if (header) {
                        for (var i = 0, len = this.groups.length; i < len; i++) {
                            if (header === this.groups[i].header) {
                                return i;
                            }
                        }
                    }
                    return _Constants._INVALID_INDEX;
                },

                headerFrom: function (element) {
                    while (element && !_ElementUtilities.hasClass(element, _Constants._headerClass)) {
                        element = element.parentNode;
                    }
                    return element;
                },

                requestHeader: function GroupsContainerBase_requestHeader(index) {
                    this._waitingHeaderRequests = this._waitingHeaderRequests || {};
                    if (!this._waitingHeaderRequests[index]) {
                        this._waitingHeaderRequests[index] = [];
                    }

                    var that = this;
                    return new Promise(function (complete) {
                        var group = that.groups[index];
                        if (group && group.header) {
                            complete(group.header);
                        } else {
                            that._waitingHeaderRequests[index].push(complete);
                        }
                    });
                },

                notify: function GroupsContainerBase_notify(index, header) {
                    if (this._waitingHeaderRequests && this._waitingHeaderRequests[index]) {
                        var requests = this._waitingHeaderRequests[index];
                        for (var i = 0, len = requests.length; i < len; i++) {
                            requests[i](header);
                        }

                        this._waitingHeaderRequests[index] = [];
                    }
                },

                groupFromImpl: function GroupsContainerBase_groupFromImpl(fromGroup, toGroup, comp) {
                    if (toGroup < fromGroup) {
                        return null;
                    }

                    var center = fromGroup + Math.floor((toGroup - fromGroup) / 2),
                        centerGroup = this.groups[center];

                    if (comp(centerGroup, center)) {
                        return this.groupFromImpl(fromGroup, center - 1, comp);
                    } else if (center < toGroup && !comp(this.groups[center + 1], center + 1)) {
                        return this.groupFromImpl(center + 1, toGroup, comp);
                    } else {
                        return center;
                    }
                },

                groupFrom: function GroupsContainerBase_groupFrom(comp) {
                    if (this.groups.length > 0) {
                        var lastGroupIndex = this.groups.length - 1,
                            lastGroup = this.groups[lastGroupIndex];

                        if (!comp(lastGroup, lastGroupIndex)) {
                            return lastGroupIndex;
                        } else {
                            return this.groupFromImpl(0, this.groups.length - 1, comp);
                        }
                    } else {
                        return null;
                    }
                },

                groupFromItem: function GroupsContainerBase_groupFromItem(itemIndex) {
                    return this.groupFrom(function (group) {
                        return itemIndex < group.startIndex;
                    });
                },

                groupFromOffset: function GroupsContainerBase_groupFromOffset(offset) {
                    return this.groupFrom(function (group) {
                        return offset < group.offset;
                    });
                },

                group: function GroupsContainerBase_getGroup(index) {
                    return this.groups[index];
                },

                length: function GroupsContainerBase_length() {
                    return this.groups.length;
                },

                cleanUp: function GroupsContainerBase_cleanUp() {
                    if (this.listBinding) {
                        for (var i = 0, len = this.groups.length; i < len; i++) {
                            var group = this.groups[i];
                            if (group.userData) {
                                this.listBinding.releaseItem(group.userData);
                            }
                        }
                        this.listBinding.release();
                    }
                },

                _dispose: function GroupsContainerBase_dispose() {
                    this.cleanUp();
                },

                synchronizeGroups: function GroupsContainerBase_synchronizeGroups() {
                    var that = this;

                    this.pendingChanges = [];
                    this.ignoreChanges = true;
                    return this.groupDataSource.invalidateAll().then(function () {
                        return Promise.join(that.pendingChanges);
                    }).then(function () {
                        if (that._listView._ifZombieDispose()) {
                            return Promise.cancel;
                        }
                    }).then(
                        function () {
                            that.ignoreChanges = false;
                        },
                        function (error) {
                            that.ignoreChanges = false;
                            return Promise.wrapError(error);
                        }
                    );
                },

                fromKey: function GroupsContainerBase_fromKey(key) {
                    for (var i = 0, len = this.groups.length; i < len; i++) {
                        var group = this.groups[i];
                        if (group.key === key) {
                            return {
                                group: group,
                                index: i
                            };
                        }
                    }
                    return null;
                },

                fromHandle: function GroupsContainerBase_fromHandle(handle) {
                    for (var i = 0, len = this.groups.length; i < len; i++) {
                        var group = this.groups[i];
                        if (group.handle === handle) {
                            return {
                                group: group,
                                index: i
                            };
                        }
                    }
                    return null;
                }
            });
        }),

        _UnvirtualizedGroupsContainer: _Base.Namespace._lazy(function () {
            return _Base.Class.derive(exports._GroupsContainerBase, function (listView, groupDataSource) {
                this._listView = listView;
                this.groupDataSource = groupDataSource;
                this.groups = [];
                this.pendingChanges = [];
                this.dirty = true;

                var that = this,
                notificationHandler = {
                    beginNotifications: function GroupsContainer_beginNotifications() {
                        that._listView._versionManager.beginNotifications();
                    },

                    endNotifications: function GroupsContainer_endNotifications() {
                        that._listView._versionManager.endNotifications();

                        if (that._listView._ifZombieDispose()) { return; }

                        if (!that.ignoreChanges && that._listView._groupsChanged) {
                            that._listView._scheduleUpdate();
                        }
                    },

                    indexChanged: function GroupsContainer_indexChanged() {
                        that._listView._versionManager.receivedNotification();

                        if (that._listView._ifZombieDispose()) { return; }

                        this.scheduleUpdate();
                    },

                    itemAvailable: function GroupsContainer_itemAvailable() {
                    },

                    countChanged: function GroupsContainer_countChanged(newCount) {
                        that._listView._versionManager.receivedNotification();

                        that._listView._writeProfilerMark("groupCountChanged(" + newCount + "),info");

                        if (that._listView._ifZombieDispose()) { return; }

                        this.scheduleUpdate();
                    },

                    changed: function GroupsContainer_changed(newItem) {
                        that._listView._versionManager.receivedNotification();

                        if (that._listView._ifZombieDispose()) { return; }

                        var groupEntry = that.fromKey(newItem.key);
                        if (groupEntry) {
                            that._listView._writeProfilerMark("groupChanged(" + groupEntry.index + "),info");

                            groupEntry.group.userData = newItem;
                            groupEntry.group.startIndex = newItem.firstItemIndexHint;
                            this.markToRemove(groupEntry.group);
                        }

                        this.scheduleUpdate();
                    },

                    removed: function GroupsContainer_removed(itemHandle) {
                        that._listView._versionManager.receivedNotification();
                        that._listView._groupRemoved(itemHandle);

                        if (that._listView._ifZombieDispose()) { return; }

                        var groupEntry = that.fromHandle(itemHandle);
                        if (groupEntry) {
                            that._listView._writeProfilerMark("groupRemoved(" + groupEntry.index + "),info");

                            that.groups.splice(groupEntry.index, 1);
                            var index = that.groups.indexOf(groupEntry.group, groupEntry.index);

                            if (index > -1) {
                                that.groups.splice(index, 1);
                            }

                            this.markToRemove(groupEntry.group);
                        }

                        this.scheduleUpdate();
                    },

                    inserted: function GroupsContainer_inserted(itemPromise, previousHandle, nextHandle) {
                        that._listView._versionManager.receivedNotification();

                        if (that._listView._ifZombieDispose()) { return; }

                        that._listView._writeProfilerMark("groupInserted,info");

                        var notificationHandler = this;
                        itemPromise.retain().then(function (item) {

                            var index;
                            if (!previousHandle && !nextHandle && !that.groups.length) {
                                index = 0;
                            } else {
                                index = notificationHandler.findIndex(previousHandle, nextHandle);
                            }
                            if (index !== -1) {
                                var newGroup = {
                                    key: item.key,
                                    startIndex: item.firstItemIndexHint,
                                    userData: item,
                                    handle: itemPromise.handle
                                };

                                that.groups.splice(index, 0, newGroup);
                            }
                            notificationHandler.scheduleUpdate();
                        });
                        that.pendingChanges.push(itemPromise);
                    },

                    moved: function GroupsContainer_moved(itemPromise, previousHandle, nextHandle) {
                        that._listView._versionManager.receivedNotification();

                        if (that._listView._ifZombieDispose()) { return; }

                        that._listView._writeProfilerMark("groupMoved,info");

                        var notificationHandler = this;
                        itemPromise.then(function (item) {
                            var newIndex = notificationHandler.findIndex(previousHandle, nextHandle),
                                groupEntry = that.fromKey(item.key);

                            if (groupEntry) {
                                that.groups.splice(groupEntry.index, 1);

                                if (newIndex !== -1) {
                                    if (groupEntry.index < newIndex) {
                                        newIndex--;
                                    }

                                    groupEntry.group.key = item.key;
                                    groupEntry.group.userData = item;
                                    groupEntry.group.startIndex = item.firstItemIndexHint;
                                    that.groups.splice(newIndex, 0, groupEntry.group);
                                }

                            } else if (newIndex !== -1) {
                                var newGroup = {
                                    key: item.key,
                                    startIndex: item.firstItemIndexHint,
                                    userData: item,
                                    handle: itemPromise.handle
                                };
                                that.groups.splice(newIndex, 0, newGroup);
                                itemPromise.retain();
                            }

                            notificationHandler.scheduleUpdate();
                        });
                        that.pendingChanges.push(itemPromise);
                    },

                    reload: function GroupsContainer_reload() {
                        that._listView._versionManager.receivedNotification();

                        if (that._listView._ifZombieDispose()) {
                            return;
                        }

                        that._listView._processReload();
                    },

                    markToRemove: function GroupsContainer_markToRemove(group) {
                        if (group.header) {
                            var header = group.header;
                            group.header = null;
                            group.left = -1;
                            group.width = -1;
                            group.decorator = null;
                            group.tabIndex = -1;
                            header.tabIndex = -1;

                            that._listView._groupsToRemove[_ElementUtilities._uniqueID(header)] = { group: group, header: header };
                        }
                    },

                    scheduleUpdate: function GroupsContainer_scheduleUpdate() {
                        that.dirty = true;
                        if (!that.ignoreChanges) {
                            that._listView._groupsChanged = true;
                        }
                    },

                    findIndex: function GroupsContainer_findIndex(previousHandle, nextHandle) {
                        var index = -1,
                            groupEntry;

                        if (previousHandle) {
                            groupEntry = that.fromHandle(previousHandle);
                            if (groupEntry) {
                                index = groupEntry.index + 1;
                            }
                        }

                        if (index === -1 && nextHandle) {
                            groupEntry = that.fromHandle(nextHandle);
                            if (groupEntry) {
                                index = groupEntry.index;
                            }
                        }

                        return index;
                    },

                    removeElements: function GroupsContainer_removeElements(group) {
                        if (group.header) {
                            var parentNode = group.header.parentNode;
                            if (parentNode) {
                                _Dispose.disposeSubTree(group.header);
                                parentNode.removeChild(group.header);
                            }
                            group.header = null;
                            group.left = -1;
                            group.width = -1;
                        }
                    }
                };

                this.listBinding = this.groupDataSource.createListBinding(notificationHandler);
            }, {
                initialize: function UnvirtualizedGroupsContainer_initialize() {
                    if (this.initializePromise) {
                        this.initializePromise.cancel();
                    }

                    this._listView._writeProfilerMark("GroupsContainer_initialize,StartTM");

                    var that = this;
                    this.initializePromise = this.groupDataSource.getCount().then(function (count) {
                        var promises = [];
                        for (var i = 0; i < count; i++) {
                            promises.push(that.listBinding.fromIndex(i).retain());
                        }
                        return Promise.join(promises);
                    }).then(
                        function (groups) {
                            that.groups = [];

                            for (var i = 0, len = groups.length; i < len; i++) {
                                var group = groups[i];

                                that.groups.push({
                                    key: group.key,
                                    startIndex: group.firstItemIndexHint,
                                    handle: group.handle,
                                    userData: group,
                                });
                            }
                            that._listView._writeProfilerMark("GroupsContainer_initialize groups(" + groups.length + "),info");
                            that._listView._writeProfilerMark("GroupsContainer_initialize,StopTM");
                        },
                        function (error) {
                            that._listView._writeProfilerMark("GroupsContainer_initialize,StopTM");
                            return Promise.wrapError(error);
                        });
                    return this.initializePromise;
                },

                renderGroup: function UnvirtualizedGroupsContainer_renderGroup(index) {
                    if (this._listView.groupHeaderTemplate) {
                        var group = this.groups[index];
                        return Promise.wrap(this._listView._groupHeaderRenderer(Promise.wrap(group.userData))).then(_ItemsManager._normalizeRendererReturn);
                    } else {
                        return Promise.wrap(null);
                    }
                },

                setDomElement: function UnvirtualizedGroupsContainer_setDomElement(index, headerElement) {
                    this.groups[index].header = headerElement;
                    this.notify(index, headerElement);
                },

                removeElements: function UnvirtualizedGroupsContainer_removeElements() {
                    var elements = this._listView._groupsToRemove || {},
                        keys = Object.keys(elements),
                        focusedItemPurged = false;

                    var focused = this._listView._selection._getFocused();
                    for (var i = 0, len = keys.length; i < len; i++) {
                        var group = elements[keys[i]],
                            header = group.header,
                            groupData = group.group;

                        if (!focusedItemPurged && focused.type === _UI.ObjectType.groupHeader && groupData.userData.index === focused.index) {
                            this._listView._unsetFocusOnItem();
                            focusedItemPurged = true;
                        }

                        if (header) {
                            var parentNode = header.parentNode;
                            if (parentNode) {
                                _Dispose._disposeElement(header);
                                parentNode.removeChild(header);
                            }
                        }
                    }

                    if (focusedItemPurged) {
                        this._listView._setFocusOnItem(focused);
                    }

                    this._listView._groupsToRemove = {};
                },

                resetGroups: function UnvirtualizedGroupsContainer_resetGroups() {
                    var groups = this.groups.slice(0);

                    for (var i = 0, len = groups.length; i < len; i++) {
                        var group = groups[i];

                        if (this.listBinding && group.userData) {
                            this.listBinding.releaseItem(group.userData);
                        }
                    }

                    // Set the lengths to zero to clear the arrays, rather than setting = [], which re-instantiates
                    this.groups.length = 0;
                    this.dirty = true;
                }
            });
        }),

        _NoGroups: _Base.Namespace._lazy(function () {
            return _Base.Class.derive(exports._GroupsContainerBase, function (listView) {
                this._listView = listView;
                this.groups = [{ startIndex: 0 }];
                this.dirty = true;
            }, {
                synchronizeGroups: function () {
                    return Promise.wrap();
                },

                addItem: function () {
                    return Promise.wrap(this.groups[0]);
                },

                resetGroups: function () {
                    this.groups = [{ startIndex: 0 }];
                    delete this.pinnedItem;
                    delete this.pinnedOffset;
                    this.dirty = true;
                },

                renderGroup: function () {
                    return Promise.wrap(null);
                },

                ensureFirstGroup: function () {
                    return Promise.wrap(this.groups[0]);
                },

                groupOf: function () {
                    return Promise.wrap(this.groups[0]);
                },

                removeElements: function () {
                }
            });
        })
    });

});

// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Controls/ListView/_Helpers',[
    'exports',
    '../../Core/_Base',
    '../../Animations'
    ], function helpersInit(exports, _Base, Animations) {
    "use strict";

    function nodeListToArray(nodeList) {
        return Array.prototype.slice.call(nodeList);
    }

    function repeat(markup, count) {
        return new Array(count + 1).join(markup);
    }

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        _nodeListToArray: nodeListToArray,
        _repeat: repeat,
        _ListViewAnimationHelper: {
            fadeInElement: function (element) {
                return Animations.fadeIn(element);
            },
            fadeOutElement: function (element) {
                return Animations.fadeOut(element);
            },
            animateEntrance: function (canvas, firstEntrance) {
                return Animations.enterContent(canvas, [{ left: firstEntrance ? "100px" : "40px", top: "0px", rtlflip: true }], { mechanism: "transition" });
            },
        }
    });
});

// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Controls/ListView/_ItemsContainer',[
    'exports',
    '../../Core/_Base',
    '../../Promise',
    '../../Utilities/_ElementUtilities',
    '../ItemContainer/_Constants'
    ], function itemsContainerInit(exports, _Base, Promise, _ElementUtilities, _Constants) {
    "use strict";

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        _ItemsContainer: _Base.Namespace._lazy(function () {

            var _ItemsContainer = function (site) {
                this.site = site;
                this._itemData = {};
                this.waitingItemRequests = {};
            };
            _ItemsContainer.prototype = {
                requestItem: function ItemsContainer_requestItem(itemIndex) {
                    if (!this.waitingItemRequests[itemIndex]) {
                        this.waitingItemRequests[itemIndex] = [];
                    }

                    var that = this;
                    var promise = new Promise(function (complete) {
                        var itemData = that._itemData[itemIndex];
                        if (itemData && !itemData.detached && itemData.element) {
                            complete(itemData.element);
                        } else {
                            that.waitingItemRequests[itemIndex].push(complete);
                        }
                    });

                    return promise;
                },

                removeItem: function (index) {
                    delete this._itemData[index];
                },

                removeItems: function ItemsContainer_removeItems() {
                    this._itemData = {};
                    this.waitingItemRequests = {};
                },

                setItemAt: function ItemsContainer_setItemAt(itemIndex, itemData) {
                    this._itemData[itemIndex] = itemData;
                    if (!itemData.detached) {
                        this.notify(itemIndex, itemData);
                    }
                },

                notify: function ItemsContainer_notify(itemIndex, itemData) {
                    if (this.waitingItemRequests[itemIndex]) {
                        var requests = this.waitingItemRequests[itemIndex];
                        for (var i = 0; i < requests.length; i++) {
                            requests[i](itemData.element);
                        }

                        this.waitingItemRequests[itemIndex] = [];
                    }
                },

                elementAvailable: function ItemsContainer_elementAvailable(itemIndex) {
                    var itemData = this._itemData[itemIndex];
                    itemData.detached = false;
                    this.notify(itemIndex, itemData);
                },

                itemAt: function ItemsContainer_itemAt(itemIndex) {
                    var itemData = this._itemData[itemIndex];
                    return itemData ? itemData.element : null;
                },

                itemDataAt: function ItemsContainer_itemDataAt(itemIndex) {
                    return this._itemData[itemIndex];
                },

                containerAt: function ItemsContainer_containerAt(itemIndex) {
                    var itemData = this._itemData[itemIndex];
                    return itemData ? itemData.container : null;
                },

                itemBoxAt: function ItemsContainer_itemBoxAt(itemIndex) {
                    var itemData = this._itemData[itemIndex];
                    return itemData ? itemData.itemBox : null;
                },

                itemBoxFrom: function ItemsContainer_containerFrom(element) {
                    while (element && !_ElementUtilities.hasClass(element, _Constants._itemBoxClass)) {
                        element = element.parentNode;
                    }

                    return element;
                },

                containerFrom: function ItemsContainer_containerFrom(element) {
                    while (element && !_ElementUtilities.hasClass(element, _Constants._containerClass)) {
                        element = element.parentNode;
                    }

                    return element;
                },

                index: function ItemsContainer_index(element) {
                    var item = this.containerFrom(element);
                    if (item) {
                        for (var index in this._itemData) {
                            if (this._itemData[index].container === item) {
                                return parseInt(index, 10);
                            }
                        }
                    }

                    return _Constants._INVALID_INDEX;
                },

                each: function ItemsContainer_each(callback) {
                    for (var index in this._itemData) {
                        if (this._itemData.hasOwnProperty(index)) {
                            var itemData = this._itemData[index];
                            callback(parseInt(index, 10), itemData.element, itemData);
                        }
                    }
                },

                eachIndex: function ItemsContainer_each(callback) {
                    for (var index in this._itemData) {
                        if (callback(parseInt(index, 10))) {
                            break;
                        }
                    }
                },

                count: function ItemsContainer_count() {
                    return Object.keys(this._itemData).length;
                }
            };
            return _ItemsContainer;
        })
    });

});

// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Controls/ListView/_Layouts',[
    'exports',
    '../../Core/_Global',
    '../../Core/_Base',
    '../../Core/_BaseUtils',
    '../../Core/_ErrorFromName',
    '../../Core/_Resources',
    '../../Core/_WriteProfilerMark',
    '../../Animations/_TransitionAnimation',
    '../../Promise',
    '../../Scheduler',
    '../../_Signal',
    '../../Utilities/_Dispose',
    '../../Utilities/_ElementUtilities',
    '../../Utilities/_SafeHtml',
    '../../Utilities/_UI',
    '../ItemContainer/_Constants',
    './_ErrorMessages'
    ], function layouts2Init(exports, _Global, _Base, _BaseUtils, _ErrorFromName, _Resources, _WriteProfilerMark, _TransitionAnimation, Promise, Scheduler, _Signal, _Dispose, _ElementUtilities, _SafeHtml, _UI, _Constants, _ErrorMessages) {
    "use strict";

    var Key = _ElementUtilities.Key,
        uniqueID = _ElementUtilities._uniqueID;

    var strings = {
        get itemInfoIsInvalid() { return "Invalid argument: An itemInfo function must be provided which returns an object with numeric width and height properties."; },
        get groupInfoResultIsInvalid() { return "Invalid result: groupInfo result for cell spanning groups must include the following numeric properties: cellWidth and cellHeight."; }
    };

    //
    // Helpers for dynamic CSS rules
    //
    // Rule deletions are delayed until the next rule insertion. This helps the
    // scenario where a ListView changes layouts. By doing the rule manipulations
    // in a single synchronous block, IE will do 1 layout pass instead of 2.
    //

    // Dynamic CSS rules will be added to this style element
    var layoutStyleElem = _Global.document.createElement("style");
    _Global.document.head.appendChild(layoutStyleElem);

    var nextCssClassId = 0,
        staleClassNames = [];

    // The prefix for the class name should not contain dashes
    function uniqueCssClassName(prefix) {
        return "_win-dynamic-" + prefix + "-" + (nextCssClassId++);
    }

    var browserStyleEquivalents = _BaseUtils._browserStyleEquivalents;
    var transformNames = browserStyleEquivalents["transform"];
    var transitionScriptName = _BaseUtils._browserStyleEquivalents["transition"].scriptName;
    var dragBetweenTransition = transformNames.cssName + " cubic-bezier(0.1, 0.9, 0.2, 1) 167ms";
    var dragBetweenDistance = 12;

    // Removes the dynamic CSS rules corresponding to the classes in staleClassNames
    // from the DOM.
    function flushDynamicCssRules() {
        var rules = layoutStyleElem.sheet.cssRules,
            classCount = staleClassNames.length,
            i,
            j,
            ruleSuffix;

        for (i = 0; i < classCount; i++) {
            ruleSuffix = "." + staleClassNames[i] + " ";
            for (j = rules.length - 1; j >= 0; j--) {
                if (rules[j].selectorText.indexOf(ruleSuffix) !== -1) {
                    layoutStyleElem.sheet.deleteRule(j);
                }
            }
        }
        staleClassNames = [];
    }

    // Creates a dynamic CSS rule and adds it to the DOM. uniqueToken is a class name
    // which uniquely identifies a set of related rules. These rules may be removed
    // using deleteDynamicCssRule. uniqueToken should be created using uniqueCssClassName.
    function addDynamicCssRule(uniqueToken, site, selector, body) {
        flushDynamicCssRules();
        var rule = "." + _Constants._listViewClass + " ." + uniqueToken + " " + selector + " { " +
             body +
        "}";
        var perfId = "_addDynamicCssRule:" + uniqueToken + ",info";
        if (site) {
            site._writeProfilerMark(perfId);
        } else {
            _WriteProfilerMark("WinJS.UI.ListView:Layout" + perfId);
        }
        layoutStyleElem.sheet.insertRule(rule, 0);
    }

    // Marks the CSS rules corresponding to uniqueToken for deletion. The rules
    // should have been added by addDynamicCssRule.
    function deleteDynamicCssRule(uniqueToken) {
        staleClassNames.push(uniqueToken);
    }

    //
    // Helpers shared by all layouts
    //

    // Clamps x to the range first <= x <= last
    function clampToRange(first, last, x) {
        return Math.max(first, Math.min(last, x));
    }

    function getDimension(element, property) {
        return _ElementUtilities.convertToPixels(element, _Global.getComputedStyle(element, null)[property]);
    }

    // Returns the sum of the margin, border, and padding for the side of the
    // element specified by side. side can be "Left", "Right", "Top", or "Bottom".
    function getOuter(side, element) {
        return getDimension(element, "margin" + side) +
            getDimension(element, "border" + side + "Width") +
            getDimension(element, "padding" + side);
    }

    // Returns the total height of element excluding its content height
    function getOuterHeight(element) {
        return getOuter("Top", element) + getOuter("Bottom", element);
    }

    // Returns the total width of element excluding its content width
    function getOuterWidth(element) {
        return getOuter("Left", element) + getOuter("Right", element);
    }

    function forEachContainer(itemsContainer, callback) {
        if (itemsContainer.items) {
            for (var i = 0, len = itemsContainer.items.length; i < len; i++) {
                callback(itemsContainer.items[i], i);
            }
        } else {
            for (var b = 0, index = 0; b < itemsContainer.itemsBlocks.length; b++) {
                var block = itemsContainer.itemsBlocks[b];
                for (var i = 0, len = block.items.length; i < len; i++) {
                    callback(block.items[i], index++);
                }
            }
        }
    }

    function containerFromIndex(itemsContainer, index) {
        if (index < 0) {
            return null;
        }
        if (itemsContainer.items) {
            return (index < itemsContainer.items.length ? itemsContainer.items[index] : null);
        } else {
            var blockSize = itemsContainer.itemsBlocks[0].items.length,
                blockIndex = Math.floor(index / blockSize),
                offset = index % blockSize;
            return (blockIndex < itemsContainer.itemsBlocks.length && offset < itemsContainer.itemsBlocks[blockIndex].items.length ? itemsContainer.itemsBlocks[blockIndex].items[offset] : null);
        }
    }

    function getItemsContainerTree(itemsContainer, tree) {
        var itemsContainerTree;
        for (var i = 0, treeLength = tree.length; i < treeLength; i++) {
            if (tree[i].itemsContainer.element === itemsContainer) {
                itemsContainerTree = tree[i].itemsContainer;
                break;
            }
        }
        return itemsContainerTree;
    }

    function getItemsContainerLength(itemsContainer) {
        var blocksCount,
            itemsCount;
        if (itemsContainer.itemsBlocks) {
            blocksCount = itemsContainer.itemsBlocks.length;
            if (blocksCount > 0) {
                itemsCount = (itemsContainer.itemsBlocks[0].items.length * (blocksCount - 1)) + itemsContainer.itemsBlocks[blocksCount - 1].items.length;
            } else {
                itemsCount = 0;
            }
        } else {
            itemsCount = itemsContainer.items.length;
        }
        return itemsCount;
    }

    var environmentDetails = null;
    // getEnvironmentSupportInformation does one-time checks on several browser-specific environment details (both to check the existence of styles,
    // and also to see if some environments have layout bugs the ListView needs to work around).
    function getEnvironmentSupportInformation(site) {
        if (!environmentDetails) {
            var surface = _Global.document.createElement("div");
            surface.style.width = "500px";
            surface.style.visibility = "hidden";

            // Set up the DOM
            var flexRoot = _Global.document.createElement("div");
            flexRoot.style.cssText += "width: 500px; height: 200px; display: -webkit-flex; display: flex";
            _SafeHtml.setInnerHTMLUnsafe(flexRoot,
                "<div style='height: 100%; display: -webkit-flex; display: flex; flex-flow: column wrap; align-content: flex-start; -webkit-flex-flow: column wrap; -webkit-align-content: flex-start'>" +
                    "<div style='width: 100px; height: 100px'></div>" +
                    "<div style='width: 100px; height: 100px'></div>" +
                    "<div style='width: 100px; height: 100px'></div>" +
                "</div>");
            surface.appendChild(flexRoot);

            // Read from the DOM and detect the bugs
            site.viewport.insertBefore(surface, site.viewport.firstChild);
            var canMeasure = surface.offsetWidth > 0,
                expectedWidth = 200;
            if (canMeasure) {
                // If we can't measure now (e.g. ListView is display:none), leave environmentDetails as null
                // so that we do the detection later when the app calls recalculateItemPosition/forceLayout.

                environmentDetails = {
                    supportsCSSGrid: !!("-ms-grid-row" in _Global.document.documentElement.style),
                    // Detects Chrome flex issue 345433: Incorrect sizing for nested flexboxes
                    // https://code.google.com/p/chromium/issues/detail?id=345433
                    // With nested flexboxes, the inner flexbox's width is proportional to the number of elements intead
                    // of the number of columns.
                    nestedFlexTooLarge: flexRoot.firstElementChild.offsetWidth > expectedWidth,

                    // Detects Firefox issue 995020
                    // https://bugzilla.mozilla.org/show_bug.cgi?id=995020
                    // The three squares we're adding to the nested flexbox should increase the size of the nestedFlex to be 200 pixels wide. This is the case in IE but
                    // currently not in Firefox. In Firefox, the third square will move to the next column, but the container's width won't update for it.
                    nestedFlexTooSmall: flexRoot.firstElementChild.offsetWidth < expectedWidth
                };
            }

            // Clean up the DOM
            site.viewport.removeChild(surface);
        }

        return environmentDetails;
    }

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        Layout: _Base.Class.define(function Layout_ctor() {
            /// <signature helpKeyword="exports.Layout.Layout">
            /// <summary locid="exports.Layout.constructor">
            /// Creates a new Layout object.
            /// </summary>
            /// <param name="options" type="Object" locid="exports.Layout.constructor_p:options">
            /// The set of options to be applied initially to the new Layout object.
            /// </param>
            /// <returns type="exports.Layout" locid="exports.Layout.constructor_returnValue">
            /// The new Layout object.
            /// </returns>
            /// </signature>
        }),

        _LayoutCommon: _Base.Namespace._lazy(function () {
            return _Base.Class.derive(exports.Layout, null, {
                /// <field type="String" oamOptionsDatatype="WinJS.UI.HeaderPosition" locid="WinJS.UI._LayoutCommon.groupHeaderPosition" helpKeyword="WinJS.UI._LayoutCommon.groupHeaderPosition">
                /// Gets or sets the position of group headers relative to their items.
                /// The default value is "top".
                /// </field>
                groupHeaderPosition: {
                    enumerable: true,
                    get: function () {
                        return this._groupHeaderPosition;
                    },
                    set: function (position) {
                        this._groupHeaderPosition = position;
                        this._invalidateLayout();
                    }
                },

                // Implementation of part of ILayout interface

                initialize: function _LayoutCommon_initialize(site, groupsEnabled) {
                    site._writeProfilerMark("Layout:initialize,info");
                    if (!this._inListMode) {
                        _ElementUtilities.addClass(site.surface, _Constants._gridLayoutClass);
                    }

                    if (this._backdropColorClassName) {
                        _ElementUtilities.addClass(site.surface, this._backdropColorClassName);
                    }
                    if (this._disableBackdropClassName) {
                        _ElementUtilities.addClass(site.surface, this._disableBackdropClassName);
                    }
                    this._groups = [];
                    this._groupMap = {};
                    this._oldGroupHeaderPosition = null;
                    this._usingStructuralNodes = false;

                    this._site = site;
                    this._groupsEnabled = groupsEnabled;
                    this._resetAnimationCaches(true);
                },

                /// <field type="String" oamOptionsDatatype="WinJS.UI.Orientation" locid="WinJS.UI._LayoutCommon.orientation" helpKeyword="WinJS.UI._LayoutCommon.orientation">
                /// Gets or sets the orientation for the layout.
                /// The default value is "horizontal".
                /// </field>
                orientation: {
                    enumerable: true,
                    get: function () {
                        return this._orientation;
                    },
                    set: function (orientation) {
                        this._orientation = orientation;
                        this._horizontal = (orientation === "horizontal");
                        this._invalidateLayout();
                    }
                },

                uninitialize: function _LayoutCommon_uninitialize() {
                    var perfId = "Layout:uninitialize,info";
                    function cleanGroups(groups) {
                        var len = groups.length,
                            i;
                        for (i = 0; i < len; i++) {
                            groups[i].cleanUp(true);
                        }
                    }

                    this._elementsToMeasure = {};

                    if (this._site) {
                        this._site._writeProfilerMark(perfId);
                        _ElementUtilities.removeClass(this._site.surface, _Constants._gridLayoutClass);
                        _ElementUtilities.removeClass(this._site.surface, _Constants._headerPositionTopClass);
                        _ElementUtilities.removeClass(this._site.surface, _Constants._headerPositionLeftClass);
                        _ElementUtilities.removeClass(this._site.surface, _Constants._structuralNodesClass);
                        this._site.surface.style.cssText = "";
                        if (this._groups) {
                            cleanGroups(this._groups);
                            this._groups = null;
                            this._groupMap = null;
                        }
                        if (this._layoutPromise) {
                            this._layoutPromise.cancel();
                            this._layoutPromise = null;
                        }
                        this._resetMeasurements();
                        this._oldGroupHeaderPosition = null;
                        this._usingStructuralNodes = null;
                        // The properties given to us by the app (_groupInfo, _itemInfo,
                        // _groupHeaderPosition) are not cleaned up so that the values are
                        // remembered if the layout is reused.

                        if (this._backdropColorClassName) {
                            _ElementUtilities.removeClass(this._site.surface, this._backdropColorClassName);
                            deleteDynamicCssRule(this._backdropColorClassName);
                            this._backdropColorClassName = null;
                        }
                        if (this._disableBackdropClassName) {
                            _ElementUtilities.removeClass(this._site.surface, this._disableBackdropClassName);
                            deleteDynamicCssRule(this._disableBackdropClassName);
                            this._disableBackdropClassName = null;
                        }

                        this._site = null;
                        this._groupsEnabled = null;
                        if (this._animationsRunning) {
                            this._animationsRunning.cancel();
                        }
                        this._animatingItemsBlocks = {};
                    } else {
                        _WriteProfilerMark("WinJS.UI.ListView:" + perfId);
                    }
                },

                numberOfItemsPerItemsBlock: {
                    get: function _LayoutCommon_getNumberOfItemsPerItemsBlock() {
                        function allGroupsAreUniform() {
                            var groupCount = that._site.groupCount,
                                i;

                            for (i = 0; i < groupCount; i++) {
                                if (that._isCellSpanning(i)) {
                                    return false;
                                }
                            }

                            return true;
                        }

                        var that = this;
                        return that._measureItem(0).then(function () {
                            if (that._sizes.viewportContentSize !== that._getViewportCrossSize()) {
                                that._viewportSizeChanged(that._getViewportCrossSize());
                            }

                            if (!that._envInfo.nestedFlexTooLarge && // Disabling structural nodes works around this issue
                                    !that._envInfo.nestedFlexTooSmall &&
                                    allGroupsAreUniform()) {
                                that._usingStructuralNodes = exports._LayoutCommon._barsPerItemsBlock > 0;
                                return exports._LayoutCommon._barsPerItemsBlock * that._itemsPerBar;
                            } else {
                                that._usingStructuralNodes = false;
                                return null;
                            }
                        });
                    }
                },

                layout: function _LayoutCommon_layout(tree, changedRange, modifiedItems, modifiedGroups) {
                    // changedRange implies that the minimum amount of work the layout needs to do is as follows:
                    // - It needs to lay out group shells (header containers and items containers) from
                    //   firstChangedGroup thru lastGroup.
                    // - It needs to ask firstChangedGroup thru lastChangedGroup to lay out their
                    //   contents (i.e. win-containers).
                    // - For each group included in the changedRange, it needs to lay out its
                    //   contents (i.e. win-containers) from firstChangedItem thru lastItem.

                    var that = this;
                    var site = that._site,
                        layoutPerfId = "Layout.layout",
                        realizedRangePerfId = layoutPerfId + ":realizedRange",
                        realizedRangePromise;

                    that._site._writeProfilerMark(layoutPerfId + ",StartTM");
                    that._site._writeProfilerMark(realizedRangePerfId + ",StartTM");

                    // Receives an items container's tree and returns a normalized copy.
                    // This allows us to hold on to a snapshot of the tree without
                    // worrying that items may have been unexpectedly inserted/
                    // removed/moved. The returned tree always appears as though
                    // structural nodes are disabled.
                    function copyItemsContainerTree(itemsContainer) {
                        function copyItems(itemsContainer) {
                            if (that._usingStructuralNodes) {
                                var items = [];
                                itemsContainer.itemsBlocks.forEach(function (itemsBlock) {
                                    items = items.concat(itemsBlock.items.slice(0));
                                });
                                return items;
                            } else {
                                return itemsContainer.items.slice(0);
                            }
                        }

                        return {
                            element: itemsContainer.element,
                            items: copyItems(itemsContainer)
                        };
                    }

                    // Updates the GridLayout's internal state to reflect the current tree.
                    // Similarly tells each group to update its internal state via prepareLayout.
                    // After this function runs, the ILayout functions will return results that
                    // are appropriate for the current tree.
                    function updateGroups() {
                        function createGroup(groupInfo, itemsContainer) {
                            var GroupType = (groupInfo.enableCellSpanning ?
                                Groups.CellSpanningGroup :
                                Groups.UniformGroup);
                            return new GroupType(that, itemsContainer);
                        }

                        var oldRealizedItemRange = (that._groups.length > 0 ?
                                that._getRealizationRange() :
                                null),
                            newGroups = [],
                            prepared = [],
                            cleanUpDom = {},
                            newGroupMap = {},
                            currentIndex = 0,
                            len = tree.length,
                            i;

                        for (i = 0; i < len; i++) {
                            var oldChangedRealizedRangeInGroup = null,
                                groupInfo = that._getGroupInfo(i),
                                groupKey = that._site.groupFromIndex(i).key,
                                oldGroup = that._groupMap[groupKey],
                                wasCellSpanning = oldGroup instanceof Groups.CellSpanningGroup,
                                isCellSpanning = groupInfo.enableCellSpanning;

                            if (oldGroup) {
                                if (wasCellSpanning !== isCellSpanning) {
                                    // The group has changed types so DOM needs to be cleaned up
                                    cleanUpDom[groupKey] = true;
                                } else {
                                    // Compute the range of changed items that is within the group's realized range
                                    var firstChangedIndexInGroup = Math.max(0, changedRange.firstIndex - oldGroup.startIndex),
                                        oldRealizedItemRangeInGroup = that._rangeForGroup(oldGroup, oldRealizedItemRange);
                                    if (oldRealizedItemRangeInGroup && firstChangedIndexInGroup <= oldRealizedItemRangeInGroup.lastIndex) {
                                        // The old changed realized range is non-empty
                                        oldChangedRealizedRangeInGroup = {
                                            firstIndex: Math.max(firstChangedIndexInGroup, oldRealizedItemRangeInGroup.firstIndex),
                                            lastIndex: oldRealizedItemRangeInGroup.lastIndex
                                        };
                                    }
                                }
                            }
                            var group = createGroup(groupInfo, tree[i].itemsContainer.element);
                            var prepareLayoutPromise;
                            if (group.prepareLayoutWithCopyOfTree) {
                                prepareLayoutPromise = group.prepareLayoutWithCopyOfTree(copyItemsContainerTree(tree[i].itemsContainer), oldChangedRealizedRangeInGroup, oldGroup, {
                                    groupInfo: groupInfo,
                                    startIndex: currentIndex,
                                });
                            } else {
                                prepareLayoutPromise = group.prepareLayout(getItemsContainerLength(tree[i].itemsContainer), oldChangedRealizedRangeInGroup, oldGroup, {
                                    groupInfo: groupInfo,
                                    startIndex: currentIndex,
                                });
                            }
                            prepared.push(prepareLayoutPromise);

                            currentIndex += group.count;

                            newGroups.push(group);
                            newGroupMap[groupKey] = group;
                        }

                        return Promise.join(prepared).then(function () {
                            var currentOffset = 0;
                            for (var i = 0, len = newGroups.length; i < len; i++) {
                                var group = newGroups[i];
                                group.offset = currentOffset;
                                currentOffset += that._getGroupSize(group);
                            }

                            // Clean up deleted groups
                            Object.keys(that._groupMap).forEach(function (deletedKey) {
                                var skipDomCleanUp = !cleanUpDom[deletedKey];
                                that._groupMap[deletedKey].cleanUp(skipDomCleanUp);
                            });

                            that._groups = newGroups;
                            that._groupMap = newGroupMap;
                        });
                    }

                    // When doRealizedRange is true, this function is synchronous and has no return value.
                    // When doRealizedRange is false, this function is asynchronous and returns a promise.
                    function layoutGroupContent(groupIndex, realizedItemRange, doRealizedRange) {
                        var group = that._groups[groupIndex],
                            firstChangedIndexInGroup = Math.max(0, changedRange.firstIndex - group.startIndex),
                            realizedItemRangeInGroup = that._rangeForGroup(group, realizedItemRange),
                            beforeRealizedRange;

                        if (doRealizedRange) {
                            group.layoutRealizedRange(firstChangedIndexInGroup, realizedItemRangeInGroup);
                        } else {
                            if (!realizedItemRangeInGroup) {
                                beforeRealizedRange = (group.startIndex + group.count - 1 < realizedItemRange.firstIndex);
                            }

                            return group.layoutUnrealizedRange(firstChangedIndexInGroup, realizedItemRangeInGroup, beforeRealizedRange);
                        }
                    }

                    // Synchronously lays out:
                    // - Realized and unrealized group shells (header containers and items containers).
                    //   This is needed so that each realized group will be positioned at the correct offset.
                    // - Realized items.
                    function layoutRealizedRange() {
                        if (that._groups.length === 0) {
                            return;
                        }

                        var realizedItemRange = that._getRealizationRange(),
                            len = tree.length,
                            i,
                            firstChangedGroup = site.groupIndexFromItemIndex(changedRange.firstIndex);

                        for (i = firstChangedGroup; i < len; i++) {
                            layoutGroupContent(i, realizedItemRange, true);
                            that._layoutGroup(i);
                        }
                    }

                    // Asynchronously lays out the unrealized items
                    function layoutUnrealizedRange() {
                        if (that._groups.length === 0) {
                            return Promise.wrap();
                        }

                        var realizedItemRange = that._getRealizationRange(),
                            // Last group before the realized range which contains 1 or more unrealized items
                            lastGroupBefore = site.groupIndexFromItemIndex(realizedItemRange.firstIndex - 1),
                            // First group after the realized range which contains 1 or more unrealized items
                            firstGroupAfter = site.groupIndexFromItemIndex(realizedItemRange.lastIndex + 1),
                            firstChangedGroup = site.groupIndexFromItemIndex(changedRange.firstIndex),
                            layoutPromises = [],
                            groupCount = that._groups.length;

                        var stop = false;
                        var before = lastGroupBefore;
                        var after = Math.max(firstChangedGroup, firstGroupAfter);
                        after = Math.max(before + 1, after);
                        while (!stop) {
                            stop = true;
                            if (before >= firstChangedGroup) {
                                layoutPromises.push(layoutGroupContent(before, realizedItemRange, false));
                                stop = false;
                                before--;
                            }
                            if (after < groupCount) {
                                layoutPromises.push(layoutGroupContent(after, realizedItemRange, false));
                                stop = false;
                                after++;
                            }
                        }

                        return Promise.join(layoutPromises);
                    }

                    realizedRangePromise = that._measureItem(0).then(function () {
                        _ElementUtilities[that._usingStructuralNodes ? "addClass" : "removeClass"](that._site.surface, _Constants._structuralNodesClass);

                        if (that._sizes.viewportContentSize !== that._getViewportCrossSize()) {
                            that._viewportSizeChanged(that._getViewportCrossSize());
                        }

                        // Move deleted elements to their original positions before calling updateGroups can be slow.
                        that._cacheRemovedElements(modifiedItems, that._cachedItemRecords, that._cachedInsertedItemRecords, that._cachedRemovedItems, false);
                        that._cacheRemovedElements(modifiedGroups, that._cachedHeaderRecords, that._cachedInsertedHeaderRecords, that._cachedRemovedHeaders, true);

                        return updateGroups();
                    }).then(function () {
                        that._syncDomWithGroupHeaderPosition(tree);
                        var surfaceLength = 0;
                        if (that._groups.length > 0) {
                            var lastGroup = that._groups[that._groups.length - 1];
                            surfaceLength = lastGroup.offset + that._getGroupSize(lastGroup);
                        }

                        // Explicitly set the surface width/height. This maintains backwards
                        // compatibility with the original layouts by allowing the items
                        // to be shifted through surface margins.
                        if (that._horizontal) {
                            if (that._groupsEnabled && that._groupHeaderPosition === HeaderPosition.left) {
                                site.surface.style.cssText +=
                                    ";height:" + that._sizes.surfaceContentSize +
                                    "px;-ms-grid-columns: (" + that._sizes.headerContainerWidth + "px auto)[" + tree.length + "]";
                            } else {
                                site.surface.style.height = that._sizes.surfaceContentSize + "px";
                            }
                            if (that._envInfo.nestedFlexTooLarge || that._envInfo.nestedFlexTooSmall) {
                                site.surface.style.width = surfaceLength + "px";
                            }
                        } else {
                            if (that._groupsEnabled && that._groupHeaderPosition === HeaderPosition.top) {
                                site.surface.style.cssText +=
                                    ";width:" + that._sizes.surfaceContentSize +
                                    "px;-ms-grid-rows: (" + that._sizes.headerContainerHeight + "px auto)[" + tree.length + "]";
                            } else {
                                site.surface.style.width = that._sizes.surfaceContentSize + "px";
                            }
                            if (that._envInfo.nestedFlexTooLarge || that._envInfo.nestedFlexTooSmall) {
                                site.surface.style.height = surfaceLength + "px";
                            }
                        }

                        layoutRealizedRange();

                        that._layoutAnimations(modifiedItems, modifiedGroups);

                        that._site._writeProfilerMark(realizedRangePerfId + ":complete,info");
                        that._site._writeProfilerMark(realizedRangePerfId + ",StopTM");
                    }, function (error) {
                        that._site._writeProfilerMark(realizedRangePerfId + ":canceled,info");
                        that._site._writeProfilerMark(realizedRangePerfId + ",StopTM");
                        return Promise.wrapError(error);
                    });

                    that._layoutPromise = realizedRangePromise.then(function () {
                        return layoutUnrealizedRange().then(function () {
                            that._site._writeProfilerMark(layoutPerfId + ":complete,info");
                            that._site._writeProfilerMark(layoutPerfId + ",StopTM");
                        }, function (error) {
                            that._site._writeProfilerMark(layoutPerfId + ":canceled,info");
                            that._site._writeProfilerMark(layoutPerfId + ",StopTM");
                            return Promise.wrapError(error);
                        });
                    });

                    return {
                        realizedRangeComplete: realizedRangePromise,
                        layoutComplete: that._layoutPromise
                    };
                },

                itemsFromRange: function _LayoutCommon_itemsFromRange(firstPixel, lastPixel) {
                    if (this._rangeContainsItems(firstPixel, lastPixel)) {
                        return {
                            firstIndex: this._firstItemFromRange(firstPixel),
                            lastIndex: this._lastItemFromRange(lastPixel)
                        };
                    } else {
                        return {
                            firstIndex: 0,
                            lastIndex: -1
                        };
                    }

                },

                getAdjacent: function _LayoutCommon_getAdjacent(currentItem, pressedKey) {
                    var that = this,
                        groupIndex = that._site.groupIndexFromItemIndex(currentItem.index),
                        group = that._groups[groupIndex],
                        adjustedKey = that._adjustedKeyForOrientationAndBars(that._adjustedKeyForRTL(pressedKey), group instanceof Groups.CellSpanningGroup);

                    if (currentItem.type === _UI.ObjectType.groupHeader) {
                        if (pressedKey === Key.pageUp || pressedKey === Key.pageDown) {
                            // We treat page up and page down keys as if an item had focus
                            currentItem = { type: _UI.ObjectType.item, index: this._groups[currentItem.index].startIndex };
                        } else {
                            switch (adjustedKey) {
                                case Key.leftArrow:
                                    return { type: _UI.ObjectType.groupHeader, index: Math.max(0, currentItem.index - 1) };
                                case Key.rightArrow:
                                    return { type: _UI.ObjectType.groupHeader, index: Math.min(that._groups.length - 1, currentItem.index + 1) };
                            }
                            return currentItem;
                        }
                    }

                    function handleArrowKeys() {
                        var currentItemInGroup = {
                            type: currentItem.type,
                            index: currentItem.index - group.startIndex
                        },
                            newItem = group.getAdjacent(currentItemInGroup, adjustedKey);

                        if (newItem === "boundary") {
                            var prevGroup = that._groups[groupIndex - 1],
                                nextGroup = that._groups[groupIndex + 1],
                                lastGroupIndex = that._groups.length - 1;

                            if (adjustedKey === Key.leftArrow) {
                                if (groupIndex === 0) {
                                    // We're at the beginning of the first group so stay put
                                    return currentItem;
                                } else if (prevGroup instanceof Groups.UniformGroup && group instanceof Groups.UniformGroup) {
                                    // Moving between uniform groups so maintain the row/column if possible
                                    var coordinates = that._indexToCoordinate(currentItemInGroup.index);
                                    var currentSlot = (that._horizontal ? coordinates.row : coordinates.column),
                                        indexOfLastBar = Math.floor((prevGroup.count - 1) / that._itemsPerBar),
                                        startOfLastBar = indexOfLastBar * that._itemsPerBar; // first cell of last bar
                                    return {
                                        type: _UI.ObjectType.item,
                                        index: prevGroup.startIndex + Math.min(prevGroup.count - 1, startOfLastBar + currentSlot)
                                    };
                                } else {
                                    // Moving to or from a cell spanning group so go to the last item
                                    return { type: _UI.ObjectType.item, index: group.startIndex - 1 };
                                }
                            } else if (adjustedKey === Key.rightArrow) {
                                if (groupIndex === lastGroupIndex) {
                                    // We're at the end of the last group so stay put
                                    return currentItem;
                                } else if (group instanceof Groups.UniformGroup && nextGroup instanceof Groups.UniformGroup) {
                                    // Moving between uniform groups so maintain the row/column if possible
                                    var coordinates = that._indexToCoordinate(currentItemInGroup.index),
                                        currentSlot = (that._horizontal ? coordinates.row : coordinates.column);
                                    return {
                                        type: _UI.ObjectType.item,
                                        index: nextGroup.startIndex + Math.min(nextGroup.count - 1, currentSlot)
                                    };
                                } else {
                                    // Moving to or from a cell spanning group so go to the first item
                                    return { type: _UI.ObjectType.item, index: nextGroup.startIndex };
                                }
                            } else {
                                return currentItem;
                            }
                        } else {
                            newItem.index += group.startIndex;
                            return newItem;
                        }
                    }

                    switch (that._adjustedKeyForRTL(pressedKey)) {
                        case Key.upArrow:
                        case Key.leftArrow:
                        case Key.downArrow:
                        case Key.rightArrow:
                            return handleArrowKeys();
                        default:
                            return exports._LayoutCommon.prototype._getAdjacentForPageKeys.call(that, currentItem, pressedKey);
                    }
                },

                hitTest: function _LayoutCommon_hitTest(x, y) {
                    var sizes = this._sizes,
                        result;

                    // Make the coordinates relative to grid layout's content box
                    x -= sizes.layoutOriginX;
                    y -= sizes.layoutOriginY;

                    var groupIndex = this._groupFromOffset(this._horizontal ? x : y),
                        group = this._groups[groupIndex];

                    // Make the coordinates relative to the margin box of the group's items container
                    if (this._horizontal) {
                        x -= group.offset;
                    } else {
                        y -= group.offset;
                    }
                    if (this._groupsEnabled) {
                        if (this._groupHeaderPosition === HeaderPosition.left) {
                            x -= sizes.headerContainerWidth;
                        } else {
                            // Headers above
                            y -= sizes.headerContainerHeight;
                        }
                    }

                    result = group.hitTest(x, y);
                    result.index += group.startIndex;
                    result.insertAfterIndex += group.startIndex;
                    return result;
                },

                // Animation cycle:
                //
                // Edits
                //  ---     UpdateTree        Realize
                // |   |      ---               /\/\
                // |   |     |   |             |    |
                // ------------------------------------------------------- Time
                //      |   |     |   |   |   |      |   |
                //       ---      |   |    ---        ---/\/\/\/\/\/\/\/\/
                //     setupAni   |   | layoutAni    endAni  (animations)
                //                 ---/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\
                //                layout    (outside realized range)
                //
                //
                // When there is a modification to the DataSource, the first thing that happens is setupAnimations is
                // called with the current tree. This allows us to cache the locations of the existing items.
                //
                // The next 3 steps have to be completely synchronous otherwise users will see intermediate states and
                // items will blink or jump between locations.
                //
                // ListView modifies the DOM tree. A container is added/removed from the group's itemsContainer for each
                // item added/removed to the group. The existing itemBoxes are shuffled between the different containers.
                // The itemBoxes for the removed items will be removed from the containers completely. Since the DOM tree
                // has been modified we have to apply a transform to position the itemBoxes at their original location. We
                // compare the new locations with the cached locations to figure out how far to translate the itemBoxes.
                // Also the removed items need to be placed back in the DOM without affecting layout (by using position
                // absolute) so that they also do not jump or blink.
                //
                // We only tranform and add back removed items for items which were on screen or are now on screen.
                //
                // Now the ListView can realize other items asynchronously. The items to realize are items which have been
                // inserted into the DataSource or items which are in the realization range because a removal has occurred
                // or the user has scroll slightly.
                //
                // During the realization pass the user may scroll. If they scroll to a range outside of the realization
                // range the items will just appear in the correct location without any animations. If they scroll to a
                // location within the old realization range we still have the items and they will animate correctly.
                //
                // During the realization pass another data source edit can occur. A realization pass is unable to run when
                // the tree and layout are out of sync. Otherwise it may try to request item at index X and get item at
                // index X + 1. This means that if another data source edit occurs before endAnimations is called we
                // restart the whole animation cycle. To group the animations between the two edits we do not reset the
                // caches of item box locations. We could add to it if there were items outside of the range however they
                // will only play half of the animation and will probably look just as ugly as not playing the animation at
                // all. This means setupAnimations will just be a no op in this scenario.
                //
                // This also shows that batching data source edits and only changing the data source when in loadingstate
                // "complete" is still a large performance win.
                //
                // Once the realization pass has finished ListView calls executeAnimations. This is where the layout
                // effectively fades out the removed items (and then removes them from the dom), moves the itemBoxes back
                // to translate(0,0), and fades in the inserted itemBoxes. ListView waits for the executeAnimations promise
                // to complete before allowing more data source edits to trigger another animation cycle.
                //
                // If a resize occurs during the animation cycle the animations will be canceled and items will jump to
                // their final positions.

                setupAnimations: function _LayoutCommon_setupAnimations() {
                    // This function is called after a data source change so that we can cache the locations
                    // of the realized items.

                    if (this._groups.length === 0) {
                        // No animations if we haven't measured before
                        this._resetAnimationCaches();
                        return;
                    }

                    if (Object.keys(this._cachedItemRecords).length) {
                        // Ignore the second call.
                        return;
                    }

                    this._site._writeProfilerMark("Animation:setupAnimations,StartTM");

                    var realizationRange = this._getRealizationRange();

                    var tree = this._site.tree;
                    var itemIndex = 0;
                    var horizontal = (this.orientation === "horizontal");
                    for (var i = 0, treeLength = tree.length; i < treeLength; i++) {
                        var groupBundle = tree[i];
                        var groupHasAtleastOneItemRealized = false;
                        var group = this._groups[i];
                        var groupIsCellSpanning = group instanceof Groups.CellSpanningGroup;
                        var groupOffset = (group ? group.offset : 0);

                        forEachContainer(groupBundle.itemsContainer, function (container, j) {
                            // Don't try to cache something outside of the realization range.
                            if (realizationRange.firstIndex <= itemIndex && realizationRange.lastIndex >= itemIndex) {
                                groupHasAtleastOneItemRealized = true;

                                if (!this._cachedItemRecords[itemIndex]) {
                                    var itemPosition = this._getItemPositionForAnimations(itemIndex, i, j);
                                    var row = itemPosition.row;
                                    var column = itemPosition.column;
                                    var left = itemPosition.left;
                                    var top = itemPosition.top;

                                    // Setting both old and new variables now in case layoutAnimations is called multiple times.
                                    this._cachedItemRecords[itemIndex] = {
                                        oldRow: row,
                                        oldColumn: column,
                                        oldLeft: left,
                                        oldTop: top,
                                        width: itemPosition.width,
                                        height: itemPosition.height,
                                        element: container,
                                        inCellSpanningGroup: groupIsCellSpanning
                                    };
                                }
                            }
                            itemIndex++;
                        }.bind(this));

                        if (groupHasAtleastOneItemRealized) {
                            var groupIndex = i;
                            if (!this._cachedHeaderRecords[groupIndex]) {
                                var headerPosition = this._getHeaderPositionForAnimations(groupIndex);
                                this._cachedHeaderRecords[groupIndex] = {
                                    oldLeft: headerPosition.left,
                                    oldTop: headerPosition.top,
                                    width: headerPosition.width,
                                    height: headerPosition.height,
                                    element: groupBundle.header,
                                };
                            }
                            if (!this._cachedGroupRecords[uniqueID(groupBundle.itemsContainer.element)]) {
                                this._cachedGroupRecords[uniqueID(groupBundle.itemsContainer.element)] = {
                                    oldLeft: horizontal ? groupOffset : 0,
                                    left: horizontal ? groupOffset : 0,
                                    oldTop: horizontal ? 0 : groupOffset,
                                    top: horizontal ? 0 : groupOffset,
                                    element: groupBundle.itemsContainer.element,
                                };
                            }
                        }
                    }

                    this._site._writeProfilerMark("Animation:setupAnimations,StopTM");
                },

                _layoutAnimations: function _LayoutCommon_layoutAnimations(modifiedItems, modifiedGroups) {
                    // This function is called after the DOM tree has been modified to match the data source.
                    // In this function we update the cached records and apply transforms to hide the modifications
                    // from the user. We will remove the transforms via animations in execute animation.

                    if (!Object.keys(this._cachedItemRecords).length &&
                        !Object.keys(this._cachedGroupRecords).length &&
                        !Object.keys(this._cachedHeaderRecords).length) {
                        return;
                    }

                    this._site._writeProfilerMark("Animation:layoutAnimation,StartTM");

                    this._updateAnimationCache(modifiedItems, modifiedGroups);

                    var realizationRange = this._getRealizationRange();

                    var tree = this._site.tree;
                    var itemIndex = 0;
                    var horizontal = (this.orientation === "horizontal");
                    for (var i = 0, treeLength = tree.length; i < treeLength; i++) {
                        var groupBundle = tree[i];
                        var group = this._groups[i];
                        var groupIsCellSpanning = group instanceof Groups.CellSpanningGroup;
                        var groupOffset = (group ? group.offset : 0);
                        var groupMovementX = 0;
                        var groupMovementY = 0;

                        var cachedGroupRecord = this._cachedGroupRecords[uniqueID(groupBundle.itemsContainer.element)];
                        if (cachedGroupRecord) {
                            if (horizontal) {
                                groupMovementX = cachedGroupRecord.oldLeft - groupOffset;
                            } else {
                                groupMovementY = cachedGroupRecord.oldTop - groupOffset;
                            }
                        }


                        forEachContainer(groupBundle.itemsContainer, function (container, j) {
                            // Don't try to cache something outside of the realization range.
                            if (realizationRange.firstIndex <= itemIndex && realizationRange.lastIndex >= itemIndex) {
                                var cachedItemRecord = this._cachedItemRecords[itemIndex];
                                if (cachedItemRecord) {
                                    var itemPosition = this._getItemPositionForAnimations(itemIndex, i, j);
                                    var row = itemPosition.row;
                                    var column = itemPosition.column;
                                    var left = itemPosition.left;
                                    var top = itemPosition.top;

                                    cachedItemRecord.inCellSpanningGroup = cachedItemRecord.inCellSpanningGroup || groupIsCellSpanning;

                                    // If the item has moved we need to update the cache and apply a transform to make it
                                    // appear like it has not moved yet.
                                    if (cachedItemRecord.oldRow !== row ||
                                        cachedItemRecord.oldColumn !== column ||
                                        cachedItemRecord.oldTop !== top ||
                                        cachedItemRecord.oldLeft !== left) {

                                        cachedItemRecord.row = row;
                                        cachedItemRecord.column = column;
                                        cachedItemRecord.left = left;
                                        cachedItemRecord.top = top;

                                        var xOffset = cachedItemRecord.oldLeft - cachedItemRecord.left - groupMovementX;
                                        var yOffset = cachedItemRecord.oldTop - cachedItemRecord.top - groupMovementY;
                                        xOffset = (this._site.rtl ? -1 : 1) * xOffset;

                                        cachedItemRecord.xOffset = xOffset;
                                        cachedItemRecord.yOffset = yOffset;
                                        if (xOffset !== 0 || yOffset !== 0) {
                                            var element = cachedItemRecord.element;
                                            cachedItemRecord.needsToResetTransform = true;
                                            element.style[transitionScriptName] = "";
                                            element.style[transformNames.scriptName] = "translate(" + xOffset + "px," + yOffset + "px)";
                                        }

                                        var itemsBlock = container.parentNode;
                                        if (_ElementUtilities.hasClass(itemsBlock, _Constants._itemsBlockClass)) {
                                            this._animatingItemsBlocks[uniqueID(itemsBlock)] = itemsBlock;
                                        }
                                    }

                                } else {
                                    // Treat items that came from outside of the realization range into the realization range
                                    // as a "Move" which means fade it in.
                                    this._cachedInsertedItemRecords[itemIndex] = container;
                                    container.style[transitionScriptName] = "";
                                    container.style.opacity = 0;
                                }
                            }

                            itemIndex++;
                        }.bind(this));

                        var groupIndex = i;
                        var cachedHeader = this._cachedHeaderRecords[groupIndex];
                        if (cachedHeader) {
                            var headerPosition = this._getHeaderPositionForAnimations(groupIndex);
                            // Note: If a group changes width we allow the header to immediately grow/shrink instead of
                            // animating it. However if the header is removed we stick the header to the last known size.
                            cachedHeader.height = headerPosition.height;
                            cachedHeader.width = headerPosition.width;
                            if (cachedHeader.oldLeft !== headerPosition.left ||
                                cachedHeader.oldTop !== headerPosition.top) {

                                cachedHeader.left = headerPosition.left;
                                cachedHeader.top = headerPosition.top;

                                var xOffset = cachedHeader.oldLeft - cachedHeader.left;
                                var yOffset = cachedHeader.oldTop - cachedHeader.top;
                                xOffset = (this._site.rtl ? -1 : 1) * xOffset;
                                if (xOffset !== 0 || yOffset !== 0) {
                                    cachedHeader.needsToResetTransform = true;
                                    var headerContainer = cachedHeader.element;
                                    headerContainer.style[transitionScriptName] = "";
                                    headerContainer.style[transformNames.scriptName] = "translate(" + xOffset + "px," + yOffset + "px)";
                                }
                            }
                        }

                        if (cachedGroupRecord) {
                            if ((horizontal && cachedGroupRecord.left !== groupOffset) ||
                                (!horizontal && cachedGroupRecord.top !== groupOffset)) {
                                var element = cachedGroupRecord.element;
                                if (groupMovementX === 0 && groupMovementY === 0) {
                                    if (cachedGroupRecord.needsToResetTransform) {
                                        cachedGroupRecord.needsToResetTransform = false;
                                        element.style[transformNames.scriptName] = "";
                                    }
                                } else {
                                    var groupOffsetX = (this._site.rtl ? -1 : 1) * groupMovementX,
                                        groupOffsetY = groupMovementY;
                                    cachedGroupRecord.needsToResetTransform = true;
                                    element.style[transitionScriptName] = "";
                                    element.style[transformNames.scriptName] = "translate(" + groupOffsetX + "px, " + groupOffsetY + "px)";
                                }
                            }
                        }
                    }

                    if (this._inListMode || this._itemsPerBar === 1) {
                        var itemsBlockKeys = Object.keys(this._animatingItemsBlocks);
                        for (var b = 0, blockKeys = itemsBlockKeys.length; b < blockKeys; b++) {
                            this._animatingItemsBlocks[itemsBlockKeys[b]].style.overflow = 'visible';
                        }
                    }

                    this._site._writeProfilerMark("Animation:layoutAnimation,StopTM");
                },

                executeAnimations: function _LayoutCommon_executeAnimations() {
                    // This function is called when we should perform an animation to reveal the true location of the items.
                    // We fade out removed items, fade in added items, and move items which need to be shifted. If they moved
                    // across columns we do a reflow animation.

                    var animationSignal = new _Signal();

                    // Only animate the items on screen.
                    this._filterInsertedElements();
                    this._filterMovedElements();
                    this._filterRemovedElements();

                    if (this._insertedElements.length === 0 && this._removedElements.length === 0 && this._itemMoveRecords.length === 0 && this._moveRecords.length === 0) {
                        // Nothing to animate.
                        this._resetAnimationCaches(true);
                        animationSignal.complete();
                        return animationSignal.promise;
                    }
                    this._animationsRunning = animationSignal.promise;

                    var slowAnimations = exports.Layout._debugAnimations || exports.Layout._slowAnimations;
                    var site = this._site;
                    var insertedElements = this._insertedElements;
                    var removedElements = this._removedElements;
                    var itemMoveRecords = this._itemMoveRecords;
                    var moveRecords = this._moveRecords;

                    var removeDelay = 0;
                    var moveDelay = 0;
                    var addDelay = 0;

                    var currentAnimationPromise = null;
                    var pendingTransitionPromises = [];

                    var hasMultisizeMove = false;
                    var hasReflow = false;
                    var minOffset = 0;
                    var maxOffset = 0;
                    var itemContainersToExpand = {};
                    var upOutDist = 0;
                    var downOutDist = 0;
                    var upInDist = 0;
                    var downInDist = 0;
                    var reflowItemRecords = [];
                    var horizontal = (this.orientation === "horizontal");
                    var oldReflowLayoutProperty = horizontal ? "oldColumn" : "oldRow",
                        reflowLayoutProperty = horizontal ? "column" : "row",
                        oldReflowLayoutPosition = horizontal ? "oldTop" : "oldLeft",
                        reflowLayoutPosition = horizontal ? "top" : "left";

                    var animatingItemsBlocks = this._animatingItemsBlocks;

                    for (var i = 0, len = itemMoveRecords.length; i < len; i++) {
                        var cachedItemRecord = itemMoveRecords[i];
                        if (cachedItemRecord.inCellSpanningGroup) {
                            hasMultisizeMove = true;
                            break;
                        }
                    }

                    var that = this;

                    function startAnimations() {
                        removePhase();
                        if (hasMultisizeMove) {
                            cellSpanningFadeOutMove();
                        } else {
                            if (that._itemsPerBar > 1) {
                                var maxDistance = that._itemsPerBar * that._sizes.containerCrossSize + that._getHeaderSizeContentAdjustment() +
                                    that._sizes.containerMargins[horizontal ? "top" : (site.rtl ? "right" : "left")] +
                                    (horizontal ? that._sizes.layoutOriginY : that._sizes.layoutOriginX);
                                for (var i = 0, len = itemMoveRecords.length; i < len; i++) {
                                    var cachedItemRecord = itemMoveRecords[i];
                                    if (cachedItemRecord[oldReflowLayoutProperty] > cachedItemRecord[reflowLayoutProperty]) {
                                        upOutDist = Math.max(upOutDist, cachedItemRecord[oldReflowLayoutPosition] + cachedItemRecord[horizontal ? "height" : "width"]);
                                        upInDist = Math.max(upInDist, maxDistance - cachedItemRecord[reflowLayoutPosition]);
                                        hasReflow = true;
                                        reflowItemRecords.push(cachedItemRecord);
                                    } else if (cachedItemRecord[oldReflowLayoutProperty] < cachedItemRecord[reflowLayoutProperty]) {
                                        downOutDist = Math.max(downOutDist, maxDistance - cachedItemRecord[oldReflowLayoutPosition]);
                                        downInDist = Math.max(downInDist, cachedItemRecord[reflowLayoutPosition] + cachedItemRecord[horizontal ? "height" : "width"]);
                                        reflowItemRecords.push(cachedItemRecord);
                                        hasReflow = true;
                                    }
                                }
                            }

                            if (site.rtl && !horizontal) {
                                upOutDist *= -1;
                                upInDist *= -1;
                                downOutDist *= -1;
                                downInDist *= -1;
                            }

                            if (hasReflow) {
                                reflowPhase(that._itemsPerBar);
                            } else {
                                directMovePhase();
                            }
                        }
                    }

                    if (exports.Layout._debugAnimations) {
                        _BaseUtils._requestAnimationFrame(function () {
                            startAnimations();
                        });
                    } else {
                        startAnimations();
                    }

                    function waitForNextPhase(nextPhaseCallback) {
                        currentAnimationPromise = Promise.join(pendingTransitionPromises);
                        currentAnimationPromise.done(function () {
                            pendingTransitionPromises = [];
                            // The success is called even if the animations are canceled due to the WinJS.UI.executeTransition
                            // API. To deal with that we check the animationSignal variable. If it is null the animations were
                            // canceled so we shouldn't continue.
                            if (animationSignal) {
                                if (exports.Layout._debugAnimations) {
                                    _BaseUtils._requestAnimationFrame(function () {
                                        nextPhaseCallback();
                                    });
                                } else {
                                    nextPhaseCallback();
                                }
                            }
                        });
                    }

                    function removePhase() {
                        if (removedElements.length) {
                            site._writeProfilerMark("Animation:setupRemoveAnimation,StartTM");

                            moveDelay += 60;
                            addDelay += 60;

                            var removeDuration = 120;
                            if (slowAnimations) {
                                removeDuration *= 10;
                            }

                            pendingTransitionPromises.push(_TransitionAnimation.executeTransition(removedElements,
                            [{
                                property: "opacity",
                                delay: removeDelay,
                                duration: removeDuration,
                                timing: "linear",
                                to: 0,
                                skipStylesReset: true
                            }]));

                            site._writeProfilerMark("Animation:setupRemoveAnimation,StopTM");
                        }
                    }

                    function cellSpanningFadeOutMove() {
                        site._writeProfilerMark("Animation:cellSpanningFadeOutMove,StartTM");

                        // For multisize items which move we fade out and then fade in (opacity 1->0->1)
                        var moveElements = [];
                        for (var i = 0, len = itemMoveRecords.length; i < len; i++) {
                            var cachedItemRecord = itemMoveRecords[i];
                            var container = cachedItemRecord.element;
                            moveElements.push(container);
                        }
                        // Including groups and headers.
                        for (var i = 0, len = moveRecords.length; i < len; i++) {
                            var cachedItemRecord = moveRecords[i];
                            var container = cachedItemRecord.element;
                            moveElements.push(container);
                        }

                        var fadeOutDuration = 120;
                        if (slowAnimations) {
                            fadeOutDuration *= 10;
                        }

                        pendingTransitionPromises.push(_TransitionAnimation.executeTransition(moveElements,
                        {
                            property: "opacity",
                            delay: removeDelay,
                            duration: fadeOutDuration,
                            timing: "linear",
                            to: 0
                        }));

                        waitForNextPhase(cellSpanningFadeInMove);
                        site._writeProfilerMark("Animation:cellSpanningFadeOutMove,StopTM");
                    }

                    function cellSpanningFadeInMove() {
                        site._writeProfilerMark("Animation:cellSpanningFadeInMove,StartTM");

                        addDelay = 0;

                        var moveElements = [];
                        // Move them to their final location.
                        for (var i = 0, len = itemMoveRecords.length; i < len; i++) {
                            var cachedItemRecord = itemMoveRecords[i];
                            var container = cachedItemRecord.element;
                            container.style[transformNames.scriptName] = "";
                            moveElements.push(container);
                        }
                        // Including groups and headers.
                        for (var i = 0, len = moveRecords.length; i < len; i++) {
                            var cachedItemRecord = moveRecords[i];
                            var container = cachedItemRecord.element;
                            container.style[transformNames.scriptName] = "";
                            moveElements.push(container);
                        }

                        var fadeInDuration = 120;
                        if (slowAnimations) {
                            fadeInDuration *= 10;
                        }

                        // For multisize items which move we fade out and then fade in (opacity 1->0->1)
                        pendingTransitionPromises.push(_TransitionAnimation.executeTransition(moveElements,
                        {
                            property: "opacity",
                            delay: addDelay,
                            duration: fadeInDuration,
                            timing: "linear",
                            to: 1
                        }));

                        site._writeProfilerMark("Animation:cellSpanningFadeInMove,StopTM");

                        addPhase();
                    }

                    function reflowPhase(itemsPerBar) {
                        site._writeProfilerMark("Animation:setupReflowAnimation,StartTM");

                        var itemContainersLastBarIndices = {};
                        for (var i = 0, len = reflowItemRecords.length; i < len; i++) {
                            var reflowItemRecord = reflowItemRecords[i];
                            var xOffset = reflowItemRecord.xOffset;
                            var yOffset = reflowItemRecord.yOffset;
                            if (reflowItemRecord[oldReflowLayoutProperty] > reflowItemRecord[reflowLayoutProperty]) {
                                if (horizontal) {
                                    yOffset -= upOutDist;
                                } else {
                                    xOffset -= upOutDist;
                                }
                            } else if (reflowItemRecord[oldReflowLayoutProperty] < reflowItemRecord[reflowLayoutProperty]) {
                                if (horizontal) {
                                    yOffset += downOutDist;
                                } else {
                                    xOffset += downOutDist;
                                }
                            }

                            var container = reflowItemRecord.element;

                            minOffset = Math.min(minOffset, horizontal ? xOffset : yOffset);
                            maxOffset = Math.max(maxOffset, horizontal ? xOffset : yOffset);
                            var itemsContainer = container.parentNode;
                            if (!_ElementUtilities.hasClass(itemsContainer, "win-itemscontainer")) {
                                itemsContainer = itemsContainer.parentNode;
                            }

                            // The itemscontainer element is always overflow:hidden for two reasons:
                            // 1) Better panning performance
                            // 2) When there is margin betweeen the itemscontainer and the surface elements, items that
                            //    reflow should not be visible while they travel long distances or overlap with headers.
                            // This introduces an issue when updateTree makes the itemscontainer smaller, but we need its size
                            // to remain the same size during the execution of the animation to avoid having some of the animated
                            // items being clipped. This is only an issue when items from the last column (in horizontal mode) or row
                            // (in vertical mode) of the group will reflow. Therefore, we change the padding so that the contents are larger,
                            // and then use margin to reverse the size change. We don't do this expansion when it is unnecessary because the
                            // layout/formatting caused by these style changes has significant cost when the group has thousands of items.
                            var lastBarIndex = itemContainersLastBarIndices[uniqueID(itemsContainer)];
                            if (!lastBarIndex) {
                                var count = getItemsContainerLength(getItemsContainerTree(itemsContainer, site.tree));
                                itemContainersLastBarIndices[uniqueID(itemsContainer)] = lastBarIndex = Math.ceil(count / itemsPerBar) - 1;
                            }
                            if (reflowItemRecords[i][horizontal ? "column" : "row"] === lastBarIndex) {
                                itemContainersToExpand[uniqueID(itemsContainer)] = itemsContainer;
                            }

                            var reflowDuration = 80;
                            if (slowAnimations) {
                                reflowDuration *= 10;
                            }

                            pendingTransitionPromises.push(_TransitionAnimation.executeTransition(container,
                            {
                                property: transformNames.cssName,
                                delay: moveDelay,
                                duration: reflowDuration,
                                timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                                to: "translate(" + xOffset + "px," + yOffset + "px)"
                            }));
                        }

                        var itemContainerKeys = Object.keys(itemContainersToExpand);
                        for (var i = 0, len = itemContainerKeys.length; i < len; i++) {
                            var itemContainer = itemContainersToExpand[itemContainerKeys[i]];
                            if (site.rtl && horizontal) {
                                itemContainer.style.paddingLeft = (-1 * minOffset) + 'px';
                                itemContainer.style.marginLeft = minOffset + 'px';
                            } else {
                                itemContainer.style[horizontal ? "paddingRight" : "paddingBottom"] = maxOffset + 'px';
                                itemContainer.style[horizontal ? "marginRight" : "marginBottom"] = '-' + maxOffset + 'px';
                            }
                        }
                        var itemsBlockKeys = Object.keys(animatingItemsBlocks);
                        for (var i = 0, len = itemsBlockKeys.length; i < len; i++) {
                            animatingItemsBlocks[itemsBlockKeys[i]].classList.add(_Constants._clipClass);
                        }

                        waitForNextPhase(afterReflowPhase);

                        site._writeProfilerMark("Animation:setupReflowAnimation,StopTM");
                    }

                    function cleanupItemsContainers() {
                        // Reset the styles used to obtain overflow-y: hidden overflow-x: visible.
                        var itemContainerKeys = Object.keys(itemContainersToExpand);
                        for (var i = 0, len = itemContainerKeys.length; i < len; i++) {
                            var itemContainer = itemContainersToExpand[itemContainerKeys[i]];
                            if (site.rtl && horizontal) {
                                itemContainer.style.paddingLeft = '';
                                itemContainer.style.marginLeft = '';
                            } else {
                                itemContainer.style[horizontal ? "paddingRight" : "paddingBottom"] = '';
                                itemContainer.style[horizontal ? "marginRight" : "marginBottom"] = '';
                            }
                        }
                        itemContainersToExpand = {};

                        var itemsBlockKeys = Object.keys(animatingItemsBlocks);
                        for (var i = 0, len = itemsBlockKeys.length; i < len; i++) {
                            var itemsBlock = animatingItemsBlocks[itemsBlockKeys[i]];
                            itemsBlock.style.overflow = '';
                            itemsBlock.classList.remove(_Constants._clipClass);
                        }
                    }

                    function afterReflowPhase() {
                        site._writeProfilerMark("Animation:prepareReflowedItems,StartTM");

                        // Position the items at the edge ready to slide in.
                        for (var i = 0, len = reflowItemRecords.length; i < len; i++) {
                            var reflowItemRecord = reflowItemRecords[i];
                            var xOffset = 0,
                                yOffset = 0;
                            if (reflowItemRecord[oldReflowLayoutProperty] > reflowItemRecord[reflowLayoutProperty]) {
                                if (horizontal) {
                                    yOffset = upInDist;
                                } else {
                                    xOffset = upInDist;
                                }
                            } else if (reflowItemRecord[oldReflowLayoutProperty] < reflowItemRecord[reflowLayoutProperty]) {
                                if (horizontal) {
                                    yOffset = -1 * downInDist;
                                } else {
                                    xOffset = -1 * downInDist;
                                }
                            }
                            reflowItemRecord.element.style[transitionScriptName] = "";
                            reflowItemRecord.element.style[transformNames.scriptName] = "translate(" + xOffset + "px," + yOffset + "px)";
                        }

                        site._writeProfilerMark("Animation:prepareReflowedItems,StopTM");

                        if (exports.Layout._debugAnimations) {
                            _BaseUtils._requestAnimationFrame(function () {
                                directMovePhase(true);
                            });
                        } else {
                            directMovePhase(true);
                        }
                    }

                    function directMovePhase(fastMode) {
                        // For groups and items which move we transition them from transform: translate(Xpx,Ypx) to translate(0px,0px).
                        var duration = 200;
                        if (fastMode) {
                            duration = 150;
                            moveDelay = 0;
                            addDelay = 0;
                        }

                        if (slowAnimations) {
                            duration *= 10;
                        }

                        if (itemMoveRecords.length > 0 || moveRecords.length > 0) {
                            site._writeProfilerMark("Animation:setupMoveAnimation,StartTM");

                            var moveElements = [];
                            for (var i = 0, len = moveRecords.length; i < len; i++) {
                                var container = moveRecords[i].element;
                                moveElements.push(container);
                            }
                            for (var i = 0, len = itemMoveRecords.length; i < len; i++) {
                                var container = itemMoveRecords[i].element;
                                moveElements.push(container);
                            }
                            pendingTransitionPromises.push(_TransitionAnimation.executeTransition(moveElements,
                            {
                                property: transformNames.cssName,
                                delay: moveDelay,
                                duration: duration,
                                timing: "cubic-bezier(0.1, 0.9, 0.2, 1)",
                                to: ""
                            }));

                            addDelay += 80;

                            site._writeProfilerMark("Animation:setupMoveAnimation,StopTM");
                        }

                        addPhase();
                    }

                    function addPhase() {
                        if (insertedElements.length > 0) {
                            site._writeProfilerMark("Animation:setupInsertAnimation,StartTM");

                            var addDuration = 120;
                            if (slowAnimations) {
                                addDuration *= 10;
                            }

                            pendingTransitionPromises.push(_TransitionAnimation.executeTransition(insertedElements,
                            [{
                                property: "opacity",
                                delay: addDelay,
                                duration: addDuration,
                                timing: "linear",
                                to: 1
                            }]));

                            site._writeProfilerMark("Animation:setupInsertAnimation,StopTM");
                        }

                        waitForNextPhase(completePhase);
                    }
                    function completePhase() {
                        site._writeProfilerMark("Animation:cleanupAnimations,StartTM");

                        cleanupItemsContainers();

                        for (var i = 0, len = removedElements.length; i < len; i++) {
                            var container = removedElements[i];
                            if (container.parentNode) {
                                _Dispose._disposeElement(container);
                                container.parentNode.removeChild(container);
                            }
                        }

                        site._writeProfilerMark("Animation:cleanupAnimations,StopTM");

                        that._animationsRunning = null;
                        animationSignal.complete();
                    }
                    this._resetAnimationCaches(true);

                    // The PVL animation library completes sucessfully even if you cancel an animation.
                    // If the animation promise passed to layout is canceled we should cancel the PVL animations and
                    // set a marker for them to be ignored.
                    animationSignal.promise.then(null, function () {
                        // Since it was canceled make sure we still clean up the styles.
                        cleanupItemsContainers();
                        for (var i = 0, len = moveRecords.length; i < len; i++) {
                            var container = moveRecords[i].element;
                            container.style[transformNames.scriptName] = '';
                            container.style.opacity = 1;
                        }
                        for (var i = 0, len = itemMoveRecords.length; i < len; i++) {
                            var container = itemMoveRecords[i].element;
                            container.style[transformNames.scriptName] = '';
                            container.style.opacity = 1;
                        }
                        for (var i = 0, len = insertedElements.length; i < len; i++) {
                            insertedElements[i].style.opacity = 1;
                        }
                        for (var i = 0, len = removedElements.length; i < len; i++) {
                            var container = removedElements[i];
                            if (container.parentNode) {
                                _Dispose._disposeElement(container);
                                container.parentNode.removeChild(container);
                            }
                        }

                        this._animationsRunning = null;
                        animationSignal = null;
                        currentAnimationPromise && currentAnimationPromise.cancel();

                    }.bind(this));

                    return animationSignal.promise;
                },

                dragOver: function _LayoutCommon_dragOver(x, y, dragInfo) {
                    // The coordinates passed to dragOver should be in ListView's viewport space. 0,0 should be the top left corner of the viewport's padding.
                    var indicesAffected = this.hitTest(x, y),
                        groupAffected = (this._groups ? this._site.groupIndexFromItemIndex(indicesAffected.index) : 0),
                        itemsContainer = this._site.tree[groupAffected].itemsContainer,
                        itemsCount = getItemsContainerLength(itemsContainer),
                        indexOffset = (this._groups ? this._groups[groupAffected].startIndex : 0),
                        visibleRange = this._getVisibleRange();

                    indicesAffected.index -= indexOffset;
                    indicesAffected.insertAfterIndex -= indexOffset;
                    visibleRange.firstIndex = Math.max(visibleRange.firstIndex - indexOffset - 1, 0);
                    visibleRange.lastIndex = Math.min(visibleRange.lastIndex - indexOffset + 1, itemsCount);
                    var indexAfter = Math.max(Math.min(itemsCount - 1, indicesAffected.insertAfterIndex), -1),
                        indexBefore = Math.min(indexAfter + 1, itemsCount);

                    if (dragInfo) {
                        for (var i = indexAfter; i >= visibleRange.firstIndex; i--) {
                            if (!dragInfo._isIncluded(i + indexOffset)) {
                                indexAfter = i;
                                break;
                            } else if (i === visibleRange.firstIndex) {
                                indexAfter = -1;
                            }
                        }

                        for (var i = indexBefore; i < visibleRange.lastIndex; i++) {
                            if (!dragInfo._isIncluded(i + indexOffset)) {
                                indexBefore = i;
                                break;
                            } else if (i === (visibleRange.lastIndex - 1)) {
                                indexBefore = itemsCount;
                            }
                        }
                    }

                    var elementBefore = containerFromIndex(itemsContainer, indexBefore),
                        elementAfter = containerFromIndex(itemsContainer, indexAfter);

                    if (this._animatedDragItems) {
                        for (var i = 0, len = this._animatedDragItems.length; i < len; i++) {
                            var item = this._animatedDragItems[i];
                            if (item) {
                                item.style[transitionScriptName] = this._site.animationsDisabled ? "" : dragBetweenTransition;
                                item.style[transformNames.scriptName] = "";
                            }
                        }
                    }
                    this._animatedDragItems = [];
                    var horizontal = this.orientation === "horizontal",
                        inListMode = this._inListMode || this._itemsPerBar === 1;
                    if (this._groups && this._groups[groupAffected] instanceof Groups.CellSpanningGroup) {
                        inListMode = this._groups[groupAffected]._slotsPerColumn === 1;
                    }
                    var horizontalTransform = 0,
                        verticalTransform = 0;
                    // In general, items should slide in the direction perpendicular to the layout's orientation.
                    // In a horizontal layout, items are laid out top to bottom, left to right. For any two neighboring items in this layout, we want to move the first item up and the second down
                    // to denote that any inserted item would go between those two.
                    // Similarily, vertical layout should have the first item move left and the second move right.
                    // List layout is a special case. A horizontal list layout can only lay things out left to right, so it should slide the two items left and right like a vertical grid.
                    // A vertical list can only lay things out top to bottom, so it should slide items up and down like a horizontal grid.
                    // In other words: Apply horizontal transformations if we're a vertical grid or horizontal list, otherwise use vertical transformations.
                    if ((!horizontal && !inListMode) || (horizontal && inListMode)) {
                        horizontalTransform = this._site.rtl ? -dragBetweenDistance : dragBetweenDistance;
                    } else {
                        verticalTransform = dragBetweenDistance;
                    }
                    if (elementBefore) {
                        elementBefore.style[transitionScriptName] = this._site.animationsDisabled ? "" : dragBetweenTransition;
                        elementBefore.style[transformNames.scriptName] = "translate(" + horizontalTransform + "px, " + verticalTransform + "px)";
                        this._animatedDragItems.push(elementBefore);
                    }
                    if (elementAfter) {
                        elementAfter.style[transitionScriptName] = this._site.animationsDisabled ? "" : dragBetweenTransition;
                        elementAfter.style[transformNames.scriptName] = "translate(" + (-horizontalTransform) + "px, -" + verticalTransform + "px)";
                        this._animatedDragItems.push(elementAfter);
                    }
                },

                dragLeave: function _LayoutCommon_dragLeave() {
                    if (this._animatedDragItems) {
                        for (var i = 0, len = this._animatedDragItems.length; i < len; i++) {
                            this._animatedDragItems[i].style[transitionScriptName] = this._site.animationsDisabled ? "" : dragBetweenTransition;
                            this._animatedDragItems[i].style[transformNames.scriptName] = "";
                        }
                    }
                    this._animatedDragItems = [];
                },

                // Private methods

                _setMaxRowsOrColumns: function _LayoutCommon_setMaxRowsOrColumns(value) {
                    if (value === this._maxRowsOrColumns || this._inListMode) {
                        return;
                    }

                    // If container size is unavailable then we do not need to compute itemsPerBar
                    // as it will be computed along with the container size.
                    if (this._sizes && this._sizes.containerSizeLoaded) {
                        this._itemsPerBar = Math.floor(this._sizes.maxItemsContainerContentSize / this._sizes.containerCrossSize);
                        if (value) {
                            this._itemsPerBar = Math.min(this._itemsPerBar, value);
                        }
                        this._itemsPerBar = Math.max(1, this._itemsPerBar);
                    }
                    this._maxRowsOrColumns = value;

                    this._invalidateLayout();
                },

                _getItemPosition: function _LayoutCommon_getItemPosition(itemIndex) {
                    if (this._groupsEnabled) {
                        var groupIndex = Math.min(this._groups.length - 1, this._site.groupIndexFromItemIndex(itemIndex)),
                            group = this._groups[groupIndex],
                            itemOfGroupIndex = itemIndex - group.startIndex;
                        return this._getItemPositionForAnimations(itemIndex, groupIndex, itemOfGroupIndex);
                    } else {
                        return this._getItemPositionForAnimations(itemIndex, 0, itemIndex);
                    }
                },

                _getRealizationRange: function _LayoutCommon_getRealizationRange() {
                    var realizedRange = this._site.realizedRange;
                    return {
                        firstIndex: this._firstItemFromRange(realizedRange.firstPixel),
                        lastIndex: this._lastItemFromRange(realizedRange.lastPixel)
                    };
                },

                _getVisibleRange: function _LayoutCommon_getVisibleRange() {
                    var visibleRange = this._site.visibleRange;
                    return {
                        firstIndex: this._firstItemFromRange(visibleRange.firstPixel),
                        lastIndex: this._lastItemFromRange(visibleRange.lastPixel)
                    };
                },

                _resetAnimationCaches: function _LayoutCommon_resetAnimationCaches(skipReset) {
                    if (!skipReset) {
                        // Caches with move transforms:
                        this._resetStylesForRecords(this._cachedGroupRecords);
                        this._resetStylesForRecords(this._cachedItemRecords);
                        this._resetStylesForRecords(this._cachedHeaderRecords);

                        // Caches with insert transforms:
                        this._resetStylesForInsertedRecords(this._cachedInsertedItemRecords);
                        this._resetStylesForInsertedRecords(this._cachedInsertedHeaderRecords);

                        // Caches with insert transforms:
                        this._resetStylesForRemovedRecords(this._cachedRemovedItems);
                        this._resetStylesForRemovedRecords(this._cachedRemovedHeaders);

                        var itemsBlockKeys = Object.keys(this._animatingItemsBlocks);
                        for (var i = 0, len = itemsBlockKeys.length; i < len; i++) {
                            var itemsBlock = this._animatingItemsBlocks[itemsBlockKeys[i]];
                            itemsBlock.style.overflow = '';
                            itemsBlock.classList.remove(_Constants._clipClass);
                        }
                    }

                    this._cachedGroupRecords = {};
                    this._cachedItemRecords = {};
                    this._cachedHeaderRecords = {};

                    this._cachedInsertedItemRecords = {};
                    this._cachedInsertedHeaderRecords = {};

                    this._cachedRemovedItems = [];
                    this._cachedRemovedHeaders = [];

                    this._animatingItemsBlocks = {};
                },

                _cacheRemovedElements: function _LayoutCommon_cacheRemovedElements(modifiedElements, cachedRecords, cachedInsertedRecords, removedElements, areHeaders) {
                    var leftStr = "left";
                    if (this._site.rtl) {
                        leftStr = "right";
                    }
                    // Offset between the container's content box and its margin box
                    var outerX, outerY;
                    if (areHeaders) {
                        outerX = this._sizes.headerContainerOuterX;
                        outerY = this._sizes.headerContainerOuterY;
                    } else {
                        outerX = this._sizes.containerMargins[leftStr];
                        outerY = this._sizes.containerMargins.top;
                    }

                    // Cache the removed boxes and place them back in the DOM with position absolute
                    // so that they do not appear like they have moved.
                    for (var i = 0, len = modifiedElements.length; i < len; i++) {
                        var modifiedElementLookup = modifiedElements[i];
                        if (modifiedElementLookup.newIndex === -1) {
                            var container = modifiedElementLookup.element;
                            var cachedItemRecord = cachedRecords[modifiedElementLookup.oldIndex];
                            if (cachedItemRecord) {
                                cachedItemRecord.element = container;
                                // This item can no longer be a moved item.
                                delete cachedRecords[modifiedElementLookup.oldIndex];
                                container.style.position = "absolute";
                                container.style[transitionScriptName] = "";
                                container.style.top = cachedItemRecord.oldTop - outerY + "px";
                                container.style[leftStr] = cachedItemRecord.oldLeft - outerX + "px";
                                container.style.width = cachedItemRecord.width + "px";
                                container.style.height = cachedItemRecord.height + "px";
                                container.style[transformNames.scriptName] = "";
                                this._site.surface.appendChild(container);
                                removedElements.push(cachedItemRecord);
                            }
                            if (cachedInsertedRecords[modifiedElementLookup.oldIndex]) {
                                delete cachedInsertedRecords[modifiedElementLookup.oldIndex];
                            }
                        }
                    }
                },
                _cacheInsertedElements: function _LayoutCommon_cacheInsertedItems(modifiedElements, cachedInsertedRecords, cachedRecords) {
                    var newCachedInsertedRecords = {};

                    for (var i = 0, len = modifiedElements.length; i < len; i++) {
                        var modifiedElementLookup = modifiedElements[i];
                        var wasInserted = cachedInsertedRecords[modifiedElementLookup.oldIndex];
                        if (wasInserted) {
                            delete cachedInsertedRecords[modifiedElementLookup.oldIndex];
                        }

                        if (wasInserted || modifiedElementLookup.oldIndex === -1 || modifiedElementLookup.moved) {
                            var cachedRecord = cachedRecords[modifiedElementLookup.newIndex];
                            if (cachedRecord) {
                                delete cachedRecords[modifiedElementLookup.newIndex];
                            }

                            var modifiedElement = modifiedElementLookup.element;
                            newCachedInsertedRecords[modifiedElementLookup.newIndex] = modifiedElement;
                            modifiedElement.style[transitionScriptName] = "";
                            modifiedElement.style[transformNames.scriptName] = "";
                            modifiedElement.style.opacity = 0;
                        }
                    }

                    var keys = Object.keys(cachedInsertedRecords);
                    for (var i = 0, len = keys.length; i < len; i++) {
                        newCachedInsertedRecords[keys[i]] = cachedInsertedRecords[keys[i]];
                    }

                    return newCachedInsertedRecords;
                },
                _resetStylesForRecords: function _LayoutCommon_resetStylesForRecords(recordsHash) {
                    var recordKeys = Object.keys(recordsHash);
                    for (var i = 0, len = recordKeys.length; i < len; i++) {
                        var record = recordsHash[recordKeys[i]];
                        if (record.needsToResetTransform) {
                            record.element.style[transformNames.scriptName] = "";
                            record.needsToResetTransform = false;
                        }
                    }
                },
                _resetStylesForInsertedRecords: function _LayoutCommon_resetStylesForInsertedRecords(insertedRecords) {
                    var insertedRecordKeys = Object.keys(insertedRecords);
                    for (var i = 0, len = insertedRecordKeys.length; i < len; i++) {
                        var insertedElement = insertedRecords[insertedRecordKeys[i]];
                        insertedElement.style.opacity = 1;
                    }
                },
                _resetStylesForRemovedRecords: function _LayoutCommon_resetStylesForRemovedRecords(removedElements) {
                    for (var i = 0, len = removedElements.length; i < len; i++) {
                        var container = removedElements[i].element;
                        if (container.parentNode) {
                            _Dispose._disposeElement(container);
                            container.parentNode.removeChild(container);
                        }
                    }
                },
                _updateAnimationCache: function _LayoutCommon_updateAnimationCache(modifiedItems, modifiedGroups) {
                    // ItemBoxes can change containers so we have to start them back without transforms
                    // and then update them again. ItemsContainers don't need to do this.
                    this._resetStylesForRecords(this._cachedItemRecords);
                    this._resetStylesForRecords(this._cachedHeaderRecords);
                    // Go through all the inserted records and reset their insert transforms.
                    this._resetStylesForInsertedRecords(this._cachedInsertedItemRecords);
                    this._resetStylesForInsertedRecords(this._cachedInsertedHeaderRecords);

                    var existingContainers = {};
                    var realizationRange = this._getRealizationRange();
                    var tree = this._site.tree;
                    for (var i = 0, itemIndex = 0, treeLength = tree.length; i < treeLength; i++) {
                        forEachContainer(tree[i].itemsContainer, function (container) {
                            if (realizationRange.firstIndex <= itemIndex && realizationRange.lastIndex >= itemIndex) {
                                existingContainers[uniqueID(container)] = true;
                            }
                            itemIndex++;
                        });
                    }

                    // Update the indicies before the insert since insert needs the new containers.
                    function updateIndicies(modifiedElements, cachedRecords) {
                        var updatedCachedRecords = {};

                        for (var i = 0, len = modifiedElements.length; i < len; i++) {
                            var modifiedElementLookup = modifiedElements[i];
                            var cachedRecord = cachedRecords[modifiedElementLookup.oldIndex];
                            if (cachedRecord) {
                                updatedCachedRecords[modifiedElementLookup.newIndex] = cachedRecord;
                                cachedRecord.element = modifiedElementLookup.element;
                                delete cachedRecords[modifiedElementLookup.oldIndex];
                            }
                        }
                        var cachedRecordKeys = Object.keys(cachedRecords);
                        for (var i = 0, len = cachedRecordKeys.length; i < len; i++) {
                            var key = cachedRecordKeys[i],
                                record = cachedRecords[key];
                            // We need to filter out containers which were removed from the DOM. If container's item
                            // wasn't realized container can be removed without adding record to modifiedItems.
                            if (!record.element || existingContainers[uniqueID(record.element)]) {
                                updatedCachedRecords[key] = record;
                            }
                        }
                        return updatedCachedRecords;
                    }

                    this._cachedItemRecords = updateIndicies(modifiedItems, this._cachedItemRecords);
                    this._cachedHeaderRecords = updateIndicies(modifiedGroups, this._cachedHeaderRecords);

                    this._cachedInsertedItemRecords = this._cacheInsertedElements(modifiedItems, this._cachedInsertedItemRecords, this._cachedItemRecords);
                    this._cachedInsertedHeaderRecords = this._cacheInsertedElements(modifiedGroups, this._cachedInsertedHeaderRecords, this._cachedHeaderRecords);
                },
                _filterRemovedElements: function _LayoutCommon_filterRemovedElements() {
                    this._removedElements = [];

                    if (this._site.animationsDisabled) {
                        this._resetStylesForRemovedRecords(this._cachedRemovedItems);
                        this._resetStylesForRemovedRecords(this._cachedRemovedHeaders);
                        return;
                    }

                    var that = this;
                    var oldLeftStr = this.orientation === "horizontal" ? "oldLeft" : "oldTop";
                    var widthStr = this.orientation === "horizontal" ? "width" : "height";

                    var visibleFirstPixel = this._site.scrollbarPos;
                    var visibleLastPixel = visibleFirstPixel + this._site.viewportSize[widthStr] - 1;

                    function filterRemovedElements(removedRecordArray, removedElementsArray) {
                        for (var i = 0, len = removedRecordArray.length; i < len; i++) {
                            var removedItem = removedRecordArray[i];
                            var container = removedItem.element;
                            if (removedItem[oldLeftStr] + removedItem[widthStr] - 1 < visibleFirstPixel || removedItem[oldLeftStr] > visibleLastPixel || !that._site.viewport.contains(container)) {
                                if (container.parentNode) {
                                    _Dispose._disposeElement(container);
                                    container.parentNode.removeChild(container);
                                }
                            } else {
                                removedElementsArray.push(container);
                            }
                        }
                    }

                    filterRemovedElements(this._cachedRemovedItems, this._removedElements);
                    filterRemovedElements(this._cachedRemovedHeaders, this._removedElements);
                },

                _filterInsertedElements: function _LayoutCommon_filterInsertedElements() {
                    this._insertedElements = [];
                    if (this._site.animationsDisabled) {
                        this._resetStylesForInsertedRecords(this._cachedInsertedItemRecords);
                        this._resetStylesForInsertedRecords(this._cachedInsertedHeaderRecords);
                        return;
                    }

                    var that = this;
                    var visibleRange = this._getVisibleRange();

                    function filterInsertedElements(cachedInsertedRecords, insertedElementsArray) {
                        var recordKeys = Object.keys(cachedInsertedRecords);
                        for (var i = 0, len = recordKeys.length; i < len; i++) {
                            var itemIndex = recordKeys[i];
                            var insertedRecord = cachedInsertedRecords[itemIndex];
                            if (itemIndex < visibleRange.firstIndex || itemIndex > visibleRange.lastIndex || that._site.viewport.contains(insertedRecord.element)) {
                                insertedRecord.style.opacity = 1;
                            } else {
                                insertedElementsArray.push(insertedRecord);
                            }
                        }
                    }

                    filterInsertedElements(this._cachedInsertedItemRecords, this._insertedElements);
                    filterInsertedElements(this._cachedInsertedHeaderRecords, this._insertedElements);
                },

                _filterMovedElements: function _LayoutCommon_filterMovedElements() {
                    var that = this;

                    // This filters all the items and groups down which could have moved to just the items on screen.
                    // The items which are not going to animate are immediately shown in their correct final location.
                    var oldLeftStr = this.orientation === "horizontal" ? "oldLeft" : "oldTop";
                    var leftStr = this.orientation === "horizontal" ? "left" : "top";
                    var widthStr = this.orientation === "horizontal" ? "width" : "height";

                    var realizationRange = this._getRealizationRange();
                    var visibleFirstPixel = this._site.scrollbarPos;
                    var visibleLastPixel = visibleFirstPixel + this._site.viewportSize[widthStr] - 1;

                    // ItemMove can reflow across column or fade in/out due to multisize.
                    this._itemMoveRecords = [];
                    this._moveRecords = [];

                    if (!this._site.animationsDisabled) {
                        var tree = this._site.tree;
                        var itemIndex = 0;
                        for (var i = 0, treeLength = tree.length; i < treeLength; i++) {
                            var groupBundle = tree[i];
                            var groupHasItemToAnimate = false;

                            forEachContainer(groupBundle.itemsContainer, function () {
                                if (realizationRange.firstIndex <= itemIndex && realizationRange.lastIndex >= itemIndex) {
                                    var cachedItemRecord = this._cachedItemRecords[itemIndex];
                                    if (cachedItemRecord) {
                                        var shouldAnimate = ((cachedItemRecord[oldLeftStr] + cachedItemRecord[widthStr] - 1 >= visibleFirstPixel && cachedItemRecord[oldLeftStr] <= visibleLastPixel) ||
                                                            (cachedItemRecord[leftStr] + cachedItemRecord[widthStr] - 1 >= visibleFirstPixel && cachedItemRecord[leftStr] <= visibleLastPixel)) &&
                                                            that._site.viewport.contains(cachedItemRecord.element);
                                        if (shouldAnimate) {
                                            groupHasItemToAnimate = true;
                                            if (cachedItemRecord.needsToResetTransform) {
                                                this._itemMoveRecords.push(cachedItemRecord);
                                                delete this._cachedItemRecords[itemIndex];
                                            }
                                        }
                                    }
                                }
                                itemIndex++;
                            }.bind(this));

                            var groupIndex = i;
                            var cachedHeaderRecord = this._cachedHeaderRecords[groupIndex];
                            if (cachedHeaderRecord) {
                                if (groupHasItemToAnimate && cachedHeaderRecord.needsToResetTransform) {
                                    this._moveRecords.push(cachedHeaderRecord);
                                    delete this._cachedHeaderRecords[groupIndex];
                                }
                            }

                            var cachedGroupRecord = this._cachedGroupRecords[uniqueID(groupBundle.itemsContainer.element)];
                            if (cachedGroupRecord) {
                                if (groupHasItemToAnimate && cachedGroupRecord.needsToResetTransform) {
                                    this._moveRecords.push(cachedGroupRecord);
                                    delete this._cachedGroupRecords[uniqueID(groupBundle.itemsContainer.element)];
                                }
                            }
                        }
                    }

                    // Reset transform for groups and items that were never on screen.
                    this._resetStylesForRecords(this._cachedGroupRecords);
                    this._resetStylesForRecords(this._cachedItemRecords);
                    this._resetStylesForRecords(this._cachedHeaderRecords);
                },

                _getItemPositionForAnimations: function _LayoutCommon_getItemPositionForAnimations(itemIndex, groupIndex, itemOfGroupIndex) {
                    // Top/Left are used to know if the item has moved and also used to position the item if removed.
                    // Row/Column are used to know if a reflow animation should occur
                    // Height/Width are used when positioning a removed item without impacting layout.
                    // The returned rectangle refers to the win-container's border/padding/content box. Coordinates
                    // are relative to the viewport.
                    var group = this._groups[groupIndex];
                    var itemPosition = group.getItemPositionForAnimations(itemOfGroupIndex);
                    var groupOffset = (this._groups[groupIndex] ? this._groups[groupIndex].offset : 0);
                    var headerWidth = (this._groupsEnabled && this._groupHeaderPosition === HeaderPosition.left ? this._sizes.headerContainerWidth : 0);
                    var headerHeight = (this._groupsEnabled && this._groupHeaderPosition === HeaderPosition.top ? this._sizes.headerContainerHeight : 0);

                    itemPosition.left += this._sizes.layoutOriginX + headerWidth + this._sizes.itemsContainerOuterX;
                    itemPosition.top += this._sizes.layoutOriginY + headerHeight + this._sizes.itemsContainerOuterY;
                    itemPosition[this._horizontal ? "left" : "top"] += groupOffset;
                    return itemPosition;
                },

                _getHeaderPositionForAnimations: function (groupIndex) {
                    // Top/Left are used to know if the item has moved.
                    // Height/Width are used when positioning a removed item without impacting layout.
                    // The returned rectangle refers to the header container's content box. Coordinates
                    // are relative to the viewport.

                    var headerPosition;

                    if (this._groupsEnabled) {
                        var width = this._sizes.headerContainerWidth - this._sizes.headerContainerOuterWidth,
                            height = this._sizes.headerContainerHeight - this._sizes.headerContainerOuterHeight;
                        if (this._groupHeaderPosition === HeaderPosition.left && !this._horizontal) {
                            height = this._groups[groupIndex].getItemsContainerSize() - this._sizes.headerContainerOuterHeight;
                        } else if (this._groupHeaderPosition === HeaderPosition.top && this._horizontal) {
                            width = this._groups[groupIndex].getItemsContainerSize() - this._sizes.headerContainerOuterWidth;
                        }

                        var offsetX = this._horizontal ? this._groups[groupIndex].offset : 0,
                            offsetY = this._horizontal ? 0 : this._groups[groupIndex].offset;
                        headerPosition = {
                            top: this._sizes.layoutOriginY + offsetY + this._sizes.headerContainerOuterY,
                            left: this._sizes.layoutOriginX + offsetX + this._sizes.headerContainerOuterX,
                            height: height,
                            width: width
                        };
                    } else {
                        headerPosition = {
                            top: 0,
                            left: 0,
                            height: 0,
                            width: 0
                        };
                    }
                    return headerPosition;
                },

                _rangeContainsItems: function _LayoutCommon_rangeContainsItems(firstPixel, lastPixel) {
                    if (this._groups.length === 0) {
                        return false;
                    } else {
                        var lastGroup = this._groups[this._groups.length - 1],
                            lastPixelOfLayout = this._sizes.layoutOrigin + lastGroup.offset + this._getGroupSize(lastGroup) - 1;

                        return lastPixel >= 0 && firstPixel <= lastPixelOfLayout;
                    }
                },

                _itemFromOffset: function _LayoutCommon_itemFromOffset(offset, options) {
                    // supported options are:
                    // - wholeItem: when set to true the fully visible item is returned
                    // - last: if 1 the last item is returned. if 0 the first
                    var that = this;
                    if (this._groups.length === 0) {
                        return 0;
                    }

                    function assignItemMargins(offset) {
                        if (!options.wholeItem) {
                            // This makes it such that if a container's margin is on screen but all of its
                            // content is off screen then we'll treat the container as being off screen.
                            var marginPropLast = (that._horizontal ? (that._site.rtl ? "right" : "left") : "top"),
                                marginPropFirst = (that._horizontal ? (that._site.rtl ? "left" : "right") : "bottom");
                            if (options.last) {
                                // When looking for the *last* item, treat all container margins
                                // as belonging to the container *before* the margin.
                                return offset - that._sizes.containerMargins[marginPropLast];
                            } else {
                                // When looking for the *first* item, treat all container margins
                                // as belonging to the container *after* the margin.
                                return offset + that._sizes.containerMargins[marginPropFirst];
                            }
                        }
                        return offset;
                    }

                    // Assign the headers and margins to the appropriate groups.
                    function assignGroupMarginsAndHeaders(offset) {
                        if (options.last) {
                            // When looking for the *last* group, the *trailing* header and margin belong to the group.
                            return offset - that._getHeaderSizeGroupAdjustment() - that._sizes.itemsContainerOuterStart;
                        } else {
                            // When looking for the *first* group, the *leading* header and margin belong to the group.
                            // No need to make any adjustments to offset because the correct header and margin
                            // already belong to the group.
                            return offset;
                        }
                    }

                    options = options || {};

                    // Make offset relative to layout's content box
                    offset -= this._sizes.layoutOrigin;

                    offset = assignItemMargins(offset);

                    var groupIndex = this._groupFromOffset(assignGroupMarginsAndHeaders(offset)),
                        group = this._groups[groupIndex];

                    // Make offset relative to the margin box of the group's items container
                    offset -= group.offset;
                    offset -= this._getHeaderSizeGroupAdjustment();

                    return group.startIndex + group.itemFromOffset(offset, options);
                },

                _firstItemFromRange: function _LayoutCommon_firstItemFromRange(firstPixel, options) {
                    // supported options are:
                    // - wholeItem: when set to true the first fully visible item is returned
                    options = options || {};
                    options.last = 0;
                    return this._itemFromOffset(firstPixel, options);
                },

                _lastItemFromRange: function _LayoutCommon_lastItemFromRange(lastPixel, options) {
                    // supported options are:
                    // - wholeItem: when set to true the last fully visible item is returned
                    options = options || {};
                    options.last = 1;
                    return this._itemFromOffset(lastPixel, options);
                },

                _adjustedKeyForRTL: function _LayoutCommon_adjustedKeyForRTL(key) {
                    if (this._site.rtl) {
                        if (key === Key.leftArrow) {
                            key = Key.rightArrow;
                        } else if (key === Key.rightArrow) {
                            key = Key.leftArrow;
                        }
                    }
                    return key;
                },

                _adjustedKeyForOrientationAndBars: function _LayoutCommon_adjustedKeyForOrientationAndBars(key, cellSpanningGroup) {
                    var newKey = key;

                    // Don't support cell spanning
                    if (cellSpanningGroup) {
                        return key;
                    }
                    // First, convert the key into a virtual form based off of horizontal layouts.
                    // In a horizontal layout, left/right keys switch between columns (AKA "bars"), and
                    // up/down keys switch between rows (AKA "slots").
                    // In vertical mode, we want up/down to switch between rows (AKA "bars" when vertical),
                    // and left/right to switch between columns (AKA "slots" when vertical).
                    // The first step is to convert keypresses in vertical so that up/down always correspond to moving between slots,
                    // and left/right moving between bars.
                    if (!this._horizontal) {
                        switch (newKey) {
                            case Key.leftArrow:
                                newKey = Key.upArrow;
                                break;
                            case Key.rightArrow:
                                newKey = Key.downArrow;
                                break;
                            case Key.upArrow:
                                newKey = Key.leftArrow;
                                break;
                            case Key.downArrow:
                                newKey = Key.rightArrow;
                                break;
                        }
                    }

                    // Next, if we only have one item per bar, we'll make the change-slots-key the same as the change-bars-key
                    if (this._itemsPerBar === 1) {
                        if (newKey === Key.upArrow) {
                            newKey = Key.leftArrow;
                        } else if (newKey === Key.downArrow) {
                            newKey = Key.rightArrow;
                        }
                    }

                    return newKey;
                },

                _getAdjacentForPageKeys: function _LayoutCommon_getAdjacentForPageKeys(currentItem, pressedKey) {
                    var containerMargins = this._sizes.containerMargins,
                        marginSum = (this.orientation === "horizontal" ?
                            containerMargins.left + containerMargins.right :
                            containerMargins.top + containerMargins.bottom);

                    var viewportLength = this._site.viewportSize[this.orientation === "horizontal" ? "width" : "height"],
                        firstPixel = this._site.scrollbarPos,
                        lastPixel = firstPixel + viewportLength - 1 - containerMargins[(this.orientation === "horizontal" ? "right" : "bottom")],
                        newFocus;

                    // Handles page up by attempting to choose the first fully visible item
                    // on the current page. If that item already has focus, chooses the
                    // first item on the previous page. Page down is handled similarly.

                    var firstIndex = this._firstItemFromRange(firstPixel, { wholeItem: true }),
                        lastIndex = this._lastItemFromRange(lastPixel, { wholeItem: false }),
                        currentItemPosition = this._getItemPosition(currentItem.index);


                    var offscreen = false;
                    if (currentItem.index < firstIndex || currentItem.index > lastIndex) {
                        offscreen = true;
                        if (this.orientation === "horizontal") {
                            firstPixel = currentItemPosition.left - marginSum;
                        } else {
                            firstPixel = currentItemPosition.top - marginSum;
                        }
                        lastPixel = firstPixel + viewportLength - 1;
                        firstIndex = this._firstItemFromRange(firstPixel, { wholeItem: true });
                        lastIndex = this._lastItemFromRange(lastPixel, { wholeItem: false });
                    }

                    if (pressedKey === Key.pageUp) {
                        if (!offscreen && firstIndex !== currentItem.index) {
                            return { type: _UI.ObjectType.item, index: firstIndex };
                        }
                        var end;
                        if (this.orientation === "horizontal") {
                            end = currentItemPosition.left + currentItemPosition.width + marginSum + containerMargins.left;
                        } else {
                            end = currentItemPosition.top + currentItemPosition.height + marginSum + containerMargins.bottom;
                        }
                        var firstIndexOnPrevPage = this._firstItemFromRange(end - viewportLength, { wholeItem: true });
                        if (currentItem.index === firstIndexOnPrevPage) {
                            // The current item is so big that it spanned from the previous page, so we want to at least
                            // move to the previous item.
                            newFocus = Math.max(0, currentItem.index - this._itemsPerBar);
                        } else {
                            newFocus = firstIndexOnPrevPage;
                        }
                    } else {
                        if (!offscreen && lastIndex !== currentItem.index) {
                            return { type: _UI.ObjectType.item, index: lastIndex };
                        }
                        // We need to subtract twice the marginSum from the item's starting position because we need to
                        // consider that ensureVisible will scroll the viewport to include the new items margin as well
                        // which may push the current item just off screen.
                        var start;
                        if (this.orientation === "horizontal") {
                            start = currentItemPosition.left - marginSum - containerMargins.right;
                        } else {
                            start = currentItemPosition.top - marginSum - containerMargins.bottom;
                        }
                        var lastIndexOnNextPage = Math.max(0, this._lastItemFromRange(start + viewportLength - 1, { wholeItem: true }));
                        if (currentItem.index === lastIndexOnNextPage) {
                            // The current item is so big that it spans across the next page, so we want to at least
                            // move to the next item. It is also ok to blindly increment this index w/o bound checking
                            // since the browse mode clamps the bounds for page keys. This way we do not have to
                            // asynchronoulsy request the count here.
                            newFocus = currentItem.index + this._itemsPerBar;
                        } else {
                            newFocus = lastIndexOnNextPage;
                        }
                    }

                    return { type: _UI.ObjectType.item, index: newFocus };
                },

                _isCellSpanning: function _LayoutCommon_isCellSpanning(groupIndex) {
                    var group = this._site.groupFromIndex(groupIndex),
                        groupInfo = this._groupInfo;

                    if (groupInfo) {
                        return !!(typeof groupInfo === "function" ? groupInfo(group) : groupInfo).enableCellSpanning;
                    } else {
                        return false;
                    }
                },

                // Can only be called after measuring has been completed
                _getGroupInfo: function _LayoutCommon_getGroupInfo(groupIndex) {
                    var group = this._site.groupFromIndex(groupIndex),
                        groupInfo = this._groupInfo,
                        margins = this._sizes.containerMargins,
                        adjustedInfo = { enableCellSpanning: false };

                    groupInfo = (typeof groupInfo === "function" ? groupInfo(group) : groupInfo);
                    if (groupInfo) {
                        if (groupInfo.enableCellSpanning && (+groupInfo.cellWidth !== groupInfo.cellWidth || +groupInfo.cellHeight !== groupInfo.cellHeight)) {
                            throw new _ErrorFromName("WinJS.UI.GridLayout.GroupInfoResultIsInvalid", strings.groupInfoResultIsInvalid);
                        }
                        adjustedInfo = {
                            enableCellSpanning: !!groupInfo.enableCellSpanning,
                            cellWidth: groupInfo.cellWidth + margins.left + margins.right,
                            cellHeight: groupInfo.cellHeight + margins.top + margins.bottom
                        };
                    }

                    return adjustedInfo;
                },

                // itemIndex is optional
                _getItemInfo: function _LayoutCommon_getItemInfo(itemIndex) {
                    var result;
                    if (!this._itemInfo || typeof this._itemInfo !== "function") {
                        if (this._useDefaultItemInfo) {
                            result = this._defaultItemInfo(itemIndex);
                        } else {
                            throw new _ErrorFromName("WinJS.UI.GridLayout.ItemInfoIsInvalid", strings.itemInfoIsInvalid);
                        }
                    } else {
                        result = this._itemInfo(itemIndex);
                    }
                    return Promise.as(result).then(function (size) {
                        if (!size || +size.width !== size.width || +size.height !== size.height) {
                            throw new _ErrorFromName("WinJS.UI.GridLayout.ItemInfoIsInvalid", strings.itemInfoIsInvalid);
                        }
                        return size;
                    });
                },

                _defaultItemInfo: function _LayoutCommon_defaultItemInfo(itemIndex) {
                    var that = this;
                    return this._site.renderItem(this._site.itemFromIndex(itemIndex)).then(function (element) {
                        that._elementsToMeasure[itemIndex] = {
                            element: element
                        };
                        return that._measureElements();
                    }).then(
                        function () {
                            var entry = that._elementsToMeasure[itemIndex],
                                size = {
                                    width: entry.width,
                                    height: entry.height
                                };

                            delete that._elementsToMeasure[itemIndex];
                            return size;
                        },
                        function (error) {
                            delete that._elementsToMeasure[itemIndex];
                            return Promise.wrapError(error);
                        }
                    );
                },

                _getGroupSize: function _LayoutCommon_getGroupSize(group) {
                    var headerContainerMinSize = 0;

                    if (this._groupsEnabled) {
                        if (this._horizontal && this._groupHeaderPosition === HeaderPosition.top) {
                            headerContainerMinSize = this._sizes.headerContainerMinWidth;
                        } else if (!this._horizontal && this._groupHeaderPosition === HeaderPosition.left) {
                            headerContainerMinSize = this._sizes.headerContainerMinHeight;
                        }
                    }
                    return Math.max(headerContainerMinSize, group.getItemsContainerSize() + this._getHeaderSizeGroupAdjustment());
                },

                // offset should be relative to the grid layout's content box
                _groupFromOffset: function _LayoutCommon_groupFromOffset(offset) {
                    return offset < this._groups[0].offset ?
                        0 :
                        this._groupFrom(function (group) {
                            return offset < group.offset;
                        });
                },

                _groupFromImpl: function _LayoutCommon_groupFromImpl(fromGroup, toGroup, comp) {
                    if (toGroup < fromGroup) {
                        return null;
                    }

                    var center = fromGroup + Math.floor((toGroup - fromGroup) / 2),
                        centerGroup = this._groups[center];

                    if (comp(centerGroup, center)) {
                        return this._groupFromImpl(fromGroup, center - 1, comp);
                    } else if (center < toGroup && !comp(this._groups[center + 1], center + 1)) {
                        return this._groupFromImpl(center + 1, toGroup, comp);
                    } else {
                        return center;
                    }
                },

                _groupFrom: function _LayoutCommon_groupFrom(comp) {
                    if (this._groups.length > 0) {
                        var lastGroupIndex = this._groups.length - 1,
                            lastGroup = this._groups[lastGroupIndex];

                        if (!comp(lastGroup, lastGroupIndex)) {
                            return lastGroupIndex;
                        } else {
                            return this._groupFromImpl(0, this._groups.length - 1, comp);
                        }
                    } else {
                        return null;
                    }
                },

                _invalidateLayout: function _LayoutCommon_invalidateLayout() {
                    if (this._site) {
                        this._site.invalidateLayout();
                    }
                },

                _resetMeasurements: function _LayoutCommon_resetMeasurements() {
                    if (this._measuringPromise) {
                        this._measuringPromise.cancel();
                        this._measuringPromise = null;
                    }
                    if (this._containerSizeClassName) {
                        _ElementUtilities.removeClass(this._site.surface, this._containerSizeClassName);
                        deleteDynamicCssRule(this._containerSizeClassName);
                        this._containerSizeClassName = null;
                    }
                    this._sizes = null;
                    this._resetAnimationCaches();
                },

                _measureElements: function _LayoutCommon_measureElements() {
                    // batching measurements to minimalize number of layout passes
                    if (!this._measuringElements) {
                        var that = this;
                        // Schedule a job so that:
                        //  1. Calls to _measureElements are batched.
                        //  2. that._measuringElements is set before the promise handler is executed
                        //     (that._measuringElements is used within the handler).
                        that._measuringElements = Scheduler.schedulePromiseHigh(null, "WinJS.UI.GridLayout._measuringElements").then(
                            function measure() {
                                that._site._writeProfilerMark("_measureElements,StartTM");

                                var surface = that._createMeasuringSurface(),
                                    itemsContainer = _Global.document.createElement("div"),
                                    site = that._site,
                                    measuringElements = that._measuringElements,
                                    elementsToMeasure = that._elementsToMeasure,
                                    stopMeasuring = false;

                                itemsContainer.className = _Constants._itemsContainerClass + " " + _Constants._laidOutClass;
                                // This code is executed by CellSpanningGroups where styling is configured for –ms-grid. Let's satisfy these assumptions
                                itemsContainer.style.cssText +=
                                        ";display: -ms-grid" +
                                        ";-ms-grid-column: 1" +
                                        ";-ms-grid-row: 1";

                                var keys = Object.keys(elementsToMeasure),
                                    len,
                                    i;

                                for (i = 0, len = keys.length; i < len; i++) {
                                    var element = elementsToMeasure[keys[i]].element;
                                    element.style["-ms-grid-column"] = i + 1;
                                    element.style["-ms-grid-row"] = i + 1;
                                    itemsContainer.appendChild(element);
                                }

                                surface.appendChild(itemsContainer);
                                site.viewport.insertBefore(surface, site.viewport.firstChild);

                                // Reading from the DOM may cause the app's resize handler to
                                // be run synchronously which may invalidate this measuring
                                // operation. When this happens, stop measuring.
                                measuringElements.then(null, function () {
                                    stopMeasuring = true;
                                });

                                for (i = 0, len = keys.length; i < len && !stopMeasuring; i++) {
                                    var entry = elementsToMeasure[keys[i]],
                                        item = entry.element.querySelector("." + _Constants._itemClass);

                                    entry.width = _ElementUtilities.getTotalWidth(item);
                                    entry.height = _ElementUtilities.getTotalHeight(item);

                                }

                                if (surface.parentNode) {
                                    surface.parentNode.removeChild(surface);
                                }
                                if (measuringElements === that._measuringElements) {
                                    that._measuringElements = null;
                                }

                                site._writeProfilerMark("_measureElements,StopTM");
                            },
                            function (error) {
                                that._measuringElements = null;
                                return Promise.wrapError(error);
                            }
                        );
                    }
                    return this._measuringElements;
                },

                _ensureEnvInfo: function _LayoutCommon_ensureEnvInfo() {
                    if (!this._envInfo) {
                        this._envInfo = getEnvironmentSupportInformation(this._site);
                        if (this._envInfo && !this._envInfo.supportsCSSGrid) {
                            _ElementUtilities.addClass(this._site.surface, _Constants._noCSSGrid);
                        }
                    }
                    return !!this._envInfo;
                },

                _createMeasuringSurface: function _LayoutCommon_createMeasuringSurface() {
                    var surface = _Global.document.createElement("div");

                    surface.style.cssText =
                        "visibility: hidden" +
                        ";-ms-grid-columns: auto" +
                        ";-ms-grid-rows: auto" +
                        ";-ms-flex-align: start" +
                        ";-webkit-align-items: flex-start" +
                        ";align-items: flex-start";
                    surface.className = _Constants._scrollableClass + " " + (this._inListMode ? _Constants._listLayoutClass : _Constants._gridLayoutClass);
                    if (!this._envInfo.supportsCSSGrid) {
                        _ElementUtilities.addClass(surface, _Constants._noCSSGrid);
                    }
                    if (this._groupsEnabled) {
                        if (this._groupHeaderPosition === HeaderPosition.top) {
                            _ElementUtilities.addClass(surface, _Constants._headerPositionTopClass);
                        } else {
                            _ElementUtilities.addClass(surface, _Constants._headerPositionLeftClass);
                        }
                    }

                    return surface;
                },

                // Assumes that the size of the item at the specified index is representative
                // of the size of all items, measures it, and stores the measurements in
                // this._sizes. If necessary, also:
                // - Creates a CSS rule to give the containers a height and width
                // - Stores the name associated with the rule in this._containerSizeClassName
                // - Adds the class name associated with the rule to the surface
                _measureItem: function _LayoutCommon_measureItem(index) {
                    var that = this;
                    var perfId = "Layout:measureItem";
                    var site = that._site;
                    var measuringPromise = that._measuringPromise;

                    // itemPromise is optional. It is provided when taking a second attempt at measuring.
                    function measureItemImpl(index, itemPromise) {
                        var secondTry = !!itemPromise,
                            elementPromises = {},
                            itemPromise,
                            left = site.rtl ? "right" : "left";

                        return site.itemCount.then(function (count) {
                            if (!count || (that._groupsEnabled && !site.groupCount)) {
                                return Promise.cancel;
                            }

                            itemPromise = itemPromise || site.itemFromIndex(index);
                            elementPromises.container = site.renderItem(itemPromise);
                            if (that._groupsEnabled) {
                                elementPromises.headerContainer = site.renderHeader(that._site.groupFromIndex(site.groupIndexFromItemIndex(index)));
                            }

                            return Promise.join(elementPromises);
                        }).then(function (elements) {

                            // Reading from the DOM is tricky because each read may trigger a resize handler which
                            // may invalidate this layout object. To make it easier to minimize bugs in this edge case:
                            //  1. All DOM reads for _LayoutCommon_measureItem should be contained within this function.
                            //  2. This function should remain as simple as possible. Stick to DOM reads, avoid putting
                            //     logic in here, and cache all needed instance variables at the top of the function.
                            //
                            // Returns null if the measuring operation was invalidated while reading from the DOM.
                            // Otherwise, returns an object containing the measurements.
                            function readMeasurementsFromDOM() {
                                var horizontal = that._horizontal;
                                var groupsEnabled = that._groupsEnabled;
                                var stopMeasuring = false;

                                // Reading from the DOM may cause the app's resize handler to
                                // be run synchronously which may invalidate this measuring
                                // operation. When this happens, stop measuring.
                                measuringPromise.then(null, function () {
                                    stopMeasuring = true;
                                });

                                var firstElementOnSurfaceMargins = getMargins(firstElementOnSurface);
                                var firstElementOnSurfaceOffsetX = site.rtl ?
                                    (site.viewport.offsetWidth - (firstElementOnSurface.offsetLeft + firstElementOnSurface.offsetWidth)) :
                                    firstElementOnSurface.offsetLeft;
                                var firstElementOnSurfaceOffsetY = firstElementOnSurface.offsetTop;

                                var sizes = {
                                    // These will be set by _viewportSizeChanged
                                    viewportContentSize: 0,
                                    surfaceContentSize: 0,
                                    maxItemsContainerContentSize: 0,

                                    surfaceOuterHeight: getOuterHeight(surface),
                                    surfaceOuterWidth: getOuterWidth(surface),

                                    // Origin of the grid layout's content in viewport coordinates
                                    layoutOriginX: firstElementOnSurfaceOffsetX - firstElementOnSurfaceMargins[left],
                                    layoutOriginY: firstElementOnSurfaceOffsetY - firstElementOnSurfaceMargins.top,
                                    itemsContainerOuterHeight: getOuterHeight(itemsContainer),
                                    itemsContainerOuterWidth: getOuterWidth(itemsContainer),
                                    // Amount of space between the items container's margin and its content
                                    itemsContainerOuterX: getOuter(site.rtl ? "Right" : "Left", itemsContainer),
                                    itemsContainerOuterY: getOuter("Top", itemsContainer),
                                    itemsContainerMargins: getMargins(itemsContainer),

                                    itemBoxOuterHeight: getOuterHeight(itemBox),
                                    itemBoxOuterWidth: getOuterWidth(itemBox),
                                    containerOuterHeight: getOuterHeight(elements.container),
                                    containerOuterWidth: getOuterWidth(elements.container),
                                    emptyContainerContentHeight: _ElementUtilities.getContentHeight(emptyContainer),
                                    emptyContainerContentWidth: _ElementUtilities.getContentWidth(emptyContainer),

                                    containerMargins: getMargins(elements.container),
                                    // containerWidth/Height are computed when a uniform group is detected
                                    containerWidth: 0,
                                    containerHeight: 0,
                                    // true when both containerWidth and containerHeight have been measured
                                    containerSizeLoaded: false
                                };

                                if (groupsEnabled) {
                                    // Amount of space between the header container's margin and its content
                                    sizes.headerContainerOuterX = getOuter(site.rtl ? "Right" : "Left", elements.headerContainer),
                                    sizes.headerContainerOuterY = getOuter("Top", elements.headerContainer),

                                    sizes.headerContainerOuterWidth = getOuterWidth(elements.headerContainer);
                                    sizes.headerContainerOuterHeight = getOuterHeight(elements.headerContainer);
                                    sizes.headerContainerWidth = _ElementUtilities.getTotalWidth(elements.headerContainer);
                                    sizes.headerContainerHeight = _ElementUtilities.getTotalHeight(elements.headerContainer);
                                    sizes.headerContainerMinWidth = getDimension(elements.headerContainer, "minWidth") + sizes.headerContainerOuterWidth;
                                    sizes.headerContainerMinHeight = getDimension(elements.headerContainer, "minHeight") + sizes.headerContainerOuterHeight;
                                }

                                var measurements = {
                                    // Measurements which are needed after measureItem has returned.
                                    sizes: sizes,

                                    // Measurements which are only needed within measureItem.
                                    viewportContentWidth: _ElementUtilities.getContentWidth(site.viewport),
                                    viewportContentHeight: _ElementUtilities.getContentHeight(site.viewport),
                                    containerContentWidth: _ElementUtilities.getContentWidth(elements.container),
                                    containerContentHeight: _ElementUtilities.getContentHeight(elements.container),
                                    containerWidth: _ElementUtilities.getTotalWidth(elements.container),
                                    containerHeight: _ElementUtilities.getTotalHeight(elements.container)
                                };
                                measurements.viewportCrossSize = measurements[horizontal ? "viewportContentHeight" : "viewportContentWidth"];

                                site.readyToMeasure();

                                return stopMeasuring ? null : measurements;
                            }

                            function cleanUp() {
                                if (surface.parentNode) {
                                    surface.parentNode.removeChild(surface);
                                }
                            }

                            var surface = that._createMeasuringSurface(),
                                itemsContainer = _Global.document.createElement("div"),
                                emptyContainer = _Global.document.createElement("div"),
                                itemBox = elements.container.querySelector("." + _Constants._itemBoxClass),
                                groupIndex = site.groupIndexFromItemIndex(index);

                            emptyContainer.className = _Constants._containerClass;
                            itemsContainer.className = _Constants._itemsContainerClass + " " + _Constants._laidOutClass;
                            // Use display=inline-block so that the width sizes to content when not in list mode.
                            // When in grid mode, put items container and header container in different rows and columns so that the size of the items container does not affect the size of the header container and vice versa.
                            // Use the same for list mode when headers are inline with item containers.
                            // When headers are to the left of a vertical list, or above a horizontal list, put the rows/columns they would be in when laid out normally
                            // into the CSS text for measuring. We have to do this because list item containers should take up 100% of the space left over in the surface
                            // once the group's header is laid out.
                            var itemsContainerRow = 1,
                                itemsContainerColumn = 1,
                                headerContainerRow = 2,
                                headerContainerColumn = 2,
                                firstElementOnSurface = itemsContainer,
                                addHeaderFirst = false;
                            if (that._inListMode && that._groupsEnabled) {
                                if (that._horizontal && that._groupHeaderPosition === HeaderPosition.top) {
                                    itemsContainerRow = 2;
                                    headerContainerColumn = 1;
                                    headerContainerRow = 1;
                                    firstElementOnSurface = elements.headerContainer;
                                    addHeaderFirst = true;
                                } else if (!that._horizontal && that._groupHeaderPosition === HeaderPosition.left) {
                                    itemsContainerColumn = 2;
                                    headerContainerColumn = 1;
                                    headerContainerRow = 1;
                                    firstElementOnSurface = elements.headerContainer;
                                    addHeaderFirst = true;
                                }
                            }
                            // ListMode needs to use display block to proprerly measure items in vertical mode, and display flex to properly measure items in horizontal mode
                            itemsContainer.style.cssText +=
                                    ";display: " + (that._inListMode ? ((that._horizontal ? "flex" : "block") + "; overflow: hidden") : "inline-block") +
                                     ";vertical-align:top" +
                                    ";-ms-grid-column: " + itemsContainerColumn +
                                    ";-ms-grid-row: " + itemsContainerRow;
                            if (!that._inListMode) {
                                elements.container.style.display = "inline-block";
                            }
                            if (that._groupsEnabled) {
                                elements.headerContainer.style.cssText +=
                                    ";display: inline-block" +
                                    ";-ms-grid-column: " + headerContainerColumn +
                                    ";-ms-grid-row: " + headerContainerRow;
                                _ElementUtilities.addClass(elements.headerContainer, _Constants._laidOutClass + " " + _Constants._groupLeaderClass);
                                if ((that._groupHeaderPosition === HeaderPosition.top && that._horizontal) ||
                                    (that._groupHeaderPosition === HeaderPosition.left && !that._horizontal)) {
                                    _ElementUtilities.addClass(itemsContainer, _Constants._groupLeaderClass);
                                }
                            }
                            if (addHeaderFirst) {
                                surface.appendChild(elements.headerContainer);
                            }

                            itemsContainer.appendChild(elements.container);
                            itemsContainer.appendChild(emptyContainer);

                            surface.appendChild(itemsContainer);
                            if (!addHeaderFirst && that._groupsEnabled) {
                                surface.appendChild(elements.headerContainer);
                            }
                            site.viewport.insertBefore(surface, site.viewport.firstChild);

                            var measurements = readMeasurementsFromDOM();

                            if (!measurements) {
                                // While reading from the DOM, the measuring operation was invalidated. Bail out.
                                cleanUp();
                                return Promise.cancel;
                            } else if ((that._horizontal && measurements.viewportContentHeight === 0) || (!that._horizontal && measurements.viewportContentWidth === 0)) {
                                // ListView is invisible so we can't measure. Return a canceled promise.
                                cleanUp();
                                return Promise.cancel;
                            } else if (!secondTry && !that._isCellSpanning(groupIndex) &&
                                    (measurements.containerContentWidth === 0 || measurements.containerContentHeight === 0)) {
                                // win-container has no size. For backwards compatibility, wait for the item promise and then try measuring again.
                                cleanUp();
                                return itemPromise.then(function () {
                                    return measureItemImpl(index, itemPromise);
                                });
                            } else {
                                var sizes = that._sizes = measurements.sizes;

                                // Wrappers for orientation-specific properties.
                                // Sizes prefaced with "cross" refer to the sizes orthogonal to the current layout orientation. Sizes without a preface are in the orientation's direction.
                                Object.defineProperties(sizes, {
                                    surfaceOuterCrossSize: {
                                        get: function () {
                                            return (that._horizontal ? sizes.surfaceOuterHeight : sizes.surfaceOuterWidth);
                                        },
                                        enumerable: true
                                    },
                                    layoutOrigin: {
                                        get: function () {
                                            return (that._horizontal ? sizes.layoutOriginX : sizes.layoutOriginY);
                                        },
                                        enumerable: true
                                    },
                                    itemsContainerOuterSize: {
                                        get: function () {
                                            return (that._horizontal ? sizes.itemsContainerOuterWidth : sizes.itemsContainerOuterHeight);
                                        },
                                        enumerable: true
                                    },
                                    itemsContainerOuterCrossSize: {
                                        get: function () {
                                            return (that._horizontal ? sizes.itemsContainerOuterHeight : sizes.itemsContainerOuterWidth);
                                        },
                                        enumerable: true
                                    },
                                    itemsContainerOuterStart: {
                                        get: function () {
                                            return (that._horizontal ? sizes.itemsContainerOuterX : sizes.itemsContainerOuterY);
                                        },
                                        enumerable: true
                                    },
                                    itemsContainerOuterCrossStart: {
                                        get: function () {
                                            return (that._horizontal ? sizes.itemsContainerOuterY : sizes.itemsContainerOuterX);
                                        },
                                        enumerable: true
                                    },
                                    containerCrossSize: {
                                        get: function () {
                                            return (that._horizontal ? sizes.containerHeight : sizes.containerWidth);
                                        },
                                        enumerable: true
                                    },
                                    containerSize: {
                                        get: function () {
                                            return (that._horizontal ? sizes.containerWidth : sizes.containerHeight);
                                        },
                                        enumerable: true
                                    },
                                });

                                // If the measured group is uniform, measure the container height
                                // and width now. Otherwise, compute them thru itemInfo on demand (via _ensureContainerSize).
                                if (!that._isCellSpanning(groupIndex)) {
                                    if (that._inListMode) {
                                        var itemsContainerContentSize = measurements.viewportCrossSize - sizes.surfaceOuterCrossSize - that._getHeaderSizeContentAdjustment() - sizes.itemsContainerOuterCrossSize;
                                        if (that._horizontal) {
                                            sizes.containerHeight = itemsContainerContentSize;
                                            sizes.containerWidth = measurements.containerWidth;
                                        } else {
                                            sizes.containerHeight = measurements.containerHeight;
                                            sizes.containerWidth = itemsContainerContentSize;
                                        }
                                    } else {
                                        sizes.containerWidth = measurements.containerWidth;
                                        sizes.containerHeight = measurements.containerHeight;
                                    }
                                    sizes.containerSizeLoaded = true;
                                }

                                that._createContainerStyleRule();
                                that._viewportSizeChanged(measurements.viewportCrossSize);

                                cleanUp();
                            }
                        });
                    }

                    if (!measuringPromise) {
                        site._writeProfilerMark(perfId + ",StartTM");
                        // Use a signal to guarantee that measuringPromise is set before the promise
                        // handler is executed (measuringPromise is referenced within measureItemImpl).
                        var promiseStoredSignal = new _Signal();
                        that._measuringPromise = measuringPromise = promiseStoredSignal.promise.then(function () {
                            if (that._ensureEnvInfo()) {
                                return measureItemImpl(index);
                            } else {
                                // Couldn't get envInfo. ListView is invisible. Bail out.
                                return Promise.cancel;
                            }
                        }).then(function () {
                            site._writeProfilerMark(perfId + ":complete,info");
                            site._writeProfilerMark(perfId + ",StopTM");
                        }, function (error) {
                            // The purpose of the measuring promise is so that we only
                            // measure once. If measuring fails, clear the promise because
                            // we still need to measure.
                            that._measuringPromise = null;

                            site._writeProfilerMark(perfId + ":canceled,info");
                            site._writeProfilerMark(perfId + ",StopTM");

                            return Promise.wrapError(error);
                        });
                        promiseStoredSignal.complete();
                    }
                    return measuringPromise;
                },

                _getHeaderSizeGroupAdjustment: function () {
                    if (this._groupsEnabled) {
                        if (this._horizontal && this._groupHeaderPosition === HeaderPosition.left) {
                            return this._sizes.headerContainerWidth;
                        } else if (!this._horizontal && this._groupHeaderPosition === HeaderPosition.top) {
                            return this._sizes.headerContainerHeight;
                        }
                    }

                    return 0;
                },
                _getHeaderSizeContentAdjustment: function () {
                    if (this._groupsEnabled) {
                        if (this._horizontal && this._groupHeaderPosition === HeaderPosition.top) {
                            return this._sizes.headerContainerHeight;
                        } else if (!this._horizontal && this._groupHeaderPosition === HeaderPosition.left) {
                            return this._sizes.headerContainerWidth;
                        }
                    }

                    return 0;
                },

                // Horizontal layouts lay items out top to bottom, left to right, whereas vertical layouts lay items out left to right, top to bottom.
                // The viewport size is the size layouts use to determine how many items can be placed in one bar, so it should be cross to the
                // orientation.
                _getViewportCrossSize: function () {
                    return this._site.viewportSize[this._horizontal ? "height" : "width"];
                },

                // viewportContentSize is the new viewport size
                _viewportSizeChanged: function _LayoutCommon_viewportSizeChanged(viewportContentSize) {
                    var sizes = this._sizes;

                    sizes.viewportContentSize = viewportContentSize;
                    sizes.surfaceContentSize = viewportContentSize - sizes.surfaceOuterCrossSize;
                    sizes.maxItemsContainerContentSize = sizes.surfaceContentSize - sizes.itemsContainerOuterCrossSize - this._getHeaderSizeContentAdjustment();

                    // This calculation is for uniform layouts
                    if (sizes.containerSizeLoaded && !this._inListMode) {
                        this._itemsPerBar = Math.floor(sizes.maxItemsContainerContentSize / sizes.containerCrossSize);
                        if (this.maximumRowsOrColumns) {
                            this._itemsPerBar = Math.min(this._itemsPerBar, this.maximumRowsOrColumns);
                        }
                        this._itemsPerBar = Math.max(1, this._itemsPerBar);
                    } else {
                        if (this._inListMode) {
                            sizes[this._horizontal ? "containerHeight" : "containerWidth"] = sizes.maxItemsContainerContentSize;
                        }
                        this._itemsPerBar = 1;
                    }

                    // Ignore animations if height changed
                    this._resetAnimationCaches();
                },

                _createContainerStyleRule: function _LayoutCommon_createContainerStyleRule() {
                    // Adding CSS rules is expensive. Add a rule to provide a
                    // height and width for containers if the app hasn't provided one.
                    var sizes = this._sizes;
                    if (!this._containerSizeClassName && sizes.containerSizeLoaded && (sizes.emptyContainerContentHeight === 0 || sizes.emptyContainerContentWidth === 0)) {
                        var width = sizes.containerWidth - sizes.containerOuterWidth + "px",
                            height = sizes.containerHeight - sizes.containerOuterHeight + "px";
                        if (this._inListMode) {
                            if (this._horizontal) {
                                height = "calc(100% - " + (sizes.containerMargins.top + sizes.containerMargins.bottom) + "px)";
                            } else {
                                width = "auto";
                            }
                        }

                        if (!this._containerSizeClassName) {
                            this._containerSizeClassName = uniqueCssClassName("containersize");
                            _ElementUtilities.addClass(this._site.surface, this._containerSizeClassName);
                        }
                        var ruleSelector = "." + _Constants._containerClass,
                            ruleBody = "width:" + width + ";height:" + height + ";";
                        addDynamicCssRule(this._containerSizeClassName, this._site, ruleSelector, ruleBody);
                    }
                },

                // Computes container width and height if they haven't been computed yet. This
                // should happen when the first uniform group is created.
                _ensureContainerSize: function _LayoutCommon_ensureContainerSize(group) {
                    var sizes = this._sizes;
                    if (!sizes.containerSizeLoaded && !this._ensuringContainerSize) {
                        var promise;
                        if ((!this._itemInfo || typeof this._itemInfo !== "function") && this._useDefaultItemInfo) {
                            var margins = sizes.containerMargins;
                            promise = Promise.wrap({
                                width: group.groupInfo.cellWidth - margins.left - margins.right,
                                height: group.groupInfo.cellHeight - margins.top - margins.bottom
                            });

                        } else {
                            promise = this._getItemInfo();
                        }

                        var that = this;
                        this._ensuringContainerSize = promise.then(function (itemSize) {
                            sizes.containerSizeLoaded = true;
                            sizes.containerWidth = itemSize.width + sizes.itemBoxOuterWidth + sizes.containerOuterWidth;
                            sizes.containerHeight = itemSize.height + sizes.itemBoxOuterHeight + sizes.containerOuterHeight;
                            if (!that._inListMode) {
                                that._itemsPerBar = Math.floor(sizes.maxItemsContainerContentSize / sizes.containerCrossSize);
                                if (that.maximumRowsOrColumns) {
                                    that._itemsPerBar = Math.min(that._itemsPerBar, that.maximumRowsOrColumns);
                                }
                                that._itemsPerBar = Math.max(1, that._itemsPerBar);
                            } else {
                                that._itemsPerBar = 1;
                            }
                            that._createContainerStyleRule();
                        });

                        promise.done(
                            function () {
                                that._ensuringContainerSize = null;
                            },
                            function () {
                                that._ensuringContainerSize = null;
                            }
                        );

                        return promise;
                    } else {
                        return this._ensuringContainerSize ? this._ensuringContainerSize : Promise.wrap();
                    }
                },

                _indexToCoordinate: function _LayoutCommon_indexToCoordinate(index, itemsPerBar) {
                    itemsPerBar = itemsPerBar || this._itemsPerBar;
                    var bar = Math.floor(index / itemsPerBar);
                    if (this._horizontal) {
                        return {
                            column: bar,
                            row: index - bar * itemsPerBar
                        };
                    } else {
                        return {
                            row: bar,
                            column: index - bar * itemsPerBar
                        };
                    }
                },

                // Empty ranges are represented by null. Non-empty ranges are represented by
                // an object with 2 properties: firstIndex and lastIndex.
                _rangeForGroup: function _LayoutCommon_rangeForGroup(group, range) {
                    var first = group.startIndex,
                        last = first + group.count - 1;

                    if (!range || range.firstIndex > last || range.lastIndex < first) {
                        // There isn't any overlap between range and the group's indices
                        return null;
                    } else {
                        return {
                            firstIndex: Math.max(0, range.firstIndex - first),
                            lastIndex: Math.min(group.count - 1, range.lastIndex - first)
                        };
                    }
                },

                _syncDomWithGroupHeaderPosition: function _LayoutCommon_syncDomWithGroupHeaderPosition(tree) {
                    if (this._groupsEnabled && this._oldGroupHeaderPosition !== this._groupHeaderPosition) {
                        // this._oldGroupHeaderPosition may refer to top, left, or null. It will be null
                        // the first time this function is called which means that no styles have to be
                        // removed.

                        var len = tree.length,
                            i;
                        // Remove styles associated with old group header position
                        if (this._oldGroupHeaderPosition === HeaderPosition.top) {
                            _ElementUtilities.removeClass(this._site.surface, _Constants._headerPositionTopClass);
                            // maxWidth must be cleared because it is used with headers in the top position but not the left position.
                            // The _groupLeaderClass must be removed from the itemsContainer element because the associated styles
                            // should only be applied to it when headers are in the top position.
                            if (this._horizontal) {
                                for (i = 0; i < len; i++) {
                                    tree[i].header.style.maxWidth = "";
                                    _ElementUtilities.removeClass(tree[i].itemsContainer.element, _Constants._groupLeaderClass);
                                }
                            } else {
                                this._site.surface.style.msGridRows = "";
                            }
                        } else if (this._oldGroupHeaderPosition === HeaderPosition.left) {
                            _ElementUtilities.removeClass(this._site.surface, _Constants._headerPositionLeftClass);
                            // msGridColumns is cleared for a similar reason as maxWidth
                            if (!this._horizontal) {
                                for (i = 0; i < len; i++) {
                                    tree[i].header.style.maxHeight = "";
                                    _ElementUtilities.removeClass(tree[i].itemsContainer.element, _Constants._groupLeaderClass);
                                }
                            }
                            this._site.surface.style.msGridColumns = "";
                        }

                        // Add styles associated with new group header position
                        if (this._groupHeaderPosition === HeaderPosition.top) {
                            _ElementUtilities.addClass(this._site.surface, _Constants._headerPositionTopClass);
                            if (this._horizontal) {
                                for (i = 0; i < len; i++) {
                                    _ElementUtilities.addClass(tree[i].itemsContainer.element, _Constants._groupLeaderClass);
                                }
                            }
                        } else {
                            _ElementUtilities.addClass(this._site.surface, _Constants._headerPositionLeftClass);
                            if (!this._horizontal) {
                                for (i = 0; i < len; i++) {
                                    _ElementUtilities.addClass(tree[i].itemsContainer.element, _Constants._groupLeaderClass);
                                }
                            }
                        }

                        this._oldGroupHeaderPosition = this._groupHeaderPosition;
                    }
                },

                _layoutGroup: function _LayoutCommon_layoutGroup(index) {
                    var group = this._groups[index],
                        groupBundle = this._site.tree[index],
                        headerContainer = groupBundle.header,
                        itemsContainer = groupBundle.itemsContainer.element,
                        sizes = this._sizes,
                        groupCrossSize = group.getItemsContainerCrossSize();

                    if (this._groupsEnabled) {
                        if (this._horizontal) {
                            if (this._groupHeaderPosition === HeaderPosition.top) {
                                // Horizontal with headers above
                                //
                                var headerContainerMinContentWidth = sizes.headerContainerMinWidth - sizes.headerContainerOuterWidth,
                                    itemsContainerContentWidth = group.getItemsContainerSize() - sizes.headerContainerOuterWidth;
                                headerContainer.style.maxWidth = Math.max(headerContainerMinContentWidth, itemsContainerContentWidth) + "px";
                                if (this._envInfo.supportsCSSGrid) {
                                    headerContainer.style.msGridColumn = index + 1;
                                    itemsContainer.style.msGridColumn = index + 1;
                                } else {
                                    headerContainer.style.height = (sizes.headerContainerHeight - sizes.headerContainerOuterHeight) + "px";
                                    itemsContainer.style.height = (groupCrossSize - sizes.itemsContainerOuterHeight) + "px";
                                    // If the itemsContainer is too small, the next group's header runs the risk of appearing below the current group's items.
                                    // We need to add a margin to the bottom of the itemsContainer to prevent that from happening.
                                    itemsContainer.style.marginBottom = sizes.itemsContainerMargins.bottom + (sizes.maxItemsContainerContentSize - groupCrossSize + sizes.itemsContainerOuterHeight) + "px";
                                }
                                // itemsContainers only get the _groupLeaderClass when header position is top.
                                _ElementUtilities.addClass(itemsContainer, _Constants._groupLeaderClass);
                            } else {
                                // Horizontal with headers on the left
                                //
                                if (this._envInfo.supportsCSSGrid) {
                                    headerContainer.style.msGridColumn = index * 2 + 1;
                                    itemsContainer.style.msGridColumn = index * 2 + 2;
                                } else {
                                    headerContainer.style.width = sizes.headerContainerWidth - sizes.headerContainerOuterWidth + "px";
                                    headerContainer.style.height = (groupCrossSize - sizes.headerContainerOuterHeight) + "px";
                                    itemsContainer.style.height = (groupCrossSize - sizes.itemsContainerOuterHeight) + "px";
                                }
                            }
                        } else {
                            if (this._groupHeaderPosition === HeaderPosition.left) {
                                // Vertical with headers on the left
                                //
                                var headerContainerMinContentHeight = sizes.headerContainerMinHeight - sizes.headerContainerOuterHeight,
                                    itemsContainerContentHeight = group.getItemsContainerSize() - sizes.headerContainerOuterHeight;
                                headerContainer.style.maxHeight = Math.max(headerContainerMinContentHeight, itemsContainerContentHeight) + "px";
                                if (this._envInfo.supportsCSSGrid) {
                                    headerContainer.style.msGridRow = index + 1;
                                    itemsContainer.style.msGridRow = index + 1;
                                } else {
                                    headerContainer.style.width = (sizes.headerContainerWidth - sizes.headerContainerOuterWidth) + "px";
                                    itemsContainer.style.width = (groupCrossSize - sizes.itemsContainerOuterWidth) + "px";
                                    // If the itemsContainer is too small, the next group's header runs the risk of appearing to the side of the current group's items.
                                    // We need to add a margin to the right of the itemsContainer to prevent that from happening (or the left margin, in RTL).
                                    itemsContainer.style["margin" + (this._site.rtl ? "Left" : "Right")] = (sizes.itemsContainerMargins[(this._site.rtl ? "left" : "right")] +
                                        (sizes.maxItemsContainerContentSize - groupCrossSize + sizes.itemsContainerOuterWidth)) + "px";
                                }
                                // itemsContainers only get the _groupLeaderClass when header position is left.
                                _ElementUtilities.addClass(itemsContainer, _Constants._groupLeaderClass);
                            } else {
                                // Vertical with headers above
                                //
                                headerContainer.style.msGridRow = index * 2 + 1;
                                // It's important to explicitly set the container height in vertical list mode with headers above, since we use flow layout.
                                // When the header's content is taken from the DOM, the headerContainer will shrink unless it has a height set.
                                if (this._inListMode) {
                                    headerContainer.style.height = (sizes.headerContainerHeight - sizes.headerContainerOuterHeight) + "px";
                                } else {
                                    if (this._envInfo.supportsCSSGrid) {
                                        itemsContainer.style.msGridRow = index * 2 + 2;
                                    } else {
                                        headerContainer.style.height = sizes.headerContainerHeight - sizes.headerContainerOuterHeight + "px";
                                        headerContainer.style.width = (groupCrossSize - sizes.headerContainerOuterWidth) + "px";
                                        itemsContainer.style.width = (groupCrossSize - sizes.itemsContainerOuterWidth) + "px";
                                    }
                                }
                            }

                        }
                        // Header containers always get the _groupLeaderClass.
                        _ElementUtilities.addClass(headerContainer, _Constants._laidOutClass + " " + _Constants._groupLeaderClass);
                    }
                    _ElementUtilities.addClass(itemsContainer, _Constants._laidOutClass);
                }
            }, {
                // The maximum number of rows or columns of win-containers to put into each items block.
                // A row/column cannot be split across multiple items blocks. win-containers
                // are grouped into items blocks in order to mitigate the costs of the platform doing
                // a layout in response to insertions and removals of win-containers.
                _barsPerItemsBlock: 4
            });
        }),

        //
        // Layouts
        //

        _LegacyLayout: _Base.Namespace._lazy(function () {
            return _Base.Class.derive(exports._LayoutCommon, null, {
                /// <field type="Boolean" locid="WinJS.UI._LegacyLayout.disableBackdrop" helpKeyword="WinJS.UI._LegacyLayout.disableBackdrop">
                /// Gets or sets a value that indicates whether the layout should disable the backdrop feature
                /// which avoids blank areas while panning in a virtualized list.
                /// <deprecated type="deprecate">
                /// disableBackdrop is deprecated. Style: .win-listview .win-container.win-backdrop { background-color:transparent; } instead.
                /// </deprecated>
                /// </field>
                disableBackdrop: {
                    get: function _LegacyLayout_disableBackdrop_get() {
                        return this._backdropDisabled || false;
                    },
                    set: function _LegacyLayout_disableBackdrop_set(value) {
                        _ElementUtilities._deprecated(_ErrorMessages.disableBackdropIsDeprecated);
                        value = !!value;
                        if (this._backdropDisabled !== value) {
                            this._backdropDisabled = value;
                            if (this._disableBackdropClassName) {
                                deleteDynamicCssRule(this._disableBackdropClassName);
                                this._site && _ElementUtilities.removeClass(this._site.surface, this._disableBackdropClassName);
                                this._disableBackdropClassName = null;
                            }
                            this._disableBackdropClassName = uniqueCssClassName("disablebackdrop");
                            this._site && _ElementUtilities.addClass(this._site.surface, this._disableBackdropClassName);
                            if (value) {
                                var ruleSelector = ".win-container.win-backdrop",
                                    ruleBody = "background-color:transparent;";
                                addDynamicCssRule(this._disableBackdropClassName, this._site, ruleSelector, ruleBody);
                            }
                        }
                    }
                },

                /// <field type="String" locid="WinJS.UI._LegacyLayout.backdropColor" helpKeyword="WinJS.UI._LegacyLayout.backdropColor">
                /// Gets or sets the fill color for the default pattern used for the backdrops.
                /// The default value is "rgba(155,155,155,0.23)".
                /// <deprecated type="deprecate">
                /// backdropColor is deprecated. Style: .win-listview .win-container.win-backdrop { rgba(155,155,155,0.23); } instead.
                /// </deprecated>
                /// </field>
                backdropColor: {
                    get: function _LegacyLayout_backdropColor_get() {
                        return this._backdropColor || "rgba(155,155,155,0.23)";
                    },
                    set: function _LegacyLayout_backdropColor_set(value) {
                        _ElementUtilities._deprecated(_ErrorMessages.backdropColorIsDeprecated);
                        if (value && this._backdropColor !== value) {
                            this._backdropColor = value;
                            if (this._backdropColorClassName) {
                                deleteDynamicCssRule(this._backdropColorClassName);
                                this._site && _ElementUtilities.removeClass(this._site.surface, this._backdropColorClassName);
                                this._backdropColorClassName = null;
                            }
                            this._backdropColorClassName = uniqueCssClassName("backdropcolor");
                            this._site && _ElementUtilities.addClass(this._site.surface, this._backdropColorClassName);
                            var ruleSelector = ".win-container.win-backdrop",
                                ruleBody = "background-color:" + value + ";";
                            addDynamicCssRule(this._backdropColorClassName, this._site, ruleSelector, ruleBody);
                        }
                    }
                }
            });
        }),

        GridLayout: _Base.Namespace._lazy(function () {
            return _Base.Class.derive(exports._LegacyLayout, function (options) {
                /// <signature helpKeyword="WinJS.UI.GridLayout">
                /// <summary locid="WinJS.UI.GridLayout">
                /// Creates a new GridLayout.
                /// </summary>
                /// <param name="options" type="Object" locid="WinJS.UI.GridLayout_p:options">
                /// An object that contains one or more property/value pairs to apply to the new control. Each property of the options
                /// object corresponds to one of the control's properties or events.
                /// </param>
                /// <returns type="WinJS.UI.GridLayout" locid="WinJS.UI.GridLayout_returnValue">
                /// The new GridLayout.
                /// </returns>
                /// </signature>
                options = options || {};
                // Executing setters to display compatibility warning
                this.itemInfo = options.itemInfo;
                this.groupInfo = options.groupInfo;
                this._maxRowsOrColumns = 0;
                this._useDefaultItemInfo = true;
                this._elementsToMeasure = {};
                this._groupHeaderPosition = options.groupHeaderPosition || HeaderPosition.top;
                this.orientation = options.orientation || "horizontal";

                if (options.maxRows) {
                    this.maxRows = +options.maxRows;
                }
                if (options.maximumRowsOrColumns) {
                    this.maximumRowsOrColumns = +options.maximumRowsOrColumns;
                }
            }, {

                // Public

                /// <field type="Number" integer="true" locid="WinJS.UI.GridLayout.maximumRowsOrColumns" helpKeyword="WinJS.UI.GridLayout.maximumRowsOrColumns">
                /// Gets the maximum number of rows or columns, depending on the orientation, that should present before it introduces wrapping to the layout.
                /// A value of 0 indicates that there is no maximum. The default value is 0.
                /// </field>
                maximumRowsOrColumns: {
                    get: function () {
                        return this._maxRowsOrColumns;
                    },
                    set: function (value) {
                        this._setMaxRowsOrColumns(value);
                    }
                },

                /// <field type="Number" integer="true" locid="WinJS.UI.GridLayout.maxRows" helpKeyword="WinJS.UI.GridLayout.maxRows">
                /// Gets or sets the maximum number of rows displayed by the ListView.
                /// <deprecated type="deprecate">
                /// WinJS.UI.GridLayout.maxRows may be altered or unavailable after the Windows Library for JavaScript 2.0. Instead, use the maximumRowsOrColumns property.
                /// </deprecated>
                /// </field>
                maxRows: {
                    get: function () {
                        return this.maximumRowsOrColumns;
                    },
                    set: function (maxRows) {
                        _ElementUtilities._deprecated(_ErrorMessages.maxRowsIsDeprecated);
                        this.maximumRowsOrColumns = maxRows;
                    }
                },

                /// <field type="Function" locid="WinJS.UI.GridLayout.itemInfo" helpKeyword="WinJS.UI.GridLayout.itemInfo">
                /// Determines the size of the item and whether
                /// the item should be placed in a new column.
                /// <deprecated type="deprecate">
                /// GridLayout.itemInfo may be altered or unavailable in future versions. Instead, use CellSpanningLayout.
                /// </deprecated>
                /// </field>
                itemInfo: {
                    enumerable: true,
                    get: function () {
                        return this._itemInfo;
                    },
                    set: function (itemInfo) {
                        itemInfo && _ElementUtilities._deprecated(_ErrorMessages.itemInfoIsDeprecated);
                        this._itemInfo = itemInfo;
                        this._invalidateLayout();
                    }
                },

                /// <field type="Function" locid="WinJS.UI.GridLayout.groupInfo" helpKeyword="WinJS.UI.GridLayout.groupInfo">
                /// Indicates whether a group has cell spanning items and specifies the dimensions of the cell.
                /// <deprecated type="deprecate">
                /// GridLayout.groupInfo may be altered or unavailable in future versions. Instead, use CellSpanningLayout.
                /// </deprecated>
                /// </field>
                groupInfo: {
                    enumerable: true,
                    get: function () {
                        return this._groupInfo;
                    },
                    set: function (groupInfo) {
                        groupInfo && _ElementUtilities._deprecated(_ErrorMessages.groupInfoIsDeprecated);
                        this._groupInfo = groupInfo;
                        this._invalidateLayout();
                    }
                }
            });
        })
    });

    var Groups = _Base.Namespace.defineWithParent(null, null, {

        UniformGroupBase: _Base.Namespace._lazy(function () {
            return _Base.Class.define(null, {
                cleanUp: function UniformGroupBase_cleanUp() {
                },

                itemFromOffset: function UniformGroupBase_itemFromOffset(offset, options) {
                    // supported options are:
                    // - wholeItem: when set to true the fully visible item is returned
                    // - last: if 1 the last item is returned. if 0 the first
                    options = options || {};

                    var sizes = this._layout._sizes;

                    // Make offset relative to the items container's content box
                    offset -= sizes.itemsContainerOuterStart;

                    if (options.wholeItem) {
                        offset += (options.last ? -1 : 1) * (sizes.containerSize - 1);
                    }
                    var lastIndexOfGroup = this.count - 1,
                        lastBar = Math.floor(lastIndexOfGroup / this._layout._itemsPerBar),
                        bar = clampToRange(0, lastBar, Math.floor(offset / sizes.containerSize)),
                        index = (bar + options.last) * this._layout._itemsPerBar - options.last;
                    return clampToRange(0, this.count - 1, index);
                },

                hitTest: function UniformGroupBase_hitTest(x, y) {
                    var horizontal = this._layout._horizontal,
                        itemsPerBar = this._layout._itemsPerBar,
                        useListSemantics = this._layout._inListMode || itemsPerBar === 1,
                        directionalLocation = horizontal ? x : y,
                        crossLocation = horizontal ? y : x,
                        sizes = this._layout._sizes;

                    directionalLocation -= sizes.itemsContainerOuterStart;
                    crossLocation -= sizes.itemsContainerOuterCrossStart;

                    var bar = Math.floor(directionalLocation / sizes.containerSize);
                    var slotInBar = clampToRange(0, itemsPerBar - 1, Math.floor(crossLocation / sizes.containerCrossSize));
                    var index = Math.max(-1, bar * itemsPerBar + slotInBar);

                    // insertAfterIndex is determined by which half of the target element the mouse cursor is currently in.
                    // The trouble is that we can cut the element in half horizontally or cut it in half vertically.
                    // Which one we choose depends on the order that elements are laid out in the grid.
                    // A horizontal grid with multiple rows per column will lay items out starting from top to bottom, and move left to right.
                    // A vertical list is just a horizontal grid with an infinite number of rows per column, so it follows the same order.
                    // In both of these cases, each item is cut in half horizontally, since for any item n, n-1 should be above it and n+1 below (ignoring column changes).
                    // A vertical grid lays items out left to right, top to bottom, and a horizontal list left to right (with infinite items per row).
                    // In this case for item n, n-1 is on the left and n+1 on the right, so we cut the item in half vertically.
                    var insertAfterSlot;
                    if ((!horizontal && useListSemantics) ||
                        (horizontal && !useListSemantics)) {
                        insertAfterSlot = (y - sizes.containerHeight / 2) / sizes.containerHeight;
                    } else {
                        insertAfterSlot = (x - sizes.containerWidth / 2) / sizes.containerWidth;
                    }
                    if (useListSemantics) {
                        insertAfterSlot = Math.floor(insertAfterSlot);
                        return {
                            index: index,
                            insertAfterIndex: (insertAfterSlot >= 0 && index >= 0 ? insertAfterSlot : -1)
                        };
                    }
                    insertAfterSlot = clampToRange(-1, itemsPerBar - 1, insertAfterSlot);
                    var insertAfterIndex;
                    if (insertAfterSlot < 0) {
                        insertAfterIndex = bar * itemsPerBar - 1;
                    } else {
                        insertAfterIndex = bar * itemsPerBar + Math.floor(insertAfterSlot);
                    }

                    return {
                        index: clampToRange(-1, this.count - 1, index),
                        insertAfterIndex: clampToRange(-1, this.count - 1, insertAfterIndex)
                    };
                },

                getAdjacent: function UniformGroupBase_getAdjacent(currentItem, pressedKey) {
                    var index = currentItem.index,
                        currentBar = Math.floor(index / this._layout._itemsPerBar),
                        currentSlot = index % this._layout._itemsPerBar,
                        newFocus;

                    switch (pressedKey) {
                        case Key.upArrow:
                            newFocus = (currentSlot === 0 ? "boundary" : index - 1);
                            break;
                        case Key.downArrow:
                            var isLastIndexOfGroup = (index === this.count - 1),
                                inLastSlot = (this._layout._itemsPerBar > 1 && currentSlot === this._layout._itemsPerBar - 1);
                            newFocus = (isLastIndexOfGroup || inLastSlot ? "boundary" : index + 1);
                            break;
                        case Key.leftArrow:
                            newFocus = (currentBar === 0 && this._layout._itemsPerBar > 1 ? "boundary" : index - this._layout._itemsPerBar);
                            break;
                        case Key.rightArrow:
                            var lastIndexOfGroup = this.count - 1,
                                lastBar = Math.floor(lastIndexOfGroup / this._layout._itemsPerBar);
                            newFocus = (currentBar === lastBar ? "boundary" : Math.min(index + this._layout._itemsPerBar, this.count - 1));
                            break;
                    }
                    return (newFocus === "boundary" ? newFocus : { type: _UI.ObjectType.item, index: newFocus });
                },

                getItemsContainerSize: function UniformGroupBase_getItemsContainerSize() {
                    var sizes = this._layout._sizes,
                        barCount = Math.ceil(this.count / this._layout._itemsPerBar);
                    return barCount * sizes.containerSize + sizes.itemsContainerOuterSize;
                },

                getItemsContainerCrossSize: function UniformGroupBase_getItemsContainerCrossSize() {
                    var sizes = this._layout._sizes;
                    return this._layout._itemsPerBar * sizes.containerCrossSize + sizes.itemsContainerOuterCrossSize;
                },

                getItemPositionForAnimations: function UniformGroupBase_getItemPositionForAnimations(itemIndex) {
                    // Top/Left are used to know if the item has moved and also used to position the item if removed.
                    // Row/Column are used to know if a reflow animation should occur
                    // Height/Width are used when positioning a removed item without impacting layout.
                    // The returned rectangle refers to the win-container's border/padding/content box. Coordinates
                    // are relative to group's items container.

                    var sizes = this._layout._sizes;
                    var leftStr = this._layout._site.rtl ? "right" : "left";
                    var containerMargins = this._layout._sizes.containerMargins;
                    var coordinates = this._layout._indexToCoordinate(itemIndex);
                    var itemPosition = {
                        row: coordinates.row,
                        column: coordinates.column,
                        top: containerMargins.top + coordinates.row * sizes.containerHeight,
                        left: containerMargins[leftStr] + coordinates.column * sizes.containerWidth,
                        height: sizes.containerHeight - sizes.containerMargins.top - sizes.containerMargins.bottom,
                        width: sizes.containerWidth - sizes.containerMargins.left - sizes.containerMargins.right
                    };
                    return itemPosition;
                }
            });
        }),

        //
        // Groups for GridLayout
        //
        // Each group implements a 3 function layout interface. The interface is used
        // whenever GridLayout has to do a layout. The interface consists of:
        // - prepareLayout/prepareLayoutWithCopyOfTree: Called 1st. Group should update all of its internal
        //   layout state. It should not modify the DOM. Group should implement either prepareLayout or
        //   prepareLayoutWithCopyOfTree. The former is preferable because the latter is expensive as calling
        //   it requires copying the group's tree. Implementing prepareLayoutWithCopyOfTree is necessary when
        //   the group is manually laying out items and is laying out unrealized items asynchronously
        //   (e.g. CellSpanningGroup). This requires a copy of the tree from the previous layout pass.
        // - layoutRealizedRange: Called 2nd. Group should update the DOM so that
        //   the realized range reflects the internal layout state computed during
        //   prepareLayout.
        // - layoutUnrealizedRange: Called 3rd. Group should update the DOM for the items
        //   outside of the realized range. This function returns a promise so
        //   it can do its work asynchronously. When the promise completes, layout will
        //   be done.
        //
        // The motivation for this interface is perceived performance. If groups had just 1
        // layout function, all items would have to be laid out before any animations could
        // begin. With this interface, animations can begin playing after
        // layoutRealizedRange is called.
        //
        // Each group also implements a cleanUp function which is called when the group is
        // no longer needed so that it can clean up the DOM and its resources. After cleanUp
        // is called, the group object cannnot be reused.
        //

        UniformGroup: _Base.Namespace._lazy(function () {
            return _Base.Class.derive(Groups.UniformGroupBase, function UniformGroup_ctor(layout, itemsContainer) {
                this._layout = layout;
                this._itemsContainer = itemsContainer;
                _ElementUtilities.addClass(this._itemsContainer, layout._inListMode ? _Constants._uniformListLayoutClass : _Constants._uniformGridLayoutClass);
            }, {
                cleanUp: function UniformGroup_cleanUp(skipDomCleanUp) {
                    if (!skipDomCleanUp) {
                        _ElementUtilities.removeClass(this._itemsContainer, _Constants._uniformGridLayoutClass);
                        _ElementUtilities.removeClass(this._itemsContainer, _Constants._uniformListLayoutClass);
                        this._itemsContainer.style.height = this._itemsContainer.style.width = "";
                    }
                    this._itemsContainer = null;
                    this._layout = null;
                    this.groupInfo = null;
                    this.startIndex = null;
                    this.offset = null;
                    this.count = null;
                },

                prepareLayout: function UniformGroup_prepareLayout(itemsCount, oldChangedRealizedRange, oldState, updatedProperties) {
                    this.groupInfo = updatedProperties.groupInfo;
                    this.startIndex = updatedProperties.startIndex;
                    this.count = itemsCount;
                    return this._layout._ensureContainerSize(this);
                },

                layoutRealizedRange: function UniformGroup_layoutRealizedRange() {
                    // Explicitly set the items container size. This is required so that the
                    // surface, which is a grid, will have its width sized to content.
                    var sizes = this._layout._sizes;
                    this._itemsContainer.style[this._layout._horizontal ? "width" : "height"] = this.getItemsContainerSize() - sizes.itemsContainerOuterSize + "px";
                    this._itemsContainer.style[this._layout._horizontal ? "height" : "width"] = (this._layout._inListMode ? sizes.maxItemsContainerContentSize + "px" :
                                                                                                 this._layout._itemsPerBar * sizes.containerCrossSize + "px");
                },

                layoutUnrealizedRange: function UniformGroup_layoutUnrealizedRange() {
                    return Promise.wrap();
                }
            });
        }),

        UniformFlowGroup: _Base.Namespace._lazy(function () {
            return _Base.Class.derive(Groups.UniformGroupBase, function UniformFlowGroup_ctor(layout, tree) {
                this._layout = layout;
                this._itemsContainer = tree.element;
                _ElementUtilities.addClass(this._itemsContainer, layout._inListMode ? _Constants._uniformListLayoutClass : _Constants._uniformGridLayoutClass);
            }, {
                cleanUp: function UniformFlowGroup_cleanUp(skipDomCleanUp) {
                    if (!skipDomCleanUp) {
                        _ElementUtilities.removeClass(this._itemsContainer, _Constants._uniformListLayoutClass);
                        _ElementUtilities.removeClass(this._itemsContainer, _Constants._uniformGridLayoutClass);
                        this._itemsContainer.style.height = "";
                    }
                },
                layout: function UniformFlowGroup_layout() {
                    this._layout._site._writeProfilerMark("Layout:_UniformFlowGroup:setItemsContainerHeight,info");
                    this._itemsContainer.style.height = this.count * this._layout._sizes.containerHeight + "px";
                }
            });
        }),

        CellSpanningGroup: _Base.Namespace._lazy(function () {
            return _Base.Class.define(function CellSpanningGroup_ctor(layout, itemsContainer) {
                this._layout = layout;
                this._itemsContainer = itemsContainer;
                _ElementUtilities.addClass(this._itemsContainer, _Constants._cellSpanningGridLayoutClass);

                this.resetMap();
            }, {
                cleanUp: function CellSpanningGroup_cleanUp(skipDomCleanUp) {
                    if (!skipDomCleanUp) {
                        this._cleanContainers();
                        _ElementUtilities.removeClass(this._itemsContainer, _Constants._cellSpanningGridLayoutClass);
                        this._itemsContainer.style.cssText = "";
                    }
                    this._itemsContainer = null;

                    if (this._layoutPromise) {
                        this._layoutPromise.cancel();
                        this._layoutPromise = null;
                    }
                    this.resetMap();
                    this._slotsPerColumn = null;
                    this._offScreenSlotsPerColumn = null;
                    this._items = null;
                    this._layout = null;
                    this._containersToHide = null;
                    this.groupInfo = null;
                    this.startIndex = null;
                    this.offset = null;
                    this.count = null;
                },

                prepareLayoutWithCopyOfTree: function CellSpanningGroup_prepareLayoutWithCopyOfTree(tree, oldChangedRealizedRange, oldState, updatedProperties) {
                    var that = this;
                    var i;

                    // Remember the items in the old realized item range that changed.
                    // During layoutRealizedRange, they either need to be relaid out or hidden.
                    this._containersToHide = {};
                    if (oldChangedRealizedRange) {
                        for (i = oldChangedRealizedRange.firstIndex; i <= oldChangedRealizedRange.lastIndex; i++) {
                            this._containersToHide[uniqueID(oldState._items[i])] = oldState._items[i];
                        }
                    }

                    // Update public properties
                    this.groupInfo = updatedProperties.groupInfo;
                    this.startIndex = updatedProperties.startIndex;
                    this.count = tree.items.length;

                    this._items = tree.items;
                    this._slotsPerColumn = Math.floor(this._layout._sizes.maxItemsContainerContentSize / this.groupInfo.cellHeight);
                    if (this._layout.maximumRowsOrColumns) {
                        this._slotsPerColumn = Math.min(this._slotsPerColumn, this._layout.maximumRowsOrColumns);
                    }
                    this._slotsPerColumn = Math.max(this._slotsPerColumn, 1);

                    this.resetMap();
                    var itemInfoPromises = new Array(this.count);
                    for (i = 0; i < this.count; i++) {
                        itemInfoPromises[i] = this._layout._getItemInfo(this.startIndex + i);
                    }
                    return Promise.join(itemInfoPromises).then(function (itemInfos) {
                        itemInfos.forEach(function (itemInfo, index) {
                            that.addItemToMap(index, itemInfo);
                        });
                    });
                },

                layoutRealizedRange: function CellSpanningGroup_layoutRealizedRange(firstChangedIndex, realizedRange) {
                    // Lay out the changed items within the realized range
                    if (realizedRange) {
                        var firstChangedRealizedIndex = Math.max(firstChangedIndex, realizedRange.firstIndex),
                            i;
                        for (i = firstChangedRealizedIndex; i <= realizedRange.lastIndex; i++) {
                            this._layoutItem(i);
                            delete this._containersToHide[uniqueID(this._items[i])];
                        }
                    }

                    // Hide the old containers that are in the realized range but weren't relaid out
                    Object.keys(this._containersToHide).forEach(function (id) {
                        _ElementUtilities.removeClass(this._containersToHide[id], _Constants._laidOutClass);
                    }.bind(this));
                    this._containersToHide = {};

                    // Explicitly set the items container height. This is required so that the
                    // surface, which is a grid, will have its width sized to content.
                    this._itemsContainer.style.cssText +=
                        ";width:" + (this.getItemsContainerSize() - this._layout._sizes.itemsContainerOuterSize) +
                        "px;height:" + this._layout._sizes.maxItemsContainerContentSize +
                        "px;-ms-grid-columns: (" + this.groupInfo.cellWidth + "px)[" + this.getColumnCount() +
                        "];-ms-grid-rows: (" + this.groupInfo.cellHeight + "px)[" + (this._slotsPerColumn + this._offScreenSlotsPerColumn) + "]";
                },

                layoutUnrealizedRange: function CellSpanningGroup_layoutUnrealizedRange(firstChangedIndex, realizedRange, beforeRealizedRange) {
                    var that = this;
                    var layoutJob;

                    that._layoutPromise = new Promise(function (complete) {
                        function completeLayout() {
                            layoutJob = null;
                            complete();
                        }

                        function schedule(fn) {
                            return Scheduler.schedule(fn, Scheduler.Priority.normal, null,
                                "WinJS.UI.GridLayout.CellSpanningGroup.LayoutUnrealizedRange");
                        }

                        // These loops are built to lay out the items that are closest to
                        // the realized range first.

                        if (realizedRange) {
                            var stop = false;
                            // For laying out the changed items that are before the realized range
                            var before = realizedRange.firstIndex - 1;
                            // For laying out the changed items that are after the realized range
                            var after = Math.max(firstChangedIndex, realizedRange.lastIndex + 1);
                            after = Math.max(before + 1, after);

                            // Alternate between laying out items before and after the realized range
                            layoutJob = schedule(function unrealizedRangeWork(info) {
                                while (!stop) {
                                    if (info.shouldYield) {
                                        info.setWork(unrealizedRangeWork);
                                        return;
                                    }

                                    stop = true;

                                    if (before >= firstChangedIndex) {
                                        that._layoutItem(before);
                                        before--;
                                        stop = false;
                                    }
                                    if (after < that.count) {
                                        that._layoutItem(after);
                                        after++;
                                        stop = false;
                                    }
                                }
                                completeLayout();
                            });
                        } else if (beforeRealizedRange) {
                            // The items we are laying out come before the realized range.
                            // so lay them out in descending order.
                            var i = that.count - 1;
                            layoutJob = schedule(function beforeRealizedRangeWork(info) {
                                for (; i >= firstChangedIndex; i--) {
                                    if (info.shouldYield) {
                                        info.setWork(beforeRealizedRangeWork);
                                        return;
                                    }
                                    that._layoutItem(i);
                                }
                                completeLayout();
                            });
                        } else {
                            // The items we are laying out come after the realized range
                            // so lay them out in ascending order.
                            var i = firstChangedIndex;
                            layoutJob = schedule(function afterRealizedRangeWork(info) {
                                for (; i < that.count; i++) {
                                    if (info.shouldYield) {
                                        info.setWork(afterRealizedRangeWork);
                                        return;
                                    }
                                    that._layoutItem(i);
                                }
                                completeLayout();
                            });
                        }
                    }, function () {
                        // Cancellation handler for that._layoutPromise
                        layoutJob && layoutJob.cancel();
                        layoutJob = null;
                    });

                    return that._layoutPromise;
                },

                itemFromOffset: function CellSpanningGroup_itemFromOffset(offset, options) {
                    // supported options are:
                    // - wholeItem: when set to true the fully visible item is returned
                    // - last: if 1 the last item is returned. if 0 the first
                    options = options || {};

                    var sizes = this._layout._sizes,
                        margins = sizes.containerMargins;

                    // Make offset relative to the items container's content box
                    offset -= sizes.itemsContainerOuterX;

                    offset -= ((options.last ? 1 : -1) * margins[options.last ? "left" : "right"]);

                    var value = this.indexFromOffset(offset, options.wholeItem, options.last).item;
                    return clampToRange(0, this.count - 1, value);
                },

                getAdjacent: function CellSpanningGroup_getAdjacent(currentItem, pressedKey) {
                    var index,
                        originalIndex;

                    index = originalIndex = currentItem.index;

                    var newIndex, inMap, inMapIndex;
                    if (this.lastAdjacent === index) {
                        inMapIndex = this.lastInMapIndex;
                    } else {
                        inMapIndex = this.findItem(index);
                    }

                    do {
                        var column = Math.floor(inMapIndex / this._slotsPerColumn),
                            row = inMapIndex - column * this._slotsPerColumn,
                            lastColumn = Math.floor((this.occupancyMap.length - 1) / this._slotsPerColumn);

                        switch (pressedKey) {
                            case Key.upArrow:
                                if (row > 0) {
                                    inMapIndex--;
                                } else {
                                    return { type: _UI.ObjectType.item, index: originalIndex };
                                }
                                break;
                            case Key.downArrow:
                                if (row + 1 < this._slotsPerColumn) {
                                    inMapIndex++;
                                } else {
                                    return { type: _UI.ObjectType.item, index: originalIndex };
                                }
                                break;
                            case Key.leftArrow:
                                inMapIndex = (column > 0 ? inMapIndex - this._slotsPerColumn : -1);
                                break;
                            case Key.rightArrow:
                                inMapIndex = (column < lastColumn ? inMapIndex + this._slotsPerColumn : this.occupancyMap.length);
                                break;
                        }

                        inMap = inMapIndex >= 0 && inMapIndex < this.occupancyMap.length;
                        if (inMap) {
                            newIndex = this.occupancyMap[inMapIndex] ? this.occupancyMap[inMapIndex].index : undefined;
                        }

                    } while (inMap && (index === newIndex || newIndex === undefined));

                    this.lastAdjacent = newIndex;
                    this.lastInMapIndex = inMapIndex;

                    return (inMap ? { type: _UI.ObjectType.item, index: newIndex } : "boundary");
                },

                hitTest: function CellSpanningGroup_hitTest(x, y) {
                    var sizes = this._layout._sizes,
                        itemIndex = 0;

                    // Make the coordinates relative to the items container's content box
                    x -= sizes.itemsContainerOuterX;
                    y -= sizes.itemsContainerOuterY;

                    if (this.occupancyMap.length > 0) {
                        var result = this.indexFromOffset(x, false, 0);

                        var counter = Math.min(this._slotsPerColumn - 1, Math.floor(y / this.groupInfo.cellHeight)),
                            curr = result.index,
                            lastValidIndex = curr;
                        while (counter-- > 0) {
                            curr++;
                            if (this.occupancyMap[curr]) {
                                lastValidIndex = curr;
                            }
                        }
                        if (!this.occupancyMap[lastValidIndex]) {
                            lastValidIndex--;
                        }
                        itemIndex = this.occupancyMap[lastValidIndex].index;
                    }

                    var itemSize = this.getItemSize(itemIndex),
                        itemLeft = itemSize.column * this.groupInfo.cellWidth,
                        itemTop = itemSize.row * this.groupInfo.cellHeight,
                        useListSemantics = this._slotsPerColumn === 1,
                        insertAfterIndex = itemIndex;

                    if ((useListSemantics && (x < (itemLeft + itemSize.contentWidth / 2))) ||
                        (!useListSemantics && (y < (itemTop + itemSize.contentHeight / 2)))) {
                        insertAfterIndex--;
                    }

                    return {
                        type: _UI.ObjectType.item,
                        index: clampToRange(0, this.count - 1, itemIndex),
                        insertAfterIndex: clampToRange(-1, this.count - 1, insertAfterIndex)
                    };
                },

                getItemsContainerSize: function CellSpanningGroup_getItemsContainerSize() {
                    var sizes = this._layout._sizes;
                    return this.getColumnCount() * this.groupInfo.cellWidth + sizes.itemsContainerOuterSize;
                },

                getItemsContainerCrossSize: function CellSpanningGroup_getItemsContainerCrossSize() {
                    var sizes = this._layout._sizes;
                    return sizes.maxItemsContainerContentSize + sizes.itemsContainerOuterCrossSize;
                },

                getItemPositionForAnimations: function CellSpanningGroup_getItemPositionForAnimations(itemIndex) {
                    // Top/Left are used to know if the item has moved and also used to position the item if removed.
                    // Row/Column are used to know if a reflow animation should occur
                    // Height/Width are used when positioning a removed item without impacting layout.
                    // The returned rectangle refers to the win-container's border/padding/content box. Coordinates
                    // are relative to group's items container.

                    var leftStr = this._layout._site.rtl ? "right" : "left";
                    var containerMargins = this._layout._sizes.containerMargins;
                    var coordinates = this.getItemSize(itemIndex);
                    var groupInfo = this.groupInfo;
                    var itemPosition = {
                        row: coordinates.row,
                        column: coordinates.column,
                        top: containerMargins.top + coordinates.row * groupInfo.cellHeight,
                        left: containerMargins[leftStr] + coordinates.column * groupInfo.cellWidth,
                        height: coordinates.contentHeight,
                        width: coordinates.contentWidth
                    };

                    return itemPosition;
                },

                _layoutItem: function CellSpanningGroup_layoutItem(index) {
                    var entry = this.getItemSize(index);
                    this._items[index].style.cssText +=
                        ";-ms-grid-row:" + (entry.row + 1) +
                        ";-ms-grid-column:" + (entry.column + 1) +
                        ";-ms-grid-row-span:" + entry.rows +
                        ";-ms-grid-column-span:" + entry.columns +
                        ";height:" + entry.contentHeight +
                        "px;width:" + entry.contentWidth + "px";
                    _ElementUtilities.addClass(this._items[index], _Constants._laidOutClass);

                    return this._items[index];
                },

                _cleanContainers: function CellSpanningGroup_cleanContainers() {
                    var items = this._items,
                        len = items.length,
                        i;
                    for (i = 0; i < len; i++) {
                        items[i].style.cssText = "";
                        _ElementUtilities.removeClass(items[i], _Constants._laidOutClass);
                    }
                },

                // Occupancy map

                getColumnCount: function CellSpanningGroup_getColumnCount() {
                    return Math.ceil(this.occupancyMap.length / this._slotsPerColumn);
                },

                getOccupancyMapItemCount: function CellSpanningGroup_getOccupancyMapItemCount() {
                    var index = -1;

                    // Use forEach as the map may be sparse
                    this.occupancyMap.forEach(function (item) {
                        if (item.index > index) {
                            index = item.index;
                        }
                    });

                    return index + 1;
                },

                coordinateToIndex: function CellSpanningGroup_coordinateToIndex(c, r) {
                    return c * this._slotsPerColumn + r;
                },

                markSlotAsFull: function CellSpanningGroup_markSlotAsFull(index, itemEntry) {
                    var coordinates = this._layout._indexToCoordinate(index, this._slotsPerColumn),
                        toRow = coordinates.row + itemEntry.rows;
                    for (var r = coordinates.row; r < toRow && r < this._slotsPerColumn; r++) {
                        for (var c = coordinates.column, toColumn = coordinates.column + itemEntry.columns; c < toColumn; c++) {
                            this.occupancyMap[this.coordinateToIndex(c, r)] = itemEntry;
                        }
                    }
                    this._offScreenSlotsPerColumn = Math.max(this._offScreenSlotsPerColumn, toRow - this._slotsPerColumn);
                },

                isSlotEmpty: function CellSpanningGroup_isSlotEmpty(itemSize, row, column) {
                    for (var r = row, toRow = row + itemSize.rows; r < toRow; r++) {
                        for (var c = column, toColumn = column + itemSize.columns; c < toColumn; c++) {
                            if ((r >= this._slotsPerColumn) || (this.occupancyMap[this.coordinateToIndex(c, r)] !== undefined)) {
                                return false;
                            }
                        }
                    }
                    return true;
                },

                findEmptySlot: function CellSpanningGroup_findEmptySlot(startIndex, itemSize, newColumn) {
                    var coordinates = this._layout._indexToCoordinate(startIndex, this._slotsPerColumn),
                        startRow = coordinates.row,
                        lastColumn = Math.floor((this.occupancyMap.length - 1) / this._slotsPerColumn);

                    if (newColumn) {
                        for (var c = coordinates.column + 1; c <= lastColumn; c++) {
                            if (this.isSlotEmpty(itemSize, 0, c)) {
                                return this.coordinateToIndex(c, 0);
                            }
                        }
                    } else {
                        for (var c = coordinates.column; c <= lastColumn; c++) {
                            for (var r = startRow; r < this._slotsPerColumn; r++) {
                                if (this.isSlotEmpty(itemSize, r, c)) {
                                    return this.coordinateToIndex(c, r);
                                }
                            }
                            startRow = 0;
                        }
                    }

                    return (lastColumn + 1) * this._slotsPerColumn;
                },

                findItem: function CellSpanningGroup_findItem(index) {
                    for (var inMapIndex = index, len = this.occupancyMap.length; inMapIndex < len; inMapIndex++) {
                        var entry = this.occupancyMap[inMapIndex];
                        if (entry && entry.index === index) {
                            return inMapIndex;
                        }
                    }
                    return inMapIndex;
                },

                getItemSize: function CellSpanningGroup_getItemSize(index) {
                    var inMapIndex = this.findItem(index),
                        entry = this.occupancyMap[inMapIndex],
                        coords = this._layout._indexToCoordinate(inMapIndex, this._slotsPerColumn);

                    if (index === entry.index) {
                        return {
                            row: coords.row,
                            column: coords.column,
                            contentWidth: entry.contentWidth,
                            contentHeight: entry.contentHeight,
                            columns: entry.columns,
                            rows: entry.rows
                        };
                    } else {
                        return null;
                    }
                },

                resetMap: function CellSpanningGroup_resetMap() {
                    this.occupancyMap = [];
                    this.lastAdded = 0;
                    this._offScreenSlotsPerColumn = 0;
                },

                addItemToMap: function CellSpanningGroup_addItemToMap(index, itemInfo) {
                    var that = this;

                    function add(mapEntry, newColumn) {
                        var inMapIndex = that.findEmptySlot(that.lastAdded, mapEntry, newColumn);
                        that.lastAdded = inMapIndex;
                        that.markSlotAsFull(inMapIndex, mapEntry);
                    }

                    var groupInfo = that.groupInfo,
                        margins = that._layout._sizes.containerMargins,
                        mapEntry = {
                            index: index,
                            contentWidth: itemInfo.width,
                            contentHeight: itemInfo.height,
                            columns: Math.max(1, Math.ceil((itemInfo.width + margins.left + margins.right) / groupInfo.cellWidth)),
                            rows: Math.max(1, Math.ceil((itemInfo.height + margins.top + margins.bottom) / groupInfo.cellHeight))
                        };

                    add(mapEntry, itemInfo.newColumn);
                },

                indexFromOffset: function CellSpanningGroup_indexFromOffset(adjustedOffset, wholeItem, last) {
                    var measuredWidth = 0,
                        lastItem = 0,
                        groupInfo = this.groupInfo,
                        index = 0;

                    if (this.occupancyMap.length > 0) {
                        lastItem = this.getOccupancyMapItemCount() - 1;
                        measuredWidth = Math.ceil((this.occupancyMap.length - 1) / this._slotsPerColumn) * groupInfo.cellWidth;

                        if (adjustedOffset < measuredWidth) {
                            var counter = this._slotsPerColumn,
                                index = (Math.max(0, Math.floor(adjustedOffset / groupInfo.cellWidth)) + last) * this._slotsPerColumn - last;
                            while (!this.occupancyMap[index] && counter-- > 0) {
                                index += (last > 0 ? -1 : 1);
                            }
                            return {
                                index: index,
                                item: this.occupancyMap[index].index
                            };
                        } else {
                            index = this.occupancyMap.length - 1;
                        }
                    }

                    return {
                        index: index,
                        item: lastItem + (Math.max(0, Math.floor((adjustedOffset - measuredWidth) / groupInfo.cellWidth)) + last) * this._slotsPerColumn - last
                    };
                }
            });
        })

    });

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {

        ListLayout: _Base.Namespace._lazy(function () {
            return _Base.Class.derive(exports._LegacyLayout, function ListLayout_ctor(options) {
                /// <signature helpKeyword="WinJS.UI.ListLayout">
                /// <summary locid="WinJS.UI.ListLayout">
                /// Creates a new ListLayout object.
                /// </summary>
                /// <param name="options" type="Object" locid="WinJS.UI.ListLayout_p:options">
                /// An object that contains one or more property/value pairs to apply to the new control. Each property of the options
                /// object corresponds to one of the object's properties or events. Event names must begin with "on".
                /// </param>
                /// <returns type="WinJS.UI.ListLayout" locid="WinJS.UI.ListLayout_returnValue">
                /// The new ListLayout object.
                /// </returns>
                /// </signature>
                options = options || {};
                this._itemInfo = {};
                this._groupInfo = {};
                this._groupHeaderPosition = options.groupHeaderPosition || HeaderPosition.top;
                this._inListMode = true;
                this.orientation = options.orientation || "vertical";
            }, {
                initialize: function ListLayout_initialize(site, groupsEnabled) {
                    _ElementUtilities.addClass(site.surface, _Constants._listLayoutClass);
                    exports._LegacyLayout.prototype.initialize.call(this, site, groupsEnabled);
                },

                uninitialize: function ListLayout_uninitialize() {
                    if (this._site) {
                        _ElementUtilities.removeClass(this._site.surface, _Constants._listLayoutClass);
                    }
                    exports._LegacyLayout.prototype.uninitialize.call(this);
                },

                layout: function ListLayout_layout(tree, changedRange, modifiedItems, modifiedGroups) {
                    if (!this._groupsEnabled && !this._horizontal) {
                        return this._layoutNonGroupedVerticalList(tree, changedRange, modifiedItems, modifiedGroups);
                    } else {
                        return exports._LegacyLayout.prototype.layout.call(this, tree, changedRange, modifiedItems, modifiedGroups);
                    }
                },

                _layoutNonGroupedVerticalList: function ListLayout_layoutNonGroupedVerticalList(tree, changedRange, modifiedItems, modifiedGroups) {
                    var that = this;
                    var perfId = "Layout:_layoutNonGroupedVerticalList";
                    that._site._writeProfilerMark(perfId + ",StartTM");
                    this._layoutPromise = that._measureItem(0).then(function () {
                        _ElementUtilities[that._usingStructuralNodes ? "addClass" : "removeClass"](that._site.surface, _Constants._structuralNodesClass);

                        if (that._sizes.viewportContentSize !== that._getViewportCrossSize()) {
                            that._viewportSizeChanged(that._getViewportCrossSize());
                        }

                        that._cacheRemovedElements(modifiedItems, that._cachedItemRecords, that._cachedInsertedItemRecords, that._cachedRemovedItems, false);
                        that._cacheRemovedElements(modifiedGroups, that._cachedHeaderRecords, that._cachedInsertedHeaderRecords, that._cachedRemovedHeaders, true);

                        var itemsContainer = tree[0].itemsContainer,
                            group = new Groups.UniformFlowGroup(that, itemsContainer);
                        that._groups = [group];
                        group.groupInfo = { enableCellSpanning: false };
                        group.startIndex = 0;
                        group.count = getItemsContainerLength(itemsContainer);
                        group.offset = 0;
                        group.layout();

                        that._site._writeProfilerMark(perfId + ":setSurfaceWidth,info");
                        that._site.surface.style.width = that._sizes.surfaceContentSize + "px";

                        that._layoutAnimations(modifiedItems, modifiedGroups);
                        that._site._writeProfilerMark(perfId + ":complete,info");
                        that._site._writeProfilerMark(perfId + ",StopTM");
                    }, function (error) {
                        that._site._writeProfilerMark(perfId + ":canceled,info");
                        that._site._writeProfilerMark(perfId + ",StopTM");
                        return Promise.wrapError(error);
                    });
                    return {
                        realizedRangeComplete: this._layoutPromise,
                        layoutComplete: this._layoutPromise
                    };
                },

                numberOfItemsPerItemsBlock: {
                    get: function ListLayout_getNumberOfItemsPerItemsBlock() {
                        var that = this;
                        // Measure when numberOfItemsPerItemsBlock is called so that we measure before ListView has created the full tree structure
                        // which reduces the trident layout required by measure.
                        return this._measureItem(0).then(function () {
                            if (that._envInfo.nestedFlexTooLarge || that._envInfo.nestedFlexTooSmall) {
                                that._usingStructuralNodes = false;
                            } else {
                                that._usingStructuralNodes = exports.ListLayout._numberOfItemsPerItemsBlock > 0;
                            }
                            return (that._usingStructuralNodes ? exports.ListLayout._numberOfItemsPerItemsBlock : null);
                        });
                    }
                },
            }, {
                // The maximum number of win-containers to put into each items block. win-containers
                // are grouped into items blocks in order to mitigate the costs of the platform doing
                // a layout in response to insertions and removals of win-containers.
                _numberOfItemsPerItemsBlock: 10
            });
        }),

        CellSpanningLayout: _Base.Namespace._lazy(function () {
            return _Base.Class.derive(exports._LayoutCommon, function CellSpanningLayout_ctor(options) {
                /// <signature helpKeyword="WinJS.UI.CellSpanningLayout">
                /// <summary locid="WinJS.UI.CellSpanningLayout">
                /// Creates a new CellSpanningLayout object.
                /// </summary>
                /// <param name="options" type="Object" locid="WinJS.UI.CellSpanningLayout_p:options">
                /// An object that contains one or more property/value pairs to apply to the new object. Each property of the options
                /// object corresponds to one of the object's properties or events. Event names must begin with "on".
                /// </param>
                /// <returns type="WinJS.UI.CellSpanningLayout" locid="WinJS.UI.CellSpanningLayout_returnValue">
                /// The new CellSpanningLayout object.
                /// </returns>
                /// </signature>
                options = options || {};
                this._itemInfo = options.itemInfo;
                this._groupInfo = options.groupInfo;
                this._groupHeaderPosition = options.groupHeaderPosition || HeaderPosition.top;
                this._horizontal = true;
                this._cellSpanning = true;
            }, {

                /// <field type="Number" integer="true" locid="WinJS.UI.CellSpanningLayout.maximumRowsOrColumns" helpKeyword="WinJS.UI.CellSpanningLayout.maximumRowsOrColumns">
                /// Gets or set the maximum number of rows or columns, depending on the orientation, to display before content begins to wrap.
                /// A value of 0 indicates that there is no maximum.
                /// </field>
                maximumRowsOrColumns: {
                    get: function () {
                        return this._maxRowsOrColumns;
                    },
                    set: function (value) {
                        this._setMaxRowsOrColumns(value);
                    }
                },

                /// <field type="Function" locid="WinJS.UI.CellSpanningLayout.itemInfo" helpKeyword="WinJS.UI.CellSpanningLayout.itemInfo">
                /// Gets or sets a function that returns the width and height of an item, as well as whether
                /// it should  appear in a new column. Setting this function improves performance because
                /// the ListView can allocate space for an item without having to measure it first.
                /// The function takes a single parameter: the index of the item to render.
                /// The function returns an object that has three properties:
                /// width: The  total width of the item.
                /// height: The total height of the item.
                /// newColumn: Set to true to create a column break; otherwise, false.
                /// </field>
                itemInfo: {
                    enumerable: true,
                    get: function () {
                        return this._itemInfo;
                    },
                    set: function (itemInfo) {
                        this._itemInfo = itemInfo;
                        this._invalidateLayout();
                    }
                },

                /// <field type="Function" locid="WinJS.UI.CellSpanningLayout.groupInfo" helpKeyword="WinJS.UI.CellSpanningLayout.groupInfo">
                /// Gets or sets a function that enables cell-spanning and establishes base cell dimensions.
                /// The function returns an object that has these properties:
                /// enableCellSpanning: Set to true to allow the ListView to contain items of multiple sizes.
                /// cellWidth: The width of the base cell.
                /// cellHeight: The height of the base cell.
                /// </field>
                groupInfo: {
                    enumerable: true,
                    get: function () {
                        return this._groupInfo;
                    },
                    set: function (groupInfo) {
                        this._groupInfo = groupInfo;
                        this._invalidateLayout();
                    }
                },

                /// <field type="String" oamOptionsDatatype="WinJS.UI.Orientation" locid="WinJS.UI.CellSpanningLayout.orientation" helpKeyword="WinJS.UI.CellSpanningLayout.orientation">
                /// Gets the orientation of the layout. CellSpanning layout only supports horizontal orientation.
                /// </field>
                orientation: {
                    enumerable: true,
                    get: function () {
                        return "horizontal";
                    }
                }
            });
        }),

        _LayoutWrapper: _Base.Namespace._lazy(function () {
            return _Base.Class.define(function LayoutWrapper_ctor(layout) {
                this.defaultAnimations = true;

                // Initialize and hitTest are required
                this.initialize = function LayoutWrapper_initialize(site, groupsEnabled) {
                    layout.initialize(site, groupsEnabled);
                };
                this.hitTest = function LayoutWrapper_hitTest(x, y) {
                    return layout.hitTest(x, y);
                };

                // These methods are optional
                layout.uninitialize && (this.uninitialize = function LayoutWrapper_uninitialize() {
                    layout.uninitialize();
                });

                if ("numberOfItemsPerItemsBlock" in layout) {
                    Object.defineProperty(this, "numberOfItemsPerItemsBlock", {
                        get: function LayoutWrapper_getNumberOfItemsPerItemsBlock() {
                            return layout.numberOfItemsPerItemsBlock;
                        }
                    });
                }

                layout._getItemPosition && (this._getItemPosition = function LayoutWrapper_getItemPosition(index) {
                    return layout._getItemPosition(index);
                });

                layout.itemsFromRange && (this.itemsFromRange = function LayoutWrapper_itemsFromRange(start, end) {
                    return layout.itemsFromRange(start, end);
                });

                layout.getAdjacent && (this.getAdjacent = function LayoutWrapper_getAdjacent(currentItem, pressedKey) {
                    return layout.getAdjacent(currentItem, pressedKey);
                });

                layout.dragOver && (this.dragOver = function LayoutWrapper_dragOver(x, y, dragInfo) {
                    return layout.dragOver(x, y, dragInfo);
                });

                layout.dragLeave && (this.dragLeave = function LayoutWrapper_dragLeave() {
                    return layout.dragLeave();
                });
                var propertyDefinition = {
                    enumerable: true,
                    get: function () {
                        return "vertical";
                    }
                };
                if (layout.orientation !== undefined) {
                    propertyDefinition.get = function () {
                        return layout.orientation;
                    };
                    propertyDefinition.set = function (value) {
                        layout.orientation = value;
                    };
                }
                Object.defineProperty(this, "orientation", propertyDefinition);

                if (layout.setupAnimations || layout.executeAnimations) {
                    this.defaultAnimations = false;
                    this.setupAnimations = function LayoutWrapper_setupAnimations() {
                        return layout.setupAnimations();
                    };
                    this.executeAnimations = function LayoutWrapper_executeAnimations() {
                        return layout.executeAnimations();
                    };
                }

                if (layout.layout) {
                    if (this.defaultAnimations) {
                        var that = this;
                        this.layout = function LayoutWrapper_layout(tree, changedRange, modifiedItems, modifiedGroups) {
                            var promises = normalizeLayoutPromises(layout.layout(tree, changedRange, [], [])),
                                synchronous;
                            promises.realizedRangeComplete.then(function () {
                                synchronous = true;
                            });
                            synchronous && that._layoutAnimations(modifiedItems, modifiedGroups);
                            return promises;
                        };
                    } else {
                        this.layout = function LayoutWrapper_layout(tree, changedRange, modifiedItems, modifiedGroups) {
                            return normalizeLayoutPromises(layout.layout(tree, changedRange, modifiedItems, modifiedGroups));
                        };
                    }
                }
            }, {
                uninitialize: function LayoutWrapper_uninitialize() {
                },
                numberOfItemsPerItemsBlock: {
                    get: function LayoutWrapper_getNumberOfItemsPerItemsBlock() {
                    }
                },
                layout: function LayoutWrapper_layout(tree, changedRange, modifiedItems, modifiedGroups) {
                    if (this.defaultAnimations) {
                        this._layoutAnimations(modifiedItems, modifiedGroups);
                    }
                    return normalizeLayoutPromises();
                },
                itemsFromRange: function LayoutWrapper_itemsFromRange() {
                    return { firstIndex: 0, lastIndex: Number.MAX_VALUE };
                },
                getAdjacent: function LayoutWrapper_getAdjacent(currentItem, pressedKey) {

                    switch (pressedKey) {
                        case Key.pageUp:
                        case Key.upArrow:
                        case Key.leftArrow:
                            return { type: currentItem.type, index: currentItem.index - 1 };
                        case Key.downArrow:
                        case Key.rightArrow:
                        case Key.pageDown:
                            return { type: currentItem.type, index: currentItem.index + 1 };
                    }
                },
                dragOver: function LayoutWrapper_dragOver() {
                },
                dragLeave: function LayoutWrapper_dragLeaver() {
                },
                setupAnimations: function LayoutWrapper_setupAnimations() {
                },
                executeAnimations: function LayoutWrapper_executeAnimations() {
                },
                _getItemPosition: function LayoutWrapper_getItemPosition() {
                },
                _layoutAnimations: function LayoutWrapper_layoutAnimations() {
                },
            });
        }),
    });

    function normalizeLayoutPromises(retVal) {
        if (Promise.is(retVal)) {
            return {
                realizedRangeComplete: retVal,
                layoutComplete: retVal
            };
        } else if (typeof retVal === "object" && retVal && retVal.layoutComplete) {
            return retVal;
        } else {
            return {
                realizedRangeComplete: Promise.wrap(),
                layoutComplete: Promise.wrap()
            };
        }
    }

    var HeaderPosition = {
        left: "left",
        top: "top"
    };

    function getMargins(element) {
        return {
            left: getDimension(element, "marginLeft"),
            right: getDimension(element, "marginRight"),
            top: getDimension(element, "marginTop"),
            bottom: getDimension(element, "marginBottom")
        };
    }

    // Layout, _LayoutCommon, and _LegacyLayout are defined ealier so that their fully
    // qualified names can be used in _Base.Class.derive. This is required by Blend.
    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        HeaderPosition: HeaderPosition,
        _getMargins: getMargins
    });
});

// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Controls/ListView/_VirtualizeContentsView',[
    'exports',
    '../../Core/_Global',
    '../../Core/_Base',
    '../../Core/_BaseUtils',
    '../../Promise',
    '../../_Signal',
    '../../Scheduler',
    '../../Utilities/_Dispose',
    '../../Utilities/_ElementUtilities',
    '../../Utilities/_SafeHtml',
    '../../Utilities/_UI',
    '../ItemContainer/_Constants',
    '../ItemContainer/_ItemEventsHandler',
    './_Helpers',
    './_ItemsContainer'
    ], function virtualizeContentsViewInit(exports, _Global, _Base, _BaseUtils, Promise, _Signal, Scheduler, _Dispose, _ElementUtilities, _SafeHtml, _UI, _Constants, _ItemEventsHandler, _Helpers, _ItemsContainer) {
    "use strict";

    function setFlow(from, to) {
        _ElementUtilities._setAttribute(from, "aria-flowto", to.id);
        _ElementUtilities._setAttribute(to, "x-ms-aria-flowfrom", from.id);
    }

    _Base.Namespace._moduleDefine(exports, "WinJS.UI", {
        _VirtualizeContentsView: _Base.Namespace._lazy(function () {

            function cooperativeQueueWorker(info) {
                var workItems = info.job._workItems;
                var work;
                while (workItems.length && !info.shouldYield) {
                    work = workItems.shift();
                    work();
                }

                info.setWork(cooperativeQueueWorker);

                if (!workItems.length) {
                    info.job.pause();
                }
            }

            function scheduleQueueJob(priority, name) {

                var job = Scheduler.schedule(cooperativeQueueWorker, priority, null, name);

                job._workItems = [];

                job.addWork = function (work, head) {
                    if (head) {
                        this._workItems.unshift(work);
                    } else {
                        this._workItems.push(work);
                    }
                    this.resume();
                };

                job.clearWork = function () {
                    this._workItems.length = 0;
                };

                job.dispose = function () {
                    this.cancel();
                    this._workItems.length = 0;
                };

                return job;
            }

            function shouldWaitForSeZo(listView) {
                return listView._zooming || listView._pinching;
            }

            function waitForSeZo(listView, timeout) {
                // waitForSeZo will block until sezo calls endZoom on listview, or a timeout duration has elapsed to
                // unblock a potential deadlock between the sezo waiting on container creation, and container creation
                // waiting on endZoom.

                if (listView._isZombie()) { return Promise.wrap(); }
                if (shouldWaitForSeZo(listView)) {
                    if (+timeout !== timeout) {
                        timeout = _VirtualizeContentsView._waitForSeZoTimeoutDuration;
                    }
                    //To improve SeZo's zoom animation and pinch detection perf, we want to ensure unimportant task
                    //is only run while zooming or pinching is not in progress.
                    return Promise.timeout(_VirtualizeContentsView._waitForSeZoIntervalDuration).then(function () {
                        timeout -= _VirtualizeContentsView._waitForSeZoIntervalDuration;
                        if (timeout <= 0) {
                            return true;
                        }
                        return waitForSeZo(listView, timeout);
                    });
                } else {
                    return Promise.wrap();
                }
            }

            function makeFunctor(scrollToFunctor) {
                if (typeof scrollToFunctor === "number") {
                    var pos = scrollToFunctor;

                    scrollToFunctor = function () {
                        return {
                            position: pos,
                            direction: "right"
                        };
                    };
                }
                return scrollToFunctor;
            }

            var _VirtualizeContentsView = _Base.Class.define(function VirtualizeContentsView_ctor(listView) {
                this._listView = listView;
                this._forceRelayout = false;
                this.items = new _ItemsContainer._ItemsContainer(listView);
                this.firstIndexDisplayed = -1;
                this.lastIndexDisplayed = -1;
                this.begin = 0;
                this.end = 0;
                this._realizePass = 1;
                this._firstLayoutPass = true;
                this._runningAnimations = null;
                this._renderCompletePromise = Promise.wrap();
                this._state = new CreatedState(this);
                this._createLayoutSignal();
                this._createTreeBuildingSignal();
                this._layoutWork = null;
                this._onscreenJob = scheduleQueueJob(Scheduler.Priority.aboveNormal, "on-screen items");
                this._frontOffscreenJob = scheduleQueueJob(Scheduler.Priority.normal, "front off-screen items");
                this._backOffscreenJob = scheduleQueueJob(Scheduler.Priority.belowNormal, "back off-screen items");
                this._scrollbarPos = 0;
                this._direction = "right";
                this._scrollToFunctor = makeFunctor(0);
            },
            {

                _dispose: function VirtualizeContentsView_dispose() {
                    this.cleanUp();
                    this.items = null;
                    this._renderCompletePromise && this._renderCompletePromise.cancel();
                    this._renderCompletePromise = null;
                    this._onscreenJob.dispose();
                    this._frontOffscreenJob.dispose();
                    this._backOffscreenJob.dispose();
                },

                _createItem: function VirtualizeContentsView_createItem(itemIndex, itemPromise, available, unavailable) {
                    this._listView._writeProfilerMark("createItem(" + itemIndex + ") " + this._getBoundingRectString(itemIndex) + ",info");

                    var that = this;
                    that._listView._itemsManager._itemFromItemPromiseThrottled(itemPromise).done(
                        function (element) {
                            if (element) {
                                available(itemIndex, element, that._listView._itemsManager._recordFromElement(element));
                            } else {
                                unavailable(itemIndex);
                            }
                        },
                        function (err) {
                            unavailable(itemIndex);
                            return Promise.wrapError(err);
                        }
                    );
                },

                _addItem: function VirtualizeContentsView_addItem(fragment, itemIndex, element, currentPass) {
                    if (this._realizePass === currentPass) {
                        var record = this._listView._itemsManager._recordFromElement(element);

                        delete this._pendingItemPromises[record.itemPromise.handle];

                        this.items.setItemAt(itemIndex, {
                            itemBox: null,
                            container: null,
                            element: element,
                            detached: true,
                            itemsManagerRecord: record
                        });
                    }
                },

                finalItem: function VirtualizeContentsView_finalItem() {
                    return this.containers ? Promise.wrap(this.containers.length - 1) : Promise.cancel;
                },

                _setSkipRealizationForChange: function (skip) {
                    if (skip) {
                        if (this._realizationLevel !== _VirtualizeContentsView._realizationLevel.realize) {
                            this._realizationLevel = _VirtualizeContentsView._realizationLevel.skip;
                        }
                    } else {
                        this._realizationLevel = _VirtualizeContentsView._realizationLevel.realize;
                    }
                },

                _realizeItems: function VirtualizeContentsView_realizeItems(fragment, begin, end, count, currentPass, scrollbarPos, direction, firstInView, lastInView, ignoreGaps) {
                    var perfId = "_realizeItems(" + begin + "-" + (end - 1) + ") visible(" + firstInView + "-" + lastInView + ")";

                    this._listView._writeProfilerMark(perfId + ",StartTM");

                    direction = direction || "right";

                    var counter = end - begin;
                    var inView = lastInView - firstInView + 1,
                        inViewCounter = inView,
                        rightOffscreenCount = end - lastInView - 1,
                        leftOffscreenCount = firstInView - begin;
                    var renderCompletePromises = [];
                    var entranceAnimationSignal = new _Signal();
                    var viewportItemsRealized = new _Signal();
                    var frontItemsRealized = new _Signal();

                    var that = this;

                    function itemIsReady(itemIndex, itemsManagerRecord) {
                        renderCompletePromises.push(Promise._cancelBlocker(itemsManagerRecord.renderComplete));

                        delivered(itemIndex);
                    }

                    function appendItemsToDom(startIndex, endIndex) {
                        that._listView._writeProfilerMark("_realizeItems_appendedItemsToDom,StartTM");
                        if (that._listView._isZombie()) { return; }

                        function updateSwipeable(itemData, element) {
                            if (!itemData.updatedSwipeableAttribute && (that._listView.itemsDraggable || that._listView.itemsReorderable || that._listView._swipeable)) {
                                itemData.itemsManagerRecord.renderComplete.done(function () {
                                    if (that._realizePass === currentPass) {
                                        var dragDisabledOnItem = _ElementUtilities.hasClass(element, _Constants._nonDraggableClass),
                                            selectionDisabledOnItem = _ElementUtilities.hasClass(element, _Constants._nonSelectableClass),
                                            dragEnabled = (that._listView.itemsDraggable || that._listView.itemsReorderable),
                                            swipeSelectEnabled = (that._listView._selectionAllowed() && that._listView._swipeBehavior === _UI.SwipeBehavior.select);
                                        if (dragEnabled && !dragDisabledOnItem) {
                                            itemData.itemBox.draggable = true;
                                        }

                                        if (that._listView._swipeable && ((dragEnabled && !swipeSelectEnabled && dragDisabledOnItem) ||
                                            (swipeSelectEnabled && !dragEnabled && selectionDisabledOnItem) ||
                                            (dragDisabledOnItem && selectionDisabledOnItem))) {
                                            _ElementUtilities.addClass(itemData.itemBox, _Constants._nonSwipeableClass);
                                        }
                                        itemData.updatedSwipeableAttribute = true;
                                    }
                                });
                            }
                        }

                        var itemIndex;
                        var appendItemsCount = 0;
                        var firstIndex = -1;
                        var lastIndex = -1;
                        for (itemIndex = startIndex; itemIndex <= endIndex; itemIndex++) {
                            var itemData = that.items.itemDataAt(itemIndex);
                            if (itemData) {
                                var element = itemData.element,
                                    itemBox = itemData.itemBox;

                                if (!itemBox) {
                                    itemBox = that._listView._itemBoxTemplate.cloneNode(true);
                                    itemData.itemBox = itemBox;

                                    itemBox.appendChild(element);
                                    _ElementUtilities.addClass(element, _Constants._itemClass);

                                    that._listView._setupAriaSelectionObserver(element);

                                    if (that._listView._isSelected(itemIndex)) {
                                        _ItemEventsHandler._ItemEventsHandler.renderSelection(itemBox, element, true, true);
                                    }

                                    that._listView._currentMode().renderDragSourceOnRealizedItem(itemIndex, itemBox);
                                }

                                updateSwipeable(itemData, element, itemBox);

                                var container = that.getContainer(itemIndex);
                                if (itemBox.parentNode !== container) {
                                    that._appendAndRestoreFocus(container, itemBox);

                                    appendItemsCount++;
                                    if (firstIndex < 0) {
                                        firstIndex = itemIndex;
                                    }
                                    lastIndex = itemIndex;

                                    itemData.container = container;
                                    if (that._listView._isSelected(itemIndex)) {
                                        _ElementUtilities.addClass(container, _Constants._selectedClass);
                                    }

                                    _ElementUtilities.removeClass(container, _Constants._backdropClass);

                                    // elementAvailable needs to be called after fragment.appendChild. elementAvailable fulfills a promise for items requested
                                    // by the keyboard focus handler. That handler will explicitly call .focus() on the element, so in order for
                                    // the focus handler to work, the element needs to be in a tree prior to focusing.

                                    that.items.elementAvailable(itemIndex);
                                }
                            }
                        }

                        that._listView._writeProfilerMark("_realizeItems_appendedItemsToDom,StopTM");
                        if (appendItemsCount > 0) {
                            that._listView._writeProfilerMark("_realizeItems_appendedItemsToDom:" + appendItemsCount + " (" + firstIndex + "-" + lastIndex + "),info");
                            that._reportElementsLevel(direction);
                        }
                    }

                    function removeGaps(first, last, begin, end) {
                        if (ignoreGaps) {
                            return;
                        }
                        // If we realized items 0 through 20 and then scrolled so that items 25 - 30 are on screen when we
                        // append them to the dom we should remove items 0 - 20 from the dom so there are no gaps between the
                        // two realized spots.

                        // Walk backwards from the beginning and if we find an item which is missing remove the rest
                        var foundMissing = false;
                        while (first >= begin) {
                            foundMissing = testGap(first, foundMissing);
                            first--;
                        }

                        // Walk forwards from the end and if we find an item which is missing remove the rest
                        foundMissing = false;
                        while (last <= end) {
                            foundMissing = testGap(last, foundMissing);
                            last++;
                        }

                        function testGap(itemIndex, foundMissing) {
                            // This helper method is called for each index and once an item is missing from the dom
                            // it removes any future one it encounters.
                            var itemData = that.items.itemDataAt(itemIndex);
                            if (itemData) {
                                var itemBox = itemData.itemBox;
                                if (!itemBox || !itemBox.parentNode) {
                                    return true;
                                } else if (foundMissing) {
                                    _ElementUtilities.addClass(itemBox.parentNode, _Constants._backdropClass);
                                    itemBox.parentNode.removeChild(itemBox);
                                    return true;
                                } else {
                                    return false;
                                }
                            } else {
                                return true;
                            }
                        }
                    }

                    function scheduleReadySignal(first, last, job, dir, head) {
                        var promises = [];

                        for (var i = first; i <= last; i++) {
                            var itemData = that.items.itemDataAt(i);
                            if (itemData) {
                                promises.push(itemData.itemsManagerRecord.itemPromise);
                            }
                        }

                        function schedule(itemIndex) {
                            var itemData = that.items.itemDataAt(itemIndex);
                            if (itemData) {
                                var record = itemData.itemsManagerRecord;
                                if (!record.readyComplete && that._realizePass === currentPass) {
                                    job.addWork(function () {
                                        if (that._listView._isZombie()) {
                                            return;
                                        }
                                        if (record.pendingReady && that._realizePass === currentPass) {
                                            that._listView._writeProfilerMark("pendingReady(" + itemIndex + "),info");
                                            record.pendingReady();
                                        }
                                    }, head);
                                }
                            }
                        }

                        Promise.join(promises).then(function () {
                            if (dir === "right") {
                                for (var i = first; i <= last; i++) {
                                    schedule(i);
                                }
                            } else {
                                for (var i = last; i >= first; i--) {
                                    schedule(i);
                                }
                            }
                        });
                    }

                    function delivered(index) {
                        if (that._realizePass !== currentPass) {
                            return;
                        }

                        if (index >= firstInView && index <= lastInView) {
                            if (--inViewCounter === 0) {
                                appendItemsToDom(firstInView, lastInView);
                                removeGaps(firstInView, lastInView, begin, end);

                                if (that._firstLayoutPass) {
                                    scheduleReadySignal(firstInView, lastInView, that._frontOffscreenJob, direction === "right" ? "left" : "right", true);

                                    var entranceAnimation = Scheduler.schedulePromiseHigh(null, "WinJS.UI.ListView.entranceAnimation").then(function () {
                                        if (that._listView._isZombie()) { return; }
                                        that._listView._writeProfilerMark("entranceAnimation,StartTM");
                                        var promise = that._listView._animateListEntrance(!that._firstEntranceAnimated);
                                        that._firstEntranceAnimated = true;
                                        return promise;
                                    });

                                    that._runningAnimations = Promise.join([that._runningAnimations, entranceAnimation]);
                                    that._runningAnimations.done(function () {
                                        that._listView._writeProfilerMark("entranceAnimation,StopTM");
                                        if (that._realizePass === currentPass) {
                                            that._runningAnimations = null;
                                            entranceAnimationSignal.complete();
                                        }
                                    });
                                    that._firstLayoutPass = false;

                                    if (that._listView._isCurrentZoomView) {
                                        Scheduler.requestDrain(that._onscreenJob.priority);
                                    }
                                } else {
                                    // during scrolling ready for onscreen items after front off screen items
                                    scheduleReadySignal(firstInView, lastInView, that._frontOffscreenJob, direction);
                                    entranceAnimationSignal.complete();
                                }

                                that._updateHeaders(that._listView._canvas, firstInView, lastInView + 1).done(function () {
                                    viewportItemsRealized.complete();
                                });
                            }
                        } else if (index < firstInView) {
                            --leftOffscreenCount;
                            if (leftOffscreenCount % inView === 0) {
                                appendItemsToDom(begin, firstInView - 1);
                            }
                            if (!leftOffscreenCount) {
                                that._updateHeaders(that._listView._canvas, begin, firstInView).done(function () {
                                    if (direction !== "right") {
                                        frontItemsRealized.complete();
                                    }
                                });
                                scheduleReadySignal(begin, firstInView - 1, direction !== "right" ? that._frontOffscreenJob : that._backOffscreenJob, "left");
                            }
                        } else if (index > lastInView) {
                            --rightOffscreenCount;
                            if (rightOffscreenCount % inView === 0) {
                                appendItemsToDom(lastInView + 1, end - 1);
                            }
                            if (!rightOffscreenCount) {
                                that._updateHeaders(that._listView._canvas, lastInView + 1, end).then(function () {
                                    if (direction === "right") {
                                        frontItemsRealized.complete();
                                    }
                                });
                                scheduleReadySignal(lastInView + 1, end - 1, direction === "right" ? that._frontOffscreenJob : that._backOffscreenJob, "right");
                            }
                        }
                        counter--;

                        if (counter === 0) {
                            that._renderCompletePromise = Promise.join(renderCompletePromises).then(null, function (e) {
                                var error = Array.isArray(e) && e.some(function (item) { return item && !(item instanceof Error && item.name === "Canceled"); });
                                if (error) {
                                    // rethrow
                                    return Promise.wrapError(e);
                                }
                            });

                            (that._headerRenderPromises || Promise.wrap()).done(function () {
                                Scheduler.schedule(function VirtualizeContentsView_async_delivered() {
                                    if (that._listView._isZombie()) {
                                        workCompleteSignal.cancel();
                                    } else {
                                        workCompleteSignal.complete();
                                    }
                                }, Math.min(that._onscreenJob.priority, that._backOffscreenJob.priority), null, "WinJS.UI.ListView._allItemsRealized");
                            });
                        }
                    }

                    function newItemIsReady(itemIndex, element, itemsManagerRecord) {
                        if (that._realizePass === currentPass) {
                            var element = itemsManagerRecord.element;
                            that._addItem(fragment, itemIndex, element, currentPass);
                            itemIsReady(itemIndex, itemsManagerRecord);
                        }
                    }

                    if (counter > 0) {
                        var createCount = 0;
                        var updateCount = 0;
                        var cleanCount = 0;
                        that.firstIndexDisplayed = firstInView;
                        that.lastIndexDisplayed = lastInView;

                        var isCurrentZoomView = that._listView._isCurrentZoomView;
                        if (that._highPriorityRealize && (that._firstLayoutPass || that._hasAnimationInViewportPending)) {
                            // startup or edits that will animate items in the viewport
                            that._highPriorityRealize = false;
                            that._onscreenJob.priority = Scheduler.Priority.high;
                            that._frontOffscreenJob.priority = Scheduler.Priority.normal;
                            that._backOffscreenJob.priority = Scheduler.Priority.belowNormal;
                        } else if (that._highPriorityRealize) {
                            // edits that won't animate items in the viewport
                            that._highPriorityRealize = false;
                            that._onscreenJob.priority = Scheduler.Priority.high;
                            that._frontOffscreenJob.priority = Scheduler.Priority.high - 1;
                            that._backOffscreenJob.priority = Scheduler.Priority.high - 1;
                        } else if (isCurrentZoomView) {
                            // scrolling
                            that._onscreenJob.priority = Scheduler.Priority.aboveNormal;
                            that._frontOffscreenJob.priority = Scheduler.Priority.normal;
                            that._backOffscreenJob.priority = Scheduler.Priority.belowNormal;
                        } else {
                            // hidden ListView in SeZo
                            that._onscreenJob.priority = Scheduler.Priority.belowNormal;
                            that._frontOffscreenJob.priority = Scheduler.Priority.idle;
                            that._backOffscreenJob.priority = Scheduler.Priority.idle;
                        }

                        // Create a promise to wrap the work in the queue. When the queue gets to the last item we can mark
                        // the work promise complete and if the work promise is canceled we cancel the queue.
                        //
                        var workCompleteSignal = new _Signal();

                        // If the version manager recieves a notification we clear the work in the work queues
                        //
                        var cancelToken = that._listView._versionManager.cancelOnNotification(workCompleteSignal.promise);

                        var queueStage1AfterStage0 = function (job, record) {
                            if (record.startStage1) {
                                record.stage0.then(function () {
                                    if (that._realizePass === currentPass && record.startStage1) {
                                        job.addWork(record.startStage1);
                                    }
                                });
                            }
                        };

                        var queueWork = function (job, itemIndex) {
                            var itemData = that.items.itemDataAt(itemIndex);
                            if (!itemData) {
                                var itemPromise = that._listView._itemsManager._itemPromiseAtIndex(itemIndex);

                                // Remember this pending item promise and avoid canceling it from the previous realization pass.
                                that._pendingItemPromises[itemPromise.handle] = itemPromise;
                                delete that._previousRealizationPendingItemPromises[itemPromise.handle];

                                job.addWork(function VirtualizeContentsView_realizeItemsWork() {
                                    if (that._listView._isZombie()) {
                                        return;
                                    }

                                    createCount++;
                                    that._createItem(itemIndex, itemPromise, newItemIsReady, delivered);

                                    // _createItem runs user code
                                    if (that._listView._isZombie() || that._realizePass !== currentPass) {
                                        return;
                                    }

                                    if (itemPromise.handle) {
                                        var record = that._listView._itemsManager._recordFromHandle(itemPromise.handle);
                                        queueStage1AfterStage0(job, record);
                                    }
                                });
                            }

                        };

                        var queueRight = function (job, first, last) {
                            for (var itemIndex = first; itemIndex <= last; itemIndex++) {
                                queueWork(job, itemIndex);
                            }
                        };

                        var queueLeft = function (job, first, last) {
                            // Always build the left side in the direction away from the center.
                            for (var itemIndex = last; itemIndex >= first; itemIndex--) {
                                queueWork(job, itemIndex);
                            }
                        };

                        var handleExistingRange = function (job, first, last) {
                            for (var itemIndex = first; itemIndex <= last; itemIndex++) {
                                var itemData = that.items.itemDataAt(itemIndex);
                                if (itemData) {
                                    var record = itemData.itemsManagerRecord;
                                    itemIsReady(itemIndex, record);
                                    updateCount++;
                                    queueStage1AfterStage0(job, record);
                                }
                            }
                        };

                        // PendingItemPromises are the item promises which we have requested from the ItemsManager
                        // which have not returned an element (placeholder or real). Since we only clean up items
                        // which have an element in _unrealizeItems we need to remember these item promises. We cancel
                        // the item promises from the previous realization iteration if those item promises are not
                        // used for the current realization.
                        this._previousRealizationPendingItemPromises = this._pendingItemPromises || {};
                        this._pendingItemPromises = {};

                        var emptyFront;
                        if (direction === "left") {
                            queueLeft(that._onscreenJob, firstInView, lastInView);
                            queueLeft(that._frontOffscreenJob, begin, firstInView - 1);
                            emptyFront = begin > (firstInView - 1);
                        } else {
                            queueRight(that._onscreenJob, firstInView, lastInView);
                            queueRight(that._frontOffscreenJob, lastInView + 1, end - 1);
                            emptyFront = lastInView + 1 > (end - 1);
                        }

                        // Anything left in _previousRealizationPendingItemPromises can be canceled here.
                        // Note: we are doing this synchronously. If we didn't do it synchronously we would have had to merge
                        // _previousRealizationPendingItemPromises and _pendingItemPromises together. This also has the great
                        // benefit to cancel item promises in the backOffScreenArea which are much less important.
                        for (var i = 0, handles = Object.keys(this._previousRealizationPendingItemPromises), len = handles.length; i < len; i++) {
                            var handle = handles[i];
                            that._listView._itemsManager.releaseItemPromise(this._previousRealizationPendingItemPromises[handle]);
                        }
                        this._previousRealizationPendingItemPromises = {};


                        // Handle existing items in the second pass to make sure that raising ready signal is added to the queues after creating items
                        handleExistingRange(that._onscreenJob, firstInView, lastInView);
                        if (direction === "left") {
                            handleExistingRange(that._frontOffscreenJob, begin, firstInView - 1);
                        } else {
                            handleExistingRange(that._frontOffscreenJob, lastInView + 1, end - 1);
                        }

                        var showProgress = (inViewCounter === lastInView - firstInView + 1);

                        if (that._firstLayoutPass) {
                            that._listView._canvas.style.opacity = 0;
                        } else {
                            if (showProgress) {
                                that._listView._showProgressBar(that._listView._element, "50%", "50%");
                            } else {
                                that._listView._hideProgressBar();
                            }
                        }

                        that._frontOffscreenJob.pause();
                        that._backOffscreenJob.pause();

                        viewportItemsRealized.promise.done(
                            function () {
                                that._frontOffscreenJob.resume();

                                if (emptyFront) {
                                    frontItemsRealized.complete();
                                }
                            },
                            function () {
                                workCompleteSignal.cancel();
                            }
                        );

                        frontItemsRealized.promise.done(function () {
                            that._listView._writeProfilerMark("frontItemsRealized,info");

                            if (direction === "left") {
                                queueRight(that._backOffscreenJob, lastInView + 1, end - 1);
                                handleExistingRange(that._backOffscreenJob, lastInView + 1, end - 1);
                            } else {
                                queueLeft(that._backOffscreenJob, begin, firstInView - 1);
                                handleExistingRange(that._backOffscreenJob, begin, firstInView - 1);
                            }

                            that._backOffscreenJob.resume();
                        });

                        workCompleteSignal.promise.done(
                            function () {
                                that._listView._versionManager.clearCancelOnNotification(cancelToken);

                                that._listView._writeProfilerMark(perfId + " complete(created:" + createCount + " updated:" + updateCount + "),info");
                            },
                            function (err) {
                                that._listView._versionManager.clearCancelOnNotification(cancelToken);
                                that._onscreenJob.clearWork();
                                that._frontOffscreenJob.clearWork();
                                that._backOffscreenJob.clearWork();

                                entranceAnimationSignal.cancel();
                                viewportItemsRealized.cancel();

                                that._listView._writeProfilerMark(perfId + " canceled(created:" + createCount + " updated:" + updateCount + " clean:" + cleanCount + "),info");
                                return Promise.wrapError(err);
                            }
                        );

                        that._listView._writeProfilerMark(perfId + ",StopTM");
                        return {
                            viewportItemsRealized: viewportItemsRealized.promise,
                            allItemsRealized: workCompleteSignal.promise,
                            loadingCompleted: Promise.join([workCompleteSignal.promise, entranceAnimationSignal.promise]).then(function () {
                                var promises = [];

                                for (var i = begin; i < end; i++) {
                                    var itemData = that.items.itemDataAt(i);
                                    if (itemData) {
                                        promises.push(itemData.itemsManagerRecord.itemReadyPromise);
                                    }
                                }
                                return Promise._cancelBlocker(Promise.join(promises));
                            })
                        };
                    } else {
                        that._listView._writeProfilerMark(perfId + ",StopTM");
                        return {
                            viewportItemsRealized: Promise.wrap(),
                            allItemsRealized: Promise.wrap(),
                            loadingCompleted: Promise.wrap()
                        };
                    }
                },

                _setAnimationInViewportState: function VirtualizeContentsView_setAnimationInViewportState(modifiedElements) {
                    this._hasAnimationInViewportPending = false;
                    if (modifiedElements && modifiedElements.length > 0) {
                        var viewportLength = this._listView._getViewportLength(),
                            range = this._listView._layout.itemsFromRange(this._scrollbarPos, this._scrollbarPos + viewportLength - 1);
                        for (var i = 0, len = modifiedElements.length; i < len; i++) {
                            var modifiedElement = modifiedElements[i];
                            if (modifiedElement.newIndex >= range.firstIndex && modifiedElement.newIndex <= range.lastIndex && modifiedElement.newIndex !== modifiedElement.oldIndex) {
                                this._hasAnimationInViewportPending = true;
                                break;
                            }
                        }
                    }
                },

                _addHeader: function VirtualizeContentsView_addHeader(fragment, groupIndex) {
                    var that = this;
                    return this._listView._groups.renderGroup(groupIndex).then(function (header) {
                        if (header) {
                            header.element.tabIndex = 0;
                            var placeholder = that._getHeaderContainer(groupIndex);
                            if (header.element.parentNode !== placeholder) {
                                placeholder.appendChild(header.element);
                                _ElementUtilities.addClass(header.element, _Constants._headerClass);
                            }

                            that._listView._groups.setDomElement(groupIndex, header.element);
                        }
                    });
                },

                _updateHeaders: function VirtualizeContentsView_updateHeaders(fragment, begin, end) {
                    var that = this;

                    function updateGroup(index) {
                        var group = that._listView._groups.group(index);
                        if (group && !group.header) {
                            var headerPromise = group.headerPromise;
                            if (!headerPromise) {
                                headerPromise = group.headerPromise = that._addHeader(fragment, index);
                                headerPromise.done(function () {
                                    group.headerPromise = null;
                                }, function () {
                                    group.headerPromise = null;
                                });
                            }
                            return headerPromise;
                        }
                        return Promise.wrap();
                    }

                    this._listView._groups.removeElements();

                    var groupStart = this._listView._groups.groupFromItem(begin),
                        groupIndex = groupStart,
                        groupEnd = this._listView._groups.groupFromItem(end - 1),
                        realizationPromises = [];

                    if (groupIndex !== null) {
                        for (; groupIndex <= groupEnd; groupIndex++) {
                            realizationPromises.push(updateGroup(groupIndex));
                        }
                    }

                    function done() {
                        that._headerRenderPromises = null;
                    }
                    this._headerRenderPromises = Promise.join(realizationPromises, this._headerRenderPromises).then(done, done);
                    return this._headerRenderPromises || Promise.wrap();
                },

                _unrealizeItem: function VirtualizeContentsView_unrealizeItem(itemIndex) {
                    var listView = this._listView,
                        focusedItemPurged;

                    this._listView._writeProfilerMark("_unrealizeItem(" + itemIndex + "),info");

                    var focused = listView._selection._getFocused();
                    if (focused.type !== _UI.ObjectType.groupHeader && focused.index === itemIndex) {
                        listView._unsetFocusOnItem();
                        focusedItemPurged = true;
                    }
                    var itemData = this.items.itemDataAt(itemIndex),
                        item = itemData.element,
                        itemBox = itemData.itemBox;

                    if (itemBox && itemBox.parentNode) {
                        _ElementUtilities.removeClass(itemBox.parentNode, _Constants._selectedClass);
                        _ElementUtilities.removeClass(itemBox.parentNode, _Constants._footprintClass);
                        _ElementUtilities.addClass(itemBox.parentNode, _Constants._backdropClass);
                        itemBox.parentNode.removeChild(itemBox);
                    }
                    itemData.container = null;

                    if (listView._currentMode().itemUnrealized) {
                        listView._currentMode().itemUnrealized(itemIndex, itemBox);
                    }

                    this.items.removeItem(itemIndex);

                    // If this wasn't released by the itemsManager already, then
                    // we remove it. This handles the special case of delete
                    // occuring on an item that is outside of the current view, but
                    // has not been cleaned up yet.
                    //
                    if (!itemData.removed) {
                        listView._itemsManager.releaseItem(item);
                    }


                    _Dispose._disposeElement(item);

                    if (focusedItemPurged) {
                        // If the focused item was purged, we'll still want to focus on it if it comes into view sometime in the future.
                        // calling _setFocusOnItem once the item is removed from this.items will set up a promise that will be fulfilled
                        // if the item ever gets reloaded
                        listView._setFocusOnItem(listView._selection._getFocused());
                    }
                },

                _unrealizeGroup: function VirtualizeContentsView_unrealizeGroup(group) {
                    var headerElement = group.header,
                        focusedItemPurged;

                    var focused = this._listView._selection._getFocused();
                    if (focused.type === _UI.ObjectType.groupHeader && this._listView._groups.group(focused.index) === group) {
                        this._listView._unsetFocusOnItem();
                        focusedItemPurged = true;
                    }

                    if (headerElement.parentNode) {
                        headerElement.parentNode.removeChild(headerElement);
                    }

                    _Dispose._disposeElement(headerElement);

                    group.header = null;
                    group.left = -1;
                    group.top = -1;

                    if (focusedItemPurged) {
                        this._listView._setFocusOnItem(this._listView._selection._getFocused());
                    }
                },

                _unrealizeItems: function VirtualizeContentsView_unrealizeItems(remove) {
                    var that = this,
                        removedCount = 0;

                    this.items.eachIndex(function (index) {
                        if (index < that.begin || index >= that.end) {
                            that._unrealizeItem(index);
                            return remove && ++removedCount >= remove;
                        }
                    });

                    var groups = this._listView._groups,
                        beginGroup = groups.groupFromItem(this.begin);

                    if (beginGroup !== null) {
                        var endGroup = groups.groupFromItem(this.end - 1);
                        for (var i = 0, len = groups.length() ; i < len; i++) {
                            var group = groups.group(i);
                            if ((i < beginGroup || i > endGroup) && group.header) {
                                this._unrealizeGroup(group);
                            }
                        }
                    }
                },

                _unrealizeExcessiveItems: function VirtualizeContentsView_unrealizeExcessiveItems() {
                    var realized = this.items.count(),
                        needed = this.end - this.begin,
                        approved = needed + this._listView._maxDeferredItemCleanup;

                    this._listView._writeProfilerMark("_unrealizeExcessiveItems realized(" + realized + ") approved(" + approved + "),info");
                    if (realized > approved) {
                        this._unrealizeItems(realized - approved);
                    }
                },

                _lazilyUnrealizeItems: function VirtualizeContentsView_lazilyUnrealizeItems() {
                    this._listView._writeProfilerMark("_lazilyUnrealizeItems,StartTM");
                    var that = this;
                    return waitForSeZo(this._listView).then(function () {

                        function done() {
                            that._listView._writeProfilerMark("_lazilyUnrealizeItems,StopTM");
                        }

                        if (that._listView._isZombie()) {
                            done();
                            return;
                        }

                        var itemsToUnrealize = [];
                        that.items.eachIndex(function (index) {
                            if (index < that.begin || index >= that.end) {
                                itemsToUnrealize.push(index);
                            }
                        });

                        that._listView._writeProfilerMark("_lazilyUnrealizeItems itemsToUnrealize(" + itemsToUnrealize.length + "),info");

                        var groupsToUnrealize = [],
                            groups = that._listView._groups,
                            beginGroup = groups.groupFromItem(that.begin);

                        if (beginGroup !== null) {
                            var endGroup = groups.groupFromItem(that.end - 1);
                            for (var i = 0, len = groups.length() ; i < len; i++) {
                                var group = groups.group(i);
                                if ((i < beginGroup || i > endGroup) && group.header) {
                                    groupsToUnrealize.push(group);
                                }
                            }
                        }

                        if (itemsToUnrealize.length || groupsToUnrealize.length) {
                            var job;

                            var promise = new Promise(function (complete) {

                                function unrealizeWorker(info) {
                                    if (that._listView._isZombie()) { return; }

                                    var firstIndex = -1,
                                        lastIndex = -1,
                                        removeCount = 0,
                                        zooming = shouldWaitForSeZo(that._listView);

                                    while (itemsToUnrealize.length && !zooming && !info.shouldYield) {
                                        var itemIndex = itemsToUnrealize.shift();
                                        that._unrealizeItem(itemIndex);

                                        removeCount++;
                                        if (firstIndex < 0) {
                                            firstIndex = itemIndex;
                                        }
                                        lastIndex = itemIndex;
                                    }
                                    that._listView._writeProfilerMark("unrealizeWorker removeItems:" + removeCount + " (" + firstIndex + "-" + lastIndex + "),info");

                                    while (groupsToUnrealize.length && !zooming && !info.shouldYield) {
                                        that._unrealizeGroup(groupsToUnrealize.shift());
                                    }

                                    if (itemsToUnrealize.length || groupsToUnrealize.length) {
                                        if (zooming) {
                                            info.setPromise(waitForSeZo(that._listView).then(function () {
                                                return unrealizeWorker;
                                            }));
                                        } else {
                                            info.setWork(unrealizeWorker);
                                        }
                                    } else {
                                        complete();
                                    }
                                }

                                job = Scheduler.schedule(unrealizeWorker, Scheduler.Priority.belowNormal, null, "WinJS.UI.ListView._lazilyUnrealizeItems");
                            });

                            return promise.then(done, function (error) {
                                job.cancel();
                                that._listView._writeProfilerMark("_lazilyUnrealizeItems canceled,info");
                                that._listView._writeProfilerMark("_lazilyUnrealizeItems,StopTM");
                                return Promise.wrapError(error);
                            });

                        } else {
                            done();
                            return Promise.wrap();
                        }
                    });
                },

                _getBoundingRectString: function VirtualizeContentsView_getBoundingRectString(itemIndex) {
                    var result;
                    if (itemIndex >= 0 && itemIndex < this.containers.length) {
                        var itemPos = this._listView._layout._getItemPosition(itemIndex);
                        if (itemPos) {
                            result = "[" + itemPos.left + "; " + itemPos.top + "; " + itemPos.width + "; " + itemPos.height + " ]";
                        }
                    }
                    return result || "";
                },

                _clearDeferTimeout: function VirtualizeContentsView_clearDeferTimeout() {
                    if (this.deferTimeout) {
                        this.deferTimeout.cancel();
                        this.deferTimeout = null;
                    }
                    if (this.deferredActionCancelToken !== -1) {
                        this._listView._versionManager.clearCancelOnNotification(this.deferredActionCancelToken);
                        this.deferredActionCancelToken = -1;
                    }
                },

                _setupAria: function VirtualizeContentsView_setupAria(timedOut) {
                    if (this._listView._isZombie()) { return; }
                    var that = this;

                    function done() {
                        that._listView._writeProfilerMark("aria work,StopTM");
                    }

                    function calcLastRealizedIndexInGroup(groupIndex) {
                        var groups = that._listView._groups,
                            nextGroup = groups.group(groupIndex + 1);
                        return (nextGroup ? Math.min(nextGroup.startIndex - 1, that.end - 1) : that.end - 1);
                    }

                    this._listView._createAriaMarkers();
                    return this._listView._itemsCount().then(function (count) {
                        if (count > 0 && that.firstIndexDisplayed !== -1 && that.lastIndexDisplayed !== -1) {
                            that._listView._writeProfilerMark("aria work,StartTM");
                            var startMarker = that._listView._ariaStartMarker,
                                endMarker = that._listView._ariaEndMarker,
                                index = that.begin,
                                item = that.items.itemAt(that.begin),
                                job,
                                // These are only used when the ListView is using groups
                                groups,
                                startGroup,
                                currentGroup,
                                group,
                                lastRealizedIndexInGroup;

                            if (item) {
                                _ElementUtilities._ensureId(item);
                                if (that._listView._groupsEnabled()) {
                                    groups = that._listView._groups;
                                    startGroup = currentGroup = groups.groupFromItem(that.begin);
                                    group = groups.group(currentGroup);
                                    lastRealizedIndexInGroup = calcLastRealizedIndexInGroup(currentGroup);
                                    _ElementUtilities._ensureId(group.header);
                                    _ElementUtilities._setAttribute(group.header, "role", that._listView._headerRole);
                                    _ElementUtilities._setAttribute(group.header, "x-ms-aria-flowfrom", startMarker.id);
                                    setFlow(group.header, item);
                                    _ElementUtilities._setAttribute(group.header, "tabindex", that._listView._tabIndex);
                                } else {
                                    _ElementUtilities._setAttribute(item, "x-ms-aria-flowfrom", startMarker.id);
                                }

                                return new Promise(function (completeJobPromise) {
                                    var skipWait = timedOut;
                                    job = Scheduler.schedule(function ariaWorker(jobInfo) {
                                        if (that._listView._isZombie()) {
                                            done();
                                            return;
                                        }

                                        for (; index < that.end; index++) {
                                            if (!skipWait && shouldWaitForSeZo(that._listView)) {
                                                jobInfo.setPromise(waitForSeZo(that._listView).then(function (timedOut) {
                                                    skipWait = timedOut;
                                                    return ariaWorker;
                                                }));
                                                return;
                                            } else if (jobInfo.shouldYield) {
                                                jobInfo.setWork(ariaWorker);
                                                return;
                                            }

                                            item = that.items.itemAt(index);
                                            var nextItem = that.items.itemAt(index + 1);

                                            if (nextItem) {
                                                _ElementUtilities._ensureId(nextItem);
                                            }

                                            _ElementUtilities._setAttribute(item, "role", that._listView._itemRole);
                                            _ElementUtilities._setAttribute(item, "aria-setsize", count);
                                            _ElementUtilities._setAttribute(item, "aria-posinset", index + 1);
                                            _ElementUtilities._setAttribute(item, "tabindex", that._listView._tabIndex);

                                            if (that._listView._groupsEnabled()) {
                                                if (index === lastRealizedIndexInGroup || !nextItem) {
                                                    var nextGroup = groups.group(currentGroup + 1);

                                                    // If group is the last realized group, then nextGroup won't exist in the DOM.
                                                    // When this is the case, nextItem shouldn't exist.
                                                    if (nextGroup && nextGroup.header && nextItem) {
                                                        _ElementUtilities._setAttribute(nextGroup.header, "tabindex", that._listView._tabIndex);
                                                        _ElementUtilities._setAttribute(nextGroup.header, "role", that._listView._headerRole);
                                                        _ElementUtilities._ensureId(nextGroup.header);
                                                        setFlow(item, nextGroup.header);
                                                        setFlow(nextGroup.header, nextItem);
                                                    } else {
                                                        // We're at the last group so flow to the end marker
                                                        _ElementUtilities._setAttribute(item, "aria-flowto", endMarker.id);
                                                    }

                                                    currentGroup++;
                                                    group = nextGroup;
                                                    lastRealizedIndexInGroup = calcLastRealizedIndexInGroup(currentGroup);
                                                } else {
                                                    // This is not the last item in the group so flow to the next item
                                                    setFlow(item, nextItem);
                                                }
                                            } else if (nextItem) {
                                                // Groups are disabled so as long as we aren't at the last item, flow to the next one
                                                setFlow(item, nextItem);
                                            } else {
                                                // Groups are disabled and we're at the last item, so flow to the end marker
                                                _ElementUtilities._setAttribute(item, "aria-flowto", endMarker.id);
                                            }
                                            if (!nextItem) {
                                                break;
                                            }
                                        }

                                        that._listView._fireAccessibilityAnnotationCompleteEvent(that.begin, index, startGroup, currentGroup - 1);

                                        done();
                                        completeJobPromise();
                                    }, Scheduler.Priority.belowNormal, null, "WinJS.UI.ListView._setupAria");
                                }, function () {
                                    // Cancellation handler for promise returned by setupAria
                                    job.cancel();
                                    done();
                                });
                            } else {
                                // the first item is null
                                done();
                            }
                        } else {
                            // The count is 0
                            return Promise.wrap();
                        }
                    });
                },

                _setupDeferredActions: function VirtualizeContentsView_setupDeferredActions() {
                    this._listView._writeProfilerMark("_setupDeferredActions,StartTM");
                    var that = this;

                    this._clearDeferTimeout();

                    function cleanUp() {
                        if (that._listView._isZombie()) { return; }
                        that.deferTimeout = null;
                        that._listView._versionManager.clearCancelOnNotification(that.deferredActionCancelToken);
                        that.deferredActionCancelToken = -1;
                    }

                    this.deferTimeout = this._lazilyRemoveRedundantItemsBlocks().then(function () {
                            return Promise.timeout(_Constants._DEFERRED_ACTION);
                        }).
                        then(function () {
                            return waitForSeZo(that._listView);
                        }).
                        then(function (timedOut) {
                            return that._setupAria(timedOut);
                        }).
                        then(cleanUp, function (error) {
                            cleanUp();
                            return Promise.wrapError(error);
                        });

                    this.deferredActionCancelToken = this._listView._versionManager.cancelOnNotification(this.deferTimeout);
                    this._listView._writeProfilerMark("_setupDeferredActions,StopTM");
                },

                // Sets aria-flowto on _ariaStartMarker and x-ms-aria-flowfrom on _ariaEndMarker. The former
                // points to either the first visible group header or the first visible item. The latter points
                // to the last visible item.
                _updateAriaMarkers: function VirtualizeContentsView_updateAriaMarkers(listViewIsEmpty, firstIndexDisplayed, lastIndexDisplayed) {
                    var that = this;
                    if (this._listView._isZombie()) {
                        return;
                    }

                    function getFirstVisibleItem() {
                        return that.items.itemAt(firstIndexDisplayed);
                    }

                    // At a certain index, the VDS may return null for all items at that index and
                    // higher. When this is the case, the end marker should point to the last
                    // non-null item in the visible range.
                    function getLastVisibleItem() {
                        for (var i = lastIndexDisplayed; i >= firstIndexDisplayed; i--) {
                            if (that.items.itemAt(i)) {
                                return that.items.itemAt(i);
                            }
                        }
                        return null;
                    }

                    this._listView._createAriaMarkers();
                    var startMarker = this._listView._ariaStartMarker,
                        endMarker = this._listView._ariaEndMarker,
                        firstVisibleItem,
                        lastVisibleItem;

                    if (firstIndexDisplayed !== -1 && lastIndexDisplayed !== -1 && firstIndexDisplayed <= lastIndexDisplayed) {
                        firstVisibleItem = getFirstVisibleItem();
                        lastVisibleItem = getLastVisibleItem();
                    }

                    if (listViewIsEmpty || !firstVisibleItem || !lastVisibleItem) {
                        setFlow(startMarker, endMarker);
                        this._listView._fireAccessibilityAnnotationCompleteEvent(-1, -1);
                    } else {
                        _ElementUtilities._ensureId(firstVisibleItem);
                        _ElementUtilities._ensureId(lastVisibleItem);

                        // Set startMarker's flowto
                        if (this._listView._groupsEnabled()) {
                            var groups = this._listView._groups,
                                firstVisibleGroup = groups.group(groups.groupFromItem(firstIndexDisplayed));

                            if (firstVisibleGroup.header) {
                                _ElementUtilities._ensureId(firstVisibleGroup.header);

                                if (firstIndexDisplayed === firstVisibleGroup.startIndex) {
                                    _ElementUtilities._setAttribute(startMarker, "aria-flowto", firstVisibleGroup.header.id);
                                } else {
                                    _ElementUtilities._setAttribute(startMarker, "aria-flowto", firstVisibleItem.id);
                                }
                            }
                        } else {
                            _ElementUtilities._setAttribute(startMarker, "aria-flowto", firstVisibleItem.id);
                        }

                        // Set endMarker's flowfrom
                        _ElementUtilities._setAttribute(endMarker, "x-ms-aria-flowfrom", lastVisibleItem.id);
                    }
                },

                // Update the ARIA attributes on item that are needed so that Narrator can announce it.
                // item must be in the items container.
                updateAriaForAnnouncement: function VirtualizeContentsView_updateAriaForAnnouncement(item, count) {
                    var index = -1;
                    var type = _UI.ObjectType.item;
                    if (_ElementUtilities.hasClass(item, _Constants._headerClass)) {
                        index = this._listView._groups.index(item);
                        type = _UI.ObjectType.groupHeader;
                        _ElementUtilities._setAttribute(item, "role", this._listView._headerRole);
                        _ElementUtilities._setAttribute(item, "tabindex", this._listView._tabIndex);
                    } else {
                        index = this.items.index(item);
                        _ElementUtilities._setAttribute(item, "aria-setsize", count);
                        _ElementUtilities._setAttribute(item, "aria-posinset", index + 1);
                        _ElementUtilities._setAttribute(item, "role", this._listView._itemRole);
                        _ElementUtilities._setAttribute(item, "tabindex", this._listView._tabIndex);
                    }

                    if (type === _UI.ObjectType.groupHeader) {
                        this._listView._fireAccessibilityAnnotationCompleteEvent(-1, -1, index, index);
                    } else {
                        this._listView._fireAccessibilityAnnotationCompleteEvent(index, index, -1, -1);
                    }
                },

                _reportElementsLevel: function VirtualizeContentsView_reportElementsLevel(direction) {
                    var items = this.items;

                    function elementsCount(first, last) {
                        var count = 0;
                        for (var itemIndex = first; itemIndex <= last; itemIndex++) {
                            var itemData = items.itemDataAt(itemIndex);
                            if (itemData && itemData.container) {
                                count++;
                            }
                        }
                        return count;
                    }

                    var level;
                    if (direction === "right") {
                        level = Math.floor(100 * elementsCount(this.firstIndexDisplayed, this.end - 1) / (this.end - this.firstIndexDisplayed));
                    } else {
                        level = Math.floor(100 * elementsCount(this.begin, this.lastIndexDisplayed) / (this.lastIndexDisplayed - this.begin + 1));
                    }

                    this._listView._writeProfilerMark("elementsLevel level(" + level + "),info");
                },

                _createHeaderContainer: function VirtualizeContentsView_createHeaderContainer(insertAfter) {
                    return this._createSurfaceChild(_Constants._headerContainerClass, insertAfter);
                },

                _createItemsContainer: function VirtualizeContentsView_createItemsContainer(insertAfter) {
                    var itemsContainer = this._createSurfaceChild(_Constants._itemsContainerClass, insertAfter);
                    var padder = _Global.document.createElement("div");
                    padder.className = _Constants._padderClass;
                    itemsContainer.appendChild(padder);
                    return itemsContainer;
                },

                _ensureContainerInDOM: function VirtualizeContentsView_ensureContainerInDOM(index) {
                    var container = this.containers[index];
                    if (container && !this._listView._canvas.contains(container)) {
                        this._forceItemsBlocksInDOM(index, index + 1);
                        return true;
                    }
                    return false;
                },

                _ensureItemsBlocksInDOM: function VirtualizeContentsView_ensureItemsBlocksInDOM(begin, end) {
                    if (this._expandedRange) {
                        var oldBegin = this._expandedRange.first.index,
                            oldEnd = this._expandedRange.last.index + 1;

                        if (begin <= oldBegin && end > oldBegin) {
                            end = Math.max(end, oldEnd);
                        } else if (begin < oldEnd && end >= oldEnd) {
                            begin = Math.min(begin, oldBegin);
                        }
                    }
                    this._forceItemsBlocksInDOM(begin, end);
                },

                _removeRedundantItemsBlocks: function VirtualizeContentsView_removeRedundantItemsBlocks() {
                    if (this.begin !== -1 && this.end !== -1) {
                        this._forceItemsBlocksInDOM(this.begin, this.end);
                    }
                },

                _lazilyRemoveRedundantItemsBlocks: function VirtualizeContentsView_lazilyRemoveRedundantItemsBlocks() {
                    this._listView._writeProfilerMark("_lazilyRemoveRedundantItemsBlocks,StartTM");
                    var that = this;
                    return waitForSeZo(this._listView).then(function () {

                        function done() {
                            that._listView._writeProfilerMark("_lazilyRemoveRedundantItemsBlocks,StopTM");
                        }

                        if (that._listView._isZombie()) {
                            done();
                            return;
                        }

                        if (that._expandedRange && that.begin !== -1 && that.end !== -1 && (that._expandedRange.first.index < that.begin || that._expandedRange.last.index + 1 > that.end)) {
                            var job;

                            var promise = new Promise(function (complete) {

                                function blocksCleanupWorker(info) {
                                    if (that._listView._isZombie()) { return; }

                                    var zooming = shouldWaitForSeZo(that._listView);

                                    while (that._expandedRange.first.index < that.begin && !zooming && !info.shouldYield) {
                                        var begin = Math.min(that.begin, that._expandedRange.first.index + that._blockSize * _VirtualizeContentsView._blocksToRelease);
                                        that._forceItemsBlocksInDOM(begin, that.end);
                                    }

                                    while (that._expandedRange.last.index + 1 > that.end && !zooming && !info.shouldYield) {
                                        var end = Math.max(that.end, that._expandedRange.last.index - that._blockSize * _VirtualizeContentsView._blocksToRelease);
                                        that._forceItemsBlocksInDOM(that.begin, end);
                                    }

                                    if (that._expandedRange.first.index < that.begin || that._expandedRange.last.index + 1 > that.end) {
                                        if (zooming) {
                                            info.setPromise(waitForSeZo(that._listView).then(function () {
                                                return blocksCleanupWorker;
                                            }));
                                        } else {
                                            info.setWork(blocksCleanupWorker);
                                        }
                                    } else {
                                        complete();
                                    }
                                }

                                job = Scheduler.schedule(blocksCleanupWorker, Scheduler.Priority.belowNormal, null, "WinJS.UI.ListView._lazilyRemoveRedundantItemsBlocks");
                            });

                            return promise.then(done, function (error) {
                                job.cancel();
                                that._listView._writeProfilerMark("_lazilyRemoveRedundantItemsBlocks canceled,info");
                                that._listView._writeProfilerMark("_lazilyRemoveRedundantItemsBlocks,StopTM");
                                return Promise.wrapError(error);
                            });

                        } else {
                            done();
                            return Promise.wrap();
                        }
                    });
                },

                _forceItemsBlocksInDOM: function VirtualizeContentsView_forceItemsBlocksInDOM(begin, end) {
                    if (!this._blockSize) {
                        return;
                    }
                    var perfId = "_forceItemsBlocksInDOM begin(" + begin + ") end(" + end + "),";
                    this._listView._writeProfilerMark(perfId + "StartTM");

                    var that = this,
                        added = 0,
                        removed = 0,
                        paddingProperty = "padding" + (this._listView._horizontal() ? "Left" : "Top");

                    function setPadder(itemsContainer, padding) {
                        var padder = itemsContainer.element.firstElementChild;
                        padder.style[paddingProperty] = padding;
                    }

                    function forEachBlock(callback) {
                        for (var g = 0; g < that.tree.length; g++) {
                            var itemsContainer = that.tree[g].itemsContainer;
                            for (var b = 0, len = itemsContainer.itemsBlocks.length; b < len; b++) {
                                if (callback(itemsContainer, itemsContainer.itemsBlocks[b])) {
                                    return;
                                }
                            }
                        }
                    }

                    function measureItemsBlock(itemsBlock) {
                        that._listView._writeProfilerMark("_itemsBlockExtent,StartTM");
                        that._listView._itemsBlockExtent = _ElementUtilities[that._listView._horizontal() ? "getTotalWidth" : "getTotalHeight"](itemsBlock.element);
                        that._listView._writeProfilerMark("_itemsBlockExtent(" + that._listView._itemsBlockExtent + "),info");
                        that._listView._writeProfilerMark("_itemsBlockExtent,StopTM");
                    }

                    function getItemsBlockExtent() {
                        if (that._listView._itemsBlockExtent === -1) {
                            // first try blocks already added to the DOM
                            forEachBlock(function (itemsContainer, itemsBlock) {
                                if (itemsBlock.items.length === that._blockSize && itemsBlock.element.parentNode === itemsContainer.element) {
                                    measureItemsBlock(itemsBlock);
                                    return true;
                                }
                                return false;
                            });
                        }

                        if (that._listView._itemsBlockExtent === -1) {
                            forEachBlock(function (itemsContainer, itemsBlock) {
                                if (itemsBlock.items.length === that._blockSize) {
                                    itemsContainer.element.appendChild(itemsBlock.element);
                                    measureItemsBlock(itemsBlock);
                                    itemsContainer.element.removeChild(itemsBlock.element);
                                    return true;
                                }
                                return false;
                            });
                        }
                        return that._listView._itemsBlockExtent;
                    }

                    function removeBlocks(itemsContainer, begin, end) {

                        function remove(blockIndex) {
                            var block = itemsContainer.itemsBlocks[blockIndex];
                            if (block && block.element.parentNode === itemsContainer.element) {
                                itemsContainer.element.removeChild(block.element);
                                removed++;
                            }
                        }

                        if (Array.isArray(begin)) {
                            begin.forEach(remove);
                        } else {
                            for (var i = begin; i < end; i++) {
                                remove(i);
                            }
                        }
                    }

                    function addBlocks(itemsContainer, begin, end) {
                        var padder = itemsContainer.element.firstElementChild,
                            previous = padder;

                        for (var i = begin; i < end; i++) {
                            var block = itemsContainer.itemsBlocks[i];
                            if (block) {
                                if (block.element.parentNode !== itemsContainer.element) {
                                    itemsContainer.element.insertBefore(block.element, previous.nextElementSibling);
                                    added++;
                                }
                                previous = block.element;
                            }
                        }
                    }

                    function collapseGroup(groupIndex) {
                        if (groupIndex < that.tree.length) {
                            that._listView._writeProfilerMark("collapseGroup(" + groupIndex + "),info");
                            var itemsContainer = that.tree[groupIndex].itemsContainer;
                            removeBlocks(itemsContainer, 0, itemsContainer.itemsBlocks.length);
                            setPadder(itemsContainer, "");
                        }
                    }

                    function expandGroup(groupIndex) {
                        if (groupIndex < that.tree.length) {
                            that._listView._writeProfilerMark("expandGroup(" + groupIndex + "),info");
                            var itemsContainer = that.tree[groupIndex].itemsContainer;
                            addBlocks(itemsContainer, 0, itemsContainer.itemsBlocks.length);
                            setPadder(itemsContainer, "");
                        }
                    }

                    function removedFromRange(oldRange, newRange) {
                        function expand(first, last) {
                            var array = [];
                            for (var i = first; i <= last; i++) {
                                array.push(i);
                            }
                            return array;
                        }

                        var newL = newRange[0];
                        var newR = newRange[1];
                        var oldL = oldRange[0];
                        var oldR = oldRange[1];

                        if (newR < oldL || newL > oldR) {
                            return expand(oldL, oldR);
                        } else if (newL > oldL && newR < oldR) {
                            return expand(oldL, newL - 1).concat(expand(newR + 1, oldR));
                        } else if (oldL < newL) {
                            return expand(oldL, newL - 1);
                        } else if (oldR > newR) {
                            return expand(newR + 1, oldR);
                        } else {
                            return null;
                        }
                    }

                    var firstGroupIndex = this._listView._groups.groupFromItem(begin),
                        lastGroupIndex = this._listView._groups.groupFromItem(end - 1);

                    var firstGroup = this._listView._groups.group(firstGroupIndex),
                        firstItemsContainer = that.tree[firstGroupIndex].itemsContainer;

                    var firstBlock = Math.floor((begin - firstGroup.startIndex) / this._blockSize);

                    var lastGroup = this._listView._groups.group(lastGroupIndex),
                        lastItemsContainer = that.tree[lastGroupIndex].itemsContainer;

                    var lastBlock = Math.floor((end - 1 - lastGroup.startIndex) / this._blockSize);

                    // if size of structure block is needed try to obtain it before modifying the tree to avoid a layout pass
                    if (firstBlock && that._listView._itemsBlockExtent === -1) {
                        forEachBlock(function (itemsContainer, itemsBlock) {
                            if (itemsBlock.items.length === that._blockSize && itemsBlock.element.parentNode === itemsContainer.element) {
                                measureItemsBlock(itemsBlock);
                                return true;
                            }
                            return false;
                        });
                    }

                    var groupsToCollapse = this._expandedRange ? removedFromRange([this._expandedRange.first.groupIndex, this._expandedRange.last.groupIndex], [firstGroupIndex, lastGroupIndex]) : null;
                    if (groupsToCollapse) {
                        groupsToCollapse.forEach(collapseGroup);
                    }

                    if (this._expandedRange && this._expandedRange.first.groupKey === firstGroup.key) {
                        var blocksToRemove = removedFromRange([this._expandedRange.first.block, Number.MAX_VALUE], [firstBlock, Number.MAX_VALUE]);
                        if (blocksToRemove) {
                            removeBlocks(firstItemsContainer, blocksToRemove);
                        }
                    } else if (this._expandedRange && firstGroupIndex >= this._expandedRange.first.groupIndex && firstGroupIndex <= this._expandedRange.last.groupIndex) {
                        removeBlocks(firstItemsContainer, 0, firstBlock);
                    }

                    if (firstGroupIndex !== lastGroupIndex) {
                        addBlocks(firstItemsContainer, firstBlock, firstItemsContainer.itemsBlocks.length);
                        addBlocks(lastItemsContainer, 0, lastBlock + 1);
                    } else {
                        addBlocks(firstItemsContainer, firstBlock, lastBlock + 1);
                    }

                    if (this._expandedRange && this._expandedRange.last.groupKey === lastGroup.key) {
                        var blocksToRemove = removedFromRange([0, this._expandedRange.last.block], [0, lastBlock]);
                        if (blocksToRemove) {
                            removeBlocks(lastItemsContainer, blocksToRemove);
                        }
                    } else if (this._expandedRange && lastGroupIndex >= this._expandedRange.first.groupIndex && lastGroupIndex <= this._expandedRange.last.groupIndex) {
                        removeBlocks(lastItemsContainer, lastBlock + 1, lastItemsContainer.itemsBlocks.length);
                    }

                    setPadder(firstItemsContainer, firstBlock ? firstBlock * getItemsBlockExtent() + "px" : "");

                    if (firstGroupIndex !== lastGroupIndex) {
                        setPadder(lastItemsContainer, "");
                    }

                    // groups between first and last
                    for (var i = firstGroupIndex + 1; i < lastGroupIndex; i++) {
                        expandGroup(i);
                    }

                    this._expandedRange = {
                        first: {
                            index: begin,
                            groupIndex: firstGroupIndex,
                            groupKey: firstGroup.key,
                            block: firstBlock
                        },
                        last: {
                            index: end - 1,
                            groupIndex: lastGroupIndex,
                            groupKey: lastGroup.key,
                            block: lastBlock
                        },
                    };
                    this._listView._writeProfilerMark("_forceItemsBlocksInDOM groups(" + firstGroupIndex + "-" + lastGroupIndex + ") blocks(" + firstBlock + "-" + lastBlock + ") added(" + added + ") removed(" + removed + "),info");
                    this._listView._writeProfilerMark(perfId + "StopTM");
                },

                _realizePageImpl: function VirtualizeContentsView_realizePageImpl() {
                    var that = this;

                    var perfId = "realizePage(scrollPosition:" + this._scrollbarPos + " forceLayout:" + this._forceRelayout + ")";
                    this._listView._writeProfilerMark(perfId + ",StartTM");

                    // It's safe to skip realizePage, so we just queue up the last request to run when the version manager
                    // get unlocked.
                    //
                    if (this._listView._versionManager.locked) {
                        this._listView._versionManager.unlocked.done(function () {
                            if (!that._listView._isZombie()) {
                                that._listView._batchViewUpdates(_Constants._ViewChange.realize, _Constants._ScrollToPriority.low, that._listView.scrollPosition);
                            }
                        });
                        this._listView._writeProfilerMark(perfId + ",StopTM");
                        return Promise.cancel;
                    }

                    return new Promise(function (c) {
                        var renderingCompleteSignal = new _Signal();

                        function complete() {
                            c();
                            renderingCompleteSignal.complete();
                        }

                        function viewPortPageRealized() {
                            that._listView._hideProgressBar();
                            that._state.setLoadingState(that._listView._LoadingState.viewPortLoaded);
                            if (that._executeAnimations) {
                                that._setState(RealizingAnimatingState, renderingCompleteSignal.promise);
                            }
                        }

                        function pageRealized(count) {
                            that._updateAriaMarkers(count === 0, that.firstIndexDisplayed, that.lastIndexDisplayed);
                            that._state.setLoadingState && that._state.setLoadingState(that._listView._LoadingState.itemsLoaded);
                        }

                        function finish(count) {
                            that._listView._clearInsertedItems();
                            that._listView._groups.removeElements();
                            viewPortPageRealized();
                            pageRealized(count);
                            complete();
                        }

                        that._state.setLoadingState(that._listView._LoadingState.itemsLoading);
                        if (that._firstLayoutPass) {
                            that._listView._showProgressBar(that._listView._element, "50%", "50%");
                        }

                        var count = that.containers.length;

                        if (count) {
                            // While the zoom animation is played we want to minimize the # of pages
                            // being fetched to improve TtFF for SeZo scenarios
                            var pagesToPrefetch = _VirtualizeContentsView._pagesToPrefetch;
                            var customPagesToPrefetchMax = _VirtualizeContentsView._customPagesToPrefetchMax;
                            var customPagesToPrefetchMin = _VirtualizeContentsView._customPagesToPrefetchMin;
                            if (that._listView._zooming) {
                                pagesToPrefetch = 0;
                                customPagesToPrefetchMax = 0;
                                customPagesToPrefetchMin = 0;
                            }

                            var viewportLength = that._listView._getViewportLength();
                            var pagesBefore, pagesAfter;

                            if (_BaseUtils._isiOS && !_VirtualizeContentsView._disableCustomPagesPrefetch) {
                                pagesBefore = (that._direction === "left" ? customPagesToPrefetchMax : customPagesToPrefetchMin);

                                // Optimize the beginning of the list such that if you scroll, then change direction and start going back towards the beginning of the list,
                                // we maintain a remainder of pages that can be added to pagesAfter. This ensures that at beginning of the list, which is the common case,
                                // we always have customPagesToPrefetchMax ahead, even when the scrolling direction is constantly changing.
                                var pagesShortBehind = Math.max(0, (pagesBefore - (that._scrollbarPos / viewportLength)));
                                pagesAfter = Math.min(customPagesToPrefetchMax, pagesShortBehind + (that._direction === "right" ? customPagesToPrefetchMax : customPagesToPrefetchMin));
                            } else {
                                pagesBefore = pagesToPrefetch;
                                pagesAfter = pagesToPrefetch;
                            }

                            var beginningOffset = Math.max(0, that._scrollbarPos - pagesBefore * viewportLength),
                                  endingOffset = that._scrollbarPos + (1 + pagesAfter) * viewportLength;

                            var range = that._listView._layout.itemsFromRange(beginningOffset, endingOffset - 1);
                            if ((range.firstIndex < 0 || range.firstIndex >= count) && (range.lastIndex < 0 || range.lastIndex >= count)) {
                                that.begin = -1;
                                that.end = -1;
                                that.firstIndexDisplayed = -1;
                                that.lastIndexDisplayed = -1;
                                finish(count);
                            } else {
                                var begin = _ElementUtilities._clamp(range.firstIndex, 0, count - 1),
                                    end = _ElementUtilities._clamp(range.lastIndex + 1, 0, count);

                                var inView = that._listView._layout.itemsFromRange(that._scrollbarPos, that._scrollbarPos + viewportLength - 1),
                                    firstInView = _ElementUtilities._clamp(inView.firstIndex, 0, count - 1),
                                    lastInView = _ElementUtilities._clamp(inView.lastIndex, 0, count - 1);

                                if (that._realizationLevel === _VirtualizeContentsView._realizationLevel.skip && !that.lastRealizePass && firstInView === that.firstIndexDisplayed && lastInView === that.lastIndexDisplayed) {
                                    that.begin = begin;
                                    that.end = begin + Object.keys(that.items._itemData).length;
                                    that._updateHeaders(that._listView._canvas, that.begin, that.end).done(function () {
                                        that.lastRealizePass = null;
                                        finish(count);
                                    });
                                } else if ((that._forceRelayout || begin !== that.begin || end !== that.end || firstInView !== that.firstIndexDisplayed || lastInView !== that.lastIndexDisplayed) && (begin < end) && (beginningOffset < endingOffset)) {
                                    that._listView._writeProfilerMark("realizePage currentInView(" + firstInView + "-" + lastInView + ") previousInView(" + that.firstIndexDisplayed + "-" + that.lastIndexDisplayed + ") change(" + (firstInView - that.firstIndexDisplayed) + "),info");
                                    that._cancelRealize();
                                    // cancelRealize changes the realizePass and resets begin/end
                                    var currentPass = that._realizePass;
                                    that.begin = begin;
                                    that.end = end;
                                    that.firstIndexDisplayed = firstInView;
                                    that.lastIndexDisplayed = lastInView;
                                    that.deletesWithoutRealize = 0;

                                    that._ensureItemsBlocksInDOM(that.begin, that.end);

                                    var realizeWork = that._realizeItems(
                                        that._listView._itemCanvas,
                                        that.begin,
                                        that.end,
                                        count,
                                        currentPass,
                                        that._scrollbarPos,
                                        that._direction,
                                        firstInView,
                                        lastInView,
                                        that._forceRelayout);

                                    that._forceRelayout = false;

                                    var realizePassWork = realizeWork.viewportItemsRealized.then(function () {
                                        viewPortPageRealized();
                                        return realizeWork.allItemsRealized;
                                    }).then(function () {
                                        if (that._realizePass === currentPass) {
                                            return that._updateHeaders(that._listView._canvas, that.begin, that.end).then(function () {
                                                pageRealized(count);
                                            });
                                        }
                                    }).then(function () {
                                        return realizeWork.loadingCompleted;
                                    }).then(
                                        function () {
                                            that._unrealizeExcessiveItems();
                                            that.lastRealizePass = null;
                                            complete();
                                        },
                                        function (e) {
                                            if (that._realizePass === currentPass) {
                                                that.lastRealizePass = null;
                                                that.begin = -1;
                                                that.end = -1;
                                            }
                                            return Promise.wrapError(e);
                                        }
                                    );

                                    that.lastRealizePass = Promise.join([realizeWork.viewportItemsRealized, realizeWork.allItemsRealized, realizeWork.loadingCompleted, realizePassWork]);

                                    that._unrealizeExcessiveItems();

                                } else if (!that.lastRealizePass) {
                                    // We are currently in the "itemsLoading" state and need to get back to "complete". The
                                    // previous realize pass has been completed so proceed to the other states.
                                    finish(count);
                                } else {
                                    that.lastRealizePass.then(complete);
                                }
                            }
                        } else {
                            that.begin = -1;
                            that.end = -1;
                            that.firstIndexDisplayed = -1;
                            that.lastIndexDisplayed = -1;

                            finish(count);
                        }

                        that._reportElementsLevel(that._direction);

                        that._listView._writeProfilerMark(perfId + ",StopTM");
                    });
                },

                realizePage: function VirtualizeContentsView_realizePage(scrollToFunctor, forceRelayout, scrollEndPromise, StateType) {
                    this._scrollToFunctor = makeFunctor(scrollToFunctor);
                    this._forceRelayout = this._forceRelayout || forceRelayout;
                    this._scrollEndPromise = scrollEndPromise;

                    this._listView._writeProfilerMark(this._state.name + "_realizePage,info");
                    this._state.realizePage(StateType || RealizingState);
                },

                onScroll: function VirtualizeContentsView_onScroll(scrollToFunctor, scrollEndPromise) {
                    this.realizePage(scrollToFunctor, false, scrollEndPromise, ScrollingState);
                },

                reload: function VirtualizeContentsView_reload(scrollToFunctor, highPriority) {
                    if (this._listView._isZombie()) { return; }

                    this._scrollToFunctor = makeFunctor(scrollToFunctor);
                    this._forceRelayout = true;
                    this._highPriorityRealize = !!highPriority;

                    this.stopWork(true);

                    this._listView._writeProfilerMark(this._state.name + "_rebuildTree,info");
                    this._state.rebuildTree();
                },

                refresh: function VirtualizeContentsView_refresh(scrollToFunctor) {
                    if (this._listView._isZombie()) { return; }

                    this._scrollToFunctor = makeFunctor(scrollToFunctor);
                    this._forceRelayout = true;
                    this._highPriorityRealize = true;

                    this.stopWork();

                    this._listView._writeProfilerMark(this._state.name + "_relayout,info");
                    this._state.relayout();
                },

                waitForValidScrollPosition: function VirtualizeContentsView_waitForValidScrollPosition(newPosition) {
                    var that = this;
                    var currentMaxScroll = this._listView._viewport[this._listView._scrollLength] - this._listView._getViewportLength();
                    if (newPosition > currentMaxScroll) {
                        return that._listView._itemsCount().then(function (count) {
                            // Wait until we have laid out enough containers to be able to set the scroll position to newPosition
                            if (that.containers.length < count) {
                                return Promise._cancelBlocker(that._creatingContainersWork && that._creatingContainersWork.promise).then(function () {
                                    return that._getLayoutCompleted();
                                }).then(function () {
                                    return newPosition;
                                });
                            } else {
                                return newPosition;
                            }
                        });
                    } else {
                        return Promise.wrap(newPosition);
                    }
                },

                waitForEntityPosition: function VirtualizeContentsView_waitForEntityPosition(entity) {
                    var that = this;
                    this._listView._writeProfilerMark(this._state.name + "_waitForEntityPosition" + "(" + entity.type + ": " + entity.index + ")" + ",info");
                    return Promise._cancelBlocker(this._state.waitForEntityPosition(entity).then(function () {
                        if ((entity.type !== _UI.ObjectType.groupHeader && entity.index >= that.containers.length) ||
                            (entity.type === _UI.ObjectType.groupHeader && that._listView._groups.group(entity.index).startIndex >= that.containers.length)) {
                            return that._creatingContainersWork && that._creatingContainersWork.promise;
                        }
                    }).then(function () {
                        return that._getLayoutCompleted();
                    }));
                },

                stopWork: function VirtualizeContentsView_stopWork(stopTreeCreation) {
                    this._listView._writeProfilerMark(this._state.name + "_stop,info");
                    this._state.stop(stopTreeCreation);

                    if (this._layoutWork) {
                        this._layoutWork.cancel();
                    }

                    if (stopTreeCreation && this._creatingContainersWork) {
                        this._creatingContainersWork.cancel();
                    }

                    if (stopTreeCreation) {
                        this._state = new CreatedState(this);
                    }
                },

                _cancelRealize: function VirtualizeContentsView_cancelRealize() {
                    this._listView._writeProfilerMark("_cancelRealize,StartTM");

                    if (this.lastRealizePass || this.deferTimeout) {
                        this._forceRelayout = true;
                    }

                    this._clearDeferTimeout();
                    this._realizePass++;

                    if (this._headerRenderPromises) {
                        this._headerRenderPromises.cancel();
                        this._headerRenderPromises = null;
                    }

                    var last = this.lastRealizePass;
                    if (last) {
                        this.lastRealizePass = null;
                        this.begin = -1;
                        this.end = -1;
                        last.cancel();
                    }
                    this._listView._writeProfilerMark("_cancelRealize,StopTM");
                },

                resetItems: function VirtualizeContentsView_resetItems(unparent) {
                    if (!this._listView._isZombie()) {
                        this.firstIndexDisplayed = -1;
                        this.lastIndexDisplayed = -1;
                        this._runningAnimations = null;
                        this._executeAnimations = false;

                        var listView = this._listView;
                        this._firstLayoutPass = true;
                        listView._unsetFocusOnItem();
                        if (listView._currentMode().onDataChanged) {
                            listView._currentMode().onDataChanged();
                        }

                        this.items.each(function (index, item) {
                            if (unparent && item.parentNode && item.parentNode.parentNode) {
                                item.parentNode.parentNode.removeChild(item.parentNode);
                            }
                            listView._itemsManager.releaseItem(item);
                            _Dispose._disposeElement(item);
                        });

                        this.items.removeItems();
                        this._deferredReparenting = [];

                        if (unparent) {
                            listView._groups.removeElements();
                        }

                        listView._clearInsertedItems();
                    }
                },

                reset: function VirtualizeContentsView_reset() {
                    this.stopWork(true);
                    this._state = new CreatedState(this);

                    this.resetItems();

                    // when in the zombie state, we let disposal cleanup the ScrollView state
                    //
                    if (!this._listView._isZombie()) {
                        var listView = this._listView;
                        listView._groups.resetGroups();
                        listView._resetCanvas();

                        this.tree = null;
                        this.keyToGroupIndex = null;
                        this.containers = null;
                        this._expandedRange = null;
                    }
                },

                cleanUp: function VirtualizeContentsView_cleanUp() {
                    this.stopWork(true);

                    this._runningAnimations && this._runningAnimations.cancel();
                    var itemsManager = this._listView._itemsManager;
                    this.items.each(function (index, item) {
                        itemsManager.releaseItem(item);
                        _Dispose._disposeElement(item);
                    });
                    this._listView._unsetFocusOnItem();
                    this.items.removeItems();
                    this._deferredReparenting = [];
                    this._listView._groups.resetGroups();
                    this._listView._resetCanvas();

                    this.tree = null;
                    this.keyToGroupIndex = null;
                    this.containers = null;
                    this._expandedRange = null;

                    this.destroyed = true;
                },

                getContainer: function VirtualizeContentsView_getContainer(itemIndex) {
                    return this.containers[itemIndex];
                },

                _getHeaderContainer: function VirtualizeContentsView_getHeaderContainer(groupIndex) {
                    return this.tree[groupIndex].header;
                },

                _getGroups: function VirtualizeContentsView_getGroups(count) {
                    if (this._listView._groupDataSource) {
                        var groupsContainer = this._listView._groups.groups,
                            groups = [];
                        if (count) {
                            for (var i = 0, len = groupsContainer.length; i < len; i++) {
                                var group = groupsContainer[i],
                                    nextStartIndex = i + 1 < len ? groupsContainer[i + 1].startIndex : count;
                                groups.push({
                                    key: group.key,
                                    size: nextStartIndex - group.startIndex
                                });
                            }
                        }
                        return groups;
                    } else {
                        return [{ key: "-1", size: count }];
                    }
                },

                _createChunk: function VirtualizeContentsView_createChunk(groups, count, chunkSize) {
                    var that = this;

                    this._listView._writeProfilerMark("createChunk,StartTM");

                    function addToGroup(itemsContainer, groupSize) {
                        var children = itemsContainer.element.children,
                            oldSize = children.length,
                            toAdd = Math.min(groupSize - itemsContainer.items.length, chunkSize);

                        _SafeHtml.insertAdjacentHTMLUnsafe(itemsContainer.element, "beforeend", _Helpers._repeat("<div class='win-container win-backdrop'></div>", toAdd));

                        for (var i = 0; i < toAdd; i++) {
                            var container = children[oldSize + i];
                            itemsContainer.items.push(container);
                            that.containers.push(container);
                        }
                    }

                    function newGroup(group) {
                        var node = {
                            header: that._listView._groupDataSource ? that._createHeaderContainer() : null,
                            itemsContainer: {
                                element: that._createItemsContainer(),
                                items: []
                            }
                        };


                        that.tree.push(node);
                        that.keyToGroupIndex[group.key] = that.tree.length - 1;
                        addToGroup(node.itemsContainer, group.size);
                    }

                    if (this.tree.length && this.tree.length <= groups.length) {
                        var last = this.tree[this.tree.length - 1],
                            finalSize = groups[this.tree.length - 1].size;

                        // check if the last group in the tree already has all items. If not add items to this group
                        if (last.itemsContainer.items.length < finalSize) {
                            addToGroup(last.itemsContainer, finalSize);
                            this._listView._writeProfilerMark("createChunk,StopTM");
                            return;
                        }
                    }

                    if (this.tree.length < groups.length) {
                        newGroup(groups[this.tree.length]);
                    }

                    this._listView._writeProfilerMark("createChunk,StopTM");
                },

                _createChunkWithBlocks: function VirtualizeContentsView_createChunkWithBlocks(groups, count, blockSize, chunkSize) {
                    var that = this;
                    this._listView._writeProfilerMark("createChunk,StartTM");

                    function addToGroup(itemsContainer, toAdd) {
                        var lastExistingBlock = itemsContainer.itemsBlocks.length ? itemsContainer.itemsBlocks[itemsContainer.itemsBlocks.length - 1] : null;

                        if (lastExistingBlock && lastExistingBlock.items.length < blockSize) {
                            var fix = Math.min(toAdd, blockSize - lastExistingBlock.items.length);
                            _SafeHtml.insertAdjacentHTMLUnsafe(lastExistingBlock.element, "beforeend", _Helpers._repeat("<div class='win-container win-backdrop'></div>", fix));

                            var oldSize = lastExistingBlock.items.length;
                            children = lastExistingBlock.element.children;

                            for (var j = 0; j < fix; j++) {
                                var child = children[oldSize + j];
                                lastExistingBlock.items.push(child);
                                that.containers.push(child);
                            }

                            toAdd -= fix;
                        }

                        if (toAdd > chunkSize) {
                            toAdd = Math.min(toAdd, Math.max(1, Math.floor(chunkSize / blockSize)) * blockSize);
                        }

                        var blocks = Math.floor(toAdd / blockSize),
                            lastBlockSize = toAdd % blockSize;

                        var blockMarkup = "<div class='win-itemsblock'>" + _Helpers._repeat("<div class='win-container win-backdrop'></div>", blockSize) + "</div>",
                            markup = _Helpers._repeat(blockMarkup, blocks);

                        if (lastBlockSize) {
                            markup += "<div class='win-itemsblock'>" + _Helpers._repeat("<div class='win-container win-backdrop'></div>", lastBlockSize) + "</div>";
                            blocks++;
                        }

                        var blocksTemp = _Global.document.createElement("div");
                        _SafeHtml.setInnerHTMLUnsafe(blocksTemp, markup);
                        var children = blocksTemp.children;

                        for (var i = 0; i < blocks; i++) {
                            var block = children[i],
                                blockNode = {
                                    element: block,
                                    items: _Helpers._nodeListToArray(block.children)
                                };
                            itemsContainer.itemsBlocks.push(blockNode);
                            for (var n = 0; n < blockNode.items.length; n++) {
                                that.containers.push(blockNode.items[n]);
                            }
                        }
                    }

                    function newGroup(group) {
                        var node = {
                            header: that._listView._groupDataSource ? that._createHeaderContainer() : null,
                            itemsContainer: {
                                element: that._createItemsContainer(),
                                itemsBlocks: []
                            }
                        };

                        that.tree.push(node);
                        that.keyToGroupIndex[group.key] = that.tree.length - 1;

                        addToGroup(node.itemsContainer, group.size);
                    }

                    if (this.tree.length && this.tree.length <= groups.length) {
                        var lastContainer = this.tree[this.tree.length - 1].itemsContainer,
                            finalSize = groups[this.tree.length - 1].size,
                            currentSize = 0;

                        if (lastContainer.itemsBlocks.length) {
                            currentSize = (lastContainer.itemsBlocks.length - 1) * blockSize + lastContainer.itemsBlocks[lastContainer.itemsBlocks.length - 1].items.length;
                        }

                        if (currentSize < finalSize) {
                            addToGroup(lastContainer, finalSize - currentSize);
                            this._listView._writeProfilerMark("createChunk,StopTM");
                            return;
                        }
                    }

                    if (this.tree.length < groups.length) {
                        newGroup(groups[this.tree.length]);
                    }

                    this._listView._writeProfilerMark("createChunk,StopTM");
                },

                _generateCreateContainersWorker: function VirtualizeContentsView_generateCreateContainersWorker() {
                    var that = this,
                        counter = 0,
                        skipWait = false;

                    return function work(info) {
                        if (!that._listView._versionManager.locked) {
                            that._listView._itemsCount().then(function (count) {
                                var zooming = !skipWait && shouldWaitForSeZo(that._listView);

                                if (!zooming) {
                                    if (that._listView._isZombie()) { return; }

                                    skipWait = false;

                                    var end = _BaseUtils._now() + _VirtualizeContentsView._createContainersJobTimeslice,
                                        groups = that._getGroups(count),
                                        startLength = that.containers.length,
                                        realizedToEnd = that.end === that.containers.length,
                                        chunkSize = _VirtualizeContentsView._chunkSize;

                                    do {
                                        that._blockSize ? that._createChunkWithBlocks(groups, count, that._blockSize, chunkSize) : that._createChunk(groups, count, chunkSize);
                                        counter++;
                                    } while (that.containers.length < count && _BaseUtils._now() < end);

                                    that._listView._writeProfilerMark("createContainers yields containers(" + that.containers.length + "),info");

                                    that._listView._affectedRange.add({ start: startLength, end: that.containers.length }, count);

                                    if (realizedToEnd) {
                                        that.stopWork();
                                        that._listView._writeProfilerMark(that._state.name + "_relayout,info");
                                        that._state.relayout();
                                    } else {
                                        that._listView._writeProfilerMark(that._state.name + "_layoutNewContainers,info");
                                        that._state.layoutNewContainers();
                                    }

                                    if (that.containers.length < count) {
                                        info.setWork(work);
                                    } else {
                                        that._listView._writeProfilerMark("createContainers completed steps(" + counter + "),info");
                                        that._creatingContainersWork.complete();
                                    }
                                } else {
                                    // Waiting on zooming
                                    info.setPromise(waitForSeZo(that._listView).then(function (timedOut) {
                                        skipWait = timedOut;
                                        return work;
                                    }));
                                }
                            });
                        } else {
                            // Version manager locked
                            info.setPromise(that._listView._versionManager.unlocked.then(function () {
                                return work;
                            }));
                        }
                    };
                },

                _scheduleLazyTreeCreation: function VirtualizeContentsView_scheduleLazyTreeCreation() {
                    return Scheduler.schedule(this._generateCreateContainersWorker(), Scheduler.Priority.idle, this, "WinJS.UI.ListView.LazyTreeCreation");
                },

                _createContainers: function VirtualizeContentsView_createContainers() {
                    this.tree = null;
                    this.keyToGroupIndex = null;
                    this.containers = null;
                    this._expandedRange = null;

                    var that = this,
                        count;

                    return this._listView._itemsCount().then(function (c) {
                        if (c === 0) {
                            that._listView._hideProgressBar();
                        }
                        count = c;
                        that._listView._writeProfilerMark("createContainers(" + count + "),StartTM");
                        if (that._listView._groupDataSource) {
                            return that._listView._groups.initialize();
                        }
                    }).then(function () {
                        that._listView._writeProfilerMark("numberOfItemsPerItemsBlock,StartTM");
                        return (count && that._listView._groups.length() ? that._listView._layout.numberOfItemsPerItemsBlock : null);
                    }).then(function (blockSize) {
                        that._listView._writeProfilerMark("numberOfItemsPerItemsBlock(" + blockSize + "),info");
                        that._listView._writeProfilerMark("numberOfItemsPerItemsBlock,StopTM");

                        that._listView._resetCanvas();

                        that.tree = [];
                        that.keyToGroupIndex = {};
                        that.containers = [];
                        that._blockSize = blockSize;

                        var groups = that._getGroups(count);

                        var end = _BaseUtils._now() + _VirtualizeContentsView._maxTimePerCreateContainers,
                            chunkSize = Math.min(_VirtualizeContentsView._startupChunkSize, _VirtualizeContentsView._chunkSize);
                        var stop;
                        do {
                            stop = blockSize ? that._createChunkWithBlocks(groups, count, blockSize, chunkSize) : that._createChunk(groups, count, chunkSize);
                        } while (_BaseUtils._now() < end && that.containers.length < count && !stop);

                        that._listView._writeProfilerMark("createContainers created(" + that.containers.length + "),info");

                        that._listView._affectedRange.add({ start: 0, end: that.containers.length }, count);

                        if (that.containers.length < count) {
                            var jobNode = that._scheduleLazyTreeCreation();

                            that._creatingContainersWork.promise.done(null, function () {
                                jobNode.cancel();
                            });
                        } else {
                            that._listView._writeProfilerMark("createContainers completed synchronously,info");
                            that._creatingContainersWork.complete();
                        }

                        that._listView._writeProfilerMark("createContainers(" + count + "),StopTM");
                    });
                },

                _updateItemsBlocks: function VirtualizeContentsView_updateItemsBlocks(blockSize) {
                    var that = this;
                    var usingStructuralNodes = !!blockSize;

                    function createNewBlock() {
                        var element = _Global.document.createElement("div");
                        element.className = _Constants._itemsBlockClass;
                        return element;
                    }

                    function updateGroup(itemsContainer, startIndex) {
                        var blockElements = [],
                            itemsCount = 0,
                            blocks = itemsContainer.itemsBlocks,
                            b;

                        function rebuildItemsContainer() {
                            itemsContainer.itemsBlocks = null;
                            itemsContainer.items = [];
                            for (var i = 0; i < itemsCount; i++) {
                                var container = that.containers[startIndex + i];
                                itemsContainer.element.appendChild(container);
                                itemsContainer.items.push(container);
                            }
                        }

                        function rebuildItemsContainerWithBlocks() {
                            itemsContainer.itemsBlocks = [{
                                element: blockElements.length ? blockElements.shift() : createNewBlock(),
                                items: []
                            }];
                            var currentBlock = itemsContainer.itemsBlocks[0];
                            for (var i = 0; i < itemsCount; i++) {
                                if (currentBlock.items.length === blockSize) {
                                    var nextBlock = blockElements.length ? blockElements.shift() : createNewBlock();
                                    itemsContainer.itemsBlocks.push({
                                        element: nextBlock,
                                        items: []
                                    });
                                    currentBlock = itemsContainer.itemsBlocks[itemsContainer.itemsBlocks.length - 1];
                                }

                                var container = that.containers[startIndex + i];
                                currentBlock.element.appendChild(container);
                                currentBlock.items.push(container);
                            }
                            itemsContainer.items = null;
                        }

                        if (blocks) {
                            for (b = 0; b < blocks.length; b++) {
                                itemsCount += blocks[b].items.length;
                                blockElements.push(blocks[b].element);
                            }
                        } else {
                            itemsCount = itemsContainer.items.length;
                        }

                        if (usingStructuralNodes) {
                            rebuildItemsContainerWithBlocks();
                        } else {
                            rebuildItemsContainer();
                        }

                        for (b = 0; b < blockElements.length; b++) {
                            var block = blockElements[b];
                            if (block.parentNode === itemsContainer.element) {
                                itemsContainer.element.removeChild(block);
                            }
                        }

                        return itemsCount;
                    }

                    for (var g = 0, startIndex = 0; g < this.tree.length; g++) {
                        startIndex += updateGroup(this.tree[g].itemsContainer, startIndex);
                    }

                    that._blockSize = blockSize;
                },

                _layoutItems: function VirtualizeContentsView_layoutItems() {
                    var that = this;
                    return this._listView._itemsCount().then(function () {
                        return Promise.as(that._listView._layout.numberOfItemsPerItemsBlock).then(function (blockSize) {
                            that._listView._writeProfilerMark("numberOfItemsPerItemsBlock(" + blockSize + "),info");
                            if (blockSize !== that._blockSize) {
                                that._updateItemsBlocks(blockSize);
                                that._listView._itemsBlockExtent = -1;
                            }

                            var affectedRange = that._listView._affectedRange.get();
                            var changedRange;

                            // We accumulate all changes that occur between layouts in _affectedRange. If layout is interrupted due to additional
                            // modifications, _affectedRange will become the union of the previous range of changes and the new range of changes
                            // and will be passed to layout again. _affectedRange is reset whenever layout completes.
                            if (affectedRange) {
                                changedRange = {
                                    // _affectedRange is stored in the format [start, end), layout expects a range in the form of [firstIndex , lastIndex]
                                    // To ensure that layout can successfully use the expected range to find all of the groups which need to be re-laid out
                                    // we will pad an extra index at the front end such that layout receives [start - 1, end] in form of [lastIndex, firstIndex].
                                    firstIndex: Math.max(affectedRange.start - 1, 0),
                                    lastIndex: Math.min(that.containers.length - 1, affectedRange.end) // Account for any constrained upper limits from lazily loaded win-container's.
                                };
                                if (changedRange.firstIndex < that.containers.length || that.containers.length === 0) {
                                    return that._listView._layout.layout(that.tree, changedRange,
                                        that._modifiedElements || [], that._modifiedGroups || []);
                                }
                            }

                            // There is nothing to layout.
                            that._listView._affectedRange.clear();
                            return {
                                realizedRangeComplete: Promise.wrap(),
                                layoutComplete: Promise.wrap()
                            };
                        });
                    });
                },

                updateTree: function VirtualizeContentsView_updateTree(count, delta, modifiedElements) {
                    this._listView._writeProfilerMark(this._state.name + "_updateTree,info");
                    return this._state.updateTree(count, delta, modifiedElements);
                },

                _updateTreeImpl: function VirtualizeContentsView_updateTreeImpl(count, delta, modifiedElements, skipUnrealizeItems) {
                    this._executeAnimations = true;
                    this._modifiedElements = modifiedElements;

                    if (modifiedElements.handled) {
                        return;
                    }
                    modifiedElements.handled = true;

                    this._listView._writeProfilerMark("_updateTreeImpl,StartTM");

                    var that = this,
                        i;

                    if (!skipUnrealizeItems) {
                        // If we skip unrealize items, this work will eventually happen when we reach the UnrealizingState. Sometimes,
                        // it is appropriate to defer the unrealize work in order to optimize scenarios (e.g, edits that happen when we are
                        // in the CompletedState, that way the animation can start sooner).
                        this._unrealizeItems();
                    }

                    function removeElements(array) {
                        for (var i = 0, len = array.length; i < len; i++) {
                            var itemBox = array[i];
                            itemBox.parentNode.removeChild(itemBox);
                        }
                    }

                    for (var i = 0, len = modifiedElements.length; i < len; i++) {
                        if (modifiedElements[i]._itemBox && modifiedElements[i]._itemBox.parentNode) {
                            _ElementUtilities.removeClass(modifiedElements[i]._itemBox.parentNode, _Constants._selectedClass);
                        }
                    }

                    this.items.each(function (index, item, itemData) {
                        itemData.container && _ElementUtilities.removeClass(itemData.container, _Constants._selectedClass);
                        itemData.container && _ElementUtilities.addClass(itemData.container, _Constants._backdropClass);
                    });

                    var removedGroups = this._listView._updateContainers(this._getGroups(count), count, delta, modifiedElements);

                    removeElements(removedGroups.removedHeaders);
                    removeElements(removedGroups.removedItemsContainers);

                    for (var i = 0, len = modifiedElements.length; i < len; i++) {
                        var modifiedElement = modifiedElements[i];
                        if (modifiedElement.newIndex !== -1) {
                            modifiedElement.element = this.getContainer(modifiedElement.newIndex);
                            if (!modifiedElement.element) {
                                throw "Container missing after updateContainers.";
                            }
                        } else {
                            _ElementUtilities.removeClass(modifiedElement.element, _Constants._backdropClass);
                        }
                    }

                    // We only need to restore focus if the current focus is within surface
                    var activeElement = _Global.document.activeElement;
                    if (this._listView._canvas.contains(activeElement)) {
                        this._requireFocusRestore = activeElement;
                    }

                    this._deferredReparenting = [];
                    this.items.each(function (index, item, itemData) {
                        var container = that.getContainer(index),
                            itemBox = itemData.itemBox;

                        if (itemBox && container) {
                            if (itemBox.parentNode !== container) {
                                if (index >= that.firstIndexDisplayed && index <= that.lastIndexDisplayed) {
                                    that._appendAndRestoreFocus(container, itemBox);
                                } else {
                                    that._deferredReparenting.push({ itemBox: itemBox, container: container });
                                }
                            }
                            _ElementUtilities.removeClass(container, _Constants._backdropClass);
                            itemData.container = container;

                            _ElementUtilities[that._listView.selection._isIncluded(index) ? "addClass" : "removeClass"](container, _Constants._selectedClass);
                            if (!that._listView.selection._isIncluded(index) && _ElementUtilities.hasClass(itemBox, _Constants._selectedClass)) {
                                _ItemEventsHandler._ItemEventsHandler.renderSelection(itemBox, itemData.element, false, true);
                            }
                        }
                    });

                    this._listView._writeProfilerMark("_updateTreeImpl,StopTM");
                },

                _completeUpdateTree: function () {
                    if (this._deferredReparenting) {
                        var deferredCount = this._deferredReparenting.length;
                        if (deferredCount > 0) {
                            var perfId = "_completeReparenting(" + deferredCount + ")";
                            this._listView._writeProfilerMark(perfId + ",StartTM");
                            var deferredItem;
                            for (var i = 0; i < deferredCount; i++) {
                                deferredItem = this._deferredReparenting[i];
                                this._appendAndRestoreFocus(deferredItem.container, deferredItem.itemBox);
                            }
                            this._deferredReparenting = [];
                            this._listView._writeProfilerMark(perfId + ",StopTM");
                        }
                    }
                    this._requireFocusRestore = null;
                },

                _appendAndRestoreFocus: function VirtualizeContentsView_appendAndRestoreFocus(container, itemBox) {
                    if (itemBox.parentNode !== container) {
                        var activeElement;
                        if (this._requireFocusRestore) {
                            activeElement = _Global.document.activeElement;
                        }

                        if (this._requireFocusRestore && this._requireFocusRestore === activeElement && (container.contains(activeElement) || itemBox.contains(activeElement))) {
                            this._listView._unsetFocusOnItem();
                            activeElement = _Global.document.activeElement;
                        }

                        _ElementUtilities.empty(container);
                        container.appendChild(itemBox);

                        if (this._requireFocusRestore && activeElement === this._listView._keyboardEventsHelper) {
                            var focused = this._listView._selection._getFocused();
                            if (focused.type === _UI.ObjectType.item && this.items.itemBoxAt(focused.index) === itemBox) {
                                _ElementUtilities._setActive(this._requireFocusRestore);
                                this._requireFocusRestore = null;
                            }
                        }
                    }
                },

                _startAnimations: function VirtualizeContentsView_startAnimations() {
                    this._listView._writeProfilerMark("startAnimations,StartTM");

                    var that = this;
                    this._hasAnimationInViewportPending = false;
                    var animationPromise = Promise.as(this._listView._layout.executeAnimations()).then(function () {
                        that._listView._writeProfilerMark("startAnimations,StopTM");
                    });
                    return animationPromise;
                },

                _setState: function VirtualizeContentsView_setState(NewStateType, arg) {
                    if (!this._listView._isZombie()) {
                        var prevStateName = this._state.name;
                        this._state = new NewStateType(this, arg);
                        this._listView._writeProfilerMark(this._state.name + "_enter from(" + prevStateName + "),info");
                        this._state.enter();
                    }
                },

                getAdjacent: function VirtualizeContentsView_getAdjacent(currentFocus, direction) {
                    var that = this;
                    return this.waitForEntityPosition(currentFocus).then(function () {
                        return that._listView._layout.getAdjacent(currentFocus, direction);
                    });
                },

                hitTest: function VirtualizeContentsView_hitTest(x, y) {
                    if (!this._realizedRangeLaidOut) {
                        var retVal = this._listView._layout.hitTest(x, y);
                        retVal.index = _ElementUtilities._clamp(retVal.index, -1, this._listView._cachedCount - 1, 0);
                        retVal.insertAfterIndex = _ElementUtilities._clamp(retVal.insertAfterIndex, -1, this._listView._cachedCount - 1, 0);
                        return retVal;
                    } else {
                        return {
                            index: -1,
                            insertAfterIndex: -1
                        };
                    }
                },

                _createTreeBuildingSignal: function VirtualizeContentsView__createTreeBuildingSignal() {
                    if (!this._creatingContainersWork) {
                        this._creatingContainersWork = new _Signal();

                        var that = this;
                        this._creatingContainersWork.promise.done(
                            function () {
                                that._creatingContainersWork = null;
                            },
                            function () {
                                that._creatingContainersWork = null;
                            }
                        );
                    }
                },

                _createLayoutSignal: function VirtualizeContentsView_createLayoutSignal() {
                    var that = this;

                    if (!this._layoutCompleted) {
                        this._layoutCompleted = new _Signal();

                        this._layoutCompleted.promise.done(
                            function () {
                                that._layoutCompleted = null;
                            },
                            function () {
                                that._layoutCompleted = null;
                            }
                        );
                    }

                    if (!this._realizedRangeLaidOut) {
                        this._realizedRangeLaidOut = new _Signal();
                        this._realizedRangeLaidOut.promise.done(
                            function () {
                                that._realizedRangeLaidOut = null;
                            },
                            function () {
                                that._realizedRangeLaidOut = null;
                            }
                        );
                    }
                },

                _getLayoutCompleted: function VirtualizeContentsView_getLayoutCompleted() {
                    return this._layoutCompleted ? Promise._cancelBlocker(this._layoutCompleted.promise) : Promise.wrap();
                },

                _createSurfaceChild: function VirtualizeContentsView_createSurfaceChild(className, insertAfter) {
                    var element = _Global.document.createElement("div");
                    element.className = className;
                    this._listView._canvas.insertBefore(element, insertAfter ? insertAfter.nextElementSibling : null);
                    return element;
                },

                _executeScrollToFunctor: function VirtualizeContentsView_executeScrollToFunctor() {
                    var that = this;
                    return Promise.as(this._scrollToFunctor ? this._scrollToFunctor() : null).then(function (scroll) {
                        that._scrollToFunctor = null;

                        scroll = scroll || {};
                        // _scrollbarPos is initialized to 0 in the constructor, and we only set it when a valid integer
                        // value is passed in order to account for cases when there is not a _scrollToFunctor
                        if (+scroll.position === scroll.position) {
                            that._scrollbarPos = scroll.position;
                        }
                        that._direction = scroll.direction || "right";
                    });
                }
            },{
                _pagesToPrefetch: 2,
                _customPagesToPrefetchMax: 6,
                _customPagesToPrefetchMin: 2,
                _disableCustomPagesPrefetch: false,
                _waitForSeZoIntervalDuration: 100,
                _waitForSeZoTimeoutDuration: 500,
                _chunkSize: 500,
                _startupChunkSize: 100,
                _maxTimePerCreateContainers: 5,
                _createContainersJobTimeslice: 15,
                _blocksToRelease:10,
                _realizationLevel: {
                    skip: "skip",
                    realize: "realize",
                    normal: "normal"
                }
            });


            function nop() { }

            /*
            View is in this state before reload is called so during startup, after datasource change etc.
            */

            var CreatedState = _Base.Class.define(function CreatedState_ctor(view) {
                this.view = view;
                this.view._createTreeBuildingSignal();
                this.view._createLayoutSignal();
            }, {
                name: 'CreatedState',
                enter: function CreatedState_enter() {
                    this.view._createTreeBuildingSignal();
                    this.view._createLayoutSignal();
                },
                stop: nop,
                realizePage: nop,
                rebuildTree: function CreatedState_rebuildTree() {
                    this.view._setState(BuildingState);
                },
                relayout: function CreatedState_relayout() {
                    this.view._setState(BuildingState);
                },
                layoutNewContainers: nop,
                waitForEntityPosition: function CreatedState_waitForEntityPosition() {
                    this.view._setState(BuildingState);
                    return this.view._getLayoutCompleted();
                },
                updateTree: nop
            });

            /*
            In this state View is building its DOM tree with win-container element for each item in the data set.
            To build the tree the view needs to know items count or for grouped case the count of groups and the
            count of items in each group. The view enters this state when the tree needs to be built during
            startup or rebuild after data source change and etc.

            BuildingState => LayingoutState | CreatedState
            */
            var BuildingState = _Base.Class.define(function BuildingState_ctor(view) {
                this.view = view;
            }, {
                name: 'BuildingState',
                enter: function BuildingState_enter() {
                    this.canceling = false;
                    this.view._createTreeBuildingSignal();
                    this.view._createLayoutSignal();

                    var that = this;

                    // Use a signal to guarantee that this.promise is set before the promise
                    // handler is executed.
                    var promiseStoredSignal = new _Signal();
                    this.promise = promiseStoredSignal.promise.then(function () {
                        return that.view._createContainers();
                    }).then(
                        function () {
                            that.view._setState(LayingoutState);
                        },
                        function (error) {
                            if (!that.canceling) {
                                // this is coming from layout. ListView is hidden. We need to raise complete and wait in initial state for further actions
                                that.view._setState(CreatedState);
                                that.view._listView._raiseViewComplete();
                            }
                            return Promise.wrapError(error);
                        }
                    );
                    promiseStoredSignal.complete();
                },
                stop: function BuildingState_stop() {
                    this.canceling = true;
                    this.promise.cancel();
                    this.view._setState(CreatedState);
                },
                realizePage: nop,
                rebuildTree: function BuildingState_rebuildTree() {
                    this.canceling = true;
                    this.promise.cancel();
                    this.enter();
                },
                relayout: nop,
                layoutNewContainers: nop,
                waitForEntityPosition: function BuildingState_waitForEntityPosition() {
                    return this.view._getLayoutCompleted();
                },
                updateTree: nop
            });

            /*
            In this state View waits for the layout to lay out win-container elements. The view enters this state
            after edits or resize.

            LayingoutState => RealizingState | BuildingState | CanceledState | CompletedState | LayoutCanceledState
            */
            var LayingoutState = _Base.Class.define(function LayingoutState_ctor(view, NextStateType) {
                this.view = view;
                this.nextStateType = NextStateType || RealizingState;
            }, {
                name: 'LayingoutState',
                enter: function LayingoutState_enter() {
                    var that = this;
                    this.canceling = false;
                    this.view._createLayoutSignal();

                    this.view._listView._writeProfilerMark(this.name + "_enter_layoutItems,StartTM");

                    // Use a signal to guarantee that this.promise is set before the promise
                    // handler is executed.
                    var promiseStoredSignal = new _Signal();
                    this.promise = promiseStoredSignal.promise.then(function () {
                        return that.view._layoutItems();
                    }).then(function (layoutPromises) {

                        // View is taking ownership of this promise and it will cancel it in stopWork
                        that.view._layoutWork = layoutPromises.layoutComplete;

                        return layoutPromises.realizedRangeComplete;
                    }).then(
                        function () {
                            that.view._listView._writeProfilerMark(that.name + "_enter_layoutItems,StopTM");

                            that.view._listView._clearInsertedItems();
                            that.view._setAnimationInViewportState(that.view._modifiedElements);
                            that.view._modifiedElements = [];
                            that.view._modifiedGroups = [];

                            that.view._realizedRangeLaidOut.complete();

                            that.view._layoutWork.then(function () {
                                that.view._listView._writeProfilerMark(that.name + "_enter_layoutCompleted,info");
                                that.view._listView._affectedRange.clear();
                                that.view._layoutCompleted.complete();
                            });

                            if (!that.canceling) {
                                that.view._setState(that.nextStateType);
                            }
                        },
                        function (error) {
                            that.view._listView._writeProfilerMark(that.name + "_enter_layoutCanceled,info");

                            if (!that.canceling) {
                                // Cancel is coming from layout itself so ListView is hidden or empty. In this case we want to raise loadingStateChanged
                                that.view.firstIndexDisplayed = that.view.lastIndexDisplayed = -1;
                                that.view._updateAriaMarkers(true, that.view.firstIndexDisplayed, that.view.lastIndexDisplayed);
                                that.view._setState(CompletedState);
                            }

                            return Promise.wrapError(error);
                        }
                    );
                    promiseStoredSignal.complete();

                    if (this.canceling) {
                        this.promise.cancel();
                    }
                },
                cancelLayout: function LayingoutState_cancelLayout(switchState) {
                    this.view._listView._writeProfilerMark(this.name + "_cancelLayout,info");
                    this.canceling = true;
                    if (this.promise) {
                        this.promise.cancel();
                    }
                    if (switchState) {
                        this.view._setState(LayoutCanceledState);
                    }
                },
                stop: function LayingoutState_stop() {
                    this.cancelLayout(true);
                },
                realizePage: nop,
                rebuildTree: function LayingoutState_rebuildTree() {
                    this.cancelLayout(false);
                    this.view._setState(BuildingState);
                },
                relayout: function LayingoutState_relayout() {
                    this.cancelLayout(false);
                    this.enter();
                },
                layoutNewContainers: function LayingoutState_layoutNewContainers() {
                    this.relayout();
                },
                waitForEntityPosition: function LayingoutState_waitForEntityPosition() {
                    return this.view._getLayoutCompleted();
                },
                updateTree: function LayingoutState_updateTree(count, delta, modifiedElements) {
                    return this.view._updateTreeImpl(count, delta, modifiedElements);
                }
            });


            /*
            View enters this state when layout is canceled.

            LayoutCanceledState => LayingoutState | BuildingState
            */
            var LayoutCanceledState = _Base.Class.define(function LayoutCanceledState_ctor(view) {
                this.view = view;
            }, {
                name: 'LayoutCanceledState',
                enter: nop,
                stop: nop,
                realizePage: function LayoutCanceledState_realizePage() {
                    this.relayout();
                },
                rebuildTree: function LayoutCanceledState_rebuildTree() {
                    this.view._setState(BuildingState);
                },
                relayout: function LayoutCanceledState_relayout() {
                    this.view._setState(LayingoutState);
                },
                layoutNewContainers: function LayoutCanceledState_layoutNewContainers() {
                    this.relayout();
                },
                waitForEntityPosition: function LayoutCanceledState_waitForEntityPosition() {
                    return this.view._getLayoutCompleted();
                },
                updateTree: function LayoutCanceledState_updateTree(count, delta, modifiedElements) {
                    return this.view._updateTreeImpl(count, delta, modifiedElements);
                }
            });

            /*
            Contents of items in the current viewport and prefetch area is realized during this stage.
            The view enters this state when items needs to be realized for instance during initialization, edits and resize.

            RealizingState => RealizingAnimatingState | UnrealizingState | LayingoutState | BuildingState | CanceledState
            */
            var RealizingState = _Base.Class.define(function RealizingState_ctor(view) {
                this.view = view;
                this.nextState = UnrealizingState;
                this.relayoutNewContainers = true;
            }, {
                name: 'RealizingState',
                enter: function RealizingState_enter() {
                    var that = this;
                    var promiseStoredSignal = new _Signal();
                    this.promise = promiseStoredSignal.promise.then(function () {
                        return that.view._executeScrollToFunctor();
                    }).then(function () {
                        that.relayoutNewContainers = false;
                        return Promise._cancelBlocker(that.view._realizePageImpl());
                    }).then(
                        function () {
                            if (that.view._state === that) {
                                that.view._completeUpdateTree();
                                that.view._listView._writeProfilerMark("RealizingState_to_UnrealizingState");
                                that.view._setState(that.nextState);
                            }
                        },
                        function (error) {
                            if (that.view._state === that && !that.canceling) {
                                that.view._listView._writeProfilerMark("RealizingState_to_CanceledState");
                                that.view._setState(CanceledState);
                            }
                            return Promise.wrapError(error);
                        }
                    );
                    promiseStoredSignal.complete();
                },
                stop: function RealizingState_stop() {
                    this.canceling = true;
                    this.promise.cancel();
                    this.view._cancelRealize();
                    this.view._setState(CanceledState);
                },
                realizePage: function RealizingState_realizePage() {
                    this.canceling = true;
                    this.promise.cancel();
                    this.enter();
                },
                rebuildTree: function RealizingState_rebuildTree() {
                    this.stop();
                    this.view._setState(BuildingState);
                },
                relayout: function RealizingState_relayout() {
                    this.stop();
                    this.view._setState(LayingoutState);
                },
                layoutNewContainers: function RealizingState_layoutNewContainers() {
                    if (this.relayoutNewContainers) {
                        this.relayout();
                    } else {
                        this.view._createLayoutSignal();
                        this.view._relayoutInComplete = true;
                    }
                },
                waitForEntityPosition: function RealizingState_waitForEntityPosition() {
                    return this.view._getLayoutCompleted();
                },
                updateTree: function RealizingState_updateTree(count, delta, modifiedElements) {
                    return this.view._updateTreeImpl(count, delta, modifiedElements);
                },
                setLoadingState: function RealizingState_setLoadingState(state) {
                    this.view._listView._setViewState(state);
                }
            });

            /*
            The view enters this state when the realize pass, animations or unrealizing was canceled or after newContainers have been laid out.
            In this state view waits for the next call from ListViewImpl. It can be scroll, edit etc.

            CanceledState => RealizingState | ScrollingState | LayingoutState | BuildingState
            */
            var CanceledState = _Base.Class.define(function CanceledState_ctor(view) {
                this.view = view;
            }, {
                name: 'CanceledState',
                enter: nop,
                stop: function CanceledState_stop() {
                    // cancelRealize cancels ariaSetup which can still be in progress
                    this.view._cancelRealize();
                },
                realizePage: function CanceledState_realizePage(NewStateType) {
                    this.stop();
                    this.view._setState(NewStateType);
                },
                rebuildTree: function CanceledState_rebuildTree() {
                    this.stop();
                    this.view._setState(BuildingState);
                },
                relayout: function CanceledState_relayout(NextStateType) {
                    this.stop();
                    this.view._setState(LayingoutState, NextStateType);
                },
                layoutNewContainers: function CanceledState_layoutNewContainers() {
                    this.relayout(CanceledState);
                },
                waitForEntityPosition: function CanceledState_waitForEntityPosition() {
                    return this.view._getLayoutCompleted();
                },
                updateTree: function CanceledState_updateTree(count, delta, modifiedElements) {
                    return this.view._updateTreeImpl(count, delta, modifiedElements);
                }
            });

            /*
            This state is almost identical with RealizingState. Currently the difference is that in this state loadingStateChanged events aren’t
            raised and after complete the state is switched to ScrollingPausedState to wait until end of scrolling.

            ScrollingState => RealizingAnimatingState | ScrollingPausedState | LayingoutState | BuildingState | CanceledState
            */
            var ScrollingState = _Base.Class.derive(RealizingState, function ScrollingState_ctor(view) {
                this.view = view;
                this.nextState = ScrollingPausedState;
                this.relayoutNewContainers = true;
            }, {
                name: 'ScrollingState',
                setLoadingState: function ScrollingState_setLoadingState() {
                }
            });

            /*
            The view waits in this state for end of scrolling which for touch is signaled by MSManipulationStateChanged event and for mouse it is timeout.

            ScrollingPausedState => RealizingAnimatingState | ScrollingPausedState | LayingoutState | BuildingState | CanceledState
            */
            var ScrollingPausedState = _Base.Class.derive(CanceledState, function ScrollingPausedState_ctor(view) {
                this.view = view;
            }, {
                name: 'ScrollingPausedState',
                enter: function ScrollingPausedState_enter() {
                    var that = this;
                    this.promise = Promise._cancelBlocker(this.view._scrollEndPromise).then(function () {
                        that.view._setState(UnrealizingState);
                    });
                },
                stop: function ScrollingPausedState_stop() {
                    this.promise.cancel();
                    // cancelRealize cancels ariaSetup which can still be in progress
                    this.view._cancelRealize();
                },
            });

            /*
            In this state, view unrealizes not needed items and then waits for all renderers to complete.

            UnrealizingState => CompletedState | RealizingState | ScrollingState | LayingoutState | BuildingState | CanceledState
            */
            var UnrealizingState = _Base.Class.define(function UnrealizingState_ctor(view) {
                this.view = view;
            }, {
                name: 'UnrealizingState',
                enter: function UnrealizingState_enter() {
                    var that = this;
                    this.promise = this.view._lazilyUnrealizeItems().then(function () {
                        that.view._listView._writeProfilerMark("_renderCompletePromise wait starts,info");
                        return that.view._renderCompletePromise;
                    }).then(function () {
                        that.view._setState(CompletedState);
                    });
                },
                stop: function UnrealizingState_stop() {
                    // cancelRealize cancels ariaSetup which can still be in progress
                    this.view._cancelRealize();
                    this.promise.cancel();
                    this.view._setState(CanceledState);
                },
                realizePage: function UnrealizingState_realizePage(NewStateType) {
                    this.promise.cancel();
                    this.view._setState(NewStateType);
                },
                rebuildTree: function UnrealizingState_rebuildTree() {
                    this.view._setState(BuildingState);
                },
                relayout: function UnrealizingState_relayout() {
                    this.view._setState(LayingoutState);
                },
                layoutNewContainers: function UnrealizingState_layoutNewContainers() {
                    this.view._createLayoutSignal();
                    this.view._relayoutInComplete = true;
                },
                waitForEntityPosition: function UnrealizingState_waitForEntityPosition() {
                    return this.view._getLayoutCompleted();
                },
                updateTree: function UnrealizingState_updateTree(count, delta, modifiedElements) {
                    return this.view._updateTreeImpl(count, delta, modifiedElements);
                }
            });

            /*
            We enter this state, when there are animations to execute, and we have already fired the viewportloaded event

            RealizingAnimatingState => RealizingState | UnrealizingState | LayingoutState | BuildingState | CanceledState
            */
            var RealizingAnimatingState = _Base.Class.define(function RealizingStateAnimating_ctor(view, realizePromise) {
                this.view = view;
                this.realizePromise = realizePromise;
                this.realizeId = 1;
            }, {
                name: 'RealizingAnimatingState',
                enter: function RealizingAnimatingState_enter() {
                    var that = this;


                    this.animating = true;
                    this.animatePromise = this.view._startAnimations();
                    this.animateSignal = new _Signal();
                    this.view._executeAnimations = false;

                    this.animatePromise.done(
                        function () {
                            that.animating = false;
                            if (that.modifiedElements) {
                                that.view._updateTreeImpl(that.count, that.delta, that.modifiedElements);
                                that.modifiedElements = null;
                                that.view._setState(CanceledState);
                            } else {
                                that.animateSignal.complete();
                            }
                        }, function (error) {
                            that.animating = false;
                            return Promise.wrapError(error);
                        }
                    );

                    this._waitForRealize();
                },

                _waitForRealize: function RealizingAnimatingState_waitForRealize() {
                    var that = this;

                    this.realizing = true;
                    this.realizePromise.done(function () {
                        that.realizing = false;
                    });

                    var currentRealizeId = ++this.realizeId;
                    Promise.join([this.realizePromise, this.animateSignal.promise]).done(function () {
                        if (currentRealizeId === that.realizeId) {
                            that.view._completeUpdateTree();
                            that.view._listView._writeProfilerMark("RealizingAnimatingState_to_UnrealizingState");
                            that.view._setState(UnrealizingState);
                        }
                    });
                },

                stop: function RealizingAnimatingState_stop(stopTreeCreation) {
                    // always cancel realization
                    this.realizePromise.cancel();
                    this.view._cancelRealize();

                    // animations are canceled only when tree needs to be rebuilt
                    if (stopTreeCreation) {
                        this.animatePromise.cancel();
                        this.view._setState(CanceledState);
                    }
                },
                realizePage: function RealizingAnimatingState_realizePage() {
                    if (!this.modifiedElements) {
                        var that = this;
                        this.realizePromise = this.view._executeScrollToFunctor().then(function () {
                            return Promise._cancelBlocker(that.view._realizePageImpl());
                        });
                        this._waitForRealize();
                    }
                },
                rebuildTree: function RealizingAnimatingState_rebuildTree() {
                    this.stop(true);
                    this.view._setState(BuildingState);
                },
                relayout: function RealizingAnimatingState_relayout() {
                    // Relayout caused by edits should be stopped by updateTree but relayout can be caused by resize or containers creation and in these cases we should stop animations
                    this.stop(true);
                    // if tree update was waiting for animations we should do it now
                    if (this.modifiedElements) {
                        this.view._updateTreeImpl(this.count, this.delta, this.modifiedElements);
                        this.modifiedElements = null;
                    }
                    this.view._setState(LayingoutState);
                },
                layoutNewContainers: function RealizingAnimatingState_layoutNewContainers() {
                    this.view._createLayoutSignal();
                    this.view._relayoutInComplete = true;
                },
                waitForEntityPosition: function RealizingAnimatingState_waitForEntityPosition() {
                    return this.view._getLayoutCompleted();
                },
                updateTree: function RealizingAnimatingState_updateTree(count, delta, modifiedElements) {
                    if (this.animating) {
                        var previousModifiedElements = this.modifiedElements;
                        this.count = count;
                        this.delta = delta;
                        this.modifiedElements = modifiedElements;

                        return previousModifiedElements ? Promise.cancel : this.animatePromise;
                    } else {
                        return this.view._updateTreeImpl(count, delta, modifiedElements);
                    }
                },
                setLoadingState: function RealizingAnimatingState_setLoadingState(state) {
                    this.view._listView._setViewState(state);
                }
            });

            /*
            The view enters this state when the tree is built, layout and realized after animations have
            finished. The layout can still laying out items outside of realized view during this stage.

            CompletedState => RealizingState | ScrollingState | LayingoutState | BuildingState | LayingoutNewContainersState
            */
            var CompletedState = _Base.Class.derive(CanceledState, function CompletedState_ctor(view) {
                this.view = view;
            }, {
                name: 'CompletedState',
                enter: function CompletedState_enter() {
                    this._stopped = false;
                    this.view._setupDeferredActions();

                    this.view._realizationLevel = _VirtualizeContentsView._realizationLevel.normal;
                    this.view._listView._raiseViewComplete();

                    // _raiseViewComplete will cause user event listener code to run synchronously.
                    // If any updates are made to the Listview, this state will be stopped by the updater.
                    // We don't want to change state to LayingoutNewContainersState if that happens.
                    if (this.view._state === this && this.view._relayoutInComplete && !this._stopped) {
                        this.view._setState(LayingoutNewContainersState);
                    }
                },
                stop: function CompletedState_stop() {
                    this._stopped = true;
                    // Call base class method.
                    CanceledState.prototype.stop.call(this);
                },
                layoutNewContainers: function CompletedState_layoutNewContainers() {
                    this.view._createLayoutSignal();
                    this.view._setState(LayingoutNewContainersState);
                },
                updateTree: function CompletedState_updateTree(count, delta, modifiedElements) {
                    return this.view._updateTreeImpl(count, delta, modifiedElements, true);
                }
            });

            /*
            The view waits in this state for previous layout pass to finish.

            LayingoutNewContainersState => RealizingState | ScrollingState | LayingoutState | BuildingState
            */
            var LayingoutNewContainersState = _Base.Class.derive(CanceledState, function LayingoutNewContainersState(view) {
                this.view = view;
            }, {
                name: 'LayingoutNewContainersState',
                enter: function LayingoutNewContainersState_enter() {
                    var that = this;

                    // _layoutWork is completed when the previous layout pass is done. _getLayoutCompleted will be completed when these new containers are laid out
                    this.promise = Promise.join([this.view.deferTimeout, this.view._layoutWork]);
                    this.promise.then(function () {
                        that.view._relayoutInComplete = false;
                        that.relayout(CanceledState);
                    });
                },
                stop: function LayingoutNewContainersState_stop() {
                    // cancelRealize cancels ariaSetup which can still be in progress
                    this.promise.cancel();
                    this.view._cancelRealize();
                },
                realizePage: function LayingoutNewContainersState_realizePage(NewStateType) {
                    // in this state realizePage needs to run layout before realizing items
                    this.stop();
                    this.view._setState(LayingoutState, NewStateType);
                },
                layoutNewContainers: function LayingoutNewContainersState_layoutNewContainers() {
                    this.view._createLayoutSignal();
                }
            });

            return _VirtualizeContentsView;
        })
    });

});


define('require-style!less/desktop/controls',[],function(){});

define('require-style!less/phone/controls',[],function(){});
// Copyright (c) Microsoft Open Technologies, Inc.  All Rights Reserved. Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
define('WinJS/Controls/ListView',[
    '../Core/_Global',
    '../Core/_Base',
    '../Core/_BaseUtils',
    '../Core/_ErrorFromName',
    '../Core/_Events',
    '../Core/_Log',
    '../Core/_Resources',
    '../Core/_WriteProfilerMark',
    '../Animations/_TransitionAnimation',
    '../BindingList',
    '../Promise',
    '../Scheduler',
    '../_Signal',
    '../Utilities/_Control',
    '../Utilities/_Dispose',
    '../Utilities/_ElementUtilities',
    '../Utilities/_Hoverable',
    '../Utilities/_ItemsManager',
    '../Utilities/_SafeHtml',
    '../Utilities/_TabContainer',
    '../Utilities/_UI',
    '../Utilities/_VersionManager',
    './ItemContainer/_Constants',
    './ItemContainer/_ItemEventsHandler',
    './ListView/_BrowseMode',
    './ListView/_ErrorMessages',
    './ListView/_GroupFocusCache',
    './ListView/_GroupsContainer',
    './ListView/_Helpers',
    './ListView/_ItemsContainer',
    './ListView/_Layouts',
    './ListView/_SelectionManager',
    './ListView/_VirtualizeContentsView',
    'require-style!less/desktop/controls',
    'require-style!less/phone/controls'
    ], function listViewImplInit(_Global, _Base, _BaseUtils, _ErrorFromName, _Events, _Log, _Resources, _WriteProfilerMark, _TransitionAnimation, BindingList, Promise, Scheduler, _Signal, _Control, _Dispose, _ElementUtilities, _Hoverable, _ItemsManager, _SafeHtml, _TabContainer, _UI, _VersionManager, _Constants, _ItemEventsHandler, _BrowseMode, _ErrorMessages, _GroupFocusCache, _GroupsContainer, _Helpers, _ItemsContainer, _Layouts, _SelectionManager, _VirtualizeContentsView) {
    "use strict";

    var transformNames = _BaseUtils._browserStyleEquivalents["transform"];
    var DISPOSE_TIMEOUT = 1000;
    var controlsToDispose = [];
    var disposeControlTimeout;
    var uniqueID = _ElementUtilities._uniqueID;

    function disposeControls() {
        var temp = controlsToDispose;
        controlsToDispose = [];
        temp = temp.filter(function (c) {
            if (c._isZombie()) {
                c._dispose();
                return false;
            } else {
                return true;
            }
        });
        controlsToDispose = controlsToDispose.concat(temp);
    }
    function scheduleForDispose(lv) {
        controlsToDispose.push(lv);
        disposeControlTimeout && disposeControlTimeout.cancel();
        disposeControlTimeout = Promise.timeout(DISPOSE_TIMEOUT).then(disposeControls);
    }

    function getOffsetRight(element) {
        return element.offsetParent ? (element.offsetParent.offsetWidth - element.offsetLeft - element.offsetWidth) : 0;
    }

    var AnimationHelper = _Helpers._ListViewAnimationHelper;

    var strings = {
        get notCompatibleWithSemanticZoom() { return "ListView can only be used with SemanticZoom if randomAccess loading behavior is specified."; },
        get listViewInvalidItem() { return "Item must provide index, key or description of corresponding item."; },
        get listViewViewportAriaLabel() { return _Resources._getWinJSString("ui/listViewViewportAriaLabel").value; }
    };

    var requireSupportedForProcessing = _BaseUtils.requireSupportedForProcessing;

    var ListViewAnimationType = {
        /// <field locid="WinJS.UI.ListView.ListViewAnimationType.entrance" helpKeyword="WinJS.UI.ListViewAnimationType.entrance">
        /// The animation plays when the ListView is first displayed.
        /// </field>
        entrance: "entrance",
        /// <field locid="WinJS.UI.ListView.ListViewAnimationType.contentTransition" helpKeyword="WinJS.UI.ListViewAnimationType.contentTransition">
        /// The animation plays when the ListView is changing its content.
        /// </field>
        contentTransition: "contentTransition"
    };

    // ListView implementation

    _Base.Namespace.define("WinJS.UI", {

        /// <field locid="WinJS.UI.ListView.ListViewAnimationType" helpKeyword="WinJS.UI.ListViewAnimationType">
        /// Specifies whether the ListView animation is an entrance animation or a transition animation.
        /// <compatibleWith platform="Windows" minVersion="8.0"/>
        /// </field>
        ListViewAnimationType: ListViewAnimationType,

        /// <field>
        /// <summary locid="WinJS.UI.ListView">
        /// Displays items in a customizable list or grid.
        /// </summary>
        /// </field>
        /// <icon src="ui_winjs.ui.listview.12x12.png" width="12" height="12" />
        /// <icon src="ui_winjs.ui.listview.16x16.png" width="16" height="16" />
        /// <htmlSnippet><![CDATA[<div data-win-control="WinJS.UI.ListView"></div>]]></htmlSnippet>
        /// <event name="contentanimating" bubbles="true" locid="WinJS.UI.ListView_e:contentanimating">Raised when the ListView is about to play an entrance or a transition animation.</event>
        /// <event name="iteminvoked" bubbles="true" locid="WinJS.UI.ListView_e:iteminvoked">Raised when the user taps or clicks an item.</event>
        /// <event name="groupheaderinvoked" bubbles="true" locid="WinJS.UI.ListView_e:groupheaderinvoked">Raised when the user taps or clicks a group header.</event>
        /// <event name="selectionchanging" bubbles="true" locid="WinJS.UI.ListView_e:selectionchanging">Raised before items are selected or deselected.</event>
        /// <event name="selectionchanged" bubbles="true" locid="WinJS.UI.ListView_e:selectionchanged">Raised after items are selected or deselected.</event>
        /// <event name="loadingstatechanged" bubbles="true" locid="WinJS.UI.ListView_e:loadingstatechanged">Raised when the loading state changes.</event>
        /// <event name="keyboardnavigating" bubbles="true" locid="WinJS.UI.ListView_e:keyboardnavigating">Raised when the focused item changes.</event>
        /// <event name="itemdragstart" bubbles="true" locid="WinJS.UI.ListView_e:itemdragstart">Raised when the the user begins dragging ListView items.</event>
        /// <event name="itemdragenter" bubbles="true" locid="WinJS.UI.ListView_e:itemdragenter">Raised when the user drags into the ListView.</event>
        /// <event name="itemdragend" bubbles="true" locid="WinJS.UI.ListView_e:itemdragend">Raised when a drag operation begun in a ListView ends.</event>
        /// <event name="itemdragbetween" bubbles="true" locid="WinJS.UI.ListView_e:itemdragbetween">Raised when the user drags between two ListView items.</event>
        /// <event name="itemdragleave" bubbles="true" locid="WinJS.UI.ListView_e:itemdragleave">Raised when the user drags outside of the ListView region.</event>
        /// <event name="itemdragchanged" bubbles="true" locid="WinJS.UI.ListView_e:itemdragchanged">Raised when the items being dragged are changed due to a datasource modification.</event>
        /// <event name="itemdragdrop" bubbles="true" locid="WinJS.UI.ListView_e:itemdragdrop">Raised when the user drops items into the ListView.</event>
        /// <event name="accessibilityannotationcomplete" bubbles="true" locid="WinJS.UI.ListView_e:accessibilityannotationcomplete">Raised when the accessibility attributes have been added to the ListView items.</event>
        /// <part name="listView" class="win-listview" locid="WinJS.UI.ListView_part:listView">The entire ListView control.</part>
        /// <part name="viewport" class="win-viewport" locid="WinJS.UI.ListView_part:viewport">The viewport of the ListView. </part>
        /// <part name="surface" class="win-surface" locid="WinJS.UI.ListView_part:surface">The scrollable region of the ListView.</part>
        /// <part name="item" class="win-item" locid="WinJS.UI.ListView_part:item">An item in the ListView.</part>
        /// <part name="selectionbackground" class="win-selectionbackground" locid="WinJS.UI.ListView_part:selectionbackground">The background of a selection checkmark.</part>
        /// <part name="selectioncheckmark" class="win-selectioncheckmark" locid="WinJS.UI.ListView_part:selectioncheckmark">A selection checkmark.</part>
        /// <part name="groupHeader" class="win-groupheader" locid="WinJS.UI.ListView_part:groupHeader">The header of a group.</part>
        /// <part name="progressbar" class="win-progress" locid="WinJS.UI.ListView_part:progressbar">The progress indicator of the ListView.</part>
        /// <resource type="javascript" src="//WinJS.3.0/js/base.js" shared="true" />
        /// <resource type="javascript" src="//WinJS.3.0/js/ui.js" shared="true" />
        /// <resource type="css" src="//WinJS.3.0/css/ui-dark.css" shared="true" />
        ListView: _Base.Namespace._lazy(function () {
            var AffectedRange = _Base.Class.define(function () {
                this.clear();
            }, {
                // Marks the union of the current affected range and range as requiring layout
                add: function (range, itemsCount) {
                    range._lastKnownSizeOfData = itemsCount; // store this in order to make unions.
                    if (!this._range) {
                        this._range = range;
                    } else {
                        // Take the union of these two ranges.
                        this._range.start = Math.min(this._range.start, range.start);
                        // To accurately calculate the new unioned range 'end' value, we need to convert the current and new range end
                        // positions into values that represent the remaining number of un-modified items in between the end of the range
                        // and the end of the list of data.
                        var previousUnmodifiedItemsFromEnd = (this._range._lastKnownSizeOfData - this._range.end);
                        var newUnmodifiedItemsFromEnd = (range._lastKnownSizeOfData - range.end);
                        var finalUnmodifiedItemsFromEnd = Math.min(previousUnmodifiedItemsFromEnd, newUnmodifiedItemsFromEnd);
                        this._range._lastKnownSizeOfData = range._lastKnownSizeOfData;
                        // Convert representation of the unioned end position back into a value which matches the above definition of _affecteRange.end
                        this._range.end = this._range._lastKnownSizeOfData - finalUnmodifiedItemsFromEnd;
                    }
                },

                // Marks everything as requiring layout
                addAll: function () {
                    this.add({ start: 0, end: Number.MAX_VALUE }, Number.MAX_VALUE);
                },

                // Marks nothing as requiring layout
                clear: function () {
                    this._range = null;
                },

                get: function () {
                    return this._range;
                }
            });

            var ZoomableView = _Base.Class.define(function ZoomableView_ctor(listView) {
                // Constructor

                this._listView = listView;
            }, {
                // Public methods

                getPanAxis: function () {
                    return this._listView._getPanAxis();
                },

                configureForZoom: function (isZoomedOut, isCurrentView, triggerZoom, prefetchedPages) {
                    this._listView._configureForZoom(isZoomedOut, isCurrentView, triggerZoom, prefetchedPages);
                },

                setCurrentItem: function (x, y) {
                    this._listView._setCurrentItem(x, y);
                },

                getCurrentItem: function () {
                    return this._listView._getCurrentItem();
                },

                beginZoom: function () {
                    return this._listView._beginZoom();
                },

                positionItem: function (item, position) {
                    return this._listView._positionItem(item, position);
                },

                endZoom: function (isCurrentView) {
                    this._listView._endZoom(isCurrentView);
                },

                pinching: {
                    get: function () {
                        return this._listView._pinching;
                    },
                    set: function (value) {
                        this._listView._pinching = value;
                    }
                }
            });

            var ListView = _Base.Class.define(function ListView_ctor(element, options) {
                /// <signature helpKeyword="WinJS.UI.ListView.ListView">
                /// <summary locid="WinJS.UI.ListView.constructor">
                /// Creates a new ListView.
                /// </summary>
                /// <param name="element" domElement="true" locid="WinJS.UI.ListView.constructor_p:element">
                /// The DOM element that hosts the ListView control.
                /// </param>
                /// <param name="options" type="Object" locid="WinJS.UI.ListView.constructor_p:options">
                /// An object that contains one or more property/value pairs to apply to the new control.
                /// Each property of the options object corresponds to one of the control's properties or events.
                /// Event names must begin with "on". For example, to provide a handler for the selectionchanged event,
                /// add a property named "onselectionchanged" to the options object and set its value to the event handler.
                /// </param>
                /// <returns type="WinJS.UI.ListView" locid="WinJS.UI.ListView.constructor_returnValue">
                /// The new ListView.
                /// </returns>
                /// </signature>
                element = element || _Global.document.createElement("div");
                if (_ElementUtilities._supportsTouchActionCrossSlide) {
                    element.classList.add(_Constants._listViewSupportsCrossSlideClass);
                }

                this._id = element.id || "";
                this._writeProfilerMark("constructor,StartTM");

                options = options || {};

                // Attaching JS control to DOM element
                element.winControl = this;
                _ElementUtilities.addClass(element, "win-disposable");
                this._affectedRange = new AffectedRange();
                this._mutationObserver = new _ElementUtilities._MutationObserver(this._itemPropertyChange.bind(this));
                this._versionManager = null;
                this._insertedItems = {};
                this._element = element;
                this._startProperty = null;
                this._scrollProperty = null;
                this._scrollLength = null;
                this._scrolling = false;
                this._zooming = false;
                this._pinching = false;
                this._itemsManager = null;
                this._canvas = null;
                this._cachedCount = _Constants._UNINITIALIZED;
                this._loadingState = this._LoadingState.complete;
                this._firstTimeDisplayed = true;
                this._currentScrollPosition = 0;
                this._lastScrollPosition = 0;
                this._notificationHandlers = [];
                this._itemsBlockExtent = -1;
                this._viewportWidth = _Constants._UNINITIALIZED;
                this._viewportHeight = _Constants._UNINITIALIZED;
                this._manipulationState = _ElementUtilities._MSManipulationEvent.MS_MANIPULATION_STATE_STOPPED;
                this._maxDeferredItemCleanup = Number.MAX_VALUE;
                this._groupsToRemove = {};
                this._setupInternalTree();
                this._isCurrentZoomView = true;
                this._dragSource = false;
                this._reorderable = false;
                this._groupFocusCache = new _GroupFocusCache._UnsupportedGroupFocusCache();
                this._viewChange = _Constants._ViewChange.rebuild;
                this._scrollToFunctor = null;
                this._setScrollbarPosition = false;
                // The view needs to be initialized after the internal tree is setup, because the view uses the canvas node immediately to insert an element in its constructor
                this._view = new _VirtualizeContentsView._VirtualizeContentsView(this);
                this._selection = new _SelectionManager._SelectionManager(this);
                this._createTemplates();
                this._groupHeaderRenderer = _ItemsManager._trivialHtmlRenderer;
                this._itemRenderer = _ItemsManager._trivialHtmlRenderer;
                this._groupHeaderRelease = null;
                this._itemRelease = null;
                if (!options.itemDataSource) {
                    var list = new BindingList.List();
                    this._dataSource = list.dataSource;
                } else {
                    this._dataSource = options.itemDataSource;
                }
                this._selectionMode = _UI.SelectionMode.multi;
                this._tap = _UI.TapBehavior.invokeOnly;
                this._groupHeaderTap = _UI.GroupHeaderTapBehavior.invoke;
                this._swipeBehavior = _UI.SwipeBehavior.select;
                this._mode = new _BrowseMode._SelectionMode(this);

                // Call after swipeBehavior and modes are set
                this._setSwipeClass();

                this._groups = new _GroupsContainer._NoGroups(this);
                this._updateItemsAriaRoles();
                this._updateGroupHeadersAriaRoles();
                this._element.setAttribute("aria-multiselectable", this._multiSelection());
                this._element.tabIndex = -1;
                this._tabManager.tabIndex = this._tabIndex;
                if (this._element.style.position !== "absolute" && this._element.style.position !== "relative") {
                    this._element.style.position = "relative";
                }
                this._updateItemsManager();
                if (!options.layout) {
                    this._updateLayout(new _Layouts.GridLayout());
                }
                this._attachEvents();

                this._runningInit = true;
                _Control.setOptions(this, options);
                this._runningInit = false;

                this._batchViewUpdates(_Constants._ViewChange.rebuild, _Constants._ScrollToPriority.medium, 0);
                this._writeProfilerMark("constructor,StopTM");
            }, {
                // Public properties

                /// <field type="HTMLElement" domElement="true" hidden="true" locid="WinJS.UI.ListView.element" helpKeyword="WinJS.UI.ListView.element">
                /// Gets the DOM element that hosts the ListView.
                /// </field>
                element: {
                    get: function () { return this._element; }
                },

                /// <field type="WinJS.UI.Layout" locid="WinJS.UI.ListView.layout" helpKeyword="WinJS.UI.ListView.layout">
                /// Gets or sets an object that controls the layout of the ListView.
                /// </field>
                layout: {
                    get: function () {
                        return this._layoutImpl;
                    },
                    set: function (layoutObject) {
                        this._updateLayout(layoutObject);

                        if (!this._runningInit) {
                            this._view.reset();
                            this._updateItemsManager();
                            this._batchViewUpdates(_Constants._ViewChange.rebuild, _Constants._ScrollToPriority.medium, 0, true);
                        }
                    }
                },

                /// <field type="Number" integer="true" locid="WinJS.UI.ListView.pagesToLoad" helpKeyword="WinJS.UI.ListView.pagesToLoad" isAdvanced="true">
                /// Gets or sets the number of pages to load when the user scrolls beyond the
                /// threshold specified by the pagesToLoadThreshold property if
                /// the loadingBehavior property is set to incremental.
                /// <deprecated type="deprecate">
                /// pagesToLoad is deprecated. The control will not use this property. Please refer to the 'ListView loading behaviors' SDK Sample for guidance on how to implement incremental load behavior.
                /// </deprecated>
                /// </field>
                pagesToLoad: {
                    get: function () {
                        return (_VirtualizeContentsView._VirtualizeContentsView._pagesToPrefetch * 2) + 1;
                    },
                    set: function () {
                        _ElementUtilities._deprecated(_ErrorMessages.pagesToLoadIsDeprecated);
                    }
                },

                /// <field type="Number" integer="true" locid="WinJS.UI.ListView.pagesToLoadThreshold" helpKeyword="WinJS.UI.ListView.pagesToLoadThreshold" isAdvanced="true">
                /// Gets or sets the threshold (in pages) for initiating an incremental load. When the last visible item is
                /// within the specified number of pages from the end of the loaded portion of the list,
                /// and if automaticallyLoadPages is true and loadingBehavior is set to "incremental",
                /// the ListView initiates an incremental load.
                /// <deprecated type="deprecate">
                /// pagesToLoadThreshold is deprecated.  The control will not use this property. Please refer to the 'ListView loading behaviors' SDK Sample for guidance on how to implement incremental load behavior.
                /// </deprecated>
                /// </field>
                pagesToLoadThreshold: {
                    get: function () {
                        return 0;
                    },
                    set: function () {
                        _ElementUtilities._deprecated(_ErrorMessages.pagesToLoadThresholdIsDeprecated);
                    }
                },

                /// <field type="Object" locid="WinJS.UI.ListView.groupDataSource" helpKeyword="WinJS.UI.ListView.groupDataSource">
                /// Gets or sets the data source that contains the groups for the items in the itemDataSource.
                /// </field>
                groupDataSource: {
                    get: function () {
                        return this._groupDataSource;
                    },
                    set: function (newValue) {
                        this._writeProfilerMark("set_groupDataSource,info");

                        var that = this;

                        function groupStatusChanged(eventObject) {
                            if (eventObject.detail === _UI.DataSourceStatus.failure) {
                                that.itemDataSource = null;
                                that.groupDataSource = null;
                            }
                        }

                        if (this._groupDataSource && this._groupDataSource.removeEventListener) {
                            this._groupDataSource.removeEventListener("statuschanged", groupStatusChanged, false);
                        }

                        this._groupDataSource = newValue;
                        this._groupFocusCache = (newValue && this._supportsGroupHeaderKeyboarding) ? new _GroupFocusCache._GroupFocusCache(this) : new _GroupFocusCache._UnsupportedGroupFocusCache();

                        if (this._groupDataSource && this._groupDataSource.addEventListener) {
                            this._groupDataSource.addEventListener("statuschanged", groupStatusChanged, false);
                        }

                        this._createGroupsContainer();

                        if (!this._runningInit) {
                            this._view.reset();
                            this._pendingLayoutReset = true;
                            this._pendingGroupWork = true;
                            this._batchViewUpdates(_Constants._ViewChange.rebuild, _Constants._ScrollToPriority.medium, 0, true);
                        } else {
                            this._updateGroupWork();
                            this._resetLayout();
                        }
                    }
                },

                _updateGroupWork: function () {
                    this._pendingGroupWork = false;

                    if (this._groupDataSource) {
                        _ElementUtilities.addClass(this._element, _Constants._groupsClass);
                    } else {
                        _ElementUtilities.removeClass(this._element, _Constants._groupsClass);
                    }
                    this._resetLayout();
                },

                /// <field type="Boolean" locid="WinJS.UI.ListView.automaticallyLoadPages" helpKeyword="WinJS.UI.ListView.automaticallyLoadPages">
                /// Gets or sets a value that indicates whether the next set of pages is automatically loaded
                /// when the user scrolls beyond the number of pages specified by the
                /// pagesToLoadThreshold property.
                /// <deprecated type="deprecate">
                /// automaticallyLoadPages is deprecated. The control will default this property to false. Please refer to the 'ListView loading behaviors' SDK Sample for guidance on how to implement incremental load behavior.
                /// </deprecated>
                /// </field>
                automaticallyLoadPages: {
                    get: function () {
                        return false;
                    },
                    set: function () {
                        _ElementUtilities._deprecated(_ErrorMessages.automaticallyLoadPagesIsDeprecated);
                    }
                },

                /// <field type="String" oamOptionsDatatype="WinJS.UI.ListView.LoadingBehavior" locid="WinJS.UI.ListView.loadingBehavior" helpKeyword="WinJS.UI.ListView.loadingBehavior">
                /// Gets or sets a value that determines how many data items are loaded into the DOM.
                /// <deprecated type="deprecate">
                /// pagesToLoadThreshold is deprecated. The control will default this property to 'randomAccess'. Please refer to the 'ListView loading behaviors' SDK Sample for guidance on how to implement incremental load behavior.
                /// </deprecated>
                /// </field>
                loadingBehavior: {
                    get: function () {
                        return "randomAccess";
                    },
                    set: function () {
                        _ElementUtilities._deprecated(_ErrorMessages.loadingBehaviorIsDeprecated);
                    }
                },

                /// <field type="String" oamOptionsDatatype="WinJS.UI.ListView.SelectionMode" locid="WinJS.UI.ListView.selectionMode" helpKeyword="WinJS.UI.ListView.selectionMode">
                /// Gets or sets a value that specifies how many ListView items the user can select: "none", "single", or "multi".
                /// </field>
                selectionMode: {
                    get: function () {
                        return this._selectionMode;
                    },
                    set: function (newMode) {
                        if (typeof newMode === "string") {
                            if (newMode.match(/^(none|single|multi)$/)) {
                                if (_BaseUtils.isPhone && newMode === _UI.SelectionMode.single) {
                                    return;
                                }
                                this._selectionMode = newMode;
                                this._element.setAttribute("aria-multiselectable", this._multiSelection());
                                this._updateItemsAriaRoles();
                                this._setSwipeClass();
                                this._configureSelectionMode();
                                return;
                            }
                        }
                        throw new _ErrorFromName("WinJS.UI.ListView.ModeIsInvalid", _ErrorMessages.modeIsInvalid);
                    }
                },

                /// <field type="String" oamOptionsDatatype="_UI.TapBehavior" locid="WinJS.UI.ListView.tapBehavior" helpKeyword="WinJS.UI.ListView.tapBehavior">
                /// Gets or sets how the ListView reacts when the user taps or clicks an item.
                /// The tap or click can invoke the item, select it and invoke it, or have no
                /// effect.
                /// </field>
                tapBehavior: {
                    get: function () {
                        return this._tap;
                    },
                    set: function (tap) {
                        if (_BaseUtils.isPhone && tap === _UI.TapBehavior.directSelect) {
                            return;
                        }
                        this._tap = tap;
                        this._updateItemsAriaRoles();
                        this._configureSelectionMode();
                    }
                },

                /// <field type="String" oamOptionsDatatype="WinJS.UI.GroupHeaderTapBehavior" locid="WinJS.UI.ListView.groupHeaderTapBehavior" helpKeyword="WinJS.UI.ListView.groupHeaderTapBehavior">
                /// Gets or sets how the ListView reacts when the user taps or clicks a group header.
                /// </field>
                groupHeaderTapBehavior: {
                    get: function () {
                        return this._groupHeaderTap;
                    },
                    set: function (tap) {
                        this._groupHeaderTap = tap;
                        this._updateGroupHeadersAriaRoles();
                    }
                },

                /// <field type="String" oamOptionsDatatype="WinJS.UI.SwipeBehavior" locid="WinJS.UI.ListView.swipeBehavior" helpKeyword="WinJS.UI.ListView.swipeBehavior">
                /// Gets or sets how the ListView reacts to the swipe interaction.
                /// The swipe gesture can select the swiped items or it can
                /// have no effect on the current selection.
                /// <compatibleWith platform="Windows" minVersion="8.0"/>
                /// </field>
                swipeBehavior: {
                    get: function () {
                        return this._swipeBehavior;
                    },
                    set: function (swipeBehavior) {
                        this._swipeBehavior = swipeBehavior;
                        this._setSwipeClass();
                    }
                },

                /// <field type="Object" locid="WinJS.UI.ListView.itemDataSource" helpKeyword="WinJS.UI.ListView.itemDataSource">
                /// Gets or sets the data source that provides items for the ListView.
                /// </field>
                itemDataSource: {
                    get: function () {
                        return this._itemsManager.dataSource;
                    },
                    set: function (newData) {
                        this._writeProfilerMark("set_itemDataSource,info");
                        this._dataSource = newData || new BindingList.List().dataSource;
                        this._groupFocusCache.clear();

                        if (!this._runningInit) {
                            this._selection._reset();
                            this._cancelAsyncViewWork(true);
                            this._updateItemsManager();
                            this._pendingLayoutReset = true;
                            this._batchViewUpdates(_Constants._ViewChange.rebuild, _Constants._ScrollToPriority.medium, 0, true);
                        }
                    }
                },

                /// <field type="Object" locid="WinJS.UI.ListView.itemTemplate" helpKeyword="WinJS.UI.ListView.itemTemplate" potentialValueSelector="[data-win-control='WinJS.Binding.Template']">
                /// Gets or sets the templating function that creates the DOM elements
                /// for each item in the itemDataSource. Each item can contain multiple
                /// DOM elements, but we recommend that it have a single root element.
                /// </field>
                itemTemplate: {
                    get: function () {
                        return this._itemRenderer;
                    },
                    set: function (newRenderer) {
                        this._setRenderer(newRenderer, false);

                        if (!this._runningInit) {
                            this._cancelAsyncViewWork(true);
                            this._updateItemsManager();
                            this._pendingLayoutReset = true;
                            this._batchViewUpdates(_Constants._ViewChange.rebuild, _Constants._ScrollToPriority.medium, 0, true);
                        }
                    }
                },

                /// <field type="Function" locid="WinJS.UI.ListView.resetItem" helpKeyword="WinJS.UI.ListView.resetItem">
                /// Gets or sets the function that is called when the ListView recycles the
                /// element representation of an item.
                /// <deprecated type="deprecate">
                /// resetItem may be altered or unavailable in future versions. Instead, mark the element as disposable using WinJS.Utilities.markDisposable.
                /// </deprecated>
                /// </field>
                resetItem: {
                    get: function () {
                        return this._itemRelease;
                    },
                    set: function (release) {
                        _ElementUtilities._deprecated(_ErrorMessages.resetItemIsDeprecated);
                        this._itemRelease = release;
                    }
                },

                /// <field type="Object" locid="WinJS.UI.ListView.groupHeaderTemplate" helpKeyword="WinJS.UI.ListView.groupHeaderTemplate" potentialValueSelector="[data-win-control='WinJS.Binding.Template']">
                /// Gets or sets the templating function that creates the DOM elements
                /// for each group header in the groupDataSource. Each group header
                /// can contain multiple elements, but it must have a single root element.
                /// </field>
                groupHeaderTemplate: {
                    get: function () {
                        return this._groupHeaderRenderer;
                    },
                    set: function (newRenderer) {
                        this._setRenderer(newRenderer, true);

                        if (!this._runningInit) {
                            this._cancelAsyncViewWork(true);
                            this._pendingLayoutReset = true;
                            this._batchViewUpdates(_Constants._ViewChange.rebuild, _Constants._ScrollToPriority.medium, 0, true);
                        }
                    }
                },

                /// <field type="Function" locid="WinJS.UI.ListView.resetGroupHeader" helpKeyword="WinJS.UI.ListView.resetGroupHeader" isAdvanced="true">
                /// Gets or sets the function that is called when the ListView recycles the DOM element representation
                /// of a group header.
                /// <deprecated type="deprecate">
                /// resetGroupHeader may be altered or unavailable in future versions. Instead, mark the header element as disposable using WinJS.Utilities.markDisposable.
                /// </deprecated>
                /// </field>
                resetGroupHeader: {
                    get: function () {
                        return this._groupHeaderRelease;
                    },
                    set: function (release) {
                        _ElementUtilities._deprecated(_ErrorMessages.resetGroupHeaderIsDeprecated);
                        this._groupHeaderRelease = release;
                    }
                },

                /// <field type="String" hidden="true" locid="WinJS.UI.ListView.loadingState" helpKeyword="WinJS.UI.ListView.loadingState">
                /// Gets a value that indicates whether the ListView is still loading or whether
                /// loading is complete.  This property can return one of these values:
                /// "itemsLoading", "viewPortLoaded", "itemsLoaded", or "complete".
                /// </field>
                loadingState: {
                    get: function () {
                        return this._loadingState;
                    }
                },

                /// <field type="Object" locid="WinJS.UI.ListView.selection" helpKeyword="WinJS.UI.ListView.selection" isAdvanced="true">
                /// Gets an ISelection object that contains the currently selected items.
                /// </field>
                selection: {
                    get: function () {
                        return this._selection;
                    }
                },

                /// <field type="Number" integer="true" locid="WinJS.UI.ListView.indexOfFirstVisible" helpKeyword="WinJS.UI.ListView.indexOfFirstVisible" isAdvanced="true">
                /// Gets or sets the first visible item. When setting this property, the ListView scrolls so that the
                /// item with the specified index is at the top of the list.
                /// </field>
                indexOfFirstVisible: {
                    get: function () {
                        return this._view.firstIndexDisplayed;
                    },

                    set: function (itemIndex) {
                        if (itemIndex < 0) {
                            return;
                        }

                        this._writeProfilerMark("set_indexOfFirstVisible(" + itemIndex + "),info");
                        this._raiseViewLoading(true);

                        var that = this;
                        this._batchViewUpdates(_Constants._ViewChange.realize, _Constants._ScrollToPriority.high, function () {
                            var range;
                            return that._entityInRange({ type: _UI.ObjectType.item, index: itemIndex }).then(function (validated) {
                                if (!validated.inRange) {
                                    return {
                                        position: 0,
                                        direction: "left"
                                    };
                                } else {
                                    return that._getItemOffset({ type: _UI.ObjectType.item, index: validated.index }).then(function (r) {
                                        range = r;
                                        return that._ensureFirstColumnRange(_UI.ObjectType.item);
                                    }).then(function () {
                                        range = that._correctRangeInFirstColumn(range, _UI.ObjectType.item);
                                        range = that._convertFromCanvasCoordinates(range);

                                        return that._view.waitForValidScrollPosition(range.begin);
                                    }).then(function (begin) {
                                        var direction = (begin < that._lastScrollPosition) ? "left" : "right";
                                        var max = that._viewport[that._scrollLength] - that._getViewportLength();
                                        begin = _ElementUtilities._clamp(begin, 0, max);

                                        return {
                                            position: begin,
                                            direction: direction
                                        };
                                    });
                                }
                            });
                        }, true);
                    }
                },

                /// <field type="Number" integer="true" readonly="true" locid="WinJS.UI.ListView.indexOfLastVisible" helpKeyword="WinJS.UI.ListView.indexOfLastVisible" isAdvanced="true">
                /// Gets the index of the last visible item.
                /// </field>
                indexOfLastVisible: {
                    get: function () {
                        return this._view.lastIndexDisplayed;
                    }
                },

                /// <field type="Object" locid="WinJS.UI.ListView.currentItem" helpKeyword="WinJS.UI.ListView.currentItem" isAdvanced="true">
                /// Gets or sets an object that indicates which item should get keyboard focus and its focus status.
                /// The object has these properties:
                /// index: the index of the item in the itemDataSource.
                /// key: the key of the item in the itemDataSource.
                /// hasFocus: when getting this property, this value is true if the item already has focus; otherwise, it's false.
                /// When setting this property, set this value to true if the item should get focus immediately; otherwise, set it to
                /// false and the item will get focus eventually.
                /// showFocus: true if the item displays the focus rectangle; otherwise, false.
                /// </field>
                currentItem: {
                    get: function () {
                        var focused = this._selection._getFocused();
                        var retVal = {
                            index: focused.index,
                            type: focused.type,
                            key: null,
                            hasFocus: !!this._hasKeyboardFocus,
                            showFocus: false
                        };
                        if (focused.type === _UI.ObjectType.groupHeader) {
                            var group = this._groups.group(focused.index);
                            if (group) {
                                retVal.key = group.key;
                                retVal.showFocus = !!(group.header && _ElementUtilities.hasClass(group.header, _Constants._itemFocusClass));
                            }
                        } else {
                            var item = this._view.items.itemAt(focused.index);
                            if (item) {
                                var record = this._itemsManager._recordFromElement(item);
                                retVal.key = record.item && record.item.key;
                                retVal.showFocus = !!item.parentNode.querySelector("." + _Constants._itemFocusOutlineClass);
                            }
                        }
                        return retVal;
                    },

                    set: function (data) {
                        this._hasKeyboardFocus = data.hasFocus || this._hasKeyboardFocus;
                        var that = this;
                        function setItemFocused(item, isInTree, entity) {
                            var drawKeyboardFocus = !!data.showFocus && that._hasKeyboardFocus;
                            that._unsetFocusOnItem(isInTree);
                            that._selection._setFocused(entity, drawKeyboardFocus);
                            if (that._hasKeyboardFocus) {
                                that._keyboardFocusInbound = drawKeyboardFocus;
                                that._setFocusOnItem(entity);
                            } else {
                                that._tabManager.childFocus = (isInTree ? item : null);
                            }
                            if (entity.type !== _UI.ObjectType.groupHeader) {
                                that._updateFocusCache(entity.index);
                                if (that._updater) {
                                    that._updater.newSelectionPivot = entity.index;
                                    that._updater.oldSelectionPivot = -1;
                                }
                                that._selection._pivot = entity.index;
                            }
                        }

                        if (data.key &&
                            ((data.type !== _UI.ObjectType.groupHeader && this._dataSource.itemFromKey) ||
                            (data.type === _UI.ObjectType.groupHeader && this._groupDataSource && this._groupDataSource.itemFromKey))) {
                            if (this.oldCurrentItemKeyFetch) {
                                this.oldCurrentItemKeyFetch.cancel();
                            }
                            var dataSource = (data.type === _UI.ObjectType.groupHeader ? this._groupDataSource : this._dataSource);
                            this.oldCurrentItemKeyFetch = dataSource.itemFromKey(data.key).then(function (item) {
                                that.oldCurrentItemKeyFetch = null;
                                if (item) {
                                    var element = (data.type === _UI.ObjectType.groupHeader ? that._groups.group(item.index).header : that._view.items.itemAt(item.index));
                                    setItemFocused(element, !!element, { type: data.type || _UI.ObjectType.item, index: item.index });
                                }
                            });
                        } else {
                            if (data.index !== undefined) {
                                var element;
                                if (data.type === _UI.ObjectType.groupHeader) {
                                    var group = that._groups.group(data.index);
                                    element = group && group.header;
                                } else {
                                    element = that._view.items.itemAt(data.index);
                                }
                                setItemFocused(element, !!element, { type: data.type || _UI.ObjectType.item, index: data.index });
                            }
                        }
                    }
                },

                /// <field type="Object" locid="WinJS.UI.ListView.zoomableView" helpKeyword="WinJS.UI.ListView.zoomableView" isAdvanced="true">
                /// Gets a ZoomableView. This API supports the SemanticZoom infrastructure
                /// and is not intended to be used directly from your code.
                /// </field>
                zoomableView: {
                    get: function () {
                        if (!this._zoomableView) {
                            this._zoomableView = new ZoomableView(this);
                        }

                        return this._zoomableView;
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.ListView.itemsDraggable" helpKeyword="WinJS.UI.ListView.itemsDraggable">
                /// Gets or sets whether the ListView's items can be dragged via drag and drop.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                itemsDraggable: {
                    get: function () {
                        return this._dragSource;
                    },

                    set: function (value) {
                        if (_BaseUtils.isPhone) {
                            return;
                        }
                        if (this._dragSource !== value) {
                            this._dragSource = value;
                            this._setSwipeClass();
                        }
                    }
                },

                /// <field type="Boolean" locid="WinJS.UI.ListView.itemsReorderable" helpKeyword="WinJS.UI.ListView.itemsReorderable">
                /// Gets or sets whether the ListView's items can be reordered within itself via drag and drop. When a ListView is marked as reorderable, its items can be dragged about inside itself, but it will not require the itemdrag events it fires to be handled.
                /// <compatibleWith platform="Windows" minVersion="8.1"/>
                /// </field>
                itemsReorderable: {
                    get: function () {
                        return this._reorderable;
                    },

                    set: function (value) {
                        if (_BaseUtils.isPhone) {
                            return;
                        }
                        if (this._reorderable !== value) {
                            this._reorderable = value;
                            this._setSwipeClass();
                        }
                    }
                },

                /// <field type="Number" integer="true" locid="WinJS.UI.ListView.maxDeferredItemCleanup" helpKeyword="WinJS.UI.ListView.maxDeferredItemCleanup" isAdvanced="true">
                /// Gets or sets the maximum number of realized items.
                /// </field>
                maxDeferredItemCleanup: {
                    get: function () {
                        return this._maxDeferredItemCleanup;
                    },

                    set: function (value) {
                        this._maxDeferredItemCleanup = Math.max(0, +value || 0);
                    }
                },

                // Public methods

                dispose: function () {
                    /// <signature helpKeyword="WinJS.UI.ListView.dispose">
                    /// <summary locid="WinJS.UI.ListView.dispose">
                    /// Disposes this ListView.
                    /// </summary>
                    /// </signature>
                    this._dispose();
                },

                elementFromIndex: function (itemIndex) {
                    /// <signature helpKeyword="WinJS.UI.ListView.elementFromIndex">
                    /// <summary locid="WinJS.UI.ListView.elementFromIndex">
                    /// Returns the DOM element that represents the item at the specified index.
                    /// </summary>
                    /// <param name="itemIndex" type="Number" integer="true" locid="WinJS.UI.ListView.elementFromIndex_p:itemIndex">
                    /// The index of the item.
                    /// </param>
                    /// <returns type="Object" domElement="true" locid="WinJS.UI.ListView.elementFromIndex_returnValue">
                    /// The DOM element that represents the specified item.
                    /// </returns>
                    /// </signature>

                    return this._view.items.itemAt(itemIndex);
                },

                indexOfElement: function (element) {
                    /// <signature helpKeyword="WinJS.UI.ListView.indexOfElement">
                    /// <summary locid="WinJS.UI.ListView.indexOfElement">
                    /// Returns the index of the item that the specified DOM element displays.
                    /// </summary>
                    /// <param name="element" type="HTMLElement" domElement="true" locid="WinJS.UI.ListView.indexOfElement_p:element">
                    /// The DOM element that displays the item.
                    /// </param>
                    /// <returns type="Number" integer="true" locid="WinJS.UI.ListView.indexOfElement_returnValue">
                    /// The index of item that the specified DOM element displays.
                    /// </returns>
                    /// </signature>

                    return this._view.items.index(element);
                },

                ensureVisible: function ListView_ensureVisible(value) {
                    /// <signature helpKeyword="WinJS.UI.ListView.ensureVisible">
                    /// <summary locid="WinJS.UI.ListView.ensureVisible">
                    /// Makes the specified item visible. The ListView scrolls to the item if needed.
                    /// </summary>
                    /// <param name="value" type="Number|IListViewEntity" integer="true" locid="WinJS.UI.ListView.ensureVisible_p:value">
                    /// The index of the ListView item or IListViewEntity to bring into view.
                    /// </param>
                    /// </signature>
                    var type = _UI.ObjectType.item,
                        itemIndex = value;
                    if (+value !== value) {
                        type = value.type;
                        itemIndex = value.index;
                    }
                    this._writeProfilerMark("ensureVisible(" + type + ": " + itemIndex + "),info");

                    if (itemIndex < 0) {
                        return;
                    }

                    this._raiseViewLoading(true);

                    var that = this;
                    this._batchViewUpdates(_Constants._ViewChange.realize, _Constants._ScrollToPriority.high, function () {
                        var range;

                        return that._entityInRange({ type: type, index: itemIndex }).then(function (validated) {
                            if (!validated.inRange) {
                                return {
                                    position: 0,
                                    direction: "left"
                                };
                            } else {
                                return that._getItemOffset({ type: type, index: validated.index }).then(function (r) {
                                    range = r;
                                    return that._ensureFirstColumnRange(type);
                                }).then(function () {
                                    range = that._correctRangeInFirstColumn(range, type);

                                    var viewportLength = that._getViewportLength(),
                                        left = that._viewportScrollPosition,
                                        right = left + viewportLength,
                                        newPosition = that._viewportScrollPosition,
                                        entityWidth = range.end - range.begin;

                                    range = that._convertFromCanvasCoordinates(range);

                                    var handled = false;
                                    if (type === _UI.ObjectType.groupHeader && left <= range.begin) {
                                        // EnsureVisible on a group where the entire header is fully visible does not
                                        // scroll. This prevents tabbing from an item in a very large group to align
                                        // the scroll to the header element.
                                        var header = that._groups.group(validated.index).header;
                                        if (header) {
                                            var headerEnd;
                                            var margins = _Layouts._getMargins(header);
                                            if (that._horizontalLayout) {
                                                var rtl = that._rtl();
                                                var headerStart = (rtl ? getOffsetRight(header) - margins.right : header.offsetLeft - margins.left);
                                                headerEnd = headerStart + header.offsetWidth + (rtl ? margins.left : margins.right);
                                            } else {
                                                headerEnd = header.offsetTop + header.offsetHeight + margins.top;
                                            }
                                            handled = headerEnd <= right;
                                        }
                                    }
                                    if (!handled) {
                                        if (entityWidth >= right - left) {
                                            // This item is larger than the viewport so we will just set
                                            // the scroll position to the beginning of the item.
                                            newPosition = range.begin;
                                        } else {
                                            if (range.begin < left) {
                                                newPosition = range.begin;
                                            } else if (range.end > right) {
                                                newPosition = range.end - viewportLength;
                                            }
                                        }
                                    }

                                    var direction = (newPosition < that._lastScrollPosition) ? "left" : "right";
                                    var max = that._viewport[that._scrollLength] - viewportLength;
                                    newPosition = _ElementUtilities._clamp(newPosition, 0, max);

                                    return {
                                        position: newPosition,
                                        direction: direction
                                    };
                                });
                            }
                        });
                    }, true);
                },

                loadMorePages: function ListView_loadMorePages() {
                    /// <signature helpKeyword="WinJS.UI.ListView.loadMorePages">
                    /// <summary locid="WinJS.UI.ListView.loadMorePages">
                    /// Loads the next set of pages if the ListView object's loadingBehavior is set to incremental.
                    /// <deprecated type="deprecate">
                    /// loadMorePages is deprecated. Invoking this function will not have any effect. Please refer to the 'ListView loading behaviors' SDK Sample for guidance on how to implement incremental load behavior.
                    /// </deprecated>
                    /// </summary>
                    /// </signature>
                    _ElementUtilities._deprecated(_ErrorMessages.loadMorePagesIsDeprecated);
                },

                recalculateItemPosition: function ListView_recalculateItemPosition() {
                    /// <signature helpKeyword="WinJS.UI.ListView.recalculateItemPosition">
                    /// <summary locid="WinJS.UI.ListView.recalculateItemPosition">
                    /// Repositions all the visible items in the ListView to adjust for items whose sizes have changed. Use this function or forceLayout when making the ListView visible again after you set its style.display property to "none" or after style changes have been made that affect the size or position of the ListView or its items. Unlike forceLayout, this method doesn’t recreate items and it doesn’t display entrance animation.
                    /// </summary>
                    /// </signature>
                    this._writeProfilerMark("recalculateItemPosition,info");
                    this._forceLayoutImpl(_Constants._ViewChange.relayout);
                },

                forceLayout: function ListView_forceLayout() {
                    /// <signature helpKeyword="WinJS.UI.ListView.forceLayout">
                    /// <summary locid="WinJS.UI.ListView.forceLayout">
                    /// Forces the ListView to update its layout. Use this function or relcaculateItemPosition when making the ListView visible again after you set its style.display property to "none” or after style changes have been made that affect the size or position of the ListView or its items.
                    /// after you set its style.display property to "none".
                    /// </summary>
                    /// </signature>
                    this._writeProfilerMark("forceLayout,info");
                    this._forceLayoutImpl(_Constants._ViewChange.remeasure);
                },

                _entityInRange: function ListView_entityInRange(entity) {
                    if (entity.type === _UI.ObjectType.item) {
                        return this._itemsCount().then(function (itemsCount) {
                            var index = _ElementUtilities._clamp(entity.index, 0, itemsCount - 1);
                            return {
                                inRange: index >= 0 && index < itemsCount,
                                index: index
                            };
                        });
                    } else {
                        var index = _ElementUtilities._clamp(entity.index, 0, this._groups.length() - 1);
                        return Promise.wrap({
                            inRange: index >= 0 && index < this._groups.length(),
                            index: index
                        });
                    }
                },

                _forceLayoutImpl: function ListView_forceLayoutImpl(viewChange) {
                    var that = this;
                    this._versionManager.unlocked.then(function () {
                        that._writeProfilerMark("_forceLayoutImpl viewChange(" + viewChange + "),info");

                        that._cancelAsyncViewWork();
                        that._pendingLayoutReset = true;
                        that._resizeViewport();

                        that._batchViewUpdates(viewChange, _Constants._ScrollToPriority.low, function () {
                            return {
                                position: that._lastScrollPosition,
                                direction: "right"
                            };
                        }, true, true);
                    });
                },

                _configureSelectionMode: function () {
                    if (_BaseUtils.isPhone) {
                        if (this.tapBehavior === _UI.TapBehavior.toggleSelect && this.selectionMode === _UI.SelectionMode.multi) {
                            _ElementUtilities.addClass(this._canvas, _Constants._selectionModeClass);
                        } else {
                            _ElementUtilities.removeClass(this._canvas, _Constants._selectionModeClass);
                        }
                    }
                },

                _lastScrollPosition: {
                    get: function () {
                        return this._lastScrollPositionValue;
                    },
                    set: function (position) {
                        if (position === 0) {
                            this._lastDirection = "right";
                            this._direction  = "right";
                            this._lastScrollPositionValue = 0;
                        } else {
                            var currentDirection = position < this._lastScrollPositionValue ? "left" : "right";
                            this._direction = this._scrollDirection(position);
                            this._lastDirection = currentDirection;
                            this._lastScrollPositionValue = position;
                        }
                    }
                },

                _supportsGroupHeaderKeyboarding: {
                    get: function () {
                        return this._groupDataSource;
                    }
                },

                _viewportScrollPosition: {
                    get: function () {
                        this._currentScrollPosition = _ElementUtilities.getScrollPosition(this._viewport)[this._scrollProperty];
                        return this._currentScrollPosition;
                    },
                    set: function (value) {
                        var newScrollPos = {};
                        newScrollPos[this._scrollProperty] = value;
                        _ElementUtilities.setScrollPosition(this._viewport, newScrollPos);
                        this._currentScrollPosition = value;
                    }
                },

                _canvasStart: {
                    get: function () {
                        return this._canvasStartValue || 0;
                    },
                    set: function (value) {
                        var transformX = this._horizontal() ? (this._rtl() ? -value : value) : 0,
                            transformY = this._horizontal() ? 0 : value;
                        if (value !== 0) {
                            this._canvas.style[transformNames.scriptName] = "translate( " + transformX + "px, " + transformY + "px)";
                        } else {
                            this._canvas.style[transformNames.scriptName] = "";
                        }
                        this._canvasStartValue = value;
                    }
                },

                /// <field type="Number" integer="true" locid="WinJS.UI.ListView.scrollPosition" helpKeyword="WinJS.UI.ListView.scrollPosition">
                /// Gets or sets the position of the ListView's scrollbar.
                /// </field>
                scrollPosition: {
                    get: function () {
                        return this._viewportScrollPosition;
                    },
                    set: function (newPosition) {
                        var that = this;
                        this._batchViewUpdates(_Constants._ViewChange.realize, _Constants._ScrollToPriority.high, function () {
                            return that._view.waitForValidScrollPosition(newPosition).then(function () {
                                var max = that._viewport[that._scrollLength] - that._getViewportLength();
                                newPosition = _ElementUtilities._clamp(newPosition, 0, max);
                                var direction = (newPosition < that._lastScrollPosition) ? "left" : "right";
                                return {
                                    position: newPosition,
                                    direction: direction
                                };
                            });
                        }, true);
                    }
                },

                _setRenderer: function ListView_setRenderer(newRenderer, isGroupHeaderRenderer) {
                    var renderer;
                    if (!newRenderer) {
                        if (_BaseUtils.validation) {
                            throw new _ErrorFromName("WinJS.UI.ListView.invalidTemplate", _ErrorMessages.invalidTemplate);
                        }
                        renderer = _ItemsManager.trivialHtmlRenderer;
                    } else if (typeof newRenderer === "function") {
                        renderer = newRenderer;
                    } else if (typeof newRenderer === "object") {
                        if (_BaseUtils.validation && !newRenderer.renderItem) {
                            throw new _ErrorFromName("WinJS.UI.ListView.invalidTemplate", _ErrorMessages.invalidTemplate);
                        }
                        renderer = newRenderer.renderItem;
                    }

                    if (renderer) {
                        if (isGroupHeaderRenderer) {
                            this._groupHeaderRenderer = renderer;
                        } else {
                            this._itemRenderer = renderer;
                        }
                    }
                },

                _renderWithoutReuse: function ListView_renderWithoutReuse(itemPromise, oldElement) {
                    if (oldElement) {
                        _Dispose._disposeElement(oldElement);
                    }
                    var templateResult = this._itemRenderer(itemPromise);
                    if (templateResult.then) {
                        return templateResult.then(function (element) {
                            element.tabIndex = 0;
                            return element;
                        });
                    } else {
                        var element = templateResult.element || templateResult;
                        element.tabIndex = 0;
                        return templateResult;
                    }
                },

                _isInsertedItem: function ListView_isInsertedItem(itemPromise) {
                    return !!this._insertedItems[itemPromise.handle];
                },

                _clearInsertedItems: function ListView_clearInsertedItems() {
                    var keys = Object.keys(this._insertedItems);
                    for (var i = 0, len = keys.length; i < len; i++) {
                        this._insertedItems[keys[i]].release();
                    }
                    this._insertedItems = {};
                    this._modifiedElements = [];
                    this._countDifference = 0;
                },

                // Private methods
                _cancelAsyncViewWork: function (stopTreeCreation) {
                    this._view.stopWork(stopTreeCreation);
                },

                _updateView: function ListView_updateView() {
                    if (this._isZombie()) { return; }

                    var that = this;
                    function resetCache() {
                        that._itemsBlockExtent = -1;
                        that._firstItemRange = null;
                        that._firstHeaderRange = null;
                        that._itemMargins = null;
                        that._headerMargins = null;
                        that._canvasMargins = null;
                        that._cachedRTL = null;
                        // Retrieve the values before DOM modifications occur
                        that._rtl();
                    }

                    var viewChange = this._viewChange;
                    this._viewChange = _Constants._ViewChange.realize;

                    function functorWrapper() {
                        that._scrollToPriority = _Constants._ScrollToPriority.uninitialized;
                        var setScrollbarPosition = that._setScrollbarPosition;
                        that._setScrollbarPosition = false;

                        var position = typeof that._scrollToFunctor === "number" ? { position: that._scrollToFunctor } : that._scrollToFunctor();
                        return Promise.as(position).then(
                            function (scroll) {
                                scroll = scroll || {};
                                if (setScrollbarPosition && +scroll.position === scroll.position) {
                                    that._lastScrollPosition = scroll.position;
                                    that._viewportScrollPosition = scroll.position;
                                }
                                return scroll;
                            },
                            function (error) {
                                that._setScrollbarPosition |= setScrollbarPosition;
                                return Promise.wrapError(error);
                            }
                        );
                    }

                    if (viewChange === _Constants._ViewChange.rebuild) {
                        if (this._pendingGroupWork) {
                            this._updateGroupWork();
                        }
                        if (this._pendingLayoutReset) {
                            this._resetLayout();
                        }
                        resetCache();
                        if (!this._firstTimeDisplayed) {
                            this._view.reset();
                        }
                        this._view.reload(functorWrapper, true);
                        this._setFocusOnItem(this._selection._getFocused());
                    } else if (viewChange === _Constants._ViewChange.remeasure) {
                        this._view.resetItems(true);
                        this._resetLayout();
                        resetCache();
                        this._view.refresh(functorWrapper);
                        this._setFocusOnItem(this._selection._getFocused());
                    } else if (viewChange === _Constants._ViewChange.relayout) {
                        if (this._pendingLayoutReset) {
                            this._resetLayout();
                            resetCache();
                        }
                        this._view.refresh(functorWrapper);
                    } else {
                        this._view.onScroll(functorWrapper);
                    }
                },

                _batchViewUpdates: function ListView_batchViewUpdates(viewChange, scrollToPriority, positionFunctor, setScrollbarPosition, skipFadeout) {
                    this._viewChange = Math.min(this._viewChange, viewChange);

                    if (this._scrollToFunctor === null || scrollToPriority >= this._scrollToPriority) {
                        this._scrollToPriority = scrollToPriority;
                        this._scrollToFunctor = positionFunctor;
                    }

                    this._setScrollbarPosition |= !!setScrollbarPosition;

                    if (!this._batchingViewUpdates) {
                        this._raiseViewLoading();

                        var that = this;
                        this._batchingViewUpdatesSignal = new _Signal();
                        this._batchingViewUpdates = Promise.any([this._batchingViewUpdatesSignal.promise, Scheduler.schedulePromiseHigh(null, "WinJS.UI.ListView._updateView")]).then(function () {
                            if (that._isZombie()) { return; }

                            // If we're displaying for the first time, or there were no items visible in the view, we can skip the fade out animation
                            // and go straight to the refresh. _view.items._itemData.length is the most trustworthy way to find how many items are visible.
                            if (that._viewChange === _Constants._ViewChange.rebuild && !that._firstTimeDisplayed && Object.keys(that._view.items._itemData).length !== 0 && !skipFadeout) {
                                return that._fadeOutViewport();
                            }
                        }).then(
                            function () {
                                that._batchingViewUpdates = null;
                                that._batchingViewUpdatesSignal = null;
                                that._updateView();
                                that._firstTimeDisplayed = false;
                            },
                            function () {
                                that._batchingViewUpdates = null;
                                that._batchingViewUpdatesSignal = null;
                            }
                        );
                    }

                    return this._batchingViewUpdatesSignal;
                },

                _resetCanvas: function () {
                    if (this._disposed) {
                        return;
                    }

                    // Layouts do not currently support saving the scroll position when forceLayout() is called.
                    // Layouts need to recreate the canvas because the tabManager is there and you don't want to
                    // construct 2 instances of WinJS.UI.TabContainer for the same element.
                    var newCanvas = _Global.document.createElement('div');
                    newCanvas.className = this._canvas.className;
                    this._viewport.replaceChild(newCanvas, this._canvas);
                    this._canvas = newCanvas;
                    this._groupsToRemove = {};
                    // We reset the itemCanvas on _resetCanvas in case a ListView client uses two separate custom layouts, and each layout
                    // changes different styles on the itemCanvas without resetting it.
                    this._canvas.appendChild(this._canvasProxy);
                },

                _setupInternalTree: function ListView_setupInternalTree() {
                    _ElementUtilities.addClass(this._element, _Constants._listViewClass);
                    _ElementUtilities[this._rtl() ? "addClass" : "removeClass"](this._element, _Constants._rtlListViewClass);

                    this._element.innerHTML =
                        '<div tabIndex="-1" role="group" class="' + _Constants._viewportClass + ' ' + _Constants._horizontalClass + '">' +
                            '<div class="' + _Constants._scrollableClass + '">' +
                                // Create a proxy element inside the canvas so that during an MSPointerDown event we can call
                                // msSetPointerCapture on it. This allows hover to not be passed to it which saves a large invalidation.
                                '<div class="' + _Constants._proxyClass + '"></div>' +
                            '</div>' +
                            '<div></div>' +
                        '</div>' +
                        // The keyboard event helper is a dummy node that allows us to keep getting keyboard events when a virtualized element
                        // gets discarded. It has to be positioned in the center of the viewport, though, otherwise calling .focus() on it
                        // can move our viewport around when we don't want it moved.
                        // The keyboard event helper element will be skipped in the tab order if it doesn't have width+height set on it.
                       '<div aria-hidden="true" style="position:absolute;left:50%;top:50%;width:0px;height:0px;" tabindex="-1"></div>';

                    this._viewport = this._element.firstElementChild;
                    this._canvas = this._viewport.firstElementChild;
                    this._canvasProxy = this._canvas.firstElementChild;
                    // The deleteWrapper div is used to maintain the scroll width (after delete(s)) until the animation is done
                    this._deleteWrapper = this._canvas.nextElementSibling;
                    this._keyboardEventsHelper = this._viewport.nextElementSibling;
                    this._tabIndex = _ElementUtilities.getTabIndex(this._element);
                    if (this._tabIndex < 0) {
                        this._tabIndex = 0;
                    }
                    this._tabManager = new _TabContainer.TabContainer(this._viewport);
                    this._tabManager.tabIndex = this._tabIndex;

                    this._progressBar = _Global.document.createElement("progress");
                    _ElementUtilities.addClass(this._progressBar, _Constants._progressClass);
                    this._progressBar.style.position = "absolute";
                    this._progressBar.max = 100;
                },

                _unsetFocusOnItem: function ListView_unsetFocusOnItem(newFocusExists) {
                    if (this._tabManager.childFocus) {
                        this._clearFocusRectangle(this._tabManager.childFocus);
                    }
                    if (this._isZombie()) {
                        return;
                    }
                    if (!newFocusExists) {
                        // _setFocusOnItem may run asynchronously so prepare the keyboardEventsHelper
                        // to receive focus.
                        if (this._tabManager.childFocus) {
                            this._tabManager.childFocus = null;
                        }

                        this._keyboardEventsHelper._shouldHaveFocus = false;
                        // If the viewport has focus, leave it there. This will prevent focus from jumping
                        // from the viewport to the keyboardEventsHelper when scrolling with Narrator Touch.
                        if (_Global.document.activeElement !== this._viewport && this._hasKeyboardFocus) {
                            this._keyboardEventsHelper._shouldHaveFocus = true;
                            _ElementUtilities._setActive(this._keyboardEventsHelper);
                        }
                    }
                    this._itemFocused = false;
                },

                _setFocusOnItem: function ListView_setFocusOnItem(entity) {
                    this._writeProfilerMark("_setFocusOnItem,info");
                    if (this._focusRequest) {
                        this._focusRequest.cancel();
                    }
                    if (this._isZombie()) {
                        return;
                    }
                    var that = this;
                    var setFocusOnItemImpl = function (item) {
                        if (that._isZombie()) {
                            return;
                        }

                        if (that._tabManager.childFocus !== item) {
                            that._tabManager.childFocus = item;
                        }
                        that._focusRequest = null;
                        if (that._hasKeyboardFocus && !that._itemFocused) {
                            if (that._selection._keyboardFocused()) {
                                that._drawFocusRectangle(item);
                            }
                            // The requestItem promise just completed so _cachedCount will
                            // be initialized.
                            that._view.updateAriaForAnnouncement(item, (entity.type === _UI.ObjectType.groupHeader ? that._groups.length() : that._cachedCount));

                            // Some consumers of ListView listen for item invoked events and hide the listview when an item is clicked.
                            // Since keyboard interactions rely on async operations, sometimes an invoke event can be received before we get
                            // to WinJS.Utilities._setActive(item), and the listview will be made invisible. If that happens and we call item.setActive(), an exception
                            // is raised for trying to focus on an invisible item. Checking visibility is non-trivial, so it's best
                            // just to catch the exception and ignore it.
                            that._itemFocused = true;
                            _ElementUtilities._setActive(item);
                        }
                    };

                    if (entity.type !== _UI.ObjectType.groupHeader) {
                        this._focusRequest = this._view.items.requestItem(entity.index);
                    } else {
                        this._focusRequest = this._groups.requestHeader(entity.index);
                    }
                    this._focusRequest.then(setFocusOnItemImpl);
                },

                _attachEvents: function ListView_attachEvents() {
                    var that = this;

                    function listViewHandler(eventName, caseSensitive, capture) {
                        return {
                            name: (caseSensitive ? eventName : eventName.toLowerCase()),
                            handler: function (eventObject) {
                                that["_on" + eventName](eventObject);
                            },
                            capture: capture
                        };
                    }

                    function modeHandler(eventName, caseSensitive, capture) {
                        return {
                            capture: capture,
                            name: (caseSensitive ? eventName : eventName.toLowerCase()),
                            handler: function (eventObject) {
                                var currentMode = that._mode,
                                    name = "on" + eventName;
                                if (!that._disposed && currentMode[name]) {
                                    currentMode[name](eventObject);
                                }
                            }
                        };
                    }

                    function observerHandler(handlerName, attributesFilter) {
                        return {
                            handler: function (listOfChanges) {
                                that["_on" + handlerName](listOfChanges);
                            },
                            filter: attributesFilter
                        };
                    }

                    // Observers for specific element attribute changes
                    var elementObservers = [
                        observerHandler("PropertyChange", ["dir", "style", "tabindex"])
                    ];
                    this._cachedStyleDir = this._element.style.direction;

                    elementObservers.forEach(function (elementObserver) {
                        new _ElementUtilities._MutationObserver(elementObserver.handler).observe(that._element, { attributes: true, attributeFilter: elementObserver.filter });
                    });

                    // KeyDown handler needs to be added explicitly via addEventListener instead of using attachEvent.
                    // If it's not added via addEventListener, the eventObject given to us on event does not have the functions stopPropagation() and preventDefault().
                    var events = [
                        modeHandler("PointerDown"),
                        modeHandler("click", false),
                        modeHandler("PointerUp"),
                        modeHandler("LostPointerCapture"),
                        modeHandler("MSHoldVisual", true),
                        modeHandler("PointerCancel", true),
                        modeHandler("DragStart"),
                        modeHandler("DragOver"),
                        modeHandler("DragEnter"),
                        modeHandler("DragLeave"),
                        modeHandler("Drop"),
                        modeHandler("ContextMenu"),
                        modeHandler("MSManipulationStateChanged", true, true)
                    ];
                    events.forEach(function (eventHandler) {
                        _ElementUtilities._addEventListener(that._viewport, eventHandler.name, eventHandler.handler, !!eventHandler.capture);
                    });

                    var elementEvents = [
                        listViewHandler("FocusIn", false, false),
                        listViewHandler("FocusOut", false, false),
                        modeHandler("KeyDown"),
                        modeHandler("KeyUp"),
                        listViewHandler("MSElementResize", false, false)
                    ];
                    elementEvents.forEach(function (eventHandler) {
                        _ElementUtilities._addEventListener(that._element, eventHandler.name, eventHandler.handler, !!eventHandler.capture);
                    });
                    this._onMSElementResizeBound = this._onMSElementResize.bind(this);
                    _ElementUtilities._resizeNotifier.subscribe(this._element, this._onMSElementResizeBound);

                    var viewportEvents = [
                        listViewHandler("MSManipulationStateChanged", true),
                        listViewHandler("Scroll")
                    ];
                    viewportEvents.forEach(function (viewportEvent) {
                        that._viewport.addEventListener(viewportEvent.name, viewportEvent.handler, false);
                    });
                    this._viewport.addEventListener("onTabEnter", this._onTabEnter.bind(this));
                    this._viewport.addEventListener("onTabExit", this._onTabExit.bind(this));
                    this._viewport.addEventListener("onTabEntered", function (e) {
                        that._mode.onTabEntered(e);
                    });
                    this._viewport.addEventListener("onTabExiting", function (e) {
                        that._mode.onTabExiting(e);
                    });
                },

                _updateItemsManager: function ListView_updateItemsManager() {
                    var that = this,
                        notificationHandler = {
                            // Following methods are used by ItemsManager
                            beginNotifications: function ListView_beginNotifications() {
                            },

                            changed: function ListView_changed(newItem, oldItem) {
                                if (that._ifZombieDispose()) { return; }

                                that._createUpdater();

                                var elementInfo = that._updater.elements[uniqueID(oldItem)];
                                if (elementInfo) {
                                    var selected = that.selection._isIncluded(elementInfo.index);
                                    if (selected) {
                                        that._updater.updateDrag = true;
                                    }

                                    if (oldItem !== newItem) {
                                        if (that._tabManager.childFocus === oldItem || that._updater.newFocusedItem === oldItem) {
                                            that._updater.newFocusedItem = newItem;
                                            that._tabManager.childFocus = null;
                                        }

                                        if (elementInfo.itemBox) {
                                            _ElementUtilities.addClass(newItem, _Constants._itemClass);
                                            that._setupAriaSelectionObserver(newItem);

                                            var next = oldItem.nextElementSibling;
                                            elementInfo.itemBox.removeChild(oldItem);
                                            elementInfo.itemBox.insertBefore(newItem, next);
                                        }

                                        that._setAriaSelected(newItem, selected);
                                        that._view.items.setItemAt(elementInfo.newIndex, {
                                            element: newItem,
                                            itemBox: elementInfo.itemBox,
                                            container: elementInfo.container,
                                            itemsManagerRecord: elementInfo.itemsManagerRecord
                                        });
                                        delete that._updater.elements[uniqueID(oldItem)];
                                        _Dispose._disposeElement(oldItem);
                                        that._updater.elements[uniqueID(newItem)] = {
                                            item: newItem,
                                            container: elementInfo.container,
                                            itemBox: elementInfo.itemBox,
                                            index: elementInfo.index,
                                            newIndex: elementInfo.newIndex,
                                            itemsManagerRecord: elementInfo.itemsManagerRecord
                                        };
                                    } else if (elementInfo.itemBox && elementInfo.container) {
                                        _ItemEventsHandler._ItemEventsHandler.renderSelection(elementInfo.itemBox, newItem, selected, true);
                                        _ElementUtilities[selected ? "addClass" : "removeClass"](elementInfo.container, _Constants._selectedClass);
                                    }
                                    that._updater.changed = true;
                                }
                                for (var i = 0, len = that._notificationHandlers.length; i < len; i++) {
                                    that._notificationHandlers[i].changed(newItem, oldItem);
                                }
                                that._writeProfilerMark("changed,info");
                            },

                            removed: function ListView_removed(item, mirage, handle) {
                                if (that._ifZombieDispose()) { return; }

                                that._createUpdater();

                                function removeFromSelection(index) {
                                    that._updater.updateDrag = true;
                                    if (that._currentMode()._dragging && that._currentMode()._draggingUnselectedItem && that._currentMode()._dragInfo._isIncluded(index)) {
                                        that._updater.newDragInfo = new _SelectionManager._Selection(that, []);
                                    }

                                    var firstRange = that._updater.selectionFirst[index],
                                        lastRange = that._updater.selectionLast[index],
                                        range = firstRange || lastRange;

                                    if (range) {
                                        delete that._updater.selectionFirst[range.oldFirstIndex];
                                        delete that._updater.selectionLast[range.oldLastIndex];
                                        that._updater.selectionChanged = true;
                                    }
                                }

                                var insertedItem = that._insertedItems[handle];
                                if (insertedItem) {
                                    delete that._insertedItems[handle];
                                }

                                var index;
                                if (item) {
                                    var elementInfo = that._updater.elements[uniqueID(item)],
                                        itemObject = that._itemsManager.itemObject(item);

                                    if (itemObject) {
                                        that._groupFocusCache.deleteItem(itemObject.key);
                                    }

                                    if (elementInfo) {
                                        index = elementInfo.index;

                                        // We track removed elements for animation purposes (layout
                                        // component consumes this).
                                        //
                                        if (elementInfo.itemBox) {
                                            that._updater.removed.push({
                                                index: index,
                                                itemBox: elementInfo.itemBox
                                            });
                                        }
                                        that._updater.deletesCount++;

                                        // The view can't access the data from the itemsManager
                                        // anymore, so we need to flag the itemData that it
                                        // has been removed.
                                        //
                                        var itemData = that._view.items.itemDataAt(index);
                                        itemData.removed = true;

                                        delete that._updater.elements[uniqueID(item)];
                                    } else {
                                        index = itemObject && itemObject.index;
                                    }

                                    if (that._updater.oldFocus.type !== _UI.ObjectType.groupHeader && that._updater.oldFocus.index === index) {
                                        that._updater.newFocus.index = index; // If index is too high, it'll be fixed in endNotifications
                                        that._updater.focusedItemRemoved = true;
                                    }

                                    removeFromSelection(index);
                                } else {
                                    index = that._updater.selectionHandles[handle];
                                    if (index === +index) {
                                        removeFromSelection(index);
                                    }
                                }
                                that._writeProfilerMark("removed(" + index + "),info");

                                that._updater.changed = true;
                            },

                            updateAffectedRange: function ListView_updateAffectedRange(newerRange) {
                                that._itemsCount().then(function (count) {
                                    // When we receive insertion notifications before all of the containers have
                                    // been created and the affected range is beyond the container range, the
                                    // affected range indices will not correspond to the indices of the containers
                                    // created by updateContainers. In this case, start the affected range at the end
                                    // of the containers so that the affected range includes any containers that get
                                    // appended due to this batch of notifications.
                                    var containerCount = that._view.containers ? that._view.containers.length : 0;
                                    newerRange.start = Math.min(newerRange.start, containerCount);

                                    that._affectedRange.add(newerRange, count);
                                });
                                that._createUpdater();
                                that._updater.changed = true;
                            },

                            indexChanged: function ListView_indexChanged(item, newIndex, oldIndex) {
                                // We should receive at most one indexChanged notification per oldIndex
                                // per notification cycle.
                                if (that._ifZombieDispose()) { return; }

                                that._createUpdater();

                                if (item) {
                                    var itemObject = that._itemsManager.itemObject(item);
                                    if (itemObject) {
                                        that._groupFocusCache.updateItemIndex(itemObject.key, newIndex);
                                    }

                                    var elementInfo = that._updater.elements[uniqueID(item)];
                                    if (elementInfo) {
                                        elementInfo.newIndex = newIndex;
                                        that._updater.changed = true;
                                    }
                                    that._updater.itemsMoved = true;
                                }
                                if (that._currentMode()._dragging && that._currentMode()._draggingUnselectedItem && that._currentMode()._dragInfo._isIncluded(oldIndex)) {
                                    that._updater.newDragInfo = new _SelectionManager._Selection(that, [{ firstIndex: newIndex, lastIndex: newIndex }]);
                                    that._updater.updateDrag = true;
                                }

                                if (that._updater.oldFocus.type !== _UI.ObjectType.groupHeader && that._updater.oldFocus.index === oldIndex) {
                                    that._updater.newFocus.index = newIndex;
                                    that._updater.changed = true;
                                }

                                if (that._updater.oldSelectionPivot === oldIndex) {
                                    that._updater.newSelectionPivot = newIndex;
                                    that._updater.changed = true;
                                }

                                var range = that._updater.selectionFirst[oldIndex];
                                if (range) {
                                    range.newFirstIndex = newIndex;
                                    that._updater.changed = true;
                                    that._updater.updateDrag = true;
                                }
                                range = that._updater.selectionLast[oldIndex];
                                if (range) {
                                    range.newLastIndex = newIndex;
                                    that._updater.changed = true;
                                    that._updater.updateDrag = true;
                                }
                            },

                            endNotifications: function ListView_endNotifications() {
                                that._update();
                            },

                            inserted: function ListView_inserted(itemPromise) {
                                if (that._ifZombieDispose()) { return; }
                                that._writeProfilerMark("inserted,info");

                                that._createUpdater();
                                that._updater.changed = true;
                                itemPromise.retain();
                                that._updater.insertsCount++;
                                that._insertedItems[itemPromise.handle] = itemPromise;
                            },

                            moved: function ListView_moved(item, previous, next, itemPromise) {
                                if (that._ifZombieDispose()) { return; }

                                that._createUpdater();

                                that._updater.movesCount++;
                                if (item) {
                                    that._updater.itemsMoved = true;

                                    var elementInfo = that._updater.elements[uniqueID(item)];
                                    if (elementInfo) {
                                        elementInfo.moved = true;
                                    }
                                }

                                var index = that._updater.selectionHandles[itemPromise.handle];
                                if (index === +index) {
                                    that._updater.updateDrag = true;

                                    var firstRange = that._updater.selectionFirst[index],
                                        lastRange = that._updater.selectionLast[index],
                                        range = firstRange || lastRange;

                                    if (range && range.oldFirstIndex !== range.oldLastIndex) {
                                        delete that._updater.selectionFirst[range.oldFirstIndex];
                                        delete that._updater.selectionLast[range.oldLastIndex];
                                        that._updater.selectionChanged = true;
                                        that._updater.changed = true;
                                    }
                                }
                                that._writeProfilerMark("moved(" + index + "),info");
                            },

                            countChanged: function ListView_countChanged(newCount, oldCount) {
                                if (that._ifZombieDispose()) { return; }
                                that._writeProfilerMark("countChanged(" + newCount + "),info");

                                that._cachedCount = newCount;
                                that._createUpdater();

                                if ((that._view.lastIndexDisplayed + 1) === oldCount) {
                                    that._updater.changed = true;
                                }

                                that._updater.countDifference += newCount - oldCount;
                            },

                            reload: function ListView_reload() {
                                if (that._ifZombieDispose()) {
                                    return;
                                }
                                that._writeProfilerMark("reload,info");

                                that._processReload();
                            }
                        };

                    function statusChanged(eventObject) {
                        if (eventObject.detail === _UI.DataSourceStatus.failure) {
                            that.itemDataSource = null;
                            that.groupDataSource = null;
                        }
                    }

                    if (this._versionManager) {
                        this._versionManager._dispose();
                    }

                    this._versionManager = new _VersionManager._VersionManager();
                    this._updater = null;

                    var ranges = this._selection.getRanges();
                    this._selection._selected.clear();

                    if (this._itemsManager) {

                        if (this._itemsManager.dataSource && this._itemsManager.dataSource.removeEventListener) {
                            this._itemsManager.dataSource.removeEventListener("statuschanged", statusChanged, false);
                        }

                        this._clearInsertedItems();
                        this._itemsManager.release();
                    }

                    if (this._itemsCountPromise) {
                        this._itemsCountPromise.cancel();
                        this._itemsCountPromise = null;
                    }
                    this._cachedCount = _Constants._UNINITIALIZED;

                    this._itemsManager = _ItemsManager._createItemsManager(
                        this._dataSource,
                        this._renderWithoutReuse.bind(this),
                        notificationHandler,
                        {
                            ownerElement: this._element,
                            versionManager: this._versionManager,
                            indexInView: function (index) {
                                return (index >= that.indexOfFirstVisible && index <= that.indexOfLastVisible);
                            },
                            viewCallsReady: true,
                            profilerId: this._id
                        });

                    if (this._dataSource.addEventListener) {
                        this._dataSource.addEventListener("statuschanged", statusChanged, false);
                    }

                    this._selection._selected.set(ranges);
                },

                _processReload: function () {
                    this._affectedRange.addAll();

                    // Inform scroll view that a realization pass is coming so that it doesn't restart the
                    // realization pass itself.
                    this._cancelAsyncViewWork(true);
                    if (this._currentMode()._dragging) {
                        this._currentMode()._clearDragProperties();
                    }

                    this._groupFocusCache.clear();
                    this._selection._reset();
                    this._updateItemsManager();
                    this._pendingLayoutReset = true;
                    this._batchViewUpdates(_Constants._ViewChange.rebuild, _Constants._ScrollToPriority.low, this.scrollPosition);
                },

                _createUpdater: function ListView_createUpdater() {
                    if (!this._updater) {
                        if (this.itemDataSource._isVirtualizedDataSource) {
                            // VDS doesn't support the _updateAffectedRange notification so assume
                            // that everything needs to be relaid out.
                            this._affectedRange.addAll();
                        }
                        this._versionManager.beginUpdating();

                        // Inform scroll view that a realization pass is coming so that it doesn't restart the
                        // realization pass itself.
                        this._cancelAsyncViewWork();

                        var updater = {
                            changed: false,
                            elements: {},
                            selectionFirst: {},
                            selectionLast: {},
                            selectionHandles: {},
                            oldSelectionPivot: { type: _UI.ObjectType.item, index: _Constants._INVALID_INDEX },
                            newSelectionPivot: { type: _UI.ObjectType.item, index: _Constants._INVALID_INDEX },
                            removed: [],
                            selectionChanged: false,
                            oldFocus: { type: _UI.ObjectType.item, index: _Constants._INVALID_INDEX },
                            newFocus: { type: _UI.ObjectType.item, index: _Constants._INVALID_INDEX },
                            hadKeyboardFocus: this._hasKeyboardFocus,
                            itemsMoved: false,
                            lastVisible: this.indexOfLastVisible,
                            updateDrag: false,
                            movesCount: 0,
                            insertsCount: 0,
                            deletesCount: 0,
                            countDifference: 0
                        };

                        this._view.items.each(function (index, item, itemData) {
                            updater.elements[uniqueID(item)] = {
                                item: item,
                                container: itemData.container,
                                itemBox: itemData.itemBox,
                                index: index,
                                newIndex: index,
                                itemsManagerRecord: itemData.itemsManagerRecord,
                                detached: itemData.detached
                            };
                        });

                        var selection = this._selection._selected._ranges;
                        for (var i = 0, len = selection.length; i < len; i++) {
                            var range = selection[i];
                            var newRange = {
                                newFirstIndex: selection[i].firstIndex,
                                oldFirstIndex: selection[i].firstIndex,
                                newLastIndex: selection[i].lastIndex,
                                oldLastIndex: selection[i].lastIndex
                            };
                            updater.selectionFirst[newRange.oldFirstIndex] = newRange;
                            updater.selectionLast[newRange.oldLastIndex] = newRange;
                            updater.selectionHandles[range.firstPromise.handle] = newRange.oldFirstIndex;
                            updater.selectionHandles[range.lastPromise.handle] = newRange.oldLastIndex;
                        }
                        updater.oldSelectionPivot = this._selection._pivot;
                        updater.newSelectionPivot = updater.oldSelectionPivot;
                        updater.oldFocus = this._selection._getFocused();
                        updater.newFocus = this._selection._getFocused();

                        this._updater = updater;
                    }
                },

                _synchronize: function ListView_synchronize() {
                    var updater = this._updater;
                    this._updater = null;
                    this._groupsChanged = false;

                    this._countDifference = this._countDifference || 0;

                    if (updater && updater.changed) {
                        if (updater.itemsMoved) {
                            this._layout.itemsMoved && this._layout.itemsMoved();
                        }
                        if (updater.removed.length) {
                            this._layout.itemsRemoved && this._layout.itemsRemoved(updater.removed.map(function (node) {
                                return node.itemBox;
                            }));
                        }

                        if (updater.itemsMoved || updater.removed.length || Object.keys(this._insertedItems).length) {
                            this._layout.setupAnimations && this._layout.setupAnimations();
                        }

                        if (this._currentMode().onDataChanged) {
                            this._currentMode().onDataChanged();
                        }

                        var newSelection = [];
                        for (var i in updater.selectionFirst) {
                            if (updater.selectionFirst.hasOwnProperty(i)) {
                                var range = updater.selectionFirst[i];
                                updater.selectionChanged = updater.selectionChanged || ((range.newLastIndex - range.newFirstIndex) !== (range.oldLastIndex - range.oldFirstIndex));
                                if (range.newFirstIndex <= range.newLastIndex) {
                                    newSelection.push({
                                        firstIndex: range.newFirstIndex,
                                        lastIndex: range.newLastIndex
                                    });
                                }
                            }
                        }

                        if (updater.selectionChanged) {
                            var newSelectionItems = new _SelectionManager._Selection(this, newSelection);

                            // We do not allow listeners to cancel the selection
                            // change because the cancellation would also have to
                            // prevent the deletion.
                            this._selection._fireSelectionChanging(newSelectionItems);
                            this._selection._selected.set(newSelection);
                            this._selection._fireSelectionChanged();
                            newSelectionItems.clear();
                        } else {
                            this._selection._selected.set(newSelection);
                        }
                        this._selection._updateCount(this._cachedCount);
                        updater.newSelectionPivot = Math.min(this._cachedCount - 1, updater.newSelectionPivot);
                        this._selection._pivot = (updater.newSelectionPivot >= 0 ? updater.newSelectionPivot : _Constants._INVALID_INDEX);

                        if (updater.newFocus.type !== _UI.ObjectType.groupHeader) {
                            updater.newFocus.index = Math.max(0, Math.min(this._cachedCount - 1, updater.newFocus.index));
                        }
                        this._selection._setFocused(updater.newFocus, this._selection._keyboardFocused());

                        // If there are 2 edits before layoutAnimations runs we need to merge the 2 groups of modified elements.
                        // For example:
                        // If you start with A, B, C and add item Z to the beginning you will have
                        // [ -1 -> 0, 0 -> 1, 1 -> 2, 2 -> 3]
                        // However before layout is called an insert of Y to the beginning also happens you should get
                        // [ -1 -> 0, -1 -> 1, 0 -> 2, 1 -> 3, 2 -> 4]
                        var previousModifiedElements = this._modifiedElements || [];
                        var previousModifiedElementsHash = {};
                        this._modifiedElements = [];
                        this._countDifference += updater.countDifference;

                        for (i = 0; i < previousModifiedElements.length; i++) {
                            var modifiedElement = previousModifiedElements[i];
                            if (modifiedElement.newIndex === -1) {
                                this._modifiedElements.push(modifiedElement);
                            } else {
                                previousModifiedElementsHash[modifiedElement.newIndex] = modifiedElement;
                            }
                        }

                        for (i = 0; i < updater.removed.length; i++) {
                            var removed = updater.removed[i];
                            var modifiedElement = previousModifiedElementsHash[removed.index];
                            if (modifiedElement) {
                                delete previousModifiedElementsHash[removed.index];
                            } else {
                                modifiedElement = {
                                    oldIndex: removed.index
                                };
                            }
                            modifiedElement.newIndex = -1;
                            if (!modifiedElement._removalHandled) {
                                modifiedElement._itemBox = removed.itemBox;
                            }
                            this._modifiedElements.push(modifiedElement);
                        }

                        var insertedKeys = Object.keys(this._insertedItems);
                        for (i = 0; i < insertedKeys.length; i++) {
                            this._modifiedElements.push({
                                oldIndex: -1,
                                newIndex: this._insertedItems[insertedKeys[i]].index
                            });
                        }

                        this._writeProfilerMark("_synchronize:update_modifiedElements,StartTM");
                        var newItems = {};
                        for (i in updater.elements) {
                            if (updater.elements.hasOwnProperty(i)) {
                                var elementInfo = updater.elements[i];
                                newItems[elementInfo.newIndex] = {
                                    element: elementInfo.item,
                                    container: elementInfo.container,
                                    itemBox: elementInfo.itemBox,
                                    itemsManagerRecord: elementInfo.itemsManagerRecord,
                                    detached: elementInfo.detached
                                };

                                var modifiedElement = previousModifiedElementsHash[elementInfo.index];
                                if (modifiedElement) {
                                    delete previousModifiedElementsHash[elementInfo.index];
                                    modifiedElement.newIndex = elementInfo.newIndex;
                                } else {
                                    modifiedElement = {
                                        oldIndex: elementInfo.index,
                                        newIndex: elementInfo.newIndex
                                    };
                                }
                                modifiedElement.moved = elementInfo.moved;
                                this._modifiedElements.push(modifiedElement);
                            }
                        }
                        this._writeProfilerMark("_synchronize:update_modifiedElements,StopTM");

                        var previousIndices = Object.keys(previousModifiedElementsHash);
                        for (i = 0; i < previousIndices.length; i++) {
                            var key = previousIndices[i];
                            var modifiedElement = previousModifiedElementsHash[key];
                            if (modifiedElement.oldIndex !== -1) {
                                this._modifiedElements.push(modifiedElement);
                            }
                        }

                        this._view.items._itemData = newItems;
                        if (updater.updateDrag && this._currentMode()._dragging) {
                            if (!this._currentMode()._draggingUnselectedItem) {
                                this._currentMode()._dragInfo = this._selection;
                            } else if (updater.newDragInfo) {
                                this._currentMode()._dragInfo = updater.newDragInfo;
                            }
                            this._currentMode().fireDragUpdateEvent();
                        }

                        // If the focused item is removed, or the item we're trying to focus on has been moved before we can focus on it,
                        // we need to update our focus request to get the item from the appropriate index.
                        if (updater.focusedItemRemoved || (this._focusRequest && (updater.oldFocus.index !== updater.newFocus.index) || (updater.oldFocus.type !== updater.newFocus.type))) {
                            this._itemFocused = false;
                            this._setFocusOnItem(this._selection._getFocused());
                        } else if (updater.newFocusedItem) {
                            // We need to restore the value of _hasKeyboardFocus because a changed item
                            // gets removed from the DOM at the time of the notification. If the item
                            // had focus at that time, then our value of _hasKeyboardFocus will have changed.
                            this._hasKeyboardFocus = updater.hadKeyboardFocus;
                            this._itemFocused = false;
                            this._setFocusOnItem(this._selection._getFocused());
                        }

                        var that = this;
                        return this._groups.synchronizeGroups().then(function () {
                            if (updater.newFocus.type === _UI.ObjectType.groupHeader) {
                                updater.newFocus.index = Math.min(that._groups.length() - 1, updater.newFocus.index);

                                if (updater.newFocus.index < 0) {
                                    // An empty listview has currentFocus = item 0
                                    updater.newFocus = { type: _UI.ObjectType.item, index: 0 };
                                }
                                that._selection._setFocused(updater.newFocus, that._selection._keyboardFocused());
                            }

                            that._versionManager.endUpdating();
                            if (updater.deletesCount > 0) {
                                that._updateDeleteWrapperSize();
                            }

                            return that._view.updateTree(that._cachedCount, that._countDifference, that._modifiedElements);
                        }).then(function () {
                            return that._lastScrollPosition;
                        });
                    } else {
                        this._countDifference += updater ? updater.countDifference : 0;

                        var that = this;
                        return this._groups.synchronizeGroups().then(function ListView_synchronizeGroups_success_groupsChanged() {
                            updater && that._versionManager.endUpdating();
                            return that._view.updateTree(that._cachedCount, that._countDifference, that._modifiedElements);
                        }).then(function () {
                            return that.scrollPosition;
                        });
                    }
                },

                _updateDeleteWrapperSize: function ListView_updateDeleteWrapperSize(clear) {
                    var sizeProperty = this._horizontal() ? "width" : "height";
                    this._deleteWrapper.style["min-" + sizeProperty] = (clear ? 0 : this.scrollPosition + this._getViewportSize()[sizeProperty]) + "px";
                },

                _verifyRealizationNeededForChange: function ListView_skipRealization() {
                    // If the updater indicates that only deletes occurred, and we have not lost a viewport full of items,
                    // we skip realizing all the items and appending new ones until other action causes a full realize (e.g. scrolling).
                    //
                    var skipRealization = false;
                    var totalInViewport = (this._view.lastIndexDisplayed || 0) - (this._view.firstIndexDisplayed || 0);
                    var deletesOnly = this._updater && this._updater.movesCount === 0 && this._updater.insertsCount === 0 && this._updater.deletesCount > 0 && (this._updater.deletesCount === Math.abs(this._updater.countDifference));
                    if (deletesOnly && this._updater.elements) {
                        // Verify that the indices of the elements in the updater are within the valid range
                        var elementsKeys = Object.keys(this._updater.elements);
                        for (var i = 0, len = elementsKeys.length; i < len; i++) {
                            var element = this._updater.elements[elementsKeys[i]];
                            var delta = element.index - element.newIndex;
                            if (delta < 0 || delta > this._updater.deletesCount) {
                                deletesOnly = false;
                                break;
                            }
                        }
                    }
                    this._view.deletesWithoutRealize = this._view.deletesWithoutRealize || 0;

                    if (deletesOnly &&
                        (this._view.lastIndexDisplayed < this._view.end - totalInViewport) &&
                        (this._updater.deletesCount + this._view.deletesWithoutRealize) < totalInViewport) {

                        skipRealization = true;
                        this._view.deletesWithoutRealize += Math.abs(this._updater.countDifference);
                        this._writeProfilerMark("skipping realization on delete,info");
                    } else {
                        this._view.deletesWithoutRealize = 0;
                    }
                    this._view._setSkipRealizationForChange(skipRealization);
                },

                _update: function ListView_update() {
                    this._writeProfilerMark("update,StartTM");
                    if (this._ifZombieDispose()) { return; }

                    this._updateJob = null;

                    var that = this;
                    if (this._versionManager.noOutstandingNotifications) {
                        if (this._updater || this._groupsChanged) {
                            this._cancelAsyncViewWork();
                            this._verifyRealizationNeededForChange();
                            this._synchronize().then(function (scrollbarPos) {
                                that._writeProfilerMark("update,StopTM");
                                that._batchViewUpdates(_Constants._ViewChange.relayout, _Constants._ScrollToPriority.low, scrollbarPos).complete();
                            });
                        } else {
                            // Even if nothing important changed we need to restart aria work if it was canceled.
                            this._batchViewUpdates(_Constants._ViewChange.relayout, _Constants._ScrollToPriority.low, this._lastScrollPosition).complete();
                        }
                    }
                },

                _scheduleUpdate: function ListView_scheduleUpdate() {
                    if (!this._updateJob) {
                        var that = this;
                        // Batch calls to _scheduleUpdate
                        this._updateJob = Scheduler.schedulePromiseHigh(null, "WinJS.UI.ListView._update").then(function () {
                            if (that._updateJob) {
                                that._update();
                            }
                        });

                        this._raiseViewLoading();
                    }
                },

                _createGroupsContainer: function () {
                    if (this._groups) {
                        this._groups.cleanUp();
                    }

                    if (this._groupDataSource) {
                        this._groups = new _GroupsContainer._UnvirtualizedGroupsContainer(this, this._groupDataSource);
                    } else {
                        this._groups = new _GroupsContainer._NoGroups(this);
                    }
                },

                _createLayoutSite: function () {
                    var that = this;
                    return Object.create({
                        invalidateLayout: function () {
                            that._pendingLayoutReset = true;
                            var orientationChanged = (that._layout.orientation === "horizontal") !== that._horizontalLayout;
                            that._affectedRange.addAll();
                            that._batchViewUpdates(_Constants._ViewChange.rebuild, _Constants._ScrollToPriority.low, orientationChanged ? 0 : that.scrollPosition, false, true);
                        },
                        itemFromIndex: function (itemIndex) {
                            return that._itemsManager._itemPromiseAtIndex(itemIndex);
                        },
                        groupFromIndex: function (groupIndex) {
                            if (that._groupsEnabled()) {
                                return groupIndex < that._groups.length() ? that._groups.group(groupIndex).userData : null;
                            } else {
                                return { key: "-1" };
                            }
                        },
                        groupIndexFromItemIndex: function (itemIndex) {
                            // If itemIndex < 0, returns 0. If itemIndex is larger than the
                            // biggest item index, returns the last group index.
                            itemIndex = Math.max(0, itemIndex);
                            return that._groups.groupFromItem(itemIndex);
                        },
                        renderItem: function (itemPromise) {
                            return Promise._cancelBlocker(that._itemsManager._itemFromItemPromise(itemPromise)).then(function (element) {
                                if (element) {
                                    var record = that._itemsManager._recordFromElement(element);
                                    if (record.pendingReady) {
                                        record.pendingReady();
                                    }

                                    element = element.cloneNode(true);

                                    _ElementUtilities.addClass(element, _Constants._itemClass);

                                    var itemBox = _Global.document.createElement("div");
                                    _ElementUtilities.addClass(itemBox, _Constants._itemBoxClass);
                                    itemBox.appendChild(element);

                                    var container = _Global.document.createElement("div");
                                    _ElementUtilities.addClass(container, _Constants._containerClass);
                                    container.appendChild(itemBox);

                                    return container;
                                } else {
                                    return Promise.cancel;
                                }
                            });
                        },
                        renderHeader: function (group) {
                            var rendered = _ItemsManager._normalizeRendererReturn(that.groupHeaderTemplate(Promise.wrap(group)));
                            return rendered.then(function (headerRecord) {
                                _ElementUtilities.addClass(headerRecord.element, _Constants._headerClass);
                                var container = _Global.document.createElement("div");
                                _ElementUtilities.addClass(container, _Constants._headerContainerClass);
                                container.appendChild(headerRecord.element);
                                return container;
                            });
                        },
                        readyToMeasure: function () {
                            that._getViewportLength();
                            that._getCanvasMargins();
                        },
                        _isZombie: function () {
                            return that._isZombie();
                        },
                        _writeProfilerMark: function (text) {
                            that._writeProfilerMark(text);
                        }
                    }, {
                        _itemsManager: {
                            enumerable: true,
                            get: function () {
                                return that._itemsManager;
                            }
                        },
                        rtl: {
                            enumerable: true,
                            get: function () {
                                return that._rtl();
                            }
                        },
                        surface: {
                            enumerable: true,
                            get: function () {
                                return that._canvas;
                            }
                        },
                        viewport: {
                            enumerable: true,
                            get: function () {
                                return that._viewport;
                            }
                        },
                        scrollbarPos: {
                            enumerable: true,
                            get: function () {
                                return that.scrollPosition;
                            }
                        },
                        viewportSize: {
                            enumerable: true,
                            get: function () {
                                return that._getViewportSize();
                            }
                        },
                        loadingBehavior: {
                            enumerable: true,
                            get: function () {
                                return that.loadingBehavior;
                            }
                        },
                        animationsDisabled: {
                            enumerable: true,
                            get: function () {
                                return that._animationsDisabled();
                            }
                        },
                        tree: {
                            enumerable: true,
                            get: function () {
                                return that._view.tree;
                            }
                        },
                        realizedRange: {
                            enumerable: true,
                            get: function () {
                                return {
                                    firstPixel: Math.max(0, that.scrollPosition - 2 * that._getViewportLength()),
                                    lastPixel: that.scrollPosition + 3 * that._getViewportLength() - 1
                                };
                            }
                        },
                        visibleRange: {
                            enumerable: true,
                            get: function () {
                                return {
                                    firstPixel: that.scrollPosition,
                                    lastPixel: that.scrollPosition + that._getViewportLength() - 1
                                };
                            }
                        },
                        itemCount: {
                            enumerable: true,
                            get: function () {
                                return that._itemsCount();
                            }
                        },
                        groupCount: {
                            enumerable: true,
                            get: function () {
                                return that._groups.length();
                            }
                        }
                    });
                },

                _initializeLayout: function () {
                    this._affectedRange.addAll();
                    var layoutSite = this._createLayoutSite();
                    this._layout.initialize(layoutSite, this._groupsEnabled());
                    return this._layout.orientation === "horizontal";
                },

                _resetLayoutOrientation: function ListView_resetLayoutOrientation(resetScrollPosition) {
                    if (this._horizontalLayout) {
                        this._startProperty = "left";
                        this._scrollProperty = "scrollLeft";
                        this._scrollLength = "scrollWidth";
                        this._deleteWrapper.style.minHeight = "";
                        _ElementUtilities.addClass(this._viewport, _Constants._horizontalClass);
                        _ElementUtilities.removeClass(this._viewport, _Constants._verticalClass);
                        if (resetScrollPosition) {
                            this._viewport.scrollTop = 0;
                        }
                    } else {
                        this._startProperty = "top";
                        this._scrollProperty = "scrollTop";
                        this._scrollLength = "scrollHeight";
                        this._deleteWrapper.style.minWidth = "";
                        _ElementUtilities.addClass(this._viewport, _Constants._verticalClass);
                        _ElementUtilities.removeClass(this._viewport, _Constants._horizontalClass);
                        if (resetScrollPosition) {
                            _ElementUtilities.setScrollPosition(this._viewport, {scrollLeft: 0});
                        }
                    }
                },

                _resetLayout: function ListView_resetLayout() {
                    this._pendingLayoutReset = false;
                    this._affectedRange.addAll();
                    if (this._layout) {
                        this._layout.uninitialize();
                        this._horizontalLayout = this._initializeLayout();
                        this._resetLayoutOrientation();
                    }
                },

                _updateLayout: function ListView_updateLayout(layoutObject) {
                    var hadPreviousLayout = false;
                    if (this._layout) {
                        // The old layout is reset here in case it was in the middle of animating when the layout got changed. Reset
                        // will cancel out the animations.
                        this._cancelAsyncViewWork(true);
                        this._layout.uninitialize();
                        hadPreviousLayout = true;
                    }

                    var layoutImpl;
                    if (layoutObject && typeof layoutObject.type === "function") {
                        var LayoutCtor = requireSupportedForProcessing(layoutObject.type);
                        layoutImpl = new LayoutCtor(layoutObject);
                    } else if (layoutObject && (layoutObject.initialize)) {
                        layoutImpl = layoutObject;
                    } else {
                        layoutImpl = new _Layouts.GridLayout(layoutObject);
                    }

                    hadPreviousLayout && this._resetCanvas();

                    this._layoutImpl = layoutImpl;
                    this._layout = new _Layouts._LayoutWrapper(layoutImpl);

                    hadPreviousLayout && this._unsetFocusOnItem();
                    this._setFocusOnItem({ type: _UI.ObjectType.item, index: 0 });
                    this._selection._setFocused({ type: _UI.ObjectType.item, index: 0 });

                    this._horizontalLayout = this._initializeLayout();
                    this._resetLayoutOrientation(hadPreviousLayout);

                    if (hadPreviousLayout) {
                        this._canvas.style.width = this._canvas.style.height = "";
                    }
                },

                _currentMode: function ListView_currentMode() {
                    return this._mode;
                },

                _setSwipeClass: function ListView_setSwipeClass() {
                    // We apply an -ms-touch-action style to block panning and swiping from occurring at the same time. It is
                    // possible to pan in the margins between items and on lists without the swipe ability.
                    // Phone does not support swipe; therefore, we don't add them swipeable CSS class.
                    if (!_BaseUtils.isPhone && ((this._currentMode() instanceof _BrowseMode._SelectionMode && this._selectionAllowed() && this._swipeBehavior === _UI.SwipeBehavior.select) ||
                        this._dragSource || this._reorderable)) {
                        this._swipeable = true;
                        _ElementUtilities.addClass(this._element, _Constants._swipeableClass);
                    } else {
                        this._swipeable = false;
                        _ElementUtilities.removeClass(this._element, _Constants._swipeableClass);
                    }
                    var dragEnabled = (this.itemsDraggable || this.itemsReorderable),
                        swipeSelectEnabled = (this._selectionAllowed() && this._swipeBehavior === _UI.SwipeBehavior.select),
                        swipeEnabled = this._swipeable;

                    this._view.items.each(function (index, item, itemData) {
                        if (itemData.itemBox) {
                            var dragDisabledOnItem = _ElementUtilities.hasClass(item, _Constants._nonDraggableClass),
                                selectionDisabledOnItem = _ElementUtilities.hasClass(item, _Constants._nonSelectableClass),
                                nonSwipeable = _ElementUtilities.hasClass(itemData.itemBox, _Constants._nonSwipeableClass);
                            itemData.itemBox.draggable = (dragEnabled && !dragDisabledOnItem);
                            if (!swipeEnabled && nonSwipeable) {
                                _ElementUtilities.removeClass(itemData.itemBox, _Constants._nonSwipeableClass);
                            } else if (swipeEnabled) {
                                var makeNonSwipeable = (dragEnabled && !swipeSelectEnabled && dragDisabledOnItem) ||
                                                        (swipeSelectEnabled && !dragEnabled && selectionDisabledOnItem) ||
                                                        (dragDisabledOnItem && selectionDisabledOnItem);
                                if (makeNonSwipeable && !nonSwipeable) {
                                    _ElementUtilities.addClass(itemData.itemBox, _Constants._nonSwipeableClass);
                                } else if (!makeNonSwipeable && nonSwipeable) {
                                    _ElementUtilities.removeClass(itemData.itemBox, _Constants._nonSwipeableClass);
                                }
                            }
                            var makeNonSelectable = _BaseUtils.isPhone && selectionDisabledOnItem;
                            _ElementUtilities[makeNonSelectable ? "addClass" : "removeClass"](itemData.itemBox, _Constants._nonSelectableClass);
                        }
                    });
                },

                _resizeViewport: function ListView_resizeViewport() {
                    this._viewportWidth = _Constants._UNINITIALIZED;
                    this._viewportHeight = _Constants._UNINITIALIZED;
                },

                _onMSElementResize: function ListView_onResize() {
                    this._writeProfilerMark("_onMSElementResize,info");
                    Scheduler.schedule(function ListView_async_msElementResize() {
                        if (this._isZombie()) { return; }
                        // If these values are uninitialized there is already a realization pass pending.
                        if (this._viewportWidth !== _Constants._UNINITIALIZED && this._viewportHeight !== _Constants._UNINITIALIZED) {
                            var newWidth = this._element.offsetWidth,
                                newHeight = this._element.offsetHeight;
                            if ((this._previousWidth !== newWidth) || (this._previousHeight !== newHeight)) {

                                this._writeProfilerMark("resize (" + this._previousWidth + "x" + this._previousHeight + ") => (" + newWidth + "x" + newHeight + "),info");

                                this._previousWidth = newWidth;
                                this._previousHeight = newHeight;

                                this._resizeViewport();

                                var that = this;
                                this._affectedRange.addAll();
                                this._batchViewUpdates(_Constants._ViewChange.relayout, _Constants._ScrollToPriority.low, function () {
                                    return {
                                        position: that.scrollPosition,
                                        direction: "right"
                                    };
                                });
                            }
                        }
                    }, Scheduler.Priority.max, this, "WinJS.UI.ListView._onMSElementResize");
                },

                _onFocusIn: function ListView_onFocusIn(event) {
                    this._hasKeyboardFocus = true;
                    var that = this;
                    function moveFocusToItem(keyboardFocused) {
                        that._changeFocus(that._selection._getFocused(), true, false, false, keyboardFocused);
                    }
                    // The keyboardEventsHelper object can get focus through three ways: We give it focus explicitly, in which case _shouldHaveFocus will be true,
                    // or the item that should be focused isn't in the viewport, so keyboard focus could only go to our helper. The third way happens when
                    // focus was already on the keyboard helper and someone alt tabbed away from and eventually back to the app. In the second case, we want to navigate
                    // back to the focused item via changeFocus(). In the third case, we don't want to move focus to a real item. We differentiate between cases two and three
                    // by checking if the flag _keyboardFocusInbound is true. It'll be set to true when the tab manager notifies us about the user pressing tab
                    // to move focus into the listview.
                    if (event.target === this._keyboardEventsHelper) {
                        if (!this._keyboardEventsHelper._shouldHaveFocus && this._keyboardFocusInbound) {
                            moveFocusToItem(true);
                        } else {
                            this._keyboardEventsHelper._shouldHaveFocus = false;
                        }
                    } else if (event.target === this._element) {
                        // If someone explicitly calls .focus() on the listview element, we need to route focus to the item that should be focused
                        moveFocusToItem();
                    } else {
                        if (this._mode.inboundFocusHandled) {
                            this._mode.inboundFocusHandled = false;
                            return;
                        }

                        // In the event that .focus() is explicitly called on an element, we need to figure out what item got focus and set our state appropriately.
                        var items = this._view.items,
                            entity = {},
                            element = this._groups.headerFrom(event.target),
                            winItem = null;
                        if (element) {
                            entity.type = _UI.ObjectType.groupHeader;
                            entity.index = this._groups.index(element);
                        } else {
                            entity.index = items.index(event.target);
                            entity.type = _UI.ObjectType.item;
                            element = items.itemBoxAt(entity.index);
                            winItem = items.itemAt(entity.index);
                        }

                        // In the old layouts, index will be -1 if a group header got focus
                        if (entity.index !== _Constants._INVALID_INDEX) {
                            if (this._keyboardFocusInbound || this._selection._keyboardFocused()) {
                                if ((entity.type === _UI.ObjectType.groupHeader && event.target === element) ||
                                        (entity.type === _UI.ObjectType.item && event.target.parentNode === element)) {
                                    // For items we check the parentNode because the srcElement is win-item and element is win-itembox,
                                    // for header, they should both be the win-groupheader
                                    this._drawFocusRectangle(element);
                                }
                            }
                            if (this._tabManager.childFocus !== element && this._tabManager.childFocus !== winItem) {
                                this._selection._setFocused(entity, this._keyboardFocusInbound || this._selection._keyboardFocused());
                                this._keyboardFocusInbound = false;
                                element = entity.type === _UI.ObjectType.groupHeader ? element : items.itemAt(entity.index);
                                this._tabManager.childFocus = element;

                                if (that._updater) {
                                    var elementInfo = that._updater.elements[uniqueID(element)],
                                        focusIndex = entity.index;
                                    if (elementInfo && elementInfo.newIndex) {
                                        focusIndex = elementInfo.newIndex;
                                    }

                                    // Note to not set old and new focus to the same object
                                    that._updater.oldFocus = { type: entity.type, index: focusIndex };
                                    that._updater.newFocus = { type: entity.type, index: focusIndex };
                                }
                            }
                        }
                    }
                },

                _onFocusOut: function ListView_onFocusOut(event) {
                    if (this._disposed) {
                        return;
                    }

                    this._hasKeyboardFocus = false;
                    this._itemFocused = false;
                    var element = this._view.items.itemBoxFrom(event.target) || this._groups.headerFrom(event.target);
                    if (element) {
                        this._clearFocusRectangle(element);
                    }
                },

                _onMSManipulationStateChanged: function ListView_onMSManipulationStateChanged(ev) {
                    var that = this;
                    function done() {
                        that._manipulationEndSignal = null;
                    }

                    this._manipulationState = ev.currentState;
                    that._writeProfilerMark("_onMSManipulationStateChanged state(" + ev.currentState + "),info");

                    if (this._manipulationState !== _ElementUtilities._MSManipulationEvent.MS_MANIPULATION_STATE_STOPPED && !this._manipulationEndSignal) {
                        this._manipulationEndSignal = new _Signal();
                        this._manipulationEndSignal.promise.done(done, done);
                    }

                    if (this._manipulationState === _ElementUtilities._MSManipulationEvent.MS_MANIPULATION_STATE_STOPPED) {
                        this._manipulationEndSignal.complete();
                    }
                },

                _pendingScroll: false,

                _onScroll: function ListView_onScroll() {
                    if (!this._zooming && !this._pendingScroll) {
                        this._checkScroller();
                    }
                },

                _checkScroller: function ListView_checkScroller() {
                    if (this._isZombie()) { return; }

                    var currentScrollPosition = this._viewportScrollPosition;
                    if (currentScrollPosition !== this._lastScrollPosition) {
                        this._pendingScroll = _BaseUtils._requestAnimationFrame(this._checkScroller.bind(this));

                        currentScrollPosition = Math.max(0, currentScrollPosition);
                        var direction =  this._scrollDirection(currentScrollPosition);

                        this._lastScrollPosition = currentScrollPosition;
                        this._raiseViewLoading(true);
                        var that = this;
                        this._view.onScroll(function () {
                            return {
                                position: that._lastScrollPosition,
                                direction: direction
                            };
                        },
                            this._manipulationEndSignal ? this._manipulationEndSignal.promise : Promise.timeout(_Constants._DEFERRED_SCROLL_END));
                    } else {
                        this._pendingScroll = null;
                    }
                },

                _scrollDirection: function ListView_scrollDirectionl(currentScrollPosition) {
                    var currentDirection = currentScrollPosition < this._lastScrollPosition ? "left" : "right";

                    // When receiving a sequence of scroll positions, the browser may give us one scroll position
                    // which doesn't fit (e.g. the scroll positions were increasing but just this one is decreasing).
                    // To filter out this noise, _scrollDirection and _direction are stubborn -- they only change
                    // when we've received a sequence of 3 scroll position which all indicate the same direction.
                    return currentDirection === this._lastDirection ? currentDirection : this._direction;
                },

                _onTabEnter: function ListView_onTabEnter() {
                    this._keyboardFocusInbound = true;
                },

                _onTabExit: function ListView_onTabExit() {
                    this._keyboardFocusInbound = false;
                },

                _onPropertyChange: function ListView_onPropertyChange(list) {
                    var that = this;
                    list.forEach(function (record) {
                        var dirChanged = false;
                        if (record.attributeName === "dir") {
                            dirChanged = true;
                        } else if (record.attributeName === "style") {
                            dirChanged = (that._cachedStyleDir !== record.target.style.direction);
                        }
                        if (dirChanged) {
                            that._cachedStyleDir = record.target.style.direction;
                            that._cachedRTL = null;
                            _ElementUtilities[that._rtl() ? "addClass" : "removeClass"](that._element, _Constants._rtlListViewClass);

                            that._lastScrollPosition = 0;
                            that._viewportScrollPosition = 0;

                            that.forceLayout();
                        }

                        if (record.attributeName === "tabIndex") {
                            var newTabIndex = that._element.tabIndex;
                            if (newTabIndex >= 0) {
                                that._view.items.each(function (index, item) {
                                    item.tabIndex = newTabIndex;
                                });
                                that._tabIndex = newTabIndex;
                                that._tabManager.tabIndex = newTabIndex;
                                that._element.tabIndex = -1;
                            }
                        }
                    });
                },

                _getCanvasMargins: function ListView_getCanvasMargins() {
                    if (!this._canvasMargins) {
                        this._canvasMargins = _Layouts._getMargins(this._canvas);
                    }
                    return this._canvasMargins;
                },

                // Convert between canvas coordinates and viewport coordinates
                _convertCoordinatesByCanvasMargins: function ListView_convertCoordinatesByCanvasMargins(coordinates, conversionCallback) {
                    function fix(field, offset) {
                        if (coordinates[field] !== undefined) {
                            coordinates[field] = conversionCallback(coordinates[field], offset);
                        }
                    }

                    var offset;
                    if (this._horizontal()) {
                        offset = this._getCanvasMargins()[this._rtl() ? "right" : "left"];
                        fix("left", offset);
                    } else {
                        offset = this._getCanvasMargins().top;
                        fix("top", offset);
                    }
                    fix("begin", offset);
                    fix("end", offset);

                    return coordinates;
                },
                _convertFromCanvasCoordinates: function ListView_convertFromCanvasCoordinates(coordinates) {
                    return this._convertCoordinatesByCanvasMargins(coordinates, function (coordinate, canvasMargin) {
                        return coordinate + canvasMargin;
                    });
                },
                _convertToCanvasCoordinates: function ListView_convertToCanvasCoordinates(coordinates) {
                    return this._convertCoordinatesByCanvasMargins(coordinates, function (coordinate, canvasMargin) {
                        return coordinate - canvasMargin;
                    });
                },

                // Methods in the site interface used by ScrollView
                _getViewportSize: function ListView_getViewportSize() {
                    if (this._viewportWidth === _Constants._UNINITIALIZED || this._viewportHeight === _Constants._UNINITIALIZED) {
                        this._viewportWidth = Math.max(0, _ElementUtilities.getContentWidth(this._element));
                        this._viewportHeight = Math.max(0, _ElementUtilities.getContentHeight(this._element));
                        this._writeProfilerMark("viewportSizeDetected width:" + this._viewportWidth + " height:" + this._viewportHeight);

                        this._previousWidth = this._element.offsetWidth;
                        this._previousHeight = this._element.offsetHeight;
                    }
                    return {
                        width: this._viewportWidth,
                        height: this._viewportHeight
                    };
                },

                _itemsCount: function ListView_itemsCount() {
                    var that = this;
                    function cleanUp() {
                        that._itemsCountPromise = null;
                    }

                    if (this._cachedCount !== _Constants._UNINITIALIZED) {
                        return Promise.wrap(this._cachedCount);
                    } else {
                        var retVal;
                        if (!this._itemsCountPromise) {
                            retVal = this._itemsCountPromise = this._itemsManager.dataSource.getCount().then(
                                function (count) {
                                    if (count === _UI.CountResult.unknown) {
                                        count = 0;
                                    }
                                    that._cachedCount = count;
                                    that._selection._updateCount(that._cachedCount);
                                    return count;
                                },
                                function () {
                                    return Promise.cancel;
                                }
                            );

                            this._itemsCountPromise.then(cleanUp, cleanUp);
                        } else {
                            retVal = this._itemsCountPromise;
                        }

                        return retVal;
                    }
                },

                _isSelected: function ListView_isSelected(index) {
                    return this._selection._isIncluded(index);
                },

                _LoadingState: {
                    itemsLoading: "itemsLoading",
                    viewPortLoaded: "viewPortLoaded",
                    itemsLoaded: "itemsLoaded",
                    complete: "complete"
                },

                _raiseViewLoading: function ListView_raiseViewLoading(scrolling) {
                    if (this._loadingState !== this._LoadingState.itemsLoading) {
                        this._scrolling = !!scrolling;
                    }
                    this._setViewState(this._LoadingState.itemsLoading);
                },

                _raiseViewComplete: function ListView_raiseViewComplete() {
                    if (!this._disposed && !this._view.animating) {
                        this._setViewState(this._LoadingState.complete);
                    }
                },

                _setViewState: function ListView_setViewState(state) {
                    if (state !== this._loadingState) {
                        var detail = null;
                        // We can go from any state to itemsLoading but the rest of the states transitions must follow this
                        // order: itemsLoading -> viewPortLoaded -> itemsLoaded -> complete.
                        // Recursively set the previous state until you hit the current state or itemsLoading.
                        switch (state) {
                            case this._LoadingState.viewPortLoaded:
                                if (!this._scheduledForDispose) {
                                    scheduleForDispose(this);
                                    this._scheduledForDispose = true;
                                }
                                this._setViewState(this._LoadingState.itemsLoading);
                                break;

                            case this._LoadingState.itemsLoaded:
                                detail = {
                                    scrolling: this._scrolling
                                };
                                this._setViewState(this._LoadingState.viewPortLoaded);
                                break;

                            case this._LoadingState.complete:
                                this._setViewState(this._LoadingState.itemsLoaded);
                                this._updateDeleteWrapperSize(true);
                                break;
                        }

                        this._writeProfilerMark("loadingStateChanged:" + state + ",info");
                        this._loadingState = state;
                        var eventObject = _Global.document.createEvent("CustomEvent");
                        eventObject.initCustomEvent("loadingstatechanged", true, false, detail);
                        this._element.dispatchEvent(eventObject);
                    }
                },

                _createTemplates: function ListView_createTemplates() {

                    function createNodeWithClass(className, skipAriaHidden) {
                        var element = _Global.document.createElement("div");
                        element.className = className;
                        if (!skipAriaHidden) {
                            element.setAttribute("aria-hidden", true);
                        }
                        return element;
                    }

                    this._itemBoxTemplate = createNodeWithClass(_Constants._itemBoxClass, true);
                },

                // Methods used by SelectionManager
                _updateSelection: function ListView_updateSelection() {
                    var indices = this._selection.getIndices(),
                        selectAll = this._selection.isEverything(),
                        selectionMap = {};

                    if (!selectAll) {
                        for (var i = 0, len = indices.length ; i < len; i++) {
                            var index = indices[i];
                            selectionMap[index] = true;
                        }
                    }

                    this._view.items.each(function (index, element, itemData) {
                        if (itemData.itemBox && !_ElementUtilities.hasClass(itemData.itemBox, _Constants._swipeClass)) {
                            var selected = selectAll || !!selectionMap[index];
                            _ItemEventsHandler._ItemEventsHandler.renderSelection(itemData.itemBox, element, selected, true);
                            if (itemData.container) {
                                _ElementUtilities[selected ? "addClass" : "removeClass"](itemData.container, _Constants._selectedClass);
                            }
                        }
                    });
                },

                _getViewportLength: function ListView_getViewportLength() {
                    return this._getViewportSize()[this._horizontal() ? "width" : "height"];
                },

                _horizontal: function ListView_horizontal() {
                    return this._horizontalLayout;
                },

                _rtl: function ListView_rtl() {
                    if (typeof this._cachedRTL !== "boolean") {
                        this._cachedRTL = _Global.getComputedStyle(this._element, null).direction === "rtl";
                    }
                    return this._cachedRTL;
                },

                _showProgressBar: function ListView_showProgressBar(parent, x, y) {
                    var progressBar = this._progressBar,
                        progressStyle = progressBar.style;

                    if (!progressBar.parentNode) {
                        this._fadingProgressBar = false;
                        if (this._progressIndicatorDelayTimer) {
                            this._progressIndicatorDelayTimer.cancel();
                        }
                        var that = this;
                        this._progressIndicatorDelayTimer = Promise.timeout(_Constants._LISTVIEW_PROGRESS_DELAY).then(function () {
                            if (!that._isZombie()) {
                                parent.appendChild(progressBar);
                                AnimationHelper.fadeInElement(progressBar);
                                that._progressIndicatorDelayTimer = null;
                            }
                        });
                    }
                    progressStyle[this._rtl() ? "right" : "left"] = x;
                    progressStyle.top = y;
                },

                _hideProgressBar: function ListView_hideProgressBar() {
                    if (this._progressIndicatorDelayTimer) {
                        this._progressIndicatorDelayTimer.cancel();
                        this._progressIndicatorDelayTimer = null;
                    }

                    var progressBar = this._progressBar;
                    if (progressBar.parentNode && !this._fadingProgressBar) {
                        this._fadingProgressBar = true;
                        var that = this;
                        AnimationHelper.fadeOutElement(progressBar).then(function () {
                            if (progressBar.parentNode) {
                                progressBar.parentNode.removeChild(progressBar);
                            }
                            that._fadingProgressBar = false;
                        });
                    }
                },

                _getPanAxis: function () {
                    return this._horizontal() ? "horizontal" : "vertical";
                },

                _configureForZoom: function (isZoomedOut, isCurrentView, triggerZoom) {
                    if (_BaseUtils.validation) {
                        if (!this._view.realizePage || typeof this._view.begin !== "number") {
                            throw new _ErrorFromName("WinJS.UI.ListView.NotCompatibleWithSemanticZoom", strings.notCompatibleWithSemanticZoom);
                        }
                    }

                    this._isZoomedOut = isZoomedOut;
                    this._disableEntranceAnimation = !isCurrentView;

                    this._isCurrentZoomView = isCurrentView;

                    this._triggerZoom = triggerZoom;
                },

                _setCurrentItem: function (x, y) {
                    // First, convert the position into canvas coordinates
                    if (this._rtl()) {
                        x = this._viewportWidth - x;
                    }
                    if (this._horizontal()) {
                        x += this.scrollPosition;
                    } else {
                        y += this.scrollPosition;
                    }

                    var result = this._view.hitTest(x, y),
                        entity = { type: result.type ? result.type : _UI.ObjectType.item, index: result.index };
                    if (entity.index >= 0) {
                        if (this._hasKeyboardFocus) {
                            this._changeFocus(entity, true, false, true);
                        } else {
                            this._changeFocusPassively(entity);
                        }
                    }
                },

                _getCurrentItem: function () {
                    var focused = this._selection._getFocused();

                    if (focused.type === _UI.ObjectType.groupHeader) {
                        focused = { type: _UI.ObjectType.item, index: this._groups.group(focused.index).startIndex };
                    }

                    if (typeof focused.index !== "number") {
                        // Do a hit-test in the viewport center
                        this._setCurrentItem(0.5 * this._viewportWidth, 0.5 * this._viewportHeight);

                        focused = this._selection._getFocused();
                    }

                    var that = this;
                    var promisePosition = this._getItemOffsetPosition(focused.index).
                            then(function (posCanvas) {
                                var scrollOffset = that._canvasStart;

                                posCanvas[that._startProperty] += scrollOffset;

                                return posCanvas;
                            });

                    return Promise.join({
                        item: this._dataSource.itemFromIndex(focused.index),
                        position: promisePosition
                    });
                },

                _animateItemsForPhoneZoom: function () {
                    var containersOnScreen = [],
                        itemRows = [],
                        promises = [],
                        minRow = Number.MAX_VALUE,
                        that = this;

                    for (var i = this._view.firstIndexDisplayed, len = Math.min(this._cachedCount, this._view.lastIndexDisplayed + 1) ; i < len; i++) {
                        promises.push(this._view.waitForEntityPosition({ type: _UI.ObjectType.item, index: i }).then(function () {
                            containersOnScreen.push(that._view.items.containerAt(i));
                            var itemRow = 0;
                            if (that.layout._getItemPosition) {
                                var itemPosition = that.layout._getItemPosition(i);
                                if (itemPosition.row) {
                                    itemRow = itemPosition.row;
                                }
                            }
                            itemRows.push(itemRow);
                            minRow = Math.min(itemRow, minRow);
                        }));
                    }

                    function rowStaggerDelay(minRow, rows, delayBetweenRows) {
                        return function (index) {
                            return ((rows[index] - minRow) * delayBetweenRows);
                        };
                    }

                    function clearTransform() {
                        for (var i = 0, len = containersOnScreen.length; i < len; i++) {
                            containersOnScreen[i].style[transformNames.scriptName] = "";
                        }
                    }

                    return Promise.join(promises).then(function () {
                        return (containersOnScreen.length === 0 ? Promise.wrap() : _TransitionAnimation.executeTransition(
                            containersOnScreen,
                            {
                                property: transformNames.cssName,
                                delay: rowStaggerDelay(minRow, itemRows, 30),
                                duration: 100,
                                timing: "ease-in-out",
                                from: (!that._isCurrentZoomView ? "rotateX(-90deg)" : "rotateX(0deg)"),
                                to: (!that._isCurrentZoomView ? "rotateX(0deg)" : "rotateX(90deg)")
                            })).then(clearTransform, clearTransform);
                    }).then(clearTransform, clearTransform);
                },

                _beginZoom: function () {
                    this._zooming = true;
                    var zoomPromise = null;

                    if (_BaseUtils.isPhone) {
                        if (this._isZoomedOut) {
                            this._zoomAnimationPromise && this._zoomAnimationPromise.cancel();
                            // The phone's zoom animations need to be handled in two different spots.
                            // When zooming out, we need to wait for _positionItem to be called so that we have the right items in view before trying to animate.
                            // When zooming back in, the items we need to animate are already ready (and _positionItem won't be called on the zoomed out view, since it's
                            // being dismissed), so we play the animation in _beginZoom.
                            if (this._isCurrentZoomView) {
                                var that = this;
                                var animationComplete = function animationComplete() {
                                    that._zoomAnimationPromise = null;
                                };
                                this._zoomAnimationPromise = zoomPromise = this._animateItemsForPhoneZoom().then(animationComplete, animationComplete);
                            } else {
                                this._zoomAnimationPromise = new _Signal();
                                zoomPromise = this._zoomAnimationPromise.promise;
                            }
                        }
                    } else {
                        // Hide the scrollbar and extend the content beyond the ListView viewport
                        var horizontal = this._horizontal(),
                            scrollOffset = -this.scrollPosition;

                        _ElementUtilities.addClass(this._viewport, horizontal ? _Constants._zoomingXClass : _Constants._zoomingYClass);
                        this._canvasStart = scrollOffset;
                        _ElementUtilities.addClass(this._viewport, horizontal ? _Constants._zoomingYClass : _Constants._zoomingXClass);
                    }
                    return zoomPromise;
                },

                _positionItem: function (item, position) {
                    var that = this;
                    function positionItemAtIndex(index) {
                        return that._getItemOffsetPosition(index).then(function positionItemAtIndex_then_ItemOffsetPosition(posCanvas) {
                            var horizontal = that._horizontal(),
                                canvasSize = that._viewport[horizontal ? "scrollWidth" : "scrollHeight"],
                                viewportSize = (horizontal ? that._viewportWidth : that._viewportHeight),
                                headerSizeProp = (horizontal ? "headerContainerWidth" : "headerContainerHeight"),
                                layoutSizes = that.layout._sizes,
                                headerSize = 0,
                                scrollPosition;

                            if (layoutSizes && layoutSizes[headerSizeProp]) {
                                headerSize = layoutSizes[headerSizeProp];
                            }
                            // Align the leading edge
                            var start = (_BaseUtils.isPhone ? headerSize : position[that._startProperty]),
                                startMax = viewportSize - (horizontal ? posCanvas.width : posCanvas.height);

                            // Ensure the item ends up within the viewport
                            start = Math.max(0, Math.min(startMax, start));

                            scrollPosition = posCanvas[that._startProperty] - start;


                            // Ensure the scroll position is valid
                            var adjustedScrollPosition = Math.max(0, Math.min(canvasSize - viewportSize, scrollPosition)),
                            scrollAdjustment = adjustedScrollPosition - scrollPosition;

                            scrollPosition = adjustedScrollPosition;

                            var entity = { type: _UI.ObjectType.item, index: index };
                            if (that._hasKeyboardFocus) {
                                that._changeFocus(entity, true);
                            } else {
                                that._changeFocusPassively(entity);
                            }

                            that._raiseViewLoading(true);
                            // Since a zoom is in progress, adjust the div position
                            if (!_BaseUtils.isPhone) {
                                var scrollOffset = -scrollPosition;
                                that._canvasStart = scrollOffset;
                            } else {
                                that._viewportScrollPosition = scrollPosition;
                            }
                            that._view.realizePage(scrollPosition, true);

                            if (_BaseUtils.isPhone && that._isZoomedOut) {
                                var animationComplete = function animationComplete() {
                                    that._zoomAnimationPromise && that._zoomAnimationPromise.complete && that._zoomAnimationPromise.complete();
                                    that._zoomAnimationPromise = null;
                                };
                                that._animateItemsForPhoneZoom().then(animationComplete, animationComplete);
                            }
                            return (
                                horizontal ?
                            { x: scrollAdjustment, y: 0 } :
                            { x: 0, y: scrollAdjustment }
                            );
                        });
                    }

                    var itemIndex = 0;
                    if (item) {
                        itemIndex = (this._isZoomedOut ? item.groupIndexHint : item.firstItemIndexHint);
                    }

                    if (typeof itemIndex === "number") {
                        return positionItemAtIndex(itemIndex);
                    } else {
                        // We'll need to obtain the index from the data source
                        var itemPromise;

                        var key = (this._isZoomedOut ? item.groupKey : item.firstItemKey);
                        if (typeof key === "string" && this._dataSource.itemFromKey) {
                            itemPromise = this._dataSource.itemFromKey(key, (this._isZoomedOut ? {
                                groupMemberKey: item.key,
                                groupMemberIndex: item.index
                            } : null));
                        } else {
                            var description = (this._isZoomedOut ? item.groupDescription : item.firstItemDescription);

                            if (_BaseUtils.validation) {
                                if (description === undefined) {
                                    throw new _ErrorFromName("WinJS.UI.ListView.InvalidItem", strings.listViewInvalidItem);
                                }
                            }

                            itemPromise = this._dataSource.itemFromDescription(description);
                        }

                        return itemPromise.then(function (item) {
                            return positionItemAtIndex(item.index);
                        });
                    }
                },

                _endZoom: function (isCurrentView) {
                    if (this._isZombie()) {
                        return;
                    }

                    // Crop the content again and re-enable the scrollbar
                    if (!_BaseUtils.isPhone) {
                        var scrollOffset = this._canvasStart;

                        _ElementUtilities.removeClass(this._viewport, _Constants._zoomingYClass);
                        _ElementUtilities.removeClass(this._viewport, _Constants._zoomingXClass);
                        this._canvasStart = 0;
                        this._viewportScrollPosition = -scrollOffset;
                    }
                    this._disableEntranceAnimation = !isCurrentView;
                    this._isCurrentZoomView = isCurrentView;
                    this._zooming = false;
                    this._view.realizePage(this.scrollPosition, false);
                },

                _getItemOffsetPosition: function (index) {
                    var that = this;
                    return this._getItemOffset({ type: _UI.ObjectType.item, index: index }).then(function (position) {
                        return that._ensureFirstColumnRange(_UI.ObjectType.item).then(function () {
                            position = that._correctRangeInFirstColumn(position, _UI.ObjectType.item);
                            position = that._convertFromCanvasCoordinates(position);
                            if (that._horizontal()) {
                                position.left = position.begin;
                                position.width = position.end - position.begin;
                                position.height = position.totalHeight;
                            } else {
                                position.top = position.begin;
                                position.height = position.end - position.begin;
                                position.width = position.totalWidth;
                            }
                            return position;
                        });
                    });
                },

                _groupRemoved: function (key) {
                    this._groupFocusCache.deleteGroup(key);
                },

                _updateFocusCache: function (itemIndex) {
                    if (this._updateFocusCacheItemRequest) {
                        this._updateFocusCacheItemRequest.cancel();
                    }

                    var that = this;
                    this._updateFocusCacheItemRequest = this._view.items.requestItem(itemIndex).then(function () {
                        that._updateFocusCacheItemRequest = null;
                        var itemData = that._view.items.itemDataAt(itemIndex);
                        var groupIndex = that._groups.groupFromItem(itemIndex);
                        var groupKey = that._groups.group(groupIndex).key;
                        if (itemData.itemsManagerRecord.item) {
                            that._groupFocusCache.updateCache(groupKey, itemData.itemsManagerRecord.item.key, itemIndex);
                        }
                    });
                },

                _changeFocus: function (newFocus, skipSelection, ctrlKeyDown, skipEnsureVisible, keyboardFocused) {
                    if (this._isZombie()) {
                        return;
                    }
                    var targetItem;
                    if (newFocus.type !== _UI.ObjectType.groupHeader) {
                        targetItem = this._view.items.itemAt(newFocus.index);
                        if (!skipSelection && targetItem && _ElementUtilities.hasClass(targetItem, _Constants._nonSelectableClass)) {
                            skipSelection = true;
                        }
                        this._updateFocusCache(newFocus.index);
                    } else {
                        var group = this._groups.group(newFocus.index);
                        targetItem = group && group.header;
                    }
                    this._unsetFocusOnItem(!!targetItem);
                    this._hasKeyboardFocus = true;
                    this._selection._setFocused(newFocus, keyboardFocused);
                    if (!skipEnsureVisible) {
                        this.ensureVisible(newFocus);
                    }

                    // _selection.set() needs to know which item has focus so we
                    // must call it after _selection._setFocused() has been called.
                    if (!skipSelection && this._selectFocused(ctrlKeyDown)) {
                        this._selection.set(newFocus.index);
                    }
                    this._setFocusOnItem(newFocus);
                },

                // Updates ListView's internal focus state and, if ListView currently has focus, moves
                // Trident's focus to the item at index newFocus.
                // Similar to _changeFocus except _changeFocusPassively doesn't:
                // - ensure the item is selected or visible
                // - set Trident's focus to newFocus when ListView doesn't have focus
                _changeFocusPassively: function (newFocus) {
                    var targetItem;
                    if (newFocus.type !== _UI.ObjectType.groupHeader) {
                        targetItem = this._view.items.itemAt(newFocus.index);
                        this._updateFocusCache(newFocus.index);
                    } else {
                        var group = this._groups.group(newFocus.index);
                        targetItem = group && group.header;
                    }
                    this._unsetFocusOnItem(!!targetItem);
                    this._selection._setFocused(newFocus);
                    this._setFocusOnItem(newFocus);
                },

                _drawFocusRectangle: function (item) {
                    if (_ElementUtilities.hasClass(item, _Constants._headerClass)) {
                        _ElementUtilities.addClass(item, _Constants._itemFocusClass);
                    } else {
                        var itemBox = this._view.items.itemBoxFrom(item);
                        if (itemBox.querySelector("." + _Constants._itemFocusOutlineClass)) {
                            return;
                        }
                        _ElementUtilities.addClass(itemBox, _Constants._itemFocusClass);
                        var outline = _Global.document.createElement("div");
                        outline.className = _Constants._itemFocusOutlineClass;
                        itemBox.appendChild(outline);
                    }
                },

                _clearFocusRectangle: function (item) {
                    if (!item || this._isZombie()) {
                        return;
                    }

                    var itemBox = this._view.items.itemBoxFrom(item);
                    if (itemBox) {
                        _ElementUtilities.removeClass(itemBox, _Constants._itemFocusClass);
                        var outline = itemBox.querySelector("." + _Constants._itemFocusOutlineClass);
                        if (outline) {
                            outline.parentNode.removeChild(outline);
                        }
                    } else {
                        var header = this._groups.headerFrom(item);
                        if (header) {
                            _ElementUtilities.removeClass(header, _Constants._itemFocusClass);
                        }
                    }
                },

                _defaultInvoke: function (entity) {
                    if (this._isZoomedOut || (_BaseUtils.isPhone && this._triggerZoom && entity.type === _UI.ObjectType.groupHeader)) {
                        this._changeFocusPassively(entity);
                        this._triggerZoom();
                    }
                },

                _selectionAllowed: function ListView_selectionAllowed(itemIndex) {
                    var item = (itemIndex !== undefined ? this.elementFromIndex(itemIndex) : null),
                        itemSelectable = !(item && _ElementUtilities.hasClass(item, _Constants._nonSelectableClass));
                    return itemSelectable && this._selectionMode !== _UI.SelectionMode.none;
                },

                _multiSelection: function ListView_multiSelection() {
                    return this._selectionMode === _UI.SelectionMode.multi;
                },

                _selectOnTap: function ListView_selectOnTap() {
                    return this._tap === _UI.TapBehavior.toggleSelect || this._tap === _UI.TapBehavior.directSelect;
                },

                _selectFocused: function ListView_selectFocused(ctrlKeyDown) {
                    return this._tap === _UI.TapBehavior.directSelect && this._selectionMode === _UI.SelectionMode.multi && !ctrlKeyDown;
                },

                _dispose: function () {
                    if (!this._disposed) {
                        this._disposed = true;
                        var clear = function clear(e) {
                            e && (e.textContent = "");
                        };

                        _ElementUtilities._resizeNotifier.unsubscribe(this._element, this._onMSElementResizeBound);

                        this._batchingViewUpdates && this._batchingViewUpdates.cancel();

                        this._view && this._view._dispose && this._view._dispose();
                        this._mode && this._mode._dispose && this._mode._dispose();
                        this._groups && this._groups._dispose && this._groups._dispose();
                        this._selection && this._selection._dispose && this._selection._dispose();
                        this._layout && this._layout.uninitialize && this._layout.uninitialize();

                        this._itemsCountPromise && this._itemsCountPromise.cancel();
                        this._versionManager && this._versionManager._dispose();
                        this._clearInsertedItems();
                        this._itemsManager && this._itemsManager.release();
                        this._zoomAnimationPromise && this._zoomAnimationPromise.cancel();

                        clear(this._viewport);
                        clear(this._canvas);
                        clear(this._canvasProxy);

                        this._versionManager = null;
                        this._view = null;
                        this._mode = null;
                        this._element = null;
                        this._viewport = null;
                        this._itemsManager = null;
                        this._canvas = null;
                        this._canvasProxy = null;
                        this._itemsCountPromise = null;
                        this._scrollToFunctor = null;

                        var index = controlsToDispose.indexOf(this);
                        if (index >= 0) {
                            controlsToDispose.splice(index, 1);
                        }
                    }
                },

                _isZombie: function () {
                    // determines if this ListView is no longer in the DOM or has been cleared
                    //
                    return this._disposed || !(this.element.firstElementChild && _Global.document.body.contains(this.element));
                },

                _ifZombieDispose: function () {
                    var zombie = this._isZombie();
                    if (zombie && !this._disposed) {
                        scheduleForDispose(this);
                    }
                    return zombie;
                },

                _animationsDisabled: function () {
                    if (this._viewportWidth === 0 || this._viewportHeight === 0) {
                        return true;
                    }

                    return !_TransitionAnimation.isAnimationEnabled();
                },

                _fadeOutViewport: function ListView_fadeOutViewport() {
                    var that = this;
                    return new Promise(function (complete) {
                        if (that._animationsDisabled()) {
                            complete();
                            return;
                        }

                        if (!that._fadingViewportOut) {
                            if (that._waitingEntranceAnimationPromise) {
                                that._waitingEntranceAnimationPromise.cancel();
                                that._waitingEntranceAnimationPromise = null;
                            }
                            var eventDetails = that._fireAnimationEvent(ListViewAnimationType.contentTransition);
                            that._firedAnimationEvent = true;
                            var overflowStyle = _BaseUtils._browserStyleEquivalents["overflow-style"];
                            var animatedElement = overflowStyle ? that._viewport : that._canvas;
                            if (!eventDetails.prevented) {
                                that._fadingViewportOut = true;
                                if (overflowStyle) {
                                    animatedElement.style[overflowStyle.scriptName] = "none";
                                }
                                AnimationHelper.fadeOutElement(animatedElement).then(function () {
                                    if (that._isZombie()) { return; }
                                    that._fadingViewportOut = false;
                                    animatedElement.style.opacity = 1.0;
                                    complete();
                                });
                            } else {
                                that._disableEntranceAnimation = true;
                                animatedElement.style.opacity = 1.0;
                                complete();
                            }
                        }
                    });
                },

                _animateListEntrance: function (firstTime) {
                    var eventDetails = {
                        prevented: false,
                        animationPromise: Promise.wrap()
                    };
                    var that = this;
                    var overflowStyle = _BaseUtils._browserStyleEquivalents["overflow-style"];
                    var animatedElement = overflowStyle ? this._viewport : this._canvas;
                    function resetViewOpacity() {
                        that._canvas.style.opacity = 1;
                        if (overflowStyle) {
                            animatedElement.style[overflowStyle.scriptName] = "";
                        }
                    }

                    if (this._disableEntranceAnimation || this._animationsDisabled()) {
                        resetViewOpacity();
                        if (this._waitingEntranceAnimationPromise) {
                            this._waitingEntranceAnimationPromise.cancel();
                            this._waitingEntranceAnimationPromise = null;
                        }
                        return Promise.wrap();
                    }

                    if (!this._firedAnimationEvent) {
                        eventDetails = this._fireAnimationEvent(ListViewAnimationType.entrance);
                    } else {
                        this._firedAnimationEvent = false;
                    }

                    // The listview does not have an entrance animation on Phone
                    if (eventDetails.prevented || _BaseUtils.isPhone) {
                        resetViewOpacity();
                        return Promise.wrap();
                    } else {
                        if (this._waitingEntranceAnimationPromise) {
                            this._waitingEntranceAnimationPromise.cancel();
                        }
                        this._canvas.style.opacity = 0;
                        if (overflowStyle) {
                            animatedElement.style[overflowStyle.scriptName] = "none";
                        }
                        this._waitingEntranceAnimationPromise = eventDetails.animationPromise.then(function () {
                            if (!that._isZombie()) {
                                that._canvas.style.opacity = 1;
                                return AnimationHelper.animateEntrance(animatedElement, firstTime).then(function () {
                                    if (!that._isZombie()) {
                                        if (overflowStyle) {
                                            animatedElement.style[overflowStyle.scriptName] = "";
                                        }
                                        that._waitingEntranceAnimationPromise = null;
                                    }
                                });
                            }
                        });
                        return this._waitingEntranceAnimationPromise;
                    }
                },

                _fireAnimationEvent: function (type) {
                    var animationEvent = _Global.document.createEvent("CustomEvent"),
                        animationPromise = Promise.wrap();

                    animationEvent.initCustomEvent("contentanimating", true, true, {
                        type: type
                    });
                    if (type === ListViewAnimationType.entrance) {
                        animationEvent.detail.setPromise = function (delayPromise) {
                            animationPromise = delayPromise;
                        };
                    }
                    var prevented = !this._element.dispatchEvent(animationEvent);
                    return {
                        prevented: prevented,
                        animationPromise: animationPromise
                    };
                },

                // If they don't yet exist, create the start and end markers which are required
                // by Narrator's aria-flowto/flowfrom implementation. They mark the start and end
                // of ListView's set of out-of-order DOM elements and so they must surround the
                // headers and groups in the DOM.
                _createAriaMarkers: function ListView_createAriaMarkers() {
                    if (!this._viewport.getAttribute("aria-label")) {
                        this._viewport.setAttribute("aria-label", strings.listViewViewportAriaLabel);
                    }

                    if (!this._ariaStartMarker) {
                        this._ariaStartMarker = _Global.document.createElement("div");
                        this._ariaStartMarker.id = uniqueID(this._ariaStartMarker);
                        this._viewport.insertBefore(this._ariaStartMarker, this._viewport.firstElementChild);
                    }
                    if (!this._ariaEndMarker) {
                        this._ariaEndMarker = _Global.document.createElement("div");
                        this._ariaEndMarker.id = uniqueID(this._ariaEndMarker);
                        this._viewport.appendChild(this._ariaEndMarker);
                    }
                },

                // If the ListView is in static mode, then the roles of the list and items should be "list" and "listitem", respectively.
                // Otherwise, the roles should be "listbox" and "option." If the ARIA roles are out of sync with the ListView's
                // static/interactive state, update the role of the ListView and the role of each realized item.
                _updateItemsAriaRoles: function ListView_updateItemsAriaRoles() {
                    var that = this;
                    var listRole = this._element.getAttribute("role"),
                        expectedListRole,
                        expectedItemRole;

                    if (this._currentMode().staticMode()) {
                        expectedListRole = "list";
                        expectedItemRole = "listitem";
                    } else {
                        expectedListRole = "listbox";
                        expectedItemRole = "option";
                    }

                    if (listRole !== expectedListRole || this._itemRole !== expectedItemRole) {
                        this._element.setAttribute("role", expectedListRole);
                        this._itemRole = expectedItemRole;
                        this._view.items.each(function (index, itemElement) {
                            itemElement.setAttribute("role", that._itemRole);
                        });
                    }
                },

                _updateGroupHeadersAriaRoles: function ListView_updateGroupHeadersAriaRoles() {
                    var headerRole = (this.groupHeaderTapBehavior === _UI.GroupHeaderTapBehavior.none ? "separator" : "link");
                    if (this._headerRole !== headerRole) {
                        this._headerRole = headerRole;
                        for (var i = 0, len = this._groups.length() ; i < len; i++) {
                            var header = this._groups.group(i).header;
                            if (header) {
                                header.setAttribute("role", this._headerRole);
                            }
                        }
                    }
                },

                // Avoids unnecessary UIA selection events by only updating aria-selected if it has changed
                _setAriaSelected: function ListView_setAriaSelected(itemElement, isSelected) {
                    var ariaSelected = (itemElement.getAttribute("aria-selected") === "true");

                    if (isSelected !== ariaSelected) {
                        itemElement.setAttribute("aria-selected", isSelected);
                    }
                },

                _setupAriaSelectionObserver: function ListView_setupAriaSelectionObserver(item) {
                    if (!item._mutationObserver) {
                        this._mutationObserver.observe(item, { attributes: true, attributeFilter: ["aria-selected"] });
                        item._mutationObserver = true;
                    }
                },

                _itemPropertyChange: function ListView_itemPropertyChange(list) {
                    if (this._isZombie()) { return; }

                    var that = this;
                    var singleSelection = that._selectionMode === _UI.SelectionMode.single;
                    var changedItems = [];
                    var unselectableItems = [];

                    function revertAriaSelected(items) {
                        items.forEach(function (entry) {
                            entry.item.setAttribute("aria-selected", !entry.selected);
                        });
                    }

                    for (var i = 0, len = list.length; i < len; i++) {
                        var item = list[i].target;
                        var itemBox = that._view.items.itemBoxFrom(item);
                        var selected = item.getAttribute("aria-selected") === "true";

                        // Only respond to aria-selected changes coming from UIA. This check
                        // relies on the fact that, in renderSelection, we update the selection
                        // visual before aria-selected.
                        if (itemBox && (selected !== _ElementUtilities._isSelectionRendered(itemBox))) {
                            var index = that._view.items.index(itemBox);
                            var entry = { index: index, item: item, selected: selected };
                            (that._selectionAllowed(index) ? changedItems : unselectableItems).push(entry);
                        }
                    }
                    if (changedItems.length > 0) {
                        var signal = new _Signal();
                        that.selection._synchronize(signal).then(function () {
                            var newSelection = that.selection._cloneSelection();

                            changedItems.forEach(function (entry) {
                                if (entry.selected) {
                                    newSelection[singleSelection ? "set" : "add"](entry.index);
                                } else {
                                    newSelection.remove(entry.index);
                                }
                            });

                            return that.selection._set(newSelection);
                        }).then(function (approved) {
                            if (!that._isZombie() && !approved) {
                                // A selectionchanging event handler rejected the selection change
                                revertAriaSelected(changedItems);
                            }

                            signal.complete();
                        });
                    }

                    revertAriaSelected(unselectableItems);
                },

                _groupsEnabled: function () {
                    return !!this._groups.groupDataSource;
                },

                _getItemPosition: function ListView_getItemPosition(entity, preserveItemsBlocks) {
                    var that = this;
                    return this._view.waitForEntityPosition(entity).then(function () {
                        var container = (entity.type === _UI.ObjectType.groupHeader ? that._view._getHeaderContainer(entity.index) : that._view.getContainer(entity.index));
                        if (container) {
                            that._writeProfilerMark("WinJS.UI.ListView:getItemPosition,info");
                            var itemsBlockFrom;
                            var itemsBlockTo;
                            if (that._view._expandedRange) {
                                itemsBlockFrom = that._view._expandedRange.first.index;
                                itemsBlockTo = that._view._expandedRange.last.index;
                            } else {
                                preserveItemsBlocks = false;
                            }

                            if (entity.type === _UI.ObjectType.item) {
                                preserveItemsBlocks = !!preserveItemsBlocks;
                                preserveItemsBlocks &= that._view._ensureContainerInDOM(entity.index);
                            } else {
                                preserveItemsBlocks = false;
                            }

                            var margins = that._getItemMargins(entity.type),
                                position = {
                                    left: (that._rtl() ? getOffsetRight(container) - margins.right : container.offsetLeft - margins.left),
                                    top: container.offsetTop - margins.top,
                                    totalWidth: _ElementUtilities.getTotalWidth(container),
                                    totalHeight: _ElementUtilities.getTotalHeight(container),
                                    contentWidth: _ElementUtilities.getContentWidth(container),
                                    contentHeight: _ElementUtilities.getContentHeight(container)
                                };

                            if (preserveItemsBlocks) {
                                that._view._forceItemsBlocksInDOM(itemsBlockFrom, itemsBlockTo + 1);
                            }

                            // When a translation is applied to the surface during zooming, offsetLeft includes the canvas margins, so the left/top position will already be in canvas coordinates.
                            // If we're not zooming, we need to convert the position to canvas coordinates before returning.
                            return (that._zooming && that._canvasStart !== 0 ? position : that._convertToCanvasCoordinates(position));
                        } else {
                            return Promise.cancel;
                        }
                    });
                },

                _getItemOffset: function ListView_getItemOffset(entity, preserveItemsBlocks) {
                    var that = this;
                    return this._getItemPosition(entity, preserveItemsBlocks).then(function (pos) {
                        // _getItemOffset also includes the right/bottom margin of the previous row/column of items, so that ensureVisible/indexOfFirstVisible will jump such that
                        // the previous row/column is directly offscreen of the target item.
                        var margins = that._getItemMargins(entity.type);
                        if (that._horizontal()) {
                            var rtl = that._rtl();
                            pos.begin = pos.left - margins[rtl ? "left" : "right"];
                            pos.end = pos.left + pos.totalWidth + margins[rtl ? "right" : "left"];
                        } else {
                            pos.begin = pos.top - margins.bottom;
                            pos.end = pos.top + pos.totalHeight + margins.top;
                        }
                        return pos;
                    });
                },

                _getItemMargins: function ListView_getItemMargins(type) {
                    type = type || _UI.ObjectType.item;
                    var that = this;
                    var calculateMargins = function (className) {
                        var item = that._canvas.querySelector("." + className),
                                cleanup;

                        if (!item) {
                            item = _Global.document.createElement("div"),
                            _ElementUtilities.addClass(item, className);
                            that._viewport.appendChild(item);

                            cleanup = true;
                        }

                        var margins = _Layouts._getMargins(item);

                        if (cleanup) {
                            that._viewport.removeChild(item);
                        }
                        return margins;
                    };

                    if (type !== _UI.ObjectType.groupHeader) {
                        return (this._itemMargins ? this._itemMargins : (this._itemMargins = calculateMargins(_Constants._containerClass)));
                    } else {
                        return (this._headerMargins ? this._headerMargins : (this._headerMargins = calculateMargins(_Constants._headerContainerClass)));
                    }
                },

                _fireAccessibilityAnnotationCompleteEvent: function ListView_fireAccessibilityAnnotationCompleteEvent(firstIndex, lastIndex, firstHeaderIndex, lastHeaderIndex) {
                    // This event is fired in these cases:
                    // - When the data source count is 0, it is fired after the aria markers have been
                    //   updated. The event detail will be { firstIndex: -1, lastIndex: -1 }.
                    // - When the data source count is non-zero, it is fired after the aria markers
                    //   have been updated and the deferred work for the aria properties on the items
                    //   has completed.
                    // - When an item gets focus. The event will be { firstIndex: indexOfItem, lastIndex: indexOfItem }.
                    var detail = {
                        firstIndex: firstIndex,
                        lastIndex: lastIndex,
                        firstHeaderIndex: (+firstHeaderIndex) || -1,
                        lastHeaderIndex: (+lastHeaderIndex) || -1
                    };
                    var eventObject = _Global.document.createEvent("CustomEvent");
                    eventObject.initCustomEvent("accessibilityannotationcomplete", true, false, detail);
                    this._element.dispatchEvent(eventObject);
                },

                _ensureFirstColumnRange: function ListView_ensureFirstColumnRange(type) {
                    var propName = (type === _UI.ObjectType.item ? "_firstItemRange" : "_firstHeaderRange");
                    if (!this[propName]) {
                        var that = this;
                        return this._getItemOffset({ type: type, index: 0 }, true).then(function (firstRange) {
                            that[propName] = firstRange;
                        });
                    } else {
                        return Promise.wrap();
                    }
                },

                _correctRangeInFirstColumn: function ListView_correctRangeInFirstColumn(range, type) {
                    var firstRange = (type === _UI.ObjectType.groupHeader ? this._firstHeaderRange : this._firstItemRange);
                    if (firstRange.begin === range.begin) {
                        if (this._horizontal()) {
                            range.begin = -this._getCanvasMargins()[this._rtl() ? "right" : "left"];
                        } else {
                            range.begin = -this._getCanvasMargins().top;
                        }
                    }
                    return range;
                },

                _updateContainers: function ListView_updateContainers(groups, count, containersDelta, modifiedElements) {
                    var that = this;

                    var maxContainers = this._view.containers.length + (containersDelta > 0 ? containersDelta : 0);

                    var newTree = [];
                    var newKeyToGroupIndex = {};
                    var newContainers = [];
                    var removedContainers = [];

                    function createContainer() {
                        var element = _Global.document.createElement("div");
                        element.className = _Constants._containerClass;
                        return element;
                    }

                    function updateExistingGroupWithBlocks(groupNode, firstItem, newSize) {
                        if (firstItem + newSize > maxContainers) {
                            newSize = maxContainers - firstItem;
                        }

                        var itemsContainer = groupNode.itemsContainer,
                            blocks = itemsContainer.itemsBlocks,
                            lastBlock = blocks.length ? blocks[blocks.length - 1] : null,
                            currentSize = blocks.length ? (blocks.length - 1) * that._view._blockSize + lastBlock.items.length : 0,
                            delta = newSize - currentSize,
                            oldSize, children;

                        if (delta > 0) {
                            if (lastBlock && lastBlock.items.length < that._view._blockSize) {
                                var toAdd = Math.min(delta, that._view._blockSize - lastBlock.items.length);
                                _SafeHtml.insertAdjacentHTMLUnsafe(lastBlock.element, "beforeend", _Helpers._repeat("<div class='win-container win-backdrop'></div>", toAdd));

                                oldSize = lastBlock.items.length;
                                children = lastBlock.element.children;

                                for (var j = 0; j < toAdd; j++) {
                                    lastBlock.items.push(children[oldSize + j]);
                                }

                                delta -= toAdd;
                            }

                            var blocksCount = Math.floor(delta / that._view._blockSize),
                                lastBlockSize = delta % that._view._blockSize;

                            var blockMarkup = "<div class='win-itemsblock'>" + _Helpers._repeat("<div class='win-container win-backdrop'></div>", that._view._blockSize) + "</div>",
                                markup = _Helpers._repeat(blockMarkup, blocksCount);

                            if (lastBlockSize) {
                                markup += "<div class='win-itemsblock'>" + _Helpers._repeat("<div class='win-container win-backdrop'></div>", lastBlockSize) + "</div>";
                                blocksCount++;
                            }

                            var blocksTemp = _Global.document.createElement("div");
                            _SafeHtml.setInnerHTMLUnsafe(blocksTemp, markup);

                            var children = blocksTemp.children;
                            for (var j = 0; j < blocksCount; j++) {
                                var block = children[j],
                                    blockNode = {
                                        element: block,
                                        items: _Helpers._nodeListToArray(block.children)
                                    };
                                itemsContainer.itemsBlocks.push(blockNode);
                            }
                        } else if (delta < 0) {
                            for (var n = delta; n < 0; n++) {

                                var container = lastBlock.items.pop();

                                if (!that._view._requireFocusRestore && container.contains(_Global.document.activeElement)) {
                                    that._view._requireFocusRestore = _Global.document.activeElement;
                                    that._unsetFocusOnItem();
                                }

                                lastBlock.element.removeChild(container);
                                removedContainers.push(container);

                                if (!lastBlock.items.length) {
                                    if (itemsContainer.element === lastBlock.element.parentNode) {
                                        itemsContainer.element.removeChild(lastBlock.element);
                                    }

                                    blocks.pop();
                                    lastBlock = blocks[blocks.length - 1];
                                }
                            }
                        }

                        for (var j = 0, len = blocks.length; j < len; j++) {
                            var block = blocks[j];
                            for (var n = 0; n < block.items.length; n++) {
                                newContainers.push(block.items[n]);
                            }
                        }
                    }

                    function addInserted(groupNode, firstItemIndex, newSize) {
                        var added = modifiedElements.filter(function (entry) {
                            return (entry.oldIndex === -1 && entry.newIndex >= firstItemIndex && entry.newIndex < (firstItemIndex + newSize));
                        }).sort(function (left, right) {
                            return left.newIndex - right.newIndex;
                        });

                        var itemsContainer = groupNode.itemsContainer;

                        for (var i = 0, len = added.length; i < len; i++) {
                            var entry = added[i],
                                offset = entry.newIndex - firstItemIndex;

                            var container = createContainer(),
                                next = offset < itemsContainer.items.length ? itemsContainer.items[offset] : null;
                            itemsContainer.items.splice(offset, 0, container);
                            itemsContainer.element.insertBefore(container, next);
                        }
                    }

                    function updateExistingGroup(groupNode, firstItem, newSize) {
                        if (firstItem + newSize > maxContainers) {
                            newSize = maxContainers - firstItem;
                        }

                        var itemsContainer = groupNode.itemsContainer,
                            delta = newSize - itemsContainer.items.length;

                        if (delta > 0) {
                            var children = itemsContainer.element.children,
                                oldSize = children.length;

                            _SafeHtml.insertAdjacentHTMLUnsafe(itemsContainer.element, "beforeend", _Helpers._repeat("<div class='win-container win-backdrop'></div>", delta));

                            for (var n = 0; n < delta; n++) {
                                var container = children[oldSize + n];
                                itemsContainer.items.push(container);
                            }
                        }

                        for (var n = delta; n < 0; n++) {
                            var container = itemsContainer.items.pop();
                            itemsContainer.element.removeChild(container);
                            removedContainers.push(container);
                        }

                        for (var n = 0, len = itemsContainer.items.length; n < len; n++) {
                            newContainers.push(itemsContainer.items[n]);
                        }
                    }

                    function addNewGroup(groupInfo, firstItem) {
                        var header = that._view._createHeaderContainer(prevElement);

                        var groupNode = {
                            header: header,
                            itemsContainer: {
                                element: that._view._createItemsContainer(header),
                            }
                        };

                        groupNode.itemsContainer[that._view._blockSize ? "itemsBlocks" : "items"] = [];

                        if (that._view._blockSize) {
                            updateExistingGroupWithBlocks(groupNode, firstItem, groupInfo.size);
                        } else {
                            updateExistingGroup(groupNode, firstItem, groupInfo.size);
                        }

                        return groupNode;
                    }

                    function shift(groupNode, oldFirstItemIndex, currentFirstItemIndex, newSize) {
                        var currentLast = currentFirstItemIndex + newSize - 1,
                            firstShifted,
                            delta;

                        for (var i = 0, len = modifiedElements.length; i < len; i++) {
                            var entry = modifiedElements[i];
                            if (entry.newIndex >= currentFirstItemIndex && entry.newIndex <= currentLast && entry.oldIndex !== -1) {
                                if (firstShifted !== +firstShifted || entry.newIndex < firstShifted) {
                                    firstShifted = entry.newIndex;
                                    delta = entry.newIndex - entry.oldIndex;
                                }
                            }
                        }

                        if (firstShifted === +firstShifted) {
                            var addedBeforeShift = 0;
                            for (i = 0, len = modifiedElements.length; i < len; i++) {
                                var entry = modifiedElements[i];
                                if (entry.newIndex >= currentFirstItemIndex && entry.newIndex < firstShifted && entry.oldIndex === -1) {
                                    addedBeforeShift++;
                                }
                            }
                            var removedBeforeShift = 0,
                                oldFirstShifted = firstShifted - delta;
                            for (i = 0, len = modifiedElements.length; i < len; i++) {
                                var entry = modifiedElements[i];
                                if (entry.oldIndex >= oldFirstItemIndex && entry.oldIndex < oldFirstShifted && entry.newIndex === -1) {
                                    removedBeforeShift++;
                                }
                            }

                            delta += removedBeforeShift;
                            delta -= addedBeforeShift;
                            delta -= currentFirstItemIndex - oldFirstItemIndex;

                            var itemsContainer = groupNode.itemsContainer;

                            if (delta > 0) {
                                var children = itemsContainer.element.children;

                                _SafeHtml.insertAdjacentHTMLUnsafe(itemsContainer.element, "afterBegin", _Helpers._repeat("<div class='win-container win-backdrop'></div>", delta));

                                for (var n = 0; n < delta; n++) {
                                    var container = children[n];
                                    itemsContainer.items.splice(n, 0, container);
                                }
                            }

                            for (var n = delta; n < 0; n++) {
                                var container = itemsContainer.items.shift();
                                itemsContainer.element.removeChild(container);
                            }

                            if (delta) {
                                // Invalidate the layout of the entire group because we do not know the exact indices which were added/modified since they were before the realization range.
                                that._affectedRange.add({
                                    start: currentFirstItemIndex,
                                    end: currentFirstItemIndex + newSize
                                }, count);
                            }
                        }
                    }

                    function flatIndexToGroupIndex(index) {
                        var firstItem = 0;
                        for (var i = 0, len = that._view.tree.length; i < len; i++) {
                            var group = that._view.tree[i],
                                size = group.itemsContainer.items.length,
                                lastItem = firstItem + size - 1;

                            if (index >= firstItem && index <= lastItem) {
                                return {
                                    group: i,
                                    item: index - firstItem
                                };
                            }

                            firstItem += size;
                        }
                    }

                    var oldFirstItem = [];
                    var firstItem = 0;
                    if (!that._view._blockSize) {
                        for (var i = 0, len = this._view.tree.length; i < len; i++) {
                            oldFirstItem.push(firstItem);
                            firstItem += this._view.tree[i].itemsContainer.items.length;
                        }
                    }

                    if (!that._view._blockSize) {
                        var removed = modifiedElements.filter(function (entry) {
                            return entry.newIndex === -1 && !entry._removalHandled;
                        }).sort(function (left, right) {
                            return right.oldIndex - left.oldIndex;
                        });

                        for (var i = 0, len = removed.length; i < len; i++) {
                            var entry = removed[i];
                            entry._removalHandled = true;
                            var itemBox = entry._itemBox;
                            entry._itemBox = null;

                            var groupIndex = flatIndexToGroupIndex(entry.oldIndex);
                            var group = this._view.tree[groupIndex.group];

                            var container = group.itemsContainer.items[groupIndex.item];
                            container.parentNode.removeChild(container);

                            if (_ElementUtilities.hasClass(itemBox, _Constants._selectedClass)) {
                                _ElementUtilities.addClass(container, _Constants._selectedClass);
                            }

                            group.itemsContainer.items.splice(groupIndex.item, 1);

                            entry.element = container;
                        }
                    }

                    this._view._modifiedGroups = [];

                    var prevElement = this._canvasProxy;
                    firstItem = 0;
                    // When groups are disabled, loop thru all of the groups (there's only 1).
                    // When groups are enabled, loop until either we exhaust all of the groups in the data source
                    // or we exhaust all of the containers that have been created so far.
                    for (var i = 0, len = groups.length; i < len && (!this._groupsEnabled() || firstItem < maxContainers) ; i++) {
                        var groupInfo = groups[i],
                            existingGroupIndex = this._view.keyToGroupIndex[groupInfo.key],
                            existingGroup = this._view.tree[existingGroupIndex];

                        if (existingGroup) {
                            if (that._view._blockSize) {
                                updateExistingGroupWithBlocks(existingGroup, firstItem, groupInfo.size);
                            } else {
                                shift(existingGroup, oldFirstItem[existingGroupIndex], firstItem, groupInfo.size);
                                addInserted(existingGroup, firstItem, groupInfo.size);
                                updateExistingGroup(existingGroup, firstItem, groupInfo.size);
                            }
                            newTree.push(existingGroup);
                            newKeyToGroupIndex[groupInfo.key] = newTree.length - 1;
                            delete this._view.keyToGroupIndex[groupInfo.key];

                            prevElement = existingGroup.itemsContainer.element;

                            this._view._modifiedGroups.push({
                                oldIndex: existingGroupIndex,
                                newIndex: newTree.length - 1,
                                element: existingGroup.header
                            });
                        } else {
                            var newGroup = addNewGroup(groupInfo, firstItem);
                            newTree.push(newGroup);
                            newKeyToGroupIndex[groupInfo.key] = newTree.length - 1;

                            this._view._modifiedGroups.push({
                                oldIndex: -1,
                                newIndex: newTree.length - 1,
                                element: newGroup.header
                            });

                            prevElement = newGroup.itemsContainer.element;
                        }
                        firstItem += groupInfo.size;
                    }

                    var removedItemsContainers = [],
                        removedHeaders = [],
                        removedGroups = this._view.keyToGroupIndex ? Object.keys(this._view.keyToGroupIndex) : [];

                    for (var i = 0, len = removedGroups.length; i < len; i++) {
                        var groupIndex = this._view.keyToGroupIndex[removedGroups[i]],
                            groupNode = this._view.tree[groupIndex];

                        removedHeaders.push(groupNode.header);
                        removedItemsContainers.push(groupNode.itemsContainer.element);

                        if (this._view._blockSize) {
                            for (var b = 0; b < groupNode.itemsContainer.itemsBlocks.length; b++) {
                                var block = groupNode.itemsContainer.itemsBlocks[b];
                                for (var n = 0; n < block.items.length; n++) {
                                    removedContainers.push(block.items[n]);
                                }
                            }
                        } else {
                            for (var n = 0; n < groupNode.itemsContainer.items.length; n++) {
                                removedContainers.push(groupNode.itemsContainer.items[n]);
                            }
                        }

                        this._view._modifiedGroups.push({
                            oldIndex: groupIndex,
                            newIndex: -1,
                            element: groupNode.header
                        });
                    }

                    for (var i = 0, len = modifiedElements.length; i < len; i++) {
                        if (modifiedElements[i].newIndex === -1 && !modifiedElements[i]._removalHandled) {
                            modifiedElements[i]._removalHandled = true;
                            var itemBox = modifiedElements[i]._itemBox;
                            modifiedElements[i]._itemBox = null;
                            var container;
                            if (removedContainers.length) {
                                container = removedContainers.pop();
                                _ElementUtilities.empty(container);
                            } else {
                                container = createContainer();
                            }
                            if (_ElementUtilities.hasClass(itemBox, _Constants._selectedClass)) {
                                _ElementUtilities.addClass(container, _Constants._selectedClass);
                            }
                            container.appendChild(itemBox);
                            modifiedElements[i].element = container;
                        }
                    }

                    this._view.tree = newTree;
                    this._view.keyToGroupIndex = newKeyToGroupIndex;
                    this._view.containers = newContainers;

                    return {
                        removedHeaders: removedHeaders,
                        removedItemsContainers: removedItemsContainers
                    };
                },

                _writeProfilerMark: function ListView_writeProfilerMark(text) {
                    var message = "WinJS.UI.ListView:" + this._id + ":" + text;
                    _WriteProfilerMark(message);
                    _Log.log && _Log.log(message, null, "listviewprofiler");
                }
            }, {
                // Static members

                triggerDispose: function () {
                    /// <signature helpKeyword="WinJS.UI.ListView.triggerDispose">
                    /// <summary locid="WinJS.UI.ListView.triggerDispose">
                    /// Triggers the ListView disposal service manually. In normal operation this is triggered
                    /// at ListView instantiation. However in some scenarios it may be appropriate to run
                    /// the disposal service manually.
                    /// </summary>
                    /// </signature>
                    disposeControls();
                }

            });
            _Base.Class.mix(ListView, _Events.createEventProperties(
                "iteminvoked",
                "groupheaderinvoked",
                "selectionchanging",
                "selectionchanged",
                "loadingstatechanged",
                "keyboardnavigating",
                "contentanimating",
                "itemdragstart",
                "itemdragenter",
                "itemdragend",
                "itemdragbetween",
                "itemdragleave",
                "itemdragchanged",
                "itemdragdrop",
                "accessibilityannotationcomplete"));
            _Base.Class.mix(ListView, _Control.DOMEventMixin);
            return ListView;
        })
    });

});

