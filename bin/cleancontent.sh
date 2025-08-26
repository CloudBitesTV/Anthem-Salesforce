#!/bin/bash

# Simple ContentVersion Cleanup Script
# Deletes Anthem-related ContentVersion records to free up storage space

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <target-org-alias>"
    echo "Example: $0 test-ebdcn0jwalg3@example.com"
    exit 1
fi

TARGET_ORG="$1"

echo "🧹 Cleaning up Anthem ContentVersion records in org: $TARGET_ORG"

# Find Anthem-related ContentDocument records (which will cascade delete ContentVersion)
echo "🔍 Finding Anthem records..."
ANTHEM_RECORDS=$(sf data query --query "SELECT Id, Title, ContentSize FROM ContentDocument WHERE Title LIKE 'Anthem_%'" --target-org "$TARGET_ORG" --result-format csv)

# Count records (subtract header line)
RECORD_COUNT=$(echo "$ANTHEM_RECORDS" | wc -l)
RECORD_COUNT=$((RECORD_COUNT - 1))

if [ "$RECORD_COUNT" -eq 0 ]; then
    echo "✅ No Anthem records found"
    exit 0
fi

echo "📋 Found $RECORD_COUNT Anthem records:"

# Display records (skip header)
echo "$ANTHEM_RECORDS" | tail -n +2 | while IFS=',' read -r id title size; do
    echo "   $id - $title ($size bytes)"
done

echo ""
echo "🗑️  Deleting records..."

# Delete each record individually
echo "$ANTHEM_RECORDS" | tail -n +2 | while IFS=',' read -r id title size; do
    echo "   Deleting $id..."
    sf data delete record --sobject ContentDocument --record-id "$id" --target-org "$TARGET_ORG"
done

echo ""
echo "✅ Cleanup completed! Deleted $RECORD_COUNT Anthem records."
