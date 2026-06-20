import Papa from "papaparse";

const HEADER_MAP = {
  date: [
    "date",
    "transaction date",
    "value date",
    "txn date",
    "trans date",
    "posted date",
    "transactiondt",
  ],
  description: [
    "description",
    "narration",
    "remarks",
    "details",
    "particulars",
    "transaction details",
    "transaction particulars",
  ],
  amount: [
    "amount",
    "transaction amount",
    "txn amount",
    "withdrawal amount",
    "deposit amount",
    "amount (inr)",
    "amount inr",
  ],
  debitAmount: [
    "debit",
    "debit amount",
    "withdrawal",
    "withdrawal amount",
    "payment",
  ],
  creditAmount: [
    "credit",
    "credit amount",
    "deposit",
    "deposit amount",
    "received",
  ],
  type: ["type", "transaction type", "txn type", "dr/cr", "mode"],
  category: ["category", "categories", "cat", "transaction category"],
};

const DATE_REGEX = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/;
const ISO_DATE_REGEX = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/;
const NUMERIC_TOKEN_REGEX = /^-?[\d,]+(?:\.\d+)?$/;

// Indian bank statements (e.g. Federal Bank) use multi-line rows:
//   WDL TFR / DEP TFR
//   txnDate valueDate - withdrawal deposit balance
//   UPI/narration lines...
const INDIAN_BANK_DATE_LINE_REGEX =
  /^(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+-\s+(-|[\d,]+(?:\.\d+)?)\s+(-|[\d,]+(?:\.\d+)?)\s+([\d,]+(?:\.\d+)?)$/;
const INDIAN_BANK_TYPE_LINE_REGEX = /^(WDL|DEP|WITHDRAWAL|DEPOSIT)\b/i;
const PDF_SKIP_LINE_REGEX =
  /^(balance|page\s+no\.|account\s+statement|transaction\s+date|value\s+date|withdrawal|deposit|\d+\s+of\s+\d+)/i;

const normalizeData = (value) => {
  if (value === undefined || value === null) return "";
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ");
};

export const isCsvFile = (file) => {
  if (!file) return false;
  const name = String(file.name || "").toLowerCase();
  return (
    file.type === "text/csv" ||
    file.type === "application/vnd.ms-excel" ||
    name.endsWith(".csv")
  );
};

export const isPdfFile = (file) => {
  if (!file) return false;
  const name = String(file.name || "").toLowerCase();
  return file.type === "application/pdf" || name.endsWith(".pdf");
};

export const mapHeaders = (headers) => {
  const mapped = {};
  const lowerHeaders = headers.map((header) => ({
    raw: header,
    normalized: normalizeData(header),
  }));

  for (const { raw, normalized } of lowerHeaders) {
    for (const key of Object.keys(HEADER_MAP)) {
      if (mapped[key]) continue;
      const aliases = HEADER_MAP[key];
      if (aliases.some((alias) => normalized.includes(alias))) {
        mapped[key] = raw;
        break;
      }
    }
  }

  return mapped;
};

export const validateHeaders = (mappedHeaders) => {
  const missing = [];
  if (!mappedHeaders.date) missing.push("date");
  if (!mappedHeaders.description) missing.push("description");
  if (
    !mappedHeaders.amount &&
    !mappedHeaders.debitAmount &&
    !mappedHeaders.creditAmount
  )
    missing.push("amount");
  if (
    !mappedHeaders.type &&
    !mappedHeaders.debitAmount &&
    !mappedHeaders.creditAmount
  )
    missing.push("type");

  return {
    valid: missing.length === 0,
    missing,
  };
};

export const normalizeAmount = (value) => {
  if (value === undefined || value === null) return null;
  const str = String(value).trim().replace(/,/g, "").replace(/₹/g, "");
  if (!str || str === "-") return null;

  const sign = str.startsWith("(") && str.endsWith(")") ? -1 : 1;
  const cleaned = str.replace(/[^0-9.-]+/g, "");
  const parsed = Number(cleaned);
  if (Number.isNaN(parsed)) return null;
  return parsed * sign;
};

export const parseDateString = (value) => {
  if (!value) return null;
  const normalized = String(value)
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\./g, "/")
    .replace(/-/g, "/");

  if (ISO_DATE_REGEX.test(normalized)) {
    const [, year, month, day] = normalized.match(ISO_DATE_REGEX);
    const iso = `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parts = normalized.match(DATE_REGEX);
  if (!parts) return null;

  let [, day, month, year] = parts;
  if (year.length === 2) {
    year = Number(year) > 50 ? `19${year}` : `20${year}`;
  }
  const iso = `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeTypeValue = (value) => {
  const normalized = normalizeData(value);
  if (/\b(cr|credit|deposit|received|pay in)\b/.test(normalized))
    return "CREDIT";
  if (
    /\b(dr|debit|withdrawal|paid|payment|purchase|spent|withdrawn)\b/.test(
      normalized,
    )
  )
    return "DEBIT";
  return null;
};

export const normalizeTransactionType = (value, amount) => {
  if (value) {
    const normalized = normalizeTypeValue(value);
    if (normalized) return normalized;
  }
  if (typeof amount === "number") {
    if (amount < 0) return "DEBIT";
    if (amount > 0) return "CREDIT";
  }
  return "DEBIT";
};

const CATEGORY_PATTERNS = [
  { category: "Salary", regex: /\b(salary|payroll|salary credit|salary deposit|income|credited|neft.*?salary)\b/i },
  { category: "Food & Dining", regex: /\b(restaurant|dine|dining|cafe|coffee|eatery|swiggy|zomato|ubereats|uber eats|dominos|pizza|burger|biryani|food delivery|eatsure|mcdonald|kfc|starbucks|ccd|chai point|haldiram|smartq)\b/i },
  { category: "Groceries", regex: /\b(grocery|supermarket|mart|dmart|big bazaar|spencer|reliance smart|reliance fresh|nature(?:'s)? basket|groceries|fresh market|zepto|blinkit|instamart|dunzo|bbnow|bigbasket|lulu|more retail)\b/i },
  { category: "Transport", regex: /\b(uber|ola|taxi|cab|metro|bus|train|flight|airline|railway|transport|rapido|namma metro|fastag|irctc|makemytrip|redbus|yatra|cleartrip|goibibo|indigo|vistara|air india|ixigo)\b/i },
  { category: "Utilities & Bills", regex: /\b(electricity|water bill|gas bill|internet|mobile recharge|recharge|utility|broadband|wifi|cable|telephone|airtel|jio|vi|bescom|kseb|tata power|mahavitaran|adani electricity|pgvcl|d2h|tatasky|sun direct|act fibernet|hathway|excitel)\b/i },
  { category: "Shopping", regex: /\b(amazon|flipkart|myntra|shopping|mall|store|purchase|buy|shop|ajio|meesho|nykaa|croma|reliance digital|vijay sales|lifestyle|shoppers stop|max fashion|pantaloons)\b/i },
  { category: "Entertainment", regex: /\b(netflix|spotify|movie|theatre|cinema|concert|event|gaming|prime|hotstar|bookmyshow|pvr|inox|cinepolis|sony liv|zee5|disney|apple tv)\b/i },
  { category: "Health & Medical", regex: /\b(pharmacy|chemist|hospital|clinic|doctor|medical|health|insurance|apollo|pharmeasy|1mg|netmeds|practo|max healthcare|fortis|manipal)\b/i },
  { category: "Investments", regex: /\b(zerodha|groww|upstox|mutual fund|sip|ppf|nps|angel one|icici direct|hdfc sec|kuvera|coin|indmoney)\b/i },
  { category: "Rent", regex: /\b(rent|apartment|lease|landlord|maintenance)\b/i },
  { category: "Transfers", regex: /\b(transfer|to self|account transfer|fund transfer|p2p)\b/i },
];

const inferCategoryFromDescription = (description) => {
  const normalized = normalizeData(description || "");
  for (const hint of CATEGORY_PATTERNS) {
    if (hint.regex.test(normalized)) return hint.category;
  }
  return null;
};

const attachTagsToTransaction = (transaction) => {
  const inferredCategory =
    transaction.category && transaction.category !== "Uncategorized"
      ? transaction.category
      : inferCategoryFromDescription(transaction.description);

  const category = inferredCategory || transaction.category || "Uncategorized";
  const tags = inferredCategory ? [inferredCategory] : [];

  return {
    ...transaction,
    category,
    tags,
  };
};

const buildTransactionFromCsvRow = (row, mappedHeaders) => {
  const rawDate = row[mappedHeaders.date];
  const rawDescription = row[mappedHeaders.description];
  const rawCategory = mappedHeaders.category ? row[mappedHeaders.category] : "";
  const rawType = mappedHeaders.type ? row[mappedHeaders.type] : "";
  const amountCell = mappedHeaders.amount ? row[mappedHeaders.amount] : "";
  const debitCell = mappedHeaders.debitAmount
    ? row[mappedHeaders.debitAmount]
    : "";
  const creditCell = mappedHeaders.creditAmount
    ? row[mappedHeaders.creditAmount]
    : "";

  const date = parseDateString(rawDate);
  const description = String(rawDescription || "").trim() || "Bank transaction";
  let amount = null;
  let type = null;

  if (mappedHeaders.amount) {
    amount = normalizeAmount(amountCell);
    type = normalizeTransactionType(rawType, amount);
  } else {
    const debitAmount = normalizeAmount(debitCell);
    const creditAmount = normalizeAmount(creditCell);
    if (creditAmount !== null && creditAmount > 0) {
      amount = creditAmount;
      type = "CREDIT";
    } else if (debitAmount !== null && debitAmount > 0) {
      amount = debitAmount;
      type = "DEBIT";
    } else {
      amount = normalizeAmount(amountCell);
      type = normalizeTransactionType(rawType, amount);
    }
  }

  if (amount === null || Number.isNaN(amount)) {
    return { error: "Invalid amount" };
  }
  if (!date) {
    return { error: "Invalid date" };
  }

  return {
    transaction: attachTagsToTransaction({
      transaction_id: crypto.randomUUID(),
      date: date.toISOString(),
      description,
      amount,
      type,
      category:
        String(rawCategory || "Uncategorized").trim() || "Uncategorized",
    }),
  };
};

export const parseCsvFile = (file) => {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => String(header || "").trim(),
      complete: (results) => {
        const headers = results.meta.fields || [];
        const mappedHeaders = mapHeaders(headers);
        const headerValidation = validateHeaders(mappedHeaders);
        const errors = [];
        const transactions = [];

        if (results.data.length === 0) {
          errors.push("The CSV file contains no records.");
        }

        if (!headerValidation.valid) {
          errors.push(
            `Missing required columns: ${headerValidation.missing.join(", ")}. ` +
              "A CSV import must contain at least date, description, amount, and type information.",
          );
        }

        for (let index = 0; index < results.data.length; index += 1) {
          const row = results.data[index];
          const isEmptyRow = Object.values(row).every(
            (value) => String(value).trim() === "",
          );
          if (isEmptyRow) continue;

          const { transaction, error } = buildTransactionFromCsvRow(
            row,
            mappedHeaders,
          );
          if (error) {
            errors.push(`Row ${index + 2}: ${error}`);
            continue;
          }
          transactions.push(transaction);
        }

        if (transactions.length === 0 && errors.length === 0) {
          errors.push("No valid transactions were found in the CSV.");
        }

        resolve({ transactions, errors, mappedHeaders });
      },
      error: (error) => {
        resolve({
          transactions: [],
          errors: [error.message || "Unable to parse CSV file."],
        });
      },
    });
  });
};

const groupPdfTextLines = (items) => {
  const lineMap = new Map();
  for (const item of items) {
    const transform = item.transform || [];
    const y = Math.round((transform[5] ?? 0) * 100) / 100;
    const x = Math.round((transform[4] ?? 0) * 100) / 100;
    const key = String(y);
    const row = lineMap.get(key) || [];
    row.push({ x, text: item.str });
    lineMap.set(key, row);
  }

  return Array.from(lineMap.entries())
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([, row]) =>
      row
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text)
        .join(" "),
    );
};

