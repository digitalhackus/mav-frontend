import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Search, Plus, Eye } from "lucide-react";

const suppliers = [
  { id: "1", name: "AutoParts Inc", contact: "(555) 201-3000", category: "General Parts", balance: "Rs 0", status: "Active" },
  { id: "2", name: "BrakeTech", contact: "(555) 202-3001", category: "Brake Systems", balance: "Rs 125,000", status: "Active" },
  { id: "3", name: "SparkMaster", contact: "(555) 203-3002", category: "Ignition", balance: "Rs 0", status: "Active" },
  { id: "4", name: "PowerCell Co", contact: "(555) 204-3003", category: "Electrical", balance: "Rs 340,000", status: "Active" },
  { id: "5", name: "BrightLights", contact: "(555) 205-3004", category: "Lighting", balance: "Rs 0", status: "Active" },
  { id: "6", name: "FluidDynamics", contact: "(555) 206-3005", category: "Fluids & Oils", balance: "Rs 89,000", status: "Active" },
  { id: "7", name: "SensorTech", contact: "(555) 207-3006", category: "Sensors", balance: "Rs 0", status: "Active" },
];

export function Suppliers() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Supplier Management</h1>
          <p className="text-gray-600">Manage your suppliers and vendors</p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />
          Add Supplier
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search suppliers by name or category..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Outstanding Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell>{supplier.name}</TableCell>
                  <TableCell>{supplier.contact}</TableCell>
                  <TableCell>{supplier.category}</TableCell>
                  <TableCell className={supplier.balance !== "Rs 0" ? "text-orange-600" : ""}>
                    {supplier.balance}
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">{supplier.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">Edit</Button>
                      <Button size="sm" variant="outline">
                        <Eye className="h-3 w-3 mr-1" />
                        History
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
