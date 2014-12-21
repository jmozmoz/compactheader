/*# -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1/GPL 2.0/LGPL 2.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Original Code is Mozilla Communicator client code, released
# March 31, 1998.
#
# The Initial Developer of the Original Code is
# Netscape Communications Corporation.
# Portions created by the Initial Developer are Copyright (C) 1998-1999
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#   Joachim Herb <joachim.herb@gmx.de>
#
# Alternatively, the contents of this file may be used under the terms of
# either the GNU General Public License Version 2 or later (the "GPL"), or
# the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
# in which case the provisions of the GPL or the LGPL are applicable instead
# of those above. If you wish to allow use of your version of this file only
# under the terms of either the GPL or the LGPL, and not to allow others to
# use your version of this file under the terms of the MPL, indicate your
# decision by deleting the provisions above and replace them with the notice
# and other provisions required by the GPL or the LGPL. If you do not delete
# the provisions above, a recipient may use your version of this file under
# the terms of any one of the MPL, the GPL or the LGPL.
#
# ***** END LICENSE BLOCK *****
*/

//Components.utils.import("chrome://CompactHeader/content/debug.jsm");

if(org === "undefined" || !org) var org = {};
if(!org.mozdev) org.mozdev={};
if(!org.mozdev.compactHeader) org.mozdev.compactHeader = {};