const extractLinesFromTextContent = (items) => {
  const lines = [];
  let current = "";

  for (const item of items) {
    if (!item?.str) continue;
    current += item.str;
    if (item.hasEOL) {
      const line = current.replace(/\u00A0/g, " ").trim();
      if (line) lines.push(line);
      current = "";
    }
  }

  const trailing = current.replace(/\u00A0/g, " ").trim();
  if (trailing) lines.push(trailing);

  return lines;
};

const isLikelyHeaderLine = (line) => {
  const normalized = normalizeData(line);
  const hasHeaderWords =
    /\b(date|txn date|value date|narration|description|particulars|withdrawal|deposit|debit|credit|balance|amount|statement|header|column)\b/.test(
      normalized,
    );
  const hasLeadingDate = /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/.test(
    line.trim(),
  );
  return hasHeaderWords && !hasLeadingDate;
};

const isLikelyFooterLine = (line) => {
  const normalized = normalizeData(line);
  // Detect bank statement footer/summary lines
  return /\b(statement summary|dr count|cr count|total debit|total credit|opening balance|closing balance|statement period|from|to)\b/i.test(
    normalized,
  ) ||
    // Detect rows that are just metadata/numbers without descriptions
    /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\s*(dr|cr)?\s*count\b/i.test(
      line,
    ) ||
    // Detect lines with only numbers and colons (balance lines)
    /^[a-z\s:₹\d,.\-()]+:\s*[\d,.\-()]+\s*$/i.test(line);
};

