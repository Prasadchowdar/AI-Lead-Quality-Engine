import { useState, useEffect, useRef } from "react";
import "@/App.css";
import axios from "axios";
import { Upload, LayoutDashboard, Users, TrendingUp, Clock, Copy, Mail, MessageSquare, Phone, Zap, Flame, Snowflake, Sparkles, ArrowUpRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Premium chart colors
const CHART_COLORS = ['#667eea', '#f093fb', '#5ee7df', '#feca57', '#ff6b6b'];

// Floating particles
const Particles = () => {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 15}s`,
    duration: `${15 + Math.random() * 10}s`,
    size: `${2 + Math.random() * 4}px`,
  }));

  return (
    <div className="particles">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
};

const App = () => {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [aiMessages, setAiMessages] = useState(null);
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
      toast.success(response.data.message, {
        style: { background: '#0f0f15', border: '1px solid rgba(102, 126, 234, 0.3)', color: '#fff' }
      });
      fetchLeads();
      fetchStats();
    } catch (error) {
      toast.error("Failed to upload leads");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleClearLeads = async () => {
    if (!window.confirm("Are you sure you want to clear all leads?")) return;

    try {
      const response = await axios.delete(`${API}/leads`);
      toast.success(response.data.message, {
        style: { background: '#0f0f15', border: '1px solid rgba(255, 107, 107, 0.3)', color: '#fff' }
      });
      fetchLeads();
      fetchStats();
    } catch (error) {
      toast.error("Failed to clear leads");
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
    } finally {
      setLoadingMessages(false);
    }
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${type} copied!`, {
        style: { background: '#0f0f15', border: '1px solid rgba(102, 126, 234, 0.3)', color: '#fff' }
      });
    } catch {
      toast.error("Failed to copy");
    }
  };

  const getCategoryConfig = (category) => {
    if (category === "Hot") return {
      badge: "badge-hot",
      icon: <Flame className="w-4 h-4" />,
      scoreClass: "bg-gradient-to-br from-[rgba(238,90,36,0.3)] to-[rgba(255,107,107,0.2)] text-[#ff6b6b] score-hot"
    };
    if (category === "Warm") return {
      badge: "badge-warm",
      icon: <Zap className="w-4 h-4" />,
      scoreClass: "bg-gradient-to-br from-[rgba(255,159,67,0.3)] to-[rgba(254,202,87,0.2)] text-[#feca57] score-warm"
    };
    return {
      badge: "badge-cold",
      icon: <Snowflake className="w-4 h-4" />,
      scoreClass: "bg-gradient-to-br from-[rgba(108,117,125,0.2)] to-[rgba(173,181,189,0.1)] text-[#adb5bd]"
    };
  };

  const sourceChartData = stats
    ? Object.entries(stats.source_distribution).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="min-h-screen relative" data-testid="lead-quality-engine">
      {/* Animated Aurora Background */}
      <div className="aurora-bg" />
      <Particles />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 md:px-8 lg:px-12">

        {/* Hero Header */}
        <header className="mb-20 animate-fade-in-up">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center shadow-[0_0_40px_rgba(102,126,234,0.5)]">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-br from-[#667eea] to-[#f093fb] opacity-30 blur-xl rounded-2xl -z-10" />
            </div>
            <div>
              <span className="text-xs font-semibold tracking-[0.2em] uppercase text-[#667eea]">Lead Forge AI</span>
              <p className="text-[#71717a] text-sm">Intelligent Lead Intelligence Platform</p>
            </div>
          </div>

          <h1 className="mb-6">
            Transform Every Lead Into<br />
            <span className="text-gradient-animated">Revenue Gold</span>
          </h1>

          <p className="text-[#a1a1aa] text-xl max-w-2xl leading-relaxed">
            Harness AI-powered scoring, smart categorization, and personalized outreach
            to maximize your conversion potential.
          </p>
        </header>

        {/* Upload Section */}
        <section className="mb-16 animate-fade-in-up delay-1" data-testid="upload-section">
          <div className="upload-dropzone">
            <div className="upload-icon-wrapper">
              <Upload className="w-10 h-10 text-white relative z-10" />
            </div>
            <h3 className="text-2xl text-white mb-3" style={{ fontFamily: 'Space Grotesk' }}>
              Import Your Leads
            </h3>
            <p className="text-[#71717a] text-sm mb-8 max-w-md mx-auto">
              Upload your CSV file with lead data. We'll instantly analyze, score, and categorize each lead.
            </p>
            <label htmlFor="file-upload" className="btn-premium cursor-pointer inline-flex items-center gap-2">
              {uploading ? (
                <>
                  <div className="spinner" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload CSV File
                </>
              )}
            </label>
            <input
              id="file-upload"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
            <p className="text-[#52525b] text-xs mt-6">
              Required: name, phone, source, service_interest, location, timestamp
            </p>
          </div>
        </section>

        {/* Dashboard Stats */}
        {stats && (
          <section className="mb-16 animate-fade-in-up delay-2" data-testid="dashboard-summary">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#667eea]/20 to-[#764ba2]/10 flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-[#667eea]" />
              </div>
              <h2 className="text-white" style={{ fontFamily: 'Space Grotesk' }}>Intelligence Dashboard</h2>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
              {/* Total Leads */}
              <div className="stat-card animate-fade-in-scale delay-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#667eea]/20 to-[#764ba2]/10 flex items-center justify-center">
                    <Users className="w-7 h-7 text-[#667eea]" />
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-[#52525b]" />
                </div>
                <p className="text-[#71717a] text-sm mb-1">Total Leads</p>
                <p className="text-4xl font-bold text-white font-data">{stats.total_leads}</p>
              </div>

              {/* Hot Leads */}
              <div className="stat-card animate-fade-in-scale delay-2" style={{ '--glow-color': 'rgba(238, 90, 36, 0.3)' }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ee5a24]/20 to-[#ff6b6b]/10 flex items-center justify-center">
                    <Flame className="w-7 h-7 text-[#ff6b6b]" />
                  </div>
                  <span className="px-2 py-1 rounded-full bg-[rgba(238,90,36,0.15)] text-[#ff6b6b] text-xs font-semibold">
                    Priority
                  </span>
                </div>
                <p className="text-[#71717a] text-sm mb-1">Hot Leads</p>
                <p className="text-4xl font-bold text-[#ff6b6b] font-data">{stats.hot_count}</p>
              </div>

              {/* Warm Leads */}
              <div className="stat-card animate-fade-in-scale delay-3">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ff9f43]/20 to-[#feca57]/10 flex items-center justify-center">
                    <Zap className="w-7 h-7 text-[#feca57]" />
                  </div>
                </div>
                <p className="text-[#71717a] text-sm mb-1">Warm Leads</p>
                <p className="text-4xl font-bold text-[#feca57] font-data">{stats.warm_count}</p>
              </div>

              {/* Cold Leads */}
              <div className="stat-card animate-fade-in-scale delay-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6c757d]/20 to-[#adb5bd]/10 flex items-center justify-center">
                    <Snowflake className="w-7 h-7 text-[#adb5bd]" />
                  </div>
                </div>
                <p className="text-[#71717a] text-sm mb-1">Cold Leads</p>
                <p className="text-4xl font-bold text-[#adb5bd] font-data">{stats.cold_count}</p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Source Distribution */}
              <div className="glass-card p-8 animate-fade-in-up delay-3">
                <h3 className="text-white text-lg mb-6" style={{ fontFamily: 'Space Grotesk' }}>
                  Lead Source Analysis
                </h3>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={sourceChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {sourceChartData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(15, 15, 21, 0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        color: '#fff',
                        backdropFilter: 'blur(10px)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  {sourceChartData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shadow-sm"
                        style={{
                          background: CHART_COLORS[index % CHART_COLORS.length],
                          boxShadow: `0 0 10px ${CHART_COLORS[index % CHART_COLORS.length]}40`
                        }}
                      />
                      <span className="text-[#a1a1aa] text-sm">{entry.name}</span>
                      <span className="text-[#52525b] text-xs">({entry.value})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Peak Activity */}
              <div className="glass-card p-8 animate-fade-in-up delay-4">
                <div className="flex items-center gap-2 mb-6">
                  <Clock className="w-5 h-5 text-[#5ee7df]" />
                  <h3 className="text-white text-lg" style={{ fontFamily: 'Space Grotesk' }}>
                    Peak Activity Window
                  </h3>
                </div>
                <div className="flex items-center justify-center h-52">
                  <div className="text-center">
                    <div className="relative inline-block mb-6">
                      <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-[#5ee7df]/20 to-[#b490ca]/10 flex items-center justify-center">
                        <Clock className="w-14 h-14 text-[#5ee7df]" />
                      </div>
                      <div className="absolute -inset-3 bg-gradient-to-br from-[#5ee7df]/20 to-transparent blur-2xl -z-10 rounded-full" />
                    </div>
                    <p className="text-2xl font-bold text-white font-data mb-1">{stats.best_time_of_day}</p>
                    <p className="text-[#71717a] text-sm">Optimal time to reach leads</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Leads Table */}
        <section className="animate-fade-in-up delay-5" data-testid="lead-table-section">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#667eea]/20 to-[#764ba2]/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#667eea]" />
              </div>
              <h2 className="text-white" style={{ fontFamily: 'Space Grotesk' }}>Lead Pipeline</h2>
              <span className="px-4 py-1.5 bg-gradient-to-r from-[#667eea]/20 to-[#764ba2]/10 text-[#667eea] text-sm rounded-full font-data border border-[#667eea]/20">
                {leads.length} leads
              </span>
            </div>
            {leads.length > 0 && (
              <button
                onClick={handleClearLeads}
                className="px-4 py-2 text-sm font-medium text-[#ff6b6b] bg-[rgba(255,107,107,0.1)] hover:bg-[rgba(255,107,107,0.2)] border border-[rgba(255,107,107,0.2)] rounded-xl transition-all hover:scale-105"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-6 py-5 text-left text-xs font-semibold text-[#71717a] uppercase tracking-wider">Score</th>
                    <th className="px-6 py-5 text-left text-xs font-semibold text-[#71717a] uppercase tracking-wider">Status</th>
                    <th className="px-6 py-5 text-left text-xs font-semibold text-[#71717a] uppercase tracking-wider">Name</th>
                    <th className="px-6 py-5 text-left text-xs font-semibold text-[#71717a] uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-5 text-left text-xs font-semibold text-[#71717a] uppercase tracking-wider">Service</th>
                    <th className="px-6 py-5 text-left text-xs font-semibold text-[#71717a] uppercase tracking-wider">Source</th>
                    <th className="px-6 py-5 text-left text-xs font-semibold text-[#71717a] uppercase tracking-wider">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead, index) => {
                    const config = getCategoryConfig(lead.category);
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => handleLeadClick(lead)}
                        className="lead-row cursor-pointer"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <td className="px-6 py-5">
                          <span className={`score-badge inline-flex items-center justify-center w-14 h-14 rounded-2xl font-bold text-lg ${config.scoreClass}`}>
                            {lead.score}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold ${config.badge}`}>
                            {config.icon}
                            {lead.category}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-white font-medium">{lead.name}</td>
                        <td className="px-6 py-5 text-[#a1a1aa] font-data text-sm">{lead.phone}</td>
                        <td className="px-6 py-5 text-[#a1a1aa] text-sm">{lead.service_interest}</td>
                        <td className="px-6 py-5 text-[#a1a1aa] text-sm">{lead.source}</td>
                        <td className="px-6 py-5 text-[#a1a1aa] text-sm">{lead.location}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {leads.length === 0 && (
              <div className="text-center py-20">
                <div className="relative inline-block mb-6">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#667eea]/10 to-[#764ba2]/5 flex items-center justify-center">
                    <Users className="w-12 h-12 text-[#52525b]" />
                  </div>
                </div>
                <p className="text-[#a1a1aa] text-lg mb-2">No leads imported yet</p>
                <p className="text-[#52525b] text-sm">Upload your first CSV to unlock AI-powered insights</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Lead Details Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:w-[560px] overflow-y-auto bg-[#0a0a0f]/98 backdrop-blur-xl border-l border-white/5">
          {selectedLead && (
            <>
              <SheetHeader className="pb-6 border-b border-white/5">
                <div className="flex items-start gap-5">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center font-bold text-2xl font-data ${getCategoryConfig(selectedLead.category).scoreClass}`}>
                    {selectedLead.score}
                  </div>
                  <div className="flex-1">
                    <SheetTitle className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk' }}>
                      {selectedLead.name}
                    </SheetTitle>
                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${getCategoryConfig(selectedLead.category).badge}`}>
                      {getCategoryConfig(selectedLead.category).icon}
                      {selectedLead.category} Lead
                    </span>
                  </div>
                </div>
              </SheetHeader>

              <SheetDescription asChild>
                <div className="space-y-6 pt-6">
                  {/* Contact Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Phone', value: selectedLead.phone, mono: true },
                      { label: 'Email', value: selectedLead.email || '—' },
                      { label: 'Service', value: selectedLead.service_interest },
                      { label: 'Source', value: selectedLead.source },
                      { label: 'Location', value: selectedLead.location },
                    ].map((item) => (
                      <div key={item.label} className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <p className="text-[#52525b] text-xs uppercase tracking-wider mb-1">{item.label}</p>
                        <p className={`text-white ${item.mono ? 'font-data' : ''}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </SheetDescription>

              {/* AI Messages */}
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles className="w-5 h-5 text-[#f093fb]" />
                  <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>
                    AI-Generated Outreach
                  </h3>
                </div>

                {loadingMessages ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-5 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="skeleton h-4 w-24 mb-4" />
                        <div className="skeleton h-20 w-full" />
                      </div>
                    ))}
                  </div>
                ) : aiMessages ? (
                  <div className="space-y-4">
                    {/* WhatsApp */}
                    <div className="message-card message-whatsapp">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-5 h-5 text-[#25d366]" />
                          <h4 className="font-semibold text-white">WhatsApp</h4>
                        </div>
                        <button
                          onClick={() => copyToClipboard(aiMessages.whatsapp, "WhatsApp")}
                          className="p-2 hover:bg-[#25d366]/10 rounded-lg transition-all"
                        >
                          <Copy className="w-4 h-4 text-[#25d366]" />
                        </button>
                      </div>
                      <p className="text-[#a1a1aa] text-sm leading-relaxed whitespace-pre-wrap">{aiMessages.whatsapp}</p>
                    </div>

                    {/* Email */}
                    <div className="message-card message-email">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Mail className="w-5 h-5 text-[#3b82f6]" />
                          <h4 className="font-semibold text-white">Email</h4>
                        </div>
                        <button
                          onClick={() => copyToClipboard(aiMessages.email, "Email")}
                          className="p-2 hover:bg-[#3b82f6]/10 rounded-lg transition-all"
                        >
                          <Copy className="w-4 h-4 text-[#3b82f6]" />
                        </button>
                      </div>
                      <p className="text-[#a1a1aa] text-sm leading-relaxed whitespace-pre-wrap">{aiMessages.email}</p>
                    </div>

                    {/* Call */}
                    <div className="message-card message-call">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Phone className="w-5 h-5 text-[#a855f7]" />
                          <h4 className="font-semibold text-white">Call Script</h4>
                        </div>
                        <button
                          onClick={() => copyToClipboard(aiMessages.call_script, "Call script")}
                          className="p-2 hover:bg-[#a855f7]/10 rounded-lg transition-all"
                        >
                          <Copy className="w-4 h-4 text-[#a855f7]" />
                        </button>
                      </div>
                      <p className="text-[#a1a1aa] text-sm leading-relaxed whitespace-pre-wrap">{aiMessages.call_script}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[#71717a]">Unable to load AI messages</p>
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