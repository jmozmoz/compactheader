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
const usesheetPref = "toolbar.customization.usesheet";
var allPreferences = Cc["@mozilla.org/preferences-service;1"]
                    .getService(Ci.nsIPrefService).getBranch(null);
var L;
var folderDisplayHelper;

function setupModule() {
  folderDisplayHelper = collector.getModule('folder-display-helpers');
  windowHelper = collector.getModule('window-helpers');
}

function installInto(module) {
  setupModule();

  // Now copy helper functions
  module.reopen_3pane_window = reopen_3pane_window;
  module.close3PaneWindow = close3PaneWindow;
  module.open3PaneWindow = open3PaneWindow;
  module.openAddressBook = openAddressBook;
  module.open_preferences_dialog = open_preferences_dialog;
  module.close_preferences_dialog = close_preferences_dialog;
  module.select_message_in_folder = select_message_in_folder;
  module.collapse_and_assert_header = collapse_and_assert_header;
  module.expand_and_assert_header = expand_and_assert_header;
  module.restore_and_check_default_buttons = restore_and_check_default_buttons;
  module.open_header_pane_toolbar_customization = open_header_pane_toolbar_customization;
  module.close_header_pane_toolbar_customization = close_header_pane_toolbar_customization;
  module.filterInvisibleButtons = filterInvisibleButtons;
  module.canMoveToolbox = canMoveToolbox;
  module.set_and_assert_toolbox_position = set_and_assert_toolbox_position;
  module.subtest_change_oneline = subtest_change_oneline;
  module.subtest_change_twoline = subtest_change_twoline;
  module.set_preferences_twoline = set_preferences_twoline;
  module.set_preferences_oneline = set_preferences_oneline;
  module.assert_collapsed = assert_collapsed;
  module.assert_expanded = assert_expanded;
  module.isVisible = isVisible;
}

function reopen_3pane_window() {
  // Close the 3PaneWindow to reset margin to start values
  // Make sure we have a different window open, so that we don't start shutting
  // down just because the last window was closed
  let abwc = openAddressBook();
  // The 3pane window is closed and opened again.
  close3PaneWindow
  mc = open3PaneWindow();
  abwc.window.close();
  return mc;
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
  aController.click(aController.eid("CompactHeader_hidecohePreferencesButton"));
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
  folderDisplayHelper.wait_for_message_display_completion(aController, true);
  folderDisplayHelper.assert_selected_and_displayed(aController, curMessage);

  return curMessage;
}

function collapse_and_assert_header(aController) {
  let collapsedHeaderView = aController.e("CompactHeader_collapsedHeaderView");
  let expandedHeaderView = aController.e("expandedHeaderView");
  if (collapsedHeaderView.getAttribute("collapsed")) {
    aController.click(aController.eid("CompactHeader_hideDetailsButton"));
  }
  assert_collapsed(aController);
}

function assert_collapsed(aController) {
  let collapsedHeaderView = aController.e("CompactHeader_collapsedHeaderView");
  let expandedHeaderView = aController.e("expandedHeaderView");
  folderDisplayHelper.assert_true(!collapsedHeaderView.hasAttribute("collapsed"));
  folderDisplayHelper.assert_true(expandedHeaderView.getAttribute("collapsed"));
}

function expand_and_assert_header(aController) {
  let collapsedHeaderView = aController.e("CompactHeader_collapsedHeaderView");
  let expandedHeaderView = aController.e("expandedHeaderView");
  if (!collapsedHeaderView.hasAttribute("collapsed") ||
      !collapsedHeaderView.getAttribute("collapsed")) {
    aController.click(aController.eid("CompactHeader_showDetailsButton"));
  }
  assert_expanded(aController);
}

function assert_expanded(aController) {
  let collapsedHeaderView = aController.e("CompactHeader_collapsedHeaderView");
  let expandedHeaderView = aController.e("expandedHeaderView");
  folderDisplayHelper.assert_true(collapsedHeaderView.getAttribute("collapsed"));
  folderDisplayHelper.assert_true(!expandedHeaderView.hasAttribute("collapsed"));
}

