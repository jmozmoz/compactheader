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

var MODULE_NAME = 'test-compactheader-collapse';

var RELATIVE_ROOT = '../shared-modules';
var MODULE_REQUIRES = ['folder-display-helpers', 'window-helpers',
                       'address-book-helpers', 'mouse-event-helpers',
                       'compactheader-helpers'];

const ENABLE_CHAT_PREF="mail.chat.enabled";

var elib = {};
Cu.import('resource://mozmill/modules/elementslib.js', elib);
var controller = {};
Cu.import('resource://mozmill/modules/controller.js', controller);

// The WindowHelper module
var WindowHelper;

var folder1;
var folder2;

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

  let msg2 = create_message({cc: msgGen.makeNamesAndAddresses(2), // YYY
    subject: "This is a really, really, really, really, really, really, really, really, long subject.",
    clobberHeaders: {
      "Newsgroups": "alt.test",
      "Reply-To": "J. Doe <j.doe@momo.invalid>",
      "Content-Base": "http://example.com/",
      "Bcc": "Richard Roe <richard.roe@momo.invalid>"
    }});
  add_message_to_folder(folder1, msg2);

  let msg3 = create_message({
    subject: "This is a short subject.",
    to: [["T Toe", "t.toe@t.invalid"]],
    clobberHeaders: {
      "Bcc": "R Roe <r.roe@r.invalid>",
      "cc": "S Soe <s.soe@s.invalid>",
    },
    });
  add_message_to_folder(folder1, msg3);

  let msg4 = create_message({cc: msgGen.makeNamesAndAddresses(3),
    to: msgGen.makeNamesAndAddresses(1)
  });
  add_message_to_folder(folder1, msg4);
}

function teardownModule() {
  Services.prefs.clearUserPref(ENABLE_CHAT_PREF);
  let abwc = openAddressBook();
  close3PaneWindow();
  mc = open3PaneWindow();
  abwc.window.close();
}

