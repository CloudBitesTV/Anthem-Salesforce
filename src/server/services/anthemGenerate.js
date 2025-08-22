import pkg from 'fft-js';
const { ifft } = pkg;

// Inline configuration
const ANTHEM_CONFIG = {
  // Fields to use for opportunity channel generation
  opportunityFields: [
   'Name',
  'AccountId',
  'StageName',
  'Amount',
  'TotalOpportunityQuantity',
  'CloseDate',
  'Type',
  'Probability',
  'LeadSource',
  'Description',
  'NextStep'
  ],
  // Fields to use for account channel generation
  accountFields: [
    'Name',
    'AccountNumber',
    'Industry',
    'Type',
    'Rating',
    'Ownership',
    'AccountSource',
    'Description',
    'Site',
    'Tradestyle',
    'Phone',
    'Fax',
    'Website',
    'BillingStreet',
    'BillingCity',
    'BillingState',
    'BillingPostalCode',
    'BillingCountry',
    'ShippingStreet',
    'ShippingCity',
    'ShippingState',
    'ShippingPostalCode',
    'ShippingCountry',
    'AnnualRevenue',
    'NumberOfEmployees',
    'YearStarted',
    'Sic',
    'SicDesc',
    'NaicsCode',
    'NaicsDesc',
    'TickerSymbol',
    'DunsNumber'
  ],
  // Fields to use for opportunity line items channel generation
  opportunityLineItemFields: [
    'Quantity',
    'UnitPrice',
    'TotalPrice',
    'Description',
    'ServiceDate'
  ]
};

const TOTAL_SAMPLES = 44100 * 3;

/**
 * Generate anthem data for a given opportunity
 * @param {Object} request - The anthem generation request
 * @param {string} request.opportunityId - The opportunity ID
 * @param {import('@heroku/applink').Context} client - The Salesforce client context
 * @returns {Promise<Object>} The generated anthem response
 */
export async function generateAnthem(request, client) {
  try {
    const { opportunityId } = request;
    
    // Access the Applink SDK
    const { context } = client;
    const org = context.org;
    const dataApi = org.dataApi;
    const logger = console;

    logger.info(`Generating anthem for opportunity: ${opportunityId}`);

    // Query the opportunity data
    const oppFields = ANTHEM_CONFIG.opportunityFields.join(', ');
    const oppSoql = `SELECT Id, ${oppFields} FROM Opportunity WHERE Id = '${opportunityId}'`;
    const oppResult = await executeQuery(dataApi, oppSoql, 'opportunity');
    const opportunity = oppResult.records[0];
    logger.info(`Retrieved opportunity: ${opportunity.fields.Name}`);

    // Query the associated account data
    let accountFields = {};
    if (opportunity.fields.AccountId) {
      const accFields = ANTHEM_CONFIG.accountFields.join(', ');
      const accSoql = `SELECT Id, ${accFields} FROM Account WHERE Id = '${opportunity.fields.AccountId}'`;
      const accResult = await executeQuery(dataApi, accSoql, 'account');
      accountFields = accResult.records[0].fields;
      logger.info(`Retrieved account: ${accountFields.Name || opportunity.fields.AccountId}`);
    } else {
      logger.warn('Opportunity has no associated account');
    }

    // Query opportunity line items
    let opportunityLineItemTuples = [];
    const oliFields = ANTHEM_CONFIG.opportunityLineItemFields.join(', ');
    const oliSoql = `SELECT Id, ${oliFields} FROM OpportunityLineItem WHERE OpportunityId = '${opportunityId}' ORDER BY SortOrder, Id LIMIT 10`;
    const oliResult = await executeQuery(dataApi, oliSoql, 'opportunity line items');
    logger.info(`Retrieved ${oliResult.records.length} opportunity line items`);
    
    // Generate tuples for all channels
    const accountTuples = generateTuplesFromFields(accountFields, ANTHEM_CONFIG.accountFields);
    const opportunityTuples = generateTuplesFromFields(opportunity.fields, ANTHEM_CONFIG.opportunityFields);
    
    // This defaults to haveing a single line item as the loop was blowing the stack
    const lineItemTuples = generateTuplesFromFields(oliResult.records[0].fields, ANTHEM_CONFIG.opportunityLineItemFields);
    logger.info(`Generated ${opportunityTuples.length} opportunity tuples, ${accountTuples.length} account tuples, ${lineItemTuples.length} line item tuples`);

    // for (const record of oliResult.records) {
    //   const lineItemTuples = generateTuplesFromFields(record.fields, ANTHEM_CONFIG.opportunityLineItemFields);
    //   opportunityLineItemTuples.push(...lineItemTuples);
    // }    
    // logger.info(`Generated ${opportunityTuples.length} opportunity tuples, ${accountTuples.length} account tuples, ${opportunityLineItemTuples.length} line item tuples`);

    // Generate anthem data for three channels
    const anthemData = [
      generateChannelFromTuples(opportunityTuples),
      generateChannelFromTuples(lineItemTuples),
      // generateChannelFromTuples(opportunityLineItemTuples),
      generateChannelFromTuples(accountTuples)      
    ];
    logger.info(`Generated anthem with ${anthemData.length} channels, ${anthemData[0]?.length || 0} samples`);

    //This is a hack to get the max and min values of the anthem data without using spread as it blows the call stack
    let maxValue = 0;
    let minValue = 0;

    for(const anthem of anthemData) {
      for(const sample of anthem) {
        if(sample > maxValue) {
          maxValue = sample;
        }
        if(sample < minValue) {
          minValue = sample;
        }
      }
    }
    console.info(`Max value: ${maxValue}, Min value: ${minValue}`);
    
    return { 
      anthemData,
      opportunityId: opportunityId
    };
  } catch (error) {
    if (error.statusCode) {
      throw error; // Preserve custom errors with status codes
    }

    console.error('Unexpected error generating anthem:', error);
    const wrappedError = new Error(`An unexpected error occurred: ${error.message}`);
    wrappedError.statusCode = 500;
    throw wrappedError;
  }

  /**
   * Helper method to execute SOQL queries with error handling
   * @param {Object} dataApi - The Salesforce data API instance
   * @param {string} soql - The SOQL query to execute
   * @param {string} entityName - Name of the entity being queried (for logging)
   * @returns {Promise<Object>} The query result with records
   */
  async function executeQuery(dataApi, soql, entityName) {
    try {
      const result = await dataApi.query(soql);
      if (!result.records || result.records.length === 0) {
        throw new Error(`No ${entityName} records found`);
      }
      return result;
    } catch (error) {
      throw new Error(`Failed to query ${entityName}: ${error.message}`);
    }
  }
}

