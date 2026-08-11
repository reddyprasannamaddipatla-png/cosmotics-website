import os
import json
import requests
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
PRODUCTS_FILE = os.path.join(DATA_DIR, 'products.json')
CONTACTS_FILE = os.path.join(DATA_DIR, 'contacts.json')
NEWSLETTER_FILE = os.path.join(DATA_DIR, 'newsletter.json')

# User's Google Apps Script Web App URL
APPS_SCRIPT_URL = os.getenv(
    'APPS_SCRIPT_URL', 
    'https://script.google.com/macros/s/AKfycbxQ1llKXGLZ1n21ufX7rvIuO2Lh5PiYel0PPNarhSBKEg1puhvFBdORVU136vWAHxr8_w/exec'
)

class DatabaseManager:
    def __init__(self):
        self.apps_script_url = APPS_SCRIPT_URL
        print(f"Connected to Google Apps Script Web App: {self.apps_script_url}")

    def _read_json(self, file_path):
        if not os.path.exists(file_path):
            return []
        with open(file_path, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except Exception:
                return []

    def _write_json(self, file_path, data):
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def get_all_products(self, category=None, search=None, min_price=None, max_price=None):
        products = []
        # Try fetching from Google Apps Script Web App if action=getProducts is implemented
        try:
            res = requests.get(f"{self.apps_script_url}?action=getProducts", timeout=5)
            if res.status_code == 200:
                data = res.json()
                if isinstance(data, list) and len(data) > 0:
                    products = data
                elif isinstance(data, dict) and data.get("products"):
                    products = data.get("products")
        except Exception:
            pass

        # Fallback / Default local rich catalog
        if not products:
            products = self._read_json(PRODUCTS_FILE)

        # Apply Filters
        filtered = []
        for p in products:
            if p.get("status", "Active").lower() != "active":
                continue
            
            if category and category.lower() != 'all':
                if p.get("category", "").lower() != category.lower():
                    continue

            if search:
                query = search.lower()
                name_match = query in p.get("name", "").lower()
                desc_match = query in p.get("description", "").lower()
                cat_match = query in p.get("category", "").lower()
                if not (name_match or desc_match or cat_match):
                    continue

            if min_price is not None:
                try:
                    if float(p.get("price", 0)) < float(min_price):
                        continue
                except ValueError:
                    pass

            if max_price is not None:
                try:
                    if float(p.get("price", 0)) > float(max_price):
                        continue
                except ValueError:
                    pass

            filtered.append(p)

        return filtered

    def get_product_by_id(self, product_id):
        products = self.get_all_products()
        for p in products:
            if str(p.get("id")).lower() == str(product_id).lower():
                return p
        return None

    def get_categories(self):
        products = self.get_all_products()
        categories = sorted(list(set(p.get("category") for p in products if p.get("category"))))
        return categories

    def get_featured_products(self):
        products = self.get_all_products()
        featured = [p for p in products if p.get("is_featured")]
        if not featured:
            featured = products[:4]
        return featured

    def save_contact(self, contact_data):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        record_id = f"CNT-{int(datetime.now().timestamp())}"
        
        payload = {
            "ID": record_id,
            "Name": contact_data.get("name", ""),
            "Email": contact_data.get("email", ""),
            "Phone": contact_data.get("phone", ""),
            "Message": contact_data.get("message", ""),
            "CreatedAt": timestamp
        }

        # 1. Post directly to Google Apps Script Web App (Saves to Google Sheets & Triggers Customer Email)
        try:
            resp = requests.post(
                self.apps_script_url, 
                json=payload, 
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            if resp.status_code == 200:
                res_json = resp.json()
                print(f"Successfully posted to Google Sheets via Apps Script: {res_json}")
                
                # Also save copy locally
                contacts = self._read_json(CONTACTS_FILE)
                contacts.append(payload)
                self._write_json(CONTACTS_FILE, contacts)
                
                return {
                    "success": True, 
                    "id": res_json.get("id", record_id), 
                    "source": "Google Sheets & Apps Script Email Automation"
                }
        except Exception as e:
            print(f"Error posting to Google Apps Script URL: {e}")

        # Local JSON Fallback if network issue
        contacts = self._read_json(CONTACTS_FILE)
        contacts.append(payload)
        self._write_json(CONTACTS_FILE, contacts)
        return {"success": True, "id": record_id, "source": "Local Backup Storage"}

    def save_newsletter(self, email):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        entry = {"email": email, "subscribed_at": timestamp}
        newsletters = self._read_json(NEWSLETTER_FILE)
        if not any(item.get("email") == email for item in newsletters):
            newsletters.append(entry)
            self._write_json(NEWSLETTER_FILE, newsletters)
        return {"success": True, "message": "Subscribed successfully!"}

db = DatabaseManager()
