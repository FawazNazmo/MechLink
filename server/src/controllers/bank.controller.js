// server/src/controllers/bank.controller.js
import BankAccount from "../models/BankAccount.js";

function maskAccountNumber(n) {
  if (!n) return "";
  const s = String(n).replace(/\s+/g, "");
  return s.length <= 4 ? s : `${"*".repeat(Math.max(0, s.length - 4))}${s.slice(-4)}`;
}

function normalizeSortCode(sc) {
  return (sc || "")
    .replace(/[^0-9]/g, "")
    .replace(/^(\d{2})(\d{2})(\d{2})$/, "$1-$2-$3");
}

// GET /api/bank/me
export async function getMyBank(req, res, next) {
  try {
    const doc = await BankAccount.findOne({ user: req.user.id }).lean();
    if (!doc) return res.status(404).json({ message: "No bank details found" });

    res.json({
      bank: {
        accountName: doc.accountName,
        accountNumberMasked: maskAccountNumber(doc.accountNumber),
        sortCode: normalizeSortCode(doc.sortCode),
        updatedAt: doc.updatedAt,
      },
    });
  } catch (e) {
    next(e);
  }
}

// POST /api/bank/me
export async function createMyBank(req, res, next) {
  try {
    const exists = await BankAccount.findOne({ user: req.user.id }).lean();
    if (exists) return res.status(409).json({ message: "Bank details already added" });

    const { accountName, accountNumber, sortCode } = req.body || {};
    if (!accountName || !accountNumber || !sortCode) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const accNum = String(accountNumber).replace(/\D/g, "");
    const scNorm = normalizeSortCode(sortCode);

    if (accNum.length < 6 || accNum.length > 10) {
      return res.status(400).json({ message: "Invalid account number" });
    }
    if (!/^\d{2}-\d{2}-\d{2}$/.test(scNorm)) {
      return res.status(400).json({ message: "Invalid sort code" });
    }

    const saved = await BankAccount.create({
      user: req.user.id,
      accountName: String(accountName).trim(),
      accountNumber: accNum,
      sortCode: scNorm,
    });

    res.status(201).json({
      bank: {
        accountName: saved.accountName,
        accountNumberMasked: maskAccountNumber(saved.accountNumber),
        sortCode: saved.sortCode,
      },
    });
  } catch (e) {
    next(e);
  }
}

// NEW: GET /api/bank/mechanic/:id
// Used by the user when booking a mechanic to see deposit bank details.
export async function getMechanicBank(req, res, next) {
  try {
    const { id } = req.params;
    const doc = await BankAccount.findOne({ user: id }).lean();
    if (!doc) {
      return res.status(404).json({ message: "Bank details not found for this mechanic" });
    }

    res.json({
      bank: {
        accountName: doc.accountName,
        accountNumberMasked: maskAccountNumber(doc.accountNumber),
        sortCode: normalizeSortCode(doc.sortCode),
      },
    });
  } catch (e) {
    next(e);
  }
}