/**
 * Generate tuples from Salesforce fields using the "fieldNameLength, fieldValue" approach
 * @param {Object} fields - Salesforce fields object
 * @param {Array<string>} fieldNames - Array of field names to process
 * @returns {Array<[number, number]>} Array of tuples [fieldNameLength, fieldValue]
 */
function generateTuplesFromFields(fields, fieldNames) {
  const tuples = [];
  const samplesPerTuple = TOTAL_SAMPLES / fieldNames.length;
  
  for (const fieldName of fieldNames) {
    const fieldValue = fields[fieldName];
    if (fieldValue !== undefined && fieldValue !== null) {
      try {
        const fieldNameLength = fieldName.length;
        let processedValue;        
        // Handle different field types
        if (typeof fieldValue === 'number') {
          processedValue = fieldValue;
        } else if (typeof fieldValue === 'boolean') {
          // Convert boolean to number: false = 0, true = 1
          processedValue = fieldValue ? 1 : 0;
        } else {
          // For strings and other types, use the length
          processedValue = String(fieldValue).length;
        }
        //Pad output for length to ensure we meet correct sample size
        for(let i = 0; i < samplesPerTuple; i++) {
          tuples.push([fieldNameLength, processedValue]);
        }
      } catch (error) {
        console.warn(`Failed to process field ${fieldName}: ${error.message}`);
        tuples.push([fieldName.length, 0]);
      }
    }
  }  
  return tuples;
}

/**
 * Generate a single audio channel from tuples using inverse FFT approach
 * @param {Array<[number, number]>} tuples - Array of tuples [fieldNameLength, fieldValue]
 * @returns {Array<number>} Array of audio samples for the channel
 */
function generateChannelFromTuples(tuples) {
  // Convert tuples directly to complex numbers for FFT
  // Each tuple [fieldNameLength, fieldValue] becomes [fieldNameLength, fieldValue]
  const complexNumbers = tuples.map(tuple => [tuple[0], tuple[1]]);
  
  // Pad with zeros to reach a power-of-2 length for FFT
  const targetLength = Math.pow(2, Math.ceil(Math.log2(Math.max(complexNumbers.length, 64))));
  console.log('🔍 Debug: Target FFT length (power of 2):', targetLength);
  
  const paddedComplexNumbers = [...complexNumbers];
  for (let i = complexNumbers.length; i < targetLength; i++) {
    paddedComplexNumbers.push([0, 0]);
  }
  
  // Debug: Check the structure of our complex numbers
  console.log('🔍 Debug: First few complex numbers:', paddedComplexNumbers.slice(0, 5));
  console.log('🔍 Debug: Array length:', paddedComplexNumbers.length);
  
  // Apply inverse FFT to get raw output, then take the log of the real part to get our output tuples
  const inverseFFTResults = ifft(paddedComplexNumbers).map(complex => {
    if(complex[0] > 0) {
      return Math.log(complex[0]);
    } else if(complex[0] < 0) {
      return -Math.log(-complex[0]);
    } else {
      return 0;
    }
  });
  
  // Return the raw FFT output - let the audio player handle normalization
  return inverseFFTResults;
}
