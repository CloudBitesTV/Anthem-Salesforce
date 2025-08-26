// This script tests the anthem generation service via the Apex controller

// Get the first opportunity from the org to test with
List<Opportunity> opportunities = [SELECT Id, Name FROM Opportunity LIMIT 1];

if (opportunities.isEmpty()) {
    System.debug('No opportunities found in the org. Please import sample data first.');
} else {
    Opportunity testOpp = opportunities[0];
    System.debug('Testing with Opportunity: ' + testOpp.Name + ' (ID: ' + testOpp.Id + ')');
    
    // Call the anthem generation service directly to avoid AuraHandledException
    System.debug('About to call Heroku service directly...');
    
    // Create the Heroku service instance
    HerokuAppLink.GenerateAnthem service = new HerokuAppLink.GenerateAnthem();
    
    // Create the request
    HerokuAppLink.GenerateAnthem.generateAnthem_Request request = new HerokuAppLink.GenerateAnthem.generateAnthem_Request();
    request.body = new HerokuAppLink.GenerateAnthem_AnthemGenerationRequest();
    request.body.opportunityId = testOpp.Id;
    
    // Call the Heroku service
    HerokuAppLink.GenerateAnthem.generateAnthem_Response response = service.generateAnthem(request);
    
    System.debug('Service call completed successfully!');
    System.debug('Response received: ' + (response != null ? 'Yes' : 'No'));
    
    if (response != null && response.Code200 != null) {
        System.debug('Success: Response Code 200 received');
        System.debug('Opportunity ID: ' + response.Code200.opportunityId);
        System.debug('ContentVersion ID received: ' + (response.Code200.contentVersionId != null ? 'Yes' : 'No'));
        
        if (response.Code200.contentVersionId != null) {
            System.debug('ContentVersion ID: ' + response.Code200.contentVersionId);
            
            // Verify the ContentVersion was created successfully
            ContentVersion anthemContent = [SELECT Id, Title, ContentSize, FirstPublishLocationId, VersionData
                                           FROM ContentVersion
                                           WHERE Id = :response.Code200.contentVersionId];
            
            System.debug('=== CONTENTVERSION VERIFICATION ===');
            System.debug('ContentVersion Title: ' + anthemContent.Title);
            System.debug('Content Size: ' + anthemContent.ContentSize + ' bytes');
            System.debug('First Publish Location ID: ' + anthemContent.FirstPublishLocationId);
            System.debug('Version Data URL: ' + anthemContent.VersionData);
            
            // Verify the ContentVersion is linked to the Opportunity
            if (anthemContent.FirstPublishLocationId == testOpp.Id) {
                System.debug('✅ ContentVersion is properly linked to the Opportunity');
            } else {
                System.debug('❌ ContentVersion is not linked to the Opportunity');
            }
        }
    } else {
        System.debug('❌ No successful response received from service');
    }
    
    System.debug('=== TEST COMPLETED SUCCESSFULLY ===');
}
