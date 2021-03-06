// Copyright 2012 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

function L() {
  if (window.console && console.log) {
    console.log.apply(console, arguments);
  }
}

function W() {
  if (window.console && console.warn)  {
    console.warn.apply(console, arguments);
  }
}

var receiverURL = 'ws://' + location.host + '/receiver';

function startMirror() {
  var base;

  var mirror = new TreeMirror(document, {
    createElement: function(tagName) {
      var node;
      if (tagName == 'SCRIPT') {
        node = document.createElement('NO-SCRIPT');
        node.style.display = 'none';
        return node;
      }

      if (tagName == 'HEAD') {
        node = document.createElement('HEAD');
        node.appendChild(document.createElement('BASE'));
        node.firstChild.href = base;
        return node;
      }
      return null;
    }
  });

  L("receiverURL: ", receiverURL);
  var socket = new WebSocket(receiverURL);

  function clearPage() {
    while (document.firstChild) {
      document.removeChild(document.firstChild);
    }
  }

  // do better
  var queue = [], i=0;
  var cursor = window.top.document.getElementById('cursor');
  W(' -- cursor', cursor);

  function showClick(x, y) {
    // move the animation to mouse tip
    var div = $('<div>').css({
      position: 'absolute',
      top: y - 11,
      left: x - 15,
      'z-index': 10000,
      'background-image': "-webkit-gradient(radial, 16 37%, 1, 16 37%, 13, from(rgba(0,0,255, 1)), to(rgba(0,0,255,0)))"
    }).width(30).height(35);

    $('body').append(div);

    div.fadeOut(1000, function () {
      $(this).remove();
    });
  }

  setInterval(function () {
    if (i < queue.length) {
      cursor.style.left = (queue[i][0] - queue[i][2]) + "px";
      cursor.style.top = (queue[i][1] - queue[i][3]) + "px";
      window.scrollTo(queue[i][2], queue[i][3]);
      if (queue[i][4]) {
        L('mouse click happened');
        showClick(queue[i][0], queue[i][1]);
      }
      queue = [];
      i = 0;
    }
  }, 50);

  function handleMessage(msg) {
    if (msg.mouse) {
      if (msg.mouse[4]) {
        L('mouse click happened');
      }
      queue.push(msg.mouse);
    } else if (msg.base) {
      W('setting base');
      base = msg.base;

      // TODO: figure out a better way?
      var m = window.top.document.getElementById('mirror');
      m.style.width = msg.width;
      // m.style.height = msg.height;  // height should be dynamic.
    } else if (msg.clear) {
      W('clearing page');
      clearPage();
    } else {
      W('mirroring', msg.f, msg.args.length);
      mirror[msg.f].apply(mirror, msg.args);
    }
  }

  socket.onmessage = function(event) {
    var msg = JSON.parse(event.data);
    if (msg instanceof Array) {
      msg.forEach(function(subMessage) {
        handleMessage(JSON.parse(subMessage));
      });
    } else {
      handleMessage(msg);
    }
  };

  socket.onclose = function() {
    socket = new WebSocket(receiverURL);
  };
}

window.onload = function () {
  L("registering as receiver for dom mirroring");
  startMirror();
};
