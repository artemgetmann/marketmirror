#!/usr/bin/env bash
set -euo pipefail

# Your OpenAI API key
OPENAI_API_KEY="${OPENAI_API_KEY}"

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

# Create user prompt for first API call - ONLY asking for Analysis Table, not recommendation
echo "Creating first API prompt..."
cat > first_prompt.txt << EOF
As a financial analyst, please provide an analysis table for ${TICKER} using the following Finviz data:

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

Please create ONLY an analysis table in markdown format. The table should list each metric alongside its current value from the data. For each metric, include a brief commentary or qualitative assessment that explains what this metric indicates about the company's financial position. Do not provide an overall recommendation yet.
EOF

# Create JSON payload for first API call
echo "Creating first API payload..."
cat > first_payload.json << EOF
{
  "model": "gpt-4o",
  "temperature": 0.5,
  "max_tokens": 4000,
  "messages": [
    {
      "role": "system",
      "content": "You are a financial analyst with expertise in stock analysis."
    },
    {
      "role": "user",
      "content": $(cat first_prompt.txt | jq -Rs .)
    }
  ]
}
EOF

# Make first API call
echo "Making first API call to OpenAI..."
first_api_response=$(curl -s "https://api.openai.com/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d @first_payload.json)

# Extract initial analysis
echo "Extracting analysis from first response..."
first_analysis=$(echo "$first_api_response" | jq -r '.choices[0].message.content // "Error: Failed to extract analysis"')

# Check for errors
if [[ "$first_analysis" == "Error: Failed to extract analysis" ]]; then
    echo "ERROR: Failed to get proper response from first OpenAI API call."
    echo "Raw API response:"
    echo "$first_api_response"
    exit 1
fi

# Save initial analysis to file
echo "$first_analysis" > "${TICKER}_initial_analysis.md"
echo "Initial analysis complete and saved to ${TICKER}_initial_analysis.md"

# Create prompt for second API call - now asking for research sections AND final recommendation
echo "Creating second API prompt with web search request..."
cat > second_prompt.txt << EOF
I have analyzed the financial metrics for ${TICKER} from Finviz with these values:

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

Here is the analysis table with commentary on each metric:

---
${first_analysis}
---

Now, perform additional research and create the following sections:

## 2. Recent News
- Summarize key recent developments affecting the company.
- Focus on:
  - Regulatory issues
  - Layoffs or hiring
  - Management changes
  - Political or macroeconomic headwinds
  - Any impactful product launches or earnings surprises

Sources to use: Google News, MarketBeat, Crunchbase headlines, Yahoo Finance (DO NOT USE Wikipedia)

## 3. Historical Valuation
- Retrieve the company's historical P/E ratios (ideally year-end values from 2019 to now).
- Comment on how the current P/E compares to its historical average and highs/lows, using the Finviz P/E of ${pe:-N/A} as the current value.
- Use Macrotrends or Gurufocus for accurate historical data only.

## 4. Competitor Comparison
- Identify main competitors in the same sector.
- For each competitor (not ${TICKER}), provide:
  - P/E Ratio
  - P/S Ratio
  - Profit Margin
  - Market Cap
- For ${TICKER}, use ONLY the Finviz values already provided: P/E: ${pe:-N/A}, P/S: ${ps:-N/A}, Profit Margin: ${pm:-N/A}, Market Cap: ${mcap:-N/A}
- Highlight if ${TICKER} is overvalued or undervalued compared to peers.

Use: Jika.io, https://www.jika.io/quote/${TICKER}/competitors, Gurufocus https://www.gurufocus.com/stock/${TICKER}/summary?search=${TICKER}, or Finviz directly when possible.

## 5. Final Recommendation
- Based on ALL findings (the metrics in the analysis table plus your new research), provide a comprehensive recommendation:
  - Consider insider activity, historical valuation, news, and competitor positioning.
  - Is ${TICKER} a buy, hold, or sell?
  - How justified is the current valuation?
  - What risks or catalysts should investors watch?

Include a clear, actionable investment outlook in the final paragraph.

IMPORTANT: Do NOT recreate the Analysis Table. Focus ONLY on generating sections 2-5 as requested, using the Finviz data as authoritative.
EOF

# Create JSON payload for second API call with web search
echo "Creating second API payload..."
cat > second_payload.json << EOF
{
  "model": "gpt-4.1",
  "input": [
    {
      "role": "user",
      "content": [
        {
          "type": "input_text",
          "text": $(cat second_prompt.txt | jq -Rs .)
        }
      ]
    }
  ],
  "text": {
    "format": {
      "type": "text"
    }
  },
  "reasoning": {},
  "tools": [
    {
      "type": "web_search_preview",
      "user_location": {
        "type": "approximate"
      },
      "search_context_size": "medium"
    }
  ],
  "temperature": 0.7,
  "max_output_tokens": 4000,
  "top_p": 1,
  "store": true
}
EOF

# Make second API call
echo "Making second API call with web search..."
second_api_response=$(curl -s "https://api.openai.com/v1/responses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d @second_payload.json)

# Save raw response for debugging
echo "$second_api_response" > second_response_raw.json

# Extract the enhanced analysis
# For the Responses API, we need to find the message content after the web_search_call
echo "Extracting enhanced analysis..."
enhanced_analysis=$(echo "$second_api_response" | jq -r '.output[] | select(.type=="message") | .content[0].text // empty')

# Check if extraction failed
if [[ -z "$enhanced_analysis" ]]; then
    echo "WARNING: Couldn't extract content from second API call. Using initial analysis only."
    enhanced_analysis="## 2. No Additional Research\n\nFailed to retrieve additional research data."
    
    # Print additional details for debugging
    echo "Error details or raw response saved to second_response_raw.json"
else
    echo "Successfully extracted enhanced analysis with web search results."
fi

# Remove any accidental analysis table from enhanced analysis
enhanced_analysis=$(echo "$enhanced_analysis" | sed '/## 1. Analysis Table/,/## 2/d' | sed '/# Analysis Table/,/# Recent/d')

# Combine the parts into the final analysis
echo "Combining parts into comprehensive analysis..."
final_analysis="# Comprehensive Financial Analysis of ${TICKER}

## 1. Analysis Table
${first_analysis}

${enhanced_analysis}"

# Print the final analysis
echo "========== COMPREHENSIVE FINANCIAL ANALYSIS OF $TICKER =========="
echo "$final_analysis"

# Save to file
output_file="${TICKER}_comprehensive_analysis_$(date +%Y%m%d).md"
echo "$final_analysis" > "$output_file"
echo ""
echo "Comprehensive analysis saved to $output_file"