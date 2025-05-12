#!/usr/bin/env bash
set -euo pipefail

# Your API key - use the one that worked in the debug script
API_KEY="${CLAUDE_API_KEY}"
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

# Extract metrics
pe=$(sed -nE 's/.*>P\/E<\/td>[^>]*>[^0-9]*([0-9]+(\.[0-9]+)?)<.*/\1/p' <<<"$raw")
ps=$(sed -nE 's/.*>P\/S<\/td>[^>]*>[^0-9]*([0-9]+(\.[0-9]+)?)<.*/\1/p' <<<"$raw")
peg=$(sed -nE 's/.*>PEG<\/td>[^>]*>[^0-9]*([0-9]+(\.[0-9]+)?)<.*/\1/p' <<<"$raw")
pfcf=$(sed -nE 's/.*>P\/FCF<\/td>[^>]*>[^0-9]*([0-9]+(\.[0-9]+)?)<.*/\1/p' <<<"$raw")
pb=$(sed -nE 's/.*>P\/B<\/td>[^>]*>[^0-9]*([0-9]+(\.[0-9]+)?)<.*/\1/p' <<<"$raw")
roe=$(sed -En 's/.*>ROE<\/td><td[^>]*>[^0-9]*([0-9]+(\.[0-9]+)?%).*/\1/p' <<<"$raw")
roa=$(sed -nE 's/.*>ROA<\/td><td[^>]*>[^0-9]*([0-9]+(\.[0-9]+)?%).*/\1/p' <<<"$raw")
pm=$(sed -nE 's/.*>Profit Margin<\/td><td[^>]*>[^0-9]*([0-9]+(\.[0-9]+)?%).*/\1/p' <<<"$raw")
sales=$(sed -nE 's/.*>Sales past 5Y<\/td><td[^>]*>[^0-9]*([0-9]+(\.[0-9]+)?%).*/\1/p' <<<"$raw")
cr=$(sed -nE 's/.*>Current Ratio<\/td>[^>]*>[^0-9]*([0-9]+(\.[0-9]+)?)<.*/\1/p' <<<"$raw")
de=$(sed -nE 's/.*>Debt\/Eq<\/td>[^>]*>[^0-9]*([0-9]+(\.[0-9]+)?)<.*/\1/p' <<<"$raw")
insider=$(sed -nE 's/.*>Insider Own<\/td><td[^>]*>[^0-9]*([0-9]+(\.[0-9]+)?%).*/\1/p' <<<"$raw")
div_ttm=$(sed -nE '/Dividend TTM/ s/.*<b>([^<]+)<\/b>.*/\1/p' <<<"$raw")
mcap=$(sed -En 's/.*>Market Cap<\/td><td[^>]*>[^0-9]*([0-9]+(\.[0-9]+)?[BM]).*/\1/p' <<<"$raw")
option_short=$(sed -nE '/Option\/Short/ s/.*<b>([^<]+)<\/b>.*/\1/p' <<<"$raw")
insider_trans=$(sed -nE 's/.*>Insider Trans<\/td>[^>]*>[^-0-9]*(-?[0-9]+(\.[0-9]+)?%).*/\1/p' <<<"$raw")

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
- P/E (TTM): ${pe:-N/A}
- P/S: ${ps:-N/A}
- PEG Ratio: ${peg:-N/A}
- P/FCF: ${pfcf:-N/A}
- P/B: ${pb:-N/A}

Profitability:
- ROE: ${roe:-N/A}
- ROA: ${roa:-N/A}
- Profit Margin: ${pm:-N/A}
- Sales Growth (5Y): ${sales:-N/A}

Liquidity & Leverage:
- Current Ratio: ${cr:-N/A}
- Debt/Equity: ${de:-N/A}

