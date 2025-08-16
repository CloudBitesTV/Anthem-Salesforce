import { generateAnthem } from '../services/anthemGenerate.js';

// Request/Response schemas matching the OpenAPI spec
const anthemGenerationSchema = {
  tags: ['Anthem Engine'],
  summary: 'Generate an Anthem for a given Opportunity',
  description: 'Generate anthem data based on opportunity region and characteristics.',
  operationId: 'generateAnthem',
  'x-sfdc': {
    heroku: {
      authorization: {
        connectedApp: 'GenerateAnthemConnectedApp',
        permissionSet: 'GenerateAnthemPermissions'
      }
    }
  },  
  body: {
    $ref: 'AnthemGenerationRequest#'
  },
  response: {
    200: {
      description: 'OK',
      content: {
        'application/json': {
          schema: {
            $ref: 'AnthemGenerationResponse#'
          }
        }
      }
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'boolean' },
              message: {
                type: 'string',
                description: 'Error message when client context is missing or invalid'
              }
            }
          }
        }
      }
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'boolean' },
              message: {
                type: 'string',
                description: 'Error message when an unexpected error occurs'
              }
            }
          }
        }
      }
    }
  }
};

const apiRoutes = async (fastify) => {
  // Register schema components
  fastify.addSchema({
    $id: 'AnthemGenerationRequest',
    type: 'object',
    required: ['opportunityId'],
    description: 'Request to generate an anthem, includes the opportunity ID to extract region information',
    properties: {
      opportunityId: {
        type: 'string',
        description: 'A record Id for the opportunity'
      }
    }
  });

  fastify.addSchema({
    $id: 'AnthemGenerationResponse',
    type: 'object',
    description: 'Response includes the generated anthem data as a list of decimal lists.',
    properties: {
      anthemData: {
        type: 'array',
        description: 'List of decimal lists representing anthem audio data',
        items: {
          type: 'array',
          items: {
            type: 'number',
            description: 'Audio values between -1.0 and 1.0'
          }
        }
      },
      opportunityId: {
        type: 'string',
        description: 'The opportunity ID used for generation'
      }
    }
  });

  fastify.post('/generateanthem', {
    schema: anthemGenerationSchema,
    handler: async (request, reply) => {
      const { opportunityId } = request.body;

      try {
        if (!request.salesforce) {
          const error = new Error('Salesforce client not initialized');
          reply.code(401).send({
            error: true,
            message: error.message
          });
          return;
        }

        // Delegate to anthem engine service
        const result = await generateAnthem({ opportunityId }, request.salesforce);
        return result;
      } catch (error) {
        reply.code(error.statusCode || 500).send({
          error: true,
          message: error.message
        });
      }
    }
  });
};

export default apiRoutes;
