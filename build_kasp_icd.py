import os
import sys
import re
import json
import argparse
import urllib.parse
import requests

def get_env_var(name):
    val = os.environ.get(name)
    if not val and sys.platform == 'win32':
        try:
            import winreg
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r'Environment') as key:
                val, _ = winreg.QueryValueEx(key, name)
        except Exception:
            pass
    return val

def get_who_token(client_id, client_secret):
    token_url = 'https://icdaccessmanagement.who.int/connect/token'
    payload = {
        'grant_type': 'client_credentials',
        'scope': 'icdapi_access'
    }
    resp = requests.post(token_url, data=payload, auth=(client_id, client_secret), timeout=15)
    if resp.status_code != 200:
        raise RuntimeError(f"Authentication failed: HTTP {resp.status_code} - {resp.text}")
    return resp.json().get('access_token')

def clean_html(text):
    return re.sub(r'<[^>]+>', '', text or '').strip()

def search_icd11(query, token):
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json',
        'API-Version': 'v2',
        'Accept-Language': 'en'
    }
    search_url = f'https://id.who.int/icd/release/11/2024-01/mms/search?q={urllib.parse.quote(query)}'
    resp = requests.get(search_url, headers=headers, timeout=15)
    if resp.status_code == 200:
        data = resp.json()
        entities = data.get('destinationEntities', [])
        results = []
        for e in entities:
            code = e.get('theCode')
            title = clean_html(e.get('title'))
            if code and title:
                results.append({'code': code, 'title': title})
        return results, None
    else:
        return [], f"HTTP {resp.status_code}: {resp.text}"

def extract_kasp_packages(html_file):
    if not os.path.exists(html_file):
        raise FileNotFoundError(f"File not found: {html_file}")
    
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Look for window.PACKAGE_MASTER_DATA in the HTML file
    m = re.search(r'window\.PACKAGE_MASTER_DATA\s*=\s*(\{.*?\});\s*\n', content, re.DOTALL)
    if m:
        try:
            data = json.loads(m.group(1))
            return data.get('kasp', [])
        except Exception as e:
            raise ValueError(f"Failed to parse window.PACKAGE_MASTER_DATA JSON: {e}")
    
    # Fallback to package_master_data.js if present
    js_path = os.path.join(os.path.dirname(html_file), 'package_master_data.js')
    if os.path.exists(js_path):
        with open(js_path, 'r', encoding='utf-8') as f:
            js_content = f.read()
        m2 = re.search(r'window\.PACKAGE_MASTER_DATA\s*=\s*(\{.*?\});', js_content, re.DOTALL)
        if m2:
            data = json.loads(m2.group(1))
            return data.get('kasp', [])
            
    raise ValueError("Could not find window.PACKAGE_MASTER_DATA in target file or package_master_data.js")

def main():
    parser = argparse.ArgumentParser(description="Fetch ICD-11 suggestions from the WHO ICD API for KASP packages.")
    parser.add_argument("html_file", help="Path to vasus_claim_analytics.html")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of packages to process")
    parser.add_argument("--output", default="kasp_icd.json", help="Output JSON file name (default: kasp_icd.json)")
    args = parser.parse_args()

    # 1. Verify Environment Variables
    client_id = get_env_var('ICD_CLIENT_ID')
    client_secret = get_env_var('ICD_CLIENT_SECRET')

    if not client_id or not client_secret:
        print("ERROR: Environment variables ICD_CLIENT_ID and ICD_CLIENT_SECRET are not set.")
        print("Please configure them in your environment before running this script.")
        sys.exit(1)

    print("[1/4] Environment variables verified.")
    
    # 2. Authenticate
    try:
        token = get_who_token(client_id, client_secret)
        print("[2/4] Successfully authenticated with WHO ICD API.")
    except Exception as e:
        print(f"ERROR: Authentication failed: {e}")
        sys.exit(1)

    # 3. Extract KASP Packages
    try:
        kasp_packages = extract_kasp_packages(args.html_file)
        print(f"[3/4] Loaded {len(kasp_packages)} KASP packages from {args.html_file}.")
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

    # Load existing output JSON if present to merge
    output_data = {}
    if os.path.exists(args.output):
        try:
            with open(args.output, 'r', encoding='utf-8') as f:
                output_data = json.load(f)
        except Exception:
            output_data = {}

    packages_to_process = kasp_packages[:args.limit] if args.limit else kasp_packages
    print(f"[4/4] Processing {len(packages_to_process)} packages with WHO ICD API...\n" + "="*70)

    empty_results = []
    error_results = []
    processed_count = 0

    for idx, pkg in enumerate(packages_to_process, 1):
        code = pkg.get('c')
        raw_name = pkg.get('pr') or pkg.get('p') or ''
        
        # Clean query: strip brackets like (S1100001), special codes
        clean_q = re.sub(r'\(.*?\)', '', raw_name).strip()
        # Primary clause before '-' or ':'
        primary_q = re.split(r'[:\-–]', clean_q)[0].strip() if ('-' in clean_q or ':' in clean_q) else clean_q

        # Attempt search
        entities, err = search_icd11(clean_q, token)
        if err:
            error_results.append((code, raw_name, err))
            print(f"[{idx}/{len(packages_to_process)}] {code}: {raw_name[:40]}... -> API ERROR: {err}")
            continue

        if not entities and primary_q != clean_q:
            entities, err2 = search_icd11(primary_q, token)
            if err2:
                error_results.append((code, raw_name, err2))
                print(f"[{idx}/{len(packages_to_process)}] {code}: {raw_name[:40]}... -> API ERROR: {err2}")
                continue

        processed_count += 1
        output_data[code] = entities[:5]  # Keep top 5 suggestions

        print(f"\n[{idx}/{len(packages_to_process)}] Package: {code} | Name: {raw_name}")
        if entities:
            print(f"   Returned {len(entities)} ICD-11 codes (showing top {min(len(entities), 5)}):")
            for ent in entities[:5]:
                print(f"     * {ent['code']} - {ent['title']}")
        else:
            print("   Returned: [] (Empty list - No matching ICD-11 entities found)")
            empty_results.append(code)

    # Also make sure MG021A (Urinary Tract Infection) is queried and available in output_data
    if 'MG021A' not in output_data:
        uti_pkg = next((p for p in kasp_packages if p.get('c') == 'MG021A'), None)
        if uti_pkg:
            uti_entities, _ = search_icd11('Urinary Tract Infection', token)
            output_data['MG021A'] = uti_entities[:5]

    # Save output JSON
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2)

    print("\n" + "="*70)
    print("PROCESSING SUMMARY:")
    print(f"Total packages processed: {processed_count}")
    print(f"Empty results returned: {len(empty_results)} ({', '.join(empty_results) if empty_results else 'None'})")
    print(f"API errors returned: {len(error_results)} ({', '.join([e[0] for e in error_results]) if error_results else 'None'})")
    print(f"Results saved to: {args.output}")

if __name__ == '__main__':
    main()
