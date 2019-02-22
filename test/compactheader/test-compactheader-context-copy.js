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

const LINKIFY_PREF = "extensions.CompactHeader.headersize.linkify";
const FEED_ADDR = "http://www.mozilla.org/"

  try {
    var elib = ChromeUtils.import('chrome://mozmill/content/modules/elementslib.jsm');
  } catch (err) {
      try {
        dump("xxxxxxxxxxxxxxxxxxxxxx err: " + err);
        var elib = ChromeUtils.import('chrome://mozmill/content/modules/elementslib.js');
      } catch(err2) {
        dump("yyyyyyyyyyyyyyyyyyyyyyy err: " + err2);
        var Ci = Components.interfaces;
        var Cc = Components.classes;
        var Cu = Components.utils;

        var elib = {};
        Cu.import('resource://mozmill/modules/elementslib.js', elib);
      }
  }

  try {
    var controller = ChromeUtils.import('chrome://mozmill/content/modules/controller.jsm');
  } catch (err) {
      try {
        dump("xxxxxxxxxxxxxxxxxxxxxx err: " + err);
        var controller = ChromeUtils.import('chrome://mozmill/content/modules/controller.js');
      } catch(err2) {
        dump("yyyyyyyyyyyyyyyyyyyyyyy err: " + err2);
        var Ci = Components.interfaces;
        var Cc = Components.classes;
        var Cu = Components.utils;

        var controller = {};
        Cu.import('resource://mozmill/modules/controller.js', controller);
      }
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

  folder1 = create_folder("ContextCopyTest1");

  let msg = create_message({cc: msgGen.makeNamesAndAddresses(3),
    to: msgGen.makeNamesAndAddresses(1),
    subject: "Normal message"
  });


  add_message_to_folder(folder1, msg);
  // create a message which looks like an RSS feed
  let msg2 = create_message({to: msgGen.makeNamesAndAddresses(1), // YYY
                            subject: "RSS feed message",
                            clobberHeaders: {
                              "Content-Base": FEED_ADDR
                            }});
  add_message_to_folder(folder1, msg2);

}

function teardownModule() {
  Services.prefs.clearUserPref(LINKIFY_PREF);
  let abwc = openAddressBook();
  close3PaneWindow();
  mc = open3PaneWindow();
  abwc.window.close();
}

