var Surface = require('../gamejs').Surface;

/**
 * @fileoverview Methods to create, access and manipulate the display Surface.
 *
 * ## Fullscreen mode
 *
 * is enabled by a checkbox with the DOM id `gjs-fullscreen-toggle`. This is
 * to prevent malicious scripts from triggering fullscreen.
 *
 * If the user presses a key, not listed below, a message similar to 'Exit
 * Fullscreen mode with ESC' will be displayed:
 *
 *  * left arrow, right arrow, up arrow, down arrow
 *  * space
 *  * shift, control, alt
 *  * page up, page down
 *  * home, end, tab, meta
 *
 * @see https://developer.mozilla.org/en/DOM/Using_full-screen_mode
 *
 * @example
 * var display = gamejs.display.setMode([800, 600]);
 * // blit sunflower picture in top left corner of display
 * var sunflower = gamejs.image.load("images/sunflower");
 * display.blit(sunflower);
 *
 */

var CANVAS_ID = "gjs-canvas";
var LOADER_ID = "gjs-loader";
var SURFACE = null;

/**
 * Pass this flag to `gamejs.display.setMode(resolution, flags)` to disable
 * pixel smoothing; this is, for example, useful for retro-style, low resolution graphics
 * where you don't want the browser to smooth them when scaling & drawing.
 */
var DISABLE_SMOOTHING = exports.DISABLE_SMOOTHING = 2;

var _SURFACE_SMOOTHING = true;

/**
 * @returns {document.Element} the canvas dom element
 */
var getCanvas = function() {
   var displayCanvas = document.getElementById(CANVAS_ID);
   if (!displayCanvas) {
      displayCanvas = document.createElement("canvas");
      displayCanvas.setAttribute("id", CANVAS_ID);
      document.body.appendChild(displayCanvas);
   }
   // to be focusable, tabindex must be set
   displayCanvas.setAttribute("tabindex", 1);
   displayCanvas.focus();
   return displayCanvas;
};


var getFullScreenToggle = function() {
   var fullScreenButton = document.getElementById('gjs-fullscreen-toggle');
   if (!fullScreenButton) {
      // before canvas
      fullScreenButton = document.createElement('button');
      fullScreenButton.innerHTML = 'Fullscreen';
      fullScreenButton.id = 'gjs-fullscreen-toggle';
      var canvas = getCanvas();
      canvas.parentNode.insertBefore(fullScreenButton, canvas);
      canvas.parentNode.insertBefore(document.createElement('br'), canvas);

   }
   return fullScreenButton;
}

var getFullScreenWrapper = function() {
   var wrapper = document.getElementById("gjs-canvas-wrapper");
   if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = 'gjs-canvas-wrapper';
      // put canvas into wrapper
      var canvas = getCanvas();
      // @ i guess we should really move all the elements on same
      // dom-depth as canvas into the wrapper
      canvas.parentNode.appendChild(wrapper);
      wrapper.appendChild(canvas);
   }
   return wrapper;
}

var oldWrapperTextAlign = null;
var fullScreenChange = function(event) {
   // @@ we should trigger a gamejs.event
   // to notify of state change
   /// gamejs.event.DISPLAY_FULLSCREEN
   // and
   // gamejs.event.DISPLAY_FULLSCREEN_OFF
   if (isFullScreen()) {
      enablePointerLock();
      oldWrapperTextAlign = getFullScreenWrapper().style.textAlign;
      getFullScreenWrapper().style.textAlign = 'center';
   } else {
      getFullScreenWrapper().style.textAlign = oldWrapperTextAlign;
   }
}

/**
 * Create the master Canvas plane.
 * @ignore
 */
exports.init = function() {
   // get or create wrapper
   getFullScreenWrapper();
   // attach fullscreen toggle checkbox
   var fullScreenToggle = getFullScreenToggle();
   fullScreenToggle.addEventListener('click', function(event) {
      enableFullScreen();
      event.preventDefault();
   }, false);

   document.addEventListener('fullscreenchange', fullScreenChange, false);
   document.addEventListener('webkitfullscreenchange', fullScreenChange, false);
   document.addEventListener('mozfullscreenchange', fullScreenChange, false);

   // create canvas element if not yet present
   getCanvas();
   // remove loader if any;
   var $loader = document.getElementById('gjs-loader');
   if ($loader) {
      $loader.style.display = "none";
   }
   return;
};

var isFullScreen = function() {
   return (document.fullScreenElement || document.mozFullScreenElement || document.webkitIsFullScreen || document.webkitDisplayingFullscreen);
};

/*
 * Switches the display window normal browser mode and fullscreen.
 * @ignore
 * @returns {Boolean} true if operation was successfull, false otherwise
 */
var enableFullScreen = function(event) {
   var wrapper = getFullScreenWrapper();
   wrapper.requestFullScreen = wrapper.requestFullScreen || wrapper.mozRequestFullScreen || wrapper.webkitRequestFullScreen;
   if (!wrapper.requestFullScreen) {
      return false;
   }
   wrapper.requestFullScreen();
   return true;
};

var enablePointerLock = function() {
   var wrapper = getFullScreenWrapper();
   wrapper.requestPointerLock = wrapper.requestPointerLock || wrapper.mozRequestPointerLock || wrapper.webkitRequestPointerLock;
   if (wrapper.requestPointerLock) {
      wrapper.requestPointerLock();
   }
}

/** @ignore **/
exports._hasFocus = function() {
   return document.activeElement == getCanvas();
}

/** @ignore **/
exports._isSmoothingEnabled = function() {
   return (_SURFACE_SMOOTHING === true);
}

/**
 * Set the width and height of the Display. Conviniently this will
 * return the actual display Surface - the same as calling [gamejs.display.getSurface()](#getSurface))
 * later on.
 * @param {Array} dimensions [width, height] of the display surface
 * @param {Number} flags currently only gamejs.display.DISABLE_SMOOTHING supported
 */
exports.setMode = function(dimensions, flags) {
   var canvas = getCanvas();
   canvas.width = dimensions[0];
   canvas.height = dimensions[1];
   _SURFACE_SMOOTHING = (flags !== DISABLE_SMOOTHING);
   return getSurface();
};

/**
 * Set the Caption of the Display (document.title)
 * @param {String} title the title of the app
 * @param {gamejs.Image} icon FIXME implement favicon support
 */
exports.setCaption = function(title, icon) {
   document.title = title;
};


/**
 * The Display (the canvas element) is most likely not in the top left corner
 * of the browser due to CSS styling. To calculate the mouseposition within the
 * canvas we need this offset.
 * @see gamejs/event
 * @ignore
 *
 * @returns {Array} [x, y] offset of the canvas
 */

exports._getCanvasOffset = function() {
   var boundRect = getCanvas().getBoundingClientRect();
   return [boundRect.left, boundRect.top];
};

/**
 * Drawing on the Surface returned by `getSurface()` will draw on the screen.
 * @returns {gamejs.Surface} the display Surface
 */
var getSurface = exports.getSurface = function() {
   if (SURFACE === null) {
      var canvas = getCanvas();
      SURFACE = new Surface([canvas.clientWidth, canvas.clientHeight]);
      SURFACE._canvas = canvas;
      SURFACE._context = canvas.getContext('2d');
      if (_SURFACE_SMOOTHING) {
         SURFACE._smooth();
      } else {
         SURFACE._noSmooth();
      }
   }
   return SURFACE;
};
