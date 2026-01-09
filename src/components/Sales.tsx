import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Search, Plus, Minus, Trash2, Printer } from "lucide-react";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

const products = [
  { id: "1", name: "Engine Oil Filter", price: 2599, category: "Filters" },
  { id: "2", name: "Brake Pads Set", price: 8999, category: "Brakes" },
  { id: "3", name: "Air Filter", price: 1999, category: "Filters" },
  { id: "4", name: "Spark Plugs (Set of 4)", price: 3250, category: "Ignition" },
  { id: "5", name: "Wiper Blades", price: 2499, category: "Accessories" },
  { id: "6", name: "Car Battery", price: 12999, category: "Electrical" },
  { id: "7", name: "Headlight Bulb", price: 1599, category: "Lighting" },
  { id: "8", name: "Transmission Fluid", price: 4500, category: "Fluids" },
  { id: "9", name: "Tire Pressure Sensor", price: 5500, category: "Sensors" },
  { id: "10", name: "Cabin Air Filter", price: 2250, category: "Filters" },
];

export function Sales() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const addToCart = (product: typeof products[0]) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(cart.map(item =>
      item.id === id
        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
        : item
    ).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex gap-6">
      {/* Products Section */}
      <div className="flex-1 space-y-4">
        <div className="flex gap-4">
          <Button className="bg-orange-500 hover:bg-orange-600">New Sale</Button>
          <Button variant="outline">Hold Sale</Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search products..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => addToCart(product)}
              >
                <CardContent className="p-4">
                  <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                    <Package className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="font-medium mb-1">{product.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{product.category}</p>
                  <p className="text-orange-500">
                    <span className="text-sm font-normal mr-0.5">Rs</span>
                    <span className="font-semibold">{product.price.toLocaleString()}</span>
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Invoice Section */}
      <Card className="w-96 flex flex-col">
        <CardHeader>
          <CardTitle>Current Sale</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 mb-4">
            {cart.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <p>No items in cart</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-gray-600">
                        <span className="text-[10px] font-normal mr-0.5">Rs</span>
                        <span className="font-medium">{item.price.toLocaleString()}</span> each
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-500"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <Separator className="my-4" />

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span>
                <span className="text-sm font-normal mr-0.5">Rs</span>
                <span className="font-medium">{subtotal.toLocaleString()}</span>
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax (8%)</span>
              <span>
                <span className="text-sm font-normal mr-0.5">Rs</span>
                <span className="font-medium">{tax.toLocaleString()}</span>
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span>Total</span>
              <span className="text-orange-500">
                <span className="text-lg font-normal mr-0.5">Rs</span>
                <span className="font-semibold">{total.toLocaleString()}</span>
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Button className="w-full bg-orange-500 hover:bg-orange-600">
              Complete Sale
            </Button>
            <Button variant="outline" className="w-full">
              <Printer className="h-4 w-4 mr-2" />
              Print Invoice
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Package({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16.5 9.4l-9-5.19" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
