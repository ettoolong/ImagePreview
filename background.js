let defaultPreference = {
  previewHeight: 150,
  previewWithCtrl: false,
  previewPosition: 0,
  previewDelay: 500,
  autoHide: true,
  displayInfo: false,
  leftButtonClick: 1,
  middleButtonClick: 4,
  version: 1
};
let preferences = {};
let panelID = null;

const storageChangeHandler = (changes, area) => {
  if(area === 'local') {
    let changedItems = Object.keys(changes);
    for (let item of changedItems) {
      preferences[item] = changes[item].newValue;
      // switch (item) {
      //   case 'contextMenuEnabled':
      //     resetContextMenu();
      //     break;
      // }
    }
  }
};

const loadPreference = () => {
  browser.storage.local.get().then(results => {
    if ((typeof results.length === 'number') && (results.length > 0)) {
      results = results[0];
    }
    if (!results.version) {
      preferences = defaultPreference;
      browser.storage.local.set(defaultPreference).then(res => {
        browser.storage.onChanged.addListener(storageChangeHandler);
      }, err => {
      });
    } else {
      preferences = results;
      browser.storage.onChanged.addListener(storageChangeHandler);
    }
    browser.storage.local.set({cacheText: ''});
  });
};

window.addEventListener('DOMContentLoaded', event => {
  loadPreference();
});

browser.runtime.onMessage.addListener( message => {
  if(message.action === 'showPopup') {
    if(!panelID) {
      //Need Fix: open panel, not window
      browser.windows.create({
        url: message.url,
        type: 'panel'
      }).then(windowInfo => {
        panelID = windowInfo.id;
      }, error => {
        console.log(error);
      });
    }
  }
  else if(message.action === 'hidePopup') {

  }
});