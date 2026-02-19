/**
 * Mock responses for MarketMirror API testing
 * Used when MOCK_API_CALLS=true in .env
 */

// Mock stock analyses for common tickers
const mockAnalyses = {
  // Apple mock analysis
  'AAPL': `# Comprehensive Financial Analysis of AAPL

## 1. Analysis Table
| Metric                   | Value         | Commentary / Qualitative Assessment                                                                                     |
|--------------------------|--------------|------------------------------------------------------------------------------------------------------------------------|
| P/E (TTM)                | 30.47        | Elevated vs. S&P 500 average; reflects premium market confidence in Apple's earnings durability and brand power.        |
| P/S                      | 7.28         | High for hardware; signals strong pricing power and market dominance, but leaves less margin for error on growth.      |
| PEG Ratio                | 3.73         | Well above 1; market expects slower growth relative to valuation, suggesting future growth is already priced in.        |
| P/FCF                    | 29.61        | Expensive, but justified by Apple's consistent cash generation and capital return prowess.                              |
| P/B                      | 43.67        | Exceptionally high; Apple's value is in intangible assets and ecosystem, not book equity—typical of dominant tech.      |

## 2. Recent News

**Regulatory Issues and Tariffs**

President Donald Trump has threatened to impose a 25% tariff on Apple products if the company does not relocate iPhone manufacturing to the United States. This announcement led to a decline of over 2% in Apple's stock price at the opening of Wall Street.

## 3. Final Recommendation

Given the current P/E ratio of 30.47, which is above the historical average but below recent highs, and considering the competitive landscape, a **hold** recommendation is appropriate. Investors should monitor developments related to tariffs, manufacturing shifts, and product launches, as these factors could significantly impact Apple's financial performance and stock valuation.

###### 

*MarketMirror is not a financial advisor. It doesn't wear suits, and it won't tell you what to do. Always double-check the numbers — even AI makes mistakes sometimes. Think for yourself — that's kind of the whole point. 😉*`,

  // Tesla mock analysis
  'TSLA': `# Comprehensive Financial Analysis of TSLA

## 1. Analysis Table
| Metric                     | Value         | Commentary / Qualitative Assessment                                                                                          |
|----------------------------|--------------|-----------------------------------------------------------------------------------------------------------------------------|
| P/E (TTM)                  | 186.61       | Exceptionally high — reflects extreme growth expectations and premium for future earnings; well above industry average.      |
| P/S                        | 11.40        | Price/sales is rich; market is pricing in significant future revenue growth.                                                |
| PEG Ratio                  | 10.01        | Indicates the stock is expensive even relative to its growth rate; ideally, a PEG near 1 is considered fair value.          |
| P/FCF                      | 160.99       | Very high; suggests market is paying a steep premium for current free cash flow, betting on explosive future FCF growth.    |
| P/B                        | 14.64        | Substantially above typical automaker ratios; signals market confidence in intangible assets and future innovation.          |

## 2. Recent News

**Product Launches:**

- **Cybertruck Delivery:** In November 2024, Tesla began shipping the highly anticipated Cybertruck from its Gigafactory Texas, marking a significant milestone in its product lineup.

- **Autonomous Vehicles:** In October 2024, Tesla unveiled concept versions of the Cybercab and Robovan, integral to its future ride-hailing service, the Tesla Network. Production is targeted for 2026.

## 3. Final Recommendation

**Recommendation:** Hold. While Tesla's long-term prospects remain strong, current valuations and operational challenges warrant caution. Investors should monitor profit margins, executive stability, and regulatory developments closely.

###### 

*MarketMirror is not a financial advisor. It doesn't wear suits, and it won't tell you what to do. Always double-check the numbers — even AI makes mistakes sometimes. Think for yourself — that's kind of the whole point. 😉*`,

  // Microsoft mock analysis
  'MSFT': `# Comprehensive Financial Analysis of MSFT

## 1. Analysis Table
| Metric                     | Value         | Commentary / Qualitative Assessment                                                                                   |
|----------------------------|--------------|----------------------------------------------------------------------------------------------------------------------|
| P/E (TTM)                  | 38.53        | Above industry average, reflecting market's premium valuation on Microsoft's cloud growth and AI positioning          |
| P/S                        | 13.21        | High, but justified given software economics and recurring revenue model                                              |
| PEG Ratio                  | 2.35         | Above 1, suggesting the stock trades at a premium to its growth rate                                                  |
| P/FCF                      | 35.47        | Elevated but reasonable given Microsoft's cash generation capabilities and recurring revenue                          |
| P/B                        | 12.82        | High book value multiple reflecting Microsoft's intellectual property and intangible assets                           |

## 2. Recent News

**Azure and AI Growth:**

Microsoft continues to strengthen its position in the cloud market, with Azure revenue growing 25% year-over-year. The company has integrated advanced AI capabilities across its product line.

**Regulatory Approval:**

Microsoft received final regulatory approval for its acquisition of Activision Blizzard, expanding its gaming portfolio and cloud gaming capabilities.

## 3. Final Recommendation

**Recommendation:** Buy. Microsoft's cloud dominance, AI integration, and recurring revenue model justify its premium valuation. The company is well-positioned to capitalize on enterprise digital transformation trends.

###### 

*MarketMirror is not a financial advisor. It doesn't wear suits, and it won't tell you what to do. Always double-check the numbers — even AI makes mistakes sometimes. Think for yourself — that's kind of the whole point. 😉*`,

  // Amazon mock analysis
  'AMZN': `# Comprehensive Financial Analysis of AMZN

## 1. Analysis Table
| Metric                     | Value         | Commentary / Qualitative Assessment                                                                                 |
|----------------------------|--------------|-------------------------------------------------------------------------------------------------------------------|
| P/E (TTM)                  | 45.67        | High but reflective of Amazon's multiple growth vectors across e-commerce, AWS, advertising, and logistics         |
| P/S                        | 3.12         | Reasonable for a company with Amazon's scale and diverse revenue streams                                           |
| PEG Ratio                  | 1.98         | Slightly high but acceptable given the company's reinvestment strategy and multiple growth vectors                 |
| P/FCF                      | 30.54        | Premium valuation on cash flow justified by AWS margins and improving e-commerce profitability                     |
| P/B                        | 8.76         | Reflects significant physical infrastructure investments alongside digital assets                                  |

## 2. Recent News

**AWS Expansion:**

Amazon Web Services announced five new regions, expanding its global infrastructure footprint to support growing cloud demand.

**Logistics Network:**

Amazon has completed its largest logistics network expansion, reducing delivery times and increasing capacity ahead of the holiday season.

## 3. Final Recommendation

**Recommendation:** Buy. Amazon's multiple growth engines, improving margins, and dominant positions in e-commerce and cloud computing provide substantial runway for continued growth.

###### 

*MarketMirror is not a financial advisor. It doesn't wear suits, and it won't tell you what to do. Always double-check the numbers — even AI makes mistakes sometimes. Think for yourself — that's kind of the whole point. 😉*`,

  // Google/Alphabet mock analysis
  'GOOGL': `# Comprehensive Financial Analysis of GOOGL

## 1. Analysis Table
| Metric                     | Value         | Commentary / Qualitative Assessment                                                                              |
|----------------------------|--------------|----------------------------------------------------------------------------------------------------------------|
| P/E (TTM)                  | 25.34        | Reasonable multiple given Google's market dominance and growth prospects                                        |
| P/S                        | 6.73         | Justified by high-margin advertising business and growing cloud segment                                         |
| PEG Ratio                  | 1.62         | Indicates fair valuation relative to growth rate                                                                |
| P/FCF                      | 22.31        | Strong cash generation capabilities with reasonable valuation multiple                                          |
| P/B                        | 5.92         | Moderate book value multiple reflecting substantial assets                                                      |

## 2. Recent News

**AI Integration:**

Google has released several new AI features for its search and advertising platforms, leveraging its substantial research investments.

**Antitrust Developments:**

The company continues to navigate regulatory scrutiny with a recent settlement regarding its advertising technology business.

## 3. Final Recommendation

**Recommendation:** Buy. Google's reasonable valuation, search dominance, growing cloud business, and AI innovations position it well for continued success.

###### 

*MarketMirror is not a financial advisor. It doesn't wear suits, and it won't tell you what to do. Always double-check the numbers — even AI makes mistakes sometimes. Think for yourself — that's kind of the whole point. 😉*`
};

