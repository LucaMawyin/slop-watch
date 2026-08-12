from flask import Flask, request, Response
from flask_cors import CORS

app = Flask(__name__)
CORS(app)