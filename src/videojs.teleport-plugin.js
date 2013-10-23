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

    // define some reasonable defaults for this sweet plugin
    defaults = {
      awesome: true
    },

    // plugin initializer
    teleportplugin = function(options) {
      var
        // save a reference to the player instance
        player = this,
        user = fetchUserId() || 'test', //unique user identifier
        videoId = '010101', //it of video being watched
        
        seekPosition,
        updateInterval,
        lastPosition = 0, 

        // merge options and defaults
        settings = extend({updateInterval: 10000, saveSecondsFromEnd: 5}, defaults, options || {});

      // replace the initializer with the plugin functionality
      player.teleportplugin = {
        startUpdateInterval: function() {
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
        stopUpdateInterval: function() {
          if (updateInterval) {
            clearInterval(updateInterval);
          }
        },
        savePosition: function(position) {
          //If we aren't setting a specific save point use the currentTime
          if (!position) {
            position = player.currentTime();
          }

          //Only save if we're not over the lastSave threshold
          if ((player.duration() - position) > settings.saveSecondsFromEnd) {
            var 
              saveUrl = 'http://ec2-107-20-72-18.compute-1.amazonaws.com/set/'+user+'/'+videoId+'/'+position.toString(),
              xmlHttp = new XMLHttpRequest();
            xmlHttp.open( "GET", saveUrl, false );
            xmlHttp.send( null );
            return;
          } 
        },
        savedPosition: function() {
          var 
            savedPositionUrl = 'http://ec2-107-20-72-18.compute-1.amazonaws.com/get/'+user+'/'+videoId+'/',
            xmlHttp = new XMLHttpRequest();

          xmlHttp.open( "GET", savedPositionUrl, false );
          xmlHttp.send( null );
          return xmlHttp.responseText;
        },
        deletePosition: function() {
          var 
            savedPositionUrl = 'http://ec2-107-20-72-18.compute-1.amazonaws.com/delete/'+user+'/'+videoId+'/',
            xmlHttp = new XMLHttpRequest();

          xmlHttp.open( "GET", savedPositionUrl, false );
          xmlHttp.send( null );
          return xmlHttp.responseText;
        }
      };
      
      player.on('play', function() {
        var duration;
        if (user) {
          player.teleportplugin.startUpdateInterval();
          duration = parseInt(player.duration(), 10);
          if (seekPosition && parseInt(seekPosition, 10) !== duration) {
            player.currentTime(seekPosition);
          }
          seekPosition = 0;
        }
      });

      player.on('loadstart', function(){
        if (user) {
          seekPosition = player.teleportplugin.savedPosition();
        }
      });

      player.on('pause', function() {
        player.teleportplugin.stopUpdateInterval();
        if (user && player.currentTime() !== player.duration()) {
          player.teleportplugin.savePosition();
        }
      });

      player.on('ended', function() {
        player.teleportplugin.stopUpdateInterval();
        if (user) {
          player.teleportplugin.deletePosition();
        }
      });
    },

    /**
     * Fetchs the user's facebook ID from the BC_teleport cookie if it's present. 
     * @return String representing the userId. If no cookie was found returns null.
     */ 
    fetchUserId = function() {
      var
        // A list of all cookies accessible from this domain. 
        cookieList = document.cookie.split(';'),
        
        // Used when looping through the list to find BC_teleport.
        currentCookie;

      // Go through the list of browser cookies
      for (var i=0; i < cookieList.length; i++) {
        currentCookie = cookieList[i];
          if (currentCookie.indexOf('BC_teleport=') !== -1) {
            return currentCookie.split('=')[1];
        }
      }
      // If no applicable cookie was found we return null.  
      return null;
    };
  
  // register the plugin with video.js
  vjs.plugin('teleportplugin', teleportplugin);

}(window.videojs));
