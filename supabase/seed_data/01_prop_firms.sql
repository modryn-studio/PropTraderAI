-- Seed prop_firms table with supported prop trading firms
-- Run this after schema.sql

INSERT INTO prop_firms (name, website, description) VALUES
  ('Apex Trader Funding', 'https://apextraderfunding.com', 'Leading futures prop firm with instant funding options'),
  ('Topstep', 'https://www.topstep.com', 'Established prop firm for futures traders'),
  ('MyFundedFutures', 'https://myfundedfutures.com', 'Futures prop firm with flexible evaluation programs'),
  ('TradeDay', 'https://tradeday.com', 'Performance-based prop firm with multiple account sizes'),
  ('Bulenox', 'https://bulenox.com', 'Prop firm specializing in futures trading'),
  ('Earn2Trade', 'https://earn2trade.com', 'Educational prop firm with trader development programs'),
  ('BluSky Trading', 'https://blusky.pro', 'Modern prop firm with competitive funding options'),
  ('Take Profit Trader', 'https://takeprofittrader.com', 'Prop firm focused on trader success and retention'),
  ('Elite Trader Funding', 'https://elitetraderfunding.com', 'Premium prop firm with high leverage options'),
  ('Alpha Futures', 'https://alphafutures.com', 'Futures prop firm with institutional-grade infrastructure'),
  ('Tradeify', 'https://tradeify.co', 'Instant funding prop firm with no evaluation required'),
  ('Lucid Trading', 'https://lucidtrading.io', 'Tech-forward prop firm with advanced analytics')
ON CONFLICT (name) DO NOTHING;
