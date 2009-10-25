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
var gXMLHttpRequest;
///////////////////////////////////////////////////////////////////////////////
//
//  onLoad
//
//  Called when the preferences dialog has finished loading. Initializes the
//  controls according to current configuration settings.
//

function CoheCheckForUpdates() {
	gXMLHttpRequest = new XMLHttpRequest();
  gXMLHttpRequest.onload = updateCohe;
  gXMLHttpRequest.open("GET", "http://compactheader.mozdev.org/availVersion.xml",true);
  gXMLHttpRequest.send(null);
}

function updateCohe()
{
  var updateAMO = false;
  var updateMozdev = false;
  
  var gExtensionManager = Components.classes["@mozilla.org/extensions/manager;1"]
                            .getService(Components.interfaces.nsIExtensionManager);
  var strCoheVersion = gExtensionManager.getItemForID("{58D4392A-842E-11DE-B51A-C7B855D89593}").version;

  if (gXMLHttpRequest.readyState == 4) {
    var data = gXMLHttpRequest.responseXML;
    var updates = data.getElementsByTagName("update");
    for (var i = 0; i < updates.length; i++) {
      var strServer, strVersion;
      var update = updates[i];
    	strServer = update.getAttribute("server");
    	strVersion = update.getAttribute("version");
      var x = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                        .getService(Components.interfaces.nsIVersionComparator)
                        .compare(strVersion, strCoheVersion);
          
      if ((strServer == "AMO") && (x > 0)) {
        updateAMO = true;
        document.getElementById("UpdateAMO").setAttribute("disabled", "false");
      } else if ((strServer == "mozdev") && (x > 0)) {
        updateAMO = true;
        document.getElementById("UpdateMOZDEV").setAttribute("disabled", "false");
      }
    }
	}
}


function onLoad()
{
  prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefService)
    .getBranch("extensions.CompactHeader.");

  loadPrefCheckbox("headersize.twolineview", "checkbox.Compact.TwolineView");
  loadPrefCheckbox("headersize.linkify", "checkbox.Linkify");
  //loadPrefInt("headersize.addressstyle", "AddressStyle");  
  loadPrefCheckbox("headersize.addressstyle", "checkbox.ShowOnlyAddress");
  
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
  //savePrefInt("headersize.addressstyle", "AddressStyle");  
  savePrefCheckbox("headersize.addressstyle", "checkbox.ShowOnlyAddress");
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

