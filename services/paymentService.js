const sendEmail = require('../utils/sendEmail');

const formatMoney = (amount) => `$${Number(amount || 0).toLocaleString('en-US')}`;

const buildInvoiceHtml = (booking) => {
  const moveInDate = booking.moveInDate ? new Date(booking.moveInDate).toLocaleDateString() : 'N/A';
  const paidAt = booking.paidAt ? new Date(booking.paidAt).toLocaleString() : 'N/A';

  return `
    <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 24px; color: #0f172a;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #0d9488, #0369a1); color: white; padding: 24px;">
          <h1 style="margin: 0 0 8px; font-size: 24px;">Property Rental Invoice</h1>
          <p style="margin: 0; opacity: 0.9;">Payment confirmation for your rental booking</p>
        </div>
        <div style="padding: 24px;">
          <p style="margin: 0 0 16px; font-size: 16px;">Hello ${booking.tenantName || 'Customer'},</p>
          <p style="margin: 0 0 24px; color: #475569; line-height: 1.6;">Your payment has been received successfully. Here is your invoice summary.</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 10px 0; color: #64748b;">Property</td><td style="padding: 10px 0; text-align: right; font-weight: 700;">${booking.propertyName || 'Property Booking'}</td></tr>
            <tr><td style="padding: 10px 0; color: #64748b;">Amount Paid</td><td style="padding: 10px 0; text-align: right; font-weight: 700;">${formatMoney(booking.amount)}</td></tr>
            <tr><td style="padding: 10px 0; color: #64748b;">Move-in Date</td><td style="padding: 10px 0; text-align: right; font-weight: 700;">${moveInDate}</td></tr>
            <tr><td style="padding: 10px 0; color: #64748b;">Transaction ID</td><td style="padding: 10px 0; text-align: right; font-weight: 700; word-break: break-all;">${booking.transactionId || 'N/A'}</td></tr>
            <tr><td style="padding: 10px 0; color: #64748b;">Payment Status</td><td style="padding: 10px 0; text-align: right; font-weight: 700; color: #059669;">Paid</td></tr>
            <tr><td style="padding: 10px 0; color: #64748b;">Paid At</td><td style="padding: 10px 0; text-align: right; font-weight: 700;">${paidAt}</td></tr>
          </table>
          <div style="margin-top: 24px; padding: 16px; background: #f8fafc; border-radius: 12px; color: #475569; line-height: 1.6;">
            Keep this email for your records. You can review the same booking status from your dashboard at any time.
          </div>
        </div>
      </div>
    </div>
  `;
};

const sendInvoiceEmail = async (booking) => {
  if (!booking || booking.invoiceSentAt || booking.paymentStatus !== 'Paid') {
    return false;
  }

  const recipient = booking.tenantEmail;
  if (!recipient) {
    return false;
  }

  try {
    await sendEmail({
      to: recipient,
      subject: `Your invoice for ${booking.propertyName || 'your booking'}`,
      text: [
        `Property Rental invoice for ${booking.propertyName || 'Property Booking'}`,
        `Amount Paid: ${formatMoney(booking.amount)}`,
        `Move-in Date: ${booking.moveInDate ? new Date(booking.moveInDate).toLocaleDateString() : 'N/A'}`,
        `Transaction ID: ${booking.transactionId || 'N/A'}`,
        `Payment Status: Paid`
      ].join('\n'),
      html: buildInvoiceHtml(booking)
    });

    booking.invoiceSentAt = new Date();
    if (typeof booking.save === 'function') {
      await booking.save();
    }

    return true;
  } catch (error) {
    console.error('Invoice email send error:', error.message);
    return false;
  }
};
module.exports = {
  formatMoney,
  buildInvoiceHtml,
  sendInvoiceEmail
};