/**
 *  Restore the default buttons in the header pane toolbar
 *  by clicking the corresponding button in the palette dialog
 *  and check if it worked.
 */
function restore_and_check_default_buttons(aController)
{
  let ctc = open_header_pane_toolbar_customization(aController);
  let restoreButton = ctc.window.document.getElementById("main-box").
    querySelector("[oncommand='overlayRestoreDefaultSet();']");
  ctc.click(new elib.Elem(restoreButton));
  close_header_pane_toolbar_customization(ctc);

  let hdrToolbar = aController.eid("header-view-toolbar").node;
  let hdrBarDefaultSet = hdrToolbar.getAttribute("defaultset");

  folderDisplayHelper.assert_equals(hdrToolbar.currentSet, hdrBarDefaultSet);
  folderDisplayHelper.assert_equals(hdrToolbar.getAttribute("currentset"), hdrBarDefaultSet);
}

/*
 * Open the header pane toolbar customization dialog.
 */
function open_header_pane_toolbar_customization(aController)
{
  let ctc;
  aController.click(aController.eid("CustomizeHeaderToolbar"));
  // Depending on preferences the customization dialog is
  // either a normal window or embedded into a sheet.
  if (allPreferences.getBoolPref(usesheetPref, true)) {
    aController.ewait("donebutton");
    let contentWindow = aController.eid("customizeToolbarSheetIFrame").node.contentWindow;
    ctc = windowHelper.augment_controller(new controller.MozMillController(contentWindow));
  }
  else {
    ctc = windowHelper.wait_for_existing_window("CustomizeToolbarWindow");
  }
  return ctc;
}

/*
 * Close the header pane toolbar customization dialog.
 */
function close_header_pane_toolbar_customization(aCtc)
{
  aCtc.click(aCtc.eid("donebutton"));
  // XXX There should be an equivalent for testing the closure of
  // XXX the dialog embedded in a sheet, but I do not know how.
  if (!allPreferences.getBoolPref(usesheetPref, true)) {
    folderDisplayHelper.assert_true(aCtc.window.closed, "The customization dialog is not closed.");
  }
}

/*
 * Remove invsible buttons from (comma separated) buttons list
 */
function filterInvisibleButtons(aController, aButtons) {
  let buttons = aButtons.split(",");
  let result = new Array;

  for (let i=1; i<buttons.length; i++) {
    button = buttons[i].replace(new RegExp("wrapper-"), "");
    if ((aController.eid(button).node) &&
        (!aController.eid(button).node.getAttribute("collapsed"))
        ) {
      result.push(buttons[i]);
    }
  }

  let strResult;
  if (result.length > 0) {
    strResult = result.join(",");
  }
  else {
    strResult = "__empty";
  }

  return strResult;
}

function canMoveToolbox() {
  var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
    .getService(Components.interfaces.nsIXULAppInfo);
  var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
    .getService(Components.interfaces.nsIVersionComparator);
  return (versionChecker.compare(appInfo.version, "10.0a2") >= 0)
};

function set_top_toobox_position(aController) {
  if (canMoveToolbox()) {
    aController.click(aController.eid("CompactHeader_hdrToolbox.pos.top"));
  }
  close_preferences_dialog(aController);
}

function set_left_toobox_position(aController) {
  if (canMoveToolbox()) {
    aController.click(aController.eid("CompactHeader_hdrToolbox.pos.left"));
  }
  close_preferences_dialog(aController);
}

function set_right_toobox_position(aController) {
  if (canMoveToolbox()) {
    aController.click(aController.eid("CompactHeader_hdrToolbox.pos.right"));
  }
  close_preferences_dialog(aController);
}

