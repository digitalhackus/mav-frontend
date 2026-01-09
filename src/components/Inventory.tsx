import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Search, Plus, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const inventoryItems = [
  { id: "1", name: "Engine Oil Filter", category: "Filters", quantity: 45, price: 2599, supplier: "AutoParts Inc", status: "In Stock" },
  { id: "2", name: "Brake Pads Set", category: "Brakes", quantity: 12, price: 8999, supplier: "BrakeTech", status: "Low" },
  { id: "3", name: "Air Filter", category: "Filters", quantity: 67, price: 1999, supplier: "AutoParts Inc", status: "In Stock" },
  { id: "4", name: "Spark Plugs (Set of 4)", category: "Ignition", quantity: 3, price: 3250, supplier: "SparkMaster", status: "Low" },
  { id: "5", name: "Wiper Blades", category: "Accessories", quantity: 28, price: 2499, supplier: "AutoParts Inc", status: "In Stock" },
  { id: "6", name: "Car Battery", category: "Electrical", quantity: 0, price: 12999, supplier: "PowerCell Co", status: "Out of Stock" },
  { id: "7", name: "Headlight Bulb", category: "Lighting", quantity: 56, price: 1599, supplier: "BrightLights", status: "In Stock" },
  { id: "8", name: "Transmission Fluid", category: "Fluids", quantity: 22, price: 4500, supplier: "FluidDynamics", status: "In Stock" },
  { id: "9", name: "Tire Pressure Sensor", category: "Sensors", quantity: 8, price: 5500, supplier: "SensorTech", status: "Low" },
  { id: "10", name: "Cabin Air Filter", category: "Filters", quantity: 34, price: 2250, supplier: "AutoParts Inc", status: "In Stock" },
];

export function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "In Stock": return "default";
      case "Low": return "secondary";
      case "Out of Stock": return "destructive";
      default: return "default";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Inventory Management</h1>
          <p className="text-gray-600">Manage your parts and products</p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />
          Add New Item
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search items..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Filters">Filters</SelectItem>
                <SelectItem value="Brakes">Brakes</SelectItem>
                <SelectItem value="Ignition">Ignition</SelectItem>
                <SelectItem value="Accessories">Accessories</SelectItem>
                <SelectItem value="Electrical">Electrical</SelectItem>
                <SelectItem value="Lighting">Lighting</SelectItem>
                <SelectItem value="Fluids">Fluids</SelectItem>
                <SelectItem value="Sensors">Sensors</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>
                    <span className="text-xs font-normal mr-0.5">Rs</span>
                    <span className="font-medium">{item.price.toLocaleString()}</span>
                  </TableCell>
                  <TableCell>{item.supplier}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">Edit</Button>
                      <Button size="sm" variant="ghost">Delete</Button>
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
