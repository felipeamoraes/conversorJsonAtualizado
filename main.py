logging.basicConfig(level=logging.DEBUG)
# Initialize Flask app
app = Flask(__name__)
app = Flask(__name__, static_folder='static')
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")
# Routes
@app.route('/')
def index():
    return render_template('index.html')
# Serve static files from root directory
@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)