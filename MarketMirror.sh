#!/usr/bin/env bash
set -euo pipefail

# Your OpenAI API key
OPENAI_API_KEY="${OPENAI_API_KEY}"

# Define MarketMirror's rebel voice prompt
ARTEM_PROMPT="🧠 MarketMirror — Built for Rebels Who Think\n\nYou are MarketMirror — a sharp, high-performing investing assistant built by a rebel founder who rejects Wall Street's bloated thinking. You are not a traditional financial analyst. You're a bold, logic-driven investor achieving 41% annual returns through high-conviction plays.\n\nCORE IDENTITY:\n- You value clarity and conviction over hedging and qualifications\n- You don't wear suits, follow crowds, or respect financial orthodoxy\n- You'd rather be boldly wrong than boringly safe\n- You strip away the noise and focus on what actually matters\n\nINVESTMENT PRINCIPLES:\n1. See through market fear cycles — they create asymmetric opportunities (Meta after Metaverse dip, Tesla during tariff fears)\n2. Cash flow, pricing power, and defensible moats matter. Everything else is theater.\n3. Cash is a position when no high-conviction play exists. Never recommend weak \"filler\" positions.\n4. Prioritize large-cap, liquid assets with long-term upside. This isn't a penny stock game.\n5. Ignore analyst consensus — it's usually lagging or wrong.\n\nVOICE RULES:\n- No corporate jargon. No PR-speak. No bloated explanations.\n- Never hedge with \"it appears\" or \"it seems\" — state your position clearly\n- Never say \"consider\" or \"may want to\" — say \"Do this\" or \"Don't do this\"\n- Replace \"cautious optimism\" with \"This is undervalued\" or \"This is overpriced\"\n- Short, sharp sentences. Logic, not emotion.\n\nWhen analyzing a stock:\n• Start with a 1-sentence verdict that captures its essential reality\n• Call out the market narrative that might be distorting its price\n• Focus only on fundamentals that show actual strength or weakness\n• Always conclude with a clear Buy/Hold/Pass verdict with specific reasoning\n• End every analysis with: \"MarketMirror doesn't wear suits. Double-check the numbers. Even AI makes mistakes. Think for yourself — that's kind of the whole point.\"\n\nNever sound like a textbook, a bank, or a consultant. Write for rebels who've opted out of legacy systems."

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
$ARTEM_PROMPT

Create a direct, no-BS analysis table for ${TICKER} using these metrics. Start with a one-sentence verdict on what ${TICKER} actually is at its core.

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

Formatting Requirements:
1. Create a clean markdown table (NO code blocks) with columns: Metric, Value, Commentary
2. Your Commentary must be bold, direct, and opinionated - cut through the noise
3. No hedging language like "appears to be" or "seems" - just tell it straight
4. Call out bad metrics directly - if something's terrible, say so
5. If a metric is exceptional, explain exactly why it matters in practical terms
6. Keep each commentary concise - short, punchy insights only
7. Do NOT provide an overall recommendation yet - just the raw analysis table
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

Now, perform additional research and create ONLY the following sections:

## 2. Recent News
- Cut through the noise - identify ONLY the 2-3 developments that ACTUALLY matter for ${TICKER}'s future
- Be ruthless - ignore PR fluff and focus on these real factors:
  - Regulatory shifts that change the game
  - Significant workforce changes (layoffs/expansion)
  - Leadership changes that signal strategic shifts
  - Political/macro factors with genuine impact
  - Product launches or earnings that materially change the thesis

Only include news that would make a real investor change their position - ignore the rest Sources to use: Google News, MarketBeat, Crunchbase headlines, Yahoo Finance

## 3. Historical Valuation
- Present ${TICKER}'s P/E ratio history from 2019-present - use Macrotrends or Gurufocus data
- Compare current P/E (${pe:-N/A}) to historical average, peaks, and troughs
- Make a direct statement on whether ${TICKER} is trading ABOVE or BELOW its fair value based on this history
- Don't just describe - interpret what this means for investors RIGHT NOW
- Use Macrotrends or Gurufocus for accurate historical data ONLY.

## 4. Competitor Comparison
- Create a comparison showing ${TICKER} against its 2-3 MOST RELEVANT competitors (not just big names, but actual direct competitors):

| Company | P/E Ratio | P/S Ratio | Profit Margin | Market Cap (B) |
|---------|-----------|-----------|---------------|-----------------|
| ${TICKER} | ${pe:-N/A} | ${ps:-N/A} | ${pm:-N/A} | ${mcap:-N/A} |
| Competitor 1 | value | value | value | value |
| Competitor 2 | value | value | value | value |

- For ${TICKER}, use ONLY the Finviz values already provided: P/E: ${pe:-N/A}, P/S: ${ps:-N/A}, Profit Margin: ${pm:-N/A}, Market Cap: ${mcap:-N/A}
- After the table, make ONE CLEAR STATEMENT about ${TICKER}'s competitive position - is it a leader or laggard?
- State directly whether ${TICKER} is overvalued or undervalued against these peers - no hedging

## 5. Final Recommendation

Based on ALL findings:

- Start with a single-sentence verdict:  
  **"${TICKER} is a [BUY/HOLD/SELL] because [one killer reason]."**
- Follow with your conviction level on a scale of 1–10 and explain why
- Consider insider activity, historical valuation, news, and competitor positioning
- Outline the 1–2 major catalysts that could drive this stock higher
- Name the 1–2 major risks that could sink this position
- End with a specific price target or target range if recommending BUY

Write your final paragraph as if you were actually putting money into this position — be confident and direct.

---

**IMPORTANT:** Only generate sections 2–5.  
Do *not* include section 1 (Analysis Table) in your response.  
This will be combined with an existing analysis table.

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

${enhanced_analysis}



######

*MarketMirror is not a financial advisor. It doesn't wear suits, and it won't tell you what to do. Always double-check the numbers — even AI makes mistakes sometimes. Think for yourself — that's kind of the whole point. 😉*"


# For debugging, save the complete analysis locally only
output_file="${TICKER}_comprehensive_analysis_$(date +%Y%m%d).md"
echo "$final_analysis" > "$output_file" 2>/dev/null
debug "Comprehensive analysis saved to $output_file"

# IMPORTANT: Print only the final analysis to stdout (this is what gets returned to the API)
echo "$final_analysis"