function test_without_linkify() {
  // select "normal message
  let curMessage = select_message_in_folder(folder1, 0, mc);
  expand_and_assert_header(mc);
  open_preferences_dialog(mc, set_preferences_oneline);
  open_preferences_dialog(mc, set_preferences_non_linkify);

  // check context menu of subject = Copy
  mc.rightClick(mc.eid("expandedsubjectBox"));
  wait_for_popup_to_open(mc.e("copyPopup"));
  assert_true(isVisible(mc.e("copyMenuitem")));
  mc.click_menus_in_sequence(mc.e("copyPopup"), [{id: "copyMenuitem"}]);
  assert_clipboard_content(curMessage.mime2DecodedSubject);

  // no header entry web address
  assert_false(isVisible(mc.e("expandedcontent-baseBox")));

  collapse_and_assert_header(mc);
  // check context menu of subject = Copy
  assert_true(isVisible(mc.e("CompactHeader_collapsed1LsubjectBox")));
  mc.rightClick(mc.eid("CompactHeader_collapsed1LsubjectBox"));
  wait_for_popup_to_open(mc.e("copyPopup"));
  assert_true(isVisible(mc.e("copyMenuitem")));
  assert_false(isVisible(mc.e("CompactHeader_copyPopup_CopyLink")),
    "CompactHeader_copyPopup_CopyLink should be invisible");
  assert_false(isVisible(mc.e("CompactHeader_copyPopup_CopyText")),
    "CompactHeader_copyPopup_CopyText should be invisible");
  mc.click_menus_in_sequence(mc.e("copyPopup"), [{id: "copyMenuitem"}]);
  assert_clipboard_content(curMessage.mime2DecodedSubject);
  assert_equals(null, mc.e("CompactHeader_collapsedsubjectlinkBox"));

  // select RSS message
  curMessage = select_message_in_folder(folder1, 1, mc);
  expand_and_assert_header(mc);

  // check context menu of subject = Copy
  mc.rightClick(mc.eid("expandedsubjectBox"));
  wait_for_popup_to_open(mc.e("copyPopup"));
  assert_true(isVisible(mc.e("copyMenuitem")));
  mc.click_menus_in_sequence(mc.e("copyPopup"), [{id: "copyMenuitem"}]);
  assert_clipboard_content(curMessage.mime2DecodedSubject);

  // check context menu of Website = Copy Link Address
  mc.rightClick(mc.eid("expandedcontent-baseBox"));
  wait_for_popup_to_open(mc.e("copyUrlPopup"));

  let copyLinkMenuItem = mc.window.document.getElementsByAttribute("oncommand",
      "CopyWebsiteAddress(document.popupNode)")[0];
  assert_true(isVisible(copyLinkMenuItem));
  let copyLinkMenuItemClick = new elementslib.Elem(copyLinkMenuItem);
  mc.click(copyLinkMenuItemClick);
  assert_clipboard_content(FEED_ADDR);


  collapse_and_assert_header(mc);
  // check context menu of subject = Copy
  assert_true(isVisible(mc.e("CompactHeader_collapsed1LsubjectBox")));
  mc.rightClick(mc.eid("CompactHeader_collapsed1LsubjectBox"));
  wait_for_popup_to_open(mc.e("copyPopup"));
  assert_true(isVisible(mc.e("copyMenuitem")));
  assert_false(isVisible(mc.e("CompactHeader_copyPopup_CopyLink")),
    "CompactHeader_copyPopup_CopyLink should be invisible");
  assert_false(isVisible(mc.e("CompactHeader_copyPopup_CopyText")),
    "CompactHeader_copyPopup_CopyText should be invisible");
  mc.click_menus_in_sequence(mc.e("copyPopup"), [{id: "copyMenuitem"}]);
  assert_clipboard_content(curMessage.mime2DecodedSubject);
  // no link in subject
  assert_equals(null, mc.e("CompactHeader_collapsedsubjectlinkBox"));
}

