# CompactHeader [![Build Status](https://travis-ci.org/jmozmoz/compactheader.svg?branch=master)](https://travis-ci.org/jmozmoz/compactheader) [![Build status](https://ci.appveyor.com/api/projects/status/mmvvkm83lajuunms/branch/master?svg=true)](https://ci.appveyor.com/project/jmozmoz/compactheader/branch/master)


Thunderbird extension to add a symbol in the header plane to switch between
compact and expanded view. Options to switch between one or two lines compact
view, which buttons should be displayed in header pane.

### Description

Thunderbird does not anymore have the ability to reduce the display size of
header pane to one line (as in Thunderbird 2.0). This add-on adds a symbol to
compact and expand the message header plane. The compact header view mode can
be set to either one or two lines.

A customization dialog can be opened for the toolbar in the header pane
(right mouse button context menu) to change the displayed buttons and their
style.

The shortcut "SHIFT+h" can be used to toggle between expanded and compact
header view.

This add-on integrates the functionality of ["RSS Linkify Subject" by
Alex Dedul](https://addons.mozilla.org/en-US/thunderbird/addon/1704).

There is also an option to display only the email addresses in the compact
header view. Another option enables darkening the message header,
if the message pane has focus.

If you want to use the latest version, look for it at the
[beta channel at AMO](https://addons.mozilla.org/thunderbird/addon/compactheader/versions/beta).


### Known bugs

There are several bug reports about a disappearing header pane in the compact
header view mode. I could reproduce it if the TB Header Tools Extension is
installed at the same time, see (http://forums.mozillazine.org/viewtopic.php?p=8543415#p8543415)

### Installing

Downloading the installation file from [addons.mozilla.org](https://addons.mozilla.org/thunderbird/addon/compactheader/)
and then install CompactHeader within the add-on manager of Thunderbird.

### Support

Please send support questions to the [support threat at mozillazine](http://forums.mozillazine.org/viewtopic.php?f=29&t=1405155).

### Build the xpi

Download xmltask.jar from https://sourceforge.net/projects/xmltask/ and add
the jar to CLASSPATH. Then:

```
ant buildAMO
```

## Running the tests

In the directory [test](https://github.com/jmozmoz/compactheader/tree/master/test) a Python script is included which tests the add-on
with different Thunderbird versions (see also [.travis.yml](https://github.com/jmozmoz/compactheader/blob/master/.travis.yml) and
[appveyor.yml](https://github.com/jmozmoz/compactheader/blob/master/appveyor.yml)
using the [Thunderbird infrastructure for mozmill](https://developer.mozilla.org/en-US/docs/Mozilla/Thunderbird/Thunderbird_MozMill_Testing/Running_Thunderbird_MozMill_tests_from_packaged_tests).

```
python executeTests.py
```

Available options:

`--version` Version of Thunderbird to use for tests (currently supported ESR and nightly)

`--nodownload` Do not download the latest version of Thunderbird but use the one stored from the last test

`--downloadonly` Only download the latest version of Thunderbird but do not execute the tests

## Versioning

We use [mozilla Toolkit version format](https://developer.mozilla.org/en-US/docs/Mozilla/Toolkit_version_format)
for versioning. For the versions available, see the [tags on this repository](https://github.com/jmozmoz/compactheader/tags),
[versions available from AMO](https://addons.mozilla.org/thunderbird/addon/compactheader/versions/) and
the [first message in the support threat](http://forums.mozillazine.org/viewtopic.php?p=7170965&sid=3f87f1bc1538d02ec6b81580f0e71fe1#p7170965).

## Authors

* **Joachim Herb** - [jmozmoz](https://github.com/jmozmoz)

See the list of contributors and tranlators in [install.rdf](https://github.com/jmozmoz/compactheader/blob/master/install.rdf) who participated in this project.

## License

This project is licensed under [MPL 1.1](http://www.mozilla.org/MPL/)/GPL 2.0/LGPL 2.1
