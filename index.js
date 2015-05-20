'use strict';

var Types = require('./lib/types/types.js');

var Converter = module.exports = {};

Converter.convert = function(options, callback) {
  var fromSpec = new Types[options.from]();
  fromSpec.resolveResources(options, function(error) {
    if (error) {
      callback(error, null);
      return;
    }
    var toSpec = fromSpec.convertTo(options.to);
    callback(null, toSpec);
  });
}
