"use strict";

var mongoose = require('mongoose');
var hm = require('./history-model');
var deep = require('deep-diff');

module.exports = function historyPlugin(schema, options) {

    var customCollectionName  = options && options.customCollectionName;
    var customDiffAlgo = options && options.customDiffAlgo;
    var diffOnly  = options && options.diffOnly;

    // Clear all history collection from Schema
    schema.statics.historyModel = function() {
        return hm.HistoryModel(hm.historyCollectionName(this.collection.name, customCollectionName), options);
    };

    // Clear all history documents from history collection
    schema.statics.clearHistory = function(callback) {
        var History = hm.HistoryModel(hm.historyCollectionName(this.collection.name, customCollectionName), options);
        History.remove({}, function(err) {
            callback(err);
        });
    };

    // Save original data
    schema.post('init', function(next) {
        if (diffOnly) {
            this._original = this.toObject();
        }
    });

    // Listen on create, update, remove
    schema.pre('save', getSaveHook({ operation: 'save' }));
    schema.pre('update', getUpdateHook({ operation: 'update' }));
    schema.pre('findOneAndUpdate', getUpdateHook({ operation: 'update' }));
    schema.pre('remove', getDeleteHook({ operation: 'remove' }));
    schema.pre('findOneAndRemove', getUpdateHook({ operation: 'remove' }));

    function getSaveHook(options) {
        return function saveHook(next) {
            options.operation = this.isNew ? 'create' : 'update';
            getSaveHistoryDoc(
                next,
                this.mongooseCollection.collectionName,
                options,
                (diffOnly && !this.isNew)
                    ? getDiffData(this._original, this.toObject())
                    : this.toObject()
            );
        }
    }

    function getUpdateHook(options) {
        return function updateHook(next) {
            var data = this._update.$set || this._update || {};
            getSaveHistoryDoc(
                next,
                this.mongooseCollection.collectionName,
                options,
                diffOnly ? getDiffData(this._update._original, data) : data
            );
        }
    }

    function getDeleteHook(options) {
        return function deleteHook(next) {
            getSaveHistoryDoc(
                next,
                this.mongooseCollection.collectionName,
                options,
                this.toObject()
            );
        }
    }

    function getSaveHistoryDoc(next, collection, options, data) {

        var historyDoc = {
            data: data.diff,
            created_at: new Date(),
            operation: options.operation,
            table: collection
        };

        if (typeof data.additional !== 'undefined') {
            historyDoc.additional = data.additional;
        }

        var history = new hm.HistoryModel(
            hm.historyCollectionName(collection, customCollectionName),
            options
        )(historyDoc);

        history.save(next);
    }

    function getDiffData(original, updated) {

        delete updated._original;
        var data = {};

        if (customDiffAlgo) {
            for (var k in updated) {
                var customDiff = customDiffAlgo(k, updated[k], original[k]);
                if (customDiff) {
                    data.diff[k] = customDiff.diff;
                }
            }
        } else {
            data.diff = deep.diff(updated, original);
        }

        data.diff['_id'] = updated['_id'];

        if (typeof updated.history !== 'undefined') {
            data.additional = updated.history;
        }

        return data;
    }
};
