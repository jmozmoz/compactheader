#! /bin/bash

# ***** BEGIN LICENSE BLOCK *****
#   Version: MPL 1.1/GPL 2.0/LGPL 2.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Original Code is Thunderbird Mail Client.
#
# The Initial Developer of the Original Code is
# the Mozilla Foundation.
# Portions created by the Initial Developer are Copyright (C) 2009
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#   Joachim Herb <Joachim.Herb@gmx.de>
#
# Alternatively, the contents of this file may be used under the terms of
# either the GNU General Public License Version 2 or later (the "GPL"), or
# the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
# in which case the provisions of the GPL or the LGPL are applicable instead
# of those above. If you wish to allow use of your version of this file only
# under the terms of either the GPL or the LGPL, and not to allow others to
# use your version of this file under the terms of the MPL, indicate your
# decision by deleting the provisions above and replace them with the notice
# and other provisions required by the GPL or the LGPL. If you do not delete
# the provisions above, a recipient may use your version of this file under
# the terms of any one of the MPL, the GPL or the LGPL.
#
# ***** END LICENSE BLOCK ***** */

if [ $OSTYPE == msys ] ; then
  export FTP_DIR=https://ftp.mozilla.org/pub/mozilla.org/thunderbird/nightly/5.0-candidates/build1/unsigned/win32/en-US/
  export APP=thunderbird-5.0.zip
  export UNPACK="unzip"
  export UNPACKARGS="-o"
  export UNPACKTARGETOPT="-d"
  export APPBIN="thunderbird.exe"
elif [[ $OSTYPE == *linux* ]] ; then
#  export FTP_DIR=https://ftp.mozilla.org/pub/mozilla.org/thunderbird/nightly/5.0-candidates/build1/linux-i686/en-US/
  export FTP_DIR=https://ftp.mozilla.org/pub/mozilla.org/thunderbird/nightly/5.0-candidates/build1/linux-x86_64/en-US/
  export APP=thunderbird-5.0.tar.bz2
  export UNPACK="tar"
  export UNPACKARGS="xjvf"
  export UNPACKTARGETOPT="-C"
  export APPBIN="thunderbird"
else
  echo "OS not supported"
  return 1;
fi

VERSION=`grep 'version>' ../install.rdf | sed -e 's/.*version>\(.*\)<\/em.*/\1/'`

export TESTS=thunderbird-5.0.tests.zip
export XPI=../../../AMO/CompactHeader-$VERSION.xpi
export TESTDIR=test-5.0

wget -P ftp -N $FTP_DIR/$APP
wget -P ftp -N $FTP_DIR/$TESTS

mkdir -p $TESTDIR

$UNPACK $UNPACKARGS ftp/$APP $UNPACKTARGETOPT $TESTDIR
unzip -o ftp/$TESTS -d $TESTDIR -x "*mochitest*" "*xpcshell*"

if [ $OSTYPE == msys ] ; then
  junction -d $TESTDIR/mozmill/compactheader
  junction $TESTDIR/mozmill/compactheader compactheader
else
  ln -sfn `pwd`/compactheader $TESTDIR/mozmill/compactheader
fi

# copy drag'n'drop helpers to shared-modules until they are added to thunderbird source
cp -v shared-modules/* $TESTDIR/mozmill/shared-modules

cd $TESTDIR/mozmill

# run all tests
python runtest.py --binary=../thunderbird/$APPBIN  -a $XPI -l log -t compactheader