function test_with_linkify() {
  let curMessage = select_message_in_folder(folder1, 0, mc);
  expand_and_assert_header(mc);
  open_preferences_dialog(mc, set_preferences_oneline);
  open_preferences_dialog(mc, set_preferences_linkify);

  // check context menu of subject = Copy
  mc.rightClick(mc.eid("expandedsubjectBox"));
  wait_for_popup_to_open(mc.e("copyPopup"));
  assert_true(isVisible(mc.e("copyMenuitem")));
  mc.click_menus_in_sequence(mc.e("copyPopup"), [{id: "copyMenuitem"}]);
  assert_clipboard_content(curMessage.mime2DecodedSubject);

  // no header entry web address
  assert_false(isVisible(mc.e("expandedcontent-baseBox")));

  collapse_and_assert_header(mc);
  // check context menu of subject = Copy
  assert_true(isVisible(mc.e("CompactHeader_collapsed1LsubjectBox")));
  mc.rightClick(mc.eid("CompactHeader_collapsed1LsubjectBox"));
  wait_for_popup_to_open(mc.e("copyPopup"));
  assert_true(isVisible(mc.e("copyMenuitem")));
  assert_false(isVisible(mc.e("CompactHeader_copyPopup_CopyLink")),
    "CompactHeader_copyPopup_CopyLink should be invisible");
  assert_false(isVisible(mc.e("CompactHeader_copyPopup_CopyText")),
    "CompactHeader_copyPopup_CopyText should be invisible");
  mc.click_menus_in_sequence(mc.e("copyPopup"), [{id: "copyMenuitem"}]);
  assert_clipboard_content(curMessage.mime2DecodedSubject);

  curMessage = select_message_in_folder(folder1, 1, mc);
  expand_and_assert_header(mc);

  // check context menu of subject = Copy
  mc.rightClick(mc.eid("expandedsubjectBox"));
  wait_for_popup_to_open(mc.e("copyPopup"));
  assert_true(isVisible(mc.e("copyMenuitem")));
  mc.click_menus_in_sequence(mc.e("copyPopup"), [{id: "copyMenuitem"}]);
  assert_clipboard_content(curMessage.mime2DecodedSubject);

  // check context menu of Website = Copy Link Address
  mc.rightClick(mc.eid("expandedcontent-baseBox"));
  wait_for_popup_to_open(mc.e("copyUrlPopup"));

  let copyLinkMenuItem = mc.window.document.getElementsByAttribute("oncommand",
      "CopyWebsiteAddress(document.popupNode)")[0];
  assert_true(isVisible(copyLinkMenuItem));
  let copyLinkMenuItemClick = new elementslib.Elem(copyLinkMenuItem);
  mc.click(copyLinkMenuItemClick);
  assert_clipboard_content(FEED_ADDR);


  collapse_and_assert_header(mc);
  // check context menu of subject = Copy
  assert_false(isVisible(mc.e("CompactHeader_collapsed1LsubjectBox")));
  assert_equals(FEED_ADDR,
      mc.e("CompactHeader_collapsedsubjectlinkBox").getAttribute("url"));
  mc.rightClick(mc.eid("CompactHeader_collapsedsubjectlinkBox"));
  wait_for_popup_to_open(mc.e("CompactHeader_copyPopup"));
  assert_false(isVisible(mc.e("copyPopup")));
  assert_true(isVisible(mc.e("CompactHeader_copyPopup_CopyLink")),
    "CompactHeader_copyPopup_CopyLink should be visible");
  assert_true(isVisible(mc.e("CompactHeader_copyPopup_CopyText")),
    "CompactHeader_copyPopup_CopyText should be visible");
  mc.click_menus_in_sequence(mc.e("CompactHeader_copyPopup"),
      [{id: "CompactHeader_copyPopup_CopyText"}]);
  assert_clipboard_content(curMessage.mime2DecodedSubject);


  mc.rightClick(mc.eid("CompactHeader_collapsedsubjectlinkBox"));
  wait_for_popup_to_open(mc.e("CompactHeader_copyPopup"));
  mc.click_menus_in_sequence(mc.e("CompactHeader_copyPopup"),
      [{id: "CompactHeader_copyPopup_CopyLink"}]);
  assert_clipboard_content(FEED_ADDR);
}


function assert_clipboard_content(expectedContent) {
  var trans = Transferable();
  trans.addDataFlavor("text/unicode");

  Services.clipboard.getData(trans, Services.clipboard.kGlobalClipboard);

  var str       = {};
  var strLength = {};

  trans.getTransferData("text/unicode", str, strLength);

  if (str) {
    var pastetext = str.value.QueryInterface(Ci.nsISupportsString).data;
  }

  assert_equals(expectedContent, pastetext)
}

//Create a constructor for the builtin transferable class
const nsTransferable = Components.Constructor("@mozilla.org/widget/transferable;1", "nsITransferable");

//Create a wrapper to construct a nsITransferable instance and set its source to the given window, when necessary
function Transferable(source) {
    var res = nsTransferable();
    if ('init' in res) {
        // When passed a Window object, find a suitable provacy context for it.
        if (source instanceof Ci.nsIDOMWindow)
            // Note: in Gecko versions >16, you can import the PrivateBrowsingUtils.jsm module
            // and use PrivateBrowsingUtils.privacyContextFromWindow(sourceWindow) instead
            source = source.QueryInterface(Ci.nsIInterfaceRequestor)
                           .getInterface(Ci.nsIWebNavigation);

        res.init(source);
    }
    return res;
}