const extractTransactionFromPdfLine = (line) => {
  const cleaned = line
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || isLikelyHeaderLine(cleaned) || isLikelyFooterLine(cleaned)) return null;

  const dateMatch = cleaned.match(
    /^((?:\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})|(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}))(?:\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}))?\s+(.*)$/,
  );
  if (!dateMatch) return null;

  const date = parseDateString(dateMatch[1]);
  if (!date) return null;

  let content = dateMatch[3].trim();
  let explicitType = null;

  if (/\s+(cr|credit)\s*$/i.test(content)) {
    explicitType = "CREDIT";
    content = content.replace(/\s+(cr|credit)\s*$/i, "").trim();
  } else if (/\s+(dr|debit)\s*$/i.test(content)) {
    explicitType = "DEBIT";
    content = content.replace(/\s+(dr|debit)\s*$/i, "").trim();
  }

  const tokens = content.split(" ");
  const amountTokens = [];
  while (
    tokens.length > 0 &&
    NUMERIC_TOKEN_REGEX.test(
      tokens[tokens.length - 1].replace(/₹/g, "").replace(/,/g, ""),
    )
  ) {
    amountTokens.unshift(tokens.pop());
  }

  if (amountTokens.length === 0) return null;

  let amount = null;
  let type = explicitType;
  const description = tokens.join(" ").trim() || "Bank transaction";

  if (amountTokens.length >= 3) {
    const withdrawal = normalizeAmount(amountTokens[0]);
    const deposit = normalizeAmount(amountTokens[1]);
    if (deposit !== null && deposit > 0) {
      amount = deposit;
      type = type || "CREDIT";
    } else if (withdrawal !== null && withdrawal > 0) {
      amount = withdrawal;
      type = type || "DEBIT";
    }
  } else if (amountTokens.length === 2) {
    const first = normalizeAmount(amountTokens[0]);
    const second = normalizeAmount(amountTokens[1]);
    if (first !== null && first > 0 && (second === null || second === 0)) {
      amount = first;
      type = type || normalizeTransactionType(description, first);
    } else if (second !== null && second > 0 && (first === null || first === 0)) {
      amount = second;
      type = type || "CREDIT";
    } else if (first !== null && second !== null) {
      amount = first;
      type =
        type ||
        normalizeTypeValue(description) ||
        normalizeTransactionType("", first);
    }
  } else {
    amount = normalizeAmount(amountTokens[0]);
    type = type || normalizeTransactionType(description, amount);
  }

  if (amount === null || !Number.isFinite(amount) || amount <= 0) return null;
  if (!type) type = "DEBIT";

  return attachTagsToTransaction({
    transaction_id: crypto.randomUUID(),
    date: date.toISOString(),
    description,
    amount: Math.abs(amount),
    type,
    category: "Uncategorized",
  });
};

