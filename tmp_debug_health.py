import urllib.request
import urllib.error

for url in ['http://127.0.0.1:8000/health', 'http://127.0.0.1:3000/api/extract-pdf']:
    print('URL:', url)
    try:
        req = urllib.request.Request(url, method='GET')
        with urllib.request.urlopen(req, timeout=10) as res:
            print(res.status)
            print(res.read().decode('utf-8', errors='replace'))
    except urllib.error.HTTPError as e:
        print('HTTPError', e.code)
        print(e.read().decode('utf-8', errors='replace'))
    except Exception as e:
        print('ERROR', type(e).__name__, e)
