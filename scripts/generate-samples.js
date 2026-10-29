const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const samplesDir = path.join(process.cwd(), 'public', 'sample-files');
if (!fs.existsSync(samplesDir)) {
  fs.mkdirSync(samplesDir, { recursive: true });
}

// 1. Person A - Mutual Funds (.xlsx)
function createPersonAMF() {
  const wb = xlsx.utils.book_new();
  const rows = [
    ["Groww Mutual Funds Statement"],
    ["Name", "Person A"],
    ["Date", "29-10-2026"],
    [],
    [
      "Scheme Name",
      "Invested Value",
      "Current Value",
      "Returns",
      "Units",
      "XIRR",
      "Category",
      "Sub-category",
      "ISIN",
      "AMC"
    ],
    [
      "Parag Parikh Flexi Cap Fund Direct Growth",
      "2,50,000",
      "3,25,000",
      "75,000",
      "4120.5",
      "21.4%",
      "Equity",
      "Flexi Cap Fund",
      "INF879O01019",
      "PPFAS Mutual Fund"
    ],
    [
      "Mirae Asset Large Cap Fund Direct Growth",
      "2,00,000",
      "2,42,000",
      "42,000",
      "2280.1",
      "16.8%",
      "Equity",
      "Large Cap Fund",
      "INF769I01010",
      "Mirae Asset Mutual Fund"
    ]
  ];
  const ws = xlsx.utils.aoa_to_sheet(rows);
  xlsx.utils.book_append_sheet(wb, ws, "Holdings");
  const filePath = path.join(samplesDir, 'Mutual_Funds_Person_A.xlsx');
  xlsx.writeFile(wb, filePath);
  console.log('Created:', filePath);
}

// 2. Person A - Stocks (.xlsx)
function createPersonAStocks() {
  const wb = xlsx.utils.book_new();
  const rows = [
    ["Groww Stocks Holdings Statement"],
    ["Name", "Person A"],
    ["Date", "29-10-2026"],
    [],
    [
      "Stock Name",
      "Quantity",
      "Average buy price",
      "Closing price",
      "Buy value",
      "Closing value",
      "Unrealised P&L",
      "ISIN",
      "Category"
    ],
    [
      "HDFC Bank Ltd.",
      "80",
      "1,500.00",
      "1,720.00",
      "1,20,000",
      "1,37,600",
      "17,600",
      "INE040A01034",
      "Banking"
    ],
    [
      "Reliance Industries Ltd.",
      "50",
      "2,400.00",
      "2,750.00",
      "1,20,000",
      "1,37,500",
      "17,500",
      "INE002A01018",
      "Energy"
    ]
  ];
  const ws = xlsx.utils.aoa_to_sheet(rows);
  xlsx.utils.book_append_sheet(wb, ws, "Holdings");
  const filePath = path.join(samplesDir, 'Stocks_Holdings_Person_A.xlsx');
  xlsx.writeFile(wb, filePath);
  console.log('Created:', filePath);
}

// 3. Person B - Mutual Funds (.xlsx)
function createPersonBMF() {
  const wb = xlsx.utils.book_new();
  const rows = [
    ["Groww Mutual Funds Statement"],
    ["Name", "Person B"],
    ["Date", "29-10-2026"],
    [],
    [
      "Scheme Name",
      "Invested Value",
      "Current Value",
      "Returns",
      "Units",
      "XIRR",
      "Category",
      "Sub-category",
      "ISIN",
      "AMC"
    ],
    [
      "Motilal Oswal Midcap Fund Direct Growth",
      "1,50,000",
      "1,98,000",
      "48,000",
      "1850.4",
      "24.2%",
      "Equity",
      "Mid Cap Fund",
      "INF247L01015",
      "Motilal Oswal Mutual Fund"
    ],
    [
      "Nippon India Small Cap Fund Direct Growth",
      "1,20,000",
      "1,62,000",
      "42,000",
      "1120.2",
      "28.5%",
      "Equity",
      "Small Cap Fund",
      "INF204K01012",
      "Nippon India Mutual Fund"
    ]
  ];
  const ws = xlsx.utils.aoa_to_sheet(rows);
  xlsx.utils.book_append_sheet(wb, ws, "Holdings");
  const filePath = path.join(samplesDir, 'Mutual_Funds_Person_B.xlsx');
  xlsx.writeFile(wb, filePath);
  console.log('Created:', filePath);
}

