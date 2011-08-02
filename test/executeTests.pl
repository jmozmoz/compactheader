#! perl -w

use strict;
use warnings;
use File::Copy;

my $file = 'testapps.csv';
my $xpi = "../../../AMO/CompactHeader-1.4.2beta3.xpi";
my $ftpdir = "ftp";

my ($ostype,$hosttype,$version,$ftppath,$app,$tests);
my ($unpack, $unpackargs, $unpacktargetargs, $appbin);

open (F, $file) || die ("Could not open $file!");

mkdir "$ftpdir";

if ($ENV{"OSTYPE"} eq "msys") {
  $unpack ="unzip";
  $unpackargs="-o";
  $unpacktargetargs="-d";
  $appbin="thunderbird.exe";
}
elsif ($ENV{"OSTYPE"} eq "linux-gnu") {
  $unpack ="unzip";
  $unpackargs="-o";
  $unpacktargetargs="-d";
  $appbin="thunderbird.exe";
}


while (my $line = <F>)
{
  ($ostype,$hosttype,$version,$ftppath,$app,$tests) =
    parse_csv($line);
  #print "$ostype\t$hosttype\t$version\t$ftppath\t$app\t$tests\n"

  if (($ostype eq $ENV{'OSTYPE'})
      && ($hosttype eq $ENV{'HOSTTYPE'})
      ) {
    print "$ostype\t$hosttype\t$version\t$ftppath\t$app\t$tests\n";

    my $testdir = "test-$version";

    mkdir "$testdir";
    system "wget", "-P", "$ftpdir", "-N", "$ftppath/$app";
    system "wget", "-P", "$ftpdir", "-N", "$ftppath/$tests";

    system $unpack, $unpackargs, "$ftpdir/$app", $unpacktargetargs, $testdir;
    system "unzip", "-o", "$ftpdir/$tests", "-d", $testdir, "-x", "*mochitest*", "*xpcshell*";

    if ($ENV{"OSTYPE"} eq "msys") {
      system "junction", "-d", "$testdir/mozmill/compactheader";
      system "junction", "$testdir/mozmill/compactheader", "compactheader";
    }
    else {
      system "ln", "-sfn", qq[$ENV{"PWD"}/compactheader $testdir/mozmill/compactheader];
    }

    # copy drag'n'drop helpers to shared-modules until they are added to thunderbird source
    my @shared_files = glob("shared-modules/*");
    foreach (@shared_files) {
      copy("$_","$testdir/mozmill/shared-modules");
    }

    my $currentdir = $ENV{"PWD"};

    chdir "$testdir/mozmill";
    system "pwd";

    my $log = `python runtest.py --binary=../thunderbird/$appbin --showall --show-errors -a $xpi -t compactheader 2>&1`;

    chdir "$currentdir";
    open (LOG, ">log-$version-$ostype-$hosttype.txt");
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