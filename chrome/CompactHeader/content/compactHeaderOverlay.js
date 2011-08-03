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

//Components.utils.import("chrome://CompactHeader/content/RSSLinkify.jsm");
//Components.utils.import("chrome://CompactHeader/content/debug.jsm");
//Components.utils.import("chrome://CompactHeader/content/toolbar.jsm");

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

//    if (subjectBox) {
//      subjectBox.setAttribute("tooltiptext", headerValue);
//    }
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

    org.mozdev.compactHeader.RSSLinkify.InitializeHeaderViewTables();
  }

  pub.coheOnLoadMsgHeaderPane = function() {
    org.mozdev.compactHeader.debug.log("start coheOnLoadMsgHeaderPane");

    coheInitializeHeaderViewTables();

    // Add an address book listener so we can update the header view when things
    // change.
    Components.classes["@mozilla.org/abmanager;1"]
              .getService(Components.interfaces.nsIAbManager)
              .addAddressBookListener(coheAddressBookListener,
                                      Components.interfaces.nsIAbListener.all);

    var deckHeaderView = document.getElementById("msgHeaderViewDeck");

    gCoheCollapsedHeaderViewMode =
      deckHeaderView.selectedPanel == document.getElementById('collapsedHeaderView');

    var headerViewToolbox = document.getElementById("header-view-toolbox");
    if (headerViewToolbox) {
      headerViewToolbox.addEventListener("DOMAttrModified",
        org.mozdev.compactHeader.toolbar.onDoCustomizationHeaderViewToolbox, false);
    }

    var mailToolbox = document.getElementById("mail-toolbox");
    if (mailToolbox) {
      mailToolbox.addEventListener("DOMAttrModified",
        org.mozdev.compactHeader.toolbar.onDoCustomizationHeaderViewToolbox, false);
    }
    var dispMUAicon = document.getElementById("dispMUAicon");
    if (dispMUAicon) {
      dispMUAicon.addEventListener("DOMAttrModified",
        org.mozdev.compactHeader.toolbar.onChangeDispMUAicon, false);
    }

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

    if (coheFirstTime)
    {
      coheFirstTime = false;
      gMessageListeners.push(coheMessageListener);
      org.mozdev.customizeHeaderToolbar.messenger.loadToolboxData();
      org.mozdev.compactHeader.toolbar.fillToolboxPalette();
      org.mozdev.customizeHeaderToolbar.messenger.saveToolboxData();
      var toolbox = document.getElementById("header-view-toolbox");
      toolbox.customizeDone = function(aEvent) {
        MailToolboxCustomizeDone(aEvent, "CustomizeHeaderToolbar");
        document.getElementById("header-view-toolbox").removeAttribute("doCustomization");
        enableButtons();
        org.mozdev.compactHeader.toolbar.CHTUpdateReplyButton();
        org.mozdev.compactHeader.toolbar.CHTUpdateJunkButton();
        org.mozdev.compactHeader.buttons.coheToggleStar();
        org.mozdev.customizeHeaderToolbar.messenger.saveToolboxData();
      };
    }

    if (cohe.firstrun) {
      coheCheckFirstRun();
    }

    coheToggleHeaderContent();
    var dispMUA = document.getElementById('dispMUA');
    if (dispMUA) {
      dispMUA.collapsed = true;
    }
    org.mozdev.compactHeader.toolbar.setButtonStyle();
    org.mozdev.customizeHeaderToolbar.messenger.saveToolboxData();
    org.mozdev.compactHeader.toolbar.dispMUACheck();
    org.mozdev.compactHeader.debug.log("stop coheOnLoadMsgHeaderPane");
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

  // make sure the appropriate fields within the currently displayed view header mode
  // are collapsed or visible...
  function coheUpdateHeaderView()
  {
    if (gCoheCollapsedHeaderViewMode)
      showHeaderView(gCoheCollapsedHeaderView);

    org.mozdev.compactHeader.RSSLinkify.UpdateHeaderView(currentHeaderData);

    if (cohePrefBranch.getBoolPref("headersize.addressstyle")) {
      selectEmailDisplayed();
    }

    //org.mozdev.compactHeader.toolbar.fillToolboxPalette(document);
    coheToggleHeaderContent();
    org.mozdev.compactHeader.toolbar.CHTUpdateReplyButton();
    org.mozdev.compactHeader.toolbar.CHTUpdateJunkButton();
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

  pub.coheToggleHeaderView = function() {
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
  }

  function coheToggleHeaderContent() {
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


    var dispMUABox = document.getElementById("dispMUA");

    if (dispMUABox != null) {
      if (gCoheCollapsedHeaderViewMode) {
        var parent = document.getElementById("collapsed2LdateOutBox");
        var refElement = document.getElementById("collapsed2LdateRow");
        if (parent != null && refElement != null) {
          parent.insertBefore(dispMUABox, refElement);
        }
      }
      else {
        var parent = document.getElementById("dateValueBox");
        var refElement = document.getElementById("dateLabel");
        if (parent != null && refElement != null) {
          parent.insertBefore(dispMUABox, refElement);
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

    org.mozdev.compactHeader.toolbar.toggle(gCoheCollapsedHeaderViewMode);

    if (document.getElementById("hideDetailsMenu")) {
      document.getElementById("hideDetailsMenu").setAttribute("label", strLabel);
    }
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
      org.mozdev.compactHeader.debug.log("hit prefObserver");
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

  function coheCheckFirstRun() {
    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                                     .getService(Components.interfaces.nsIXULAppInfo);
    var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                                            .getService(Components.interfaces.nsIVersionComparator);
//    org.mozdev.compactHeader.debug.log("first run 0");
    var debugLevel = org.mozdev.compactHeader.debug.getLogLevel();
    if(versionChecker.compare(appInfo.version, "3.2a1pre") < 0) {
      org.mozdev.compactHeader.debug.log("firstrun 1");
      org.mozdev.compactHeader.toolbar.populateEmptyToolbar();
      cohe.version = -1;
      cohe.firstrun = false;
      cohe.gExtensionManager = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);
      // check if this is part of CompactHeader
      if ((cohe.gExtensionManager.getItemForID(COHE_EXTENSION_UUID) == null) || (isAddonDisabled(COHE_EXTENSION_UUID))) {
        return;
      }

      cohe.current = cohe.gExtensionManager.getItemForID(COHE_EXTENSION_UUID).version;
      try{
        cohe.version = cohePrefBranch.getCharPref("version");
        cohe.firstrun = cohePrefBranch.getBoolPref("firstrun");
      } catch(e) {
      } finally {
        //check for first run
        if (cohe.firstrun){
          cohePrefBranch.setBoolPref("firstrun",false);
          cohePrefBranch.setCharPref("version",cohe.current);
          org.mozdev.compactHeader.toolbar.CHTSetDefaultButtons();
        }
        //check for upgrade
        if (cohe.version!=cohe.current && !cohe.firstrun){
          cohePrefBranch.setCharPref("version",cohe.current);
          // XXX
        }
        cohe.firstrun = false;
        cohePrefBranch.setIntPref("debugLevel", debugLevel);
      }
    }
    else {
      org.mozdev.compactHeader.debug.log("firstrun 3");
      org.mozdev.compactHeader.toolbar.populateEmptyToolbar();
      Components.utils.import("resource://gre/modules/AddonManager.jsm");
      AddonManager.getAddonByID(COHE_EXTENSION_UUID,
        function(myAddon) {
          org.mozdev.compactHeader.debug.log("first run 2");
          cohe.version = "";
          cohe.firstrun = false;
          cohe.current = myAddon.version;
          try{
            cohe.version = cohePrefBranch.getCharPref("version");
            cohe.firstrun = cohePrefBranch.getBoolPref("firstrun");
          } catch(e) {
          } finally {
            //check for first run
            if (cohe.firstrun){
              org.mozdev.compactHeader.debug.log("first run 2c");
              org.mozdev.compactHeader.toolbar.CHTSetDefaultButtons();
              cohePrefBranch.setBoolPref("firstrun",false);
              cohePrefBranch.setCharPref("version",cohe.current);
              org.mozdev.compactHeader.debug.log("first run 2cc");
            }
            //check for upgrade
            if (cohe.version!=cohe.current && !cohe.firstrun){
              cohePrefBranch.setCharPref("version",cohe.current);
              org.mozdev.compactHeader.debug.log("found version change");
              // XXX
            }
            cohe.firstrun = false;
            org.mozdev.compactHeader.debug.log("first run 2d");
          }
        }
      );
    }
    org.mozdev.compactHeader.debug.log("firstrun 4");
  }


  pub.coheInitializeOverlay = function() {
    // var gExtensionManager = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);
    // check if this is part of CompactHeader
    // if ((gExtensionManager.getItemForID(COHE_EXTENSION_UUID) == null) || isAddonDisabled(COHE_EXTENSION_UUID)) {
    //  return;
    //}
    org.mozdev.compactHeader.debug.log("before register");
    coheUninstallObserver.register();
    myPrefObserverHeaderSize.register();
    org.mozdev.compactHeader.debug.log("register PrefObserver");
    org.mozdev.compactHeader.debug.log("after register");
  }

  var coheUninstallObserver = {
    _uninstall : false,
    observe : function(subject, topic, data) {
      if (topic == "em-action-requested") {
        subject.QueryInterface(Components.interfaces.nsIUpdateItem);

        if (subject.id == COHE_EXTENSION_UUID) {
          org.mozdev.compactHeader.debug.log("uninstalling COHE 1");
          if (data == "item-uninstalled") {
            this._uninstall = true;
          } else if (data == "item-cancel-action") {
            this._uninstall = false;
          }
        }
      } else if (topic == "quit-application-granted") {
        org.mozdev.compactHeader.debug.log("uninstalling COHE 2");
        if (this._uninstall) {
          cohePrefBranch.deleteBranch("");
          org.mozdev.compactHeader.toolbar.CHTCleanupButtons();
        }
        this.unregister();
      }
    },
    onUninstalling: function(addon) {
      if (addon.id == COHE_EXTENSION_UUID) {
        this._uninstall = true;
      }
    },

    onOperationCancelled: function(addon) {
      if (addon.id == COHE_EXTENSION_UUID) {
        this._uninstall = (addon.pendingOperations & AddonManager.PENDING_UNINSTALL) != 0;
      }
    },

    register : function() {
      org.mozdev.compactHeader.debug.log("register uninstall start");
      var observerService =
        Components.classes["@mozilla.org/observer-service;1"].
        getService(Components.interfaces.nsIObserverService);
      org.mozdev.compactHeader.debug.log("register uninstall start 1");

      var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                                       .getService(Components.interfaces.nsIXULAppInfo);
      var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                                              .getService(Components.interfaces.nsIVersionComparator);
      org.mozdev.compactHeader.debug.log("register uninstall start 2");

      if(versionChecker.compare(appInfo.version, "3.2a1pre") < 0) {
        observerService.addObserver(this, "em-action-requested", false);
        observerService.addObserver(this, "quit-application-granted", false);
      }
      else {
        org.mozdev.compactHeader.debug.log("register uninstall neu 2");
        observerService.addObserver(this, "quit-application-granted", false);
        Components.utils.import("resource://gre/modules/AddonManager.jsm");
        AddonManager.addAddonListener(this);
        org.mozdev.compactHeader.debug.log("register uninstall neu 2");
      }
    },
    unregister : function() {
      var observerService =
        Components.classes["@mozilla.org/observer-service;1"].
          getService(Components.interfaces.nsIObserverService);

      var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                                              .getService(Components.interfaces.nsIVersionComparator);
      if(versionChecker.compare(appInfo.version, "3.2a1pre") < 0) {
        observerService.removeObserver(this,"em-action-requested");
        observerService.removeObserver(this,"quit-application-granted");
      }
      else {
        observerService.removeObserver(this, "quit-application-granted");
        AddonManager.removeAddonListener(this);
      }
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
