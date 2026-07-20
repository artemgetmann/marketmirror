#!/usr/bin/env bash
set -euo pipefail

# Your OpenAI API key
OPENAI_API_KEY="${OPENAI_API_KEY}"

# Define Artem's Philosophy Mode prompt
ARTEM_PROMPT="🧠 MarketMirror AI Prompt — Artem's Philosophy Mode\n\nYou are not a traditional financial analyst. You are a bold, logic-driven, high-performance investor trained in the mindset of someone achieving 41% annual returns through high-conviction plays in tech and large-cap growth stocks.\n\nThink like a modernized Warren Buffett — but in the age of Tesla, Meta, NVIDIA, and AI — with a bias for buying undervalued greatness during fear cycles. Avoid timid advice and don't waste time on "safe" or "balanced" portfolio allocations. You are not here to diversify for safety — you are here to identify asymmetric bets on companies that cannot go bankrupt but can be mispriced due to fear, misunderstanding, or media noise.\n\nFollow these principles:\n1. Buy when fear undervalues great tech companies (e.g., Meta after the Metaverse dip, Tesla during tariff fears).\n2. Ignore short-term noise. Focus on real-world fundamentals: cash flow, pricing power, product defensibility, and long-term tailwinds.\n3. Cash is a position when no high-conviction play is available. Avoid weak "filler" picks.\n4. Prioritize large-cap, liquid assets with long-term upside. This is not a penny stock game.\n5. Speak directly. Provide decisive opinions with clear risk/reward logic — like an investor deploying real capital, not a consultant hedging every word.\n\nWhen reviewing a stock:\n• Highlight what fear-based narrative might be distorting its price.\n• Explain the fundamentals that show long-term strength.\n• Conclude with a buy/hold/pass recommendation based on potential for outsized asymmetric upside.\n\nYour job is to be decisive, bold, and rational — just like Artem Getman."

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
debug "Fetching data from Edgar..."

# Fetch Finviz pages. The quote page has the richest labels, but Render/Finviz
# sometimes returns markup that breaks quote-page scraping. The screener views
# expose the key ratios in simpler tables, so use them as a resilient fallback.
QUOTE_URL="https://finviz.com/quote.ashx?t=${TICKER}&p=d"
SCREENER_VALUATION_URL="https://finviz.com/screener.ashx?v=121&t=${TICKER}"
SCREENER_OWNERSHIP_URL="https://finviz.com/screener.ashx?v=131&t=${TICKER}"
SCREENER_PROFITABILITY_URL="https://finviz.com/screener.ashx?v=161&t=${TICKER}"
USER_AGENT='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

raw=$(curl -sL --compressed -A "$USER_AGENT" "$QUOTE_URL")
valuation_raw=$(curl -sL --compressed -A "$USER_AGENT" "$SCREENER_VALUATION_URL")
ownership_raw=$(curl -sL --compressed -A "$USER_AGENT" "$SCREENER_OWNERSHIP_URL")
profitability_raw=$(curl -sL --compressed -A "$USER_AGENT" "$SCREENER_PROFITABILITY_URL")

raw_file=$(mktemp)
valuation_file=$(mktemp)
ownership_file=$(mktemp)
profitability_file=$(mktemp)
trap 'rm -f "$raw_file" "$valuation_file" "$ownership_file" "$profitability_file"' EXIT
printf '%s' "$raw" > "$raw_file"
printf '%s' "$valuation_raw" > "$valuation_file"
printf '%s' "$ownership_raw" > "$ownership_file"
printf '%s' "$profitability_raw" > "$profitability_file"

get_quote_value() {
    python3 - "$raw_file" "$1" <<'PY'
import html
import re
import sys

raw_path, target_label = sys.argv[1:3]
raw = open(raw_path, encoding='utf-8', errors='ignore').read()
pairs = re.findall(r'<div class="snapshot-td-label">(.*?)</div>\s*</td>\s*<td[^>]*>\s*<div class="snapshot-td-content">(.*?)</div>', raw, re.S)
values = {}
for label_html, value_html in pairs:
    label = re.sub(r'<[^>]+>', '', html.unescape(label_html))
    value = re.sub(r'<[^>]+>', '', html.unescape(value_html))
    label = ' '.join(label.split())
    value = ' '.join(value.split())
    values[label] = value
print(values.get(target_label, ''), end='')
PY
}

