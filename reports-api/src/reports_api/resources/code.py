# Copyright © 2019 Province of British Columbia
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""Resource for code endpoints."""
from http import HTTPStatus

from flask_restx import Namespace, Resource, cors

from reports_api.services.code import CodeService
from reports_api.utils.util import cors_preflight
from reports_api.utils import auth, profiletime


API = Namespace('codes', description='Codes')


@cors_preflight('GET')
@API.route('/<string:code_type>', methods=['GET', 'OPTIONS'])
class Codes(Resource):
    """Endpoint resource to return codes."""

    @staticmethod
    @cors.crossdomain(origin='*')
    @auth.require
    @profiletime
    def get(code_type):
        """Return all codes based on code_type."""
        return CodeService.find_code_values_by_type(code_type), HTTPStatus.OK


@cors_preflight('GET')
@API.route('/<string:code_type>/<string:code>', methods=['GET', 'OPTIONS'])
class Code(Resource):
    """Endpoint resource to return codes."""

    @staticmethod
    @cors.crossdomain(origin='*')
    @auth.require
    @profiletime
    def get(code_type, code):
        """Return all codes based on code_type."""
        return CodeService.find_code_value_by_type_and_code(code_type, code), HTTPStatus.OK