const findIndianBankTypeHint = (lines, index) => {
  for (let j = index - 1; j >= 0 && j >= index - 3; j -= 1) {
    const candidate = lines[j].trim();
    if (PDF_SKIP_LINE_REGEX.test(candidate)) continue;
    if (INDIAN_BANK_TYPE_LINE_REGEX.test(candidate)) return candidate;
    if (INDIAN_BANK_DATE_LINE_REGEX.test(candidate)) break;
  }
  return null;
};

const inferTypeFromDescription = (description) => {
  if (/\bUPI\/DR\b/i.test(description)) return "DEBIT";
  if (/\bUPI\/CR\b/i.test(description)) return "CREDIT";
  return null;
};

const parseIndianBankStatementLines = (lines) => {
  const transactions = [];
  const seen = new Set();
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line || PDF_SKIP_LINE_REGEX.test(line) || isLikelyFooterLine(line)) {
      index += 1;
      continue;
    }

    const dateMatch = line.match(INDIAN_BANK_DATE_LINE_REGEX);
    if (!dateMatch) {
      index += 1;
      continue;
    }

    const [, txnDateRaw, , withdrawalRaw, depositRaw] = dateMatch;
    const date = parseDateString(txnDateRaw);
    const withdrawal = normalizeAmount(withdrawalRaw);
    const deposit = normalizeAmount(depositRaw);

    let amount = null;
    let type = null;

    if (deposit !== null && deposit > 0) {
      amount = deposit;
      type = "CREDIT";
    } else if (withdrawal !== null && withdrawal > 0) {
      amount = withdrawal;
      type = "DEBIT";
    }

    const typeHint = findIndianBankTypeHint(lines, index);
    if (typeHint) {
      if (/^WDL/i.test(typeHint)) type = "DEBIT";
      else if (/^DEP/i.test(typeHint)) type = "CREDIT";
    }

    const descriptionParts = [];
    index += 1;
    while (index < lines.length) {
      const nextLine = lines[index].trim();
      if (!nextLine) {
        index += 1;
        continue;
      }
      if (
        INDIAN_BANK_DATE_LINE_REGEX.test(nextLine) ||
        INDIAN_BANK_TYPE_LINE_REGEX.test(nextLine)
      ) {
        break;
      }
      if (PDF_SKIP_LINE_REGEX.test(nextLine)) {
        index += 1;
        continue;
      }
      descriptionParts.push(nextLine);
      index += 1;
    }

    const description =
      descriptionParts.join(" ").replace(/\s+/g, " ").trim() || "Bank transaction";
    type = type || inferTypeFromDescription(description);

    if (!date || amount === null || !type) continue;

    const transaction = attachTagsToTransaction({
      transaction_id: crypto.randomUUID(),
      date: date.toISOString(),
      description,
      amount: Math.abs(amount),
      type,
      category: "Uncategorized",
    });

    const key = `${transaction.date}|${transaction.description}|${transaction.amount}|${transaction.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    transactions.push(transaction);
  }

  return transactions;
};

const parseSingleLinePdfLines = (lines) => {
  const transactions = [];
  const seen = new Set();

  for (const line of lines) {
    const transaction = extractTransactionFromPdfLine(line);
    if (!transaction) continue;

    const key = `${transaction.date}|${transaction.description}|${transaction.amount}|${transaction.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    transactions.push(transaction);
  }

  return transactions;
};