// Mock follow-up responses
// Key: Regular expression pattern to match questions
// Value: Response to provide
const mockFollowupResponses = {
  'dividend|yield|payout': `Based on the latest data, the company has maintained a modest dividend yield with consistent payout increases over the past 5 years. The current annual dividend represents approximately 25% of earnings, leaving room for both future increases and continued reinvestment in growth initiatives.

###### 

*MarketMirror is not a financial advisor. It doesn't wear suits, and it won't tell you what to do. Always double-check the numbers — even AI makes mistakes sometimes. Think for yourself — that's kind of the whole point. 😉*`,

  'debt|leverage|balance sheet': `The company maintains a strong balance sheet with a debt-to-equity ratio well below industry averages. Most of the outstanding debt is long-term with favorable interest rates, and the company's strong cash position and cash flow generation provide substantial coverage for existing obligations.

###### 

*MarketMirror is not a financial advisor. It doesn't wear suits, and it won't tell you what to do. Always double-check the numbers — even AI makes mistakes sometimes. Think for yourself — that's kind of the whole point. 😉*`,

  'competition|competitor|market share': `The company faces increasing competition but maintains its leadership position with approximately 45% market share in its primary segments. Key competitors have been gaining ground in specific niches, but the company's ecosystem advantages and brand loyalty continue to provide significant competitive moats.

###### 

*MarketMirror is not a financial advisor. It doesn't wear suits, and it won't tell you what to do. Always double-check the numbers — even AI makes mistakes sometimes. Think for yourself — that's kind of the whole point. 😉*`,

  'growth|expansion|future': `Growth prospects remain strong, with the company expanding into adjacent markets and investing heavily in next-generation technologies. Analysts project 15-20% annual revenue growth over the next three years, driven by both core business strength and new product categories.

###### 

*MarketMirror is not a financial advisor. It doesn't wear suits, and it won't tell you what to do. Always double-check the numbers — even AI makes mistakes sometimes. Think for yourself — that's kind of the whole point. 😉*`,

  'management|leadership|ceo': `The current management team has a strong track record of execution and capital allocation. The CEO's strategic vision has been consistently implemented, resulting in above-industry-average returns on invested capital. Recent executive additions from competitors have strengthened the leadership bench.

###### 

*MarketMirror is not a financial advisor. It doesn't wear suits, and it won't tell you what to do. Always double-check the numbers — even AI makes mistakes sometimes. Think for yourself — that's kind of the whole point. 😉*`,

  'risk|downside|concern': `Key risks include regulatory scrutiny in major markets, supply chain vulnerabilities exposed during recent global disruptions, and increasing R&D costs to maintain technological leadership. However, the company's financial strength and market position provide substantial buffers against these challenges.

###### 

*MarketMirror is not a financial advisor. It doesn't wear suits, and it won't tell you what to do. Always double-check the numbers — even AI makes mistakes sometimes. Think for yourself — that's kind of the whole point. 😉*`,

  // Default fallback response for unmatched questions
  'default': `Based on the available information, the company appears well-positioned in its market with solid fundamentals supporting its current valuation. While there are always sector-specific challenges to monitor, the overall trajectory remains positive for investors with appropriate time horizons.

###### 

*MarketMirror is not a financial advisor. It doesn't wear suits, and it won't tell you what to do. Always double-check the numbers — even AI makes mistakes sometimes. Think for yourself — that's kind of the whole point. 😉*`
};

