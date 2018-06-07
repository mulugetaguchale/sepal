from peatlands import app
import logging, argparse
from flask_cors import CORS

if __name__ == '__main__':

    parser = argparse.ArgumentParser()
    parser.add_argument('--gmaps_api_key', action='store', default='', help='Google Maps API key')
    args, unknown = parser.parse_known_args()

    app.config['GMAPS_API_KEY'] = args.gmaps_api_key

    logging.basicConfig(level=app.config['LOGGING_LEVEL'])
    logging.getLogger('flask_cors').level = app.config['LOGGING_LEVEL']
    logging.getLogger('peatlands').level = app.config['LOGGING_LEVEL']

    app.run(debug=app.config['DEBUG'], port=app.config['PORT'], host=app.config['HOST'])