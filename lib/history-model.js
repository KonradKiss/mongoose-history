"use strict";

var mongoose = require('mongoose')
  , historyModels = {};

/**
 * Create and cache a history mongoose model
 * @param {string} collectionName Name of history collection
 * @return {mongoose.Model} History Model
 */
module.exports.HistoryModel = function(collectionName, options) {
  var indexes = options && options.indexes,
      historyConnection = options && options.historyConnection;

  if (!(collectionName in historyModels)) {
    var schema = new mongoose.Schema({
      when: {type: Date, required: true},
      operation: {type: String, required: true},
      target: {type: String, required: true},
      data: {type: mongoose.Schema.Types.Mixed, required: true},
      updateConditions: {type: mongoose.Schema.Types.Mixed},
    },{ id: true, versionKey: false });

    if(indexes){
      indexes.forEach(function(idx) {
        schema.index(idx);
      });
    }

    if(historyConnection) {
      historyModels[collectionName] = historyConnection.model(collectionName, schema, collectionName);
    } else {
      historyModels[collectionName] = mongoose.model(collectionName, schema, collectionName);
    }

  }

  return historyModels[collectionName];
};

/**
 * Set name of history collection
 * @param {string} collectionName history collection name
 * @param {string} customCollectionName history collection name defined by user
 * @return {string} Collection name of history
 */
module.exports.historyCollectionName = function(collectionName, customCollectionName) {
  if(customCollectionName !== undefined) {
    return customCollectionName;
  } else {
    return collectionName + '_history';
  }


};
