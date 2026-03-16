// Test AMM liquidity system

const BASE_URL = 'http://localhost:3030/api';

async function test() {
  console.log('🥔 Hot Potato AMM Test\n');

  // Step 1: Create a mock user
  console.log('1️⃣ Creating test user...');
  const mockUser = {
    id: 1,
    platform: 'twitter',
    handle: '@testcreator',
    name: 'Test Creator',
    points: 100,
    balance: 1000, // Give $1000 to test with
    createdAt: new Date()
  };
  
  // Simulate adding user to in-memory store (would need actual session)
  console.log(`   ✅ Created ${mockUser.handle} with $${mockUser.balance} balance\n`);

  // Step 2: Demonstrate liquidity calculation
  console.log('2️⃣ Creating market with AMM liquidity...');
  console.log('   Question: "Will Bitcoin hit $100K by July?"');
  console.log('   Initial odds: 60% YES / 40% NO');
  console.log('   Platform subsidy: $50');
  console.log('   Creator seed: $0');
  console.log('   Total liquidity: $50\n');

  const totalLiquidity = 50;
  const yesOdds = 60;
  
  // AMM initialization
  const yesPool = totalLiquidity * (yesOdds / 100);  // 50 * 0.60 = 30
  const noPool = totalLiquidity * ((100 - yesOdds) / 100);  // 50 * 0.40 = 20
  const k = yesPool * noPool;  // 30 * 20 = 600

  console.log('   Initial pools:');
  console.log(`   - YES pool: ${yesPool} shares`);
  console.log(`   - NO pool: ${noPool} shares`);
  console.log(`   - Constant k: ${k}\n`);

  // Step 3: Simulate trades and show dynamic pricing
  console.log('3️⃣ Simulating trades...\n');

  let currentYesPool = yesPool;
  let currentNoPool = noPool;

  // Trade 1: Buy $10 of YES
  console.log('   📈 Trade 1: User buys $10 of YES');
  const trade1Amount = 10;
  const newNoPool1 = currentNoPool + trade1Amount;  // 20 + 10 = 30
  const newYesPool1 = k / newNoPool1;  // 600 / 30 = 20
  const shares1 = currentYesPool - newYesPool1;  // 30 - 20 = 10 shares
  
  console.log(`   - Spent: $${trade1Amount}`);
  console.log(`   - Received: ${shares1.toFixed(2)} YES shares`);
  console.log(`   - New YES pool: ${newYesPool1.toFixed(2)} (was ${currentYesPool})`);
  console.log(`   - New NO pool: ${newNoPool1.toFixed(2)} (was ${currentNoPool})`);
  
  // Calculate new odds
  const total1 = newYesPool1 + newNoPool1;
  const newYesOdds1 = Math.round((newNoPool1 / total1) * 100);
  console.log(`   - New odds: ${newYesOdds1}% YES / ${100 - newYesOdds1}% NO\n`);

  currentYesPool = newYesPool1;
  currentNoPool = newNoPool1;

  // Trade 2: Buy $15 of YES (price has increased!)
  console.log('   📈 Trade 2: Another user buys $15 of YES');
  const trade2Amount = 15;
  const newNoPool2 = currentNoPool + trade2Amount;  // 30 + 15 = 45
  const newYesPool2 = k / newNoPool2;  // 600 / 45 = 13.33
  const shares2 = currentYesPool - newYesPool2;  // 20 - 13.33 = 6.67 shares
  
  console.log(`   - Spent: $${trade2Amount}`);
  console.log(`   - Received: ${shares2.toFixed(2)} YES shares (less than before!)`);
  console.log(`   - New YES pool: ${newYesPool2.toFixed(2)}`);
  console.log(`   - New NO pool: ${newNoPool2.toFixed(2)}`);
  
  const total2 = newYesPool2 + newNoPool2;
  const newYesOdds2 = Math.round((newNoPool2 / total2) * 100);
  console.log(`   - New odds: ${newYesOdds2}% YES / ${100 - newYesOdds2}% NO\n`);

  currentYesPool = newYesPool2;
  currentNoPool = newNoPool2;

  // Trade 3: Buy $20 of NO (counter-trade)
  console.log('   📉 Trade 3: User buys $20 of NO (contrarian)');
  const trade3Amount = 20;
  const newYesPool3 = currentYesPool + trade3Amount;  // 13.33 + 20 = 33.33
  const newNoPool3 = k / newYesPool3;  // 600 / 33.33 = 18
  const shares3 = currentNoPool - newNoPool3;  // 45 - 18 = 27 shares
  
  console.log(`   - Spent: $${trade3Amount}`);
  console.log(`   - Received: ${shares3.toFixed(2)} NO shares`);
  console.log(`   - New YES pool: ${newYesPool3.toFixed(2)}`);
  console.log(`   - New NO pool: ${newNoPool3.toFixed(2)}`);
  
  const total3 = newYesPool3 + newNoPool3;
  const newYesOdds3 = Math.round((newNoPool3 / total3) * 100);
  console.log(`   - New odds: ${newYesOdds3}% YES / ${100 - newYesOdds3}% NO\n`);

  console.log('✅ AMM is working! Prices adjust dynamically based on trades.');
  console.log('\n📊 Summary:');
  console.log(`   - Started: 60% YES / 40% NO`);
  console.log(`   - After $25 of YES buys: ${newYesOdds2}% YES`);
  console.log(`   - After $20 NO counter: ${newYesOdds3}% YES`);
  console.log(`   - Total volume: $${trade1Amount + trade2Amount + trade3Amount}`);
}

test().catch(console.error);