function set_none_toobox_position(aController) {
  if (canMoveToolbox()) {
    aController.click(aController.eid("CompactHeader_hdrToolbox.pos.none"));
  }
  close_preferences_dialog(aController);
}

var setToolboxPositionPreferences = new Array();
setToolboxPositionPreferences = {
  'top': {
    setFunc: set_top_toobox_position,
    pos: 'msgHeaderViewDeck',
    collapsed: false,
    other: ['CompactHeader_leftSidebar', 'CompactHeader_rightSidebar']
  },
  'left': {
    setFunc: set_left_toobox_position,
    pos: 'CompactHeader_leftSidebar',
    collapsed: false,
    other: ['expandedHeadersBox', 'CompactHeader_rightSidebar']
  },
  'right': {
    setFunc: set_right_toobox_position,
    pos: 'CompactHeader_rightSidebar',
    collapsed: false,
    other: ['CompactHeader_leftSidebar', 'expandedHeadersBox']
  },
  'none': {
    setFunc: set_none_toobox_position,
    pos: 'messagepaneboxwrapper',
    collapsed: true,
    other: []
  }
};

function set_and_assert_toolbox_position(aController, aPosition) {
  open_preferences_dialog(aController, setToolboxPositionPreferences[aPosition].setFunc);
//  expand_and_assert_header(aController);
  aController.sleep(300);
  if (canMoveToolbox()) {
    let pos = setToolboxPositionPreferences[aPosition].pos;
    let e = aController.e(pos).getElementsByAttribute("id", "header-view-toolbox");
    folderDisplayHelper.assert_equals(e.length, 1);
    let c = setToolboxPositionPreferences[aPosition].collapsed;
    if (c) {
      folderDisplayHelper.assert_equals(e[0].getAttribute("collapsed"), "true");
    }
    else {
      folderDisplayHelper.assert_equals(e[0].hasAttribute("collapsed"), false);
    }

    for (let i = 0; i < setToolboxPositionPreferences[aPosition].other.length; i++) {
      let pos = setToolboxPositionPreferences[aPosition].other[i];
      let e = aController.e(pos).getElementsByAttribute("id", "header-view-toolbox");
      folderDisplayHelper.assert_equals(e.length, 0);
    }
  }
  else {
    let pos = "msgHeaderViewDeck";
    let e = aController.e(pos).getElementsByAttribute("id", "header-view-toolbox");
    folderDisplayHelper.assert_equals(e.length, 1);
  }
}

function subtest_change_oneline(aController) {
  let lineMode = aController.eid("CompactHeader_checkboxCompactTwolineView");
  let lineModeNode = lineMode.node;

  if (lineModeNode.hasAttribute("checked")) {
    aController.click(lineMode);
  }
  close_preferences_dialog(aController);
}

function subtest_change_twoline(aController) {
  let lineMode = aController.eid("CompactHeader_checkboxCompactTwolineView");
  let lineModeNode = lineMode.node;

  if (!lineModeNode.hasAttribute("checked")) {
    aController.click(lineMode);
  }
  close_preferences_dialog(aController);
}

function set_preferences_twoline(aController) {
  let checkboxCompactTwolineView = aController.eid("CompactHeader_checkboxCompactTwolineView");
  if (!checkboxCompactTwolineView.node.getAttribute("checked")) {
    aController.click(checkboxCompactTwolineView);
  }
  close_preferences_dialog(aController);
}

function set_preferences_oneline(aController) {
  let checkboxCompactTwolineView = aController.eid("CompactHeader_checkboxCompactTwolineView");
  if (checkboxCompactTwolineView.node.getAttribute("checked")) {
    aController.click(checkboxCompactTwolineView);
  }
  close_preferences_dialog(aController);
}

function isVisible(aElem) {
  if (aElem.hidden || aElem.collapsed)
    return false;
  let parent = aElem.parentNode;
  if (parent == null)
    return true;
  if (("selectedPanel" in parent) &&
      parent.selectedPanel != aElem)
    return false;
  return isVisible(parent);
}