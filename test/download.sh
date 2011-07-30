#! /bin/bash

export FTP_DIR=https://ftp.mozilla.org/pub/mozilla.org/thunderbird/nightly/5.0-candidates/build1/unsigned/win32/en-US/
export APP=thunderbird-5.0.zip
export TESTS=thunderbird-5.0.tests.zip
export XPI=../../../AMO/CompactHeader-1.4.2beta3.xpi

wget -P ftp -N $FTP_DIR/$APP
wget -P ftp -N $FTP_DIR/$TESTS

export TESTDIR=test-5.0
mkdir -p $TESTDIR

unzip -o ftp/$APP -d $TESTDIR
unzip -o ftp/$TESTS -d $TESTDIR -x "*mochitest*" "*xpcshell*"

if [ $OSTYPE="msys" ] ; then
  junction -d $TESTDIR/mozmill/compactheader
  junction $TESTDIR/mozmill/compactheader compactheader
else
  ln -sfn compactheader $TESTDIR/mozmill/compactheader
fi

# copy drag'n'drop helpers to shared-modules until they are added to thunderbird source
cp -v shared-modules/test-mouse-event-helpers.js $TESTDIR/mozmill/shared-modules

cd $TESTDIR/mozmill

# run all tests
python runtest.py --binary=../thunderbird/thunderbird.exe  -a $XPI -l log -t compactheader
