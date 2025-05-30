#!/bin/bash

# Create a test file with mock Wikipedia references
cat > test_analysis.md << EOF
# AAPL Comprehensive Analysis

## Recent News
Apple recently released their new iPhone 15 (https://en.wikipedia.org/wiki/IPhone_15).

The company faced regulatory challenges in the EU (en.wikipedia.org/wiki/European_Union).

Their CEO Tim Cook made several announcements (Source: en.wikipedia.org/wiki/Tim_Cook?utm_source=openai).

The Digital Markets Act (wikipedia) has affected their App Store policies.

Some analysts predict growth (According to Wikipedia).

## Financial Analysis
According to their recent earnings report (not from Wikipedia), revenue exceeded expectations.

This follows the trends observed in the smartphone market (https://en.wikipedia.org/wiki/Smartphone_market).

## Conclusion
Apple remains a strong company (Source).
EOF

echo "=== ORIGINAL FILE ==="
cat test_analysis.md
echo ""
echo "=== AFTER WIKIPEDIA REMOVAL ==="

# Apply the same sed commands from MarketMirror.sh
output=$(cat test_analysis.md)

# Replace any direct URLs to Wikipedia (handles markdown links)
output=$(echo "$output" | sed -E 's|https?://([^) ]*wikipedia[^) ]*)|Source|g')

# Replace any text matching en.wikipedia.org pattern
output=$(echo "$output" | sed -E 's|en\.wikipedia\.org[^) ]*|Source|g')

# Replace citations that explicitly mention Wikipedia
output=$(echo "$output" | sed -E 's|\([^)]*[Ww]ikipedia[^)]*\)|\(Source\)|g')

# Fix any "Source: Source" redundancies
output=$(echo "$output" | sed -E 's|Source: Source|Source|g')

# Ensure proper parentheses pairing around Source references
output=$(echo "$output" | sed -E 's|\(Source$|\(Source\)|g')
output=$(echo "$output" | sed -E 's|\(Source |\(Source\) |g')

echo "$output"

# Cleanup
rm test_analysis.md
