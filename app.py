from flask import Flask, render_template, request, jsonify, redirect, url_for
from google_sheets import db

app = Flask(__name__, static_folder='static', template_folder='templates')

# Disable strict slashes for flexibility
app.url_map.strict_slashes = False

# CORS support headers
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    return response

# -------------------------------------------------------------
# PAGE ROUTES
# -------------------------------------------------------------

@app.route('/')
def home_page():
    return render_template('index.html', page='home')

@app.route('/about')
def about_page():
    return render_template('index.html', page='about')

@app.route('/products')
def products_page():
    return render_template('index.html', page='products')

@app.route('/product/<product_id>')
def product_detail_page(product_id):
    return render_template('index.html', page='product-detail', product_id=product_id)

@app.route('/contact')
def contact_page():
    return render_template('index.html', page='contact')

# -------------------------------------------------------------
# FLASK BACKEND REST APIs
# -------------------------------------------------------------

@app.route('/api/products', methods=['GET'])
@app.route('/products', methods=['GET'])
def api_products():
    if request.headers.get('Accept') == 'text/html' and not request.path.startswith('/api/'):
        return render_template('index.html', page='products')

    category = request.args.get('category')
    search = request.args.get('search')
    min_price = request.args.get('min_price')
    max_price = request.args.get('max_price')

    products = db.get_all_products(
        category=category,
        search=search,
        min_price=min_price,
        max_price=max_price
    )
    return jsonify({
        "status": "success",
        "count": len(products),
        "products": products
    })

@app.route('/api/product/<product_id>', methods=['GET'])
@app.route('/product/<product_id>', methods=['GET'])
def api_product(product_id):
    if request.headers.get('Accept') == 'text/html' and not request.path.startswith('/api/'):
        return render_template('index.html', page='product-detail', product_id=product_id)

    product = db.get_product_by_id(product_id)
    if product:
        return jsonify({
            "status": "success",
            "product": product
        })
    return jsonify({
        "status": "error",
        "message": f"Product with ID '{product_id}' not found."
    }), 404

@app.route('/api/categories', methods=['GET'])
@app.route('/categories', methods=['GET'])
def api_categories():
    categories = db.get_categories()
    return jsonify({
        "status": "success",
        "categories": categories
    })

@app.route('/api/featured-products', methods=['GET'])
@app.route('/featured-products', methods=['GET'])
def api_featured_products():
    featured = db.get_featured_products()
    return jsonify({
        "status": "success",
        "count": len(featured),
        "products": featured
    })

@app.route('/api/contact', methods=['POST'])
@app.route('/contact', methods=['POST'])
def api_contact():
    data = request.get_json(silent=True) or request.form.to_dict()
    
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    phone = data.get('phone', '').strip()
    message = data.get('message', '').strip()

    if not name or not email or not message:
        return jsonify({
            "status": "error",
            "message": "Name, Email, and Message are required fields."
        }), 400

    result = db.save_contact({
        "name": name,
        "email": email,
        "phone": phone,
        "message": message
    })

    return jsonify({
        "status": "success",
        "message": "Thank you for reaching out! Our luxury beauty team will contact you shortly.",
        "details": result
    })

@app.route('/api/newsletter', methods=['POST'])
def api_newsletter():
    data = request.get_json(silent=True) or request.form.to_dict()
    email = data.get('email', '').strip()

    if not email or '@' not in email:
        return jsonify({
            "status": "error",
            "message": "Please enter a valid email address."
        }), 400

    result = db.save_newsletter(email)
    return jsonify({
        "status": "success",
        "message": "Welcome to the Aurelia VIP Beauty Club! Enjoy 15% off your first order."
    })

if __name__ == '__main__':
    print("Starting Premium Cosmetics Catalog Server on http://127.0.0.1:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
