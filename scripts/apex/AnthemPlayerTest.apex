// Test script for AnthemPlayerController
// This script tests the anthem generation service via the Apex controller

// Get the first opportunity from the org to test with
List<Opportunity> opportunities = [SELECT Id, Name FROM Opportunity LIMIT 1];

if (opportunities.isEmpty()) {
    System.debug('No opportunities found in the org. Please import sample data first.');
} else {
    Opportunity testOpp = opportunities[0];
    System.debug('Testing with Opportunity: ' + testOpp.Name + ' (ID: ' + testOpp.Id + ')');
    
    try {
        // Call the anthem generation service
        System.debug('About to call AnthemPlayerController.generate...');
        
        AnthemPlayerController.AnthemResponse result = AnthemPlayerController.generate(testOpp.Id);
        
        System.debug('Service call completed successfully!');
        System.debug('Response received: ' + (result != null ? 'Yes' : 'No'));
        
        if (result != null) {
            System.debug('Success: ' + result.success);
            System.debug('Message: ' + result.message);
            System.debug('Opportunity ID: ' + result.opportunityId);
            System.debug('Anthem data received: ' + (result.anthemData != null ? 'Yes' : 'No'));
            
            if (result.anthemData != null) {
                System.debug('Number of channels: ' + result.anthemData.size());
                if (!result.anthemData.isEmpty()) {
                    System.debug('Channel 1 sample count: ' + result.anthemData[0].size());
                }
            }
        }
        
        System.debug('=== TEST COMPLETED SUCCESSFULLY ===');
        
    } catch (Exception e) {
        System.debug('=== ANTHEM GENERATION FAILED ===');
        System.debug('Error Type: ' + e.getTypeName());
        System.debug('Error Message: ' + e.getMessage());
        System.debug('Stack Trace: ' + e.getStackTraceString());
        System.debug('=== TEST FAILED ===');
    }
}
