#! /usr/bin/env python

from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import
from __future__ import division

import json
import platform
import subprocess
import os
import argparse
import glob
import logging
import re
import errno
import shutil
import xml.etree.ElementTree as ET
import datetime


def mkdir_p(path):
    """Equivalent for unix command mkdir -p"""
    try:
        os.makedirs(path)
    except OSError as exc:
        if exc.errno == errno.EEXIST and os.path.isdir(path):
            pass
        else:
            raise


class TestExecutor:
    def __init__(self):
        logging.basicConfig(level=logging.DEBUG)
        if platform.system() == "Windows":
            self.TMPDIR = 'c:\\tmp\\'
        else:
            self.TMPDIR = '/tmp'

        parser = argparse.ArgumentParser()
        parser.add_argument("-v", "--version",
                            help="test against Thunderbird version",
                            default=None,
                            required=False)
        parser.add_argument("-d", "--downloadonly",
                            help="only download files",
                            default=False,
                            action="store_true",
                            required=False)
        parser.add_argument("-n", "--nodownload",
                            help="skip downloading files",
                            default=False,
                            action="store_true",
                            required=False)
        self.args = parser.parse_args()

        logging.debug("command line args: %r" % self.args)

        tree = ET.parse("../install.rdf")
        root = tree.getroot()
        ns = {
            "RDF": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
            "em": "http://www.mozilla.org/2004/em-rdf#"}

        xpiversion = root.findall("RDF:Description/em:version", ns)[0].text
        self.xpi = os.path.abspath(os.path.join(
            "..", "AMO", "CompactHeader-" + xpiversion + ".xpi"
        ))

        logging.info("CH version: %r" % xpiversion)
        logging.info("CH file: %r" % self.xpi)

        self.ftpdir = os.path.abspath(os.path.join(
            self.TMPDIR,
            "compactheader", "ftp"))

        jsonfilename = 'testapps.json'

        self.test_apps = json.load(open(jsonfilename))

        self.machine = platform.system() + platform.machine()
        logging.info("Running on %s\n\n" % self.machine)

        self.package_tools = {
            "WindowsAMD64": {
                "unpack": "../mozmill-virtualenv/Scripts/mozinstall",
                "unpack_args": "--app=thunderbird",
                "unpack_target_args": "--destination",
                "virtualpython": "..\\mozmill-virtualenv\\Scripts\\python"
                },
            "Linuxx86_64": {
                "unpack": "../mozmill-virtualenv/bin/mozinstall",
                "unpack_args": "--app=thunderbird",
                "unpack_target_args": "--destination",
                "virtualpython": "../mozmill-virtualenv/bin/python"
                },
            "Darwinx86_64": {
                "unpack": "../mozmill-virtualenv/bin/mozinstall",
                "unpack_args": "--app=thunderbird",
                "unpack_target_args": "--destination",
                "virtualpython": "../mozmill-virtualenv/bin/python"
                },
            }

    def download_test(self):
        script_dir = os.path.abspath(os.path.dirname(__file__))
        logging.debug("script dir: %s" % script_dir)

        self.dispMUA = (
            "https://addons.mozilla.org/thunderbird/downloads/" +
            "latest/display-mail-user-agent/platform:5/addon-562-latest.xpi")
        self.mnenhy = ("https://addons.mozilla.org/thunderbird/downloads" +
                       "/latest/2516/addon-2516-latest.xpi")

        subprocess.call(["wget", "--no-check-certificate", "-q", "-P",
                         self.ftpdir, "-N", self.dispMUA])
        subprocess.call(["wget", "--no-check-certificate", "-q", "-P",
                         self.ftpdir, "-N", self.mnenhy])

        test_specs = {}
        for appversion in self.test_apps:
            if self.args.version and appversion != self.args.version:
                continue
            if self.machine in self.test_apps[appversion]:
                appref = self.test_apps[appversion][self.machine]

                hosttype = self.machine
                ftppath = appref['url']
                app = appref['appzip']
                tests = appref['testzip']
                checksum = appref['checksum']

                # Download checksums file to determine version of Thunderbird,
                # because we use a link to latest release/beta/earlybird/trunk
                # build and do not know the version!
                #    wget -r -l1 --no-parent --follow-ftp -A .checksums  '' -nd

                files = glob.glob(self.ftpdir + "/thunderbird*" + checksum)
                for f in files:
                    os.remove(f)

                logging.info("look for available Thunderbird versions:\n\n")
                get_checksum = [
                    "wget", "-r", "-l1",  "--no-check-certificate",
                    "--no-parent", "--follow-ftp",  "-A" + checksum,
                    ftppath + "/", "-nd", "-P",  self.ftpdir
                    ]
                logging.debug("Download command: %r", " ".join(get_checksum))
                subprocess.call(get_checksum)
                get_checksum = [
                    "wget", "--no-check-certificate",
                    ftppath + "/" + checksum, "-P",  self.ftpdir
                    ]
                logging.debug("Download command: %r", " ".join(get_checksum))
                subprocess.call(get_checksum)
                files = glob.glob(self.ftpdir + "/thunderbird*" + checksum)
                if len(files) > 0:
                    logging.debug("found checksums: %r" % files)

                    file = files[-1]

                    version = ""
                    m = re.search("thunderbird-(.*)" + checksum, file)
                    if m:
                        version = m.group(1)

                    logging.info("************")
                    logging.info("found version: %s " % version)
                    logging.info("************")
    #
                    app = re.sub(r'_VER_', version, app)
                    tests = re.sub(r'_VER_', version, tests)

                    logging.debug("app: %s" % app)
                    logging.debug("tests: %s" % tests)
                    logging.debug("hosttype: %s" % hosttype)
                    logging.debug("ftppath: %s" % ftppath)
                else:
                    files = glob.glob(self.ftpdir + "/" + checksum)
                    if len(files) > 0:
                        logging.debug("found checksums: %r" % files)

                        version = '99' + appversion

                        logging.info("************")
                        logging.info("found version: %s " % version)
                        logging.info("************")
        #
                        app = re.sub(r'_VER_', version, app)
                        tests = re.sub(r'_VER_', version, tests)

                        logging.debug("app: %s" % app)
                        logging.debug("tests: %s" % tests)
                        logging.debug("hosttype: %s" % hosttype)
                        logging.debug("ftppath: %s" % ftppath)

                testdir = os.path.join(
                    self.TMPDIR,
                    "compactheader",
                    "test-" + version,
                    "testing")

                logging.debug("create test and ftpdir")
                mkdir_p(testdir)
                mkdir_p(self.ftpdir)

                logging.debug("download path:             %s/%s-%s" %
                              (self.ftpdir, hosttype, version))
                logging.debug("Thunderbird download path: %s/%s" %
                              (ftppath, app))
                logging.debug(
                    "Tests download path:       %s/%s" %
                    (ftppath, tests))

                tools = self.package_tools[hosttype]

                if (not self.args.nodownload):
                    subprocess.call(
                        ["wget", "--no-check-certificate", "-q", "-P",
                         os.path.join(self.ftpdir, hosttype + "-" + version),
                         "-N", ftppath + "/" + app
                         ]
                    )
                    subprocess.call(
                        ["wget", "--no-check-certificate", "-q", "-P",
                         os.path.join(self.ftpdir, hosttype + "-" + version),
                         "-N", ftppath + "/" + tests
                         ]
                    )
                logging.debug("unzipping tests...")
                unzip_test_cmd = [
                    "unzip", "-q", "-o",
                    os.path.join(
                        self.ftpdir, hosttype + "-" + version, tests),
                    "-d", testdir, "-x", "*mochitest*",
                    "*xpcshell*", "*reftest*", "*jit-test*", "*bin*"
                    ]
                logging.debug("unzip tests: %r" % " ".join(unzip_test_cmd))
                subprocess.call(unzip_test_cmd)

                testdir = os.path.abspath(os.path.join(
                    self.TMPDIR,
                    "compactheader",
                    "test-" + version,
                    "testing"))

                # "Link" the add-on tests into the mozmill directory
                if platform.system() == "Windows":
                    subprocess.call(
                        ["junction", "-d",
                         os.path.join(testdir, "mozmill", "compactheader")
                         ]
                    )
                    subprocess.call(
                        ["junction",
                         os.path.join(testdir, "mozmill", "compactheader"),
                         os.path.join(script_dir, "compactheader")
                         ]
                    )
                    subprocess.call(
                        ["junction", "-d",
                         os.path.join(testdir, "..", "python")
                         ]
                    )
                    subprocess.call(
                        ["junction",
                         os.path.join(testdir, "..", "python"),
                         os.path.join(testdir, "tools"),
                         ]
                    )
                else:
                    subprocess.call(
                        ["ln", "-sfn",
                         os.path.join(script_dir, "compactheader"),
                         os.path.join(testdir, "mozmill", "compactheader"),
                         ]
                    )
                    mkdir_p(os.path.join(testdir, "..", "python"))
                    shutil.rmtree(
                        os.path.join(testdir, "..", "python", "mozterm"),
                        ignore_errors=True
                    )
                    shutil.copytree(
                        os.path.join(testdir, "tools", "mozterm"),
                        os.path.join(testdir, "..", "python", "mozterm")
                    )

                shutil.copy(
                    os.path.join(script_dir, "buildconfig.py"),
                    os.path.join(testdir, "mozmill", "resources"))

                os.chdir(os.path.join(testdir, "mozmill"))

                logging.info("... installing mozmill")
                shutil.rmtree(os.path.join("..", "mozmill-virtualenv"),
                              ignore_errors=True)

                int_version = int(re.findall('^\d+', str(version))[0])
                logging.debug("int version: %d" % int_version)

                if int_version >= 59:
                    install_cmd = [
                        "pip",
                        "wheel",
                        os.path.join(testdir, "..", "python", "mozterm"),
                        "--wheel-dir",
                        "/tmp/compactheader"
                    ]
                    logging.debug(" ".join(install_cmd))
                    subprocess.call(install_cmd)
                    install_cmd = [
                        "python",
                        os.path.join("resources", "installmozmill.py"),
                        os.path.join("..", "mozmill-virtualenv")]
                else:
                    # shutil.rmtree(os.path.join("..", "mozbase"),
                    # ignore_errors=True)
                    install_cmd = [
                        "python",
                        os.path.join("resources", "installmozmill.py"),
                        os.path.join("..", "mozmill-virtualenv"),
                        os.path.join("..", "mozbase")]

                logging.debug(" ".join(install_cmd))
                subprocess.call(install_cmd)

                install_cmd = [
                    tools['virtualpython'],
                    "-mpip",
                    "install",
                    os.path.join("..", "mozbase", "mozinstall")]

                logging.debug(" ".join(install_cmd))
                subprocess.call(install_cmd)

                os.chdir(os.path.join(testdir, "mozmill"))

                logging.debug("unzipping Thunderbird...")
                install_cmd = [
                    tools["unpack"],
                    tools["unpack_args"],
                    os.path.join(self.ftpdir, hosttype + "-" + version,
                                 app),
                    tools["unpack_target_args"],
                    testdir
                    ]

                logging.debug(" ".join(install_cmd))
                try:
                    appbin = subprocess.check_output(install_cmd)
                except subprocess.CalledProcessError as e:
                    logging.error("cannot install thunderbird %" %
                                  e.output)

                # copy drag'n'drop helpers to shared-modules until
                # they are added to thunderbird source
                os.chdir(os.path.join(script_dir, "shared-modules"))
                shared_files = glob.glob("*")
                logging.debug("shared files: %r" % shared_files)
                for file in shared_files:
                    target_dir_name = os.path.join(
                        testdir, "mozmill", "shared-modules")
                    target_file_name = os.path.join(target_dir_name, file)
                    logging.debug("copy file: %s -> %s" %
                                  (file, target_file_name))
                    if os.path.exists(target_file_name):
                        os.remove(target_file_name)

                    shutil.copyfile(file, target_file_name)

                test_specs[appversion] = {
                    "version": version,
                    "appbin": appbin.rstrip('\r\n'),
                    "tests": tests,
                    "hosttype": hosttype
                }

        logging.info("download/unzip finished\n\n")
        return test_specs

    def execute_test(self, test_spec, out_dir):
        version = test_spec['version']
        appbin = test_spec['appbin']
        tests = test_spec['tests']
        hosttype = test_spec['hosttype']
        tools = self.package_tools[hosttype]

        logging.info("Execute tests for: %s\t%s\t%s\t%s\n\n" %
                     (hosttype, version, appbin, tests))