org.mozdev.compactHeader.toolbar = function() {
  var pub = {};

  var cohePrefBranch = Components.classes["@mozilla.org/preferences-service;1"]
                                          .getService(Components.interfaces.nsIPrefService)
                                          .getBranch("extensions.CompactHeader.");

  var gToolboxes = [
    {pos:"top",   id:"CompactHeader_collapsed2LButtonBox", orient:"horizontal", header:"compact"},
    {pos:"top",   id:"expandedBoxSpacer",                  orient:"horizontal", header:"expanded"},
    {pos:"left",  id:"CompactHeader_leftSidebar_dummy",    orient:"vertical"},
    {pos:"right", id:"CompactHeader_rightSidebar_dummy",   orient:"vertical"},
    {pos:"none",  id:"",                                   orient:""},
  ];

  pub.cannotMoveToolbox = function() {
    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
      .getService(Components.interfaces.nsIXULAppInfo);
    var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
      .getService(Components.interfaces.nsIVersionComparator);
    return (versionChecker.compare(appInfo.version, "10.0a2") < 0)
  };

  function getToolbarTarget(targetPos, targetHeader) {
    //targetPos = targetPos.replace('hdrToolbox.pos.', '');
    if (pub.cannotMoveToolbox()) {
      targetPos = "top";
    }
    for (let i = 0; i < gToolboxes.length; i++) {
      if ((targetPos == gToolboxes[i].pos) &&
          ((gToolboxes[i].header == null) || (targetHeader == gToolboxes[i].header))
          ) {
        return gToolboxes[i];
      }
    }
    org.mozdev.compactHeader.debug.log("orient failed " + targetPos + " " + targetHeader,
      org.mozdev.compactHeader.debug.LOGLEVEL.warn);
    return null;
  }



  pub.fillToolboxPalette = function () {
    org.mozdev.compactHeader.debug.log("fillToolboxPalette start");
    removeButtonDispMUA();
    var hdrToolbar = document.getElementById("header-view-toolbar");
    var hdrToolbox = document.getElementById("header-view-toolbox");
    var buttons = ["button-reply", "button-replyall", "button-replylist",
                   "button-tag", "button-forward", "button-archive", "button-file",
                   "button-print", "button-mark", "CompactHeader_button-starMessages",
                   "button-newmsg", "button-goback", "button-goforward",
                   "button-previous", "button-next", "button-compact",
                   "button-address", "button-stop", "button-getmsg",
                   "button-getPartialMessages",
                   "stylish-toolbar-button",
                   "button-enigmail-decrypt",
                   // support for https://addons.mozilla.org/thunderbird/addon/buttons/
                   "RealPreviousMessage", "RealNextMessage", "SelectSMTP",
                   "ToggleHTML", "ToggleImages", "bDeleteThread",
                   "mailredirect-toolbarbutton",
                   // support for https://addons.mozilla.org/thunderbird/addon/realprevnextbuttons/
                   //"realPrevMessageButton", "realNextMessageButton",
                   "lightningbutton-convert-to-task",
                   "lightningbutton-convert-to-event",
                   "CompactHeader_button-dispMUA"];
    var currentSet=hdrToolbar.getAttribute("currentset");
    hdrToolbar.currentSet = currentSet;
    for (var i=0; i<buttons.length; i++) {
      var buttonName = buttons[i];
      var button = document.getElementById(buttonName) ||
          document.getElementById("mail-toolbox").palette.getElementsByAttribute("id", buttonName)[0];
      if (button) {
        var hdrButton = button.cloneNode(true);
        if (hdrButton) {
          if (hdrButton.localName == "toolbaritem") {
            var subButtons = hdrButton.querySelectorAll(".toolbarbutton-1");
            for (var j=0; j<subButtons.length; j++) {
//              addClass(subButtons[j], "msgHeaderView-button-out");
              addClass(subButtons[j], "msgHeaderView-button");
            }
          } else {
            if (hdrButton.type != "menu-button") {
              addClass(hdrButton, "msgHeaderView-button");
            } else {
//              addClass(hdrButton, "msgHeaderView-button-out");
              addClass(hdrButton, "msgHeaderView-button");
            }
          }
          //hdrButton.id = "hdr" + hdrButton.id;
          hdrToolbox.palette.appendChild(hdrButton);
  /*        var bStyle = document.defaultView.getComputedStyle(button, null);
          hdrButton.style.listStyleImage = bStyle.listStyleImage;*/
        }
        if (currentSet.indexOf(buttonName)>=0) {
          var result = hdrToolbar.insertItem(hdrButton.id);
          currentSet = hdrToolbar.getAttribute("currentset");
          hdrToolbar.currentSet = currentSet;
        }
      }
    org.mozdev.compactHeader.debug.log("fillToolboxPalette stop");
    };

    var buttonsRemove = ["hdrForwardButton", "hdrArchiveButton",
                         "hdrReplyToSenderButton"];//, "hdrReplyButton",
                         //"hdrReplyAllButton", "hdrReplyListButton"];
    for (var i=0; i<buttonsRemove.length; i++) {
      var buttonName = buttonsRemove[i];
      var button = document.getElementById(buttonName) ||
          document.getElementById("header-view-toolbox").palette.getElementsByAttribute("id", buttonName)[0];
      if (button) {
        button.setAttribute("collapsed", "true");
      }
    }
    org.mozdev.compactHeader.debug.log("fillToolboxPalette stop");
  };

  pub.setButtonStyle = function() {
    org.mozdev.compactHeader.debug.log("setButtonStyle start");
    var hdrToolbar = document.getElementById("header-view-toolbar");
    var hdrToolbox = document.getElementById("header-view-toolbox");
    var buttons1 = Array.prototype.slice.call(hdrToolbar.querySelectorAll("toolbarbutton"));
    var buttons2 = Array.prototype.slice.call(hdrToolbox.palette.querySelectorAll("toolbarbutton"));
    var buttons = buttons1.concat(buttons2);
    for (var i=0; i<buttons.length; i++) {
      var button = buttons[i];
      if (button) {
        addClass(button, "customize-header-toolbar-button");
        addClass(button, "customize-header-toolbar-" + button.id)
        if (flatButtons()) {
          if (button.type != "menu-button") {
            addClass(button, "msgHeaderView-flat-button");
          } else {
            removeClass(button, "msgHeaderView-flat-button");
            removeClass(button, "msgHeaderView-button");
            removeClass(button, "msgHeaderView-button-out");
            addClass(button,    "msgHeaderView-flat-button-out");
          }
        } else {
          if (button.type != "menu-button") {
            removeClass(button, "msgHeaderView-flat-button");
          } else {
            removeClass(button, "msgHeaderView-flat-button");
            removeClass(button, "msgHeaderView-button");
            removeClass(button, "msgHeaderView-flat-button-out");
//            addClass(button,    "msgHeaderView-button-out");
            addClass(button,    "msgHeaderView-button");
          }
        }
      }
    }

    org.mozdev.compactHeader.debug.log("setButtonStyle start 1");

    var buttons1 = Array.prototype.slice.call(hdrToolbar.querySelectorAll("toolbaritem"));
    var buttons2 = Array.prototype.slice.call(hdrToolbox.palette.querySelectorAll("toolbaritem"));
    var buttons = buttons1.concat(buttons2);
    for (var i=0; i<buttons.length; i++) {
      var button = buttons[i];
      if (button) {
        addClass(button, "customize-header-toolbar-button");
        addClass(button, "customize-header-toolbar-" + button.id)
        if (flatButtons()) {
          removeClass(button, "msgHeaderView-button-out-item");
          addClass(button,    "msgHeaderView-flat-button-out-item");
        } else {
          removeClass(button, "msgHeaderView-flat-button-out-item");
          addClass(button,    "msgHeaderView-button-out-item");
        }
      }
    }

    org.mozdev.compactHeader.debug.log("setButtonStyle stop");
  };

  function moveToolbox(aHeaderViewMode, cBoxId, orient) {
    org.mozdev.compactHeader.debug.log("toolbar toggle start headermode: " + aHeaderViewMode +
      " cBoxId: " + cBoxId + " orien: " + orient);
    var hdrToolbox = document.getElementById("header-view-toolbox");
    var hdrToolbar = document.getElementById("header-view-toolbar");
    var firstPermanentChild = hdrToolbar.firstPermanentChild;
    var lastPermanentChild = hdrToolbar.lastPermanentChild;
    if (aHeaderViewMode) {
      var cBox = document.getElementById(cBoxId);
      if ((cBox) && (cBox.parentNode.id != hdrToolbox.parentNode.id)) {
        var cloneToolboxPalette;
        var cloneToolbarset;
        if (hdrToolbox.palette) {
          cloneToolboxPalette = hdrToolbox.palette.cloneNode(true);
        }
        if (hdrToolbox.toolbarset) {
          cloneToolbarset = hdrToolbox.toolbarset.cloneNode(true);
        }
        cBox.parentNode.insertBefore(hdrToolbox, cBox);
        hdrToolbox.palette  = cloneToolboxPalette;
        hdrToolbox.toolbarset = cloneToolbarset;
        hdrToolbar = document.getElementById("header-view-toolbar");
        hdrToolbar.firstPermanentChild = firstPermanentChild;
        hdrToolbar.lastPermanentChild = lastPermanentChild;
      }
    } else {
      cBox = document.getElementById(cBoxId);
      if ((cBox) && (cBox.parentNode.id != hdrToolbox.parentNode.id)) {
        var cloneToolboxPalette;
        var cloneToolbarset;
        if (hdrToolbox.palette) {
          cloneToolboxPalette = hdrToolbox.palette.cloneNode(true);
        }
        if (hdrToolbox.toolbarset) {
          cloneToolbarset = hdrToolbox.toolbarset.cloneNode(true);
        }
        cBox.parentNode.insertBefore(hdrToolbox, cBox);
        hdrToolbox.palette = cloneToolboxPalette;
        hdrToolbox.toolbarset = cloneToolbarset;
        hdrToolbar = document.getElementById("header-view-toolbar");
        hdrToolbar.firstPermanentChild = firstPermanentChild;
        hdrToolbar.lastPermanentChild = lastPermanentChild;
      }
    }
    pub.onChangeDispMUAicon();
    hdrToolbar.setAttribute("orient", orient);
    org.mozdev.compactHeader.debug.log("toolbar toggle stop");
  };

  pub.dispMUACheck = function() {
    org.mozdev.compactHeader.debug.log("dispMUACheck start");
    var dispMUAButton = document.getElementById("CompactHeader_button-dispMUA");
    var dispMUABox = document.getElementById("dispMUA");
    if (dispMUABox) {
      hideDispMUABox(dispMUABox);
      var IconContainerDispMUA = null;
      if (dispMUAButton) {
        /* expanded view 48 * 48 */
        IconContainerDispMUA = document.getElementById("CompactHeader_dispMUAiconExp");
        if (IconContainerDispMUA) {
          IconContainerDispMUA.setAttribute("collapsed", "true");
        }
        /* two line view 32 * 32 */
        IconContainerDispMUA = document.getElementById("CompactHeader_dispMUAicon2line")
        if (IconContainerDispMUA) {
          IconContainerDispMUA.setAttribute("collapsed", "true");
        }
        /* compact view 24 * 24 */
        IconContainerDispMUA = document.getElementById("CompactHeader_dispMUAiconCompact")
        if (IconContainerDispMUA) {
          IconContainerDispMUA.setAttribute("collapsed", "true");
        }
      }
      else if (dispMUABox){
        /* expanded view 48 * 48 */
        IconContainerDispMUA = document.getElementById("CompactHeader_dispMUAiconExp")
        if (IconContainerDispMUA) {
          IconContainerDispMUA.removeAttribute("collapsed");
        }
        if (cohePrefBranch.getBoolPref("headersize.twolineview")) {
          /* two line view 32 * 32 */
          IconContainerDispMUA = document.getElementById("CompactHeader_dispMUAicon2line")
          if (IconContainerDispMUA)
            IconContainerDispMUA.removeAttribute("collapsed");
          IconContainerDispMUA = document.getElementById("CompactHeader_dispMUAiconCompact")
          if (IconContainerDispMUA)
            IconContainerDispMUA.setAttribute("collapsed", "true");
        }
        else {
          /* compact view 24 * 24 */
          IconContainerDispMUA = document.getElementById("CompactHeader_dispMUAiconCompact")
          if (IconContainerDispMUA)
            IconContainerDispMUA.removeAttribute("collapsed");
          IconContainerDispMUA = document.getElementById("CompactHeader_dispMUAicon2line")
          if (IconContainerDispMUA)
            IconContainerDispMUA.setAttribute("collapsed", "true");
        }
      }
    }
    else {
      var IconContainerDispMUA = null;
      /* expanded view 48 * 48 */
      IconContainerDispMUA = document.getElementById("CompactHeader_dispMUAiconExp")
      if (IconContainerDispMUA) {
        IconContainerDispMUA.setAttribute("collapsed", "true");
      }
      /* two line view 32 * 32 */
      IconContainerDispMUA = document.getElementById("CompactHeader_dispMUAicon2line")
      if (IconContainerDispMUA) {
        IconContainerDispMUA.setAttribute("collapsed", "true");
      }
      /* compact view 24 * 24 */
      IconContainerDispMUA = document.getElementById("CompactHeader_dispMUAiconCompact")
      if (IconContainerDispMUA) {
        IconContainerDispMUA.setAttribute("collapsed", "true");
      }
    }
    org.mozdev.compactHeader.debug.log("dispMUACheck stop");
  };

  pub.onChangeDispMUAicon = function() {
    org.mozdev.compactHeader.debug.log("onChangeDispMUAicon start");
    var dispMUAbroadcast = document.getElementById("dispMUAbroadcast")
    if (dispMUAbroadcast) {
      var imageSrc = dispMUAbroadcast.getAttribute("src");
      org.mozdev.compactHeader.debug.log("onChangeDispMUAicon: " + imageSrc);
      var IconContainerDispMUA = null;
      /* toolbar button */
      IconContainerDispMUA = document.getElementById("CompactHeader_button-dispMUA")
      if (IconContainerDispMUA) {
        IconContainerDispMUA.setAttribute("image", imageSrc);
      }
    }
    org.mozdev.compactHeader.debug.log("onChangeDispMUAicon stop");
  };

  function hideDispMUABox(dispMUABox) {
    org.mozdev.compactHeader.debug.log("hideDispMUABox start");
    dispMUABox.setAttribute("collapsed", "true"); // hide original
    var dispMUAicon = document.getElementById("dispMUAicon");
    var messengerWindow = document.getElementById("messengerWindow");
    if (dispMUAicon && messengerWindow && dispMUAicon.localName == "image") {
      org.mozdev.compactHeader.debug.log("hideDispMUABox 1");
      var broadcasterset = document.createElement("broadcasterset");
      messengerWindow.appendChild(broadcasterset);
      org.mozdev.compactHeader.debug.log("hideDispMUABox 2");
      dispMUAicon.parentNode.removeChild(dispMUAicon);
      org.mozdev.compactHeader.debug.log("hideDispMUABox 3");
      var dispMUAbroadcast = document.createElement("broadcaster");
      org.mozdev.compactHeader.debug.log("hideDispMUABox 4");
      dispMUAbroadcast.id = "dispMUAicon";
      //dispMUAbroadcast.setAttribute("src", "");
      dispMUAbroadcast.setAttribute("tooltiptext", "");
      org.mozdev.compactHeader.debug.log("hideDispMUABox 5");
      broadcasterset.appendChild(dispMUAbroadcast);
      org.mozdev.compactHeader.debug.log("hideDispMUABox 6");
    }
    org.mozdev.compactHeader.debug.log("hideDispMUABox stop");
  };

  function removeButtonDispMUA() {
    org.mozdev.compactHeader.debug.log("removeButtonDispMUA start");
    if (!document.getElementById("dispMUA")) {
      var button = document.getElementById("CompactHeader_button-dispMUA");
      if (button) {
        button.parentNode.removeChild(button);
      }

      var button1 = document.getElementById("mail-toolbox").palette.
                             getElementsByAttribute("id", "CompactHeader_button-dispMUA")[0];
      if (button1) {
        button1.parentNode.removeChild(button1);
      }

      var button2 = document.getElementById("header-view-toolbox").palette.
                             getElementsByAttribute("id", "CompactHeader_button-dispMUA")[0];
      if (button2) {
        button2.parentNode.removeChild(button2);
      }
    }
    org.mozdev.compactHeader.debug.log("removeButtonDispMUA stop");
  };

  function addClass(el, strClass) {
    var testnew = new RegExp('\\b'+strClass+'\\b').test(el.className);
    if (!testnew) {
      el.className += el.className?' '+strClass:strClass;
    }
  };

  function removeClass(el, strClass) {
    var str = new RegExp('(\\s|^)'+strClass+'(\\s|$)', 'g');
    el.className = el.className.replace(str, ' ');
  };

  function flatButtons() {
    var result = cohePrefBranch.getBoolPref("headersize.flatButtons");
    if (navigator.appVersion.indexOf("Win")!=-1) {
      result = false;
    }
    return result;
  };

  pub.CHTUpdateReplyButton = function () {
    UpdateReplyButtons();
  };

  pub.CHTUpdateJunkButton = function () {
    UpdateJunkButton();
  };

  pub.CHTSetDefaultButtons = function () {
    var hdrToolbox = document.getElementById("header-view-toolbox");
    var hdrToolbar = document.getElementById("header-view-toolbar");
    var hdrBarDefaultSet = hdrToolbar.getAttribute("defaultset");
    var hdrBoxDefaultLabelalign = hdrToolbox.getAttribute("defaultlabelalign");
    var hdrBoxDefaultIconsize = hdrToolbox.getAttribute("defaulticonsize");
    var hdrBoxDefaultMode = hdrToolbox.getAttribute("defaultmode");
    var hdrBarDefaultIconsize = hdrToolbar.getAttribute("defaulticonsize");
    var hdrBarDefaultMode = hdrToolbar.getAttribute("defaultmode");

    hdrToolbox.setAttribute("labelalign", hdrBoxDefaultLabelalign);
    hdrToolbox.setAttribute("iconsize", hdrBoxDefaultIconsize);
    hdrToolbox.setAttribute("mode", hdrBoxDefaultMode);
    hdrToolbar.setAttribute("iconsize", hdrBarDefaultIconsize);
    hdrToolbar.setAttribute("mode", hdrBarDefaultMode);

    hdrToolbar.currentSet = hdrBarDefaultSet;
    hdrToolbar.setAttribute("currentset", hdrBarDefaultSet);

    document.persist(hdrToolbox.id,"labelalign");
    document.persist(hdrToolbox.id,"iconsize");
    document.persist(hdrToolbox.id,"mode");
    document.persist(hdrToolbar.id,"iconsize");
    document.persist(hdrToolbar.id,"mode");
    document.persist(hdrToolbar.id,"currentset");
  };

  pub.CHTCleanupButtons = function() {
    var hdrToolbox = document.getElementById("header-view-toolbox");
    var hdrToolbar = document.getElementById("header-view-toolbar");
    var hdrBarDefaultSet = "hdrReplyToSenderButton,hdrSmartReplyButton,hdrForwardButton,hdrArchiveButton,hdrJunkButton,hdrTrashButton";

    hdrToolbox.setAttribute("labelalign", "end");
    hdrToolbox.setAttribute("iconsize", "small");
    hdrToolbox.setAttribute("mode", "full");

    hdrToolbar.setAttribute("iconsize", "small");
    hdrToolbar.setAttribute("mode", "full");
    hdrToolbar.currentSet = hdrBarDefaultSet;
    hdrToolbar.setAttribute("currentset", hdrBarDefaultSet);

    document.persist(hdrToolbox.id,"labelalign");
    document.persist(hdrToolbox.id,"iconsize");
    document.persist(hdrToolbox.id,"mode");
    document.persist(hdrToolbar.id,"iconsize");
    document.persist(hdrToolbar.id,"mode");
    document.persist(hdrToolbar.id,"currentset");
  };

  pub.populateEmptyToolbar = function() {
    org.mozdev.compactHeader.debug.log("start populateEmptyToolbar");
    var hdrToolbar = document.getElementById("header-view-toolbar");
    if (hdrToolbar) {
      org.mozdev.compactHeader.debug.log("populateEmptyToolbar 1");
      if (hdrToolbar.currentSet == "__empty") {
        org.mozdev.compactHeader.debug.log("populateEmptyToolbar 2");
        pub.CHTSetDefaultButtons();
      }
    }
    org.mozdev.compactHeader.debug.log("stop populateEmptyToolbar");
  };

  pub.onDoCustomizationHeaderViewToolbox = function(event) {
    org.mozdev.compactHeader.debug.log("onDoCustomizationHeaderViewToolbox start" + event);
    org.mozdev.compactHeader.toolbar.CHTUpdateReplyButton();
    org.mozdev.compactHeader.toolbar.CHTUpdateJunkButton();
    org.mozdev.customizeHeaderToolbar.messenger.saveToolboxData();
    org.mozdev.compactHeader.toolbar.dispMUACheck();
    org.mozdev.compactHeader.buttons.coheToggleStar();
    var dispMUAicon = document.getElementById("dispMUAicon");
    if (dispMUAicon) {
      org.mozdev.compactHeader.toolbar.onChangeDispMUAicon();
    }
    org.mozdev.compactHeader.debug.log("onDoCustomizationHeaderViewToolbox done");
  };

  var setToolboxRunning = false;
  var currentToolboxPosition;
  var currentToolboxType;
  var currentHeaderViewMode;

  pub.setCurrentToolboxPosition = function(aHeaderViewMode) {
    var targetType = "single";
    if (setToolboxRunning) {
      org.mozdev.compactHeader.debug.log("setCurrentToolboxPosition is running");
      return;
    }
    setToolboxRunning = true;

    org.mozdev.compactHeader.debug.log("setCurrentToolboxPosition start");

    var singleMessage = document.getElementById("singlemessage");
    var targetPos = cohePrefBranch.getCharPref("toolbox.position");
    var multiMessage = document.getElementById("multimessage");
    var multiBBox;

    if (singleMessage && singleMessage.getAttribute("hidden")) {
      targetType = "multi";
    }

    org.mozdev.compactHeader.debug.log("setCurrentToolboxPosition 1");

    if ((currentToolboxPosition == targetPos) &&
        (currentToolboxType == targetType) &&
        (currentHeaderViewMode == aHeaderViewMode) &&
        (targetType == "single")) {
      org.mozdev.compactHeader.debug.log("curPos: " + currentToolboxPosition + " targetPos: " + targetPos);
      org.mozdev.compactHeader.debug.log("curType: " + currentToolboxType + " targetType: " + targetType);
      org.mozdev.compactHeader.debug.log("setCurrentToolboxPosition does not need to change position/type");
      setToolboxRunning = false;
      return;
    }

    org.mozdev.compactHeader.debug.log("setCurrentToolboxPosition 2");

    currentToolboxPosition = targetPos;
    currentToolboxType = targetType;
    currentHeaderViewMode = aHeaderViewMode;

    org.mozdev.compactHeader.debug.log("setCurrentToolboxPosition 3");

    if (multiMessage){
      org.mozdev.compactHeader.debug.log("multiMessage " + multiMessage);
      try {
        multiBBox = multiMessage.contentDocument.getElementById("header-view-toolbox");
        org.mozdev.compactHeader.debug.log("setCurrentToolboxPosition have multiMessage.contentDocument");
      }
      catch (e) {
        org.mozdev.compactHeader.debug.log("setCurrentToolboxPosition no multiMessage.contentDocument " + e);
      }
    }

    org.mozdev.compactHeader.debug.log("setCurrentToolboxPosition mid 0");

    var hdrViewToolbox = document.getElementById("header-view-toolbox");
    if (!hdrViewToolbox) {
      org.mozdev.compactHeader.debug.log("no header-view-toolbox!",
        org.mozdev.compactHeader.debug.LOGLEVEL.warn);
      setToolboxRunning = false;
      return;
    }

    org.mozdev.compactHeader.debug.log("setCurrentToolboxPosition mid 1");

    if (targetPos == "none") {
      hdrViewToolbox.setAttribute("collapsed", "true");
      if (multiBBox) {
        multiBBox.setAttribute("collapsed", "true");
      }
      org.mozdev.compactHeader.debug.log("none stop");
      setToolboxRunning = false;
      return;
    }
    else {
      hdrViewToolbox.removeAttribute("collapsed");
      if (multiBBox) {
        multiBBox.removeAttribute("collapsed");
      }
    }

    org.mozdev.compactHeader.debug.log("setCurrentToolboxPosition mid 2");

    if (multiBBox) {
      multiBBox.removeAttribute("collapsed");
    }

    if (singleMessage && singleMessage.getAttribute("hidden")) {
      // The multi message view is visible
      org.mozdev.compactHeader.debug.log("move to multibuttonhbox");
      var targetToolbox = getToolbarTarget(targetPos, "");
      org.mozdev.compactHeader.debug.log("move to multibuttonhbox 1");
      if (multiBBox) {
        if (targetPos != "top") {
          org.mozdev.compactHeader.debug.log("x multiBBox: "+multiBBox);
          multiBBox.setAttribute("collapsed", "true");
          hdrViewToolbox.removeAttribute("collapsed");
        } else {
          org.mozdev.compactHeader.debug.log("x multiBBox: "+multiBBox);
          multiBBox.removeAttribute("collapsed");
          hdrViewToolbox.setAttribute("collapsed", "true");
        }
      }
      if (targetToolbox) {
        moveToolbox(aHeaderViewMode, targetToolbox.id, targetToolbox.orient);
      }
    }
    else {
      // The single message view is visible
      org.mozdev.compactHeader.debug.log("move to singlemessage");
      var targetToolbox;
      if (aHeaderViewMode) {
        org.mozdev.compactHeader.debug.log("setCurrentToolboxPosition aHeaderViewMode");
        targetToolbox = getToolbarTarget(targetPos, "compact");
      }
      else {
        org.mozdev.compactHeader.debug.log("setCurrentToolboxPosition no aHeaderViewMode");
        targetToolbox = getToolbarTarget(targetPos, "expanded");
      }
      if (targetToolbox) {
        moveToolbox(aHeaderViewMode, targetToolbox.id, targetToolbox.orient);
      }
    }
    org.mozdev.compactHeader.debug.log("setCurrentToolboxPosition stop");
    setToolboxRunning = false;
  }


  return pub;
}();
