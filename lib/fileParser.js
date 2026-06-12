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
    transaction: {
      transaction_id: crypto.randomUUID(),
      date: date.toISOString(),
      description,
      amount,
      type,
      category:
        String(rawCategory || "Uncategorized").trim() || "Uncategorized",
    },
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

const extractTransactionFromPdfLine = (line) => {
  const cleaned = line
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const dateMatch = cleaned.match(
    /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})(?:\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}))?\s+(.*)$/,
  );
  if (!dateMatch) return null;

  const date = parseDateString(dateMatch[1]);
  if (!date) return null;

  let content = dateMatch[3].trim();
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
  let type = null;
  const description = tokens.join(" ").trim() || "SBI transaction";

  if (amountTokens.length >= 3) {
    const withdrawal = normalizeAmount(amountTokens[0]);
    const deposit = normalizeAmount(amountTokens[1]);
    if (deposit !== null && deposit > 0) {
      amount = deposit;
      type = "CREDIT";
    } else if (withdrawal !== null && withdrawal > 0) {
      amount = withdrawal;
      type = "DEBIT";
    }
  } else if (amountTokens.length === 2) {
    const first = normalizeAmount(amountTokens[0]);
    const second = normalizeAmount(amountTokens[1]);
    if (first !== null && second !== null) {
      amount = first;
      type =
        normalizeTypeValue(description) || normalizeTransactionType("", first);
    } else {
      amount = first !== null ? first : second;
      type = normalizeTransactionType("", amount);
    }
  } else {
    amount = normalizeAmount(amountTokens[0]);
    type = normalizeTransactionType("", amount);
  }

  if (amount === null || !Number.isFinite(amount)) return null;
  if (!type) type = "DEBIT";

  return {
    transaction_id: crypto.randomUUID(),
    date: date.toISOString(),
    description,
    amount,
    type,
    category: "Uncategorized",
  };
};

export const parsePdfFile = async (file) => {
  const arrayBuffer = await file.arrayBuffer();

  const importPdfJs = async (path) => {
    try {
      const mod = await import(path);
      return mod?.default ?? mod;
    } catch (err) {
      return null;
    }
  };

  let pdfjs = await importPdfJs("pdfjs-dist/legacy/build/pdf.sandbox.min.mjs");
  if (!pdfjs) pdfjs = await importPdfJs("pdfjs-dist/legacy/build/pdf.min.mjs");
  if (!pdfjs) pdfjs = await importPdfJs("pdfjs-dist/legacy/build/pdf.mjs");

  if (!pdfjs) {
    return {
      transactions: [],
      errors: [
        "Unable to load PDF parser. Please try again later or use CSV import.",
      ],
    };
  }

  try {
    if (pdfjs?.GlobalWorkerOptions) pdfjs.GlobalWorkerOptions.workerSrc = "";
  } catch (e) {
    // ignore
  }

  const getDocument = pdfjs.getDocument || pdfjs?.default?.getDocument;
  if (typeof getDocument !== "function") {
    return {
      transactions: [],
      errors: [
        "Unable to parse PDF content. Please upload a valid SBI PDF statement.",
      ],
    };
  }

  const pdf = await getDocument({ data: arrayBuffer, disableWorker: true })
    .promise;
  const transactions = [];

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const content = await page.getTextContent();
    const lines = groupPdfTextLines(content.items);
    for (const line of lines) {
      const transaction = extractTransactionFromPdfLine(line);
      if (transaction) {
        transactions.push(transaction);
      }
    }
  }

  if (transactions.length === 0) {
    return {
      transactions: [],
      errors: [
        "Unable to extract any transactions from this PDF. Please upload a valid SBI statement PDF or a CSV with transaction data.",
      ],
    };
  }

  return { transactions, errors: [] };
};
