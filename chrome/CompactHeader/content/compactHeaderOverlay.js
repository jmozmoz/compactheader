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

  const COMPACTHEADER_EXTENSION_UUID = "{58D4392A-842E-11DE-B51A-C7B855D89593}";

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

  var browserPreferences = Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefService)
    .getBranch("browser.preferences.");

  var cohe={
    version: -1,
    firstrun: true,
    current: -1
  };

  var coheFirstTime = true;
  var headerFirstTime = true;

  var pressMores = null;
  var gMoreTooltip = "";

  function coheOutputSubject(headerEntry, headerValue) {
    var subjectBox;

    if (cohePrefBranch.getBoolPref("headersize.twolineview")) {
      subjectBox = document.getElementById("CompactHeader_collapsed2LsubjectOutBox")
    } else {
      subjectBox = document.getElementById("CompactHeader_collapsed1LsubjectOutBox")
    }

//    if (subjectBox) {
//      subjectBox.setAttribute("tooltiptext", headerValue);
//    }
    updateHeaderValue(headerEntry, headerValue);
  }

  function coheOutputEmailAddresses(headerEntry, emailAddresses, addressType) {
    /* function copied from comm-1.9.1/ mail/ base/ content/ msgHdrViewOverlay.js 771135e6aaf5 */
    if (!emailAddresses)
      return;

    var addresses = {};
    var fullNames = {};
    var names = {};
    var numAddresses =  0;

    let moreButton = document.getAnonymousElementByAttribute(document.getElementById("CompactHeader_collapsed2LtoCcBccBox"),
        "anonid", "more");
    let moreTooltip = gMoreTooltip;
//    let moreTooltip = moreButton.getAttribute("tooltiptext");

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
      address.addressType = addressType;
      if (cohePrefBranch.getBoolPref("headersize.addressstyle")) {
        address.displayName = address.emailAddress;
        address.fullAddress = address.emailAddress;
      } else {
        address.displayName = names.value[index];
      }
      org.mozdev.compactHeader.debug.log("0: " + address.fullAddress);
      org.mozdev.compactHeader.debug.log("0: " + addressType);
      if (address.fullAddress != "" &&
           (addressType == "to" || addressType == "cc" || addressType == "bcc")) {
        if (moreTooltip == "") {
          moreTooltip = address.fullAddress;
          org.mozdev.compactHeader.debug.log("1: " + address.fullAddress);
        } else {
          moreTooltip = moreTooltip + ", " + address.fullAddress;
          org.mozdev.compactHeader.debug.log("2: " + address.fullAddress);
        }
      }
//      window.alert(address);
      if (headerEntry.useToggle && (typeof headerEntry.enclosingBox.addAddressView == 'function')) {
        headerEntry.enclosingBox.addAddressView(address);
      } else {
        updateEmailAddressNode(headerEntry.enclosingBox.emailAddressNode, address);
      }
      index++;
    }
    org.mozdev.compactHeader.debug.log("tooltiptext: " + moreTooltip);
    moreButton.setAttribute("tooltiptext", moreTooltip);
    gMoreTooltip = moreTooltip;

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
          new createHeaderEntry('CompactHeader_collapsed2L', gCoheCollapsedHeader2LListLongAddresses[index]);
      }
      let moreButton = document.getAnonymousElementByAttribute(document.getElementById("CompactHeader_collapsed2LtoCcBccBox"),
        "anonid", "more");

      if (moreButton) {
        let oldToggleWrap = moreButton.parentNode.toggleWrap;
        moreButton.parentNode.toggleWrap = function() {
          pressMores = pressMoreButtons;
          pub.coheToggleHeaderView();
        };
      }
    } else {
      for (index = 0; index < gCoheCollapsedHeader1LListLongAddresses.length; index++) {
        gCoheCollapsedHeaderView[gCoheCollapsedHeader1LListLongAddresses[index].name] =
          new createHeaderEntry('CompactHeader_collapsed1L', gCoheCollapsedHeader1LListLongAddresses[index]);
      }
    }

    org.mozdev.compactHeader.RSSLinkify.InitializeHeaderViewTables();
  }

  function pressMoreButtons() {
    let moreButtonTo = document.getAnonymousElementByAttribute(document.getElementById("expandedtoBox"),
        "anonid", "more");
    let moreButtonCC = document.getAnonymousElementByAttribute(document.getElementById("expandedccBox"),
        "anonid", "more");
    let moreButtonBCC = document.getAnonymousElementByAttribute(document.getElementById("expandedbccBox"),
        "anonid", "more");
    if (!moreButtonTo.hasAttribute("collapsed")) {
      moreButtonTo.click();
      org.mozdev.compactHeader.debug.log("toggle To");
    }
    if (!moreButtonCC.hasAttribute("collapsed")) {
      moreButtonCC.click();
      org.mozdev.compactHeader.debug.log("toggle cc");
    }
    if (!moreButtonBCC.hasAttribute("collapsed")) {
      moreButtonBCC.click();
      org.mozdev.compactHeader.debug.log("toggle bcc");
    }
    pressMores = null;
  }

  pub.coheOnLoadMsgHeaderPane = function() {
    org.mozdev.compactHeader.debug.log("coheOnLoadMsgHeaderPane start");

    coheInitializeHeaderViewTables();

    // Add an address book listener so we can update the header view when things
    // change.
    Components.classes["@mozilla.org/abmanager;1"]
              .getService(Components.interfaces.nsIAbManager)
              .addAddressBookListener(coheAddressBookListener,
                                      Components.interfaces.nsIAbListener.all);

    var deckHeaderView = document.getElementById("msgHeaderViewDeck");

    gCoheCollapsedHeaderViewMode =
      deckHeaderView.selectedPanel == document.getElementById('CompactHeader_collapsedHeaderView');

    org.mozdev.compactHeader.debug.log("coheOnLoadMsgHeaderPane 1");

    // work around XUL deck bug where collapsed header view, if it's the persisted
    // default, wouldn't be sized properly because of the larger expanded
    // view "stretches" the deck.
    if (gCoheCollapsedHeaderViewMode)
      document.getElementById('expandedHeaderView').collapsed = true;
    else
      document.getElementById('CompactHeader_collapsedHeaderView').collapsed = true;

    if (cohePrefBranch.getBoolPref("headersize.twolineview")) {
      document.getElementById('CompactHeader_collapsed1LHeadersBox').collapsed = true;
      document.getElementById('CompactHeader_collapsed2LHeadersBox').collapsed = false;
    } else {
      document.getElementById('CompactHeader_collapsed1LHeadersBox').collapsed = false;
      document.getElementById('CompactHeader_collapsed2LHeadersBox').collapsed = true;
    }

    org.mozdev.compactHeader.debug.log("coheOnLoadMsgHeaderPane 2");

    if (coheFirstTime)
    {
      org.mozdev.compactHeader.debug.log("coheFirstTime");
      coheFirstTime = false;
      gMessageListeners.push(coheMessageListener);
      org.mozdev.customizeHeaderToolbar.messenger.loadToolboxData();
      org.mozdev.compactHeader.toolbar.fillToolboxPalette();
      org.mozdev.customizeHeaderToolbar.messenger.saveToolboxData();

      let collapsed2LtoCcBccBox = document.getElementById("CompactHeader_collapsed2LtoCcBccBox");
      if (collapsed2LtoCcBccBox) {
        let updateEmailAddressNodeFunction = collapsed2LtoCcBccBox.updateEmailAddressNode;
        function updateEmailAddressNodeNew(aEmailNode, aAddress) {
          try {
            updateEmailAddressNodeFunction(aEmailNode, aAddress);
          }
          catch(e) {
            org.mozdev.compactHeader.debug.log("got execption " + e +
              " from updateEmailAddressNode");
          }
          aEmailNode.setAttribute("addressType", aAddress.addressType);
        }
        collapsed2LtoCcBccBox.updateEmailAddressNode = updateEmailAddressNodeNew;
        if (typeof collapsed2LtoCcBccBox.setNMoreTooltiptext == 'function') {
          // remove setNMoreTooltiptext because we have our own function
          collapsed2LtoCcBccBox.setNMoreTooltiptext = function() {
            let moreButton = document.getAnonymousElementByAttribute(document.getElementById("CompactHeader_collapsed2LtoCcBccBox"),
              "anonid", "more");
            if (moreButton) {
              moreButton.setAttribute("tooltiptext", gMoreTooltip);
            }
          };
        }
      }
    }

    org.mozdev.compactHeader.debug.log("coheOnLoadMsgHeaderPane 2a");

    if (cohe.firstrun) {
      coheCheckFirstRun();
    }

    org.mozdev.compactHeader.debug.log("coheOnLoadMsgHeaderPane 3");

    org.mozdev.compactHeader.toolbar.setButtonStyle();
    org.mozdev.customizeHeaderToolbar.messenger.saveToolboxData();
    org.mozdev.compactHeader.toolbar.dispMUACheck();

    org.mozdev.compactHeader.debug.log("coheOnLoadMsgHeaderPane 4");

    coheToggleHeaderContent();

    org.mozdev.compactHeader.debug.log("coheOnLoadMsgHeaderPane stop");
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
      if (pressMores) {
        pressMoreButtons();
        pressMore = null;
      }
    },

    onEndAttachments: function cML_onEndAttachments(){}
  };

  pub.coheOnUnloadMsgHeaderPane = function()
  {
    Components.classes["@mozilla.org/abmanager;1"]
              .getService(Components.interfaces.nsIAbManager)
              .removeAddressBookListener(coheAddressBookListener);

    removeEventListener('messagepane-loaded', 
      org.mozdev.compactHeader.pane.coheOnLoadMsgHeaderPane, true);
    removeEventListener('messagepane-unloaded', 
      org.mozdev.compactHeader.pane.coheOnUnloadMsgHeaderPane, true);
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
    if (hdrToolbar) {
      var buttons = hdrToolbar.querySelectorAll("[disabled*='true']");
      for (var i=0; i<buttons.length; i++) {
        buttons[i].removeAttribute("disabled");
      }
    }
  }

  pub.coheToggleHeaderView = function() {
    org.mozdev.compactHeader.debug.log("coheToggleHeaderView start");
    gCoheCollapsedHeaderViewMode = !gCoheCollapsedHeaderViewMode;

    let deck = document.getElementById('msgHeaderViewDeck');
    // Work around a xul deck bug where the height of the deck is determined
    // by the tallest panel in the deck even if that panel is not selected...
    deck.selectedPanel.collapsed = true;

    if (gCoheCollapsedHeaderViewMode) {
      deck.selectedPanel = document.getElementById("CompactHeader_collapsedHeaderView")
      gDBView.reloadMessage();
      //coheUpdateMessageHeaders();
    } else {
      deck.selectedPanel = document.getElementById("expandedHeaderView");
      //ClearHeaderView(gExpandedHeaderView);
      gDBView.reloadMessage();
      //UpdateExpandedMessageHeaders();
    }

    // Work around a xul deck bug where the height of the deck is determined
    // by the tallest panel in the deck even if that panel is not selected...
    deck.selectedPanel.collapsed = false;
    syncGridColumnWidths();

    coheToggleHeaderContent();
    org.mozdev.compactHeader.debug.log("coheToggleHeaderView stop");
  }

  function coheToggleHeaderContent() {
    org.mozdev.compactHeader.debug.log("coheToggleHeaderContent start");
    var strHideLabel = document.getElementById("CompactHeader_CoheHideDetailsLabel").value;
    var strShowLabel = document.getElementById("CompactHeader_CoheShowDetailsLabel").value;
    var strLabel;

    var smimeBox = document.getElementById("smimeBox");

    if (smimeBox != null) {
      if (gCoheCollapsedHeaderViewMode) {
        var parent = document.getElementById("CompactHeader_collapsed2LdateOutBox");
        var refElement = document.getElementById("CompactHeader_collapsed2LdateRow");
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
        var parent = document.getElementById("CompactHeader_collapsed2LdateOutBox");
        var refElement = document.getElementById("CompactHeader_collapsed2LdateRow");
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
    if (document.getElementById("CompactHeader_hideDetailsMenu")) {
      document.getElementById("CompactHeader_hideDetailsMenu").setAttribute("label", strLabel);
    }

    org.mozdev.compactHeader.toolbar.setCurrentToolboxPosition(gCoheCollapsedHeaderViewMode);

    if (document.getElementById("CompactHeader_hideDetailsMenu")) {
      document.getElementById("CompactHeader_hideDetailsMenu").setAttribute("label", strLabel);
    }
    
    document.getElementById("CompactHeader_viewMenuCompactBroadcast")
            .setAttribute("checked", gCoheCollapsedHeaderViewMode);
    
    org.mozdev.compactHeader.debug.log("coheToggleHeaderContent stop");
  }

  // default method for updating a header value into a header entry
  function coheUpdateHeaderValueInTextNode(headerEntry, headerValue)
  {
    headerEntry.textNode.value = headerValue;
  }

  function coheUpdateDateValue(headerEntry, headerValue, dummy, currentHeaderData) {
    //var t = currentHeaderData.date.headerValue;
    var d1, d2;
    d1 = document.getElementById("CompactHeader_collapsed1LdateBox");
    d2 = document.getElementById("CompactHeader_collapsed2LdateBox");
    if ("x-mozilla-localizeddate" in currentHeaderData) {
      d1.textContent = currentHeaderData["x-mozilla-localizeddate"].headerValue;
      d2.textContent = currentHeaderData["x-mozilla-localizeddate"].headerValue;
    } else {
      d1.textContent = headerValue;
      d2.textContent = headerValue;
    }
  }


  // coheUpdateMessageHeaders: Iterate through all the current header data we received from mime for this message
  // for each header entry table, see if we have a corresponding entry for that header. i.e. does the particular
  // view care about this header value. if it does then call updateHeaderEntry
  function coheUpdateMessageHeaders()
  {
    org.mozdev.compactHeader.debug.log("coheUpdateMessageHeaders start");
    // Remove the height attr so that it redraws correctly. Works around a
    // problem that attachment-splitter causes if it's moved high enough to
    // affect the header box:
    document.getElementById('msgHeaderView').removeAttribute('height');

    let moreButton = document.getAnonymousElementByAttribute(document.getElementById("CompactHeader_collapsed2LtoCcBccBox"),
        "anonid", "more");
    moreButton.setAttribute("tooltiptext", "");
    gMoreTooltip = "";

    // iterate over each header we received and see if we have a matching entry
    // in each header view table...
    var keys = [];
    for (var key in currentHeaderData) {
      if (currentHeaderData.hasOwnProperty(key)) {
        keys.push(key);
      }
    }

    keys.sort();
    keys.reverse();
    for (let i=0; i<keys.length; i++)
    {
      let headerName = keys[i];
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
        headerEntry.outputFunction(headerEntry, headerField.headerValue, headerName, currentHeaderData);
        headerEntry.valid = true;
      }
    }

    if (headerFirstTime) {
      org.mozdev.compactHeader.debug.log("headerFirstTime");
      headerFirstTime = false;
      var toolbox = document.getElementById("header-view-toolbox");
      var mailToolbox = document.getElementById("mail-toolbox");
      var oldCustomizeDone = toolbox.customizeDone;
      var oldCustomizeDoneMailToolbox = mailToolbox.customizeDone;
      toolbox.customizeDone = function(aEvent) {
        org.mozdev.compactHeader.debug.log("customizeDone start");
        oldCustomizeDone(aEvent);
        org.mozdev.compactHeader.debug.log("customizeDone 0");
        org.mozdev.compactHeader.toolbar.onDoCustomizationHeaderViewToolbox("doCustomization");
        org.mozdev.compactHeader.debug.log("customizeDone stop");
      };
      mailToolbox.customizeDone = function(aEvent) {
        org.mozdev.compactHeader.debug.log("customizeDone start");
        oldCustomizeDoneMailToolbox(aEvent);
        org.mozdev.compactHeader.debug.log("customizeDone 0");
        org.mozdev.compactHeader.toolbar.onDoCustomizationHeaderViewToolbox("doCustomization");
        org.mozdev.compactHeader.debug.log("customizeDone stop");
      };
    }

    if (gCoheCollapsedHeaderViewMode)
     gCoheBuiltCollapsedView = true;

    // now update the view to make sure the right elements are visible
    coheUpdateHeaderView();
    org.mozdev.compactHeader.debug.log("coheUpdateMessageHeaders stop");
  }

  function selectEmailDisplayed() {
    var xulemail = document.getElementById("CompactHeader_collapsedtoCcBccBox");
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
    var xulemail = document.getElementById("CompactHeader_collapsedfromBox");
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

  var myPrefObserver =
  {
    register: function()
    {
      // First we'll need the preference services to look for preferences.
      var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                                  .getService(Components.interfaces.nsIPrefService);

      // For this._branch we ask that the preferences for extensions.myextension. and children
      this._branch = prefService.getBranch("extensions.CompactHeader.");

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
      org.mozdev.compactHeader.debug.log("prefObserver start");
      if(aTopic != "nsPref:changed") return;
      // aSubject is the nsIPrefBranch we're observing (after appropriate QI)
      // aData is the name of the pref that's been changed (relative to aSubject)
      org.mozdev.compactHeader.debug.log("prefObserver 1: " + aData);

      if (  (aData == "headersize.addressstyle")
          ||(aData == "headersize.twolineview")
          ||(aData == "headersize.linkify")
          ||(aData == "toolbox.position")
          ) {
        preferencesUpdate();
      } else if (aData == "header.doubleclick") {
        setDblClickHeaderEventHandler();
      }

      org.mozdev.compactHeader.debug.log("prefObserver stop");
    }
  }

  var wasHere = false;

  function preferencesUpdate() {
    org.mozdev.compactHeader.debug.log("preferencesUpdate " + wasHere);
    if (!browserPreferences.getBoolPref("instantApply")
        && wasHere)
      return;
    org.mozdev.compactHeader.debug.log("preferencesUpdate 2");
    wasHere = true;
    ReloadMessage();
    pub.coheOnLoadMsgHeaderPane();
    org.mozdev.compactHeader.toolbar.setCurrentToolboxPosition(gCoheCollapsedHeaderViewMode);
//    var event = document.createEvent('Events');
//    event.initEvent('messagepane-loaded', false, true);
//    var headerViewElement = document.getElementById("msgHeaderView");
//    headerViewElement.dispatchEvent(event);
    setTimeout(clearReloadTimeout, 250);
    org.mozdev.compactHeader.debug.log("preferencesUpdate stop");
  }

  function clearReloadTimeout() {
    wasHere = false;
    org.mozdev.compactHeader.debug.log("wasHere cleared");
  }

  function coheCheckFirstRun() {
    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                                     .getService(Components.interfaces.nsIXULAppInfo);
//    org.mozdev.compactHeader.debug.log("first run 0");
    var debugLevel = org.mozdev.compactHeader.debug.getLogLevel();
    org.mozdev.compactHeader.debug.log("firstrun 3");
    org.mozdev.compactHeader.toolbar.populateEmptyToolbar();
    Components.utils.import("resource://gre/modules/AddonManager.jsm");
    AddonManager.getAddonByID(COMPACTHEADER_EXTENSION_UUID,
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
    org.mozdev.compactHeader.debug.log("firstrun 4");
  }


  pub.coheInitializeOverlay = function() {
    // var gExtensionManager = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);
    // check if this is part of CompactHeader
    // if ((gExtensionManager.getItemForID(COMPACTHEADER_EXTENSION_UUID) == null) || isAddonDisabled(COMPACTHEADER_EXTENSION_UUID)) {
    //  return;
    //}
    org.mozdev.compactHeader.debug.log("before register");
    coheUninstallObserver.register();
    myPrefObserver.register();
    org.mozdev.compactHeader.debug.log("register PrefObserver");
    org.mozdev.compactHeader.debug.log("after register");
    if ((typeof MessageDisplayWidget != "undefined") && MessageDisplayWidget) {
      org.mozdev.compactHeader.debug.log("coheInitializeOverlay found MessageDisplayWidget");
      var oldUpdateActiveMessagePane = MessageDisplayWidget.prototype._updateActiveMessagePane;
      MessageDisplayWidget.prototype._updateActiveMessagePane = function() {
        org.mozdev.compactHeader.debug.log("_updateActiveMessagePane start");
        oldUpdateActiveMessagePane.call(this);
        org.mozdev.compactHeader.toolbar.setCurrentToolboxPosition(gCoheCollapsedHeaderViewMode);
        org.mozdev.compactHeader.debug.log("_updateActiveMessagePane stop");
      };
    }
    else {
      org.mozdev.compactHeader.debug.log("coheInitializeOverlay didn't find MessageDisplayWidget");
    }

    var multiMessage = document.getElementById("multimessage");
    if (multiMessage) {
      org.mozdev.compactHeader.debug.log("multiMessage " + multiMessage);
      multiMessage.addEventListener("DOMContentLoaded", multiMessageLoaded, true);
    }

    addMessagePaneBoxFocusHandler();
    setDblClickHeaderEventHandler();
    org.mozdev.compactHeader.debug.log("coheInitializeOverlay stop");
  };

  function addMessagePaneBoxFocusHandler() {
    let messagepanebox = document.getElementById("messagepanebox");
    if (messagepanebox) {
      messagepanebox.addEventListener("focus", messagePaneBoxFocus, true);
      messagepanebox.addEventListener("blur", messagePaneBoxBlur, true);
    }
  }

  var msgHeaderViewBackground;

  function messagePaneBoxFocus(event) {
    org.mozdev.compactHeader.debug.log("messagePaneBoxFocus start");
    let msgHeaderView = document.getElementById("msgHeaderView");
    let wintype = document.documentElement.getAttribute("windowtype");
//    let tabmail = document.getElementById("tabmail");
    if (cohePrefBranch.getBoolPref("header.darkenonfocus") &&
        msgHeaderView && wintype && wintype == "mail:3pane" ) {
//          && tabmail && tabmail.tabContainer.selectedIndex == 0) {
      org.mozdev.compactHeader.debug.log("background: " +
          msgHeaderViewBackground);
      if (typeof msgHeaderViewBackground === "undefined") {
        var style =
          document.defaultView.getComputedStyle(msgHeaderView, null);
        msgHeaderViewBackground = style.getPropertyValue("background-color");
      }
      org.mozdev.compactHeader.debug.log("style: " + style);
      org.mozdev.compactHeader.debug.log("background: " +
        msgHeaderViewBackground);
      let newColor = darkenColor(msgHeaderViewBackground);
      msgHeaderView.style.backgroundColor = newColor;
      //       msgHeaderView.setAttribute('style', 'background-color:darkblue;');
    }
    org.mozdev.compactHeader.debug.log("messagePaneBoxFocus stop");
  }

  function darkenColor(color) {
    var digits = /(.*?)rgb\((\d+), (\d+), (\d+)\)/.exec(color);

    var red = parseInt(digits[2]);
    var green = parseInt(digits[3]);
    var blue = parseInt(digits[4]);

    let factor = 0.9;

    red = red * factor;
    green = green * factor;
    blue = blue * factor;

    var rgb = blue | (green << 8) | (red << 16);
    return digits[1] + '#' + rgb.toString(16);
}

  function messagePaneBoxBlur(event) {
    let msgHeaderView = document.getElementById("msgHeaderView");
    let wintype = document.documentElement.getAttribute("windowtype");
    let tabmail = document.getElementById("tabmail");
//    if (msgHeaderView && wintype && wintype == "mail:3pane" &&
//        tabmail && tabmail.tabContainer.selectedIndex == 0) {
    if (msgHeaderView) {
      if (!(typeof msgHeaderViewBackground === "undefined")) {
        msgHeaderView.style.backgroundColor = msgHeaderViewBackground;
        msgHeaderViewBackground = undefined;
      }
    }
  }

  function setDblClickHeaderEventHandler() {
    var msgHeaderViewDeck = document.getElementById("msgHeaderViewDeck");
    if (msgHeaderViewDeck){
      org.mozdev.compactHeader.debug.log("msgHeaderViewDeck " + msgHeaderViewDeck);
      if (cohePrefBranch.getBoolPref("header.doubleclick"))
        msgHeaderViewDeck.addEventListener("dblclick", org.mozdev.compactHeader.pane.coheToggleHeaderView, true);
      else
        msgHeaderViewDeck.removeEventListener("dblclick", org.mozdev.compactHeader.pane.coheToggleHeaderView, true);
    }
  }

  function multiMessageLoaded() {
    org.mozdev.compactHeader.debug.log("multiMessageLoaded start");
    org.mozdev.compactHeader.toolbar.setCurrentToolboxPosition(gCoheCollapsedHeaderViewMode);
    org.mozdev.compactHeader.debug.log("multiMessageLoaded stop");
  }

  var coheUninstallObserver = {
    _uninstall : false,
    observe : function(subject, topic, data) {
      if (topic == "em-action-requested") {
        subject.QueryInterface(Components.interfaces.nsIUpdateItem);

        if (subject.id == COMPACTHEADER_EXTENSION_UUID) {
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
      if (addon.id == COMPACTHEADER_EXTENSION_UUID) {
        this._uninstall = true;
      }
    },

    onOperationCancelled: function(addon) {
      if (addon.id == COMPACTHEADER_EXTENSION_UUID) {
        this._uninstall = (addon.pendingOperations & AddonManager.PENDING_UNINSTALL) != 0;
      }
    },

    register : function() {
      org.mozdev.compactHeader.debug.log("register uninstall start");
      var observerService =
        Components.classes["@mozilla.org/observer-service;1"].
        getService(Components.interfaces.nsIObserverService);
      org.mozdev.compactHeader.debug.log("register uninstall start 1");

      org.mozdev.compactHeader.debug.log("register uninstall start 2");

      org.mozdev.compactHeader.debug.log("register uninstall neu 2");
      observerService.addObserver(this, "quit-application-granted", false);
      Components.utils.import("resource://gre/modules/AddonManager.jsm");
      AddonManager.addAddonListener(this);
      org.mozdev.compactHeader.debug.log("register uninstall neu 2");
    },
    unregister : function() {
      var observerService =
        Components.classes["@mozilla.org/observer-service;1"].
          getService(Components.interfaces.nsIObserverService);

      observerService.removeObserver(this, "quit-application-granted");
      AddonManager.removeAddonListener(this);
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