/**
 * Get a mock analysis for a ticker
 * @param {string} ticker - The ticker symbol
 * @returns {string} Mock analysis text or default if ticker not found
 */
function getMockAnalysis(ticker) {
  const upperTicker = ticker.toUpperCase();
  
  // Return specific mock if available
  if (mockAnalyses[upperTicker]) {
    return mockAnalyses[upperTicker];
  }
  
  // Otherwise, generate a generic mock
  return `# Comprehensive Financial Analysis of ${upperTicker}

## 1. Company Overview
${upperTicker} is a company operating in its industry with various products and services.

## 2. Financial Metrics
The company has a P/E ratio that reflects its current market expectations and growth prospects.

## 3. Recent Developments
Recent news suggests the company is pursuing strategic initiatives to enhance shareholder value.

## 4. Investment Recommendation
Based on the current metrics and market position, a HOLD recommendation is appropriate for ${upperTicker}.

###### 

*MarketMirror is not a financial advisor. It doesn't wear suits, and it won't tell you what to do. Always double-check the numbers — even AI makes mistakes sometimes. Think for yourself — that's kind of the whole point. 😉*`;
}

/**
 * Get a mock follow-up response based on the question
 * @param {string} question - The follow-up question
 * @param {string} ticker - The ticker symbol
 * @returns {string} Mock response text
 */
function getMockFollowupResponse(question, ticker) {
  // Try to match the question against our patterns
  for (const [pattern, response] of Object.entries(mockFollowupResponses)) {
    if (pattern === 'default') continue; // Skip the default entry
    
    const regex = new RegExp(pattern, 'i');
    if (regex.test(question)) {
      return response;
    }
  }
  
  // Fall back to default response if no pattern matches
  return mockFollowupResponses.default;
}

module.exports = {
  getMockAnalysis,
  getMockFollowupResponse
};
