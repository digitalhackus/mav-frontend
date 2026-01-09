import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Progress } from "./ui/progress";
import { Clock, User, Wrench, Plus } from "lucide-react";

const workOrders = [
  {
    id: "WO-001",
    vehicle: { make: "Toyota Camry", year: "2020", plate: "ABC-1234" },
    customer: "John Smith",
    jobs: [
      { service: "Oil Change", estimatedTime: "1 hour", cost: 7500, status: "completed" },
      { service: "Brake Inspection", estimatedTime: "30 min", cost: 3500, status: "completed" },
    ],
    assignedMechanic: "John Mechanic",
    status: "completed",
    progress: 100,
  },
  {
    id: "WO-002",
    vehicle: { make: "Honda Civic", year: "2019", plate: "XYZ-5678" },
    customer: "Sarah Johnson",
    jobs: [
      { service: "Transmission Service", estimatedTime: "3 hours", cost: 25000, status: "in-progress" },
      { service: "Filter Replacement", estimatedTime: "30 min", cost: 4500, status: "pending" },
    ],
    assignedMechanic: "John Mechanic",
    status: "in-progress",
    progress: 50,
  },
  {
    id: "WO-003",
    vehicle: { make: "Ford F-150", year: "2021", plate: "DEF-9012" },
    customer: "Mike Wilson",
    jobs: [
      { service: "Scanning", estimatedTime: "2 hours", cost: 15000, status: "in-progress" },
      { service: "Spark Plug Replacement", estimatedTime: "1 hour", cost: 12000, status: "pending" },
    ],
    assignedMechanic: "Unassigned",
    status: "pending",
    progress: 25,
  },
];

const mechanics = ["Unassigned", "John Mechanic", "Sarah Technician", "Mike Master"];

export function WorkOrders() {
  const [orders, setOrders] = useState(workOrders);

  const handleMechanicChange = (orderId: string, mechanic: string) => {
    setOrders(orders.map(order =>
      order.id === orderId ? { ...order, assignedMechanic: mechanic } : order
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "in-progress": return "secondary";
      case "pending": return "outline";
      default: return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed": return "Completed";
      case "in-progress": return "In Progress";
      case "pending": return "Pending";
      default: return "Unknown";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Work Orders</h1>
          <p className="text-gray-600">Manage and assign repair tasks</p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />
          New Work Order
        </Button>
      </div>

      <div className="grid gap-6">
        {orders.map((order) => {
          const totalCost = order.jobs.reduce((sum, job) => sum + job.cost, 0);
          
          return (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle>{order.id}</CardTitle>
                      <Badge variant={getStatusColor(order.status)}>
                        {getStatusLabel(order.status)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Vehicle</p>
                        <p>{order.vehicle.year} {order.vehicle.make}</p>
                        <p className="text-xs text-gray-600">Plate: {order.vehicle.plate}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Customer</p>
                        <p>{order.customer}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Total Cost</p>
                    <p className="text-2xl text-orange-500">
                      <span className="text-xl font-normal mr-0.5">Rs</span>
                      <span className="font-semibold">{totalCost.toLocaleString()}</span>
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Jobs List */}
                <div className="space-y-3">
                  <h4 className="text-sm">Service Tasks</h4>
                  {order.jobs.map((job, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Wrench className="h-4 w-4 text-gray-600" />
                        <div>
                          <p className="font-medium text-sm">{job.service}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {job.estimatedTime}
                            </span>
                            <span>
                              <span className="text-xs font-normal mr-0.5">Rs</span>
                              <span className="font-medium">{job.cost.toLocaleString()}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge variant={getStatusColor(job.status)}>
                        {getStatusLabel(job.status)}
                      </Badge>
                    </div>
                  ))}
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Overall Progress</span>
                    <span>{order.progress}%</span>
                  </div>
                  <Progress value={order.progress} className="h-2" />
                </div>

                {/* Mechanic Assignment */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-gray-600">Assigned Mechanic:</span>
                  </div>
                  <Select
                    value={order.assignedMechanic}
                    onValueChange={(value) => handleMechanicChange(order.id, value)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {mechanics.map((mechanic) => (
                        <SelectItem key={mechanic} value={mechanic}>
                          {mechanic}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
