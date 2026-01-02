import { useState, useEffect } from "react";
import "@/App.css";
import axios from "axios";
import Papa from "papaparse";
import { Upload, LayoutDashboard, Users, TrendingUp, Clock, Copy, CheckCircle2, Mail, MessageSquare, Phone } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const COLORS = ['#4f46e5', '#059669', '#d97706', '#64748b', '#f59e0b'];

const App = () => {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [aiMessages, setAiMessages] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    fetchLeads();
    fetchStats();
  }, []);

  const fetchLeads = async () => {
    try {
      const response = await axios.get(`${API}/leads`);
      setLeads(response.data);
    } catch (error) {
      console.error("Error fetching leads:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard`);
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(`${API}/leads/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(response.data.message);
      fetchLeads();
      fetchStats();
    } catch (error) {
      toast.error("Failed to upload leads");
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleLeadClick = async (lead) => {
    setSelectedLead(lead);
    setAiMessages(null);
    setSheetOpen(true);
    setLoadingMessages(true);

    try {
      const response = await axios.get(`${API}/leads/${lead.id}`);
      setAiMessages(response.data.ai_messages);
    } catch (error) {
      toast.error("Failed to generate AI messages");
      console.error("Error fetching AI messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const copyToClipboard = async (text, type) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        toast.success(`${type} copied to clipboard`);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand("copy");
          toast.success(`${type} copied to clipboard`);
        } catch (err) {
          toast.error("Failed to copy to clipboard");
        }
        document.body.removeChild(textArea);
      }
    } catch (err) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const getCategoryBadgeClass = (category) => {
    if (category === "Hot") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (category === "Warm") return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-slate-100 text-slate-800 border-slate-200";
  };

  const getCategoryIcon = (category) => {
    if (category === "Hot") return "🔥";
    if (category === "Warm") return "⚡";
    return "❄️";
  };

  const sourceChartData = stats
    ? Object.entries(stats.source_distribution).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="App min-h-screen bg-slate-50" data-testid="lead-quality-engine">
      <div className="max-w-7xl mx-auto p-6 md:p-8 lg:p-12">
        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            AI Lead Quality Engine
          </h1>
          <p className="text-slate-600 text-lg">Score, categorize, and convert your marketing leads instantly</p>
        </header>

        <div className="mb-8" data-testid="upload-section">
          <div className="bg-white rounded-lg border border-slate-200 p-8 upload-dropzone">
            <div className="flex flex-col items-center justify-center">
              <Upload className="w-12 h-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload Lead CSV</h3>
              <p className="text-sm text-slate-500 mb-4 text-center">
                Required columns: name, phone, email, source, service_interest, location, timestamp
              </p>
              <label
                htmlFor="file-upload"
                className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-md"
                data-testid="upload-button"
              >
                {uploading ? "Uploading..." : "Choose File"}
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
            </div>
          </div>
        </div>

        {stats && (
          <div className="mb-8" data-testid="dashboard-summary">
            <h2 className="text-2xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <LayoutDashboard className="inline-block w-6 h-6 mr-2" />
              Dashboard Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="stat-card bg-white rounded-lg border border-slate-200 p-6" data-testid="total-leads-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Total Leads</p>
                    <p className="text-3xl font-bold text-slate-900 font-data">{stats.total_leads}</p>
                  </div>
                  <Users className="w-10 h-10 text-indigo-600" />
                </div>
              </div>

              <div className="stat-card bg-white rounded-lg border border-slate-200 p-6" data-testid="hot-leads-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">🔥 Hot Leads</p>
                    <p className="text-3xl font-bold text-emerald-600 font-data">{stats.hot_count}</p>
                  </div>
                  <div className="text-4xl">🔥</div>
                </div>
              </div>

              <div className="stat-card bg-white rounded-lg border border-slate-200 p-6" data-testid="warm-leads-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">⚡ Warm Leads</p>
                    <p className="text-3xl font-bold text-amber-600 font-data">{stats.warm_count}</p>
                  </div>
                  <div className="text-4xl">⚡</div>
                </div>
              </div>

              <div className="stat-card bg-white rounded-lg border border-slate-200 p-6" data-testid="cold-leads-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">❄️ Cold Leads</p>
                    <p className="text-3xl font-bold text-slate-600 font-data">{stats.cold_count}</p>
                  </div>
                  <div className="text-4xl">❄️</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-slate-200 p-6" data-testid="source-distribution-chart">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Lead Source Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={sourceChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {sourceChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 p-6" data-testid="best-time-card">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  <Clock className="inline-block w-5 h-5 mr-2" />
                  Best Time to Reach
                </h3>
                <div className="flex items-center justify-center h-48">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🕐</div>
                    <p className="text-2xl font-bold text-indigo-600">{stats.best_time_of_day}</p>
                    <p className="text-sm text-slate-500 mt-2">Peak lead activity time</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div data-testid="lead-table-section">
          <h2 className="text-2xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            <TrendingUp className="inline-block w-6 h-6 mr-2" />
            All Leads ({leads.length})
          </h2>
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="leads-table">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Location
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => handleLeadClick(lead)}
                      className="lead-row cursor-pointer"
                      data-testid={`lead-row-${lead.id}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg font-data score-badge ${
                            lead.score >= 70
                              ? "bg-emerald-100 text-emerald-700"
                              : lead.score >= 40
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {lead.score}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getCategoryBadgeClass(
                            lead.category
                          )}`}
                        >
                          {getCategoryIcon(lead.category)} {lead.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{lead.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-data">{lead.phone}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{lead.service_interest}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{lead.source}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{lead.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {leads.length === 0 && (
              <div className="text-center py-12" data-testid="no-leads-message">
                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No leads uploaded yet. Upload a CSV file to get started.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:w-[540px] overflow-y-auto" data-testid="lead-details-sheet">
          {selectedLead && (
            <>
              <SheetHeader>
                <SheetTitle className="text-2xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {selectedLead.name}
                </SheetTitle>
                <SheetDescription>
                  <div className="space-y-3 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Lead Score:</span>
                      <span
                        className={`inline-flex items-center justify-center w-14 h-14 rounded-full font-bold text-xl font-data ${
                          selectedLead.score >= 70
                            ? "bg-emerald-100 text-emerald-700"
                            : selectedLead.score >= 40
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {selectedLead.score}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Category:</span>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getCategoryBadgeClass(
                          selectedLead.category
                        )}`}
                      >
                        {getCategoryIcon(selectedLead.category)} {selectedLead.category}
                      </span>
                    </div>
                    <div className="pt-3 border-t border-slate-200">
                      <p className="text-sm text-slate-600"><strong>Phone:</strong> {selectedLead.phone}</p>
                      {selectedLead.email && <p className="text-sm text-slate-600"><strong>Email:</strong> {selectedLead.email}</p>}
                      <p className="text-sm text-slate-600"><strong>Service:</strong> {selectedLead.service_interest}</p>
                      <p className="text-sm text-slate-600"><strong>Source:</strong> {selectedLead.source}</p>
                      <p className="text-sm text-slate-600"><strong>Location:</strong> {selectedLead.location}</p>
                    </div>
                  </div>
                </SheetDescription>
              </SheetHeader>

              <div className="mt-8" data-testid="ai-messages-section">
                <h3 className="text-lg font-bold text-slate-900 mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  AI-Generated Follow-Up Messages
                </h3>

                {loadingMessages ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-slate-200 rounded w-1/3 mb-2"></div>
                        <div className="h-20 bg-slate-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : aiMessages ? (
                  <div className="space-y-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4" data-testid="whatsapp-message">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <MessageSquare className="w-5 h-5 text-green-600 mr-2" />
                          <h4 className="font-semibold text-slate-900">WhatsApp</h4>
                        </div>
                        <button
                          onClick={() => copyToClipboard(aiMessages.whatsapp, "WhatsApp message")}
                          className="p-2 hover:bg-green-100 rounded"
                          data-testid="copy-whatsapp-btn"
                        >
                          <Copy className="w-4 h-4 text-green-600" />
                        </button>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{aiMessages.whatsapp}</p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4" data-testid="email-message">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <Mail className="w-5 h-5 text-blue-600 mr-2" />
                          <h4 className="font-semibold text-slate-900">Email</h4>
                        </div>
                        <button
                          onClick={() => copyToClipboard(aiMessages.email, "Email message")}
                          className="p-2 hover:bg-blue-100 rounded"
                          data-testid="copy-email-btn"
                        >
                          <Copy className="w-4 h-4 text-blue-600" />
                        </button>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{aiMessages.email}</p>
                    </div>

                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4" data-testid="call-script">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <Phone className="w-5 h-5 text-purple-600 mr-2" />
                          <h4 className="font-semibold text-slate-900">Call Script</h4>
                        </div>
                        <button
                          onClick={() => copyToClipboard(aiMessages.call_script, "Call script")}
                          className="p-2 hover:bg-purple-100 rounded"
                          data-testid="copy-call-btn"
                        >
                          <Copy className="w-4 h-4 text-purple-600" />
                        </button>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{aiMessages.call_script}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500">Failed to load AI messages</p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default App;