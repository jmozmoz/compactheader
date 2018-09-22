from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import
from __future__ import division

import json
from thclient import TreeherderClient
import argparse
import logging

client = TreeherderClient()


app_urls = {}
test_urls = {}

mapping_builds = {
    'esr60': {
        'WindowsAMD64': 'build-win64-nightly/opt',
        'Linuxx86_64': 'build-linux64-nightly/opt',
        'Darwinx86_64': 'build-macosx64-nightly/opt',
        'Linux': 'build-linux-nightly/opt',
    },
    'beta': {
        'WindowsAMD64': 'build-win64-nightly/opt',
        'Linuxx86_64': 'build-linux64-nightly/opt',
        'Darwinx86_64': 'build-macosx64-nightly/opt',
        'Linux': 'build-linux-nightly/opt',
    },
    'nightly': {
        'WindowsAMD64': 'build-win64/opt',
        'Linuxx86_64': 'build-linux64/opt',
        'Darwinx86_64': 'build-macosx64/opt',
        'Linux': 'build-linux/opt',
    }
}

branches = {
    'esr60': 'comm-esr60',
    'beta': 'comm-beta',
    'nightly': 'comm-central'
}

logging.basicConfig(level=logging.INFO)

parser = argparse.ArgumentParser()
parser.add_argument("-v", "--version",
                    help="test against Thunderbird version",
                    default=None,
                    required=True)
args = parser.parse_args()

tb_version = args.version
tb_branch = branches[tb_version]

with open("testapps.json", "r") as jf:
    data = json.load(jf)

nightly_data = data[tb_version]

pushes = client.get_pushes(tb_branch, )  # gets last 10 by default
for platform in nightly_data:
    platform_data = nightly_data[platform]
    found_artifacts = False
    platform_data['testzip'] = \
        platform_data['testzip'].replace('.zip', '').replace('.tar.gz', '')

    for push in pushes:
        jobs = client.get_jobs(tb_branch, push_id=push['id'])

        for job in jobs:
            logging.debug(job['job_type_name'])
            if (
                    job['state'] == 'completed' and
                    job['job_type_name'] ==
                    mapping_builds[tb_version][platform]
                    ):
                logging.info("%d\t%s\t%s\t%s\t%s\t%s" % (
                    job['start_timestamp'], job['build_platform'],
                    job['job_type_name'], job['platform'],
                    job['platform_option'], job['state'])
                )

                found_test = False
                found_app = False
                for detail in client.get_job_details(job_guid=job['job_guid']):
                    if detail['title'] == 'artifact uploaded':
                        logging.debug('\t\t' + detail['url'])
                        if detail['url'].find(platform_data['testzip']) >= 0:
                            found_test = True
                            test_urls[platform] = '/'.join(
                                detail['url'].split('/')[:-1]
                            )
                            data[tb_version][platform]['testzip'] = (
                                detail['url'].split('/')[-1]
                            )
                        elif detail['url'].find(platform_data['appzip']) >= 0:
                            found_app = True
                            app_urls[platform] = '/'.join(
                                detail['url'].split('/')[:-1])
                    if found_app and found_test:
                        found_artifacts = True
                        logging.debug('found url: ' + platform +
                                      ' ' + app_urls[platform])
                        break
            if found_artifacts:
                break
        if found_artifacts:
            break

for platform in nightly_data:
    logging.info('platform: ' + platform)
    if platform not in app_urls:
        logging.warn('did not find URL!!!!')
        data[tb_version][platform]['url'] = ''
        continue
    if app_urls[platform] == test_urls[platform]:
        data[tb_version][platform]['url'] = app_urls[platform]
        logging.info("store URL: " + data[tb_version][platform]['url'])
    else:
        logging.warn('found inconsistent URL!!!!!')
        data[tb_version][platform]['url'] = ''

logging.info(data)

with open("testapps.json", "w") as jf:
    json.dump(data, jf, indent=4)
