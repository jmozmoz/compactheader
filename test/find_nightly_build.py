from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import
from __future__ import division

import json
from thclient import TreeherderClient

client = TreeherderClient()


app_urls = {}
test_urls = {}

mapping_builds = {
    'WindowsAMD64': 'build-win64/opt',
    'Linuxx86_64': 'build-linux64/opt',
    'Darwinx86_64': 'build-macosx64/opt',
    'Linux': 'build-linux/opt',
}

with open("testapps.json", "r") as jf:
    data = json.load(jf)

nightly_data = data['nightly']

pushes = client.get_pushes('comm-central', )  # gets last 10 by default
for platform in nightly_data:
    platform_data = nightly_data[platform]
    found_artifacts = False

    for push in pushes:
        jobs = client.get_jobs('comm-central', push_id=push['id'])

        for job in jobs:
            if (
                    job['state'] == 'completed' and
                    job['job_type_name'] == mapping_builds[platform]
                    ):
                print(job['start_timestamp'], job['build_platform'],
                      job['job_type_name'], job['platform'],
                      job['platform_option'], job['state'], sep="\t")

                found_test = False
                found_app = False
                for detail in client.get_job_details(job_guid=job['job_guid']):
                    if detail['title'] == 'artifact uploaded':
#                         print('\t\t', detail['url'])
                        if detail['url'].find(platform_data['testzip']) >= 0:
                            found_test = True
                            test_urls[platform] = '/'.join(
                                detail['url'].split('/')[:-1])
                        elif detail['url'].find(platform_data['appzip']) >= 0:
                            found_app = True
                            app_urls[platform] = '/'.join(
                                detail['url'].split('/')[:-1])
                    if found_app and found_test:
                        found_artifacts = True
                        print('found url:', platform, app_urls[platform])
                        break
            if found_artifacts:
                break
        if found_artifacts:
            break

for platform in nightly_data:
    print('platform:', platform)
    if platform not in app_urls:
        raise ValueError('did not find URL!!!!')
    if app_urls[platform] == test_urls[platform]:
        data['nightly'][platform]['url'] = app_urls[platform]
        print("store URL:", data['nightly'][platform]['url'])
    else:
        raise ValueError('found inconsistent URL!!!!!')

print(data)

with open("testapps.json", "w") as jf:
    json.dump(data, jf, indent=4)
