'use strict';

var _ = require('lodash');
var Path = require('path');

var Promise = require('bluebird');
var Inherits = require('util').inherits;
var URI = require('urijs');
var SwaggerConverter = require('swagger-converter');

var BaseFormat = require('../base_format.js');
var Util = require('../util.js');

var Swagger1 = module.exports = function() {
  Swagger1.super_.apply(this, arguments);
  this.format = 'swagger_1';

  this.converters.swagger_2 = Promise.method((swagger1, passthrough) => {
    passthrough = passthrough || {};
    passthrough.buildTagsFromPaths = passthrough.buildTagsFromPaths !== false;
    var swagger2 = SwaggerConverter.convert(
      swagger1.spec,
      swagger1.subResources,
      passthrough
    );

    if (swagger1.spec.tags != null) {
      swagger2.tags = [];
      Object.keys(swagger1.spec.tags).forEach(function (tag) {
        swagger2.tags.push(swagger1.spec.tags[tag]);
      });
    }

    var specApi = swagger1.spec.apis,
      specModels = swagger1.spec.models;

    Object.keys(specModels).forEach(function (model) {
      if(specModels[model].title != null)
        swagger2.definitions[model].title = specModels[model].title;
      Object.keys(specModels[model].properties).forEach(function (prop) {
        Object.keys(specModels[model].properties[prop]).forEach(function (propName) {
          if (/^x-\w+/.test(propName))
            swagger2.definitions[model].properties[prop][propName] = specModels[model].properties[prop][propName];
        });
      });
    });

    Object.keys(specApi).forEach(function (path) {
      Object.keys(specApi[path].operations).forEach(function (op) {
        var method = specApi[path].operations[op].method;
        Object.keys(specApi[path].operations[op].parameters).forEach(function (param) {
          if (specApi[path].operations[op].parameters[param].example != null)
            swagger2.paths[specApi[path].path][method.toLowerCase()].parameters[param].example = specApi[path].operations[op].parameters[param].example;
          if (specApi[path].operations[op].parameters[param].explode != null)
            swagger2.paths[specApi[path].path][method.toLowerCase()].parameters[param].explode = specApi[path].operations[op].parameters[param].explode;
        });
      });
    });

    if (swagger2.info.title === 'Title was not specified')
      swagger2.info.title = swagger2.host;
    return swagger2;
  });

  this.converters.openapi_3 =
    Promise.method((swagger1, passthrough) => this.convertTransitive(['swagger_2', 'openapi_3'], passthrough));
}

Inherits(Swagger1, BaseFormat);

Swagger1.prototype.formatName = 'swagger';
Swagger1.prototype.supportedVersions = ['1.0', '1.1', '1.2'];
Swagger1.prototype.getFormatVersion = function () {
  return this.spec.swaggerVersion;
}

Swagger1.prototype.parsers = {
  'JSON': Util.parseJSON
};

Swagger1.prototype.checkFormat = function (spec) {
  return !_.isUndefined(spec.swaggerVersion);
}

Swagger1.prototype.fixSpec = function () {
  if (this.sourceType == 'url') {
    var url = URI(this.source);

    if (!this.spec.basePath)
      this.spec.basePath = url.filename('').href();
    else {
      var basePath = URI(this.spec.basePath);
      basePath.scheme(basePath.scheme() || url.scheme());
      basePath.host(basePath.host() || url.host());
      this.spec.basePath = basePath.href();
    }
  }
};

Swagger1.prototype.listSubResources = function () {
  return SwaggerConverter.listApiDeclarations(this.source, this.spec);
};
