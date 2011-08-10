/* ***** BEGIN LICENSE BLOCK *****
 *   Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Thunderbird Mail Client.
 *
 * The Initial Developer of the Original Code is
 * the Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Joachim Herb <joachim.herb@gmx.de>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

var Ci = Components.interfaces;
var Cc = Components.classes;
var Cu = Components.utils;

var elib = {};
Cu.import('resource://mozmill/modules/elementslib.js', elib);
var mozmill = {};
Cu.import('resource://mozmill/modules/mozmill.js', mozmill);
var EventUtils = {};
Cu.import('resource://mozmill/stdlib/EventUtils.js', EventUtils);

const MODULE_NAME = 'compactheader-helpers';

var browserPreferences = Components.classes["@mozilla.org/preferences-service;1"]
                                            .getService(Components.interfaces.nsIPrefService)
                                            .getBranch("browser.preferences.");

var L;
var folderDisplayHelper;

function setupModule() {
  folderDisplayHelper = collector.getModule('folder-display-helpers');
  windowHelper = collector.getModule('window-helpers');
}

function installInto(module) {
  setupModule();

  // Now copy helper functions
  module.close3PaneWindow = close3PaneWindow;
  module.open3PaneWindow = open3PaneWindow;
  module.openAddressBook = openAddressBook;
  module.open_preferences_dialog = open_preferences_dialog;
  module.close_preferences_dialog = close_preferences_dialog;
  module.select_message_in_folder = select_message_in_folder;
  module.collapse_and_assert_header = collapse_and_assert_header;
  module.expand_and_assert_header = expand_and_assert_header;
}


/**
 *  Helper function to open an extra window, so that the 3pane
 *  window can be closed and opend again for persistancy checks.
 *  They are copied from the test-session-store.js.
 */
function close3PaneWindow() {
  let windowMediator = Cc["@mozilla.org/appshell/window-mediator;1"].
    getService(Ci.nsIWindowMediator);
  let mail3PaneWindow = windowMediator.getMostRecentWindow("mail:3pane");
  // close the 3pane window
  mail3PaneWindow.close();
}

function open3PaneWindow() {
  let windowWatcher = Cc["@mozilla.org/embedcomp/window-watcher;1"].
    getService(Ci.nsIWindowWatcher);
  windowHelper.plan_for_new_window("mail:3pane");
  windowWatcher.openWindow(null,
                           "chrome://messenger/content/messenger.xul", "",
                           "all,chrome,dialog=no,status,toolbar",
                           null);
  return windowHelper.wait_for_new_window("mail:3pane");
}

function openAddressBook() {
  let windowWatcher = Cc["@mozilla.org/embedcomp/window-watcher;1"].
    getService(Ci.nsIWindowWatcher);
  windowHelper.plan_for_new_window("mail:addressbook");
  windowWatcher.openWindow(
                      null,
                      "chrome://messenger/content/addressbook/addressbook.xul", "",
                      "all,chrome,dialog=no,status,toolbar",
                      null);
  return windowHelper.wait_for_new_window("mail:addressbook");
}

function open_preferences_dialog(aController, aSubtest) {
  windowHelper.plan_for_modal_dialog("ext:options", aSubtest);
  aController.click(aController.eid("hidecohePreferencesButton"));
  windowHelper.wait_for_modal_dialog("ext:options", 1);
}

function close_preferences_dialog(aController) {
  windowHelper.plan_for_window_close(aController);
  if (browserPreferences.getBoolPref("instantApply")) {
    let cancelButton = aController.window.document.documentElement.getButton('cancel');
    aController.click(new elib.Elem(cancelButton));
  }
  else {
    let okButton = aController.window.document.documentElement.getButton('accept');
    aController.click(new elib.Elem(okButton));
  }
  windowHelper.wait_for_window_close();
}

/**
 * Select message in aFolder.
 */
function select_message_in_folder(aFolder, aMessageNum, aController)
{
  folderDisplayHelper.be_in_folder(aFolder);

  // select and open the first message
  let curMessage = folderDisplayHelper.select_click_row(aMessageNum);

  // make sure it loads
  folderDisplayHelper.wait_for_message_display_completion(aController);
  folderDisplayHelper.assert_selected_and_displayed(aController, curMessage);

  return curMessage;
}

function collapse_and_assert_header(aController) {
  let collapsedHeaderView = aController.e("collapsedHeaderView");
  let expandedHeaderView = aController.e("expandedHeaderView");
  if (collapsedHeaderView.getAttribute("collapsed")) {
    aController.click(aController.eid("hideDetailsButton"));
  }
  folderDisplayHelper.assert_true(!collapsedHeaderView.hasAttribute("collapsed"));
  folderDisplayHelper.assert_true(expandedHeaderView.getAttribute("collapsed"));
}

function expand_and_assert_header(aController) {
  let collapsedHeaderView = aController.e("collapsedHeaderView");
  let expandedHeaderView = aController.e("expandedHeaderView");
  if (!collapsedHeaderView.hasAttribute("collapsed") ||
      !collapsedHeaderView.getAttribute("collapsed")) {
    aController.click(aController.eid("showDetailsButton"));
  }
  folderDisplayHelper.assert_true(collapsedHeaderView.getAttribute("collapsed"));
  folderDisplayHelper.assert_true(!expandedHeaderView.hasAttribute("collapsed"));
}
