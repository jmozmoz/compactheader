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
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Blake Winton <bwinton@latte.ca>
 *   Dan Mosedale <dmose@mozillamessaging.com>
 *   Joachim Herb <Joachim.Herb@gmx.de>
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

/*
 * Test that we can add a tag to a message without messing up the header.
 */
var MODULE_NAME = 'test-header-toolbar';

var RELATIVE_ROOT = '../shared-modules';
var MODULE_REQUIRES = ['folder-display-helpers', 'window-helpers',
                       'mouse-event-helpers',
                       'address-book-helpers'];

try {
  var elib = {};
  ChromeUtils.import('chrome://mozmill/content/modules/elementslib.js', elib);
  var controller = {};
  ChromeUtils.import('chrome://mozmill/content/modules/controller.js', controller);
} catch(err) {
  dump("err: " + err);

  var elib = {};
  Cu.import('resource://mozmill/modules/elementslib.js', elib);
  var controller = {};
  Cu.import('resource://mozmill/modules/controller.js', controller);
}

Cu.import("resource://gre/modules/Services.jsm");

var folder;

const USE_SHEET_PREF = "toolbar.customization.usesheet";

function setupModule(module) {
  let fdh = collector.getModule('folder-display-helpers');
  fdh.installInto(module);
  let wh = collector.getModule('window-helpers');
  wh.installInto(module);
  let abh = collector.getModule('address-book-helpers');
  abh.installInto(module);
  let meh = collector.getModule('mouse-event-helpers');
  meh.installInto(module);

  folder = create_folder("TestEwait");

  let msg = create_message();
  add_message_to_folder(folder, msg);
}

function teardownModule() {
  Services.prefs.clearUserPref(USE_SHEET_PREF);
}

/**
 * Should test, if drag and drop from the header toolbar works.
 * Currently this test does no work
 */
function notest_with_sheet_dragndrop(){
  select_message_in_folder(0);
  Services.prefs.setBoolPref(USE_SHEET_PREF, true);
  let ctc = open_header_pane_toolbar_customization(mc);

  let firstButton = mc.e("wrapper-hdrTrashButton")
  let listener = mc.e("header-view-toolbar");
  let target = ctc.e("palette-box");

  drag_n_drop_element(firstButton, mc.window, target,
    ctc.window, 0.5, 0.5, listener)

  let secondButton = ctc.e("wrapper-spacer");
  target = mc.e("header-view-toolbar");
  listener = ctc.e("palette-box");

  drag_n_drop_element(secondButton, ctc.window, target,
    mc.window, 0.99, 0.5, listener)

  close_header_pane_toolbar_customization(ctc);

  firstButton = mc.e("hdrTrashButton")
  assert_equals(firstButton, null);
}


/**
 * Select message in current (global) folder.
 */
function select_message_in_folder(aMessageNum)
{
  be_in_folder(folder);

  // select and open the first message
  let curMessage = select_click_row(aMessageNum);

  // make sure it loads
  wait_for_message_display_completion(mc);
  assert_selected_and_displayed(mc, curMessage);

  return curMessage;
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
  if (Services.prefs.getBoolPref(USE_SHEET_PREF, true)) {
    ctc = wait_for_frame_load(aController.e("customizeToolbarSheetIFrame"),
      "chrome://global/content/customizeToolbar.xul");  }
  else {
    ctc = wait_for_existing_window("CustomizeToolbarWindow");
  }
  return ctc;
}

function close_header_pane_toolbar_customization(aController)
{
  aController.click(aController.eid("donebutton"));
  // XXX There should be an equivalent for testing the closure of
  // XXX the dialog embedded in a sheet, but I do not know how.
  if (!Services.prefs.getBoolPref(USE_SHEET_PREF, true)) {
    assert_true(aController.window.closed, "The customization dialog is not closed.");
  }
}
