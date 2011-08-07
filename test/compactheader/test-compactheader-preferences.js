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

var MODULE_NAME = 'test-compactheader-preferences';

var RELATIVE_ROOT = '../shared-modules';
var MODULE_REQUIRES = ['folder-display-helpers', 'window-helpers',
                       'address-book-helpers', 'mouse-event-helpers'];

var elib = {};
Cu.import('resource://mozmill/modules/elementslib.js', elib);
var controller = {};
Cu.import('resource://mozmill/modules/controller.js', controller);

// The WindowHelper module
var WindowHelper;

var folder;

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

  folder = create_folder("MessageWindowB");

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

  add_message_to_folder(folder, msg);

  // create a message that has

  addToFolder("test encoded ISO-8859-1", messageBodyISO8859_1, folder, "iso-8859-1");
  addToFolder("test encoded UTF-8", messageBodyUTF8, folder, "utf-8");

  let msg = create_message();
  add_message_to_folder(folder, msg);

}


/**
 *  Make sure that opening the header toolbar customization dialog
 *  does not break the get messages button in main toolbar
 */
function test_double_preference_change_ISO(){
  select_message_in_folder(2);
  assert_browser_text_present(mc.e("messagepane"), messageBodyISO8859_1);
  open_preferences_dialog(mc, subtest_p1);
  mc.sleep(10);
  assert_browser_text_present(mc.e("messagepane"), messageBodyISO8859_1);
}

function test_double_preference_change_UTF(){
  select_message_in_folder(3);
  assert_browser_text_present(mc.e("messagepane"), messageBodyISO8859_1);
  open_preferences_dialog(mc, subtest_p1);
  mc.sleep(10);
  assert_browser_text_present(mc.e("messagepane"), messageBodyISO8859_1);
}

function subtest_p1(aController) {
  aController.click(aController.eid("checkboxCompactTwolineView"));
  aController.click(aController.eid("checkboxLinkify"));
  close_preferences_dialog(aController);
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
  WindowHelper.plan_for_new_window("mail:3pane");
  windowWatcher.openWindow(null,
                           "chrome://messenger/content/messenger.xul", "",
                           "all,chrome,dialog=no,status,toolbar",
                           null);
  return WindowHelper.wait_for_new_window("mail:3pane");
}

function openAddressBook() {
  let windowWatcher = Cc["@mozilla.org/embedcomp/window-watcher;1"].
    getService(Ci.nsIWindowWatcher);
  WindowHelper.plan_for_new_window("mail:addressbook");
  windowWatcher.openWindow(
                      null,
                      "chrome://messenger/content/addressbook/addressbook.xul", "",
                      "all,chrome,dialog=no,status,toolbar",
                      null);
  return WindowHelper.wait_for_new_window("mail:addressbook");
}

function open_preferences_dialog(aController, aSubtest) {
  plan_for_modal_dialog("ext:options", aSubtest);
  aController.click(aController.eid("hidecohePreferencesButton"));
  wait_for_modal_dialog("ext:options", 1);
}

function close_preferences_dialog(aController) {
  let okButton = aController.window.document.documentElement.getButton('accept');
  plan_for_window_close(aController);
  aController.click(new elib.Elem(okButton));
  wait_for_window_close();
  //assert_true(aController.window.closed, "The preferences dialog is not closed.");
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