# stream-snitch
#### Event emitter for watching text streams with regex patterns
[Dan Motzenbecker](http://oxism.com), MIT License

[@dcmotz](http://twitter.com/dcmotz)

### Intro

stream-snitch is a tiny Node module that allows you to match streaming data
patterns with regular expressions. It's much like `... | grep`, but for Node
streams using native events and regular expression objects. It's also a good
introduction to the benefits of streams if you're unconvinced or unintroduced.


### Use Cases

The most obvious use case is scraping or crawling documents from an external source.

Typically you might buffer the incoming chunks from a response into a string
buffer and then inspect the full response in the response's `end` callback.

For instance, if you had a function intended to download all image URLs
embedded in a document:

```javascript
function scrape(url, fn, cb) {
  http.get(url, function(res) {
    var data = '';
    res.on('data', function(chunk) { data += chunk });
    res.on('end', function() {
      var rx = /<img.+src=["'](.+)['"].?>/gi, src;
      while (src = rx.exec(data)) fn(src);
      cb();
    });
  });
}
```

Of course, the response could be enormous and bloat your `data` buffer.
What's worse is the response chunks could come slowly and you'd like to perform
hundreds of these download tasks concurrently and get the job done as quickly
as possible. Waiting for the entire response to finish negates part of the
asynchronous benefits Node's model offers and mainly ignores the fact that the
response is a stream object that represents the data in steps as they occur.

Here's the same task with stream-snitch:

```javascript
function scrape(url, fn, cb) {
  http.get(url, function(res) {
    var snitch = new StreamSnitch(/<img.+src=["'](.+)['"].?>/gi);
    snitch.on('match', function(match) { fn(match[1]) });
    res.pipe(snitch);
    res.on('end', cb)
  });
}
```

The image download tasks (represented by `fn`) can occur as sources are found
without having to wait for a potentially huge or slow request to finish first.
Since you specify native regular expressions, the objects sent to `match`
listeners will contain capture group matches as the above demonstrates (`match[1]`).

For crawling, you could match `href` properties and recursively pipe their
responses through more stream-snitch instances.

Here's another example (in CoffeeScript) from
[soundscrape](https://github.com/dmotz/soundscrape) that matches data from inline JSON:

```coffeescript
scrape = (page, artist, title) ->
  http.get "#{ baseUrl }#{ artist }/#{ title or 'tracks?page=' + page }", (res) ->
    snitch = new StreamSnitch /bufferTracks\.push\((\{.+?\})\)/g
    snitch[if title then 'once' else 'on'] 'match', (match) ->
      download parse match[1]
      scrape ++page, artist, title unless ++trackCount % 10

    res.pipe snitch
```

### Usage

```
$ npm install stream-snitch
```

Create a stream-snitch instance with a search pattern, set a `match` callback,
and pipe some data in:

```javascript
var fs           = require('fs'),
    StreamSnitch = require('stream-snitch'),
    albumList    = fs.createReadStream('./recently_played_(HUGE).txt'),
    cosmicSnitch = new StreamSnitch(/^cosmic\sslop$/mgi);

cosmicSnitch.on('match', console.log.bind(console));
albumList.pipe(cosmicSnitch);

```

For the lazy, you can even specify the `match` event callback in the instantiation:
```javascript
var words = new StreamSnitch(/\s(\w+)\s/g, function(m) { /* ... */ });
```

### Caveats

stream-snitch is simple internally and uses regular expressions for flexibility,
rather than more efficient procedural parsing. The first consequence of this is
that it only supports streams of text and will decode binary buffers automatically.

Since it offers support for any arbitrary regular expressions including capture
groups and start / end operators, chunks are internally buffered and examined and
discarded only when matches are found. When given a regular expression in
multiline mode (`/m`), the buffer is cleared at the start of every newline.

stream-snitch will periodically clear its internal buffer if it grows too large,
which could occur if no matches are found over a large amount of data or you use
an overly broad capture. There is the chance that legitimate match fragments could be
discarded when the water mark is reached unless you specify a large enough buffer
size for your needs.

The default buffer size is one megabyte, but you can pass a custom size like this
if you anticipate a very large capture size:

```javascript
new StreamSnitch(/.../g, { bufferCap: 1024 * 1024 * 20 });
```

If you want to reuse a stream-snitch instance after one stream ends, you can
manually call the `clearBuffer()` method.

It should be obvious, but remember to use the `m` (multiline) flag in your patterns
if you're using the `$` operator for looking at endings on a line by line basis.
If you're legitimately looking for a pattern at the end of a document, stream-snitch
only offers some advantage over buffering the entire response, in that it periodically
discards chunks from memory.

