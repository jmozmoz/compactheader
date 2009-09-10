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
var gCoheCollapsedHeaderListLongAddresses = [
  {name:"subject", outputFunction:coheUpdateHeaderValueInTextNode},
  {name:"from", useToggle:true, outputFunction:OutputEmailAddresses},
//  {name:"from", useToggle:true, useShortView:true, outputFunction: OutputEmailAddresses},
  {name:"toCcBcc", useToggle:true, outputFunction: OutputEmailAddresses},
  {name:"date", outputFunction:OutputDate}
  ];

var gCoheCollapsedHeaderListShortAddresses = [
  {name:"subject", outputFunction:coheUpdateHeaderValueInTextNode},
  {name:"from", useToggle:true, useShortView:true, outputFunction:OutputEmailAddresses},
  {name:"toCcBcc", useToggle:true, useShortView:true, outputFunction: OutputEmailAddresses},
  {name:"date", outputFunction:OutputDate}
  ];
    
  var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefService)
    .getBranch("extensions.CompactHeader.");

var coheIntegrateRSSLinkify = false;

var RSSLinkify = {
    oldSubject: null,
    newSubject: null
};

var coheFirstTime = true;
    
function cleanupHeaderXUL(){
	var xularray = ["collapsedfromOutBox", "collapsedtoCcBccOutBox", 
									"collapsedButtonBox", "collapsedsubjectBox", 
									"collapseddateBox", "coheBaselineBox"];
									
	/* rescue otheraction and tagpopup */
	moveMenusToButtonBox(false);
	for (var i=0; i<xularray.length; i++) {
		var x = document.getElementById(xularray[i]);
		if (x != null) {
			x.parentNode.removeChild(x);
		}
	}
}
    
function create2LHeaderXUL() {
	cleanupHeaderXUL();
	
	var myElement = document.getElementById("collapsedHeaderViewFirstLine");
	
	var xul1   = document.createElement("hbox");
	xul1.id    = "collapsedfromOutBox";
	xul1.align = "start";
	xul1.flex  = "100";

	var xultmp   = document.createElement("mail-multi-emailHeaderField");
	if (prefBranch.getIntPref("headersize.addressstyle") != 1) {
		xultmp.id    = "collapsedfromBox";
	} else {
		xultmp.id    = "collapsedfromValue";
	}
	xultmp.setAttribute("class","collapsedHeaderDisplayName");
	xul1.appendChild(xultmp,xul1);
	myElement.appendChild(xul1, myElement);

	var xul2   = document.createElement("hbox");
	xul2.id    = "collapsedtoCcBccOutBox";
	xul2.align = "end";
	xul2.pack  = "end";
	xul2.flex  = "1";

	var xultmp   = document.createElement("mail-multi-emailHeaderField");
	if (prefBranch.getIntPref("headersize.addressstyle") != 1) {
		xultmp.id    = "collapsedtoCcBccBox";
	} else {
		xultmp.id    = "collapsedtoCcBccValue";		
	}
	xultmp.flex  = "1";
	xultmp.align = "end";
	xultmp.pack  = "end";
	xultmp.setAttribute("class","collapsedHeaderDisplayName");
	xul2.appendChild(xultmp, xul2);

	myElement.appendChild(xul2, myElement);

	var xul3   = document.createElement("header-view-button-box");
	xul3.id    = "collapsedButtonBox";

	myElement.appendChild(xul3, myElement);
	
	//				<hbox id="collapsedsubjectBox" align="start" flex="1" style="padding-left: 10px; padding-top: 1.6px">
	//				<textbox id="collapsedsubjectValue" flex="1" readonly="true" class="collapsedHeaderValue plain"/>
	//			</hbox>

	var myElement = document.getElementById("collapsedHeaderViewSecondLine");
				
	var xul4   = document.createElement("hbox");
	xul4.id    = "collapsedsubjectBox";
	xul4.align = "start";
	xul4.flex  = "1";

	var xultmp   = document.createElement("textbox");
	xultmp.id    = "collapsedsubjectValue";
	xultmp.flex  = "1";
	xultmp.setAttribute("class", "collapsedHeaderValue plain");
	xultmp.setAttribute("readonly", "true");

	xul4.appendChild(xultmp, xul4);

	myElement.appendChild(xul4, myElement);

//				<hbox id="collapseddateBox" align="end" flex="0" style="padding-bottom: 2px">
//					<textbox id="collapseddateValue" class="plain collapsedHeaderValue" flex="0" readonly="true"/>
//				</hbox>
	var xul5   = document.createElement("hbox");
	xul5.id    = "collapseddateBox";
	xul5.align = "end";
	xul5.pack  = "end";
	xul5.flex  = "0";

	var xultmp   = document.createElement("textbox");
	xultmp.id    = "collapseddateValue";
	xultmp.flex  = "0";
	xultmp.pack  = "end";
	xultmp.setAttribute("class", "collapsedHeaderValue plain");
	xultmp.setAttribute("readonly", "true");
	xul5.appendChild(xultmp, xul5);

	myElement.appendChild(xul5, myElement);

	document.getElementById("collapsedsubjectBox").setAttribute("twolineview", "true");
	document.getElementById("collapseddateBox").setAttribute("twolineview", "true");

}

