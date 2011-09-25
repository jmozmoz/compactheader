#! /usr/bin/env perl

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

use strict;
use warnings;
use File::Copy;
use POSIX;
use Cwd;

my $file = 'testapps.csv';
my $xpiversion = `grep 'version>' ../install.rdf | sed -e 's/.*version>\\(.*\\)<\\/em.*/\\1/'`;
chomp($xpiversion);
my $xpi = "../../../AMO/CompactHeader-${xpiversion}.xpi";
print "xpi: $xpi\n";

my $ftpdir = "ftp";

my ($ostype,$hosttype,$version,$ftppath,$app,$tests,$lightning,$checksums);
my ($unpack, $unpackargs, $unpacktargetargs, $appbin, $virtualpython);
my ($sysname, $nodename, $release, $osversion, $machine) = POSIX::uname();

open (F, $file) || die ("Could not open $file!");

mkdir "$ftpdir";

if ($^O eq "msys") {
  $unpack = "unzip";
  $unpackargs = "-qo";
  $unpacktargetargs = "-d";
  $appbin = "thunderbird.exe";
  $virtualpython = "../mozmill-virtualenv/Scripts/python";
}
elsif ($^O eq "linux") {
  $unpack = "tar";
  $unpackargs = "xjf";
  $unpacktargetargs = "-C";
  $appbin = "thunderbird";
  $virtualpython = "../mozmill-virtualenv/bin/python";
}

while (my $line = <F>)
{
  ($ostype,$hosttype,$ftppath,$app,$tests,$checksums, $lightning) =
    parse_csv($line);
  next if (not defined($ostype));

  my $dispMUA = "https://addons.mozilla.org/thunderbird/downloads/latest/562/addon-562-latest.xpi";
#  print "$ostype\t$hosttype\t$ftppath\t$app\t$tests\n";

#  next if ($version lt "9.0");

  if (($ostype eq $^O)
      && ($hosttype eq $machine)
      ) {

    # Download checksums file to determine version of Thunderbird, because
    # we use a link to latest release/beta/earlybird/trunk build and do not
    # know the version!
    #    wget -r -l1 --no-parent --follow-ftp -A .checksums  '' -nd
    my @files = glob("$ftpdir/thunderbird*$checksums");
    foreach my $file (@files) {
      unlink($file);
    }
    `wget -r -l1 --no-parent --follow-ftp -A$checksums $ftppath -nd -P $ftpdir 2>&1`;
    @files = glob("$ftpdir/thunderbird*$checksums");

    my $file = $files[0];

    $file =~ /thunderbird-(.*)$checksums/;
    $version = $1;

    # $ftppath =~ s/_VER_/${version}/g;
    $app =~ s/_VER_/${version}/g;
    $tests =~ s/_VER_/${version}/g;

    print "$ostype\t$hosttype\t$version\t$ftppath\t$app\t$tests\n";

    my $testdir = "test-$version";

    mkdir "$testdir";
    system "wget", "-q", "-P", "$ftpdir/$ostype-$hosttype-$version", "-N", "$ftppath/$app";
    system "wget", "-q", "-P", "$ftpdir/$ostype-$hosttype-$version", "-N", "$ftppath/$tests";
    system "wget", "-q", "-P", "$ftpdir/$ostype-$hosttype-$version", "-N", "$lightning";
    system "wget", "-q", "-P", "$ftpdir/$ostype-$hosttype-$version", "-N", "$dispMUA";

    my @dispMUAfiles = glob("$ftpdir/$ostype-$hosttype-$version/display_*");
    my $dispMUAfile = $dispMUAfiles[-1];

    system $unpack, $unpackargs, "$ftpdir//$ostype-$hosttype-$version/$app", $unpacktargetargs, $testdir;
    system "unzip", "-q", "-o", "$ftpdir//$ostype-$hosttype-$version/$tests", "-d", $testdir, "-x", "*mochitest*", "*xpcshell*";

    my $currentdir = getcwd;

    # "Link" the add-on tests into the mozmill directory
    if ($^O eq "msys") {
      # Do not delete the test-xxx directory! Otherwise not only the link to
      # the compactheader directory will be removed but also all files inside
      # it (i.e. in the source directory).
      `junction -d $testdir/mozmill/compactheader`;
      `junction $testdir/mozmill/compactheader compactheader`;
    }
    else {
      system "ln", "-sfn", qq[$currentdir/compactheader], qq[$testdir/mozmill/compactheader];
    }

    # copy drag'n'drop helpers to shared-modules until they are added to thunderbird source
    my @shared_files = glob("shared-modules/*");
    foreach my $file (@shared_files) {
      if (! -e "$testdir/mozmill/shared-modules/$file") {
        copy("$file","$testdir/mozmill/shared-modules");
      }
    }

    chdir "$testdir/mozmill";
    #system "pwd";

    my $log;
    my $python;

    if ($version ge "9.0") {
      `python resources/installmozmill.py ../mozmill-virtualenv`;
      $python = "$virtualpython";
    }
    else {
      $python = "python"
    }

    my @compatibility_apps = (
      "../../ftp//$ostype-$hosttype-$version/lightning.xpi",
      "../../$dispMUAfile"
    );
    my $comp_apps = join(",", @compatibility_apps);
#    print "$python runtest.py --binary=../thunderbird/$appbin -a $xpi -t compactheader 2>&1\n";
    $log = $log . `$python runtest.py --binary=../thunderbird/$appbin -a $xpi -t compactheader 2>&1`;
    $log = $log . `$python runtest.py --binary=../thunderbird/$appbin -a $xpi,$comp_apps -t compactheader/test-compactheader-toolbar.js 2>&1`;
    $log = $log . `$python runtest.py --binary=../thunderbird/$appbin -a $xpi,$comp_apps -t compactheader/test-compactheader-preferences.js 2>&1`;

    chdir "$currentdir";
    my @timeData = localtime(time);
    my $datestr = sprintf "%04d%02d%02d%02d%02d", 1900+$timeData[5],
      1+$timeData[4], $timeData[3], $timeData[2], $timeData[1];
    open (LOG, ">log-$version-$ostype-$hosttype-$datestr.txt");
    print LOG "$log";
    close(LOG);

    print "Test failures:\n";
    my @logs = split(/\n/, $log);
    foreach my $line (@logs) {
      if ($line =~ /(UNEXPECTED|^  )/) {
        print "$line\n";
      }
    }
    print "\n\n";
  }
}

close (F);

sub parse_csv {
  my $text = shift;
  my @new = ();
  push (@new, $+) while $text =~ m{
          "([^\"\\]*(?:\\.[^\"\\]*)*)",?
          | ([^,]+),?
          | ,
      }gx;
  push (@new, undef) if substr($text, -1, 1) eq ",";
  return @new;
}