Qualitative Factors:
- Insider Ownership: ${insider:-N/A}
- Insider Transactions: ${insider_trans:-N/A}
- Dividend TTM: ${div_ttm:-No Dividend}
- Market Cap: ${mcap:-N/A}
- Option/Short: ${option_short:-N/A}

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
api_response=$(curl -s "$ENDPOINT" \
  -H "x-api-key: $API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d @payload.json)

# Debug output
echo "DEBUG: API Response structure:"
echo "$api_response" | jq 'keys' || echo "Failed to parse API response"
echo "DEBUG: Content field structure:"
echo "$api_response" | jq '.content | if type == "array" then "Array of \(length) items" else type end' || echo "No .content field or not parsable"
echo "DEBUG: Trying to view first content item:"
echo "$api_response" | jq '.content[0]' || echo "Failed to access first content item"

# Extract the initial analysis using appropriate jq logic based on the API response
first_analysis=$(echo "$api_response" | jq -r '.content[0].text // "Error extracting content"')

echo "Initial analysis complete. Performing deeper research..."

# Create second prompt with follow-up research request
cat > payload_followup.json << EOF
{
  "model": "claude-3-7-sonnet-20250219",
  "max_tokens": 4000,
  "temperature": 0.5,
  "messages": [
    {
      "role": "user",
      "content": "You are a financial analyst. We previously analyzed ${TICKER} and generated this report:

---
${first_analysis}
---

Now find me:

1. Look up insider ownership – Find and fill in the missing data for insider ownership.
2. Research ${TICKER} news – Gather recent news about ${TICKER}, including political and economic factors affecting the company.
3. Analyze historical P/E ratios – Retrieve and include historical price-to-earnings (P/E) ratios for ${TICKER}.
4. Update the analysis – Integrate the above findings into the conclusion, considering how news, politics, and historical financial data impact ${TICKER}'s outlook.

* Look at competitors of ${TICKER} using jika.io, marketbeat,
  o Sometimes the best way is actually just google and GPT them cause these are often wrong
* Check historical ratios (p/e,p/s,p/b etc.) of ${TICKER} to see if it's overvalued using Macrotrends
  o It has one of the most accurate P/E ratios
  o If you see low stock price and high P/E means overvalued
  o Check all your other ratios as well, side by side with competitors of your chosen company
* GuruFocus – compare historical ratios, P/E, forward P/E etc. and vs its industry
  o Tells you if overvalued or if there are better companies in the industry
  o Also good for quick analysis of a company, gives you all ratios etc.
  o Take a look at all your ratios compared to industry and history as well
* Crunchbase – tells you about managerial hires, layoffs, and company news
* Cash-flow might be worth giving a glance
* Maybe look into the P/FCF Ratio and DCF

Merge all findings into one cohesive, updated report and revise the final recommendation accordingly."
    }
  ]
}
EOF

# Make the second API call
echo "Conducting deeper research and analysis..."
second_response=$(curl -s "$ENDPOINT" \
  -H "x-api-key: $API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d @payload_followup.json)

# Debug output for second response
echo "DEBUG: Second API Response structure:"
echo "$second_response" | jq 'keys' || echo "Failed to parse second API response"
echo "DEBUG: Second response content field structure:"
echo "$second_response" | jq '.content | if type == "array" then "Array of \(length) items" else type end' || echo "No .content field or not parsable"
echo "DEBUG: Trying to view first content item in second response:"
echo "$second_response" | jq '.content[0]' || echo "Failed to access first content item in second response"

# Extract the final analysis using appropriate jq logic based on the API response
final_analysis=$(echo "$second_response" | jq -r '.content[0].text // "Error extracting content"')

# Print only the final analysis
echo "========== COMPREHENSIVE FINANCIAL ANALYSIS OF $TICKER =========="
echo "$final_analysis"

# Save to file
echo "$final_analysis" > "${TICKER}_comprehensive_analysis_$(date +%Y%m%d).md"
echo ""
echo "Comprehensive analysis saved to ${TICKER}_comprehensive_analysis_$(date +%Y%m%d).md"