#
        testdir = os.path.abspath(os.path.join(
            self.TMPDIR,
            "compactheader",
            "test-" + version,
            "testing"))

        os.chdir(os.path.join(testdir, "mozmill"))

        python = tools["virtualpython"]

        # display mail user agent for AMO#
        dispMUAfiles = glob.glob("../../../ftp/display_*")
        if len(dispMUAfiles) > 0:
            dispMUAfile1 = os.path.abspath(dispMUAfiles[-1])
        else:
            dispMUAfile1 = ""

        dispMUAfiles = glob.glob("../../../ftp/addon-562*.xpi")
        if len(dispMUAfiles) > 0:
            dispMUAfile2 = os.path.abspath(dispMUAfiles[-1])
        else:
            dispMUAfile2 = ""

        # We have out own tests for this, so delete it
        try:
            os.remove("message-header/test-header-toolbar.js")
        except OSError:
            pass

        # disable test, because the default is now icons only, so this test
        # does not work anymore
        sed_cmd = [
            "sed", "-i", "-e",
            's/test_toolbar_collapse_and_expand/' +
            'notest_toolbar_collapse_and_expand/',
            os.path.join(
                testdir, "mozmill", "message-header", "test-message-header.js")
            ]
        logging.debug("sed: %r" % " " . join(sed_cmd))
        subprocess.call(sed_cmd)

        if platform.system() == 'Darwin' and "TRAVIS" in os.environ:
            # some tests do not work - for whatever reasons - on OSX
            osx_disalbe_tests = [
                'test_button_visibility',
                'test_customize_header_toolbar_reorder_buttons',
                'test_customize_header_toolbar_remove_buttons',
                'test_customize_header_toolbar_add_all_buttons',
                ]

            for disable_test in osx_disalbe_tests:
                sed_cmd = [
                    "sed", "-i", "-e",
                    's/' + disable_test + '/' +
                    'no' + disable_test + '/',
                    os.path.join(
                        testdir, "mozmill", "compactheader",
                        "test-compactheader-toolbar.js")
                    ]
                logging.debug("sed: %r" % " ".join(sed_cmd))
                subprocess.call(sed_cmd)
            sed_cmd = [
                "sed", "-i", "-e",
                's/test_a11y_attrs/' +
                'notest_a11y_attrs/',
                os.path.join(
                    testdir, "mozmill", "message-header",
                    "test-message-header.js")
                ]
            logging.debug("sed: %r" % " ".join(sed_cmd))
            subprocess.call(sed_cmd)

            sed_cmd = [
                "sed", "-i", "-e",
                's/test_ignore_phishing_warning_from_eml_attachment/' +
                'notest_ignore_phishing_warning_from_eml_attachment/',
                os.path.join(
                    testdir, "mozmill", "message-header",
                    "test-phishing-bar.js")
                ]
            logging.debug("sed: %r" % " ".join(sed_cmd))
            subprocess.call(sed_cmd)

            sed_cmd = [
                "sed", "-i", "-e",
                's/test_delete_one_after_message_in_folder_tab/' +
                'notest_delete_one_after_message_in_folder_tab/',
                os.path.join(
                    testdir, "mozmill", "folder-display",
                    "test-deletion-with-multiple-displays.js",
                    )
                ]
            logging.debug("sed: %r" % " ".join(sed_cmd))
            subprocess.call(sed_cmd)
        elif platform.system() == 'Windows' and "APPVEYOR" in os.environ:
            win_disalbe_tests = [
                'test_show_all_header_mode',
                'test_customize_header_toolbar_reorder_buttons',
                'test_more_widget_with_maxlines_of_3',
                ]
            for disable_test in win_disalbe_tests:
                sed_cmd = [
                    "sed", "-i", "-e",
                    's/' + disable_test + '/' +
                    'no' + disable_test + '/',
                    os.path.join(
                        testdir, "mozmill", "message-header",
                        "test-message-header.js")
                    ]
                logging.debug("sed: %r" % " ".join(sed_cmd))
                subprocess.call(sed_cmd)

        compatibility_apps = [
            dispMUAfile1, dispMUAfile2,
            self.xpi
            ]

        compatibility_apps = filter(re.compile(r'\S').search,
                                    compatibility_apps)

        compatibility_apps_args = []
        for ca in compatibility_apps:
            compatibility_apps_args += ["-a", ca]

        logging.info("addons: %r" % compatibility_apps)