const parsePdfLines = (positionLines, fallbackLines = positionLines) => {
  // Filter out header and footer lines from both line sets
  const cleanedPositionLines = positionLines.filter(
    (line) => !isLikelyHeaderLine(line) && !isLikelyFooterLine(line)
  );
  const cleanedFallbackLines = fallbackLines.filter(
    (line) => !isLikelyHeaderLine(line) && !isLikelyFooterLine(line)
  );

  const indianBankTransactions = parseIndianBankStatementLines(cleanedPositionLines);
  if (indianBankTransactions.length > 0) {
    return indianBankTransactions;
  }

  return parseSingleLinePdfLines(cleanedFallbackLines);
};

const extractPdfLines = async (file) => {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;

  const eolLines = [];
  const positionLines = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = textContent.items.filter((item) => item?.str?.trim());

    eolLines.push(...extractLinesFromTextContent(items));
    positionLines.push(...groupPdfTextLines(items));
  }

  return {
    positionLines,
    fallbackLines: [...new Set([...eolLines, ...positionLines])],
  };
};

const parsePdfViaApi = async (file) => {
  const formData = new FormData();
  formData.append("file", file, file.name);

  const response = await fetch("/api/extract-pdf", {
    method: "POST",
    body: formData,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      transactions: [],
      errors: [
        payload?.detail ||
          payload?.error ||
          "Unable to extract transactions from the PDF.",
      ],
    };
  }

  if (!payload?.transactions || !Array.isArray(payload.transactions)) {
    return {
      transactions: [],
      errors: ["Invalid response from PDF extraction service."],
    };
  }

  return {
    transactions: payload.transactions.map(attachTagsToTransaction),
    errors: [],
  };
};

export const parsePdfFile = async (file) => {
  try {
    const { positionLines, fallbackLines } = await extractPdfLines(file);
    const transactions = parsePdfLines(positionLines, fallbackLines);

    if (transactions.length > 0) {
      return { transactions, errors: [] };
    }

    const apiResult = await parsePdfViaApi(file);
    if (apiResult.transactions.length > 0) {
      return apiResult;
    }

    return {
      transactions: [],
      errors: apiResult.errors.length
        ? apiResult.errors
        : [
            "No transactions could be extracted from this PDF. Try exporting your bank statement as CSV, or ensure the PDF contains a readable transaction table.",
          ],
    };
  } catch (error) {
    const apiResult = await parsePdfViaApi(file).catch(() => null);
    if (apiResult?.transactions?.length) {
      return apiResult;
    }

    return {
      transactions: [],
      errors: [
        error.message ||
          "Unable to read the PDF. The file may be scanned/image-only or corrupted.",
      ],
    };
  }
};
