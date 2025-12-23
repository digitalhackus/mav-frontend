import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import { Plus, Edit, Trash2, Package, Loader2, AlertTriangle } from "lucide-react";
import { inventoryAPI, catalogAPI } from "../api/client";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useConfirmDialog } from "../hooks/useConfirmDialog";

interface InventoryItem {
  _id?: string;
  name: string;
  sku?: string;
  category?: string;
  unit: string;
  currentStock: number;
  minStock: number;
  costPrice: number;
  salePrice: number;
  isActive: boolean;
  isFromCatalog?: boolean;
  catalogId?: string;
}

export function Inventory() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin" || user?.role === "admin";
  const { confirm, ConfirmDialog } = useConfirmDialog();
  
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "",
    unit: "piece",
    currentStock: "",
    minStock: "",
    costPrice: "",
    salePrice: "",
  });

  useEffect(() => {
    fetchInventory();
  }, [categoryFilter, lowStockOnly]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      
      // Fetch both inventory items and catalog products
      const [inventoryResponse, catalogResponse] = await Promise.all([
        inventoryAPI.getAll(
          searchTerm || undefined,
          categoryFilter !== "all" ? categoryFilter : undefined,
          lowStockOnly
        ),
        catalogAPI.getByType('product')
      ]);

      const inventoryItems: InventoryItem[] = inventoryResponse.success ? inventoryResponse.data : [];
      const catalogProducts = catalogResponse.success ? catalogResponse.data : [];

      // Convert catalog products to inventory item format
      const productsFromCatalog: InventoryItem[] = catalogProducts.map((product: any) => ({
        _id: product._id || product.id,
        name: product.name,
        sku: product.sku || '',
        category: product.category || '',
        unit: product.unit || 'piece',
        currentStock: product.quantity || 0,
        minStock: 0, // Default min stock
        costPrice: product.cost || 0,
        salePrice: product.basePrice || product.cost || 0,
        isActive: product.isActive !== false,
        isFromCatalog: true, // Flag to identify catalog products
        catalogId: product._id || product.id
      }));

      // Merge inventory items and catalog products
      // If a product exists in both, prefer the inventory item (more detailed)
      const mergedItems: InventoryItem[] = [...inventoryItems];
      
      catalogProducts.forEach((product: any) => {
        // Check if this product already exists in inventory (by name or catalog link)
        const existingIndex = mergedItems.findIndex(item => 
          item.name.toLowerCase() === product.name.toLowerCase() ||
          (item as any).catalogId === (product._id || product.id)
        );
        
        if (existingIndex === -1) {
          // Add catalog product as new inventory item
          mergedItems.push({
            _id: product._id || product.id,
            name: product.name,
            sku: product.sku || '',
            category: product.category || '',
            unit: product.unit || 'piece',
            currentStock: product.quantity || 0,
            minStock: 0,
            costPrice: product.cost || 0,
            salePrice: product.basePrice || product.cost || 0,
            isActive: product.isActive !== false,
            isFromCatalog: true,
            catalogId: product._id || product.id
          });
        }
      });

      setItems(mergedItems);
    } catch (error: any) {
      console.error("Failed to fetch inventory:", error);
      toast.error(error.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        sku: item.sku || "",
        category: item.category || "",
        unit: item.unit || "piece",
        currentStock: item.currentStock.toString(),
        minStock: item.minStock.toString(),
        costPrice: item.costPrice.toString(),
        salePrice: item.salePrice.toString(),
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: "",
        sku: "",
        category: "",
        unit: "piece",
        currentStock: "",
        minStock: "",
        costPrice: "",
        salePrice: "",
      });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingItem(null);
    setFormData({
      name: "",
      sku: "",
      category: "",
      unit: "piece",
      currentStock: "",
      minStock: "",
      costPrice: "",
      salePrice: "",
    });
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error("Name is required");
      return;
    }

    try {
      const itemData = {
        name: formData.name,
        sku: formData.sku || undefined,
        category: formData.category || undefined,
        unit: formData.unit,
        currentStock: parseFloat(formData.currentStock) || 0,
        minStock: parseFloat(formData.minStock) || 0,
        costPrice: parseFloat(formData.costPrice) || 0,
        salePrice: parseFloat(formData.salePrice) || 0,
      };

      if (editingItem?._id) {
        await inventoryAPI.update(editingItem._id, itemData);
        toast.success("Inventory item updated successfully");
      } else {
        await inventoryAPI.create(itemData);
        toast.success("Inventory item created successfully");
      }

      handleCloseDialog();
      fetchInventory();
    } catch (error: any) {
      console.error("Failed to save inventory item:", error);
      toast.error(error.message || "Failed to save inventory item");
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "Delete Inventory Item",
      description: "Are you sure you want to delete this inventory item? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive",
    });

    if (!confirmed) {
      return;
    }

    try {
      await inventoryAPI.delete(id);
      toast.success("Inventory item deleted successfully");
      fetchInventory();
    } catch (error: any) {
      console.error("Failed to delete inventory item:", error);
      toast.error(error.message || "Failed to delete inventory item");
    }
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.currentStock < 0) {
      return { label: "Out of Stock", variant: "destructive" as const };
    }
    if (item.currentStock <= item.minStock) {
      return { label: "Low Stock", variant: "destructive" as const };
    }
    return { label: "In Stock", variant: "default" as const };
  };

  const categories = Array.from(new Set(items.map(item => item.category).filter(Boolean)));

  const filteredItems = items.filter(item => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        item.name.toLowerCase().includes(searchLower) ||
        item.sku?.toLowerCase().includes(searchLower) ||
        item.category?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-600 mt-1">Manage your inventory items</p>
        </div>
        {isAdmin && (
          <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
            Add Item
        </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
              <Input
            placeholder="Search by name, SKU, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                fetchInventory();
              }
            }}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
            <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
              </SelectContent>
            </Select>
        <Button
          variant={lowStockOnly ? "default" : "outline"}
          onClick={() => {
            setLowStockOnly(!lowStockOnly);
            fetchInventory();
          }}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Low Stock Only
        </Button>
          </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
              <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Current Stock</TableHead>
              <TableHead>Min Stock</TableHead>
              <TableHead>Sale Price</TableHead>
                <TableHead>Status</TableHead>
              {isAdmin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 9 : 8} className="text-center py-8 text-gray-500">
                  No inventory items found
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => {
                const stockStatus = getStockStatus(item);
                return (
                  <TableRow key={item._id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.sku || "-"}</TableCell>
                    <TableCell>{item.category || "-"}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                  <TableCell>
                      <span className={item.currentStock < 0 ? "text-red-600 font-semibold" : ""}>
                        {item.currentStock}
                      </span>
                  </TableCell>
                    <TableCell>{item.minStock}</TableCell>
                    <TableCell>${item.salePrice.toFixed(2)}</TableCell>
                  <TableCell>
                      <Badge variant={stockStatus.variant}>
                        {stockStatus.label}
                    </Badge>
                  </TableCell>
                    {isAdmin && (
                  <TableCell>
                    <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => item._id && handleDelete(item._id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                    </div>
                  </TableCell>
                    )}
                </TableRow>
                );
              })
            )}
            </TableBody>
          </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Inventory Item" : "Add Inventory Item"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update the inventory item details"
                : "Add a new item to your inventory"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., 5W-30 Engine Oil"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  placeholder="Optional product code"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  placeholder="e.g., Oil, Filter, Brake"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) =>
                    setFormData({ ...formData, unit: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="piece">Piece</SelectItem>
                    <SelectItem value="liter">Liter</SelectItem>
                    <SelectItem value="kg">Kilogram</SelectItem>
                    <SelectItem value="box">Box</SelectItem>
                    <SelectItem value="set">Set</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentStock">Current Stock</Label>
                <Input
                  id="currentStock"
                  type="number"
                  value={formData.currentStock}
                  onChange={(e) =>
                    setFormData({ ...formData, currentStock: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minStock">Min Stock (Alert Level)</Label>
                <Input
                  id="minStock"
                  type="number"
                  value={formData.minStock}
                  onChange={(e) =>
                    setFormData({ ...formData, minStock: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="costPrice">Cost Price</Label>
                <Input
                  id="costPrice"
                  type="number"
                  step="0.01"
                  value={formData.costPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, costPrice: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salePrice">Sale Price</Label>
                <Input
                  id="salePrice"
                  type="number"
                  step="0.01"
                  value={formData.salePrice}
                  onChange={(e) =>
                    setFormData({ ...formData, salePrice: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Confirm Dialog */}
      <ConfirmDialog />
    </div>
  );
}