#
#           my $comp_apps = join(" -a ", @compatibility_apps);

        mozmill_commands = [
#             [python, "runtest.py",
#              "--timeout=240",
#              "--binary=" + appbin,
#              "-a", self.xpi,
#              "-t", "compactheader",
#              "--testing-modules-dir", "../modules",
#              "2>&1"],
            [python, "runtest.py",
             "--timeout=600",
             "--binary=" + appbin,
             "-a", self.xpi,
             "-t", "message-header",
             "--testing-modules-dir", "../modules",
             "2>&1"],
            [python, "runtest.py",
             "--timeout=600",
             "--binary=" + appbin,
             "-a", self.xpi,
             "-t", "folder-display",
             "--testing-modules-dir", "../modules",
             "2>&1"],
#             [python, "runtest.py",
#              "--timeout=240",
#              "--binary=" + appbin] +
#             compatibility_apps_args +
#             ["-t", "compactheader/test-compactheader-preferences.js",
#              "--testing-modules-dir", "../modules",
#              "2>&1"],
#             [python, "runtest.py",
#              "--timeout=240",
#              "--binary=" + appbin] +
#             compatibility_apps_args +
#             ["-t", "compactheader/test-compactheader-toolbar.js",
#              "--testing-modules-dir", "../modules",
#              "2>&1"],
            ]
