#! /usr/bin/env perl

use strict;
use warnings;
use File::Copy;
use POSIX;
use Cwd;

my $file = 'testapps.csv';
my $xpi = "../../../AMO/CompactHeader-1.4.2beta5.xpi";
my $ftpdir = "ftp";

my ($ostype,$hosttype,$version,$ftppath,$app,$tests,$lightning);
my ($unpack, $unpackargs, $unpacktargetargs, $appbin);
my ($sysname, $nodename, $release, $osversion, $machine) = POSIX::uname();

open (F, $file) || die ("Could not open $file!");

mkdir "$ftpdir";

if ($^O eq "msys") {
  $unpack ="unzip";
  $unpackargs="-o";
  $unpacktargetargs="-d";
  $appbin="thunderbird.exe";
}
elsif ($^O eq "linux") {
  $unpack ="tar";
  $unpackargs="xjvf";
  $unpacktargetargs="-C";
  $appbin="thunderbird";
}


while (my $line = <F>)
{
  ($ostype,$hosttype,$version,$ftppath,$app,$tests,$lightning) =
    parse_csv($line);

  next if (not defined($ostype));
  print "$ostype\t$hosttype\t$version\t$ftppath\t$app\t$tests\n";

  if (($ostype eq $^O)
      && ($hosttype eq $machine)
      ) {
    print "$ostype\t$hosttype\t$version\t$ftppath\t$app\t$tests\n";

    my $testdir = "test-$version";

    mkdir "$testdir";
    system "wget", "-P", "$ftpdir/$ostype-$hosttype-$version", "-N", "$ftppath/$app";
    system "wget", "-P", "$ftpdir/$ostype-$hosttype-$version", "-N", "$ftppath/$tests";
    system "wget", "-P", "$ftpdir/$ostype-$hosttype-$version", "-N", "$lightning";


    system $unpack, $unpackargs, "$ftpdir//$ostype-$hosttype-$version/$app", $unpacktargetargs, $testdir;
    system "unzip", "-o", "$ftpdir//$ostype-$hosttype-$version/$tests", "-d", $testdir, "-x", "*mochitest*", "*xpcshell*";

    my $currentdir = getcwd;

    if ($^O eq "msys") {
      system "junction", "-d", "$testdir/mozmill/compactheader";
      system "junction", "$testdir/mozmill/compactheader", "compactheader";
    }
    else {
      system "ln", "-sfn", qq[$currentdir/compactheader], qq[$testdir/mozmill/compactheader];
    }

    # copy drag'n'drop helpers to shared-modules until they are added to thunderbird source
    my @shared_files = glob("shared-modules/*");
    foreach (@shared_files) {
      copy("$_","$testdir/mozmill/shared-modules");
    }

    chdir "$testdir/mozmill";
    system "pwd";

    my $log;
#   $log = `python runtest.py --binary=../thunderbird/$appbin --showall --show-errors -a $xpi -t compactheader 2>&1`;
    $log = $log . `python runtest.py --binary=../thunderbird/$appbin --showall --show-errors -a $xpi -t compactheader/test-compactheader-toolbar.js 2>&1`;
    $log = $log . `python runtest.py --binary=../thunderbird/$appbin --showall --show-errors -a $xpi,../../ftp//$ostype-$hosttype-$version/lightning.xpi -t compactheader/test-compactheader-preferences.js 2>&1`;

    chdir "$currentdir";
    my @timeData = localtime(time);
    my $datestr = sprintf "%04d%02d%02d%02d%02d", 1900+$timeData[5],
      1+$timeData[4], $timeData[3], $timeData[2], $timeData[1];
    open (LOG, ">log-$version-$ostype-$hosttype-$datestr.txt");
    print LOG "$log";
    close(LOG);
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
