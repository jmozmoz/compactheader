from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import
from __future__ import division

import requests
import bs4
import json

with open("testapps.json", "r") as jf:
    data = json.load(jf)

beta_data = data['beta']


for platform in beta_data:
    platform_data = beta_data[platform]
    url = "/".join(platform_data['url'].split('/')[:-1]) + '/'
    print("url:", url)

    r = requests.get(url)

    page = r.text

    soup = bs4.BeautifulSoup(page, 'lxml')

    stack = []
    for tr in soup.findAll('tr'):
        for a in tr.findAll('a'):
            stack.append(a.text.strip())

    print("Last build:", url + stack[-1][:-1])

    data['beta'][platform]['url'] = url + stack[-1][:-1]

with open("testapps.json", "w") as jf:
    json.dump(data, jf, indent=4)
