var fs = require('fs'),
    StreamSnitch = require('../');

require('should');

describe('stream-snitch', function() {

  describe('#StreamSnitch()', function() {

    it('should match all the image tags', function(done) {
      var snitch     = new StreamSnitch(/<img.+src=["'](.+)['"].?>/gi),
          fileStream = fs.createReadStream(__dirname + '/data/test.html'),
          count      = 0;

      snitch.on('match', function(match) { count++; });

      fileStream.pipe(snitch);
      fileStream.on('end', function() {
        count.should.equal(9);
        done();
      });
    });

    it('should match all the image tags in multiline mode', function(done) {
      var snitch     = new StreamSnitch(/<img.+src=["'](.+)['"].?>/gim),
          fileStream = fs.createReadStream(__dirname + '/data/test.html'),
          count      = 0;

      snitch.on('match', function(match) { count++; });

      fileStream.pipe(snitch);
      fileStream.on('end', function() {
        count.should.equal(9);
        done();
      });
    });

    it('should handle non-global regular expressions', function(done) {
      var snitch     = new StreamSnitch(/\<\/body\>/),
          fileStream = fs.createReadStream(__dirname + '/data/test.html'),
          count      = 0;

      snitch.on('match', function(match) { count++; });

      fileStream.pipe(snitch);
      fileStream.on('end', function() {
        count.should.equal(1);
        done();
      });
    });

  });

});
