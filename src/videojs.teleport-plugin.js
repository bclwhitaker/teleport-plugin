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
        user = '12345', //unique user identifier
        videoId = '010101', //it of video being watched

        // merge options and defaults
        settings = extend({}, defaults, options || {});

      // replace the initializer with the plugin functionality
      player.teleportplugin = {
        go: function() {
          if (settings.awesome) {
            return 'awesome.';
          }
          return ':(';
        },
        extreme: function() {
          return 'awesome!';
        },
        savePosition: function() {
          var xmlHttp = null;
          saveUrl = 'http://ec2-107-20-72-18.compute-1.amazonaws.com/set/'+user+'/'+videoId+'/'+player.currentTime();
          xmlHttp = new XMLHttpRequest();
          xmlHttp.open( "GET", saveUrl, false );
          xmlHttp.send( null );
          return;
        },
        savedPosition: function() {
          var xmlHttp = null;
          savedPositionUrl = 'http://ec2-107-20-72-18.compute-1.amazonaws.com/set/'+user+'/'+videoId+'/';
          xmlHttp = new XMLHttpRequest();
          xmlHttp.open( "GET", savedPositionUrl, false );
          xmlHttp.send( null );
          return xmlHttp.responseText;
        }
      };

      player.on('play', function() {
        console.log('play');
      });

      player.on('progress', function(){

      });

      player.on('pause', function() {
        player.teleportplugin.savePosition();
      });
    };
  
  // register the plugin with video.js
  vjs.plugin('teleportplugin', teleportplugin);

}(window.videojs));