get_screener_value() {
    python3 - "$1" "$2" <<'PY'
import html
import re
import sys

raw_path, target_label = sys.argv[1:3]
raw = open(raw_path, encoding='utf-8', errors='ignore').read()
headers = [
    ' '.join(re.sub(r'<[^>]+>', '', html.unescape(h)).split())
    for h in re.findall(r'<th[^>]*>(.*?)</th>', raw, re.S)
]
rows = re.findall(r'<tr class="styled-row.*?</tr>', raw, re.S)
if not headers or not rows or target_label not in headers:
    print('', end='')
    raise SystemExit
cells = [
    ' '.join(re.sub(r'<[^>]+>', '', html.unescape(c)).split())
    for c in re.findall(r'<td[^>]*>(.*?)</td>', rows[0], re.S)
]
idx = headers.index(target_label)
print(cells[idx] if idx < len(cells) else '', end='')
PY
}

first_nonempty() {
    local value
    for value in "$@"; do
        if [[ -n "$value" && "$value" != "-" ]]; then
            printf '%s' "$value"
            return 0
        fi
    done
}

extract_sales_growth_5y() {
    local value
    value=$(get_quote_value "Sales past 5Y")
    if [[ -z "$value" ]]; then
        value=$(get_quote_value "Sales past 3/5Y")
        if [[ -n "$value" ]]; then
            grep -Eo -- '-?[0-9]+(\.[0-9]+)?%' <<<"$value" | tail -n1
            return 0
        fi
    fi
    if [[ -z "$value" ]]; then
        value=$(get_screener_value "$valuation_file" "Sales Past 5Y")
    fi
    printf '%s' "$value"
}

# Extract metrics. Prefer the quote page when available, then fall back to
# Finviz screener tables, which are simpler and currently more deployment-safe.
pe=$(first_nonempty "$(get_quote_value "P/E")" "$(get_screener_value "$valuation_file" "P/E")")
ps=$(first_nonempty "$(get_quote_value "P/S")" "$(get_screener_value "$valuation_file" "P/S")")
peg=$(first_nonempty "$(get_quote_value "PEG")" "$(get_screener_value "$valuation_file" "PEG")")
pfcf=$(first_nonempty "$(get_quote_value "P/FCF")" "$(get_screener_value "$valuation_file" "P/FCF")")
pb=$(first_nonempty "$(get_quote_value "P/B")" "$(get_screener_value "$valuation_file" "P/B")")
roe=$(first_nonempty "$(get_quote_value "ROE")" "$(get_screener_value "$profitability_file" "ROE")")
roa=$(first_nonempty "$(get_quote_value "ROA")" "$(get_screener_value "$profitability_file" "ROA")")
pm=$(first_nonempty "$(get_quote_value "Profit Margin")" "$(get_screener_value "$profitability_file" "Profit M")")
sales=$(extract_sales_growth_5y)
cr=$(first_nonempty "$(get_quote_value "Current Ratio")" "$(get_screener_value "$profitability_file" "Curr R")")
de=$(first_nonempty "$(get_quote_value "Debt/Eq")" "$(get_screener_value "$profitability_file" "Debt/Eq")")
insider=$(first_nonempty "$(get_quote_value "Insider Own")" "$(get_screener_value "$ownership_file" "Insider Own")")
insider_trans=$(first_nonempty "$(get_quote_value "Insider Trans")" "$(get_screener_value "$ownership_file" "Insider Trans")")
div_ttm=$(first_nonempty "$(get_quote_value "Dividend TTM")" "$(get_screener_value "$profitability_file" "Dividend")")
mcap=$(first_nonempty "$(get_quote_value "Market Cap")" "$(get_screener_value "$valuation_file" "Market Cap")")
option_short=$(get_quote_value "Option/Short")

debug "Extracted Finviz metrics: P/E=${pe:-N/A}, P/S=${ps:-N/A}, PEG=${peg:-N/A}, P/FCF=${pfcf:-N/A}, P/B=${pb:-N/A}, ROE=${roe:-N/A}, ROA=${roa:-N/A}, ProfitMargin=${pm:-N/A}, Sales5Y=${sales:-N/A}, CurrentRatio=${cr:-N/A}, DebtEq=${de:-N/A}, InsiderOwn=${insider:-N/A}, InsiderTrans=${insider_trans:-N/A}, Dividend=${div_ttm:-N/A}, MarketCap=${mcap:-N/A}, OptionShort=${option_short:-N/A}"

debug "Data retrieved successfully!"

