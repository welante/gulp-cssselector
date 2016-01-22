'use strict';

var Transform = require('readable-stream/transform');
var istextorbinary = require('istextorbinary');

module.exports = function() {
  return new Transform({
    objectMode: true,
    transform: function(file, enc, callback) {
      if ( file.isNull() ) {
        return callback(null, file);
      }

      function replaceComma(line) {
        // line starts with @ string => leave (@media queries)
        if ( line.substr(0, 1) === '@' ) {
          return line;
        }

        // line ends with simicolon => cannot be a css selector
        if ( line.substr(line.length - 1, 1) === ';' ) {
          return line;
        }

        // line ends with { => is a css selector
        if ( line.substr(line.length - 1, 1) !== '{' ) {
          return line;
        }

        var parts = line.split(',');
        if ( parts.length === 1 ) {
          // no comma all fine
          return line;
        }

        var lines = [];
        for ( var i = 0; i < parts.length; i++ ) {
          lines.push(parts[i].trim());
        }

        return lines.join(',' + "\r\n");
      }

      function addNewLines(contents) {
        var re = /\r\n|\n\r|\n|\r/g;
        // get each line into an array
        var arrayOfLines = contents.replace(re, "\n").split("\n");

        var len = arrayOfLines.length;
        var newLines = [];

        for ( var i = 0; i < len; i++ ){
          var line = arrayOfLines[i];
          newLines.push(replaceComma(line));
        }

        return newLines.join("\r\n");
      }

      function doReplace() {
        // only .css files
        if ( file.path.indexOf('.css', file.path.length - 4) === -1 ) {
        // no .css file => ignore
          return callback(null, file);
        }

        // is stream?
        if ( file.isStream() ) {
          file.contents = addNewLines(file.contents);
          return callback(null, file);
        }

        // is buffer?
        if ( file.isBuffer() ) {
          file.contents = new Buffer(addNewLines(String(file.contents)));
          return callback(null, file);
        }

        // no match
        callback(null, file);
      }

      // skip binary files
      istextorbinary.isText(file.path, file.contents, function(err, result) {
        if ( err ) {
          return callback(err, file);
        }

        if ( !result ) {
          callback(null, file);
        }
        else {
          doReplace();
        }
      });
    }
  });
};
