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

var MODULE_NAME = 'test-compactheader-dark-on-focus';

var RELATIVE_ROOT = '../shared-modules';
var MODULE_REQUIRES = ['folder-display-helpers', 'window-helpers',
                       'address-book-helpers', 'mouse-event-helpers',
                       'compactheader-helpers'];

const DARKEN_PREF="extensions.CompactHeader.header.darkenonfocus";

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

// The WindowHelper module
var WindowHelper;

var folder1;
var normalBackground;

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

  folder1 = create_folder("DarkenTest1");

  let msg = create_message({cc: msgGen.makeNamesAndAddresses(3),
    to: msgGen.makeNamesAndAddresses(1)
  });

  add_message_to_folder(folder1, msg);
  let curMessage = select_message_in_folder(folder1, 0, mc);
  let msgHeaderView = mc.window.document.getElementById("msgHeaderView");
  normalBackground = mc.window.getComputedStyle(msgHeaderView)
                       .getPropertyValue("background-color");  //fails on OSX
  mc.sleep(1000);
}

function teardownModule() {
  Services.prefs.clearUserPref(DARKEN_PREF);
  let abwc = openAddressBook();
  close3PaneWindow();
  mc = open3PaneWindow();
  abwc.window.close();
}

function test_normal_background() {
  let curMessage = select_message_in_folder(folder1, 0, mc);
  set_pane_layout(kClassicMailLayout);
  assert_pane_layout(kClassicMailLayout);
  sub_test_background(normalBackground, mc, mc.eid('threadTree'));  //fails on OSX
  sub_test_background(normalBackground, mc, mc.eid('messagepane'));

  set_pane_layout(kWideMailLayout);
  assert_pane_layout(kWideMailLayout);
  sub_test_background(normalBackground, mc, mc.eid('threadTree'));
  sub_test_background(normalBackground, mc, mc.eid('messagepane'));

  set_pane_layout(kClassicMailLayout);
  assert_pane_layout(kClassicMailLayout);
  sub_test_background(normalBackground, mc, mc.eid('threadTree'));
  sub_test_background(normalBackground, mc, mc.eid('messagepane'));
}

function test_darken_background() {
  let abwc = openAddressBook();
  close3PaneWindow();
  mc = open3PaneWindow();
  abwc.window.close();

  let darkenBackground = darkenColor(normalBackground, 0.9);  // fails on OSX

  let curMessage = select_message_in_folder(folder1, 0, mc);
  expand_and_assert_header(mc);
  open_preferences_dialog(mc, set_preferences_darken);

  sub_test_background(normalBackground, mc, mc.eid('displayDeck'));

  sub_test_background(darkenBackground, mc, mc.eid('messagepane'));

  set_pane_layout(kWideMailLayout);
  assert_pane_layout(kWideMailLayout);
  sub_test_background(normalBackground, mc, mc.eid('threadTree'));
  sub_test_background(darkenBackground, mc, mc.eid('messagepane'));

  let msgc = open_selected_message_in_new_window();
  sub_test_background(normalBackground, msgc, msgc.eid('messagepane'));
  close_window(msgc);

  sub_test_background(normalBackground, mc, mc.eid('threadTree'));
  sub_test_background(darkenBackground, mc, mc.eid('messagepane'));

  open_preferences_dialog(mc, set_preferences_non_darken);
  sub_test_background(normalBackground, mc, mc.eid('threadTree'));
  sub_test_background(normalBackground, mc, mc.eid('messagepane'));

  set_pane_layout(kClassicMailLayout);
  assert_pane_layout(kClassicMailLayout);
  sub_test_background(normalBackground, mc, mc.eid('threadTree'));
  sub_test_background(normalBackground, mc, mc.eid('messagepane'));
}

function sub_test_background(aColor, aController, aTarget) {
  expand_and_assert_header(aController);
  mc.click(aTarget);
  let msgHeaderView = aController.window.document.getElementById("msgHeaderView");
  let background =  aController.window.getComputedStyle(msgHeaderView)
                             .getPropertyValue("background-color");

  assert_equals(darkenColor(aColor, 1), darkenColor(background, 1));

  open_preferences_dialog(aController, set_preferences_twoline);
  aController.sleep(10);
  collapse_and_assert_header(aController);
  mc.click(aTarget);
  msgHeaderView = aController.window.document.getElementById("msgHeaderView");
  background =  aController.window.getComputedStyle(msgHeaderView)
                         .getPropertyValue("background-color");
  assert_equals(darkenColor(aColor, 1), darkenColor(background, 1));

  open_preferences_dialog(aController, set_preferences_oneline);
  aController.sleep(10);
  collapse_and_assert_header(aController);
  mc.click(aTarget);
  msgHeaderView = aController.window.document.getElementById("msgHeaderView");
  background =  aController.window.getComputedStyle(msgHeaderView)
                         .getPropertyValue("background-color");
  assert_equals(darkenColor(aColor, 1), darkenColor(background, 1));
}

function darkenColor(color, factor) {
  if ((color.substr(0, 1) === '#') || (color === "transparent")) {
    return color;
  }

  var digits = /(.*?)rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+))?\)/.exec(color);

  var red = parseInt(digits[2]);
  var green = parseInt(digits[3]);
  var blue = parseInt(digits[4]);

  red = red * factor;
  green = green * factor;
  blue = blue * factor;

  var rgb = blue | (green << 8) | (red << 16);
  return digits[1] + '#' + rgb.toString(16);
}
