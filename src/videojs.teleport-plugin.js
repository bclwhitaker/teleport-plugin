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

        updateTimer, //reference to the timer
        seekPosition, // the fetched seek position to use on load
        userId = settings.fetchUserId(), //unique id of current user
        videoId = settings.fetchVideoId(); //unique id of current video

      // replace the initializer with the plugin functionality
      player.teleportplugin = {

        /**
         * Exposes the plugin settings that are used to configure it's behaviour.
         */
        getPluginSettings: function() {
          return settings;
        },

        /*
         * Starts a timer to preiodically make POST requests with the current users
         * progress within a video. You can set the interval between posts with the
         * 'updateInterval' setting on the plugin. If you set the 'updateInterval' to 
         * 0 user progress will only be saved on pause events.
         */
        startUpdateTimer: function() {
          var lastPosition = 0; // the last saved position in the interval timer
          if (settings.updateInterval > 0) {
            clearInterval(updateTimer);
            updateTimer = setInterval(function() {
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
        stopUpdateTimer: function() {
          if (settings.updateInterval) {
            clearInterval(updateTimer);
          }
        },
        
        /*
         * Makes a POST request to a server with the last known position for the user and video
         * combination or a user specified value. After this call, any gets for the same 
         * combination should return the value until it is deleted.
         */
        savePosition: function(position) {
          // If we aren't setting a specific save point use the currentTime
          if (!position) {
            position = player.currentTime();
          }

          //This 'if' condition is to prevent a race condition where a save and delete happen
          //so close at the end of a video that the delete might be handled before the save.
          if ((player.duration() - position) > settings.saveSecondsFromEnd) {
            var
              saveUrl = settings.teleportServer + '/userId/' + userId + '/videoId/' + videoId + '/position/' + position.toString(),
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
            savedPositionUrl = settings.teleportServer + '/userId/' + userId + '/videoId/' + videoId + '/',
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
            deletePositionUrl = settings.teleportServer + '/userId/' + userId + '/videoId/' + videoId + '/',
            xmlHttp = new XMLHttpRequest();

          xmlHttp.open( "DELETE", deletePositionUrl, false );
          xmlHttp.timeout = 1500;
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
      
      //This will seek to the saved position gathered from the fetchTriggerEvent call
      //All subsequent plays in the session should bypass this behavior since the seek 
      //position is set to 'false' immediately.
      player.on(settings.seekTriggerEvent, function() {
        var duration;
        if (userId && seekPosition && parseInt(seekPosition, 10) !== duration) {
          player.teleportplugin.startUpdateTimer();
          seek(player, seekPosition);
          //ignore future trigger events after the first
          seekPosition = false;
        }
      });

      //Save the current position when pause fires.
      player.on(settings.saveTriggerEvent, function() {
        player.teleportplugin.stopUpdateTimer();
        if (userId && player.currentTime() !== player.duration()) {
          player.teleportplugin.savePosition();
        }
      });

      //Delete any saved information when ended fires.
      player.on(settings.deleteTriggerEvent, function() {
        player.teleportplugin.stopUpdateTimer();
        if (userId) {
          player.teleportplugin.deletePosition();
        }
      });
    },

    /**
     * Determines whether two times are 'close enough'.
     * Unfortunately we can't count on the reported currentTime() to exactly
     * match the one we set. The best we can do is check whether they're close.
     * Two seconds should about do it.
     */
    closeEnough = function(timeA, timeB) {
      var 
        diff = timeA - timeB,
        delta = 2;
      if (isNaN(diff)) {
        return false;
      }
      return Math.abs(diff) < delta;
    },

    seek = function(player, seconds) {
      var
        // how long to wait before retries
        delay = 250,
        // timer for the next retry
        timeout,
        // whether we've been successful in setting the currentTime
        success = false,
          
      // attempt to set the currentTime
      attempt = function(){
        if (success || closeEnough(player.currentTime(), seconds)) {
          success = true;
          deregister();
        } else {
          player.currentTime(seconds);
          timeout = setTimeout(attempt, delay);
        }
      },
      
      // remove the timer
      deregister = function() {
        clearTimeout(timeout);
        player.off('timeupdate', deregister);
        // one final attempt
        if (!success) {
          player.currentTime(seconds);
        }
      };
    
    // make the first attempt
    player.on('timeupdate', deregister);
    attempt();
  };

  // register the plugin with video.js
  vjs.plugin('teleportplugin', teleportplugin);

}(window.videojs));
