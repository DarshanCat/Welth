/**
 * Welth — Demo Data Seed Script
 * 
 * Seeds realistic Indian financial data for showcase/demo purposes.
 * Run: node prisma/seed.js
 * 
 * WARNING: This will DELETE all existing data for the user and replace with demo data.
 */

const { PrismaClient } = require("@prisma/client");
const readline = require("readline");

const db = new PrismaClient();

// ── Helpers ───────────────────────────────────────────────────────────────────
const daysAgo  = (n) => new Date(Date.now() - n * 86400000);
const monthsAgo = (m, day = 1) => {
  const d = new Date();
  d.setMonth(d.getMonth() - m);
  d.setDate(day);
  d.setHours(10, 0, 0, 0);
  return d;
};
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ── Ask for Clerk User ID ─────────────────────────────────────────────────────
async function askUserId() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question("\n🔑 Enter your Clerk User ID (from Clerk dashboard or browser): ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function seed() {
  console.log("\n🌱 Welth Demo Data Seeder\n");
  
  const clerkUserId = await askUserId();
  if (!clerkUserId) { console.error("❌ No user ID provided."); process.exit(1); }

  // Find user
  const user = await db.user.findUnique({ where: { clerkUserId } });
  if (!user) { console.error(`❌ User not found for Clerk ID: ${clerkUserId}`); process.exit(1); }

  console.log(`\n✅ Found user: ${user.name || user.email}`);
  console.log("⚠️  This will CLEAR existing data and replace with demo data.");
  console.log("   Press Ctrl+C to cancel, or wait 3 seconds to continue...\n");
  await new Promise(r => setTimeout(r, 3000));

  // ── Clear existing data ───────────────────────────────────────────────────
  console.log("🗑️  Clearing existing data...");
  await db.transaction.deleteMany({ where: { userId: user.id } });
  await db.account.deleteMany({    where: { userId: user.id } });
  await db.budget.deleteMany({     where: { userId: user.id } });
  await db.goal.deleteMany({       where: { userId: user.id } });
  await db.holding.deleteMany({    where: { userId: user.id } });
  console.log("✅ Cleared.\n");

  // ── 1. ACCOUNTS ───────────────────────────────────────────────────────────
  console.log("🏦 Creating accounts...");
  const salaryAccount = await db.account.create({ data: {
    name: "HDFC Salary Account", type: "SAVINGS",
    balance: 87450, isDefault: true, userId: user.id,
  }});
  const savingsAccount = await db.account.create({ data: {
    name: "SBI Savings Account", type: "SAVINGS",
    balance: 234000, isDefault: false, userId: user.id,
  }});
  const currentAccount = await db.account.create({ data: {
    name: "ICICI Current Account", type: "CURRENT",
    balance: 45200, isDefault: false, userId: user.id,
  }});
  console.log("✅ 3 accounts created.\n");

  // ── 2. BUDGET ─────────────────────────────────────────────────────────────
  console.log("📊 Creating budget...");
  await db.budget.create({ data: { amount: 45000, userId: user.id } });
  console.log("✅ Budget set at ₹45,000/month.\n");

  // ── 3. GOALS ─────────────────────────────────────────────────────────────
  console.log("🎯 Creating savings goals...");
  await db.goal.createMany({ data: [
    { targetAmount: 500000, months: 18, monthlySave: 27778, userId: user.id },  // Emergency fund
    { targetAmount: 1500000, months: 36, monthlySave: 41667, userId: user.id }, // Car fund
    { targetAmount: 300000, months: 10, monthlySave: 30000, userId: user.id },  // Europe trip
  ]});
  console.log("✅ 3 goals created.\n");

  // ── 4. TRANSACTIONS — 9 months of realistic data ─────────────────────────
  console.log("💳 Creating transactions (9 months of data)...");

  const transactions = [];

  // ── Monthly salary (9 months) ─────────────────────────────────────────────
  for (let m = 8; m >= 0; m--) {
    transactions.push({
      type: "INCOME", amount: 95000,
      description: "Salary Credit - Infosys Ltd",
      category: "Salary", date: monthsAgo(m, 1),
      isRecurring: true, recurringInterval: "MONTHLY",
      status: "COMPLETED", userId: user.id, accountId: salaryAccount.id,
    });
  }

  // ── Freelance income (random months) ─────────────────────────────────────
  [7, 5, 3, 1].forEach(m => {
    transactions.push({
      type: "INCOME", amount: pick([15000, 20000, 25000, 18000]),
      description: "Freelance - Web Development Project",
      category: "Freelance", date: monthsAgo(m, rand(5, 20)),
      status: "COMPLETED", userId: user.id, accountId: salaryAccount.id,
    });
  });

  // ── FD Interest ───────────────────────────────────────────────────────────
  [5, 2].forEach(m => {
    transactions.push({
      type: "INCOME", amount: 4200,
      description: "FD Interest Credit - SBI",
      category: "Investments", date: monthsAgo(m, 15),
      status: "COMPLETED", userId: user.id, accountId: savingsAccount.id,
    });
  });

  // ── Rent (recurring, 9 months) ────────────────────────────────────────────
  for (let m = 8; m >= 0; m--) {
    transactions.push({
      type: "EXPENSE", amount: 18000,
      description: "Rent Payment - Prestige Apartments",
      category: "Housing", date: monthsAgo(m, 5),
      isRecurring: true, recurringInterval: "MONTHLY",
      status: "COMPLETED", userId: user.id, accountId: salaryAccount.id,
    });
  }

  // ── Groceries (monthly) ───────────────────────────────────────────────────
  const groceryStores = ["BigBasket Order", "DMart Purchase", "Zepto Delivery", "Spencer's Retail", "More Supermarket"];
  for (let m = 8; m >= 0; m--) {
    // 3-4 grocery trips per month
    for (let t = 0; t < rand(3, 4); t++) {
      transactions.push({
        type: "EXPENSE", amount: rand(800, 3200),
        description: pick(groceryStores),
        category: "Groceries", date: monthsAgo(m, rand(1, 28)),
        status: "COMPLETED", userId: user.id, accountId: salaryAccount.id,
      });
    }
  }

  // ── Food & Dining ─────────────────────────────────────────────────────────
  const foodPlaces = [
    "Swiggy Order", "Zomato - Burger King", "McDonald's",
    "Domino's Pizza", "Zomato - Meghana Foods", "Swiggy - Social",
    "KFC Koramangala", "Barbeque Nation", "Truffles Restaurant",
    "Cafe Coffee Day", "Starbucks", "Swiggy - Behrouz Biryani",
  ];
  for (let m = 8; m >= 0; m--) {
    for (let t = 0; t < rand(8, 14); t++) {
      transactions.push({
        type: "EXPENSE", amount: rand(150, 1800),
        description: pick(foodPlaces),
        category: "Food", date: monthsAgo(m, rand(1, 28)),
        status: "COMPLETED", userId: user.id, accountId: salaryAccount.id,
      });
    }
  }

  // ── Subscriptions (recurring) ─────────────────────────────────────────────
  const subs = [
    { desc: "Netflix Premium",           amount: 649,  cat: "Entertainment" },
    { desc: "Spotify Premium",           amount: 119,  cat: "Entertainment" },
    { desc: "Amazon Prime",              amount: 299,  cat: "Entertainment" },
    { desc: "Google One 200GB",          amount: 130,  cat: "Utilities"     },
    { desc: "Jio Fiber Monthly Plan",    amount: 999,  cat: "Utilities"     },
    { desc: "Swiggy One Membership",     amount: 299,  cat: "Food"          },
  ];
  subs.forEach(sub => {
    for (let m = 8; m >= 0; m--) {
      transactions.push({
        type: "EXPENSE", amount: sub.amount,
        description: sub.desc,
        category: sub.cat, date: monthsAgo(m, rand(7, 12)),
        isRecurring: true, recurringInterval: "MONTHLY",
        status: "COMPLETED", userId: user.id, accountId: salaryAccount.id,
      });
    }
  });

  // ── Transportation ────────────────────────────────────────────────────────
  const transport = ["Ola Auto - Office", "Uber Pool", "Rapido Bike", "BMTC Monthly Pass", "Petrol - HP Petrol Bunk", "Metro Card Recharge"];
  for (let m = 8; m >= 0; m--) {
    for (let t = 0; t < rand(5, 10); t++) {
      transactions.push({
        type: "EXPENSE", amount: rand(50, 1200),
        description: pick(transport),
        category: "Transportation", date: monthsAgo(m, rand(1, 28)),
        status: "COMPLETED", userId: user.id, accountId: salaryAccount.id,
      });
    }
  }

  // ── Shopping ──────────────────────────────────────────────────────────────
  const shopping = [
    "Amazon.in - Electronics",  "Flipkart Order", "Myntra - Clothing",
    "Ajio Fashion", "Nykaa Beauty", "IKEA Bangalore",
    "Croma - Accessories", "Decathlon Sports", "Meesho Order",
  ];
  for (let m = 8; m >= 0; m--) {
    for (let t = 0; t < rand(2, 5); t++) {
      transactions.push({
        type: "EXPENSE", amount: rand(299, 8500),
        description: pick(shopping),
        category: "Shopping", date: monthsAgo(m, rand(1, 28)),
        status: "COMPLETED", userId: user.id, accountId: salaryAccount.id,
      });
    }
  }

  // ── Utilities ─────────────────────────────────────────────────────────────
  for (let m = 8; m >= 0; m--) {
    transactions.push(
      { type: "EXPENSE", amount: rand(900, 2200), description: "BESCOM Electricity Bill", category: "Utilities", date: monthsAgo(m, 10), isRecurring: true, recurringInterval: "MONTHLY", status: "COMPLETED", userId: user.id, accountId: salaryAccount.id },
      { type: "EXPENSE", amount: rand(200, 500),  description: "Bangalore Water Board",  category: "Utilities", date: monthsAgo(m, 12), isRecurring: true, recurringInterval: "MONTHLY", status: "COMPLETED", userId: user.id, accountId: salaryAccount.id },
      { type: "EXPENSE", amount: 265,              description: "Airtel Postpaid Bill",    category: "Utilities", date: monthsAgo(m, 8),  isRecurring: true, recurringInterval: "MONTHLY", status: "COMPLETED", userId: user.id, accountId: salaryAccount.id },
    );
  }

  // ── Healthcare ────────────────────────────────────────────────────────────
  const health = ["Apollo Pharmacy", "MedPlus - Medicines", "Manipal Hospital - OPD", "Cult.fit Monthly", "Practo Online Consultation"];
  [8, 7, 5, 4, 2, 1, 0].forEach(m => {
    transactions.push({
      type: "EXPENSE", amount: rand(200, 2800),
      description: pick(health),
      category: "Healthcare", date: monthsAgo(m, rand(5, 25)),
      status: "COMPLETED", userId: user.id, accountId: salaryAccount.id,
    });
  });

  // ── EMI Payments ─────────────────────────────────────────────────────────
  for (let m = 8; m >= 0; m--) {
    transactions.push({
      type: "EXPENSE", amount: 12453,
      description: "HDFC Home Loan EMI",
      category: "Bills & Fees", date: monthsAgo(m, 3),
      isRecurring: true, recurringInterval: "MONTHLY",
      status: "COMPLETED", userId: user.id, accountId: salaryAccount.id,
    });
  }

  // ── Investment SIPs ───────────────────────────────────────────────────────
  for (let m = 8; m >= 0; m--) {
    transactions.push(
      { type: "EXPENSE", amount: 5000, description: "SIP - Parag Parikh Flexi Cap Fund", category: "Investments", date: monthsAgo(m, 6), isRecurring: true, recurringInterval: "MONTHLY", status: "COMPLETED", userId: user.id, accountId: salaryAccount.id },
      { type: "EXPENSE", amount: 3000, description: "SIP - Nifty 50 Index Fund Direct", category: "Investments", date: monthsAgo(m, 6), isRecurring: true, recurringInterval: "MONTHLY", status: "COMPLETED", userId: user.id, accountId: salaryAccount.id },
      { type: "EXPENSE", amount: 2000, description: "PPF Contribution",                 category: "Investments", date: monthsAgo(m, 7), isRecurring: true, recurringInterval: "MONTHLY", status: "COMPLETED", userId: user.id, accountId: salaryAccount.id },
    );
  }

  // ── Travel (some months) ──────────────────────────────────────────────────
  [6, 3].forEach(m => {
    const isFlight = rand(0, 1);
    transactions.push(
      { type: "EXPENSE", amount: isFlight ? rand(4500, 12000) : rand(800, 3000), description: isFlight ? "IndiGo Flight - BLR to DEL" : "redBus - Weekend Trip", category: "Travel", date: monthsAgo(m, 5), status: "COMPLETED", userId: user.id, accountId: salaryAccount.id },
      { type: "EXPENSE", amount: rand(2000, 6000), description: "OYO Rooms - Hotel Stay", category: "Travel", date: monthsAgo(m, 6), status: "COMPLETED", userId: user.id, accountId: salaryAccount.id },
    );
  });

  // ── Education ─────────────────────────────────────────────────────────────
  [7, 4, 1].forEach(m => {
    transactions.push({
      type: "EXPENSE", amount: pick([999, 1499, 2999, 499]),
      description: pick(["Udemy Course - Full Stack Dev", "Coursera - ML Specialization", "LinkedIn Premium", "Pluralsight Monthly"]),
      category: "Education", date: monthsAgo(m, rand(10, 20)),
      status: "COMPLETED", userId: user.id, accountId: salaryAccount.id,
    });
  });

  // ── Insurance ─────────────────────────────────────────────────────────────
  [8, 4].forEach(m => {
    transactions.push({
      type: "EXPENSE", amount: pick([6500, 8200, 12000]),
      description: pick(["LIC Premium - Jeevan Anand", "HDFC ERGO Health Insurance", "Star Health Insurance"]),
      category: "Insurance", date: monthsAgo(m, rand(3, 10)),
      status: "COMPLETED", userId: user.id, accountId: salaryAccount.id,
    });
  });

  // ── Personal Care ─────────────────────────────────────────────────────────
  for (let m = 8; m >= 0; m--) {
    if (rand(0, 1)) {
      transactions.push({
        type: "EXPENSE", amount: rand(300, 1500),
        description: pick(["Saloon - Hair Cut", "Nykaa Order", "Myntra - Grooming", "Waxing & Spa"]),
        category: "Personal Care", date: monthsAgo(m, rand(10, 25)),
        status: "COMPLETED", userId: user.id, accountId: salaryAccount.id,
      });
    }
  }

  // ── Anomaly — one unusually large expense ─────────────────────────────────
  transactions.push({
    type: "EXPENSE", amount: 18500,
    description: "iPhone 15 Back Cover + Accessories - Amazon",
    category: "Shopping", date: monthsAgo(1, 22),
    status: "COMPLETED", userId: user.id, accountId: salaryAccount.id,
  });

  // ── Gifts & Donations ─────────────────────────────────────────────────────
  [5, 1].forEach(m => {
    transactions.push({
      type: "EXPENSE", amount: pick([1000, 2000, 3000, 5000]),
      description: pick(["CRY Donation", "Gift - Friend Wedding", "PM CARES Fund"]),
      category: "Gifts & Donations", date: monthsAgo(m, rand(10, 20)),
      status: "COMPLETED", userId: user.id, accountId: salaryAccount.id,
    });
  });

  // ── Create all transactions ────────────────────────────────────────────────
  await db.transaction.createMany({ data: transactions });
  console.log(`✅ ${transactions.length} transactions created.\n`);

  // ── 5. HOLDINGS ───────────────────────────────────────────────────────────
  console.log("📈 Creating portfolio holdings...");
  await db.holding.createMany({ data: [
    // Stocks
    { symbol: "RELIANCE", name: "Reliance Industries Ltd", type: "STOCK",       quantity: 15,  avgBuyPrice: 2450, investedAmt: 36750,  exchange: "NSE", userId: user.id },
    { symbol: "TCS",      name: "Tata Consultancy Services", type: "STOCK",     quantity: 8,   avgBuyPrice: 3680, investedAmt: 29440,  exchange: "NSE", userId: user.id },
    { symbol: "INFY",     name: "Infosys Ltd",             type: "STOCK",       quantity: 20,  avgBuyPrice: 1420, investedAmt: 28400,  exchange: "NSE", userId: user.id },
    { symbol: "HDFCBANK", name: "HDFC Bank Ltd",           type: "STOCK",       quantity: 25,  avgBuyPrice: 1580, investedAmt: 39500,  exchange: "NSE", userId: user.id },
    { symbol: "WIPRO",    name: "Wipro Ltd",               type: "STOCK",       quantity: 40,  avgBuyPrice: 460,  investedAmt: 18400,  exchange: "NSE", userId: user.id },
    { symbol: "TATAMOTORS",name: "Tata Motors Ltd",        type: "STOCK",       quantity: 30,  avgBuyPrice: 780,  investedAmt: 23400,  exchange: "NSE", userId: user.id },
    // Mutual Funds
    { symbol: "119598",   name: "Parag Parikh Flexi Cap Fund Direct Growth", type: "MUTUAL_FUND", quantity: 180, avgBuyPrice: 55,  investedAmt: 54000,  exchange: "AMFI", userId: user.id },
    { symbol: "120503",   name: "Mirae Asset Large Cap Fund Direct Growth",  type: "MUTUAL_FUND", quantity: 250, avgBuyPrice: 86,  investedAmt: 72000,  exchange: "AMFI", userId: user.id },
    { symbol: "118989",   name: "Axis Bluechip Fund Direct Growth",          type: "MUTUAL_FUND", quantity: 320, avgBuyPrice: 48,  investedAmt: 48000,  exchange: "AMFI", userId: user.id },
  ]});
  console.log("✅ 6 stock holdings + 3 mutual fund SIPs created.\n");

  // ── Summary ───────────────────────────────────────────────────────────────
  const txCount  = await db.transaction.count({ where: { userId: user.id } });
  const totalInc = transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
  const totalExp = transactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);

  console.log("═══════════════════════════════════════════");
  console.log("🎉 DEMO DATA SEEDED SUCCESSFULLY!");
  console.log("═══════════════════════════════════════════");
  console.log(`📊 Transactions : ${txCount}`);
  console.log(`💰 Total Income : ₹${totalInc.toLocaleString("en-IN")}`);
  console.log(`💸 Total Expense: ₹${totalExp.toLocaleString("en-IN")}`);
  console.log(`🏦 Accounts     : 3 (HDFC, SBI, ICICI)`);
  console.log(`📈 Holdings     : 9 (6 stocks + 3 MFs)`);
  console.log(`🎯 Goals        : 3`);
  console.log(`📅 Period       : 9 months of data`);
  console.log("═══════════════════════════════════════════");
  console.log("\n✅ Restart your dev server and open the dashboard!\n");

  await db.$disconnect();
}

seed().catch(async (e) => {
  console.error("❌ Seed failed:", e.message);
  await db.$disconnect();
  process.exit(1);
});