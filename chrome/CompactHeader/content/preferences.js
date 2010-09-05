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


if(!org) var org={};
if(!org.mozdev) org.mozdev={};
if(!org.mozdev.compactHeader) org.mozdev.compactHeader = {};

org.mozdev.compactHeader.preferences = function() {
  var pub = {};
  var prefBranch;
  ///////////////////////////////////////////////////////////////////////////////
  //
  //  onLoad
  //
  //  Called when the preferences dialog has finished loading. Initializes the
  //  controls according to current configuration settings.
  //
  
  pub.onLoad = function()
  {  	
    prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
      .getService(Components.interfaces.nsIPrefService)
      .getBranch("extensions.CompactHeader.");
  
    loadPrefCheckbox("headersize.twolineview", "checkbox.Compact.TwolineView");
    loadPrefCheckbox("headersize.linkify", "checkbox.Linkify");
    //loadPrefInt("headersize.addressstyle", "AddressStyle");  
    loadPrefCheckbox("headersize.addressstyle", "checkbox.ShowOnlyAddress");
    loadPrefCheckbox("headersize.flatButtons", "checkbox.flatButtons");
    loadRadio("toolbox.position", "hdrToolbox.pos");
    
  }
  
  ///////////////////////////////////////////////////////////////////////////////
  //
  //  onDialogAccept
  //
  //  Called when the preferences dialog is closed by pressing the OK button.
  //  Saves the configuration settings.
  //
  
  pub.onDialogAccept = function ()
  {
    savePrefCheckbox("headersize.twolineview", "checkbox.Compact.TwolineView");
    savePrefCheckbox("headersize.linkify", "checkbox.Linkify");
    //savePrefInt("headersize.addressstyle", "AddressStyle");  
    savePrefCheckbox("headersize.addressstyle", "checkbox.ShowOnlyAddress");
    savePrefCheckbox("headersize.flatButtons", "checkbox.flatButtons");
    saveRadio("toolbox.position", "hdrToolbox.pos");
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
  
  function loadRadio(pref, idRadioGroup)
  {
    if (document.getElementById(prefBranch.getCharPref(pref))) {
      document.getElementById(idRadioGroup).selectedItem = 
        document.getElementById(prefBranch.getCharPref(pref));
    }
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

  function saveRadio(pref, idRadioGroup)
  {
    prefBranch.setCharPref(pref, document.getElementById(idRadioGroup).selectedItem.id);
  }
  return pub;
}();
