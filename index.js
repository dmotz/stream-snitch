/*!
 * stream-snitch
 * Event emitter for watching text streams with regex patterns
 * Dan Motzenbecker <dan@oxism.com>
 * MIT Licensed
 */

'use strict';

var Writable = require('stream').Writable,
    inherits = require('util').inherits,
    StreamSnitch;


module.exports = StreamSnitch = function(regex, fn, options) {
  if (!(this instanceof StreamSnitch)) {
    return new StreamSnitch(regex, fn, options);
  }

  var isFn = typeof fn === 'function';
  if (!isFn) options = fn;

  options               = options || {};
  this.regex            = regex;
  this._buffer          = '';
  this.bufferCap        = options.bufferCap || 1048576;
  options.decodeStrings = false;

  delete options.bufferCap;
  Writable.call(this, options);
  if (isFn) this.on('match', fn);
}

inherits(StreamSnitch, Writable);


StreamSnitch.prototype._write = function(chunk, encoding, cb) {
  var match, lastMatch;

  if (Buffer.byteLength(this._buffer) > this.bufferCap) this.clearBuffer();

  this._buffer += chunk;

  while (match = this.regex.exec(this._buffer)) {
    this.emit('match', match);
    lastMatch = match;
    if (!this.regex.global) {
      break;
    }
  }

  if (lastMatch) {
    this._buffer = this._buffer.slice(lastMatch.index + lastMatch[0].length);
  }

  if (this.regex.multiline) {
    this._buffer = this._buffer.slice(this._buffer.lastIndexOf('\n'));
  }

  cb();

}


StreamSnitch.prototype.clearBuffer = function() {
  this._buffer = '';
  return this;
}
