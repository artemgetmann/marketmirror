#!/usr/bin/env bash
# Exit on error but don't display commands
set -eo pipefail

# Check for dependencies
if ! command -v jq &> /dev/null; then
    echo "ERROR: jq is required but not found in PATH. Please install jq."
    exit 1
fi

# Your API key - use the one that worked in the debug script
API_KEY="${CLAUDE_API_KEY}"
if [ -z "$API_KEY" ]; then
    echo "ERROR: CLAUDE_API_KEY environment variable is not set."
    exit 1
fi

ENDPOINT="https://api.anthropic.com/v1/messages"

# Check if ticker was provided
if [ $# -eq 0 ]; then
    echo "Please provide a ticker symbol. Usage: ./MarketMirror.sh TICKER"
    exit 1
fi

TICKER=$1
echo "Analyzing $TICKER..."
echo "Fetching data from Finviz..."

# Fetch the page
URL="https://finviz.com/quote.ashx?t=${TICKER}&p=d"
raw=$(curl -s -A 'Mozilla/5.0' "$URL")

if [ -z "$raw" ]; then
    echo "ERROR: Failed to fetch data from Finviz or received empty response."
    exit 1
fi

# Extract metrics with error checking
function extract_metric() {
    local pattern="$1"
    local default="$2"
    local result
    
    result=$(sed -nE "$pattern" <<<"$raw")
    if [ -z "$result" ]; then
        echo "$default"
    else
        echo "$result"
    fi
}

pe=$(extract_metric 's/.*>P\/E<\/td>[^>]*>[^0-9]*([0-9]+(\.[0-9]+)?)<.*/\1/p' "N/A")
ps=$(extract_metric 's/.*>P\/S<\/td>[^>]*>[^0-9]*([0-9]+(\.[0-9]+)?)<.*/\1/p' "N/A")
peg=$(extract_metric 's/.*>PEG<\/td>[^>]*>[^0-9]*([0-9]+(\.[0-9]+)?)<.*/\1/p' "N/A")
pfcf=$(extract_metric 's/.*>P\/FCF<\/td>[^>]*>[^0-9]*([0-9]+(\.[0-9]+)?)<.*/\1/p' "N/A")
pb=$(extract_metric 's/.*>P\/B<\/td>[^>]*>[^0-9]*([0-9]+(\.[0-9]+)?)<.*/\1/p' "N/A")
roe=$(extract_metric 's/.*>ROE<\/td><td[^>]*>[^0-9]*([0-9]+(\.[0-9]+)?%).*/\1/p' "N/A")
roa=$(extract_metric 's/.*>ROA<\/td><td[^>]*>[^0-9]*([0-9]+(\.[0-9]+)?%).*/\1/p' "N/A")
pm=$(extract_metric 's/.*>Profit Margin<\/td><td[^>]*>[^0-9]*([0-9]+(\.[0-9]+)?%).*/\1/p' "N/A")
sales=$(extract_metric 's/.*>Sales past 5Y<\/td><td[^>]*>[^0-9]*([0-9]+(\.[0-9]+)?%).*/\1/p' "N/A")
cr=$(extract_metric 's/.*>Current Ratio<\/td>[^>]*>[^0-9]*([0-9]+(\.[0-9]+)?)<.*/\1/p' "N/A")
de=$(extract_metric 's/.*>Debt\/Eq<\/td>[^>]*>[^0-9]*([0-9]+(\.[0-9]+)?)<.*/\1/p' "N/A")
insider=$(extract_metric 's/.*>Insider Own<\/td><td[^>]*>[^0-9]*([0-9]+(\.[0-9]+)?%).*/\1/p' "N/A")
div_ttm=$(extract_metric '/Dividend TTM/ s/.*<b>([^<]+)<\/b>.*/\1/p' "No Dividend")
mcap=$(extract_metric 's/.*>Market Cap<\/td><td[^>]*>[^0-9]*([0-9]+(\.[0-9]+)?[BM]).*/\1/p' "N/A")
option_short=$(extract_metric '/Option\/Short/ s/.*<b>([^<]+)<\/b>.*/\1/p' "N/A")
insider_trans=$(extract_metric 's/.*>Insider Trans<\/td>[^>]*>[^-0-9]*(-?[0-9]+(\.[0-9]+)?%).*/\1/p' "N/A")

echo "Data retrieved successfully!"
echo "Generating analysis..."

# Write payload to a file to avoid any shell escaping issues
cat > payload.json << EOF
{
  "model": "claude-3-7-sonnet-20250219",
  "max_tokens": 4000,
  "temperature": 0.5, 
  "system": "You are a financial analyst with expertise in stock analysis.",
  "messages": [
    {
      "role": "user",
      "content": "As a financial analyst, please provide a comprehensive analysis of ${TICKER} using the following Finviz data:

Valuation & Growth:
- P/E (TTM): ${pe}
- P/S: ${ps}
- PEG Ratio: ${peg}
- P/FCF: ${pfcf}
- P/B: ${pb}

Profitability:
- ROE: ${roe}
- ROA: ${roa}
- Profit Margin: ${pm}
- Sales Growth (5Y): ${sales}

Liquidity & Leverage:
- Current Ratio: ${cr}
- Debt/Equity: ${de}

Qualitative Factors:
- Insider Ownership: ${insider}
- Insider Transactions: ${insider_trans}
- Dividend TTM: ${div_ttm}
- Market Cap: ${mcap}
- Option/Short: ${option_short}

Please create a detailed analysis with the following structure:

1. Analysis Table: Create a table listing each metric alongside its current value from the data. For each metric, include a brief commentary or qualitative assessment.

2. Final Recommendation: Write a concluding paragraph that summarizes the overall financial health and outlook of the company.
   - Discuss whether the current valuation is justified based on historical trends
   - Integrate insights from the quantitative metrics and qualitative factors
   - Include an investment recommendation (e.g., 'attractive for long-term growth investors despite premium valuation' or 'caution warranted due to near-term challenges')

Format your response in markdown for readability."
    }
  ]
}
EOF

# Make the API call
echo "Analyzing financial data with Claude..."
api_response=$(curl -s "$ENDPOINT" \
  -H "x-api-key: $API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d @payload.json)

# Extract analysis text from response
analysis=$(echo "$api_response" | grep -o '"text": ".*"' | sed 's/"text": "\(.*\)"/\1/' | sed 's/\\"/"/g' | sed 's/\\n/\n/g')

# If analysis extraction failed, try with jq if available
if [ -z "$analysis" ]; then
  echo "Extracting analysis with alternative method..."
  analysis=$(echo "$api_response" | jq -r '.content[0].text // "Error: Could not extract analysis"')
fi

# Verify we got something
if [ -z "$analysis" ] || [ "$analysis" = "Error: Could not extract analysis" ]; then
  echo "ERROR: Failed to extract analysis from API response."
  exit 1
fi

# Print the final analysis
echo "========== COMPREHENSIVE FINANCIAL ANALYSIS OF $TICKER =========="
echo "$analysis"

# Save to file
echo "$analysis" > "${TICKER}_comprehensive_analysis_$(date +%Y%m%d).md"
echo ""
echo "Comprehensive analysis saved to ${TICKER}_comprehensive_analysis_$(date +%Y%m%d).md"