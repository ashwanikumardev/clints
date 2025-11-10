const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');

const generateInvoicePDF = async (invoice, client) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Create PDF document
      const doc = new PDFDocument({ margin: 50 });
      
      // Generate filename
      const filename = `invoice-${invoice.invoiceNumber}.pdf`;
      const filepath = path.join(__dirname, '..', 'uploads', 'invoices', filename);
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(filepath), { recursive: true });
      
      // Create write stream
      const stream = require('fs').createWriteStream(filepath);
      doc.pipe(stream);

      // Company Header
      doc.fontSize(20)
         .fillColor('#4f46e5')
         .text('AugCodex', 50, 50);
      
      doc.fontSize(12)
         .fillColor('#374151')
         .text('Professional Web Development Services', 50, 75)
         .text('Email: contact@augcodex.com', 50, 90)
         .text('Phone: +1 (555) 123-4567', 50, 105);

      // Invoice Title
      doc.fontSize(24)
         .fillColor('#1f2937')
         .text('INVOICE', 400, 50);

      // Invoice Details
      doc.fontSize(12)
         .fillColor('#374151')
         .text(`Invoice #: ${invoice.invoiceNumber}`, 400, 80)
         .text(`Issue Date: ${invoice.issueDate.toLocaleDateString()}`, 400, 95)
         .text(`Due Date: ${invoice.dueDate.toLocaleDateString()}`, 400, 110);

      // Line separator
      doc.moveTo(50, 140)
         .lineTo(550, 140)
         .strokeColor('#e5e7eb')
         .stroke();

      // Bill To Section
      doc.fontSize(14)
         .fillColor('#1f2937')
         .text('Bill To:', 50, 160);

      doc.fontSize(12)
         .fillColor('#374151')
         .text(client.name, 50, 180)
         .text(client.company || '', 50, 195)
         .text(client.email, 50, 210);

      if (client.address) {
        let yPos = 225;
        if (client.address.street) {
          doc.text(client.address.street, 50, yPos);
          yPos += 15;
        }
        if (client.address.city || client.address.state || client.address.zipCode) {
          const cityStateZip = [client.address.city, client.address.state, client.address.zipCode]
            .filter(Boolean).join(', ');
          doc.text(cityStateZip, 50, yPos);
          yPos += 15;
        }
        if (client.address.country) {
          doc.text(client.address.country, 50, yPos);
        }
      }

      // Items Table Header
      const tableTop = 300;
      doc.fontSize(12)
         .fillColor('#1f2937');

      // Table headers
      doc.text('Description', 50, tableTop)
         .text('Qty', 300, tableTop)
         .text('Rate', 350, tableTop)
         .text('Amount', 450, tableTop);

      // Table header line
      doc.moveTo(50, tableTop + 20)
         .lineTo(550, tableTop + 20)
         .strokeColor('#d1d5db')
         .stroke();

      // Items
      let yPosition = tableTop + 35;
      invoice.items.forEach((item, index) => {
        doc.fillColor('#374151')
           .text(item.description, 50, yPosition)
           .text(item.quantity.toString(), 300, yPosition)
           .text(`$${item.rate.toFixed(2)}`, 350, yPosition)
           .text(`$${item.amount.toFixed(2)}`, 450, yPosition);
        
        yPosition += 25;
      });

      // Totals section
      const totalsTop = yPosition + 30;
      
      // Subtotal
      doc.text('Subtotal:', 400, totalsTop)
         .text(`$${invoice.subtotal.toFixed(2)}`, 500, totalsTop);

      // Tax
      if (invoice.taxRate > 0) {
        doc.text(`Tax (${invoice.taxRate}%):`, 400, totalsTop + 20)
           .text(`$${invoice.taxAmount.toFixed(2)}`, 500, totalsTop + 20);
      }

      // Discount
      if (invoice.discountRate > 0) {
        doc.text(`Discount (${invoice.discountRate}%):`, 400, totalsTop + 40)
           .text(`-$${invoice.discountAmount.toFixed(2)}`, 500, totalsTop + 40);
      }

      // Total line
      const totalLine = totalsTop + (invoice.taxRate > 0 ? 60 : 40) + (invoice.discountRate > 0 ? 20 : 0);
      doc.moveTo(400, totalLine)
         .lineTo(550, totalLine)
         .strokeColor('#d1d5db')
         .stroke();

      // Total amount
      doc.fontSize(14)
         .fillColor('#1f2937')
         .text('Total:', 400, totalLine + 10)
         .text(`$${invoice.total.toFixed(2)}`, 500, totalLine + 10);

      // Notes section
      if (invoice.notes) {
        doc.fontSize(12)
           .fillColor('#374151')
           .text('Notes:', 50, totalLine + 50)
           .text(invoice.notes, 50, totalLine + 70, { width: 500 });
      }

      // Terms section
      const termsTop = totalLine + (invoice.notes ? 120 : 80);
      doc.fontSize(10)
         .fillColor('#6b7280')
         .text('Terms & Conditions:', 50, termsTop)
         .text(invoice.terms, 50, termsTop + 15, { width: 500 });

      // Footer
      doc.fontSize(10)
         .fillColor('#9ca3af')
         .text('Thank you for your business!', 50, doc.page.height - 100)
         .text('This invoice was generated automatically by AugCodex Client Manager', 50, doc.page.height - 85);

      // Finalize PDF
      doc.end();

      stream.on('finish', () => {
        resolve(`uploads/invoices/${filename}`);
      });

      stream.on('error', (error) => {
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
};

const generateInvoicePreview = async (invoiceData) => {
  // This function can be used to generate a preview without saving to file
  // Implementation would be similar but return buffer instead of saving
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Similar PDF generation logic as above
      // ... (shortened for brevity)

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateInvoicePDF,
  generateInvoicePreview
};