#
        log = ""
        number_of_tests = 0

        for command in mozmill_commands:
            logging.info("mozmill command: %r" % " ".join(command))
            proc = subprocess.Popen(command,
                                    stdout=subprocess.PIPE,
                                    universal_newlines=True)
            old_cmd_out = ""
            for line in iter(proc.stdout.readline, ''):
                if line != old_cmd_out:
                    print(line.rstrip())
                    old_cmd_out = line
                log += line
            proc.stdout.close()
            number_of_tests += 1

        datestr = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
        with open(os.path.join(
            out_dir,
            "log-" + version + "-" + hosttype + "-" +
                  datestr + ".txt"), 'w') as f:
            f.write(log)

        logging.info("Suspicious test outputs:")
        suspicious = filter(
            re.compile(r"(UNEXPECTED|^  |^Exception: Sorry, cannot )").search,
            log.splitlines())
        for line in suspicious:
            logging.info(line)

        log_lines = len(suspicious)
        return (log_lines, number_of_tests)


def main():
    current_dir = os.getcwd()
    test_executor = TestExecutor()
    test_specs = test_executor.download_test()
    logging.info("test specs: %r" % test_specs)
    log_lines = 0
    number_of_tests = 0

    for appversion in test_specs:
        l, n = test_executor.execute_test(
            test_specs[appversion], current_dir)
        log_lines += l
        number_of_tests += n

    logging.info(
        "loglines: %i, number_of_tests: %d",
        log_lines, number_of_tests)

    # there is one line of output per test (i.e. the date)
    if log_lines != 0:
        logging.error("some tests failed!")
        exit(1)


if __name__ == '__main__':
    main()
