'use strict';

/* base object */
var yurion = {
};


dandad.filters = {
  isYoutubeWord : /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/,
  // ad regex
  isAdWord : new RegExp([
    ':\\/\\/.*\\.googlesyndication\\.com', 
     ':\\/\\/.*\\.doubleclick\\.net', 
    ':\\/\\/.*\\.google.com\\/pagead\\/',
    ':\\/\\/.*\\.google.com\\/uds\\/afs',
    'bs\\.serving-sys\\.com\\/',
    'ad\\d-\\w*\\.swf$',
    ':\\/\\/.*\\.youtube.com\\/yt\\/css\\/www-advertise\\.css'
  ].join('|'), 'i'),
  
  isYoutubeUrl : function (url) { 
    return dandad.filters.isYoutubeWord.test(url); 
  },
  
  isAdUrl : function (url) { 
    return dandad.filters.isAdWord.test(url); 
  }
};

chrome.runtime.onMessage.addListener(function (message,sender,sendResponse) {
  if(message.directive === 'toggle'){
    toggleActivation();
  } else if (message.directive === 'cta') {
    chrome.tabs.create({ url: 'http://www.dandad.org/en/explore-archive-winning-work/'  }); //クリックしたらタブが作られた
  }
});

function toggleActivation(){
  dandad.activated = !dandad.activated;
  chrome.storage.local.set({'activated':dandad.activated});
  if(dandad.activated){
    // enabled icon
    chrome.browserAction.setIcon({path: '../../images/icon-19.png'});
  } else {
    // disabled icon
    chrome.browserAction.setIcon({path: '../../images/icon-grey-19.png'});
  }
}

dandad.getVideoUrls = function(callback){
  // callback('{"video": {"mp4": "http://c0026122.cdn1.cloudfiles.rackspacecloud.com/193807.mp4", "webm": "http://5860e9e4db2f4cebe1e6-cc12bb9b5e092d34d0fadb7ce5f280a3.r47.cf1.rackcdn.com/193807.webm", "title": "Touch"}}');
  // callback('{"video": {"mp4": "http://c0026125.cdn1.cloudfiles.rackspacecloud.com/064915.mp4", "webm": "http://a95a046574a64b9ea43b-53264ce826f5cfe73ee69a0c3c37eccc.r68.cf1.rackcdn.com/64915.webm", "title": "Grace / Fever / Dinner / Heart to Heart / Videogame"}}');
  // return;
  var ajax = new XMLHttpRequest();
  var data = 'badadtoken=DDIxhpyyKbKC6IXxQ8jn35h57obttZ0G';
  var url = 'http://www.dandad.org/badad/';
  ajax.onreadystatechange = function() {
    if (ajax.readyState === 4 ) {
      if(ajax.status === 200){
        callback(ajax.responseText);
      } else if(ajax.status === 400) {
        console.warn('404');
      } else {
        console.warn('bad' + ajax.responseText);
      }
    }
  };
  ajax.open('POST', url, true);
  ajax.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
  ajax.send(data);
};
// handle the onBeforeRequest
dandad.onBeforeRequests = {
  // callback of the chrome onBeforeRequest
  inject : function(tabId, infos, tab){
    if(dandad.activated && infos.status === 'complete' && dandad.filters.isYoutubeUrl(tab.url)){
      console.log('Youtube url : %o',tab.url);
      // if the current tab is a youtube one : execute the contentscript
      dandad.getVideoUrls(function(data){
        console.log(data);
        chrome.tabs.executeScript(tabId,{
          // http://stackoverflow.com/questions/9515704/building-a-chrome-extension-inject-code-in-a-page-using-a-content-script
          // compressed version of contentscript.js
          code : '!function(e){"use strict";console.debug("starting injection");var t=document.createElement("script");t.src=chrome.extension.getURL("scripts/injectedScript.js"),t.onload=function(){this.parentNode.removeChild(this)},(document.head||document.documentElement).appendChild(t);var o=document.getElementById("extAdd");o&&o.parentNode&&(console.log("removing",o),o.parentNode.removeChild(o));var n=document.createElement("iframe");document.getElementById("player-api").setAttribute("style","padding:0;");n.id="extAdd",n.setAttribute("style","border-style:none;-webkit-appearance:none;border:0;outline:none;"),n.className="html5-video-player el-detailpage ps-null hide-info-bar autohide-controls-aspect autohide-controls-fullscreen autominimize-progress-bar-non-aspect ad-created endscreen-created captions-created captions-loaded ytp-block-autohide paused-mode",n.setAttribute("allowfullscreen","true"),n.src=chrome.extension.getURL("iframe/iframe.html?id="+e);var d=document.getElementById("player-api");d.insertBefore(n,d.childNodes[0]);}("' + encodeURIComponent(JSON.stringify(data)) + '");',
          // debug version
          // file : 'scripts/contentscript.js',
          runAt: 'document_start'
        }, function(){
          // get the popup and increase the watched value
          chrome.storage.local.get({ 'watched' : 0 },function(item){
            console.log(item);
            chrome.storage.local.set({'watched':item.watched + 1});
          });

          console.log('injected');
        });
      });
    }
  },
  // block ads  // ほう
  adBlock : function(details){
    if(dandad.activated ){
      if(dandad.filters.isAdUrl(details.url)){
        console.debug('Ad url : ',details.url);
        return {cancel : true};
      }
      else
        console.warn('not Ad url : ',details.url);

    }
  },
  // pattern url that will be catched by the extention
  patterns : {
    urls : [ 'http://*/*', 'https://*/*' ]
  }
};

// bind the chrome web request onBeforeRequest event to dandad's one
chrome.webRequest.onBeforeRequest.addListener(
  dandad.onBeforeRequests.adBlock,
  dandad.onBeforeRequests.patterns,
  ['blocking']
);
chrome.tabs.onUpdated.addListener(
  dandad.onBeforeRequests.inject
);

// log whenever the extention is updated
chrome.runtime.onInstalled.addListener(function () {
  console.info('Installed at ' + (new Date()));
});
