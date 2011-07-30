#! /bin/bash

if [ $OSTYPE == msys ] ; then
  export FTP_DIR=https://ftp.mozilla.org/pub/mozilla.org/thunderbird/nightly/5.0-candidates/build1/unsigned/win32/en-US/
  export APP=thunderbird-5.0.zip
  export TESTS=thunderbird-5.0.tests.zip
  export XPI=../../../AMO/CompactHeader-1.4.2beta3.xpi
  export TESTDIR=test-5.0
  export UNPACK="unzip"
  export UNPACKARGS="-o"
  export UNPACKTARGETOPT="-d"
  export APPBIN="thunderbird.exe"
elif [[ $OSTYPE == *linux* ]] ; then 
#  export FTP_DIR=https://ftp.mozilla.org/pub/mozilla.org/thunderbird/nightly/5.0-candidates/build1/linux-i686/en-US/
  export FTP_DIR=https://ftp.mozilla.org/pub/mozilla.org/thunderbird/nightly/5.0-candidates/build1/linux-x86_64/en-US/
  export APP=thunderbird-5.0.tar.bz2
  export TESTS=thunderbird-5.0.tests.zip
  export XPI=../../../AMO/CompactHeader-1.4.2beta3.xpi
  export TESTDIR=test-5.0
  export UNPACK="tar"
  export UNPACKARGS="xjvf"
  export UNPACKTARGETOPT="-C"
  export APPBIN="thunderbird"
else 
  echo "OS not supported"
  return 1;
fi


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
cp -v shared-modules/test-mouse-event-helpers.js $TESTDIR/mozmill/shared-modules

cd $TESTDIR/mozmill

# run all tests
python runtest.py --binary=../thunderbird/$APPBIN  -a $XPI -l log -t compactheader