// 4. Person B - Stocks & ETFs (.xlsx)
function createPersonBStocks() {
  const wb = xlsx.utils.book_new();
  const rows = [
    ["Groww Stocks Holdings Statement"],
    ["Name", "Person B"],
    ["Date", "29-10-2026"],
    [],
    [
      "Stock Name",
      "Quantity",
      "Average buy price",
      "Closing price",
      "Buy value",
      "Closing value",
      "Unrealised P&L",
      "ISIN",
      "Category"
    ],
    [
      "Tata Consultancy Services Ltd.",
      "30",
      "3,500.00",
      "4,100.00",
      "1,05,000",
      "1,23,000",
      "18,000",
      "INE467B01029",
      "IT"
    ],
    [
      "Nippon India ETF Gold BeES",
      "1500",
      "55.00",
      "72.00",
      "82,500",
      "1,08,000",
      "25,500",
      "INF204KB17I5",
      "Commodity"
    ]
  ];
  const ws = xlsx.utils.aoa_to_sheet(rows);
  xlsx.utils.book_append_sheet(wb, ws, "Holdings");
  const filePath = path.join(samplesDir, 'Stocks_Holdings_Person_B.xlsx');
  xlsx.writeFile(wb, filePath);
  console.log('Created:', filePath);
}

// 5. Sample Bank & FDs for Person A & Person B
function createBankAndFDs() {
  const wb = xlsx.utils.book_new();
  const sampleData = [
    {
      "Category": "Savings Account",
      "Institution": "HDFC Bank",
      "Account Number": "501002345678",
      "Current Value": 150000,
      "Invested Value": 150000,
      "Interest Rate (%)": 3.0,
      "Maturity Date": "Indefinite",
      "Owner": "Person A",
      "Notes": "Emergency fund buffer"
    },
    {
      "Category": "FD",
      "Institution": "State Bank of India (SBI)",
      "Account Number": "FD-3829104",
      "Current Value": 500000,
      "Invested Value": 500000,
      "Interest Rate (%)": 7.1,
      "Maturity Date": "2027-12-15",
      "Owner": "Person A",
      "Notes": "3-Year Fixed Deposit"
    },
    {
      "Category": "PPF",
      "Institution": "Post Office",
      "Account Number": "PPF-9081234",
      "Current Value": 320000,
      "Invested Value": 280000,
      "Interest Rate (%)": 7.1,
      "Maturity Date": "2032-03-31",
      "Owner": "Person B",
      "Notes": "15-year 80C compound fund"
    },
    {
      "Category": "NPS",
      "Institution": "HDFC Pension (NSDL)",
      "Account Number": "PRAN-110029384",
      "Current Value": 450000,
      "Invested Value": 380000,
      "Interest Rate (%)": 10.5,
      "Maturity Date": "Indefinite",
      "Owner": "Person B",
      "Notes": "Tier 1 Pension Account"
    }
  ];

  const ws = xlsx.utils.json_to_sheet(sampleData);
  xlsx.utils.book_append_sheet(wb, ws, "Bank_and_FDs");
  const filePath = path.join(samplesDir, 'Bank_and_FD_Sample_Person_A_B.xlsx');
  xlsx.writeFile(wb, filePath);
  console.log('Created:', filePath);
}

createPersonAMF();
createPersonAStocks();
createPersonBMF();
createPersonBStocks();
createBankAndFDs();
console.log('All sample files generated successfully!');
