/**
 * @description Controller for the anthemPlayer Lightning Web Component
 */
public with sharing class AnthemPlayerController {
    
    /**
     * @description Generates anthem data for the given opportunity
     * @param opportunityId The ID of the opportunity
     * @return AnthemResponse containing the generated anthem data
     */
    @AuraEnabled(cacheable=false)
    public static AnthemResponse generate(String opportunityId) {
        try {
            // Validate input
            if (String.isBlank(opportunityId)) {
                throw new AuraHandledException('Opportunity ID is required');
            }
            
            // Create the Heroku service instance
            HerokuAppLink.GenerateAnthem service = new HerokuAppLink.GenerateAnthem();
            
            // Create the request
            HerokuAppLink.GenerateAnthem.generateAnthem_Request request = new HerokuAppLink.GenerateAnthem.generateAnthem_Request();
            request.body = new HerokuAppLink.GenerateAnthem_AnthemGenerationRequest();
            request.body.opportunityId = opportunityId;
            
            // Call the Heroku service
            HerokuAppLink.GenerateAnthem.generateAnthem_Response response = service.generateAnthem(request);
            
            // Check if we got a successful response
            if (response != null && response.Code200 != null) {
                // Convert the response to our internal format
                AnthemResponse anthemResponse = new AnthemResponse();
                anthemResponse.opportunityId = response.Code200.opportunityId;
                anthemResponse.anthemData = response.Code200.anthemData;
                anthemResponse.success = true;
                anthemResponse.message = 'Anthem generated successfully';
                
                return anthemResponse;
            } else {
                throw new AuraHandledException('No response received from anthem service');
            }
            
        } catch (HerokuAppLink.GenerateAnthem.generateAnthem_ResponseException e) {
            // Handle specific Heroku service errors
            String errorMessage = 'Service error: ';
            if (e.Code401 != null) {
                errorMessage += e.Code401.message;
            } else if (e.Code500 != null) {
                errorMessage += e.Code500.message;
            } else if (String.isNotBlank(e.defaultResponse)) {
                errorMessage += e.defaultResponse;
            } else {
                errorMessage += 'Unknown error (Response code: ' + e.responseCode + ')';
            }
            throw new AuraHandledException(errorMessage);
            
        } catch (Exception e) {
            // Handle any other exceptions
            throw new AuraHandledException('Error generating anthem: ' + e.getMessage());
        }
    }
    
    /**
     * @description Inner class to represent the anthem response
     */
    public class AnthemResponse {
        @AuraEnabled public String opportunityId;
        @AuraEnabled public List<List<Double>> anthemData;
        @AuraEnabled public Boolean success;
        @AuraEnabled public String message;
    }
}
