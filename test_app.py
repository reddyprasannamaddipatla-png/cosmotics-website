import json
import unittest
from app import app

class CosmeticsAppTestCase(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_home_page(self):
        response = self.app.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b'AURELIA', response.data)
        self.assertIn(b'Reveal Your Natural Beauty', response.data)

    def test_api_products(self):
        response = self.app.get('/api/products')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode('utf-8'))
        self.assertEqual(data['status'], 'success')
        self.assertGreater(data['count'], 0)

    def test_api_product_detail(self):
        response = self.app.get('/api/product/PROD-001')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode('utf-8'))
        self.assertEqual(data['status'], 'success')
        self.assertEqual(data['product']['name'], 'Rose Quartz Hydrating Serum')

    def test_api_categories(self):
        response = self.app.get('/api/categories')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode('utf-8'))
        self.assertEqual(data['status'], 'success')
        self.assertIn('Skincare', data['categories'])

    def test_api_featured_products(self):
        response = self.app.get('/api/featured-products')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode('utf-8'))
        self.assertEqual(data['status'], 'success')
        self.assertGreater(data['count'], 0)

    def test_api_contact(self):
        payload = {
            "name": "Test User",
            "email": "test@example.com",
            "phone": "+1555000111",
            "message": "Testing luxury contact form"
        }
        response = self.app.post('/api/contact', json=payload)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode('utf-8'))
        self.assertEqual(data['status'], 'success')

if __name__ == '__main__':
    unittest.main()