function test_wide_layout_and_compact() {
  set_pane_layout(kWideMailLayout);
  assert_pane_layout(kWideMailLayout);
  let abwc = openAddressBook();
  // The 3pane window is closed and opened again.
  close3PaneWindow();

  mc = open3PaneWindow();
  abwc.window.close();

  select_message_in_folder(folder1, 0, mc);
  collapse_and_assert_header(mc);

  let largeDispMUAIcon = mc.e("CompactHeader_dispMUAiconExp");
  let twoLineDispMUAIcon = mc.e("CompactHeader_dispMUAicon2line");
  let oneLineDispMUAIcon = mc.e("CompactHeader_dispMUAiconCompact");

  let orignalDispMUA = mc.e("dispMUA");

  if (orignalDispMUA == null) {
    assert_equals(oneLineDispMUAIcon.getAttribute("collapsed"), "true");
    assert_equals(twoLineDispMUAIcon.getAttribute("collapsed"), "true");
  }

  expand_and_assert_header(mc);
  if (orignalDispMUA == null) {
    assert_equals(oneLineDispMUAIcon.getAttribute("collapsed"), "true");
    assert_equals(twoLineDispMUAIcon.getAttribute("collapsed"), "true");
  }

  set_pane_layout(kClassicMailLayout);
  assert_pane_layout(kClassicMailLayout);
  abwc = openAddressBook();
  // The 3pane window is closed and opened again.
  close3PaneWindow();

  mc = open3PaneWindow();
  abwc.window.close();
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


function get_deck_size(target) {
  return mc.eid("msgHeaderViewDeck").getNode().boxObject;
}


function dump_header_size() {
  deck_size = get_deck_size();
  dump('msgHeaderViewDeck width: ' +
       deck_size.width +
      '\n');
  dump('msgHeaderViewDeck height: ' +
       deck_size.height +
       '\n');
}


function doubleClickRight(target) {
  deck_size = get_deck_size();
  mc.doubleClick(target,
      deck_size.width - 50,
      deck_size.height/2);
}


function test_dblclick(){
  select_message_in_folder(folder1, 0, mc);
  open_preferences_dialog(mc, set_preferences_oneline);
  mc.sleep(10);
  expand_and_assert_header(mc);

  dump_header_size();
  deck_size = get_deck_size();
  mc.doubleClick(mc.eid("msgHeaderViewDeck"));
  dump_header_size();
  assert_collapsed(mc);

  mc.doubleClick(mc.eid("msgHeaderViewDeck"));
  dump_header_size();
  assert_expanded(mc);

  open_preferences_dialog(mc, set_preferences_twoline);
  mc.sleep(10);

  expand_and_assert_header(mc);
  dump_header_size();

  mc.doubleClick(mc.eid("msgHeaderViewDeck"));
  assert_collapsed(mc);
  dump_header_size();

  doubleClickRight(mc.eid("msgHeaderViewDeck"));
  dump_header_size();
  assert_expanded(mc);
}

function test_address_type_format(){
  select_message_in_folder(folder1, 1, mc);
  open_preferences_dialog(mc, set_preferences_twoline);
  mc.sleep(10);
  collapse_and_assert_header(mc);
  collapse_and_assert_header(mc);

  // Check the mode of the header.
  let headerBox = mc.eid("CompactHeader_collapsedHeaderView");
  let previousHeaderMode = headerBox.node.getAttribute("show_header_mode");

  // Click the "more" button.
  let moreIndicator = mc.eid("CompactHeader_collapsed2LtoCcBccBox");
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


  let toDescription = mc.a('CompactHeader_collapsed2LtoCcBccBox', {class: "headerValue"});
  let addrs = toDescription.getElementsByTagName('mail-emailaddress');
  for (let i=0; i<addrs.length; i++) {
    assert_true(addrs[i].hasAttribute("addressType"));
  }
}

function test_date_format_collapsed(){
  let msg = create_message();
  add_message_to_folder(folder1, msg);
  select_message_in_folder(folder1, -1, mc);

  expand_and_assert_header(mc);
  let expandedValue = mc.e("dateLabel").textContent;

  open_preferences_dialog(mc, set_preferences_twoline);
  mc.sleep(10);
  collapse_and_assert_header(mc);
  assert_equals(expandedValue, mc.e("CompactHeader_collapsed2LdateBox").textContent);

  open_preferences_dialog(mc, set_preferences_oneline);
  collapse_and_assert_header(mc);
  assert_equals(expandedValue, mc.e("CompactHeader_collapsed1LdateBox").textContent);
}

function test_neighbours_of_header_view_toolbox(){
  expand_and_assert_header(mc);
  mc = reopen_3pane_window();

  be_in_folder(folder1);

  // select the first message, which will display it
  let curMessage = select_click_row(0);
  assert_selected_and_displayed(mc, curMessage);

  let oldPreviousSibling = mc.e("header-view-toolbox").previousSibling;
  if (oldPreviousSibling) {
    oldPreviousSibling = oldPreviousSibling.id;
  }
  let oldNextSibling = mc.e("header-view-toolbox").nextSibling;
  if (oldNextSibling) {
    oldNextSibling = oldNextSibling.id;
  }

  collapse_and_assert_header(mc);
  expand_and_assert_header(mc);

  let newPreviousSibling = mc.e("header-view-toolbox").previousSibling;
  if (newPreviousSibling) {
    newPreviousSibling = newPreviousSibling.id;
  }
  let newNextSibling = mc.e("header-view-toolbox").nextSibling;
  if (newNextSibling) {
    newNextSibling = newNextSibling.id;
  }

  assert_equals(oldPreviousSibling, newPreviousSibling);
  assert_equals(oldNextSibling, newNextSibling);
}

function test_address_type_order(){
  select_message_in_folder(folder1, 2, mc);
  open_preferences_dialog(mc, set_preferences_twoline);
  mc.sleep(10);
  collapse_and_assert_header(mc);
  select_message_in_folder(folder1, 2, mc);

  let toCcBccDescription = mc.a('CompactHeader_collapsed2LtoCcBccBox', {class: "headerValue"});
  let addrs = toCcBccDescription.getElementsByTagName('mail-emailaddress');

  let currentAddressType = "to";
  for (let i=0; i<addrs.length; i++) {
    let addressType = addrs[i].getAttribute("addressType");
    assert_true((addressType == "to") || (addressType == "cc") || (addressType == "bcc"),
      "wrong address type");
    assert_true(addressType <= currentAddressType, "wrong address type order");
    currentAddressType = addressType;
  }
}

function test_addresses_do_not_double(){
  const MORE_PREF = "mailnews.headers.show_n_lines_before_more";
  Services.prefs.setIntPref(MORE_PREF, 2);

  select_message_in_folder(folder1, 2, mc);
  collapse_and_assert_header(mc);
  expand_and_assert_header(mc);
  select_message_in_folder(folder1, 3, mc);

  let addrs;

  let fromDescription = mc.a('expandedfromBox', {class: "headerValue"});
  addrs = fromDescription.getElementsByTagName('mail-emailaddress');
  let firstFromAddrNum = 0;
    for (let i = 0; i<addrs.length; i++) {
      if (isVisible(addrs[i])) {
        firstFromAddrNum += 1;
      }
  }

  let toDescription = mc.a('expandedtoBox', {class: "headerValue"});
  addrs = toDescription.getElementsByTagName('mail-emailaddress');
  let firstToAddrNum = 0;
  for (let i = 0; i<addrs.length; i++) {
    if (isVisible(addrs[i])) {
      firstToAddrNum += 1;
    }
  }

  let ccDescription = mc.a('expandedccBox', {class: "headerValue"});
  addrs = ccDescription.getElementsByTagName('mail-emailaddress');
  let firstCCAddrNum = 0;
  for (let i = 0; i<addrs.length; i++) {
    if (isVisible(addrs[i])) {
      firstCCAddrNum += 1;
    }
  }

  collapse_and_assert_header(mc);
  expand_and_assert_header(mc);

  addrs = fromDescription.getElementsByTagName('mail-emailaddress');
  let secondFromAddrNum = 0;
  for (let i = 0; i<addrs.length; i++) {
    if (isVisible(addrs[i])) {
      secondFromAddrNum += 1;
    }
  }

  addrs = toDescription.getElementsByTagName('mail-emailaddress');
  let secondToAddrNum = 0;
  for (let i = 0; i<addrs.length; i++) {
    if (isVisible(addrs[i])) {
      secondToAddrNum += 1;
    }
  }

  addrs = ccDescription.getElementsByTagName('mail-emailaddress');
  let secondCCAddrNum = 0;
  for (let i = 0; i<addrs.length; i++) {
    if (isVisible(addrs[i])) {
      secondCCAddrNum += 1;
    }
  }

  assert_true(firstFromAddrNum == secondFromAddrNum, "number of from addresses changed from " +
      firstFromAddrNum + " to " + secondFromAddrNum);
  assert_true(firstToAddrNum == secondToAddrNum, "number of to addresses changed from " +
      firstToAddrNum + " to " + secondToAddrNum);
  assert_true(firstCCAddrNum == secondCCAddrNum, "number of cc addresses changed from " +
      firstCCAddrNum + " to " + secondCCAddrNum);
  Services.prefs.clearUserPref(MORE_PREF);
}

function test_toCcBcc_without_chat_enabled(){
  select_message_in_folder(folder1, 0, mc);
  open_preferences_dialog(mc, set_preferences_twoline);

  Services.prefs.setBoolPref(ENABLE_CHAT_PREF, false);

  let abwc = openAddressBook();
  close3PaneWindow();
  mc = open3PaneWindow();
  abwc.window.close();

  let msg = create_message({
    subject: "This is a short subject.",
    to: [["U Ull", "u.ull@t.invalid"]],
      clobberHeaders: {
        "cc": "W Wer <w.wer@s.invalid>",
    },
    });
  add_message_to_folder(folder1, msg);
  select_message_in_folder(folder1, -1, mc);

  mc.sleep(10);
  collapse_and_assert_header(mc);

  let toDescription = mc.a('CompactHeader_collapsed2LtoCcBccBox', {class: "headerValue"});
  let addrs = toDescription.getElementsByTagName('mail-emailaddress');
  for (let i=0; i<addrs.length; i++) {
    let labels = mc.window.document.getAnonymousElementByAttribute(
      addrs[i], "anonid", "emaillabel");
    assert_true(labels.value.length > 0);
  }
}
