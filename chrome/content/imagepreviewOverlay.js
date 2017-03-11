var EttImagePreview = {
  prefs : Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.ettimagepreview.options."),
  consoleService: Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService),
  httpCheck : /(^http:\/\/)/i,
  imgurPicLoader: null,

  popupWindow : null,
  imgLoading : null,
  imgError : null,
  previewArea : null,
  info: null,
  mouseX : 0,
  mouseY : 0,
  popupTimer : null,
  prefListener : null,
  ignoreEvent : false,  

  //pref-start
  previewHeight: 150,
  previewWithCtrl: false,
  previewPosition: 0,
  previewDelay: 500,
  autoHide: true,
  displayInfo: false,
  leftButtonClick: 1,
  middleButtonClick: 4,
  //pref-end

  urlList: [],

  mouse_scroll: function(e) {
  	
    var context = document.getElementById("EttIP_contentAreaContextMenu");
    context.hidePopup();
      	
    //zoom image
    var _this = EttImagePreview;
    var img = _this.previewArea.firstChild;
    
    var zoom  = parseFloat(_this.popupWindow.getAttribute('Zoom'));
    var orgzoom = zoom;
    var orgwidth  = parseFloat(_this.popupWindow.getAttribute('OrgImgWidth'));
    var orgheight = parseFloat(_this.popupWindow.getAttribute('OrgImgHeight'));
          
    var width = parseFloat(_this.popupWindow.getAttribute('FixImgWidth'));
    var height = parseFloat(_this.popupWindow.getAttribute('FixImgHeight'));
    
    if(e.detail < 0) //scroll up
    {
      ++zoom;
    }
    else //scroll down
    {
    	if(zoom>0)
        --zoom;
      else
      	return;
    }
    
    var newWidth = width*(1+zoom*0.5);
    var newHeight = height*(1+zoom*0.5);
    if(newWidth>orgwidth || newHeight>orgheight)
    {
    	zoom = orgzoom;
      newWidth = orgwidth;
      newHeight = orgheight;
    }

    var scale = orgheight/newHeight;
    _this.info.value=orgwidth+' x '+orgheight+' ('+ Math.floor(100 / scale) +'%)';
    
    img.width = newWidth;
    img.height = newHeight;
    _this.popupWindow.setAttribute('Zoom',zoom);    
    _this.popupWindow.setAttribute('ImgWidth',newWidth);
    _this.popupWindow.setAttribute('ImgHeight',newHeight);
    if(_this.previewPosition==0)
      _this.setImageLocation();
    else
      _this.setImageLocation(true);
  },
  
  mouse_click: function(e) {
  	var _this = EttImagePreview;
    if(e.button==2) //right
    {
      //do nothing
    }
    else if(e.button==1)//middle
    {
    	if(_this.middleButtonClick==1)
    		_this.popupWindow.hidePopup();
    	else if(_this.middleButtonClick==2)
    		_this.openURL(_this.previewArea.firstChild.src, false);
    	else if(_this.middleButtonClick==3)
    		_this.openURL(_this.previewArea.firstChild.src, true);
    	else if(_this.middleButtonClick==4)
        _this.saveimage(e);
    }
    else if(e.button==0)//left
    {
    	if(_this.leftButtonClick==1)
    		_this.popupWindow.hidePopup();
    	else if(_this.leftButtonClick==2)
    		_this.openURL(_this.previewArea.firstChild.src, false);
    	else if(_this.leftButtonClick==3)
    		_this.openURL(_this.previewArea.firstChild.src, true);
    	else if(_this.leftButtonClick==4)
        _this.saveimage(e);
    }
  },

  popupshowing: function(event, _this) {  
    var targetNode = EttImagePreview.previewArea.firstChild;
    return true;
  },
  
  popuphidden: function(event, _this) {  
  },

  contextMenuShowing: function(e) {  	
     if (e.originalTarget == document.getElementById("contentAreaContextMenu"))
     {
     	 var _this = EttImagePreview;
     	 _this.ignoreEvent = true;
     }
  },

  contextMenuHidden: function(e) {
     if (e.originalTarget == document.getElementById("contentAreaContextMenu"))
     {
     	 var _this = EttImagePreview;
     	 _this.ignoreEvent = false;
     }
  },
  
  mouse_over: function(e) {
    var elem = e.target;
    var onLink = false;
    var linkURL;
    var _this = EttImagePreview;
    if(_this.ignoreEvent)
      return;
    while (elem)
    {
      if (elem.nodeType == Node.ELEMENT_NODE) {
        // Link?
        if (!onLink && ((elem instanceof HTMLAnchorElement && elem.href) || (elem instanceof HTMLAreaElement && elem.href) || elem instanceof HTMLLinkElement || elem.getAttributeNS("http://www.w3.org/1999/xlink", "type") == "simple"))
        {
          // Target is a link or a descendant of a link.
          onLink = true;
          var realLink = elem;
          var parent = elem;
          while ((parent = parent.parentNode) && (parent.nodeType == Node.ELEMENT_NODE))
          {
            try {
              if ((parent instanceof HTMLAnchorElement && parent.href) || (parent instanceof HTMLAreaElement && parent.href) || parent instanceof HTMLLinkElement || parent.getAttributeNS("http://www.w3.org/1999/xlink", "type") == "simple")
                realLink = parent;
            } catch (e) { }
          }
          linkURL = realLink.href;//_this.getLinkURL();
        }
      }
      elem = elem.parentNode;
    }
    if(onLink)
    {
      _this.mouseX = e.screenX;
      _this.mouseY = e.screenY;
      var handler = null;
      if(_this.previewWithCtrl && !e.ctrlKey)
      {
        _this.cancelTimer();
        _this.popupWindow.setAttribute('LastPicAddr','');
        if(_this.autoHide)
          _this.popupWindow.hidePopup();
        return;
      }

      if(linkURL.search(/\.(bmp|gif|jpe?g|png)$/i) == -1)
      {
        if(!_this.imgurPicLoader.load(linkURL)) {
          _this.cancelTimer();
          _this.popupWindow.setAttribute('LastPicAddr','');
          if(_this.autoHide)
            _this.popupWindow.hidePopup();
        
          return;
        } else {
          handler = _this.imgurPicLoader;
        }
      }

      if(_this.popupWindow.getAttribute('LastPicAddr') == linkURL)
      {
        //update window pos
        if(_this.previewPosition==1 && _this.popupWindow.getAttribute('popupShow')=='1')
        {
          _this.setImageLocation();
        }
      }
      else
      {
        if(!_this.autoHide && _this.popupWindow.getAttribute('popupShow')=='1' ) {
          //
        } else {
          if(!handler)
            _this.showPicPreview(linkURL, linkURL);
        }
      }
    }
    else
    {
      _this.cancelTimer();
      _this.popupWindow.setAttribute('LastPicAddr','');
      if(_this.autoHide)
        _this.popupWindow.hidePopup();
    }
  },

  showPicPreview:function(linkUrl, picUrl) {
    this.popupWindow.hidePopup();
    while(this.previewArea.hasChildNodes()){
      this.previewArea.removeChild(this.previewArea.firstChild);
    }
    this.popupWindow.setAttribute('LastPicAddr', linkUrl);
    //this.popupWindow.setAttribute('TimerReady', 0);

    this.addImageToList(linkUrl, picUrl);

    //this.consoleService.logStringMessage("img.src: "+picUrl);

    if(this.previewDelay==0)
      this.resetTimer(1);
    else
      this.resetTimer(this.previewDelay);
  },

  onimgload: function(e) {
    var _this = EttImagePreview;
    var img = e.target;
    if(img.getAttribute('refSrc') == _this.popupWindow.getAttribute('LastPicAddr'))
    {
      _this.popupWindow.setAttribute('OrgImgWidth',img.width);
      _this.popupWindow.setAttribute('OrgImgHeight',img.height);    	
      var imgWidth = img.width;
      var imgHeight = img.height;
      var scale = 0;
      if(_this.previewHeight>0)
        scale = imgHeight / _this.previewHeight;
      if(scale > 1) {
        img.width = imgWidth / scale;
        img.height = imgHeight / scale;
        _this.info.value=imgWidth+' x '+imgHeight+' ('+ Math.floor(100 / scale) +'%)';
        //if(_this.displayInfo)
        //  _this.info.hidden=false;
      }
      else
      {
        _this.info.value=imgWidth+' x '+imgHeight+' (100%)';
        //_if(this.displayInfo)
        //  _this.info.hidden=false;
      }

      _this.popupWindow.setAttribute('Zoom',0);
      _this.popupWindow.setAttribute('FixImgWidth',img.width);
      _this.popupWindow.setAttribute('FixImgHeight',img.height);
      _this.popupWindow.setAttribute('ImgWidth',img.width);
      _this.popupWindow.setAttribute('ImgHeight',img.height);
      while(_this.previewArea.hasChildNodes()){
        _this.previewArea.removeChild(_this.previewArea.firstChild);
      }
      _this.previewArea.appendChild(img);
      if(_this.popupWindow.getAttribute('popupShow')=='1')
        _this.setImageLocation();
    }
    _this.removeFromList(img);
    //_this.consoleService.logStringMessage("urlList length: "+_this.urlList.length);

  },

  onimgerror: function(e) {
    //var _this = EttImagePreview;
    //_this.consoleService.logStringMessage("EttImagePreview: onimgerror");
  },

  removeFromList: function(img) {
    var temp = [];
    for(var i =0;i<this.urlList.length;++i)
    {
      var img = this.urlList.shift();
      if(img != img)
        temp.push(setting);
    }
    while(temp.length){
      this.urlList.push(temp.shift());
    }
  },

  addImageToList: function(linkUrl, picUrl) {
    for(var i =0;i<this.urlList.length;++i)
    {
      if(this.urlList[i].getAttribute('refSrc') == linkUrl)
      {
        //this.consoleService.logStringMessage("find src in list");
        return;
      }
    }
    var img = new Image();
    img.setAttribute('refSrc', linkUrl);
    img.addEventListener('load', this.onimgload, false);
    img.addEventListener('error', this.onimgerror, false);
    this.urlList.push(img);
    img.src = picUrl;
  },

  ImagePreviewLoad: function() {
    this.imgurPicLoader = new EttImgurPicLoader(this);
    this.info = document.getElementById("imagepreview-info");
    this.previewArea = document.getElementById("imagepreview-previewArea");
    this.imgLoading = document.getElementById("imagepreview-loading");
    this.imgLoading.firstChild.src='data:image/gif;base64,R0lGODlhEAAQALMMAKqooJGOhp2bk7e1rZ2bkre1rJCPhqqon8PBudDOxXd1bISCef///wAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQFAAAMACwAAAAAEAAQAAAET5DJyYyhmAZ7sxQEs1nMsmACGJKmSaVEOLXnK1PuBADepCiMg/DQ+/2GRI8RKOxJfpTCIJNIYArS6aRajWYZCASDa41Ow+Fx2YMWOyfpTAQAIfkEBQAADAAsAAAAABAAEAAABE6QyckEoZgKe7MEQMUxhoEd6FFdQWlOqTq15SlT9VQM3rQsjMKO5/n9hANixgjc9SQ/CgKRUSgw0ynFapVmGYkEg3v1gsPibg8tfk7CnggAIfkEBQAADAAsAAAAABAAEAAABE2QycnOoZjaA/IsRWV1goCBoMiUJTW8A0XMBPZmM4Ug3hQEjN2uZygahDyP0RBMEpmTRCKzWGCkUkq1SsFOFQrG1tr9gsPc3jnco4A9EQAh+QQFAAAMACwAAAAAEAAQAAAETpDJyUqhmFqbJ0LMIA7McWDfF5LmAVApOLUvLFMmlSTdJAiM3a73+wl5HYKSEET2lBSFIhMIYKRSimFriGIZiwWD2/WCw+Jt7xxeU9qZCAAh+QQFAAAMACwAAAAAEAAQAAAETZDJyRCimFqbZ0rVxgwF9n3hSJbeSQ2rCWIkpSjddBzMfee7nQ/XCfJ+OQYAQFksMgQBxumkEKLSCfVpMDCugqyW2w18xZmuwZycdDsRACH5BAUAAAwALAAAAAAQABAAAARNkMnJUqKYWpunUtXGIAj2feFIlt5JrWybkdSydNNQMLaND7pC79YBFnY+HENHMRgyhwPGaQhQotGm00oQMLBSLYPQ9QIASrLAq5x0OxEAIfkEBQAADAAsAAAAABAAEAAABE2QycmUopham+da1cYkCfZ94UiW3kmtbJuRlGF0E4Iwto3rut6tA9wFAjiJjkIgZAYDTLNJgUIpgqyAcTgwCuACJssAdL3gpLmbpLAzEQA7';
    this.imgError = document.getElementById("imagepreview-error");
    this.imgError.firstChild.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAnRJREFUeNpsU01ME0EUfjuzu2BKlraGGEqlNW2MqMSiXtBEuZjQgxdIBBNJTAwXuUgiXjxojEcT40E9qAe9SC+CXDh6QAN6IWKKyo9iSISmP2CBtLsz3fXN0i4b2pdMduZ973vz3vdmJcuyYL/dlmWvn5AunyzHQJIgw9jUmmnOPuM8tz9WcicYQeJxTXt8NBC4ftjvB0WWARBnuFZzOVjIZp9+SqXuveQ8W5XgrqLEzrW0jLW3toZZOg16NgsmYyCVA6mqAvV6YcE0k69WVi69Y2zNSTCMN19obp7tCAbD/5aWbKJzg7tcsSiFeVVNvk+nu95yniECiHo8t06GQuHs8jI09PRAx+YmeLq7gSMmUol9DH1aXx8YpRIcKRZPtNXV3XEqmIhENkKK4t1eX4fzGFixH/399vfY6Kjjm8Y2RCXzhvH3RqEQJUOyfPFQY6M3j30Lsb6VSRWim5xEjJdFPUhpoJfSs0QjRCKcQxGXKDc1OQlfXUkqJnwCY+W2FByvCdAk63jQUTTmEoxDtZXKxIqYogoxP5IzzT+ZQmGvNBTsjKvsip1Gnz8ed4TNYexPHKkt4hOf73ewVAqLwN58fk8wVF1YZyLh+MY1bbclw1i8r+un7DEu7uw82DJNO/PM4KAdMIXkVexZrI/lRF8QEzEbGDvH+SO8vCANKYoNNhDypk1RBqgk1XxAFRNtftb1ieeMXRHyuTEyrKqvI7J8zUNITfIWkucMY/wFYwN43LafuAu3Oikd+875tGFZTTidqFC+gKQMvr5fnH+YYWwkwflDdBehlmEFcFX8gbsXH7isqqGb9fXtuBfK0TilVZz/AgwAM0Qm2/mw9RoAAAAASUVORK5CYII=';
    this.popupWindow = document.getElementById("imagepreview-popup");
    this.popupWindow.addEventListener('DOMMouseScroll', EttImagePreview.mouse_scroll, false);
    this.popupWindow.addEventListener("click", EttImagePreview.mouse_click, false);    

    //this.popupWindow.setAttribute('LastPicAddr','');
    //this.popupWindow.setAttribute('TimerReady', 0);
    this.popupWindow.setAttribute('popupShow', '0');

    this.popupWindow.setAttribute('context', 'EttIP_contentAreaContextMenu');
    this.prefListener = new EttImagePreview.PrefListener('extensions.ettimagepreview.options.', function(branch, name) {EttImagePreview.onPrefChange(EttImagePreview, branch, name);});
    this.prefListener.register();
    gBrowser.mPanelContainer.addEventListener('mousemove', EttImagePreview.mouse_over, true);
    document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", EttImagePreview.contextMenuShowing, false);
    document.getElementById("contentAreaContextMenu").addEventListener("popuphidden", EttImagePreview.contextMenuHidden, false);    
  },

  ImagePreviewUnload: function(_this) {
    gBrowser.mPanelContainer.removeEventListener('mousemove', _this.mouse_over, true);
    document.getElementById("contentAreaContextMenu").removeEventListener("popupshowing", EttImagePreview.contextMenuShowing, false);
    document.getElementById("contentAreaContextMenu").removeEventListener("popuphidden", EttImagePreview.contextMenuHidden, false);    
    this.popupWindow.removeEventListener('DOMMouseScroll', EttImagePreview.mouse_scroll, false);
    this.popupWindow.addEventListener("click", EttImagePreview.mouse_click, false);    
    _this.cancelTimer();
    _this.prefListener.unregister();
  },

  PrefListener: function (branchName, func) {
    var prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
    var branch = prefService.getBranch(branchName);
    branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
    this.register = function() {
      branch.addObserver("", this, false);
      branch.getChildList("", { })
            .forEach(function (name) { func(branch, name); });
    };
    this.unregister = function unregister() {
      if (branch)
        branch.removeObserver("", this);
    };
    this.observe = function(subject, topic, data) {
      if (topic == "nsPref:changed")
        func(branch, data);
    };
  },

  setImageLocation: function(lastPopup) {
    var width;
    var height;

    if(this.previewArea.hasChildNodes())
    {
      if(this.displayInfo)
        this.info.hidden=false;
      else
        this.info.hidden=true;
      this.previewArea.style.display = "block";
      this.imgLoading.style.display = "none";
      width = parseFloat(this.popupWindow.getAttribute('ImgWidth'));
      height = parseFloat(this.popupWindow.getAttribute('ImgHeight'));
      this.popupWindow.style.width  =  width + 13+ "px";
      this.popupWindow.style.height = height+ 10 + "px";
      //this.consoleService.logStringMessage("this.popupWindow.style.width = " + this.popupWindow.style.width);
      //this.consoleService.logStringMessage("this.popupWindow.style.height = " + this.popupWindow.style.height);
    }
    else
    {
      //this.consoleService.logStringMessage("this.imgLoading.style.display = block");
      this.popupWindow.style.width  = "36px";
      this.popupWindow.style.height = "36px";
      this.previewArea.style.display = "none";
      this.imgLoading.style.display = "block";
      this.info.hidden=true;   
      width = 36+13;
      height = 36+10;
      //do nothing
    }
    var x;
    var y;
    
    if(lastPopup)
    {
      x = parseFloat(this.popupWindow.getAttribute('popupX'));
      y = parseFloat(this.popupWindow.getAttribute('popupY'));    	
    }
    else
    {
	    if(this.previewPosition==0)
	    {
	      x=window.screen.left + ((window.screen.width - width)/2);
	      y=window.screen.top + ((window.screen.height -height)/2);
	    }
	    else
	    {
	      x=this.mouseX+15;
	      y=this.mouseY+15;
	    }
    }
    //this.consoleService.logStringMessage("openPopupAtScreen");
    if(this.popupWindow.getAttribute('popupShow')=='1')
      this.popupWindow.hidePopup();
    this.popupWindow.setAttribute('popupX',x);
    this.popupWindow.setAttribute('popupY',y);
    this.popupWindow.sizeTo( parseFloat(this.popupWindow.style.width), parseFloat(this.popupWindow.style.height) );
    this.popupWindow.openPopupAtScreen(x,y);
  },

  getStyleValue: function(s) {
            var pos = s.lastIndexOf("px");
            if(pos != -1) {
                return s.substring(0,pos);
            }
            else return 0;
  },

  previewHiding: function(event) {
    this.popupWindow.setAttribute('popupShow','0');
  },

  previewShown: function(event) {
    this.popupWindow.setAttribute('popupShow','1');
  },

  getTimer: function(repeat, func_obj, timelimit) {
    var timer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
    timer.initWithCallback(
       { notify: function(timer) { func_obj(); } },
       timelimit,
       repeat  ? Components.interfaces.nsITimer.TYPE_REPEATING_SLACK
               : Components.interfaces.nsITimer.TYPE_ONE_SHOT);
    return timer;
  },

  cancelTimer: function() {
    if(this.popupTimer)
    {
      this.popupTimer.cancel();
      this.popupTimer = null;
    }
  },

  resetTimer: function(delay) {
    this.cancelTimer();

    var _this=this;
    var func=function() {
      _this.popupTimer=null;
      _this.setImageLocation();
    }
    this.popupTimer = this.getTimer(false, func, delay);
  },
  
  openURL: function(url, bg) {
      var doc = gBrowser.contentDocument;
      this.checkURL(url, doc);
      var charset = gBrowser.contentDocument.characterSet;
      var referer = makeURI(doc.location.href);
      gBrowser.loadOneTab(url, referer, charset, null, bg, false);
  },

  checkURL: function(aURL, aDoc, aFlags) {
    urlSecurityCheck(aURL, aDoc.nodePrincipal, aFlags);
  },
  
  saveimage: function(e) {
    this.saveMedia(e);
  },

  saveMedia: function(e) {
    var targetNode = this.previewArea.firstChild;
    var doc =  targetNode.ownerDocument;
    var mediaURL = targetNode.currentURI.spec;
      urlSecurityCheck(mediaURL, doc.nodePrincipal);
      saveImageURL(mediaURL, null, "SaveImageTitle", false, false, doc.documentURIObject, doc);
  },

  sendMedia: function() {
    var mediaURL = this.previewArea.firstChild.currentURI.spec;
    MailIntegration.sendMessage(mediaURL, "");
  },

  setDesktopBackground: function() {
    var targetNode = this.previewArea.firstChild;
    var doc = targetNode.ownerDocument;
    var mediaURL = targetNode.currentURI.spec;
    urlSecurityCheck(mediaURL, doc.nodePrincipal);

    const kDesktopBackgroundURL = "chrome://browser/content/setDesktopBackground.xul";

    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
    var dbWin = wm.getMostRecentWindow("Shell:SetDesktopBackground");
    if (dbWin) {
      dbWin.gSetBackground.init(targetNode);
      dbWin.focus();
    }
    else {
      openDialog(kDesktopBackgroundURL, "", "centerscreen,chrome,dialog=no,dependent,resizable=no", targetNode);
    }
  },

  viewImageInfo: function() {
    var targetNode = this.previewArea.firstChild;
    BrowserPageInfo(targetNode.ownerDocument.defaultView.top.document, "mediaTab", targetNode);
  },

  copyMediaLocation: function(e) {
    var clipboard = Components.classes["@mozilla.org/widget/clipboardhelper;1"].getService(Components.interfaces.nsIClipboardHelper);
    var mediaURL = this.previewArea.firstChild.currentURI.spec;
    clipboard.copyString(mediaURL, document);
  },
    
  viewimage: function(event) {
    //The event may be a mouse event (click, double-click, middle-click) or keypress event (enter).
    //some problem to work with tabkit...
    var targetNode = this.previewArea.firstChild;
    var e = event;
    var evt = e.view.document.createEvent("MouseEvents");
    evt.initMouseEvent(event.type, e.bubbles, e.cancelable, e.view, e.detail,
      e.screenX, e.screenY, e.clientX, e.clientY,
      true, e.altKey, e.shiftKey, e.metaKey, e.button, e.relatedTarget);
    if(gContextMenu) {
      gContextMenu.viewMedia(evt);
    } else {
      var mediaURL = this.previewArea.firstChild.currentURI.spec;
      //this.consoleService.logStringMessage("mediaURL = " + mediaURL);
      urlSecurityCheck(mediaURL,
                       gBrowser.contentPrincipal,
                       Components.interfaces.nsIScriptSecurityManager.DISALLOW_SCRIPT);
      var doc = targetNode.ownerDocument;
      openUILink(mediaURL, evt, { disallowInheritPrincipal: true, referrerURI: doc.documentURIObject });
      // var contextMenu = new nsContextMenu();
      // contextMenu.viewMedia(evt);
      // contextMenu = null;
      this.popupWindow.hidePopup();
    }
    return;
  },

  onPrefChange: function(_this, branch, name) {
    try {
      switch (name) {
        case "previewHeight":
          _this.previewHeight = branch.getIntPref(name);
          if(_this.popupWindow)
            _this.popupWindow.setAttribute('LastPicAddr','')
          break;
        case "previewWithCtrl":
          _this.previewWithCtrl = branch.getBoolPref(name);
          break;
        case "previewPosition":
          _this.previewPosition = branch.getIntPref(name);
          break;
        case "previewDelay":
          _this.previewDelay = branch.getIntPref(name);
          break;
        case "autoHide":
          _this.autoHide = branch.getBoolPref(name);
          break;
        case "displayInfo":
          _this.displayInfo = branch.getBoolPref(name);
          break;
        case "leftButtonClick":
          _this.leftButtonClick = branch.getIntPref(name);
          break;
        case "middleButtonClick":
          _this.middleButtonClick = branch.getIntPref(name);
          break;
      }
    } catch(e) {
      // eats all errors
      return;
    }
  }
}

window.addEventListener("load", function () { EttImagePreview.ImagePreviewLoad(EttImagePreview); }, false);
window.addEventListener("unload", function () { EttImagePreview.ImagePreviewUnload(EttImagePreview); }, false);