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
use Getopt::Long;
use File::Path qw(make_path);
use XML::Simple;

my $TMPDIR = "/tmp";

my $file = 'testapps.csv';
my $xml = new XML::Simple;
my $versionXML = $xml->XMLin("../install.rdf");
my $xpiversion = $versionXML->{'RDF:Description'}->{'em:version'};

chomp($xpiversion);
my $xpi = getcwd . "/../AMO/CompactHeader-${xpiversion}.xpi";

print "xpi: $xpi\n";

my $ftpdir = "${TMPDIR}/compactheader/ftp";
make_path "$ftpdir";
copy($xpi, $ftpdir);
$xpi = "../../ftp/CompactHeader-${xpiversion}.xpi";
print "xpi: $xpi\n";

#print join("\n", <${ftpdir}/*>), "\n";

my ($ostype,$hosttype,$version,$ftppath,$app,$tests,$lightning,$checksum);
my ($unpack, $unpackargs, $unpacktargetargs, $appbin, $virtualpython);
my ($sysname, $nodename, $release, $osversion, $machine) = POSIX::uname();

my ($testversion);
my ($downloadonly);
my ($nodownload);

GetOptions('version:s' => \$testversion,
           'downloadonly' => \$downloadonly,
           'nodownload' => \$nodownload);

open (F, $file) || die ("Could not open $file!");


if ($^O eq "MSWin32") {
  $unpack = "unzip";
  $unpackargs = "-qo";
  $unpacktargetargs = "-d";
  $appbin = "thunderbird.exe";
  $virtualpython = "..\\mozmill-virtualenv\\Scripts\\python";
}
elsif ($^O eq "linux") {
  $unpack = "tar";
  $unpackargs = "xjf";
  $unpacktargetargs = "-C";
  $appbin = "thunderbird";
  $virtualpython = "../mozmill-virtualenv/bin/python";
}

my @children;
my @files;
my $dispMUAfile;
#my $dispMUA = "https://addons.mozilla.org/thunderbird/downloads/latest/562/addon-562-latest.xpi";
my $dispMUA = "https://addons.mozilla.org/thunderbird/downloads/latest/display-mail-user-agent/platform:5/addon-562-latest.xpi";

my $mnenhyfile;
my $mnenhy = "https://addons.mozilla.org/thunderbird/downloads/latest/2516/addon-2516-latest.xpi";

my %testSpecs;


system "wget", "--no-check-certificate", "-q", "-P", "$ftpdir", "-N", "$dispMUA";

system "wget", "--no-check-certificate", "-q", "-P", "$ftpdir", "-N", "$mnenhy";

print "ostype: ${^O}, machine: ${machine}\n";