function create1LHeaderXUL() {
	cleanupHeaderXUL();
	
	var myElement = document.getElementById("collapsedHeaderViewFirstLine");

	var xul0   = document.createElement("hbox");
	xul0.id    = "coheBaselineBox";
	xul0.align = "baseline";
	xul0.flex  = "2";

	myElement.appendChild(xul0, myElement);

	var xul4   = document.createElement("hbox");
	xul4.id    = "collapsedsubjectBox";
	xul4.align = "start";
	xul4.flex  = "99";
	xul0.appendChild(xul4, xul0);

	var xultmp   = document.createElement("textbox");
	xultmp.id    = "collapsedsubjectValue";
	xultmp.flex  = "99";
	xultmp.setAttribute("class", "collapsedHeaderValue plain");
	xultmp.setAttribute("readonly", "true");
	xul4.appendChild(xultmp, xul4);

	
	var xul2   = document.createElement("hbox");
	xul2.id    = "collapsedtoCcBccOutBox";
	xul2.align = "end";
	xul2.pack  = "end";
	xul2.flex  = "1";
	xul0.appendChild(xul2, xul0);

	var xultmp   = document.createElement("mail-multi-emailHeaderField");
	if (prefBranch.getIntPref("headersize.addressstyle") != 1) {
		xultmp.id    = "collapsedtoCcBccBox";
	} else {
		xultmp.id    = "collapsedtoCcBccValue";		
	}
	xultmp.flex  = "1";
	xultmp.align = "end";
	xultmp.pack  = "end";
	xultmp.setAttribute("class", "collapsedHeaderDisplayName");
	xultmp.hidden = "true";
	xul2.appendChild(xultmp, xul2);

	
	var xul1   = document.createElement("hbox");
	xul1.id    = "collapsedfromOutBox";
	xul1.align = "end";
	xul0.appendChild(xul1, xul0);

	var xultmp   = document.createElement("mail-multi-emailHeaderField");
	if (prefBranch.getIntPref("headersize.addressstyle") != 1) {
		xultmp.id    = "collapsedfromBox";
	} else {
		xultmp.id    = "collapsedfromValue";
	}
	xultmp.setAttribute("class", "collapsedHeaderDisplayName");
	//xultmp.label = "&fromField2.label;";
	xul1.appendChild(xultmp,xul1);

	var xul5   = document.createElement("hbox");
	xul5.id    = "collapseddateBox";
	xul5.align = "end";
	xul0.appendChild(xul5, xul0);

	var xultmp   = document.createElement("textbox");
	xultmp.id    = "collapseddateValue";
	xultmp.setAttribute("readonly", "true");

	xultmp.setAttribute("class", "collapsedHeaderValue plain");
	xul5.appendChild(xultmp, xul5);


	var xul3   = document.createElement("header-view-button-box");
	xul3.id    = "collapsedButtonBox";
	xul3.hidden = "true";

	myElement.appendChild(xul3, myElement);
	document.getElementById("collapsedsubjectBox").removeAttribute("twolineview");
	document.getElementById("collapseddateBox").removeAttribute("twolineview");
}

// Now, for each view the message pane can generate, we need a global table
// of headerEntries. These header entry objects are generated dynamically
// based on the static data in the header lists (see above) and elements
// we find in the DOM based on properties in the header lists.
var gCoheCollapsedHeaderView = {};

