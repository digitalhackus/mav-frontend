import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Printer, Download, Mail, Wrench } from "lucide-react";

const invoiceData = {
  invoiceNumber: "INV-001234",
  date: "October 31, 2025",
  customer: {
    name: "John Smith",
    phone: "(555) 123-4567",
    email: "john.smith@email.com",
  },
  vehicle: {
    make: "Toyota Camry",
    year: "2020",
    plate: "ABC-1234",
    vin: "1HGBH41JXMN109186",
  },
  items: [
    { description: "Engine Oil Filter", quantity: 1, price: 2599 },
    { description: "Brake Pads Set", quantity: 1, price: 8999 },
    { description: "Oil Change Service", quantity: 1, price: 4500 },
    { description: "Brake System Inspection", quantity: 1, price: 3500 },
  ],
};

export function Invoice() {
  const subtotal = invoiceData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Invoice Preview</h1>
          <p className="text-gray-600">Invoice #{invoiceData.invoiceNumber}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button className="bg-orange-500 hover:bg-orange-600">
            <Mail className="h-4 w-4 mr-2" />
            Email Invoice
          </Button>
        </div>
      </div>

      <Card className="bg-white shadow-lg">
        <CardContent className="p-8 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500 p-3 rounded-lg">
                <Wrench className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl">Momentum AutoWorks</h2>
                <p className="text-sm text-gray-600">123 Auto Street, Workshop City, WS 12345</p>
                <p className="text-sm text-gray-600">(555) 100-2000 | info@momentumauto.com</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Invoice Number</p>
              <p className="font-semibold">{invoiceData.invoiceNumber}</p>
              <p className="text-sm text-gray-600 mt-2">Date</p>
              <p>{invoiceData.date}</p>
            </div>
          </div>

          <Separator />

          {/* Customer & Vehicle Info */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="mb-2 text-gray-600">Customer Information</h3>
              <p>{invoiceData.customer.name}</p>
              <p className="text-sm text-gray-600">{invoiceData.customer.phone}</p>
              <p className="text-sm text-gray-600">{invoiceData.customer.email}</p>
            </div>
            <div>
              <h3 className="mb-2 text-gray-600">Vehicle Information</h3>
              <p>{invoiceData.vehicle.year} {invoiceData.vehicle.make}</p>
              <p className="text-sm text-gray-600">License Plate: {invoiceData.vehicle.plate}</p>
              <p className="text-sm text-gray-600">VIN: {invoiceData.vehicle.vin}</p>
            </div>
          </div>

          <Separator />

          {/* Items Table */}
          <div>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3">Description</th>
                  <th className="text-center py-3">Quantity</th>
                  <th className="text-right py-3">Unit Price</th>
                  <th className="text-right py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoiceData.items.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-3">{item.description}</td>
                    <td className="text-center py-3">{item.quantity}</td>
                    <td className="text-right py-3">
                      <span className="text-xs font-normal mr-0.5">Rs</span>
                      <span className="font-medium">{item.price.toLocaleString()}</span>
                    </td>
                    <td className="text-right py-3">
                      <span className="text-xs font-normal mr-0.5">Rs</span>
                      <span className="font-medium">{(item.price * item.quantity).toLocaleString()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span>
                  <span className="text-sm font-normal mr-0.5">Rs</span>
                  <span className="font-medium">{subtotal.toLocaleString()}</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax (8%):</span>
                <span>
                  <span className="text-sm font-normal mr-0.5">Rs</span>
                  <span className="font-medium">{Math.round(tax).toLocaleString()}</span>
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg">
                <span>Total:</span>
                <span className="text-orange-500">
                  <span className="text-lg font-normal mr-0.5">Rs</span>
                  <span className="font-semibold">{Math.round(total).toLocaleString()}</span>
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Footer */}
          <div className="text-center text-sm text-gray-600">
            <p>Thank you for your business!</p>
            <p className="mt-1">For questions about this invoice, please contact us at (555) 100-2000</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