# Create user prompt for first API call - ONLY asking for Analysis Table, not recommendation
debug "Creating first API prompt..."
cat > first_prompt.txt << EOF
$ARTEM_PROMPT

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
debug "Making first API call to API..."
first_api_response=$(curl -s "https://api.openai.com/v1/responses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d @first_payload.json)

# Extract initial analysis - update to match Responses API format
debug "Extracting analysis from first response..."
first_analysis=$(echo "$first_api_response" | jq -r '.output[] | select(.type=="message") | .content[0].text // "Error: Failed to extract analysis"')

# Check for errors
if [[ "$first_analysis" == "Error: Failed to extract analysis" ]]; then
    debug "ERROR: Failed to get proper response from first API call."
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
$ARTEM_PROMPT

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

IMPORTANT SOURCE GUIDELINES:
- Use high-quality financial sources like: CNBC, Bloomberg, Reuters, Yahoo Finance, Seeking Alpha, Morningstar, company IR pages, SEC filings, and earnings reports
- NEVER use Wikipedia for any part of this analysis
- Prioritize primary financial sources (company reports, SEC filings) over secondary sources
- For news, use established financial news outlets only

Now, perform additional research and create ONLY the following sections:

## 2. Recent News
- Summarize key recent developments affecting the company.
- Focus on:
  - Regulatory issues
  - Layoffs or hiring
  - Management changes
  - Political or macroeconomic headwinds
  - Any impactful product launches or earnings surprises

Sources to use: Google News, MarketBeat, CNBC, Bloomberg, Reuters, Seeking Alpha, Morningstar, company IR pages, and Yahoo Finance. DO NOT use Wikipedia as a source for any part of this analysis.

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
  - Rate your conviction level on a scale of 1-10 and explain why
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

# Check if most financial data is missing (indicating invalid ticker or data unavailable)
# Count how many N/A values appear in key financial metrics
NA_COUNT=0
for var in "$pe" "$ps" "$peg" "$pfcf" "$pb" "$roe" "$roa" "$pm" "$sales" "$cr" "$de"; do
    if [ -z "$var" ]; then
        NA_COUNT=$((NA_COUNT + 1))
    fi
done

# Heuristic: If >7 out of 11 key ratios are 'N/A', assume data is invalid or missing.
WARNING_BANNER=""
if [ $NA_COUNT -gt 7 ]; then
    debug "Warning: Most financial data is missing for ${TICKER}. Possible invalid ticker."
    WARNING_BANNER="> ⚠️ **Financial data unavailable for ${TICKER}.** Key ratios (like P/E, P/S, P/B) are missing—this often happens if the ticker is invalid, an ETF, or unsupported.  
> With missing financial data, **users should be cautious** about relying on this analysis and double-check all information. The assessment may be incomplete or less reliable."
fi

# Combine the parts into the final analysis
debug "Combining parts into comprehensive analysis..."
final_analysis="# Comprehensive Financial Analysis of ${TICKER}

${WARNING_BANNER}

## 1. Analysis Table
${first_analysis}

${enhanced_analysis}



######

*MarketMirror is not a financial advisor. It doesn't wear suits, and it won't tell you what to do. Always double-check the numbers — even AI makes mistakes sometimes. Think for yourself — that's kind of the whole point. 😉*"

# Remove all Wikipedia references from final analysis
debug "Removing Wikipedia references..."

# Replace any direct URLs to Wikipedia (handles markdown links)
final_analysis=$(echo "$final_analysis" | sed -E 's|https?://([^) ]*wikipedia[^) ]*)|Source|g')

# Replace any text matching en.wikipedia.org pattern
final_analysis=$(echo "$final_analysis" | sed -E 's|en\.wikipedia\.org[^) ]*|Source|g')

# Replace citations that explicitly mention Wikipedia
final_analysis=$(echo "$final_analysis" | sed -E 's|\([^)]*[Ww]ikipedia[^)]*\)|\(Source\)|g')

# Fix any "Source: Source" redundancies
final_analysis=$(echo "$final_analysis" | sed -E 's|Source: Source|Source|g')

# Ensure proper parentheses pairing around Source references
final_analysis=$(echo "$final_analysis" | sed -E 's|\(Source$|\(Source\)|g')
final_analysis=$(echo "$final_analysis" | sed -E 's|\(Source |\(Source\) |g')

# For debugging, save the complete analysis locally only
output_file="${TICKER}_comprehensive_analysis_$(date +%Y%m%d).md"
echo "$final_analysis" > "$output_file" 2>/dev/null
debug "Comprehensive analysis saved to $output_file"

# IMPORTANT: Print only the final analysis to stdout (this is what gets returned to the API)
echo "$final_analysis"