while (my $line = <F>)
{
  ($ostype,$hosttype,$ftppath,$app,$tests,$checksum, $lightning) =
    parse_csv($line);
  next if (not defined($ostype));

#  print "$ostype\t$hosttype\t$ftppath\t$app\t$tests\n";

  if (($ostype eq $^O)
      && ($hosttype eq $machine)
      ) {

    # Download checksums file to determine version of Thunderbird, because
    # we use a link to latest release/beta/earlybird/trunk build and do not
    # know the version!
    #    wget -r -l1 --no-parent --follow-ftp -A .checksums  '' -nd
    my @files = glob("$ftpdir/thunderbird*$checksum");
    foreach my $file (@files) {
      unlink($file);
    }
    #print "wget -r -l1 --no-parent --follow-ftp -A$checksum $ftppath -nd -P $ftpdir 2>&1\n";
    #print "wget -r -l1 --no-parent --follow-ftp -A$checksum $ftppath -nd -P \"$ftpdir\";\n";
    print "wget -r -l1 --no-parent --follow-ftp -A$checksum $ftppath -nd -P \"$ftpdir\" 2>&1";
    print "\n";

    `wget -r -l1 --no-check-certificate --no-parent --follow-ftp -A$checksum $ftppath/ -nd -P "$ftpdir" 2>&1`;
    @files = glob("$ftpdir/thunderbird*$checksum");

    my $file = $files[-1];

    $file =~ /thunderbird-(.*)$checksum/;
    $version = $1;

    print "************\n";
    print "found version: ", $version, "\n";
    print "************\n";

    next if (($testversion) && ($version ne $testversion));

    # $ftppath =~ s/_VER_/${version}/g;
    $app =~ s/_VER_/${version}/g;
    $tests =~ s/_VER_/${version}/g;

    # fork to run tests in parallel
    my $pid = fork();
    if ($pid) {
      # parent
#      print "pid: $pid\n";
      $testSpecs{$pid} = {
        version  => $version,
        appbin   => $appbin,
        tests    => $tests,
        ostype   => $ostype,
        hosttype => $hosttype,
      };
      push(@children, $pid);
    } elsif (not defined $pid) {
      die "couldn't fork: $!\n";
    } else {
      # child

      print "child: $ostype\t$hosttype\t$ftppath\t$app\t$tests\n";

      my $testdir = "${TMPDIR}/compactheader/test-$version";

      mkdir "$testdir";
      print "$ftpdir/$ostype-$hosttype-$version\n";
      print "$ftppath/$app\n";
      if (! $nodownload) {
	      system "wget", "--no-check-certificate", "-q", "-P", "$ftpdir/$ostype-$hosttype-$version", "-N", "$ftppath/$app";

	      print "$ftppath/$tests\n";
	      system "wget", "--no-check-certificate", "-q", "-P", "$ftpdir/$ostype-$hosttype-$version", "-N", "$ftppath/$tests";

	      print "$lightning\n";
	      system "wget", "--no-check-certificate", "-q", "-P", "$ftpdir/$ostype-$hosttype-$version", "-N", "$lightning";

	      system $unpack, $unpackargs, "$ftpdir//$ostype-$hosttype-$version/$app", $unpacktargetargs, $testdir;
	      system "unzip", "-q", "-o", "$ftpdir//$ostype-$hosttype-$version/$tests", "-d", $testdir, "-x", "*mochitest*", "*xpcshell*", "*reftest*", "*jit-test*", "*bin*";
      }

      my $currentdir = getcwd;

      # "Link" the add-on tests into the mozmill directory
      if (($^O eq "msys") or ($^O eq "MSWin32")) {
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

      exit(0);
    } # child
  } # correct OS/architecture
} # different versions

close (F);

my $log_lines = 0;

foreach my $pid (@children) {
  waitpid($pid, 0);

  if ($downloadonly) {
    exit 0;
  }
  my $currentdir = getcwd;

  $version  = $testSpecs{$pid}{version};
  $appbin   = $testSpecs{$pid}{appbin};
  $tests    = $testSpecs{$pid}{tests};
  $ostype   = $testSpecs{$pid}{ostype};
  $hosttype = $testSpecs{$pid}{hosttype};

  print "$pid\t$ostype\t$hosttype\t$version\t$appbin\t$tests\n";

  my $testdir = "${TMPDIR}/compactheader/test-$version";
  chdir "$testdir/mozmill";
  #system "pwd";

  my $log;
  my $python;

  no warnings;
  if (int($version) >= 9) {
    use warnings;
    print "\n";
    print getcwd;
    print "... installing mozmill\n";
    rmdir('../mozmill-virtualenv');
    rmdir('../mozbase');
    `python resources/installmozmill.py ../mozmill-virtualenv ../mozbase/`;
    $python = "$virtualpython";
  }
  else {
    $python = "python"
  }

  my @dispMUAfiles = glob("../../ftp/display_*");
  $dispMUAfile = $dispMUAfiles[-1];
  my @mnenhyfiles = glob("$ftpdir/mnenhy-*");
  $mnenhyfile = $mnenhyfiles[-1];

  # We have out own tests for this, so delete it
  unlink("message-header/test-header-toolbar.js");


  # disable test, because the default is now icons only, so this test does
  # not work anymore
  print `sed -i -e "s/test_toolbar_collapse_and_expand/notest_toolbar_collapse_and_expand/" ${testdir}/mozmill/message-header/test-message-header.js`;

  my @compatibility_apps = (
#     glob("../../ftp/$ostype-$hosttype-$version/addon-2313*.xpi"), # lightning
#     glob("../../ftp/$ostype-$hosttype-$version/lightning*.xpi"),
    "$dispMUAfile",
    glob("../../ftp/addon-562*.xpi"), # display mail user agent for AMO
    "$xpi"
#    "$mnenhyfile" # activate when mozmill can handle this addon:
  );

  @compatibility_apps = grep { $_ && !m/^\s+$/ } @compatibility_apps;

  my $comp_apps = join(" -a ", @compatibility_apps);
  print $comp_apps;
  print "\n";

#  print `pwd`;
#  print `ls $xpi`;
#  print `ls ${ftpdir}`;

  print "\n$python runtest.py --binary=../thunderbird/$appbin -a $xpi -t compactheader --testing-modules-dir ../modules 2>&1\n";
  $log = $log . `$python runtest.py --binary=../thunderbird/$appbin -a $xpi -t compactheader --testing-modules-dir ../modules 2>&1`;
#  print "\n$python runtest.py --binary=../thunderbird/$appbin -a $xpi -t message-header --testing-modules-dir ../modules 2>&1\n";
#  $log = $log . `$python runtest.py --binary=../thunderbird/$appbin -a $xpi -t message-header --testing-modules-dir ../modules 2>&1`;
#  print "\n$python runtest.py --binary=../thunderbird/$appbin -a $xpi -t folder-display --testing-modules-dir ../modules 2>&1\n";
#  $log = $log . `$python runtest.py --binary=../thunderbird/$appbin -a $xpi -t folder-display --testing-modules-dir ../modules 2>&1`;
#  print "\n$python runtest.py --binary=../thunderbird/$appbin -a $comp_apps -t compactheader/test-compactheader-toolbar.js --testing-modules-dir ../modules 2>&1\n";
#  $log = $log . `$python runtest.py --binary=../thunderbird/$appbin -a $comp_apps -t compactheader/test-compactheader-toolbar.js --testing-modules-dir ../modules 2>&1`;
#  print "\n$python runtest.py --binary=../thunderbird/$appbin -a $comp_apps -t compactheader/test-compactheader-preferences.js --testing-modules-dir ../modules 2>&1\n";
#  $log = $log . `$python runtest.py --binary=../thunderbird/$appbin -a $comp_apps -t compactheader/test-compactheader-preferences.js --testing-modules-dir ../modules 2>&1`;

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
      $log_lines = $log_lines + 1;
    }
  }
  print "\n\n";
}

my $number_of_tests = 5;

if ($log_lines != ((scalar @children) * $number_of_tests)) {
    print "some tests failed!\n";
    exit 1;
}


sub parse_csv {
  my $text = shift;
  my @new = ();
  $text =~ s/#.*//;
  push (@new, $+) while $text =~ m{
          "([^\"\\]*(?:\\.[^\"\\]*)*)",?
          | ([^,]+),?
          | ,
      }gx;
  push (@new, undef) if substr($text, -1, 1) eq ",";
  return @new;
}
