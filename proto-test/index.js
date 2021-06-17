var GtfsRealtimeBindings = require('gtfs-realtime-bindings');
var request = require('request');

var requestSettings = {
  method: 'GET',
  url: 'http://gtfs.ovapi.nl/nl/tripUpdates.pb',
  encoding: null
};
request(requestSettings, function (error, response, body) {
  if (!error && response.statusCode == 200) {
    //console.log(response)
    var feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(body);
    console.log(feed)
    // feed.entity.forEach(function(entity) {
    //   //if (entity.trip_update) {
    //     console.log(entity.trip_update);
    //   //}
    // });
  }
});