function coheInitializeHeaderViewTables()
{
/*  coheReInitializeHeaderViewTables(); */
  // iterate over each header in our header list array, create a header entry
	// for it, and store it in our header table
	if (prefBranch.getBoolPref("headersize.twolineview")) {
  	create2LHeaderXUL();
	} else {
  	create1LHeaderXUL();
	}
  
	//var tb = document.getElementById("collapsedsubjectValue");
  gCoheCollapsedHeaderView = {};
  var index;
	if (prefBranch.getIntPref("headersize.addressstyle") != 1) {
	  for (index = 0; index < gCoheCollapsedHeaderListLongAddresses.length; index++) {
	    gCoheCollapsedHeaderView[gCoheCollapsedHeaderListLongAddresses[index].name] =
	      new createHeaderEntry('collapsed', gCoheCollapsedHeaderListLongAddresses[index]);
	  }
	} else {
	  for (index = 0; index < gCoheCollapsedHeaderListShortAddresses.length; index++) {
	    gCoheCollapsedHeaderView[gCoheCollapsedHeaderListShortAddresses[index].name] =
	      new createHeaderEntry('collapsed', gCoheCollapsedHeaderListShortAddresses[index]);
		}
	}
  if (prefBranch.getBoolPref("headersize.linkify")) {
	  RSSLinkify.newSubject = document.createElement("label");
	  RSSLinkify.newSubject.setAttribute("id", "collapsedsubjectlinkValue");
	  RSSLinkify.newSubject.setAttribute("class", "headerValue plain headerValueUrl");
	  RSSLinkify.newSubject.setAttribute("originalclass", "headerValue plain headerValueUrl");
	  RSSLinkify.newSubject.setAttribute("context", "CohecopyUrlPopup");
	  RSSLinkify.newSubject.setAttribute("keywordrelated", "true");
	  RSSLinkify.newSubject.setAttribute("readonly", "true");
	  RSSLinkify.newSubject.setAttribute("appendoriginalclass", "true");
	  RSSLinkify.newSubject.setAttribute("flex", "1");
	
	  RSSLinkify.oldSubject = document.getElementById("collapsedsubjectValue");
	  RSSLinkify.oldSubject.parentNode.insertBefore(RSSLinkify.newSubject, RSSLinkify.oldSubject);
	}

//	moveMenusToButtonBox(gCoheCollapsedHeaderViewMode);
	
  updateHdrButtons();
  updateHdrIconText();
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

	if (coheFirstTime)
	{
  	gMessageListeners.push(coheMessageListener);
  	coheFirstTime = false;
	}
	
	moveMenusToButtonBox(gCoheCollapsedHeaderViewMode);
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

  if (prefBranch.getBoolPref("headersize.linkify")) {
		var url = currentHeaderData["content-base"];
		if(url) {
		    RSSLinkify.newSubject.setAttribute("onclick", "if (!event.button) messenger.launchExternalURL('" + 
		                                        url.headerValue + "');");
		    RSSLinkify.newSubject.setAttribute("value", currentHeaderData["subject"].headerValue);
		    RSSLinkify.newSubject.setAttribute("url", url.headerValue);
		    RSSLinkify.newSubject.setAttribute("collapsed", "false");
		    RSSLinkify.oldSubject.setAttribute("collapsed", "true");
		} else {
		    RSSLinkify.newSubject.setAttribute("collapsed", "true");
		    RSSLinkify.oldSubject.setAttribute("collapsed", "false");
		}
  }

  if (prefBranch.getIntPref("headersize.addressstyle") == 2) {
  	selectEmailDisplayed();
  }
  
	UpdateJunkButton();
	updateMyReplyButtons();
	updateHdrButtons();
}


function moveMenusToButtonBox(viewMode) {
	var target;
	
	if (viewMode)
		target = "collapsedButtonBox";
	else
		target = "otherActionsBox";

	
	var newParent = document.getElementById(target);
	if (newParent != null) {
		var myElement = document.getElementById("otherActionsButton");
		newParent.appendChild(myElement);
		myElement = document.getElementById("tagMenuPopup");
		newParent.appendChild(myElement);
	} else {
		alert ("null");
	}
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
	 	updateMyReplyButtons();
	  updateHdrButtons();
  }

	moveMenusToButtonBox(gCoheCollapsedHeaderViewMode);
  
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
	
	var buttonBox = document.getElementById('msgHeaderViewDeck').selectedPanel
									.getElementsByTagName("header-view-button-box").item(0);
  for(var buttonname in buttonslist) {

		var strViewMode;
		if (gCoheCollapsedHeaderViewMode)
			strViewMode = "view.compact";
		else
		  strViewMode = "view.expanded";
		for (var j=0; j<buttonslist[buttonname].length; j++){
	  	var myElement = buttonBox.getButton(buttonslist[buttonname][j]) || document.getElementById(buttonslist[buttonname][j]);
	  	if (myElement != null) {
	  		addClass(myElement, "msgHeaderView-flat-button");
	  		if (prefBranch.getBoolPref(strViewMode + ".display" + buttonname)) {
		  		if (buttonname != "Reply") {
			  		myElement.hidden =  false; //! prefBranch.getBoolPref("expandedview.display" + buttonname);
		  		}
		  	}
		  	else {
		  		myElement.hidden =  true ; //! prefBranch.getBoolPref(strViewMode + "display" + buttonname);
		  	}
	  	}
	  	else {
	  		alert("myElement null");
	  	}
	  }
  }
}

