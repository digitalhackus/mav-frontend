import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { JobCardDetail } from "./JobCardDetail";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "./ui/dropdown-menu";
import {
  Plus,
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle,
  User,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  Trash2,
  MoreVertical
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { motion } from "motion/react";
import { jobsAPI } from "../api/client";
import { onJobUpdated, connectSocket } from "../lib/socket";
import { formatJobId } from "../utils/idFormatter";

type SortOption = "date-new" | "date-old" | "customer" | "amount-high" | "amount-low";

export function JobCards() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCard, setSelectedCard] = useState<any | null>(null);
  const [showCreateJobCard, setShowCreateJobCard] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("date-new");
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [jobToDelete, setJobToDelete] = useState<any | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await jobsAPI.getAll();
      if (response.success) {
        setJobs(response.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    
    // Connect Socket.IO and listen for job updates
    const socket = connectSocket();
    const unsubscribe = onJobUpdated(() => {
      // Refresh jobs when updated
      fetchJobs();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Check for ID in URL params and open job card detail
  useEffect(() => {
    const jobId = searchParams.get('id');
    if (jobId && jobs.length > 0) {
      const job = jobs.find(j => (j._id || j.id) === jobId);
      if (job) {
        setSelectedCard(job);
        // Clean up URL
        setSearchParams({});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, jobs]);

  // Sort function
  const sortJobs = (jobs: any[]) => {
    return [...jobs].sort((a, b) => {
      switch (sortBy) {
        case "date-new":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "date-old":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "customer":
          return (a.customer?.name || "").localeCompare(b.customer?.name || "");
        case "amount-high":
          return (b.amount || 0) - (a.amount || 0);
        case "amount-low":
          return (a.amount || 0) - (b.amount || 0);
        default:
          return 0;
      }
    });
  };

  // Group jobs by status
  const jobCards = {
    pending: sortJobs(jobs.filter(job => job.status === "PENDING")),
    inProgress: sortJobs(jobs.filter(job => job.status === "IN_PROGRESS")),
    completed: sortJobs(jobs.filter(job => job.status === "COMPLETED")),
    delivered: sortJobs(jobs.filter(job => job.status === "DELIVERED")),
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case "date-new": return "Date (Newest First)";
      case "date-old": return "Date (Oldest First)";
      case "customer": return "Customer (A-Z)";
      case "amount-high": return "Amount (High to Low)";
      case "amount-low": return "Amount (Low to High)";
      default: return "Sort";
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const handleDeleteClick = (e: React.MouseEvent, job: any) => {
    e.stopPropagation(); // Prevent card click
    setJobToDelete(job);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!jobToDelete) return;
    
    try {
      const response = await jobsAPI.delete(jobToDelete._id || jobToDelete.id);
      if (response.success) {
        setIsDeleteDialogOpen(false);
        setJobToDelete(null);
        fetchJobs();
      } else {
        alert(response.message || "Failed to delete job");
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete job");
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false);
    setJobToDelete(null);
  };

  const renderJobCard = (job: any, status: string) => {
    return (
      <motion.div
        key={job._id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.01 }}
        className="bg-gradient-to-br from-white via-[#fff8f8] to-[#ffecec] p-3.5 rounded-xl border border-[#fcd5d5] hover:border-[#f9bfbf] shadow-[0_6px_20px_-12px_rgba(197,48,50,0.3)] transition-all cursor-pointer"
        onClick={() => setSelectedCard(job)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2.5">
          <div>
            <h3 className="text-sm font-medium mb-0.5">{formatJobId(job)}</h3>
            <p className="text-xs text-gray-600">{job.customer?.name || "N/A"}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                setSelectedCard(job);
              }}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => handleDeleteClick(e, job)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Job
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Vehicle Info */}
        <div className="mb-2.5 p-2 bg-gray-50 rounded">
          <p className="text-xs font-medium text-gray-900">
            {job.vehicle?.make} {job.vehicle?.model} {job.vehicle?.year}
          </p>
          {job.vehicle?.plateNo && (
            <p className="text-xs text-gray-500">{job.vehicle.plateNo}</p>
          )}
        </div>

        {/* Service */}
        <p className="text-xs text-gray-700 mb-2.5">{job.title}</p>
        {job.description && (
          <p className="text-xs text-gray-500 mb-2.5">{job.description}</p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-600 pt-2.5 border-t border-gray-100">
          {job.technician && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{job.technician}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-gray-900">
              <span className="text-[10px] font-normal mr-0.5">₨</span>
              <span>{job.amount?.toLocaleString() || 0}</span>
            </span>
          </div>
        </div>

        {/* Time Info */}
        <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
          <Clock className="h-3 w-3" />
          {job.estimatedTimeHours && <span>{job.estimatedTimeHours}h • </span>}
          <span>{formatTimeAgo(new Date(job.createdAt))}</span>
        </div>
      </motion.div>
    );
  };

  // If creating a new job card or viewing a job card detail
  if (showCreateJobCard) {
    return (
      <JobCardDetail
        onClose={() => setShowCreateJobCard(false)}
        onSave={async (data) => {
          try {
            await jobsAPI.create(data);
            setShowCreateJobCard(false);
            fetchJobs();
          } catch (err) {
            console.error("Failed to create job:", err);
          }
        }}
        userRole="Admin"
      />
    );
  }

  if (selectedCard) {
    return (
      <JobCardDetail
        jobCard={selectedCard}
        onClose={() => {
          setSelectedCard(null);
          setSearchParams({});
        }}
        onSave={async (data) => {
          try {
            await jobsAPI.update(selectedCard._id, data);
            setSelectedCard(null);
            fetchJobs();
          } catch (err) {
            console.error("Failed to update job:", err);
          }
        }}
        onDelete={async (jobId) => {
          try {
            await jobsAPI.delete(jobId);
            setSelectedCard(null);
            fetchJobs();
          } catch (err) {
            console.error("Failed to delete job:", err);
          }
        }}
        userRole="Admin"
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#c53032]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl mb-1 lg:mb-2">Job Cards</h1>
          <p className="text-sm lg:text-base text-gray-600">Track and manage service jobs across all stages</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 w-full lg:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full sm:w-auto justify-center sm:justify-start">
                <ArrowUpDown className="h-4 w-4 lg:mr-2" />
                <span className="ml-2 sm:inline lg:hidden">Sort</span>
                <span className="ml-2 hidden lg:inline">{getSortLabel()}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSortBy("date-new")}>
            <ArrowDown className="h-4 w-4 mr-2 text-[#c53032]" />
                Date (Newest First)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("date-old")}>
            <ArrowUp className="h-4 w-4 mr-2 text-[#f87171]" />
                Date (Oldest First)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSortBy("customer")}>
                <User className="h-4 w-4 mr-2" />
                Customer (A-Z)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSortBy("amount-high")}>
                <ArrowDown className="h-4 w-4 mr-2" />
                Amount (High to Low)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("amount-low")}>
                <ArrowUp className="h-4 w-4 mr-2" />
                Amount (Low to High)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            className="bg-[#c53032] hover:bg-[#a6212a] w-full sm:w-auto" 
            size="sm"
            onClick={() => setShowCreateJobCard(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Job Card
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border border-red-200 bg-gradient-to-br from-[#fde7e7] via-white to-white h-full">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending</p>
                  <p className="text-3xl">{jobCards.pending.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-[#c53032]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border border-red-200 bg-gradient-to-br from-[#fde7e7] via-white to-white h-full">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">In Progress</p>
                  <p className="text-3xl">{jobCards.inProgress.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-[#c53032]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border border-red-200 bg-gradient-to-br from-[#fde7e7] via-white to-white h-full">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Completed</p>
                  <p className="text-3xl">{jobCards.completed.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-[#c53032]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border border-red-200 bg-gradient-to-br from-[#fde7e7] via-white to-white h-full">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Delivered</p>
                  <p className="text-3xl">{jobCards.delivered.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-[#c53032]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Column */}
        <div className="flex flex-col">
          <div className="mb-3 flex items-center justify-between bg-[#fde7e7] border border-red-200 rounded-lg p-2.5">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-[#c53032]" />
              <h2 className="text-sm font-medium">Pending</h2>
            </div>
            <Badge variant="secondary" className="bg-white text-xs text-[#c53032] border border-red-100">{jobCards.pending.length}</Badge>
          </div>
          <div className="space-y-3 flex-1">
            {jobCards.pending.map(job => renderJobCard(job, "pending"))}
          </div>
        </div>

        {/* In Progress Column */}
        <div className="flex flex-col">
          <div className="mb-3 flex items-center justify-between bg-[#fde7e7] border border-red-200 rounded-lg p-2.5">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#c53032]" />
              <h2 className="text-sm font-medium">In Progress</h2>
            </div>
            <Badge variant="secondary" className="bg-white text-xs text-[#c53032] border border-red-100">{jobCards.inProgress.length}</Badge>
          </div>
          <div className="space-y-3 flex-1">
            {jobCards.inProgress.map(job => renderJobCard(job, "inProgress"))}
          </div>
        </div>

        {/* Completed Column */}
        <div className="flex flex-col">
          <div className="mb-3 flex items-center justify-between bg-[#fde7e7] border border-red-200 rounded-lg p-2.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#c53032]" />
              <h2 className="text-sm font-medium">Completed</h2>
            </div>
            <Badge variant="secondary" className="bg-white text-xs text-[#c53032] border border-red-100">{jobCards.completed.length}</Badge>
          </div>
          <div className="space-y-3 flex-1">
            {jobCards.completed.map(job => renderJobCard(job, "completed"))}
          </div>
        </div>

        {/* Delivered Column */}
        <div className="flex flex-col">
          <div className="mb-3 flex items-center justify-between bg-[#fde7e7] border border-red-200 rounded-lg p-2.5">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-[#c53032]" />
              <h2 className="text-sm font-medium">Delivered</h2>
            </div>
            <Badge variant="secondary" className="bg-white text-xs text-[#c53032] border border-red-100">{jobCards.delivered.length}</Badge>
          </div>
          <div className="space-y-3 flex-1">
            {jobCards.delivered.map(job => renderJobCard(job, "delivered"))}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete job{" "}
              <span className="font-semibold">
                {formatJobId(jobToDelete)}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
