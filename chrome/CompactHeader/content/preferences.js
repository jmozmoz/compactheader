///////////////////////////////////////////////////////////////////////////////
//
//  preferences.js
//
//  Copyright 2005 by Michael Buschbeck <michael@buschbeck.net>
//
//  Preferences dialog box for the Unselect Message extension. Allows users to
//  customize the behavior of the extension.
//


///////////////////////////////////////////////////////////////////////////////
//
//  Variables
//

var prefBranch;

	var buttonslist = ["Reply", "Forward", "Archive", "Junk", "Trash"];

///////////////////////////////////////////////////////////////////////////////
//
//  onLoad
//
//  Called when the preferences dialog has finished loading. Initializes the
//  controls according to current configuration settings.
//

function onLoad()
{
  prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefService)
    .getBranch("extensions.CompactHeader.");

  for(var i = 0; i<buttonslist.length; i++) {
	  loadPrefCheckbox("compactview.display" + buttonslist[i],  "checkbox.Compact." + buttonslist[i]);
	  loadPrefCheckbox("expandedview.display" + buttonslist[i], "checkbox.Expanded." + buttonslist[i]);
  }
}


///////////////////////////////////////////////////////////////////////////////
//
//  onDialogAccept
//
//  Called when the preferences dialog is closed by pressing the OK button.
//  Saves the configuration settings.
//

function onDialogAccept()
{
  for(var i = 0; i<buttonslist.length; i++) {
	  savePrefCheckbox("compactview.display" + buttonslist[i],  "checkbox.Compact." + buttonslist[i]);
	  savePrefCheckbox("expandedview.display" + buttonslist[i], "checkbox.Expanded." + buttonslist[i]);
  }

  return true;
}


function getCurrentMsgHdrButtonBox() {
	var msgHeaderViewDeck = top.document.getElementById('msgHeaderViewDeck');
	if (msgHeaderViewDeck) {
		return 	msgHeaderViewDeck.selectedPanel
						.getElementsByTagName("header-view-button-box").item(0);
 
	}
	else {
		return null;
	}
}

///////////////////////////////////////////////////////////////////////////////
//
//  loadPrefCheckbox
//
//  Loads the given boolean preference value into the given checkbox element.
//

function loadPrefCheckbox(pref, idCheckbox)
{
  document.getElementById(idCheckbox).checked = prefBranch.getBoolPref(pref);
}


///////////////////////////////////////////////////////////////////////////////
//
//  savePrefCheckbox
//
//  Saves the given boolean preference value from the given checkbox element.
//

function savePrefCheckbox(pref, idCheckbox)
{
  prefBranch.setBoolPref(pref, document.getElementById(idCheckbox).checked);
}

