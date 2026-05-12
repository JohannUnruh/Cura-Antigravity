"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Users, Clock, Presentation, Tent, Tag, TrendingUp, Info } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, Cell as ReCell } from "recharts";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { consultationService } from "@/lib/firebase/services/consultationService";
import { lectureService } from "@/lib/firebase/services/lectureService";
import { retreatService } from "@/lib/firebase/services/retreatService";
import { clientService } from "@/lib/firebase/services/clientService";
import { useSettings } from "@/contexts/SettingsContext";
import { Client, Consultation, Lecture, LegacyConsultation, Retreat } from "@/types";
import { useTheme } from "@/contexts/ThemeContext";

const COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#ec4899"];

export default function Dashboard() {
  const { user, userProfile } = useAuth();
  const { theme } = useTheme();
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'own' | 'all'>('own');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [data, setData] = useState<{
    consultations: Consultation[];
    legacyCons: LegacyConsultation[];
    lectures: Lecture[];
    retreats: Retreat[];
    clients: Client[];
  }>({
    consultations: [],
    legacyCons: [],
    lectures: [],
    retreats: [],
    clients: []
  });

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    data.consultations.forEach(c => years.add(new Date(c.dateFrom).getFullYear()));
    data.legacyCons.forEach((c: LegacyConsultation) => {
      // Legacy data might have dateFrom or we use a default if missing
      const date = c.dateFrom ? new Date(c.dateFrom) : null;
      if (date) years.add(date.getFullYear());
    });
    data.lectures.forEach(l => years.add(new Date(l.dateFrom).getFullYear()));
    data.retreats.forEach(r => years.add(new Date(r.dateFrom).getFullYear()));

    return Array.from(years).sort((a, b) => b - a);
  }, [data]);

  useEffect(() => {
    if (!user) return;

    const loadAllData = async () => {
      setLoading(true);
      try {
        let cons, legacyCons, lectures, retreats, clients;

        if (viewMode === 'all' && userProfile?.role === 'Admin') {
          [cons, legacyCons, lectures, retreats, clients] = await Promise.all([
            consultationService.getConsultations(),
            consultationService.getLegacyConsultations(),
            lectureService.getLectures(),
            retreatService.getRetreats(),
            clientService.getAllClients()
          ]);
        } else {
          [cons, legacyCons, lectures, retreats, clients] = await Promise.all([
            consultationService.getConsultationsByAuthor(user.uid),
            consultationService.getLegacyConsultationsByAuthor(user.uid),
            lectureService.getLecturesByAuthor(user.uid),
            retreatService.getRetreatsByAuthor(user.uid),
            clientService.getClientsByAuthor(user.uid)
          ]);
        }

        setData({
          consultations: cons,
          legacyCons: legacyCons as LegacyConsultation[],
          lectures: lectures,
          retreats: retreats,
          clients: clients
        });
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [user, userProfile?.role, viewMode]);

  // --- Aggregations ---

  const stats = useMemo(() => {
    const filterByYear = (date: Date | string | number | undefined) => {
      if (yearFilter === 'all') return true;
      if (!date) return false;
      const d = date instanceof Date ? date : new Date(date);
      return d.getFullYear().toString() === yearFilter;
    };

    const filteredCons = data.consultations.filter(c => filterByYear(c.dateFrom));
    const filteredLegacy = data.legacyCons.filter((c: LegacyConsultation) => filterByYear(c.dateFrom));
    const filteredLectures = data.lectures.filter(l => filterByYear(l.dateFrom));
    const filteredRetreats = data.retreats.filter(r => filterByYear(r.dateFrom));

    // 1. Beratungsgespräche
    const totalConsHours = filteredCons.reduce((sum, c) => sum + (c.unitsInHours || 0) + (c.prepTimeInHours || 0), 0) +
      filteredLegacy.reduce((sum, c) => sum + (c.durationInHours || 0) + (c.prepTimeInHours || 0), 0);

    // Top Problems
    const problems: Record<string, number> = {};
    filteredCons.forEach(c => {
      const probName = settings?.problemOrigins.find((p, i) => i.toString() === c.problemOriginId) || c.problemOriginId;
      problems[probName] = (problems[probName] || 0) + 1;
    });
    filteredLegacy.forEach(c => {
      const topic = c.topic || c.consultationType || 'Unbekannt';
      problems[topic] = (problems[topic] || 0) + 1;
    });

    const problemData = Object.entries(problems)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Person Groups
    const groups: Record<string, number> = {};
    filteredCons.forEach(c => {
      const client = data.clients.find(cl => cl.id === c.clientId);
      if (client) {
        groups[client.personGroup] = (groups[client.personGroup] || 0) + 1;
      }
    });
    filteredLegacy.forEach(c => {
      if (c.targetGroup) {
        groups[c.targetGroup] = (groups[c.targetGroup] || 0) + 1;
      }
    });

    const groupData = Object.entries(groups).map(([name, value]) => ({ name, value }));

    // 2. Vorträge
    const totalLectureHours = filteredLectures.reduce((sum, l) => sum + (l.durationInHours || 0) + (l.prepTimeInHours || 0), 0);
    const totalLectureParticipants = filteredLectures.reduce((sum, l) => sum + (l.participantCount || 0), 0);
    const lectureTypes: Record<string, number> = {};
    filteredLectures.forEach(l => {
      const type = l.lectureType || 'Sonstige';
      lectureTypes[type] = (lectureTypes[type] || 0) + 1;
    });
    const lectureTypeData = Object.entries(lectureTypes).map(([name, value]) => ({ name, value }));

    // 3. Freizeiten
    const totalRetreatHours = filteredRetreats.reduce((sum, r) => sum + (r.durationInHours || 0) + (r.prepTimeInHours || 0), 0);
    const totalRetreatParticipants = filteredRetreats.reduce((sum, r) => sum + (r.participantCount || 0), 0);
    const retreatTypes: Record<string, number> = {};
    filteredRetreats.forEach(r => {
      const type = r.retreatType || 'Sonstige';
      retreatTypes[type] = (retreatTypes[type] || 0) + 1;
    });
    const retreatTypeData = Object.entries(retreatTypes).map(([name, value]) => ({ name, value }));

    return {
      totalConsHours: Math.round(totalConsHours * 10) / 10,
      problemData,
      groupData,
      totalLectureHours: Math.round(totalLectureHours * 10) / 10,
      totalLectureParticipants,
      lectureTypeData,
      totalRetreatHours: Math.round(totalRetreatHours * 10) / 10,
      totalRetreatParticipants,
      retreatTypeData,
      totalEntries: filteredCons.length + filteredLegacy.length + filteredLectures.length + filteredRetreats.length,
      lectureCount: filteredLectures.length,
      retreatCount: filteredRetreats.length
    };
  }, [data, yearFilter, settings?.problemOrigins]);

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center h-full">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        </div>
      </ProtectedRoute>
    );
  }

  const isAdmin = userProfile?.role === 'Admin';

  return (
    <ProtectedRoute>
      <div className="animate-in fade-in duration-500 h-full flex flex-col gap-8 max-w-7xl mx-auto w-full pb-10">

        {/* Header & Welcome */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-gray-900 dark:text-white">
              {viewMode === 'all' ? 'Verbands-Übersicht' : `Willkommen, ${userProfile?.firstName}`}
            </h1>
            <p className="text-gray-500 dark:text-slate-400 mt-2 font-medium">
              {viewMode === 'all'
                ? 'Auswertung aller erfassten Daten des Vereins.'
                : 'Hier ist deine aktuelle Übersicht und Auswertung.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Admin Toggle */}
            {isAdmin && (
              <div className="flex bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-white/50 dark:border-white/10 p-1 rounded-xl shadow-sm">
                <button
                  onClick={() => setViewMode('own')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'own' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                >
                  Meine Daten
                </button>
                <button
                  onClick={() => setViewMode('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                >
                  Gesamt-Verein
                </button>
              </div>
            )}

            {/* Year Filter */}
            <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-white/50 dark:border-white/10 p-1 rounded-xl shadow-sm">
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                title="Jahr filtern"
                aria-label="Jahr filtern"
                className="bg-transparent text-sm font-bold text-gray-700 dark:text-slate-200 px-3 py-2 outline-none cursor-pointer"
              >
                <option value="all">Alle Jahre</option>
                {availableYears.map(year => (
                  <option key={year} value={year.toString()}>{year}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-white/50 dark:border-white/10 shadow-sm px-6 py-3 rounded-2xl">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              <span className="text-sm font-bold text-gray-800 dark:text-slate-200">{stats.totalEntries} Aktivitäten</span>
            </div>
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="kpi-card-indigo border-none shadow-sm h-full">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Beratungsstunden</p>
                <p className="text-3xl font-black text-gray-900 dark:text-white">{stats.totalConsHours}h</p>
                <p className="text-xs text-gray-400 mt-1 font-medium italic">Inkl. Vorbereitung</p>
              </div>
            </CardContent>
          </Card>

          <Card className="kpi-card-blue border-none shadow-sm h-full">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                <Presentation className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Vortrag-Teilnehmer</p>
                <p className="text-3xl font-black text-gray-900 dark:text-white">{stats.totalLectureParticipants}</p>
                <p className="text-xs text-gray-400 dark:text-slate-400 mt-1 font-medium">Bei {stats.lectureCount} Vorträgen</p>
              </div>
            </CardContent>
          </Card>

          <Card className="kpi-card-teal border-none shadow-sm h-full">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center mb-4">
                <Tent className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider mb-1">Freizeit-Teilnehmer</p>
                <p className="text-3xl font-black text-gray-900 dark:text-white">{stats.totalRetreatParticipants}</p>
                <p className="text-xs text-gray-400 dark:text-slate-400 mt-1 font-medium">Bei {stats.retreatCount} Freizeiten</p>
              </div>
            </CardContent>
          </Card>

          <Card className="kpi-card-orange border-none shadow-sm h-full">
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
                  {viewMode === 'all' ? 'Aktive Klienten gesamt' : 'Eigene Klienten'}
                </p>
                <p className="text-3xl font-black text-gray-900 dark:text-white">{data.clients.length}</p>
                <p className="text-xs text-gray-400 dark:text-slate-400 mt-1 font-medium">Aktiv in Betreuung</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Multi-Section Content */}
        <div className="grid gap-8 lg:grid-cols-2">

          {/* Consultations Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 px-2">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">Beratungsgespräche</h3>
              <div className="h-px flex-1 bg-gray-100 dark:bg-white/10"></div>
            </div>

            <div className="grid gap-6">
              <Card className="rounded-[2.5rem] border-white/60 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm shadow-sm overflow-hidden">
                <CardContent className="p-8">
                  <h4 className="text-sm font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Tag className="w-4 h-4" /> Top Problemthemen
                  </h4>
                  <div className="h-[280px] w-full">
                    {stats.problemData.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-400 italic">Keine Daten verfügbar</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.problemData} layout="vertical" margin={{ left: 10, right: 30 }}>
                          <XAxis type="number" hide />
                          <YAxis
                            dataKey="name"
                            type="category"
                            axisLine={false}
                            tickLine={false}
                            width={130}
                            tick={{ fill: theme === 'dark' ? '#94a3b8' : '#4b5563', fontSize: 13, fontWeight: 500 }}
                          />
                          <Tooltip
                            cursor={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)' }}
                            contentStyle={{
                              borderRadius: '16px',
                              border: 'none',
                              background: theme === 'dark' ? '#1e293b' : 'rgba(255,255,255,0.92)',
                              backdropFilter: 'blur(10px)',
                              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                              color: theme === 'dark' ? '#f8fafc' : '#1e293b'
                            }}
                          />
                          <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={26} label={{ position: 'right', fill: theme === 'dark' ? '#cbd5e1' : '#4b5563', fontSize: 12, fontWeight: 'bold' }}>
                            {stats.problemData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[2.5rem] border-white/60 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm shadow-sm">
                <CardContent className="p-8">
                  <h4 className="text-sm font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Personengruppen
                  </h4>
                  <div className="h-[280px] w-full flex items-center">
                    {stats.groupData.length === 0 ? (
                      <div className="flex items-center justify-center h-full w-full text-gray-400 italic">Keine Daten verfügbar</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stats.groupData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={95}
                            paddingAngle={6}
                            dataKey="value"
                            stroke="none"
                            label={({ value }) => `${value}`}
                          >
                            {stats.groupData.map((_, index) => (
                              <ReCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              borderRadius: '16px',
                              border: 'none',
                              background: theme === 'dark' ? '#1e293b' : 'rgba(255,255,255,0.92)',
                              color: theme === 'dark' ? '#f8fafc' : '#1e293b'
                            }}
                          />
                          <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 500, color: theme === 'dark' ? '#94a3b8' : '#4b5563' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Lectures & Retreats Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 px-2">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">Vorträge & Freizeiten</h3>
              <div className="h-px flex-1 bg-gray-100 dark:bg-white/5"></div>
            </div>

            <div className="grid gap-6">
              <Card className="rounded-[2.5rem] border-white/60 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm shadow-sm p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="text-gray-900 dark:text-white font-bold text-lg flex items-center gap-2">
                      Vortrags-Arten
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">Verteilung nach Kategorien</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full text-xs font-bold text-blue-600 dark:text-blue-400">
                    {stats.totalLectureHours}h Aufwand
                  </div>
                </div>
                <div className="space-y-4">
                  {stats.lectureTypeData.length === 0 ? (
                    <p className="text-center py-10 text-gray-400 font-medium italic">Keine Einträge für diesen Filter.</p>
                  ) : stats.lectureTypeData.sort((a, b) => b.value - a.value).map((type, i) => (
                    <div key={type.name} className="space-y-1.5">
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-gray-700 dark:text-slate-300">{type.name}</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">{type.value}x</span>
                      </div>
                      <div className="h-2.5 w-full bg-gray-100/50 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${(type.value / stats.lectureCount) * 100}%`,
                            backgroundColor: COLORS[i % COLORS.length]
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="rounded-[2.5rem] border-white/60 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm shadow-sm p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="text-gray-900 dark:text-white font-bold text-lg flex items-center gap-2">
                      Freizeit-Arten
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">Auswertung nach Art der Freizeit</p>
                  </div>
                  <div className="bg-teal-50 dark:bg-teal-900/20 px-3 py-1 rounded-full text-xs font-bold text-teal-600 dark:text-teal-400">
                    {stats.totalRetreatHours}h Aufwand
                  </div>
                </div>
                <div className="space-y-4">
                  {stats.retreatTypeData.length === 0 ? (
                    <p className="text-center py-10 text-gray-400 font-medium italic">Keine Einträge für diesen Filter.</p>
                  ) : stats.retreatTypeData.sort((a, b) => b.value - a.value).map((type, i) => (
                    <div key={type.name} className="space-y-1.5">
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-gray-700 dark:text-slate-300">{type.name}</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">{type.value}x</span>
                      </div>
                      <div className="h-2.5 w-full bg-gray-100/50 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${(type.value / stats.retreatCount) * 100}%`,
                            backgroundColor: COLORS[i % COLORS.length]
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="bg-white/50 dark:bg-slate-900/60 rounded-[2.5rem] p-8 border border-white/60 dark:border-white/10 shadow-sm">
                <h4 className="text-indigo-600 dark:text-indigo-400 font-bold mb-3 flex items-center gap-2 text-lg">
                  <Info className="w-6 h-6" /> Info zur Auswertung
                </h4>
                <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed font-medium">
                  {viewMode === 'all'
                    ? 'Diese Ansicht zeigt die aggregierten Daten aller Mitarbeiter des Vereins.'
                    : 'Diese Ansicht zeigt ausschließlich deine eigenen erfassten Daten.'}
                  {" "}Die Stundenberechnungen beinhalten sowohl Durchführungs- als auch Vorbereitungszeiten.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
