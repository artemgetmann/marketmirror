#!/usr/bin/env bash

# Print each command for debugging
set -x

# Exit on any error with error message
trap 'echo "ERROR: Command failed with exit code $? at line $LINENO"' ERR

# Check for jq
if ! command -v jq &> /dev/null; then
    echo "jq is not installed or not in PATH. Attempting to find it..."
    # Try to find jq in common locations
    JQ_PATH=$(find /usr /bin /usr/local -name "jq" -type f 2>/dev/null | head -n 1)
    if [ -n "$JQ_PATH" ]; then
        echo "Found jq at $JQ_PATH, using that."
        alias jq="$JQ_PATH"
    else
        echo "ERROR: jq command not found. Please install jq."
        exit 1
    fi
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
echo "Fetching data from URL: $URL"
raw=$(curl -s -A 'Mozilla/5.0' "$URL")

if [ -z "$raw" ]; then
    echo "ERROR: Failed to fetch data from Finviz or received empty response."
    echo "Attempting to fetch with additional debug information..."
    curl -v -A 'Mozilla/5.0' "$URL"
    exit 1
fi

echo "Successfully fetched data. Extracting metrics..."

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
div_ttm=$(extract_metric '/Dividend TTM/ s/.*<b>([^<]+)<\/b>.*/\1/p' "N/A")
mcap=$(extract_metric 's/.*>Market Cap<\/td><td[^>]*>[^0-9]*([0-9]+(\.[0-9]+)?[BM]).*/\1/p' "N/A")
option_short=$(extract_metric '/Option\/Short/ s/.*<b>([^<]+)<\/b>.*/\1/p' "N/A")
insider_trans=$(extract_metric 's/.*>Insider Trans<\/td>[^>]*>[^-0-9]*(-?[0-9]+(\.[0-9]+)?%).*/\1/p' "N/A")

echo "Extracted metrics:"
echo "P/E: $pe"
echo "P/S: $ps"
echo "PEG: $peg"
echo "P/FCF: $pfcf"
echo "P/B: $pb"
echo "ROE: $roe"
echo "ROA: $roa"
echo "Profit Margin: $pm"
echo "Sales Growth: $sales"
echo "Current Ratio: $cr"
echo "Debt/Equity: $de"
echo "Insider Ownership: $insider"
echo "Dividend TTM: $div_ttm"
echo "Market Cap: $mcap"
echo "Option/Short: $option_short"
echo "Insider Transactions: $insider_trans"

echo "Data retrieved successfully!"
echo "Generating comprehensive analysis..."

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

echo "Payload created. File size: $(wc -c < payload.json) bytes"
echo "First few lines of payload:"
head -n 10 payload.json

# Make the API call
echo "Making API call to Claude..."
api_response=$(curl -v "$ENDPOINT" \
  -H "x-api-key: $API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d @payload.json 2>&1)

echo "API call completed. Response size: ${#api_response} characters"

# Check if the response is valid JSON
if ! echo "$api_response" | grep -q "content"; then
    echo "ERROR: API response does not contain expected content field:"
    echo "$api_response"
    # Just use a placeholder for the analysis to continue with the script
    first_analysis="# Error: Could not retrieve analysis for $TICKER"
else
    # Extract the initial analysis 
    first_analysis=$(echo "$api_response" | grep -o '"text": "[^"]*"' | sed 's/"text": "\(.*\)"/\1/' | sed 's/\\"/"/g')
    
    if [ -z "$first_analysis" ]; then
        echo "ERROR: Failed to extract analysis from API response."
        echo "Raw response:"
        echo "$api_response"
        first_analysis="# Error: Could not extract analysis for $TICKER"
    else
        echo "Successfully extracted analysis."
    fi
fi

echo "Initial analysis complete. Length: ${#first_analysis} characters"
echo "First 100 characters of analysis:"
echo "${first_analysis:0:100}..."

# Don't attempt the second API call for now, just use the first analysis
final_analysis="$first_analysis"

# Print only the final analysis
echo "========== COMPREHENSIVE FINANCIAL ANALYSIS OF $TICKER =========="
echo "$final_analysis"

# Save to file
echo "$final_analysis" > "${TICKER}_comprehensive_analysis_$(date +%Y%m%d).md"
echo ""
echo "Comprehensive analysis saved to ${TICKER}_comprehensive_analysis_$(date +%Y%m%d).md"

echo "Script completed successfully!"