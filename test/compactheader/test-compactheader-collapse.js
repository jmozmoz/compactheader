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

var MODULE_NAME = 'test-compactheader-preferences';

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
var folder2;

const PREF = "browser.preferences.instantApply";
var prefBranch = Cc["@mozilla.org/preferences-service;1"]
                    .getService(Ci.nsIPrefService).getBranch(null);

var messageBodyISO8859_1 = "ae: " + String.fromCharCode(228) +
  ", oe: " + String.fromCharCode(246) +
  ", ue: " + String.fromCharCode(252) +
  ", AE: " + String.fromCharCode(196) +
  ", OE: " + String.fromCharCode(214) +
  ", UE: " + String.fromCharCode(220) +
  ", ss: " + String.fromCharCode(223) + "\n";

var messageBodyUTF8 = "ae: ä, oe: ö, ue: ü, AE: Ä, OE: Ö, UE: Ü, ss: ß";

function setupModule(module) {
  let fdh = collector.getModule('folder-display-helpers');
  fdh.installInto(module);
  WindowHelper = collector.getModule('window-helpers');
  WindowHelper.installInto(module);
  let abh = collector.getModule('address-book-helpers');
  abh.installInto(module);
  let meh = collector.getModule('mouse-event-helpers');
  meh.installInto(module);
  let meh = collector.getModule('mouse-event-helpers');
  meh.installInto(module);
  let chh = collector.getModule('compactheader-helpers');
  chh.installInto(module);

  folder1 = create_folder("MessageWindowE");

  // create a message that has the interesting headers that commonly
  // show up in the message header pane for testing
  let msg = create_message({cc: msgGen.makeNamesAndAddresses(20), // YYY
                            subject: "This is a really, really, really, really, really, really, really, really, long subject.",
                            clobberHeaders: {
                              "Newsgroups": "alt.test",
                              "Reply-To": "J. Doe <j.doe@momo.invalid>",
                              "Content-Base": "http://example.com/",
                              "Bcc": "Richard Roe <richard.roe@momo.invalid>"
                            }});

  add_message_to_folder(folder1, msg);

  let msg = create_message({cc: msgGen.makeNamesAndAddresses(2), // YYY
    subject: "This is a really, really, really, really, really, really, really, really, long subject.",
    clobberHeaders: {
      "Newsgroups": "alt.test",
      "Reply-To": "J. Doe <j.doe@momo.invalid>",
      "Content-Base": "http://example.com/",
      "Bcc": "Richard Roe <richard.roe@momo.invalid>"
    }});

  add_message_to_folder(folder1, msg);
}

function test_toggle_header_view_twoline(){
  select_message_in_folder(folder1, 0, mc);
  open_preferences_dialog(mc, set_preferences_twoline);
  mc.sleep(10);
  open_preferences_dialog(mc, set_preferences_twoline);
  mc.sleep(10);
  collapse_and_assert_header(mc);
  collapse_and_assert_header(mc);
  expand_and_assert_header(mc);
  expand_and_assert_header(mc);
  collapse_and_assert_header(mc);
}

function test_toggle_header_view_oneline(){
  select_message_in_folder(folder1, 0, mc);
  open_preferences_dialog(mc, set_preferences_oneline);
  mc.sleep(10);
  open_preferences_dialog(mc, set_preferences_oneline);
  mc.sleep(10);
  collapse_and_assert_header(mc);
  collapse_and_assert_header(mc);
  expand_and_assert_header(mc);
  expand_and_assert_header(mc);
  collapse_and_assert_header(mc);
}


function test_address_type_format(){
  select_message_in_folder(folder1, 1, mc);
  open_preferences_dialog(mc, set_preferences_twoline);
  mc.sleep(10);
  collapse_and_assert_header(mc);
  collapse_and_assert_header(mc);

  // Check the mode of the header.
  let headerBox = mc.eid("cohe_collapsedHeaderView");
  let previousHeaderMode = headerBox.node.getAttribute("show_header_mode");

  // Click the "more" button.
  let moreIndicator = mc.eid("cohe_collapsed2LtoCcBccBox");
  moreIndicator = mc.window.document.getAnonymousElementByAttribute(
                    moreIndicator.node, "anonid", "more");
  moreIndicator = new elementslib.Elem(moreIndicator);
  if (moreIndicator) {
    mc.click(moreIndicator);
  }

  // Check the new mode of the header.
  // FIXME: In the expanded header mode pressing the more button
  // makes the header scrollable.
//  if (headerBox.node.getAttribute("show_header_mode") != "all")
//    throw new Error("Header Mode didn't change to 'all'!  " + "old=" +
//                    previousHeaderMode + ", new=" +
//                    headerBox.node.getAttribute("show_header_mode"));


  let toDescription = mc.a('cohe_collapsed2LtoCcBccBox', {class: "headerValue"});
  let addrs = toDescription.getElementsByTagName('mail-emailaddress');
  for (let i=0; i<addrs.length; i++) {
    assert_true(addrs[i].hasAttribute("addressType"));
  }
}

function set_preferences_twoline(aController) {
  let checkboxCompactTwolineView = aController.eid("cohe_checkboxCompactTwolineView");
  if (!checkboxCompactTwolineView.node.getAttribute("checked")) {
    aController.click(checkboxCompactTwolineView);
  }
  close_preferences_dialog(aController);
}

function set_preferences_oneline(aController) {
  let checkboxCompactTwolineView = aController.eid("cohe_checkboxCompactTwolineView");
  if (checkboxCompactTwolineView.node.getAttribute("checked")) {
    aController.click(checkboxCompactTwolineView);
  }
  close_preferences_dialog(aController);
}

