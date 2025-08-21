# Anthem SF

This is the Salesforce repository for Anthem, a small example project put together to showcase Heroku AppLink in a fun way.

## Prerequisites
- Node.js 20.x
- Salesforce CLI (`sf`)
- Heroku CLI
- Heroku AppLink CLI plugin installed (`heroku plugins:install applink`)
- Dev Hub org configured with scratch org creation permissions

## Local Development and Testing

This section covers setting up a local development environment to test the anthem generation API before deploying to production. You'll create a Salesforce scratch org, start a local Node.js server, and test the API using the provided tools. This allows you to develop and debug locally while maintaining the same Salesforce context and authentication that will be used in production. Note that Heroku and Heroku AppLink are not required for any of the steps in this section.

### Salesforce Setup
```bash
# Create a new scratch org (and set as default)
sf org create scratch --definition-file config/project-scratch-def.json --alias anthemorg --set-default

# Import sample data using the data setup script
./bin/data.sh

# Note: The data.sh script automatically:
# - Queries the standard price book ID and updates pricebook entries
# - Imports all sample data (accounts, products, opportunities, etc.)
# - Provides verification of the imported data
# - Can be run with -cleanup flag to remove existing data first
```

### Running Locally
```bash
# Install dependencies
npm install

# Start the local server
npm start

# The API will be available at http://localhost:3000
# Swagger docs at http://localhost:3000/documentation
```

### Testing the API
```bash
# Test with Salesforce context (simulates real Salesforce calls)
./bin/invoke.sh anthemsf '{"opportunityId": "006XXXXXXXXXXXXXXX"}'
```

### Local Audio Testing
To hear the anthem audio locally, you can use the anthemPlayer.js script which creates an HTML player:

**Usage:**
```bash
# Generate anthem data and open player (assumes local server is already running)
node bin/anthemPlayer.js anthemsf 006XXXXXXXXXXXXXXX
```

**Note:** The anthemPlayer.js script generates a JavaScript file (`anthemData.js`) that contains the anthem data as a global variable. The HTML player loads this data via a script tag, so no HTTP server is required. You can open the HTML file directly in your browser and it will work immediately.

### Data Management Script
The `bin/data.sh` script provides a convenient way to manage sample data in your scratch org:

**Usage:**
```bash
# Import all sample data (default behavior)
./bin/data.sh

# Clean up existing data before import
./bin/data.sh -cleanup
```

**What it does:**
- Automatically queries the standard price book ID and updates pricebook entries
- Imports all sample data (accounts, products, opportunities, opportunity line items, pricebook entries)
- Provides verification counts of imported data
- Handles temporary file management and cleanup
- Can optionally remove existing data before import

## Deployment

This section covers deploying the anthem generation API to Heroku using Heroku AppLink. You'll create a Salesforce scratch org, deploy the Node.js application to Heroku, configure the AppLink integration, and finally deploy the Lightning Web Component to Salesforce. This creates a working system where Salesforce can securely invoke the anthem generation API.

### Salesforce Setup
```bash
# Create a new scratch org (and set as default)
sf org create scratch --definition-file config/project-scratch-def.json --alias anthemorg --set-default

# Import sample data using the data setup script
./bin/data.sh

# Note: The data.sh script automatically:
# - Queries the standard price book ID and updates pricebook entries
# - Imports all sample data (accounts, products, opportunities, etc.)
# - Provides verification of the imported data
# - Can be run with -cleanup flag to remove existing data first

# Deploy the ManageHerokuAppLink permission set (required for Heroku CLI commands)
sf project deploy start --metadata Permissionset

# Assign the ManageHerokuAppLink permission set to your user
sf org assign permset --name ManageHerokuAppLink

# Generate password for the scratch org admin user (needed for Heroku connection)
sf org generate password
```

### Deploy to Heroku
```bash
# Create Heroku app
heroku create

# Add Heroku AppLink addon
heroku addons:create heroku-applink --wait

# Add required buildpacks
heroku buildpacks:add --index=1 heroku/heroku-applink-service-mesh
heroku buildpacks:add heroku/nodejs

# Set Heroku app ID
heroku config:set HEROKU_APP_ID="$(heroku apps:info --json | jq -r '.app.id')"

# Deploy code
git push heroku main

# Connect to Salesforce org
heroku salesforce:connect anthemorg -l https://test.salesforce.com

# Publish API to Salesforce
heroku salesforce:publish api-docs.yaml --client-name GenerateAnthem --connection-name anthemorg --authorization-connected-app-name GenerateAnthemConnectedApp --authorization-permission-set-name GenerateAnthemPermissions

# Assign Permission Sets to allow your user to invoke the Heroku code
sf org assign permset --name GenerateAnthem
sf org assign permset --name GenerateAnthemPermissions
```

### Deploy Salesforce Metadata
```bash
# Now deploy the Lightning Web Component (after Heroku is ready)
sf project deploy start
```

**Important:** After deploying the metadata, you need to manually add the `anthemPlayer` Lightning Web Component to the Opportunity Detail page:

1. Go to **Setup** → **Object Manager** → **Opportunity** → **Lightning Record Pages**
2. Click on the **Opportunity Record Page** (usually the default)
3. Click **Edit** to open the Lightning App Builder
4. In the left sidebar, find **Custom** → **anthemPlayer** component
5. Drag and drop it onto the page where you want it to appear
6. Click **Save** and **Activate** to make the changes live

The component will now appear on all Opportunity detail pages and allow users to generate and play anthem audio for each opportunity.

### Verify Deployment
Confirm the app has started:
```bash
heroku logs --tail
```

Navigate to your org's **Setup** menu and search for **Heroku** then click **Apps** to confirm your application has been imported.

### Verify Apex Invoke
Test that Apex can successfully call the Heroku service:
```bash
sf apex run --file scripts/apex/AnthemPlayerTest.apex
```

This script will:
- Call the anthem generation service via the Apex controller
- Display the response data structure
- Confirm the service integration is working correctly
- Show sample counts and data validation

## Technical Information

- The `api.js` file contains OpenAPI schema extensions that tie the deployed operation to the specific connected app and permission set names specified when running the `salesforce:publish` command.
- The anthem generation logic is implemented in the `anthemGenerate.js` source file, under the `src/server/services` directory.
- The `api-docs.yaml` file is automatically generated by Fastify's OpenAPI plugin. You can access the latest version at `http://localhost:8080/docs/yaml` when running locally.
- This Node.js implementation uses synchronous invocation through the AppLink SDK.
- The [@heroku/salesforce-sdk-nodejs](https://www.npmjs.com/package/@heroku/salesforce-sdk-nodejs) package is used to simplify API communications with the org.
- Source code for configuration/metadata deployed to Salesforce can be found in the `/src-org` directory.
- Per **Heroku AppLink** documentation, the service mesh buildpack must be installed to enable authenticated connections to be intercepted and passed through to your code.