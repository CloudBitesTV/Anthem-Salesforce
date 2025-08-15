import { config } from '../config/index.js';

/**
 * Generate anthem data for a given opportunity
 * @param {Object} request - The anthem generation request
 * @param {string} request.opportunityId - The opportunity ID
 * @param {import('@heroku/salesforce-sdk-nodejs').AppLinkClient} client - The Salesforce client
 * @returns {Promise<Object>} The generated anthem response
 */
export async function generateAnthem (request, client) {
  try {
    // Generate random values exactly like the LWC controller approach
    // Create an array with numberOfChannels lists of random values between -1.0 and 1.0
    
    const numberOfChannels = 2; // Default to 2 channels like the LWC controller
    const sampleRate = 44100; // Standard sample rate like LWC
    const duration = 0.75; // 0.75 seconds (half of 1.5 seconds) for Apex compatibility
    const samplesPerChannel = sampleRate * duration; // 33,075 samples per channel
    
    const anthemData = [];
    
    // Generate lists of random values for each channel
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const channelList = [];
      
      // Generate the same number of samples as the LWC buffer expects
      for (let i = 0; i < samplesPerChannel; i++) {
        // Use exactly the same approach as LWC controller: Math.random() * 2 - 1
        // This generates values between -1.0 and 1.0
        const randomValue = Math.random() * 2 - 1;
        channelList.push(randomValue);
      }
      
      anthemData.push(channelList);
    }
    
    return { 
      anthemData,
      opportunityId: request.opportunityId
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
}
