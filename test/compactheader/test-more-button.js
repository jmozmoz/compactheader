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

  folder1 = create_folder("testMoreButton");

  let msg = create_message({cc: msgGen.makeNamesAndAddresses(10),
    to: msgGen.makeNamesAndAddresses(10)
  });
  add_message_to_folder(folder1, msg);

  let msg2 = create_message({cc: msgGen.makeNamesAndAddresses(10),
    to: msgGen.makeNamesAndAddresses(10)
  });
  add_message_to_folder(folder1, msg2);

  const MORE_PREF = "mailnews.headers.show_n_lines_before_more";
  Services.prefs.clearUserPref(MORE_PREF);
}

/* click the more button in compact view should change to expanded
 * header view
 */
function test_click_more(){
  select_message_in_folder(folder1, 1, mc);
  select_message_in_folder(folder1, 0, mc);
  open_preferences_dialog(mc, set_preferences_twoline);
  mc.sleep(10);
  collapse_and_assert_header(mc);

  // Click the "more" button.
  let L2Box = mc.e("CompactHeader_collapsed2LtoCcBccBox");
  let moreIndicator = mc.window.document.getAnonymousElementByAttribute(
    L2Box, "anonid", "more");
  moreIndicator = new elementslib.Elem(moreIndicator);
  assert_not_equals(null, moreIndicator);
  assert_true(isVisible(moreIndicator))
  if (moreIndicator) {
    mc.click(moreIndicator);
  }
  assert_expanded(mc);

  let expandedToBox = mc.e("expandedtoBox");
  let expandedCCBox = mc.e("expandedccBox");
  let expandedBCCBox = mc.e("expandedbccBox");
  let eTOmoreIndicator = mc.window.document.getAnonymousElementByAttribute(
      expandedToBox, "anonid", "more");
  let eCCmoreIndicator = mc.window.document.getAnonymousElementByAttribute(
      expandedCCBox, "anonid", "more");
  let eBCCmoreIndicator = mc.window.document.getAnonymousElementByAttribute(
      expandedBCCBox, "anonid", "more");

  assert_equals(eTOmoreIndicator.getAttribute("collapsed"), "true");
  assert_equals(eCCmoreIndicator.getAttribute("collapsed"), "true");
  assert_equals(eBCCmoreIndicator.getAttribute("collapsed"), "true");
}

/* all to and cc addresses should show up in the compact header view more
 * button tooltip
 */
function test_more_tooltip(){
  select_message_in_folder(folder1, 0, mc);
  let msg = select_message_in_folder(folder1, 1, mc);
  open_preferences_dialog(mc, set_preferences_twoline);
  mc.sleep(10);
  collapse_and_assert_header(mc);

  // Click the "more" button.
  let moreIndicator = mc.eid("CompactHeader_collapsed2LtoCcBccBox");
  moreIndicator = mc.window.document.getAnonymousElementByAttribute(
                    moreIndicator.node, "anonid", "more");

  let tooltiptext = moreIndicator.getAttribute("tooltiptext");

  let headerParser = Cc["@mozilla.org/messenger/headerparser;1"]
                        .getService(Ci.nsIMsgHeaderParser);

  // check that all cc addresses are in more buttons tooltip
  let addresses = {};
  let fullNames = {};
  let names = {};
  let numAddresses = headerParser.parseHeadersWithArray(
    msg.ccList, addresses, names, fullNames);
  for (let i = 0; i < numAddresses; i++)
  {
    assert_true(tooltiptext.indexOf(fullNames.value[i]) != -1, fullNames.value[i]);
  }

  // check that all to addresses are in more buttons tooltip
  addresses = {};
  fullNames = {};
  names = {};
  numAddresses = headerParser.parseHeadersWithArray(
    msg.recipients, addresses, names, fullNames);

  for (let i = 0; i < numAddresses; i++)
  {
    assert_true(tooltiptext.indexOf(fullNames.value[i]) != -1, fullNames.value[i]);
  }
}

/* check if more button shows correct number of missing addresses
 */
function test_more_number_indicator(){
  select_message_in_folder(folder1, 0, mc);
  let msg = select_message_in_folder(folder1, 1, mc);
  open_preferences_dialog(mc, set_preferences_twoline);
  mc.sleep(10);
  collapse_and_assert_header(mc);

  let headerParser = Cc["@mozilla.org/messenger/headerparser;1"]
                       .getService(Ci.nsIMsgHeaderParser);

  // check for more indicator number of collapsed header view
  let addresses = {};
  let fullNames = {};
  let names = {};
  let numAddressesCC = headerParser.parseHeadersWithArray(
    msg.ccList, addresses, names, fullNames);
  let numAddressesTo = headerParser.parseHeadersWithArray(
      msg.recipients, addresses, names, fullNames);

  let toCcBccDescription = mc.a('CompactHeader_collapsed2LtoCcBccBox', {class: "headerValue"});
  let addrs = toCcBccDescription.getElementsByTagName('mail-emailaddress');
  let firstToCCBccAddrNum = 0;
  for (let i=0; i<addrs.length; i++) {
    if (isVisible(addrs[i])) {
      firstToCCBccAddrNum += 1;
    }
  }

  let hiddenAddresses = numAddressesCC + numAddressesTo - firstToCCBccAddrNum;

  let moreIndicator = mc.eid("CompactHeader_collapsed2LtoCcBccBox");
  moreIndicator = mc.window.document.getAnonymousElementByAttribute(
                     moreIndicator.node, "anonid", "more");
  let moreText = moreIndicator.getAttribute("value");
  let moreSplit = moreText.split(" ");
  let moreNumber = parseInt(moreSplit[0])

  assert_not_equals(NaN, moreNumber);
  assert_equals(hiddenAddresses, moreNumber);

  // check for more indicator number of expanded header view
  expand_and_assert_header(mc);

  let ccDescription = mc.a('expandedccBox', {class: "headerValue"});
  addrs = ccDescription.getElementsByTagName('mail-emailaddress');
  let firstCCAddrNum = 0;
  for (let i = 0; i<addrs.length; i++) {
    if (isVisible(addrs[i])) {
      firstCCAddrNum += 1;
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

  let hiddenAddressesCC = numAddressesCC - firstCCAddrNum;
  let hiddenAddressesTo = numAddressesTo - firstToAddrNum;

  let expandedToBox = mc.e("expandedtoBox");
  let expandedCCBox = mc.e("expandedccBox");
  let eTOmoreIndicator = mc.window.document.getAnonymousElementByAttribute(
      expandedToBox, "anonid", "more");
  let eCCmoreIndicator = mc.window.document.getAnonymousElementByAttribute(
      expandedCCBox, "anonid", "more");
  let moreTextTo = eTOmoreIndicator.getAttribute("value");
  let moreTextCC = eCCmoreIndicator.getAttribute("value");

  let moreSplitTo = moreTextTo.split(" ");
  let moreNumberTo = parseInt(moreSplitTo[0])

  assert_not_equals(NaN, moreNumberTo);
  assert_equals(hiddenAddressesTo, moreNumberTo)

  let moreSplitCC = moreTextCC.split(" ");
  let moreNumberCC = parseInt(moreSplitCC[0])

  assert_not_equals(NaN, moreNumberCC);
  assert_equals(hiddenAddressesCC, moreNumberCC)
}

