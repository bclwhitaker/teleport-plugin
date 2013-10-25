(function(vjs) {
  /*
    ======== A Handy Little QUnit Reference ========
    http://api.qunitjs.com/

    Test methods:
      module(name, {[setup][ ,teardown]})
      test(name, callback)
      expect(numberOfAssertions)
      stop(increment)
      start(decrement)
    Test assertions:
      ok(value, [message])
      equal(actual, expected, [message])
      notEqual(actual, expected, [message])
      deepEqual(actual, expected, [message])
      notDeepEqual(actual, expected, [message])
      strictEqual(actual, expected, [message])
      notStrictEqual(actual, expected, [message])
      throws(block, [expected], [message])
  */

  var isHtmlSupported;

  module('videojs.teleportplugin', {
    // This will run before each test in this module.
    setup: function() {
      // grab a reference to the video
      var video = document.querySelector('#qunit-fixture video');
      isHtmlSupported = videojs.Html5.isSupported;

      if (/phantomjs/gi.test(window.navigator.userAgent)) {
        // PhantomJS doesn't have a video element implementation
        // force support here so that the HTML5 tech is still used during
        // command-line test runs
        videojs.Html5.isSupported = function() {
          return true;
        };

        // provide implementations for any video element functions that are
        // used in the tests
        video.load = function() {};
      }

      this.player = vjs(video);
    },

    teardown: function() {
      // restore the original html5 support test
      videojs.Html5.isSupported = isHtmlSupported;
    }
  });

  test('is registered', function() {
    expect(1);
    ok(this.player.teleportplugin, 'the teleportplugin plugin is present');
  });
  
  test('default options can be overridden', function() {
    expect(9);
    var
      teleportServerOption ='http://localhost',
      fetchUserIdOption = function() {
        return '12345';
      },
      fetchVideoIdOption = function() {
        return '12345';
      },
      fetchTriggerEventOption = 'homer',
      seekTriggerEventOption = 'marge',
      saveTriggerEventOption = 'lisa',
      deleteTriggerEventOption = 'bart',
      updateIntervalOption = '7',
      saveSecondsFromEndOption = '13'
    
    // Override the settings we'll need in the player.
    this.player.teleportplugin({
      teleportServer: teleportServerOption,
      fetchUserId: fetchUserIdOption,
      fetchVideoId: fetchVideoIdOption,
      fetchTriggerEvent: fetchTriggerEventOption,
      seekTriggerEvent: seekTriggerEventOption,
      saveTriggerEvent: saveTriggerEventOption,
      deleteTriggerEvent: deleteTriggerEventOption,
      updateInterval: updateIntervalOption,
      saveSecondsFromEnd: saveSecondsFromEndOption
    });
    
    var settings = this.player.teleportplugin.getPluginSettings();

    strictEqual(settings.teleportServer, 'http://localhost', 'server should be http://localhost');
    strictEqual(settings.fetchUserId(), '12345', 'userId should be 12345');
    strictEqual(settings.fetchVideoId(), '12345', 'videoId should be 12345');
    strictEqual(settings.fetchTriggerEvent, 'homer', 'fetch trigger should be "homer"');
    strictEqual(settings.seekTriggerEvent, 'marge', 'seek trigger should be "marge"');
    strictEqual(settings.saveTriggerEvent, 'lisa', 'save trigger should be "lisa"');
    strictEqual(settings.deleteTriggerEvent, 'bart', 'delete trigger should be "bart"');
    strictEqual(settings.updateInterval, '7', 'update interval should be 7');
    strictEqual(settings.saveSecondsFromEnd, '13', 'save seconds from end should be 13');
  });
  
  test('stopUpdateTimer should clear the content timer', function() {
    expect(1);
    
    // Override the settings we'll need in the player.
    this.player.teleportplugin({
      teleportServer: 'http://localhost',
      updateInterval: '25',
      fetchTriggerEvent: 'homer',
      seekTriggerEvent: 'marge',
      saveTriggerEvent: 'lisa',
      deleteTriggerEvent: 'bart'
    });
    
    clearInterval = function(){
      ok(true);
    };
    
    this.player.teleportplugin.stopUpdateTimer();
  });
  
  //TODO: Consider just removing this as it currently doesn't do anything useful
  test('startUpdateTimer should start up the content timer', function() {
    expect(0);
    
    // Override the settings we'll need in the player.
    this.player.teleportplugin({
      teleportServer: 'http://localhost',
      updateInterval: '1',
      fetchTriggerEvent: 'homer',
      seekTriggerEvent: 'marge',
      saveTriggerEvent: 'lisa',
      deleteTriggerEvent: 'bart'
    });
      
    this.player.currentTime(5);  
      
    this.player.teleportplugin.savePosition = function(position) {
      ok(false);
    };
    
    this.player.teleportplugin.startUpdateTimer();
  });
  
  //TODO: Currently does nothing...
  test('savedPosition should send a request to save', function() {
    expect(0);
    
    // Mock out sending the requests brah!
  });
  
  
  
  
  
  /*
  test('is awesome', function() {
    expect(2);
    this.player.teleportplugin();
    strictEqual(this.player.teleportplugin.go(), 'awesome.', 'should be awesome');
    strictEqual(this.player.teleportplugin.extreme(), 'awesome!', 'should be thoroughly awesome');
  });

  test('default options can be overridden', function() {
    expect(1);
    this.player.teleportplugin({
      awesome: false
    });

    strictEqual(this.player.teleportplugin.go(), ':(', 'should be sad face');
  });
  */

}(window.videojs));
