#!/usr/bin/env bash
set -euo pipefail

# Your OpenAI API key
OPENAI_API_KEY="${OPENAI_API_KEY}"

# Function for debug logging to stderr only
debug() {
  echo "$@" >&2
}

# Check if ticker was provided
if [ $# -eq 0 ]; then
    debug "Please provide a ticker symbol. Usage: ./MarketMirror.sh TICKER"
    exit 1
fi

TICKER=$1
debug "Analyzing $TICKER..."
debug "Fetching data from Finviz..."

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

debug "Data retrieved successfully!"

# Create user prompt for first API call - ONLY asking for Analysis Table, not recommendation
debug "Creating first API prompt..."
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

Please create ONLY an analysis table in markdown format - do NOT wrap the table in markdown code blocks (no triple backticks). The table should list each metric alongside its current value from the data. For each metric, include a brief commentary or qualitative assessment that explains what this metric indicates about the company's financial position, maybe mention what is a good/ideal ratio for this company or other companies in the industry. Do not provide an overall recommendation yet.
EOF

# Create JSON payload for first API call
debug "Creating first API payload..."
cat > first_payload.json << EOF
{
  "model": "gpt-4.1",
  "input": [
    {
      "role": "user",
      "content": [
        {
          "type": "input_text",
          "text": $(cat first_prompt.txt | jq -Rs .)
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
  "temperature": 0.5,
  "max_output_tokens": 4000,
  "top_p": 1,
  "store": true
}
EOF

# Make first API call
debug "Making first API call to OpenAI..."
first_api_response=$(curl -s "https://api.openai.com/v1/responses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d @first_payload.json)

# Extract initial analysis - update to match Responses API format
debug "Extracting analysis from first response..."
first_analysis=$(echo "$first_api_response" | jq -r '.output[] | select(.type=="message") | .content[0].text // "Error: Failed to extract analysis"')

# Check for errors
if [[ "$first_analysis" == "Error: Failed to extract analysis" ]]; then
    debug "ERROR: Failed to get proper response from first OpenAI API call."
    debug "Raw API response:"
    debug "$first_api_response"
    exit 1
fi

# Save initial analysis to file
echo "$first_analysis" > "${TICKER}_initial_analysis.md" 2>/dev/null
debug "Initial analysis complete and saved to ${TICKER}_initial_analysis.md"

# Create prompt for second API call - now asking for research sections AND final recommendation
debug "Creating second API prompt with web search request..."
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

The Analysis Table section has already been created separately. YOU MUST NOT REGENERATE THE ANALYSIS TABLE.

Now, perform additional research and create ONLY the following sections:

## 2. Recent News
- Summarize key recent developments affecting the company.
- Focus on:
  - Regulatory issues
  - Layoffs or hiring
  - Management changes
  - Political or macroeconomic headwinds
  - Any impactful product launches or earnings surprises

Sources to use: Google News, MarketBeat, Crunchbase headlines, Yahoo Finance

## 3. Historical Valuation
- Retrieve the company's historical P/E ratios (ideally year-end values from 2019 to now).
- Comment on how the current P/E compares to its historical average and highs/lows, using the Finviz P/E of ${pe:-N/A} as the current value.
- Use Macrotrends or Gurufocus for accurate historical data only.

## 4. Competitor Comparison
- Present a clean comparison table of ${TICKER} and its main competitors with the following format:

| Company | P/E Ratio | P/S Ratio | Profit Margin | Market Cap (B) |
|---------|-----------|-----------|---------------|----------------|
| ${TICKER} | ${pe:-N/A} | ${ps:-N/A} | ${pm:-N/A} | ${mcap:-N/A} |
| Competitor 1 | value | value | value | value |
| Competitor 2 | value | value | value | value |

- For ${TICKER}, use ONLY the Finviz values already provided: P/E: ${pe:-N/A}, P/S: ${ps:-N/A}, Profit Margin: ${pm:-N/A}, Market Cap: ${mcap:-N/A}
- Highlight if ${TICKER} is overvalued or undervalued compared to peers.

## 5. Final Recommendation
- Based on ALL findings, provide a comprehensive recommendation:
  - Consider insider activity, historical valuation, news, and competitor positioning.
  - Is ${TICKER} a buy, hold, or sell?
  - How justified is the current valuation?
  - What risks or catalysts should investors watch?

Include a clear, actionable investment outlook in the final paragraph.

IMPORTANT: ONLY generate sections 2-5. Do NOT include section 1 (Analysis Table) in your response. This will be combined with an existing analysis table.
EOF

# Create JSON payload for second API call with web search
debug "Creating second API payload..."
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
debug "Making second API call with web search..."
second_api_response=$(curl -s "https://api.openai.com/v1/responses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d @second_payload.json)

# Save raw response for debugging
echo "$second_api_response" > second_response_raw.json 2>/dev/null

# Extract the enhanced analysis
# For the Responses API, we need to find the message content after the web_search_call
debug "Extracting enhanced analysis..."
enhanced_analysis=$(echo "$second_api_response" | jq -r '.output[] | select(.type=="message") | .content[0].text // empty')

# Check if extraction failed
if [[ -z "$enhanced_analysis" ]]; then
    debug "WARNING: Couldn't extract content from second API call. Using initial analysis only."
    enhanced_analysis="## 2. No Additional Research\n\nFailed to retrieve additional research data."
    
    # Print additional details for debugging
    debug "Error details or raw response saved to second_response_raw.json"
else
    debug "Successfully extracted enhanced analysis with web search results."
fi

# Remove any accidental analysis table from enhanced analysis
enhanced_analysis=$(echo "$enhanced_analysis" | sed '/## 1. Analysis Table/,/## 2/d' | sed '/# Analysis Table/,/# Recent/d')

# Combine the parts into the final analysis
debug "Combining parts into comprehensive analysis..."
final_analysis="# Comprehensive Financial Analysis of ${TICKER}

## 1. Analysis Table
${first_analysis}

${enhanced_analysis}"

# For debugging, save the complete analysis locally only
output_file="${TICKER}_comprehensive_analysis_$(date +%Y%m%d).md"
echo "$final_analysis" > "$output_file" 2>/dev/null
debug "Comprehensive analysis saved to $output_file"

# IMPORTANT: Print only the final analysis to stdout (this is what gets returned to the API)
echo "$final_analysis"