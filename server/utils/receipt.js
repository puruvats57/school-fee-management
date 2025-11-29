const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateReceipt = async (transaction, student, fee) => {
  return new Promise((resolve, reject) => {
    try {
      // Create receipts directory if it doesn't exist
      const receiptsDir = path.join(__dirname, '../receipts');
      if (!fs.existsSync(receiptsDir)) {
        fs.mkdirSync(receiptsDir, { recursive: true });
      }

      const receiptPath = path.join(receiptsDir, `receipt_${transaction.orderId}.pdf`);
      const doc = new PDFDocument({ margin: 50 });

      // Pipe PDF to file
      const stream = fs.createWriteStream(receiptPath);
      doc.pipe(stream);

      // Header
      doc.fontSize(24)
         .fillColor('#0066cc')
         .text('SCHOOL FEE PAYMENT RECEIPT', { align: 'center' })
         .moveDown();

      doc.fontSize(12)
         .fillColor('#000000')
         .text('School Fee Management Portal', { align: 'center' })
         .moveDown(2);

      // Receipt Number and Date
      doc.fontSize(10)
         .fillColor('#666666')
         .text(`Receipt No: ${transaction.orderId}`, { align: 'left' })
         .text(`Date: ${new Date(transaction.createdAt).toLocaleDateString('en-IN', { 
           day: '2-digit', 
           month: 'long', 
           year: 'numeric' 
         })}`, { align: 'right' })
         .moveDown();

      // Line separator
      doc.moveTo(50, doc.y)
         .lineTo(550, doc.y)
         .stroke()
         .moveDown();

      // Student Information
      doc.fontSize(14)
         .fillColor('#000000')
         .text('Student Information', { underline: true })
         .moveDown(0.5);

      doc.fontSize(11)
         .fillColor('#333333')
         .text(`Name: ${student.name}`)
         .text(`Roll Number: ${student.rollNumber}`)
         .text(`Class: ${student.class} - Section: ${student.section}`)
         .text(`Email: ${student.email}`)
         .moveDown();

      // Payment Details
      doc.fontSize(14)
         .fillColor('#000000')
         .text('Payment Details', { underline: true })
         .moveDown(0.5);

      doc.fontSize(11)
         .fillColor('#333333')
         .text(`Order ID: ${transaction.orderId}`)
         .text(`Payment ID: ${transaction.paymentId || 'N/A'}`)
         .text(`Payment Method: ${transaction.paymentMethod || 'Online'}`)
         .text(`Payment Status: ${transaction.status.toUpperCase()}`)
         .moveDown();

      // Fee Breakdown
      doc.fontSize(14)
         .fillColor('#000000')
         .text('Fee Breakdown', { underline: true })
         .moveDown(0.5);

      let yPos = doc.y;
      fee.components.forEach((component, index) => {
        doc.fontSize(10)
           .fillColor('#333333')
           .text(`${component.name}:`, 50, yPos)
           .text(`₹${component.amount.toFixed(2)}`, 400, yPos, { align: 'right' });
        yPos += 20;
      });

      doc.moveDown();
      
      // Line separator
      doc.moveTo(50, doc.y)
         .lineTo(550, doc.y)
         .stroke()
         .moveDown();

      // Total Amount
      doc.fontSize(12)
         .fillColor('#000000')
         .text('Total Amount Paid:', 50, doc.y)
         .fontSize(14)
         .fillColor('#0066cc')
         .text(`₹${transaction.amount.toFixed(2)}`, 400, doc.y - 2, { align: 'right' })
         .moveDown(2);

      // Footer
      doc.fontSize(10)
         .fillColor('#666666')
         .text('This is a computer-generated receipt and does not require a signature.', 
               { align: 'center' })
         .moveDown();
      
      doc.text('Thank you for your payment!', { align: 'center' })
         .moveDown(2);

      // Signature line
      doc.text('_________________________', 100, doc.y, { align: 'left' })
         .text('Authorized Signatory', 100, doc.y + 5, { align: 'left' });

      // Finalize PDF
      doc.end();

      stream.on('finish', () => {
        resolve(receiptPath);
      });

      stream.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateReceipt };

