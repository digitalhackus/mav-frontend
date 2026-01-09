import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
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
import { Separator } from "./ui/separator";
import { Checkbox } from "./ui/checkbox";
import { Plus, Edit, Trash2, Wrench, Package, Loader2, X } from "lucide-react";
import { catalogAPI } from "../api/client";
import { toast } from "sonner";

interface SubOption {
  key: string;
  label: string;
  type: 'text' | 'select' | 'multiselect';
  options?: string[];
}

interface CatalogItem {
  _id?: string;
  id?: string;
  name: string;
  type: 'service' | 'product';
  description?: string;
  cost: number;
  basePrice?: number;
  defaultDurationMinutes?: number;
  estimatedTime?: string;
  quantity?: number;
  unit?: string;
  visibility: 'default' | 'local';
  isActive: boolean;
  subOptions?: SubOption[];
  allowComments?: boolean;
  allowedParts?: string[];
}

export function CatalogManagement() {
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<CatalogItem[]>([]);
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');

  const [formData, setFormData] = useState({
    name: "",
    type: 'service' as 'service' | 'product',
    description: "",
    cost: "",
    basePrice: "",
    defaultDurationMinutes: "",
    estimatedTime: "",
    quantity: "",
    unit: "piece",
    visibility: 'local' as 'default' | 'local',
    subOptions: [] as SubOption[],
    allowComments: false,
    allowedParts: [] as string[],
  });

  useEffect(() => {
    fetchCatalog();
  }, []);

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const response = await catalogAPI.getAll();
      if (response.success) {
        const items = response.data;
        setServices(items.filter((item: CatalogItem) => item.type === 'service'));
        setProducts(items.filter((item: CatalogItem) => item.type === 'product'));
      }
    } catch (error: any) {
      console.error("Failed to fetch catalog:", error);
      toast.error(error.message || "Failed to load catalog");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (item?: CatalogItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        type: item.type,
        description: item.description || "",
        cost: item.cost.toString(),
        basePrice: item.basePrice?.toString() || item.cost.toString(),
        defaultDurationMinutes: item.defaultDurationMinutes?.toString() || "",
        estimatedTime: item.estimatedTime || "",
        quantity: item.quantity?.toString() || "",
        unit: item.unit || "piece",
        visibility: item.visibility,
        subOptions: item.subOptions || [],
        allowComments: item.allowComments || false,
        allowedParts: item.allowedParts || [],
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: "",
        type: activeTab === 'services' ? 'service' : 'product',
        description: "",
        cost: "",
        basePrice: "",
        defaultDurationMinutes: "",
        estimatedTime: "",
        quantity: "",
        unit: "piece",
        visibility: 'local',
        subOptions: [],
        allowComments: false,
        allowedParts: [],
      });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingItem(null);
      setFormData({
        name: "",
        type: 'service',
        description: "",
        cost: "",
        basePrice: "",
        defaultDurationMinutes: "",
        estimatedTime: "",
        quantity: "",
        unit: "piece",
        visibility: 'local',
        subOptions: [],
        allowComments: false,
        allowedParts: [],
      });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.cost) {
      toast.error("Name and cost are required");
      return;
    }

    try {
      const itemData: any = {
        name: formData.name,
        type: formData.type,
        description: formData.description,
        cost: parseFloat(formData.cost),
        visibility: formData.visibility,
      };

      if (formData.type === 'service') {
        itemData.estimatedTime = formData.estimatedTime;
        itemData.basePrice = formData.basePrice ? parseFloat(formData.basePrice) : parseFloat(formData.cost);
        itemData.defaultDurationMinutes = formData.defaultDurationMinutes ? parseInt(formData.defaultDurationMinutes) : 0;
        itemData.subOptions = formData.subOptions;
        itemData.allowComments = formData.allowComments;
        itemData.allowedParts = formData.allowedParts.filter(p => p.trim() !== '');
      } else {
        itemData.quantity = formData.quantity ? parseFloat(formData.quantity) : 0;
        itemData.unit = formData.unit;
      }

      if (editingItem) {
        const id = editingItem._id || editingItem.id;
        await catalogAPI.update(id!, itemData);
        toast.success("Catalog item updated successfully");
      } else {
        await catalogAPI.create(itemData);
        toast.success("Catalog item created successfully");
      }

      await fetchCatalog();
      handleCloseDialog();
    } catch (error: any) {
      console.error("Failed to save catalog item:", error);
      toast.error(error.message || "Failed to save catalog item");
    }
  };

  const handleDelete = async (item: CatalogItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return;
    }

    try {
      const id = item._id || item.id;
      await catalogAPI.delete(id!);
      toast.success("Catalog item deleted successfully");
      await fetchCatalog();
    } catch (error: any) {
      console.error("Failed to delete catalog item:", error);
      toast.error(error.message || "Failed to delete catalog item");
    }
  };

  const handleToggleActive = async (item: CatalogItem) => {
    try {
      const id = item._id || item.id;
      await catalogAPI.update(id!, { isActive: !item.isActive });
      toast.success(`Item ${item.isActive ? 'deactivated' : 'activated'} successfully`);
      await fetchCatalog();
    } catch (error: any) {
      console.error("Failed to update catalog item:", error);
      toast.error(error.message || "Failed to update catalog item");
    }
  };

  const currentItems = activeTab === 'services' ? services : products;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Service & Product Catalog</h3>
          <p className="text-sm text-slate-500 mt-1">
            Manage your services and products. Default items are visible to all accounts, local items are only visible to your account.
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-[#c53032] hover:bg-[#a6212a]">
          <Plus className="h-4 w-4 mr-2" />
          Add {activeTab === 'services' ? 'Service' : 'Product'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('services')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'services'
              ? 'border-b-2 border-[#c53032] text-[#c53032]'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Wrench className="h-4 w-4 inline mr-2" />
          Services ({services.length})
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'products'
              ? 'border-b-2 border-[#c53032] text-[#c53032]'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Package className="h-4 w-4 inline mr-2" />
          Products ({products.length})
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#c53032]" />
        </div>
      ) : currentItems.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p>No {activeTab} found. Click "Add {activeTab === 'services' ? 'Service' : 'Product'}" to create one.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Cost</TableHead>
                {activeTab === 'services' ? (
                  <>
                    <TableHead>Price</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Estimated Time</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit</TableHead>
                  </>
                )}
                <TableHead>Visibility</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.map((item) => (
                <TableRow key={item._id || item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {item.description || '-'}
                  </TableCell>
                  <TableCell>Rs {item.cost.toLocaleString()}</TableCell>
                  {activeTab === 'services' ? (
                    <>
                      <TableCell>Rs {(item.basePrice || item.cost).toLocaleString()}</TableCell>
                      <TableCell>
                        {item.defaultDurationMinutes ? `${item.defaultDurationMinutes} min` : '-'}
                      </TableCell>
                      <TableCell>{item.estimatedTime || '-'}</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>{item.quantity || 0}</TableCell>
                      <TableCell>{item.unit || 'piece'}</TableCell>
                    </>
                  )}
                  <TableCell>
                    <Badge
                      variant={item.visibility === 'default' ? 'default' : 'outline'}
                      className={
                        item.visibility === 'default'
                          ? 'bg-blue-100 text-blue-700 border-blue-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }
                    >
                      {item.visibility === 'default' ? 'Default' : 'Local'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={item.isActive ? 'default' : 'outline'}
                      className={
                        item.isActive
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : 'bg-red-100 text-red-700 border-red-200'
                      }
                    >
                      {item.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(item)}
                      >
                        {item.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      {item.visibility === 'local' && (
                        <>
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
                            onClick={() => handleDelete(item)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {item.visibility === 'default' && (
                        <span className="text-xs text-slate-400">Default items cannot be edited</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit' : 'Add'} {formData.type === 'service' ? 'Service' : 'Product'}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? 'Update the catalog item details'
                : 'Create a new catalog item. Local items are only visible to your account.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Oil Change"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'service' | 'product') => setFormData({ ...formData, type: value })}
                  disabled={!!editingItem}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost">Cost (Rs) *</Label>
                <Input
                  id="cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              {formData.type === 'service' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="basePrice">Base Price (Rs)</Label>
                    <Input
                      id="basePrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.basePrice}
                      onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                      placeholder="Default price for this service"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultDurationMinutes">Duration (minutes)</Label>
                    <Input
                      id="defaultDurationMinutes"
                      type="number"
                      min="0"
                      value={formData.defaultDurationMinutes}
                      onChange={(e) => setFormData({ ...formData, defaultDurationMinutes: e.target.value })}
                      placeholder="e.g., 30, 60, 120"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estimatedTime">Estimated Time (display)</Label>
                    <Input
                      id="estimatedTime"
                      value={formData.estimatedTime}
                      onChange={(e) => setFormData({ ...formData, estimatedTime: e.target.value })}
                      placeholder="e.g., 30 min, 1 hour"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="0"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Input
                      id="unit"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="e.g., piece, box, kg"
                    />
                  </div>
                </>
              )}
            </div>

            {formData.type === 'service' && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Sub-options & Parts</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newKey = `option_${Date.now()}`;
                        setFormData({
                          ...formData,
                          subOptions: [...formData.subOptions, { key: newKey, label: '', type: 'text', options: [] }]
                        });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Sub-option
                    </Button>
                  </div>

                  {formData.subOptions.map((option, index) => (
                    <div key={option.key} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Sub-option {index + 1}</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              subOptions: formData.subOptions.filter((_, i) => i !== index)
                            });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor={`subOption-label-${index}`}>Label *</Label>
                          <Input
                            id={`subOption-label-${index}`}
                            value={option.label}
                            onChange={(e) => {
                              const updated = [...formData.subOptions];
                              updated[index].label = e.target.value;
                              setFormData({ ...formData, subOptions: updated });
                            }}
                            placeholder="e.g., Oil Filter"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`subOption-type-${index}`}>Type</Label>
                          <Select
                            value={option.type}
                            onValueChange={(value: 'text' | 'select' | 'multiselect') => {
                              const updated = [...formData.subOptions];
                              updated[index].type = value;
                              if (value === 'text') {
                                updated[index].options = [];
                              }
                              setFormData({ ...formData, subOptions: updated });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="select">Select</SelectItem>
                              <SelectItem value="multiselect">Multi-select</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {(option.type === 'select' || option.type === 'multiselect') && (
                        <div className="space-y-2">
                          <Label>Options (one per line)</Label>
                          <Textarea
                            value={(option.options || []).join('\n')}
                            onChange={(e) => {
                              const updated = [...formData.subOptions];
                              updated[index].options = e.target.value.split('\n').filter(o => o.trim() !== '');
                              setFormData({ ...formData, subOptions: updated });
                            }}
                            placeholder="Option 1&#10;Option 2&#10;Option 3"
                            rows={3}
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="allowComments"
                        checked={formData.allowComments}
                        onCheckedChange={(checked) => setFormData({ ...formData, allowComments: checked as boolean })}
                      />
                      <Label htmlFor="allowComments">Allow comments for this service</Label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Allowed Parts (one per line)</Label>
                    <Textarea
                      value={formData.allowedParts.join('\n')}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          allowedParts: e.target.value.split('\n').filter(p => p.trim() !== '')
                        });
                      }}
                      placeholder="Oil&#10;Oil Filter&#10;Air Filter"
                      rows={3}
                    />
                    <p className="text-xs text-slate-500">
                      List parts that can be selected when this service is used in a job card.
                    </p>
                  </div>
                </div>
              </>
            )}

            {!editingItem && (
              <div className="space-y-2">
                <Label htmlFor="visibility">Visibility</Label>
                <Select
                  value={formData.visibility}
                  onValueChange={(value: 'default' | 'local') => setFormData({ ...formData, visibility: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local (This account only)</SelectItem>
                    <SelectItem value="default">Default (All accounts)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Local items are only visible to your account. Default items are visible to all accounts.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-[#c53032] hover:bg-[#a6212a]">
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