function updateHdrIconText() {
	var myE = [document.getElementById("collapsedButtonBox"),
						 document.getElementById("expandedButtonBox"),
						 document.getElementById("tagMenuPopup"),
						 document.getElementById("otherActionsButton")];
	if (prefBranch.getBoolPref("buttons.showonlyicon")) {
		for (var i=0; i<myE.length; i++) {
			myE[i].removeAttribute("OnlyIcon");
			myE[i].setAttribute("OnlyIcon", "Icon");
		}
	} else {
		for (var i=0; i<myE.length; i++) {
			myE[i].removeAttribute("OnlyIcon");
			myE[i].setAttribute("OnlyIcon", "Text");
		}
	}
}

function updateMyReplyButtons() {
	UpdateReplyButtons();
	var buttonBox = document.getElementById('msgHeaderViewDeck').selectedPanel
									.getElementsByTagName("header-view-button-box").item(0);
	for (var j=0;j<buttonslist["Reply"].length; j++) {
		var myElement = buttonBox.getButton(buttonslist["Reply"][j]);
		addClass(myElement, "msgHeaderView-flat-button");
		if (!myElement.hidden) {
			myElement.setAttribute("mode", buttonslist["Reply"][j]);
		}
	}
}

function addClass(el, strClass) {
	var testnew = new RegExp('\\b'+strClass+'\\b').test(el.className);	
	if (!testnew) {
		el.className += el.className?' '+strClass:strClass;
	}
}

function MyInitViewHeadersMenu()
{
  var headerchoice = 1;
  try
  {
    headerchoice = pref.getIntPref("mail.show_headers");
  }
  catch (ex)
  {
    dump("failed to get the header pref\n");
  }

  var id = null;
  switch (headerchoice)
  {
    case 2:
      id = "my_viewallheaders";
      break;
    case 1:
    default:
      id = "my_viewnormalheaders";
      break;
  }

  var menuitem = document.getElementById(id);
  if (menuitem)
    menuitem.setAttribute("checked", "true");
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
}

var myPrefObserverView =
{
  register: function()
  {
    // First we'll need the preference services to look for preferences.
    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                                .getService(Components.interfaces.nsIPrefService);

    // For this._branch we ask that the preferences for extensions.myextension. and children
    this._branch = prefService.getBranch("extensions.CompactHeader.view.");

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

 		updateMyReplyButtons();
    updateHdrButtons();
	}
}

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

/*		coheOnLoadMsgHeaderPane();
		coheInitializeHeaderViewTables(); */  

		var event = document.createEvent('Events');
 		event.initEvent('messagepane-loaded', false, true);
		var headerViewElement = document.getElementById("msgHeaderView");
		headerViewElement.dispatchEvent(event);

		updateMyReplyButtons();
		/*updateHdrButtons();*/
	  gDBView.reloadMessage();
  }
}

var myPrefObserverIconText =
{
  register: function()
  {
    // First we'll need the preference services to look for preferences.
    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                                .getService(Components.interfaces.nsIPrefService);

    // For this._branch we ask that the preferences for extensions.myextension. and children
    this._branch = prefService.getBranch("extensions.CompactHeader.buttons.");

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

    updateHdrIconText();  
  }
}

myPrefObserverView.register();
myPrefObserverHeaderSize.register();
myPrefObserverIconText.register();

/*
function CoHe_customizeToolbar(aWhich) {

	// feststellen, welche Toolbar konfiguriert werden soll
	var elem = aWhich;
	while(elem.tagName != "popup") {
		elem = elem.parentNode;
	}

	var tbar = document.getElementById("HeaderPaneToolbar");
	var toolbox = document.getElementById(tbar.parentNode.id);

	toolbox.customizeDone = CoHe_customizeToolbarDone;
	document.getElementById('CoHe-customize-mitem').setAttribute("disabled", "true");

	// löst Reaktion auf Änderungen der Icongröße/Symbolanzeige im Anpassen-Dialog aus
	CoHeInterval = window.setInterval("CoHe_adjustToolboxWidth(true)", 100);

	openDialog("chrome://global/content/customizeToolbar.xul", "CustomizeToolbar", "chrome,all,dependent", toolbox);
}
*/

/*
	Schließt die Symbolleisten-Konfiguration ab
		=> Aufruf durch CoHe_customizeToolbar()
*/
/*
function CoHe_customizeToolbarDone(aToolboxChanged) {
	if(document.getElementById('CoHe-customize-mitem'))
		document.getElementById('CoHe-customize-mitem').removeAttribute("disabled");

	window.focus();
}
*/