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
#   Markus Hossner <markushossner@gmx.de>
#   Mark Banner <bugzilla@standard8.plus.com>
#   David Ascher <dascher@mozillamessaging.com>
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

var gCoheCollapsedHeaderViewMode = false;
var gCoheBuiltCollapsedView = false;

/**
 * The collapsed view: very lightweight. We only show a couple of fields.  See
 * msgHdrViewOverlay.js for details of the field definition semantics.
 */
 var gCoheCollapsedHeaderList = [
  {name:"subject", outputFunction:coheUpdateHeaderValueInTextNode},
  {name:"from", useToggle:true, useShortView:true, outputFunction: OutputEmailAddresses},
//  {name:"toCcBcc", useToggle:true, useShortView:true, outputFunction: OutputEmailAddresses},
  {name:"date", outputFunction:OutputDate}];

	var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefService)
    .getBranch("extensions.CompactHeader.");

	var buttonslist = ["Reply", "Forward", "Archive", "Junk", "Trash"];
	var buttonsanonid = [["hdrReplyButton", "hdrReplyAllButton", "hdrReplyListButton"], 
//												"hdrReplyDropdown", "hdrReplySubButton", "hdrReplyAllSubButtonSep",
//												"hdrReplyAllSubButton", "hdrReplyAllDropdown", "hdrReplyAllSubButton",
//												"hdrReplySubButton", "hdrReplyListDropdown", "hdrReplyListSubButton",
//												"hdrReplyAllSubButton", "hdrReplySubButton"],
											 ["hdrForwardButton"],
											 ["archiveButton"],
											 ["hdrJunkButton"],
											 ["hdrTrashButton"]
			];
  
// Now, for each view the message pane can generate, we need a global table
// of headerEntries. These header entry objects are generated dynamically
// based on the static data in the header lists (see above) and elements
// we find in the DOM based on properties in the header lists.
var gCoheCollapsedHeaderView = {};

function coheInitializeHeaderViewTables()
{
  // iterate over each header in our header list array, create a header entry
	// for it, and store it in our header table
  var index;
  for (index = 0; index < gCoheCollapsedHeaderList.length; index++)
    {
      gCoheCollapsedHeaderView[gCoheCollapsedHeaderList[index].name] =
        new createHeaderEntry('collapsed', gCoheCollapsedHeaderList[index]);
    }
}

function coheOnLoadMsgHeaderPane()
{ 
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
	  
  // work around XUL deck bug where collapsed header view, if it's the persisted
  // default, wouldn't be sized properly because of the larger expanded
  // view "stretches" the deck.
  if (gCoheCollapsedHeaderViewMode)
    document.getElementById('expandedHeaderView').collapsed = true;
  else
    document.getElementById('collapsedHeaderView').collapsed = true;

  gMessageListeners.push(coheMessageListener);
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

function coheOnUnloadMsgHeaderPane()
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
 	
  	UpdateJunkButton();
  	updateHdrButtons();
}

function coheToggleHeaderView ()
{
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
  }

  updateHdrButtons();
  
  // Work around a xul deck bug where the height of the deck is determined
	// by the tallest panel in the deck even if that panel is not selected...
  deck.selectedPanel.collapsed = false;
}

// default method for updating a header value into a header entry
function coheUpdateHeaderValueInTextNode(headerEntry, headerValue)
{
  headerEntry.textNode.value = headerValue;
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

addEventListener('messagepane-loaded', coheOnLoadMsgHeaderPane, true);
addEventListener('messagepane-unloaded', coheOnUnloadMsgHeaderPane, true);

function updateHdrButtons() {
	UpdateReplyButtons();
  for(var i = 0; i<buttonslist.length; i++) {
	  var buttonBox = document.getElementById('msgHeaderViewDeck').selectedPanel
										.getElementsByTagName("header-view-button-box").item(0);
	  for (var j=0; j<buttonsanonid[i].length; j++){
	  	var myElement = buttonBox.getButton(buttonsanonid[i][j]);
	  	if (myElement != null) {
	  		if (prefBranch.getBoolPref("expandedview.display" + buttonslist[i])) {
		  		if (buttonslist[i] != "Reply") {
			  		myElement.hidden =  ! prefBranch.getBoolPref("expandedview.display" + buttonslist[i]);
		  		}
		  	}
		  	else {
		  		myElement.hidden =  ! prefBranch.getBoolPref("expandedview.display" + buttonslist[i]);
		  	}
	  	}
	  }
  }
}

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
    if(aTopic != "nsPref:changed") return;
    // aSubject is the nsIPrefBranch we're observing (after appropriate QI)
    // aData is the name of the pref that's been changed (relative to aSubject)

    updateHdrButtons();
    
    /*
    switch (aData) {
      case "pref1":
        // extensions.myextension.pref1 was changed
        break;
      case "pref2":
        // extensions.myextension.pref2 was changed
        break;
    }
    */
  }
}
myPrefObserver.register();
