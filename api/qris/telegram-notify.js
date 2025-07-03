const { Telegraf } = require("telegraf");

let bot = null;

function initializeBot() {
  const token = process.env.TELEGRAM_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_TOKEN not found in environment variables");
  }
  if (!bot) {
    bot = new Telegraf(token);
    console.log("▶ Telegram bot initialized");
  }
  return bot;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

async function sendPaymentNotification(paymentData) {
  try {
    const bot = initializeBot();
    const ownerId = process.env.OWNER_ID;
    if (!ownerId) {
      throw new Error("OWNER_ID not found in environment variables");
    }

    let message = `◆ PEMBAYARAN BERHASIL\n\n`;
    message += `▸ Jumlah: ${formatCurrency(paymentData.amount)}\n`;
    message += `▸ ID Transaksi: ${paymentData.transactionId}\n`;
    message += `▸ Waktu: ${formatDateTime(paymentData.paidAt || new Date())}\n`;
    message += `▸ Metode: QRIS\n`;
    message += `▸ Status: BERHASIL\n\n`;

    if (paymentData.wasAmountAdjusted && paymentData.originalAmount) {
      const originalAmount = formatCurrency(paymentData.originalAmount);
      const finalAmount = formatCurrency(paymentData.amount);
      message += `▸ Penyesuaian Jumlah:\n`;
      message += ` ${originalAmount} → ${finalAmount}\n`;
      message += ` (+${paymentData.amountAdjustment || 1})\n\n`;
    }

    message += `◆ QRIS Gateway\n`;
    message += `Powered by faykal`;

    await bot.telegram.sendMessage(ownerId, message);
    console.log("✓ Telegram notification sent to owner:", ownerId);
    return { success: true, message: "Notification sent successfully" };
  } catch (error) {
    console.log("✗ Error sending Telegram notification:", error.message);
    return { success: false, message: error.message };
  }
}

module.exports = (app) => {
  app.post("/api/qris/telegram-notify", async (req, res) => {
    try {
      const {
        transactionId,
        amount,
        originalAmount,
        wasAmountAdjusted,
        amountAdjustment,
        paidAt,
      } = req.body;

      if (!transactionId || !amount) {
        return res.status(400).json({
          status: false,
          message: "Missing required payment data",
        });
      }

      const result = await sendPaymentNotification({
        transactionId,
        amount,
        originalAmount,
        wasAmountAdjusted,
        amountAdjustment,
        paidAt,
      });

      if (result.success) {
        res.json({
          status: true,
          message: "Telegram notification sent successfully",
        });
      } else {
        res.status(500).json({
          status: false,
          message: "Failed to send Telegram notification",
          error: result.message,
        });
      }
    } catch (error) {
      console.log("✗ Error in telegram-notify endpoint:", error);
      res.status(500).json({
        status: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  });
};
