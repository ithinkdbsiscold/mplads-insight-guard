import requests
import time

url = 'https://mplads-insight-guard.onrender.com/api/v1/db_migrate_upload'
file_path = 'data/guardian.db'

print(f'Uploading {file_path} to {url}...')
with open(file_path, 'rb') as f:
    files = {'file': ('guardian.db', f, 'application/octet-stream')}
    response = requests.post(url, files=files)

print(f'Response status: {response.status_code}')
print(f'Response body: {response.text}')

if response.status_code == 200:
    print('Checking progress on /db_verify...')
    verify_url = 'https://mplads-insight-guard.onrender.com/api/v1/db_verify'
    while True:
        try:
            r = requests.get(verify_url)
            data = r.json()
            counts = data.get('row_counts', {})
            print(f"Works: {counts.get('works', 0)} | Expenditures: {counts.get('expenditures', 0)}")
            if counts.get('works', 0) >= 222349 and counts.get('expenditures', 0) >= 227778:
                print('Migration appears complete!')
                break
        except Exception as e:
            print(e)
        time.sleep(10)
