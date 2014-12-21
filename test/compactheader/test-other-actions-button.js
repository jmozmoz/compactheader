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

var MODULE_NAME = 'test-other-actions-button';

var RELATIVE_ROOT = '../shared-modules';
var MODULE_REQUIRES = ['folder-display-helpers', 'window-helpers',
                       'address-book-helpers', 'mouse-event-helpers',
                       'compactheader-helpers'];

var elib = {};
Cu.import('resource://mozmill/modules/elementslib.js', elib);
var controller = {};
Cu.import('resource://mozmill/modules/controller.js', controller);

// The WindowHelper module
var WindowHelper;

var folder1;

function setupModule(module) {
  let fdh = collector.getModule('folder-display-helpers');
  fdh.installInto(module);
  WindowHelper = collector.getModule('window-helpers');
  WindowHelper.installInto(module);
  let abh = collector.getModule('address-book-helpers');
  abh.installInto(module);
  let meh = collector.getModule('mouse-event-helpers');
  meh.installInto(module);
  let chh = collector.getModule('compactheader-helpers');
  chh.installInto(module);

  folder1 = create_folder("testOtherActionButton");

  let thread1 = create_thread(2);
  add_sets_to_folders([folder1], [thread1]);

  let msg = create_message();
  add_message_to_folder(folder1, msg);

  let msg2 = create_message();
  add_message_to_folder(folder1, msg2);

  let abwc = openAddressBook();
  close3PaneWindow();
  mc = open3PaneWindow();
  abwc.window.close();

  select_message_in_folder(folder1, 0, mc);
}

/* click the more button in compact view should change to expanded
 * header view
 */
function test_other_actions_button() {
  select_message_in_folder(folder1, 0, mc);
  open_preferences_dialog(mc, set_preferences_twoline);
  mc.sleep(10);
  restore_and_check_default_buttons(mc);
  collapse_and_assert_header(mc);
  set_and_assert_toolbox_position(mc, 'right');

  // It is necessary to press the Other Actions Button to get the popup menu populated
  mc.click(mc.eid("otherActionsButton"));
  mc.ewait("CompactHeader_hidecohePreferencesButton");
  mc.click(mc.eid("otherActionsButton"));

  let menuItems = {
    "otherActionsOpenConversation":      false, // always disabled, probably because messages are not indexed
    "otherActionsOpenInNewWindow":       true,
    "otherActionsOpenInNewTab":          true,
    "CompactHeader_hdrPane-markFlagged": true,
    "viewSourceMenuItem":                true,
    //"markAsReadMenuItem":                true,  // this does not work, because the message is already set to read
    "markAsUnreadMenuItem":              true,
    "saveAsMenuItem":                    true,
    "otherActionsPrint":                 true
  };

  for (let menu in menuItems) {
    let menuEl = mc.e(menu);
    assert_equals(menuEl.hasAttribute("disabled"), !menuItems[menu], menu);
  }

  select_none();
  assert_nothing_selected();

  // It is necessary to press the Other Actions Button to get the popup menu populated
  mc.click(mc.eid("otherActionsButton"));
  mc.ewait("CompactHeader_hidecohePreferencesButton");
  mc.click(mc.eid("otherActionsButton"));

  for (let menu in menuItems) {
    let menuEl = mc.e(menu);
    assert_equals(menuEl.getAttribute("disabled"), "true", menu);
  }

  select_message_in_folder(folder1, 3, mc);
  select_control_click_row(0);
  assert_selected_and_displayed(0, 3);

  mc.click(mc.eid("otherActionsButton"));
  mc.ewait("CompactHeader_hidecohePreferencesButton");
  mc.click(mc.eid("otherActionsButton"));

  for (let menu in menuItems) {
    let menuEl = mc.e(menu);
    assert_equals(menuEl.hasAttribute("disabled"), !menuItems[menu], menu);
  }

}
