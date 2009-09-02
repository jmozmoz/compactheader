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

  loadPrefCheckbox("headersize.twolineview", "checkbox.Compact.TwolineView");
  loadPrefCheckbox("headersize.linkify", "checkbox.Linkify");
  loadPrefInt("headersize.addressstyle", "AddressStyle");  
  
  updateTwolineView(prefBranch.getBoolPref("headersize.twolineview")); 

  loadPrefCheckbox("buttons.showonlyicon", "checkbox.IconText");
  
  for(var buttonname in buttonslist) {
	  loadPrefCheckbox("view.compact.display" + buttonname,  "checkbox.Compact." + buttonname);
	  loadPrefCheckbox("view.expanded.display" + buttonname, "checkbox.Expanded." + buttonname);
  }
}

function updateTwolineView(boolTwolineview) {
  for(var buttonname in buttonslist) {
		document.getElementById("checkbox.Compact." + buttonname).disabled = ! boolTwolineview;
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
  savePrefCheckbox("headersize.twolineview", "checkbox.Compact.TwolineView");
  savePrefCheckbox("headersize.linkify", "checkbox.Linkify");
  savePrefInt("headersize.addressstyle", "AddressStyle");  
  
  savePrefCheckbox("buttons.showonlyicon", "checkbox.IconText");

  for(var buttonname in buttonslist) {
	  savePrefCheckbox("view.compact.display" + buttonname,  "checkbox.Compact." + buttonname);
	  savePrefCheckbox("view.expanded.display" + buttonname, "checkbox.Expanded." + buttonname);
  }

  return true;
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


function loadPrefInt(pref, idCheckbox)
{
  document.getElementById(idCheckbox).value = prefBranch.getIntPref(pref);
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

function savePrefInt(pref, idCheckbox)
{
  prefBranch.setIntPref(pref, document.getElementById(idCheckbox).value);
}

