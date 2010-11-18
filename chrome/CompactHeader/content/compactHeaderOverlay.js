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

/* This is where functions related to displaying the headers for a selected message in the
   message pane live. */

////////////////////////////////////////////////////////////////////////////////////
// Warning: if you go to modify any of these JS routines please get a code review from
// scott@scott-macgregor.org. It's critical that the code in here for displaying
// the message headers for a selected message remain as fast as possible. In particular,
// right now, we only introduce one reflow per message. i.e. if you click on a message in the thread
// pane, we batch up all the changes for displaying the header pane (to, cc, attachements button, etc.)
// and we make a single pass to display them. It's critical that we maintain this one reflow per message
// view in the message header pane.
////////////////////////////////////////////////////////////////////////////////////

if(!org) var org={};
if(!org.mozdev) org.mozdev={};
if(!org.mozdev.compactHeader) org.mozdev.compactHeader = {};

org.mozdev.compactHeader.pane = function() {
  var pub = {};

  const COHE_EXTENSION_UUID = "{58D4392A-842E-11DE-B51A-C7B855D89593}";

//  var regex = {
//    /* taken from https://bugzilla.mozilla.org/show_bug.cgi?id=57104 */
//    links : /((\w+):\/\/[^<>()'"\s]+|www(\.[-\w]+){2,})/
//  };
//

  var gCoheCollapsedHeaderViewMode = false;
  var gCoheBuiltCollapsedView = false;

  var LOGLEVEL = {"debug": 0, "info":1, "warn": 2, "error": 3};
  var gCurrentLogLevel = LOGLEVEL.info;

  var gToolboxes = [
      {pos:"top",   id:"collapsed2LButtonBox", orient:"horizontal", header:"compact"},
      {pos:"top",   id:"expandedHeadersTopBox", orient:"horizontal", header:"expanded"},
      {pos:"left",  id:"leftToolbox", orient:"vertical"},
      {pos:"right", id:"rightToolbox", orient:"vertical"},
      {pos:"none",  id:"", orient:""},
    ];

  function getToolbarTarget(targetPos, targetHeader) {
    targetPos = targetPos.replace('hdrToolbox.pos.', '');
    for (i=0; i<gToolboxes.length; i++) {
      if ((targetPos == gToolboxes[i].pos) &&
          ((gToolboxes[i].header == null) || (targetHeader == gToolboxes[i].header))
          ) {
        return gToolboxes[i];
      }
    }
    debugLog("orient failed " + targetPos + " " + targetHeader, LOGLEVEL.warn);
    return null;
  }

  /**
   * The collapsed view: very lightweight. We only show a couple of fields.  See
   * msgHdrViewOverlay.js for details of the field definition semantics.
   */
  var gCoheCollapsedHeader1LListLongAddresses = [
    {name:"subject", outputFunction:coheOutputSubject},
    {name:"from", useToggle:true, outputFunction:coheOutputEmailAddresses},
//    {name:"toCcBcc", useToggle:true, outputFunction:coheOutputEmailAddresses},
    {name:"date", outputFunction:coheUpdateDateValue}
    ];

  var gCoheCollapsedHeader2LListLongAddresses = [
    {name:"subject", outputFunction:coheOutputSubject},
    {name:"from", useToggle:true, outputFunction:coheOutputEmailAddresses},
    {name:"toCcBcc", useToggle:true, outputFunction:coheOutputEmailAddresses},
    {name:"date", outputFunction:coheUpdateDateValue}
    ];

  var cohePrefBranch = Components.classes["@mozilla.org/preferences-service;1"]
                                          .getService(Components.interfaces.nsIPrefService)
                                          .getBranch("extensions.CompactHeader.");

  var timerSwapBrowsers = Components.classes["@mozilla.org/timer;1"]
    .createInstance(Components.interfaces.nsITimer);

  var timerSetToolbox = Components.classes["@mozilla.org/timer;1"]
   .createInstance(Components.interfaces.nsITimer);
  
  var coheIntegrateRSSLinkify = false;

  var RSSLinkify = {
      oldSubject: null,
      newSubject: null
  };

  var cohe={
    version: -1,
    firstrun: true,
    current: -1
  };

  var coheFirstTime = true;

  function coheOutputSubject(headerEntry, headerValue) {
    var subjectBox;

    if (cohePrefBranch.getBoolPref("headersize.twolineview")) {
      subjectBox = document.getElementById("collapsed2LsubjectOutBox")
    } else {
      subjectBox = document.getElementById("collapsed1LsubjectOutBox")
    }

    if (subjectBox) {
      subjectBox.setAttribute("tooltiptext", headerValue);
    }
    updateHeaderValue(headerEntry, headerValue);
  }

  function coheOutputEmailAddresses(headerEntry, emailAddresses) {
    /* function copied from comm-1.9.1/ mail/ base/ content/ msgHdrViewOverlay.js 771135e6aaf5 */
    if (!emailAddresses)
      return;

    var addresses = {};
    var fullNames = {};
    var names = {};
    var numAddresses =  0;

    var msgHeaderParser = Components.classes["@mozilla.org/messenger/headerparser;1"]
                                    .getService(Components.interfaces.nsIMsgHeaderParser);
    numAddresses = msgHeaderParser.parseHeadersWithArray(emailAddresses, addresses, names, fullNames);
    var index = 0;
    while (index < numAddresses)
    {
      // if we want to include short/long toggle views and we have a long view, always add it.
      // if we aren't including a short/long view OR if we are and we haven't parsed enough
      // addresses to reach the cutoff valve yet then add it to the default (short) div.
      var address = {};
      address.emailAddress = addresses.value[index];
      address.fullAddress = fullNames.value[index];
      if (cohePrefBranch.getBoolPref("headersize.addressstyle")) {
        address.displayName = address.emailAddress;
        address.fullAddress = address.emailAddress;
      } else {
        address.displayName = names.value[index];
      }
      if (headerEntry.useToggle && (typeof headerEntry.enclosingBox.addAddressView == 'function')) {
        headerEntry.enclosingBox.addAddressView(address);
      } else {
        updateEmailAddressNode(headerEntry.enclosingBox.emailAddressNode, address);
      }
      index++;
    }

    if (headerEntry.useToggle && (typeof headerEntry.enclosingBox.buildViews == 'function'))
      headerEntry.enclosingBox.buildViews();
    //OutputEmailAddresses(headerEntry, emailAddresses);
  }

  // Now, for each view the message pane can generate, we need a global table
  // of headerEntries. These header entry objects are generated dynamically
  // based on the static data in the header lists (see above) and elements
  // we find in the DOM based on properties in the header lists.
  var gCoheCollapsedHeaderView = {};


  function coheInitializeHeaderViewTables()
  {
    gCoheCollapsedHeaderView = {};
    var index;

    if (cohePrefBranch.getBoolPref("headersize.twolineview")) {
      for (index = 0; index < gCoheCollapsedHeader2LListLongAddresses.length; index++) {
        gCoheCollapsedHeaderView[gCoheCollapsedHeader2LListLongAddresses[index].name] =
          new createHeaderEntry('collapsed2L', gCoheCollapsedHeader2LListLongAddresses[index]);
      }
    } else {
      for (index = 0; index < gCoheCollapsedHeader1LListLongAddresses.length; index++) {
        gCoheCollapsedHeaderView[gCoheCollapsedHeader1LListLongAddresses[index].name] =
          new createHeaderEntry('collapsed1L', gCoheCollapsedHeader1LListLongAddresses[index]);
      }
    }

    if (cohePrefBranch.getBoolPref("headersize.linkify")) {
      RSSLinkify.newSubject = document.getElementById("collapsedsubjectlinkBox") || document.createElement("label");
      RSSLinkify.newSubject.setAttribute("id", "collapsedsubjectlinkBox");
      RSSLinkify.newSubject.setAttribute("class", "headerValue plain headerValueUrl");
      RSSLinkify.newSubject.setAttribute("originalclass", "headerValue plain headerValueUrl");
      RSSLinkify.newSubject.setAttribute("context", "CohecopyUrlPopup");
      RSSLinkify.newSubject.setAttribute("keywordrelated", "true");
      RSSLinkify.newSubject.setAttribute("readonly", "true");
      RSSLinkify.newSubject.setAttribute("appendoriginalclass", "true");
      RSSLinkify.newSubject.setAttribute("flex", "1");
      if (cohePrefBranch.getBoolPref("headersize.twolineview")) {
        RSSLinkify.oldSubject = document.getElementById("collapsed2LsubjectBox");
      } else {
        RSSLinkify.oldSubject = document.getElementById("collapsed1LsubjectBox");
      }
      RSSLinkify.oldSubject.parentNode.insertBefore(RSSLinkify.newSubject, RSSLinkify.oldSubject);
    }
  }

  pub.coheOnLoadMsgHeaderPane = function() {
    debugLog("start coheOnLoadMsgHeaderPane");
    createSidebars();
    coheInitializeHeaderViewTables();

    // Add an address book listener so we can update the header view when things
    // change.
    Components.classes["@mozilla.org/abmanager;1"]
              .getService(Components.interfaces.nsIAbManager)
              .addAddressBookListener(coheAddressBookListener,
                                      Components.interfaces.nsIAbListener.all);

    var deckHeaderView = document.getElementById("msgHeaderViewDeck");
    var singleMessage = document.getElementById("singlemessage");
    singleMessage.addEventListener("DOMAttrModified", onHiddenChange, false);

    var messagePaneBox = document.getElementById("messagepanebox");
    messagePaneBox.addEventListener("DOMAttrModified", onCollapsedChangeMessagePaneBox, false);

    var headerViewToolbox = document.getElementById("header-view-toolbox");
    if (headerViewToolbox) {
      headerViewToolbox.addEventListener("DOMAttrModified", onDoCustomizationHeaderViewToolbox, false);
    }
    
    var mailToolbox = document.getElementById("mail-toolbox");
    if (mailToolbox) {
      mailToolbox.addEventListener("DOMAttrModified", onDoCustomizationHeaderViewToolbox, false);
    }
    
    var displayDeck = document.getElementById("displayDeck");
    if (displayDeck) {
      displayDeck.addEventListener("DOMAttrModified", onCollapsedChangeDisplayDeck, false);
    }
    
    var dispMUAicon = document.getElementById("dispMUAicon");
    if (dispMUAicon) {
      dispMUAicon.addEventListener("DOMAttrModified", onChangeDispMUAicon, false);
    }

    var headerToolbar = document.getElementById("header-view-toolbar");    
    if (headerToolbar) {
      headerToolbar.addEventListener("DOMAttrModified", onChangeHeaderToolbar, false);
    }
    
    debugLog("mid coheOnLoadMsgHeaderPane 1");
    gCoheCollapsedHeaderViewMode =
      deckHeaderView.selectedPanel == document.getElementById('collapsedHeaderView');

    // work around XUL deck bug where collapsed header view, if it's the persisted
    // default, wouldn't be sized properly because of the larger expanded
    // view "stretches" the deck.
    if (gCoheCollapsedHeaderViewMode)
      document.getElementById('expandedHeaderView').collapsed = true;
    else
      document.getElementById('collapsedHeaderView').collapsed = true;

    if (cohePrefBranch.getBoolPref("headersize.twolineview")) {
      document.getElementById('collapsed1LHeadersBox').collapsed = true;
      document.getElementById('collapsed2LHeadersBox').collapsed = false;
    } else {
      document.getElementById('collapsed1LHeadersBox').collapsed = false;
      document.getElementById('collapsed2LHeadersBox').collapsed = true;
    }

    debugLog("mid coheOnLoadMsgHeaderPane 2");
    if (coheFirstTime)
    {
      coheFirstTime = false;
      gMessageListeners.push(coheMessageListener);
      org.mozdev.customizeHeaderToolbar.messenger.loadToolboxData();
      fillToolboxPalette();
      org.mozdev.customizeHeaderToolbar.messenger.saveToolboxData();
      var toolbox = document.getElementById("header-view-toolbox");
      toolbox.customizeDone = function(aEvent) {
        MailToolboxCustomizeDone(aEvent, "CustomizeHeaderToolbar");
        document.getElementById("header-view-toolbox").removeAttribute("doCustomization");
        enableButtons();
        org.mozdev.customizeHeaderToolbar.pane.CHTUpdateReplyButton();
        org.mozdev.customizeHeaderToolbar.pane.CHTUpdateJunkButton();
        org.mozdev.compactHeader.buttons.coheToggleStar();
        org.mozdev.customizeHeaderToolbar.messenger.saveToolboxData();
      };
    }
    
    debugLog("mid coheOnLoadMsgHeaderPane 3");

    if (cohe.firstrun) {
      coheCheckFirstRun();
    }

    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                            .getService(Components.interfaces.nsIXULAppInfo);
    var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                                 .getService(Components.interfaces.nsIVersionComparator);
    if(versionChecker.compare(appInfo.version, "3.1b2") < 0) {
      if (cohe.firstrun || document.getElementById("hdrReplyAllButton") == null) {
        org.mozdev.customizeHeaderToolbar.pane.CHTSetDefaultButtons();
        cohe.firstrun = false;
      }
    }
    else {
      if (cohe.firstrun) {
        org.mozdev.customizeHeaderToolbar.pane.CHTSetDefaultButtons();
        cohe.firstrun = false;
      }
    }

    debugLog("mid coheOnLoadMsgHeaderPane 4");
    setButtonStyle();
    org.mozdev.customizeHeaderToolbar.messenger.saveToolboxData();
    delayedCurrentToolboxPosition(200);
    dispMUACheck();
    //coheToggleHeaderContent();
    debugLog("stop coheOnLoadMsgHeaderPane");
  }

  var coheMessageListener =
  {
    onStartHeaders:
    function cML_onStartHeaders () {
        gCoheBuiltCollapsedView = false;
    },

    onEndHeaders:
    function cML_onEndHeaders() {
      ClearHeaderView(gCoheCollapsedHeaderView);
      coheUpdateMessageHeaders();
    },

    onEndAttachments: function cML_onEndAttachments(){}
  };

  pub.coheOnUnloadMsgHeaderPane = function()
  {
    Components.classes["@mozilla.org/abmanager;1"]
              .getService(Components.interfaces.nsIAbManager)
              .removeAddressBookListener(coheAddressBookListener);

    removeEventListener('messagepane-loaded', coheOnLoadMsgHeaderPane, true);
    removeEventListener('messagepane-unloaded', coheOnUnloadMsgHeaderPane, true);
  }

  var coheAddressBookListener =
  {
    onItemAdded: function(aParentDir, aItem) {
      coheOnAddressBookDataChanged(nsIAbListener.itemAdded,
                               aParentDir, aItem);
    },
    onItemRemoved: function(aParentDir, aItem) {
      coheOnAddressBookDataChanged(aItem instanceof nsIAbCard ?
                               nsIAbListener.directoryItemRemoved :
                               nsIAbListener.directoryRemoved,
                               aParentDir, aItem);
    },

    onItemPropertyChanged: function(aItem, aProperty, aOldValue, aNewValue) {
      // We only need updates for card changes, address book and mailing list
      // ones don't affect us here.
      if (aItem instanceof Components.interfaces.nsIAbCard)
        coheOnAddressBookDataChanged(nsIAbListener.itemChanged, null, aItem);
    }
  }

  function coheOnAddressBookDataChanged(aAction, aParentDir, aItem) {
    gEmailAddressHeaderNames.forEach(function (headerName) {
        var headerEntry = null;

        if (headerName in gCoheCollapsedHeaderView) {
          headerEntry = gCoheCollapsedHeaderView[headerName];
          if (headerEntry)
            headerEntry.enclosingBox.updateExtraAddressProcessing(aAction,
                                                                  aParentDir,
                                                                  aItem);
        }
      });
  }

  function linkifySubject(subjectValueStr) {
    var subjectNode = document.getElementById(subjectValueStr);
    while(subjectNode.childNodes.length > 0) {
      subjectNode.removeChild(subjectNode.firstChild)
    }
    var subject = currentHeaderData['subject'].headerValue;

    if (regex.links.test(subject)) {
      var text = subject;
      /* utility function to split text and links */
      function linkify(text) {
        var matches = regex.links.exec(text);
        var pre, post = null;
        [pre, post] = text.split(matches[1]);
        var link = document.createElement("a");
        link.appendChild(document.createTextNode(matches[1]));
        link.setAttribute("href", matches[1]);
        link.setAttribute("class","text-link");
        link.setAttribute("onclick", "org.mozdev.compactHeader.pane.subjectLinkOnClickListenter(event);");
        return [pre,link,post];
      }
      /* loop through multiple possible links in the subject */
      while(text && regex.links.test(text)) {
        var pre, link, post = null;
        [pre,link,post] = linkify(text);
        /* we can't assume that any pre or post text was given, only a link */
        if (pre && pre.length > 0)
          subjectNode.appendChild(document.createTextNode(pre));
        subjectNode.appendChild(link);
        text = post;
      }
      if (text && text.length > 0)
        subjectNode.appendChild(document.createTextNode(text));
    } else {
      subjectNode.appendChild(document.createTextNode(subject));
    }
  }

  /* :::: Subject Link onClick Listener Functions :::: */
  pub.subjectLinkOnClickListenter = function(event) {
    if (event.originalTarget && event.originalTarget.getAttribute("href")) {
      try {
        messenger.launchExternalURL(event.originalTarget.getAttribute("href"));
      } catch (e) { Application.console.log(e); }
    }
  }


  // make sure the appropriate fields within the currently displayed view header mode
  // are collapsed or visible...
  function coheUpdateHeaderView()
  {
    if (gCoheCollapsedHeaderViewMode)
      showHeaderView(gCoheCollapsedHeaderView);

    if (cohePrefBranch.getBoolPref("headersize.linkify")) {
      var url = currentHeaderData["content-base"];
      if(url) {
          RSSLinkify.newSubject.setAttribute("onclick", "if (!event.button) messenger.launchExternalURL('" +
                                               url.headerValue + "');");
          RSSLinkify.newSubject.setAttribute("value", currentHeaderData["subject"].headerValue);
          RSSLinkify.newSubject.setAttribute("url", url.headerValue);
          RSSLinkify.newSubject.setAttribute("collapsed", "false");
          RSSLinkify.oldSubject.setAttribute("collapsed", "true");
          RSSLinkify.newSubject.setAttribute("tooltiptext", url.headerValue);
      } else {
          RSSLinkify.newSubject.setAttribute("collapsed", "true");
          RSSLinkify.oldSubject.setAttribute("collapsed", "false");
          RSSLinkify.oldSubject.setAttribute("tooltiptext", currentHeaderData["subject"].headerValue);
//          if (gCoheCollapsedHeaderViewMode) {
//            //linkifySubject('collapsed1LsubjectBox');
//          }
//          else {
//            linkifySubject('expandedsubjectBox');
//          }
      }
    } else {
      if (RSSLinkify.newSubject) {
        RSSLinkify.newSubject.setAttribute("collapsed", "true");
      }
      if (RSSLinkify.oldSubject) {
        RSSLinkify.oldSubject.setAttribute("collapsed", "false");
        RSSLinkify.oldSubject.setAttribute("tooltiptext", currentHeaderData["subject"].headerValue);
      }
    }
    if (cohePrefBranch.getBoolPref("headersize.addressstyle")) {
      selectEmailDisplayed();
    }

    //fillToolboxPalette();
    coheToggleHeaderContent();
    org.mozdev.customizeHeaderToolbar.pane.CHTUpdateReplyButton();
    org.mozdev.customizeHeaderToolbar.pane.CHTUpdateJunkButton();
    org.mozdev.compactHeader.buttons.coheToggleStar();
  }

  function enableButtons() {
    var hdrToolbar = document.getElementById("header-view-toolbar");
    if (toolbar) {
      var buttons = hdrToolbar.querySelectorAll("[disabled*='true']");
      for (var i=0; i<buttons.length; i++) {
        buttons[i].removeAttribute("disabled");
      }
    }
  }

  
  function removeButtonDispMUA() {
    if (!document.getElementById("dispMUA")) {
      var button = document.getElementById("button-dispMUA");
      if (button) {
        button.parentNode.removeChild(button);
      }
      
      var button1 = document.getElementById("mail-toolbox").palette.getElementsByAttribute("id", "button-dispMUA")[0];
      if (button1) {
        button1.parentNode.removeChild(button1);
      }

      var button2 = document.getElementById("header-view-toolbox").palette.getElementsByAttribute("id", "button-dispMUA")[0];
      if (button2) {
        button2.parentNode.removeChild(button2);
      }
    }
  }
  
  function fillToolboxPalette() {
    removeButtonDispMUA();
    var hdrToolbar = document.getElementById("header-view-toolbar");
    var hdrToolbox = document.getElementById("header-view-toolbox");
    var buttons = ["button-reply", "button-replyall", "button-replylist",
                   "button-tag", "button-forward", "button-archive", "button-file",
                   "button-print", "button-mark", "button-starMessages",
                   "button-newmsg", "button-goback", "button-goforward",
                   "button-previous", "button-next", "button-compact",
                   "button-address", "button-stop", "button-getmsg",
                   "button-getPartialMessages",
                   "stylish-toolbar-button",
                   "button-enigmail-decrypt",
                   "RealPreviousMessage", "RealNextMessage", "SelectSMTP",
                   "ToggleHTML", "ToggleImages", "bDeleteThread",
                   "mailredirect-toolbarbutton",
                   "lightningbutton-convert-to-task",
                   "lightningbutton-convert-to-event",
                   "button-dispMUA"];
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
              addClass(subButtons[j], "msgHeaderView-button-out");
            }
          } else {
            if (hdrButton.type != "menu-button") {
              addClass(hdrButton, "msgHeaderView-button");
            } else {
              addClass(hdrButton, "msgHeaderView-button-out");
            }
          }
          hdrToolbox.palette.appendChild(hdrButton);
        }
        if (currentSet.indexOf(buttonName)>=0) {
          var result = hdrToolbar.insertItem(hdrButton.id);
          currentSet = hdrToolbar.getAttribute("currentset");
          hdrToolbar.currentSet = currentSet;
        }
      }
    }

    var buttonsRemove;
    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                            .getService(Components.interfaces.nsIXULAppInfo);
    var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                                 .getService(Components.interfaces.nsIVersionComparator);
    if(versionChecker.compare(appInfo.version, "3.1b2") < 0) {
      var buttonsRemove = ["hdrJunkButton", "hdrForwardButton", "hdrArchiveButton",
                           "hdrReplyToSenderButton", "hdrReplyButton",
                           "hdrReplyAllButton", "hdrReplyListButton"];
    }
    else {
      var buttonsRemove = ["hdrForwardButton", "hdrArchiveButton",
                           "hdrReplyToSenderButton"];//, "hdrReplyButton",
                           //"hdrReplyAllButton", "hdrReplyListButton"];
    }
    for (var i=0; i<buttonsRemove.length; i++) {
      var buttonName = buttonsRemove[i];
      var button = document.getElementById(buttonName) ||
          document.getElementById("header-view-toolbox").palette.getElementsByAttribute("id", buttonName)[0];
      if (button) {
        button.setAttribute("collapsed", "true");
      }
    }

    var target = "hdrOtherActionsButton";

    var newParent = document.getElementById(target) ||
        document.getElementById("header-view-toolbox").palette.getElementsByAttribute("id", target)[0];

    if (newParent != null) {
      var myElement;
      myElement= document.getElementById("otherActionsPopup");
      if (myElement) {
        newParent.appendChild(myElement);
      }
    }
  }

  function setButtonStyle() {
    var hdrToolbar = document.getElementById("header-view-toolbar");
    var hdrToolbox = document.getElementById("header-view-toolbox");
    var buttons = hdrToolbar.querySelectorAll("toolbarbutton");
    for (var i=0; i<buttons.length; i++) {
      var button = buttons[i];
      if (button) {
        addClass(button, "customize-header-toolbar-button");
        addClass(button, "customize-header-toolbar-" + button.id)
        if (cohePrefBranch.getBoolPref("headersize.flatButtons")) {
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
            addClass(button,    "msgHeaderView-button-out");
          }
        }
      }
    }

    var buttons = hdrToolbar.querySelectorAll("toolbaritem");
    for (var i=0; i<buttons.length; i++) {
      var button = buttons[i];
      if (button) {
        addClass(button, "customize-header-toolbar-button");
        addClass(button, "customize-header-toolbar-" + button.id)
        if (cohePrefBranch.getBoolPref("headersize.flatButtons")) {
          removeClass(button, "msgHeaderView-button-out-item");
          addClass(button,    "msgHeaderView-flat-button-out-item");
        } else {
          removeClass(button, "msgHeaderView-flat-button-out-item");
          addClass(button,    "msgHeaderView-button-out-item");
        }
      }
    }

    buttons = hdrToolbox.palette.querySelectorAll("toolbarbutton");
    for (var i=0; i<buttons.length; i++) {
      var button = buttons[i];
      if (button) {
        addClass(button, "customize-header-toolbar-button");
        addClass(button, "customize-header-toolbar-" + button.id)
        if (cohePrefBranch.getBoolPref("headersize.flatButtons")) {
          if (button.getAttribute("type") != "menu-button") {
            addClass(button, "msgHeaderView-flat-button");
          } else {
            removeClass(button, "msgHeaderView-flat-button");
            removeClass(button, "msgHeaderView-button");
            removeClass(button, "msgHeaderView-button-out");
            addClass(button,    "msgHeaderView-flat-button-out");
          }
        } else {
          if (button.getAttribute("type") != "menu-button") {
            removeClass(button, "msgHeaderView-flat-button");
          } else {
            removeClass(button, "msgHeaderView-flat-button");
            removeClass(button, "msgHeaderView-button");
            removeClass(button, "msgHeaderView-flat-button-out");
            addClass(button,    "msgHeaderView-button-out");
          }
        }
      }
    }

    buttons = hdrToolbox.palette.querySelectorAll("toolbaritem");
    for (var i=0; i<buttons.length; i++) {
      var button = buttons[i];
      if (button) {
        addClass(button, "customize-header-toolbar-button");
        addClass(button, "customize-header-toolbar-" + button.id)
        if (cohePrefBranch.getBoolPref("headersize.flatButtons")) {
          removeClass(button, "msgHeaderView-button-out-item");
          addClass(button,    "msgHeaderView-flat-button-out-item");
        } else {
          removeClass(button, "msgHeaderView-flat-button-out-item");
          addClass(button,    "msgHeaderView-button-out-item");
        }
      }
    }
  }

  pub.coheToggleHeaderView = function() {
    debugLog("coheToggleHeaderView");
    gCoheCollapsedHeaderViewMode = !gCoheCollapsedHeaderViewMode;

    let deck = document.getElementById('msgHeaderViewDeck');
    // Work around a xul deck bug where the height of the deck is determined
    // by the tallest panel in the deck even if that panel is not selected...
    deck.selectedPanel.collapsed = true;

    if (gCoheCollapsedHeaderViewMode) {
      deck.selectedPanel = document.getElementById("collapsedHeaderView")
      coheUpdateMessageHeaders();
    } else {
      deck.selectedPanel = document.getElementById("expandedHeaderView");
      ClearHeaderView(gExpandedHeaderView);
      UpdateExpandedMessageHeaders();
      //gDBView.reloadMessage();
    }

    // Work around a xul deck bug where the height of the deck is determined
    // by the tallest panel in the deck even if that panel is not selected...
    deck.selectedPanel.collapsed = false;
    syncGridColumnWidths();

    coheToggleHeaderContent();
    setCurrentToolboxPosition();
  }

  function coheToggleHeaderContent() {
    debugLog("coheToggleHeaderContent start");
    var strHideLabel = document.getElementById("CoheHideDetailsLabel").value;
    var strShowLabel = document.getElementById("CoheShowDetailsLabel").value;
    var strLabel;

    var smimeBox = document.getElementById("smimeBox");

    if (smimeBox != null) {
      if (gCoheCollapsedHeaderViewMode) {
        var parent = document.getElementById("collapsed2LdateOutBox");
        var refElement = document.getElementById("collapsed2LdateRow");
        if (parent != null && refElement != null) {
          parent.insertBefore(smimeBox, refElement);
        }
      }
      else {
        var parent = document.getElementById("dateValueBox");
        var refElement = document.getElementById("dateLabel");
        if (parent != null && refElement != null) {
          parent.insertBefore(smimeBox, refElement);
        }
      }
    }

    org.mozdev.customizeHeaderToolbar.messenger.loadToolboxData();

    if (gCoheCollapsedHeaderViewMode) {
      strLabel = strShowLabel;
    } else {
      strLabel = strHideLabel;
    }

    if (document.getElementById("hideDetailsMenu")) {
      document.getElementById("hideDetailsMenu").setAttribute("label", strLabel);
    }
    debugLog("coheToggleHeaderContent stop");
  }

  function moveToolbox(cBox, orient) {
    var hdrToolbox = document.getElementById("header-view-toolbox");
    var hdrToolbar = document.getElementById("header-view-toolbar");
    var firstPermanentChild = hdrToolbar.firstPermanentChild;
    var lastPermanentChild = hdrToolbar.lastPermanentChild;

    if ((hdrToolbox.parentNode == null) || (cBox.id != hdrToolbox.parentNode.id)) {
      var cloneToolboxPalette;
      var cloneToolbarset;
      if (hdrToolbox.palette) {
        cloneToolboxPalette = hdrToolbox.palette.cloneNode(true);
      }
      if (hdrToolbox.toolbarset) {
        cloneToolbarset = hdrToolbox.toolbarset.cloneNode(true);
      }
      else {
        debugLog("cannot move");
      }
      //cBox.parentNode.insertBefore(hdrToolbox, cBox);
      cBox.appendChild(hdrToolbox);
      hdrToolbox.palette  = cloneToolboxPalette;
      hdrToolbox.toolbarset = cloneToolbarset;
      hdrToolbar = document.getElementById("header-view-toolbar");
      hdrToolbar.firstPermanentChild = firstPermanentChild;
      hdrToolbar.lastPermanentChild = lastPermanentChild;
    }

    hdrToolbar.setAttribute("orient", orient);
  }
  // default method for updating a header value into a header entry
  function coheUpdateHeaderValueInTextNode(headerEntry, headerValue)
  {
    headerEntry.textNode.value = headerValue;
  }

  function coheUpdateDateValue(headerEntry, headerValue) {
    //var t = currentHeaderData.date.headerValue;
    var d
    d = document.getElementById("collapsed1LdateBox");
    d.textContent = headerValue;
    d = document.getElementById("collapsed2LdateBox");
    d.textContent = headerValue;
  }


  // coheUpdateMessageHeaders: Iterate through all the current header data we received from mime for this message
  // for each header entry table, see if we have a corresponding entry for that header. i.e. does the particular
  // view care about this header value. if it does then call updateHeaderEntry
  function coheUpdateMessageHeaders()
  {
    // Remove the height attr so that it redraws correctly. Works around a
    // problem that attachment-splitter causes if it's moved high enough to
    // affect the header box:
    document.getElementById('msgHeaderView').removeAttribute('height');

    // iterate over each header we received and see if we have a matching entry
    // in each header view table...
    for (var headerName in currentHeaderData)
    {
      var headerField = currentHeaderData[headerName];
      var headerEntry = null;

      if (gCoheCollapsedHeaderViewMode && !gCoheBuiltCollapsedView)
      {
        if (headerName == "cc" || headerName == "to" || headerName == "bcc")
          headerEntry = gCoheCollapsedHeaderView["toCcBcc"];
        else if (headerName in gCoheCollapsedHeaderView)
          headerEntry = gCoheCollapsedHeaderView[headerName];
      }

      if (headerEntry) {
        headerEntry.outputFunction(headerEntry, headerField.headerValue);
        headerEntry.valid = true;
      }
    }

    if (gCoheCollapsedHeaderViewMode)
     gCoheBuiltCollapsedView = true;

    // now update the view to make sure the right elements are visible
    coheUpdateHeaderView();
  }

  function addClass(el, strClass) {
    var testnew = new RegExp('\\b'+strClass+'\\b').test(el.className);
    if (!testnew) {
      el.className += el.className?' '+strClass:strClass;
    }
  }

  function removeClass(el, strClass) {
    var str = new RegExp('(\\s|^)'+strClass+'(\\s|$)', 'g');
    el.className = el.className.replace(str, ' ');
  }

  function CoheCopyWebsiteAddress(websiteAddressNode)
  {
    if (websiteAddressNode)
    {
      var websiteAddress = websiteAddressNode.getAttribute("url");

      var contractid = "@mozilla.org/widget/clipboardhelper;1";
      var iid = Components.interfaces.nsIClipboardHelper;
      var clipboard = Components.classes[contractid].getService(iid);
      clipboard.copyString(websiteAddress);
    }
  }

  function selectEmailDisplayed() {
    var xulemail = document.getElementById("collapsedtoCcBccBox");
    if (xulemail != null) {
      var nextbox = document.getAnonymousElementByAttribute(xulemail, "anonid", "longEmailAddresses");
      if (nextbox != null) {
        var xuldesc = document.getAnonymousElementByAttribute(xulemail, "containsEmail", "true");
        if (xuldesc != null) {
          var children = xuldesc.children;
          for (var i=0; i<children.length; i++) {
            if (children[i].localName == "mail-emailaddress") {
              var rawAddress = children[i].getAttribute("emailAddress");
              if (rawAddress) {
                children[i].setAttribute("label", rawAddress);
              }
            }
          }
        }
      }
    }
    var xulemail = document.getElementById("collapsedfromBox");
    if (xulemail != null) {
      var nextbox = document.getAnonymousElementByAttribute(xulemail, "anonid", "longEmailAddresses");
      if (nextbox != null) {
        var xuldesc = document.getAnonymousElementByAttribute(xulemail, "containsEmail", "true");
        if (xuldesc != null) {
          var children = xuldesc.children;
          for (var i=0; i<children.length; i++) {
            if (children[i].localName == "mail-emailaddress") {
              var rawAddress = children[i].getAttribute("emailAddress");
              if (rawAddress) {
                children[i].setAttribute("label", rawAddress);
              }
            }
          }
        }
      }
    }
  };

  var myPrefObserverHeaderSize =
  {
    register: function()
    {
      // First we'll need the preference services to look for preferences.
      var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                                  .getService(Components.interfaces.nsIPrefService);

      // For this._branch we ask that the preferences for extensions.myextension. and children
      this._branch = prefService.getBranch("extensions.CompactHeader.headersize.");

      // Now we queue the interface called nsIPrefBranch2. This interface is described as:
      // "nsIPrefBranch2 allows clients to observe changes to pref values."
      this._branch.QueryInterface(Components.interfaces.nsIPrefBranch2);

      // Finally add the observer.
      this._branch.addObserver("", this, false);
    },

    unregister: function()
    {
      if(!this._branch) return;
      this._branch.removeObserver("", this);
    },

    observe: function(aSubject, aTopic, aData)
    {
      if(aTopic != "nsPref:changed") return;
      // aSubject is the nsIPrefBranch we're observing (after appropriate QI)
      // aData is the name of the pref that's been changed (relative to aSubject)

      var event = document.createEvent('Events');
      event.initEvent('messagepane-loaded', false, true);
      var headerViewElement = document.getElementById("msgHeaderView");
      headerViewElement.dispatchEvent(event);

      gDBView.reloadMessage();
    }
  }

  myPrefObserverHeaderSize.register();

  var myPrefObserverToolboxPosition =
  {
    register: function()
    {
      // First we'll need the preference services to look for preferences.
      var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                                  .getService(Components.interfaces.nsIPrefService);

      // For this._branch we ask that the preferences for extensions.myextension. and children
      this._branch = prefService.getBranch("extensions.CompactHeader.toolbox.position");

      // Now we queue the interface called nsIPrefBranch2. This interface is described as:
      // "nsIPrefBranch2 allows clients to observe changes to pref values."
      this._branch.QueryInterface(Components.interfaces.nsIPrefBranch2);

      // Finally add the observer.
      this._branch.addObserver("", this, false);
    },

    unregister: function()
    {
      if(!this._branch) return;
      this._branch.removeObserver("", this);
    },

    observe: function(aSubject, aTopic, aData)
    {
      if(aTopic != "nsPref:changed") return;
      // aSubject is the nsIPrefBranch we're observing (after appropriate QI)
      // aData is the name of the pref that's been changed (relative to aSubject)

      setCurrentToolboxPosition();
    }
  }

  myPrefObserverToolboxPosition.register();

  function coheCheckFirstRun() {
    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                                     .getService(Components.interfaces.nsIXULAppInfo);
    var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                                            .getService(Components.interfaces.nsIVersionComparator);
    debugLog("first run 0");
    if(versionChecker.compare(appInfo.version, "3.2a1pre") < 0) {
      debugLog("firstrun 1");
      cohe.version = -1;
      cohe.firstrun = false;
      cohe.gExtensionManager = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);
      // check if this is part of CompactHeader
      if ((cohe.gExtensionManager.getItemForID(COHE_EXTENSION_UUID) == null) || (isAddonDisabled(COHE_EXTENSION_UUID))) {
        return;
      }

      var debugLevel = gCurrentLogLevel;
      cohe.current = cohe.gExtensionManager.getItemForID(COHE_EXTENSION_UUID).version;
      try{
        cohe.version = cohePrefBranch.getCharPref("version");
        cohe.firstrun = cohePrefBranch.getBoolPref("firstrun");
        debugLevel = cohePrefBranch.getIntPref("debugLevel");
      } catch(e) {
      } finally {
        //check for first run
        if (cohe.firstrun){
          cohePrefBranch.setBoolPref("firstrun",false);
          cohePrefBranch.setCharPref("version",cohe.current);
        }
        //check for upgrade
        if (cohe.version!=cohe.current && !cohe.firstrun){
          cohePrefBranch.setCharPref("version",cohe.current);
        }
        gCurrentLogLevel = debugLevel;
        cohePrefBranch.setIntPref("debugLevel", gCurrentLogLevel);
      }
    }
    else {
      debugLog("firstrun 3");
      Components.utils.import("resource://gre/modules/AddonManager.jsm");
      AddonManager.getAddonByID(COHE_EXTENSION_UUID,
        function(myAddon) {
          debugLog("first run 2");
          cohe.version = -1;
          cohe.firstrun = false;
          cohe.current = myAddon.version;
          try{
            cohe.version = cohePrefBranch.getCharPref("version");
            cohe.firstrun = cohePrefBranch.getBoolPref("firstrun");
          } catch(e) {
          } finally {
            //check for first run
            if (cohe.firstrun){
              cohePrefBranch.setBoolPref("firstrun",false);
              cohePrefBranch.setCharPref("version",cohe.current);
            }
            //check for upgrade
            if (cohe.version!=cohe.current && !cohe.firstrun){
              cohePrefBranch.setCharPref("version",cohe.current);
            }
          }
        }
      );
    }
    debugLog("firstrun 4");
  }


  var aConsoleService = Components.classes["@mozilla.org/consoleservice;1"]
                                           .getService(Components.interfaces.nsIConsoleService);

  function debugLog(str, logLevel) {
    if (!logLevel) var logLevel = LOGLEVEL.debug;
    if (logLevel >= gCurrentLogLevel) {
      aConsoleService.logStringMessage(Date() + " CH: " + str);
    }
  }

  pub.coheInitializeOverlay = function() {
    //var gExtensionManager = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);
    // check if this is part of CompactHeader
    //if ((gExtensionManager.getItemForID(COHE_EXTENSION_UUID) == null) || isAddonDisabled(COHE_EXTENSION_UUID)) {
    //  return;
    //}
    
    coheUninstallObserver.register();
  }

  var setCurrentToolboxPositionEvent = {  
    notify: function(timer) {
      debugLog("Start delayed setCurrentToolboxPosition");
      setCurrentToolboxPosition();  
      debugLog("Stop delayed setCurrentToolboxPosition");
    }
  };

  function delayedCurrentToolboxPosition(timeout) {
    timerSetToolbox.initWithCallback(setCurrentToolboxPositionEvent, timeout, Components.interfaces.nsITimer.TYPE_ONE_SHOT);  
  }
  
  var swapBrowsersEvent = {  
    notify: function(timer) {
      debugLog("Start delayed swapBrowsers");
      swapBrowsers();  
      debugLog("Stop delayed swapBrowsers");
    }
  };
  
  function swapBrowsers() {
    debugLog("swapBrowsers start");
    var messagePaneNew = document.getElementById("CHTBrowserStore");
    var messagepane = document.getElementById("messagepane");
    messagepane.swapDocShells(messagePaneNew);
    debugLog("swapBrowsers stop");
  }
  
  function delayedSwapBrowser(timeout) {
    timerSwapBrowsers.initWithCallback(swapBrowsersEvent, timeout, Components.interfaces.nsITimer.TYPE_ONE_SHOT);  
  }
  
  function createSidebars() {
    debugLog("createSidebars start");

    if (document.getElementById("messagepanehbox") != null) {
      debugLog("messagepanehbox already exists");
      return;
    }

    var messagepanebox   = document.getElementById("messagepanebox");
    var messagepane = document.getElementById("messagepane");

    swapBrowsers();

    var xul11   = document.createElement("hbox");
    xul11.id    = "messagepanehbox";

    var displayDeck = document.getElementById("displayDeck");
    if (!displayDeck || displayDeck.getAttribute("collapsed") == "true") {
      xul11.setAttribute("flex", "1");
    }
    
    xul11.setAttribute("hidden", "false");
    messagepanebox.parentNode.insertBefore(xul11, messagepanebox);

    var messagePaneHBox = document.getElementById("messagepanehbox");
    org.mozdev.customizeHeaderToolbar.messenger.saveToolboxData();
    messagePaneHBox.appendChild(messagepanebox);
    org.mozdev.customizeHeaderToolbar.messenger.loadToolboxData();

    /* for whatever reasons, wait for the messagepanebox to fully
     * appear before the browser content can be swaped */
    delayedSwapBrowser(1000);

    messagepanebox   = document.getElementById("messagepanebox");
    var xul13   = document.createElement("vbox");
    xul13.id    = "leftToolbox";
    messagePaneHBox.insertBefore(xul13, messagepanebox);

    var xul12 = document.createElement("vbox");
    xul12.id    = "rightToolbox";
    messagePaneHBox.appendChild(xul12);

    messagePaneHBox.addEventListener("DOMAttrModified", onHeightChangeMessagePaneHBox, false);

    debugLog("createSidebars stop");
  };

  function onHiddenChange(event) {
    if (event.attrName == "hidden") {
      setCurrentToolboxPosition();
    }
  };

  function onHeightChangeMessagePaneHBox(event) {
    if (event.attrName == "height") {
      var height = document.getElementById("messagepanebox").boxObject.height;
      document.getElementById("messagepanebox").setAttribute("height", height);
    }
  };
  
  function onCollapsedChangeMessagePaneBox(event) {
    if (event.attrName == "collapsed") {
      if (document.getElementById("messagepanebox").getAttribute("collapsed") == "true") {
        document.getElementById("messagepanehbox").setAttribute("collapsed", "true");
      }
      else {
        document.getElementById("messagepanehbox").removeAttribute("collapsed");
      }
    }
  };
  
  function onDoCustomizationHeaderViewToolbox(event) {
    if (event.attrName == "doCustomization") {
      dispMUACheck();
    }
  }

  function dispMUACheck() {
    var dispMUAButton = document.getElementById("button-dispMUA");
    var dispMUABox = document.getElementById("dispMUA"); 
    if (dispMUAButton && dispMUABox) {
      dispMUABox.setAttribute("collapsed", "true");
    }
    else if (dispMUABox){
      dispMUABox.removeAttribute("collapsed");
    }
  }

  function onCollapsedChangeDisplayDeck(event) {
    if (event.attrName == "collapsed") {
      var displayDeck = document.getElementById("displayDeck");
      if (!displayDeck || displayDeck.getAttribute("collapsed") == "true") {
        document.getElementById("messagepanehbox").setAttribute("flex", "1");
      }
      else {
        //alert("no flex!");
        document.getElementById("messagepanehbox").removeAttribute("flex");
      }
    }
  }
  
  function onChangeDispMUAicon(event) {
    if (event.attrName == "src") {
      var imageSrc = document.getElementById("dispMUAicon").getAttribute("src");
      var buttonDispMUA = document.getElementById("button-dispMUA");
      if (buttonDispMUA) {
        buttonDispMUA.setAttribute("image", imageSrc);
      }
    }
    else if (event.attrName == "tooltiptext") {
      var tooltipText = document.getElementById("dispMUAicon").getAttribute("tooltiptext");
      var buttonDispMUA = document.getElementById("button-dispMUA");
      if (buttonDispMUA) {
        buttonDispMUA.setAttribute("tooltiptext", tooltipText);
      }
    }
  }
  
  function onChangeHeaderToolbar(event) {
    if (event.attrName == "currentset") {
      if (document.getElementById("button-dispMUA")) {
        gDBView.reloadMessage();
      }
    }
  }
  
  function setCurrentToolboxPosition() {
    debugLog("setCurrentToolboxPosition start");

    var singleMessage = document.getElementById("singlemessage");
    var targetPos = cohePrefBranch.getCharPref("toolbox.position");
    var multiMessage = document.getElementById("multimessage");
    var multiBBox;
    if (multiMessage){
      multiBBox = multiMessage.contentDocument.getElementById("buttonbox");
    }
    
    var hdrViewToolbox = document.getElementById("header-view-toolbox");
    if (!hdrViewToolbox) {
      debugLgo("no header-view-toolbox!", LOGLEVEL.warn);
      return;
    }

    if (targetPos == "hdrToolbox.pos.none") {
      hdrViewToolbox.setAttribute("collapsed", "true");
      if (multiBBox) {
        multiBBox.setAttribute("collapsed", "true");
      }
      return;
    }
    else {
      hdrViewToolbox.removeAttribute("collapsed");
      if (multiBBox) {
        multiBBox.removeAttribute("collapsed");
      }
    }

    if (multiBBox) {
      multiBBox.removeAttribute("collapsed");
    }

    if (singleMessage.getAttribute("hidden")) {
      debugLog("move to multibuttonhbox");
      var targetToolbox = getToolbarTarget(targetPos, "");
      debugLog("move to multibuttonhbox 1");
      if (multiBBox) {
        if (targetPos != "hdrToolbox.pos.top") {
          debugLog("x multiBBox: "+multiBBox);
          multiBBox.setAttribute("collapsed", "true");
          hdrViewToolbox.removeAttribute("collapsed");
        } else {
          debugLog("x multiBBox: "+multiBBox);
          multiBBox.removeAttribute("collapsed");
          hdrViewToolbox.setAttribute("collapsed", "true");
        }
      }
      if (targetToolbox) {
        moveToolbox(document.getElementById(targetToolbox.id), targetToolbox.orient);
      }
    }
    else {
      debugLog("move to singlemessage");
      var targetToolbox;
      if (gCoheCollapsedHeaderViewMode) {
        targetToolbox = getToolbarTarget(targetPos, "compact");
      }
      else {
        targetToolbox = getToolbarTarget(targetPos, "expanded");
      }        
      if (targetToolbox) {
        moveToolbox(document.getElementById(targetToolbox.id), targetToolbox.orient);
      }
    }
    debugLog("setCurrentToolboxPosition stop");
  }

  var coheUninstallObserver = {
    _uninstall : false,
    observe : function(subject, topic, data) {
      if (topic == "em-action-requested") {
        subject.QueryInterface(Components.interfaces.nsIUpdateItem);

        if (subject.id == COHE_EXTENSION_UUID) {
          debugLog("uninstalling COHE 1");
          if (data == "item-uninstalled") {
            this._uninstall = true;
          } else if (data == "item-cancel-action") {
            this._uninstall = false;
          }
        }
      } else if (topic == "quit-application-granted") {
        debugLog("uninstalling COHE 2");
        if (this._uninstall) {
          cohePrefBranch.deleteBranch("");
          org.mozdev.customizeHeaderToolbar.pane.CHTCleanupButtons();
        }
        this.unregister();
      }
    },
    register : function() {
     var observerService =
       Components.classes["@mozilla.org/observer-service;1"].
         getService(Components.interfaces.nsIObserverService);

     observerService.addObserver(this, "em-action-requested", false);
     observerService.addObserver(this, "quit-application-granted", false);
    },
    unregister : function() {
      var observerService =
        Components.classes["@mozilla.org/observer-service;1"].
          getService(Components.interfaces.nsIObserverService);

      observerService.removeObserver(this,"em-action-requested");
      observerService.removeObserver(this,"quit-application-granted");
    }
  }

  function isAddonDisabled(uuid) {
    var rdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
    var addon = rdfService.GetResource("urn:mozilla:item:" + uuid);

    var em = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);
    var ds = em.datasource;

    var appRes = rdfService.GetResource("http://www.mozilla.org/2004/em-rdf#appDisabled");
    var appDisabled = ds.GetTarget(addon, appRes, true);
    if(appDisabled instanceof Components.interfaces.nsIRDFLiteral && appDisabled.Value == "true")
      return true;

    var userRes = rdfService.GetResource("http://www.mozilla.org/2004/em-rdf#userDisabled");
    var userDisabled = ds.GetTarget(addon, userRes, true);
    if(userDisabled instanceof Components.interfaces.nsIRDFLiteral && userDisabled.Value == "true")
      return true;

    return false;
  }
  return pub;
}();

addEventListener('messagepane-loaded', org.mozdev.compactHeader.pane.coheOnLoadMsgHeaderPane, true);
addEventListener('messagepane-unloaded', org.mozdev.compactHeader.pane.coheOnUnloadMsgHeaderPane, true);
addEventListener('load', org.mozdev.compactHeader.pane.coheInitializeOverlay, false);

