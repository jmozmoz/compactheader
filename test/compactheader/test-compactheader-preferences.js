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

var messageBodyISO8859_1 = "ae: " + String.fromCharCode(228) +
  ", oe: " + String.fromCharCode(246) +
  ", ue: " + String.fromCharCode(252) +
  ", AE: " + String.fromCharCode(196) +
  ", OE: " + String.fromCharCode(214) +
  ", UE: " + String.fromCharCode(220) +
  ", ss: " + String.fromCharCode(223) + "\n";

//var messageBodyUTF8 = "ae: ä, oe: ö, ue: ü, " +
//  "AE: Ä, OE: Ö, UE: Ü, ss: ß";

//var messageBodyUTF8 = "ae: \uc3a4, oe: \uceb6, ue: \uc3bc, " +
//                      "AE: \uc384, OE: \uc396, UE: \uc39c, ss: \uce9f";

messageBodyUTF8 =
  "ae: "   + String.fromCharCode(0xc3) + String.fromCharCode(0xa4) +
  ", oe: " + String.fromCharCode(0xc3) + String.fromCharCode(0xb6) +
  ", ue: " + String.fromCharCode(0xc3) + String.fromCharCode(0xbc) +
  ", AE: " + String.fromCharCode(0xc3) + String.fromCharCode(0x84) +
  ", OE: " + String.fromCharCode(0xc3) + String.fromCharCode(0x96) +
  ", UE: " + String.fromCharCode(0xc3) + String.fromCharCode(0x9c) +
  ", ss: " + String.fromCharCode(0xc3) + String.fromCharCode(0x9f) +
  "\n";

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

  // Get rid of possibly showing up lightning import wizard
  // Get rid of possibly showing up lightning import wizard
  let wizard = Services.wm.getMostRecentWindow("Calendar:MigrationWizard");
  if (wizard) {
    close_window(wizard);
    mc = open3PaneWindow();
  }

  folder1 = create_folder("MessageWindowC");
  folder2 = create_folder("MessageWindowD");

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

  // create a message that has umlauts
  addToFolder("test encoded ISO-8859-1", messageBodyISO8859_1, folder1, "iso-8859-1");
  addToFolder("test encoded UTF-8", messageBodyUTF8, folder1, "utf-8");

  let msg2 = create_message();
  add_message_to_folder(folder1, msg2);

  let msg3 = create_message();
  add_message_to_folder(folder2, msg3);

  // create message with empty email addresses to avoid double click
  // confusion
  let msg4 = create_message(
      {
        to: 't@t',
        from: 't@t',
        subject: "subject.",
      });

  add_message_to_folder(folder2, msg4);
}


function test_double_preference_change_ISO(){
  select_message_in_folder(folder1, 2, mc);
  assert_browser_text_present(mc.e("messagepane"), messageBodyISO8859_1);
  open_preferences_dialog(mc, subtest_change_twoline_linkify);
  mc.sleep(100);
  assert_browser_text_present(mc.e("messagepane"), messageBodyISO8859_1);
}

function test_double_preference_change_UTF(){
  select_message_in_folder(folder1, 3, mc);
  assert_browser_text_present(mc.e("messagepane"), messageBodyISO8859_1);
  open_preferences_dialog(mc, subtest_change_twoline_linkify);
  mc.sleep(100);
  assert_browser_text_present(mc.e("messagepane"), messageBodyISO8859_1);
}

function subtest_change_twoline_linkify(aController) {
  aController.click(aController.eid("CompactHeader_checkboxCompactTwolineView"));
  aController.click(aController.eid("CompactHeader_checkboxLinkify"));
  close_preferences_dialog(aController);
}

function test_single_preference_change_folder(){
  select_message_in_folder(folder1, 3, mc);
  open_preferences_dialog(mc, subtest_change_twoline);
  select_message_in_folder(folder2, 0, mc);
}

function addToFolder(aSubject, aBody, aFolder, aCharset) {

  let msgId = Components.classes["@mozilla.org/uuid-generator;1"]
                          .getService(Components.interfaces.nsIUUIDGenerator)
                          .generateUUID() +"@mozillamessaging.invalid";

  let source = "From - Sat Nov  1 12:39:54 2008\n" +
               "X-Mozilla-Status: 0001\n" +
               "X-Mozilla-Status2: 00000000\n" +
               "Message-ID: <" + msgId + ">\n" +
               "Date: Wed, 11 Jun 2008 20:32:02 -0400\n" +
               "From: Tester <tests@mozillamessaging.invalid>\n" +
               "User-Agent: Thunderbird 3.0a2pre (Macintosh/2008052122)\n" +
               "MIME-Version: 1.0\n" +
               "To: recipient@mozillamessaging.invalid\n" +
               "Subject: " + aSubject + "\n" +
               "Content-Type: text/html; charset=" + aCharset + "\n" +
               "Content-Transfer-Encoding: 8bit\n" +
               "\n" + aBody + "\n";

  aFolder.QueryInterface(Components.interfaces.nsIMsgLocalMailFolder);
  aFolder.gettingNewMessages = true;

  aFolder.addMessage(source);
  aFolder.gettingNewMessages = false;

  return aFolder.msgDatabase.getMsgHdrForMessageID(msgId);
}

/**
 * Asserts that the given text is present on the message pane.
 */
function assert_browser_text_present(aBrowser, aText) {
  let html = aBrowser.contentDocument.documentElement.innerHTML;
  if (html.indexOf(aText) == -1) {
    throw new Error("Unable to find string \"" + escape(aText) + "\" on the message pane");
  }
}

function subtest_change_twoline_dblclick(aController) {
  let dblClick = aController.eid("CompactHeader_checkbox_dblclick_header");
  let dblClickNode = dblClick.node;

  if (!dblClickNode.hasAttribute("checked")) {
    aController.click(dblClick);
  }
  let checkboxCompactTwolineView = aController.eid("CompactHeader_checkboxCompactTwolineView");
  if (!checkboxCompactTwolineView.node.getAttribute("checked")) {
    aController.click(checkboxCompactTwolineView);
  }

  close_preferences_dialog(aController);
}


/*
 * Test that double click in header pane toggles expanded/compact view
 */

function test_dblclick_header(){
  select_message_in_folder(folder2, 1, mc);
  set_and_assert_toolbox_position(mc, 'top'); // make sure, email addresses are out of the click way
  open_preferences_dialog(mc, subtest_change_oneline);
  open_preferences_dialog(mc, subtest_change_no_dblclick);
  collapse_and_assert_header(mc);

  mc.doubleClick(mc.eid("msgHeaderViewDeck"));
  assert_collapsed(mc);

  open_preferences_dialog(mc, subtest_change_twoline_dblclick);
  collapse_and_assert_header(mc);

  mc.doubleClick(mc.eid("msgHeaderViewDeck"));
  assert_expanded(mc);

  mc.doubleClick(mc.eid("msgHeaderViewDeck"));
  assert_collapsed(mc);

  open_preferences_dialog(mc, subtest_change_oneline);
  mc.sleep(250); // make sure, next preferences change results in update of email display
  collapse_and_assert_header(mc);

  mc.doubleClick(mc.eid("msgHeaderViewDeck"));
  assert_expanded(mc);

  mc.doubleClick(mc.eid("msgHeaderViewDeck"));
  assert_collapsed(mc);
}
