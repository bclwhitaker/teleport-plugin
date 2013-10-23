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

        // merge options and defaults
        settings = extend({}, defaults, options || {});

      player.on('play', function(){
        console.log('play');
      });

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
        }
      };
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
          if (currentCookie.indexOf('BC_teleport=') != -1) {
            return currentCookie.split('=')[1];
        }
      }
    
      // If no applicable cookie was found we return null.  
      return null;  
    };
  
  // register the plugin with video.js
  vjs.plugin('teleportplugin', teleportplugin);

}(window.videojs));
