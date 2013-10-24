/*
 * teleport-plugin
 * https://github.com/bclwhitaker/teleport-plugin
 *
 * Copyright (c) 2013 Lee Whitaker
 * Licensed under the MIT license.
 */

(function(vjs) {

  var
    /**
     * Copies properties from one or more objects onto an original.
     */
    extend = function(obj /*, arg1, arg2, ... */) {
      var arg, i, k;
      for (i = 1; i < arguments.length; i++) {
        arg = arguments[i];
        for (k in arg) {
          if (arg.hasOwnProperty(k)) {
            obj[k] = arg[k];
          }
        }
      }
      return obj;
    },

    // default values. 
    defaults = {
      //settings you'll definitely want to override.
      teleportServer: 'http://localhost', //the base url for your teleport server
      fetchUserId: function(){return 'testUser';}, //function to fetch unique user identifier
      fetchVideoId: function(){return 'testId';}, //funciton to fetch video identifier
      //settings you might want to override
      fetchTriggerEvent: 'loadstart', //the player event to trigger fetching the last saved position
      seekTriggerEvent: 'play', //the player event to trigger seeking to the last saved position
      saveTriggerEvent: 'pause', //the player event to trigger saving a last saved position
      deleteTriggerEvent: 'ended', //the player event to trigger deleting a saved position
      updateInterval: 10000, //how often to save user progress
      saveSecondsFromEnd: 5 //seconds from end of video that last save can occur
    },

    // plugin initializer
    teleportplugin = function(options) {
      var
        // save a reference to the player instance
        player = this, 
      
        // merge options and defaults
        settings = extend({}, defaults, options || {}),

        updateInterval, //reference to the timer
        seekPosition, // the fetched seek position to use on load
        userId = settings.fetchUserId(), //unique id of current user
        videoId = settings.fetchVideoId(); //unique id of current video

      // replace the initializer with the plugin functionality
      player.teleportplugin = {

        /*
         * Starts a timer to preiodically make POST requests with the current users
         * progress within a video. You can set the interval between posts with the
         * 'updateInterval' setting on the plugin. If you set the 'updateInterval' to 
         * 0 user progress will only be saved on pause events.
         */
        startUpdateInterval: function() {
          var lastPosition = 0; // the last saved position in the interval timer
          if (settings.updateInterval > 0) {
            clearInterval(updateInterval);
            updateInterval = setInterval(function() {
              var currentPosition = player.currentTime();
              if (currentPosition !== lastPosition) {
                lastPosition = currentPosition;
                player.teleportplugin.savePosition();
              }
            }, settings.updateInterval);
          }
        },

        /*
         * Stops updating the server preiodically with user progress.
         */
        stopUpdateInterval: function() {
          if (settings.updateInterval) {
            clearInterval(updateInterval);
          }
        },
        /*
         * Makes a POST request to a server with the last known position for the user and video
         * combination or a user specified value.  After this call, any gets for the same 
         * combination should return the value until it is deleted.
         */
        savePosition: function(position) {
          //If we aren't setting a specific save point use the currentTime
          if (!position) {
            position = player.currentTime();
          }

          //This 'if' condition is to prevent a race condition where a save and delete happen
          //so close at the end of a video that the delete might be handled before the save.
          if ((player.duration() - position) > settings.saveSecondsFromEnd) {
            var 
              saveUrl = settings.teleportServer + '/' + userId + '/' + videoId + '/' +position.toString(),
              xmlHttp = new XMLHttpRequest();
            xmlHttp.open( "POST", saveUrl, false );
            xmlHttp.send( null );
            return;
          } 
        },
        /*
         * Makes a GET request to a server for the last known position for the user and video
         * combination.  Expected response is a positive integer greater than 0 if there
         * is data for this comination or 0 if there is not.
         */
        savedPosition: function() {
          var 
            savedPositionUrl = settings.teleportServer + '/' + userId + '/' + videoId + '/',
            xmlHttp = new XMLHttpRequest();

          xmlHttp.open( "GET", savedPositionUrl, false );
          xmlHttp.send( null );
          return xmlHttp.responseText;
        },
        /*
         * Makes a DELETE request to a server to delete any data for the user and video
         * combination.  After this call, any gets on the same comnination should return
         * 0.
        */
        deletePosition: function() {
          var 
            deletePositionUrl = settings.teleportServer + '/' + userId + '/' + videoId + '/',
            xmlHttp = new XMLHttpRequest();

          xmlHttp.open( "DELETE", deletePositionUrl, false );
          xmlHttp.send( null );
          return xmlHttp.responseText;
        }
      };

      //When a new video is loaded, fetch the user and video ids and see if there is a
      //saved position we should seek to when play is called.
      player.on(settings.fetchTriggerEvent, function(){
        userId = settings.fetchUserId(); 
        videoId = settings.fetchVideoId();
        if (userId) {
          seekPosition = player.teleportplugin.savedPosition();
        }
      });
      
      //When play is called the first time, this will seek to the saved position gathered
      //from the 'loadstart' event handler.  All subsequent plays in the session should bypass
      //this behavior since the seek position is set to 'false' immediately.
      player.on(settings.seekTriggerEvent, function() {
        var duration;
        if (userId) {
          player.teleportplugin.startUpdateInterval();
          duration = parseInt(player.duration(), 10);
          if (seekPosition && parseInt(seekPosition, 10) !== duration) {
            player.currentTime(seekPosition);
          }
          //this makes the above 'if' condition evaluate false on plays after the initial
          //load of the content.
          seekPosition = false;
        }
      });

      //Save the current position when pause fires.
      player.on(settings.saveTriggerEvent, function() {
        player.teleportplugin.stopUpdateInterval();
        if (userId && player.currentTime() !== player.duration()) {
          player.teleportplugin.savePosition();
        }
      });

      //Delete any saved information when ended fires.
      player.on(settings.deleteTriggerEvent, function() {
        player.teleportplugin.stopUpdateInterval();
        if (userId) {
          player.teleportplugin.deletePosition();
        }
      });
    };

  // register the plugin with video.js
  vjs.plugin('teleportplugin', teleportplugin);

}(window.videojs));
