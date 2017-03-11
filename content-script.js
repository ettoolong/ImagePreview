console.log('load content-script');

let currentPrefs = {};
let lastTarget;
let lastImageUrl;
let ignoreEvent = false;
let timer = null;

const matchCustonFilter = (url) => {
  return false;
};

const matchBlacklist = (url) => {
  return false;
};

const cancelTimer = () => {
  if(timer) {
    clearTimeout(timer);
  }
};

const setTimer = (cb) => {
  cancelTimer();
  timer = setTimeout(cb, currentPrefs.previewDelay);
};


const showPopup = () => {
  setTimer( () => {
    browser.runtime.sendMessage({
      action: 'showPopup',
      url: lastImageUrl
    }).then( response => {
    }, error => {
    });
  });
};

const hidePopup = () => {
  browser.runtime.sendMessage({
    action: 'hidePopup'
  }).then( response => {

  }, error => {

  });
};

const setImagePosition = (x, y) => {

};

const isAnchorElement = node => {
  return ((node instanceof HTMLAnchorElement && node.href) || (node instanceof HTMLAreaElement && node.href) || node instanceof HTMLLinkElement || node.getAttributeNS("http://www.w3.org/1999/xlink", "type") === "simple");
};

const onMouseMove = event => {
  if(ignoreEvent)
      return;

  if(lastTarget === event.target) {
    setImagePosition();
    return;
  }
  let elem = event.target;
  let onLink = false;
  let linkURL;
  while (elem) {
    if (elem.nodeType == Node.ELEMENT_NODE) {
      // is link?
      if (!onLink && isAnchorElement(elem)) {
        // Target is a link or a descendant of a link.
        onLink = true;
        let realLink = elem;
        let parent = elem;
        while ((parent = parent.parentNode) && (parent.nodeType === Node.ELEMENT_NODE)) {
          try {
            if (isAnchorElement(parent)) {
              realLink = parent;
            }
          }
          catch (e){
          }
        }
        linkURL = realLink.href;
      }
    }
    elem = elem.parentNode;
  }

  if(onLink) {
    // mouseX = e.screenX;
    // mouseY = e.screenY;
    if(currentPrefs.previewWithCtrl && !event.ctrlKey) {
      cancelTimer();
      lastImageUrl = '';
      if(currentPrefs.autoHide) {
        hidePopup();
      }
      return;
    }

    if(!matchBlacklist(linkURL) || (linkURL.search(/\.(bmp|gif|jpe?g|a?png|svg)$/i) !== -1 || matchCustonFilter(linkURL))) {
      if(matchCustonFilter(linkURL)) {
      }
      else {
        lastImageUrl = linkURL;
        showPopup();
      }
    }
    else {
      cancelTimer();
      lastImageUrl = '';
      if(currentPrefs.autoHide)
        hidePopup();
      return;
    }
  }
  else {
    cancelTimer();
    lastImageUrl = '';
    if(currentPrefs.autoHide) {
      hidePopup();
    }
  }
};

const storageChangeHandler = (changes, area) => {
  if(area === 'local') {
    let changedItems = Object.keys(changes);
    for (let item of changedItems) {
      currentPrefs[item] = changes[item].newValue;
    }
  }
};

browser.storage.local.get().then(results => {
  if ((typeof results.length === 'number') && (results.length > 0)) {
    results = results[0];
  }
  if (results.version) {
    currentPrefs = results;
  }
  browser.storage.onChanged.addListener(storageChangeHandler);
});

window.addEventListener('mousemove', onMouseMove, true);

